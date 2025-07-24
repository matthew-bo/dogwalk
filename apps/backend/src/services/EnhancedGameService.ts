import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { prisma } from '@/services/DatabaseService';
import { RedisService } from '@/services/RedisService';
import { ProvablyFairRNG } from '@/utils/ProvablyFairRNG';
import { ErrorHandler } from '@/middleware/errorHandler';
import { 
  GameEventType, 
  GameSessionEnhanced, 
  MiniGameEvent,
  ProgressiveJackpot,
  ERROR_CODES,
  GAME_CONFIG 
} from 'shared';

export class EnhancedGameService {
  
  /**
   * Generate all game events deterministically from RNG seed
   */
  public static generateGameEvents(serverSeed: string, clientSeed: string, nonce: number): GameEventType[] {
    const events: GameEventType[] = [];
    const combinedSeed = crypto.createHash('sha256')
      .update(`${serverSeed}:${clientSeed}:${nonce}`)
      .digest('hex');

    let hash = combinedSeed;

    // Generate squirrel event (primary fail condition)
    for (let second = 1; second <= GAME_CONFIG.MAX_GAME_DURATION; second++) {
      hash = crypto.createHash('sha256').update(hash + ':squirrel').digest('hex');
      const randomValue = parseInt(hash.substring(0, 8), 16) / 0xFFFFFFFF;
      
      if (randomValue < GAME_CONFIG.getRiskPerSecond(second)) {
        events.push({
          type: 'squirrel',
          second,
          parameters: { baseRisk: GAME_CONFIG.getRiskPerSecond(second) }
        });
        break; // Only one squirrel event per game
      }
    }

    // Generate mini-bonus events (every 3-7 seconds, 30% chance)
    for (let second = 3; second <= GAME_CONFIG.MAX_GAME_DURATION; second += 3 + Math.floor(Math.random() * 5)) {
      hash = crypto.createHash('sha256').update(hash + ':bonus:' + second).digest('hex');
      const bonusChance = parseInt(hash.substring(8, 16), 16) / 0xFFFFFFFF;
      
      if (bonusChance < 0.3) { // 30% chance
        const bonusType = this.selectBonusType(hash);
        events.push({
          type: 'mini_bonus',
          second,
          parameters: { subType: bonusType, rng: hash.substring(16, 24) }
        });
      }
    }

    // Generate fetch opportunities (seconds 8, 15, 22)
    [8, 15, 22].forEach(second => {
      hash = crypto.createHash('sha256').update(hash + ':fetch:' + second).digest('hex');
      const fetchChance = parseInt(hash.substring(0, 8), 16) / 0xFFFFFFFF;
      
      if (fetchChance < 0.4) { // 40% chance
        events.push({
          type: 'fetch_opportunity',
          second,
          parameters: { 
            bonusMultiplier: 1.5,
            riskIncrease: 2.0,
            duration: 5
          }
        });
      }
    });

    // Generate progressive jackpot triggers (every 5 seconds survived)
    for (let second = 5; second <= GAME_CONFIG.MAX_GAME_DURATION; second += 5) {
      hash = crypto.createHash('sha256').update(hash + ':jackpot:' + second).digest('hex');
      const jackpotChance = parseInt(hash.substring(0, 8), 16) / 0xFFFFFFFF;
      
      if (jackpotChance < 0.05) { // 5% chance every 5 seconds
        events.push({
          type: 'progressive_jackpot',
          second,
          parameters: { multiplier: 2 + (second / 10) } // Bigger jackpots later
        });
      }
    }

    // Generate safe zones (seconds 10, 20)
    [10, 20].forEach(second => {
      events.push({
        type: 'safe_zone',
        second,
        parameters: { duration: 2 }
      });
    });

    // Sort events by second
    return events.sort((a, b) => a.second - b.second);
  }

  /**
   * Start enhanced game with multiple events
   */
  public static async startEnhancedGame(userId: string, betAmount: number): Promise<{
    sessionId: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    maxDuration: number;
    upcomingEvents: Pick<GameEventType, 'type' | 'second'>[]; // Don't reveal parameters
  }> {
    // Validate bet amount and user state (same as original)
    if (betAmount < GAME_CONFIG.MIN_BET_CENTS || betAmount > GAME_CONFIG.MAX_BET_CENTS) {
      ErrorHandler.throwValidationError(`Invalid bet amount`);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { usdBalanceCents: true }
    });

    if (!user || user.usdBalanceCents < betAmount) {
      ErrorHandler.throwBusinessError('Insufficient balance', ERROR_CODES.INSUFFICIENT_BALANCE);
    }

    // Generate enhanced RNG data
    const serverSeed = ProvablyFairRNG.generateServerSeed();
    const clientSeed = ProvablyFairRNG.generateClientSeed();
    const nonce = Date.now() + Math.floor(Math.random() * 1000);
    const serverSeedHash = ProvablyFairRNG.createSeedHash(serverSeed);

