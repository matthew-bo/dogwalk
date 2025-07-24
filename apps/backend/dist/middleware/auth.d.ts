import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from 'shared';
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const requireAgeVerification: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map