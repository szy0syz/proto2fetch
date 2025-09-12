import * as fs from 'fs';
import * as path from 'path';
import { ProtoParser, createParser } from './parser.js';
import { TypeScriptTypeGenerator, createTypeGenerator } from './type-generator.js';
import { APIClientGenerator, createClientGenerator } from './client-generator.js';
import type { 
  GeneratorOptions, 
  ParsedSchema,
  ProtoParseOptions,
  TypeMappingOptions,
  ClientGeneratorOptions 
} from '../types/index.js';

export class Proto2FetchGenerator {
  private parser: ProtoParser;
  private typeGenerator: TypeScriptTypeGenerator;
  private clientGenerator: APIClientGenerator;

  constructor(private _options: GeneratorOptions) {
    // Configure parser options
    const parseOptions: ProtoParseOptions = {
      includePath: [this._options.protoPath],
      keepCase: true,
      alternateCommentMode: true,
      preferTrailingComment: true
    };

    // Configure type mapping options
    const typeMappingOptions: TypeMappingOptions = {
      dateAsString: this._options.dateType === 'string',
      bigintAsString: this._options.bigintType === 'string',
      bigintAsNumber: this._options.bigintType === 'number',
      useOptionalForOptionalFields: true
    };

    // Configure client generator options
    const clientOptions: ClientGeneratorOptions = {
      clientName: this._options.clientName || 'APIClient',
      baseUrl: this._options.baseUrl && this._options.baseUrl.trim() ? this._options.baseUrl : '',
      generateComments: this._options.includeComments ?? true,
      generateFilterBuilders: this._options.generateFilterBuilders ?? true,
      generateSortBuilders: this._options.generateSortBuilders ?? true
    };

    this.parser = createParser(parseOptions);
    this.typeGenerator = createTypeGenerator(typeMappingOptions);
    this.clientGenerator = createClientGenerator(clientOptions);
  }

  /**
   * Generate the complete API client package
   */
  async generate(): Promise<void> {
    console.log('🚀 Starting proto2fetch generation...');
    
    // Parse protobuf files
    console.log('📖 Parsing protobuf files...');
    const schema = await this.parser.parseFromDirectory(this._options.protoPath);
    
    console.log(`✅ Parsed ${schema.files.length} proto files`);
    console.log(`   - ${schema.files.flatMap(f => f.services).length} services`);
    console.log(`   - ${schema.files.flatMap(f => f.messages).length} messages`);

    // Ensure output directory exists
    await this.ensureOutputDirectory();

    // Generate TypeScript types
    console.log('🔧 Generating TypeScript types...');
    await this.generateTypes(schema);

    // Generate API client
    console.log('🔧 Generating API client...');
    await this.generateClient(schema);

    // Generate package.json
    console.log('🔧 Generating package metadata...');
    await this.generatePackageJson(schema);

    // Generate README
    console.log('🔧 Generating documentation...');
    await this.generateReadme(schema);

    console.log('✅ Generation completed successfully!');
    console.log(`📦 Output directory: ${this._options.outputDir}`);
  }

  private async ensureOutputDirectory(): Promise<void> {
    if (!fs.existsSync(this._options.outputDir)) {
      fs.mkdirSync(this._options.outputDir, { recursive: true });
    }
  }

  private async generateTypes(schema: ParsedSchema): Promise<void> {
    let typeContent = this.typeGenerator.generateTypes(schema);
    
    // Add filter and sort builders if enabled
    const allMessages = schema.files.flatMap(file => file.messages);
    
    if (this._options.generateFilterBuilders) {
      typeContent += this.typeGenerator.generateFilterBuilders(allMessages);
    }
    
    if (this._options.generateSortBuilders) {
      typeContent += this.typeGenerator.generateSortBuilders(allMessages);
    }

    const typesPath = path.join(this._options.outputDir, 'types.ts');
    fs.writeFileSync(typesPath, typeContent, 'utf8');
  }

