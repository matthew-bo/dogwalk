import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
declare class App {
    app: express.Application;
    server: ReturnType<typeof createServer>;
    io: SocketIOServer;
    private port;
    constructor();
    private initializeMiddleware;
    private initializeRoutes;
    private initializeWebSocket;
    private initializeErrorHandling;
    private gracefulShutdown;
    start(): Promise<void>;
}
declare const app: App;
export default app;
//# sourceMappingURL=index.d.ts.map