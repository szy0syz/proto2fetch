// 自动生成的类型文件
export interface User {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface CreateUserResponse {
  user: User;
}

export interface GetUsersRequest {
  pagination?: {
    page: number;
    size: number;
  };
  filter?: {
    isActive?: boolean;
    nameLike?: string;
  };
  sort?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
}

export interface GetUsersResponse {
  users: User[];
  total: number;
}

export interface UpdateUserRequest {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface UpdateUserResponse {
  user: User;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
}

export interface ValidateTokenRequest {
  token: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
}

export interface AssignRoleRequest {
  userId: string;
  roleId: string;
}

export interface CheckPermissionRequest {
  userId: string;
  resource: string;
  action: string;
}

export interface CheckPermissionResponse {
  allowed: boolean;
}

export interface BatchAssignRolesRequest {
  userId: string;
  roleIds: string[];
}

export interface BatchAddPermissionsRequest {
  roleId: string;
  permissions: Array<{
    resource: string;
    action: string;
  }>;
}

// 过滤器构建器类
export class UserFilterBuilder {
  private _filter: any = {};

  name(name: string): this {
    this._filter.nameLike = name;
    return this;
  }

  isActive(isActive: boolean): this {
    this._filter.isActive = isActive;
    return this;
  }

  createdAfter(date: Date): this {
    this._filter.createdAfter = date;
    return this;
  }

  build(): any {
    return { ...this._filter };
  }
}

// 排序构建器类
export class UserSortBuilder {
  private _sort: any[] = [];

  byCreatedAt(direction: 'asc' | 'desc'): this {
    this._sort.push({ field: 'created_at', direction });
    return this;
  }

  byName(direction: 'asc' | 'desc'): this {
    this._sort.push({ field: 'name', direction });
    return this;
  }

  build(): any[] {
    return [...this._sort];
  }
}