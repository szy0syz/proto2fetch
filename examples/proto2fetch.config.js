/**
 * Example configuration file for proto2fetch
 * Save this as proto2fetch.config.js in your project root
 */

module.exports = {
  // Required: Path to your protobuf files
  protoPath: '/Users/szy0syz/git/go-be/proto',
  
  // Required: Output directory for generated files
  outputDir: './src/generated',
  
  // Base URL for your API
  baseUrl: 'https://api.example.com',
  
  // Name for the generated npm package
  packageName: 'clean-go-api-client',
  
  // Name for the main client class
  clientName: 'CleanGoAPIClient',
  
  // Include JSDoc comments in generated code
  includeComments: true,
  
  // Generate filter builder classes for easier filtering
  generateFilterBuilders: true,
  
  // Generate sort builder classes for easier sorting
  generateSortBuilders: true,
  
  // How to handle Timestamp fields: 'Date' for Date objects, 'string' for ISO strings
  dateType: 'Date',
  
  // How to handle int64/uint64 fields: 'bigint' for BigInt, 'string' for strings
  bigintType: 'string'
};

/**
 * Alternative configuration for different use cases:
 */

// For microservice with string-based dates and numbers
const microserviceConfig = {
  protoPath: './proto',
  outputDir: './src/api',
  baseUrl: 'http://localhost:8080',
  packageName: 'microservice-client',
  clientName: 'MicroserviceClient',
  includeComments: false,
  generateFilterBuilders: false,
  generateSortBuilders: false,
  dateType: 'string',
  bigintType: 'string'
};

// For browser client with minimal bundle size
const browserConfig = {
  protoPath: './proto',
  outputDir: './src/client',
  baseUrl: 'https://cdn-api.example.com',
  packageName: 'browser-api-client',
  clientName: 'BrowserClient',
  includeComments: false,
  generateFilterBuilders: true,
  generateSortBuilders: true,
  dateType: 'string',
  bigintType: 'string'
};

// For development environment
const devConfig = {
  protoPath: './proto',
  outputDir: './src/dev-client',
  baseUrl: 'http://localhost:3000',
  packageName: 'dev-api-client',
  clientName: 'DevAPIClient',
  includeComments: true,
  generateFilterBuilders: true,
  generateSortBuilders: true,
  dateType: 'Date',
  bigintType: 'bigint'
};

// Export the default configuration (use the main config)
// module.exports = module.exports || microserviceConfig;