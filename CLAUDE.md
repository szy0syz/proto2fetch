# CLAUDE.md - proto2fetch 项目指南

## 项目概述

**proto2fetch** 是一个专业级的代码生成工具，用于将 protobuf 定义文件转换为 TypeScript 友好的 API 客户端。该项目基于现代化的 ky HTTP 客户端库，为浏览器端应用提供类型安全的 API 调用体验。

### 🎯 核心功能
- 从 protobuf 自动生成 TypeScript API 客户端
- 类型安全的 HTTP 请求体验
- 支持认证、错误处理、分页等企业级特性
- 智能的 Sort 类型处理和 Builder 生成

## 🏗️ 项目架构

```
proto2fetch/
├── src/
│   ├── generator/          # 代码生成器核心
│   ├── runtime/            # 运行时库 (HTTP客户端、认证、错误处理)
│   ├── types/              # 通用类型定义
│   └── cli.ts              # 命令行工具
├── tests/                  # 测试文件
└── dist/                   # 构建产物
```

## 🔧 技术栈

- **TypeScript** (严格模式) + **ky** (HTTP 客户端) + **protobufjs** + **Rollup** + **Vitest**

## 📦 包结构

- **主包**: `proto2fetch` (完整功能)
- **子包**: `proto2fetch/runtime` (仅运行时), `proto2fetch/generator` (仅生成器)
- **CLI**: `dist/cli.cjs`

## 🛠️ 开发命令

```bash
pnpm install              # 安装依赖
pnpm run build            # 生产构建
pnpm test                 # 运行测试
pnpm run type-check       # 类型检查
pnpm run lint            # 代码规范检查
```

## 🎯 核心功能模块

### 1. protobuf 解析器 (`src/generator/parser.ts`)
- 递归解析 `.proto` 文件
- 提取服务定义和 HTTP 注解
- 处理消息类型和字段定义

### 2. TypeScript 类型生成器 (`src/generator/type-generator.ts`)
**🆕 智能特性**:
- **智能 Sort 类型检测**: 自动检测 proto 中 Sort message 的使用方式（是否为 `repeated`）
- **灵活的 SortBuilder 设计**: 始终支持多个排序条件，内部使用 `SortDirection[]` 数组
- **字段智能识别**: 优先从 Sort message 字段生成方法，回退到常见字段

**类型映射规则**:
```typescript
string → string, bool → boolean, int32/float → number
int64/uint64 → bigint | string (可配置)
repeated → Array<T>, optional → T | undefined
```

### 3. 运行时库 (`src/runtime/`)

#### 认证管理 (`auth.ts`)
支持多种认证方式和动态token管理:
- **SimpleAuth**: Bearer Token, API Key, Paseto 等
- **JWTAuth**: JWT 认证，含过期检查和自动刷新
- **CustomAuth**: 完全自定义认证逻辑
- **动态更新**: `updateToken()` 方法支持用户登录后更新认证

#### HTTP 客户端 (`client.ts`)
- 基于 ky 的统一请求接口
- 自动 JSON 序列化/反序列化
- 认证集成和错误处理

## 🎛️ CLI 工具使用

```bash
# 基础使用
node dist/cli.cjs --proto-path ./proto --output-dir ./generated --base-url https://api.example.com

# 配置文件
node dist/cli.cjs --config proto2fetch.config.js
```

### 配置文件示例
```javascript
module.exports = {
  protoPath: './proto',
  outputDir: './generated',
  baseUrl: 'https://api.example.com',
  clientName: 'MyAPIClient',
  generateFilterBuilders: true,
  generateSortBuilders: true,
  dateType: 'Date',
  bigintType: 'string'
};
```

## 🧪 测试策略

### 测试覆盖
- **单元测试**: 各模块核心功能
- **集成测试**: 完整生成流程
- **特性测试**: 智能 Sort 类型检测等新功能

### 重要测试用例 (`tests/type-generator.test.ts`)
- `should detect when sort is used as repeated field`: 测试 repeated 字段检测
- `should generate sortable fields from message fields if available`: 测试字段智能识别
- `should fallback to common sortable fields when message has no fields`: 测试回退机制

## 🐛 常见问题

1. **TypeScript 严格模式错误**: 确保 `exactOptionalPropertyTypes: false`
2. **protobuf 解析失败**: 提供完整的标准库文件路径
3. **认证 token 失效**: 使用 `refreshTokenHandler` 自动刷新

## 🚀 使用示例

### 认证配置
```typescript
// JWT 认证
const client = new CleanGoAPIClient({
  baseUrl: 'https://api.example.com',
  auth: new JWTAuth('your-jwt-token', {
    onExpired: async () => await refreshToken()
  })
});

// 动态认证更新
function userLogin(token: string) {
  client.updateAuthToken(token);
}
```

### Sort Builder 使用
```typescript
// 单个排序
const sort1 = new UserSortBuilder().byName('desc').build();

// 多个排序
const sort2 = new UserSortBuilder()
  .byName('desc')
  .byCreatedAt('asc')
  .build();

// API 调用
const users = await client.getUsers({
  pagination: { page: 1, size: 10 },
  filter: { isActive: true },
  sort: sort2
});
```

## 📋 功能状态

### ✅ 已完成
- [x] protobuf 解析和 HTTP 注解支持
- [x] 动态认证管理和类型安全客户端
- [x] **智能的 Sort 类型处理**（根据 proto `repeated` 字段检测）
- [x] 完整测试覆盖

### 🔄 计划中
- [ ] 错误处理优化
- [ ] CLI 工具改进
- [ ] gRPC-Web 支持

## 🤝 开发指南

### 环境要求
- Node.js >= 18.0.0, pnpm, TypeScript >= 5.0

### 代码风格
- TypeScript 严格模式
- ESLint 规范
- 有意义的命名和 JSDoc 注释

---

**注意**: 这是一个生产就绪的工具，已经过完整的设计、实现和测试，专门为 Clean Go Backend API 优化。