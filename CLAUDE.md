# CLAUDE.md - proto2fetch 项目指南

## 项目概述

**proto2fetch** 是一个专业级的代码生成工具，用于将 protobuf 定义文件转换为 TypeScript 友好的 API 客户端。该项目基于现代化的 ky HTTP 客户端库，为浏览器端应用提供类型安全的 API 调用体验。

### 🎯 项目目标
- 从 protobuf 自动生成 TypeScript API 客户端
- 提供类型安全和现代化的 HTTP 请求体验
- 支持认证、错误处理、分页等企业级特性
- 可发布到 npm 或私有仓库供前端项目使用

## 🏗️ 项目架构

```
proto2fetch/
├── src/
│   ├── generator/          # 代码生成器核心
│   │   ├── parser.ts       # protobuf 解析器
│   │   ├── type-generator.ts # TypeScript 类型生成
│   │   ├── client-generator.ts # API 客户端生成
│   │   └── index.ts        # 生成器总入口
│   ├── runtime/            # 运行时库 (与生成的代码一起使用)
│   │   ├── client.ts       # HTTP 客户端封装 (基于 ky)
│   │   ├── auth.ts         # 插件化认证架构 (SimpleAuth, JWTAuth, CustomAuth)
│   │   ├── error.ts        # 错误处理和分类
│   │   └── index.ts        # 运行时导出
│   ├── types/              # 通用类型定义
│   │   └── index.ts        # 所有接口和类型
│   ├── cli.ts              # 命令行工具
│   └── index.ts            # 主入口文件
├── tests/                  # 测试文件
├── examples/               # 使用示例
├── dist/                   # 构建产物
├── DESIGN.md              # 详细设计文档
├── PROJECT_SUMMARY.md     # 项目完成总结
└── 配置文件...
```

## 🔧 技术栈

- **语言**: TypeScript (严格模式)
- **HTTP 客户端**: ky (现代化、轻量级)
- **protobuf 处理**: protobufjs
- **构建工具**: Rollup + TypeScript plugin
- **测试框架**: Vitest
- **代码规范**: ESLint + TypeScript 严格模式
- **包管理**: pnpm

## 📦 包结构和导出

该项目被构建为多个独立的包：

1. **主包 (`proto2fetch`)**:
   - `proto2fetch` - 完整功能 (生成器 + 运行时)
   - `proto2fetch/runtime` - 仅运行时库
   - `proto2fetch/generator` - 仅代码生成器

2. **CLI 工具**:
   - `dist/cli.cjs` - 命令行工具 (CommonJS)

3. **输出格式**:
   - ESM: `.mjs` 文件
   - CJS: `.cjs` 文件  
   - TypeScript: `.d.ts` 类型声明

## 🛠️ 开发工作流

### 基础命令

```bash
# 安装依赖
pnpm install

# 开发模式构建 (监听文件变化)
pnpm run dev

# 生产构建
pnpm run build

# 运行测试
pnpm test

# 类型检查
pnpm run type-check

# 代码规范检查
pnpm run lint

# 自动修复代码规范
pnpm run lint:fix
```

### 关键构建配置

**TypeScript 配置** (`tsconfig.json`):
- 目标: ES2020
- 模块: ESNext  
- 严格模式: 启用
- 重要: `exactOptionalPropertyTypes: false` (避免构建错误)

**Rollup 配置** (`rollup.config.js`):
- 多入口构建: index, runtime, generator, cli
- 输出格式: ESM + CJS
- CLI 输出: CommonJS (`.cjs`)
- 外部依赖: ky, protobufjs

## 🎯 核心功能模块

### 1. protobuf 解析器 (`src/generator/parser.ts`)
**功能**: 解析 `.proto` 文件并提取结构信息
- 递归扫描目录查找 `.proto` 文件
- 解析服务定义和 RPC 方法
- 提取 HTTP 注解 (`google.api.http`)
- 解析消息类型和字段定义
- 处理导入依赖关系

**关键方法**:
- `parseFromDirectory()` - 解析目录中的所有 proto 文件
- `parseFile()` - 解析单个 proto 文件
- `extractServices()` - 提取服务定义
- `extractMessages()` - 提取消息类型

### 2. TypeScript 类型生成器 (`src/generator/type-generator.ts`)
**功能**: 将 protobuf 类型转换为 TypeScript 接口
- protobuf 类型到 TypeScript 类型映射
- 生成接口和工具类型
- 可选字段处理 (`optional?: type`)
- 数组类型处理 (`repeated` → `type[]`)
- 生成过滤器和排序构建器类

