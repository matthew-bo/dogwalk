// Format currency values
export const formatCurrency = (cents: number, currency: string = 'USD'): string => {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(dollars);
};

// Convert between USD cents and formatted display
export const centsToUsd = (cents: number): number => {
  return Math.round(cents) / 100;
};

export const usdToCents = (usd: number): number => {
  return Math.round(usd * 100);
};

// Time formatting utilities
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
};

// Validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
};

export const isValidPassword = (password: string): boolean => {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const isValidBitcoinAddress = (address: string): boolean => {
  // Simple Bitcoin address validation (P2PKH, P2SH, Bech32)
  const btcRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/;
  return btcRegex.test(address);
};

export const isValidEthereumAddress = (address: string): boolean => {
  // Ethereum address validation
  const ethRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethRegex.test(address);
};

// Crypto utilities
export const satoshisToBtc = (satoshis: number): number => {
  return satoshis / 100000000;
};

export const btcToSatoshis = (btc: number): number => {
  return Math.round(btc * 100000000);
};

export const weiToEth = (wei: number): number => {
  return wei / Math.pow(10, 18);
};

export const ethToWei = (eth: number): number => {
  return Math.round(eth * Math.pow(10, 18));
};

// Game utilities
export const calculateWinProbability = (seconds: number): number => {
  // Calculate cumulative probability of NOT hitting squirrel
  let survivalProbability = 1;
  
  for (let i = 1; i <= seconds; i++) {
    const riskThisSecond = getRiskForSecond(i);
    survivalProbability *= (1 - riskThisSecond);
  }
  
  return survivalProbability;
};

const getRiskForSecond = (second: number): number => {
  if (second <= 5) return 0.01;
  if (second <= 10) return 0.03;
  if (second <= 15) return 0.05;
  if (second <= 20) return 0.07;
  return 0.10;
};

export const calculateExpectedValue = (betAmount: number, seconds: number): number => {
  const winProbability = calculateWinProbability(seconds);
  const payout = getPayoutForSecond(betAmount, seconds);
  return (winProbability * payout) - ((1 - winProbability) * betAmount);
};

const getPayoutForSecond = (betAmount: number, seconds: number): number => {
  const baseMultiplier = 1 + (seconds * 0.15) + Math.pow(seconds * 0.1, 1.8);
  const houseEdgeMultiplier = 1 - 0.08; // 8% house edge
  const finalMultiplier = baseMultiplier * houseEdgeMultiplier;
  return Math.round(betAmount * finalMultiplier);
};

// Random utilities
/**
 * Generates cryptographically secure random bytes
 */
export function generateSecureRandomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  
  // Browser environment
  if (typeof globalThis !== 'undefined' && 'crypto' in globalThis && (globalThis as any).crypto && (globalThis as any).crypto.getRandomValues) {
    (globalThis as any).crypto.getRandomValues(array);
    return array;
  }
  
  // Node.js environment
  if (typeof require !== 'undefined') {
    try {
      const crypto = require('crypto');
      const buffer = crypto.randomBytes(length);
      return new Uint8Array(buffer);
    } catch (error) {
      console.warn('Node.js crypto not available, falling back to Math.random');
    }
  }
  
  // Fallback (not cryptographically secure, only for development)
  for (let i = 0; i < length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  
  return array;
}

export const generateClientSeed = (): string => {
  const bytes = generateSecureRandomBytes(16);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
};

// API utilities
export const createApiError = (
  code: string,
  message: string,
  details?: Record<string, any>
) => ({
  code,
  message,
  details
});

export const createApiResponse = <T>(
  data?: T,
  error?: any,
  meta?: Record<string, any>
) => ({
  success: !error,
  data,
  error,
  meta: {
    timestamp: new Date().toISOString(),
    ...meta
  }
});

// String utilities
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const truncate = (str: string, length: number): string => {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

// Array utilities
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp!;
  }
  return shuffled;
};

export const groupBy = <T, K extends keyof any>(
  array: T[],
  getKey: (item: T) => K
): Record<K, T[]> => {
  return array.reduce((groups, item) => {
    const key = getKey(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
};

// Debounce utility for client-side
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
};

// Throttle utility
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}; 