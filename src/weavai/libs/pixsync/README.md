# PixSync

Cross-environment synchronization library for PixoRA. Provides offline-first data sync with conflict resolution and network monitoring.

## Features

- **Offline-First**: Queue actions locally, sync when online
- **Network Monitoring**: Real-time connection quality detection
- **Conflict Resolution**: Multiple strategies (local-wins, remote-wins, latest-wins)
- **Auto-Sync**: Background synchronization with customizable intervals
- **IndexedDB Queue**: Persistent local queue for pending changes
- **Supabase Integration**: Seamless cloud sync

## Installation

```bash
cd libs/pixsync
npm install
npm run build
```

## Usage

### Basic Setup

```typescript
import { SyncManager } from '@pixora/pixsync';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const syncManager = new SyncManager(supabase);

// Register tables to sync
syncManager.registerTable({
  table: 'generations',
  idField: 'id',
  timestampField: 'updated_at',
  conflictResolution: 'latest-wins'
});

// Enable auto-sync every minute
syncManager.enableAutoSync(60000);
```

### Queue Actions

```typescript
// Queue a create action
await syncManager.queueAction(
  'generations',
  'create',
  { prompt: 'sunset', userId: 'user-123' },
  'local-id-1'
);

// Queue an update
await syncManager.queueAction(
  'generations',
  'update',
  { id: 'gen-123', likes: 5 },
  'gen-123'
);

// Queue a delete
await syncManager.queueAction(
  'generations',
  'delete',
  { id: 'gen-456' },
  'gen-456'
);
```

### Manual Sync

```typescript
// Sync all registered tables
const result = await syncManager.sync();
console.log(result);
// { success: true, uploaded: 3, downloaded: 5, conflicts: 0, errors: [] }

// Sync specific tables
const result = await syncManager.sync(['generations', 'profiles']);
```

### Network Monitoring

```typescript
import { networkMonitor } from '@pixora/pixsync';

// Get current status
const status = networkMonitor.getStatus();
console.log(status);
// { isOnline: true, quality: 'excellent', effectiveType: '4g', downlink: 10, rtt: 50 }

// Subscribe to changes
const unsubscribe = networkMonitor.subscribe(status => {
  if (status.quality === 'offline') {
    console.log('Device went offline');
  } else {
    console.log(`Connected with ${status.quality} quality`);
  }
});

// Check connection
if (networkMonitor.isOnline()) {
  await syncManager.sync();
}

// Cleanup
unsubscribe();
```

### Check Pending Sync

```typescript
// Get total pending count
const total = await syncManager.getPendingCount();
console.log(`${total} items waiting to sync`);

// Get count for specific table
const pending = await syncManager.getPendingCount('generations');
console.log(`${pending} generations pending`);
```

### Conflict Resolution Strategies

```typescript
// Local wins - Always keep local changes
syncManager.registerTable({
  table: 'drafts',
  conflictResolution: 'local-wins'
});

// Remote wins - Always accept server changes
syncManager.registerTable({
  table: 'server_config',
  conflictResolution: 'remote-wins'
});

// Latest wins - Use timestamp to decide (default)
syncManager.registerTable({
  table: 'user_profiles',
  conflictResolution: 'latest-wins',
  timestampField: 'updated_at'
});

// Manual resolution (future feature)
syncManager.registerTable({
  table: 'critical_data',
  conflictResolution: 'manual'
});
```

## API Reference

### `SyncManager`

Main sync orchestrator.

**Constructor:**
```typescript
new SyncManager(supabase: SupabaseClient)
```

**Methods:**

- `registerTable(config: SyncConfig)`: Register a table for syncing
- `queueAction(table, action, data, localId)`: Queue an action for sync
- `sync(tables?)`: Perform bidirectional sync
- `enableAutoSync(intervalMs)`: Enable automatic syncing
- `disableAutoSync()`: Disable automatic syncing
- `getPendingCount(table?)`: Get count of pending sync items
- `clearSyncQueue()`: Clear all queued sync actions

**SyncConfig:**
```typescript
interface SyncConfig {
  table: string;
  idField?: string; // default: 'id'
  timestampField?: string; // default: 'updated_at'
  conflictResolution?: 'local-wins' | 'remote-wins' | 'latest-wins' | 'manual';
}
```

**SyncResult:**
```typescript
interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  conflicts: number;
  errors: string[];
}
```

### `NetworkMonitor`

Network status monitoring.

**Methods:**

- `getStatus()`: Get current network status
- `subscribe(callback)`: Subscribe to network changes (returns unsubscribe function)
- `isOnline()`: Check if device is online
- `getQuality()`: Get connection quality

**NetworkStatus:**
```typescript
interface NetworkStatus {
  isOnline: boolean;
  quality: 'offline' | 'poor' | 'good' | 'excellent';
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number; // Mbps
  rtt?: number; // milliseconds
}
```

## Examples

### React Integration

```typescript
import { useEffect, useState } from 'react';
import { SyncManager, networkMonitor } from '@pixora/pixsync';

function useSyncStatus() {
  const [status, setStatus] = useState(networkMonitor.getStatus());
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const unsubscribe = networkMonitor.subscribe(setStatus);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const count = await syncManager.getPendingCount();
      setPending(count);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return { status, pending };
}

function SyncIndicator() {
  const { status, pending } = useSyncStatus();

  return (
    <div>
      <span>Status: {status.quality}</span>
      {pending > 0 && <span>{pending} items pending sync</span>}
    </div>
  );
}
```

### Error Handling

```typescript
const result = await syncManager.sync();

if (!result.success) {
  console.error('Sync failed:', result.errors);
  
  // Retry specific tables that failed
  if (result.errors.some(e => e.includes('generations'))) {
    setTimeout(() => syncManager.sync(['generations']), 5000);
  }
}

if (result.conflicts > 0) {
  console.warn(`${result.conflicts} conflicts detected`);
  // Handle conflicts manually
}
```

## Database Schema

PixSync uses IndexedDB for local queue storage. No manual setup required - the database is created automatically.

For Supabase tables, ensure they have:
- Primary key field (default: `id`)
- Timestamp field for conflict resolution (default: `updated_at`)

## Development

```bash
# Install dependencies
npm install

# Build library
npm run build

# Watch mode
npm run dev

# Run tests
npm test
```

## Dependencies

- `dexie` ^4.0.0 - IndexedDB wrapper
- `@supabase/supabase-js` ^2.0.0 (peer) - Supabase client

## Integration with PixoRA

PixSync coordinates with other PixoRA libraries:

- **LCM**: Sync prompt history across devices
- **pixoguard**: Sync quality reports
- **ai-core**: Sync model configurations

## License

Proprietary - PixoRA Internal Library
