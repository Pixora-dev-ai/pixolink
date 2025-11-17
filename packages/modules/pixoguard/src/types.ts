import { z } from 'zod';

// ============================================================================
// Core Types (from original pixoguard)
// ============================================================================

export type TablePolicy = {
  name: string;
  action?: string;
  using?: string;
  check?: string;
};

export type Relation = {
  table: string;
  column: string;
  referencesTable: string;
  referencesColumn: string;
};

export type FunctionSignature = {
  args: Array<{ name: string; optional?: boolean }>;
  returns?: string;
};

export type DatabaseMetadata = {
  tables: string[];
  functions: string[];
  tableColumns: Record<string, string[]>;
  relations: Relation[];
  functionSignatures: Record<string, FunctionSignature>;
  rls: Record<string, { enabled: boolean; policies: TablePolicy[] }>;
};

export type CodeScanResult = {
  tables: string[];
  functions: string[];
  rpcArguments: Record<string, string[]>;
};

export type FindingStatus = 'ok' | 'warn' | 'error';

export type ReportItem = {
  status: FindingStatus;
  message: string;
  detail?: string;
  suggestedFix?: string;
  context?: Record<string, unknown>;
};

export type ConnectorResult = {
  name: string;
  status: 'ok' | 'warn' | 'error' | 'skipped';
  summary: string;
  details?: string[];
};

export type AuditReport = {
  generatedAt: string;
  projectRef?: string;
  sourceRoot: string;
  summary: {
    totalFindings: number;
    errors: number;
    warnings: number;
    ok: number;
  };
  findings: ReportItem[];
  connectors: ConnectorResult[];
  layers?: LayerResult[];
};

export type LayerResult = {
  layer: string;
  status: 'ok' | 'warn' | 'error' | 'skipped';
  summary?: string;
  findings?: ReportItem[];
  payload?: unknown;
  metrics?: Record<string, unknown>;
};

// ============================================================================
// Scan Configuration
// ============================================================================

export interface ScanOptions {
  /**
   * Root directory to scan
   * @default process.cwd()
   */
  sourceRoot?: string;

  /**
   * Database provider
   * @default 'supabase'
   */
  provider?: DatabaseProvider;

  /**
   * Database connection details
   */
  connection: DatabaseConnection;

  /**
   * Layers to run
   * @default ['schema', 'rls', 'consistency']
   */
  layers?: string[];

  /**
   * Output report path
   */
  outputPath?: string;

  /**
   * Project reference identifier
   */
  projectRef?: string;

  /**
   * HTTP timeout in milliseconds
   * @default 8000
   */
  timeout?: number;

  /**
   * Fail on specific level
   * @default 'error'
   */
  failOn?: 'warn' | 'error' | 'never';
}

export type DatabaseProvider = 'supabase' | 'postgres' | 'custom';

export interface DatabaseConnection {
  /**
   * Database URL (Supabase URL or Postgres connection string)
   */
  url: string;

  /**
   * API Key (for Supabase) or password (for Postgres)
   */
  key: string;

  /**
   * Service role key (optional, for RLS checking)
   */
  serviceKey?: string;

  /**
   * Schema name
   * @default 'public'
   */
  schema?: string;
}

// ============================================================================
// Layer System
// ============================================================================

export interface Layer {
  id: string;
  description?: string;
  run: (opts: LayerContext) => Promise<LayerResult>;
}

export interface LayerContext {
  sourceRoot: string;
  projectRef?: string;
  dbMetadata?: DatabaseMetadata;
  codeScanResult?: CodeScanResult;
  connection?: DatabaseConnection;
}

// ============================================================================
// Auto-Fix System
// ============================================================================

export type FixType = 
  | 'create_table'
  | 'add_column'
  | 'create_function'
  | 'enable_rls'
  | 'add_rls_policy'
  | 'add_foreign_key'
  | 'create_index';

