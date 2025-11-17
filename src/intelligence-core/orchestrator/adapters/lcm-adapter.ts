/**
 * LCM Adapter - LUMINA Context Memory Integration
 * Provides clean interface to LCM functionality
 */

import { IndexedDBStorage, FeedbackEngine, SupabaseSync } from '../../../../../pixolink/src/weavai/libs/lcm/src/index';
import { IOLBus } from '../eventBus';
import type { ConnectorResult, LCMSaveOptions, LCMHistoryOptions } from '../../types';

export class LCMAdapter {
  private sync: SupabaseSync | null = null;

  constructor(supabaseClient?: unknown) {
    if (supabaseClient) {
      this.sync = new SupabaseSync(supabaseClient);
    }
  }

  /**
   * Save prompt to memory
   */
  async savePrompt(options: LCMSaveOptions): Promise<ConnectorResult> {
    const startTime = Date.now();

    try {
      await IndexedDBStorage.savePrompt({
        userId: options.userId,
        prompt: options.prompt,
        response: options.response,
        feedback: options.feedback ?? 'neutral',
        timestamp: Date.now(),
        synced: false,
        metadata: options.metadata
      });

      await IOLBus.publish('LEARNING_UPDATED', {
        userId: options.userId,
        action: 'save_prompt',
        feedback: options.feedback
      });

      return {
        success: true,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Save prompt failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get prompt history
   */
  async getHistory(options: LCMHistoryOptions): Promise<ConnectorResult> {
    const startTime = Date.now();

    try {
      let prompts;

      if (options.feedback) {
        prompts = await IndexedDBStorage.getPromptsByFeedback(
          options.userId,
          options.feedback
        );
      } else {
        prompts = await IndexedDBStorage.getHistory(
          options.userId,
          options.limit ?? 50
        );
      }

      return {
        success: true,
        data: prompts,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Get history failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Update feedback for a prompt
   */
  async updateFeedback(
    promptId: string,
    feedback: 'liked' | 'disliked' | 'neutral'
  ): Promise<ConnectorResult> {
    const startTime = Date.now();

    try {
      await IndexedDBStorage.updateFeedback(promptId, feedback);

      await IOLBus.publish('FEEDBACK_RECEIVED', {
        promptId,
        feedback
      });

      return {
        success: true,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Update feedback failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get personalized suggestions
   */
  async getSuggestions(userId: string): Promise<ConnectorResult> {
    const startTime = Date.now();

    try {
      const suggestions = await FeedbackEngine.getSuggestions(userId);

      return {
        success: true,
        data: suggestions,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Get suggestions failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Calculate prompt score
   */
  async calculateScore(userId: string, prompt: string): Promise<ConnectorResult> {
    const startTime = Date.now();

    try {
      const result = await FeedbackEngine.calculatePromptScore(userId, prompt);

      return {
        success: true,
        data: result,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Calculate score failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Sync to cloud
   */
  async syncToCloud(userId: string): Promise<ConnectorResult> {
    if (!this.sync) {
      return {
        success: false,
        error: new Error('Sync not initialized (Supabase client missing)'),
        duration: 0,
        timestamp: Date.now()
      };
    }

    const startTime = Date.now();

    try {
      await IOLBus.publish('SYNC_STARTED', { userId, source: 'lcm' });

      await this.sync.syncPrompts(userId);

      await IOLBus.publish('SYNC_COMPLETE', { userId, source: 'lcm' });

      return {
        success: true,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      await IOLBus.publish('SYNC_FAILED', {
        userId,
        source: 'lcm',
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
   * Get user statistics
   */
  async getStats(userId: string): Promise<ConnectorResult> {
    const startTime = Date.now();

    try {
      const stats = await IndexedDBStorage.getStats(userId);

      return {
        success: true,
        data: stats,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Get stats failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }
}
