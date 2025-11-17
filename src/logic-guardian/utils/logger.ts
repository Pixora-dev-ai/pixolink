/**
 * Centralized logger for Logic Guardian
 * Integrates with Sentry/monitoring systems
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: any;
  timestamp: number;
  category?: string;
}

export interface LoggerConfig {
  minLevel?: LogLevel;
  enableConsole?: boolean;
  onLog?: (entry: LogEntry) => void;
  sentryIntegration?: {
    captureError: (error: Error, context?: any) => void;
    captureMessage: (message: string, level: string, context?: any) => void;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3
};

/**
 * Logger for Logic Guardian
 */
export class Logger {
  private config: Required<Omit<LoggerConfig, 'sentryIntegration'>> & {
    sentryIntegration?: LoggerConfig['sentryIntegration'];
  };

  constructor(config: LoggerConfig = {}) {
    this.config = {
      minLevel: LogLevel.DEBUG,
      enableConsole: true,
      onLog: () => {},
      ...config
    };
  }

  public debug(message: string, context?: any, category?: string): void {
    this.log(LogLevel.DEBUG, message, context, category);
  }

  public info(message: string, context?: any, category?: string): void {
    this.log(LogLevel.INFO, message, context, category);
  }

  public warn(message: string, context?: any, category?: string): void {
    this.log(LogLevel.WARN, message, context, category);
  }

  public error(message: string, context?: any, category?: string): void {
    this.log(LogLevel.ERROR, message, context, category);

    // Send to Sentry if configured
    if (this.config.sentryIntegration && context?.error instanceof Error) {
      this.config.sentryIntegration.captureError(context.error, context);
    }
  }

  private log(level: LogLevel, message: string, context?: any, category?: string): void {
    // Check if should log based on level
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: Date.now(),
      category
    };

    // Call custom handler
    this.config.onLog(entry);

    // Console output
    if (this.config.enableConsole) {
      const prefix = category ? `[${category}]` : '[LogicGuardian]';
      const fullMessage = `${prefix} ${message}`;
      
      // Stringify context to ensure it's reliably displayed as text rather than [object Object]
      const contextArg = context ? JSON.stringify(context, null, 2) : '';

      switch (level) {
        case LogLevel.DEBUG:
          console.debug(fullMessage, contextArg || '');
          break;
        case LogLevel.INFO:
          console.info(fullMessage, contextArg || '');
          break;
        case LogLevel.WARN:
          console.warn(fullMessage, contextArg || '');
          break;
        case LogLevel.ERROR:
          console.error(fullMessage, contextArg || '');
          break;
      }
    }
  }

  public setMinLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }

  public setSentryIntegration(integration: LoggerConfig['sentryIntegration']): void {
    this.config.sentryIntegration = integration;
  }
}

// Global logger instance
export const logger = new Logger();