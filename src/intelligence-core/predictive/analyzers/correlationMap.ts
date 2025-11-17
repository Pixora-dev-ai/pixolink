/**
 * Correlation Map - Pattern correlation between modules
 * Identifies cascading failures and dependency issues
 */

import type { TrendData, AnomalyPrediction, CorrelationPattern } from '../types';

export class CorrelationMap {
  /**
   * Map correlations between module behaviors
   */
  static mapCorrelations(
    trends: TrendData[],
    predictions: AnomalyPrediction[]
  ): CorrelationPattern[] {
    const patterns: CorrelationPattern[] = [];

    // Find modules with similar degradation patterns
    const riskyModules = predictions.filter(p => 
      p.risk === 'High' || p.risk === 'Critical'
    );

    if (riskyModules.length > 1) {
      // Check for cascading failures
      const cascading = this.detectCascadingFailures(riskyModules, trends);
      if (cascading) {
        patterns.push(cascading);
      }
    }

    // Check for positive correlations (modules degrading together)
    const positiveCorrelations = this.findPositiveCorrelations(trends);
    patterns.push(...positiveCorrelations);

    return patterns;
  }

  /**
   * Detect cascading failure patterns
   */
  private static detectCascadingFailures(
    predictions: AnomalyPrediction[],
    _trends: TrendData[]
  ): CorrelationPattern | null {
    // Sort by average latency (proxy for impact order)
    const sortedModules = predictions
      .map(p => ({
        module: p.module,
        impact: p.avg * (p.risk === 'Critical' ? 2 : 1)
      }))
      .sort((a, b) => b.impact - a.impact);

    if (sortedModules.length < 2) return null;

    return {
      modules: sortedModules.map(m => m.module),
      correlationType: 'cascading',
      strength: 0.8,
      description: `Cascading failure detected: ${sortedModules[0].module} may be impacting downstream modules`
    };
  }

  /**
   * Find modules with positive correlation (degrading together)
   */
  private static findPositiveCorrelations(trends: TrendData[]): CorrelationPattern[] {
    const patterns: CorrelationPattern[] = [];

    for (let i = 0; i < trends.length; i++) {
      for (let j = i + 1; j < trends.length; j++) {
        const correlation = this.calculateCorrelation(
          trends[i].trend,
          trends[j].trend
        );

        if (correlation > 0.7) {
          patterns.push({
            modules: [trends[i].module, trends[j].module],
            correlationType: 'positive',
            strength: correlation,
            description: `Strong positive correlation detected between ${trends[i].module} and ${trends[j].module}`
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private static calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const xSlice = x.slice(-n);
    const ySlice = y.slice(-n);

    const sumX = xSlice.reduce((a, b) => a + b, 0);
    const sumY = ySlice.reduce((a, b) => a + b, 0);
    const sumXY = xSlice.reduce((sum, xi, i) => sum + xi * ySlice[i], 0);
    const sumX2 = xSlice.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = ySlice.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }
}
