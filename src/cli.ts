import * as fs from 'fs';
import * as path from 'path';
import { generate } from './generator/index.js';
import type { GeneratorOptions } from './types/index.js';

interface CLIOptions {
  protoPath?: string;
  outputDir?: string;
  baseUrl?: string;
  packageName?: string;
  clientName?: string;
  includeComments?: boolean;
  generateFilterBuilders?: boolean;
  generateSortBuilders?: boolean;
  dateType?: 'Date' | 'string';
  bigintType?: 'bigint' | 'string';
  config?: string;
  help?: boolean;
  version?: boolean;
}

function printHelp(): void {
  console.log(`
proto2fetch - Generate TypeScript API client from protobuf definitions

Usage: proto2fetch [options]

Options:
  --proto-path <path>           Path to protobuf files directory
  --output-dir <path>           Output directory for generated files
  --base-url <url>              Base URL for API client (default: current hostname)
  --package-name <name>         Name for generated package
  --client-name <name>          Name for generated client class (default: APIClient)
  --include-comments            Include comments in generated code (default: true)
  --generate-filter-builders    Generate filter builder classes (default: true)
  --generate-sort-builders      Generate sort builder classes (default: true)
  --date-type <type>            Type for dates: Date|string (default: Date)
  --bigint-type <type>          Type for bigints: bigint|string (default: string)
  --config <path>               Path to configuration file
  --help                        Show this help message
  --version                     Show version information

Configuration File:
  You can use a configuration file (proto2fetch.config.js) instead of command line options:

  module.exports = {
    protoPath: './proto',
    outputDir: './generated',
    baseUrl: 'https://api.example.com',
    packageName: 'my-api-client',
    clientName: 'MyAPIClient',
    includeComments: true,
    generateFilterBuilders: true,
    generateSortBuilders: true,
    dateType: 'Date',
    bigintType: 'string'
  };

Examples:
  proto2fetch --proto-path ./proto --output-dir ./generated
  proto2fetch --config ./proto2fetch.config.js
  proto2fetch --proto-path ./proto --output-dir ./src/api --base-url https://api.example.com
`);
}

function printVersion(): void {
  const packageJsonPath = path.join(__dirname, '../package.json');
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log(`proto2fetch v${packageJson.version}`);
  } catch {
    console.log('proto2fetch v1.0.0');
  }
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--proto-path':
        if (nextArg) {
          options.protoPath = nextArg;
          i++;
        }
        break;
      case '--output-dir':
        if (nextArg) {
          options.outputDir = nextArg;
          i++;
        }
        break;
      case '--base-url':
        if (nextArg) {
          options.baseUrl = nextArg;
          i++;
        }
        break;
      case '--package-name':
        if (nextArg) {
          options.packageName = nextArg;
          i++;
        }
        break;
      case '--client-name':
        if (nextArg) {
          options.clientName = nextArg;
          i++;
        }
        break;
      case '--include-comments':
        options.includeComments = nextArg?.toLowerCase() !== 'false';
        if (nextArg && (nextArg.toLowerCase() === 'true' || nextArg.toLowerCase() === 'false')) {
          i++;
        }
        break;
      case '--generate-filter-builders':
        options.generateFilterBuilders = nextArg?.toLowerCase() !== 'false';
        if (nextArg && (nextArg.toLowerCase() === 'true' || nextArg.toLowerCase() === 'false')) {
          i++;
        }
        break;
      case '--generate-sort-builders':
        options.generateSortBuilders = nextArg?.toLowerCase() !== 'false';
        if (nextArg && (nextArg.toLowerCase() === 'true' || nextArg.toLowerCase() === 'false')) {
          i++;
        }
        break;
      case '--date-type':
        if (nextArg === 'Date' || nextArg === 'string') {
          options.dateType = nextArg;
          i++;
        } else {
          console.error('Error: --date-type must be either "Date" or "string"');
          process.exit(1);
        }
        break;
      case '--bigint-type':
        if (nextArg === 'bigint' || nextArg === 'string') {
          options.bigintType = nextArg;
          i++;
        } else {
          console.error('Error: --bigint-type must be either "bigint" or "string"');
          process.exit(1);
        }
        break;
      case '--config':
        if (nextArg) {
          options.config = nextArg;
          i++;
        }
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--version':
      case '-v':
        options.version = true;
        break;
      default:
        if (arg && arg.startsWith('-')) {
          console.error(`Error: Unknown option "${arg}"`);
          console.error('Use --help to see available options.');
          process.exit(1);
        }
        break;
    }
  }
  
  return options;
}