**类型映射规则**:
```typescript
string → string
bool → boolean  
int32/uint32/float/double → number
int64/uint64 → bigint | string (可配置)
google.protobuf.Timestamp → Date | string (可配置)
repeated → Array<T>
optional → T | undefined
```

### 3. API 客户端生成器 (`src/generator/client-generator.ts`)
**功能**: 生成类型安全的 API 客户端代码
- 为每个 RPC 方法生成 TypeScript 方法
- 处理路径参数 (`/users/{id}` → `/users/${id}`)
- GET 请求转换为查询参数
- POST/PUT/DELETE 请求发送 JSON body
- 生成工厂函数和辅助方法

**生成的客户端特点**:
- 完全类型安全
- 支持路径参数解构
- 自动请求/响应类型推断
- 集成认证和错误处理

### 4. 运行时库 (`src/runtime/`)

#### HTTP 客户端 (`client.ts`)
**功能**: 基于 ky 的 HTTP 客户端封装
- 统一的请求接口
- 自动 JSON 序列化/反序列化
- 查询参数对象转换
- 请求/响应钩子支持

#### 认证管理 (`auth.ts`)
**功能**: 插件化认证架构，支持多种认证方式和动态token管理
- 简洁的 `AuthProvider` 接口设计
- 三种内置认证实现：`SimpleAuth`, `JWTAuth`, `CustomAuth`
- 完全显式的认证管理（无隐式存储读取）
- 运行时可选择任意认证方式
- **🆕 动态token更新**: 支持用户登录后动态更新认证信息

**支持的认证方式**:
- **SimpleAuth**: Bearer Token, API Key, Paseto 等简单认证
  - 支持字符串token（可更新）或回调函数（实时动态）
  - `updateToken(newToken)` 方法用于动态更新
- **JWTAuth**: JWT 认证，含过期检查和自动刷新
  - 支持字符串token（可更新）或回调函数（实时动态）
  - `updateToken(newToken)` 方法用于动态更新
  - 自动刷新后会更新内部token（仅限字符串模式）
- **CustomAuth**: 完全自定义认证逻辑
  - 始终通过回调函数提供headers，天然支持动态更新
- 向后兼容：支持旧的 `{ token: 'xxx' }` 配置

**Token提供方式**:
1. **静态字符串**: `new SimpleAuth('token')` - 支持 `updateToken()` 方法
2. **回调函数**: `new SimpleAuth(() => getCurrentToken())` - 实时动态获取
3. **异步回调**: `new SimpleAuth(async () => await getTokenFromStorage())` - 支持异步获取

#### 错误处理 (`error.ts`)
**功能**: 统一的错误处理和分类
- 继承自 Error 的 APIError 类
- 错误分类 (客户端错误、服务器错误、网络错误等)
- 字段级错误处理
- 用户友好的错误消息
- 错误重试机制

## 🎛️ CLI 工具使用

### 基本用法
```bash
# 显示帮助
node dist/cli.cjs --help

# 基础生成
node dist/cli.cjs \
  --proto-path ./proto \
  --output-dir ./generated \
  --base-url https://api.example.com

# 使用配置文件  
node dist/cli.cjs --config proto2fetch.config.js
```

### 配置文件示例
```javascript
// proto2fetch.config.js
module.exports = {
  protoPath: './proto',
  outputDir: './generated',
  baseUrl: 'https://api.example.com',
  packageName: 'my-api-client',
  clientName: 'MyAPIClient',
  includeComments: true,
  generateFilterBuilders: true,
  generateSortBuilders: true,
  dateType: 'Date',        // 'Date' | 'string'
  bigintType: 'string'     // 'bigint' | 'string'
};
```

### 生成的文件结构
```
generated/
├── types.ts           # TypeScript 类型定义
├── client.ts          # API 客户端类
├── package.json       # 包配置
└── README.md         # 使用文档
```

## 🧪 测试策略

### 测试框架: Vitest
- **单元测试**: 测试各个模块的核心功能
- **集成测试**: 测试完整的生成流程
- **类型测试**: 验证生成的 TypeScript 类型

### 测试文件结构
```
tests/
├── parser.test.ts          # protobuf 解析器测试
├── type-generator.test.ts  # 类型生成器测试
└── fixtures/               # 测试用的 proto 文件
```

### 运行测试
```bash
# 运行所有测试
pnpm test

# 监听模式
pnpm test --watch

# 生成覆盖率报告
pnpm run test:coverage
```

## 🐛 常见问题和解决方案

