import type { Logger } from '../types/Plugin';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  meta?: Record<string, unknown>;
  error?: Error;
}

/**
 * Simple logger implementation
 */
export class SimpleLogger implements Logger {
  private minLevel: LogLevel;
  private prefix: string;

  constructor(options: { minLevel?: LogLevel; prefix?: string } = {}) {
    this.minLevel = options.minLevel || 'info';
    this.prefix = options.prefix || '[PixoLink]';
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.debug(`${this.prefix} [DEBUG]`, message, meta || '');
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.info(`${this.prefix} [INFO]`, message, meta || '');
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(`${this.prefix} [WARN]`, message, meta || '');
    }
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      console.error(`${this.prefix} [ERROR]`, message, error || '', meta || '');
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const minIndex = levels.indexOf(this.minLevel);
    const currentIndex = levels.indexOf(level);
    return currentIndex >= minIndex;
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  setPrefix(prefix: string): void {
    this.prefix = prefix;
  }
}
