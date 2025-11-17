/**
 * Legacy types from @prepilot/ai-core
 * 
 * These types are kept here temporarily for backward compatibility
 * until full migration to new WeavAI architecture is complete.
 */

// ============================================================================
// Telemetry Event
// ============================================================================

export interface TelemetryEvent {
  eventType:
    | 'request'
    | 'response'
    | 'error'
    | 'cache_hit'
    | 'cache_miss'
    | 'fallback'
    | 'retry'
    | 'recovery'
    | 'pattern_detected'
    | 'self_healing_attempt'
    | 'self_healing_success'
    | 'self_healing_strategy_failed'
    | 'self_healing_registered'
    | 'plugin_event';
  timestamp: number;
  connector: string;
  model?: string;
  latency?: number;
  success: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// WeavAI Configuration
// ============================================================================

type Toggleable<T> = T & { enabled?: boolean };

export interface WeavAIConnectorConfig {
  openai?: {
    apiKey: string;
    defaultModel?: string;
    enabled?: boolean;
  };
  gemini?: {
    apiKey: string;
    defaultModel?: string;
    enabled?: boolean;
  };
  anthropic?: Toggleable<{
    apiKey: string;
    defaultModel?: string;
  }>;
  deepseek?: Toggleable<{
    apiKey: string;
    defaultModel?: string;
  }>;
  openrouter?: Toggleable<{
    apiKey: string;
    defaultModel?: string;
  }>;
}

// ============================================================================
// WeavAI Generation & Trace
// ============================================================================

export interface WeavAITrace {
  connector: string;
  latency?: number;
  cached?: boolean;
  contextualSnapshot?: unknown;
}

export interface WeavAIGeneration {
  prompt: string;
  response: {
    text: string;
    model?: string;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
    metadata?: Record<string, unknown>;
  };
  trace: WeavAITrace;
}
