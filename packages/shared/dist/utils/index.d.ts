export declare const formatCurrency: (cents: number, currency?: string) => string;
export declare const centsToUsd: (cents: number) => number;
export declare const usdToCents: (usd: number) => number;
export declare const formatDuration: (seconds: number) => string;
export declare const formatRelativeTime: (date: Date) => string;
export declare const isValidEmail: (email: string) => boolean;
export declare const isValidUsername: (username: string) => boolean;
export declare const isValidPassword: (password: string) => boolean;
export declare const isValidBitcoinAddress: (address: string) => boolean;
export declare const isValidEthereumAddress: (address: string) => boolean;
export declare const satoshisToBtc: (satoshis: number) => number;
export declare const btcToSatoshis: (btc: number) => number;
export declare const weiToEth: (wei: number) => number;
export declare const ethToWei: (eth: number) => number;
export declare const calculateWinProbability: (seconds: number) => number;
export declare const calculateExpectedValue: (betAmount: number, seconds: number) => number;
/**
 * Generates cryptographically secure random bytes
 */
export declare function generateSecureRandomBytes(length: number): Uint8Array;
export declare const generateClientSeed: () => string;
export declare const createApiError: (code: string, message: string, details?: Record<string, any>) => {
    code: string;
    message: string;
    details: Record<string, any> | undefined;
};
export declare const createApiResponse: <T>(data?: T, error?: any, meta?: Record<string, any>) => {
    success: boolean;
    data: T | undefined;
    error: any;
    meta: {
        timestamp: string;
    };
};
export declare const capitalize: (str: string) => string;
export declare const truncate: (str: string, length: number) => string;
export declare const sanitizeInput: (input: string) => string;
export declare const shuffleArray: <T>(array: T[]) => T[];
export declare const groupBy: <T, K extends keyof any>(array: T[], getKey: (item: T) => K) => Record<K, T[]>;
export declare const debounce: <T extends (...args: any[]) => any>(func: T, wait: number) => (...args: Parameters<T>) => void;
export declare const throttle: <T extends (...args: any[]) => any>(func: T, limit: number) => (...args: Parameters<T>) => void;
//# sourceMappingURL=index.d.ts.map