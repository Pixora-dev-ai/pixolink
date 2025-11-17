/**
 * Anomaly Predictor - Slope-based risk calculation
 * Detects anomalies and predicts risks based on metric trends
 */

import type { TrendData, AnomalyPrediction } from '../types';
import { TrendAnalyzer } from './trendAnalyzer';

export class AnomalyPredictor {
  /**
   * Detect anomalies from trend data
   */
  static detect(trendData: TrendData[]): AnomalyPrediction[] {
    const predictions: AnomalyPrediction[] = [];

    trendData.forEach(trend => {
      // Calculate slope for latency trend
      const slope = TrendAnalyzer.calculateSlope(trend.trend);
      
      // Determine risk level based on slope
      let risk: 'Low' | 'Medium' | 'High' | 'Critical';
      let confidence: number;

      if (Math.abs(slope) > 50) {
        risk = 'Critical';
        confidence = 0.9;
      } else if (Math.abs(slope) > 20) {
        risk = 'High';
        confidence = 0.75;
      } else if (Math.abs(slope) > 10) {
        risk = 'Medium';
        confidence = 0.6;
      } else {
        risk = 'Low';
        confidence = 0.5;
      }

      // Check error rate
      if (trend.avgErrorRate > 0.05) {
        risk = this.escalateRisk(risk);
        confidence = Math.min(confidence + 0.1, 1.0);
      }

      // Check memory usage
      if (trend.avgMemoryUsage > 0.8) {
        risk = this.escalateRisk(risk);
        confidence = Math.min(confidence + 0.1, 1.0);
      }

      predictions.push({
        module: trend.module,
        metric: 'latency',
        avg: trend.avgLatency,
        slope,
        risk,
        confidence,
        timestamp: Date.now()
      });
    });

    return predictions;
  }

  /**
   * Escalate risk level to the next tier
   */
  private static escalateRisk(
    current: 'Low' | 'Medium' | 'High' | 'Critical'
  ): 'Low' | 'Medium' | 'High' | 'Critical' {
    switch (current) {
      case 'Low': return 'Medium';
      case 'Medium': return 'High';
      case 'High': return 'Critical';
      case 'Critical': return 'Critical';
    }
  }

  /**
   * Calculate anomaly score (0-100)
   */
  static calculateAnomalyScore(prediction: AnomalyPrediction): number {
    const riskScores = {
      Low: 25,
      Medium: 50,
      High: 75,
      Critical: 100
    };

    const baseScore = riskScores[prediction.risk];
    const confidenceMultiplier = prediction.confidence;
    const slopeInfluence = Math.min(Math.abs(prediction.slope) / 100, 1) * 20;

    return Math.min(baseScore * confidenceMultiplier + slopeInfluence, 100);
  }
}
