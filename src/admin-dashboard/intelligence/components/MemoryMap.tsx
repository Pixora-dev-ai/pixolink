/**
 * MemoryMap Component - User Context Hierarchy Visualization
 * Enhanced with @nivo/treemap for interactive visualization
 */

import { ResponsiveTreeMap } from '@nivo/treemap';
import { useState } from 'react';

interface MemoryNode {
  id: string;
  label: string;
  value: number;
  color?: string;
  children?: MemoryNode[];
}

interface MemoryMapProps {
  data: MemoryNode;
  height?: number;
}

export function MemoryMap({ data, height = 400 }: MemoryMapProps) {
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<MemoryNode | null>(null);

  // Calculate total value recursively
  const calculateTotal = (node: MemoryNode): number => {
    if (!node.children || node.children.length === 0) return node.value;
    return node.children.reduce((sum, child) => sum + calculateTotal(child), 0);
  };

  const totalValue = calculateTotal(data);

  // Format size
  const formatSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${bytes}B`;
  };

  // Transform data for @nivo/treemap
  interface TreeMapNode {
    name: string;
    id: string;
    value: number;
    color: string;
    children?: TreeMapNode[];
  }

  const transformData = (node: MemoryNode): TreeMapNode => {
    const transformed: TreeMapNode = {
      name: node.label,
      id: node.id,
      value: node.value,
      color: node.color || '#8b5cf6'
    };

    if (node.children && node.children.length > 0) {
      transformed.children = node.children.map(transformData);
    }

    return transformed;
  };

  const treeMapData = transformData(data);

  return (
    <div className="memory-map-container">
      {/* Header */}
      <div className="map-header">
        <h3>Memory Context Map</h3>
        <div className="map-stats">
          <span>Total: {formatSize(totalValue)}</span>
          <span>Selected: {selectedNode ? formatSize(selectedNode.value) : 'None'}</span>
        </div>
      </div>

      {/* Interactive Treemap */}
      <div className="memory-treemap" style={{ height }}>
        {totalValue === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🗂️</span>
            <p>No memory data available</p>
            <small>User context will appear here</small>
          </div>
        ) : (
          <ResponsiveTreeMap
            data={treeMapData}
            identity="id"
            value="value"
            label={(node) => `${node.id}`}
            labelSkipSize={20}
            labelTextColor={{ from: 'color', modifiers: [['darker', 2.5]] }}
            parentLabelTextColor={{ from: 'color', modifiers: [['darker', 3]] }}
            colors={{ scheme: 'purple_blue' }}
            borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
            borderWidth={2}
            animate={true}
            motionConfig="gentle"
            onClick={(node) => {
              setSelectedNode({
                id: node.id as string,
                label: node.id as string,
                value: node.value as number
              });
            }}
            onMouseEnter={(node) => {
              setHoveredNode({
                id: node.id as string,
                label: node.id as string,
                value: node.value as number
              });
            }}
            onMouseLeave={() => setHoveredNode(null)}
            tooltip={({ node }) => (
              <div className="memory-tooltip">
                <strong>{node.id}</strong>
                <div className="tooltip-value">{formatSize(node.value as number)}</div>
                <div className="tooltip-percentage">
                  {((node.value as number / totalValue) * 100).toFixed(1)}% of total
                </div>
              </div>
            )}
          />
        )}
      </div>

      {/* Hovered/Selected Node Details */}
      {(hoveredNode || selectedNode) && (
        <div className="node-details">
          <h4>
            {selectedNode ? '📌 Selected' : '👆 Hover'}:{' '}
            {(hoveredNode || selectedNode)?.label}
          </h4>
          <div className="detail-stats">
            <span>Size: {formatSize((hoveredNode || selectedNode)!.value)}</span>
            <span>
              Share: {(((hoveredNode || selectedNode)!.value / totalValue) * 100).toFixed(2)}%
            </span>
          </div>
          {selectedNode && (
            <button
              className="btn-clear-selection"
              onClick={() => setSelectedNode(null)}
            >
              Clear Selection
            </button>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="memory-legend">
        <h4>Memory Breakdown</h4>
        <div className="legend-items">
          {data.children?.map((node, index) => (
            <div key={node.id} className="legend-item">
              <span
                className="legend-color"
                style={{ 
                  backgroundColor: node.color || `hsl(${(index * 60) % 360}, 70%, 60%)` 
                }}
              />
              <span className="legend-label">{node.label}</span>
              <span className="legend-value">{formatSize(node.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
