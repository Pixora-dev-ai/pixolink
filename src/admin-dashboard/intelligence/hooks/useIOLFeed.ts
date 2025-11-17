/**
 * useIOLFeed Hook - Real-time IOL Event Stream
 * Subscribes to Intelligence Orchestration Layer events
 */

import { useEffect, useState, useCallback } from 'react';
import { IOLBus } from '../../intelligence-core/orchestrator/eventBus';
import type { EventType, EventPayload } from '../../intelligence-core/types';

export interface IOLEvent {
  type: EventType;
  data: Record<string, unknown>;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface UseIOLFeedOptions {
  eventTypes?: EventType[];
  maxEvents?: number;
  userId?: string;
  sessionId?: string;
}

export function useIOLFeed(options: UseIOLFeedOptions = {}) {
  const {
    eventTypes,
    maxEvents = 50,
    userId,
    sessionId
  } = options;

  const [events, setEvents] = useState<IOLEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [eventCount, setEventCount] = useState(0);

  // Filter events based on options
  const shouldIncludeEvent = useCallback((payload: EventPayload<Record<string, unknown>>) => {
    if (eventTypes && eventTypes.length > 0 && !eventTypes.includes(payload.type)) {
      return false;
    }
    if (userId && payload.userId !== userId) {
      return false;
    }
    if (sessionId && payload.sessionId !== sessionId) {
      return false;
    }
    return true;
  }, [eventTypes, userId, sessionId]);

  // Subscribe to all IOL events
  useEffect(() => {
    setIsConnected(true);

    // Subscribe to specific event types or all
    const subscriptions: Array<() => void> = [];

    if (eventTypes && eventTypes.length > 0) {
      // Subscribe to specific events
      eventTypes.forEach(eventType => {
        const unsubscribe = IOLBus.subscribe(eventType, (payload) => {
          if (shouldIncludeEvent(payload)) {
            const event: IOLEvent = {
              type: payload.type,
              data: payload.data,
              timestamp: payload.timestamp,
              userId: payload.userId,
              sessionId: payload.sessionId,
              metadata: payload.metadata
            };

            setEvents(prev => {
              const updated = [...prev, event];
              return updated.slice(-maxEvents);
            });

            setEventCount(prev => prev + 1);
          }
        });
        subscriptions.push(unsubscribe);
      });
    } else {
      // Subscribe to all event types
      const allEventTypes: EventType[] = [
        'PROMPT_GENERATED',
        'PROMPT_ENHANCED',
        'IMAGE_GENERATED',
        'IMAGE_ASSESSED',
        'QUALITY_CHECK_COMPLETE',
        'LEARNING_UPDATED',
        'FEEDBACK_RECEIVED',
        'SYNC_STARTED',
        'SYNC_COMPLETE',
        'SYNC_FAILED',
        'VALIDATION_ERROR',
        'RULE_CONFLICT',
        'SESSION_STARTED',
        'SESSION_ENDED',
        'TELEMETRY_LOGGED',
        'ERROR_OCCURRED'
      ];

      allEventTypes.forEach(eventType => {
        const unsubscribe = IOLBus.subscribe(eventType, (payload) => {
          if (shouldIncludeEvent(payload)) {
            const event: IOLEvent = {
              type: payload.type,
              data: payload.data,
              timestamp: payload.timestamp,
              userId: payload.userId,
              sessionId: payload.sessionId,
              metadata: payload.metadata
            };

            setEvents(prev => {
              const updated = [...prev, event];
              return updated.slice(-maxEvents);
            });

            setEventCount(prev => prev + 1);
          }
        });
        subscriptions.push(unsubscribe);
      });
    }

    return () => {
      subscriptions.forEach(unsub => unsub());
      setIsConnected(false);
    };
  }, [eventTypes, maxEvents, shouldIncludeEvent]);

  // Clear events
  const clearEvents = useCallback(() => {
    setEvents([]);
    setEventCount(0);
  }, []);

  // Get events by type
  const getEventsByType = useCallback((type: EventType) => {
    return events.filter(e => e.type === type);
  }, [events]);

  // Get recent events
  const getRecentEvents = useCallback((count: number = 10) => {
    return events.slice(-count);
  }, [events]);

  // Get event statistics
  const getEventStats = useCallback(() => {
    const stats: Record<string, number> = {};
    events.forEach(event => {
      stats[event.type] = (stats[event.type] || 0) + 1;
    });
    return stats;
  }, [events]);

  return {
    events,
    isConnected,
    eventCount,
    clearEvents,
    getEventsByType,
    getRecentEvents,
    getEventStats
  };
}
