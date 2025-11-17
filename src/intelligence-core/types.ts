/**
 * Intelligence Orchestration Layer (IOL) - Core Types
 * Defines all type contracts for the orchestration system
 */

import type { WeavAIInsightResult } from './weavAI/types';

// ==================== Event System Types ====================

export type EventType =
  | 'PROMPT_GENERATED'
  | 'PROMPT_ENHANCED'
  | 'IMAGE_GENERATED'
  | 'IMAGE_ASSESSED'
  | 'QUALITY_CHECK_COMPLETE'
  | 'SYNC_STARTED'
  | 'SYNC_COMPLETE'
  | 'SYNC_FAILED'
  | 'RULE_CONFLICT'
  | 'VALIDATION_ERROR'
  | 'SESSION_STARTED'
  | 'SESSION_ENDED'
  | 'FEEDBACK_RECEIVED'
  | 'LEARNING_UPDATED'
  | 'TELEMETRY_LOGGED'
  | 'ERROR_OCCURRED';

export interface EventPayload<T = Record<string, unknown>> {
  type: EventType;
  data: T;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export type EventCallback<T = Record<string, unknown>> = (
  payload: EventPayload<T>
) => void | Promise<void>;

// ==================== Module Registry Types ====================

export interface ModuleMetadata {
  name: string;
  version: string;
  status: 'active' | 'inactive' | 'error';
  lastActive?: number;
}

export interface RegistryEntry {
  module: unknown;
  metadata: ModuleMetadata;
}

// ==================== Connector Types ====================

export interface ConnectorConfig {
  enabled: boolean;
  retryAttempts?: number;
  timeout?: number;
  metadata?: Record<string, unknown>;
}

export interface ConnectorResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
  timestamp: number;
}

// LUMINA Connector Types
export interface LuminaGenerationOptions {
  prompt: string;
  userId: string;
  enhancedPrompt?: string;
  style?: string;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  sessionId?: string;
}

export interface LuminaGenerationResult {
  imageUrl: string;
  imageData?: string;
  prompt: string;
  enhancedPrompt?: string;
  generationId: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// Supabase Connector Types
export interface SupabaseConnectorConfig extends ConnectorConfig {
  tables: string[];
  enableRealtime?: boolean;
}

export interface SupabaseSaveOptions {
  table: string;
  data: Record<string, unknown>;
  upsert?: boolean;
}

// PixoGuard Connector Types
export interface PixoGuardReport {
  type: 'anomaly' | 'performance' | 'security' | 'quality';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

// LogicGuardian Connector Types
export interface LogicGuardianValidation {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings?: string[];
}

// ==================== Adapter Types ====================

// LCM Adapter Types
export interface LCMSaveOptions {
  userId: string;
  prompt: string;
  response: string;
  feedback?: 'liked' | 'disliked' | 'neutral';
  metadata?: Record<string, unknown>;
}

export interface LCMHistoryOptions {
  userId: string;
  limit?: number;
  feedback?: 'liked' | 'disliked' | 'neutral';
}

// LCC Adapter Types
export interface LCCEnhanceOptions {
  prompt: string;
  userId: string;
  context?: Record<string, unknown>;
}

export interface LCCEnhanceResult {
  original: string;
  enhanced: string;
  improvements: string[];
  confidence: number;
}

export interface LCCValidationResult {
  isValid: boolean;
  confidence: number;
  issues: string[];
  suggestions: string[];
}

// PixSync Adapter Types
export interface PixSyncOptions {
  userId: string;
  tables?: string[];
  priority?: 'low' | 'normal' | 'high';
}

export interface PixSyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  failed: number;
  errors?: string[];
}

// LogicSim Adapter Types
export interface LogicSimScenario {
  id: string;
  name: string;
  description?: string;
  input: Record<string, unknown>;
  expectedOutput: Record<string, unknown>;
  testFn: (input: unknown) => Promise<unknown>;
}

export interface LogicSimResult {
  scenarioId: string;
  passed: boolean;
  output: unknown;
  error?: Error;
  duration: number;
}

// VisionPulse Adapter Types
export interface VisionAssessmentOptions {
  imageUrl: string;
  userId: string;
  quickMode?: boolean;
}

export interface VisionAssessmentResult {
  score: number;
  metrics: {
    sharpness: number;
    brightness: number;
    contrast: number;
    colorfulness: number;
    composition: number;
  };
  insights: {
    issues: string[];
    strengths: string[];
    suggestions: string[];
  };
  timestamp: number;
}

// ==================== Telemetry Types ====================

export interface TelemetryEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: number;
  userId?: string;
  sessionId?: string;
}

export interface ErrorReport {
  error: Error;
  context?: Record<string, unknown>;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}

export interface UsageMetrics {
  eventType: string;
  count: number;
  avgDuration?: number;
  lastOccurrence: number;
}

// ==================== Orchestrator Types ====================

export interface OrchestratorConfig {
  userId: string;
  sessionId?: string;
  enableTelemetry?: boolean;
  enableAutoSync?: boolean;
  syncInterval?: number;
  supabaseClient?: unknown;
}

export interface OrchestratorSession {
  sessionId: string;
  userId: string;
  startTime: number;
  endTime?: number;
  events: EventPayload[];
  metrics: {
    promptsGenerated: number;
    imagesGenerated: number;
    qualityChecks: number;
    syncOperations: number;
  };
}

export interface OrchestrationFlow {
  flowId: string;
  steps: Array<{
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startTime?: number;
    endTime?: number;
    result?: unknown;
    error?: Error;
  }>;
  startTime: number;
  endTime?: number;
}

// ==================== Pipeline Types ====================

export interface GenerationPipeline {
  userId: string;
  sessionId: string;
  originalPrompt: string;
  enhancedPrompt?: string;
  generationResult?: LuminaGenerationResult;
  qualityAssessment?: VisionAssessmentResult;
  feedback?: 'liked' | 'disliked' | 'neutral';
  saved: boolean;
  synced: boolean;
  errors: Error[];
  weavAi?: WeavAIInsightResult;
}

export interface PipelineResult {
  success: boolean;
  pipeline: GenerationPipeline;
  duration: number;
  steps: {
    intelligence: ConnectorResult<WeavAIInsightResult>;
    enhance: ConnectorResult;
    validate: ConnectorResult;
    generate: ConnectorResult;
    assess: ConnectorResult;
    save: ConnectorResult;
    sync: ConnectorResult;
  };
}
