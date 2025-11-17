/**
 * Predictive Tab - Predictive Maintenance Dashboard
 * Real-time forecast display with ML-based risk assessment
 */

import { useState, useEffect } from 'react';
import { PredictiveSummaryGenerator, ForecastVisualizer } from '../../intelligence-core/predictive';
import type { PredictiveSummary } from '../../intelligence-core/predictive';

// Mock health logs for now (replace with real PADL integration)
const getMockHealthLogs = () => {
  const modules = ['LUMINA', 'LCC', 'LogicSim', 'PixoGuard', 'ai-core', 'backupService'];
  const logs = [];
  
  for (let i = 0; i < 100; i++) {
    const module = modules[Math.floor(Math.random() * modules.length)];
    logs.push({
      timestamp: Date.now() - (100 - i) * 60000, // Last 100 minutes
      module,
      latency: 100 + Math.random() * 200 + (i > 80 ? i * 5 : 0), // Increasing trend at end
      errorRate: Math.random() * 0.1,
      memoryUsage: 0.5 + Math.random() * 0.3,
      cpuUsage: 0.3 + Math.random() * 0.4,
      requestCount: Math.floor(Math.random() * 100),
      severity: 'info' as const,
      message: 'Health check'
    });
  }
  
  return logs;
};

export function PredictiveTab() {
  const [summary, setSummary] = useState<PredictiveSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // Fetch forecast
  const fetchForecast = async () => {
    setLoading(true);
    try {
      // TODO: Replace with real PADL integration
      // const logs = await HealthLogger.getRecent(100);
      const logs = getMockHealthLogs();
      
      const forecast = await PredictiveSummaryGenerator.getForecast(logs, {
        analysisWindow: 100,
        includeAIAdvisory: true
      });
      
      setSummary(forecast);
      setLastUpdate(Date.now());
    } catch (error) {
      console.error('Failed to fetch forecast:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and periodic updates
  useEffect(() => {
    fetchForecast();
    
    // Update every 15 seconds
    const interval = setInterval(fetchForecast, 15000);
    
    return () => clearInterval(interval);
  }, []);

  // Format table data
  const tableRows = summary ? ForecastVisualizer.formatForTable(summary) : [];

  // Get risk color class
  const getRiskClass = (risk: string) => {
    switch (risk) {
      case 'Critical': return 'risk-critical';
      case 'High': return 'risk-high';
      case 'Medium': return 'risk-medium';
      case 'Low': return 'risk-low';
      default: return 'risk-unknown';
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  if (loading && !summary) {
    return (
      <div className="predictive-tab">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Analyzing system health and generating predictions...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="predictive-tab">
        <div className="empty-state">
          <p>No predictive data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="predictive-tab">
      {/* Header */}
      <div className="predictive-header">
        <div className="header-left">
          <h2>🔮 Predictive Maintenance AI</h2>
          <p className="subtitle">ML-powered forecasting and risk detection</p>
        </div>
        <div className="header-right">
          <div className={`health-badge health-${summary.overallHealth.toLowerCase()}`}>
            {summary.overallHealth}
          </div>
          <div className="last-update">
            Updated {formatTime(lastUpdate)}
          </div>
          <button onClick={fetchForecast} className="btn-refresh" disabled={loading}>
            {loading ? '⟳' : '↻'} Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="predictive-stats">
        <div className="stat-card">
          <div className="stat-label">Critical Modules</div>
          <div className="stat-value">{tableRows.filter(r => r.risk === 'Critical').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">High Risk</div>
          <div className="stat-value">{tableRows.filter(r => r.risk === 'High').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Auto-Tuning Actions</div>
          <div className="stat-value">{summary.autoTuningActions.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Correlations Found</div>
          <div className="stat-value">{summary.correlations.length}</div>
        </div>
      </div>

      {/* Risk Table */}
      <div className="risk-table-container">
        <h3>Module Risk Assessment</h3>
        {tableRows.length === 0 ? (
          <div className="empty-state">
            <p>✓ All systems healthy - no risks detected</p>
          </div>
        ) : (
          <div className="risk-table-wrapper">
            <table className="risk-table">
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Risk Level</th>
                  <th>Probability</th>
                  <th>Confidence</th>
                  <th>Timeframe</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, index) => (
                  <tr key={index} className="risk-row">
                    <td className="module-cell">
                      <span className="module-name">{row.module}</span>
                    </td>
                    <td>
                      <span className={`risk-badge ${getRiskClass(row.risk)}`}>
                        {row.risk}
                      </span>
                    </td>
                    <td className="probability-cell">{row.probability}</td>
                    <td className="confidence-cell">{row.confidence}</td>
                    <td className="timeframe-cell">{row.timeframe || 'N/A'}</td>
                    <td className="recommendation-cell">
                      <div className="recommendation-text">{row.recommendation}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Correlations */}
      {summary.correlations.length > 0 && (
        <div className="correlations-section">
          <h3>⚡ Detected Correlations</h3>
          <div className="correlation-cards">
            {summary.correlations.map((corr, index) => (
              <div key={index} className="correlation-card">
                <div className="correlation-header">
                  <span className="correlation-type">{corr.correlationType}</span>
                  <span className="correlation-strength">{(corr.strength * 100).toFixed(0)}%</span>
                </div>
                <div className="correlation-modules">
                  {corr.modules.join(' → ')}
                </div>
                <div className="correlation-description">{corr.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto-Tuning Actions */}
      {summary.autoTuningActions.length > 0 && (
        <div className="auto-tuning-section">
          <h3>🎯 Auto-Tuning Actions Taken</h3>
          <div className="tuning-list">
            {summary.autoTuningActions.map((action, index) => (
              <div key={index} className="tuning-item">
                <div className="tuning-icon">⚙️</div>
                <div className="tuning-content">
                  <div className="tuning-module">{action.module}</div>
                  <div className="tuning-reason">{action.reason}</div>
                  <div className="tuning-mode">Mode: {action.mode}</div>
                </div>
                <div className="tuning-time">{formatTime(action.appliedAt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
