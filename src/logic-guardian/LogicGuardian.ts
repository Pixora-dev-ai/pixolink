import { z } from 'zod';
import { SchemaValidator } from './core/validator';
import type { ValidatorOptions, ValidationResult } from './core/validator';
import { Invariants } from './core/invariants';
import type { InvariantCondition, InvariantMessage, InvariantOptions } from './core/invariants';
import { CircuitBreaker, CircuitBreakerRegistry } from './core/circuitBreaker';
import type { CircuitBreakerConfig } from './core/circuitBreaker';
import { StateMachine } from './core/stateGuard';
import type { StateMachineConfig } from './core/stateGuard';
import { SideEffectTracker, SideEffectType } from './core/sideEffectTracker';
import type { SideEffectTrackerConfig } from './core/sideEffectTracker';
import { logger } from './utils/logger';
import type { LoggerConfig } from './utils/logger';


/**
 * Main facade for Logic Guardian
 * Provides unified API for all validation and error detection features
 */

export interface LogicGuardianConfig {
  logger?: LoggerConfig;
  circuitBreaker?: CircuitBreakerConfig;
  sideEffectTracker?: SideEffectTrackerConfig;
  invariants?: InvariantOptions;
}

export class LogicGuardian {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private sideEffectTracker: SideEffectTracker;
  public logger = logger;

  constructor(config: LogicGuardianConfig = {}) {
    // Configure logger
    if (config.logger) {
      this.logger.setMinLevel(config.logger.minLevel || 'debug' as any);
      if (config.logger.sentryIntegration) {
        this.logger.setSentryIntegration(config.logger.sentryIntegration);
      }
    }

    // Initialize side effect tracker
    this.sideEffectTracker = new SideEffectTracker(config.sideEffectTracker);
  }

  /**
   * Validate data against schema
   */
  public async validate<T extends z.ZodTypeAny>(
    data: unknown,
    schema: T,
    options?: ValidatorOptions
  ): Promise<ValidationResult<z.infer<T>>> {
    this.logger.debug('Validating data', { schema: schema.description }, 'Validator');
    return SchemaValidator.validate(data, schema, options);
  }

  /**
   * Validate batch of items
   */
  public async validateBatch<T extends z.ZodTypeAny>(
    items: unknown[],
    schema: T,
    options?: ValidatorOptions
  ) {
    this.logger.debug(`Validating batch of ${items.length} items`, {}, 'Validator');
    return SchemaValidator.validateBatch(items, schema, options);
  }

  /**
   * Execute with circuit breaker protection
   */
  public async executeWithCircuitBreaker<T>(
    name: string,
    fn: () => Promise<T> | T,
    config?: CircuitBreakerConfig
  ): Promise<T> {
    if (!this.circuitBreakers.has(name)) {
      if (!config) {
        throw new Error(`Circuit breaker "${name}" not configured`);
      }
      this.circuitBreakers.set(name, new CircuitBreaker(config));
    }

    const breaker = this.circuitBreakers.get(name)!;
    this.logger.debug(`Executing with circuit breaker: ${name}`, {}, 'CircuitBreaker');
    return breaker.execute(fn, name);
  }

  /**
   * Get circuit breaker stats
   */
  public getCircuitBreakerStats(name?: string) {
    if (name) {
      return this.circuitBreakers.get(name)?.getStats();
    }
    const stats: Record<string, any> = {};
    for (const [key, breaker] of this.circuitBreakers.entries()) {
      stats[key] = breaker.getStats();
    }
    return stats;
  }

  /**
   * Create state machine
   */
  public createStateMachine<S extends string>(
    config: StateMachineConfig<S>
  ): StateMachine<S> {
    this.logger.debug('Creating state machine', { initialState: config.initialState }, 'StateMachine');
    return new StateMachine(config);
  }

  /**
   * Track side effects during execution
   */
  public async trackSideEffects<T>(
    fn: () => Promise<T> | T,
    options?: {
      allowedEffects?: SideEffectType[];
      forbiddenEffects?: SideEffectType[];
      label?: string;
    }
  ) {
    this.logger.debug('Tracking side effects', { label: options?.label }, 'SideEffectTracker');
    return this.sideEffectTracker.trackExecution(fn, options);
  }

  /**
   * Snapshot object for mutation tracking
   */
  public snapshot<T extends object>(obj: T, label?: string): T {
    return this.sideEffectTracker.snapshot(obj, label);
  }

  /**
   * Verify no mutations occurred
   */
  public verifyNoMutations<T extends object>(obj: T): void {
    this.sideEffectTracker.verifyNoMutations(obj);
  }

  /**
   * Check invariant (precondition)
   */
  public require<T>(
    condition: InvariantCondition<T>,
    value: T,
    message: InvariantMessage,
    options?: InvariantOptions
  ): void {
    Invariants.require(condition, value, message, options);
  }

  /**
   * Check invariant (postcondition)
   */
  public ensure<T>(
    condition: InvariantCondition<T>,
    value: T,
    message: InvariantMessage,
    options?: InvariantOptions
  ): void {
    Invariants.ensure(condition, value, message, options);
  }

  /**
   * Common checks
   */
  public requireNotNull<T>(value: T | null | undefined, name?: string): asserts value is T {
    Invariants.requireNotNull(value, name);
  }

  public requireNotEmpty<T>(array: T[], name?: string): void {
    Invariants.requireNotEmpty(array, name);
  }

  public requirePositive(value: number, name?: string): void {
    Invariants.requirePositive(value, name);
  }

  public requireInRange(value: number, min: number, max: number, name?: string): void {
    Invariants.requireInRange(value, min, max, name);
  }

  /**
   * Get side effect summary
   */
  public getSideEffectSummary() {
    return this.sideEffectTracker.getSummary();
  }

  /**
   * Clear side effect tracking
   */
  public clearSideEffects(): void {
    this.sideEffectTracker.clear();
  }

  /**
   * Get all errors and warnings
   */
  public getReport(): {
    circuitBreakers: Record<string, any>;
    sideEffects: Record<string, number>;
  } {
    const stats = this.getCircuitBreakerStats();
    return {
      circuitBreakers: stats || {},
      sideEffects: this.getSideEffectSummary()
    };
  }
}

// Singleton instance
let instance: LogicGuardian | null = null;

/**
 * Get singleton instance
 */
export function getGuardian(config?: LogicGuardianConfig): LogicGuardian {
  if (!instance) {
    instance = new LogicGuardian(config);
  }
  return instance;
}

/**
 * Reset singleton (for testing)
 */
export function resetGuardian(): void {
  instance = null;
}