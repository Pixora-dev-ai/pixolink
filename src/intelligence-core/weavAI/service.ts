import {
  bootstrapWeavAI,
  type WeavAIInstance,
  type WeavAIConfig,
  type WeavAIStatus,
  type TelemetryEvent,
  type WeavAIGeneration,
} from '@prepilot/ai-core';
import { resolveWeavAIConnectorConfig } from './config';
import type { AnalyzePromptOptions, WeavAIInsight, WeavAIInsightResult } from './types';

type TelemetryListener = (event: TelemetryEvent) => void;

class WeavAIService {
  private instancePromise?: Promise<WeavAIInstance>;
  private telemetryListeners = new Set<TelemetryListener>();
  private lastStatus: WeavAIStatus | null = null;
  private bootstrapArgs?: { userId?: string; sessionId?: string };

  async initialize(options?: { userId?: string; sessionId?: string } & Partial<WeavAIConfig>): Promise<WeavAIInstance> {
    if (!this.instancePromise) {
      this.bootstrapArgs = { userId: options?.userId, sessionId: options?.sessionId };
      const connectors = options?.connectors ?? resolveWeavAIConnectorConfig();
      const hasConnectors = Object.keys(connectors).length > 0;
      const shouldLoadContextual =
        options?.plugins?.contextual?.enabled ?? hasConnectors;
      const defaultConnector =
        options?.defaults?.connector ?? pickDefaultConnector(connectors);

      const pluginConfig = shouldLoadContextual
        ? options?.plugins?.contextual?.config ??
          buildContextualConfig(options?.userId, options?.sessionId)
        : undefined;

      const config: WeavAIConfig = {
        connectors,
        plugins: shouldLoadContextual && pluginConfig
          ? {
              contextual: {
                enabled: true,
                config: pluginConfig,
              },
            }
          : undefined,
        defaults: {
          connector: defaultConnector,
          ...(options?.defaults ?? {}),
        },
        telemetry: {
          onEvent: (event) => {
            for (const listener of this.telemetryListeners) {
              listener(event);
            }
          },
        },
        ...options,
      };

      this.instancePromise = bootstrapWeavAI(config).then((instance) => {
        this.lastStatus = instance.getStatus();
        return instance;
      });
    }

    return this.instancePromise;
  }

  subscribeTelemetry(listener: TelemetryListener): () => void {
    this.telemetryListeners.add(listener);
    return () => this.telemetryListeners.delete(listener);
  }

  async getStatus(): Promise<WeavAIStatus | null> {
    await this.instancePromise?.catch(() => undefined);
    return this.instancePromise ? (await this.instancePromise).getStatus() : this.lastStatus;
  }

