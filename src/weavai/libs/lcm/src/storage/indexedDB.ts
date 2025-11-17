/**
 * IndexedDB Storage Layer for LCM
 * Handles local storage of prompts, results, and feedback
 */
import Dexie, { Table } from 'dexie';

export interface PromptEntry {
  id?: number;
  userId: string;
  prompt: string;
  result: string;
  resultUrl?: string;
  feedback?: 'like' | 'dislike' | null;
  metadata?: Record<string, unknown>;
  timestamp: number;
  synced: boolean;
}

export interface UserPreference {
  id?: number;
  userId: string;
  key: string;
  value: unknown;
  updatedAt: number;
}

class LCMDatabase extends Dexie {
  prompts!: Table<PromptEntry>;
  preferences!: Table<UserPreference>;

  constructor() {
    super('LCMDatabase');
    this.version(1).stores({
      prompts: '++id, userId, timestamp, feedback, synced',
      preferences: '++id, userId, key',
    });
  }
}

const db = new LCMDatabase();

export class IndexedDBStorage {
  /**
   * Save a prompt entry
   */
  static async savePrompt(entry: Omit<PromptEntry, 'id' | 'timestamp' | 'synced'>): Promise<number> {
    return await db.prompts.add({
      ...entry,
      timestamp: Date.now(),
      synced: false,
    });
  }

  /**
   * Get prompt history for a user
   */
  static async getHistory(userId: string, limit = 50): Promise<PromptEntry[]> {
    return await db.prompts
      .where('userId')
      .equals(userId)
      .reverse()
      .limit(limit)
      .toArray();
  }

  /**
   * Get feedback-filtered prompts
   */
  static async getPromptsByFeedback(
    userId: string,
    feedback: 'like' | 'dislike'
  ): Promise<PromptEntry[]> {
    return await db.prompts
      .where(['userId', 'feedback'])
      .equals([userId, feedback])
      .toArray();
  }

  /**
   * Update feedback for a prompt
   */
  static async updateFeedback(id: number, feedback: 'like' | 'dislike'): Promise<number> {
    return await db.prompts.update(id, { feedback, synced: false });
  }

  /**
   * Get unsynced entries
   */
  static async getUnsyncedPrompts(userId: string): Promise<PromptEntry[]> {
    return await db.prompts.where({ userId, synced: false }).toArray();
  }

  /**
   * Mark entries as synced
   */
  static async markAsSynced(ids: number[]): Promise<void> {
    await db.prompts.bulkUpdate(
      ids.map((id) => ({ key: id, changes: { synced: true } }))
    );
  }

  /**
   * Save user preference
   */
  static async savePreference(userId: string, key: string, value: unknown): Promise<number> {
    const existing = await db.preferences.where({ userId, key }).first();
    if (existing) {
      await db.preferences.update(existing.id!, { value, updatedAt: Date.now() });
      return existing.id!;
    }
    return await db.preferences.add({ userId, key, value, updatedAt: Date.now() });
  }

  /**
   * Get user preference
   */
  static async getPreference(userId: string, key: string): Promise<unknown | null> {
    const pref = await db.preferences.where({ userId, key }).first();
    return pref?.value ?? null;
  }

  /**
   * Clear user data
   */
  static async clearUserData(userId: string): Promise<void> {
    await db.prompts.where('userId').equals(userId).delete();
    await db.preferences.where('userId').equals(userId).delete();
  }

  /**
   * Get database statistics
   */
  static async getStats(userId: string): Promise<{
    totalPrompts: number;
    likes: number;
    dislikes: number;
    unsynced: number;
  }> {
    const total = await db.prompts.where('userId').equals(userId).count();
    const likes = await db.prompts.where(['userId', 'feedback']).equals([userId, 'like']).count();
    const dislikes = await db.prompts
      .where(['userId', 'feedback'])
      .equals([userId, 'dislike'])
      .count();
    const unsynced = await db.prompts.where({ userId, synced: false }).count();

    return { totalPrompts: total, likes, dislikes, unsynced };
  }
}

export default db;
