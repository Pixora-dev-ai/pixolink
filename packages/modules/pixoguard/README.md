# PixoGuard Module

Database schema auditing and security analysis for PixoLink. Scans your database schema and codebase to detect inconsistencies, security issues, and generate suggested fixes.

## Features

- **Database Schema Scanning**: Introspect database tables, columns, functions, and RLS policies
- **Code Analysis**: Scan React/TypeScript code for database usage patterns
- **Consistency Checking**: Find missing tables, functions, broken relations, and argument mismatches
- **RLS Validation**: Verify Row Level Security policies are enabled and properly configured
- **Auto-Fix Generation**: Generate SQL fixes for common issues
- **Multi-Provider Support**: Supabase (full support), PostgreSQL (coming soon)
- **Layer System**: Pluggable analysis layers for extensibility
- **CLI Integration**: Use original PixoGuard CLI alongside plugin API

## Installation

```bash
npm install @pixora/pixolink-pixoguard
```

## Quick Start

### Basic Usage

```typescript
import { createPixoLink } from '@pixora/pixolink';
import { PixoGuardPlugin } from '@pixora/pixolink-pixoguard';

// Create plugin
const pixoguard = new PixoGuardPlugin();

// Initialize PixoLink with PixoGuard
const pixolink = await createPixoLink({
  plugins: [pixoguard],
});

// Scan project
const report = await pixoguard.scanProject({
  sourceRoot: './src',
  provider: 'supabase',
  connection: {
    url: process.env.SUPABASE_URL!,
    key: process.env.SUPABASE_SERVICE_KEY!,
  },
});

console.log('Scan complete:', report.summary);
// => { totalFindings: 12, errors: 3, warnings: 9, ok: 0 }
```

### Supabase Configuration

```typescript
import { PixoGuardPlugin } from '@pixora/pixolink-pixoguard';

const pixoguard = new PixoGuardPlugin({
  defaultOptions: {
    provider: 'supabase',
    connection: {
      url: process.env.SUPABASE_URL!,
      key: process.env.SUPABASE_ANON_KEY!,
      serviceKey: process.env.SUPABASE_SERVICE_KEY, // For RLS checking
      schema: 'public',
    },
    timeout: 10000, // 10 seconds
    failOn: 'error', // Fail on errors only
  },
});

// Scan with default options
const report = await pixoguard.scanProject({
  sourceRoot: './src',
  outputPath: './pixoguard-report.json',
});
```

### Auto-Fix Application

```typescript
// Generate fixes from report
const fixes = await pixoguard.generateFixes(report);

console.log(`Generated ${fixes.length} fixes`);

// Apply fixes (dry run first)
const dryRun = await pixoguard.applyFixes(fixes, { dryRun: true });
console.log('Dry run:', dryRun);

// Apply fixes for real (only auto-apply safe ones)
const result = await pixoguard.applyFixes(fixes, { autoApplyOnly: true });

console.log(`Applied: ${result.appliedFixes}, Failed: ${result.failedFixes}`);
```

### Layer System

```typescript
// Run specific analysis layers
const layerResult = await pixoguard.runLayer('consistency', {
  sourceRoot: './src',
  projectRef: 'my-project',
});

console.log('Layer result:', layerResult);

// Run multiple layers
const report = await pixoguard.scanProject({
  sourceRoot: './src',
  provider: 'supabase',
  connection: { /* ... */ },
  layers: ['schema', 'rls', 'consistency', 'security'],
});
```

## Configuration Options

### ScanOptions

```typescript
interface ScanOptions {
  /**
   * Root directory to scan
   * @default process.cwd()
   */
  sourceRoot?: string;

  /**
   * Database provider
   * @default 'supabase'
   */
  provider?: 'supabase' | 'postgres' | 'custom';

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
```

### DatabaseConnection

```typescript
interface DatabaseConnection {
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
```

## Events

PixoGuard emits events throughout the scan lifecycle:

```typescript
pixolink.on('pixoguard:scan:started', (data) => {
  console.log('Scan started:', data.options);
});

pixolink.on('pixoguard:scan:database:complete', (data) => {
  console.log('Database scan complete:', data.metadata);
});

pixolink.on('pixoguard:scan:code:complete', (data) => {
  console.log('Code scan complete:', data.codeScan);
});

pixolink.on('pixoguard:scan:complete', (data) => {
  console.log('Scan complete:', data.report);
});

pixolink.on('pixoguard:scan:error', (data) => {
  console.error('Scan error:', data.error);
});

pixolink.on('pixoguard:fix:applied', (data) => {
  console.log('Fix applied:', data.fix);
});

pixolink.on('pixoguard:fix:error', (data) => {
  console.error('Fix error:', data.fix, data.error);
});
```

## Report Structure

