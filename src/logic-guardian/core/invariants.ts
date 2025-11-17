import { InvariantError } from './errors';
import { logger } from '../utils/logger';

/**
 * Algorithm Invariants - Pre/Post-condition validation
 * Defensive programming pattern for logic errors
 */

export type InvariantCondition<T = any> = (value: T) => boolean;
export type InvariantMessage = string | ((value: any) => string);

export interface InvariantOptions {
  enabled?: boolean;
  throwOnViolation?: boolean;
  logViolations?: boolean;
}

/**
 * Invariant checker for algorithm validation
 */
export class Invariants {
  private static defaultOptions: InvariantOptions = {
    enabled: true,
    throwOnViolation: true,
    logViolations: true
  };

  /**
   * Assert a precondition (must be true before algorithm runs)
   */
  public static require<T>(
    condition: InvariantCondition<T>,
    value: T,
    message: InvariantMessage,
    options: InvariantOptions = {}
  ): void {
    const opts = { ...this.defaultOptions, ...options };

    if (!opts.enabled) return;

    if (!condition(value)) {
      const errorMessage = typeof message === 'function' ? message(value) : message;
      const error = new InvariantError(
        `Precondition failed: ${errorMessage}`,
        { actual: value, metadata: { type: 'precondition' } }
      );

      if (opts.logViolations) {
        logger.error('Precondition violation', error.toJSON());
      }

      if (opts.throwOnViolation) throw error;
    }
  }

  /**
   * Assert a postcondition (must be true after algorithm runs)
   */
  public static ensure<T>(
    condition: InvariantCondition<T>,
    value: T,
    message: InvariantMessage,
    options: InvariantOptions = {}
  ): void {
    const opts = { ...this.defaultOptions, ...options };

    if (!opts.enabled) return;

    if (!condition(value)) {
      const errorMessage = typeof message === 'function' ? message(value) : message;
      const error = new InvariantError(
        `Postcondition failed: ${errorMessage}`,
        { actual: value, metadata: { type: 'postcondition' } }
      );

      if (opts.logViolations) {
        logger.error('Postcondition violation', error.toJSON());
      }

      if (opts.throwOnViolation) throw error;
    }
  }

  /**
   * Assert a loop invariant (must remain true throughout loop)
   */
  public static invariant<T>(
    condition: InvariantCondition<T>,
    value: T,
    message: InvariantMessage,
    options: InvariantOptions = {}
  ): void {
    const opts = { ...this.defaultOptions, ...options };

    if (!opts.enabled) return;

    if (!condition(value)) {
      const errorMessage = typeof message === 'function' ? message(value) : message;
      const error = new InvariantError(
        `Invariant violated: ${errorMessage}`,
        { actual: value, metadata: { type: 'invariant' } }
      );

      if (opts.logViolations) {
        logger.error('Invariant violation', error.toJSON());
      }

      if (opts.throwOnViolation) throw error;
    }
  }

  /**
   * Common precondition: value must not be null/undefined
   */
  public static requireNotNull<T>(value: T | null | undefined, name: string = 'value'): asserts value is T {
    this.require(
      v => v !== null && v !== undefined,
      value,
      `${name} must not be null or undefined`,
      { throwOnViolation: true }
    );
  }

  /**
   * Common precondition: array must not be empty
   */
  public static requireNotEmpty<T>(array: T[], name: string = 'array'): void {
    this.require(
      arr => Array.isArray(arr) && arr.length > 0,
      array,
      `${name} must not be empty`,
      { throwOnViolation: true }
    );
  }

  /**
   * Common precondition: number must be positive
   */
  public static requirePositive(value: number, name: string = 'value'): void {
    this.require(
      v => typeof v === 'number' && v > 0,
      value,
      `${name} must be positive, got ${value}`,
      { throwOnViolation: true }
    );
  }

  /**
   * Common precondition: number must be in range
   */
  public static requireInRange(
    value: number,
    min: number,
    max: number,
    name: string = 'value'
  ): void {
    this.require(
      v => typeof v === 'number' && v >= min && v <= max,
      value,
      `${name} must be between ${min} and ${max}, got ${value}`,
      { throwOnViolation: true }
    );
  }

  /**
   * Common invariant: object must have required keys
   */
  public static requireKeys<T extends object>(
    obj: T,
    keys: (keyof T)[],
    name: string = 'object'
  ): void {
    this.require(
      o => keys.every(key => key in o),
      obj,
      `${name} must have keys: ${keys.join(', ')}`,
      { throwOnViolation: true }
    );
  }

  /**
   * Disable all invariant checks (for production optimization)
   */
  public static disable(): void {
    this.defaultOptions.enabled = false;
  }

  /**
   * Enable all invariant checks
   */
  public static enable(): void {
    this.defaultOptions.enabled = true;
  }
}

/**
 * Decorator for automatic pre/post-condition checking
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function withInvariants<T extends (...args: any[]) => any>(
  preconditions: Array<{ check: InvariantCondition; message: InvariantMessage }> = [],
  postconditions: Array<{ check: InvariantCondition; message: InvariantMessage }> = []
) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = function (this: any, ...args: any[]) {
      // Check preconditions
      for (const { check, message } of preconditions) {
        Invariants.require(check, args, message);
      }

      // Execute method
      const result = originalMethod.apply(this, args);

      // Check postconditions
      for (const { check, message } of postconditions) {
        Invariants.ensure(check, result, message);
      }

      return result;
    };

    return descriptor;
  };
}