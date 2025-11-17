/**
 * Event Bus - Pub/Sub System for IOL
 * Handles all inter-module communication
 */

import type { EventType, EventPayload, EventCallback } from '../types';

class EventBus {
  private listeners: Map<EventType, Set<EventCallback>> = new Map();
  private eventHistory: EventPayload[] = [];
  private maxHistorySize = 1000;

  /**
   * Subscribe to an event
   */
  subscribe<T = Record<string, unknown>>(
    event: EventType,
    callback: EventCallback<T>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const typedCallback = callback as EventCallback;
    this.listeners.get(event)?.add(typedCallback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(typedCallback);
    };
  }

  /**
   * Publish an event to all subscribers
   */
  async publish<T = Record<string, unknown>>(
    type: EventType,
    data: T,
    options?: {
      userId?: string;
      sessionId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const payload: EventPayload<T> = {
      type,
      data,
      timestamp: Date.now(),
      userId: options?.userId,
      sessionId: options?.sessionId,
      metadata: options?.metadata
    };

    // Add to history
    this.addToHistory(payload);

    // Notify all listeners
    const callbacks = this.listeners.get(type);
    if (!callbacks || callbacks.size === 0) {
      return;
    }

    // Execute all callbacks (parallel for performance)
    const promises = Array.from(callbacks).map(async (callback) => {
      try {
        await callback(payload);
      } catch (error) {
        console.error(`[EventBus] Error in ${type} handler:`, error);
        // Publish error event
        this.publish('ERROR_OCCURRED', {
          originalEvent: type,
          error: error instanceof Error ? error.message : 'Unknown error',
          payload
        }).catch(console.error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Get all listeners for an event
   */
  getListeners(event: EventType): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  /**
   * Get all registered event types
   */
  getRegisteredEvents(): EventType[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Clear all listeners for an event
   */
  clearListeners(event?: EventType): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get event history
   */
  getHistory(options?: {
    type?: EventType;
    userId?: string;
    sessionId?: string;
    limit?: number;
  }): EventPayload[] {
    let history = [...this.eventHistory];

    if (options?.type) {
      history = history.filter((e) => e.type === options.type);
    }

    if (options?.userId) {
      history = history.filter((e) => e.userId === options.userId);
    }

    if (options?.sessionId) {
      history = history.filter((e) => e.sessionId === options.sessionId);
    }

    if (options?.limit) {
      history = history.slice(-options.limit);
    }

    return history;
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get event statistics
   */
  getStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    listenersByType: Record<string, number>;
  } {
    const eventsByType: Record<string, number> = {};
    
    for (const event of this.eventHistory) {
      eventsByType[event.type] = (eventsByType[event.type] ?? 0) + 1;
    }

    const listenersByType: Record<string, number> = {};
    for (const [type, listeners] of this.listeners.entries()) {
      listenersByType[type] = listeners.size;
    }

    return {
      totalEvents: this.eventHistory.length,
      eventsByType,
      listenersByType
    };
  }

  /**
   * Add event to history with size management
   */
  private addToHistory(payload: EventPayload): void {
    this.eventHistory.push(payload);

    // Maintain max size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Wait for a specific event (Promise-based)
   */
  waitFor<T = Record<string, unknown>>(
    event: EventType,
    timeout = 30000
  ): Promise<EventPayload<T>> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      const unsubscribe = this.subscribe<T>(event, (payload) => {
        clearTimeout(timeoutId);
        unsubscribe();
        resolve(payload);
      });
    });
  }
}

// Singleton instance
export const IOLBus = new EventBus();
