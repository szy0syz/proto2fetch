# proto2fetch

🚀 Generate TypeScript-friendly API clients from protobuf definitions with modern HTTP client support.

[![npm version](https://badge.fury.io/js/proto2fetch.svg)](https://badge.fury.io/js/proto2fetch)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## ✨ Features

- 🔥 **Auto-generate** TypeScript API clients from protobuf definitions
- 🚀 **Modern HTTP client** powered by [ky](https://github.com/sindresorhus/ky)
- 💪 **Full type safety** with TypeScript support
- 🛠️ **Request/Response interceptors** and error handling
- 📦 **NPM ready** - publish to public or private registries
- ✨ **Advanced features** - authentication, pagination, filtering, sorting
- 🎯 **Framework agnostic** - works with any TypeScript/JavaScript project
- 🔧 **Highly configurable** - customize everything to your needs

## 📦 Installation

```bash
# Install as dev dependency for code generation
npm install -D proto2fetch

# Install as runtime dependency for generated clients
npm install proto2fetch
```

## 🚀 Quick Start

### 1. Generate API Client

```bash
# Generate from your protobuf files
npx proto2fetch --proto-path ./proto --output-dir ./src/generated --base-url https://api.example.com
```

### 2. Use Generated Client

```typescript
import { CleanGoAPIClient } from './generated/client';

const client = new CleanGoAPIClient({
  baseUrl: 'https://api.example.com',
  auth: {
    token: 'your-auth-token'
  }
});

// Type-safe API calls
const users = await client.getUsers({
  pagination: { page: 1, size: 10 },
  filter: { isActive: true }
});
```

## 📖 Usage

### Command Line Interface

```bash
proto2fetch [options]

Options:
  --proto-path <path>           Path to protobuf files directory
  --output-dir <path>           Output directory for generated files
  --base-url <url>              Base URL for API client
  --package-name <name>         Name for generated package
  --client-name <name>          Name for generated client class
  --include-comments            Include comments in generated code
  --generate-filter-builders    Generate filter builder classes
  --generate-sort-builders      Generate sort builder classes
  --date-type <type>            Type for dates: Date|string
  --bigint-type <type>          Type for bigints: bigint|string
  --config <path>               Path to configuration file
  --help                        Show help message
  --version                     Show version
```

### Configuration File

Create `proto2fetch.config.js` in your project root:

```javascript
module.exports = {
  protoPath: './proto',
  outputDir: './src/generated',
  baseUrl: 'https://api.example.com',
  packageName: 'my-api-client',
  clientName: 'MyAPIClient',
  includeComments: true,
  generateFilterBuilders: true,
  generateSortBuilders: true,
  dateType: 'Date', // or 'string'
  bigintType: 'string' // or 'bigint'
};
```

### Programmatic Usage

```typescript
import { generate } from 'proto2fetch';

await generate({
  protoPath: './proto',
  outputDir: './generated',
  baseUrl: 'https://api.example.com',
  clientName: 'MyAPIClient'
});
```

## 🎯 Generated Client Features

### Basic API Calls

```typescript
// User management
const createResponse = await client.createUser({
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1-555-0123',
  password: 'secure123'
});

const currentUser = await client.getCurrentUser({});
const users = await client.getUsers({ pagination: { page: 1, size: 10 } });
```

### Authentication

```typescript
// Configure authentication
const client = new MyAPIClient({
  baseUrl: 'https://api.example.com',
  auth: {
    token: 'your-token',
    tokenType: 'Bearer', // or 'Basic'
    refreshTokenHandler: async () => {
      // Custom refresh logic
      return await refreshToken();
    }
  }
});

// Login and update token
const loginResponse = await client.login({
  username: 'user@example.com',
  password: 'password'
});

client.setAuthToken(loginResponse.token);
```

### Error Handling

```typescript
import { APIError } from 'proto2fetch/runtime';

try {
  await client.createUser(invalidData);
} catch (error) {
  if (error instanceof APIError) {
    console.log('Status:', error.status);
    console.log('Code:', error.code);
    console.log('Message:', error.message);
    
    // Get field-specific errors
    const fieldErrors = error.getFieldErrors();
    console.log('Field errors:', fieldErrors);
    
    // Check error type
    if (error.isValidationError) {
      // Handle validation error
    } else if (error.isAuthError) {
      // Handle authentication error
    }
  }
}
```

### Advanced Features

```typescript
// Pagination with filtering and sorting
const response = await client.getUsers({
  pagination: { page: 1, size: 20 },
  filter: {
    isActive: true,
    nameLike: 'john',
    createdAfter: new Date('2024-01-01')
  },
  sort: [
    { field: 'created_at', direction: 'desc' },
    { field: 'name', direction: 'asc' }
  ]
});

// Using filter builders (if enabled)
const userFilter = new UserFilterBuilder()
  .name('John')
  .isActive(true)
  .createdAfter(new Date('2024-01-01'))
  .build();

const users = await client.getUsers({
  filter: userFilter
});
```

### Request/Response Hooks

```typescript
const client = new MyAPIClient({
  baseUrl: 'https://api.example.com',
  hooks: {
    beforeRequest: [
      (request) => {
        console.log('Making request:', request.url);
        return request;
      }
    ],
    afterResponse: [
      (request, response) => {
        console.log('Response received:', response.status);
        return response;
      }
    ],
    beforeError: [
      (error) => {
        console.error('Request failed:', error);
        return error;
      }
    ]
  }
});
```

## 🏗️ Architecture

proto2fetch consists of three main components:

1. **Generator** - Parses protobuf files and generates TypeScript code
2. **Runtime** - HTTP client, authentication, and error handling
3. **Types** - TypeScript type definitions and utilities

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   protobuf      │ →  │   generator     │ →  │   TypeScript    │
│                 │    │                 │    │   API Client    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                  ↓
                          ┌─────────────────┐
                          │   runtime       │
                          └─────────────────┘
```

## 🔧 Configuration Options

### Generator Options

```typescript
interface GeneratorOptions {
  protoPath: string;              // Path to protobuf files
  outputDir: string;              // Output directory
  baseUrl?: string;               // API base URL
  packageName?: string;           // Generated package name
  clientName?: string;            // Client class name
  includeComments?: boolean;      // Include JSDoc comments
  generateFilterBuilders?: boolean; // Generate filter helpers
  generateSortBuilders?: boolean;   // Generate sort helpers
  dateType?: 'Date' | 'string';     // Date representation
  bigintType?: 'bigint' | 'string'; // BigInt representation
}
```

### Client Configuration

```typescript
interface APIClientConfig {
  baseUrl: string;
  timeout?: number;
  retry?: {
    limit: number;
    methods?: string[];
    statusCodes?: number[];
  };
  hooks?: {
    beforeRequest?: RequestHook[];
    beforeRetry?: RetryHook[];
    beforeError?: ErrorHook[];
    afterResponse?: ResponseHook[];
  };
  auth?: {
    token?: string;
    tokenType?: 'Bearer' | 'Basic';
    refreshTokenHandler?: () => Promise<string>;
  };
  debug?: boolean;
}
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [ky](https://github.com/sindresorhus/ky) - Amazing HTTP client
- [protobufjs](https://github.com/protobufjs/protobuf.js) - Protocol Buffers for JavaScript
- [grpc-gateway](https://github.com/grpc-ecosystem/grpc-gateway) - gRPC to JSON proxy

## 📚 Related Projects

- [grpc-web](https://github.com/grpc/grpc-web) - gRPC for Web Clients
- [protoc-gen-typescript](https://github.com/thesayyn/protoc-gen-ts) - TypeScript generator for protoc
- [buf](https://github.com/bufbuild/buf) - Modern Protocol Buffers toolchain

---

Made with ❤️ for the TypeScript community