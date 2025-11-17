/**
 * Predictive Summary - Forecast generation orchestrator
 * Coordinates all predictive analysis components
 */

import type { HealthLog, PredictiveSummary, PredictiveAdvisory } from '../types';
import { TrendAnalyzer } from '../analyzers/trendAnalyzer';
import { AnomalyPredictor } from '../analyzers/anomalyPredictor';
import { CorrelationMap } from '../analyzers/correlationMap';
import { RiskModel } from '../forecasters/riskModel';
import { PatternEngine } from '../forecasters/patternEngine';
import { AIAdvisor } from '../forecasters/aiAdvisor';
import { applyAutoTuning } from '../../adaptive-tuning';

export class PredictiveSummaryGenerator {
  /**
   * Generate complete predictive forecast
   */
  static async getForecast(
    logs: HealthLog[],
    config?: {
      analysisWindow?: number;
      includeAIAdvisory?: boolean;
    }
  ): Promise<PredictiveSummary> {
    const window = config?.analysisWindow || 100;
    const useAI = config?.includeAIAdvisory ?? true;

    // Step 1: Analyze trends
    const trends = TrendAnalyzer.getTrends(logs, window);

    // Step 2: Detect anomalies
    const predictions = AnomalyPredictor.detect(trends);

    // Step 3: Find correlations
    const correlations = CorrelationMap.mapCorrelations(trends, predictions);

    // Step 4: Evaluate risks
    const riskAssessments = RiskModel.evaluate(predictions);

    // Step 5: Detect patterns
    const patterns = PatternEngine.detectPatterns(logs.slice(-window));

    // Step 6: Generate advisories
    const advisories: PredictiveAdvisory[] = [];
    
    for (const assessment of riskAssessments) {
      const context = {
        recentPatterns: patterns
          .filter(p => p.module === assessment.module)
          .map(p => p.description),
        correlatedModules: correlations
          .filter(c => c.modules.includes(assessment.module))
          .flatMap(c => c.modules.filter(m => m !== assessment.module))
      };

      if (useAI) {
        const advisory = await AIAdvisor.suggest(assessment, context);
        advisories.push(advisory);
      } else {
        // Quick rule-based advisory without AI
        advisories.push({
          module: assessment.module,
          risk: assessment.riskLevel,
          probability: assessment.probability,
          suggestion: `${assessment.riskLevel} risk detected. Monitor closely.`,
          actionType: assessment.riskLevel === 'Critical' ? 'urgent' : 'monitor',
          autoApplicable: false,
          timestamp: Date.now()
        });
      }
    }

    // Step 7: Generate forecasts
    const forecasts = riskAssessments.map(assessment => ({
      module: assessment.module,
      timeframe: this.determineTimeframe(assessment.predictedFailureWindow),
      predictedMetrics: {
        latency: predictions.find(p => p.module === assessment.module)?.avg || 0,
        errorRate: 0, // TODO: Extract from trends
        memoryUsage: 0 // TODO: Extract from trends
      },
      confidence: assessment.confidence,
      warnings: this.generateWarnings(assessment, patterns)
    }));

    // Step 8: Determine overall health
    const overallHealthScore = RiskModel.calculateOverallHealth(riskAssessments);
    const overallHealth = 
      overallHealthScore > 80 ? 'Healthy' : 
      overallHealthScore > 50 ? 'Warning' : 
      'Critical';

    // Step 9: Apply auto-tuning for high-risk modules
    const tuningActions = applyAutoTuning(riskAssessments);
    const autoTuningActions = tuningActions.map(action => ({
      module: action.module,
      mode: action.config.mode,
      adjustments: action.config.adjustments,
      reason: action.reason,
      appliedAt: Date.now()
    }));

    return {
      timestamp: Date.now(),
      overallHealth,
      advisories,
      riskAssessments,
      correlations,
      forecasts,
      autoTuningActions
    };
  }

  /**
   * Determine forecast timeframe
   */
  private static determineTimeframe(
    failureWindow?: string
  ): '1h' | '6h' | '24h' | '7d' {
    if (!failureWindow) return '24h';
    
    if (failureWindow.includes('1 hour')) return '1h';
    if (failureWindow.includes('6 hours')) return '6h';
    if (failureWindow.includes('24 hours')) return '24h';
    return '7d';
  }

  /**
   * Generate warnings from assessment and patterns
   */
  private static generateWarnings(
    assessment: any,
    patterns: any[]
  ): string[] {
    const warnings: string[] = [];

    if (assessment.riskLevel === 'Critical') {
      warnings.push('⚠️ Critical risk level - immediate attention required');
    }

    if (assessment.probability > 0.8) {
      warnings.push('📊 High failure probability detected');
    }

    const modulePatterns = patterns.filter(p => p.module === assessment.module);
    if (modulePatterns.length > 0) {
      warnings.push(`🔄 ${modulePatterns.length} recurring pattern(s) detected`);
    }

    return warnings;
  }
}
