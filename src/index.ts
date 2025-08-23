// Main exports - combine generator and runtime exports
export * from './generator/index.js';
export * from './runtime/index.js';
export * from './types/index.js';

// Re-export commonly used items for convenience
export { 
  generate,
  Proto2FetchGenerator 
} from './generator/index.js';

export {
  createAPIClient,
  APIError
} from './runtime/index.js';