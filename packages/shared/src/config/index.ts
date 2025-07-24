import { GameConfig } from '../types';

// Game configuration constants
export const GAME_CONFIG: GameConfig = {
  MIN_BET_CENTS: 50, // $0.50
  MAX_BET_CENTS: 10000000, // $100,000
  MAX_GAME_DURATION: 30, // seconds
  BASE_HOUSE_EDGE: 0.08, // 8% house edge

  getRiskPerSecond: (second: number): number => {
    if (second <= 5) return 0.01; // 1% per second
    if (second <= 10) return 0.03; // 3% per second
    if (second <= 15) return 0.05; // 5% per second
    if (second <= 20) return 0.07; // 7% per second
    return 0.10; // 10% per second
  },

  getPayoutMultiplier: (seconds: number): number => {
    // Calculate cumulative survival probability
    let survivalProb = 1;
    for (let i = 1; i <= seconds; i++) {
      survivalProb *= (1 - GAME_CONFIG.getRiskPerSecond(i));
    }
    
    // House edge compliant formula: M(s) = (1 - HE) / p_survive(s)
    // This ensures expected value is always exactly (1 - HE), maintaining house edge
    const multiplier = (1 - GAME_CONFIG.BASE_HOUSE_EDGE) / survivalProb;
    
    // Round to 2 decimal places for consistency
    return Math.round(multiplier * 100) / 100;
  }
} as const;

// API endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH_REGISTER: '/api/auth/register',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_ME: '/api/auth/me',
  AUTH_REFRESH: '/api/auth/refresh',

  // Game (Original)
  GAME_START: '/api/game/start',
  GAME_CASHOUT: '/api/game/cashout',
  GAME_HISTORY: '/api/game/history',
  GAME_VERIFY: '/api/game/verify',
  GAME_ACTIVE_SESSIONS: '/api/game/active-sessions',

  // Enhanced Game
  ENHANCED_GAME_START: '/api/enhanced-game/start',
  ENHANCED_GAME_CASHOUT: '/api/enhanced-game/cashout',
  ENHANCED_GAME_EVENT_CHOICE: '/api/enhanced-game/event-choice',
  ENHANCED_GAME_STATE: '/api/enhanced-game/state',
  ENHANCED_GAME_MINI_GAMES: '/api/enhanced-game/mini-games',
  ENHANCED_GAME_JACKPOT: '/api/enhanced-game/jackpot',
  ENHANCED_GAME_LEASH_SLACK: '/api/enhanced-game/use-leash-slack',

  // Payments
  PAYMENTS_DEPOSIT: '/api/payments/deposit',
  PAYMENTS_WITHDRAW: '/api/payments/withdraw',
  PAYMENTS_TRANSACTIONS: '/api/payments/transactions',
  PAYMENTS_BALANCE: '/api/payments/balance',

  // User
  USER_PROFILE: '/api/user/profile',
  USER_COSMETICS: '/api/user/cosmetics',
  USER_LEADERBOARD: '/api/user/leaderboard',

  // Disputes
  DISPUTES_CREATE: '/api/disputes/create',
  DISPUTES_LIST: '/api/disputes',

  // Webhooks
  WEBHOOK_COINBASE: '/api/webhooks/coinbase'
} as const;

// WebSocket events
export const WS_EVENTS = {
  // Client to server
  JOIN_GAME: 'join_game',
  LEAVE_GAME: 'leave_game',
  GAME_HEARTBEAT: 'game_heartbeat',

  // Server to client
  GAME_UPDATE: 'game_update',
  GAME_RESULT: 'game_result',
  BALANCE_UPDATE: 'balance_update',
  ERROR: 'error',
  DISCONNECT: 'disconnect'
} as const;

