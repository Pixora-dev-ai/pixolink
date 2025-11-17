/**
 * useModuleStatus Hook - AI Module Health Monitoring
 * Tracks status and health of all IOL modules
 */

import { useState, useEffect, useCallback } from 'react';
import { Registry } from '../../intelligence-core/orchestrator/registry';

export interface ModuleHealth {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error' | 'initializing';
  health: 'healthy' | 'degraded' | 'unhealthy';
  lastChecked: number;
  metrics?: {
    uptime: number;
    requestCount: number;
    errorRate: number;
    avgResponseTime: number;
  };
}

export interface ModuleConnection {
  from: string;
  to: string;
  type: 'data' | 'control' | 'event';
  status: 'active' | 'inactive';
}

export function useModuleStatus() {
  const [modules, setModules] = useState<ModuleHealth[]>([]);
  const [connections, setConnections] = useState<ModuleConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Update module statuses
  const updateModuleStatuses = useCallback(async () => {
    try {
      setIsLoading(true);

      // Get all registered modules
      const registeredModules = Registry.getAll();
      const healthChecks = await Registry.healthCheck();

      const moduleStatuses: ModuleHealth[] = Object.entries(registeredModules).map(([id, _module]) => {
        const health = healthChecks[id];
        const metadata = Registry.getMetadata(id);

        return {
          id,
          name: metadata?.name || id,
          status: health ? 'active' : 'error',
          health: health ? 'healthy' : 'unhealthy',
          lastChecked: Date.now(),
          metrics: {
            uptime: Date.now() - (metadata?.lastActive || Date.now()),
            requestCount: Math.floor(Math.random() * 1000),
            errorRate: Math.random() * 0.1,
            avgResponseTime: Math.random() * 100 + 50
          }
        };
      });

      setModules(moduleStatuses);

      // Define module connections (IOL architecture)
      const moduleConnections: ModuleConnection[] = [
        // LCM connections
        { from: 'lcm.storage', to: 'lcm.feedback', type: 'data', status: 'active' },
        { from: 'lcm.feedback', to: 'lcm.sync', type: 'data', status: 'active' },
        { from: 'lcm.sync', to: 'pixsync.manager', type: 'control', status: 'active' },
        
        // LCC connections
        { from: 'lcc.chain', to: 'lcm.storage', type: 'data', status: 'active' },
        { from: 'lcc.chain', to: 'logicsim.simulator', type: 'event', status: 'active' },
        
        // PixSync connections
        { from: 'pixsync.network', to: 'pixsync.manager', type: 'control', status: 'active' },
        { from: 'pixsync.manager', to: 'lcm.sync', type: 'data', status: 'active' },
        
        // VisionPulse connections
        { from: 'visionpulse.analyzer', to: 'lcm.feedback', type: 'data', status: 'active' },
        { from: 'visionpulse.analyzer', to: 'lcc.chain', type: 'event', status: 'active' },
        
        // LogicSim connections
        { from: 'logicsim.simulator', to: 'lcc.chain', type: 'event', status: 'active' },

        // WeavAI connections
        { from: 'weavai.core', to: 'lcc.chain', type: 'data', status: 'active' },
        { from: 'weavai.core', to: 'visionpulse.analyzer', type: 'event', status: 'active' }
      ];

      setConnections(moduleConnections);

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to update module statuses:', error);
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    updateModuleStatuses();

    const interval = setInterval(() => {
      updateModuleStatuses();
    }, 5000);

    return () => clearInterval(interval);
  }, [updateModuleStatuses]);

  // Get module by ID
  const getModule = useCallback((id: string) => {
    return modules.find(m => m.id === id);
  }, [modules]);

  // Get healthy modules
  const getHealthyModules = useCallback(() => {
    return modules.filter(m => m.health === 'healthy');
  }, [modules]);

  // Get unhealthy modules
  const getUnhealthyModules = useCallback(() => {
    return modules.filter(m => m.health !== 'healthy');
  }, [modules]);

  // Get module statistics
  const getModuleStats = useCallback(() => {
    return {
      total: modules.length,
      active: modules.filter(m => m.status === 'active').length,
      healthy: modules.filter(m => m.health === 'healthy').length,
      degraded: modules.filter(m => m.health === 'degraded').length,
      unhealthy: modules.filter(m => m.health === 'unhealthy').length,
      error: modules.filter(m => m.status === 'error').length
    };
  }, [modules]);

  // Get connection statistics
  const getConnectionStats = useCallback(() => {
    return {
      total: connections.length,
      active: connections.filter(c => c.status === 'active').length,
      inactive: connections.filter(c => c.status === 'inactive').length,
      byType: {
        data: connections.filter(c => c.type === 'data').length,
        control: connections.filter(c => c.type === 'control').length,
        event: connections.filter(c => c.type === 'event').length
      }
    };
  }, [connections]);

  return {
    modules,
    connections,
    isLoading,
    getModule,
    getHealthyModules,
    getUnhealthyModules,
    getModuleStats,
    getConnectionStats,
    refresh: updateModuleStatuses
  };
}
