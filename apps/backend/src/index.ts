import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path'; // Added for serving static files

import { rateLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './routes/auth';
import gameRoutes from './routes/game';
import { enhancedGameRoutes } from './routes/enhancedGame';
import paymentRoutes from './routes/payment';
import userRoutes from './routes/user';
import webhookRoutes from './routes/webhook';
import adminRoutes from './routes/admin';

// Service imports
import { RedisService } from './services/RedisService';
import { DatabaseService } from './services/DatabaseService';
import { GameSocketHandler } from './services/GameSocketHandler';
import { EnhancedGameSocketHandler } from './services/EnhancedGameSocketHandler';
import { SessionCleanupService } from './services/SessionCleanupService';
import { MonitoringService } from './services/MonitoringService';

// Load environment variables
dotenv.config();

class App {
  public app: express.Application;
  public server: ReturnType<typeof createServer>;
  public io: SocketIOServer;
  private port: number;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    this.port = parseInt(process.env.PORT || '3002', 10); // Changed from 3001 to 3002

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeWebSocket();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
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
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('combined'));
    }
    this.app.use(requestLogger);

    // Rate limiting
    this.app.use(rateLimiter);

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

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/game', gameRoutes);
    this.app.use('/api/enhanced-game', enhancedGameRoutes);
    this.app.use('/api/payments', paymentRoutes);
    this.app.use('/api/user', userRoutes);
    this.app.use('/api/webhooks', webhookRoutes);
    this.app.use('/api/admin', adminRoutes);

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

  private initializeWebSocket(): void {
    // Initialize WebSocket handlers
    new GameSocketHandler(this.io);
    new EnhancedGameSocketHandler(this.io);
  }

  private initializeErrorHandling(): void {
    // Global error handler (must be last)
    this.app.use(errorHandler);
    
    // Global error handlers
    process.on('uncaughtException', (error: Error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGINT', this.gracefulShutdown.bind(this));
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    console.log(`Received signal ${signal}. Starting graceful shutdown...`);

    // Close server
    this.server.close(async () => {
      console.log('HTTP server closed.');

      try {
        // Close database connections
        await DatabaseService.disconnect();
        console.log('Database disconnected.');

        // Close Redis connections
        await RedisService.disconnect();
        console.log('Redis disconnected.');

        // Stop background services
        SessionCleanupService.stop();
        console.log('Background services stopped.');

        console.log('Graceful shutdown completed.');
        process.exit(0);
      } catch (error) {
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

  public async start(): Promise<void> {
    try {
      // Initialize Database
      await DatabaseService.connect();
      
      // Initialize Redis (optional in development)
      try {
        await RedisService.connect();
      } catch (redisError) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Redis connection failed in development mode - continuing without Redis');
          console.warn('   - Session management will use memory storage');
          console.warn('   - Rate limiting will be disabled');
          console.warn('   - Install Redis for full functionality: redis-server');
        } else {
          console.error('❌ Redis connection failed in production:', redisError);
          throw redisError; // Redis is required in production
        }
      }

      // Setup Socket.IO with the HTTP server
      const io = new SocketIOServer(this.server, {
        cors: {
          origin: process.env.CORS_ORIGIN || "http://localhost:5173",
          methods: ["GET", "POST"],
          credentials: true
        }
      });

      // Initialize game socket handler
      // GameSocketHandler.init(io);

      // Start monitoring service
      // MonitoringService.start();

      // Start session cleanup service (will handle missing Redis gracefully)
      SessionCleanupService.start();

      // Start HTTP server
      this.server.listen(this.port, () => {
        console.log(`🚀 Server running on port ${this.port}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV}`);
        console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || "http://localhost:5173"}`);
        console.log(`📁 Serving static files from: ${path.join(__dirname, '../../../apps/frontend/dist')}`);
      });

    } catch (error) {
      console.error('Failed to start server:', error);
      
      // Cleanup connections
      try {
        await DatabaseService.disconnect();
        await RedisService.disconnect();
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
      
      throw error;
    }
  }
}

// Start the application
const app = new App();
app.start().catch((error) => {
  console.error('Application startup failed:', error);
  process.exit(1);
});

export default app; 