```typescript
interface AuditReport {
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
}

interface ReportItem {
  status: 'ok' | 'warn' | 'error';
  message: string;
  detail?: string;
  suggestedFix?: string;
  context?: Record<string, unknown>;
}
```

## Finding Types

### Missing Tables

```typescript
{
  status: 'error',
  message: 'Table "users" referenced in code but not found in database',
  suggestedFix: 'CREATE TABLE "users" (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  created_at TIMESTAMPTZ DEFAULT now()\n);',
  context: { table: 'users', type: 'missing_table' }
}
```

### Missing Functions

```typescript
{
  status: 'error',
  message: 'Function "get_user_profile" called in code but not found in database',
  suggestedFix: 'CREATE OR REPLACE FUNCTION "get_user_profile"()\nRETURNS json\n...',
  context: { function: 'get_user_profile', type: 'missing_function' }
}
```

### Broken Relations

```typescript
{
  status: 'error',
  message: 'Foreign key relation references missing table "profiles"',
  suggestedFix: 'CREATE TABLE "profiles" (...); ALTER TABLE "users" ADD CONSTRAINT ...',
  context: { relation: {...}, type: 'broken_relation_target' }
}
```

### RPC Argument Mismatches

```typescript
{
  status: 'error',
  message: 'RPC call to "update_profile" missing required argument "user_id"',
  context: {
    function: 'update_profile',
    expectedArg: 'user_id',
    providedArgs: ['name', 'email'],
    type: 'missing_rpc_argument'
  }
}
```

### Missing RLS

```typescript
{
  status: 'warn',
  message: 'Table "users" does not have RLS enabled',
  suggestedFix: 'ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;\n\nCREATE POLICY "Enable read access" ...',
  context: { table: 'users', type: 'missing_rls' }
}
```

## Custom Scanners

### Custom Database Scanner

```typescript
import { BaseDatabaseScanner, type DatabaseMetadata } from '@pixora/pixolink-pixoguard';

class MySQLScanner extends BaseDatabaseScanner {
  async connect(connection: DatabaseConnection): Promise<void> {
    // Implement MySQL connection
  }

  async scanSchema(): Promise<DatabaseMetadata> {
    // Implement MySQL schema introspection
    return {
      tables: [],
      functions: [],
      tableColumns: {},
      relations: [],
      functionSignatures: {},
      rls: {},
    };
  }

  // ... implement other methods
}

const pixoguard = new PixoGuardPlugin({
  databaseScanner: new MySQLScanner(),
});
```

### Custom Code Scanner

```typescript
import { type CodeScanner, type CodeScanResult } from '@pixora/pixolink-pixoguard';

class PrismaCodeScanner implements CodeScanner {
  async scan(sourceRoot: string): Promise<CodeScanResult> {
    // Scan for Prisma client usage
    // Example: prisma.user.findMany(), prisma.post.create()
    
    return {
      tables: ['user', 'post'],
      functions: [],
      rpcArguments: {},
    };
  }

  // ... implement other methods
}

const pixoguard = new PixoGuardPlugin({
  codeScanner: new PrismaCodeScanner(),
});
```

## CLI Usage

PixoGuard preserves the original CLI tool for standalone usage:

```bash
# Install globally
npm install -g pixoguard

# Scan project
pixoguard scan --root ./src --output ./report.json

# With specific layers
pixoguard scan --layers schema,rls,consistency

# With timeout
pixoguard scan --timeout 15000

# Fail on warnings
pixoguard scan --fail-on warn
```

### CLI Options

- `--root <path>` - Source root directory (default: `.`)
- `--output <path>` - JSON report output path
- `--project-ref <ref>` - Embed Supabase project reference
- `--timeout <ms>` - HTTP timeout in milliseconds (default: 8000)
- `--fail-on <level>` - Exit policy: `warn`, `error`, or `never` (default: `error`)
- `--layers <comma>` - Comma-separated layer IDs to run

### Environment Variables

```bash
# Supabase configuration
PIXOGUARD_SUPABASE_URL=https://xxx.supabase.co
PIXOGUARD_SUPABASE_SERVICE_KEY=xxx
PIXOGUARD_SUPABASE_ANON_KEY=xxx

# HTTP configuration
PIXOGUARD_HTTP_TIMEOUT_MS=10000

# Auto-fix configuration (DANGEROUS)
DATABASE_URL=postgresql://user:pass@localhost:5432/db
PIXOGUARD_APPLY_FIXES_CONFIRMED=true

# PR automation
PIXOGUARD_AUTO_PUSH=true
PIXOGUARD_PR_BRANCH_NAME=pixoguard/auto-fixes
```

## Advanced Usage

### Integration with Admin Dashboard

