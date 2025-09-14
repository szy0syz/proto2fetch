import { describe, it, expect, beforeEach } from 'vitest';
import { TypeScriptTypeGenerator } from '../src/generator/type-generator.js';
import type { ParsedSchema, ProtoMessage, ProtoField } from '../src/types/index.js';

describe('TypeScriptTypeGenerator', () => {
  let generator: TypeScriptTypeGenerator;

  beforeEach(() => {
    generator = new TypeScriptTypeGenerator();
  });

  describe('generateTypes', () => {
    it('should generate TypeScript interfaces from protobuf messages', () => {
      const schema: ParsedSchema = {
        files: [{
          package: 'test',
          services: [],
          messages: [
            {
              name: 'User',
              fields: [
                {
                  name: 'id',
                  type: 'string',
                  repeated: false,
                  optional: false,
                  number: 1
                },
                {
                  name: 'name',
                  type: 'string',
                  repeated: false,
                  optional: false,
                  number: 2
                },
                {
                  name: 'email',
                  type: 'string',
                  repeated: false,
                  optional: true,
                  number: 3
                },
                {
                  name: 'tags',
                  type: 'string',
                  repeated: true,
                  optional: false,
                  number: 4
                }
              ]
            }
          ],
          imports: []
        }]
      };

      const result = generator.generateTypes(schema);
      
      expect(result).toContain('export interface User');
      expect(result).toContain('id: string;');
      expect(result).toContain('name: string;');
      expect(result).toContain('email?: string;');
      expect(result).toContain('tags: string[];');
    });

    it('should handle different protobuf types correctly', () => {
      const schema: ParsedSchema = {
        files: [{
          package: 'test',
          services: [],
          messages: [
            {
              name: 'TestTypes',
              fields: [
                { name: 'str_field', type: 'string', repeated: false, optional: false, number: 1 },
                { name: 'int32_field', type: 'int32', repeated: false, optional: false, number: 2 },
                { name: 'int64_field', type: 'int64', repeated: false, optional: false, number: 3 },
                { name: 'bool_field', type: 'boolean', repeated: false, optional: false, number: 4 },
                { name: 'float_field', type: 'float', repeated: false, optional: false, number: 5 },
                { name: 'timestamp_field', type: 'Timestamp', repeated: false, optional: false, number: 6 }
              ]
            }
          ],
          imports: []
        }]
      };

      const result = generator.generateTypes(schema);
      
      expect(result).toContain('strField: string;');
      expect(result).toContain('int32Field: number;');
      expect(result).toContain('int64Field: bigint;');
      expect(result).toContain('boolField: boolean;');
      expect(result).toContain('floatField: number;');
      expect(result).toContain('timestampField: Date;');
    });

    it('should handle repeated fields correctly', () => {
      const schema: ParsedSchema = {
        files: [{
          package: 'test',
          services: [],
          messages: [
            {
              name: 'TestRepeated',
              fields: [
                { name: 'tenant_ids', type: 'uint64', repeated: true, optional: false, number: 1 },
                { name: 'user_ids', type: 'int64', repeated: true, optional: false, number: 2 },
                { name: 'tags', type: 'string', repeated: true, optional: false, number: 3 },
                { name: 'scores', type: 'float', repeated: true, optional: false, number: 4 }
              ]
            }
          ],
          imports: []
        }]
      };

      const result = generator.generateTypes(schema);
      
      expect(result).toContain('tenantIds: bigint[];'); // uint64 defaults to bigint
      expect(result).toContain('userIds: bigint[];');   // int64 defaults to bigint
      expect(result).toContain('tags: string[];');
      expect(result).toContain('scores: number[];');
    });

    it('should respect type mapping options', () => {
      const generatorWithOptions = new TypeScriptTypeGenerator({
        dateAsString: true,
        bigintAsString: true
      });

      const schema: ParsedSchema = {
        files: [{
          package: 'test',
          services: [],
          messages: [
            {
              name: 'TestTypes',
              fields: [
                { name: 'int64_field', type: 'int64', repeated: false, optional: false, number: 1 },
                { name: 'timestamp_field', type: 'Timestamp', repeated: false, optional: false, number: 2 }
              ]
            }
          ],
          imports: []
        }]
      };

      const result = generatorWithOptions.generateTypes(schema);
      
      expect(result).toContain('int64Field: string;');
      expect(result).toContain('timestampField: string;');
    });

    it('should convert snake_case to camelCase', () => {
      const schema: ParsedSchema = {
        files: [{
          package: 'test',
          services: [],
          messages: [
            {
              name: 'TestMessage',
              fields: [
                { name: 'first_name', type: 'string', repeated: false, optional: false, number: 1 },
                { name: 'last_name', type: 'string', repeated: false, optional: false, number: 2 },
                { name: 'created_at', type: 'Timestamp', repeated: false, optional: false, number: 3 }
              ]
            }
          ],
          imports: []
        }]
      };

      const result = generator.generateTypes(schema);
      
      expect(result).toContain('firstName: string;');
      expect(result).toContain('lastName: string;');
      expect(result).toContain('createdAt: Date;');
    });
  });

  describe('generateFilterBuilders', () => {
    it('should generate filter builder classes', () => {
      const messages: ProtoMessage[] = [
        {
          name: 'UserFilter',
          fields: [
            { name: 'name', type: 'string', repeated: false, optional: true, number: 1 },
            { name: 'email', type: 'string', repeated: false, optional: true, number: 2 },
            { name: 'created_at', type: 'Timestamp', repeated: false, optional: true, number: 3 }
          ]
        }
      ];

      const result = generator.generateFilterBuilders(messages);
      
      expect(result).toContain('export class UserFilterBuilder');
      expect(result).toContain('name(value: string): this');
      expect(result).toContain('nameLike(value: string): this');
      expect(result).toContain('createdAtAfter(value: Date): this');
      expect(result).toContain('createdAtBefore(value: Date): this');
      expect(result).toContain('build(): UserFilter');
    });

    it('should handle repeated fields in filter builders correctly', () => {
      const messages: ProtoMessage[] = [
        {
          name: 'TestFilter',
          fields: [
            { name: 'tenant_ids', type: 'uint64', repeated: true, optional: true, number: 1 },
            { name: 'user_ids', type: 'int64', repeated: true, optional: true, number: 2 },
            { name: 'tags', type: 'string', repeated: true, optional: true, number: 3 },
            { name: 'scores', type: 'float', repeated: true, optional: true, number: 4 }
          ]
        }
      ];

      const result = generator.generateFilterBuilders(messages);
      
      expect(result).toContain('export class TestFilterBuilder');
      expect(result).toContain('tenantIds(value: bigint[]): this');   // uint64[] -> bigint[]
      expect(result).toContain('userIds(value: bigint[]): this');     // int64[] -> bigint[]
      expect(result).toContain('tags(value: string[]): this');
      expect(result).toContain('scores(value: number[]): this');      // float[] -> number[]
      expect(result).toContain('build(): TestFilter');
    });

    it('should respect type mapping options in filter builders', () => {
      const generatorWithOptions = new TypeScriptTypeGenerator({
        bigintAsString: true
      });

      const messages: ProtoMessage[] = [
        {
          name: 'TestFilter',
          fields: [
            { name: 'tenant_ids', type: 'uint64', repeated: true, optional: true, number: 1 },
            { name: 'user_ids', type: 'int64', repeated: true, optional: true, number: 2 }
          ]
        }
      ];

      const result = generatorWithOptions.generateFilterBuilders(messages);
      
      expect(result).toContain('tenantIds(value: string[]): this');  // uint64[] -> string[] (with option)
      expect(result).toContain('userIds(value: string[]): this');    // int64[] -> string[] (with option)
    });
  });

  describe('generateSortBuilders', () => {
    it('should generate sort builder classes', () => {
      const messages: ProtoMessage[] = [
        {
          name: 'UserSort',
          fields: []
        }
      ];

      const result = generator.generateSortBuilders(messages);

      expect(result).toContain('export class UserSortBuilder');
      expect(result).toContain('byId(direction: \'asc\' | \'desc\' = \'asc\'): this');
      expect(result).toContain('byName(direction: \'asc\' | \'desc\' = \'asc\'): this');
      expect(result).toContain('byCreatedAt(direction: \'asc\' | \'desc\' = \'asc\'): this');
      expect(result).toContain('build(): SortDirection[]');
    });

    it('should detect when sort is used as repeated field', () => {
      const messages: ProtoMessage[] = [
        {
          name: 'UserSort',
          fields: []
        },
        {
          name: 'GetUsersRequest',
          fields: [
            { name: 'sort', type: 'UserSort', repeated: true, optional: false, number: 1 }
          ]
        },
        {
          name: 'GetPostsRequest',
          fields: [
            { name: 'sort', type: 'UserSort', repeated: false, optional: true, number: 1 }
          ]
        }
      ];

      const result = generator.generateSortBuilders(messages);

      // Should still generate array-based builder regardless of repeated status
      // because SortBuilder is designed to support multiple sorting criteria
      expect(result).toContain('export class UserSortBuilder');
      expect(result).toContain('private sorts: SortDirection[] = [];');
      expect(result).toContain('this.sorts.push({ field:');
      expect(result).toContain('build(): SortDirection[]');
    });

    it('should generate sortable fields from message fields if available', () => {
      const messages: ProtoMessage[] = [
        {
          name: 'CustomSort',
          fields: [
            { name: 'priority', type: 'string', repeated: false, optional: false, number: 1 },
            { name: 'status', type: 'string', repeated: false, optional: false, number: 2 }
          ]
        }
      ];

      const result = generator.generateSortBuilders(messages);

      expect(result).toContain('export class CustomSortBuilder');
      expect(result).toContain('byPriority(direction: \'asc\' | \'desc\' = \'asc\'): this');
      expect(result).toContain('byStatus(direction: \'asc\' | \'desc\' = \'asc\'): this');
      expect(result).toContain('this.sorts.push({ field: \'priority\', direction });');
      expect(result).toContain('this.sorts.push({ field: \'status\', direction });');
    });

    it('should fallback to common sortable fields when message has no fields', () => {
      const messages: ProtoMessage[] = [
        {
          name: 'EmptySort',
          fields: []
        }
      ];

      const result = generator.generateSortBuilders(messages);

      expect(result).toContain('export class EmptySortBuilder');
      // Should use fallback common fields
      expect(result).toContain('byId(direction: \'asc\' | \'desc\' = \'asc\'): this');
      expect(result).toContain('byName(direction: \'asc\' | \'desc\' = \'asc\'): this');
      expect(result).toContain('byCreatedAt(direction: \'asc\' | \'desc\' = \'asc\'): this');
    });
  });

  describe('utility types', () => {
    it('should include utility types in generated output', () => {
      const schema: ParsedSchema = {
        files: [{
          package: 'test',
          services: [],
          messages: [],
          imports: []
        }]
      };

      const result = generator.generateTypes(schema);
      
      expect(result).toContain('export interface Pagination');
      expect(result).toContain('export interface ErrorDetail');
      expect(result).toContain('export interface ErrorResponse');
      expect(result).toContain('export interface SuccessResponse');
      expect(result).toContain('export interface PaginatedRequest');
      expect(result).toContain('export interface PaginatedResponse');
    });
  });
});