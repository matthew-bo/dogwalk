import { Response } from 'express';
import { AuthenticatedRequest } from 'shared';
export declare class UserController {
    private static updateProfileSchema;
    private static leaderboardSchema;
    static getProfile(req: AuthenticatedRequest, res: Response): Promise<void>;
    static updateProfile(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getCosmetics(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getLeaderboard(req: AuthenticatedRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=UserController.d.ts.map