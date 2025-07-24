import { DepositResponse, WithdrawResponse, Transaction } from 'shared';
export declare class PaymentService {
    static createDeposit(userId: string, usdAmount: number): Promise<DepositResponse>;
    static createWithdrawal(userId: string, usdAmountCents: number, walletAddress: string, cryptoType?: 'btc' | 'eth'): Promise<WithdrawResponse>;
    static getTransactionHistory(userId: string, limit: number, offset: number, type?: string): Promise<{
        transactions: Transaction[];
        total: number;
    }>;
    static getUserBalance(userId: string): Promise<{
        usdBalance: number;
        usdBalanceCents: number;
        lastUpdated: string;
    }>;
    static handleCoinbaseWebhook(payload: any): Promise<void>;
    private static createCoinbaseCharge;
    private static validateWalletAddress;
    private static getDailyWithdrawalAmount;
}
//# sourceMappingURL=PaymentService.d.ts.map