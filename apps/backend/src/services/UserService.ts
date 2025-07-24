import { prisma } from '@/services/DatabaseService';
import { AuthService } from '@/services/AuthService';
import { ErrorHandler } from '@/middleware/errorHandler';
import { 
  User, 
  UserCosmetic, 
  DogBreed, 
  Leaderboard,
  LeaderboardEntry,
  ERROR_CODES,
  DOG_BREEDS 
} from 'shared';

export class UserService {
  public static async getUserProfile(userId: string): Promise<{
    user: User;
    statistics: {
      totalGames: number;
      totalWins: number;
      totalLosses: number;
      winRate: number;
      totalWagered: number;
      totalWinnings: number;
      longestWalk: number;
      biggestWin: number;
    };
  }> {
    const user = await prisma.user.findUnique({
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
      ErrorHandler.throwBusinessError('User not found', ERROR_CODES.USER_NOT_FOUND);
    }

    // Calculate user statistics
    const [gameStats, wagerStats, longestWalk, biggestWin] = await Promise.all([
      prisma.gameSession.groupBy({
        by: ['outcome'],
        where: { userId },
        _count: { outcome: true }
      }),
      prisma.gameSession.aggregate({
        where: { userId },
        _sum: { 
          betAmountCents: true,
          payoutAmountCents: true
        }
      }),
      prisma.gameSession.aggregate({
        where: { 
          userId,
          outcome: { in: ['WIN', 'LOSS'] }
        },
        _max: { durationSeconds: true }
      }),
      prisma.gameSession.aggregate({
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

  public static async updateUserProfile(userId: string, updates: {
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  }): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      ErrorHandler.throwBusinessError('User not found', ERROR_CODES.USER_NOT_FOUND);
    }

    const updateData: any = {};

    // Handle email update
    if (updates.email && updates.email !== user.email) {
      // Check if email is already taken
      const existingUser = await prisma.user.findUnique({
        where: { email: updates.email }
      });

      if (existingUser) {
        ErrorHandler.throwBusinessError('Email already in use', ERROR_CODES.USER_ALREADY_EXISTS);
      }

      updateData.email = updates.email;
    }

    // Handle password update
    if (updates.newPassword && updates.currentPassword) {
      const isCurrentPasswordValid = await AuthService.verifyPassword(updates.currentPassword, user.passwordHash);
      
      if (!isCurrentPasswordValid) {
        ErrorHandler.throwAuthError('Current password is incorrect', ERROR_CODES.INVALID_CREDENTIALS);
      }

      const saltRounds = 12;
      updateData.passwordHash = await require('bcrypt').hash(updates.newPassword, saltRounds);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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

    return updatedUser;
  }

  public static async getUserCosmetics(userId: string): Promise<{
    unlockedCosmetics: UserCosmetic[];
    availableDogBreeds: DogBreed[];
    selectedDogBreed: string;
  }> {
    const [userCosmetics, userProfile] = await Promise.all([
      prisma.userCosmetic.findMany({
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
    const unlockedCosmetics: UserCosmetic[] = userCosmetics.map(cosmetic => ({
      id: cosmetic.id,
      userId,
      cosmeticType: cosmetic.cosmeticType.toLowerCase().replace('_', '_') as any,
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
    const availableDogBreeds: DogBreed[] = await Promise.all(
      DOG_BREEDS.map(async (breed) => {
        const isUnlocked = unlockedBreeds.includes(breed.id);
        
        if (isUnlocked || breed.isDefault) {
          return breed;
        }

        // Check if requirements are met
        const requirementMet = await UserService.checkUnlockRequirement(
          userId, 
          (breed as any).unlockRequirement || ''
        );

        return {
          ...breed,
          isUnlocked: requirementMet
        };
      })
    );

    return {
      unlockedCosmetics,
      availableDogBreeds,
      selectedDogBreed: 'golden_retriever' // Default selection
    };
  }

  public static async getLeaderboard(period: 'daily' | 'weekly' | 'all-time', limit: number = 10): Promise<Leaderboard> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'all-time':
      default:
        startDate = new Date(0); // Beginning of time
        break;
    }

    // Get top wins leaderboard
    const topWins = await prisma.gameSession.findMany({
      where: {
        outcome: 'WIN',
        completedAt: {
          gte: startDate
        }
      },
      orderBy: {
        payoutAmountCents: 'desc'
      },
      take: limit,
      include: {
        user: {
          select: {
            username: true
          }
        }
      }
    });

    // Get longest walks leaderboard
    const longestWalks = await prisma.gameSession.findMany({
      where: {
        outcome: { in: ['WIN', 'LOSS'] },
        completedAt: {
          gte: startDate
        },
        durationSeconds: {
          not: null
        }
      },
      orderBy: {
        durationSeconds: 'desc'
      },
      take: limit,
      include: {
        user: {
          select: {
            username: true
          }
        }
      }
    });

    // Transform to LeaderboardEntry format
    const topWinsEntries: LeaderboardEntry[] = topWins.map(session => ({
      userId: session.userId,
      username: session.user.username,
      value: session.payoutAmountCents / 100, // Convert to dollars
      gameSessionId: session.id,
      createdAt: new Date(session.completedAt || session.createdAt)
    }));

    const longestWalksEntries: LeaderboardEntry[] = longestWalks.map(session => ({
      userId: session.userId,
      username: session.user.username,
      value: session.durationSeconds || 0,
      gameSessionId: session.id,
      createdAt: new Date(session.completedAt || session.createdAt)
    }));

    return {
      topWins: topWinsEntries,
      longestWalks: longestWalksEntries,
      period
    };
  }

  private static async checkUnlockRequirement(userId: string, requirement: string): Promise<boolean> {
    switch (requirement) {
      case 'Win 10 games':
        const winCount = await prisma.gameSession.count({
          where: { userId, outcome: 'WIN' }
        });
        return winCount >= 10;

      case 'Walk for 25+ seconds':
        const longWalk = await prisma.gameSession.findFirst({
          where: { 
            userId, 
            durationSeconds: { gte: 25 }
          }
        });
        return !!longWalk;

      case 'Deposit $100+':
        const largeDeposit = await prisma.transaction.findFirst({
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

  private static getTimeFilter(period: 'daily' | 'weekly' | 'all-time'): Date | null {
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