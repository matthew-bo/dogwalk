import { apiClient } from './api';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  usdBalanceCents: number;
  isAgeVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  gamesPlayed: number;
  totalWagered: number;
  totalWon: number;
  winRate: number;
  bestMultiplier: number;
  longestWalk: number;
}

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface UserCosmetic {
  id: string;
  cosmeticType: 'dog_breed' | 'leash' | 'collar';
  cosmeticId: string;
  unlockedAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  value: number;
  gameSessionId: string;
  createdAt: string;
}

export interface Leaderboard {
  topWins: LeaderboardEntry[];
  longestWalks: LeaderboardEntry[];
  period: 'daily' | 'weekly' | 'all-time';
}

export const userService = {
  async getProfile(): Promise<UserProfile> {
    try {
      const response = await apiClient.get<{ success: boolean; data: UserProfile }>('/user/profile');
      return response.data;
    } catch (error: any) {
      console.error('Get user profile error:', error);
      throw error;
    }
  },

  async updateProfile(updates: UpdateProfileRequest): Promise<UserProfile> {
    try {
      const response = await apiClient.put<{ success: boolean; data: UserProfile }>('/user/profile', updates);
      return response.data;
    } catch (error: any) {
      console.error('Update user profile error:', error);
      throw error;
    }
  },

  async getUserStats(): Promise<UserStats> {
    try {
      const response = await apiClient.get<{ success: boolean; data: UserStats }>('/user/stats');
      return response.data;
    } catch (error: any) {
      console.error('Get user stats error:', error);
      throw error;
    }
  },

  async getUserCosmetics(): Promise<UserCosmetic[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: UserCosmetic[] }>('/user/cosmetics');
      return response.data;
    } catch (error: any) {
      console.error('Get user cosmetics error:', error);
      throw error;
    }
  },

  async getLeaderboard(period: 'daily' | 'weekly' | 'all-time' = 'all-time'): Promise<Leaderboard> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Leaderboard }>('/user/leaderboard', {
        period
      });
      return response.data;
    } catch (error: any) {
      console.error('Get leaderboard error:', error);
      throw error;
    }
  }
}; 