/**
 * @pixora/pixolink-intelligence-core
 * 
 * Intelligence Orchestration Layer plugin for PixoLink
 */

export { IntelligenceCorePlugin, createIntelligenceCorePlugin } from './plugin';
export type { IntelligenceCoreConfig } from './plugin';

// Re-export Intelligence Core types (only what's actually exported)
export type {
  WeavAIInsight,
  PredictiveSummary,
} from 'intelligence-core';

// Default export
export { default } from './plugin';
