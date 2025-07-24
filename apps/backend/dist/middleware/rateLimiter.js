"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookRateLimiter = exports.paymentRateLimiter = exports.gameRateLimiter = exports.authRateLimiter = exports.rateLimiter = exports.RateLimiter = void 0;
const RedisService_1 = require("@/services/RedisService");
class RateLimiter {
    constructor(config) {
        this.middleware = async (req, res, next) => {
            try {
                // Skip if configured to do so
                if (this.config.skip?.(req)) {
                    return next();
                }
                const key = `rate_limit:${this.config.keyGenerator?.(req)}`;
                const windowSeconds = Math.floor(this.config.windowMs / 1000);
                // Get current count and increment
                const count = await RedisService_1.RedisService.incrementRateLimit(key, windowSeconds);
                // Calculate reset time
                const ttl = await RedisService_1.RedisService.redis.ttl(key);
                const resetTime = new Date(Date.now() + (ttl * 1000));
                // Set headers
                if (this.config.standardHeaders) {
                    res.set({
                        'RateLimit-Limit': this.config.max.toString(),
                        'RateLimit-Remaining': Math.max(0, this.config.max - count).toString(),
                        'RateLimit-Reset': resetTime.toISOString(),
                    });
                }
                if (this.config.legacyHeaders) {
                    res.set({
                        'X-RateLimit-Limit': this.config.max.toString(),
                        'X-RateLimit-Remaining': Math.max(0, this.config.max - count).toString(),
                        'X-RateLimit-Reset': Math.floor(resetTime.getTime() / 1000).toString(),
                    });
                }
                // Check if limit exceeded
                if (count > this.config.max) {
                    res.status(429).json({
                        success: false,
                        error: {
                            code: 'RATE_LIMIT_EXCEEDED',
                            message: this.config.message,
                            details: {
                                limit: this.config.max,
                                windowMs: this.config.windowMs,
                                resetTime: resetTime.toISOString()
                            }
                        }
                    });
                    return;
                }
                next();
            }
            catch (error) {
                console.error('Rate limiter error:', error);
                // Continue without rate limiting if Redis fails
                next();
            }
        };
        this.config = {
            standardHeaders: true,
            legacyHeaders: false,
            message: 'Too many requests, please try again later',
            keyGenerator: (req) => req.ip,
            skip: () => false,
            ...config
        };
    }
}
exports.RateLimiter = RateLimiter;
// Default rate limiter for general API endpoints
exports.rateLimiter = new RateLimiter({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // 100 requests per minute
    message: 'Too many requests from this IP, please try again later'
}).middleware;
// Strict rate limiter for authentication endpoints
exports.authRateLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later',
    keyGenerator: (req) => `auth:${req.ip}:${req.body?.username || req.body?.email || 'unknown'}`
}).middleware;
// Game-specific rate limiter
exports.gameRateLimiter = new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 game actions per minute
    message: 'Too many game requests, please slow down',
    keyGenerator: (req) => `game:${req.user?.userId || req.ip}`
}).middleware;
// Payment rate limiter
exports.paymentRateLimiter = new RateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // 5 payment requests per 5 minutes
    message: 'Too many payment requests, please try again later',
    keyGenerator: (req) => `payment:${req.user?.userId || req.ip}`
}).middleware;
// Webhook rate limiter (more permissive)
exports.webhookRateLimiter = new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 1000, // 1000 webhook calls per minute
    message: 'Webhook rate limit exceeded',
    keyGenerator: (req) => `webhook:${req.ip}`
}).middleware;
//# sourceMappingURL=rateLimiter.js.map