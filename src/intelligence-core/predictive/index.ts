/**
 * Predictive Maintenance AI Layer (PMAL) - Main Export
 * Aggregates all predictive intelligence components
 */

// Types
export * from './types';

// Analyzers
export { TrendAnalyzer } from './analyzers/trendAnalyzer';
export { AnomalyPredictor } from './analyzers/anomalyPredictor';
export { CorrelationMap } from './analyzers/correlationMap';

// Forecasters
export { RiskModel } from './forecasters/riskModel';
export { PatternEngine } from './forecasters/patternEngine';
export type { RecurringPattern } from './forecasters/patternEngine';
export { AIAdvisor } from './forecasters/aiAdvisor';

// Reporters
export { PredictiveSummaryGenerator } from './reporters/predictiveSummary';
export { ForecastVisualizer } from './reporters/forecastVisualizer';
export type { ChartData, TableRow } from './reporters/forecastVisualizer';

// Convenience wrapper for quick access
import type { HealthLog, PredictiveSummary } from './types';
import { PredictiveSummaryGenerator } from './reporters/predictiveSummary';
import { ForecastVisualizer } from './reporters/forecastVisualizer';

export class PMAL {
  /**
   * Quick forecast generation
   */
  static async analyze(logs: HealthLog[], config?: {
    window?: number;
    useAI?: boolean;
  }): Promise<PredictiveSummary> {
    return PredictiveSummaryGenerator.getForecast(logs, {
      analysisWindow: config?.window,
      includeAIAdvisory: config?.useAI
    });
  }

  /**
   * Quick visualization data
   */
  static visualize(summary: PredictiveSummary) {
    return {
      table: ForecastVisualizer.formatForTable(summary),
      chart: ForecastVisualizer.formatForChart(summary),
      advisories: ForecastVisualizer.formatAdvisories(summary.advisories)
    };
  }
}
