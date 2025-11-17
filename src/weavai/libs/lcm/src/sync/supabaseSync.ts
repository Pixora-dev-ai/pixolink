/**
 * Supabase Sync Manager
 * Handles syncing local data with Supabase
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { IndexedDBStorage } from '../storage/indexedDB';

export class SupabaseSync {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Sync unsynced prompts to Supabase
   */
  async syncPrompts(userId: string): Promise<{ synced: number; errors: number }> {
    const unsynced = await IndexedDBStorage.getUnsyncedPrompts(userId);
    let synced = 0;
    let errors = 0;

    for (const entry of unsynced) {
      try {
        const { error } = await this.supabase.from('prompt_history').insert({
          user_id: entry.userId,
          prompt: entry.prompt,
          result: entry.result,
          result_url: entry.resultUrl,
          feedback: entry.feedback,
          metadata: entry.metadata,
          created_at: new Date(entry.timestamp).toISOString(),
        });

        if (error) {
          console.error('Supabase sync error:', error);
          errors++;
        } else {
          if (entry.id) {
            await IndexedDBStorage.markAsSynced([entry.id]);
          }
          synced++;
        }
      } catch (err) {
        console.error('Sync exception:', err);
        errors++;
      }
    }

    return { synced, errors };
  }

  /**
   * Pull recent data from Supabase to local storage
   */
  async pullFromSupabase(userId: string, since?: number): Promise<number> {
    const sinceDate = since ? new Date(since).toISOString() : new Date(0).toISOString();

    const { data, error } = await this.supabase
      .from('prompt_history')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', sinceDate)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Pull error:', error);
      return 0;
    }

    let imported = 0;
    for (const row of data || []) {
      await IndexedDBStorage.savePrompt({
        userId: row.user_id,
        prompt: row.prompt,
        result: row.result,
        resultUrl: row.result_url,
        feedback: row.feedback,
        metadata: row.metadata,
      });
      imported++;
    }

    return imported;
  }

  /**
   * Bidirectional sync
   */
  async fullSync(userId: string): Promise<{ uploaded: number; downloaded: number; errors: number }> {
    const uploadResult = await this.syncPrompts(userId);
    const lastSync = (await IndexedDBStorage.getPreference(userId, 'last_sync')) as number | null;
    const downloaded = await this.pullFromSupabase(userId, lastSync || undefined);
    await IndexedDBStorage.savePreference(userId, 'last_sync', Date.now());

    return {
      uploaded: uploadResult.synced,
      downloaded,
      errors: uploadResult.errors,
    };
  }
}
