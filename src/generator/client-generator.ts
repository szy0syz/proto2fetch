import type {
  ParsedSchema,
  ProtoService,
  ProtoMethod,
  ClientGeneratorOptions
} from '../types/index.js';

export class APIClientGenerator {
  // eslint-disable-next-line no-unused-vars
  constructor(private options: ClientGeneratorOptions) {}

  generateClient(schema: ParsedSchema): string {
    let output = this.generateHeader();
    
    // Import statements
    output += this.generateImports();
    output += '\n';

    // Generate main client class
    const allServices = schema.files.flatMap(file => file.services);
    output += this.generateClientClass(allServices);
    
    return output;
  }

  private generateHeader(): string {
    return `// This file is auto-generated. Do not edit manually.
// Generated API Client from protobuf definitions

`;
  }

  private generateImports(): string {
    return `import type { APIClient, RequestOptions } from 'proto2fetch/runtime';
import { createAPIClient } from 'proto2fetch/runtime';
import type * as Types from './types.js';

`;
  }

  private generateClientClass(services: ProtoService[]): string {
    let output = '';
    
    if (this.options.generateComments) {
      output += `/**\n * ${this.options.clientName} - Auto-generated API client\n */\n`;
    }
    
    output += `export class ${this.options.clientName} {\n`;
    output += `  private client: APIClient;\n\n`;
    
    // Constructor
    output += this.generateConstructor();
    output += '\n';

    // Generate method for each service
    for (const service of services) {
      output += this.generateServiceMethods(service);
    }

    output += '}\n\n';

    // Generate factory function
    output += this.generateFactoryFunction();

    return output;
  }

