/**
 * Supabase Connector - Database & Storage Integration
 * Handles all Supabase operations
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { IOLBus } from '../eventBus';
import type {
  ConnectorResult,
  SupabaseSaveOptions,
  SupabaseConnectorConfig
} from '../../types';

export class SupabaseConnector {
  private client: SupabaseClient | null = null;
  private config: SupabaseConnectorConfig;

  constructor(client?: SupabaseClient, config?: Partial<SupabaseConnectorConfig>) {
    this.client = client ?? null;
    this.config = {
      enabled: config?.enabled ?? true,
      tables: config?.tables ?? ['generations', 'prompt_history', 'user_preferences'],
      enableRealtime: config?.enableRealtime ?? false,
      retryAttempts: config?.retryAttempts ?? 3,
      timeout: config?.timeout ?? 10000
    };
  }

  /**
   * Set Supabase client
   */
  setClient(client: SupabaseClient): void {
    this.client = client;
  }

  /**
   * Save data to Supabase
   */
  async save(options: SupabaseSaveOptions): Promise<ConnectorResult> {
    if (!this.client) {
      return {
        success: false,
        error: new Error('Supabase client not initialized'),
        duration: 0,
        timestamp: Date.now()
      };
    }

    const startTime = Date.now();

    try {
      const query = this.client.from(options.table).insert(options.data);

      if (options.upsert) {
        query.upsert(options.data);
      }

      const { data, error } = await query.select();

      if (error) throw error;

      await IOLBus.publish('SYNC_COMPLETE', {
        table: options.table,
        operation: 'save',
        success: true
      });

      return {
        success: true,
        data,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      await IOLBus.publish('SYNC_FAILED', {
        table: options.table,
        operation: 'save',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Save failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Query data from Supabase
   */
  async query<T = unknown>(
    table: string,
    filters?: Record<string, unknown>
  ): Promise<ConnectorResult<T[]>> {
    if (!this.client) {
      return {
        success: false,
        error: new Error('Supabase client not initialized'),
        duration: 0,
        timestamp: Date.now()
      };
    }

    const startTime = Date.now();

    try {
      let query = this.client.from(table).select('*');

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data as T[],
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Query failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Update data in Supabase
   */
  async update(
    table: string,
    id: string,
    updates: Record<string, unknown>
  ): Promise<ConnectorResult> {
    if (!this.client) {
      return {
        success: false,
        error: new Error('Supabase client not initialized'),
        duration: 0,
        timestamp: Date.now()
      };
    }

    const startTime = Date.now();

    try {
      const { data, error } = await this.client
        .from(table)
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;

      await IOLBus.publish('SYNC_COMPLETE', {
        table,
        operation: 'update',
        success: true
      });

      return {
        success: true,
        data,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Update failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Delete data from Supabase
   */
  async delete(table: string, id: string): Promise<ConnectorResult> {
    if (!this.client) {
      return {
        success: false,
        error: new Error('Supabase client not initialized'),
        duration: 0,
        timestamp: Date.now()
      };
    }

    const startTime = Date.now();

    try {
      const { error } = await this.client.from(table).delete().eq('id', id);

      if (error) throw error;

      return {
        success: true,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Delete failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Upload file to Supabase Storage
   */
  async uploadFile(
    bucket: string,
    path: string,
    file: File | Blob
  ): Promise<ConnectorResult<{ path: string; url: string }>> {
    if (!this.client) {
      return {
        success: false,
        error: new Error('Supabase client not initialized'),
        duration: 0,
        timestamp: Date.now()
      };
    }

    const startTime = Date.now();

    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .upload(path, file);

      if (error) throw error;

      const { data: urlData } = this.client.storage.from(bucket).getPublicUrl(path);

      return {
        success: true,
        data: {
          path: data.path,
          url: urlData.publicUrl
        },
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Upload failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client) return false;

    try {
      const { error } = await this.client.from('generations').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
}

// Create default instance (will be initialized later)
export const supabaseConnector = new SupabaseConnector();
