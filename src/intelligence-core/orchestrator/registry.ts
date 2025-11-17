/**
 * Module Registry - Dynamic Module Loader
 * Manages all AI subsystem modules
 */

import type { ModuleMetadata, RegistryEntry } from '../types';

// Import internal libraries
import { IndexedDBStorage, FeedbackEngine, SupabaseSync } from '../../../../../pixolink/src/weavai/libs/lcm/src/index';
import { NetworkMonitor, SyncManager } from '../../../../../pixolink/src/weavai/libs/pixsync/src/index';
import { CognitiveChain } from '../../../../../pixolink/src/weavai/libs/lcc/src/index';
import { LogicSimulator } from '../../../../../pixolink/src/weavai/libs/logicsim/src/index';
import { VisionAnalyzer } from '../../../../../pixolink/src/weavai/libs/visionpulse/src/index';
import { weavAIService } from '../weavAI/service';

class ModuleRegistry {
  private modules: Map<string, RegistryEntry> = new Map();

  constructor() {
    this.registerDefaultModules();
  }

  /**
   * Register default internal modules
   */
  private registerDefaultModules(): void {
    // LUMINA Context Memory
    this.register('lcm.storage', IndexedDBStorage, {
      name: 'IndexedDB Storage',
      version: '1.0.0',
      status: 'active'
    });

    this.register('lcm.feedback', FeedbackEngine, {
      name: 'Feedback Engine',
      version: '1.0.0',
      status: 'active'
    });

    this.register('lcm.sync', SupabaseSync, {
      name: 'Supabase Sync',
      version: '1.0.0',
      status: 'active'
    });

    // PixSync
    this.register('pixsync.network', NetworkMonitor, {
      name: 'Network Monitor',
      version: '1.0.0',
      status: 'active'
    });

    this.register('pixsync.manager', SyncManager, {
      name: 'Sync Manager',
      version: '1.0.0',
      status: 'active'
    });

    // LUMINA Cognitive Chain
    this.register('lcc.chain', CognitiveChain, {
      name: 'Cognitive Chain',
      version: '1.0.0',
      status: 'active'
    });

    // LogicSim
    this.register('logicsim.simulator', LogicSimulator, {
      name: 'Logic Simulator',
      version: '1.0.0',
      status: 'active'
    });

    // VisionPulse
    this.register('visionpulse.analyzer', VisionAnalyzer, {
      name: 'Vision Analyzer',
      version: '1.0.0',
      status: 'active'
    });

    this.register('weavai.core', weavAIService, {
      name: 'WeavAI Core',
      version: '0.6.0-beta',
      status: 'active'
    });
  }

  /**
   * Register a module
   */
  register(key: string, module: unknown, metadata: ModuleMetadata): void {
    this.modules.set(key, {
      module,
      metadata: {
        ...metadata,
        lastActive: Date.now()
      }
    });
  }

  /**
   * Get a module by key
   */
  get<T = unknown>(key: string): T | undefined {
    const entry = this.modules.get(key);
    if (entry) {
      entry.metadata.lastActive = Date.now();
      return entry.module as T;
    }
    return undefined;
  }

  /**
   * Get module metadata
   */
  getMetadata(key: string): ModuleMetadata | undefined {
    return this.modules.get(key)?.metadata;
  }

  /**
   * Check if module exists
   */
  has(key: string): boolean {
    return this.modules.has(key);
  }

  /**
   * Unregister a module
   */
  unregister(key: string): boolean {
    return this.modules.delete(key);
  }

  /**
   * Get all registered module keys
   */
  getKeys(): string[] {
    return Array.from(this.modules.keys());
  }

  /**
   * Get all modules with metadata
   */
  getAll(): Array<{ key: string; entry: RegistryEntry }> {
    return Array.from(this.modules.entries()).map(([key, entry]) => ({
      key,
      entry
    }));
  }

  /**
   * Update module status
   */
  updateStatus(key: string, status: ModuleMetadata['status']): void {
    const entry = this.modules.get(key);
    if (entry) {
      entry.metadata.status = status;
      entry.metadata.lastActive = Date.now();
    }
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    total: number;
    active: number;
    inactive: number;
    error: number;
    byCategory: Record<string, number>;
  } {
    const stats = {
      total: this.modules.size,
      active: 0,
      inactive: 0,
      error: 0,
      byCategory: {} as Record<string, number>
    };

    for (const [key, entry] of this.modules.entries()) {
      // Count by status
      stats[entry.metadata.status]++;

      // Count by category (first part of key)
      const category = key.split('.')[0];
      stats.byCategory[category] = (stats.byCategory[category] ?? 0) + 1;
    }

    return stats;
  }

  /**
   * Health check for all modules
   */
  healthCheck(): Record<string, boolean> {
    const health: Record<string, boolean> = {};

    for (const [key, entry] of this.modules.entries()) {
      health[key] = entry.metadata.status === 'active';
    }

    return health;
  }

  /**
   * Clear all modules
   */
  clear(): void {
    this.modules.clear();
  }
}

// Singleton instance
export const Registry = new ModuleRegistry();

// Convenient exports for direct access
export const InternalModules = {
  // LCM
  storage: IndexedDBStorage,
  feedbackEngine: FeedbackEngine,
  supabaseSync: SupabaseSync,

  // PixSync
  networkMonitor: NetworkMonitor,
  syncManager: SyncManager,

  // LCC
  cognitiveChain: CognitiveChain,

  // LogicSim
  logicSimulator: LogicSimulator,

  // VisionPulse
  visionAnalyzer: VisionAnalyzer
};
