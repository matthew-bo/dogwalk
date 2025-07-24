import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { RedisService } from '@/services/RedisService';
import { EnhancedGameService } from '@/services/EnhancedGameService';
import { JWTPayload, WS_EVENTS, GameEventType } from 'shared';

interface AuthenticatedSocket extends Socket {
  user?: JWTPayload;
}

interface EnhancedWsEvents {
  ENHANCED_GAME_UPDATE: 'enhanced_game_update';
  ENHANCED_GAME_EVENT: 'enhanced_game_event';
  ENHANCED_GAME_CHOICE_RESULT: 'enhanced_game_choice_result';
  ENHANCED_GAME_BONUS_UPDATE: 'enhanced_game_bonus_update';
  ENHANCED_GAME_RESULT: 'enhanced_game_result';
  MINI_GAME_TRIGGER: 'mini_game_trigger';
  PROGRESSIVE_JACKPOT_UPDATE: 'progressive_jackpot_update';
}

const ENHANCED_WS_EVENTS: EnhancedWsEvents = {
  ENHANCED_GAME_UPDATE: 'enhanced_game_update',
  ENHANCED_GAME_EVENT: 'enhanced_game_event',
  ENHANCED_GAME_CHOICE_RESULT: 'enhanced_game_choice_result',
  ENHANCED_GAME_BONUS_UPDATE: 'enhanced_game_bonus_update',
  ENHANCED_GAME_RESULT: 'enhanced_game_result',
  MINI_GAME_TRIGGER: 'mini_game_trigger',
  PROGRESSIVE_JACKPOT_UPDATE: 'progressive_jackpot_update'
};

