import type { WeavAIGeneration, WeavAITrace } from './legacy-types';

export interface WeavAIInsight {
  optimizedPrompt: string;
  summary: string;
  intent: string;
  mood: string;
  riskAlerts: string[];
  enhancementPlan: string[];
  tags: string[];
  confidence: number;
  guidance: string;
  trace?: WeavAITrace;
  rawText: string;
}

export interface WeavAIInsightResult {
  available: boolean;
  insight?: WeavAIInsight;
  generation?: WeavAIGeneration;
  reason?: string;
  error?: Error;
}

export interface AnalyzePromptOptions {
  prompt: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}
