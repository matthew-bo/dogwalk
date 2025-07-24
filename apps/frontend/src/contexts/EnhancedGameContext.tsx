import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { API_ENDPOINTS } from 'shared';

// Enhanced Game State Types
interface GameEventState {
  type: 'squirrel' | 'mini_bonus' | 'fetch_opportunity' | 'progressive_jackpot' | 'safe_zone';
  second: number;
  timeUntil?: number;
  isActive?: boolean;
  hasExpired?: boolean;
}

interface ActiveBonusState {
  leashSlackUsed: boolean;
  fetchActiveUntil?: number;
  butterflyBonus?: number;
  riskMultiplier: number;
  payoutMultiplier: number;
}

interface MiniGameEventState {
  id: string;
  type: 'bonus_treat' | 'fetch_game';
  title: string;
  description: string;
  riskDescription: string;
  rewardDescription: string;
  acceptAction: string;
  declineAction: string;
  timeLimit: number;
  isActive: boolean;
  timeRemaining?: number;
}

interface ProgressiveJackpotState {
  currentAmount: number;
  isTriggered: boolean;
  multiplier?: number | undefined;
  lastWinner?: {
    username: string;
    amount: number;
    timestamp: Date;
  };
}

interface EnhancedGameState {
  // Basic game state
  isGameActive: boolean;
  gameTime: number;
  sessionId: string | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  
  // Enhanced features
  baseMultiplier: number;
  bonusMultiplier: number;
  riskMultiplier: number;
  currentPayout: number;
  
  // Events and bonuses
  upcomingEvents: GameEventState[];
  activeEvents: GameEventState[];
  activeBonuses: ActiveBonusState;
  
  // Mini-games
  activeMiniGame: MiniGameEventState | null;
  miniGameChoiceTime: number | null;
  
  // Progressive features
  progressiveJackpot: ProgressiveJackpotState;
  
  // Game results
  gameResult: {
    outcome: 'win' | 'loss' | null;
    payout: number;
    baseMultiplier: number;
    bonusMultiplier: number;
    finalMultiplier: number;
    eventsTriggered: string[];
  } | null;
  
  // Error state
  error: string | null;
}

// Action Types
type EnhancedGameAction =
  | { type: 'GAME_STARTED'; payload: { sessionId: string; upcomingEvents: GameEventState[] } }
  | { type: 'GAME_UPDATE'; payload: { 
      currentSecond: number; 
      baseMultiplier: number; 
      bonusMultiplier: number;
      riskMultiplier: number;
      currentPayout: number;
      upcomingEvents: GameEventState[];
    }}
  | { type: 'MINI_GAME_TRIGGERED'; payload: MiniGameEventState }
  | { type: 'MINI_GAME_CHOICE_MADE'; payload: { choice: 'accept' | 'decline' } }
  | { type: 'MINI_GAME_RESULT'; payload: { 
      result: 'bonus_gained' | 'penalty_applied' | 'no_change';
      message: string;
      newMultipliers: { risk: number; payout: number };
    }}
  | { type: 'POWER_UP_USED'; payload: { 
      powerUpType: 'leash_slack';
      message: string;
      newMultipliers: { risk: number; payout: number };
    }}
  | { type: 'PROGRESSIVE_JACKPOT_UPDATE'; payload: { 
      triggered?: boolean;
      currentAmount: number;
      multiplier?: number;
    }}
  | { type: 'GAME_RESULT'; payload: {
      outcome: 'win' | 'loss';
      payout: number;
      baseMultiplier: number;
      bonusMultiplier: number;
      finalMultiplier: number;
      eventsTriggered: string[];
    }}
  | { type: 'CONNECTION_STATUS'; payload: 'disconnected' | 'connecting' | 'connected' }
  | { type: 'ERROR'; payload: string }
  | { type: 'RESET_GAME' };

// Initial State
const initialState: EnhancedGameState = {
  isGameActive: false,
  gameTime: 0,
  sessionId: null,
  connectionStatus: 'disconnected',
  baseMultiplier: 1.0,
  bonusMultiplier: 1.0,
  riskMultiplier: 1.0,
  currentPayout: 0,
  upcomingEvents: [],
  activeEvents: [],
  activeBonuses: {
    leashSlackUsed: false,
    riskMultiplier: 1.0,
    payoutMultiplier: 1.0
  },
  activeMiniGame: null,
  miniGameChoiceTime: null,
  progressiveJackpot: {
    currentAmount: 15000,
    isTriggered: false
  },
  gameResult: null,
  error: null
};

