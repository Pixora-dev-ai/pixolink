/**
 * Error Reporter - Centralized Error Handling
 * Reports errors to Sentry and event bus
 */

import * as Sentry from '@sentry/react';
import { IOLBus } from '../orchestrator/eventBus';
import type { ErrorReport } from '../types';

class ErrorReporter {
  private initialized = false;
  private errorHistory: ErrorReport[] = [];
  private maxHistorySize = 100;

  /**
   * Initialize Sentry
   */
  initialize(dsn?: string, options?: Sentry.BrowserOptions): void {
    if (this.initialized) return;

    const sentryDsn = dsn ?? import.meta.env.VITE_SENTRY_DSN;

    if (!sentryDsn) {
      if (import.meta.env.DEV) {
        console.warn('[ErrorReporter] Sentry DSN not found, errors will be logged to console only');
      }
      return;
    }

    try {
      Sentry.init({
        dsn: sentryDsn,
        environment: import.meta.env.MODE,
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration()
        ],
        tracesSampleRate: 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        ...options
      });

      this.initialized = true;
    } catch (error) {
      console.error('[ErrorReporter] Failed to initialize Sentry:', error);
    }
  }

  /**
   * Report error
   */
  report(
    error: Error,
    context?: Record<string, unknown>,
    severity: ErrorReport['severity'] = 'medium',
    userId?: string
  ): void {
    const errorReport: ErrorReport = {
      error,
      context,
      severity,
      userId,
      timestamp: Date.now()
    };

    // Store in history
    this.errorHistory.push(errorReport);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }

    // Report to Sentry
    if (this.initialized) {
      try {
        Sentry.captureException(error, {
          level: this.mapSeverity(severity),
          contexts: {
            custom: context
          },
          user: userId ? { id: userId } : undefined
        });
      } catch (err) {
        console.error('[ErrorReporter] Failed to report to Sentry:', err);
      }
    }

    // Publish to event bus
    IOLBus.publish('ERROR_OCCURRED', {
      error: error.message,
      context,
      severity,
      userId
    }).catch(console.error);

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error(`[ErrorReporter] ${severity.toUpperCase()}:`, error, context);
    }
  }

  /**
   * Report critical error
   */
  critical(error: Error, context?: Record<string, unknown>, userId?: string): void {
    this.report(error, context, 'critical', userId);
  }

  /**
   * Report high priority error
   */
  high(error: Error, context?: Record<string, unknown>, userId?: string): void {
    this.report(error, context, 'high', userId);
  }

  /**
   * Report medium priority error
   */
  medium(error: Error, context?: Record<string, unknown>, userId?: string): void {
    this.report(error, context, 'medium', userId);
  }

  /**
   * Report low priority error
   */
  low(error: Error, context?: Record<string, unknown>, userId?: string): void {
    this.report(error, context, 'low', userId);
  }

  /**
   * Log message
   */
  log(message: string, context?: Record<string, unknown>, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (this.initialized) {
      try {
        Sentry.captureMessage(message, {
          level,
          contexts: {
            custom: context
          }
        });
      } catch (error) {
        console.error('[ErrorReporter] Failed to log message:', error);
      }
    }

    if (import.meta.env.DEV) {
      if (level === 'error') {
        console.error(`[ErrorReporter] ${message}`, context);
      } else if (level === 'warning') {
        console.warn(`[ErrorReporter] ${message}`, context);
      }
    }
  }

  /**
   * Set user context
   */
  setUser(userId: string, email?: string, username?: string): void {
    if (this.initialized) {
      try {
        Sentry.setUser({
          id: userId,
          email,
          username
        });
      } catch (error) {
        console.error('[ErrorReporter] Failed to set user:', error);
      }
    }
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(message: string, category?: string, data?: Record<string, unknown>): void {
    if (this.initialized) {
      try {
        Sentry.addBreadcrumb({
          message,
          category,
          data,
          timestamp: Date.now() / 1000
        });
      } catch (error) {
        console.error('[ErrorReporter] Failed to add breadcrumb:', error);
      }
    }
  }

  /**
   * Get error history
   */
  getHistory(options?: {
    severity?: ErrorReport['severity'];
    userId?: string;
    limit?: number;
  }): ErrorReport[] {
    let history = [...this.errorHistory];

    if (options?.severity) {
      history = history.filter((e) => e.severity === options.severity);
    }

    if (options?.userId) {
      history = history.filter((e) => e.userId === options.userId);
    }

    if (options?.limit) {
      history = history.slice(-options.limit);
    }

    return history;
  }

  /**
   * Get error statistics
   */
  getStats(): {
    total: number;
    bySeverity: Record<string, number>;
    recentCount: number;
  } {
    const bySeverity: Record<string, number> = {};
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let recentCount = 0;

    for (const error of this.errorHistory) {
      bySeverity[error.severity] = (bySeverity[error.severity] ?? 0) + 1;

      if (error.timestamp > oneHourAgo) {
        recentCount++;
      }
    }

    return {
      total: this.errorHistory.length,
      bySeverity,
      recentCount
    };
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Map severity to Sentry level
   */
  private mapSeverity(severity: ErrorReport['severity']): Sentry.SeverityLevel {
    const map: Record<ErrorReport['severity'], Sentry.SeverityLevel> = {
      low: 'info',
      medium: 'warning',
      high: 'error',
      critical: 'fatal'
    };
    return map[severity];
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
export const ErrorTracker = new ErrorReporter();
