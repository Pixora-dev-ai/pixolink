/**
 * Intelligence Dashboard - Main Page
 * Real-time visualization of the Intelligence Orchestration Layer
 * Enhanced with Interactive Control Layer for AI Command Center capabilities
 * Now with Predictive Maintenance AI Layer (PMAL) for forecasting
 */

import { useState } from 'react';
import { EventStream } from '../components/EventStream';
import { ModuleHealthCard } from '../components/ModuleHealthCard';
import { PerformanceChart } from '../components/PerformanceChart';
import { QualityInsights } from '../components/QualityInsights';
import { MemoryMap } from '../components/MemoryMap';
import { IOLGraph } from '../components/IOLGraph';
import { ControlPanel } from '../controls/ControlPanel';
import { EventSimulator } from '../controls/EventSimulator';
import { MemoryManager } from '../controls/MemoryManager';
import { LogicSimRunner } from '../controls/LogicSimRunner';
import { VisionTester } from '../controls/VisionTester';
import { PredictiveTab } from '../components/PredictiveTab';
import { useIOLFeed } from '../hooks/useIOLFeed';
import { useTelemetry } from '../hooks/useTelemetry';
import { useModuleStatus } from '../hooks/useModuleStatus';
import '../styles.css';

export function IntelligenceDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'modules' | 'quality' | 'controls' | 'predictive'>('overview');
  
  // Hooks
  const { eventCount, getEventStats } = useIOLFeed({ maxEvents: 100 });
  const { performanceMetrics, errorMetrics, getTotalErrors, getCriticalErrors, refresh: refreshTelemetry } = useTelemetry();
  const { modules, connections, getModuleStats, refresh: refreshModules } = useModuleStatus();

  // Module statistics
  const moduleStats = getModuleStats();

  // Mock data for quality and memory (replace with real data)
  const qualityScores = [
    { timestamp: Date.now() - 5000, score: 85, category: 'composition' as const },
    { timestamp: Date.now() - 4000, score: 78, category: 'color' as const },
    { timestamp: Date.now() - 3000, score: 92, category: 'clarity' as const },
    { timestamp: Date.now() - 2000, score: 88, category: 'creativity' as const }
  ];

  const qualityIssues = [
    { type: 'Low Contrast', severity: 'medium' as const, count: 3, description: 'Some images have low color contrast' },
    { type: 'Composition', severity: 'low' as const, count: 1, description: 'Subject placement could be improved' }
  ];

  const memoryData = {
    id: 'root',
    label: 'User Context',
    value: 5242880,
    children: [
      { id: 'preferences', label: 'Preferences', value: 1048576, color: '#8b5cf6' },
      { id: 'history', label: 'History', value: 2097152, color: '#06b6d4' },
      { id: 'models', label: 'Models', value: 1572864, color: '#10b981' },
      { id: 'cache', label: 'Cache', value: 524288, color: '#f59e0b' }
    ]
  };

  // Performance data (last 20 points)
  const performanceData = performanceMetrics.slice(-20).map(metric => ({
    timestamp: metric.timestamp,
    generationTime: metric.name === 'Generation Time' ? metric.value : undefined,
    syncLatency: metric.name === 'Sync Latency' ? metric.value : undefined,
    assessmentTime: metric.name === 'Quality Assessment' ? metric.value : undefined,
    memoryOps: metric.name === 'Memory Operations' ? metric.value : undefined
  }));

  // Refresh all data
  const refreshAll = () => {
    refreshTelemetry();
    refreshModules();
  };

  return (
    <div className="intelligence-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Intelligence Orchestration Layer</h1>
          <p className="subtitle">Real-time system monitoring and analytics</p>
        </div>
        <div className="header-right">
          <button className="btn-primary" onClick={refreshAll}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat-card">
          <span className="stat-icon">📊</span>
          <div className="stat-content">
            <span className="stat-label">Total Events</span>
            <span className="stat-value">{eventCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">🧠</span>
          <div className="stat-content">
            <span className="stat-label">Active Modules</span>
            <span className="stat-value">{moduleStats.active}/{moduleStats.total}</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">⚠️</span>
          <div className="stat-content">
            <span className="stat-label">Errors</span>
            <span className="stat-value error">{getTotalErrors()}</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">🔥</span>
          <div className="stat-content">
            <span className="stat-label">Critical</span>
            <span className="stat-value critical">{getCriticalErrors()}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Events
        </button>
        <button
          className={`tab ${activeTab === 'modules' ? 'active' : ''}`}
          onClick={() => setActiveTab('modules')}
        >
          Modules
        </button>
        <button
          className={`tab ${activeTab === 'quality' ? 'active' : ''}`}
          onClick={() => setActiveTab('quality')}
        >
          Quality
        </button>
        <button
          className={`tab ${activeTab === 'controls' ? 'active' : ''}`}
          onClick={() => setActiveTab('controls')}
        >
          ⚙️ Controls
        </button>
        <button
          className={`tab ${activeTab === 'predictive' ? 'active' : ''}`}
          onClick={() => setActiveTab('predictive')}
        >
          🔮 Predictive AI
        </button>
      </div>

      {/* Tab Content */}
      <div className="dashboard-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid-layout">
            <div className="grid-item span-2">
              <PerformanceChart data={performanceData} height={300} />
            </div>
            
            <div className="grid-item">
              <h3>Module Health</h3>
              <div className="module-grid">
                {modules.slice(0, 6).map(module => (
                  <ModuleHealthCard key={module.id} module={module} />
                ))}
              </div>
            </div>

            <div className="grid-item">
              <EventStream maxEvents={10} autoScroll={true} />
            </div>

            <div className="grid-item span-2">
              <IOLGraph modules={modules} connections={connections} height={400} />
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="single-column">
            <EventStream maxEvents={100} autoScroll={true} />
            
            <div className="event-stats">
              <h3>Event Statistics</h3>
              <div className="stats-grid">
                {Object.entries(getEventStats()).map(([type, count]) => (
                  <div key={type} className="stat-row">
                    <span className="stat-name">{type}</span>
                    <span className="stat-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modules Tab */}
        {activeTab === 'modules' && (
          <div className="grid-layout">
            <div className="grid-item span-2">
              <IOLGraph modules={modules} connections={connections} height={500} />
            </div>

            <div className="grid-item span-2">
              <h3>All Modules ({modules.length})</h3>
              <div className="module-grid">
                {modules.map(module => (
                  <ModuleHealthCard key={module.id} module={module} />
                ))}
              </div>
            </div>

            <div className="grid-item span-2">
              <div className="module-stats">
                <h3>Module Statistics</h3>
                <div className="stats-breakdown">
                  <div className="stat-item">
                    <span className="stat-label">Total Modules:</span>
                    <span className="stat-value">{moduleStats.total}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Active:</span>
                    <span className="stat-value success">{moduleStats.active}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Healthy:</span>
                    <span className="stat-value success">{moduleStats.healthy}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Degraded:</span>
                    <span className="stat-value warning">{moduleStats.degraded}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Unhealthy:</span>
                    <span className="stat-value error">{moduleStats.unhealthy}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quality Tab */}
        {activeTab === 'quality' && (
          <div className="grid-layout">
            <div className="grid-item span-2">
              <QualityInsights scores={qualityScores} issues={qualityIssues} />
            </div>

            <div className="grid-item span-2">
              <MemoryMap data={memoryData} height={400} />
            </div>

            <div className="grid-item span-2">
              <PerformanceChart data={performanceData} height={300} />
            </div>
          </div>
        )}

        {/* Controls Tab - AI Command Center */}
        {activeTab === 'controls' && (
          <div className="controls-layout">
            {/* Header */}
            <div className="controls-header">
              <h2>AI Command Center</h2>
              <p>Interactive control and testing interface for all IOL subsystems</p>
            </div>

            {/* Control Grid */}
            <div className="controls-grid">
              {/* Control Panel - Full Width */}
              <div className="control-section span-full">
                <ControlPanel />
              </div>

              {/* Event Simulator */}
              <div className="control-section">
                <EventSimulator />
              </div>

              {/* Memory Manager */}
              <div className="control-section">
                <MemoryManager />
              </div>

              {/* Logic Sim Runner - Full Width */}
              <div className="control-section span-full">
                <LogicSimRunner />
              </div>

              {/* Vision Tester - Full Width */}
              <div className="control-section span-full">
                <VisionTester />
              </div>
            </div>

            {/* Command Center Info */}
            <div className="control-info">
              <h4>💡 Command Center Capabilities</h4>
              <ul>
                <li><strong>Control Panel:</strong> Pause/resume individual modules or all at once</li>
                <li><strong>Event Simulator:</strong> Inject custom IOL events for testing</li>
                <li><strong>Memory Manager:</strong> View and manage user context memory (LCM)</li>
                <li><strong>Logic Simulator:</strong> Run predefined or custom test scenarios</li>
                <li><strong>Vision Tester:</strong> Test image quality assessment with VisionPulse</li>
              </ul>
            </div>
          </div>
        )}

        {/* Predictive AI Tab */}
        {activeTab === 'predictive' && (
          <PredictiveTab />
        )}
      </div>

      {/* Error Summary */}
      {errorMetrics.length > 0 && getTotalErrors() > 0 && (
        <div className="error-summary">
          <h3>Recent Errors</h3>
          <div className="error-grid">
            {errorMetrics
              .filter(e => e.count > 0)
              .map((error, index) => (
                <div key={index} className="error-card">
                  <div className="error-header">
                    <span className={`severity-badge ${error.severity}`}>
                      {error.severity}
                    </span>
                    <span className="error-count">×{error.count}</span>
                  </div>
                  <div className="error-list">
                    {error.recent.slice(0, 2).map((err, idx) => (
                      <div key={idx} className="error-item">
                        <small>{err.message}</small>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
