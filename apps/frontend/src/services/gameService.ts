import { 
  StartGameResponse, 
  CashoutResponse, 
  GameSession, 
  GameVerification 
} from 'shared';
import { apiClient } from './api';

export const gameService = {
  async startGame(betAmount: number): Promise<StartGameResponse> {
    try {
      const response = await apiClient.post<{ success: boolean; data: StartGameResponse }>('/game/start', {
        betAmount
      });
      return response.data;
    } catch (error: any) {
      console.error('Start game error:', error);
      throw error;
    }
  },

  async cashOut(sessionId: string, cashoutSecond: number): Promise<CashoutResponse> {
    try {
      const response = await apiClient.post<{ success: boolean; data: CashoutResponse }>('/game/cashout', {
        sessionId,
        cashoutSecond
      });
      return response.data;
    } catch (error: any) {
      console.error('Cash out error:', error);
      throw error;
    }
  },

  async getGameHistory(limit = 20, offset = 0): Promise<{ games: GameSession[]; total: number }> {
    try {
      const response = await apiClient.get<{ success: boolean; data: { games: GameSession[]; total: number } }>('/game/history', {
        limit,
        offset
      });
      return response.data;
    } catch (error: any) {
      console.error('Get game history error:', error);
      throw error;
    }
  },

  async getActiveSessions(): Promise<string[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: { activeSessions: string[] } }>('/game/active-sessions');
      return response.data.activeSessions || [];
    } catch (error: any) {
      console.error('Get active sessions error:', error);
      throw error;
    }
  },

  async verifyGame(sessionId: string): Promise<GameVerification> {
    try {
      const response = await apiClient.get<{ success: boolean; data: GameVerification }>(`/game/verify/${sessionId}`);
      return response.data;
    } catch (error: any) {
      console.error('Verify game error:', error);
      throw error;
    }
  }
}; 