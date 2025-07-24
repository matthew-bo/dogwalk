import { RedisService } from './RedisService';
import { DatabaseService } from './DatabaseService';

interface SystemMetrics {
  database: {
    status: 'healthy' | 'degraded' | 'down';
    responseTime?: number;
    connectionCount?: number;
  };
  redis: {
    status: 'healthy' | 'degraded' | 'down';
    responseTime?: number;
    memoryUsage?: string;
  };
  business: {
    activeUsers: number;
    activeSessions: number;
    totalBets: number;
    totalPayouts: number;
  };
}

export class MonitoringService {
  static async startMonitoring(): Promise<void> {
    console.log('Monitoring service started');
    // TODO: Implement detailed monitoring
  }

  static async getSystemHealth(): Promise<SystemMetrics> {
    const [database, redis, business] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkRedisHealth(),
      this.getBusinessMetrics()
    ]);

    return { database, redis, business };
  }

  private static async checkDatabaseHealth(): Promise<SystemMetrics['database']> {
    try {
      const start = Date.now();
      await DatabaseService.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;

      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return { status: 'down' };
    }
  }

  private static async checkRedisHealth(): Promise<SystemMetrics['redis']> {
    try {
      const start = Date.now();
      await RedisService.redis?.ping();
      const responseTime = Date.now() - start;

      return {
        status: responseTime < 500 ? 'healthy' : 'degraded',
        responseTime
      };
    } catch (error) {
      console.error('Redis health check failed:', error);
      return { status: 'down' };
    }
  }

  private static async getBusinessMetrics(): Promise<SystemMetrics['business']> {
    try {
      // Simplified metrics - can be enhanced later
      return {
        activeUsers: 0,
        activeSessions: 0,
        totalBets: 0,
        totalPayouts: 0
      };
    } catch (error) {
      console.error('Failed to get business metrics:', error);
      return {
        activeUsers: 0,
        activeSessions: 0,
        totalBets: 0,
        totalPayouts: 0
      };
    }
  }
} 