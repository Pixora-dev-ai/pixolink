/**
 * ControlPanel - Main Control Center for All AI Modules
 * Provides centralized control and monitoring of all IOL modules
 */

import React, { useState, useEffect } from 'react';
import { ModuleController } from './ModuleController';
import { IOLBus } from '../../intelligence-core/orchestrator/eventBus';
import { Registry } from '../../intelligence-core/orchestrator/registry';

const MODULES = [
  { id: 'lcm', name: 'LCM', description: 'Long-term Context Memory' },
  { id: 'lcc', name: 'LCC', description: 'Learnable Creativity Core' },
  { id: 'pixsync', name: 'PixSync', description: 'State Synchronization' },
  { id: 'logicsim', name: 'LogicSim', description: 'Logic Simulation' },
  { id: 'visionpulse', name: 'VisionPulse', description: 'Vision Assessment' },
  { id: 'weavai', name: 'WeavAI', description: 'AI Orchestration' }
];

interface ModuleStatus {
  state: 'active' | 'paused' | 'error';
  metrics?: {
    uptime?: number;
    requestCount?: number;
    errorRate?: number;
  };
}

export const ControlPanel: React.FC = () => {
  const [moduleStates, setModuleStates] = useState<Record<string, ModuleStatus>>(
    Object.fromEntries(
      MODULES.map(m => [m.id, { state: 'active' as const, metrics: {} }])
    )
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load initial module states from Registry
    const loadModuleStates = () => {
      try {
        const healthChecks = Registry.healthCheck();
        const newStates: Record<string, ModuleStatus> = {};

        MODULES.forEach(module => {
          const isHealthy = healthChecks[module.id];
          const metadata = Registry.getMetadata(module.id);
          
          newStates[module.id] = {
            state: isHealthy ? 'active' : 'error',
            metrics: {
              uptime: metadata?.lastActive ? Date.now() - metadata.lastActive : undefined,
              requestCount: Math.floor(Math.random() * 1000), // TODO: Get from actual metrics
              errorRate: Math.random() * 0.1 // TODO: Get from ErrorTracker
            }
          };
        });

        setModuleStates(newStates);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load module states:', error);
        setIsLoading(false);
      }
    };

    loadModuleStates();

    // Subscribe to module state changes
    const unsubscribers = [
      IOLBus.subscribe('ERROR_OCCURRED', (payload) => {
        // Update error state for modules
        if (payload.data && typeof payload.data === 'object' && 'module' in payload.data) {
          const moduleId = (payload.data as { module: string }).module;
          setModuleStates(prev => ({
            ...prev,
            [moduleId]: {
              ...prev[moduleId],
              state: 'error'
            }
          }));
        }
      })
    ];

    // Refresh module states every 5 seconds
    const interval = setInterval(loadModuleStates, 5000);

    return () => {
      unsubscribers.forEach(unsub => unsub());
      clearInterval(interval);
    };
  }, []);

  const toggleModule = (moduleId: string) => {
    setModuleStates(prev => {
      const currentState = prev[moduleId]?.state || 'active';
      const newState = currentState === 'active' ? 'paused' : 'active';

      // Publish module toggle event
      IOLBus.publish('TELEMETRY_LOGGED', {
        type: 'TELEMETRY_LOGGED',
        data: {
          action: 'module_toggle',
          module: moduleId,
          oldState: currentState,
          newState: newState
        },
        timestamp: Date.now()
      });

      return {
        ...prev,
        [moduleId]: {
          ...prev[moduleId],
          state: newState
        }
      };
    });
  };

  if (isLoading) {
    return (
      <div className="control-panel loading">
        <div className="loading-spinner">Loading modules...</div>
      </div>
    );
  }

  const activeCount = Object.values(moduleStates).filter(s => s.state === 'active').length;
  const pausedCount = Object.values(moduleStates).filter(s => s.state === 'paused').length;
  const errorCount = Object.values(moduleStates).filter(s => s.state === 'error').length;

  return (
    <div className="control-panel">
      <div className="control-panel-header">
        <h3 className="control-panel-title">🕹️ Module Control Center</h3>
        <div className="control-panel-stats">
          <span className="stat-badge stat-active">{activeCount} Active</span>
          <span className="stat-badge stat-paused">{pausedCount} Paused</span>
          <span className="stat-badge stat-error">{errorCount} Error</span>
        </div>
      </div>

      <div className="module-grid">
        {MODULES.map(module => (
          <ModuleController
            key={module.id}
            name={module.name}
            state={moduleStates[module.id]?.state || 'active'}
            metrics={moduleStates[module.id]?.metrics}
            onToggle={() => toggleModule(module.id)}
          />
        ))}
      </div>

      <div className="control-panel-footer">
        <button
          className="btn-action btn-pause-all"
          onClick={() => MODULES.forEach(m => {
            if (moduleStates[m.id]?.state === 'active') toggleModule(m.id);
          })}
        >
          ⏸ Pause All
        </button>
        <button
          className="btn-action btn-resume-all"
          onClick={() => MODULES.forEach(m => {
            if (moduleStates[m.id]?.state === 'paused') toggleModule(m.id);
          })}
        >
          ▶ Resume All
        </button>
      </div>
    </div>
  );
};
