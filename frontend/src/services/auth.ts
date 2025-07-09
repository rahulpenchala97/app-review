import api from './api';
import { tokenService } from './tokenService';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_supervisor: boolean;
  is_superuser?: boolean;
  created_at?: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    access: string;
    refresh: string;
    access_expires_at: number;
    expires_in: number;
  };
}

class AuthService {
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post('/api/users/login/', data);
    const { user, tokens } = response.data;
    
    // Store tokens using token service for automatic refresh
    tokenService.setTokens(tokens);
    localStorage.setItem('user', JSON.stringify(user));
    
    return response.data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/api/users/register/', data);
    const { user, tokens } = response.data;
    
    // Store tokens using token service for automatic refresh
    tokenService.setTokens(tokens);
    localStorage.setItem('user', JSON.stringify(user));
    
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = tokenService.getRefreshToken();
      if (refreshToken) {
        await api.post('/api/users/logout/', { refresh: refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all stored data
      tokenService.clearTokens();
      localStorage.removeItem('user');
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await api.get('/api/users/profile/');
    return response.data;
  }

  isAuthenticated(): boolean {
    return !!tokenService.getAccessToken() && !tokenService.isTokenExpired();
  }

  getUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }
}

const authService = new AuthService();
export default authService;
