# proto2fetch 设计文档

## 项目概述

proto2fetch 是一个将 protobuf 定义文件转换为 TypeScript 友好的 API 客户端的工具和运行时库。它基于现代化的 HTTP 库 `ky`，为浏览器端应用提供类型安全的 API 调用体验。

## 核心目标

1. **类型安全**: 从 protobuf 自动生成完整的 TypeScript 类型定义
2. **现代化**: 使用 ky 作为 HTTP 客户端，支持现代浏览器
3. **易用性**: 提供简洁直观的 API 调用接口
4. **可扩展**: 支持请求拦截器、错误处理、认证等高级特性
5. **高性能**: 优化的代码生成和运行时性能

## 技术架构

### 整体架构图

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   protobuf      │ → │   generator     │ → │   TypeScript    │
│   定义文件       │    │   代码生成器     │    │   API Client    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                  │
                                  ▼
                       ┌─────────────────┐
                       │   runtime       │
                       │   运行时库       │
                       └─────────────────┘
```

### 核心模块

1. **Generator (代码生成器)**
   - protobuf 解析器
   - TypeScript 类型生成器
   - API 客户端生成器
   - CLI 工具

2. **Runtime (运行时库)**
   - HTTP 客户端封装 (基于 ky)
   - 请求/响应拦截器
   - 错误处理机制
   - 认证管理

3. **Types (类型定义)**
   - 生成的 TypeScript 接口
   - 通用类型定义
   - 配置接口

## 详细设计

### 1. protobuf 解析与分析

基于您的 protobuf 文件结构分析：

**API 服务结构**:
- `CleanGoAPI` 服务包含 17 个 RPC 方法
- 分为三大类：用户管理、认证系统、授权系统
- 所有方法都有 HTTP 映射配置

**消息类型分析**:
- 用户相关: `User`, `CreateUserRequest/Response` 等
- 认证相关: `LoginRequest/Response`, `UserInfo` 等
- 授权相关: `Role`, `Permission`, `CheckPermissionRequest/Response` 等
- 通用类型: `Pagination`, `ErrorResponse`, `SuccessResponse` 等

### 2. TypeScript 类型生成策略

#### 2.1 基础类型映射

```typescript
// protobuf → TypeScript 类型映射
uint64 → bigint | string (可配置)
int32 → number
string → string
bool → boolean
google.protobuf.Timestamp → Date | string (可配置)
optional → T | undefined
repeated → T[]
```

#### 2.2 生成的类型结构

```typescript
// 生成的类型文件示例
export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  tenantId?: string;
}

export interface CreateUserRequest {
  name: string;
  phone: string;
  email: string;
  password: string;
}

export interface CreateUserResponse {
  user: User;
}
```

### 3. API 客户端设计

#### 3.1 客户端接口设计

```typescript
// 生成的 API 客户端接口
export class CleanGoAPIClient {
  constructor(config: APIClientConfig);
  
  // 用户管理
  createUser(request: CreateUserRequest): Promise<CreateUserResponse>;
  getCurrentUser(request: GetCurrentUserRequest): Promise<GetCurrentUserResponse>;
  getUsers(request?: GetUsersRequest): Promise<GetUsersResponse>;
  updateUser(request: UpdateUserRequest): Promise<UpdateUserResponse>;
  deleteUser(request: DeleteUserRequest): Promise<DeleteUserResponse>;
  
  // 认证系统
  login(request: LoginRequest): Promise<LoginResponse>;
  logout(request: LogoutRequest): Promise<LogoutResponse>;
  validateToken(request: ValidateTokenRequest): Promise<ValidateTokenResponse>;
  
  // 授权系统
  assignRole(request: AssignRoleRequest): Promise<AssignRoleResponse>;
  // ... 其他方法
}
```

#### 3.2 配置接口

```typescript
export interface APIClientConfig {
  baseUrl: string;
  timeout?: number;
  retry?: {
    limit: number;
    methods: string[];
    statusCodes: number[];
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
}
```

### 4. 运行时实现

#### 4.1 HTTP 客户端封装

```typescript
export class HttpClient {
  private ky: typeof import('ky');
  
  constructor(config: APIClientConfig) {
    this.ky = ky.create({
      prefixUrl: config.baseUrl,
      timeout: config.timeout || 10000,
      retry: config.retry || { limit: 3 },
      hooks: this.buildHooks(config.hooks),
    });
  }
  
  async request<T>(
    method: string,
    path: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    // 实现统一的请求处理逻辑
  }
}
```

#### 4.2 认证机制

```typescript
export class AuthManager {
  private token?: string;
  private refreshHandler?: () => Promise<string>;
  
  async getAuthHeaders(): Promise<Record<string, string>> {
    if (this.token) {
      return { Authorization: `Bearer ${this.token}` };
    }
    return {};
  }
  
  async refreshToken(): Promise<void> {
    if (this.refreshHandler) {
      this.token = await this.refreshHandler();
    }
  }
}
```

#### 4.3 错误处理

```typescript
export class APIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: ErrorDetail[]
  ) {
    super(message);
  }
}

export function handleAPIError(error: any): APIError {
  // 统一的错误处理逻辑
}
```

### 5. 代码生成流程

#### 5.1 生成器架构

```typescript
export class Proto2FetchGenerator {
  constructor(private options: GeneratorOptions) {}
  
