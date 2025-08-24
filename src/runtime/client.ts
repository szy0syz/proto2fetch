import ky from 'ky';
import type { Options as KyOptions } from 'ky';
import type { 
  APIClientConfig, 
  RequestOptions,
  APIErrorResponse 
} from '../types/index.js';
import { APIError } from './error.js';
import { AuthManager } from './auth.js';

export interface APIClient {
  request<T = any>(
    _method: string,
    _path: string,
    _data?: any,
    _options?: RequestOptions
  ): Promise<T>;
  objectToSearchParams(_obj: Record<string, any>): URLSearchParams;
  setAuthToken(_token: string): void;
  clearAuthToken(): void;
}

export class KyAPIClient implements APIClient {
  private ky: typeof ky;
  private authManager: AuthManager;

  constructor(private config: APIClientConfig) {
    this.authManager = new AuthManager(config.auth);
    this.ky = this.createKyInstance();
  }

  async request<T = any>(
    method: string,
    path: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    const { pathParams, skipAuth, ...kyOptions } = options;

    try {
      // Prepare final path with parameters
      let finalPath = path;
      if (pathParams) {
        for (const [key, value] of Object.entries(pathParams)) {
          finalPath = finalPath.replace(`{${key}}`, String(value));
        }
      }

      // Remove leading slash if prefixUrl is configured to avoid ky error
      if (this.config.baseUrl && finalPath.startsWith('/')) {
        finalPath = finalPath.slice(1);
      }

      // Prepare request options
      const requestOptions: KyOptions = {
        method: method.toLowerCase() as any,
        ...kyOptions
      };

      // Add authentication headers
      if (!skipAuth) {
        const authHeaders = await this.authManager.getAuthHeaders();
        requestOptions.headers = {
          ...authHeaders,
          ...requestOptions.headers
        };
      }

      // Add request body for non-GET methods
      if (data && method !== 'GET') {
        requestOptions.json = data;
      }

      // Make the request
      const response = await this.ky(finalPath, requestOptions);
      return await response.json<T>();

    } catch (error: any) {
      throw await this.handleError(error);
    }
  }

  objectToSearchParams(obj: Record<string, any>): URLSearchParams {
    const params = new URLSearchParams();
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Handle array parameters
          value.forEach((item) => {
            params.append(key, String(item));
          });
        } else if (typeof value === 'object') {
          // Handle nested objects (flatten them)
          this.flattenObject(value, key, params);
        } else {
          params.append(key, String(value));
        }
      }
    }
    
    return params;
  }

  setAuthToken(token: string): void {
    this.authManager.setToken(token);
  }

  clearAuthToken(): void {
    this.authManager.clearToken();
  }

  private createKyInstance(): typeof ky {
    const kyOptions: KyOptions = {
      prefixUrl: this.config.baseUrl,
      timeout: this.config.timeout || 10000,
      retry: this.config.retry ? {
        limit: this.config.retry.limit,
        methods: this.config.retry.methods as any[] || ['get', 'put', 'head', 'delete', 'options', 'trace'],
        statusCodes: this.config.retry.statusCodes || [408, 413, 429, 500, 502, 503, 504]
      } : 0,
      hooks: this.buildHooks()
    };

    if (this.config.debug) {
      console.log('[proto2fetch] Creating ky instance with config:', kyOptions);
    }

    return ky.create(kyOptions);
  }

  private buildHooks(): KyOptions['hooks'] | undefined {
    if (!this.config.hooks) {
      return undefined;
    }

    const hooks: KyOptions['hooks'] = {};

    if (this.config.hooks.beforeRequest) {
      hooks.beforeRequest = this.config.hooks.beforeRequest.map(hook => 
        async (request) => {
          const result = await hook(request);
          return result;
        }
      );
    }

    if (this.config.hooks.beforeRetry) {
      hooks.beforeRetry = this.config.hooks.beforeRetry.map(hook => 
        async ({ request, error, retryCount }) => {
          await hook(request, error, retryCount);
        }
      );
    }

    if (this.config.hooks.beforeError) {
      hooks.beforeError = this.config.hooks.beforeError.map(hook => 
        async (error) => {
          // Return the original error since ky expects HTTPError
          await hook(error);
          return error;
        }
      );
    }

    if (this.config.hooks.afterResponse) {
      hooks.afterResponse = this.config.hooks.afterResponse.map(hook => 
        async (request, _options, response) => {
          const result = await hook(request, response);
          return result;
        }
      );
    }

    return hooks;
  }

  private flattenObject(
    obj: Record<string, any>, 
    prefix: string, 
    params: URLSearchParams
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = `${prefix}.${key}`;
      
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(item => params.append(fullKey, String(item)));
        } else if (typeof value === 'object') {
          this.flattenObject(value, fullKey, params);
        } else {
          params.append(fullKey, String(value));
        }
      }
    }
  }

  private async handleError(error: any): Promise<APIError> {
    if (this.config.debug) {
      console.error('[proto2fetch] Request error:', error);
    }

    // Handle ky HTTPError
    if (error.name === 'HTTPError' && error.response) {
      try {
        const errorResponse: APIErrorResponse = await error.response.json();
        return new APIError(
          error.response.status,
          errorResponse.code?.toString() || 'HTTP_ERROR',
          errorResponse.message || error.message,
          errorResponse.details
        );
      } catch {
        // Failed to parse error response as JSON
        return new APIError(
          error.response.status,
          'HTTP_ERROR',
          `HTTP ${error.response.status}: ${error.response.statusText}`,
          []
        );
      }
    }

    // Handle ky TimeoutError
    if (error.name === 'TimeoutError') {
      return new APIError(
        408,
        'TIMEOUT',
        'Request timed out',
        []
      );
    }

    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return new APIError(
        0,
        'NETWORK_ERROR',
        'Network request failed',
        []
      );
    }

    // Handle other errors
    return new APIError(
      500,
      'UNKNOWN_ERROR',
      error.message || 'An unknown error occurred',
      []
    );
  }
}

export function createAPIClient(config: APIClientConfig): APIClient {
  return new KyAPIClient(config);
}