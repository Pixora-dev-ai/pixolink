/**
 * @pixora/pixolink-weavai
 * 
 * WeavAi module for PixoLink SDK
 * Intelligent AI orchestration with multi-provider support
 */

export { WeavAiPlugin } from './plugin';
export type { WeavAiPluginConfig, WeavAiAPI, StreamOptions } from './plugin';

// Re-export useful types from WeavAI
// Note: These types will be properly implemented when ai-core is available
export type WeavAIConfig = Record<string, unknown>;
export type WeavAIGeneration = Record<string, unknown>;
export type WeavAIStatus = 'idle' | 'generating' | 'error';
export type GenerateOptions = Record<string, unknown>;
export type LLMResponse = { content: string; model?: string; };

