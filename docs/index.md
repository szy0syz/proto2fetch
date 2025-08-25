---
layout: home

hero:
  name: "proto2fetch"
  text: "Protobuf to TypeScript API Client"
  tagline: Generate type-safe API clients from protobuf definitions with modern ky HTTP client
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: View on GitHub
      link: https://github.com/szy0syz/proto2fetch

features:
  - title: Type-Safe
    details: Generate fully typed TypeScript API clients with automatic request/response inference
  - title: Modern HTTP Client
    details: Built on ky, the modern and lightweight HTTP client for the browser
  - title: Authentication Support
    details: Built-in support for JWT, Bearer tokens, API keys, and custom authentication strategies
  - title: Protobuf Native
    details: Parse protobuf files directly with support for HTTP annotations and service definitions
  - title: Production Ready
    details: Error handling, retry logic, and enterprise features out of the box
  - title: Developer Friendly
    details: CLI tools, configuration files, and extensive documentation
---

## Quick Example

```typescript
// Install
npm install proto2fetch

// Generate client from protobuf
npx proto2fetch --proto-path ./proto --output-dir ./generated --base-url https://api.example.com

// Use the generated client
import { APIClient } from './generated/client'
import { SimpleAuth } from 'proto2fetch/runtime'

const client = new APIClient({
  baseUrl: 'https://api.example.com',
  auth: new SimpleAuth('your-auth-token')
})

// Type-safe API calls
const users = await client.getUsers({
  pagination: { page: 1, size: 10 },
  filter: { isActive: true }
})
```

## Why proto2fetch?

- **🎯 Type Safety**: Never worry about API request/response types again
- **⚡ Modern**: Built with the latest web standards and TypeScript best practices  
- **🔐 Secure**: Comprehensive authentication and error handling
- **🚀 Fast**: Optimized for performance with minimal bundle size
- **🔧 Flexible**: Extensible architecture with plugin support

---

<div style="text-align: center; margin-top: 2rem;">
  Ready to get started? <a href="/guide/">Read the guide</a> or check out the <a href="/examples/">examples</a>.
</div>