export class EnhancedGameSocketHandler {
  private io: SocketIOServer;
  private activeEnhancedSessions: Map<string, NodeJS.Timeout> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupEnhancedEventHandlers();
  }

  private setupEnhancedEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`Enhanced game connection from user ${socket.user?.username}`);

      // Enhanced game events
      socket.on('join_enhanced_game', (data: { sessionId: string }) => {
        this.handleJoinEnhancedGame(socket, data);
      });

      socket.on('leave_enhanced_game', (data: { sessionId: string }) => {
        this.handleLeaveEnhancedGame(socket, data);
      });

      socket.on('enhanced_game_heartbeat', (data: { sessionId: string }) => {
        this.handleEnhancedGameHeartbeat(socket, data);
      });

      socket.on('mini_game_choice', (data: { 
        sessionId: string; 
        eventType: string; 
        choice: 'accept' | 'decline';
        currentSecond: number;
      }) => {
        this.handleMiniGameChoice(socket, data);
      });

      socket.on('use_power_up', (data: { 
        sessionId: string; 
        powerUpType: 'leash_slack';
      }) => {
        this.handlePowerUpUse(socket, data);
      });

      socket.on('disconnect', () => {
        console.log(`Enhanced game disconnect from user ${socket.user?.username}`);
        this.handleEnhancedDisconnect(socket);
      });
    });
  }

  private async handleJoinEnhancedGame(socket: AuthenticatedSocket, data: { sessionId: string }): Promise<void> {
    try {
      const { sessionId } = data;
      
      if (!socket.user) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      // Verify session belongs to user
      const session = await RedisService.getGameSession(sessionId);
      if (!session || session.userId !== socket.user.userId) {
        socket.emit('error', { message: 'Enhanced game session not found' });
        return;
      }

      if (!session.enhanced) {
        socket.emit('error', { message: 'Not an enhanced game session' });
        return;
      }

      // Join enhanced game room
      socket.join(`enhanced-game:${sessionId}`);
      
      // Start enhanced game updates
      this.startEnhancedGameUpdates(sessionId);
      
      console.log(`User ${socket.user.username} joined enhanced game ${sessionId}`);
      
    } catch (error) {
      console.error('Error joining enhanced game:', error);
      socket.emit('error', { message: 'Failed to join enhanced game' });
    }
  }

  private handleLeaveEnhancedGame(socket: AuthenticatedSocket, data: { sessionId: string }): void {
    const { sessionId } = data;
    socket.leave(`enhanced-game:${sessionId}`);
    
    // Stop updates if no one is listening
    const room = this.io.sockets.adapter.rooms.get(`enhanced-game:${sessionId}`);
    if (!room || room.size === 0) {
      this.stopEnhancedGameUpdates(sessionId);
    }
  }

  private async handleEnhancedGameHeartbeat(socket: AuthenticatedSocket, data: { sessionId: string }): Promise<void> {
    try {
      const { sessionId } = data;
      
      if (!socket.user) return;

      // Update session heartbeat in Redis
      const session = await RedisService.getGameSession(sessionId);
      if (session && session.userId === socket.user.userId && session.enhanced) {
        session.lastHeartbeat = Date.now();
        await RedisService.setGameSession(sessionId, session, 300);
      }
    } catch (error) {
      console.error('Error handling enhanced game heartbeat:', error);
    }
  }

  private async handleMiniGameChoice(socket: AuthenticatedSocket, data: {
    sessionId: string;
    eventType: string;
    choice: 'accept' | 'decline';
    currentSecond: number;
  }): Promise<void> {
    try {
      if (!socket.user) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const result = await EnhancedGameService.handleEventChoice(
        socket.user.userId,
        data.sessionId,
        data.eventType,
        data.choice,
        data.currentSecond
      );

      // Broadcast choice result to all participants in the session
      this.io.to(`enhanced-game:${data.sessionId}`).emit(ENHANCED_WS_EVENTS.ENHANCED_GAME_CHOICE_RESULT, {
        eventType: data.eventType,
        choice: data.choice,
        result: result.result,
        message: result.message,
        newMultipliers: {
          risk: result.newRiskMultiplier,
          payout: result.newPayoutMultiplier
        }
      });

    } catch (error) {
      console.error('Error handling mini game choice:', error);
      socket.emit('error', { message: 'Failed to process choice' });
    }
  }

  private async handlePowerUpUse(socket: AuthenticatedSocket, data: {
    sessionId: string;
    powerUpType: 'leash_slack';
  }): Promise<void> {
    try {
      if (!socket.user) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const result = await EnhancedGameService.handleEventChoice(
        socket.user.userId,
        data.sessionId,
        'leash_slack',
        'use_powerup',
        0
      );

      // Broadcast power-up use to session
      this.io.to(`enhanced-game:${data.sessionId}`).emit(ENHANCED_WS_EVENTS.ENHANCED_GAME_BONUS_UPDATE, {
        powerUpType: data.powerUpType,
        result: result.result,
        message: 'Leash Slack activated! One-time squirrel protection used.',
        newMultipliers: {
          risk: result.newRiskMultiplier,
          payout: result.newPayoutMultiplier
        }
      });

    } catch (error) {
      console.error('Error handling power-up use:', error);
      socket.emit('error', { message: 'Failed to use power-up' });
    }
  }

  private handleEnhancedDisconnect(socket: AuthenticatedSocket): void {
    // Clean up any enhanced game sessions this user was part of
    // The session cleanup service will handle abandoned games
  }

  private startEnhancedGameUpdates(sessionId: string): void {
    // Prevent duplicate intervals
    if (this.activeEnhancedSessions.has(sessionId)) {
      return;
    }

    const updateInterval = setInterval(async () => {
      try {
        const session = await RedisService.getGameSession(sessionId);
        
        if (!session || session.status !== 'active' || !session.enhanced) {
          this.stopEnhancedGameUpdates(sessionId);
          return;
        }

        const currentTime = Date.now();
        const elapsedSeconds = Math.floor((currentTime - session.startTime) / 1000);
        
        // Get enhanced game state
        const gameState = await EnhancedGameService.getEnhancedGameState(sessionId);
        
        // Check for squirrel event
        const enhanced = session.enhanced as any;
        const squirrelEvent = enhanced.events?.find((e: GameEventType) => e.type === 'squirrel');
        
        if (squirrelEvent && elapsedSeconds >= squirrelEvent.second) {
          // Game ends due to squirrel
          this.io.to(`enhanced-game:${sessionId}`).emit(ENHANCED_WS_EVENTS.ENHANCED_GAME_RESULT, {
            sessionId,
            outcome: 'loss',
            finalPayout: 0,
            squirrelEventTime: squirrelEvent.second,
            eventsTriggered: enhanced.playerChoices?.map((c: any) => `${c.eventType}:${c.choice}`) || []
          });
          
          this.stopEnhancedGameUpdates(sessionId);
          return;
        }

        // Check for active events at current second
        const activeEvents = gameState.activeEvents;
        const upcomingEvents = gameState.upcomingEvents;

        // Trigger event notifications
        for (const event of activeEvents) {
          if (event.type === 'mini_bonus' || event.type === 'fetch_opportunity' || event.type === 'butterfly_chase') {
            this.io.to(`enhanced-game:${sessionId}`).emit(ENHANCED_WS_EVENTS.MINI_GAME_TRIGGER, {
              event: {
                type: event.type,
                second: event.second,
                timeLimit: this.getEventTimeLimit(event.type),
                description: this.getEventDescription(event.type)
              }
            });
          } else if (event.type === 'progressive_jackpot') {
            this.io.to(`enhanced-game:${sessionId}`).emit(ENHANCED_WS_EVENTS.PROGRESSIVE_JACKPOT_UPDATE, {
              triggered: true,
              amount: 15000, // Mock amount - would be from database
              multiplier: event.parameters?.multiplier || 2
            });
          }
        }

        // Send enhanced game update
        const currentPayout = Math.floor(
          session.betAmount * 
          gameState.baseMultiplier * 
          gameState.bonusMultiplier
        );

        this.io.to(`enhanced-game:${sessionId}`).emit(ENHANCED_WS_EVENTS.ENHANCED_GAME_UPDATE, {
          sessionId,
          currentSecond: elapsedSeconds,
          baseMultiplier: gameState.baseMultiplier,
          bonusMultiplier: gameState.bonusMultiplier,
          riskMultiplier: gameState.riskMultiplier,
          currentPayout,
          upcomingEvents: upcomingEvents.map(e => ({
            type: e.type,
            second: e.second,
            timeUntil: e.second - elapsedSeconds
          }))
        });

      } catch (error) {
        console.error('Error sending enhanced game update:', error);
        this.stopEnhancedGameUpdates(sessionId);
      }
    }, 1000); // Update every second

    this.activeEnhancedSessions.set(sessionId, updateInterval);
  }

  private stopEnhancedGameUpdates(sessionId: string): void {
    const interval = this.activeEnhancedSessions.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.activeEnhancedSessions.delete(sessionId);
    }
  }

  private getEventTimeLimit(eventType: string): number {
    const timeLimits: Record<string, number> = {
      'mini_bonus': 8,
      'fetch_opportunity': 10,
      'butterfly_chase': 5
    };
    return timeLimits[eventType] || 5;
  }

  private getEventDescription(eventType: string): string {
    const descriptions: Record<string, string> = {
      'mini_bonus': '🦴 Your dog found a treat! Take the risk for bonus multiplier?',
      'fetch_opportunity': '🎾 Tennis ball spotted! Enter fetch mode for +50% payout but 2x risk?',
      'butterfly_chase': '🦋 Butterfly chase! Quick tap challenge for bonus!'
    };
    return descriptions[eventType] || 'Special event triggered!';
  }

  // Public method to send enhanced game results
  public async sendEnhancedGameResult(sessionId: string, result: any): Promise<void> {
    this.io.to(`enhanced-game:${sessionId}`).emit(ENHANCED_WS_EVENTS.ENHANCED_GAME_RESULT, result);
    this.stopEnhancedGameUpdates(sessionId);
  }

  // Public method to update progressive jackpot
  public async broadcastJackpotUpdate(amount: number): Promise<void> {
    this.io.emit(ENHANCED_WS_EVENTS.PROGRESSIVE_JACKPOT_UPDATE, {
      currentAmount: amount,
      timestamp: new Date().toISOString()
    });
  }
} 