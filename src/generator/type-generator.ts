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
    
    // Track generated interface names to avoid duplicates
    const generatedInterfaces = new Set<string>();
    
    for (const message of sortedMessages) {
      if (!generatedInterfaces.has(message.name)) {
        output += this.generateMessageInterface(message);
        output += '\n';
        generatedInterfaces.add(message.name);
      }
    }

    // Always generate utility types (helper types and those not from proto)
    output += this.generateUtilityTypes(generatedInterfaces);

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

  private generateUtilityTypes(generatedInterfaces: Set<string>): string {
    let output = '\n// Utility types\n';
    
    // Only generate utility types that haven't been generated from proto files
    if (!generatedInterfaces.has('Pagination')) {
      output += `export interface Pagination {
  page: number;
  size: number;
}

`;
    }

    if (!generatedInterfaces.has('ErrorDetail')) {
      output += `export interface ErrorDetail {
  field: string;
  message: string;
}

`;
    }

    if (!generatedInterfaces.has('ErrorResponse')) {
      output += `export interface ErrorResponse {
  code: number;
  message: string;
  details?: ErrorDetail[];
}

`;
    }

    if (!generatedInterfaces.has('SuccessResponse')) {
      output += `export interface SuccessResponse {
  message: string;
  timestamp: ${this.options.dateAsString ? 'string' : 'Date'};
}

`;
    }

    // Always generate helper types (these are not from proto files)
    output += `// Request helper types
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

    return output;
  }

  private sortMessagesByDependency(messages: ProtoMessage[]): ProtoMessage[] {
    const messageMap = new Map(messages.map(m => [m.name, m]));
    const visited = new Set<string>();
    const visiting = new Set<string>(); // Track currently visiting nodes to detect cycles
    const result: ProtoMessage[] = [];

    const visit = (message: ProtoMessage): void => {
      if (visited.has(message.name)) {
        return;
      }

      // Detect circular dependency
      if (visiting.has(message.name)) {
        console.warn(`Circular dependency detected involving ${message.name}, skipping dependency ordering for this node`);
        return;
      }

      visiting.add(message.name);

      // Visit dependencies first
      for (const field of message.fields) {
        const baseType = field.type.replace(/\[\]$/, ''); // Remove array suffix
        // Only process types that exist in our message map (ignore primitives)
        const dependency = messageMap.get(baseType);
        if (dependency && !visited.has(dependency.name)) {
          visit(dependency);
        }
      }

      visiting.delete(message.name);
      visited.add(message.name);
      result.push(message);
    };

    for (const message of messages) {
      if (!visited.has(message.name)) {
        visit(message);
      }
    }

    return result;
  }

  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  generateFilterBuilders(messages: ProtoMessage[]): string {
    let output = '\n// Filter Builders\n';
    const generatedBuilders = new Set<string>();

    for (const message of messages) {
      if (message.name.includes('Filter') && !generatedBuilders.has(message.name)) {
        output += this.generateFilterBuilder(message);
        output += '\n';
        generatedBuilders.add(message.name);
      }
    }

    return output;
  }

  generateSortBuilders(messages: ProtoMessage[]): string {
    let output = '\n// Sort Builders\n';
    const generatedBuilders = new Set<string>();

    for (const message of messages) {
      if (message.name.includes('Sort') && !generatedBuilders.has(message.name)) {
        output += this.generateSortBuilder(message);
        output += '\n';
        generatedBuilders.add(message.name);
      }
    }

    return output;
  }

  private generateFilterBuilder(message: ProtoMessage): string {
    const builderName = `${message.name}Builder`;
    const objectName = message.name;
    
    let output = `export class ${builderName} {\n`;
    output += `  private filter: Partial<${objectName}> = {};\n\n`;

    const generatedMethods = new Set<string>();

    for (const field of message.fields) {
      const fieldName = this.toCamelCase(field.name);
      const fieldType = this.mapProtobufTypeToTypeScript(field.type, false);
      
      // Check if this field already has a suffix (Like, After, Before)
      const hasLikeSuffix = fieldName.endsWith('Like');
      const hasAfterSuffix = fieldName.endsWith('After'); 
      const hasBeforeSuffix = fieldName.endsWith('Before');
      
      // Generate main field method
      if (!generatedMethods.has(fieldName)) {
        output += `  ${fieldName}(value: ${fieldType}): this {\n`;
        output += `    this.filter.${fieldName} = value;\n`;
        output += `    return this;\n`;
        output += `  }\n\n`;
        generatedMethods.add(fieldName);
      }

      // Only add special methods for base fields (not those already with suffixes)
      if (!hasLikeSuffix && !hasAfterSuffix && !hasBeforeSuffix) {
        // Add special methods for string fields
        if (field.type === 'string') {
          const likeMethodName = `${fieldName}Like`;
          if (!generatedMethods.has(likeMethodName)) {
            output += `  ${likeMethodName}(value: string): this {\n`;
            output += `    this.filter.${fieldName}Like = value;\n`;
            output += `    return this;\n`;
            output += `  }\n\n`;
            generatedMethods.add(likeMethodName);
          }
        }

        // Add special methods for date fields
        if (field.type === 'Timestamp') {
          const dateType = this.options.dateAsString ? 'string' : 'Date';
          
          const afterMethodName = `${fieldName}After`;
          if (!generatedMethods.has(afterMethodName)) {
            output += `  ${afterMethodName}(value: ${dateType}): this {\n`;
            output += `    this.filter.${fieldName}After = value;\n`;
            output += `    return this;\n`;
            output += `  }\n\n`;
            generatedMethods.add(afterMethodName);
          }
          
          const beforeMethodName = `${fieldName}Before`;
          if (!generatedMethods.has(beforeMethodName)) {
            output += `  ${beforeMethodName}(value: ${dateType}): this {\n`;
            output += `    this.filter.${fieldName}Before = value;\n`;
            output += `    return this;\n`;
            output += `  }\n\n`;
            generatedMethods.add(beforeMethodName);
          }
        }
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