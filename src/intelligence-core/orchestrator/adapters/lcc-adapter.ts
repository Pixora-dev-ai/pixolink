/**
 * LCC Adapter - LUMINA Cognitive Chain Integration
 * Provides prompt enhancement and multi-step reasoning
 */

import { CognitiveChain } from '../../../../../pixolink/src/weavai/libs/lcc/src/index';
import { IOLBus } from '../eventBus';
import type { ConnectorResult, LCCEnhanceOptions, LCCEnhanceResult, LCCValidationResult } from '../../types';

export class LCCAdapter {
  private chains: Map<string, CognitiveChain> = new Map();

  /**
   * Get or create chain for user
   */
  private getChain(userId: string, supabaseClient?: unknown): CognitiveChain {
    const key = userId;
    
    if (!this.chains.has(key)) {
      this.chains.set(key, new CognitiveChain(userId, supabaseClient));
    }

    return this.chains.get(key)!;
  }

  /**
   * Enhance prompt using cognitive chain
   */
  async enhancePrompt(options: LCCEnhanceOptions, supabaseClient?: unknown): Promise<ConnectorResult<LCCEnhanceResult>> {
    const startTime = Date.now();

    try {
      const chain = this.getChain(options.userId, supabaseClient);

      const result = await chain.enhancePrompt(options.prompt);

      await IOLBus.publish('PROMPT_ENHANCED', {
        userId: options.userId,
        original: options.prompt,
        enhanced: result.enhanced,
        improvements: result.improvements
      });

      return {
        success: true,
        data: result as LCCEnhanceResult,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Enhance prompt failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Validate prompt using cognitive chain
   */
  async validatePrompt(prompt: string, userId: string, supabaseClient?: unknown): Promise<ConnectorResult<LCCValidationResult>> {
    const startTime = Date.now();

    try {
      const chain = this.getChain(userId, supabaseClient);

      const result = await chain.validatePrompt(prompt);

      if (!result.isValid) {
        await IOLBus.publish('VALIDATION_ERROR', {
          userId,
          prompt,
          issues: result.issues
        });
      }

      return {
        success: true,
        data: result as LCCValidationResult,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Validate prompt failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Start a new cognitive session
   */
  async startSession(
    userId: string,
    context: string,
    metadata?: Record<string, unknown>,
    supabaseClient?: unknown
  ): Promise<ConnectorResult> {
    const startTime = Date.now();

    try {
      const chain = this.getChain(userId, supabaseClient);

      await chain.startSession(context, metadata);

      await IOLBus.publish('SESSION_STARTED', {
        userId,
        context,
        source: 'lcc'
      });

      return {
        success: true,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Start session failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Complete current session
   */
  async completeSession(userId: string): Promise<ConnectorResult> {
    const startTime = Date.now();

    try {
      const chain = this.chains.get(userId);

      if (!chain) {
        throw new Error('No active session for user');
      }

      const session = await chain.completeSession();

      await IOLBus.publish('SESSION_ENDED', {
        userId,
        session,
        source: 'lcc'
      });

      return {
        success: true,
        data: session,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Complete session failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get current session
   */
  getCurrentSession(userId: string): unknown {
    const chain = this.chains.get(userId);
    return chain?.getCurrentSession();
  }

  /**
   * Clear chain for user
   */
  clearChain(userId: string): void {
    this.chains.delete(userId);
  }

  /**
   * Clear all chains
   */
  clearAll(): void {
    this.chains.clear();
  }
}
