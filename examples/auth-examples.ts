// Authentication Examples for proto2fetch

import { 
  SimpleAuth, 
  JWTAuth, 
  CustomAuth, 
  createAPIClient,
  KyAPIClient
} from 'proto2fetch/runtime';

// Example 1: Simple Bearer Token Authentication
const simpleAuthClient = createAPIClient({
  baseUrl: 'https://api.example.com',
  auth: new SimpleAuth('your-api-token', 'Bearer')
});

// Example 2: API Key Authentication
const apiKeyClient = createAPIClient({
  baseUrl: 'https://api.example.com', 
  auth: new SimpleAuth('your-api-key', 'X-API-Key')
});

// Example 3: JWT Authentication with Auto-Refresh
const jwtClient = createAPIClient({
  baseUrl: 'https://api.example.com',
  auth: new JWTAuth('your-jwt-token', {
    onExpired: async () => {
      // Refresh logic - call your refresh endpoint
      const response = await fetch('/auth/refresh', { method: 'POST' });
      const { token } = await response.json();
      return token;
    }
  })
});

// Example 4: Paseto Token (treated as simple bearer token)
const pasetoClient = createAPIClient({
  baseUrl: 'https://api.example.com',
  auth: new SimpleAuth('your-paseto-token', 'Bearer')
});

// Example 5: Custom Authentication
const customAuthClient = createAPIClient({
  baseUrl: 'https://api.example.com',
  auth: new CustomAuth(async () => {
    const apiKey = await getApiKeyFromSecureStore();
    const timestamp = Date.now().toString();
    const signature = await generateHMAC(apiKey + timestamp);
    
    return {
      'X-API-Key': apiKey,
      'X-Timestamp': timestamp,
      'X-Signature': signature
    };
  })
});

// Example 6: Multiple Headers Custom Auth
const multiHeaderClient = createAPIClient({
  baseUrl: 'https://api.example.com',
  auth: new CustomAuth(() => ({
    'Authorization': 'Bearer your-token',
    'X-Client-ID': 'your-client-id',
    'X-Request-ID': generateRequestId()
  }))
});

// Example 7: Legacy Support (backward compatible)
const legacyClient = createAPIClient({
  baseUrl: 'https://api.example.com',
  auth: { 
    token: 'legacy-token',
    tokenType: 'Bearer'
  }
});

// ================================
// DYNAMIC AUTHENTICATION EXAMPLES
// ================================

// Example 8: Dynamic Token Update - Direct Method
const dynamicClient = createAPIClient({
  baseUrl: 'https://api.example.com',
  auth: new SimpleAuth('initial-token')
});

// User logs in, get new token
async function handleUserLogin() {
  const loginResponse = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'user', password: 'pass' })
  });
  
  const { token } = await loginResponse.json();
  
  // Update the existing auth provider (cast to KyAPIClient to access the method)
  (dynamicClient as KyAPIClient).updateAuthToken(token);
  
  console.log('Token updated successfully');
}

// Example 9: Token Provider Function (Real-time Dynamic)
let userToken = 'initial-token';

const providerClient = createAPIClient({
  baseUrl: 'https://api.example.com',
  auth: new SimpleAuth(() => userToken) // Function-based token provider
});

// Token updates automatically affect all requests
function updateUserToken(newToken: string) {
  userToken = newToken; // All subsequent requests will use the new token
}

// Example 10: Async Token Provider with Storage
const storageBasedClient = createAPIClient({
  baseUrl: 'https://api.example.com',
  auth: new SimpleAuth(async () => {
    // This could be localStorage, sessionStorage, secure storage, etc.
    const token = await getTokenFromSecureStorage();
    return token || 'fallback-token';
  })
});

// Example 11: JWT with Dynamic Refresh
let currentJWT = 'initial-jwt-token';

const jwtDynamicClient = createAPIClient({
  baseUrl: 'https://api.example.com',
  auth: new JWTAuth(currentJWT, {
    onExpired: async () => {
      // Call refresh endpoint
      const refreshResponse = await fetch('/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentJWT}`,
          'Content-Type': 'application/json'
        }
      });
      
      const { accessToken } = await refreshResponse.json();
      
      // Update the stored token
      currentJWT = accessToken;
      
      return accessToken;
    }
  })
});

// Alternative: JWT with function-based provider and manual refresh
const jwtProviderClient = createAPIClient({
  baseUrl: 'https://api.example.com',
  auth: new JWTAuth(() => currentJWT, {
    onExpired: async () => {
      const newToken = await refreshJWTToken();
      currentJWT = newToken; // Update the variable
      return newToken;
    }
  })
});

