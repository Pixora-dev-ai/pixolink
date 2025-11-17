/**
 * EventSimulator - Manual Event Injection Tool
 * Allows admins to manually inject IOL events for testing and debugging
 */

import React, { useState } from 'react';
import { IOLBus } from '../../intelligence-core/orchestrator/eventBus';
import type { EventType } from '../../intelligence-core/types';

const EVENT_TYPES: EventType[] = [
  'PROMPT_GENERATED',
  'PROMPT_ENHANCED',
  'IMAGE_GENERATED',
  'IMAGE_ASSESSED',
  'QUALITY_CHECK_COMPLETE',
  'SYNC_STARTED',
  'SYNC_COMPLETE',
  'SYNC_FAILED',
  'RULE_CONFLICT',
  'VALIDATION_ERROR',
  'SESSION_STARTED',
  'SESSION_ENDED',
  'FEEDBACK_RECEIVED',
  'LEARNING_UPDATED',
  'TELEMETRY_LOGGED',
  'ERROR_OCCURRED'
];

const EVENT_TEMPLATES: Record<string, string> = {
  PROMPT_GENERATED: JSON.stringify({
    promptId: 'test_prompt_001',
    prompt: 'A beautiful sunset over mountains',
    userId: 'test_user'
  }, null, 2),
  IMAGE_GENERATED: JSON.stringify({
    promptId: 'test_prompt_001',
    imageId: 'test_img_001',
    url: 'https://example.com/image.png'
  }, null, 2),
  IMAGE_ASSESSED: JSON.stringify({
    imageId: 'test_img_001',
    qualityScore: 85,
    metrics: {
      composition: 88,
      color: 82,
      clarity: 90,
      creativity: 80
    }
  }, null, 2),
  SYNC_COMPLETE: JSON.stringify({
    imageId: 'test_img_001',
    syncTarget: 'supabase',
    success: true
  }, null, 2),
  ERROR_OCCURRED: JSON.stringify({
    error: 'Test error message',
    severity: 'medium',
    module: 'test_module'
  }, null, 2)
};

export const EventSimulator: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<EventType>('PROMPT_GENERATED');
  const [eventData, setEventData] = useState(EVENT_TEMPLATES.PROMPT_GENERATED);
  const [userId, setUserId] = useState('test_user');
  const [sessionId, setSessionId] = useState('test_session');
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [history, setHistory] = useState<Array<{ timestamp: Date; event: EventType; success: boolean }>>([]);

  const handleEventChange = (event: EventType) => {
    setSelectedEvent(event);
    setEventData(EVENT_TEMPLATES[event] || '{}');
  };

  const handleInjectEvent = () => {
    try {
      const payload = JSON.parse(eventData);
      
      IOLBus.publish(selectedEvent, {
        type: selectedEvent,
        data: payload,
        timestamp: Date.now(),
        userId: userId || undefined,
        sessionId: sessionId || undefined
      });

      setResult({
        type: 'success',
        message: `Event ${selectedEvent} injected successfully!`
      });

      setHistory(prev => [
        { timestamp: new Date(), event: selectedEvent, success: true },
        ...prev.slice(0, 9)
      ]);

      // Clear result after 3 seconds
      setTimeout(() => setResult(null), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResult({
        type: 'error',
        message: `Invalid JSON payload: ${errorMessage}`
      });
    }
  };

  const handleLoadTemplate = () => {
    const template = EVENT_TEMPLATES[selectedEvent] || '{}';
    setEventData(template);
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <div className="event-simulator">
      <div className="event-simulator-header">
        <h3 className="event-simulator-title">🧪 Event Simulator</h3>
        <span className="event-simulator-subtitle">Manual event injection for testing</span>
      </div>

      <div className="event-simulator-body">
        <div className="form-group">
          <label htmlFor="event-type">Event Type</label>
          <select
            id="event-type"
            className="form-select"
            value={selectedEvent}
            onChange={(e) => handleEventChange(e.target.value as EventType)}
          >
            {EVENT_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="user-id">User ID (optional)</label>
            <input
              id="user-id"
              type="text"
              className="form-input"
              placeholder="e.g., user_123"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="session-id">Session ID (optional)</label>
            <input
              id="session-id"
              type="text"
              className="form-input"
              placeholder="e.g., session_abc"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <div className="form-label-row">
            <label htmlFor="event-data">Event Data (JSON)</label>
            <button
              className="btn-link"
              onClick={handleLoadTemplate}
            >
              Load Template
            </button>
          </div>
          <textarea
            id="event-data"
            rows={10}
            className="form-textarea"
            value={eventData}
            onChange={(e) => setEventData(e.target.value)}
            placeholder='{"key": "value"}'
          />
        </div>

        {result && (
          <div className={`event-result ${result.type === 'success' ? 'result-success' : 'result-error'}`}>
            {result.type === 'success' ? '✓' : '✗'} {result.message}
          </div>
        )}

        <button
          className="btn-inject"
          onClick={handleInjectEvent}
        >
          🚀 Inject Event
        </button>

        {history.length > 0 && (
          <div className="event-history">
            <div className="event-history-header">
              <h4>Recent Events</h4>
              <button className="btn-clear" onClick={clearHistory}>Clear</button>
            </div>
            <ul className="event-history-list">
              {history.map((entry, i) => (
                <li key={i} className="event-history-item">
                  <span className={`history-icon ${entry.success ? 'success' : 'error'}`}>
                    {entry.success ? '✓' : '✗'}
                  </span>
                  <span className="history-event">{entry.event}</span>
                  <span className="history-time">
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