  async analyzePrompt(options: AnalyzePromptOptions): Promise<WeavAIInsightResult> {
    const instance = await this.initialize({
      userId: options.userId,
      sessionId: options.sessionId,
      ...this.bootstrapArgs,
    });

    const status = instance.getStatus();
    this.lastStatus = status;
    if (!status.ready) {
      return {
        available: false,
        reason: 'weavai_not_ready',
      };
    }

    try {
      const generation = await instance.generate(buildPromptPayload(options), {
        responseFormat: 'json',
        temperature: 0.2,
        maxTokens: 700,
        systemPrompt: buildSystemPrompt(),
        metadata: {
          enablePIE: true,
          enableACCE: true,
          enableCognitivePipeline: true,
          enableCAE: true,
          enableORE: true,
          caeRequireJson: true,
          caeRequireCodeDelimiters: true,
          ...(options.metadata || {}),
        },
      });

      const insight = parseInsight(generation, options.prompt);
      return {
        available: true,
        generation,
        insight,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('WeavAI generation failed');
      return {
        available: false,
        reason: 'generation_failed',
        error: err,
      };
    }
  }

  async shutdown(): Promise<void> {
    if (this.instancePromise) {
      const instance = await this.instancePromise;
      await instance.shutdown();
      this.instancePromise = undefined;
      this.lastStatus = null;
    }
  }
}

function buildContextualConfig(userId?: string, sessionId?: string) {
  const userLabel = userId ?? 'anonymous';
  return {
    user: {
      id: userLabel,
      metadata: {
        origin: 'pixora-intelligence-layer',
      },
    },
    session: {
      id: sessionId ?? `weavai-session-${Date.now()}`,
      autoRenew: true,
      ttl: 15 * 60 * 1000,
    },
    goals: ['consistent-quality', 'style-adherence', 'risk-mitigation'],
    memoryStore: 'local',
    telemetry: true,
    promptComposition: {
      includeUserContext: true,
      includeIntent: true,
      includeGoals: true,
      includeSessionHistory: false,
      maxMemoryChunks: 6,
    },
    intentAnalyzer: {
      minConfidence: 0.2,
    },
  };
}

function buildSystemPrompt(): string {
  return [
    'You are WeavAI, the cognitive core that prepares prompts for the Lumina image generation stack.',
    'Return a valid JSON object only. Do not wrap it in markdown code fences.',
    'The JSON schema is:',
    '{',
    '  "optimizedPrompt": string,',
    '  "summary": string,',
    '  "intent": string,',
    '  "mood": string,',
    '  "riskAlerts": string[],',
    '  "enhancementPlan": string[],',
    '  "tags": string[],',
    '  "confidence": number (0-1),',
    '  "guidance": string',
    '}',
    'Make the optimized prompt production-ready with explicit details, camera hints, and lighting cues.',
    'Highlight only critical risks in riskAlerts. Keep enhancementPlan ordered.',
  ].join(' ');
}

function buildPromptPayload(options: AnalyzePromptOptions): string {
  const context = {
    userId: options.userId ?? 'anonymous',
    sessionId: options.sessionId ?? 'unbound',
    metadata: options.metadata ?? {},
  };

  return [
    'Analyze the following user prompt for an AI art generation pipeline and respond with the JSON schema described by the system instructions.',
    'PROMPT:',
    options.prompt,
    'CONTEXT:',
    JSON.stringify(context, null, 2),
  ].join('\n');
}

function parseInsight(generation: WeavAIGeneration, fallbackPrompt: string): WeavAIInsight {
  const raw = generation.response.text.trim();
  const json = safeJson(raw);
  const trace = generation.trace;

  return {
    optimizedPrompt: (json?.optimizedPrompt as string) || fallbackPrompt,
    summary: (json?.summary as string) || 'No summary provided',
    intent: (json?.intent as string) || 'creative',
    mood: (json?.mood as string) || 'balanced',
    riskAlerts: toArray(json?.riskAlerts),
    enhancementPlan: toArray(json?.enhancementPlan),
    tags: toArray(json?.tags),
    confidence: clamp(Number(json?.confidence ?? 0.75)),
    guidance: (json?.guidance as string) || '',
    trace,
    rawText: raw,
  };
}

function safeJson(payload: string): Record<string, unknown> | null {
  const start = payload.indexOf('{');
  const end = payload.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(payload.slice(start, end + 1));
  } catch {
    return null;
  }
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  if (typeof value === 'string' && value.length > 0) {
    return [value];
  }

  return [];
}

function clamp(value: number): number {
  if (Number.isNaN(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

export const weavAIService = new WeavAIService();
export const createWeavAIService = () => new WeavAIService();

function pickDefaultConnector(connectors: ReturnType<typeof resolveWeavAIConnectorConfig>) {
  if (connectors.openai?.apiKey) return 'openai';
  if (connectors.gemini?.apiKey) return 'gemini';
  if (connectors.anthropic?.apiKey) return 'anthropic';
  if (connectors.deepseek?.apiKey) return 'deepseek';
  if (connectors.openrouter?.apiKey) return 'openrouter';
  return undefined;
}
