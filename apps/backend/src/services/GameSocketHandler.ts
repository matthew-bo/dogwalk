import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { RedisService } from '@/services/RedisService';
import { JWTPayload, WS_EVENTS } from 'shared';

interface AuthenticatedSocket extends Socket {
  user?: JWTPayload;
}

export class GameSocketHandler {
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupDepositMonitoring();
  }

  private setupMiddleware(): void {
    // Authentication middleware for WebSocket connections
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Check if token is blacklisted
        const isBlacklisted = await RedisService.isTokenBlacklisted(token);
        if (isBlacklisted) {
          return next(new Error('Token has been revoked'));
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
        socket.user = decoded;
        
        next();
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.user?.username} connected via WebSocket`);

      // Join user to their personal room
      if (socket.user?.userId) {
        socket.join(`user:${socket.user.userId}`);
      }

      // Handle game events
      socket.on(WS_EVENTS.JOIN_GAME, (data: { sessionId: string }) => {
        this.handleJoinGame(socket, data);
      });

      socket.on(WS_EVENTS.LEAVE_GAME, (data: { sessionId: string }) => {
        this.handleLeaveGame(socket, data);
      });

      socket.on(WS_EVENTS.GAME_HEARTBEAT, (data: { sessionId: string }) => {
        this.handleGameHeartbeat(socket, data);
      });

      socket.on('disconnect', () => {
        console.log(`User ${socket.user?.username} disconnected`);
        this.handleDisconnect(socket);
      });
    });
  }

  private setupDepositMonitoring(): void {
    // Set up a separate namespace for deposit monitoring
    const depositNamespace = this.io.of('/deposit-monitor');
    
    depositNamespace.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const isBlacklisted = await RedisService.isTokenBlacklisted(token);
        if (isBlacklisted) {
          return next(new Error('Token has been revoked'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
        socket.user = decoded;
        
        next();
      } catch (error) {
        console.error('Deposit monitor authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    depositNamespace.on('connection', (socket: any) => {
      console.log(`User ${socket.user?.username} connected to deposit monitor`);

      socket.on('monitor_address', async (data: {
        address: string;
        sessionId: string;
        currency: string;
      }) => {
        try {
          if (!socket.user) {
            socket.emit('deposit_error', { message: 'Authentication required' });
            return;
          }

          // Verify the deposit session exists and belongs to the user
          const depositSession = await RedisService.getDepositSession(data.sessionId);
          if (!depositSession || depositSession.userId !== socket.user.userId) {
            socket.emit('deposit_error', { message: 'Invalid deposit session' });
            return;
          }

          // Join the deposit monitoring room
          socket.join(`deposit:${data.sessionId}`);

          // In production, this would start monitoring the blockchain
          // For now, simulate deposit detection after a delay (for demo purposes)
          this.simulateDepositDetection(data.sessionId, data.address, data.currency);

        } catch (error) {
          console.error('Error setting up deposit monitoring:', error);
          socket.emit('deposit_error', { message: 'Failed to start monitoring' });
        }
      });

      socket.on('disconnect', () => {
        console.log(`User ${socket.user?.username} disconnected from deposit monitor`);
      });
    });
  }

  private simulateDepositDetection(sessionId: string, address: string, currency: string): void {
    // This is for development/demo purposes only
    // In production, replace with real blockchain monitoring
    setTimeout(() => {
      this.io.of('/deposit-monitor').to(`deposit:${sessionId}`).emit('deposit_detected', {
        sessionId,
        address,
        currency,
        amount: currency === 'BTC' ? 0.001 : 0.01, // Mock amounts
        txHash: `mock_tx_${Date.now()}`,
        confirmations: 1
      });
    }, 30000); // Simulate 30 second delay
  }

  private async handleJoinGame(socket: AuthenticatedSocket, data: { sessionId: string }): Promise<void> {
    try {
      const { sessionId } = data;
      
      if (!socket.user) {
        socket.emit(WS_EVENTS.ERROR, { message: 'Authentication required' });
        return;
      }

      // Verify session belongs to user
      const session = await RedisService.getGameSession(sessionId);
      if (!session || session.userId !== socket.user.userId) {
        socket.emit(WS_EVENTS.ERROR, { message: 'Game session not found' });
        return;
      }

      // Join game room
      socket.join(`game:${sessionId}`);
      
      // Start sending game updates
      this.startGameUpdates(sessionId);
      
    } catch (error) {
      console.error('Error joining game:', error);
      socket.emit(WS_EVENTS.ERROR, { message: 'Failed to join game' });
    }
  }

  private handleLeaveGame(socket: AuthenticatedSocket, data: { sessionId: string }): void {
    const { sessionId } = data;
    socket.leave(`game:${sessionId}`);
  }

  private async handleGameHeartbeat(socket: AuthenticatedSocket, data: { sessionId: string }): Promise<void> {
    try {
      const { sessionId } = data;
      
      if (!socket.user) return;

      // Update session heartbeat in Redis
      const session = await RedisService.getGameSession(sessionId);
      if (session && session.userId === socket.user.userId) {
        session.lastHeartbeat = Date.now();
        await RedisService.setGameSession(sessionId, session, 300);
      }
    } catch (error) {
      console.error('Error handling game heartbeat:', error);
    }
  }

  private handleDisconnect(socket: AuthenticatedSocket): void {
    // Clean up any game rooms the user was in
    // The session cleanup service will handle abandoned games
  }

  private startGameUpdates(sessionId: string): void {
    const updateInterval = setInterval(async () => {
      try {
        const session = await RedisService.getGameSession(sessionId);
        
        if (!session || session.status !== 'active') {
          clearInterval(updateInterval);
          return;
        }

        const currentTime = Date.now();
        const elapsedSeconds = Math.floor((currentTime - session.startTime) / 1000);
        
        // Check if game should end due to squirrel event
        if (session.squirrelEventTime && elapsedSeconds >= session.squirrelEventTime) {
          // Game ends due to squirrel
          this.io.to(`game:${sessionId}`).emit(WS_EVENTS.GAME_RESULT, {
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

        this.io.to(`game:${sessionId}`).emit(WS_EVENTS.GAME_UPDATE, {
          sessionId,
          currentSecond: elapsedSeconds,
          currentPayout,
          squirrelRisk
        });

      } catch (error) {
        console.error('Error sending game update:', error);
        clearInterval(updateInterval);
      }
    }, 1000); // Update every second
  }

  // Send balance update to user
  public async sendBalanceUpdate(userId: string, newBalance: number): Promise<void> {
    this.io.to(`user:${userId}`).emit(WS_EVENTS.BALANCE_UPDATE, {
      balance: newBalance,
      timestamp: new Date().toISOString()
    });
  }

  // Send game result to game participants
  public async sendGameResult(sessionId: string, result: any): Promise<void> {
    this.io.to(`game:${sessionId}`).emit(WS_EVENTS.GAME_RESULT, result);
  }

  private getPayoutMultiplier(seconds: number): number {
    // This should match the shared GAME_CONFIG
    const baseMultiplier = 1 + (seconds * 0.15) + Math.pow(seconds * 0.1, 1.8);
    return Math.round(baseMultiplier * (1 - 0.08) * 100) / 100; // 8% house edge
  }

  private getRiskPerSecond(second: number): number {
    // This should match the shared GAME_CONFIG
    if (second <= 5) return 0.01;
    if (second <= 10) return 0.03;
    if (second <= 15) return 0.05;
    if (second <= 20) return 0.07;
    return 0.10;
  }
}