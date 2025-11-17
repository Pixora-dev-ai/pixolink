/**
 * PixSync Adapter - Cross-Environment Sync Integration
 * Manages offline-first synchronization
 */

import { SyncManager, networkMonitor } from '../../../../../pixolink/src/weavai/libs/pixsync/src/index';
import { IOLBus } from '../eventBus';
import type { ConnectorResult, PixSyncOptions, PixSyncResult } from '../../types';

export class PixSyncAdapter {
  private syncManager: SyncManager | null = null;
  private autoSyncInterval: NodeJS.Timeout | null = null;

  constructor(supabaseClient?: unknown) {
    if (supabaseClient) {
      this.syncManager = new SyncManager(supabaseClient);
    }

    // Subscribe to network changes
    networkMonitor.subscribe((status) => {
      IOLBus.publish('TELEMETRY_LOGGED', {
        source: 'pixsync',
        event: 'network_change',
        status
      }).catch(console.error);
    });
  }

  /**
   * Initialize sync manager
   */
  initialize(supabaseClient: unknown): void {
    this.syncManager = new SyncManager(supabaseClient);
  }

  /**
   * Register table for syncing
   */
  registerTable(table: string, conflictResolution?: 'client-wins' | 'server-wins' | 'merge'): void {
    if (!this.syncManager) {
      throw new Error('Sync manager not initialized');
    }

    this.syncManager.registerTable({
      table,
      conflictResolution
    });
  }

  /**
   * Queue action for sync
   */
  async queueAction(
    table: string,
    action: 'insert' | 'update' | 'delete',
    data: Record<string, unknown>
  ): Promise<ConnectorResult> {
    if (!this.syncManager) {
      return {
        success: false,
        error: new Error('Sync manager not initialized'),
        duration: 0,
        timestamp: Date.now()
      };
    }

    const startTime = Date.now();

    try {
      await this.syncManager.queueAction({
        table,
        action,
        data
      });

      return {
        success: true,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Queue action failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Sync data to cloud
   */
  async sync(options?: PixSyncOptions): Promise<ConnectorResult<PixSyncResult>> {
    if (!this.syncManager) {
      return {
        success: false,
        error: new Error('Sync manager not initialized'),
        duration: 0,
        timestamp: Date.now()
      };
    }

    const startTime = Date.now();

    try {
      await IOLBus.publish('SYNC_STARTED', {
        userId: options?.userId,
        source: 'pixsync'
      });

      const result = await this.syncManager.sync();

      await IOLBus.publish('SYNC_COMPLETE', {
        userId: options?.userId,
        source: 'pixsync',
        result
      });

      return {
        success: true,
        data: result as PixSyncResult,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      await IOLBus.publish('SYNC_FAILED', {
        userId: options?.userId,
        source: 'pixsync',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Sync failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Enable auto-sync
   */
  enableAutoSync(interval = 60000): void {
    if (!this.syncManager) {
      throw new Error('Sync manager not initialized');
    }

    // Clear existing interval
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    this.syncManager.enableAutoSync(interval);
  }

  /**
   * Disable auto-sync
   */
  disableAutoSync(): void {
    if (this.syncManager) {
      this.syncManager.disableAutoSync();
    }

    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }

  /**
   * Get pending sync count
   */
  getPendingCount(): number {
    if (!this.syncManager) return 0;
    return this.syncManager.getPendingCount();
  }

  /**
   * Get network status
   */
  getNetworkStatus() {
    return networkMonitor.getStatus();
  }

  /**
   * Clear sync queue
   */
  async clearQueue(): Promise<ConnectorResult> {
    if (!this.syncManager) {
      return {
        success: false,
        error: new Error('Sync manager not initialized'),
        duration: 0,
        timestamp: Date.now()
      };
    }

    const startTime = Date.now();

    try {
      await this.syncManager.clearSyncQueue();

      return {
        success: true,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Clear queue failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }
}