export interface SuggestedFix {
  type: FixType;
  description: string;
  sql: string;
  table?: string;
  function?: string;
  severity: 'low' | 'medium' | 'high';
  autoApply?: boolean;
}

export interface FixResult {
  success: boolean;
  appliedFixes: number;
  failedFixes: number;
  skippedFixes: number;
  details: {
    fix: SuggestedFix;
    success: boolean;
    error?: string;
  }[];
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const DatabaseConnectionSchema = z.object({
  url: z.string().url(),
  key: z.string().min(1),
  serviceKey: z.string().optional(),
  schema: z.string().default('public'),
});

export const ScanOptionsSchema = z.object({
  sourceRoot: z.string().optional(),
  provider: z.enum(['supabase', 'postgres', 'custom']).default('supabase'),
  connection: DatabaseConnectionSchema,
  layers: z.array(z.string()).optional(),
  outputPath: z.string().optional(),
  projectRef: z.string().optional(),
  timeout: z.number().positive().default(8000),
  failOn: z.enum(['warn', 'error', 'never']).default('error'),
});

export const SuggestedFixSchema = z.object({
  type: z.enum([
    'create_table',
    'add_column',
    'create_function',
    'enable_rls',
    'add_rls_policy',
    'add_foreign_key',
    'create_index',
  ]),
  description: z.string(),
  sql: z.string(),
  table: z.string().optional(),
  function: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high']),
  autoApply: z.boolean().optional(),
});

// ============================================================================
// Scanner Interface
// ============================================================================

export interface DatabaseScanner {
  /**
   * Connect to database
   */
  connect(connection: DatabaseConnection): Promise<void>;

  /**
   * Scan database schema
   */
  scanSchema(): Promise<DatabaseMetadata>;

  /**
   * Check RLS policies
   */
  checkRLS(tables: string[]): Promise<Record<string, { enabled: boolean; policies: TablePolicy[] }>>;

  /**
   * Get table columns
   */
  getColumns(table: string): Promise<string[]>;

  /**
   * Get function signature
   */
  getFunctionSignature(functionName: string): Promise<FunctionSignature | undefined>;

  /**
   * Execute SQL (for auto-fix)
   */
  executeSql(sql: string): Promise<void>;

  /**
   * Test connection
   */
  isHealthy(): Promise<boolean>;

  /**
   * Disconnect
   */
  disconnect(): Promise<void>;
}

// ============================================================================
// Code Scanner Interface
// ============================================================================

export interface CodeScanner {
  /**
   * Scan source code for database calls
   */
  scan(sourceRoot: string): Promise<CodeScanResult>;

  /**
   * Find database table references
   */
  findTableReferences(sourceRoot: string): Promise<string[]>;

  /**
   * Find RPC function calls
   */
  findRpcCalls(sourceRoot: string): Promise<string[]>;

  /**
   * Extract RPC arguments from code
   */
  extractRpcArguments(sourceRoot: string): Promise<Record<string, string[]>>;
}

// ============================================================================
// Analyzer Interface
// ============================================================================

export interface ConsistencyAnalyzer {
  /**
   * Compare database schema with code usage
   */
  analyze(dbMetadata: DatabaseMetadata, codeScan: CodeScanResult): Promise<ReportItem[]>;

  /**
   * Check for missing tables
   */
  checkMissingTables(dbTables: string[], codeTables: string[]): ReportItem[];

  /**
   * Check for missing functions
   */
  checkMissingFunctions(dbFunctions: string[], codeFunctions: string[]): ReportItem[];

  /**
   * Check for broken relations
   */
  checkBrokenRelations(relations: Relation[], dbTables: string[]): ReportItem[];

  /**
   * Check RPC argument mismatches
   */
  checkRpcArguments(
    functionSignatures: Record<string, FunctionSignature>,
    rpcArguments: Record<string, string[]>
  ): ReportItem[];

  /**
   * Generate suggested fixes
   */
  generateFixes(findings: ReportItem[], dbMetadata: DatabaseMetadata): SuggestedFix[];
}
