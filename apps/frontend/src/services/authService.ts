import { User, AuthResponse, CreateUserRequest } from 'shared';
import { apiClient } from './api';

interface LoginResponse extends AuthResponse {
  refreshToken?: string;
}

export const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post<{ success: boolean; data: LoginResponse }>('/auth/login', {
      username,
      password
    });
    return response.data.data;
  },

  async register(userData: CreateUserRequest): Promise<AuthResponse> {
    const response = await apiClient.post<{ success: boolean; data: AuthResponse }>('/auth/register', userData);
    return response.data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<{ success: boolean; data: User }>('/auth/me');
    return response.data.data;
  },

  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    const response = await apiClient.post<{ success: boolean; data: { token: string } }>('/auth/refresh', {
      refreshToken
    });
    return response.data.data;
  }
}; 