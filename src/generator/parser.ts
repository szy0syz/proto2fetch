import * as protobuf from 'protobufjs';
import * as fs from 'fs';
import * as path from 'path';
import type {
  ParsedSchema,
  ProtoFile,
  ProtoService,
  ProtoMethod,
  ProtoMessage,
  ProtoField,
  ProtoParseOptions
} from '../types/index.js';

export class ProtoParser {
  // eslint-disable-next-line no-unused-vars
  constructor(private options: ProtoParseOptions = {}) {}

  async parseFromDirectory(protoPath: string): Promise<ParsedSchema> {
    const protoFiles = this.findProtoFiles(protoPath);
    const parsedFiles: ProtoFile[] = [];

    for (const filePath of protoFiles) {
      try {
        const parsed = await this.parseFile(filePath);
        parsedFiles.push(parsed);
      } catch (error) {
        console.warn(`Failed to parse ${filePath}:`, error);
      }
    }

    return {
      files: parsedFiles,
      ...this.extractSchemaMetadata(parsedFiles)
    };
  }

  async parseFile(filePath: string): Promise<ProtoFile> {
    const root = new protobuf.Root();
    
    // Configure parser options
    if (this.options.includePath) {
      root.resolvePath = (origin: string, target: string): string => {
        for (const includePath of this.options.includePath!) {
          const fullPath = path.resolve(includePath, target);
          if (fs.existsSync(fullPath)) {
            return fullPath;
          }
        }
        return path.resolve(path.dirname(origin), target);
      };
    }
    
    // Add resolver to handle both local and builtin google files
    const originalResolve = root.resolvePath;
    root.resolvePath = (origin: string, target: string): string => {
      // Skip all google imports to avoid extension resolution issues
      if (target.includes('google/')) {
        return '';
      }
      
      // Skip protoc-gen imports
      if (target.includes('protoc-gen-')) {
        return '';
      }
      
      if (originalResolve) {
        try {
          const result = originalResolve(origin, target);
          return result || '';
        } catch {
          return '';
        }
      }
      
      return path.resolve(path.dirname(origin), target);
    };

    const loadOptions: any = {
      keepCase: this.options.keepCase ?? true
    };
    
    if (this.options.alternateCommentMode !== undefined) {
      loadOptions.alternateCommentMode = this.options.alternateCommentMode;
    }
    
    if (this.options.preferTrailingComment !== undefined) {
      loadOptions.preferTrailingComment = this.options.preferTrailingComment;
    }

    // Always use permissive loading to avoid extension resolution issues
    const permissiveRoot = new protobuf.Root();
    
    // Set up a permissive resolver that handles google/api imports
    permissiveRoot.resolvePath = (origin: string, target: string): string => {
      // Skip all google imports to avoid extension resolution issues
      if (target.includes('google/')) {
        return '';
      }
      
      // Skip protoc-gen imports
      if (target.includes('protoc-gen-')) {
        return '';
      }
      
      // Try to find local files
      const localPath = path.resolve(path.dirname(origin), target);
      if (fs.existsSync(localPath)) {
        return localPath;
      }
      
      // Skip if not found locally
      return '';
    };
    
    try {
      await permissiveRoot.load(filePath, { ...loadOptions, keepCase: true });
      
      const services = this.extractServices(permissiveRoot);
      const messages = this.extractMessages(permissiveRoot);
      const imports = this.extractImports(filePath);
      return {
        package: permissiveRoot.nestedArray[0]?.name || '',
        services,
        messages,
        imports
      };
    } catch (error) {
      console.warn(`Failed to load ${filePath}:`, error instanceof Error ? error.message.split('\n')[0] : error);
      // Return empty result instead of failing completely
      return {
        package: '',
        services: [],
        messages: [],
        imports: []
      };
    }
  }

