import Redis from 'ioredis';

class RedisServiceClass {
  private static instance: RedisServiceClass;
  public redis: Redis;

  private constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      // Reconnection settings
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        return err.message.includes(targetError);
      },
      // Retry strategy
      enableOfflineQueue: false,
    });

    // Event handlers
    this.redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    this.redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
    });

    this.redis.on('ready', () => {
      console.log('✅ Redis is ready to accept commands');
    });

    this.redis.on('close', () => {
      console.log('⚠️ Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });
  }

  public static getInstance(): RedisServiceClass {
    if (!RedisServiceClass.instance) {
      RedisServiceClass.instance = new RedisServiceClass();
    }
    return RedisServiceClass.instance;
  }

  public async connect(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      console.log('✅ Redis disconnected successfully');
    } catch (error) {
      console.error('❌ Redis disconnection failed:', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const response = await this.redis.ping();
      return response === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  // Session management methods
  public async setSession(sessionId: string, data: Record<string, any>, ttlSeconds: number = 3600): Promise<void> {
    await this.redis.setex(`session:${sessionId}`, ttlSeconds, JSON.stringify(data));
  }

  public async getSession(sessionId: string): Promise<Record<string, any> | null> {
    const data = await this.redis.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  public async deleteSession(sessionId: string): Promise<void> {
    await this.redis.del(`session:${sessionId}`);
  }

  public async updateSessionTTL(sessionId: string, ttlSeconds: number): Promise<void> {
    await this.redis.expire(`session:${sessionId}`, ttlSeconds);
  }

  // Token blacklisting
  public async blacklistToken(token: string, expirySeconds: number): Promise<void> {
    await this.redis.setex(`blacklist:${token}`, expirySeconds, '1');
  }

  public async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await this.redis.get(`blacklist:${token}`);
    return result === '1';
  }

  // Rate limiting
  public async incrementRateLimit(key: string, windowSeconds: number): Promise<number> {
    const multi = this.redis.multi();
    multi.incr(key);
    multi.expire(key, windowSeconds);
    const results = await multi.exec();
    return results?.[0]?.[1] as number || 0;
  }

  public async getRateLimit(key: string): Promise<number> {
    const count = await this.redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  // Game session management
  public async setGameSession(sessionId: string, data: Record<string, any>, ttlSeconds: number = 300): Promise<void> {
    await this.redis.setex(`game:${sessionId}`, ttlSeconds, JSON.stringify(data));
  }

  public async getGameSession(sessionId: string): Promise<Record<string, any> | null> {
    const data = await this.redis.get(`game:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  public async deleteGameSession(sessionId: string): Promise<void> {
    await this.redis.del(`game:${sessionId}`);
  }

  public async getActiveGameSessions(userId: string): Promise<string[]> {
    const keys = await this.redis.keys('game:*');
    const activeSessions: string[] = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const session = JSON.parse(data);
        if (session.userId === userId && session.status === 'active') {
          activeSessions.push(key.replace('game:', ''));
        }
      }
    }

    return activeSessions;
  }

  // Cache management
  public async setCache<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    await this.redis.setex(`cache:${key}`, ttlSeconds, JSON.stringify(value));
  }

  public async getCache<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(`cache:${key}`);
    return data ? JSON.parse(data) : null;
  }

  public async deleteCache(key: string): Promise<void> {
    await this.redis.del(`cache:${key}`);
  }

  public async invalidateCachePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // Generic key-value operations
  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  public async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  public async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  public async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  public async keys(pattern: string): Promise<string[]> {
    return this.redis.keys(pattern);
  }

  // Pub/Sub for real-time features
  public async publish(channel: string, message: string): Promise<void> {
    await this.redis.publish(channel, message);
  }

  public subscribe(channel: string, callback: (message: string) => void): void {
    const subscriber = this.redis.duplicate();
    subscriber.subscribe(channel);
    subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        callback(message);
      }
    });
  }

  // Exchange rates caching
  public async getExchangeRates(): Promise<string | null> {
    return this.redis.get('exchange_rates');
  }

  public async setExchangeRates(rates: string, ttlSeconds: number = 30): Promise<void> {
    await this.redis.setex('exchange_rates', ttlSeconds, rates);
  }

  // Deposit session management
  public async setDepositSession(sessionId: string, data: Record<string, any>, ttlSeconds: number = 21600): Promise<void> {
    await this.redis.setex(`deposit:${sessionId}`, ttlSeconds, JSON.stringify(data));
  }

  public async getDepositSession(sessionId: string): Promise<Record<string, any> | null> {
    const data = await this.redis.get(`deposit:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  public async deleteDepositSession(sessionId: string): Promise<void> {
    await this.redis.del(`deposit:${sessionId}`);
  }
}

export const RedisService = RedisServiceClass.getInstance();
export const redis = RedisService.redis; 