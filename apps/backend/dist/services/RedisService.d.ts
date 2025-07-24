import Redis from 'ioredis';
declare class RedisServiceClass {
    private static instance;
    redis: Redis;
    private constructor();
    static getInstance(): RedisServiceClass;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    healthCheck(): Promise<boolean>;
    setSession(sessionId: string, data: Record<string, any>, ttlSeconds?: number): Promise<void>;
    getSession(sessionId: string): Promise<Record<string, any> | null>;
    deleteSession(sessionId: string): Promise<void>;
    updateSessionTTL(sessionId: string, ttlSeconds: number): Promise<void>;
    blacklistToken(token: string, expirySeconds: number): Promise<void>;
    isTokenBlacklisted(token: string): Promise<boolean>;
    incrementRateLimit(key: string, windowSeconds: number): Promise<number>;
    getRateLimit(key: string): Promise<number>;
    setGameSession(sessionId: string, data: Record<string, any>, ttlSeconds?: number): Promise<void>;
    getGameSession(sessionId: string): Promise<Record<string, any> | null>;
    deleteGameSession(sessionId: string): Promise<void>;
    getActiveGameSessions(userId: string): Promise<string[]>;
    setCache<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
    getCache<T>(key: string): Promise<T | null>;
    deleteCache(key: string): Promise<void>;
    invalidateCachePattern(pattern: string): Promise<void>;
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    keys(pattern: string): Promise<string[]>;
    publish(channel: string, message: string): Promise<void>;
    subscribe(channel: string, callback: (message: string) => void): void;
}
export declare const RedisService: RedisServiceClass;
export declare const redis: Redis;
export {};
//# sourceMappingURL=RedisService.d.ts.map