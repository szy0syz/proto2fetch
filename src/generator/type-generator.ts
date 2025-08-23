import type {
  ParsedSchema,
  ProtoMessage,
  ProtoField,
  TypeMappingOptions
} from '../types/index.js';

export class TypeScriptTypeGenerator {
  // eslint-disable-next-line no-unused-vars
  constructor(private options: TypeMappingOptions = {}) {}

  generateTypes(schema: ParsedSchema): string {
    let output = this.generateHeader();
    
    // Generate message interfaces
    const allMessages = schema.files.flatMap(file => file.messages);
    const sortedMessages = this.sortMessagesByDependency(allMessages);
    
    for (const message of sortedMessages) {
      output += this.generateMessageInterface(message);
      output += '\n';
    }

    // Generate common utility types
    output += this.generateUtilityTypes();

    return output;
  }

  private generateHeader(): string {
    return `// This file is auto-generated. Do not edit manually.
// Generated from protobuf definitions

`;
  }

  private generateMessageInterface(message: ProtoMessage): string {
    let output = '';
    
    if (message.description) {
      output += `/**\n * ${message.description}\n */\n`;
    }
    
    output += `export interface ${message.name} {\n`;
    
    for (const field of message.fields) {
      output += this.generateFieldProperty(field);
    }
    
    output += '}\n';
    
    return output;
  }

  private generateFieldProperty(field: ProtoField): string {
    let output = '';
    
    if (field.description) {
      output += `  /**\n   * ${field.description}\n   */\n`;
    }
    
    const fieldName = this.toCamelCase(field.name);
    const fieldType = this.mapProtobufTypeToTypeScript(field.type, field.repeated);
    const optional = field.optional ? '?' : '';
    
    output += `  ${fieldName}${optional}: ${fieldType};\n`;
    
    return output;
  }

  private mapProtobufTypeToTypeScript(protoType: string, repeated: boolean): string {
    let tsType: string;

    switch (protoType) {
      case 'string':
        tsType = 'string';
        break;
      case 'boolean':
      case 'bool':
        tsType = 'boolean';
        break;
      case 'int32':
      case 'uint32':
      case 'float':
      case 'double':
        tsType = 'number';
        break;
      case 'int64':
      case 'uint64':
        tsType = this.options.bigintAsString ? 'string' : 'bigint';
        break;
      case 'bytes':
        tsType = 'Uint8Array';
        break;
      case 'Timestamp':
        tsType = this.options.dateAsString ? 'string' : 'Date';
        break;
      default:
        // Custom message type
        tsType = protoType;
        break;
    }

    return repeated ? `${tsType}[]` : tsType;
  }

  private generateUtilityTypes(): string {
    return `
// Utility types
export interface Pagination {
  page: number;
  size: number;
}

export interface ErrorDetail {
  field: string;
  message: string;
}

export interface ErrorResponse {
  code: number;
  message: string;
  details?: ErrorDetail[];
}

export interface SuccessResponse {
  message: string;
  timestamp: ${this.options.dateAsString ? 'string' : 'Date'};
}

// Request helper types
export interface PaginatedRequest<TFilter = any, TSort = any> {
  pagination?: Pagination;
  filter?: TFilter;
  sort?: TSort[];
}

export interface PaginatedResponse<TData = any> {
  data: TData;
  total: number;
  pagination: Pagination;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Filter and sort helper types
export interface FilterOperators<T> {
  eq?: T;
  ne?: T;
  gt?: T;
  gte?: T;
  lt?: T;
  lte?: T;
  in?: T[];
  nin?: T[];
  like?: T;
}

export type FilterBuilder<T> = {
  [K in keyof T]?: T[K] | FilterOperators<T[K]>;
};

export interface SortDirection {
  field: string;
  direction: 'asc' | 'desc';
}

export type SortBuilder<T> = {
  [K in keyof T]?: 'asc' | 'desc';
};
`;
  }

