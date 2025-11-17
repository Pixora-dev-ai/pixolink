/**
 * Adaptive Auto-Tuning System
 * Automatically adjusts module configurations based on risk assessment
 */

import type { RiskAssessment } from '../predictive/types';

export interface TuningConfig {
  concurrencyLimit?: number;
  timeout?: number;
  cacheSize?: number;
  retryStrategy?: 'exponential' | 'linear' | 'fixed';
  rateLimit?: number;
}

export interface ModuleConfig {
  mode: 'safe' | 'balanced' | 'aggressive';
  enabled: boolean;
  adjustments: TuningConfig;
}

export class AdaptiveTuner {
  private static activeConfigs = new Map<string, ModuleConfig>();
  private static tuningHistory: Array<{
    module: string;
    timestamp: number;
    before: ModuleConfig;
    after: ModuleConfig;
    reason: string;
  }> = [];

  /**
   * Adapt module configuration based on risk assessment
   */
  static adapt(module: string, assessment: RiskAssessment): ModuleConfig | null {
    // Only tune if probability > 0.8 or risk is Critical
    if (assessment.probability <= 0.8 && assessment.riskLevel !== 'Critical') {
      return null;
    }

    const currentConfig = this.activeConfigs.get(module) || this.getDefaultConfig();
    const newConfig = this.calculateOptimalConfig(assessment);

    // Store in history
    this.tuningHistory.push({
      module,
      timestamp: Date.now(),
      before: currentConfig,
      after: newConfig,
      reason: `Auto-tune triggered: ${assessment.riskLevel} risk with ${(assessment.probability * 100).toFixed(0)}% probability`
    });

    // Apply config
    this.activeConfigs.set(module, newConfig);

    // Apply to actual module (placeholder - implement based on module architecture)
    this.applyToModule(module, newConfig);

    return newConfig;
  }

  /**
   * Calculate optimal configuration based on risk
   */
  private static calculateOptimalConfig(assessment: RiskAssessment): ModuleConfig {
    let mode: 'safe' | 'balanced' | 'aggressive' = 'balanced';
    const adjustments: TuningConfig = {};

    // Determine mode based on risk level
    if (assessment.riskLevel === 'Critical' || assessment.probability > 0.9) {
      mode = 'safe';
      adjustments.concurrencyLimit = 5;
      adjustments.timeout = 10000;
      adjustments.retryStrategy = 'exponential';
      adjustments.rateLimit = 10;
    } else if (assessment.riskLevel === 'High' || assessment.probability > 0.8) {
      mode = 'safe';
      adjustments.concurrencyLimit = 10;
      adjustments.timeout = 5000;
      adjustments.retryStrategy = 'exponential';
      adjustments.rateLimit = 20;
    } else {
      mode = 'balanced';
      adjustments.concurrencyLimit = 20;
      adjustments.timeout = 3000;
      adjustments.retryStrategy = 'linear';
      adjustments.rateLimit = 50;
    }

    return {
      mode,
      enabled: true,
      adjustments
    };
  }

  /**
   * Apply configuration to module
   */
  private static applyToModule(module: string, config: ModuleConfig): void {
    console.log(`[AdaptiveTuner] Applying config to ${module}:`, config);

    // TODO: Integrate with actual module configuration system
    // Example integration points:
    // - Registry.updateModuleConfig(module, config)
    // - IOLBus.emit('MODULE_CONFIG_UPDATE', { module, config })
    // - Module-specific configuration APIs

    // For now, just log the action
    const action = {
      type: 'CONFIG_UPDATE',
      module,
      config,
      timestamp: Date.now()
    };

    // Store in local storage for persistence (optional)
    try {
      const storedConfigs = localStorage.getItem('pmal_module_configs');
      const configs = storedConfigs ? JSON.parse(storedConfigs) : {};
      configs[module] = config;
      localStorage.setItem('pmal_module_configs', JSON.stringify(configs));
    } catch (error) {
      console.warn('[AdaptiveTuner] Failed to persist config:', error);
    }
  }

  /**
   * Get default configuration
   */
  private static getDefaultConfig(): ModuleConfig {
    return {
      mode: 'balanced',
      enabled: true,
      adjustments: {
        concurrencyLimit: 20,
        timeout: 3000,
        retryStrategy: 'linear',
        rateLimit: 50
      }
    };
  }

  /**
   * Get active configuration for a module
   */
  static getConfig(module: string): ModuleConfig {
    return this.activeConfigs.get(module) || this.getDefaultConfig();
  }

  /**
   * Get tuning history
   */
  static getHistory(module?: string): Array<any> {
    if (module) {
      return this.tuningHistory.filter(h => h.module === module);
    }
    return this.tuningHistory;
  }

  /**
   * Reset module to default configuration
   */
  static reset(module: string): void {
    const currentConfig = this.activeConfigs.get(module);
    if (currentConfig) {
      const defaultConfig = this.getDefaultConfig();
      
      this.tuningHistory.push({
        module,
        timestamp: Date.now(),
        before: currentConfig,
        after: defaultConfig,
        reason: 'Manual reset to defaults'
      });

      this.activeConfigs.set(module, defaultConfig);
      this.applyToModule(module, defaultConfig);
    }
  }

  /**
   * Reset all modules
   */
  static resetAll(): void {
    const modules = Array.from(this.activeConfigs.keys());
    modules.forEach(module => this.reset(module));
  }

  /**
   * Get statistics about tuning actions
   */
  static getStats(): {
    totalAdjustments: number;
    modulesCovered: number;
    recentAdjustments: number;
    averageFrequency: number;
  } {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    
    const recentAdjustments = this.tuningHistory.filter(
      h => h.timestamp > last24h
    ).length;

    const uniqueModules = new Set(this.tuningHistory.map(h => h.module));

    return {
      totalAdjustments: this.tuningHistory.length,
      modulesCovered: uniqueModules.size,
      recentAdjustments,
      averageFrequency: this.tuningHistory.length > 0 
        ? this.tuningHistory.length / Math.max(uniqueModules.size, 1)
        : 0
    };
  }
}

/**
 * Integration helper for PMAL
 */
export function applyAutoTuning(assessments: RiskAssessment[]): Array<{
  module: string;
  config: ModuleConfig;
  reason: string;
}> {
  const actions: Array<any> = [];

  assessments.forEach(assessment => {
    const config = AdaptiveTuner.adapt(assessment.module, assessment);
    if (config) {
      actions.push({
        module: assessment.module,
        config,
        reason: `Auto-tune triggered: ${assessment.riskLevel} risk with ${(assessment.probability * 100).toFixed(0)}% probability`
      });
    }
  });

  return actions;
}
