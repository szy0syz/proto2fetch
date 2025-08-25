import { describe, it, expect, vi } from 'vitest';
import { KyAPIClient } from '../src/runtime/client.js';
import { SimpleAuth, JWTAuth, CustomAuth } from '../src/runtime/auth.js';
import type { APIClientConfig } from '../src/types/index.js';

describe('Client Auth Management Tests', () => {
  const mockConfig: APIClientConfig = {
    baseUrl: 'https://api.example.com',
    timeout: 5000
  };


  describe('updateAuthToken', () => {
    it('should update token on existing SimpleAuth provider', () => {
      const auth = new SimpleAuth('initial-token');
      const client = new KyAPIClient({ ...mockConfig, auth });
      
      client.updateAuthToken('updated-token');
      
      // Test that the token was updated by checking the auth headers
      return auth.getAuthHeaders().then(headers => {
        expect(headers).toEqual({
          Authorization: 'Bearer updated-token'
        });
      });
    });

    it('should update token on existing JWTAuth provider', () => {
      const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.Lp-38GDk4aE7pJkktZZQHFWUzVJTlbT7dD7CQrKz-bI';
      const updatedJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ODc2NTQzMjEwIiwibmFtZSI6IkphbmUgRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.Zj9ooYcaLTFqvzZsr4BV2f-9FaIvIqJvnZ2wZxgJ3hI';
      
      const auth = new JWTAuth(validJWT);
      const client = new KyAPIClient({ ...mockConfig, auth });
      
      client.updateAuthToken(updatedJWT);
      
      return auth.getAuthHeaders().then(headers => {
        expect(headers).toEqual({
          Authorization: `Bearer ${updatedJWT}`
        });
      });
    });

    it('should create new SimpleAuth when current provider does not support updates', () => {
      const customAuth = new CustomAuth(() => ({ 'X-Custom': 'header' }));
      const client = new KyAPIClient({ ...mockConfig, auth: customAuth });
      
      client.updateAuthToken('new-token');
      
      const authProvider = (client as any).authProvider;
      expect(authProvider).toBeInstanceOf(SimpleAuth);
      expect(authProvider).not.toBe(customAuth);
    });

    it('should create new SimpleAuth when no auth provider exists', () => {
      const client = new KyAPIClient(mockConfig);
      
      client.updateAuthToken('new-token');
      
      const authProvider = (client as any).authProvider;
      expect(authProvider).toBeInstanceOf(SimpleAuth);
    });

    it('should not update function-based auth providers', () => {
      const tokenProvider = vi.fn(() => 'provider-token');
      const auth = new SimpleAuth(tokenProvider);
      const client = new KyAPIClient({ ...mockConfig, auth });
      
      client.updateAuthToken('updated-token');
      
      // Should create new SimpleAuth instead of trying to update the function-based one
      const authProvider = (client as any).authProvider;
      expect(authProvider).toBeInstanceOf(SimpleAuth);
      expect(authProvider).not.toBe(auth);
    });
  });

  describe('updateAuthProvider', () => {
    it('should replace auth provider with new one', () => {
      const initialAuth = new SimpleAuth('initial-token');
      const client = new KyAPIClient({ ...mockConfig, auth: initialAuth });
      
      const newAuth = new JWTAuth('jwt-token');
      client.updateAuthProvider(newAuth);
      
      const authProvider = (client as any).authProvider;
      expect(authProvider).toBe(newAuth);
      expect(authProvider).not.toBe(initialAuth);
    });

    it('should set auth provider when none exists', () => {
      const client = new KyAPIClient(mockConfig);
      
      const newAuth = new CustomAuth(() => ({ 'X-API-Key': 'test' }));
      client.updateAuthProvider(newAuth);
      
      const authProvider = (client as any).authProvider;
      expect(authProvider).toBe(newAuth);
    });
  });

  describe('clearAuthToken', () => {
    it('should remove existing auth provider', () => {
      const auth = new SimpleAuth('test-token');
      const client = new KyAPIClient({ ...mockConfig, auth });
      
      client.clearAuthToken();
      
      const authProvider = (client as any).authProvider;
      expect(authProvider).toBeUndefined();
    });
  });

  describe('Legacy auth config support', () => {
    it('should create SimpleAuth from legacy config', () => {
      const client = new KyAPIClient({
        ...mockConfig,
        auth: { token: 'legacy-token', tokenType: 'Bearer' }
      });
      
      const authProvider = (client as any).authProvider;
      expect(authProvider).toBeInstanceOf(SimpleAuth);
      
      return authProvider.getAuthHeaders().then((headers: any) => {
        expect(headers).toEqual({
          Authorization: 'Bearer legacy-token'
        });
      });
    });

    it('should use Bearer as default token type', () => {
      const client = new KyAPIClient({
        ...mockConfig,
        auth: { token: 'legacy-token' }
      });
      
      const authProvider = (client as any).authProvider;
      return authProvider.getAuthHeaders().then((headers: any) => {
        expect(headers).toEqual({
          Authorization: 'Bearer legacy-token'
        });
      });
    });

    it('should handle empty legacy config', () => {
      const client = new KyAPIClient({
        ...mockConfig,
        auth: {}
      });
      
      const authProvider = (client as any).authProvider;
      expect(authProvider).toBeUndefined();
    });
  });

  describe('Integration with request method', () => {
    it('should include auth headers in requests', async () => {
      // Mock ky instance to avoid making real HTTP requests
      const mockKy = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ success: true })
      });
      
      const auth = new SimpleAuth('test-token');
      const client = new KyAPIClient({ ...mockConfig, auth });
      
      // Replace ky instance with mock
      (client as any).ky = mockKy;
      
      await client.request('GET', '/test');
      
      expect(mockKy).toHaveBeenCalledWith('test', expect.objectContaining({
        method: 'get',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token'
        })
      }));
    });

    it('should skip auth when skipAuth option is true', async () => {
      const mockKy = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ success: true })
      });
      
      const auth = new SimpleAuth('test-token');
      const client = new KyAPIClient({ ...mockConfig, auth });
      (client as any).ky = mockKy;
      
      await client.request('GET', '/test', undefined, { skipAuth: true });
      
      expect(mockKy).toHaveBeenCalledWith('test', expect.objectContaining({
        method: 'get'
      }));
      
      // Verify that Authorization header is not present
      const callArgs = mockKy.mock.calls[0];
      const requestOptions = callArgs[1];
      
      if (requestOptions.headers) {
        expect(requestOptions.headers).not.toHaveProperty('Authorization');
      }
    });

    it('should update auth headers after token update', async () => {
      const mockKy = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ success: true })
      });
      
      const auth = new SimpleAuth('initial-token');
      const client = new KyAPIClient({ ...mockConfig, auth });
      (client as any).ky = mockKy;
      
      // First request with initial token
      await client.request('GET', '/test');
      expect(mockKy).toHaveBeenLastCalledWith('test', expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer initial-token'
        })
      }));
      
      // Update token
      client.updateAuthToken('updated-token');
      
      // Second request should use updated token
      await client.request('GET', '/test');
      expect(mockKy).toHaveBeenLastCalledWith('test', expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer updated-token'
        })
      }));
    });
  });
});