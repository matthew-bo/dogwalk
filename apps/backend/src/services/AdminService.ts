import { prisma } from '@/services/DatabaseService';
import { RedisService } from '@/services/RedisService';
import { PaymentService } from '@/services/PaymentService';
import { ErrorHandler } from '@/middleware/errorHandler';
import { ERROR_CODES } from 'shared';

interface AdminStats {
  userMetrics: {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
  };
  financialMetrics: {
    totalDeposits: number;
    totalWithdrawals: number;
    pendingWithdrawals: number;
    houseProfit: number;
    totalGameVolume: number;
    profitMargin: number;
  };
  gameMetrics: {
    totalGames: number;
    gamesLast24h: number;
    averageGameDuration: number;
    totalBetsVolume: number;
    houseProfitFromGames: number;
  };
  systemHealth: {
    databaseStatus: 'healthy' | 'degraded' | 'down';
    redisStatus: 'healthy' | 'degraded' | 'down';
    coinbaseStatus: 'healthy' | 'degraded' | 'down';
    uptime: number;
  };
}

interface WalletBalance {
  bitcoin: {
    balance: number;
    address: string;
    usdValue: number;
    lastUpdated: string;
  };
  ethereum: {
    balance: number; 
    address: string;
    usdValue: number;
    lastUpdated: string;
  };
  totalLiquidity: number;
  liquidityRatio: number;
}

interface TransactionSummary {
  id: string;
  type: 'deposit' | 'withdrawal' | 'game_win' | 'game_loss';
  amount: number;
  currency: string;
  userId: string;
  userEmail: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  timestamp: string;
  txHash?: string;
}

interface PendingWithdrawal {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  currency: string;
  walletAddress: string;
  requestedAt: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  riskLevel: 'low' | 'medium' | 'high';
}

