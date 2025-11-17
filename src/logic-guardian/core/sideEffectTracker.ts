import { SideEffectError } from './errors';
import { logger } from '../utils/logger';

/**
 * Side Effect Tracker
 * Monitors and validates side effects in algorithms
 */

export enum SideEffectType {
  MUTATION = 'mutation',
  IO = 'io',
  NETWORK = 'network',
  STORAGE = 'storage',
  DOM = 'dom',
  CONSOLE = 'console',
  TIMER = 'timer'
}

export interface SideEffect {
  type: SideEffectType;
  description: string;
  timestamp: number;
  context?: any;
}

export interface SideEffectTrackerConfig {
  enabled?: boolean;
  trackMutations?: boolean;
  trackIO?: boolean;
  maxEffects?: number;
  onEffectDetected?: (effect: SideEffect) => void;
}

/**
 * Tracks side effects during algorithm execution
 */
export class SideEffectTracker {
  private effects: SideEffect[] = [];
  private readonly config: Required<SideEffectTrackerConfig>;
  private originalStates = new WeakMap<object, any>();

  constructor(config: SideEffectTrackerConfig = {}) {
    this.config = {
      enabled: true,
      trackMutations: true,
      trackIO: true,
      maxEffects: 1000,
      onEffectDetected: () => {},
      ...config
    };
  }

  /**
   * Track a side effect
   */
  public track(type: SideEffectType, description: string, context?: any): void {
    if (!this.config.enabled) return;

    const effect: SideEffect = {
      type,
      description,
      timestamp: Date.now(),
      context
    };

    this.effects.push(effect);

    // Trim if exceeded max
    if (this.effects.length > this.config.maxEffects) {
      this.effects.shift();
    }

    this.config.onEffectDetected(effect);
  }

  /**
   * Snapshot object state for mutation tracking
   */
  public snapshot<T extends object>(obj: T, label?: string): T {
    if (!this.config.trackMutations) return obj;

    // Deep clone for comparison later
    const snapshot = JSON.parse(JSON.stringify(obj));
    this.originalStates.set(obj, { snapshot, label: label || 'unknown' });
    return obj;
  }

  /**
   * Verify no mutations occurred
   */
  public verifyNoMutations<T extends object>(obj: T): void {
    if (!this.config.trackMutations) return;

    const original = this.originalStates.get(obj);
    if (!original) {
      logger.warn('Object not tracked, cannot verify mutations', {});
      return;
    }

    const current = JSON.parse(JSON.stringify(obj));
    const diff = this.deepDiff(original.snapshot, current);

    if (diff.length > 0) {
      throw new SideEffectError(
        `Unexpected mutation detected on object "${original.label}"`,
        {
          expected: original.snapshot,
          actual: current,
          metadata: { mutations: diff }
        }
      );
    }
  }

  /**
   * Execute function with side effect tracking
   */
  public async trackExecution<T>(
    fn: () => Promise<T> | T,
    options: {
      allowedEffects?: SideEffectType[];
      forbiddenEffects?: SideEffectType[];
      label?: string;
    } = {}
  ): Promise<{ result: T; effects: SideEffect[] }> {
    const startIndex = this.effects.length;

    // Execute function
    const result = await Promise.resolve(fn());

    // Get effects that occurred during execution
    const executionEffects = this.effects.slice(startIndex);

    // Check for forbidden effects
    if (options.forbiddenEffects) {
      const forbidden = executionEffects.filter(e =>
        options.forbiddenEffects!.includes(e.type)
      );

      if (forbidden.length > 0) {
        throw new SideEffectError(
          `Forbidden side effects detected in "${options.label || 'function'}"`,
          {
            metadata: {
              forbiddenEffects: forbidden,
              forbiddenTypes: options.forbiddenEffects
            }
          }
        );
      }
    }

    // Check for unexpected effects
    if (options.allowedEffects) {
      const unexpected = executionEffects.filter(
        e => !options.allowedEffects!.includes(e.type)
      );

      if (unexpected.length > 0) {
        logger.warn('Unexpected side effects', { 
          label: options.label || 'function',
          unexpected 
        });
      }
    }

    return { result, effects: executionEffects };
  }

  /**
   * Get all tracked effects
   */
  public getEffects(filter?: { type?: SideEffectType; since?: number }): SideEffect[] {
    let filtered = [...this.effects];

    if (filter?.type) {
      filtered = filtered.filter(e => e.type === filter.type);
    }

    if (filter?.since !== undefined) {
      filtered = filtered.filter(e => e.timestamp >= filter.since!);
    }

    return filtered;
  }

  /**
   * Clear tracked effects
   */
  public clear(): void {
    this.effects = [];
    this.originalStates = new WeakMap();
  }

  /**
   * Get effect summary
   */
  public getSummary(): Record<SideEffectType, number> {
    const summary = {} as Record<SideEffectType, number>;

    for (const effect of this.effects) {
      summary[effect.type] = (summary[effect.type] || 0) + 1;
    }

    return summary;
  }

  /**
   * Deep diff between two objects
   */
  private deepDiff(obj1: any, obj2: any, path: string = ''): string[] {
    const differences: string[] = [];

    if (obj1 === obj2) return differences;

    if (typeof obj1 !== typeof obj2) {
      differences.push(`${path}: type changed from ${typeof obj1} to ${typeof obj2}`);
      return differences;
    }

    if (typeof obj1 !== 'object' || obj1 === null || obj2 === null) {
      if (obj1 !== obj2) {
        differences.push(`${path}: ${JSON.stringify(obj1)} -> ${JSON.stringify(obj2)}`);
      }
      return differences;
    }

    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    for (const key of allKeys) {
      const newPath = path ? `${path}.${key}` : key;

      if (!(key in obj1)) {
        differences.push(`${newPath}: added with value ${JSON.stringify(obj2[key])}`);
      } else if (!(key in obj2)) {
        differences.push(`${newPath}: removed (was ${JSON.stringify(obj1[key])})`);
      } else {
        differences.push(...this.deepDiff(obj1[key], obj2[key], newPath));
      }
    }

    return differences;
  }
}

/**
 * Decorator to track side effects
 */
export function trackSideEffects(
  allowedEffects?: SideEffectType[],
  forbiddenEffects?: SideEffectType[]
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: any, ...args: any[]) {
      // Assuming the class has a `sideEffectTracker` property
      if (this.sideEffectTracker instanceof SideEffectTracker) {
        const { result } = await this.sideEffectTracker.trackExecution(
          () => originalMethod.apply(this, args),
          {
            allowedEffects,
            forbiddenEffects,
            label: propertyKey
          }
        );
        return result;
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}