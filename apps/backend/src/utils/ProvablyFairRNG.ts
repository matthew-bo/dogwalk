import crypto from 'crypto';
import { GAME_CONFIG } from 'shared';

export class ProvablyFairRNG {
  public static generateServerSeed(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  public static generateClientSeed(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  public static createSeedHash(seed: string): string {
    return crypto.createHash('sha256').update(seed).digest('hex');
  }

  public static determineSquirrelEvent(
    serverSeed: string,
    clientSeed: string,
    nonce: number
  ): number | null {
    const combinedSeed = crypto.createHash('sha256')
      .update(`${serverSeed}:${clientSeed}:${nonce}`)
      .digest('hex');

    let hash = combinedSeed;

    for (let second = 1; second <= GAME_CONFIG.MAX_GAME_DURATION; second++) {
      // Create a new hash for each second to ensure randomness
      hash = crypto.createHash('sha256').update(hash).digest('hex');
      
      // Take first 8 characters and convert to a number between 0 and 1
      const randomValue = parseInt(hash.substring(0, 8), 16) / 0xFFFFFFFF;
      
      // Get risk for this second
      const squirrelChance = GAME_CONFIG.getRiskPerSecond(second);
      
      if (randomValue < squirrelChance) {
        return second; // Squirrel appears at this second
      }
    }

    return null; // No squirrel event within max duration
  }

  public static verifyGameOutcome(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
    claimedSquirrelTime: number | null
  ): boolean {
    const calculatedSquirrelTime = ProvablyFairRNG.determineSquirrelEvent(
      serverSeed,
      clientSeed,
      nonce
    );

    return calculatedSquirrelTime === claimedSquirrelTime;
  }

  public static calculateWinProbability(seconds: number): number {
    let survivalProbability = 1;

    for (let i = 1; i <= seconds; i++) {
      const riskThisSecond = GAME_CONFIG.getRiskPerSecond(i);
      survivalProbability *= (1 - riskThisSecond);
    }

    return survivalProbability;
  }

  public static calculateExpectedPayout(betAmount: number, seconds: number): number {
    const winProbability = ProvablyFairRNG.calculateWinProbability(seconds);
    const payoutMultiplier = GAME_CONFIG.getPayoutMultiplier(seconds);
    const potentialPayout = betAmount * payoutMultiplier;
    
    return winProbability * potentialPayout;
  }

  public static getHouseEdge(seconds: number): number {
    const winProbability = ProvablyFairRNG.calculateWinProbability(seconds);
    const payoutMultiplier = GAME_CONFIG.getPayoutMultiplier(seconds);
    
    // Expected value for the player
    const expectedValue = winProbability * payoutMultiplier;
    
    // House edge is 1 - expected value
    return 1 - expectedValue;
  }

  // Generate a provable client seed that players can verify
  public static generateProvableClientSeed(): string {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    
    return crypto.createHash('sha256')
      .update(`${timestamp}:${randomBytes}`)
      .digest('hex')
      .substring(0, 16);
  }

  // Verify that a game result is mathematically fair
  public static auditGameResult(
    serverSeed: string,
    serverSeedHash: string,
    clientSeed: string,
    nonce: number,
    outcome: {
      squirrelEventTime: number | null;
      cashoutTime?: number;
      result: 'win' | 'loss';
    }
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Verify server seed hash
    const calculatedHash = ProvablyFairRNG.createSeedHash(serverSeed);
    if (calculatedHash !== serverSeedHash) {
      errors.push('Server seed hash does not match');
    }

    // Verify squirrel event time
    const calculatedSquirrelTime = ProvablyFairRNG.determineSquirrelEvent(
      serverSeed,
      clientSeed,
      nonce
    );

    if (calculatedSquirrelTime !== outcome.squirrelEventTime) {
      errors.push(`Squirrel event time mismatch. Expected: ${calculatedSquirrelTime}, Got: ${outcome.squirrelEventTime}`);
    }

    // Verify game result logic
    if (outcome.cashoutTime && outcome.squirrelEventTime) {
      if (outcome.cashoutTime >= outcome.squirrelEventTime) {
        if (outcome.result !== 'loss') {
          errors.push('Game should be a loss when cashing out after squirrel event');
        }
      } else {
        if (outcome.result !== 'win') {
          errors.push('Game should be a win when cashing out before squirrel event');
        }
      }
    } else if (!outcome.cashoutTime && outcome.squirrelEventTime) {
      // Game abandoned or timed out
      if (outcome.result !== 'loss') {
        errors.push('Abandoned game should result in loss');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 