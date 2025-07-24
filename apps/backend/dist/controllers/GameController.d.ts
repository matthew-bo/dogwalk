import { Response } from 'express';
import { AuthenticatedRequest } from 'shared';
export declare class GameController {
    private static startGameSchema;
    private static cashOutSchema;
    private static historySchema;
    static startGame(req: AuthenticatedRequest, res: Response): Promise<void>;
    static cashOut(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getGameHistory(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getActiveSessions(req: AuthenticatedRequest, res: Response): Promise<void>;
    static verifyGame(req: AuthenticatedRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=GameController.d.ts.map