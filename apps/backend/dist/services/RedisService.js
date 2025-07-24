"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = exports.RedisService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
class RedisServiceClass {
    constructor() {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        this.redis = new ioredis_1.default(redisUrl, {
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            // Reconnection settings
            reconnectOnError: (err) => {
                const targetError = 'READONLY';
                return err.message.includes(targetError);
            },
            // Retry strategy
            retryDelayOnClusterDown: 300,
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
    static getInstance() {
        if (!RedisServiceClass.instance) {
            RedisServiceClass.instance = new RedisServiceClass();
        }
        return RedisServiceClass.instance;
    }
    async connect() {
        try {
            await this.redis.connect();
        }
        catch (error) {
            console.error('Failed to connect to Redis:', error);
            throw error;
        }
    }
    async disconnect() {
        try {
            await this.redis.quit();
            console.log('✅ Redis disconnected successfully');
        }
        catch (error) {
            console.error('❌ Redis disconnection failed:', error);
            throw error;
        }
    }
    async healthCheck() {
        try {
            const response = await this.redis.ping();
            return response === 'PONG';
        }
        catch (error) {
            console.error('Redis health check failed:', error);
            return false;
        }
    }
    // Session management methods
    async setSession(sessionId, data, ttlSeconds = 3600) {
        await this.redis.setex(`session:${sessionId}`, ttlSeconds, JSON.stringify(data));
    }
    async getSession(sessionId) {
        const data = await this.redis.get(`session:${sessionId}`);
        return data ? JSON.parse(data) : null;
    }
    async deleteSession(sessionId) {
        await this.redis.del(`session:${sessionId}`);
    }
    async updateSessionTTL(sessionId, ttlSeconds) {
        await this.redis.expire(`session:${sessionId}`, ttlSeconds);
    }
    // Token blacklisting
    async blacklistToken(token, expirySeconds) {
        await this.redis.setex(`blacklist:${token}`, expirySeconds, '1');
    }
    async isTokenBlacklisted(token) {
        const result = await this.redis.get(`blacklist:${token}`);
        return result === '1';
    }
    // Rate limiting
    async incrementRateLimit(key, windowSeconds) {
        const multi = this.redis.multi();
        multi.incr(key);
        multi.expire(key, windowSeconds);
        const results = await multi.exec();
        return results?.[0]?.[1] || 0;
    }
    async getRateLimit(key) {
        const count = await this.redis.get(key);
        return count ? parseInt(count, 10) : 0;
    }
    // Game session management
    async setGameSession(sessionId, data, ttlSeconds = 300) {
        await this.redis.setex(`game:${sessionId}`, ttlSeconds, JSON.stringify(data));
    }
    async getGameSession(sessionId) {
        const data = await this.redis.get(`game:${sessionId}`);
        return data ? JSON.parse(data) : null;
    }
    async deleteGameSession(sessionId) {
        await this.redis.del(`game:${sessionId}`);
    }
    async getActiveGameSessions(userId) {
        const keys = await this.redis.keys('game:*');
        const activeSessions = [];
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
    async setCache(key, value, ttlSeconds = 300) {
        await this.redis.setex(`cache:${key}`, ttlSeconds, JSON.stringify(value));
    }
    async getCache(key) {
        const data = await this.redis.get(`cache:${key}`);
        return data ? JSON.parse(data) : null;
    }
    async deleteCache(key) {
        await this.redis.del(`cache:${key}`);
    }
    async invalidateCachePattern(pattern) {
        const keys = await this.redis.keys(`cache:${pattern}`);
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
    }
    // Generic key-value operations
    async set(key, value, ttlSeconds) {
        if (ttlSeconds) {
            await this.redis.setex(key, ttlSeconds, value);
        }
        else {
            await this.redis.set(key, value);
        }
    }
    async get(key) {
        return this.redis.get(key);
    }
    async del(key) {
        await this.redis.del(key);
    }
    async exists(key) {
        const result = await this.redis.exists(key);
        return result === 1;
    }
    async keys(pattern) {
        return this.redis.keys(pattern);
    }
    // Pub/Sub for real-time features
    async publish(channel, message) {
        await this.redis.publish(channel, message);
    }
    subscribe(channel, callback) {
        const subscriber = this.redis.duplicate();
        subscriber.subscribe(channel);
        subscriber.on('message', (receivedChannel, message) => {
            if (receivedChannel === channel) {
                callback(message);
            }
        });
    }
}
exports.RedisService = RedisServiceClass.getInstance();
exports.redis = exports.RedisService.redis;
//# sourceMappingURL=RedisService.js.map