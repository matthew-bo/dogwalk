import { apiClient } from './api';

export interface DepositAddress {
  address: string;
  qrCode: string;
  sessionId: string;
  expiresAt: string;
}

export interface CryptoPrices {
  BTC: number;
  ETH: number;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'payout';
  usdAmount: number;
  cryptoAmount?: number;
  cryptoType?: 'BTC' | 'ETH';
  cryptoTxHash?: string;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: string;
}

export interface UserBalance {
  usdBalance: number;
  usdBalanceCents: number;
  lastUpdated: string;
}

export interface WithdrawalResponse {
  transactionId: string;
  estimatedConfirmationTime: string;
}

export const paymentService = {
  async getCryptoPrices(): Promise<CryptoPrices> {
    try {
      const response = await apiClient.get<{ success: boolean; data: CryptoPrices }>('/payments/prices');
      return response.data;
    } catch (error: any) {
      console.error('Get crypto prices error:', error);
      // Return fallback prices if API fails
      return { BTC: 45000, ETH: 2800 };
    }
  },

  async createDepositAddress(currency: 'BTC' | 'ETH', userId: string): Promise<DepositAddress> {
    try {
      const response = await apiClient.post<{ success: boolean; data: DepositAddress }>('/payments/deposit', {
        currency,
        userId
      });
      return response.data;
    } catch (error: any) {
      console.error('Create deposit address error:', error);
      throw error;
    }
  },

  async createWithdrawal(currency: 'BTC' | 'ETH', address: string, usdAmount: number, userId: string): Promise<WithdrawalResponse> {
    try {
      const response = await apiClient.post<{ success: boolean; data: WithdrawalResponse }>('/payments/withdraw', {
        currency,
        address,
        usdAmount,
        userId
      });
      return response.data;
    } catch (error: any) {
      console.error('Create withdrawal error:', error);
      throw error;
    }
  },

  async getTransactionHistory(limit = 20, offset = 0, type?: string): Promise<{ transactions: Transaction[]; total: number }> {
    try {
      const params: any = { limit, offset };
      if (type) params.type = type;

      const response = await apiClient.get<{ success: boolean; data: { transactions: Transaction[]; total: number } }>('/payments/transactions', params);
      return response.data;
    } catch (error: any) {
      console.error('Get transaction history error:', error);
      throw error;
    }
  },

  async getUserBalance(): Promise<UserBalance> {
    try {
      const response = await apiClient.get<{ success: boolean; data: UserBalance }>('/payments/balance');
      return response.data;
    } catch (error: any) {
      console.error('Get user balance error:', error);
      throw error;
    }
  }
}; 