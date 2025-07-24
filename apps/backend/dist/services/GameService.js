"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameService = void 0;
const uuid_1 = require("uuid");
const DatabaseService_1 = require("@/services/DatabaseService");
const RedisService_1 = require("@/services/RedisService");
const ProvablyFairRNG_1 = require("@/utils/ProvablyFairRNG");
const errorHandler_1 = require("@/middleware/errorHandler");
const shared_1 = require("shared");
class GameService {
    static async startGame(userId, betAmount) {
        // Validate user can start game
        const canStart = await GameService.validateUserCanStartGame(userId);
        if (!canStart) {
            errorHandler_1.ErrorHandler.throwBusinessError('You already have an active game session', shared_1.ERROR_CODES.GAME_ALREADY_ACTIVE);
        }
        // Check user balance
        const user = await DatabaseService_1.prisma.user.findUnique({
            where: { id: userId },
            select: { usdBalanceCents: true }
        });
        if (!user || user.usdBalanceCents < betAmount) {
            errorHandler_1.ErrorHandler.throwBusinessError('Insufficient balance', shared_1.ERROR_CODES.INSUFFICIENT_BALANCE);
        }
        // Generate RNG data
        const serverSeed = ProvablyFairRNG_1.ProvablyFairRNG.generateServerSeed();
        const clientSeed = ProvablyFairRNG_1.ProvablyFairRNG.generateClientSeed();
        const nonce = Date.now() + Math.floor(Math.random() * 1000); // More secure nonce
        const serverSeedHash = ProvablyFairRNG_1.ProvablyFairRNG.createSeedHash(serverSeed);
        // Determine game outcome (predetermined)
        const squirrelEventTime = ProvablyFairRNG_1.ProvablyFairRNG.determineSquirrelEvent(serverSeed, clientSeed, nonce);
        // Create game session in database
        const sessionId = (0, uuid_1.v4)();
        await DatabaseService_1.prisma.gameSession.create({
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
        await RedisService_1.RedisService.setGameSession(sessionId, {
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
        await DatabaseService_1.prisma.$transaction(async (tx) => {
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
            maxDuration: shared_1.GAME_CONFIG.MAX_GAME_DURATION
        };
    }
    static async cashOut(userId, sessionId, cashoutSecond) {
        // Get session from Redis first (faster)
        const redisSession = await RedisService_1.RedisService.getGameSession(sessionId);
        if (!redisSession || redisSession.userId !== userId) {
            errorHandler_1.ErrorHandler.throwBusinessError('Game session not found', shared_1.ERROR_CODES.GAME_SESSION_NOT_FOUND);
        }
        if (redisSession.status !== 'active') {
            errorHandler_1.ErrorHandler.throwBusinessError('Game session is not active', shared_1.ERROR_CODES.GAME_ALREADY_COMPLETED);
        }
        // Get full session from database
        const dbSession = await DatabaseService_1.prisma.gameSession.findUnique({
            where: { id: sessionId },
            include: { user: true }
        });
        if (!dbSession || dbSession.userId !== userId) {
            errorHandler_1.ErrorHandler.throwBusinessError('Game session not found', shared_1.ERROR_CODES.GAME_SESSION_NOT_FOUND);
        }
        if (dbSession.status !== 'ACTIVE') {
            errorHandler_1.ErrorHandler.throwBusinessError('Game session already completed', shared_1.ERROR_CODES.GAME_ALREADY_COMPLETED);
        }
        // Validate cashout timing
        const gameStartTime = dbSession.createdAt.getTime();
        const currentTime = Date.now();
        const actualElapsedSeconds = Math.floor((currentTime - gameStartTime) / 1000);
        if (cashoutSecond > actualElapsedSeconds + 1) { // Allow 1 second tolerance
            errorHandler_1.ErrorHandler.throwBusinessError('Invalid cashout time', shared_1.ERROR_CODES.INVALID_CASHOUT_TIME);
        }
        // Determine outcome
        const squirrelEventTime = dbSession.squirrelEventTime;
        let outcome;
        let payout = 0;
        if (squirrelEventTime && cashoutSecond >= squirrelEventTime) {
            // Squirrel event occurred before cashout
            outcome = 'loss';
            payout = 0;
        }
        else {
            // Successful cashout
            outcome = 'win';
            payout = Math.floor(dbSession.betAmountCents * shared_1.GAME_CONFIG.getPayoutMultiplier(cashoutSecond));
        }
        // Update session in database
        await DatabaseService_1.prisma.$transaction(async (tx) => {
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
        await RedisService_1.RedisService.deleteGameSession(sessionId);
        return {
            success: true,
            outcome,
            payout,
            actualDuration: cashoutSecond,
            squirrelEventTime,
            verification: {
                serverSeed: dbSession.serverSeed,
                squirrelEventTime: squirrelEventTime,
                canVerify: true
            }
        };
    }
    static async getGameHistory(userId, limit, offset) {
        const [games, total] = await Promise.all([
            DatabaseService_1.prisma.gameSession.findMany({
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
            DatabaseService_1.prisma.gameSession.count({
                where: { userId }
            })
        ]);
        // Transform to match interface
        const transformedGames = games.map(game => ({
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
    static async getActiveSessions(userId) {
        // Check Redis first
        const redisActiveSessions = await RedisService_1.RedisService.getActiveGameSessions(userId);
        // Also check database for any sessions Redis might have missed
        const dbActiveSessions = await DatabaseService_1.prisma.gameSession.findMany({
            where: {
                userId,
                status: 'ACTIVE'
            },
            select: { id: true }
        });
        // Combine and deduplicate
        const allActiveSessions = [
            ...redisActiveSessions,
            ...dbActiveSessions.map(s => s.id)
        ];
        return Array.from(new Set(allActiveSessions));
    }
    static async verifyGame(sessionId) {
        const session = await DatabaseService_1.prisma.gameSession.findUnique({
            where: { id: sessionId }
        });
        if (!session) {
            errorHandler_1.ErrorHandler.throwBusinessError('Game session not found', shared_1.ERROR_CODES.GAME_SESSION_NOT_FOUND);
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
        const calculatedSquirrelTime = ProvablyFairRNG_1.ProvablyFairRNG.determineSquirrelEvent(session.serverSeed, session.clientSeed, Number(session.nonce));
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
    static async validateUserCanStartGame(userId) {
        // Check for active sessions in Redis
        const activeSessions = await RedisService_1.RedisService.getActiveGameSessions(userId);
        if (activeSessions.length > 0) {
            return false;
        }
        // Check database for any active sessions
        const activeDbSessions = await DatabaseService_1.prisma.gameSession.count({
            where: {
                userId,
                status: 'ACTIVE'
            }
        });
        return activeDbSessions === 0;
    }
    // Background cleanup for abandoned sessions
    static async cleanupAbandonedSessions() {
        const cutoffTime = new Date(Date.now() - 60000); // 1 minute ago
        const abandonedSessions = await DatabaseService_1.prisma.gameSession.findMany({
            where: {
                status: 'ACTIVE',
                createdAt: { lt: cutoffTime }
            }
        });
        for (const session of abandonedSessions) {
            try {
                const elapsedSeconds = Math.floor((Date.now() - session.createdAt.getTime()) / 1000);
                let outcome;
                let payout = 0;
                if (session.squirrelEventTime && elapsedSeconds >= session.squirrelEventTime) {
                    outcome = 'LOSS';
                }
                else {
                    // Auto-cashout at current time
                    outcome = 'WIN';
                    payout = Math.floor(session.betAmountCents * shared_1.GAME_CONFIG.getPayoutMultiplier(elapsedSeconds));
                }
                await DatabaseService_1.prisma.$transaction(async (tx) => {
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
                await RedisService_1.RedisService.deleteGameSession(session.id);
            }
            catch (error) {
                console.error(`Failed to cleanup session ${session.id}:`, error);
            }
        }
    }
}
exports.GameService = GameService;
//# sourceMappingURL=GameService.js.map