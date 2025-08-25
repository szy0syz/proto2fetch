import { describe, it, expect, vi } from 'vitest';
import { SimpleAuth, JWTAuth, CustomAuth, JWTUtils } from '../src/runtime/auth.js';

describe('Auth Tests', () => {
  describe('SimpleAuth', () => {
    it('should create SimpleAuth with string token', async () => {
      const auth = new SimpleAuth('test-token', 'Bearer');
      const headers = await auth.getAuthHeaders();
      
      expect(headers).toEqual({
        Authorization: 'Bearer test-token'
      });
    });

    it('should support token update when created with string', () => {
      const auth = new SimpleAuth('initial-token');
      expect(auth.updateToken).toBeDefined();
      
      auth.updateToken!('new-token');
      
      return auth.getAuthHeaders().then(headers => {
        expect(headers).toEqual({
          Authorization: 'Bearer new-token'
        });
      });
    });

    it('should create SimpleAuth with token provider function', async () => {
      let currentToken = 'provider-token';
      const auth = new SimpleAuth(() => currentToken);
      
      let headers = await auth.getAuthHeaders();
      expect(headers).toEqual({
        Authorization: 'Bearer provider-token'
      });
      
      // Change token via provider
      currentToken = 'updated-provider-token';
      headers = await auth.getAuthHeaders();
      expect(headers).toEqual({
        Authorization: 'Bearer updated-provider-token'
      });
    });

    it('should create SimpleAuth with async token provider', async () => {
      const auth = new SimpleAuth(async () => {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 1));
        return 'async-token';
      });
      
      const headers = await auth.getAuthHeaders();
      expect(headers).toEqual({
        Authorization: 'Bearer async-token'
      });
    });

    it('should support custom token types', async () => {
      const auth = new SimpleAuth('api-key', 'X-API-Key');
      const headers = await auth.getAuthHeaders();
      
      expect(headers).toEqual({
        Authorization: 'X-API-Key api-key'
      });
    });

    it('should not have updateToken method when created with function', () => {
      const auth = new SimpleAuth(() => 'token');
      expect(auth.updateToken).toBeUndefined();
    });
  });

  describe('JWTAuth', () => {
    const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.Lp-38GDk4aE7pJkktZZQHFWUzVJTlbT7dD7CQrKz-bI';
    const expiredJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj3bW2_Wr3kCKYKlhMxBr9RhF0eDrFrKqtvXdWx8';

    it('should create JWTAuth with string token', async () => {
      const auth = new JWTAuth(validJWT);
      const headers = await auth.getAuthHeaders();
      
      expect(headers).toEqual({
        Authorization: `Bearer ${validJWT}`
      });
    });

    it('should support token update when created with string', () => {
      const auth = new JWTAuth('initial-jwt');
      expect(auth.updateToken).toBeDefined();
      
      auth.updateToken!(validJWT);
      
      return auth.getAuthHeaders().then(headers => {
        expect(headers).toEqual({
          Authorization: `Bearer ${validJWT}`
        });
      });
    });

    it('should create JWTAuth with token provider function', async () => {
      let currentToken = validJWT;
      const auth = new JWTAuth(() => currentToken);
      
      let headers = await auth.getAuthHeaders();
      expect(headers).toEqual({
        Authorization: `Bearer ${validJWT}`
      });
      
      // Change token via provider
      const newToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ODc2NTQzMjEwIiwibmFtZSI6IkphbmUgRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.Zj9ooYcaLTFqvzZsr4BV2f-9FaIvIqJvnZ2wZxgJ3hI';
      currentToken = newToken;
      headers = await auth.getAuthHeaders();
      expect(headers).toEqual({
        Authorization: `Bearer ${newToken}`
      });
    });

    it('should handle token refresh on expiration', async () => {
      const mockRefresh = vi.fn().mockResolvedValue(validJWT);
      const auth = new JWTAuth(expiredJWT, { onExpired: mockRefresh });
      
      const headers = await auth.getAuthHeaders();
      
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      expect(headers).toEqual({
        Authorization: `Bearer ${validJWT}`
      });
    });

    it('should update internal token after refresh when created with string', async () => {
      const mockRefresh = vi.fn().mockResolvedValue(validJWT);
      const auth = new JWTAuth(expiredJWT, { onExpired: mockRefresh });
      
      // First call should trigger refresh
      await auth.getAuthHeaders();
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      
      // Reset mock
      mockRefresh.mockClear();
      
      // Second call should use the refreshed token (not call refresh again)
      const headers = await auth.getAuthHeaders();
      expect(mockRefresh).toHaveBeenCalledTimes(0);
      expect(headers).toEqual({
        Authorization: `Bearer ${validJWT}`
      });
    });

    it('should throw error when token expired and no refresh handler', async () => {
      const auth = new JWTAuth(expiredJWT);
      
      await expect(auth.getAuthHeaders()).rejects.toThrow('JWT token expired and no refresh handler provided');
    });

    it('should not have updateToken method when created with function', () => {
      const auth = new JWTAuth(() => validJWT);
      expect(auth.updateToken).toBeUndefined();
    });
  });

  describe('CustomAuth', () => {
    it('should call header provider function', async () => {
      const mockProvider = vi.fn().mockReturnValue({
        'X-API-Key': 'test-key',
        'X-Timestamp': '123456789'
      });
      
      const auth = new CustomAuth(mockProvider);
      const headers = await auth.getAuthHeaders();
      
      expect(mockProvider).toHaveBeenCalledTimes(1);
      expect(headers).toEqual({
        'X-API-Key': 'test-key',
        'X-Timestamp': '123456789'
      });
    });

    it('should support async header provider', async () => {
      const mockProvider = vi.fn().mockResolvedValue({
        'Authorization': 'Bearer async-token',
        'X-Client-ID': 'client-123'
      });
      
      const auth = new CustomAuth(mockProvider);
      const headers = await auth.getAuthHeaders();
      
      expect(mockProvider).toHaveBeenCalledTimes(1);
      expect(headers).toEqual({
        'Authorization': 'Bearer async-token',
        'X-Client-ID': 'client-123'
      });
    });
  });

  describe('JWTUtils', () => {
    const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.Lp-38GDk4aE7pJkktZZQHFWUzVJTlbT7dD7CQrKz-bI';
    const expiredJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj3bW2_Wr3kCKYKlhMxBr9RhF0eDrFrKqtvXdWx8';
    const noExpJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    
    describe('parseToken', () => {
      it('should parse valid JWT token', () => {
        const payload = JWTUtils.parseToken(validJWT);
        
        expect(payload).toMatchObject({
          sub: '1234567890',
          name: 'John Doe',
          iat: 1516239022,
          exp: 9999999999
        });
      });

      it('should throw error for invalid JWT format', () => {
        expect(() => JWTUtils.parseToken('invalid.jwt')).toThrow('Invalid JWT token format');
        expect(() => JWTUtils.parseToken('not-a-jwt')).toThrow('Invalid JWT token format');
      });
    });

    describe('isTokenExpired', () => {
      it('should return false for valid token', () => {
        expect(JWTUtils.isTokenExpired(validJWT)).toBe(false);
      });

      it('should return true for expired token', () => {
        expect(JWTUtils.isTokenExpired(expiredJWT)).toBe(true);
      });

      it('should return false for token without expiration', () => {
        expect(JWTUtils.isTokenExpired(noExpJWT)).toBe(false);
      });

      it('should return true for invalid token', () => {
        expect(JWTUtils.isTokenExpired('invalid-token')).toBe(true);
      });
    });

    describe('getTokenExpiration', () => {
      it('should return expiration date for valid token', () => {
        const expiration = JWTUtils.getTokenExpiration(validJWT);
        expect(expiration).toBeInstanceOf(Date);
        expect(expiration!.getTime()).toBe(9999999999 * 1000);
      });

      it('should return null for token without expiration', () => {
        const expiration = JWTUtils.getTokenExpiration(noExpJWT);
        expect(expiration).toBeNull();
      });

      it('should return null for invalid token', () => {
        const expiration = JWTUtils.getTokenExpiration('invalid-token');
        expect(expiration).toBeNull();
      });
    });

    describe('getTimeUntilExpiration', () => {
      it('should return time until expiration for valid token', () => {
        const timeLeft = JWTUtils.getTimeUntilExpiration(validJWT);
        expect(timeLeft).toBeGreaterThan(0);
      });

      it('should return 0 for expired token', () => {
        const timeLeft = JWTUtils.getTimeUntilExpiration(expiredJWT);
        expect(timeLeft).toBe(0);
      });

      it('should return null for token without expiration', () => {
        const timeLeft = JWTUtils.getTimeUntilExpiration(noExpJWT);
        expect(timeLeft).toBeNull();
      });

      it('should return null for invalid token', () => {
        const timeLeft = JWTUtils.getTimeUntilExpiration('invalid-token');
        expect(timeLeft).toBeNull();
      });
    });
  });
});