import { ErrorUtils } from './error.js';

// Simplified auth provider interface
export interface AuthProvider {
  getAuthHeaders(): Record<string, string> | Promise<Record<string, string>>;
}

// Legacy auth config for backward compatibility
export interface AuthConfig {
  token?: string;
  tokenType?: 'Bearer' | 'Basic';
  refreshTokenHandler?: () => Promise<string>;
}

/**
 * Simple token authentication (Bearer, API Key, etc.)
 */
export class SimpleAuth implements AuthProvider {
  constructor(
    private token: string,
    private tokenType: string = 'Bearer'
  ) {}

  getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `${this.tokenType} ${this.token}`
    };
  }
}

/**
 * JWT authentication with expiration checking
 */
export class JWTAuth implements AuthProvider {
  private onExpired?: () => Promise<string> | string;

  constructor(
    private token: string,
    options: { onExpired?: () => Promise<string> | string } = {}
  ) {
    this.onExpired = options.onExpired;
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getValidToken();
    return {
      Authorization: `Bearer ${token}`
    };
  }

  private async getValidToken(): Promise<string> {
    if (JWTUtils.isTokenExpired(this.token)) {
      if (this.onExpired) {
        this.token = await this.onExpired();
      } else {
        throw ErrorUtils.authError('JWT token expired and no refresh handler provided');
      }
    }
    return this.token;
  }
}

/**
 * Custom authentication with user-defined logic
 */
export class CustomAuth implements AuthProvider {
  constructor(
    private headerProvider: () => Record<string, string> | Promise<Record<string, string>>
  ) {}

  getAuthHeaders(): Record<string, string> | Promise<Record<string, string>> {
    return this.headerProvider();
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
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
      return null;
    }
  }
}

// Legacy AuthManager removed - use AuthProvider implementations instead