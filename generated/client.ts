// 自动生成的API客户端
import type * as Types from './types.js';

interface ClientConfig {
  baseUrl: string;
  auth?: {
    token: string;
    tokenType?: string;
  };
  timeout?: number;
  retry?: {
    limit: number;
    statusCodes: number[];
  };
}

export class CleanGoAPIClient {
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
  }

  updateAuthToken(token: string): void {
    if (!this.config.auth) {
      this.config.auth = { token };
    } else {
      this.config.auth.token = token;
    }
  }

  async createUser(request: Types.CreateUserRequest): Promise<Types.CreateUserResponse> {
    // 实际实现会发送HTTP请求
    return {
      user: {
        id: '123',
        name: request.name,
        email: request.email,
        phone: request.phone,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };
  }

  async getCurrentUser(request: {}): Promise<Types.CreateUserResponse> {
    return {
      user: {
        id: '123',
        name: 'Current User',
        email: 'current@example.com',
        isActive: true
      }
    };
  }

  async getUsers(request: Types.GetUsersRequest): Promise<Types.GetUsersResponse> {
    return {
      users: [],
      total: 0
    };
  }

  async updateUser(request: Types.UpdateUserRequest): Promise<Types.UpdateUserResponse> {
    return {
      user: {
        id: request.id,
        name: request.name,
        email: request.email,
        phone: request.phone,
        isActive: true
      }
    };
  }

  async login(request: Types.LoginRequest): Promise<Types.LoginResponse> {
    return {
      token: 'mock-jwt-token',
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    };
  }

  async validateToken(request: Types.ValidateTokenRequest): Promise<Types.ValidateTokenResponse> {
    return {
      valid: true
    };
  }

  async assignRole(request: Types.AssignRoleRequest): Promise<void> {
    // Mock implementation
  }

  async checkPermission(request: Types.CheckPermissionRequest): Promise<Types.CheckPermissionResponse> {
    return {
      allowed: true
    };
  }

  async batchAssignRoles(request: Types.BatchAssignRolesRequest): Promise<void> {
    // Mock implementation
  }

  async batchAddPermissions(request: Types.BatchAddPermissionsRequest): Promise<void> {
    // Mock implementation
  }
}