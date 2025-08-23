import type { Options as KyOptions } from 'ky';

export interface ProtoMethod {
  name: string;
  inputType: string;
  outputType: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  httpPath: string;
  description?: string;
  summary?: string;
  tags?: string[];
}

export interface ProtoMessage {
  name: string;
  fields: ProtoField[];
  description?: string;
  isRequest?: boolean;
  isResponse?: boolean;
}

export interface ProtoField {
  name: string;
  type: string;
  repeated: boolean;
  optional: boolean;
  number: number;
  description?: string;
}

export interface ProtoService {
  name: string;
  methods: ProtoMethod[];
  description?: string;
}

export interface ProtoFile {
  package: string;
  services: ProtoService[];
  messages: ProtoMessage[];
  imports: string[];
}

export interface ParsedSchema {
  files: ProtoFile[];
  baseUrl?: string;
  title?: string;
  version?: string;
  description?: string;
}

export interface APIClientConfig {
  baseUrl: string;
  timeout?: number;
  retry?: {
    limit: number;
    methods?: string[];
    statusCodes?: number[];
  };
  hooks?: {
    beforeRequest?: RequestHook[];
    beforeRetry?: RetryHook[];
    beforeError?: ErrorHook[];
    afterResponse?: ResponseHook[];
  };
  auth?: {
    token?: string;
    tokenType?: 'Bearer' | 'Basic';
    refreshTokenHandler?: () => Promise<string>;
  };
  cache?: CacheConfig;
  debug?: boolean;
}

export interface CacheConfig {
  enabled: boolean;
  ttl?: number;
  keyGenerator?: (_method: string, _args: any[]) => string;
  storage?: 'memory' | 'localStorage' | 'sessionStorage';
}

export type RequestHook = (_request: Request) => Request | Promise<Request>;
export type RetryHook = (_request: Request, _error: Error, _retryCount: number) => void | Promise<void>;
export type ErrorHook = (_error: Error) => Error | Promise<Error>;
export type ResponseHook = (_request: Request, _response: Response) => Response | Promise<Response>;

export interface RequestOptions extends Omit<KyOptions, 'prefixUrl'> {
  pathParams?: Record<string, string | number>;
  skipAuth?: boolean;
}

export interface PaginatedRequest<T = any> {
  pagination?: {
    page: number;
    size: number;
  };
  filter?: T;
  sort?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
}

export interface PaginatedResponse<T = any> {
  data: T;
  total: number;
  pagination: {
    page: number;
    size: number;
  };
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ErrorDetail {
  field: string;
  message: string;
}

export interface APIErrorResponse {
  code: number;
  message: string;
  details?: ErrorDetail[];
}

export interface GeneratorOptions {
  protoPath: string;
  outputDir: string;
  baseUrl?: string;
  packageName?: string;
  clientName?: string;
  includeComments?: boolean;
  generateFilterBuilders?: boolean;
  generateSortBuilders?: boolean;
  dateType?: 'Date' | 'string';
  bigintType?: 'bigint' | 'string';
}

export interface ProtoParseOptions {
  includePath?: string[];
  keepCase?: boolean;
  alternateCommentMode?: boolean;
  preferTrailingComment?: boolean;
}

export interface TypeMappingOptions {
  dateAsString?: boolean;
  bigintAsString?: boolean;
  useOptionalForOptionalFields?: boolean;
}

export interface ClientGeneratorOptions {
  clientName: string;
  baseUrl: string;
  generateComments: boolean;
  generateFilterBuilders: boolean;
  generateSortBuilders: boolean;
}