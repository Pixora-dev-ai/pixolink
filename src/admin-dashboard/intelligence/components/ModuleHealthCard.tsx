/**
 * ModuleHealthCard Component - AI Module Status Indicator
 * Displays health status and metrics for IOL modules
 */

import type { ModuleHealth } from '../hooks/useModuleStatus';

interface ModuleHealthCardProps {
  module: ModuleHealth;
  onClick?: () => void;
}

export function ModuleHealthCard({ module, onClick }: ModuleHealthCardProps) {
  // Status colors
  const getStatusColor = (health: ModuleHealth['health']): string => {
    const colorMap = {
      healthy: '#10b981',
      degraded: '#f59e0b',
      unhealthy: '#ef4444'
    };
    return colorMap[health];
  };

  // Status icons
  const getStatusIcon = (health: ModuleHealth['health']): string => {
    const iconMap = {
      healthy: '✓',
      degraded: '⚠',
      unhealthy: '✗'
    };
    return iconMap[health];
  };

  // Format uptime
  const formatUptime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Format number
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Format percentage
  const formatPercentage = (rate: number): string => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  return (
    <div
      className="module-health-card"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Header */}
      <div className="card-header">
        <div className="module-info">
          <span className="module-icon">🧠</span>
          <div className="module-name">
            <h4>{module.name}</h4>
            <small>{module.id}</small>
          </div>
        </div>
        <div
          className="status-badge"
          style={{
            backgroundColor: getStatusColor(module.health),
            animation: module.status === 'active' ? 'pulse 2s infinite' : 'none'
          }}
        >
          <span className="status-icon">{getStatusIcon(module.health)}</span>
        </div>
      </div>

      {/* Metrics */}
      {module.metrics && (
        <div className="card-metrics">
          <div className="metric-item">
            <span className="metric-label">Uptime</span>
            <span className="metric-value">
              {formatUptime(module.metrics.uptime)}
            </span>
          </div>

          <div className="metric-item">
            <span className="metric-label">Requests</span>
            <span className="metric-value">
              {formatNumber(module.metrics.requestCount)}
            </span>
          </div>

          <div className="metric-item">
            <span className="metric-label">Error Rate</span>
            <span className={`metric-value ${module.metrics.errorRate > 0.05 ? 'error' : ''}`}>
              {formatPercentage(module.metrics.errorRate)}
            </span>
          </div>

          <div className="metric-item">
            <span className="metric-label">Avg Response</span>
            <span className="metric-value">
              {module.metrics.avgResponseTime.toFixed(0)}ms
            </span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="card-footer">
        <small>
          Last checked: {new Date(module.lastChecked).toLocaleTimeString()}
        </small>
      </div>
    </div>
  );
}
