import toast from 'react-hot-toast';

interface TokenData {
  access: string;
  refresh: string;
  access_expires_at: number;
  expires_in: number;
}

class TokenService {
  private refreshTimer: NodeJS.Timeout | null = null;

  setTokens(tokenData: TokenData) {
    localStorage.setItem('access_token', tokenData.access);
    localStorage.setItem('refresh_token', tokenData.refresh);
    localStorage.setItem('token_expires_at', tokenData.access_expires_at.toString());
    
    // Schedule automatic refresh 2 minutes before expiry
    this.scheduleTokenRefresh(tokenData.expires_in - 120);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  scheduleTokenRefresh(delaySeconds: number) {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Ensure delay is positive
    const delay = Math.max(delaySeconds, 10);
    
    this.refreshTimer = setTimeout(async () => {
      await this.refreshToken();
    }, delay * 1000);
  }

  async refreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout();
      return false;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/token/refresh/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken })
      });

      if (response.ok) {
        const tokenData = await response.json();
        this.setTokens({
          access: tokenData.access,
          refresh: tokenData.refresh || refreshToken, // Use new refresh if provided
          access_expires_at: tokenData.access_expires_at,
          expires_in: tokenData.expires_in
        });
        return true;
      } else {
        // Refresh token expired or invalid
        this.logout();
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
      return false;
    }
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expires_at');
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    // Show user-friendly message
    toast.error('Please log in again to continue');
    
    // Redirect to login
    window.location.href = '/login';
  }

  clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expires_at');
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  isTokenExpired(): boolean {
    const expiresAt = localStorage.getItem('token_expires_at');
    if (!expiresAt) return true;
    
    // Add 30 second buffer to account for network delay
    return Date.now() / 1000 > parseInt(expiresAt) - 30;
  }

  initializeFromStorage() {
    const accessToken = this.getAccessToken();
    const expiresAt = localStorage.getItem('token_expires_at');
    
    if (accessToken && expiresAt) {
      const expiryTime = parseInt(expiresAt);
      const currentTime = Date.now() / 1000;
      const timeUntilExpiry = expiryTime - currentTime;
      
      if (timeUntilExpiry > 120) {
        // More than 2 minutes left, schedule refresh
        this.scheduleTokenRefresh(timeUntilExpiry - 120);
      } else if (timeUntilExpiry > 0) {
        // Less than 2 minutes left, refresh immediately
        this.refreshToken();
      } else {
        // Already expired, try to refresh
        this.refreshToken();
      }
    }
  }

  clearTimer() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

export const tokenService = new TokenService();
