import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { AuthenticatedRequest } from 'shared';

interface RateLimitConfig {
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
}

// Basic rate limiter with IP fallback
const createRateLimiter = (config: RateLimitConfig) => {
  return rateLimit({
    windowMs: config.windowMs || 15 * 60 * 1000, // 15 minutes
    max: config.max || 100,
    keyGenerator: (req: Request) => req.ip || 'unknown-ip',
    message: config.message || 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// General rate limiter
export const rateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Strict rate limiter for authentication endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.'
});

// Aggressive rate limiter for password reset
export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: 'Too many password reset requests, please try again later.'
});

// Rate limiter for API endpoints - less restrictive
export const apiRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: 'Too many API requests, please slow down.'
});

// Game-specific rate limiter
export const gameRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // limit each user to 60 game actions per minute
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return `game:${authReq.user?.userId || req.ip || 'unknown'}`;
  },
  message: 'Too many game actions, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Payment-specific rate limiter
export const paymentRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each user to 10 payment actions per 5 minutes
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return `payment:${authReq.user?.userId || req.ip || 'unknown'}`;
  },
  message: 'Too many payment requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Webhook rate limiter (more permissive)
export const webhookRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // 1000 webhook calls per minute
  keyGenerator: (req: Request) => `webhook:${req.ip || 'unknown'}`,
  message: 'Webhook rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
}); 