// Error codes
export const ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_MISSING: 'TOKEN_MISSING',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  AGE_NOT_VERIFIED: 'AGE_NOT_VERIFIED',

  // Game errors
  GAME_SESSION_NOT_FOUND: 'GAME_SESSION_NOT_FOUND',
  GAME_ALREADY_ACTIVE: 'GAME_ALREADY_ACTIVE',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INVALID_BET_AMOUNT: 'INVALID_BET_AMOUNT',
  GAME_ALREADY_COMPLETED: 'GAME_ALREADY_COMPLETED',
  INVALID_CASHOUT_TIME: 'INVALID_CASHOUT_TIME',

  // Payment errors
  PAYMENT_PROVIDER_ERROR: 'PAYMENT_PROVIDER_ERROR',
  INVALID_WALLET_ADDRESS: 'INVALID_WALLET_ADDRESS',
  WITHDRAWAL_LIMIT_EXCEEDED: 'WITHDRAWAL_LIMIT_EXCEEDED',
  INSUFFICIENT_BALANCE_FOR_WITHDRAWAL: 'INSUFFICIENT_BALANCE_FOR_WITHDRAWAL',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BUSINESS_ERROR: 'BUSINESS_ERROR',
  SYSTEM_ERROR: 'SYSTEM_ERROR',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
} as const;

// Constants for various limits and timeouts
export const LIMITS = {
  // Authentication
  LOGIN_ATTEMPTS_PER_HOUR: 10,
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,

  // Game
  MAX_CONCURRENT_SESSIONS: 1,
  GAME_SESSION_TIMEOUT_MS: 60000, // 1 minute
  HEARTBEAT_INTERVAL_MS: 5000, // 5 seconds

  // Payments
  MIN_DEPOSIT_USD: 5,
  MAX_DEPOSIT_USD: 100000,
  MIN_WITHDRAWAL_USD: 10,
  MAX_WITHDRAWAL_USD: 50000,
  DAILY_WITHDRAWAL_LIMIT_USD: 100000,

  // API
  API_RATE_LIMIT_REQUESTS_PER_MINUTE: 100,
  API_RATE_LIMIT_REQUESTS_PER_HOUR: 1000,
  GAME_RATE_LIMIT_REQUESTS_PER_MINUTE: 30,

  // Caching
  USER_CACHE_TTL_SECONDS: 300, // 5 minutes
  GAME_CACHE_TTL_SECONDS: 60, // 1 minute
  EXCHANGE_RATE_CACHE_TTL_SECONDS: 30, // 30 seconds

  // Session
  JWT_ACCESS_TOKEN_EXPIRY: '15m',
  JWT_REFRESH_TOKEN_EXPIRY: '7d',
  SESSION_CLEANUP_INTERVAL_MS: 300000 // 5 minutes
} as const;

// Dog breeds configuration
export const DOG_BREEDS = [
  {
    id: 'golden_retriever',
    name: 'Golden Retriever',
    description: 'Friendly and loyal companion',
    imageUrl: '/images/dogs/golden-retriever.png',
    isDefault: true
  },
  {
    id: 'border_collie',
    name: 'Border Collie',
    description: 'Intelligent and energetic',
    imageUrl: '/images/dogs/border-collie.png',
    isDefault: false,
    unlockRequirement: 'Win 10 games'
  },
  {
    id: 'husky',
    name: 'Siberian Husky',
    description: 'Strong and adventurous',
    imageUrl: '/images/dogs/husky.png',
    isDefault: false,
    unlockRequirement: 'Walk for 25+ seconds'
  },
  {
    id: 'bulldog',
    name: 'French Bulldog',
    description: 'Charming and relaxed',
    imageUrl: '/images/dogs/bulldog.png',
    isDefault: false,
    unlockRequirement: 'Deposit $100+'
  }
] as const;

// Environment-specific configurations
export const getApiUrl = (env: string = 'development'): string => {
  switch (env) {
    case 'production':
      return 'https://api.dogwalkgamble.com';
    case 'staging':
      return 'https://staging-api.dogwalkgamble.com';
    default:
      return 'http://localhost:3002'; // Updated from 3001 to 3002
  }
};

export const getWebSocketUrl = (env: string = 'development'): string => {
  switch (env) {
    case 'production':
      return 'wss://api.dogwalkgamble.com';
    case 'staging':
      return 'wss://staging-api.dogwalkgamble.com';
    default:
      return 'ws://localhost:3002'; // Updated from 3001 to 3002
  }
}; 