import { Request } from 'express';
export interface User {
    id: string;
    username: string;
    email: string;
    usdBalanceCents: number;
    isAgeVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateUserRequest {
    username: string;
    email: string;
    password: string;
    ageConfirmed: boolean;
}
export interface LoginRequest {
    username: string;
    password: string;
}
export interface AuthResponse {
    success: boolean;
    token?: string;
    user?: User;
    error?: APIError;
}
export interface GameSession {
    id: string;
    userId: string;
    betAmount: number;
    duration?: number;
    payoutAmount: number;
    outcome: 'win' | 'loss' | 'incomplete';
    squirrelEventTime?: number;
    rngSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    createdAt: Date;
    completedAt?: Date;
}
export interface StartGameRequest {
    betAmount: number;
}
export interface StartGameResponse {
    sessionId: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    maxDuration: number;
}
export interface CashoutRequest {
    sessionId: string;
    cashoutSecond: number;
}
export interface CashoutResponse {
    success: boolean;
    outcome: 'win' | 'loss';
    payout: number;
    actualDuration: number;
    squirrelEventTime?: number;
    verification: {
        serverSeed: string;
        squirrelEventTime: number;
        canVerify: boolean;
    };
}
export interface GameVerification {
    isValid: boolean;
    verification: {
        serverSeed: string;
        clientSeed: string;
        nonce: number;
        squirrelEventTime: number;
    };
}
export interface Transaction {
    id: string;
    userId: string;
    type: 'deposit' | 'withdrawal' | 'bet' | 'payout';
    usdAmount: number;
    cryptoAmount?: number;
    cryptoType?: 'btc' | 'eth';
    cryptoTxHash?: string;
    status: 'pending' | 'confirmed' | 'failed';
    createdAt: Date;
}
export interface DepositRequest {
    amount: number;
}
export interface DepositResponse {
    paymentUrl: string;
    paymentId: string;
}
export interface WithdrawRequest {
    amount: number;
    walletAddress: string;
}
export interface WithdrawResponse {
    transactionId: string;
    estimatedConfirmationTime: string;
}
export interface PaymentProvider {
    name: string;
    createPayment(amount: number, userId: string): Promise<string>;
    checkStatus(paymentId: string): Promise<'pending' | 'confirmed' | 'failed'>;
    isAvailable(): Promise<boolean>;
}
export interface APIResponse<T> {
    success: boolean;
    data?: T;
    error?: APIError;
    meta?: {
        timestamp: string;
        requestId: string;
    };
}
export interface APIError {
    code: 'VALIDATION_ERROR' | 'BUSINESS_ERROR' | 'SYSTEM_ERROR' | 'AUTH_ERROR';
    message: string;
    details?: Record<string, any>;
}
export interface GameConfig {
    MIN_BET_CENTS: number;
    MAX_BET_CENTS: number;
    MAX_GAME_DURATION: number;
    BASE_HOUSE_EDGE: number;
    getRiskPerSecond: (second: number) => number;
    getPayoutMultiplier: (seconds: number) => number;
}
export interface GameUpdate {
    sessionId: string;
    currentSecond: number;
    currentPayout: number;
    squirrelRisk: number;
}
export interface GameResult {
    sessionId: string;
    outcome: 'win' | 'loss';
    finalPayout: number;
    squirrelEventTime?: number;
}
export interface UserCosmetic {
    id: string;
    userId: string;
    cosmeticType: 'dog_breed' | 'leash' | 'collar';
    cosmeticId: string;
    unlockedAt: Date;
}
export interface DogBreed {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    unlockRequirement?: string;
    isDefault: boolean;
}
export interface DisputeCase {
    id: string;
    userId: string;
    type: 'payment' | 'game_outcome' | 'balance_discrepancy';
    description: string;
    evidence: {
        sessionId?: string;
        transactionId?: string;
        screenshots?: string[];
        browserLogs?: string;
    };
    status: 'open' | 'investigating' | 'resolved' | 'closed';
    resolution?: string;
    createdAt: Date;
}
export interface LeaderboardEntry {
    userId: string;
    username: string;
    value: number;
    gameSessionId: string;
    createdAt: Date;
}
export interface Leaderboard {
    topWins: LeaderboardEntry[];
    longestWalks: LeaderboardEntry[];
    period: 'daily' | 'weekly' | 'all-time';
}
export interface AuditLog {
    id: string;
    userId?: string;
    action: string;
    details: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    timestamp: Date;
}
export interface RateLimitInfo {
    windowMs: number;
    max: number;
    remaining: number;
    reset: Date;
}
export interface SessionInfo {
    id: string;
    userId: string;
    isActive: boolean;
    lastActivity: Date;
    ipAddress: string;
    userAgent: string;
}
export declare class BusinessError extends Error {
    code: string;
    details?: Record<string, any> | undefined;
    constructor(message: string, code?: string, details?: Record<string, any> | undefined);
}
export declare class ValidationError extends Error {
    code: string;
    details?: Record<string, any> | undefined;
    constructor(message: string, code?: string, details?: Record<string, any> | undefined);
}
export declare class AuthError extends Error {
    code: string;
    details?: Record<string, any> | undefined;
    constructor(message: string, code?: string, details?: Record<string, any> | undefined);
}
export interface JWTPayload {
    userId: string;
    username: string;
    iat: number;
    exp: number;
}
export interface AuthenticatedRequest extends Request {
    user: JWTPayload;
    body: any;
    query: any;
    params: any;
    headers: any;
}
//# sourceMappingURL=index.d.ts.map