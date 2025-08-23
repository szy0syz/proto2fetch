import type { ErrorDetail } from '../types/index.js';

export class APIError extends Error {
  override readonly name = 'APIError';
  
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: ErrorDetail[] = []
  ) {
    super(message);
    
    // Maintain proper stack trace for where the error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }

  /**
   * Check if this is a client error (4xx)
   */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Check if this is a server error (5xx)
   */
  get isServerError(): boolean {
    return this.status >= 500 && this.status < 600;
  }

  /**
   * Check if this is a network error
   */
  get isNetworkError(): boolean {
    return this.status === 0;
  }

  /**
   * Check if this is a timeout error
   */
  get isTimeoutError(): boolean {
    return this.code === 'TIMEOUT';
  }

  /**
   * Check if this is an authentication error
   */
  get isAuthError(): boolean {
    return this.status === 401 || this.code === 'AUTH_ERROR';
  }

  /**
   * Check if this is an authorization error
   */
  get isAuthzError(): boolean {
    return this.status === 403 || this.code === 'AUTHZ_ERROR';
  }

  /**
   * Check if this is a validation error
   */
  get isValidationError(): boolean {
    return this.status === 400 || this.code === 'VALIDATION_ERROR';
  }

  /**
   * Check if this is a not found error
   */
  get isNotFoundError(): boolean {
    return this.status === 404 || this.code === 'NOT_FOUND';
  }

  /**
   * Get field-specific error messages
   */
  getFieldErrors(): Record<string, string[]> {
    const fieldErrors: Record<string, string[]> = {};
    
    for (const detail of this.details) {
      if (!fieldErrors[detail.field]) {
        fieldErrors[detail.field] = [];
      }
      fieldErrors[detail.field]?.push(detail.message);
    }
    
    return fieldErrors;
  }

  /**
   * Get error message for a specific field
   */
  getFieldError(fieldName: string): string | undefined {
    const detail = this.details.find(d => d.field === fieldName);
    return detail?.message;
  }

  /**
   * Convert to a plain object for serialization
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      details: this.details,
      stack: this.stack
    };
  }

  /**
   * Create a user-friendly error message
   */
  toUserMessage(): string {
    switch (this.status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication required. Please log in.';
      case 403:
        return 'Access denied. You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 408:
        return 'Request timed out. Please try again.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Internal server error. Please try again later.';
      case 502:
        return 'Bad gateway. The server is temporarily unavailable.';
      case 503:
        return 'Service unavailable. Please try again later.';
      case 504:
        return 'Gateway timeout. The server took too long to respond.';
      default:
        if (this.isNetworkError) {
          return 'Network error. Please check your connection and try again.';
        }
        return this.message || 'An unexpected error occurred.';
    }
  }
}

/**
 * Error handler utility functions
 */
export const ErrorUtils = {
  /**
   * Check if an error is an APIError
   */
  isAPIError(error: any): error is APIError {
    return error instanceof APIError;
  },

  /**
   * Convert any error to APIError
   */
  toAPIError(error: any): APIError {
    if (error instanceof APIError) {
      return error;
    }

    if (error instanceof Error) {
      return new APIError(500, 'UNKNOWN_ERROR', error.message);
    }

    return new APIError(500, 'UNKNOWN_ERROR', 'An unknown error occurred');
  },

  /**
   * Create a validation error
   */
  validationError(message: string, details: ErrorDetail[] = []): APIError {
    return new APIError(400, 'VALIDATION_ERROR', message, details);
  },

  /**
   * Create an authentication error
   */
  authError(message: string = 'Authentication required'): APIError {
    return new APIError(401, 'AUTH_ERROR', message);
  },

  /**
   * Create an authorization error
   */
  authzError(message: string = 'Access denied'): APIError {
    return new APIError(403, 'AUTHZ_ERROR', message);
  },

  /**
   * Create a not found error
   */
  notFoundError(message: string = 'Resource not found'): APIError {
    return new APIError(404, 'NOT_FOUND', message);
  },

  /**
   * Create a network error
   */
  networkError(message: string = 'Network request failed'): APIError {
    return new APIError(0, 'NETWORK_ERROR', message);
  },

  /**
   * Create a timeout error
   */
  timeoutError(message: string = 'Request timed out'): APIError {
    return new APIError(408, 'TIMEOUT', message);
  }
};

/**
 * Error retry utility
 */
export class RetryHandler {
  constructor(
    private maxRetries: number = 3,
    private retryDelay: number = 1000,
    private backoffMultiplier: number = 2
  ) {}

  /**
   * Check if an error is retryable
   */
  isRetryable(error: APIError): boolean {
    // Don't retry client errors (except timeout)
    if (error.isClientError && !error.isTimeoutError) {
      return false;
    }

    // Don't retry authentication/authorization errors
    if (error.isAuthError || error.isAuthzError) {
      return false;
    }

    // Retry server errors, network errors, and timeouts
    return error.isServerError || error.isNetworkError || error.isTimeoutError;
  }

  /**
   * Execute a function with retry logic
   */
  async retry<T>(
    fn: () => Promise<T>,
    onRetry?: (error: APIError, attempt: number) => void
  ): Promise<T> {
    let lastError: APIError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = ErrorUtils.toAPIError(error);
        
        // Don't retry on last attempt
        if (attempt === this.maxRetries) {
          break;
        }
        
        // Don't retry if error is not retryable
        if (!this.isRetryable(lastError)) {
          break;
        }
        
        // Call retry callback
        if (onRetry) {
          onRetry(lastError, attempt + 1);
        }
        
        // Wait before retrying
        const delay = this.retryDelay * Math.pow(this.backoffMultiplier, attempt);
        await this.delay(delay);
      }
    }
    
    throw lastError!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export { ErrorDetail };