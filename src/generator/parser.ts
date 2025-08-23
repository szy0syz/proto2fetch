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

    const loadOptions: any = {
      keepCase: this.options.keepCase ?? true
    };
    
    if (this.options.alternateCommentMode !== undefined) {
      loadOptions.alternateCommentMode = this.options.alternateCommentMode;
    }
    
    if (this.options.preferTrailingComment !== undefined) {
      loadOptions.preferTrailingComment = this.options.preferTrailingComment;
    }

    await root.load(filePath, loadOptions);

    const services = this.extractServices(root);
    const messages = this.extractMessages(root);
    const imports = this.extractImports(filePath);

    return {
      package: root.nestedArray[0]?.name || '',
      services,
      messages,
      imports
    };
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

    root.nestedArray.forEach(namespace => {
      if (namespace instanceof protobuf.Service) {
        const service: ProtoService = {
          name: namespace.name,
          methods: this.extractMethods(namespace),
          description: this.extractComment(namespace)
        };
        services.push(service);
      }
    });

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
    const httpOption = method.options?.['(google.api.http)'];
    
    if (httpOption) {
      if (httpOption.get) return { method: 'GET', path: httpOption.get };
      if (httpOption.post) return { method: 'POST', path: httpOption.post };
      if (httpOption.put) return { method: 'PUT', path: httpOption.put };
      if (httpOption.delete) return { method: 'DELETE', path: httpOption.delete };
      if (httpOption.patch) return { method: 'PATCH', path: httpOption.patch };
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