/**
 * Risk Model - Probability-based failure forecasting
 * Converts slopes and anomalies into actionable risk assessments
 */

import type { AnomalyPrediction, RiskAssessment } from '../types';

export class RiskModel {
  /**
   * Evaluate risk from anomaly predictions
   */
  static evaluate(predictions: AnomalyPrediction[]): RiskAssessment[] {
    return predictions.map(prediction => {
      // Convert slope to probability (0-1 scale)
      const baseProbability = Math.min(Math.abs(prediction.slope) / 100, 1);
      
      // Adjust based on risk level
      const riskMultipliers = {
        Low: 0.5,
        Medium: 1.0,
        High: 1.5,
        Critical: 2.0
      };

      const adjustedProbability = Math.min(
        baseProbability * riskMultipliers[prediction.risk],
        1.0
      );

      // Calculate impact score (0-100)
      const impactScore = this.calculateImpactScore(prediction);

      // Predict failure window based on slope
      const predictedFailureWindow = this.predictFailureWindow(
        prediction.slope,
        prediction.avg
      );

      return {
        module: prediction.module,
        riskLevel: prediction.risk,
        probability: adjustedProbability,
        impactScore,
        predictedFailureWindow,
        confidence: prediction.confidence,
        timestamp: Date.now()
      };
    });
  }

  /**
   * Calculate impact score based on multiple factors
   */
  private static calculateImpactScore(prediction: AnomalyPrediction): number {
    const riskScores = {
      Low: 20,
      Medium: 50,
      High: 75,
      Critical: 95
    };

    const baseScore = riskScores[prediction.risk];
    const slopeInfluence = Math.min(Math.abs(prediction.slope) / 2, 20);
    const confidenceWeight = prediction.confidence * 10;

    return Math.min(baseScore + slopeInfluence + confidenceWeight, 100);
  }

  /**
   * Predict failure window based on degradation rate
   */
  private static predictFailureWindow(
    slope: number,
    _currentAvg: number
  ): string | undefined {
    const absSlope = Math.abs(slope);

    if (absSlope > 50) {
      return 'within 1 hour';
    } else if (absSlope > 20) {
      return 'within 6 hours';
    } else if (absSlope > 10) {
      return 'within 24 hours';
    } else if (absSlope > 5) {
      return 'within 7 days';
    }

    return undefined; // No immediate failure predicted
  }

  /**
   * Get risk threshold for auto-tuning
   */
  static shouldAutoTune(assessment: RiskAssessment): boolean {
    return assessment.probability > 0.8 && 
           (assessment.riskLevel === 'High' || assessment.riskLevel === 'Critical');
  }

  /**
   * Calculate overall system health (0-100)
   */
  static calculateOverallHealth(assessments: RiskAssessment[]): number {
    if (assessments.length === 0) return 100;

    const totalRisk = assessments.reduce((sum, a) => {
      return sum + (a.probability * a.impactScore);
    }, 0);

    const maxRisk = assessments.length * 100;
    const healthScore = 100 - (totalRisk / maxRisk) * 100;

    return Math.max(0, Math.min(100, healthScore));
  }
}
