/**
 * Metrics Tracker - Telemetry & Analytics
 * Tracks all metrics and sends to PostHog
 */

import posthog from 'posthog-js';
import { IOLBus } from '../orchestrator/eventBus';
import type { TelemetryEvent } from '../types';

class MetricsTracker {
  private initialized = false;
  private eventQueue: TelemetryEvent[] = [];
  private maxQueueSize = 100;

  /**
   * Initialize PostHog
   */
  initialize(apiKey?: string, options?: Record<string, unknown>): void {
    if (this.initialized) return;

    const key = apiKey ?? import.meta.env.VITE_POSTHOG_API_KEY;

    if (!key) {
      if (import.meta.env.DEV) {
        console.warn('[MetricsTracker] PostHog API key not found, running in mock mode');
      }
      return;
    }

    try {
      posthog.init(key, {
        api_host: 'https://app.posthog.com',
        ...options
      });

      this.initialized = true;

      // Flush queued events
      this.flushQueue();
    } catch (error) {
      console.error('[MetricsTracker] Failed to initialize PostHog:', error);
    }
  }

  /**
   * Track event
   */
  track(name: string, properties?: Record<string, unknown>, userId?: string, sessionId?: string): void {
    const event: TelemetryEvent = {
      name,
      properties,
      timestamp: Date.now(),
      userId,
      sessionId
    };

    if (this.initialized) {
      try {
        posthog.capture(name, properties);
      } catch (error) {
        console.error('[MetricsTracker] Failed to track event:', error);
      }
    } else {
      // Queue event for later
      this.eventQueue.push(event);

      // Maintain max size
      if (this.eventQueue.length > this.maxQueueSize) {
        this.eventQueue = this.eventQueue.slice(-this.maxQueueSize);
      }
    }

    // Publish to event bus
    IOLBus.publish('TELEMETRY_LOGGED', {
      source: 'metrics',
      event
    }).catch(console.error);
  }

  /**
   * Identify user
   */
  identify(userId: string, properties?: Record<string, unknown>): void {
    if (this.initialized) {
      try {
        posthog.identify(userId, properties);
      } catch (error) {
        console.error('[MetricsTracker] Failed to identify user:', error);
      }
    }
  }

  /**
   * Track page view
   */
  pageView(pageName?: string, properties?: Record<string, unknown>): void {
    this.track('$pageview', {
      ...properties,
      page_name: pageName
    });
  }

  /**
   * Track user action
   */
  action(action: string, properties?: Record<string, unknown>, userId?: string): void {
    this.track(`action_${action}`, properties, userId);
  }

  /**
   * Track performance metric
   */
  performance(metric: string, value: number, unit = 'ms', userId?: string): void {
    this.track('performance_metric', {
      metric,
      value,
      unit
    }, userId);
  }

  /**
   * Flush queued events
   */
  private flushQueue(): void {
    if (!this.initialized || this.eventQueue.length === 0) return;

    for (const event of this.eventQueue) {
      try {
        posthog.capture(event.name, event.properties);
      } catch (error) {
        console.error('[MetricsTracker] Failed to flush queued event:', error);
      }
    }

    this.eventQueue = [];
  }

  /**
   * Reset metrics
   */
  reset(): void {
    if (this.initialized) {
      try {
        posthog.reset();
      } catch (error) {
        console.error('[MetricsTracker] Failed to reset:', error);
      }
    }

    this.eventQueue = [];
  }

  /**
   * Get initialization status
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get queued events count
   */
  getQueueSize(): number {
    return this.eventQueue.length;
  }
}

// Singleton instance
export const Metrics = new MetricsTracker();
