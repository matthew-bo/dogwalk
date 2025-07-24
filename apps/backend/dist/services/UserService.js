"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const DatabaseService_1 = require("@/services/DatabaseService");
const AuthService_1 = require("@/services/AuthService");
const errorHandler_1 = require("@/middleware/errorHandler");
const shared_1 = require("shared");
class UserService {
    static async getUserProfile(userId) {
        const user = await DatabaseService_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                usdBalanceCents: true,
                isAgeVerified: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!user) {
            errorHandler_1.ErrorHandler.throwBusinessError('User not found', shared_1.ERROR_CODES.USER_NOT_FOUND);
        }
        // Calculate user statistics
        const [gameStats, wagerStats, longestWalk, biggestWin] = await Promise.all([
            DatabaseService_1.prisma.gameSession.groupBy({
                by: ['outcome'],
                where: { userId },
                _count: { outcome: true }
            }),
            DatabaseService_1.prisma.gameSession.aggregate({
                where: { userId },
                _sum: {
                    betAmountCents: true,
                    payoutAmountCents: true
                }
            }),
            DatabaseService_1.prisma.gameSession.aggregate({
                where: {
                    userId,
                    outcome: { in: ['WIN', 'LOSS'] }
                },
                _max: { durationSeconds: true }
            }),
            DatabaseService_1.prisma.gameSession.aggregate({
                where: {
                    userId,
                    outcome: 'WIN'
                },
                _max: { payoutAmountCents: true }
            })
        ]);
        const totalGames = gameStats.reduce((sum, stat) => sum + stat._count.outcome, 0);
        const totalWins = gameStats.find(stat => stat.outcome === 'WIN')?._count.outcome || 0;
        const totalLosses = gameStats.find(stat => stat.outcome === 'LOSS')?._count.outcome || 0;
        const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
        return {
            user,
            statistics: {
                totalGames,
                totalWins,
                totalLosses,
                winRate: Math.round(winRate * 100) / 100,
                totalWagered: wagerStats._sum.betAmountCents || 0,
                totalWinnings: wagerStats._sum.payoutAmountCents || 0,
                longestWalk: longestWalk._max.durationSeconds || 0,
                biggestWin: biggestWin._max.payoutAmountCents || 0
            }
        };
    }
    static async updateUserProfile(userId, updates) {
        const { email, currentPassword, newPassword } = updates;
        // Handle password change
        if (newPassword && currentPassword) {
            await AuthService_1.AuthService.changePassword(userId, currentPassword, newPassword);
        }
        // Handle email update
        if (email) {
            // Check if email is already taken
            const existingUser = await DatabaseService_1.prisma.user.findFirst({
                where: {
                    email,
                    id: { not: userId }
                }
            });
            if (existingUser) {
                errorHandler_1.ErrorHandler.throwBusinessError('Email already in use', shared_1.ERROR_CODES.USER_ALREADY_EXISTS);
            }
            await DatabaseService_1.prisma.user.update({
                where: { id: userId },
                data: { email }
            });
        }
        // Return updated user
        const updatedUser = await DatabaseService_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                usdBalanceCents: true,
                isAgeVerified: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!updatedUser) {
            errorHandler_1.ErrorHandler.throwBusinessError('User not found', shared_1.ERROR_CODES.USER_NOT_FOUND);
        }
        return updatedUser;
    }
    static async getUserCosmetics(userId) {
        const [userCosmetics, userProfile] = await Promise.all([
            DatabaseService_1.prisma.userCosmetic.findMany({
                where: { userId },
                select: {
                    id: true,
                    cosmeticType: true,
                    cosmeticId: true,
                    unlockedAt: true
                }
            }),
            UserService.getUserProfile(userId)
        ]);
        // Transform cosmetics
        const unlockedCosmetics = userCosmetics.map(cosmetic => ({
            id: cosmetic.id,
            userId,
            cosmeticType: cosmetic.cosmeticType.toLowerCase().replace('_', '_'),
            cosmeticId: cosmetic.cosmeticId,
            unlockedAt: cosmetic.unlockedAt
        }));
        // Check which dog breeds are unlocked
        const unlockedBreeds = unlockedCosmetics
            .filter(c => c.cosmeticType === 'dog_breed')
            .map(c => c.cosmeticId);
        // Add default breed if not already unlocked
        if (!unlockedBreeds.includes('golden_retriever')) {
            unlockedBreeds.push('golden_retriever');
        }
        // Check unlock requirements for locked breeds
        const availableDogBreeds = await Promise.all(shared_1.DOG_BREEDS.map(async (breed) => {
            const isUnlocked = unlockedBreeds.includes(breed.id);
            if (isUnlocked || breed.isDefault) {
                return breed;
            }
            // Check if requirements are met
            const requirementMet = await UserService.checkUnlockRequirement(userId, breed.unlockRequirement || '');
            return {
                ...breed,
                isUnlocked: requirementMet
            };
        }));
        return {
            unlockedCosmetics,
            availableDogBreeds,
            selectedDogBreed: 'golden_retriever' // Default selection
        };
    }
    static async getLeaderboard(period, limit) {
        const timeFilter = UserService.getTimeFilter(period);
        const [topWins, longestWalks] = await Promise.all([
            // Top wins by payout amount
            DatabaseService_1.prisma.gameSession.findMany({
                where: {
                    outcome: 'WIN',
                    ...(timeFilter && { createdAt: { gte: timeFilter } })
                },
                orderBy: { payoutAmountCents: 'desc' },
                take: limit,
                include: {
                    user: {
                        select: { username: true }
                    }
                }
            }),
            // Longest walks by duration
            DatabaseService_1.prisma.gameSession.findMany({
                where: {
                    outcome: { in: ['WIN', 'LOSS'] },
                    durationSeconds: { not: null },
                    ...(timeFilter && { createdAt: { gte: timeFilter } })
                },
                orderBy: { durationSeconds: 'desc' },
                take: limit,
                include: {
                    user: {
                        select: { username: true }
                    }
                }
            })
        ]);
        const topWinsEntries = topWins.map(session => ({
            userId: session.userId,
            username: session.user.username,
            value: session.payoutAmountCents,
            gameSessionId: session.id,
            createdAt: session.createdAt
        }));
        const longestWalksEntries = longestWalks.map(session => ({
            userId: session.userId,
            username: session.user.username,
            value: session.durationSeconds || 0,
            gameSessionId: session.id,
            createdAt: session.createdAt
        }));
        return {
            topWins: topWinsEntries,
            longestWalks: longestWalksEntries,
            period
        };
    }
    static async checkUnlockRequirement(userId, requirement) {
        switch (requirement) {
            case 'Win 10 games':
                const winCount = await DatabaseService_1.prisma.gameSession.count({
                    where: { userId, outcome: 'WIN' }
                });
                return winCount >= 10;
            case 'Walk for 25+ seconds':
                const longWalk = await DatabaseService_1.prisma.gameSession.findFirst({
                    where: {
                        userId,
                        durationSeconds: { gte: 25 }
                    }
                });
                return !!longWalk;
            case 'Deposit $100+':
                const largeDeposit = await DatabaseService_1.prisma.transaction.findFirst({
                    where: {
                        userId,
                        type: 'DEPOSIT',
                        usdAmount: { gte: 10000 } // $100 in cents
                    }
                });
                return !!largeDeposit;
            default:
                return false;
        }
    }
    static getTimeFilter(period) {
        const now = new Date();
        switch (period) {
            case 'daily':
                const startOfDay = new Date(now);
                startOfDay.setHours(0, 0, 0, 0);
                return startOfDay;
            case 'weekly':
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - 7);
                startOfWeek.setHours(0, 0, 0, 0);
                return startOfWeek;
            case 'all-time':
            default:
                return null;
        }
    }
}
exports.UserService = UserService;
//# sourceMappingURL=UserService.js.map