interface UserManagement {
  id: string;
  username: string;
  email: string;
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  gamesPlayed: number;
  winRate: number;
  status: 'active' | 'suspended' | 'banned';
  lastActivity: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export class AdminService {
  
  /**
   * Get comprehensive admin dashboard statistics
   */
  public static async getDashboardStats(): Promise<AdminStats> {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // User metrics
      const [totalUsers, activeUsers, newUsersToday, newUsersThisWeek] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: {
            gameSessions: {
              some: {
                createdAt: {
                  gte: yesterday
                }
              }
            }
          }
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: yesterday
            }
          }
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: weekAgo
            }
          }
        })
      ]);

      // Financial metrics
      const [
        depositSum,
        withdrawalSum,
        pendingWithdrawals,
        gameStats,
        betVolume
      ] = await Promise.all([
        prisma.transaction.aggregate({
          where: { type: 'DEPOSIT', status: 'CONFIRMED' },
          _sum: { usdAmount: true }
        }),
        prisma.transaction.aggregate({
          where: { type: 'WITHDRAWAL', status: 'CONFIRMED' },
          _sum: { usdAmount: true }
        }),
        prisma.transaction.aggregate({
          where: { type: 'WITHDRAWAL', status: 'PENDING' },
          _sum: { usdAmount: true }
        }),
        prisma.gameSession.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { 
            betAmountCents: true,
            payoutAmountCents: true
          },
          _count: { id: true }
        }),
        prisma.gameSession.aggregate({
          where: { 
            status: 'COMPLETED',
            createdAt: { gte: yesterday }
          },
          _sum: { betAmountCents: true },
          _count: { id: true },
          _avg: { durationSeconds: true }
        })
      ]);

      const totalDeposits = (depositSum._sum.usdAmount || 0) / 100;
      const totalWithdrawals = Math.abs((withdrawalSum._sum.usdAmount || 0) / 100);
      const totalGameVolume = (gameStats._sum.betAmountCents || 0) / 100;
      const totalPayouts = (gameStats._sum.payoutAmountCents || 0) / 100;
      const houseProfit = totalGameVolume - totalPayouts;
      const profitMargin = totalGameVolume > 0 ? (houseProfit / totalGameVolume) * 100 : 0;

      // System health checks
      const systemHealth = await AdminService.checkSystemHealth();

      return {
        userMetrics: {
          totalUsers,
          activeUsers,
          newUsersToday,
          newUsersThisWeek
        },
        financialMetrics: {
          totalDeposits,
          totalWithdrawals,
          pendingWithdrawals: Math.abs((pendingWithdrawals._sum.usdAmount || 0) / 100),
          houseProfit,
          totalGameVolume,
          profitMargin: Math.round(profitMargin * 100) / 100
        },
        gameMetrics: {
          totalGames: gameStats._count.id,
          gamesLast24h: betVolume._count.id,
          averageGameDuration: Math.round(betVolume._avg.durationSeconds || 0),
          totalBetsVolume: (betVolume._sum.betAmountCents || 0) / 100,
          houseProfitFromGames: houseProfit
        },
        systemHealth
      };

    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
      throw ErrorHandler.throwBusinessError('Failed to fetch dashboard statistics', ERROR_CODES.SYSTEM_ERROR);
    }
  }

  /**
   * Get wallet balances and liquidity information
   */
  public static async getWalletBalances(): Promise<WalletBalance> {
    try {
      // Get crypto prices
      const prices = await PaymentService.getCryptoPrices();
      
      // In production with Coinbase Commerce, these would be fetched from Coinbase API
      // For now, simulate realistic balances
      const bitcoinBalance = 2.45831;
      const ethereumBalance = 15.2847;
      
      const bitcoinUsdValue = bitcoinBalance * prices.BTC;
      const ethereumUsdValue = ethereumBalance * prices.ETH;
      const totalLiquidity = bitcoinUsdValue + ethereumUsdValue;

      // Calculate liquidity ratio (total liquidity vs pending withdrawals)
      const pendingWithdrawals = await prisma.transaction.aggregate({
        where: { type: 'WITHDRAWAL', status: 'PENDING' },
        _sum: { usdAmount: true }
      });
      
      const pendingAmount = Math.abs((pendingWithdrawals._sum.usdAmount || 0) / 100);
      const liquidityRatio = pendingAmount > 0 ? totalLiquidity / pendingAmount : 999;

      return {
        bitcoin: {
          balance: bitcoinBalance,
          address: process.env.BITCOIN_HOT_WALLET_ADDRESS || 'bc1q...',
          usdValue: bitcoinUsdValue,
          lastUpdated: new Date().toISOString()
        },
        ethereum: {
          balance: ethereumBalance,
          address: process.env.ETHEREUM_HOT_WALLET_ADDRESS || '0x...',
          usdValue: ethereumUsdValue,
          lastUpdated: new Date().toISOString()
        },
        totalLiquidity,
        liquidityRatio: Math.round(liquidityRatio * 100) / 100
      };

    } catch (error) {
      console.error('Failed to fetch wallet balances:', error);
      throw ErrorHandler.throwBusinessError('Failed to fetch wallet balances', ERROR_CODES.SYSTEM_ERROR);
    }
  }

  /**
   * Get recent transactions for admin monitoring
   */
  public static async getRecentTransactions(limit: number = 20): Promise<TransactionSummary[]> {
    try {
      const transactions = await prisma.transaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: {
            select: {
              email: true,
              username: true
            }
          }
        }
      });

      return transactions.map((tx: any) => ({
        id: tx.id,
        type: tx.type.toLowerCase() as any,
        amount: Math.abs(tx.usdAmount) / 100,
        currency: tx.cryptoType || 'USD',
        userId: tx.userId,
        userEmail: tx.user.email,
        status: tx.status.toLowerCase() as any,
        timestamp: tx.createdAt.toISOString(),
        txHash: tx.cryptoTxHash || undefined
      }));

    } catch (error) {
      console.error('Failed to fetch recent transactions:', error);
      throw ErrorHandler.throwBusinessError('Failed to fetch transactions', ERROR_CODES.SYSTEM_ERROR);
    }
  }

  /**
   * Get pending withdrawals requiring admin attention
   */
  public static async getPendingWithdrawals(): Promise<PendingWithdrawal[]> {
    try {
      const withdrawals = await prisma.transaction.findMany({
        where: {
          type: 'WITHDRAWAL',
          status: 'PENDING'
        },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              username: true,
              usdBalanceCents: true
            }
          }
        }
      });

      return withdrawals.map((withdrawal: any) => {
        const amount = Math.abs(withdrawal.usdAmount) / 100;
        // Simple risk assessment based on amount and user history
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (amount > 1000) riskLevel = 'medium';
        if (amount > 5000) riskLevel = 'high';

        return {
          id: withdrawal.id,
          userId: withdrawal.userId,
          userEmail: withdrawal.user.email,
          amount,
          currency: withdrawal.cryptoType || 'USD',
          walletAddress: 'N/A', // Would be stored in withdrawal details
          requestedAt: withdrawal.createdAt.toISOString(),
          status: 'pending',
          riskLevel
        };
      });

    } catch (error) {
      console.error('Failed to fetch pending withdrawals:', error);
      throw ErrorHandler.throwBusinessError('Failed to fetch pending withdrawals', ERROR_CODES.SYSTEM_ERROR);
    }
  }

  /**
   * Approve a pending withdrawal
   */
  public static async approveWithdrawal(withdrawalId: string, adminUserId: string): Promise<void> {
    try {
      await prisma.$transaction(async (tx: any) => {
        // Update transaction status
        await tx.transaction.update({
          where: { id: withdrawalId },
          data: { status: 'CONFIRMED' }
        });

        // Log admin action
        await tx.auditLog.create({
          data: {
            userId: adminUserId,
            action: 'WITHDRAWAL_APPROVED',
            details: { withdrawalId }
          }
        });
      });

      // In production, this would trigger actual crypto transaction
      console.log(`Withdrawal ${withdrawalId} approved by admin ${adminUserId}`);

    } catch (error) {
      console.error('Failed to approve withdrawal:', error);
      throw ErrorHandler.throwBusinessError('Failed to approve withdrawal', ERROR_CODES.SYSTEM_ERROR);
    }
  }

  /**
   * Emergency stop all withdrawals
   */
  public static async emergencyStopWithdrawals(adminUserId: string): Promise<void> {
    try {
      // Set emergency flag in Redis
      await RedisService.set('emergency:withdrawals_stopped', 'true', 3600); // 1 hour

      // Log emergency action
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'EMERGENCY_STOP_WITHDRAWALS',
          details: { timestamp: new Date().toISOString() }
        }
      });

      console.log(`Emergency withdrawal stop activated by admin ${adminUserId}`);

    } catch (error) {
      console.error('Failed to emergency stop withdrawals:', error);
      throw ErrorHandler.throwBusinessError('Failed to stop withdrawals', ERROR_CODES.SYSTEM_ERROR);
    }
  }

  /**
   * Get user management data for admin review
   */
  public static async getUserManagement(limit: number = 50, search?: string): Promise<UserManagement[]> {
    try {
      const whereClause: any = {};
      if (search) {
        whereClause.OR = [
          { username: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          transactions: {
            where: { status: 'CONFIRMED' },
            select: { type: true, usdAmount: true }
          },
          gameSessions: {
            where: { status: 'COMPLETED' },
            select: { outcome: true, createdAt: true }
          }
        }
      });

      return users.map((user: any) => {
        const deposits = user.transactions
          .filter((tx: any) => tx.type === 'DEPOSIT')
          .reduce((sum: number, tx: any) => sum + tx.usdAmount, 0) / 100;
        
        const withdrawals = user.transactions
          .filter((tx: any) => tx.type === 'WITHDRAWAL')
          .reduce((sum: number, tx: any) => sum + Math.abs(tx.usdAmount), 0) / 100;

        const wins = user.gameSessions.filter((game: any) => game.outcome === 'WIN').length;
        const totalGames = user.gameSessions.length;
        const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

        const lastActivity = user.gameSessions.length > 0 
          ? user.gameSessions[0].createdAt.toISOString()
          : user.createdAt.toISOString();

        // Simple risk assessment
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (deposits > 10000 || withdrawals > 5000) riskLevel = 'medium';
        if (winRate > 80 && totalGames > 10) riskLevel = 'high';

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          balance: user.usdBalanceCents / 100,
          totalDeposited: deposits,
          totalWithdrawn: withdrawals,
          gamesPlayed: totalGames,
          winRate: Math.round(winRate),
          status: 'active', // Would be stored in user table
          lastActivity,
          riskLevel
        };
      });

    } catch (error) {
      console.error('Failed to fetch user management data:', error);
      throw ErrorHandler.throwBusinessError('Failed to fetch user data', ERROR_CODES.SYSTEM_ERROR);
    }
  }

  /**
   * Check system health status
   */
  private static async checkSystemHealth(): Promise<AdminStats['systemHealth']> {
    const health: AdminStats['systemHealth'] = {
      databaseStatus: 'down',
      redisStatus: 'down', 
      coinbaseStatus: 'healthy', // Assume healthy unless we implement health checks
      uptime: process.uptime()
    };

    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;
      health.databaseStatus = 'healthy';
    } catch (error) {
      console.error('Database health check failed:', error);
      health.databaseStatus = 'down';
    }

    try {
      // Test Redis connection
      await RedisService.set('health_check', 'ok', 10);
      await RedisService.get('health_check');
      health.redisStatus = 'healthy';
    } catch (error) {
      console.error('Redis health check failed:', error);
      health.redisStatus = 'down';
    }

    return health;
  }
} 