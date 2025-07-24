import { Server as SocketIOServer } from 'socket.io';
export declare class GameSocketHandler {
    private io;
    constructor(io: SocketIOServer);
    private setupMiddleware;
    private setupEventHandlers;
    private handleJoinGame;
    private handleLeaveGame;
    private handleGameHeartbeat;
    private handleDisconnect;
    private startGameUpdates;
    sendBalanceUpdate(userId: string, newBalance: number): Promise<void>;
    sendGameResult(sessionId: string, result: any): Promise<void>;
    private getPayoutMultiplier;
    private getRiskPerSecond;
}
//# sourceMappingURL=GameSocketHandler.d.ts.map