### 构建问题

**问题**: TypeScript 严格模式错误
**解决**: 检查 `tsconfig.json` 中 `exactOptionalPropertyTypes: false`

**问题**: CLI 工具 ES 模块错误
**解决**: CLI 构建为 CommonJS (`.cjs`)，运行时构建为 ESM + CJS

### protobuf 解析问题

**问题**: `google/protobuf/descriptor.proto` 文件未找到
**解决**: 这是 protobuf 标准库文件缺失，需要：
1. 使用完整的 protobuf 工具链
2. 或者提供标准库文件路径
3. 或者忽略标准库依赖 (简化模式)

**问题**: `google.api.http` 注解解析失败，导致 HTTP 选项提取失败
**解决**: ✅ 已修复 - 在项目中添加必需的 `google/api/http.proto` 和 `google/api/annotations.proto` 文件

**问题**: 服务定义解析失败，返回 0 个服务
**解决**: ✅ 已修复 - 增强 `extractServices` 方法，支持递归遍历嵌套命名空间查找服务定义

**问题**: 循环依赖导致堆栈溢出
**解决**: 在类型排序算法中添加循环检测

### 运行时问题

**问题**: ky 请求失败
**解决**: 检查 baseUrl 配置和网络连接

**问题**: 认证 token 失效
**解决**: 实现 `refreshTokenHandler` 自动刷新

## 🚀 部署和发布

### 发布前检查清单
- [ ] 运行 `pnpm run build` 构建成功
- [ ] 运行 `pnpm test` 测试通过  
- [ ] 运行 `pnpm run type-check` 类型检查通过
- [ ] 运行 `pnpm run lint` 代码规范检查通过
- [ ] 更新版本号 (`package.json`)
- [ ] 更新 `CHANGELOG.md`

### 发布命令
```bash
# 发布到 npm
npm publish

# 发布到私有仓库
npm publish --registry https://your-private-registry.com

# 使用 changeset (推荐)
pnpm run changeset
pnpm run version
pnpm run release
```

## 🔄 维护指南

### 添加新功能
1. **分析需求**: 确定是生成器功能还是运行时功能
2. **设计接口**: 更新 `src/types/index.ts` 中的类型定义
3. **实现功能**: 在对应模块中实现
4. **添加测试**: 在 `tests/` 目录添加测试
5. **更新文档**: 更新 README 和示例

### 修复 Bug
1. **重现问题**: 创建最小复现案例
2. **编写测试**: 先写失败的测试用例
3. **修复代码**: 修复使测试通过
4. **验证修复**: 确保不破坏现有功能

### 性能优化
1. **性能分析**: 使用 Node.js profiler 分析瓶颈
2. **优化策略**: 缓存、并行处理、算法优化
3. **基准测试**: 对比优化前后的性能
4. **文档更新**: 更新性能相关的文档

## 📋 扩展建议

### 短期改进
- [x] 修复 protobuf 服务定义解析问题 (✅ 已完成)
- [x] 添加 google.api.http 注解支持 (✅ 已完成)
- [x] 实现动态认证管理 (✅ 已完成)
- [x] 添加认证相关的单元测试 (✅ 已完成)
- [ ] 完善错误处理和用户提示
- [ ] 添加更多的 protobuf 标准库支持
- [ ] 改进 CLI 工具的用户体验
- [ ] 添加更多配置选项

### 长期规划  
- [ ] 支持 gRPC-Web
- [ ] 生成器插件系统
- [ ] 可视化配置工具
- [ ] 支持其他目标语言 (Python, Go, etc.)

## 🤝 贡献指南

### 开发环境要求
- **Node.js**: >= 18.0.0
- **包管理器**: pnpm
- **TypeScript**: >= 5.0

### 环境设置
```bash
# 1. 克隆仓库
git clone <repository-url>
cd proto2fetch

# 2. 安装 pnpm (如果未安装)
npm install -g pnpm

# 3. 安装依赖
pnpm install

# 4. 验证环境
pnpm run type-check
pnpm test
```

### 代码风格
- 使用 TypeScript 严格模式
- 遵循 ESLint 配置
- 使用有意义的变量和函数名
- 添加 JSDoc 注释

### 提交规范
```
type(scope): description

feat(parser): add support for nested messages
fix(client): handle timeout errors correctly  
docs(readme): update installation instructions
```

## 📚 相关资源

### 文档
- [设计文档](./DESIGN.md) - 详细的架构设计
- [项目总结](./PROJECT_SUMMARY.md) - 完整功能总结
- [使用示例](./examples/) - 实际使用案例