  private async generateClient(schema: ParsedSchema): Promise<void> {
    let clientContent = this.clientGenerator.generateClient(schema);
    
    // Add helper methods
    clientContent += this.clientGenerator.generateHelperMethods(schema);

    const clientPath = path.join(this._options.outputDir, 'client.ts');
    fs.writeFileSync(clientPath, clientContent, 'utf8');
  }

  private async generatePackageJson(schema: ParsedSchema): Promise<void> {
    const packageJson = {
      name: this._options.packageName || 'generated-api-client',
      version: '1.0.0',
      description: schema.description || 'Generated API client from protobuf definitions',
      main: './client.js',
      types: './client.d.ts',
      scripts: {
        build: 'tsc',
        dev: 'tsc --watch'
      },
      dependencies: {
        'proto2fetch': '^1.0.0'
      },
      devDependencies: {
        'typescript': '^5.0.0'
      }
    };

    const packagePath = path.join(this._options.outputDir, 'package.json');
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');
  }

  private async generateReadme(schema: ParsedSchema): Promise<void> {
    const allServices = schema.files.flatMap(file => file.services);
    const allMethods = allServices.flatMap(service => service.methods);
    
    const readme = `# ${this._options.packageName || 'Generated API Client'}

${schema.description || 'Auto-generated TypeScript API client from protobuf definitions.'}

## Installation

\`\`\`bash
npm install ${this._options.packageName || 'generated-api-client'}
\`\`\`

## Usage

\`\`\`typescript
import { ${this._options.clientName || 'APIClient'} } from '${this._options.packageName || 'generated-api-client'}';

// Create client instance
const client = new ${this._options.clientName || 'APIClient'}({
  baseUrl: '${this._options.baseUrl || 'https://api.example.com'}',
  auth: {
    token: 'your-auth-token'
  }
});

// Example API calls
${this.generateUsageExamples(allMethods.slice(0, 3))}
\`\`\`

## Configuration Options

\`\`\`typescript
interface APIClientConfig {
  baseUrl: string;
  timeout?: number;
  auth?: {
    token?: string;
    tokenType?: 'Bearer' | 'Basic';
  };
  retry?: {
    limit: number;
    methods?: string[];
    statusCodes?: number[];
  };
}
\`\`\`

## Error Handling

\`\`\`typescript
import { APIError } from '${this._options.packageName || 'generated-api-client'}';

try {
  const result = await client.someMethod(request);
} catch (error) {
  if (error instanceof APIError) {
    console.error('API Error:', error.message);
    console.error('Status:', error.status);
    console.error('Code:', error.code);
  }
}
\`\`\`

---

*This client was generated using [proto2fetch](https://github.com/szy0syz/proto2fetch).*
`;

    const readmePath = path.join(this._options.outputDir, 'README.md');
    fs.writeFileSync(readmePath, readme, 'utf8');
  }

  private generateUsageExamples(methods: any[]): string {
    return methods.map(method => {
      const methodName = this.toCamelCase(method.name);
      return `// ${method.summary || method.description || method.name}
const result = await client.${methodName}(request);`;
    }).join('\n\n');
  }


  private toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1).replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}

// Export generator classes and functions
export { ProtoParser, createParser } from './parser.js';
export { TypeScriptTypeGenerator, createTypeGenerator } from './type-generator.js';
export { APIClientGenerator, createClientGenerator } from './client-generator.js';

export type {
  GeneratorOptions,
  ProtoParseOptions,
  TypeMappingOptions,
  ClientGeneratorOptions,
  ParsedSchema,
  ProtoFile,
  ProtoService,
  ProtoMethod,
  ProtoMessage,
  ProtoField
} from '../types/index.js';

/**
 * Create and run the proto2fetch generator
 */
export async function generate(options: GeneratorOptions): Promise<void> {
  const generator = new Proto2FetchGenerator(options);
  await generator.generate();
}

export default Proto2FetchGenerator;