// Reducer
function enhancedGameReducer(state: EnhancedGameState, action: EnhancedGameAction): EnhancedGameState {
  switch (action.type) {
    case 'GAME_STARTED':
      return {
        ...state,
        isGameActive: true,
        sessionId: action.payload.sessionId,
        upcomingEvents: action.payload.upcomingEvents,
        gameTime: 0,
        gameResult: null,
        error: null,
        activeBonuses: initialState.activeBonuses
      };

    case 'GAME_UPDATE':
      return {
        ...state,
        gameTime: action.payload.currentSecond,
        baseMultiplier: action.payload.baseMultiplier,
        bonusMultiplier: action.payload.bonusMultiplier,
        riskMultiplier: action.payload.riskMultiplier,
        currentPayout: action.payload.currentPayout,
        upcomingEvents: action.payload.upcomingEvents,
        // Update active events based on current time
        activeEvents: state.upcomingEvents.filter(e => 
          e.second === action.payload.currentSecond
        )
      };

    case 'MINI_GAME_TRIGGERED':
      return {
        ...state,
        activeMiniGame: action.payload,
        miniGameChoiceTime: Date.now()
      };

    case 'MINI_GAME_CHOICE_MADE':
      return {
        ...state,
        activeMiniGame: state.activeMiniGame ? {
          ...state.activeMiniGame,
          isActive: false
        } : null
      };

    case 'MINI_GAME_RESULT':
      return {
        ...state,
        activeMiniGame: null,
        miniGameChoiceTime: null,
        activeBonuses: {
          ...state.activeBonuses,
          riskMultiplier: action.payload.newMultipliers.risk,
          payoutMultiplier: action.payload.newMultipliers.payout
        }
      };

    case 'POWER_UP_USED':
      return {
        ...state,
        activeBonuses: {
          ...state.activeBonuses,
          leashSlackUsed: action.payload.powerUpType === 'leash_slack' ? true : state.activeBonuses.leashSlackUsed,
          riskMultiplier: action.payload.newMultipliers.risk,
          payoutMultiplier: action.payload.newMultipliers.payout
        }
      };

    case 'PROGRESSIVE_JACKPOT_UPDATE':
      return {
        ...state,
        progressiveJackpot: {
          ...state.progressiveJackpot,
          currentAmount: action.payload.currentAmount,
          isTriggered: action.payload.triggered || false,
          multiplier: action.payload.multiplier
        }
      };

    case 'GAME_RESULT':
      return {
        ...state,
        isGameActive: false,
        gameResult: action.payload,
        activeMiniGame: null,
        miniGameChoiceTime: null
      };

    case 'CONNECTION_STATUS':
      return {
        ...state,
        connectionStatus: action.payload
      };

    case 'ERROR':
      return {
        ...state,
        error: action.payload
      };

    case 'RESET_GAME':
      return {
        ...initialState,
        progressiveJackpot: state.progressiveJackpot // Keep jackpot amount
      };

    default:
      return state;
  }
}

// Context
interface EnhancedGameContextType {
  state: EnhancedGameState;
  startEnhancedGame: (betAmount: number, fetchMode?: boolean) => Promise<void>;
  makeEventChoice: (eventType: string, choice: 'accept' | 'decline') => Promise<void>;
  usePowerUp: (powerUpType: 'leash_slack') => Promise<void>;
  cashOut: () => Promise<void>;
  resetGame: () => void;
}

const EnhancedGameContext = createContext<EnhancedGameContextType | undefined>(undefined);

