"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.throttle = exports.debounce = exports.groupBy = exports.shuffleArray = exports.sanitizeInput = exports.truncate = exports.capitalize = exports.createApiResponse = exports.createApiError = exports.generateClientSeed = exports.calculateExpectedValue = exports.calculateWinProbability = exports.ethToWei = exports.weiToEth = exports.btcToSatoshis = exports.satoshisToBtc = exports.isValidEthereumAddress = exports.isValidBitcoinAddress = exports.isValidPassword = exports.isValidUsername = exports.isValidEmail = exports.formatRelativeTime = exports.formatDuration = exports.usdToCents = exports.centsToUsd = exports.formatCurrency = void 0;
exports.generateSecureRandomBytes = generateSecureRandomBytes;
// Format currency values
const formatCurrency = (cents, currency = 'USD') => {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(dollars);
};
exports.formatCurrency = formatCurrency;
// Convert between USD cents and formatted display
const centsToUsd = (cents) => {
    return Math.round(cents) / 100;
};
exports.centsToUsd = centsToUsd;
const usdToCents = (usd) => {
    return Math.round(usd * 100);
};
exports.usdToCents = usdToCents;
// Time formatting utilities
const formatDuration = (seconds) => {
    if (seconds < 60) {
        return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
};
exports.formatDuration = formatDuration;
const formatRelativeTime = (date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffSeconds < 60) {
        return 'just now';
    }
    else if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
    }
    else if (diffHours < 24) {
        return `${diffHours}h ago`;
    }
    else if (diffDays < 7) {
        return `${diffDays}d ago`;
    }
    else {
        return date.toLocaleDateString();
    }
};
exports.formatRelativeTime = formatRelativeTime;
// Validation utilities
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.isValidEmail = isValidEmail;
const isValidUsername = (username) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    return usernameRegex.test(username);
};
exports.isValidUsername = isValidUsername;
const isValidPassword = (password) => {
    // At least 8 characters, one uppercase, one lowercase, one number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};
exports.isValidPassword = isValidPassword;
const isValidBitcoinAddress = (address) => {
    // Simple Bitcoin address validation (P2PKH, P2SH, Bech32)
    const btcRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/;
    return btcRegex.test(address);
};
exports.isValidBitcoinAddress = isValidBitcoinAddress;
const isValidEthereumAddress = (address) => {
    // Ethereum address validation
    const ethRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethRegex.test(address);
};
exports.isValidEthereumAddress = isValidEthereumAddress;
// Crypto utilities
const satoshisToBtc = (satoshis) => {
    return satoshis / 100000000;
};
exports.satoshisToBtc = satoshisToBtc;
const btcToSatoshis = (btc) => {
    return Math.round(btc * 100000000);
};
exports.btcToSatoshis = btcToSatoshis;
const weiToEth = (wei) => {
    return wei / Math.pow(10, 18);
};
exports.weiToEth = weiToEth;
const ethToWei = (eth) => {
    return Math.round(eth * Math.pow(10, 18));
};
exports.ethToWei = ethToWei;
// Game utilities
const calculateWinProbability = (seconds) => {
    // Calculate cumulative probability of NOT hitting squirrel
    let survivalProbability = 1;
    for (let i = 1; i <= seconds; i++) {
        const riskThisSecond = getRiskForSecond(i);
        survivalProbability *= (1 - riskThisSecond);
    }
    return survivalProbability;
};
exports.calculateWinProbability = calculateWinProbability;
const getRiskForSecond = (second) => {
    if (second <= 5)
        return 0.01;
    if (second <= 10)
        return 0.03;
    if (second <= 15)
        return 0.05;
    if (second <= 20)
        return 0.07;
    return 0.10;
};
const calculateExpectedValue = (betAmount, seconds) => {
    const winProbability = (0, exports.calculateWinProbability)(seconds);
    const payout = getPayoutForSecond(betAmount, seconds);
    return (winProbability * payout) - ((1 - winProbability) * betAmount);
};
exports.calculateExpectedValue = calculateExpectedValue;
const getPayoutForSecond = (betAmount, seconds) => {
    const baseMultiplier = 1 + (seconds * 0.15) + Math.pow(seconds * 0.1, 1.8);
    const houseEdgeMultiplier = 1 - 0.08; // 8% house edge
    const finalMultiplier = baseMultiplier * houseEdgeMultiplier;
    return Math.round(betAmount * finalMultiplier);
};
// Random utilities
/**
 * Generates cryptographically secure random bytes
 */
function generateSecureRandomBytes(length) {
    const array = new Uint8Array(length);
    // Browser environment
    if (typeof globalThis !== 'undefined' && 'crypto' in globalThis && globalThis.crypto && globalThis.crypto.getRandomValues) {
        globalThis.crypto.getRandomValues(array);
        return array;
    }
    // Node.js environment
    if (typeof require !== 'undefined') {
        try {
            const crypto = require('crypto');
            const buffer = crypto.randomBytes(length);
            return new Uint8Array(buffer);
        }
        catch (error) {
            console.warn('Node.js crypto not available, falling back to Math.random');
        }
    }
    // Fallback (not cryptographically secure, only for development)
    for (let i = 0; i < length; i++) {
        array[i] = Math.floor(Math.random() * 256);
    }
    return array;
}
const generateClientSeed = () => {
    const bytes = generateSecureRandomBytes(16);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
};
exports.generateClientSeed = generateClientSeed;
// API utilities
const createApiError = (code, message, details) => ({
    code,
    message,
    details
});
exports.createApiError = createApiError;
const createApiResponse = (data, error, meta) => ({
    success: !error,
    data,
    error,
    meta: {
        timestamp: new Date().toISOString(),
        ...meta
    }
});
exports.createApiResponse = createApiResponse;
// String utilities
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
exports.capitalize = capitalize;
const truncate = (str, length) => {
    if (str.length <= length)
        return str;
    return str.slice(0, length) + '...';
};
exports.truncate = truncate;
const sanitizeInput = (input) => {
    return input.trim().replace(/[<>]/g, '');
};
exports.sanitizeInput = sanitizeInput;
// Array utilities
const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
    }
    return shuffled;
};
exports.shuffleArray = shuffleArray;
const groupBy = (array, getKey) => {
    return array.reduce((groups, item) => {
        const key = getKey(item);
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(item);
        return groups;
    }, {});
};
exports.groupBy = groupBy;
// Debounce utility for client-side
const debounce = (func, wait) => {
    let timeoutId = null;
    return (...args) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            func(...args);
        }, wait);
    };
};
exports.debounce = debounce;
// Throttle utility
const throttle = (func, limit) => {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};
exports.throttle = throttle;
//# sourceMappingURL=index.js.map