```typescript
import { PixoGuardPlugin } from '@pixora/pixolink-pixoguard';

const pixoguard = new PixoGuardPlugin();

// Scan and save report for dashboard
const report = await pixoguard.scanProject({
  sourceRoot: './src',
  provider: 'supabase',
  connection: { /* ... */ },
  outputPath: './public/dev/pixoguard-report.json', // Admin dashboard reads this
});

// Expose report endpoint
app.get('/api/admin/pixoguard/report', async (req, res) => {
  const report = await fs.readFile('./public/dev/pixoguard-report.json', 'utf-8');
  res.json(JSON.parse(report));
});
```

### Scheduled Scans

```typescript
import { CronJob } from 'cron';

// Scan every 6 hours
const job = new CronJob('0 */6 * * *', async () => {
  console.log('Running scheduled PixoGuard scan...');
  
  const report = await pixoguard.scanProject({
    sourceRoot: './src',
    provider: 'supabase',
    connection: { /* ... */ },
    outputPath: './pixoguard-report.json',
  });

  // Send notification if errors found
  if (report.summary.errors > 0) {
    await sendAlert({
      subject: 'PixoGuard: Schema Issues Detected',
      message: `Found ${report.summary.errors} errors in database schema`,
    });
  }
});

job.start();
```

### Custom Analysis Layer

```typescript
import { type Layer, type LayerResult } from '@pixora/pixolink-pixoguard';

const customLayer: Layer = {
  id: 'custom-security',
  description: 'Custom security checks',
  
  async run(context): Promise<LayerResult> {
    const findings = [];
    
    // Custom security logic
    if (context.dbMetadata) {
      for (const table of context.dbMetadata.tables) {
        const rls = context.dbMetadata.rls[table];
        if (!rls || !rls.enabled) {
          findings.push({
            status: 'error' as const,
            message: `CRITICAL: Table "${table}" has no RLS`,
          });
        }
      }
    }
    
    return {
      layer: 'custom-security',
      status: findings.length > 0 ? 'error' : 'ok',
      summary: `Checked ${context.dbMetadata?.tables.length} tables`,
      findings,
    };
  },
};

// Use custom layer
const result = await pixoguard.runLayer('custom-security', {
  sourceRoot: './src',
  dbMetadata: await pixoguard['dbScanner']!.scanSchema(),
});
```

## Migration from Standalone PixoGuard

If you're using standalone PixoGuard, migration is straightforward:

**Before (Standalone):**
```typescript
import { scanSupabase, scanReact, analyzer } from 'pixoguard';

const dbMetadata = await scanSupabase({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY,
});

const codeScan = await scanReact('./src');
const findings = await analyzer.analyze(dbMetadata, codeScan);
```

**After (PixoLink Plugin):**
```typescript
import { PixoGuardPlugin } from '@pixora/pixolink-pixoguard';

const pixoguard = new PixoGuardPlugin();

const report = await pixoguard.scanProject({
  sourceRoot: './src',
  provider: 'supabase',
  connection: {
    url: process.env.SUPABASE_URL!,
    key: process.env.SUPABASE_SERVICE_KEY!,
  },
});

const findings = report.findings;
```

**Advanced (Direct Access):**
```typescript
// Still access original pixoguard functions
import { scanSupabase, scanReact } from '@pixora/pixolink-pixoguard';

const dbMetadata = await scanSupabase({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY,
});
```

## Troubleshooting

### Connection Timeout

```typescript
// Increase timeout
const report = await pixoguard.scanProject({
  // ...
  timeout: 30000, // 30 seconds
});
```

### RLS Checking Requires Service Key

```typescript
// Use service key for RLS operations
connection: {
  url: process.env.SUPABASE_URL!,
  key: process.env.SUPABASE_ANON_KEY!,
  serviceKey: process.env.SUPABASE_SERVICE_KEY!, // Required for RLS
}
```

### Custom Provider Not Working

```typescript
// Ensure custom scanner is provided
const pixoguard = new PixoGuardPlugin({
  databaseScanner: new MyCustomScanner(),
});

// Then use 'custom' provider
const report = await pixoguard.scanProject({
  provider: 'custom',
  connection: { /* ... */ },
});
```

## Best Practices

1. **Use Service Key for RLS**: Always provide `serviceKey` for accurate RLS checking
2. **Run in CI/CD**: Integrate PixoGuard scans in your deployment pipeline
3. **Review Fixes**: Always review suggested fixes before applying (set `autoApply: false`)
4. **Scheduled Scans**: Run periodic scans to detect drift over time
5. **Save Reports**: Keep historical reports for tracking schema evolution
6. **Custom Layers**: Create custom layers for project-specific checks
7. **Event Monitoring**: Subscribe to events for real-time monitoring

## License

MIT

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](../../../CONTRIBUTING.md).

## Support

- GitHub Issues: https://github.com/pixora/pixolink/issues
- Discord: https://discord.gg/pixora
- Email: support@pixora.dev
