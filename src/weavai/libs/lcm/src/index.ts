/**
 * LUMINA Context Memory (LCM)
 * AI-powered context memory for PixoRA
 * Tracks prompts, feedback, and user preferences with intelligent insights
 */

// Storage layer
export { IndexedDBStorage } from './storage/indexedDB';
export type { PromptEntry, UserPreference } from './storage/indexedDB';

// Feedback analyzer
export { FeedbackEngine } from './analyzer/feedbackEngine';

// Sync layer
export { SupabaseSync } from './sync/supabaseSync';

// React hook
export { usePromptMemory } from './hooks/usePromptMemory';
export type { UsePromptMemoryOptions, UsePromptMemoryReturn } from './hooks/usePromptMemory';

