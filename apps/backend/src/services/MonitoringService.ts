import { prisma } from '@/services/DatabaseService';
import { RedisService } from '@/services/RedisService';

interface SystemMetrics {
  server: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    nodeVersion: string;
    environment: string;
  };
  database: {
    status: 'healthy' | 'degraded' | 'down';
    connectionCount?: number;
    responseTime?: number;
  };
  redis: {
    status: 'healthy' | 'degraded' | 'down';
    responseTime?: number;
    memoryUsage?: string;
  };
  business: {
    totalUsers: number;
    activeUsers24h: number;
    totalDeposits: number;
    totalWithdrawals: number;
    pendingWithdrawals: number;
    systemLiquidity: number;
  };
}

interface AlertConfig {
  liquidityThreshold: number;
  pendingWithdrawalThreshold: number;
  errorRateThreshold: number;
  responseTimeThreshold: number;
}

export class MonitoringService {
  private static alertConfig: AlertConfig = {
    liquidityThreshold: 10000, // $10k minimum liquidity
    pendingWithdrawalThreshold: 50000, // $50k pending withdrawals trigger alert
    errorRateThreshold: 0.05, // 5% error rate
    responseTimeThreshold: 2000 // 2 seconds response time
  };

  /**
   * Get comprehensive system metrics
   */
  public static async getSystemMetrics(): Promise<SystemMetrics> {
    const startTime = Date.now();

    // Server metrics
    const serverMetrics = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    };

    // Database health check
    const databaseMetrics = await MonitoringService.checkDatabaseHealth();
    
    // Redis health check
    const redisMetrics = await MonitoringService.checkRedisHealth();

    // Business metrics
    const businessMetrics = await MonitoringService.getBusinessMetrics();

