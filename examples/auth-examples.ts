// Authentication Examples for proto2fetch

import { 
  SimpleAuth, 
  JWTAuth, 
  CustomAuth, 
  createAPIClient 
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

export {
  simpleAuthClient,
  apiKeyClient,
  jwtClient,
  pasetoClient,
  customAuthClient,
  multiHeaderClient,
  legacyClient
};