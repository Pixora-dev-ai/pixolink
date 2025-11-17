/**
 * Trend Analyzer - Time-series trend detection
 * Analyzes performance metrics over time to detect degradation patterns
 */

import type { HealthLog, TrendData } from '../types';

export class TrendAnalyzer {
  /**
   * Get trends from recent health logs
   * @param period Number of logs to analyze (default: 100)
   */
  static getTrends(logs: HealthLog[], period: number = 100): TrendData[] {
    const recentLogs = logs.slice(-period);
    
    // Group by module
    const moduleGroups = new Map<string, HealthLog[]>();
    recentLogs.forEach(log => {
      if (!moduleGroups.has(log.module)) {
        moduleGroups.set(log.module, []);
      }
      moduleGroups.get(log.module)!.push(log);
    });

    const trends: TrendData[] = [];

    moduleGroups.forEach((moduleLogs, module) => {
      // Calculate averages
      const latencies = moduleLogs.map(l => l.latency || 0).filter(l => l > 0);
      const errorRates = moduleLogs.map(l => l.errorRate || 0).filter(e => e >= 0);
      const memoryUsages = moduleLogs.map(l => l.memoryUsage || 0).filter(m => m > 0);

      if (latencies.length === 0) return;

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const avgErrorRate = errorRates.length > 0 
        ? errorRates.reduce((a, b) => a + b, 0) / errorRates.length 
        : 0;
      const avgMemoryUsage = memoryUsages.length > 0 
        ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length 
        : 0;

      // Extract recent trend (last 5-10 values)
      const trendWindow = Math.min(10, latencies.length);
      const trend = latencies.slice(-trendWindow);

      trends.push({
        module,
        avgLatency,
        avgErrorRate,
        avgMemoryUsage,
        trend,
        timestamp: Date.now()
      });
    });

    return trends;
  }

  /**
   * Calculate standard deviation for a series of values
   */
  static calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Detect if a trend is increasing (degradation)
   */
  static isIncreasing(trend: number[]): boolean {
    if (trend.length < 2) return false;
    const slope = this.calculateSlope(trend);
    return slope > 0;
  }

  /**
   * Calculate slope of a trend line
   */
  static calculateSlope(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2; // 0 + 1 + 2 + ... + (n-1)
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }
}
