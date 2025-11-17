/**
 * EventStream Component - Real-time IOL Event Feed
 * Displays live stream of Intelligence Orchestration Layer events
 */

import { useEffect, useRef, useState } from 'react';
import { useIOLFeed } from '../hooks/useIOLFeed';
import type { EventType } from '../../intelligence-core/types';

interface EventStreamProps {
  maxEvents?: number;
  eventTypes?: EventType[];
  userId?: string;
  sessionId?: string;
  autoScroll?: boolean;
}

export function EventStream({
  maxEvents = 50,
  eventTypes,
  userId,
  sessionId,
  autoScroll = true
}: EventStreamProps) {
  const { events, isConnected, eventCount, clearEvents, getEventStats } = useIOLFeed({
    maxEvents,
    eventTypes,
    userId,
    sessionId
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState<EventType | 'all'>('all');

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && !isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, autoScroll, isPaused]);

  // Filter events
  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.type === filter);

  // Get event statistics
  const stats = getEventStats();

  // Event type colors
  const getEventColor = (type: EventType): string => {
    const colorMap: Record<EventType, string> = {
      'PROMPT_GENERATED': '#10b981',
      'PROMPT_ENHANCED': '#06b6d4',
      'IMAGE_GENERATED': '#8b5cf6',
      'IMAGE_ASSESSED': '#ec4899',
      'QUALITY_CHECK_COMPLETE': '#f59e0b',
      'LEARNING_UPDATED': '#3b82f6',
      'FEEDBACK_RECEIVED': '#22c55e',
      'SYNC_STARTED': '#6366f1',
      'SYNC_COMPLETE': '#10b981',
      'SYNC_FAILED': '#ef4444',
      'VALIDATION_ERROR': '#f97316',
      'RULE_CONFLICT': '#dc2626',
      'SESSION_STARTED': '#0ea5e9',
      'SESSION_ENDED': '#64748b',
      'TELEMETRY_LOGGED': '#84cc16',
      'ERROR_OCCURRED': '#dc2626'
    };
    return colorMap[type] || '#64748b';
  };

  // Format timestamp
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Format event data for display
  const formatData = (data: Record<string, unknown>): string => {
    return JSON.stringify(data, null, 2);
  };

  return (
    <div className="event-stream-container">
      {/* Header */}
      <div className="stream-header">
        <div className="header-left">
          <h3>Live Event Stream</h3>
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
        <div className="header-right">
          <span className="event-count">Total: {eventCount}</span>
          <button
            className="btn-secondary"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button
            className="btn-secondary"
            onClick={clearEvents}
          >
            🗑 Clear
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="stream-filters">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as EventType | 'all')}
          className="filter-select"
        >
          <option value="all">All Events ({events.length})</option>
          {Object.entries(stats).map(([type, count]) => (
            <option key={type} value={type}>
              {type} ({count})
            </option>
          ))}
        </select>
      </div>

      {/* Event Feed */}
      <div
        ref={scrollRef}
        className="event-feed"
      >
        {filteredEvents.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📡</span>
            <p>Waiting for events...</p>
            <small>Events will appear here as they occur</small>
          </div>
        ) : (
          filteredEvents.map((event, index) => (
            <div
              key={`${event.timestamp}-${index}`}
              className="event-card"
            >
              <div className="event-header">
                <span
                  className="event-badge"
                  style={{ backgroundColor: getEventColor(event.type) }}
                >
                  {event.type}
                </span>
                <span className="event-time">{formatTime(event.timestamp)}</span>
              </div>
              
              {(event.userId || event.sessionId) && (
                <div className="event-meta">
                  {event.userId && (
                    <span className="meta-item">
                      👤 {event.userId}
                    </span>
                  )}
                  {event.sessionId && (
                    <span className="meta-item">
                      🔗 {event.sessionId.slice(0, 8)}
                    </span>
                  )}
                </div>
              )}

              <details className="event-data">
                <summary>View Data</summary>
                <pre className="data-json">{formatData(event.data)}</pre>
              </details>
            </div>
          ))
        )}
      </div>

      {/* Footer Stats */}
      <div className="stream-footer">
        <small>
          Showing {filteredEvents.length} of {events.length} events
          {isPaused && <span className="paused-badge"> (Paused)</span>}
        </small>
      </div>
    </div>
  );
}
