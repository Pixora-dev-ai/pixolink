/**
 * useTelemetry Hook - Performance & Error Metrics
 * Tracks system performance and error rates
 */

import { useState, useEffect, useCallback } from 'react';
import { Metrics } from '../../intelligence-core/telemetry/metricsTracker';
import { ErrorTracker } from '../../intelligence-core/telemetry/errorReporter';
import { UsageEvents } from '../../intelligence-core/telemetry/usageEvents';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

export interface ErrorMetric {
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  recent: Array<{
    message: string;
    timestamp: number;
  }>;
}

export interface UsageMetric {
  eventType: string;
  count: number;
  avgDuration: number;
  lastOccurrence: number;
}

export function useTelemetry() {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [errorMetrics, setErrorMetrics] = useState<ErrorMetric[]>([]);
  const [usageMetrics, setUsageMetrics] = useState<UsageMetric[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Update all metrics
  const updateMetrics = useCallback(() => {
    // Get error statistics
    try {
      const errorStats = ErrorTracker.getStats();
      const errorHistory = ErrorTracker.getHistory({ limit: 10 });

      const errors: ErrorMetric[] = [
        {
          severity: 'low',
          count: errorStats.bySeverity.low || 0,
          recent: errorHistory
            .filter(e => e.severity === 'low')
            .slice(0, 3)
            .map(e => ({
              message: e.error.message,
              timestamp: e.timestamp
            }))
        },
        {
          severity: 'medium',
          count: errorStats.bySeverity.medium || 0,
          recent: errorHistory
            .filter(e => e.severity === 'medium')
            .slice(0, 3)
            .map(e => ({
              message: e.error.message,
              timestamp: e.timestamp
            }))
        },
        {
          severity: 'high',
          count: errorStats.bySeverity.high || 0,
          recent: errorHistory
            .filter(e => e.severity === 'high')
            .slice(0, 3)
            .map(e => ({
              message: e.error.message,
              timestamp: e.timestamp
            }))
        },
        {
          severity: 'critical',
          count: errorStats.bySeverity.critical || 0,
          recent: errorHistory
            .filter(e => e.severity === 'critical')
            .slice(0, 3)
            .map(e => ({
              message: e.error.message,
              timestamp: e.timestamp
            }))
        }
      ];

      setErrorMetrics(errors);
    } catch (error) {
      console.error('Failed to get error metrics:', error);
    }

    // Get usage statistics
    try {
      const allMetrics = UsageEvents.getAllMetrics();
      const usage: UsageMetric[] = Object.entries(allMetrics).map(([eventType, data]) => ({
        eventType,
        count: data.count,
        avgDuration: data.avgDuration,
        lastOccurrence: data.lastOccurrence
      }));

      setUsageMetrics(usage);
    } catch (error) {
      console.error('Failed to get usage metrics:', error);
    }

    // Mock performance metrics (will be replaced with actual metrics)
    const mockPerformance: PerformanceMetric[] = [
      {
        name: 'Generation Time',
        value: Math.random() * 500 + 500,
        unit: 'ms',
        timestamp: Date.now()
      },
      {
        name: 'Sync Latency',
        value: Math.random() * 200 + 100,
        unit: 'ms',
        timestamp: Date.now()
      },
      {
        name: 'Quality Assessment',
        value: Math.random() * 150 + 50,
        unit: 'ms',
        timestamp: Date.now()
      },
      {
        name: 'Memory Operations',
        value: Math.random() * 100 + 50,
        unit: 'ms',
        timestamp: Date.now()
      }
    ];

    setPerformanceMetrics(mockPerformance);
  }, []);

  // Initialize telemetry
  useEffect(() => {
    const metricsInitialized = Metrics.isInitialized();
    const errorsInitialized = ErrorTracker.isInitialized();

    setIsInitialized(metricsInitialized && errorsInitialized);

    // Poll for updates every 2 seconds
    const interval = setInterval(() => {
      updateMetrics();
    }, 2000);

    // Initial update
    updateMetrics();

    return () => clearInterval(interval);
  }, [updateMetrics]);

  // Get total errors
  const getTotalErrors = useCallback(() => {
    return errorMetrics.reduce((sum, metric) => sum + metric.count, 0);
  }, [errorMetrics]);

  // Get critical errors
  const getCriticalErrors = useCallback(() => {
    const critical = errorMetrics.find(m => m.severity === 'critical');
    return critical ? critical.count : 0;
  }, [errorMetrics]);

  // Get usage summary
  const getUsageSummary = useCallback(() => {
    return UsageEvents.getSummary();
  }, []);

  // Export telemetry data
  const exportTelemetry = useCallback(() => {
    return {
      performance: performanceMetrics,
      errors: errorMetrics,
      usage: usageMetrics,
      summary: UsageEvents.getSummary(),
      timestamp: Date.now()
    };
  }, [performanceMetrics, errorMetrics, usageMetrics]);

  return {
    performanceMetrics,
    errorMetrics,
    usageMetrics,
    isInitialized,
    getTotalErrors,
    getCriticalErrors,
    getUsageSummary,
    exportTelemetry,
    refresh: updateMetrics
  };
}
