/**
 * PerformanceChart Component - Performance Metrics Visualization
 * Real-time line chart for system performance metrics
 */

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface PerformanceDataPoint {
  timestamp: number;
  generationTime?: number;
  syncLatency?: number;
  assessmentTime?: number;
  memoryOps?: number;
}

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
  height?: number;
  showLegend?: boolean;
}

export function PerformanceChart({
  data,
  height = 300,
  showLegend = true
}: PerformanceChartProps) {
  // Format chart data
  const chartData = useMemo(() => {
    return data.map(point => ({
      ...point,
      time: new Date(point.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    }));
  }, [data]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (data.length === 0) return null;

    const calculateStats = (values: number[]) => {
      const filtered = values.filter(v => v !== undefined);
      if (filtered.length === 0) return { avg: 0, min: 0, max: 0 };
      
      const avg = filtered.reduce((sum, v) => sum + v, 0) / filtered.length;
      const min = Math.min(...filtered);
      const max = Math.max(...filtered);
      
      return { avg, min, max };
    };

    return {
      generation: calculateStats(data.map(d => d.generationTime || 0)),
      sync: calculateStats(data.map(d => d.syncLatency || 0)),
      assessment: calculateStats(data.map(d => d.assessmentTime || 0)),
      memory: calculateStats(data.map(d => d.memoryOps || 0))
    };
  }, [data]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number; payload: { time: string } }> }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="chart-tooltip">
        <p className="tooltip-time">{payload[0].payload.time}</p>
        {payload.map((entry: { color: string; name: string; value: number }, index: number) => (
          <div key={index} className="tooltip-item">
            <span
              className="tooltip-color"
              style={{ backgroundColor: entry.color }}
            />
            <span className="tooltip-label">{entry.name}:</span>
            <span className="tooltip-value">{entry.value.toFixed(2)}ms</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="performance-chart-container">
      {/* Header with Stats */}
      <div className="chart-header">
        <h3>Performance Metrics</h3>
        {stats && (
          <div className="chart-stats">
            <div className="stat-item">
              <span className="stat-label">Avg Generation:</span>
              <span className="stat-value">{stats.generation.avg.toFixed(0)}ms</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Avg Sync:</span>
              <span className="stat-value">{stats.sync.avg.toFixed(0)}ms</span>
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      {data.length === 0 ? (
        <div className="chart-empty">
          <span className="empty-icon">📊</span>
          <p>No performance data available</p>
          <small>Metrics will appear as operations are performed</small>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="time"
              stroke="#888"
              tick={{ fill: '#888' }}
              tickLine={{ stroke: '#888' }}
            />
            <YAxis
              stroke="#888"
              tick={{ fill: '#888' }}
              tickLine={{ stroke: '#888' }}
              label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft', fill: '#888' }}
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && (
              <Legend
                wrapperStyle={{ color: '#888' }}
                iconType="line"
              />
            )}
            <Line
              type="monotone"
              dataKey="generationTime"
              name="Generation Time"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="syncLatency"
              name="Sync Latency"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="assessmentTime"
              name="Assessment Time"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="memoryOps"
              name="Memory Ops"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
