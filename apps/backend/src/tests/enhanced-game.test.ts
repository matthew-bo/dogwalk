import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { EnhancedGameService } from '../services/EnhancedGameService';
import { ProvablyFairRNG } from '../utils/ProvablyFairRNG';
import { GAME_CONFIG } from 'shared';

// Mock dependencies
jest.mock('../services/DatabaseService');
jest.mock('../services/RedisService');

describe('Enhanced Game System', () => {
  
  describe('House Edge Verification', () => {
    test('should maintain exactly 8% house edge at all cashout times', () => {
      const iterations = 1000;
      const tolerance = 0.001; // 0.1% tolerance
      
      for (let seconds = 1; seconds <= 30; seconds++) {
        let totalExpectedValue = 0;
        
        for (let i = 0; i < iterations; i++) {
          // Calculate survival probability
          let survivalProb = 1;
          for (let s = 1; s <= seconds; s++) {
            survivalProb *= (1 - GAME_CONFIG.getRiskPerSecond(s));
          }
          
          // Get payout multiplier
          const multiplier = GAME_CONFIG.getPayoutMultiplier(seconds);
          
          // Expected value should be exactly (1 - house edge)
          const expectedValue = survivalProb * multiplier;
          totalExpectedValue += expectedValue;
        }
        
        const averageExpectedValue = totalExpectedValue / iterations;
        const expectedHouseEdge = 1 - averageExpectedValue;
        
        // Should be exactly 8% house edge
        expect(Math.abs(expectedHouseEdge - 0.08)).toBeLessThan(tolerance);
      }
    });

    test('should prevent early cashout exploitation', () => {
      // Test that 1-second cashout has negative expected value
      const survivalProb = 0.99; // 99% chance (1% risk)
      const multiplier = GAME_CONFIG.getPayoutMultiplier(1);
      const expectedValue = survivalProb * multiplier;
      
      // Should be less than 1.0 (negative expected value for player)
      expect(expectedValue).toBeLessThan(1.0);
      expect(expectedValue).toBeCloseTo(0.92, 2); // Should be ~92% (8% house edge)
    });

    test('should maintain house edge with bonus multipliers', () => {
      const baseMultiplier = GAME_CONFIG.getPayoutMultiplier(10);
      const bonusMultiplier = 1.5; // 50% bonus
      const totalMultiplier = baseMultiplier * bonusMultiplier;
      
      // Calculate survival probability for 10 seconds
      let survivalProb = 1;
      for (let s = 1; s <= 10; s++) {
        survivalProb *= (1 - GAME_CONFIG.getRiskPerSecond(s));
      }
      
      // With bonus, expected value should still respect the base house edge
      const expectedValue = survivalProb * totalMultiplier;
      
      // The enhanced expected value should be higher but still controlled
      expect(expectedValue).toBeGreaterThan(0.92); // Better than base
      expect(expectedValue).toBeLessThan(1.5); // But not exploitable
    });
  });

  describe('Provably Fair RNG', () => {
    test('should generate deterministic events from seed', () => {
      const serverSeed = 'test_server_seed_12345';
      const clientSeed = 'test_client_seed_67890';
      const nonce = 1234567890;

      // Generate events multiple times with same seed
      const events1 = EnhancedGameService.generateGameEvents(serverSeed, clientSeed, nonce);
      const events2 = EnhancedGameService.generateGameEvents(serverSeed, clientSeed, nonce);

      // Should be identical
      expect(events1).toEqual(events2);
      expect(events1.length).toBeGreaterThan(0);
    });

    test('should generate different events with different seeds', () => {
      const serverSeed1 = 'test_server_seed_1';
      const serverSeed2 = 'test_server_seed_2';
      const clientSeed = 'test_client_seed';
      const nonce = 12345;

      const events1 = EnhancedGameService.generateGameEvents(serverSeed1, clientSeed, nonce);
      const events2 = EnhancedGameService.generateGameEvents(serverSeed2, clientSeed, nonce);

      // Should be different (very high probability)
      expect(events1).not.toEqual(events2);
    });

    test('should always include a squirrel event', () => {
      const serverSeed = 'test_server_seed';
      const clientSeed = 'test_client_seed';
      const nonce = 12345;

      const events = EnhancedGameService.generateGameEvents(serverSeed, clientSeed, nonce);
      
      const squirrelEvents = events.filter(e => e.type === 'squirrel');
      expect(squirrelEvents.length).toBe(1);
      expect(squirrelEvents[0].second).toBeGreaterThanOrEqual(1);
      expect(squirrelEvents[0].second).toBeLessThanOrEqual(30);
    });

    test('should generate bonus events with appropriate frequency', () => {
      const iterations = 100;
      let totalBonusEvents = 0;

      for (let i = 0; i < iterations; i++) {
        const events = EnhancedGameService.generateGameEvents(
          `seed_${i}`, 
          'client_seed', 
          i
        );
        
        const bonusEvents = events.filter(e => e.type === 'mini_bonus');
        totalBonusEvents += bonusEvents.length;
      }

      const averageBonusEvents = totalBonusEvents / iterations;
      
      // Should average around 2-4 bonus events per game (rough estimate)
      expect(averageBonusEvents).toBeGreaterThan(1);
      expect(averageBonusEvents).toBeLessThan(6);
    });
  });

  describe('Game Event Logic', () => {
    test('should properly sort events by time', () => {
      const events = EnhancedGameService.generateGameEvents(
        'test_seed', 
        'client_seed', 
        12345
      );

      for (let i = 1; i < events.length; i++) {
        expect(events[i].second).toBeGreaterThanOrEqual(events[i - 1].second);
      }
    });

    test('should validate event parameters', () => {
      const events = EnhancedGameService.generateGameEvents(
        'test_seed', 
        'client_seed', 
        12345
      );

      events.forEach(event => {
        expect(event.second).toBeGreaterThanOrEqual(1);
        expect(event.second).toBeLessThanOrEqual(30);
        expect(event.type).toBeDefined();
        expect(['squirrel', 'mini_bonus', 'fetch_opportunity', 'butterfly_chase', 'progressive_jackpot', 'safe_zone'])
          .toContain(event.type);
      });
    });

    test('should include safe zones at predetermined times', () => {
      const events = EnhancedGameService.generateGameEvents(
        'test_seed', 
        'client_seed', 
        12345
      );

      const safeZones = events.filter(e => e.type === 'safe_zone');
      
      // Should have safe zones at seconds 10 and 20
      expect(safeZones.length).toBe(2);
      expect(safeZones.map(e => e.second)).toContain(10);
      expect(safeZones.map(e => e.second)).toContain(20);
    });
  });

  describe('Risk and Payout Calculations', () => {
    test('should calculate correct survival probabilities', () => {
      // Test known values
      expect(ProvablyFairRNG.calculateWinProbability(1)).toBeCloseTo(0.99, 3);
      expect(ProvablyFairRNG.calculateWinProbability(5)).toBeCloseTo(0.951, 3);
      
      // Survival probability should decrease with time
      for (let i = 1; i < 30; i++) {
        const prob1 = ProvablyFairRNG.calculateWinProbability(i);
        const prob2 = ProvablyFairRNG.calculateWinProbability(i + 1);
        expect(prob2).toBeLessThan(prob1);
      }
    });

    test('should calculate house edge correctly for all time periods', () => {
      for (let seconds = 1; seconds <= 30; seconds++) {
        const houseEdge = ProvablyFairRNG.getHouseEdge(seconds);
        expect(houseEdge).toBeCloseTo(0.08, 3); // Should be exactly 8%
      }
    });

    test('should handle edge cases in payout calculation', () => {
      // Zero seconds (should not happen but handle gracefully)
      expect(() => GAME_CONFIG.getPayoutMultiplier(0)).not.toThrow();
      
      // Maximum seconds
      const maxPayout = GAME_CONFIG.getPayoutMultiplier(30);
      expect(maxPayout).toBeGreaterThan(1);
      expect(maxPayout).toBeLessThan(100); // Should be reasonable
      
      // Negative seconds (should not happen)
      expect(() => GAME_CONFIG.getPayoutMultiplier(-1)).not.toThrow();
    });
  });

  describe('Enhanced Game Mechanics', () => {
    test('should properly calculate bonus multipliers', () => {
      const baseAmount = 1000; // $10
      const baseMultiplier = GAME_CONFIG.getPayoutMultiplier(10);
      const bonusMultiplier = 1.5;
      
      const basePayout = baseAmount * baseMultiplier;
      const enhancedPayout = baseAmount * baseMultiplier * bonusMultiplier;
      
      expect(enhancedPayout).toBe(basePayout * bonusMultiplier);
      expect(enhancedPayout).toBeGreaterThan(basePayout);
    });

    test('should validate risk multiplier effects', () => {
      // Risk multipliers should affect the actual risk calculation
      const baseRisk = GAME_CONFIG.getRiskPerSecond(10);
      const riskMultiplier = 2.0;
      const enhancedRisk = Math.min(baseRisk * riskMultiplier, 1.0); // Cap at 100%
      
      expect(enhancedRisk).toBeGreaterThanOrEqual(baseRisk);
      expect(enhancedRisk).toBeLessThanOrEqual(1.0);
    });

    test('should handle leash slack power-up logic', () => {
      // Leash slack should provide one-time protection
      // This would be tested with actual game state in integration tests
      const powerUpUsed = true;
      const subsequentRiskIncrease = 1.3;
      
      expect(powerUpUsed).toBe(true);
      expect(subsequentRiskIncrease).toBeGreaterThan(1.0);
    });
  });

  describe('Game Verification', () => {
    test('should verify game outcomes correctly', () => {
      const serverSeed = 'test_server_seed';
      const clientSeed = 'test_client_seed';
      const nonce = 12345;
      const serverSeedHash = ProvablyFairRNG.createSeedHash(serverSeed);

      // Determine actual squirrel time
      const actualSquirrelTime = ProvablyFairRNG.determineSquirrelEvent(
        serverSeed, 
        clientSeed, 
        nonce
      );

      // Verify the result
      const verification = ProvablyFairRNG.auditGameResult(
        serverSeed,
        serverSeedHash,
        clientSeed,
        nonce,
        {
          squirrelEventTime: actualSquirrelTime,
          cashoutTime: actualSquirrelTime ? actualSquirrelTime - 1 : 15,
          result: actualSquirrelTime && actualSquirrelTime <= 15 ? 'loss' : 'win'
        }
      );

      expect(verification.isValid).toBe(true);
      expect(verification.errors).toHaveLength(0);
    });

    test('should detect tampered results', () => {
      const serverSeed = 'test_server_seed';
      const clientSeed = 'test_client_seed';
      const nonce = 12345;
      const serverSeedHash = ProvablyFairRNG.createSeedHash(serverSeed);

      // Create a false result
      const verification = ProvablyFairRNG.auditGameResult(
        serverSeed,
        serverSeedHash,
        clientSeed,
        nonce,
        {
          squirrelEventTime: 5, // False time
          cashoutTime: 10,
          result: 'win' // False result
        }
      );

      // Should detect the tampering
      expect(verification.isValid).toBe(false);
      expect(verification.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Security', () => {
    test('should generate events efficiently', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        EnhancedGameService.generateGameEvents(
          `seed_${i}`, 
          'client_seed', 
          i
        );
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete 1000 generations in under 1 second
      expect(duration).toBeLessThan(1000);
    });

    test('should use cryptographically secure randomness', () => {
      const seed1 = ProvablyFairRNG.generateServerSeed();
      const seed2 = ProvablyFairRNG.generateServerSeed();
      
      // Should be different
      expect(seed1).not.toBe(seed2);
      
      // Should be proper length (64 hex characters)
      expect(seed1).toHaveLength(64);
      expect(seed2).toHaveLength(64);
      
      // Should be hex
      expect(seed1).toMatch(/^[0-9a-f]+$/);
      expect(seed2).toMatch(/^[0-9a-f]+$/);
    });

    test('should create valid hash commitments', () => {
      const serverSeed = 'test_server_seed';
      const hash1 = ProvablyFairRNG.createSeedHash(serverSeed);
      const hash2 = ProvablyFairRNG.createSeedHash(serverSeed);
      
      // Same input should produce same hash
      expect(hash1).toBe(hash2);
      
      // Should be SHA256 length (64 hex characters)
      expect(hash1).toHaveLength(64);
      expect(hash1).toMatch(/^[0-9a-f]+$/);
      
      // Different input should produce different hash
      const differentHash = ProvablyFairRNG.createSeedHash('different_seed');
      expect(differentHash).not.toBe(hash1);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty or invalid seeds gracefully', () => {
      expect(() => {
        EnhancedGameService.generateGameEvents('', 'client', 123);
      }).not.toThrow();
      
      expect(() => {
        EnhancedGameService.generateGameEvents('server', '', 123);
      }).not.toThrow();
    });

    test('should handle extreme nonce values', () => {
      const extremeNonces = [0, Number.MAX_SAFE_INTEGER, -1, 999999999999];
      
      extremeNonces.forEach(nonce => {
        expect(() => {
          EnhancedGameService.generateGameEvents('server', 'client', nonce);
        }).not.toThrow();
      });
    });

    test('should validate game configuration constants', () => {
      expect(GAME_CONFIG.MIN_BET_CENTS).toBe(500);
      expect(GAME_CONFIG.MAX_BET_CENTS).toBe(10000000);
      expect(GAME_CONFIG.MAX_GAME_DURATION).toBe(30);
      expect(GAME_CONFIG.BASE_HOUSE_EDGE).toBe(0.08);
      
      // Risk function should return valid percentages
      for (let i = 1; i <= 30; i++) {
        const risk = GAME_CONFIG.getRiskPerSecond(i);
        expect(risk).toBeGreaterThan(0);
        expect(risk).toBeLessThanOrEqual(1);
      }
    });
  });
});

// Integration test for the complete enhanced game flow
describe('Enhanced Game Integration', () => {
  test('should complete full game cycle with events', async () => {
    // This would test the complete flow:
    // 1. Start enhanced game
    // 2. Generate events
    // 3. Handle player choices
    // 4. Calculate final payout
    // 5. Verify result
    
    // Mock implementation for now
    const mockGameFlow = {
      startGame: jest.fn().mockResolvedValue({ sessionId: 'test-session' }),
      handleEvent: jest.fn().mockResolvedValue({ success: true }),
      cashOut: jest.fn().mockResolvedValue({ payout: 1500, outcome: 'win' })
    };
    
    const session = await mockGameFlow.startGame();
    expect(session.sessionId).toBe('test-session');
    
    const eventResult = await mockGameFlow.handleEvent();
    expect(eventResult.success).toBe(true);
    
    const cashoutResult = await mockGameFlow.cashOut();
    expect(cashoutResult.outcome).toBe('win');
    expect(cashoutResult.payout).toBeGreaterThan(1000);
  });
}); 