// Example 12: User Login/Logout Workflow
class UserAuthManager {
  private apiClient = createAPIClient({
    baseUrl: 'https://api.example.com'
    // No auth initially
  }) as KyAPIClient;
  
  async login(username: string, password: string) {
    try {
      // Login without authentication
      const response = await this.apiClient.request('POST', '/auth/login', {
        username,
        password
      }, { skipAuth: true });
      
      const { token, refreshToken } = response as { token: string; refreshToken: string };
      
      // Set up authentication for future requests
      this.apiClient.updateAuthProvider(new JWTAuth(token, {
        onExpired: async () => {
          // Use refresh token to get new access token
          const refreshResponse = await fetch('/auth/refresh', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${refreshToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!refreshResponse.ok) {
            throw new Error('Token refresh failed');
          }
          
          const { accessToken } = await refreshResponse.json();
          return accessToken;
        }
      }));
      
      console.log('User logged in successfully');
      return { token, refreshToken };
      
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }
  
  logout() {
    // Clear authentication
    this.apiClient.clearAuthToken();
    console.log('User logged out');
  }
  
  // Now all API calls will be authenticated
  async getUserProfile() {
    return this.apiClient.request('GET', '/user/profile');
  }
  
  async updateUserProfile(data: any) {
    return this.apiClient.request('PUT', '/user/profile', data);
  }
}

// Example 13: Multiple Authentication Strategies
class MultiAuthClient {
  private client = createAPIClient({
    baseUrl: 'https://api.example.com'
  }) as KyAPIClient;
  
  useApiKey(apiKey: string) {
    this.client.updateAuthProvider(new SimpleAuth(apiKey, 'X-API-Key'));
  }
  
  useBearerToken(token: string) {
    this.client.updateAuthProvider(new SimpleAuth(token, 'Bearer'));
  }
  
  useJWTToken(jwt: string, refreshHandler?: () => Promise<string>) {
    this.client.updateAuthProvider(new JWTAuth(jwt, {
      onExpired: refreshHandler
    }));
  }
  
  useCustomAuth(headerProvider: () => Record<string, string>) {
    this.client.updateAuthProvider(new CustomAuth(headerProvider));
  }
  
  clearAuth() {
    this.client.clearAuthToken();
  }
  
  // API methods remain the same regardless of auth strategy
  async fetchData() {
    return this.client.request('GET', '/data');
  }
}

// Utility functions (examples)
async function getApiKeyFromSecureStore(): Promise<string> {
  // Implementation depends on your secure storage
  return 'api-key-from-secure-store';
}

async function generateHMAC(_data: string): Promise<string> {
  // Implementation using Web Crypto API or similar
  return 'generated-hmac-signature';
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Additional utility functions for dynamic auth examples
async function getTokenFromSecureStorage(): Promise<string | null> {
  // This could be localStorage, sessionStorage, IndexedDB, etc.
  try {
    // Example with localStorage (use secure storage in production)
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

async function refreshJWTToken(): Promise<string> {
  // Implementation for JWT token refresh
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  const response = await fetch('/auth/refresh', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${refreshToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Token refresh failed');
  }
  
  const { accessToken } = await response.json();
  return accessToken;
}

// Example usage scenarios (commented out to avoid unused variable warnings)
// const authManager = new UserAuthManager();
// const multiAuthClient = new MultiAuthClient();

// Scenario 1: User login workflow
// authManager.login('username', 'password').then(() => {
//   return authManager.getUserProfile();
// }).then(profile => {
//   console.log('User profile:', profile);
// });

// Scenario 2: Switching between different auth methods
// multiAuthClient.useApiKey('your-api-key');
// multiAuthClient.fetchData().then(data => console.log('Data with API key:', data));
// 
// multiAuthClient.useBearerToken('your-bearer-token');
// multiAuthClient.fetchData().then(data => console.log('Data with Bearer token:', data));

// Scenario 3: Dynamic token updates
// handleUserLogin().then(() => {
//   // Now all requests from dynamicClient will use the new token
//   return dynamicClient.request('GET', '/protected-resource');
// });

export {
  // Basic auth examples
  simpleAuthClient,
  apiKeyClient,
  jwtClient,
  pasetoClient,
  customAuthClient,
  multiHeaderClient,
  legacyClient,
  
  // Dynamic auth examples
  dynamicClient,
  providerClient,
  storageBasedClient,
  jwtDynamicClient,
  jwtProviderClient,
  
  // Utility classes
  UserAuthManager,
  MultiAuthClient,
  
  // Utility functions
  handleUserLogin,
  updateUserToken,
  getTokenFromSecureStorage,
  refreshJWTToken
};