function loadConfig(configPath: string): Partial<GeneratorOptions> {
  try {
    const fullPath = path.resolve(configPath);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`Error: Configuration file not found: ${fullPath}`);
      process.exit(1);
    }
    
    // Clear require cache to allow reloading
    delete require.cache[fullPath];
    
    // Load the configuration
    const config = require(fullPath);
    return config.default || config;
  } catch (error) {
    console.error(`Error: Failed to load configuration file: ${error}`);
    process.exit(1);
  }
}

function findDefaultConfig(): string | null {
  const configFiles = [
    'proto2fetch.config.js',
    'proto2fetch.config.json',
    '.proto2fetchrc.js',
    '.proto2fetchrc.json'
  ];
  
  for (const filename of configFiles) {
    if (fs.existsSync(filename)) {
      return filename;
    }
  }
  
  return null;
}

function validateOptions(options: GeneratorOptions): void {
  if (!options.protoPath) {
    console.error('Error: --proto-path is required');
    console.error('Use --help to see available options.');
    process.exit(1);
  }
  
  if (!options.outputDir) {
    console.error('Error: --output-dir is required');
    console.error('Use --help to see available options.');
    process.exit(1);
  }
  
  if (!fs.existsSync(options.protoPath)) {
    console.error(`Error: Proto path does not exist: ${options.protoPath}`);
    process.exit(1);
  }
  
  const stat = fs.statSync(options.protoPath);
  if (!stat.isDirectory()) {
    console.error(`Error: Proto path is not a directory: ${options.protoPath}`);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cliOptions = parseArgs(args);
  
  // Handle help and version
  if (cliOptions.help) {
    printHelp();
    return;
  }
  
  if (cliOptions.version) {
    printVersion();
    return;
  }
  
  // Load configuration
  let config: Partial<GeneratorOptions> = {};
  
  // Try to load config file
  if (cliOptions.config) {
    config = loadConfig(cliOptions.config);
  } else {
    // Look for default config file
    const defaultConfig = findDefaultConfig();
    if (defaultConfig) {
      console.log(`📄 Using configuration file: ${defaultConfig}`);
      config = loadConfig(defaultConfig);
    }
  }
  
  // Merge CLI options with config (CLI options take precedence)
  const options: GeneratorOptions = {
    protoPath: cliOptions.protoPath || config.protoPath || '',
    outputDir: cliOptions.outputDir || config.outputDir || './generated',
    baseUrl: cliOptions.baseUrl || config.baseUrl || '',
    packageName: cliOptions.packageName || config.packageName,
    clientName: cliOptions.clientName || config.clientName || 'APIClient',
    includeComments: cliOptions.includeComments ?? config.includeComments ?? true,
    generateFilterBuilders: cliOptions.generateFilterBuilders ?? config.generateFilterBuilders ?? true,
    generateSortBuilders: cliOptions.generateSortBuilders ?? config.generateSortBuilders ?? true,
    dateType: cliOptions.dateType || config.dateType || 'Date',
    bigintType: cliOptions.bigintType || config.bigintType || 'string'
  };
  
  // Validate options
  validateOptions(options);
  
  try {
    // Run the generator
    await generate(options);
  } catch (error) {
    console.error('❌ Generation failed:', error);
    process.exit(1);
  }
}

// Run CLI if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

export default main;