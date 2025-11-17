/**
 * Sync Manager Engine
 * Orchestrates bidirectional sync with conflict resolution
 */
import Dexie, { Table } from 'dexie';
import { SupabaseClient } from '@supabase/supabase-js';
import { networkMonitor, NetworkStatus } from '../utils/networkStatus';

export interface SyncConfig {
  table: string;
  idField?: string;
  timestampField?: string;
  conflictResolution?: 'local-wins' | 'remote-wins' | 'latest-wins' | 'manual';
}

export interface SyncEntry {
  id?: number;
  localId: string;
  remoteId?: string;
  table: string;
  action: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  synced: boolean;
  retries?: number;
}

export interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  conflicts: number;
  errors: string[];
}

class SyncDatabase extends Dexie {
  syncQueue!: Table<SyncEntry, number>;

  constructor() {
    super('PixoSyncDB');
    this.version(1).stores({
      syncQueue: '++id, table, synced, timestamp',
    });
  }
}

const db = new SyncDatabase();

export class SyncManager {
  private supabase: SupabaseClient;
  private config: Map<string, SyncConfig> = new Map();
  private isSyncing = false;
  private autoSyncEnabled = false;
  private autoSyncInterval?: number;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.setupNetworkListener();
  }

  /**
   * Register a table for syncing
   */
  registerTable(config: SyncConfig): void {
    this.config.set(config.table, {
      idField: 'id',
      timestampField: 'updated_at',
      conflictResolution: 'latest-wins',
      ...config,
    });
  }

  /**
   * Queue an action for sync
   */
  async queueAction(
    table: string,
    action: 'create' | 'update' | 'delete',
    data: Record<string, unknown>,
    localId: string
  ): Promise<void> {
    await db.syncQueue.add({
      localId,
      table,
      action,
      data,
      timestamp: Date.now(),
      synced: false,
      retries: 0,
    });

    // Try immediate sync if online
    if (networkMonitor.isOnline()) {
      this.sync().catch(console.error);
    }
  }

  /**
   * Perform bidirectional sync
   */
  async sync(tables?: string[]): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        uploaded: 0,
        downloaded: 0,
        conflicts: 0,
        errors: ['Sync already in progress'],
      };
    }

    if (!networkMonitor.isOnline()) {
      return {
        success: false,
        uploaded: 0,
        downloaded: 0,
        conflicts: 0,
        errors: ['Device is offline'],
      };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      uploaded: 0,
      downloaded: 0,
      conflicts: 0,
      errors: [],
    };

    try {
      const tablesToSync = tables || Array.from(this.config.keys());

      for (const table of tablesToSync) {
        const uploadResult = await this.uploadChanges(table);
        result.uploaded += uploadResult.uploaded ?? 0;
        result.conflicts += uploadResult.conflicts ?? 0;
        result.errors.push(...(uploadResult.errors ?? []));

        const downloadResult = await this.downloadChanges(table);
        result.downloaded += downloadResult.downloaded ?? 0;
        result.conflicts += downloadResult.conflicts ?? 0;
        result.errors.push(...(downloadResult.errors ?? []));
      }

      result.success = result.errors.length === 0;
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Enable automatic syncing
   */
  enableAutoSync(intervalMs = 60000): void {
    this.autoSyncEnabled = true;
    this.autoSyncInterval = window.setInterval(() => {
      this.sync().catch(console.error);
    }, intervalMs);
  }

  /**
   * Disable automatic syncing
   */
  disableAutoSync(): void {
    this.autoSyncEnabled = false;
    if (this.autoSyncInterval) {
      window.clearInterval(this.autoSyncInterval);
    }
  }

  /**
   * Get pending sync count
   */
  async getPendingCount(table?: string): Promise<number> {
    const query = db.syncQueue.where({ synced: false });
    if (table) {
      return query.and(entry => entry.table === table).count();
    }
    return query.count();
  }

  /**
   * Clear all sync data
   */
  async clearSyncQueue(): Promise<void> {
    await db.syncQueue.clear();
  }

  private async uploadChanges(table: string): Promise<Partial<SyncResult>> {
    const config = this.config.get(table);
    if (!config) {
      return { uploaded: 0, conflicts: 0, errors: [`Table ${table} not configured`] };
    }

    const pending = await db.syncQueue
      .where({ table, synced: false })
      .and(entry => (entry.retries ?? 0) < 3)
      .toArray();

    let uploaded = 0;
    const conflicts = 0;
    const errors: string[] = [];

    for (const entry of pending) {
      try {
        if (entry.action === 'create' || entry.action === 'update') {
          const { error } = await this.supabase.from(table).upsert(entry.data);
          if (error) {
            errors.push(`Upload error: ${error.message}`);
            await this.incrementRetries(entry.id!);
          } else {
            await this.markAsSynced(entry.id!);
            uploaded++;
          }
        } else if (entry.action === 'delete') {
          const { error } = await this.supabase
            .from(table)
            .delete()
            .eq(config.idField!, entry.data[config.idField!]);
          if (error) {
            errors.push(`Delete error: ${error.message}`);
            await this.incrementRetries(entry.id!);
          } else {
            await this.markAsSynced(entry.id!);
            uploaded++;
          }
        }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : 'Upload failed');
        await this.incrementRetries(entry.id!);
      }
    }

    return { uploaded, conflicts, errors };
  }

  private async downloadChanges(table: string): Promise<Partial<SyncResult>> {
    const config = this.config.get(table);
    if (!config) {
      return { downloaded: 0, conflicts: 0, errors: [`Table ${table} not configured`] };
    }

    // For now, just return empty - full download logic would need app-specific storage
    // This is a placeholder that can be extended per table
    return { downloaded: 0, conflicts: 0, errors: [] };
  }

  private async markAsSynced(id: number): Promise<void> {
    await db.syncQueue.update(id, { synced: true });
  }

  private async incrementRetries(id: number): Promise<void> {
    const entry = await db.syncQueue.get(id);
    if (entry) {
      await db.syncQueue.update(id, { retries: (entry.retries ?? 0) + 1 });
    }
  }

  private setupNetworkListener(): void {
    networkMonitor.subscribe((status: NetworkStatus) => {
      if (status.isOnline && this.autoSyncEnabled) {
        this.sync().catch(console.error);
      }
    });
  }
}
