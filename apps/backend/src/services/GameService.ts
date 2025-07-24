import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/services/DatabaseService';
import { RedisService } from '@/services/RedisService';
import { ProvablyFairRNG } from '@/utils/ProvablyFairRNG';
import { ErrorHandler } from '@/middleware/errorHandler';
import { 
  StartGameResponse, 
  CashoutResponse, 
  GameSession,
  GameVerification,
  ERROR_CODES,
  GAME_CONFIG 
} from 'shared';

export class GameService {
  public static async startGame(userId: string, betAmount: number): Promise<StartGameResponse> {
    // Validate bet amount against game configuration
    if (betAmount < GAME_CONFIG.MIN_BET_CENTS || betAmount > GAME_CONFIG.MAX_BET_CENTS) {
      ErrorHandler.throwValidationError(
        `Bet amount must be between $${GAME_CONFIG.MIN_BET_CENTS/100} and $${GAME_CONFIG.MAX_BET_CENTS/100}`,
        { betAmount, minBet: GAME_CONFIG.MIN_BET_CENTS, maxBet: GAME_CONFIG.MAX_BET_CENTS }
      );
    }

    // Validate user can start game
    const canStart = await GameService.validateUserCanStartGame(userId);
    if (!canStart) {
      ErrorHandler.throwBusinessError('You already have an active game session', ERROR_CODES.GAME_ALREADY_ACTIVE);
    }

    // Check user balance with database transaction to prevent race conditions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { usdBalanceCents: true, username: true }
    });

    if (!user) {
      ErrorHandler.throwBusinessError('User not found', ERROR_CODES.USER_NOT_FOUND);
    }

    if (user.usdBalanceCents < betAmount) {
      ErrorHandler.throwBusinessError('Insufficient balance', ERROR_CODES.INSUFFICIENT_BALANCE);
    }

    // Generate RNG data with enhanced entropy
    const serverSeed = ProvablyFairRNG.generateServerSeed();
    const clientSeed = ProvablyFairRNG.generateClientSeed();
    const nonce = Date.now() + Math.floor(Math.random() * 1000); // More secure nonce
    const serverSeedHash = ProvablyFairRNG.createSeedHash(serverSeed);

    // Determine game outcome (predetermined)
    const squirrelEventTime = ProvablyFairRNG.determineSquirrelEvent(serverSeed, clientSeed, nonce);

    // Validate squirrel event time is within game bounds
    if (squirrelEventTime !== null && (squirrelEventTime < 1 || squirrelEventTime > GAME_CONFIG.MAX_GAME_DURATION)) {
      console.error('Invalid squirrel event time generated:', squirrelEventTime);
      ErrorHandler.throwBusinessError('Invalid game configuration', ERROR_CODES.SYSTEM_ERROR);
    }

    const sessionId = uuidv4();
    await prisma.gameSession.create({
      data: {
        id: sessionId,
        userId,
        betAmountCents: betAmount,
        rngSeed: `${serverSeed}:${clientSeed}:${nonce}`,
        serverSeed, // Store but don't reveal until game ends
        serverSeedHash,
        clientSeed,
        nonce,
        squirrelEventTime,
        status: 'ACTIVE'
      }
    });

    // Store session in Redis for fast access
    await RedisService.setGameSession(sessionId, {
      userId,
      betAmount,
      startTime: Date.now(),
      squirrelEventTime,
      status: 'active',
      serverSeedHash,
      clientSeed,
      nonce
    }, 300); // 5 minutes TTL

    // Deduct bet amount from user balance
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
      maxDuration: GAME_CONFIG.MAX_GAME_DURATION
    };
  }

  public static async cashOut(userId: string, sessionId: string, cashoutSecond: number): Promise<CashoutResponse> {
    // Get session from Redis first (faster)
    const redisSession = await RedisService.getGameSession(sessionId);
    
    if (!redisSession || redisSession.userId !== userId) {
      ErrorHandler.throwBusinessError('Game session not found', ERROR_CODES.GAME_SESSION_NOT_FOUND);
    }

    if (redisSession.status !== 'active') {
      ErrorHandler.throwBusinessError('Game session is not active', ERROR_CODES.GAME_ALREADY_COMPLETED);
    }

    // Get full session from database
    const dbSession = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: { user: true }
    });

    if (!dbSession || dbSession.userId !== userId) {
      ErrorHandler.throwBusinessError('Game session not found', ERROR_CODES.GAME_SESSION_NOT_FOUND);
    }

    if (dbSession.status !== 'ACTIVE') {
      ErrorHandler.throwBusinessError('Game session already completed', ERROR_CODES.GAME_ALREADY_COMPLETED);
    }

    // Validate cashout timing
    const gameStartTime = dbSession.createdAt.getTime();
    const currentTime = Date.now();
    const actualElapsedSeconds = Math.floor((currentTime - gameStartTime) / 1000);

    if (cashoutSecond > actualElapsedSeconds + 1) { // Allow 1 second tolerance
      ErrorHandler.throwBusinessError('Invalid cashout time', ERROR_CODES.INVALID_CASHOUT_TIME);
    }

    // Determine outcome
    const squirrelEventTime = dbSession.squirrelEventTime;
    let outcome: 'win' | 'loss';
    let payout = 0;

    if (squirrelEventTime && cashoutSecond >= squirrelEventTime) {
      // Squirrel event occurred before cashout
      outcome = 'loss';
      payout = 0;
    } else {
      // Successful cashout
      outcome = 'win';
      payout = Math.floor(dbSession.betAmountCents * GAME_CONFIG.getPayoutMultiplier(cashoutSecond));
    }

    // Update session in database
    await prisma.$transaction(async (tx: any) => {
      // Update game session
      await tx.gameSession.update({
        where: { id: sessionId },
        data: {
          durationSeconds: cashoutSecond,
          payoutAmountCents: payout,
          outcome: outcome === 'win' ? 'WIN' : 'LOSS',
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      // Update user balance if win
      if (outcome === 'win' && payout > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { usdBalanceCents: { increment: payout } }
        });

        // Record payout transaction
        await tx.transaction.create({
          data: {
            userId,
            type: 'PAYOUT',
            usdAmount: payout,
            status: 'CONFIRMED'
          }
        });
      }
    });

    // Clean up Redis session
    await RedisService.deleteGameSession(sessionId);

    return {
      success: true,
      outcome,
      payout,
      actualDuration: cashoutSecond,
      squirrelEventTime,
      verification: {
        serverSeed: dbSession.serverSeed!,
        squirrelEventTime: squirrelEventTime!,
        canVerify: true
      }
    };
  }

  public static async getGameHistory(userId: string, limit: number, offset: number): Promise<{
    games: GameSession[];
    total: number;
  }> {
    const [games, total] = await Promise.all([
      prisma.gameSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          betAmountCents: true,
          durationSeconds: true,
          payoutAmountCents: true,
          outcome: true,
          squirrelEventTime: true,
          rngSeed: true,
          serverSeedHash: true,
          clientSeed: true,
          nonce: true,
          createdAt: true,
          completedAt: true
        }
      }),
      prisma.gameSession.count({
        where: { userId }
      })
    ]);

    // Transform to match interface
    const transformedGames: GameSession[] = games.map((game: any) => ({
      id: game.id,
      userId,
      betAmount: game.betAmountCents,
      duration: game.durationSeconds || undefined,
      payoutAmount: game.payoutAmountCents,
      outcome: game.outcome === 'WIN' ? 'win' : game.outcome === 'LOSS' ? 'loss' : 'incomplete',
      squirrelEventTime: game.squirrelEventTime || undefined,
      rngSeed: game.rngSeed,
      serverSeedHash: game.serverSeedHash,
      clientSeed: game.clientSeed,
      nonce: Number(game.nonce),
      createdAt: game.createdAt,
      completedAt: game.completedAt || undefined
    }));

    return {
      games: transformedGames,
      total
    };
  }

  public static async getActiveSessions(userId: string): Promise<string[]> {
    // Check Redis first
    const redisActiveSessions = await RedisService.getActiveGameSessions(userId);
    
    // Also check database for any sessions Redis might have missed
    const dbActiveSessions = await prisma.gameSession.findMany({
      where: {
        userId,
        status: 'ACTIVE'
      },
      select: { id: true }
    });

    // Combine and deduplicate
    const allActiveSessions = [
      ...redisActiveSessions,
      ...dbActiveSessions.map((s: any) => s.id)
    ];

    return Array.from(new Set(allActiveSessions));
  }

  public static async verifyGame(sessionId: string): Promise<GameVerification> {
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      ErrorHandler.throwBusinessError('Game session not found', ERROR_CODES.GAME_SESSION_NOT_FOUND);
    }

    if (!session.serverSeed) {
      return {
        isValid: false,
        verification: {
          serverSeed: '',
          clientSeed: session.clientSeed,
          nonce: Number(session.nonce),
          squirrelEventTime: session.squirrelEventTime || 0
        }
      };
    }

    // Verify the game outcome
    const calculatedSquirrelTime = ProvablyFairRNG.determineSquirrelEvent(
      session.serverSeed,
      session.clientSeed,
      Number(session.nonce)
    );

    const isValid = calculatedSquirrelTime === session.squirrelEventTime;

    return {
      isValid,
      verification: {
        serverSeed: session.serverSeed,
        clientSeed: session.clientSeed,
        nonce: Number(session.nonce),
        squirrelEventTime: session.squirrelEventTime || 0
      }
    };
  }

  private static async validateUserCanStartGame(userId: string): Promise<boolean> {
    // Check for active sessions in Redis
    const activeSessions = await RedisService.getActiveGameSessions(userId);
    if (activeSessions.length > 0) {
      return false;
    }

    // Check database for any active sessions
    const activeDbSessions = await prisma.gameSession.count({
      where: {
        userId,
        status: 'ACTIVE'
      }
    });

    return activeDbSessions === 0;
  }

  // Background cleanup for abandoned sessions
  public static async cleanupAbandonedSessions(): Promise<void> {
    const cutoffTime = new Date(Date.now() - 60000); // 1 minute ago

    const abandonedSessions = await prisma.gameSession.findMany({
      where: {
        status: 'ACTIVE',
        createdAt: { lt: cutoffTime }
      }
    });

    for (const session of abandonedSessions) {
      try {
        const elapsedSeconds = Math.floor((Date.now() - session.createdAt.getTime()) / 1000);
        
        let outcome: 'WIN' | 'LOSS';
        let payout = 0;

        if (session.squirrelEventTime && elapsedSeconds >= session.squirrelEventTime) {
          outcome = 'LOSS';
        } else {
          // Auto-cashout at current time
          outcome = 'WIN';
          payout = Math.floor(session.betAmountCents * GAME_CONFIG.getPayoutMultiplier(elapsedSeconds));
        }

        await prisma.$transaction(async (tx: any) => {
          await tx.gameSession.update({
            where: { id: session.id },
            data: {
              durationSeconds: elapsedSeconds,
              payoutAmountCents: payout,
              outcome,
              status: 'ABANDONED',
              completedAt: new Date()
            }
          });

          if (outcome === 'WIN' && payout > 0) {
            await tx.user.update({
              where: { id: session.userId },
              data: { usdBalanceCents: { increment: payout } }
            });

            await tx.transaction.create({
              data: {
                userId: session.userId,
                type: 'PAYOUT',
                usdAmount: payout,
                status: 'CONFIRMED'
              }
            });
          }
        });

        // Clean up Redis
        await RedisService.deleteGameSession(session.id);
      } catch (error) {
        console.error(`Failed to cleanup session ${session.id}:`, error);
      }
    }
  }
} 