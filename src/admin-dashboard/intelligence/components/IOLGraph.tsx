/**
 * IOLGraph Component - Interactive Module Connection Network
 * Enhanced with @xyflow/react for interactive node-based visualization
 * Features real-time module state updates via IOLBus subscription
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  ConnectionLineType,
  useNodesState,
  useEdgesState,
  NodeTypes
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ModuleConnection } from '../hooks/useModuleStatus';
import { IOLBus } from '../../intelligence-core/orchestrator';

// Custom node component with status visualization
interface ModuleNodeData {
  label: string;
  status: string;
  type: 'adapter' | 'connector' | 'core';
}

function ModuleNode({ data }: { data: ModuleNodeData }) {
  const { label, status, type } = data;
  
  const getStatusStyles = () => {
    switch (status) {
      case 'active':
        return {
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          animation: 'pulse-green 2s infinite'
        };
      case 'paused':
        return {
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          opacity: 0.7
        };
      case 'error':
        return {
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          animation: 'pulse-red 1s infinite'
        };
      default:
        return {
          borderColor: '#6b7280',
          backgroundColor: 'rgba(107, 114, 128, 0.1)'
        };
    }
  };

  const getTypeColor = () => {
    const colorMap: Record<string, string> = {
      adapter: '#8b5cf6',
      connector: '#06b6d4',
      core: '#10b981'
    };
    return colorMap[type] || '#6b7280';
  };

  const statusIcon = status === 'active' ? '✓' : status === 'paused' ? '⏸' : '✗';

  return (
    <div
      className="custom-module-node"
      style={{
        ...getStatusStyles(),
        borderWidth: '2px',
        borderStyle: 'solid',
        borderRadius: '8px',
        padding: '12px 16px',
        minWidth: '140px',
        boxShadow: status === 'active' ? '0 0 10px rgba(16, 185, 129, 0.3)' : 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '16px' }}>{statusIcon}</span>
        <div>
          <div style={{ 
            fontWeight: 600, 
            fontSize: '14px',
            color: getTypeColor()
          }}>
            {label}
          </div>
          <div style={{ 
            fontSize: '11px', 
            color: '#9ca3af',
            marginTop: '2px'
          }}>
            {type}
          </div>
        </div>
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  moduleNode: ModuleNode
};

interface IOLGraphProps {
  modules: Array<{ id: string; name: string; status: string }>;
  connections: ModuleConnection[];
  height?: number;
}

export function IOLGraph({ modules, connections, height = 500 }: IOLGraphProps) {
  // Module state tracking for real-time updates
  const [moduleStates, setModuleStates] = useState<Record<string, string>>({});

  // Initialize module states
  useEffect(() => {
    const states: Record<string, string> = {};
    modules.forEach(m => {
      states[m.id] = m.status;
    });
    setModuleStates(states);
  }, [modules]);

  // Subscribe to IOLBus for real-time module state changes
  useEffect(() => {
    const unsubscribe = IOLBus.subscribe('TELEMETRY_LOGGED', (payload) => {
      if (payload.data?.action === 'module_toggle') {
        const { module, newState } = payload.data as { module: string; newState: string; oldState?: string };
        setModuleStates(prev => ({
          ...prev,
          [module]: newState
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  // Create nodes for ReactFlow
  const initialNodes: Node[] = useMemo(() => {
    const adapters = modules.filter(m => m.id.includes('adapter') || 
      ['lcm', 'lcc', 'pixsync', 'logicsim', 'visionpulse', 'weavai'].includes(m.id));
    const connectors = modules.filter(m => m.id.includes('connector'));
    const core = modules.filter(m => !m.id.includes('adapter') && !m.id.includes('connector') &&
      !['lcm', 'lcc', 'pixsync', 'logicsim', 'visionpulse', 'weavai'].includes(m.id));

    const nodes: Node[] = [];
    
    // Adapters (left column)
    adapters.forEach((module, index) => {
      nodes.push({
        id: module.id,
        type: 'moduleNode',
        position: { x: 50, y: 50 + index * 100 },
        data: {
          label: module.name,
          status: moduleStates[module.id] || module.status,
          type: 'adapter'
        }
      });
    });

    // Core (center column)
    core.forEach((module, index) => {
      nodes.push({
        id: module.id,
        type: 'moduleNode',
        position: { x: 350, y: 50 + index * 100 },
        data: {
          label: module.name,
          status: moduleStates[module.id] || module.status,
          type: 'core'
        }
      });
    });

    // Connectors (right column)
    connectors.forEach((module, index) => {
      nodes.push({
        id: module.id,
        type: 'moduleNode',
        position: { x: 650, y: 50 + index * 100 },
        data: {
          label: module.name,
          status: moduleStates[module.id] || module.status,
          type: 'connector'
        }
      });
    });

    return nodes;
  }, [modules, moduleStates]);

  // Create edges for ReactFlow
  const initialEdges: Edge[] = useMemo(() => {
    return connections.map((conn, index) => ({
      id: `edge-${index}`,
      source: conn.from,
      target: conn.to,
      type: ConnectionLineType.Bezier,
      animated: conn.status === 'active',
      style: {
        stroke: conn.type === 'data' ? '#10b981' :
               conn.type === 'control' ? '#f59e0b' :
               '#8b5cf6',
        strokeWidth: 2
      },
      label: conn.type,
      labelStyle: { fill: '#6b7280', fontSize: 10 }
    }));
  }, [connections]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, _setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when module states change
  useEffect(() => {
    setNodes(currentNodes =>
      currentNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          status: moduleStates[node.id] || node.data.status
        }
      }))
    );
  }, [moduleStates, setNodes]);

  // Get connection statistics
  const connectionStats = useMemo(() => {
    return {
      data: connections.filter(c => c.type === 'data').length,
      control: connections.filter(c => c.type === 'control').length,
      event: connections.filter(c => c.type === 'event').length
    };
  }, [connections]);

  const onInit = useCallback(() => {
    // Graph initialized
  }, []);

  return (
    <div className="iol-graph-container">
      {/* Header */}
      <div className="graph-header">
        <h3>IOL Architecture (Interactive)</h3>
        <div className="graph-stats">
          <span>Modules: {modules.length}</span>
          <span>Connections: {connections.length}</span>
          <span className="realtime-indicator">🔴 Live</span>
        </div>
      </div>

      {/* Interactive ReactFlow Graph */}
      <div className="graph-canvas" style={{ height }}>
        {modules.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🔗</span>
            <p>No modules available</p>
            <small>Module connections will appear here</small>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onInit={onInit}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-right"
          >
            <Background />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                const colorMap: Record<string, string> = {
                  adapter: '#8b5cf6',
                  connector: '#06b6d4',
                  core: '#10b981'
                };
                const nodeData = node.data as unknown as ModuleNodeData | undefined;
                return (nodeData?.type && colorMap[nodeData.type]) || '#6b7280';
              }}
            />
          </ReactFlow>
        )}
      </div>

      {/* Connection Statistics */}
      <div className="connection-stats">
        <h4>Connection Types</h4>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-color" style={{ backgroundColor: '#10b981' }} />
            <span className="stat-label">Data:</span>
            <span className="stat-value">{connectionStats.data}</span>
          </div>
          <div className="stat-item">
            <span className="stat-color" style={{ backgroundColor: '#f59e0b' }} />
            <span className="stat-label">Control:</span>
            <span className="stat-value">{connectionStats.control}</span>
          </div>
          <div className="stat-item">
            <span className="stat-color" style={{ backgroundColor: '#8b5cf6' }} />
            <span className="stat-label">Event:</span>
            <span className="stat-value">{connectionStats.event}</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="graph-legend">
        <h4>Status Legend</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="status-indicator status-active">✓</span>
            <span>Active (green glow)</span>
          </div>
          <div className="legend-item">
            <span className="status-indicator status-paused">⏸</span>
            <span>Paused (yellow dim)</span>
          </div>
          <div className="legend-item">
            <span className="status-indicator status-error">✗</span>
            <span>Error (red pulse)</span>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse-green {
          0%, 100% { box-shadow: 0 0 10px rgba(16, 185, 129, 0.3); }
          50% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.6); }
        }
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 10px rgba(239, 68, 68, 0.3); }
          50% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.6); }
        }
        .custom-module-node {
          background: white;
          transition: all 0.3s ease;
        }
        .realtime-indicator {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          animation: blink 2s infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
