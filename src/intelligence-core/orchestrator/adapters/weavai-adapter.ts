/**
 * WeavAI Adapter - Bridges the PrePilot WeavAI core into the orchestration layer.
 */

import type { ConnectorResult } from '../../types';
import { IOLBus } from '../eventBus';
import { weavAIService } from '../../weavAI/service';
import type { AnalyzePromptOptions, WeavAIInsightResult } from '../../weavAI/types';
import type { TelemetryEvent } from '../../weavAI/legacy-types';

export class WeavAIAdapter {
  private telemetryUnsubscribe?: () => void;
  private initialized = false;

  constructor(private readonly config: { userId?: string; sessionId?: string }) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await weavAIService.initialize({
      userId: this.config.userId,
      sessionId: this.config.sessionId,
    });
    this.telemetryUnsubscribe = weavAIService.subscribeTelemetry(this.handleTelemetry);
    this.initialized = true;
  }

  async analyzePrompt(
    prompt: string,
    metadata?: Record<string, unknown>
  ): Promise<ConnectorResult<WeavAIInsightResult>> {
    const start = Date.now();

    try {
      await this.initialize();

      const options: AnalyzePromptOptions = {
        prompt,
        userId: this.config.userId,
        sessionId: this.config.sessionId,
        metadata,
      };

      const result = await weavAIService.analyzePrompt(options);

      if (result.available) {
        await IOLBus.publish('PROMPT_GENERATED', {
          userId: this.config.userId,
          prompt,
          source: 'weavai',
          insight: result.insight,
        });
      }

      return {
        success: result.available,
        data: result,
        duration: Date.now() - start,
        timestamp: Date.now(),
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - start,
        timestamp: Date.now(),
        error: error instanceof Error ? error : new Error('WeavAI analysis failed'),
      };
    }
  }

  async getStatus() {
    return weavAIService.getStatus();
  }

  async destroy(): Promise<void> {
    if (this.telemetryUnsubscribe) {
      this.telemetryUnsubscribe();
    }
    await weavAIService.shutdown();
    this.initialized = false;
  }

  private handleTelemetry = (event: TelemetryEvent) => {
    IOLBus.publish('TELEMETRY_LOGGED', {
      type: 'TELEMETRY_LOGGED',
      data: {
        source: 'weavai',
        event,
      },
      timestamp: event.timestamp,
      userId: this.config.userId,
      sessionId: this.config.sessionId,
    });
  };
}
