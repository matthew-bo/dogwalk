import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'shared';
export declare class AuthController {
    private static registerSchema;
    private static loginSchema;
    private static refreshTokenSchema;
    static register(req: Request, res: Response): Promise<void>;
    static login(req: Request, res: Response): Promise<void>;
    static logout(req: AuthenticatedRequest, res: Response): Promise<void>;
    static refreshToken(req: Request, res: Response): Promise<void>;
    static getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=AuthController.d.ts.map