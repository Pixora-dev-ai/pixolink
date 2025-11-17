/**
 * ModuleController - Individual Module Control Component
 * Displays module status and provides pause/resume controls
 */

import React from 'react';

interface ModuleControllerProps {
  name: string;
  state: 'active' | 'paused' | 'error';
  onToggle: () => void;
  metrics?: {
    uptime?: number;
    requestCount?: number;
    errorRate?: number;
  };
}

export const ModuleController: React.FC<ModuleControllerProps> = ({
  name,
  state,
  onToggle,
  metrics
}) => {
  const getStateColor = () => {
    switch (state) {
      case 'active':
        return 'text-green-400';
      case 'paused':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStateIcon = () => {
    switch (state) {
      case 'active':
        return '✓';
      case 'paused':
        return '⏸';
      case 'error':
        return '✗';
      default:
        return '○';
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  return (
    <div className="module-controller">
      <div className="module-header">
        <span className={`status-icon ${getStateColor()}`}>
          {getStateIcon()}
        </span>
        <h4 className="module-name">{name}</h4>
      </div>
      
      <div className="module-state">
        <span className={`state-badge ${getStateColor()}`}>
          {state.toUpperCase()}
        </span>
      </div>

      {metrics && (
        <div className="module-metrics">
          <div className="metric-item">
            <span className="metric-label">Uptime:</span>
            <span className="metric-value">{formatUptime(metrics.uptime)}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Requests:</span>
            <span className="metric-value">{metrics.requestCount || 0}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Error Rate:</span>
            <span className="metric-value">
              {metrics.errorRate ? `${(metrics.errorRate * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
        </div>
      )}

      <button
        onClick={onToggle}
        className={`module-toggle-btn ${
          state === 'active' ? 'btn-pause' : 'btn-resume'
        }`}
        disabled={state === 'error'}
      >
        {state === 'active' ? '⏸ Pause' : state === 'paused' ? '▶ Resume' : '⚠ Error'}
      </button>
    </div>
  );
};
