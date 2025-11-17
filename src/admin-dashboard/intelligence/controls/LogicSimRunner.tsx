/**
 * LogicSimRunner - Logic Simulation Testing Interface
 * Allows admins to run logic simulation scenarios and view reports
 */

import React, { useState } from 'react';

interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  category: 'credits' | 'generation' | 'sync' | 'validation' | 'custom';
}

const PREDEFINED_SCENARIOS: SimulationScenario[] = [
  {
    id: 'credit-refill',
    name: 'Credit Refill Flow',
    description: 'Simulates the complete credit refill process including payment and credit allocation',
    category: 'credits'
  },
  {
    id: 'generation-pipeline',
    name: 'Image Generation Pipeline',
    description: 'Tests the full image generation pipeline from prompt to storage',
    category: 'generation'
  },
  {
    id: 'sync-conflict',
    name: 'Sync Conflict Resolution',
    description: 'Simulates sync conflicts between local and remote state',
    category: 'sync'
  },
  {
    id: 'validation-failure',
    name: 'Validation Failure Handling',
    description: 'Tests error handling when prompt validation fails',
    category: 'validation'
  },
  {
    id: 'concurrent-requests',
    name: 'Concurrent Request Handling',
    description: 'Simulates multiple concurrent generation requests',
    category: 'generation'
  }
];

interface SimulationReport {
  scenario: string;
  status: 'success' | 'failure' | 'warning';
  duration: number;
  steps: Array<{
    name: string;
    status: 'success' | 'failure' | 'skipped';
    duration: number;
    details?: string;
  }>;
  metrics: {
    eventsProcessed: number;
    errorsDetected: number;
    warningsIssued: number;
  };
  summary: string;
}

export const LogicSimRunner: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<string>('credit-refill');
  const [customScenario, setCustomScenario] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<SimulationReport | null>(null);
  const [history, setHistory] = useState<Array<{ timestamp: Date; scenario: string; status: string }>>([]);

  const runSimulation = async () => {
    const scenarioToRun = selectedScenario === 'custom' ? customScenario : selectedScenario;
    
    if (!scenarioToRun.trim()) {
      alert('Please enter a scenario name or select a predefined one');
      return;
    }

    setIsRunning(true);
    setReport(null);

    try {
      // TODO: Replace with actual LogicSim API call
      // const result = await LogicSim.runScenario(scenarioToRun);
      // const reportData = await LogicSim.getReport();

      // Mock simulation with realistic timing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate mock report
      const mockReport: SimulationReport = {
        scenario: scenarioToRun,
        status: Math.random() > 0.2 ? 'success' : 'warning',
        duration: Math.floor(Math.random() * 3000) + 500,
        steps: [
          {
            name: 'Initialization',
            status: 'success',
            duration: 120,
            details: 'Module initialized successfully'
          },
          {
            name: 'Validation',
            status: 'success',
            duration: 250,
            details: 'All inputs validated'
          },
          {
            name: 'Execution',
            status: Math.random() > 0.3 ? 'success' : 'failure',
            duration: 850,
            details: 'Core logic executed'
          },
          {
            name: 'Verification',
            status: 'success',
            duration: 180,
            details: 'Results verified'
          }
        ],
        metrics: {
          eventsProcessed: Math.floor(Math.random() * 50) + 10,
          errorsDetected: Math.floor(Math.random() * 3),
          warningsIssued: Math.floor(Math.random() * 5)
        },
        summary: `Simulation completed ${Math.random() > 0.2 ? 'successfully' : 'with warnings'}. All critical paths validated.`
      };

      setReport(mockReport);
      setHistory(prev => [
        { timestamp: new Date(), scenario: scenarioToRun, status: mockReport.status },
        ...prev.slice(0, 9)
      ]);
    } catch (error) {
      console.error('Simulation failed:', error);
      alert('Simulation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✓';
      case 'failure': return '✗';
      case 'warning': return '⚠';
      case 'skipped': return '○';
      default: return '?';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'status-success';
      case 'failure': return 'status-failure';
      case 'warning': return 'status-warning';
      case 'skipped': return 'status-skipped';
      default: return '';
    }
  };

  const selectedScenarioData = PREDEFINED_SCENARIOS.find(s => s.id === selectedScenario);

  return (
    <div className="logicsim-runner">
      <div className="logicsim-header">
        <h3 className="logicsim-title">🧩 Logic Simulation Runner</h3>
        <span className="logicsim-subtitle">Test logic scenarios and view detailed reports</span>
      </div>

      <div className="logicsim-body">
        <div className="scenario-selector">
          <div className="form-group">
            <label htmlFor="scenario-select">Scenario</label>
            <select
              id="scenario-select"
              className="form-select"
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
            >
              {PREDEFINED_SCENARIOS.map(scenario => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.name}
                </option>
              ))}
              <option value="custom">Custom Scenario</option>
            </select>
          </div>

          {selectedScenario === 'custom' ? (
            <div className="form-group">
              <label htmlFor="custom-scenario">Custom Scenario Name</label>
              <input
                id="custom-scenario"
                type="text"
                className="form-input"
                placeholder="e.g., my-test-scenario"
                value={customScenario}
                onChange={(e) => setCustomScenario(e.target.value)}
              />
            </div>
          ) : selectedScenarioData && (
            <div className="scenario-description">
              <p><strong>Category:</strong> {selectedScenarioData.category}</p>
              <p>{selectedScenarioData.description}</p>
            </div>
          )}

          <button
            className="btn-run-simulation"
            onClick={runSimulation}
            disabled={isRunning}
          >
            {isRunning ? '⏳ Running...' : '▶ Run Simulation'}
          </button>
        </div>

        {report && (
          <div className="simulation-report">
            <div className="report-header">
              <h4>Simulation Report</h4>
              <span className={`report-status ${getStatusColor(report.status)}`}>
                {getStatusIcon(report.status)} {report.status.toUpperCase()}
              </span>
            </div>

            <div className="report-metrics">
              <div className="metric-card">
                <span className="metric-label">Duration</span>
                <span className="metric-value">{report.duration}ms</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Events</span>
                <span className="metric-value">{report.metrics.eventsProcessed}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Errors</span>
                <span className="metric-value text-red-400">{report.metrics.errorsDetected}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Warnings</span>
                <span className="metric-value text-yellow-400">{report.metrics.warningsIssued}</span>
              </div>
            </div>

            <div className="report-steps">
              <h5>Execution Steps</h5>
              <ul className="steps-list">
                {report.steps.map((step, i) => (
                  <li key={i} className={`step-item ${getStatusColor(step.status)}`}>
                    <div className="step-header">
                      <span className="step-icon">{getStatusIcon(step.status)}</span>
                      <span className="step-name">{step.name}</span>
                      <span className="step-duration">{step.duration}ms</span>
                    </div>
                    {step.details && (
                      <div className="step-details">{step.details}</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="report-summary">
              <h5>Summary</h5>
              <p>{report.summary}</p>
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="simulation-history">
            <h4>Recent Simulations</h4>
            <ul className="history-list">
              {history.map((entry, i) => (
                <li key={i} className="history-item">
                  <span className={`history-status ${getStatusColor(entry.status)}`}>
                    {getStatusIcon(entry.status)}
                  </span>
                  <span className="history-scenario">{entry.scenario}</span>
                  <span className="history-time">{entry.timestamp.toLocaleTimeString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