  private sortMessagesByDependency(messages: ProtoMessage[]): ProtoMessage[] {
    const messageMap = new Map(messages.map(m => [m.name, m]));
    const visited = new Set<string>();
    const result: ProtoMessage[] = [];

    const visit = (message: ProtoMessage): void => {
      if (visited.has(message.name)) {
        return;
      }

      // Visit dependencies first
      for (const field of message.fields) {
        const baseType = field.type.replace(/\[\]$/, ''); // Remove array suffix
        const dependency = messageMap.get(baseType);
        if (dependency && !visited.has(dependency.name)) {
          visit(dependency);
        }
      }

      visited.add(message.name);
      result.push(message);
    };

    for (const message of messages) {
      visit(message);
    }

    return result;
  }

  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  generateFilterBuilders(messages: ProtoMessage[]): string {
    let output = '\n// Filter Builders\n';

    for (const message of messages) {
      if (message.name.includes('Filter')) {
        output += this.generateFilterBuilder(message);
        output += '\n';
      }
    }

    return output;
  }

  generateSortBuilders(messages: ProtoMessage[]): string {
    let output = '\n// Sort Builders\n';

    for (const message of messages) {
      if (message.name.includes('Sort')) {
        output += this.generateSortBuilder(message);
        output += '\n';
      }
    }

    return output;
  }

  private generateFilterBuilder(message: ProtoMessage): string {
    const builderName = `${message.name}Builder`;
    const objectName = message.name;
    
    let output = `export class ${builderName} {\n`;
    output += `  private filter: Partial<${objectName}> = {};\n\n`;

    for (const field of message.fields) {
      const fieldName = this.toCamelCase(field.name);
      const fieldType = this.mapProtobufTypeToTypeScript(field.type, false);
      
      output += `  ${fieldName}(value: ${fieldType}): this {\n`;
      output += `    this.filter.${fieldName} = value;\n`;
      output += `    return this;\n`;
      output += `  }\n\n`;

      // Add special methods for string fields
      if (field.type === 'string') {
        output += `  ${fieldName}Like(value: string): this {\n`;
        output += `    this.filter.${fieldName}_like = value;\n`;
        output += `    return this;\n`;
        output += `  }\n\n`;
      }

      // Add special methods for date fields
      if (field.type === 'Timestamp') {
        const dateType = this.options.dateAsString ? 'string' : 'Date';
        output += `  ${fieldName}After(value: ${dateType}): this {\n`;
        output += `    this.filter.${fieldName}_after = value;\n`;
        output += `    return this;\n`;
        output += `  }\n\n`;
        
        output += `  ${fieldName}Before(value: ${dateType}): this {\n`;
        output += `    this.filter.${fieldName}_before = value;\n`;
        output += `    return this;\n`;
        output += `  }\n\n`;
      }
    }

    output += `  build(): ${objectName} {\n`;
    output += `    return this.filter as ${objectName};\n`;
    output += `  }\n`;
    output += `}\n`;

    output += `\nexport function create${builderName}(): ${builderName} {\n`;
    output += `  return new ${builderName}();\n`;
    output += `}\n`;

    return output;
  }

  private generateSortBuilder(message: ProtoMessage): string {
    const builderName = `${message.name}Builder`;
    
    let output = `export class ${builderName} {\n`;
    output += `  private sorts: SortDirection[] = [];\n\n`;

    // Infer sortable fields from common patterns
    const sortableFields = ['id', 'name', 'created_at', 'updated_at', 'email', 'phone'];
    
    for (const fieldName of sortableFields) {
      const camelFieldName = this.toCamelCase(fieldName);
      output += `  by${this.capitalize(camelFieldName)}(direction: 'asc' | 'desc' = 'asc'): this {\n`;
      output += `    this.sorts.push({ field: '${fieldName}', direction });\n`;
      output += `    return this;\n`;
      output += `  }\n\n`;
    }

    output += `  build(): SortDirection[] {\n`;
    output += `    return this.sorts;\n`;
    output += `  }\n`;
    output += `}\n`;

    output += `\nexport function create${builderName}(): ${builderName} {\n`;
    output += `  return new ${builderName}();\n`;
    output += `}\n`;

    return output;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export function createTypeGenerator(options?: TypeMappingOptions): TypeScriptTypeGenerator {
  return new TypeScriptTypeGenerator(options);
}