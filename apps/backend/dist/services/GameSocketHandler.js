"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameSocketHandler = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const RedisService_1 = require("@/services/RedisService");
const shared_1 = require("shared");
class GameSocketHandler {
    constructor(io) {
        this.io = io;
        this.setupMiddleware();
        this.setupEventHandlers();
    }
    setupMiddleware() {
        // Authentication middleware for WebSocket connections
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
                if (!token) {
                    return next(new Error('Authentication required'));
                }
                // Check if token is blacklisted
                const isBlacklisted = await RedisService_1.RedisService.isTokenBlacklisted(token);
                if (isBlacklisted) {
                    return next(new Error('Token has been revoked'));
                }
                // Verify token
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                socket.user = decoded;
                next();
            }
            catch (error) {
                console.error('WebSocket authentication error:', error);
                next(new Error('Authentication failed'));
            }
        });
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`User ${socket.user?.username} connected via WebSocket`);
            // Join user to their personal room
            if (socket.user?.userId) {
                socket.join(`user:${socket.user.userId}`);
            }
            // Handle game events
            socket.on(shared_1.WS_EVENTS.JOIN_GAME, (data) => {
                this.handleJoinGame(socket, data);
            });
            socket.on(shared_1.WS_EVENTS.LEAVE_GAME, (data) => {
                this.handleLeaveGame(socket, data);
            });
            socket.on(shared_1.WS_EVENTS.GAME_HEARTBEAT, (data) => {
                this.handleGameHeartbeat(socket, data);
            });
            socket.on('disconnect', () => {
                console.log(`User ${socket.user?.username} disconnected`);
                this.handleDisconnect(socket);
            });
        });
    }
    async handleJoinGame(socket, data) {
        try {
            const { sessionId } = data;
            if (!socket.user) {
                socket.emit(shared_1.WS_EVENTS.ERROR, { message: 'Authentication required' });
                return;
            }
            // Verify session belongs to user
            const session = await RedisService_1.RedisService.getGameSession(sessionId);
            if (!session || session.userId !== socket.user.userId) {
                socket.emit(shared_1.WS_EVENTS.ERROR, { message: 'Game session not found' });
                return;
            }
            // Join game room
            socket.join(`game:${sessionId}`);
            // Start sending game updates
            this.startGameUpdates(sessionId);
        }
        catch (error) {
            console.error('Error joining game:', error);
            socket.emit(shared_1.WS_EVENTS.ERROR, { message: 'Failed to join game' });
        }
    }
    handleLeaveGame(socket, data) {
        const { sessionId } = data;
        socket.leave(`game:${sessionId}`);
    }
    async handleGameHeartbeat(socket, data) {
        try {
            const { sessionId } = data;
            if (!socket.user)
                return;
            // Update session heartbeat in Redis
            const session = await RedisService_1.RedisService.getGameSession(sessionId);
            if (session && session.userId === socket.user.userId) {
                session.lastHeartbeat = Date.now();
                await RedisService_1.RedisService.setGameSession(sessionId, session, 300);
            }
        }
        catch (error) {
            console.error('Error handling game heartbeat:', error);
        }
    }
    handleDisconnect(socket) {
        // Clean up any game rooms the user was in
        // The session cleanup service will handle abandoned games
    }
    startGameUpdates(sessionId) {
        const updateInterval = setInterval(async () => {
            try {
                const session = await RedisService_1.RedisService.getGameSession(sessionId);
                if (!session || session.status !== 'active') {
                    clearInterval(updateInterval);
                    return;
                }
                const currentTime = Date.now();
                const elapsedSeconds = Math.floor((currentTime - session.startTime) / 1000);
                // Check if game should end due to squirrel event
                if (session.squirrelEventTime && elapsedSeconds >= session.squirrelEventTime) {
                    // Game ends due to squirrel
                    this.io.to(`game:${sessionId}`).emit(shared_1.WS_EVENTS.GAME_RESULT, {
                        sessionId,
                        outcome: 'loss',
                        finalPayout: 0,
                        squirrelEventTime: session.squirrelEventTime
                    });
                    clearInterval(updateInterval);
                    return;
                }
                // Send game update
                const currentPayout = Math.floor(session.betAmount * this.getPayoutMultiplier(elapsedSeconds));
                const squirrelRisk = this.getRiskPerSecond(elapsedSeconds + 1);
                this.io.to(`game:${sessionId}`).emit(shared_1.WS_EVENTS.GAME_UPDATE, {
                    sessionId,
                    currentSecond: elapsedSeconds,
                    currentPayout,
                    squirrelRisk
                });
            }
            catch (error) {
                console.error('Error sending game update:', error);
                clearInterval(updateInterval);
            }
        }, 1000); // Update every second
    }
    // Send balance update to user
    async sendBalanceUpdate(userId, newBalance) {
        this.io.to(`user:${userId}`).emit(shared_1.WS_EVENTS.BALANCE_UPDATE, {
            balance: newBalance,
            timestamp: new Date().toISOString()
        });
    }
    // Send game result to game participants
    async sendGameResult(sessionId, result) {
        this.io.to(`game:${sessionId}`).emit(shared_1.WS_EVENTS.GAME_RESULT, result);
    }
    getPayoutMultiplier(seconds) {
        // This should match the shared GAME_CONFIG
        const baseMultiplier = 1 + (seconds * 0.15) + Math.pow(seconds * 0.1, 1.8);
        return Math.round(baseMultiplier * (1 - 0.08) * 100) / 100; // 8% house edge
    }
    getRiskPerSecond(second) {
        // This should match the shared GAME_CONFIG
        if (second <= 5)
            return 0.01;
        if (second <= 10)
            return 0.03;
        if (second <= 15)
            return 0.05;
        if (second <= 20)
            return 0.07;
        return 0.10;
    }
}
exports.GameSocketHandler = GameSocketHandler;
//# sourceMappingURL=GameSocketHandler.js.map