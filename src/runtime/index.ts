// Runtime exports
export { createAPIClient } from './client.js';
export type { APIClient } from './client.js';

export { 
  APIError, 
  ErrorUtils,
  RetryHandler 
} from './error.js';

export { 
  SimpleAuth,
  JWTAuth,
  CustomAuth,
  JWTUtils
} from './auth.js';

export type { 
  AuthProvider,
  AuthConfig 
} from './auth.js';

export type {
  APIClientConfig,
  RequestOptions,
  CacheConfig,
  RequestHook,
  RetryHook,
  ErrorHook,
  ResponseHook,
  PaginatedRequest,
  PaginatedResponse,
  ErrorDetail,
  APIErrorResponse
} from '../types/index.js';