  private findProtoFiles(dir: string): string[] {
    const files: string[] = [];
    
    const traverse = (currentDir: string): void => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          traverse(fullPath);
        } else if (entry.name.endsWith('.proto')) {
          files.push(fullPath);
        }
      }
    };

    traverse(dir);
    return files;
  }

  private extractServices(root: protobuf.Root): ProtoService[] {
    const services: ProtoService[] = [];

    // Debug logging for service discovery (can be disabled in production)
    if (this.options.debug) {
      console.log('🔍 Root nested array:', root.nestedArray.map(n => ({
        name: n.name,
        type: n.constructor.name,
        nested: (n as any).nestedArray?.length || 0
      })));
    }

    // Recursively traverse all namespaces to find services
    const traverseNamespace = (namespace: protobuf.Namespace, path: string = ''): void => {
      namespace.nestedArray.forEach(nested => {
        const currentPath = path ? `${path}.${nested.name}` : nested.name;
        if (this.options.debug) {
          console.log(`📁 Checking: ${currentPath} (${nested.constructor.name})`);
        }
        
        if (nested instanceof protobuf.Service) {
          if (this.options.debug) {
            console.log(`✅ Found service: ${currentPath}`);
          }
          const service: ProtoService = {
            name: nested.name,
            methods: this.extractMethods(nested),
            description: this.extractComment(nested)
          };
          services.push(service);
        } else if (nested instanceof protobuf.Namespace) {
          traverseNamespace(nested, currentPath);
        }
      });
    };

    traverseNamespace(root);
    return services;
  }

  private extractMethods(service: protobuf.Service): ProtoMethod[] {
    const methods: ProtoMethod[] = [];

    for (const [name, method] of Object.entries(service.methods)) {
      const httpOptions = this.extractHttpOptions(method);
      const openApiOptions = this.extractOpenApiOptions(method);

      const protoMethod: ProtoMethod = {
        name,
        inputType: method.requestType,
        outputType: method.responseType,
        httpMethod: httpOptions.method,
        httpPath: httpOptions.path,
        description: openApiOptions.description || this.extractComment(method),
        summary: openApiOptions.summary,
        tags: openApiOptions.tags ? [openApiOptions.tags] : undefined
      };

      methods.push(protoMethod);
    }

    return methods;
  }

  private extractHttpOptions(method: protobuf.Method): { method: ProtoMethod['httpMethod']; path: string } {
    if (this.options.debug) {
      console.log(`🌐 Extracting HTTP options for method: ${method.name}`);
      console.log('Method options:', JSON.stringify(method.options, null, 2));
    }
    
    // Try the nested structure first
    let httpOption = method.options?.['(google.api.http)'];
    
    // If not found, try the flattened structure
    if (!httpOption && method.options) {
      const flatOptions: any = {};
      for (const [key, value] of Object.entries(method.options)) {
        if (key.startsWith('(google.api.http).')) {
          const httpKey = key.replace('(google.api.http).', '');
          flatOptions[httpKey] = value;
        }
      }
      if (Object.keys(flatOptions).length > 0) {
        httpOption = flatOptions;
      }
    }
    
    if (httpOption) {
      if (this.options.debug) {
        console.log('✅ Found HTTP option:', JSON.stringify(httpOption, null, 2));
      }
      if (httpOption.get) return { method: 'GET', path: httpOption.get };
      if (httpOption.post) return { method: 'POST', path: httpOption.post };
      if (httpOption.put) return { method: 'PUT', path: httpOption.put };
      if (httpOption.delete) return { method: 'DELETE', path: httpOption.delete };
      if (httpOption.patch) return { method: 'PATCH', path: httpOption.patch };
    } else {
      if (this.options.debug) {
        console.log('❌ No HTTP option found, using default');
      }
    }

    // Default to POST if no HTTP option found
    return { method: 'POST', path: `/${method.name}` };
  }

  private extractOpenApiOptions(method: protobuf.Method): {
    description?: string;
    summary?: string;
    tags?: string;
  } {
    const openApiOption = method.options?.['(grpc.gateway.protoc_gen_openapiv2.options.openapiv2_operation)'];
    
    return {
      description: openApiOption?.description,
      summary: openApiOption?.summary,
      tags: openApiOption?.tags
    };
  }

  private extractMessages(root: protobuf.Root): ProtoMessage[] {
    const messages: ProtoMessage[] = [];

    const traverseNamespace = (namespace: protobuf.Namespace): void => {
      namespace.nestedArray.forEach(nested => {
        if (nested instanceof protobuf.Type) {
          const message: ProtoMessage = {
            name: nested.name,
            fields: this.extractFields(nested),
            description: this.extractComment(nested),
            isRequest: nested.name.endsWith('Request'),
            isResponse: nested.name.endsWith('Response')
          };
          messages.push(message);
        } else if (nested instanceof protobuf.Namespace) {
          traverseNamespace(nested);
        }
      });
    };

    traverseNamespace(root);
    return messages;
  }

  private extractFields(type: protobuf.Type): ProtoField[] {
    const fields: ProtoField[] = [];

    for (const [name, field] of Object.entries(type.fields)) {
      const protoField: ProtoField = {
        name,
        type: this.normalizeFieldType(field.type),
        repeated: field.repeated,
        optional: field.optional || field.partOf !== null, // oneof fields are considered optional
        number: field.id,
        description: this.extractComment(field)
      };
      fields.push(protoField);
    }

    return fields;
  }

  private normalizeFieldType(type: string): string {
    // Map protobuf types to more semantic names
    const typeMap: Record<string, string> = {
      'uint64': 'uint64',
      'int64': 'int64', 
      'uint32': 'uint32',
      'int32': 'int32',
      'double': 'double',
      'float': 'float',
      'bool': 'boolean',
      'string': 'string',
      'bytes': 'bytes',
      'google.protobuf.Timestamp': 'Timestamp'
    };

    return typeMap[type] || type;
  }

  private extractImports(filePath: string): string[] {
    const content = fs.readFileSync(filePath, 'utf8');
    const imports: string[] = [];
    
    const importRegex = /import\s+["']([^"']+)["']/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      if (match[1]) {
        imports.push(match[1]);
      }
    }
    
    return imports;
  }

  private extractComment(obj: any): string | undefined {
    return obj.comment || obj.options?.['(protoc-gen-openapi.options.openapiv2_schema)']?.description;
  }

  private extractSchemaMetadata(files: ProtoFile[]): Partial<ParsedSchema> {
    // Extract metadata from OpenAPI configuration if present
    for (const file of files) {
      if (file.services.length > 0) {
        // Look for OpenAPI swagger options in the first service file
        // This is typically where global metadata is defined
        return {
          title: 'Generated API Client',
          version: '1.0.0',
          description: 'Auto-generated TypeScript API client from protobuf definitions'
        };
      }
    }

    return {};
  }
}

export function createParser(options?: ProtoParseOptions): ProtoParser {
  return new ProtoParser(options);
}