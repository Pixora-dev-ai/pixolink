/**
 * WeavAi - Unified AI Intelligence Platform
 * 
 * Comprehensive AI orchestration with multi-provider support and advanced intelligence features.
 * Combines AI providers (Gemini, Claude, OpenAI, Replicate) with intelligent modules:
 * - LCC (Lumina Cognitive Chain): Cognitive processing and chain-of-thought
 * - LCM (Lumina Context Memory): Context management and prompt memory
 * - LogicSim: Logic simulation and validation
 * - PixSync: Real-time synchronization and network monitoring
 * - VisionPulse: Vision analysis and quality assessment
 */

// ============================================================================
// Core AI Intelligence Modules (from libs/)
// ============================================================================

/**
 * LCC - Lumina Cognitive Chain
 * Provides cognitive processing capabilities and chain-of-thought reasoning
 */
export { CognitiveChain } from './libs/lcc/src/index';
export type { CognitiveChainOptions } from './libs/lcc/src/index';

/**
 * LCM - Lumina Context Memory
 * Manages context, prompt memory, and feedback with IndexedDB and Supabase sync
 */
export {
  IndexedDBStorage,
  FeedbackEngine,
  SupabaseSync,
  usePromptMemory,
} from './libs/lcm/src/index';
export type {
  PromptMemory,
  FeedbackData,
  SyncConfig,
} from './libs/lcm/src/index';

/**
 * LogicSim - Logic Simulator
 * Provides logic simulation and validation capabilities
 */
export { LogicSimulator } from './libs/logicsim/src/index';
export type { SimulationOptions } from './libs/logicsim/src/index';

/**
 * PixSync - Real-time Synchronization
 * Handles real-time sync, network monitoring, and conflict resolution
 */
export {
  SyncManager,
  networkMonitor,
} from './libs/pixsync/src/index';
export type {
  SyncStatus,
  NetworkStatus,
} from './libs/pixsync/src/index';

/**
 * VisionPulse - Vision Analysis
 * Provides vision analysis and quality assessment for generated images
 */
export { VisionAnalyzer } from './libs/visionpulse/src/index';
export type {
  QualityReport,
  AnalysisResult,
} from './libs/visionpulse/src/index';

// ============================================================================
// AI Provider Interfaces (if exists in original lib/ai)
// ============================================================================

// TODO: Add AI provider exports once they are organized
// export { GeminiProvider } from './providers/gemini';
// export { ClaudeProvider } from './providers/claude';
// export { OpenAIProvider } from './providers/openai';
// export { ReplicateProvider } from './providers/replicate';

// ============================================================================
// Unified WeavAi Namespace
// ============================================================================

export const WeavAi = {
  // Cognitive
  CognitiveChain,
  
  // Memory & Context
  IndexedDBStorage,
  FeedbackEngine,
  SupabaseSync,
  usePromptMemory,
  
  // Logic & Simulation
  LogicSimulator,
  
  // Sync & Network
  SyncManager,
  networkMonitor,
  
  // Vision & Quality
  VisionAnalyzer,
} as const;

// ============================================================================
// Version & Metadata
// ============================================================================

export const WEAVAI_VERSION = '1.0.0';
export const WEAVAI_MODULES = [
  'lcc',
  'lcm',
  'logicsim',
  'pixsync',
  'visionpulse',
] as const;
