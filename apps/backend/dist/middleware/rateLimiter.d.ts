import { Request, Response, NextFunction } from 'express';
interface RateLimitConfig {
    windowMs: number;
    max: number;
    message?: string;
    standardHeaders?: boolean;
    legacyHeaders?: boolean;
    keyGenerator?: (req: Request) => string;
    skip?: (req: Request) => boolean;
}
export declare class RateLimiter {
    private config;
    constructor(config: RateLimitConfig);
    middleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const rateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authRateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const gameRateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const paymentRateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const webhookRateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export {};
//# sourceMappingURL=rateLimiter.d.ts.map