import type { Connector } from '../types/Plugin';

export interface SupabaseConfig {
  url: string;
  anonKey?: string;
  serviceKey?: string;
  config?: Record<string, unknown>;
}

/**
 * Supabase connector for database operations
 */
export class SupabaseConnector implements Connector<SupabaseConfig> {
  readonly name = 'supabase';
  readonly type = 'database' as const;

  private client: unknown;
  private config?: SupabaseConfig;

  async init(config: SupabaseConfig): Promise<void> {
    this.config = config;

    // Dynamic import to avoid bundle bloat
    try {
      const { createClient } = await import('@supabase/supabase-js');

      const key = config.serviceKey || config.anonKey;
      if (!key) {
        throw new Error('Supabase requires either anonKey or serviceKey');
      }

      this.client = createClient(config.url, key, config.config);
    } catch (error) {
      throw new Error(`Failed to initialize Supabase: ${(error as Error).message}`);
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.client) return false;

    try {
      // Simple health check - try to get session
      const client = this.client as { auth: { getSession: () => Promise<unknown> } };
      await client.auth.getSession();
      return true;
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.client = undefined;
    this.config = undefined;
  }

  /**
   * Get Supabase client instance
   */
  getClient(): unknown {
    if (!this.client) {
      throw new Error('Supabase not initialized');
    }
    return this.client;
  }

  /**
   * Execute query with error handling
   */
  async executeQuery<T>(
    operation: string,
    queryFn: () => Promise<{ data: T | null; error: { message: string } | null }>
  ): Promise<T> {
    try {
      const { data, error } = await queryFn();

      if (error) {
        throw new Error(`Supabase ${operation} error: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Supabase ${operation} returned no data`);
      }

      return data;
    } catch (error) {
      throw new Error(`Supabase ${operation} failed: ${(error as Error).message}`);
    }
  }
}
