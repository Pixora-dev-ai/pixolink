import { CircuitBreakerError } from './errors';
import { logger } from '../utils/logger';

/**
 * Circuit Breaker Pattern for Algorithm Resilience
 * Prevents cascade failures in logic chains
 */

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing - block requests
  HALF_OPEN = 'HALF_OPEN' // Testing - allow limited requests
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Failures before opening circuit
  successThreshold: number;      // Successes to close from half-open
  timeout: number;               // Time before moving to half-open (ms)
  resetTimeout?: number;         // Time to reset failure count (ms)
  monitoringWindow?: number;     // Window for counting failures (ms)
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private lastStateChangeTime: number = Date.now();
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;

  private readonly config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      resetTimeout: config.timeout,
      monitoringWindow: 60000, // 1 minute default
      ...config
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  public async execute<T>(fn: () => Promise<T> | T, context?: string): Promise<T> {
    this.totalRequests++;

    // Check circuit state
    if (this.state === CircuitState.OPEN) {
      // Check if timeout has elapsed
      const timeSinceLastFailure = Date.now() - this.lastStateChangeTime;
      if (timeSinceLastFailure >= this.config.timeout) {
        this.moveToHalfOpen();
      } else {
        throw new CircuitBreakerError(
          `Circuit breaker is OPEN${context ? ` for ${context}` : ''}. Too many failures.`,
          {
            state: this.getStats(),
            metadata: {
              timeUntilRetry: this.config.timeout - timeSinceLastFailure,
              context
            }
          }
        );
      }
    }

    try {
      const result = await Promise.resolve(fn());
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Record successful execution
   */
  private recordSuccess(): void {
    this.totalSuccesses++;
    this.lastSuccessTime = Date.now();
    this.failureCount = 0; // Reset failure count on success

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.moveToClosed();
      }
    }
  }

  /**
   * Record failed execution
   */
  private recordFailure(): void {
    this.totalFailures++;
    this.lastFailureTime = Date.now();
    this.failureCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.moveToOpen();
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we should reset failure count based on monitoring window
      if (
        this.lastSuccessTime &&
        Date.now() - this.lastSuccessTime > this.config.resetTimeout
      ) {
        this.failureCount = 1; // Reset to 1 (current failure)
      }

      if (this.failureCount >= this.config.failureThreshold) {
        this.moveToOpen();
      }
    }
  }

  /**
   * Move to OPEN state
   */
  private moveToOpen(): void {
    this.state = CircuitState.OPEN;
    this.lastStateChangeTime = Date.now();
    this.successCount = 0;
    logger.warn('Circuit OPENED due to failures', this.getStats());
  }

  /**
   * Move to HALF_OPEN state
   */
  private moveToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.lastStateChangeTime = Date.now();
    this.successCount = 0;
    this.failureCount = 0;
    logger.info('Circuit moved to HALF_OPEN - testing recovery', {});
  }

  /**
   * Move to CLOSED state
   */
  private moveToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.lastStateChangeTime = Date.now();
    this.failureCount = 0;
    this.successCount = 0;
    logger.info('Circuit CLOSED - normal operation resumed', {});
  }

  /**
   * Get current stats
   */
  public getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses
    };
  }

  /**
   * Get success rate
   */
  public getSuccessRate(): number {
    if (this.totalRequests === 0) return 1;
    return this.totalSuccesses / this.totalRequests;
  }

  /**
   * Get failure rate
   */
  public getFailureRate(): number {
    if (this.totalRequests === 0) return 0;
    return this.totalFailures / this.totalRequests;
  }

  /**
   * Manually reset circuit
   */
  public reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastStateChangeTime = Date.now();
    logger.info('Circuit manually reset', {});
  }

  /**
   * Check if circuit is available
   */
  public isAvailable(): boolean {
    return this.state !== CircuitState.OPEN;
  }
}

/**
 * Circuit breaker registry for managing multiple breakers
 */
export class CircuitBreakerRegistry {
  private static breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create circuit breaker
   */
  public static getBreaker(
    name: string,
    config?: CircuitBreakerConfig
  ): CircuitBreaker {
    if (!this.breakers.has(name)) {
      if (!config) {
        throw new Error(
          `Circuit breaker "${name}" not found and no config provided`
        );
      }
      this.breakers.set(name, new CircuitBreaker(config));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Remove circuit breaker
   */
  public static removeBreaker(name: string): void {
    this.breakers.delete(name);
  }

  /**
   * Get all circuit breaker stats
   */
  public static getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [name, breaker] of this.breakers.entries()) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  public static resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Clear all circuit breakers
   */
  public static clear(): void {
    this.breakers.clear();
  }
}