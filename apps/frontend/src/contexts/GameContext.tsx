import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameSession, StartGameResponse } from 'shared';
import { gameService } from '../services/gameService';
import { useAuthContext } from './AuthContext';
import toast from 'react-hot-toast';

interface GameState {
  currentSession: GameSession | null;
  isGameActive: boolean;
  gameTime: number;
  currentMultiplier: number;
  squirrelEvent: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  isDemoMode: boolean;
}

interface GameContextType {
  gameState: GameState;
  socket: Socket | null;
  startGame: (betAmount: number) => Promise<void>;
  cashOut: () => Promise<void>;
  isStarting: boolean;
  isCashingOut: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
};

const calculateMultiplier = (seconds: number): number => {
  const baseMultiplier = 1 + (seconds * 0.15) + Math.pow(seconds * 0.1, 1.8);
  return Math.round(baseMultiplier * (1 - 0.08) * 100) / 100;
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuthContext();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isCashingOut, setIsCashingOut] = useState(false);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const squirrelTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    currentSession: null,
    isGameActive: false,
    gameTime: 0,
    currentMultiplier: 1.0,
    squirrelEvent: false,
    connectionStatus: 'disconnected',
    isDemoMode: !isAuthenticated
  });

  // Update demo mode when authentication changes
  useEffect(() => {
    setGameState(prev => ({ ...prev, isDemoMode: !isAuthenticated }));
  }, [isAuthenticated]);

  // WebSocket connection (only for authenticated users)
  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize WebSocket connection
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const newSocket = io(wsUrl, {
        auth: { token },
        transports: ['websocket']
      });

      newSocket.on('connect', () => {
        setGameState(prev => ({ ...prev, connectionStatus: 'connected' }));
      });

      newSocket.on('disconnect', () => {
        setGameState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
      });

      newSocket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setGameState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
      });

      newSocket.on('game_update', (data: { gameTime: number; isActive: boolean }) => {
        if (data.isActive) {
          const multiplier = calculateMultiplier(data.gameTime);
          setGameState(prev => ({
            ...prev,
            gameTime: data.gameTime,
            currentMultiplier: multiplier,
            isGameActive: true
          }));
        }
      });

      newSocket.on('game_ended', (data: { reason: 'squirrel' | 'cashout' | 'timeout'; payout?: number }) => {
        setGameState(prev => ({
          ...prev,
          isGameActive: false,
          squirrelEvent: data.reason === 'squirrel',
          currentSession: null
        }));

        if (data.reason === 'squirrel') {
          toast.error('🐿️ A squirrel appeared! Game over!');
        } else if (data.reason === 'cashout' && data.payout) {
          toast.success(`🎉 Cashed out for $${(data.payout / 100).toFixed(2)}!`);
        }
      });

      newSocket.on('balance_update', (data: { balance: number }) => {
        // Update user balance if needed
        console.log('Balance updated:', data.balance);
      });

      setSocket(newSocket);
      setGameState(prev => ({ ...prev, connectionStatus: 'connecting' }));

      return () => {
        newSocket.close();
        setSocket(null);
        setGameState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
      };
    }
    return undefined;
  }, [isAuthenticated, user]);

  // Demo mode game simulation
  const startDemoGame = (betAmount: number) => {
    // Generate random squirrel event time (1-30 seconds)
    const squirrelTime = Math.floor(Math.random() * 30) + 1;
    
    const demoSession: GameSession = {
      id: `demo-${Date.now()}`,
      userId: 'demo-user',
      betAmount: betAmount,
      payoutAmount: 0,
      outcome: 'incomplete',
      rngSeed: 'demo-seed',
      serverSeedHash: 'demo-hash',
      clientSeed: 'demo-client',
      nonce: Date.now(),
      createdAt: new Date()
    };

    setGameState(prev => ({
      ...prev,
      currentSession: demoSession,
      isGameActive: true,
      gameTime: 0,
      currentMultiplier: 1.0,
      squirrelEvent: false
    }));

    // Start demo game timer
    gameTimerRef.current = setInterval(() => {
      setGameState(prev => {
        const newTime = prev.gameTime + 1;
        const newMultiplier = calculateMultiplier(newTime);
        
        return {
          ...prev,
          gameTime: newTime,
          currentMultiplier: newMultiplier
        };
      });
    }, 1000);

    // Schedule squirrel event
    squirrelTimerRef.current = setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        isGameActive: false,
        squirrelEvent: true,
        currentSession: null
      }));
      
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
        gameTimerRef.current = null;
      }
      
      toast.error('🐿️ A squirrel appeared! Game over!');
    }, squirrelTime * 1000);
  };

  const cashOutDemo = () => {
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
    if (squirrelTimerRef.current) {
      clearTimeout(squirrelTimerRef.current);
      squirrelTimerRef.current = null;
    }

    const currentBet = gameState.currentSession?.betAmount || 0;
    const payout = Math.round(currentBet * gameState.currentMultiplier);
    
    setGameState(prev => ({
      ...prev,
      isGameActive: false,
      currentSession: null,
      squirrelEvent: false
    }));

    toast.success(`🎉 Demo cashout! Won $${(payout / 100).toFixed(2)}!`);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
      if (squirrelTimerRef.current) {
        clearTimeout(squirrelTimerRef.current);
      }
    };
  }, []);

  const startGame = async (betAmount: number) => {
    if (gameState.isGameActive) return;

    setIsStarting(true);
    
    try {
      if (!isAuthenticated) {
        // Demo mode
        startDemoGame(betAmount);
        toast.success(`Demo game started! Bet: $${(betAmount / 100).toFixed(2)}`);
      } else {
        // Real money mode
        if (!socket) {
          throw new Error('Not connected to game server');
        }

        const response: StartGameResponse = await gameService.startGame(betAmount);
        
        const newSession: GameSession = {
          id: response.sessionId,
          userId: user!.id,
          betAmount: betAmount,
          payoutAmount: 0,
          outcome: 'incomplete',
          rngSeed: `${response.serverSeedHash}:${response.clientSeed}:${response.nonce}`,
          serverSeedHash: response.serverSeedHash,
          clientSeed: response.clientSeed,
          nonce: response.nonce,
          createdAt: new Date()
        };

        setGameState(prev => ({
          ...prev,
          currentSession: newSession,
          isGameActive: true,
          gameTime: 0,
          currentMultiplier: 1.0,
          squirrelEvent: false
        }));

        // Join the game room
        socket.emit('join_game', { sessionId: response.sessionId });
        
        toast.success(`Game started! Bet: $${(betAmount / 100).toFixed(2)}`);
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to start game';
      toast.error(message);
    } finally {
      setIsStarting(false);
    }
  };

  const cashOut = async () => {
    if (!gameState.currentSession || !gameState.isGameActive || isCashingOut) return;

    setIsCashingOut(true);
    
    try {
      if (!isAuthenticated) {
        // Demo mode
        cashOutDemo();
      } else {
        // Real money mode
        const response = await gameService.cashOut(gameState.currentSession.id, gameState.gameTime);
        
        setGameState(prev => ({
          ...prev,
          isGameActive: false,
          currentSession: null
        }));

        if (response.outcome === 'win' && response.payout > 0) {
          toast.success(`🎉 Success! Won $${(response.payout / 100).toFixed(2)}!`);
        } else {
          toast.error('🐿️ Too late! The squirrel got you!');
        }
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to cash out';
      toast.error(message);
    } finally {
      setIsCashingOut(false);
    }
  };

  const value: GameContextType = {
    gameState,
    socket,
    startGame,
    cashOut,
    isStarting,
    isCashingOut
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}; 