"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const errorHandler_1 = require("@/middleware/errorHandler");
const rateLimiter_1 = require("@/middleware/rateLimiter");
const requestLogger_1 = require("@/middleware/requestLogger");
// Route imports
const auth_1 = __importDefault(require("@/routes/auth"));
const game_1 = __importDefault(require("@/routes/game"));
const payment_1 = __importDefault(require("@/routes/payment"));
const user_1 = __importDefault(require("@/routes/user"));
const webhook_1 = __importDefault(require("@/routes/webhook"));
// Service imports
const RedisService_1 = require("@/services/RedisService");
const DatabaseService_1 = require("@/services/DatabaseService");
const GameSocketHandler_1 = require("@/services/GameSocketHandler");
const SessionCleanupService_1 = require("@/services/SessionCleanupService");
// Load environment variables
dotenv_1.default.config();
class App {
    constructor() {
        this.app = (0, express_1.default)();
        this.server = (0, http_1.createServer)(this.app);
        this.io = new socket_io_1.Server(this.server, {
            cors: {
                origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
                methods: ['GET', 'POST'],
                credentials: true
            }
        });
        this.port = parseInt(process.env.PORT || '3001', 10);
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeWebSocket();
        this.initializeErrorHandling();
    }
    initializeMiddleware() {
        // Security middleware
        this.app.use((0, helmet_1.default)({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "wss:", "ws:"],
                },
            },
        }));
        // CORS configuration
        this.app.use((0, cors_1.default)({
            origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));
        // Compression and parsing
        this.app.use((0, compression_1.default)());
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        // Logging
        if (process.env.NODE_ENV !== 'test') {
            this.app.use((0, morgan_1.default)('combined'));
        }
        this.app.use(requestLogger_1.requestLogger);
        // Rate limiting
        this.app.use(rateLimiter_1.rateLimiter);
        // Health check endpoint (before rate limiting)
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: process.env.NODE_ENV
            });
        });
    }
    initializeRoutes() {
        // API routes
        this.app.use('/api/auth', auth_1.default);
        this.app.use('/api/game', game_1.default);
        this.app.use('/api/payments', payment_1.default);
        this.app.use('/api/user', user_1.default);
        this.app.use('/api/webhooks', webhook_1.default);
        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Endpoint not found'
                }
            });
        });
    }
    initializeWebSocket() {
        // Initialize WebSocket handlers
        new GameSocketHandler_1.GameSocketHandler(this.io);
    }
    initializeErrorHandling() {
        this.app.use(errorHandler_1.ErrorHandler.handle);
        // Global error handlers
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            process.exit(1);
        });
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });
        // Graceful shutdown
        process.on('SIGTERM', this.gracefulShutdown.bind(this));
        process.on('SIGINT', this.gracefulShutdown.bind(this));
    }
    async gracefulShutdown(signal) {
        console.log(`Received signal ${signal}. Starting graceful shutdown...`);
        // Close server
        this.server.close(async () => {
            console.log('HTTP server closed.');
            try {
                // Close database connections
                await DatabaseService_1.DatabaseService.disconnect();
                console.log('Database disconnected.');
                // Close Redis connections
                await RedisService_1.RedisService.disconnect();
                console.log('Redis disconnected.');
                // Stop background services
                SessionCleanupService_1.SessionCleanupService.stop();
                console.log('Background services stopped.');
                console.log('Graceful shutdown completed.');
                process.exit(0);
            }
            catch (error) {
                console.error('Error during shutdown:', error);
                process.exit(1);
            }
        });
        // Force shutdown after 30 seconds
        setTimeout(() => {
            console.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 30000);
    }
    async start() {
        try {
            // Initialize services
            await DatabaseService_1.DatabaseService.connect();
            await RedisService_1.RedisService.connect();
            // Start background services
            SessionCleanupService_1.SessionCleanupService.start();
            // Start server
            this.server.listen(this.port, () => {
                console.log(`🚀 Server running on port ${this.port}`);
                console.log(`📊 Environment: ${process.env.NODE_ENV}`);
                console.log(`🔗 WebSocket enabled`);
                console.log(`💾 Database connected`);
                console.log(`⚡ Redis connected`);
            });
        }
        catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    }
}
// Start the application
const app = new App();
app.start().catch((error) => {
    console.error('Application startup failed:', error);
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=index.js.map