// Provider Component
export const EnhancedGameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(enhancedGameReducer, initialState);
  useAuth(); // Using for authentication state
  const socketRef = useRef<Socket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
    const wsUrl = apiUrl.replace(/^http/, 'ws');

    socketRef.current = io(wsUrl, {
      auth: { token },
      autoConnect: true
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      dispatch({ type: 'CONNECTION_STATUS', payload: 'connected' });
    });

    socket.on('disconnect', () => {
      dispatch({ type: 'CONNECTION_STATUS', payload: 'disconnected' });
    });

    socket.on('enhanced_game_update', (data) => {
      dispatch({ type: 'GAME_UPDATE', payload: data });
    });

    socket.on('mini_game_trigger', (data) => {
      dispatch({ type: 'MINI_GAME_TRIGGERED', payload: {
        ...data.event,
        id: `${data.event.type}-${data.event.second}`,
        acceptAction: 'Accept Risk',
        declineAction: 'Play Safe',
        isActive: true
      }});
    });

    socket.on('enhanced_game_choice_result', (data) => {
      dispatch({ type: 'MINI_GAME_RESULT', payload: data });
    });

    socket.on('enhanced_game_bonus_update', (data) => {
      dispatch({ type: 'POWER_UP_USED', payload: data });
    });

    socket.on('progressive_jackpot_update', (data) => {
      dispatch({ type: 'PROGRESSIVE_JACKPOT_UPDATE', payload: data });
    });

    socket.on('enhanced_game_result', (data) => {
      dispatch({ type: 'GAME_RESULT', payload: data });
    });

    socket.on('error', (data) => {
      dispatch({ type: 'ERROR', payload: data.message });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Game Actions
  const startEnhancedGame = async (betAmount: number, fetchMode: boolean = false): Promise<void> => {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        // Demo mode - simulate enhanced game locally
        const demoSessionId = `demo-${Date.now()}`;
        const demoEvents: GameEventState[] = [
          { type: 'mini_bonus' as const, second: 5, timeUntil: 5 },
          { type: 'fetch_opportunity' as const, second: 10, timeUntil: 10 },
          { type: 'progressive_jackpot' as const, second: 20, timeUntil: 20 },
        ];
        
        dispatch({ 
          type: 'GAME_STARTED', 
          payload: { 
            sessionId: demoSessionId,
            upcomingEvents: demoEvents 
          }
        });
        
        // Start demo game simulation with fetch mode
        startDemoGameSimulation(betAmount, fetchMode);
        return;
      }

      const response = await fetch(API_ENDPOINTS.ENHANCED_GAME_START, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ betAmount })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to start enhanced game');
      }

      const data = await response.json();
      
      dispatch({ 
        type: 'GAME_STARTED', 
        payload: { 
          sessionId: data.data.sessionId,
          upcomingEvents: data.data.upcomingEvents 
        }
      });

      // Join WebSocket room
      if (socketRef.current) {
        socketRef.current.emit('join_enhanced_game', { sessionId: data.data.sessionId });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      dispatch({ type: 'ERROR', payload: errorMessage });
      throw error;
    }
  };

  // Demo game simulation with full feature parity
  const startDemoGameSimulation = (betAmount: number, fetchMode: boolean = false) => {
    let gameTime = 0;
    let isGameActive = true;
    let bonusCountThisRound = 0;
    let eventsTriggered: string[] = [];
    let currentBonusMultiplier = 1.0;
    let currentRiskMultiplier = 1.0;
    
    const gameInterval = setInterval(() => {
      if (!isGameActive) {
        clearInterval(gameInterval);
        return;
      }
      
      gameTime++;
      
      // Calculate multipliers with fetch mode effects
      const baseMultiplier = 1 + (gameTime * (fetchMode ? 0.15 : 0.1)); // Fetch mode = 50% faster growth
      let bonusMultiplier = currentBonusMultiplier;
      const riskMultiplier = currentRiskMultiplier + (gameTime * (fetchMode ? 0.08 : 0.05)); // Fetch mode = higher risk
      
      // PRD Requirement: Bonus Treats - 10-20% chance every 5s, max 2 per round
      if (gameTime % 5 === 0 && bonusCountThisRound < 2) {
        const bonusTreatChance = 0.1 + Math.random() * 0.1; // 10-20% chance
        if (Math.random() < bonusTreatChance) {
          bonusCountThisRound++;
          dispatch({ 
            type: 'MINI_GAME_TRIGGERED', 
            payload: {
              id: `bonus-treat-${gameTime}`,
              type: 'bonus_treat',
              title: '🦴 Bonus Treat Found!',
              description: 'Your dog found a mysterious treat! Do you let them sniff it?',
              riskDescription: '30% chance to increase squirrel risk for 3 seconds',
              rewardDescription: '70% chance for +$0.50 or 20% payout bonus',
              acceptAction: 'Sniff Treat',
              declineAction: 'Keep Walking',
              timeLimit: 3,
              isActive: true
            }
          });
          // Store demo state for choice handling
          (window as any).demoGameState = {
            gameTime,
            bonusCountThisRound,
            eventsTriggered,
            currentBonusMultiplier,
            currentRiskMultiplier,
            isGameActive
          };
          return; // Pause game while mini-game is active
        }
      }
      
      // PRD Requirement: Progressive Jackpot - 5% chance every 5s after 10s
      if (gameTime > 10 && gameTime % 5 === 0) {
        const jackpotChance = 0.05; // 5% chance
        if (Math.random() < jackpotChance) {
          dispatch({ 
            type: 'PROGRESSIVE_JACKPOT_UPDATE', 
            payload: {
              triggered: true,
              currentAmount: 15000 + Math.floor(Math.random() * 5000), // $150-200
              multiplier: 2.0
            }
          });
          bonusMultiplier *= 2.0; // Double the payout
          currentBonusMultiplier = bonusMultiplier;
          eventsTriggered.push('progressive_jackpot');
        }
      }
      
      const currentPayout = Math.round(betAmount * baseMultiplier * bonusMultiplier);
      
      // Random squirrel chance (increases over time) - affected by leash slack
      let squirrelChance = gameTime * 0.03; // 3% per second
      if (fetchMode) squirrelChance *= 1.3; // 30% higher risk in fetch mode
      
      if (Math.random() < squirrelChance) {
        // Game over
        isGameActive = false;
        dispatch({ 
          type: 'GAME_RESULT', 
          payload: {
            outcome: 'loss',
            payout: 0,
            baseMultiplier,
            bonusMultiplier,
            finalMultiplier: baseMultiplier * bonusMultiplier,
            eventsTriggered
          }
        });
        clearInterval(gameInterval);
        return;
      }
      
      // Update current multipliers for demo state tracking
      currentRiskMultiplier = riskMultiplier;
      
      dispatch({ 
        type: 'GAME_UPDATE', 
        payload: { 
          currentSecond: gameTime,
          baseMultiplier,
          bonusMultiplier,
          riskMultiplier,
          currentPayout,
          upcomingEvents: []
        }
      });
      
      // Max game duration
      if (gameTime >= 30) {
        isGameActive = false;
        clearInterval(gameInterval);
      }
    }, 1000);
    
    // Store interval ref and game state for demo mode choice handling
    (window as any).demoGameInterval = gameInterval;
    (window as any).demoGameSettings = { betAmount, fetchMode, eventsTriggered };
  };

  const makeEventChoice = async (eventType: string, choice: 'accept' | 'decline'): Promise<void> => {
    if (!state.sessionId) return;

    try {
      dispatch({ type: 'MINI_GAME_CHOICE_MADE', payload: { choice } });

      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        // Demo mode - handle choice locally
        const demoState = (window as any).demoGameState;
        const demoSettings = (window as any).demoGameSettings;
        
        if (demoState && demoSettings) {
          let resultMessage = '';
          let newRiskMultiplier = demoState.currentRiskMultiplier;
          let newPayoutMultiplier = demoState.currentBonusMultiplier;
          let result: 'bonus_gained' | 'penalty_applied' | 'no_change' = 'no_change';
          
          if (choice === 'accept' && eventType === 'bonus_treat') {
            // 70% chance for reward, 30% chance for penalty
            if (Math.random() < 0.7) {
              // Success - bonus gained
              const bonusType = Math.random() < 0.5 ? 'payout' : 'amount';
              if (bonusType === 'payout') {
                newPayoutMultiplier *= 1.2; // 20% payout bonus
                resultMessage = '+20% payout bonus!';
              } else {
                newPayoutMultiplier += 0.5; // +$0.50 bonus
                resultMessage = '+$0.50 bonus!';
              }
              result = 'bonus_gained';
              demoState.eventsTriggered.push('bonus_treat');
            } else {
              // Failure - penalty applied
              newRiskMultiplier *= 1.3; // 30% higher risk for 3 seconds
              resultMessage = 'Risk increased for 3 seconds!';
              result = 'penalty_applied';
            }
          } else {
            // Declined - safe choice
            resultMessage = 'Played it safe!';
            result = 'no_change';
          }
          
          // Update demo state
          demoState.currentBonusMultiplier = newPayoutMultiplier;
          demoState.currentRiskMultiplier = newRiskMultiplier;
          
          dispatch({ 
            type: 'MINI_GAME_RESULT', 
            payload: { 
              result,
              message: resultMessage,
              newMultipliers: { 
                risk: newRiskMultiplier, 
                payout: newPayoutMultiplier 
              }
            }
          });
          
          // Resume demo game with updated state
          if ((window as any).demoGameInterval) {
            clearInterval((window as any).demoGameInterval);
          }
          startDemoGameSimulation(demoSettings.betAmount, demoSettings.fetchMode);
        }
        return;
      }

      // Real money mode - send choice via WebSocket
      if (socketRef.current) {
        socketRef.current.emit('mini_game_choice', {
          sessionId: state.sessionId,
          eventType,
          choice,
          currentSecond: state.gameTime
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      dispatch({ type: 'ERROR', payload: errorMessage });
    }
  };

  const usePowerUp = async (powerUpType: 'leash_slack'): Promise<void> => {
    if (!state.sessionId) return;

    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        // Demo mode - handle power-up locally
        if (powerUpType === 'leash_slack' && !state.activeBonuses.leashSlackUsed) {
          dispatch({ 
            type: 'POWER_UP_USED', 
            payload: { 
              powerUpType: 'leash_slack',
              message: 'Leash Slack used! Protected from next squirrel, but risk increased!',
              newMultipliers: { 
                risk: state.activeBonuses.riskMultiplier * 1.5, // 50% higher risk after use
                payout: state.activeBonuses.payoutMultiplier 
              }
            }
          });
          
          // Update demo state to reflect leash slack usage
          const demoState = (window as any).demoGameState;
          if (demoState) {
            demoState.leashSlackUsed = true;
            demoState.currentRiskMultiplier *= 1.5; // Higher risk after use
          }
        }
        return;
      }

      // Real money mode - send power-up use via WebSocket
      if (socketRef.current) {
        socketRef.current.emit('use_power_up', {
          sessionId: state.sessionId,
          powerUpType
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      dispatch({ type: 'ERROR', payload: errorMessage });
    }
  };

  const cashOut = async (): Promise<void> => {
    if (!state.sessionId) return;

    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        // Demo mode - simulate cashout locally
        // Stop the demo game simulation
        if ((window as any).demoGameInterval) {
          clearInterval((window as any).demoGameInterval);
          (window as any).demoGameInterval = null;
        }
        
        const finalPayout = state.currentPayout;
        const demoSettings = (window as any).demoGameSettings;
        const eventsTriggered = demoSettings ? demoSettings.eventsTriggered : [];
        
        dispatch({ 
          type: 'GAME_RESULT', 
          payload: {
            outcome: 'win',
            payout: finalPayout,
            baseMultiplier: state.baseMultiplier,
            bonusMultiplier: state.bonusMultiplier,
            finalMultiplier: state.baseMultiplier * state.bonusMultiplier,
            eventsTriggered
          }
        });
        return;
      }

      const response = await fetch(API_ENDPOINTS.ENHANCED_GAME_CASHOUT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          sessionId: state.sessionId, 
          cashoutSecond: state.gameTime 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to cash out');
      }

      const data = await response.json();
      
      dispatch({ 
        type: 'GAME_RESULT', 
        payload: {
          outcome: data.data.outcome,
          payout: data.data.payout,
          baseMultiplier: data.data.baseMultiplier,
          bonusMultiplier: data.data.bonusMultiplier,
          finalMultiplier: data.data.finalMultiplier,
          eventsTriggered: data.data.eventsTriggered
        }
      });

      // Leave WebSocket room
      if (socketRef.current) {
        socketRef.current.emit('leave_enhanced_game', { sessionId: state.sessionId });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      dispatch({ type: 'ERROR', payload: errorMessage });
      throw error;
    }
  };

  const resetGame = (): void => {
    dispatch({ type: 'RESET_GAME' });
  };

  const value: EnhancedGameContextType = {
    state,
    startEnhancedGame,
    makeEventChoice,
    usePowerUp,
    cashOut,
    resetGame
  };

  return (
    <EnhancedGameContext.Provider value={value}>
      {children}
    </EnhancedGameContext.Provider>
  );
};

// Custom Hook
export const useEnhancedGame = (): EnhancedGameContextType => {
  const context = useContext(EnhancedGameContext);
  if (!context) {
    throw new Error('useEnhancedGame must be used within an EnhancedGameProvider');
  }
  return context;
}; 