import type { EventBus } from '../types/Plugin';

type EventHandler = (...args: unknown[]) => void | Promise<void>;

/**
 * Simple event bus implementation for inter-plugin communication
 */
export class EventBusImpl implements EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private onceHandlers: Map<string, Set<EventHandler>> = new Map();

  on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }

    const onceHandlers = this.onceHandlers.get(event);
    if (onceHandlers) {
      onceHandlers.delete(handler);
    }
  }

  async emit(event: string, ...args: unknown[]): Promise<void> {
    // Execute regular handlers
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(...args);
        } catch (error) {
          console.error(`[EventBus] Error in handler for event "${event}":`, error);
        }
      }
    }

    // Execute once handlers
    const onceHandlers = this.onceHandlers.get(event);
    if (onceHandlers) {
      for (const handler of onceHandlers) {
        try {
          await handler(...args);
        } catch (error) {
          console.error(`[EventBus] Error in once handler for event "${event}":`, error);
        }
      }
      // Clear once handlers after execution
      this.onceHandlers.delete(event);
    }
  }

  once(event: string, handler: EventHandler): void {
    if (!this.onceHandlers.has(event)) {
      this.onceHandlers.set(event, new Set());
    }
    this.onceHandlers.get(event)!.add(handler);
  }

  /**
   * Remove all handlers for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.handlers.delete(event);
      this.onceHandlers.delete(event);
    } else {
      this.handlers.clear();
      this.onceHandlers.clear();
    }
  }

  /**
   * Get count of handlers for an event
   */
  listenerCount(event: string): number {
    const regularCount = this.handlers.get(event)?.size || 0;
    const onceCount = this.onceHandlers.get(event)?.size || 0;
    return regularCount + onceCount;
  }

  /**
   * Get all event names
   */
  eventNames(): string[] {
    const names = new Set<string>();
    for (const event of this.handlers.keys()) {
      names.add(event);
    }
    for (const event of this.onceHandlers.keys()) {
      names.add(event);
    }
    return Array.from(names);
  }
}