    return {
      server: serverMetrics,
      database: databaseMetrics,
      redis: redisMetrics,
      business: businessMetrics
    };
  }

  /**
   * Check database health and performance
   */
  private static async checkDatabaseHealth(): Promise<SystemMetrics['database']> {
    try {
      const startTime = Date.now();
      
      // Simple health check query
      await prisma.$queryRaw`SELECT 1`;
      
      const responseTime = Date.now() - startTime;
      
      // Get connection info (if available)
      const connectionInfo = await prisma.$queryRaw`
        SELECT count(*) as connection_count 
        FROM pg_stat_activity 
        WHERE state = 'active'
      ` as any[];

      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        connectionCount: connectionInfo[0]?.connection_count || 0
      };

    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        status: 'down',
        responseTime: undefined,
        connectionCount: undefined
      };
    }
  }

  /**
   * Check Redis health and performance
   */
  private static async checkRedisHealth(): Promise<SystemMetrics['redis']> {
    try {
      const startTime = Date.now();
      
      // Test Redis with a simple operation
      await RedisService.set('health_check', 'ok', 10);
      const result = await RedisService.get('health_check');
      
      const responseTime = Date.now() - startTime;
      
      // Get Redis memory usage
      const info = await RedisService.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'unknown';

      return {
        status: result === 'ok' && responseTime < 500 ? 'healthy' : 'degraded',
        responseTime,
        memoryUsage
      };

    } catch (error) {
      console.error('Redis health check failed:', error);
      return {
        status: 'down',
        responseTime: undefined,
        memoryUsage: undefined
      };
    }
  }

  /**
   * Get business metrics for monitoring
   */
  private static async getBusinessMetrics(): Promise<SystemMetrics['business']> {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [
        totalUsers,
        activeUsers24h,
        depositSum,
        withdrawalSum,
        pendingWithdrawals
      ] = await Promise.all([
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
        })
      ]);

      const totalDeposits = (depositSum._sum.usdAmount || 0) / 100;
      const totalWithdrawals = Math.abs((withdrawalSum._sum.usdAmount || 0) / 100);
      const pendingAmount = Math.abs((pendingWithdrawals._sum.usdAmount || 0) / 100);
      const systemLiquidity = totalDeposits - totalWithdrawals;

      return {
        totalUsers,
        activeUsers24h,
        totalDeposits,
        totalWithdrawals,
        pendingWithdrawals: pendingAmount,
        systemLiquidity
      };

    } catch (error) {
      console.error('Failed to get business metrics:', error);
      return {
        totalUsers: 0,
        activeUsers24h: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        pendingWithdrawals: 0,
        systemLiquidity: 0
      };
    }
  }

  /**
   * Log structured application events
   */
  public static logEvent(level: 'info' | 'warn' | 'error', event: string, data?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      data: data || {},
      service: 'dogwalk-backend',
      environment: process.env.NODE_ENV
    };

    // In production, send to centralized logging (e.g., Datadog, CloudWatch)
    if (level === 'error') {
      console.error('SYSTEM_ERROR', JSON.stringify(logEntry));
    } else if (level === 'warn') {
      console.warn('SYSTEM_WARNING', JSON.stringify(logEntry));
    } else {
      console.log('SYSTEM_INFO', JSON.stringify(logEntry));
    }

    // Store critical events in Redis for admin dashboard
    if (level === 'error' || level === 'warn') {
      RedisService.lpush('system_alerts', JSON.stringify(logEntry))
        .catch(err => console.error('Failed to store alert:', err));
    }
  }

  /**
   * Check for system alerts
   */
  public static async checkSystemAlerts(): Promise<void> {
    try {
      const metrics = await MonitoringService.getSystemMetrics();

      // Check liquidity alerts
      if (metrics.business.systemLiquidity < MonitoringService.alertConfig.liquidityThreshold) {
        MonitoringService.logEvent('warn', 'LOW_LIQUIDITY_ALERT', {
          currentLiquidity: metrics.business.systemLiquidity,
          threshold: MonitoringService.alertConfig.liquidityThreshold
        });
      }

      // Check pending withdrawals
      if (metrics.business.pendingWithdrawals > MonitoringService.alertConfig.pendingWithdrawalThreshold) {
        MonitoringService.logEvent('warn', 'HIGH_PENDING_WITHDRAWALS', {
          pendingAmount: metrics.business.pendingWithdrawals,
          threshold: MonitoringService.alertConfig.pendingWithdrawalThreshold
        });
      }

      // Check database performance
      if (metrics.database.status === 'down') {
        MonitoringService.logEvent('error', 'DATABASE_DOWN', {
          status: metrics.database.status
        });
      } else if (metrics.database.responseTime && metrics.database.responseTime > MonitoringService.alertConfig.responseTimeThreshold) {
        MonitoringService.logEvent('warn', 'SLOW_DATABASE_RESPONSE', {
          responseTime: metrics.database.responseTime,
          threshold: MonitoringService.alertConfig.responseTimeThreshold
        });
      }

      // Check Redis performance
      if (metrics.redis.status === 'down') {
        MonitoringService.logEvent('error', 'REDIS_DOWN', {
          status: metrics.redis.status
        });
      }

    } catch (error) {
      MonitoringService.logEvent('error', 'MONITORING_CHECK_FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get recent system alerts
   */
  public static async getRecentAlerts(limit: number = 50): Promise<any[]> {
    try {
      const alerts = await RedisService.lrange('system_alerts', 0, limit - 1);
      return alerts.map(alert => JSON.parse(alert));
    } catch (error) {
      console.error('Failed to fetch recent alerts:', error);
      return [];
    }
  }

  /**
   * Start monitoring service (called on app startup)
   */
  public static startMonitoring(): void {
    console.log('🔍 Starting monitoring service...');

    // Run health checks every 5 minutes
    setInterval(async () => {
      await MonitoringService.checkSystemAlerts();
    }, 5 * 60 * 1000);

    // Log startup metrics
    MonitoringService.logEvent('info', 'MONITORING_SERVICE_STARTED', {
      nodeVersion: process.version,
      environment: process.env.NODE_ENV,
      uptime: process.uptime()
    });
  }
} 