  async generate(): Promise<void> {
    const protoFiles = await this.loadProtoFiles();
    const services = await this.parseServices(protoFiles);
    
    await this.generateTypes(services);
    await this.generateClient(services);
    await this.generateIndex();
  }
  
  private async parseServices(files: ProtoFile[]): Promise<Service[]> {
    // 解析 protobuf 服务定义
  }
  
  private async generateTypes(services: Service[]): Promise<void> {
    // 生成 TypeScript 类型定义
  }
  
  private async generateClient(services: Service[]): Promise<void> {
    // 生成 API 客户端代码
  }
}
```

#### 5.2 CLI 工具

```bash
# CLI 使用示例
npx proto2fetch generate \
  --proto-path ./proto \
  --output-dir ./src/generated \
  --base-url https://api.example.com \
  --package-name my-api-client
```

### 6. 高级特性

#### 6.1 分页支持

```typescript
// 自动识别分页请求并提供辅助方法
export interface PaginatedRequest<T> {
  request: T;
  page?: number;
  size?: number;
}

export interface PaginatedResponse<T> {
  data: T;
  total: number;
  pagination: Pagination;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
```

#### 6.2 过滤和排序

```typescript
// 基于 protobuf 定义自动生成过滤和排序接口
export interface UserFilterBuilder {
  id(value: string): this;
  name(value: string): this;
  nameLike(value: string): this;
  isActive(value: boolean): this;
  createdAfter(value: Date): this;
  createdBefore(value: Date): this;
  tenantId(value: string): this;
  build(): UserFilter;
}

export interface UserSortBuilder {
  byId(direction?: 'asc' | 'desc'): this;
  byName(direction?: 'asc' | 'desc'): this;
  byCreatedAt(direction?: 'asc' | 'desc'): this;
  build(): UserSort[];
}
```

#### 6.3 请求缓存

```typescript
export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  keyGenerator?: (method: string, args: any[]) => string;
  storage?: 'memory' | 'localStorage' | 'sessionStorage';
}
```

### 7. 项目结构

```
proto2fetch/
├── src/
│   ├── generator/           # 代码生成器
│   │   ├── parser.ts       # protobuf 解析器
│   │   ├── type-gen.ts     # TypeScript 类型生成器
│   │   ├── client-gen.ts   # 客户端代码生成器
│   │   └── cli.ts          # CLI 工具
│   ├── runtime/            # 运行时库
│   │   ├── client.ts       # HTTP 客户端
│   │   ├── auth.ts         # 认证管理
│   │   ├── error.ts        # 错误处理
│   │   └── types.ts        # 运行时类型
│   └── types/              # 通用类型定义
├── examples/               # 使用示例
├── tests/                  # 测试文件
├── docs/                   # 文档
└── generated/              # 生成的代码 (示例)
```

### 8. 构建和发布

#### 8.1 构建配置

- 使用 Rollup 构建，支持 ESM/CJS 双格式输出
- TypeScript 编译生成 `.d.ts` 类型声明文件
- 代码压缩和优化

#### 8.2 包结构

```json
{
  "name": "proto2fetch",
  "version": "1.0.0",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./runtime": {
      "import": "./dist/runtime.mjs",
      "require": "./dist/runtime.cjs",
      "types": "./dist/runtime.d.ts"
    }
  }
}
```

### 9. 使用流程

#### 9.1 开发时代码生成

```bash
# 1. 安装工具
npm install -D proto2fetch

# 2. 生成代码
npx proto2fetch generate --config proto2fetch.config.js

# 3. 使用生成的客户端
import { CleanGoAPIClient } from './generated/client';
```

#### 9.2 生产环境使用

```typescript
import { CleanGoAPIClient } from 'my-api-client';

const client = new CleanGoAPIClient({
  baseUrl: 'https://api.example.com',
  auth: {
    token: 'your-auth-token'
  }
});

// 类型安全的 API 调用
const users = await client.getUsers({
  pagination: { page: 1, size: 10 },
  filter: { isActive: true }
});
```

## 技术选型理由

1. **ky vs axios**: ky 更现代、更轻量，原生支持 TypeScript，基于 Fetch API
2. **protobuf.js**: 成熟的 JavaScript protobuf 库，支持运行时解析
3. **Rollup**: 更适合库的构建，tree-shaking 友好
4. **Vitest**: 快速的测试框架，与 Vite 生态集成良好

## 性能考虑

1. **代码分割**: 运行时和生成代码分离，按需加载
2. **Tree Shaking**: 支持未使用的 API 方法被优化掉
3. **类型优化**: 生成的类型尽可能简洁高效
4. **缓存机制**: 可配置的请求缓存减少重复请求

## 扩展性设计

1. **插件系统**: 支持自定义代码生成器扩展
2. **中间件**: 支持请求/响应中间件
3. **多协议支持**: 预留 gRPC-Web 支持的可能性
4. **多语言**: 架构支持扩展到其他目标语言

这个设计方案将为您的 Clean Go Backend API 提供完整的前端调用解决方案，确保类型安全、开发效率和用户体验的完美平衡。