/**
 * Usage Events - Track User Actions & Behaviors
 * Records user interactions and behaviors
 */

import { IOLBus } from '../orchestrator/eventBus';
import { Metrics } from './metricsTracker';
import type { UsageMetrics } from '../types';

class UsageEventsTracker {
  private events: Map<string, UsageMetrics> = new Map();

  /**
   * Track prompt generation
   */
  promptGenerated(userId: string, prompt: string, enhanced?: boolean): void {
    this.trackEvent('prompt_generated', { userId, promptLength: prompt.length, enhanced });
  }

  /**
   * Track image generation
   */
  imageGenerated(userId: string, generationId: string, duration: number): void {
    this.trackEvent('image_generated', { userId, generationId, duration });
  }

  /**
   * Track quality assessment
   */
  qualityAssessed(userId: string, score: number, imageUrl: string): void {
    this.trackEvent('quality_assessed', { userId, score, imageUrl });
  }

  /**
   * Track feedback given
   */
  feedbackGiven(userId: string, promptId: string, feedback: 'liked' | 'disliked' | 'neutral'): void {
    this.trackEvent('feedback_given', { userId, promptId, feedback });
  }

  /**
   * Track sync operation
   */
  syncPerformed(userId: string, uploaded: number, downloaded: number, duration: number): void {
    this.trackEvent('sync_performed', { userId, uploaded, downloaded, duration });
  }

  /**
   * Track session start
   */
  sessionStarted(userId: string, sessionId: string): void {
    this.trackEvent('session_started', { userId, sessionId });
  }

  /**
   * Track session end
   */
  sessionEnded(userId: string, sessionId: string, duration: number): void {
    this.trackEvent('session_ended', { userId, sessionId, duration });
  }

  /**
   * Track feature usage
   */
  featureUsed(userId: string, feature: string, context?: Record<string, unknown>): void {
    this.trackEvent('feature_used', { userId, feature, ...context });
  }

  /**
   * Track error encountered
   */
  errorEncountered(userId: string, error: string, context?: Record<string, unknown>): void {
    this.trackEvent('error_encountered', { userId, error, ...context });
  }

  /**
   * Track network status change
   */
  networkStatusChanged(userId: string, status: string, quality: string): void {
    this.trackEvent('network_status_changed', { userId, status, quality });
  }

  /**
   * Generic event tracking
   */
  private trackEvent(eventType: string, properties: Record<string, unknown>): void {
    // Update metrics
    const existing = this.events.get(eventType);
    if (existing) {
      existing.count++;
      existing.lastOccurrence = Date.now();

      // Update average duration if present
      if (properties.duration && typeof properties.duration === 'number') {
        if (existing.avgDuration !== undefined) {
          existing.avgDuration = (existing.avgDuration * (existing.count - 1) + properties.duration) / existing.count;
        } else {
          existing.avgDuration = properties.duration;
        }
      }
    } else {
      this.events.set(eventType, {
        eventType,
        count: 1,
        avgDuration: typeof properties.duration === 'number' ? properties.duration : undefined,
        lastOccurrence: Date.now()
      });
    }

    // Send to metrics tracker
    Metrics.track(eventType, properties, properties.userId as string | undefined);

    // Publish to event bus
    IOLBus.publish('TELEMETRY_LOGGED', {
      source: 'usage',
      eventType,
      properties
    }).catch(console.error);
  }

  /**
   * Get usage metrics for an event type
   */
  getMetrics(eventType: string): UsageMetrics | undefined {
    return this.events.get(eventType);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, UsageMetrics> {
    return new Map(this.events);
  }

  /**
   * Get metrics summary
   */
  getSummary(): {
    totalEvents: number;
    uniqueEventTypes: number;
    topEvents: Array<{ eventType: string; count: number }>;
    recentActivity: number;
  } {
    const totalEvents = Array.from(this.events.values()).reduce((sum, m) => sum + m.count, 0);
    const uniqueEventTypes = this.events.size;

    // Get top events
    const topEvents = Array.from(this.events.entries())
      .map(([eventType, metrics]) => ({ eventType, count: metrics.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Count recent activity (last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentActivity = Array.from(this.events.values())
      .filter((m) => m.lastOccurrence > oneHourAgo)
      .reduce((sum, m) => sum + m.count, 0);

    return {
      totalEvents,
      uniqueEventTypes,
      topEvents,
      recentActivity
    };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.events.clear();
  }

  /**
   * Export metrics
   */
  export(): string {
    const data = {
      metrics: Array.from(this.events.entries()).map(([key, value]) => ({
        eventType: key,
        ...value
      })),
      summary: this.getSummary(),
      exportedAt: Date.now()
    };

    return JSON.stringify(data, null, 2);
  }
}

// Singleton instance
export const UsageEvents = new UsageEventsTracker();
