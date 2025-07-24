import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'shared';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: { username: string; email: string; password: string; ageConfirmed: boolean }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth token on mount
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        // Token is invalid, remove it
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await authService.login(username, password);
      if (response.user && response.token) {
        setUser(response.user);
        localStorage.setItem('auth_token', response.token);
        if (response.refreshToken) {
          localStorage.setItem('refresh_token', response.refreshToken);
        }
        toast.success('Welcome back!');
      }
    } catch (error: any) {
      let message = 'Login failed';
      
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        message = 'Cannot connect to server. Please try the demo mode or check back later.';
      } else if (error.response?.data?.error?.message) {
        message = error.response.data.error.message;
      }
      
      toast.error(message);
      throw error;
    }
  };

  const register = async (userData: { username: string; email: string; password: string; ageConfirmed: boolean }) => {
    try {
      const response = await authService.register(userData);
      if (response.user && response.token) {
        setUser(response.user);
        localStorage.setItem('auth_token', response.token);
        toast.success('Welcome to Dog Walk Gamble!');
      }
    } catch (error: any) {
      let message = 'Registration failed';
      
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        message = 'Cannot connect to server. Please try the demo mode or check back later.';
      } else if (error.response?.data?.error?.message) {
        message = error.response.data.error.message;
      }
      
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Logout failed, but still clear local state
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      toast.success('Logged out successfully');
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 