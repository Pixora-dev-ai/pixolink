import type { ConfigResolver } from '../types/Plugin';

/**
 * Config resolver for accessing nested configuration values
 */
export class ConfigResolverImpl implements ConfigResolver {
  private config: Record<string, unknown>;

  constructor(config: Record<string, unknown>) {
    this.config = config;
  }

  get<T = unknown>(path: string, defaultValue?: T): T {
    const value = this.getNestedValue(this.config, path);
    
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Config path "${path}" not found`);
    }

    return value as T;
  }

  set(path: string, value: unknown): void {
    this.setNestedValue(this.config, path, value);
  }

  has(path: string): boolean {
    return this.getNestedValue(this.config, path) !== undefined;
  }

  getAll(): Record<string, unknown> {
    return { ...this.config };
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (typeof current !== 'object') {
        return undefined;
      }

      current = (current as Record<string, unknown>)[key];
    }

    return current;
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    let current: Record<string, unknown> = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];

      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }

      current = current[key] as Record<string, unknown>;
    }

    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;
  }
}
