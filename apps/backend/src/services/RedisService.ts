import Redis from 'ioredis';

class RedisServiceClass {
  private static instance: RedisServiceClass;
  public redis: Redis | null = null;
  private isConnected: boolean = false;
  private developmentMode: boolean = false;
  private hasLoggedError: boolean = false; // Prevent spam logging

  private constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.developmentMode = process.env.NODE_ENV === 'development';
    
    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: this.developmentMode ? 0 : 3,
        lazyConnect: true,
        connectTimeout: 2000, // Fast timeout
        // Completely disable reconnection in development
        reconnectOnError: () => false,
        enableOfflineQueue: false,
      });

      // Event handlers
      this.redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isConnected = true;
      });

      this.redis.on('error', (error) => {
        this.isConnected = false;
        
        if (this.developmentMode) {
          // Only log once in development, don't spam
          if (!this.hasLoggedError) {
            console.warn('⚠️ Redis unavailable in development mode - using memory fallback');
            console.warn('   - Session management will use memory storage');
            console.warn('   - Install Redis with: winget install Redis.Redis');
            this.hasLoggedError = true;
          }
          return;
        }
        
        console.error('❌ Redis connection error:', error);
      });

      this.redis.on('ready', () => {
        console.log('✅ Redis is ready to accept commands');
        this.isConnected = true;
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        if (!this.developmentMode) {
          console.log('⚠️ Redis connection closed');
        }
      });

      // Remove reconnecting event handler to prevent spam
      
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error);
      if (this.developmentMode) {
        console.warn('⚠️ Continuing without Redis in development mode');
        this.redis = null;
      } else {
        throw error;
      }
    }
  }

  public static getInstance(): RedisServiceClass {
    if (!RedisServiceClass.instance) {
      RedisServiceClass.instance = new RedisServiceClass();
    }
    return RedisServiceClass.instance;
  }

  public async connect(): Promise<void> {
    if (!this.redis) {
      console.error('Redis is not initialized. Cannot connect.');
      return;
    }
    try {
      await this.redis.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.redis) {
      console.warn('Redis is not initialized. Cannot disconnect.');
      return;
    }
    try {
      await this.redis.quit();
      console.log('✅ Redis disconnected successfully');
    } catch (error) {
      console.error('❌ Redis disconnection failed:', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    if (!this.redis) {
      console.warn('Redis is not initialized. Cannot perform health check.');
      return false;
    }
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
    if (!this.redis) {
      console.warn('Redis is not initialized. Cannot set session.');
      return;
    }
    await this.redis.setex(`session:${sessionId}`, ttlSeconds, JSON.stringify(data));
  }

  public async getSession(sessionId: string): Promise<Record<string, any> | null> {
    if (!this.redis) {
      console.warn('Redis is not initialized. Cannot get session.');
      return null;
    }
    const data = await this.redis.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  public async deleteSession(sessionId: string): Promise<void> {
    if (!this.redis) {
      console.warn('Redis is not initialized. Cannot delete session.');
      return;
    }
    await this.redis.del(`session:${sessionId}`);
  }

  public async updateSessionTTL(sessionId: string, ttlSeconds: number): Promise<void> {
    if (!this.redis) {
      console.warn('Redis is not initialized. Cannot update session TTL.');
      return;
    }
    await this.redis.expire(`session:${sessionId}`, ttlSeconds);
  }

  // Token blacklisting
  public async blacklistToken(token: string, expirySeconds: number): Promise<void> {
    if (!this.redis) {
      console.warn('Redis is not initialized. Cannot blacklist token.');
      return;
    }
    await this.redis.setex(`blacklist:${token}`, expirySeconds, '1');
  }

  public async isTokenBlacklisted(token: string): Promise<boolean> {
    if (!this.redis) {
      console.warn('Redis is not initialized. Cannot check token blacklist.');
      return false;
    }
    const result = await this.redis.get(`blacklist:${token}`);
    return result === '1';
  }

  // Rate limiting
  public async incrementRateLimit(key: string, windowSeconds: number): Promise<number> {
    if (!this.redis) {
      console.warn('Redis is not initialized. Cannot increment rate limit.');
      return 0;
    }
    
    const multi = this.redis.multi();
    multi.incr(key);
    multi.expire(key, windowSeconds);
    const results = await multi.exec();
    
    return results ? (results[0][1] as number) : 0;
  }

  public async getRateLimit(key: string): Promise<number> {
    if (!this.redis) {
      console.warn('Redis is not initialized. Cannot get rate limit.');
      return 0;
    }
    
    const result = await this.redis.get(key);
    return result ? parseInt(result, 10) : 0;
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
  public async setCache(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.redis) {
      console.warn('Redis is not initialized. Cannot set cache.');
      return;
    }
    
    const serializedValue = JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, serializedValue);
    } else {
      await this.redis.set(key, serializedValue);
    }
  }

  public async getCache(key: string): Promise<any> {
    if (!this.redis) {
      console.warn('Redis is not initialized. Cannot get cache.');
      return null;
    }
    
    const result = await this.redis.get(key);
    return result ? JSON.parse(result) : null;
  }

  public async deleteCache(key: string): Promise<void> {
    if (!this.redis) {
      console.warn('Redis is not initialized. Cannot delete cache.');
      return;
    }
    
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