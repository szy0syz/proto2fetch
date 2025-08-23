import { ErrorUtils } from './error.js';

export interface AuthConfig {
  token?: string;
  tokenType?: 'Bearer' | 'Basic';
  refreshTokenHandler?: () => Promise<string>;
}

export class AuthManager {
  private token?: string;
  private tokenType: 'Bearer' | 'Basic';
  private refreshTokenHandler?: () => Promise<string>;
  private isRefreshing = false;
  private refreshPromise?: Promise<string>;

  constructor(config: AuthConfig = {}) {
    this.token = config.token;
    this.tokenType = config.tokenType || 'Bearer';
    this.refreshTokenHandler = config.refreshTokenHandler;
  }

  /**
   * Get authentication headers for requests
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getValidToken();
    
    if (!token) {
      return {};
    }

    return {
      Authorization: `${this.tokenType} ${token}`
    };
  }

  /**
   * Set the authentication token
   */
  setToken(token: string, tokenType: 'Bearer' | 'Basic' = 'Bearer'): void {
    this.token = token;
    this.tokenType = tokenType;
  }

  /**
   * Clear the authentication token
   */
  clearToken(): void {
    this.token = undefined;
  }

  /**
   * Set refresh token handler
   */
  setRefreshTokenHandler(handler: () => Promise<string>): void {
    this.refreshTokenHandler = handler;
  }

  /**
   * Check if we have a token
   */
  hasToken(): boolean {
    return Boolean(this.token);
  }

  /**
   * Get current token
   */
  getToken(): string | undefined {
    return this.token;
  }

  /**
   * Refresh the authentication token
   */
  async refreshToken(): Promise<string> {
    if (!this.refreshTokenHandler) {
      throw ErrorUtils.authError('No refresh token handler configured');
    }

    // Prevent multiple concurrent refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    
    try {
      this.refreshPromise = this.refreshTokenHandler();
      const newToken = await this.refreshPromise;
      
      this.token = newToken;
      this.isRefreshing = false;
      
      return newToken;
    } catch (error) {
      this.isRefreshing = false;
      this.token = undefined;
      throw ErrorUtils.authError('Failed to refresh authentication token');
    } finally {
      this.refreshPromise = undefined;
    }
  }

  /**
   * Get a valid token, refreshing if necessary
   */
  protected async getValidToken(): Promise<string | undefined> {
    if (!this.token) {
      return undefined;
    }

    // For now, we assume the token is valid
    // In a more sophisticated implementation, you might:
    // 1. Check token expiration
    // 2. Validate token with server
    // 3. Refresh if needed
    
    return this.token;
  }
}

/**
 * JWT Token utilities
 */
export class JWTUtils {
  /**
   * Parse JWT token (without verification)
   */
  static parseToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const payload = parts[1];
      if (!payload) {
        throw new Error('Invalid JWT payload');
      }
      const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decodedPayload);
    } catch (error) {
      throw ErrorUtils.authError('Invalid JWT token format');
    }
  }

  /**
   * Check if JWT token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const payload = this.parseToken(token);
      
      if (!payload.exp) {
        // Token has no expiration, consider it valid
        return false;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      // If we can't parse the token, consider it expired
      return true;
    }
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const payload = this.parseToken(token);
      
      if (!payload.exp) {
        return null;
      }

      return new Date(payload.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get time until token expires (in seconds)
   */
  static getTimeUntilExpiration(token: string): number | null {
    try {
      const payload = this.parseToken(token);
      
      if (!payload.exp) {
        return null;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const timeRemaining = payload.exp - currentTime;
      
      return Math.max(0, timeRemaining);
    } catch (error) {
      return null;
    }
  }
}

/**
 * Enhanced AuthManager with JWT support
 */
export class JWTAuthManager extends AuthManager {
  private autoRefreshEnabled = false;
  private refreshThresholdSeconds = 300; // Refresh when less than 5 minutes remaining
  private refreshTimer?: NodeJS.Timeout;

  constructor(config: AuthConfig & { 
    autoRefresh?: boolean; 
    refreshThresholdSeconds?: number; 
  } = {}) {
    super(config);
    this.autoRefreshEnabled = config.autoRefresh ?? false;
    this.refreshThresholdSeconds = config.refreshThresholdSeconds ?? 300;
  }

  /**
   * Set token with automatic refresh scheduling
   */
  override setToken(token: string, tokenType: 'Bearer' | 'Basic' = 'Bearer'): void {
    super.setToken(token, tokenType);
    
    if (this.autoRefreshEnabled) {
      this.scheduleAutoRefresh(token);
    }
  }

  /**
   * Clear token and cancel auto-refresh
   */
  override clearToken(): void {
    super.clearToken();
    this.cancelAutoRefresh();
  }

  /**
   * Get valid token with automatic refresh
   */
  protected override async getValidToken(): Promise<string | undefined> {
    const token = this.getToken();
    
    if (!token) {
      return undefined;
    }

    // Check if token is expired or will expire soon
    if (JWTUtils.isTokenExpired(token)) {
      // Token is already expired, try to refresh
      try {
        return await this.refreshToken();
      } catch (error) {
        return undefined;
      }
    }

    const timeUntilExpiration = JWTUtils.getTimeUntilExpiration(token);
    if (timeUntilExpiration !== null && timeUntilExpiration < this.refreshThresholdSeconds) {
      // Token will expire soon, try to refresh
      try {
        return await this.refreshToken();
      } catch (error) {
        // If refresh fails but token is still valid, use it
        return JWTUtils.isTokenExpired(token) ? undefined : token;
      }
    }

    return token;
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleAutoRefresh(token: string): void {
    this.cancelAutoRefresh();

    const timeUntilExpiration = JWTUtils.getTimeUntilExpiration(token);
    
    if (timeUntilExpiration === null) {
      return; // Token has no expiration
    }

    // Schedule refresh before expiration
    const refreshTime = Math.max(0, (timeUntilExpiration - this.refreshThresholdSeconds) * 1000);
    
    this.refreshTimer = setTimeout(async () => {
      try {
        await this.refreshToken();
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    }, refreshTime);
  }

  /**
   * Cancel scheduled auto-refresh
   */
  private cancelAutoRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }
}