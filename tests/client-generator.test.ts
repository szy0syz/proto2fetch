import { describe, it, expect, beforeEach } from 'vitest';
import { APIClientGenerator } from '../src/generator/client-generator.js';
import type { ParsedSchema, ProtoService, ProtoMethod, ProtoMessage, ClientGeneratorOptions } from '../src/types/index.js';

describe('APIClientGenerator', () => {
  let generator: APIClientGenerator;
  let options: ClientGeneratorOptions;

  beforeEach(() => {
    options = {
      clientName: 'TestAPIClient',
      baseUrl: 'https://api.test.com',
      generateComments: true,
      generateFilterBuilders: true,
      generateSortBuilders: true
    };
    generator = new APIClientGenerator(options);
  });

  describe('generateClient', () => {
    it('should generate a complete API client class', () => {
      const schema: ParsedSchema = {
        files: [{
          package: 'test',
          services: [{
            name: 'UserService',
            description: 'User management service',
            methods: [{
              name: 'CreateUser',
              description: 'Create a new user',
              inputType: 'CreateUserRequest',
              outputType: 'CreateUserResponse',
              httpMethod: 'POST',
              httpPath: '/api/v1/users'
            }]
          }],
          messages: [],
          imports: []
        }]
      };

      const result = generator.generateClient(schema);

      // Check header and imports
      expect(result).toContain('// This file is auto-generated. Do not edit manually.');
      expect(result).toContain('import type { APIClient, RequestOptions } from \'proto2fetch/runtime\';');
      expect(result).toContain('import * as Types from \'./types.js\';');

      // Check class definition
      expect(result).toContain('export class TestAPIClient {');
      expect(result).toContain('private client: APIClient;');

      // Check constructor
      expect(result).toContain('constructor(config?: Partial<import(\'proto2fetch/runtime\').APIClientConfig>) {');
      expect(result).toContain('const defaultBaseUrl = \'https://api.test.com\';');

      // Check method generation
      expect(result).toContain('async createUser(request: Types.CreateUserRequest, options?: RequestOptions): Promise<Types.CreateUserResponse> {');

      // Check factory function
      expect(result).toContain('export function createTestAPIClient(config?: Partial<import(\'proto2fetch/runtime\').APIClientConfig>): TestAPIClient {');
      expect(result).toContain('export default TestAPIClient;');
    });

    it('should generate correct method signatures with Types. prefix', () => {
      const schema: ParsedSchema = {
        files: [{
          package: 'test',
          services: [{
            name: 'UserService',
            methods: [
              {
                name: 'GetUser',
                inputType: 'GetUserRequest',
                outputType: 'GetUserResponse',
                httpMethod: 'GET',
                httpPath: '/api/v1/users/{id}'
              },
              {
                name: 'UpdateUser',
                inputType: 'UpdateUserRequest',
                outputType: 'UpdateUserResponse',
                httpMethod: 'PUT',
                httpPath: '/api/v1/users/{id}'
              },
              {
                name: 'DeleteUser',
                inputType: 'DeleteUserRequest',
                outputType: 'DeleteUserResponse',
                httpMethod: 'DELETE',
                httpPath: '/api/v1/users/{id}'
              }
            ]
          }]
        }]
      };

      const result = generator.generateClient(schema);

      // Check that all request types have Types. prefix
      expect(result).toContain('async getUser(request: Types.GetUserRequest, options?: RequestOptions): Promise<Types.GetUserResponse>');
      expect(result).toContain('async updateUser(request: Types.UpdateUserRequest, options?: RequestOptions): Promise<Types.UpdateUserResponse>');
      expect(result).toContain('async deleteUser(request: Types.DeleteUserRequest, options?: RequestOptions): Promise<Types.DeleteUserResponse>');

      // Check that all client.request calls have Types. prefix in generic
      expect(result).toContain('return this.client.request<Types.GetUserResponse>(\'GET\'');
      expect(result).toContain('return this.client.request<Types.UpdateUserResponse>(\'PUT\'');
      expect(result).toContain('return this.client.request<Types.DeleteUserResponse>(\'DELETE\'');
    });

    it('should handle GET requests with query parameters correctly', () => {
      const schema: ParsedSchema = {
        files: [{
          package: 'test',
          services: [{
            name: 'UserService',
            methods: [{
              name: 'GetUsers',
              inputType: 'GetUsersRequest',
              outputType: 'GetUsersResponse',
              httpMethod: 'GET',
              httpPath: '/api/v1/users'
            }]
          }]
        }]
      };

      const result = generator.generateClient(schema);

      expect(result).toContain('const searchParams = this.client.objectToSearchParams(request);');
      expect(result).toContain('return this.client.request<Types.GetUsersResponse>(\'GET\', path, undefined, {');
      expect(result).toContain('searchParams,');
    });

    it('should handle path parameters correctly', () => {
      const schema: ParsedSchema = {
        files: [{
          package: 'test',
          services: [{
            name: 'UserService',
            methods: [{
              name: 'UpdateUser',
              inputType: 'UpdateUserRequest',
              outputType: 'UpdateUserResponse',
              httpMethod: 'PUT',
              httpPath: '/api/v1/users/{id}'
            }]
          }]
        }]
      };

      const result = generator.generateClient(schema);

      expect(result).toContain('const path = `/api/v1/users/${request.id}`;');
      expect(result).toContain('const { id, ...body } = request;');
      expect(result).toContain('return this.client.request<Types.UpdateUserResponse>(\'PUT\', path, body, options);');
    });

    it('should convert method names to camelCase', () => {
      const schema: ParsedSchema = {
        files: [{
          package: 'test',
          services: [{
            name: 'UserService',
            methods: [{
              name: 'CreateUserAccount',
              inputType: 'CreateUserAccountRequest',
              outputType: 'CreateUserAccountResponse',
              httpMethod: 'POST',
              httpPath: '/api/v1/user-accounts'
            }]
          }]
        }]
      };

      const result = generator.generateClient(schema);

      expect(result).toContain('async createUserAccount(');
    });
  });

  describe('generateHelperMethods', () => {
    it('should generate pagination helpers', () => {
      const schema: ParsedSchema = {
        files: [{
          package: 'test',
          services: [],
          messages: [],
          imports: []
        }]
      };

      const result = generator.generateHelperMethods(schema);

      expect(result).toContain('export function createPagination(page: number = 1, size: number = 10): Types.Pagination');
      expect(result).toContain('export function createPaginatedRequest<TFilter = any, TSort = any>');
    });

    it('should generate filter helpers without duplicates', () => {
      const schema: ParsedSchema = {
        files: [{
          package: 'test',
          services: [],
          messages: [
            {
              name: 'UserFilter',
              fields: [
                { name: 'name', type: 'string', repeated: false, optional: true, number: 1 }
              ]
            },
            // Simulate duplicate message (should be filtered out)
            {
              name: 'UserFilter',
              fields: [
                { name: 'name', type: 'string', repeated: false, optional: true, number: 1 }
              ]
            }
          ],
          imports: []
        }]
      };

      const result = generator.generateHelperMethods(schema);

      // Should only generate one createUserFilter function
      const matches = result.match(/export function createUserFilter\(\)/g);
      expect(matches?.length).toBe(1);
      
      expect(result).toContain('export function createUserFilter(): Types.UserFilterBuilder {');
      expect(result).toContain('return new Types.UserFilterBuilder();');
    });

    it('should generate sort helpers without duplicates', () => {
      const schema: ParsedSchema = {
        files: [{
          package: 'test',
          services: [],
          messages: [
            {
              name: 'UserSort',
              fields: []
            },
            // Simulate duplicate message (should be filtered out)
            {
              name: 'UserSort',
              fields: []
            }
          ],
          imports: []
        }]
      };

      const result = generator.generateHelperMethods(schema);

      // Should only generate one createUserSort function
      const matches = result.match(/export function createUserSort\(\)/g);
      expect(matches?.length).toBe(1);

      expect(result).toContain('export function createUserSort(): Types.UserSortBuilder {');
      expect(result).toContain('return new Types.UserSortBuilder();');
    });

    it('should not generate filter builders when disabled', () => {
      const optionsWithoutFilters = { ...options, generateFilterBuilders: false };
      const generatorWithoutFilters = new APIClientGenerator(optionsWithoutFilters);

      const schema: ParsedSchema = {
        files: [{
          package: 'test',
          services: [],
          messages: [
            {
              name: 'UserFilter',
              fields: [
                { name: 'name', type: 'string', repeated: false, optional: true, number: 1 }
              ]
            }
          ],
          imports: []
        }]
      };

      const result = generatorWithoutFilters.generateHelperMethods(schema);

      expect(result).not.toContain('createUserFilter');
    });

    it('should not generate sort builders when disabled', () => {
      const optionsWithoutSorts = { ...options, generateSortBuilders: false };
      const generatorWithoutSorts = new APIClientGenerator(optionsWithoutSorts);

      const schema: ParsedSchema = {
        files: [{
          package: 'test',
          services: [],
          messages: [
            {
              name: 'UserSort',
              fields: []
            }
          ],
          imports: []
        }]
      };

      const result = generatorWithoutSorts.generateHelperMethods(schema);

      expect(result).not.toContain('createUserSort');
    });
  });

  describe('edge cases', () => {
    it('should handle empty services gracefully', () => {
      const schema: ParsedSchema = {
        files: [{
          package: 'test',
          services: [],
          messages: [],
          imports: []
        }]
      };

      const result = generator.generateClient(schema);

      expect(result).toContain('export class TestAPIClient {');
      expect(result).toContain('constructor(');
      expect(result).not.toContain('async ');
    });

    it('should handle complex path parameters', () => {
      const schema: ParsedSchema = {
        files: [{
          package: 'test',
          services: [{
            name: 'ResourceService',
            methods: [{
              name: 'UpdateResource',
              inputType: 'UpdateResourceRequest',
              outputType: 'UpdateResourceResponse',
              httpMethod: 'PUT',
              httpPath: '/api/v1/users/{user_id}/resources/{resource_id}'
            }]
          }]
        }]
      };

      const result = generator.generateClient(schema);

      expect(result).toContain('const path = `/api/v1/users/${request.userId}/resources/${request.resourceId}`;');
      expect(result).toContain('const { userId, resourceId, ...body } = request;');
    });

    it('should respect base URL configuration', () => {
      const optionsWithoutBaseUrl = { ...options, baseUrl: '' };
      const generatorWithoutBaseUrl = new APIClientGenerator(optionsWithoutBaseUrl);

      const schema: ParsedSchema = {
        files: [{
          package: 'test',
          services: [],
          messages: [],
          imports: []
        }]
      };

      const result = generatorWithoutBaseUrl.generateClient(schema);

      expect(result).toContain('const defaultBaseUrl = `${typeof window !== \'undefined\' ? window.location.origin : \'http://localhost:3000\'}`;');
    });
  });
});