    // Generate all game events deterministically
    const events = this.generateGameEvents(serverSeed, clientSeed, nonce);

    const sessionId = uuidv4();
    
    // Store enhanced session in database
    await prisma.gameSession.create({
      data: {
        id: sessionId,
        userId,
        betAmountCents: betAmount,
        rngSeed: `${serverSeed}:${clientSeed}:${nonce}`,
        serverSeed,
        serverSeedHash,
        clientSeed,
        nonce,
        squirrelEventTime: events.find(e => e.type === 'squirrel')?.second || null,
        status: 'ACTIVE'
      }
    });

    // Store enhanced session data in Redis
    const enhancedSession: Partial<GameSessionEnhanced> = {
      events,
      activeBonuses: {
        leashSlackUsed: false,
        riskMultiplier: 1.0,
        payoutMultiplier: 1.0
      },
      playerChoices: []
    };

    await RedisService.setGameSession(sessionId, {
      userId,
      betAmount,
      startTime: Date.now(),
      squirrelEventTime: events.find(e => e.type === 'squirrel')?.second || null,
      status: 'active',
      serverSeedHash,
      clientSeed,
      nonce,
      enhanced: enhancedSession
    }, 300);

    // Deduct bet amount
    await prisma.$transaction(async (tx: any) => {
      await tx.user.update({
        where: { id: userId },
        data: { usdBalanceCents: { decrement: betAmount } }
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'BET',
          usdAmount: -betAmount,
          status: 'CONFIRMED'
        }
      });
    });

    return {
      sessionId,
      serverSeedHash,
      clientSeed,
      nonce,
      maxDuration: GAME_CONFIG.MAX_GAME_DURATION,
      upcomingEvents: events.map(e => ({ type: e.type, second: e.second }))
    };
  }

  /**
   * Handle player choice for mini-game events
   */
  public static async handleEventChoice(
    userId: string, 
    sessionId: string, 
    eventType: string, 
    choice: 'accept' | 'decline' | 'use_powerup',
    currentSecond: number
  ): Promise<{
    success: boolean;
    result: 'bonus_gained' | 'penalty_applied' | 'no_change' | 'powerup_used';
    newRiskMultiplier: number;
    newPayoutMultiplier: number;
    message: string;
  }> {
    const session = await RedisService.getGameSession(sessionId);
    
    if (!session || session.userId !== userId || !session.enhanced) {
      ErrorHandler.throwBusinessError('Invalid session', ERROR_CODES.GAME_SESSION_NOT_FOUND);
    }

    const enhanced = session.enhanced as Partial<GameSessionEnhanced>;
    const currentEvent = enhanced.events?.find(e => 
      e.second === currentSecond && e.type === eventType
    );

    if (!currentEvent) {
      ErrorHandler.throwBusinessError('Event not found', ERROR_CODES.INVALID_CASHOUT_TIME);
    }

    let result: 'bonus_gained' | 'penalty_applied' | 'no_change' | 'powerup_used' = 'no_change';
    let message = '';
    
    // Handle different event types
    switch (currentEvent.type) {
      case 'mini_bonus':
        if (choice === 'accept') {
          const success = this.resolveMiniBonus(currentEvent.parameters?.rng || '');
          if (success) {
            enhanced.activeBonuses!.payoutMultiplier *= 1.2;
            result = 'bonus_gained';
            message = 'Bonus treat found! +20% payout multiplier';
          } else {
            enhanced.activeBonuses!.riskMultiplier *= 1.3;
            result = 'penalty_applied';
            message = 'Oh no! Risk increased by 30%';
          }
        }
        break;

      case 'fetch_opportunity':
        if (choice === 'accept') {
          enhanced.activeBonuses!.payoutMultiplier *= currentEvent.parameters?.bonusMultiplier || 1.5;
          enhanced.activeBonuses!.riskMultiplier *= currentEvent.parameters?.riskIncrease || 2.0;
          enhanced.activeBonuses!.fetchActiveUntil = currentSecond + (currentEvent.parameters?.duration || 5);
          result = 'bonus_gained';
          message = 'Fetch mode activated! Higher rewards but doubled risk!';
        }
        break;

      case 'safe_zone':
        // Safe zones are automatic - no choice needed
        result = 'no_change';
        message = 'Entering safe zone - reduced risk for 2 seconds';
        enhanced.activeBonuses!.riskMultiplier *= 0.5;
        break;
    }

    // Record player choice
    enhanced.playerChoices!.push({
      second: currentSecond,
      eventType,
      choice,
      parameters: currentEvent.parameters
    });

    // Update Redis session
    session.enhanced = enhanced;
    await RedisService.setGameSession(sessionId, session, 300);

    return {
      success: true,
      result,
      newRiskMultiplier: enhanced.activeBonuses!.riskMultiplier,
      newPayoutMultiplier: enhanced.activeBonuses!.payoutMultiplier,
      message
    };
  }

  /**
   * Enhanced cashout with dynamic multipliers
   */
  public static async enhancedCashOut(
    userId: string, 
    sessionId: string, 
    cashoutSecond: number
  ): Promise<{
    success: boolean;
    outcome: 'win' | 'loss';
    payout: number;
    baseMultiplier: number;
    bonusMultiplier: number;
    finalMultiplier: number;
    eventsTriggered: string[];
    verification: any;
  }> {
    const session = await RedisService.getGameSession(sessionId);
    
    if (!session || session.userId !== userId) {
      ErrorHandler.throwBusinessError('Session not found', ERROR_CODES.GAME_SESSION_NOT_FOUND);
    }

    const enhanced = session.enhanced as Partial<GameSessionEnhanced>;
    const squirrelEvent = enhanced.events?.find(e => e.type === 'squirrel');

    let outcome: 'win' | 'loss' = 'loss';
    let payout = 0;

    // Check if squirrel event occurred before cashout
    if (!squirrelEvent || cashoutSecond < squirrelEvent.second) {
      outcome = 'win';
      
      // Calculate base multiplier using house-edge compliant formula
      const baseMultiplier = GAME_CONFIG.getPayoutMultiplier(cashoutSecond);
      
      // Apply bonus multipliers
      const bonusMultiplier = enhanced.activeBonuses?.payoutMultiplier || 1.0;
      const finalMultiplier = baseMultiplier * bonusMultiplier;
      
      payout = Math.floor(session.betAmount * finalMultiplier);

      // Update user balance
      await prisma.$transaction(async (tx: any) => {
        await tx.user.update({
          where: { id: userId },
          data: { usdBalanceCents: { increment: payout } }
        });

        await tx.transaction.create({
          data: {
            userId,
            type: 'PAYOUT',
            usdAmount: payout,
            status: 'CONFIRMED'
          }
        });
      });
    }

    // Update database with final result
    await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        durationSeconds: cashoutSecond,
        payoutAmountCents: payout,
        outcome: outcome === 'win' ? 'WIN' : 'LOSS',
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    // Clean up Redis
    await RedisService.deleteGameSession(sessionId);

    const eventsTriggered = enhanced.playerChoices?.map(c => `${c.eventType}:${c.choice}`) || [];

    return {
      success: true,
      outcome,
      payout,
      baseMultiplier: GAME_CONFIG.getPayoutMultiplier(cashoutSecond),
      bonusMultiplier: enhanced.activeBonuses?.payoutMultiplier || 1.0,
      finalMultiplier: outcome === 'win' ? 
        GAME_CONFIG.getPayoutMultiplier(cashoutSecond) * (enhanced.activeBonuses?.payoutMultiplier || 1.0) : 0,
      eventsTriggered,
      verification: {
        serverSeed: session.serverSeed || '',
        clientSeed: session.clientSeed,
        nonce: session.nonce,
        events: enhanced.events,
        playerChoices: enhanced.playerChoices
      }
    };
  }

  /**
   * Helper methods
   */
  private static selectBonusType(hash: string): string {
    const typeValue = parseInt(hash.substring(0, 2), 16) % 3;
    return ['bonus_treat', 'butterfly_chase', 'mini_jackpot'][typeValue];
  }

  private static resolveMiniBonus(rng: string): boolean {
    const value = parseInt(rng.substring(0, 4), 16) / 0xFFFF;
    return value < 0.7; // 70% success rate for mini bonuses
  }

  /**
   * Get current game state with events
   */
  public static async getEnhancedGameState(sessionId: string): Promise<{
    currentSecond: number;
    baseMultiplier: number;
    bonusMultiplier: number;
    riskMultiplier: number;
    activeEvents: GameEventType[];
    upcomingEvents: GameEventType[];
  }> {
    const session = await RedisService.getGameSession(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    const currentSecond = Math.floor((Date.now() - session.startTime) / 1000);
    const enhanced = session.enhanced as Partial<GameSessionEnhanced>;
    
    const activeEvents = enhanced.events?.filter(e => e.second === currentSecond) || [];
    const upcomingEvents = enhanced.events?.filter(e => e.second > currentSecond && e.second <= currentSecond + 3) || [];

    return {
      currentSecond,
      baseMultiplier: GAME_CONFIG.getPayoutMultiplier(currentSecond),
      bonusMultiplier: enhanced.activeBonuses?.payoutMultiplier || 1.0,
      riskMultiplier: enhanced.activeBonuses?.riskMultiplier || 1.0,
      activeEvents,
      upcomingEvents
    };
  }
} 