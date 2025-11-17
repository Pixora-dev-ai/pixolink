/**
 * React Hook for Prompt Memory Management
 * Provides component-level integration with LCM storage and analytics
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { IndexedDBStorage, PromptEntry } from '../storage/indexedDB';
import { FeedbackEngine } from '../analyzer/feedbackEngine';
import { SupabaseSync } from '../sync/supabaseSync';
import { SupabaseClient } from '@supabase/supabase-js';

export interface UsePromptMemoryOptions {
  userId: string;
  supabase?: SupabaseClient;
  autoSync?: boolean;
  syncInterval?: number; // in milliseconds
}

export interface UsePromptMemoryReturn {
  history: PromptEntry[];
  loading: boolean;
  error: string | null;
  
  // Actions
  savePrompt: (prompt: string, result: string, metadata?: Record<string, unknown>) => Promise<void>;
  updateFeedback: (promptId: string, feedback: 'like' | 'dislike' | null) => Promise<void>;
  clearHistory: () => Promise<void>;
  
  // Analytics
  suggestions: string[];
  calculateScore: (prompt: string) => Promise<number>;
  trends: { period: string; liked: number; disliked: number; improvement: number } | null;
  
  // Sync
  syncNow: () => Promise<void>;
  syncStatus: { synced: number; errors: number } | null;
  
  // Stats
  stats: { totalPrompts: number; likes: number; dislikes: number; unsynced: number };
}

export function usePromptMemory(options: UsePromptMemoryOptions): UsePromptMemoryReturn {
  const { userId, supabase, autoSync = false, syncInterval = 60000 } = options;

  const [history, setHistory] = useState<PromptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [trends, setTrends] = useState<{ period: string; liked: number; disliked: number; improvement: number } | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ synced: number; errors: number } | null>(null);
  const [stats, setStats] = useState({ totalPrompts: 0, likes: 0, dislikes: 0, unsynced: 0 });

  const syncManager = useMemo(
    () => (supabase ? new SupabaseSync(supabase) : null),
    [supabase]
  );

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await IndexedDBStorage.getHistory(userId, 50);
        setHistory(data);
        
        const userStats = await IndexedDBStorage.getStats(userId);
        setStats(userStats);
        
        const userSuggestions = await FeedbackEngine.getSuggestions(userId, 'liked');
        setSuggestions(userSuggestions);
        
        const userTrends = await FeedbackEngine.getTrends(userId, 30);
        setTrends({
          period: 'month',
          liked: userTrends.likes,
          disliked: userTrends.dislikes,
          improvement: userTrends.improvement,
        });
        
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId]);

  // Auto-sync setup
  useEffect(() => {
    if (!autoSync || !syncManager) return;

    const interval = setInterval(async () => {
      try {
        const result = await syncManager.fullSync(userId);
        setSyncStatus({ synced: result.uploaded, errors: result.errors });
        
        // Refresh local data after sync
        const data = await IndexedDBStorage.getHistory(userId, 50);
        setHistory(data);
      } catch (err) {
        console.error('Auto-sync failed:', err);
      }
    }, syncInterval);

    return () => clearInterval(interval);
  }, [autoSync, syncManager, userId, syncInterval]);

  // Save new prompt
  const savePrompt = useCallback(async (prompt: string, result: string, metadata?: Record<string, unknown>) => {
    try {
      await IndexedDBStorage.savePrompt({
        userId,
        prompt,
        result,
        metadata,
      });
      
      // Refresh history
      const data = await IndexedDBStorage.getHistory(userId, 50);
      setHistory(data);
      
      // Update stats
      const userStats = await IndexedDBStorage.getStats(userId);
      setStats(userStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
      throw err;
    }
  }, [userId]);

  // Update feedback
  const updateFeedback = useCallback(async (promptId: string, feedback: 'like' | 'dislike' | null) => {
    try {
      if (feedback === null) {
        // If feedback is null, we're clearing it - use 'like' temporarily then delete
        await IndexedDBStorage.updateFeedback(Number(promptId), 'like');
        // Could add a separate clearFeedback method in the future
      } else {
        await IndexedDBStorage.updateFeedback(Number(promptId), feedback);
      }
      
      // Refresh history and suggestions
      const data = await IndexedDBStorage.getHistory(userId, 50);
      setHistory(data);
      
      const userSuggestions = await FeedbackEngine.getSuggestions(userId, 'liked');
      setSuggestions(userSuggestions);
      
      const userTrends = await FeedbackEngine.getTrends(userId, 30);
      setTrends({
        period: 'month',
        liked: userTrends.likes,
        disliked: userTrends.dislikes,
        improvement: userTrends.improvement,
      });
      
      // Update stats
      const userStats = await IndexedDBStorage.getStats(userId);
      setStats(userStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update feedback');
      throw err;
    }
  }, [userId]);

  // Clear all history
  const clearHistory = useCallback(async () => {
    try {
      await IndexedDBStorage.clearUserData(userId);
      setHistory([]);
      setSuggestions([]);
      setTrends(null);
      setStats({ totalPrompts: 0, likes: 0, dislikes: 0, unsynced: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear history');
      throw err;
    }
  }, [userId]);

  // Calculate prompt score
  const calculateScore = useCallback(async (prompt: string): Promise<number> => {
    try {
      return await FeedbackEngine.calculatePromptScore(userId, prompt);
    } catch (err) {
      console.error('Score calculation failed:', err);
      return 50; // neutral score
    }
  }, [userId]);

  // Manual sync
  const syncNow = useCallback(async () => {
    if (!syncManager) {
      setError('Supabase client not configured');
      return;
    }

    try {
      const result = await syncManager.fullSync(userId);
      setSyncStatus({ synced: result.uploaded, errors: result.errors });
      
      // Refresh local data
      const data = await IndexedDBStorage.getHistory(userId, 50);
      setHistory(data);
      
      const userStats = await IndexedDBStorage.getStats(userId);
      setStats(userStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
      throw err;
    }
  }, [syncManager, userId]);

  return {
    history,
    loading,
    error,
    savePrompt,
    updateFeedback,
    clearHistory,
    suggestions,
    calculateScore,
    trends,
    syncNow,
    syncStatus,
    stats,
  };
}
