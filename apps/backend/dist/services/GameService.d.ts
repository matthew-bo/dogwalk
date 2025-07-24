import { StartGameResponse, CashoutResponse, GameSession, GameVerification } from 'shared';
export declare class GameService {
    static startGame(userId: string, betAmount: number): Promise<StartGameResponse>;
    static cashOut(userId: string, sessionId: string, cashoutSecond: number): Promise<CashoutResponse>;
    static getGameHistory(userId: string, limit: number, offset: number): Promise<{
        games: GameSession[];
        total: number;
    }>;
    static getActiveSessions(userId: string): Promise<string[]>;
    static verifyGame(sessionId: string): Promise<GameVerification>;
    private static validateUserCanStartGame;
    static cleanupAbandonedSessions(): Promise<void>;
}
//# sourceMappingURL=GameService.d.ts.map