  private generateConstructor(): string {
    let output = `  constructor(config?: Partial<import('proto2fetch/runtime').APIClientConfig>) {\n`;
    output += `    const defaultBaseUrl = ${this.options.baseUrl && this.options.baseUrl.trim() ? `'${this.options.baseUrl}'` : '`${typeof window !== \'undefined\' ? window.location.origin : \'http://localhost:3000\'}`'};\n`;
    output += `    this.client = createAPIClient({\n`;
    output += `      baseUrl: defaultBaseUrl,\n`;
    output += `      ...config\n`;
    output += `    });\n`;
    output += `  }\n`;
    
    return output;
  }

  private generateServiceMethods(service: ProtoService): string {
    let output = '';
    
    if (this.options.generateComments && service.description) {
      output += `\n  // ${service.description}\n`;
    }

    for (const method of service.methods) {
      output += this.generateMethod(method);
      output += '\n';
    }

    return output;
  }

  private generateMethod(method: ProtoMethod): string {
    let output = '';
    
    if (this.options.generateComments) {
      output += `  /**\n`;
      if (method.description) {
        output += `   * ${method.description}\n`;
      }
      if (method.summary) {
        output += `   * @summary ${method.summary}\n`;
      }
      if (method.tags && method.tags.length > 0) {
        output += `   * @tags ${method.tags.join(', ')}\n`;
      }
      output += `   */\n`;
    }
    
    const methodName = this.toCamelCase(method.name);
    const inputType = `Types.${method.inputType}`;
    const outputType = `Types.${method.outputType}`;
    
    // Determine if method has path parameters
    const pathParams = this.extractPathParams(method.httpPath);
    const hasPathParams = pathParams.length > 0;
    
    // Generate method signature
    if (method.httpMethod === 'GET' && method.inputType === 'Empty') {
      // GET method with no parameters
      output += `  async ${methodName}(options?: RequestOptions): Promise<${outputType}> {\n`;
    } else if (hasPathParams) {
      // Method with path parameters
      output += `  async ${methodName}(request: ${inputType}, options?: RequestOptions): Promise<${outputType}> {\n`;
    } else {
      // Standard method
      output += `  async ${methodName}(request: ${inputType}, options?: RequestOptions): Promise<${outputType}> {\n`;
    }

    // Method body
    output += this.generateMethodBody(method, pathParams);
    output += `  }\n`;
    
    return output;
  }

  private generateMethodBody(method: ProtoMethod, pathParams: string[]): string {
    let output = '';
    
    // Prepare path with parameter substitution
    let path = method.httpPath;
    if (pathParams.length > 0) {
      for (const param of pathParams) {
        const camelParam = this.toCamelCase(param);
        path = path.replace(`{${param}}`, `\${request.${camelParam}}`);
      }
      output += `    const path = \`${path}\`;\n`;
    } else {
      output += `    const path = '${path}';\n`;
    }

    // Prepare request data
    if (method.httpMethod === 'GET') {
      if (method.inputType !== 'Empty') {
        // For GET requests, convert request object to query parameters
        output += `    const searchParams = this.client.objectToSearchParams(request);\n`;
        output += `    return this.client.request<Types.${method.outputType}>('${method.httpMethod}', path, undefined, {\n`;
        output += `      searchParams,\n`;
        output += `      ...options\n`;
        output += `    });\n`;
      } else {
        output += `    return this.client.request<Types.${method.outputType}>('${method.httpMethod}', path, undefined, options);\n`;
      }
    } else {
      // For POST/PUT/DELETE requests, send request as body
      if (pathParams.length > 0) {
        // Remove path parameters from request body
        output += `    const { ${pathParams.map(p => this.toCamelCase(p)).join(', ')}, ...body } = request;\n`;
        output += `    return this.client.request<Types.${method.outputType}>('${method.httpMethod}', path, body, options);\n`;
      } else {
        output += `    return this.client.request<Types.${method.outputType}>('${method.httpMethod}', path, request, options);\n`;
      }
    }

    return output;
  }

  private generateFactoryFunction(): string {
    let output = `/**\n * Create a new instance of ${this.options.clientName}\n */\n`;
    output += `export function create${this.options.clientName}(config?: Partial<import('proto2fetch/runtime').APIClientConfig>): ${this.options.clientName} {\n`;
    output += `  return new ${this.options.clientName}(config);\n`;
    output += `}\n\n`;
    
    output += `// Default export\n`;
    output += `export default ${this.options.clientName};\n`;
    
    return output;
  }

  private extractPathParams(path: string): string[] {
    const matches = path.match(/\{([^}]+)\}/g);
    if (!matches) return [];
    
    return matches.map(match => match.slice(1, -1)); // Remove { and }
  }

  private toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1).replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  generateHelperMethods(schema: ParsedSchema): string {
    let output = '\n// Helper methods and builders\n';
    
    const allMessages = schema.files.flatMap(file => file.messages);
    
    // Generate pagination helpers
    output += this.generatePaginationHelpers();
    
    // Generate filter builders if enabled
    if (this.options.generateFilterBuilders) {
      output += this.generateFilterHelpers(allMessages);
    }
    
    // Generate sort builders if enabled
    if (this.options.generateSortBuilders) {
      output += this.generateSortHelpers(allMessages);
    }
    
    return output;
  }

  private generatePaginationHelpers(): string {
    return `
/**
 * Create pagination parameters
 */
export function createPagination(page: number = 1, size: number = 10): Types.Pagination {
  return { page, size };
}

/**
 * Create paginated request helper
 */
export function createPaginatedRequest<TFilter = any, TSort = any>(
  pagination?: Types.Pagination,
  filter?: TFilter,
  sort?: TSort[]
): Types.PaginatedRequest<TFilter, TSort> {
  return {
    pagination: pagination || createPagination(),
    filter,
    sort
  };
}
`;
  }

  private generateFilterHelpers(messages: any[]): string {
    let output = '\n// Filter helpers\n';
    
    const filterMessages = messages.filter(m => m.name.includes('Filter'));
    const uniqueFilterMessages = filterMessages.filter((message, index, self) => 
      index === self.findIndex(m => m.name === message.name)
    );
    
    for (const message of uniqueFilterMessages) {
      const entityName = message.name.replace('Filter', '');
      output += `\nexport function create${entityName}Filter(): Types.${message.name}Builder {\n`;
      output += `  return new Types.${message.name}Builder();\n`;
      output += `}\n`;
    }
    
    return output;
  }

  private generateSortHelpers(messages: any[]): string {
    let output = '\n// Sort helpers\n';
    
    const sortMessages = messages.filter(m => m.name.includes('Sort'));
    const uniqueSortMessages = sortMessages.filter((message, index, self) => 
      index === self.findIndex(m => m.name === message.name)
    );
    
    for (const message of uniqueSortMessages) {
      const entityName = message.name.replace('Sort', '');
      output += `\nexport function create${entityName}Sort(): Types.${message.name}Builder {\n`;
      output += `  return new Types.${message.name}Builder();\n`;
      output += `}\n`;
    }
    
    return output;
  }
}

export function createClientGenerator(options: ClientGeneratorOptions): APIClientGenerator {
  return new APIClientGenerator(options);
}