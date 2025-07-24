"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvablyFairRNG = void 0;
const crypto_1 = __importDefault(require("crypto"));
const shared_1 = require("shared");
class ProvablyFairRNG {
    static generateServerSeed() {
        return crypto_1.default.randomBytes(32).toString('hex');
    }
    static generateClientSeed() {
        return crypto_1.default.randomBytes(16).toString('hex');
    }
    static createSeedHash(seed) {
        return crypto_1.default.createHash('sha256').update(seed).digest('hex');
    }
    static determineSquirrelEvent(serverSeed, clientSeed, nonce) {
        const combinedSeed = crypto_1.default.createHash('sha256')
            .update(`${serverSeed}:${clientSeed}:${nonce}`)
            .digest('hex');
        let hash = combinedSeed;
        for (let second = 1; second <= shared_1.GAME_CONFIG.MAX_GAME_DURATION; second++) {
            // Create a new hash for each second to ensure randomness
            hash = crypto_1.default.createHash('sha256').update(hash).digest('hex');
            // Take first 8 characters and convert to a number between 0 and 1
            const randomValue = parseInt(hash.substring(0, 8), 16) / 0xFFFFFFFF;
            // Get risk for this second
            const squirrelChance = shared_1.GAME_CONFIG.getRiskPerSecond(second);
            if (randomValue < squirrelChance) {
                return second; // Squirrel appears at this second
            }
        }
        return null; // No squirrel event within max duration
    }
    static verifyGameOutcome(serverSeed, clientSeed, nonce, claimedSquirrelTime) {
        const calculatedSquirrelTime = ProvablyFairRNG.determineSquirrelEvent(serverSeed, clientSeed, nonce);
        return calculatedSquirrelTime === claimedSquirrelTime;
    }
    static calculateWinProbability(seconds) {
        let survivalProbability = 1;
        for (let i = 1; i <= seconds; i++) {
            const riskThisSecond = shared_1.GAME_CONFIG.getRiskPerSecond(i);
            survivalProbability *= (1 - riskThisSecond);
        }
        return survivalProbability;
    }
    static calculateExpectedPayout(betAmount, seconds) {
        const winProbability = ProvablyFairRNG.calculateWinProbability(seconds);
        const payoutMultiplier = shared_1.GAME_CONFIG.getPayoutMultiplier(seconds);
        const potentialPayout = betAmount * payoutMultiplier;
        return winProbability * potentialPayout;
    }
    static getHouseEdge(seconds) {
        const winProbability = ProvablyFairRNG.calculateWinProbability(seconds);
        const payoutMultiplier = shared_1.GAME_CONFIG.getPayoutMultiplier(seconds);
        // Expected value for the player
        const expectedValue = winProbability * payoutMultiplier;
        // House edge is 1 - expected value
        return 1 - expectedValue;
    }
    // Generate a provable client seed that players can verify
    static generateProvableClientSeed() {
        const timestamp = Date.now();
        const randomBytes = crypto_1.default.randomBytes(8).toString('hex');
        return crypto_1.default.createHash('sha256')
            .update(`${timestamp}:${randomBytes}`)
            .digest('hex')
            .substring(0, 16);
    }
    // Verify that a game result is mathematically fair
    static auditGameResult(serverSeed, serverSeedHash, clientSeed, nonce, outcome) {
        const errors = [];
        // Verify server seed hash
        const calculatedHash = ProvablyFairRNG.createSeedHash(serverSeed);
        if (calculatedHash !== serverSeedHash) {
            errors.push('Server seed hash does not match');
        }
        // Verify squirrel event time
        const calculatedSquirrelTime = ProvablyFairRNG.determineSquirrelEvent(serverSeed, clientSeed, nonce);
        if (calculatedSquirrelTime !== outcome.squirrelEventTime) {
            errors.push(`Squirrel event time mismatch. Expected: ${calculatedSquirrelTime}, Got: ${outcome.squirrelEventTime}`);
        }
        // Verify game result logic
        if (outcome.cashoutTime && outcome.squirrelEventTime) {
            if (outcome.cashoutTime >= outcome.squirrelEventTime) {
                if (outcome.result !== 'loss') {
                    errors.push('Game should be a loss when cashing out after squirrel event');
                }
            }
            else {
                if (outcome.result !== 'win') {
                    errors.push('Game should be a win when cashing out before squirrel event');
                }
            }
        }
        else if (!outcome.cashoutTime && outcome.squirrelEventTime) {
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
exports.ProvablyFairRNG = ProvablyFairRNG;
//# sourceMappingURL=ProvablyFairRNG.js.map