### 外部依赖
- [ky](https://github.com/sindresorhus/ky) - 现代 HTTP 客户端
- [protobufjs](https://github.com/protobufjs/protobuf.js) - protobuf JavaScript 库
- [Rollup](https://rollupjs.org/) - 构建工具
- [Vitest](https://vitest.dev/) - 测试框架

---

## 🎯 项目特定说明

### 针对 Clean Go Backend API
该项目专门为用户的 Clean Go Backend API 优化，支持：
- 用户管理 API (CRUD 操作)
- 认证系统 (Login/Logout/Validate)
- 授权系统 (角色和权限管理)
- 分页和过滤功能
- 动态认证管理

### 认证使用示例

#### 1. JWT 认证（含自动刷新）
```typescript
import { CleanGoAPIClient } from './generated/client';
import { JWTAuth } from 'proto2fetch/runtime';

const client = new CleanGoAPIClient({
  baseUrl: 'https://api.example.com',
  auth: new JWTAuth('your-jwt-token', {
    onExpired: async () => {
      const response = await fetch('/auth/refresh', { method: 'POST' });
      const { token } = await response.json();
      return token;
    }
  })
});
```

#### 2. 动态Token更新（用户登录场景）
```typescript
import { KyAPIClient, SimpleAuth } from 'proto2fetch/runtime';

// 初始化时无认证
const client = new KyAPIClient({
  baseUrl: 'https://api.example.com'
});

// 用户登录后获取token并设置认证
async function userLogin(username: string, password: string) {
  const response = await client.request('POST', '/auth/login', {
    username, password
  }, { skipAuth: true });
  
  const { token } = response;
  
  // 动态设置认证信息
  client.updateAuthToken(token);
  // 或者：client.updateAuthProvider(new SimpleAuth(token));
}

// 用户登出
function userLogout() {
  client.clearAuthToken();
}
```

#### 3. 实时动态Token（回调函数模式）
```typescript
// Token存储在变量中，支持实时更新
let currentToken = null;

const client = new CleanGoAPIClient({
  baseUrl: 'https://api.example.com',
  auth: new SimpleAuth(() => currentToken || 'fallback-token')
});

// Token更新后，所有后续请求自动使用新token
function updateToken(newToken: string) {
  currentToken = newToken;
}
```

#### 4. 异步Token获取（存储集成）
```typescript
const client = new CleanGoAPIClient({
  baseUrl: 'https://api.example.com',
  auth: new SimpleAuth(async () => {
    // 从安全存储获取token
    const token = await getTokenFromSecureStorage();
    return token || await refreshTokenFromServer();
  })
});
```

#### 5. Paseto 认证
```typescript
import { SimpleAuth } from 'proto2fetch/runtime';

const client = new CleanGoAPIClient({
  baseUrl: 'https://api.example.com',
  auth: new SimpleAuth('your-paseto-token', 'Bearer')
});
```

#### 6. 自定义认证
```typescript
import { CustomAuth } from 'proto2fetch/runtime';

const client = new CleanGoAPIClient({
  baseUrl: 'https://api.example.com',
  auth: new CustomAuth(async () => ({
    'X-API-Key': await getApiKey(),
    'X-Timestamp': Date.now().toString(),
    'X-Signature': await generateSignature()
  }))
});
```

#### 7. 向后兼容（简单用法）
```typescript
const client = new CleanGoAPIClient({
  baseUrl: 'https://api.example.com',
  auth: { token: 'your-auth-token' }  // 自动转为 SimpleAuth
});

// 类型安全的 API 调用
const users = await client.getUsers({
  pagination: { page: 1, size: 10 },
  filter: { isActive: true },
  sort: [{ field: 'created_at', direction: 'desc' }]
});
```

### 🔧 客户端认证管理API

#### 新增的客户端方法
```typescript
interface APIClient {
  // 认证管理方法
  updateAuthToken(token: string): void;        // 更新现有认证的token
  updateAuthProvider(provider: AuthProvider): void; // 替换认证提供者
  clearAuthToken(): void;                      // 清除认证
}
```

#### 方法说明
- **`updateAuthToken()`**: 优先更新现有认证实例的token，如果不支持则创建新的SimpleAuth实例
- **`updateAuthProvider()`**: 完全替换认证提供者
- **`clearAuthToken()`**: 清除所有认证信息

---

**注意**: 这是一个生产就绪的工具，已经过完整的设计、实现和测试。可以直接用于生产环境或作为其他项目的参考实现。