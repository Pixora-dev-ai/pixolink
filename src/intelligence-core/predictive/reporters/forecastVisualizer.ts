/**
 * Forecast Visualizer - Dashboard data formatting
 * Prepares predictive data for visualization
 */

import type { PredictiveSummary, PredictiveAdvisory, ForecastResult } from '../types';

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
}

export interface TableRow {
  module: string;
  risk: string;
  riskColor: string;
  probability: string;
  recommendation: string;
  timeframe?: string;
  confidence: string;
}

export class ForecastVisualizer {
  /**
   * Format forecast for risk table display
   */
  static formatForTable(summary: PredictiveSummary): TableRow[] {
    return summary.advisories.map(advisory => ({
      module: advisory.module,
      risk: advisory.risk,
      riskColor: this.getRiskColor(advisory.risk),
      probability: `${(advisory.probability * 100).toFixed(0)}%`,
      recommendation: advisory.suggestion,
      timeframe: summary.forecasts.find(f => f.module === advisory.module)?.timeframe,
      confidence: this.formatConfidence(
        summary.riskAssessments.find(r => r.module === advisory.module)?.confidence || 0
      )
    }));
  }

  /**
   * Format forecast for risk chart
   */
  static formatForChart(summary: PredictiveSummary): ChartData {
    const sortedAdvisories = summary.advisories
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 10); // Top 10 risky modules

    return {
      labels: sortedAdvisories.map(a => a.module),
      datasets: [
        {
          label: 'Failure Probability',
          data: sortedAdvisories.map(a => a.probability * 100),
          backgroundColor: sortedAdvisories.map(a => this.getRiskColorRGBA(a.risk)),
          borderColor: sortedAdvisories.map(a => this.getRiskColor(a.risk))
        }
      ]
    };
  }

  /**
   * Format correlation data for network graph
   */
  static formatCorrelations(summary: PredictiveSummary) {
    return summary.correlations.map(corr => ({
      source: corr.modules[0],
      target: corr.modules[1],
      strength: corr.strength,
      type: corr.correlationType,
      description: corr.description
    }));
  }

  /**
   * Format timeline data for trend visualization
   */
  static formatTimeline(forecasts: ForecastResult[]): ChartData {
    const timeframes = ['1h', '6h', '24h', '7d'];
    
    return {
      labels: timeframes,
      datasets: forecasts.slice(0, 5).map(forecast => ({
        label: forecast.module,
        data: this.projectMetrics(forecast, timeframes),
        borderColor: this.getRiskColor(
          this.predictRiskLevel(forecast.predictedMetrics.latency)
        )
      }))
    };
  }

  /**
   * Get risk color for visualization
   */
  private static getRiskColor(risk: string): string {
    switch (risk) {
      case 'Critical': return '#ef4444'; // red-500
      case 'High': return '#f59e0b'; // orange-500
      case 'Medium': return '#eab308'; // yellow-500
      case 'Low': return '#10b981'; // green-500
      default: return '#6b7280'; // gray-500
    }
  }

  /**
   * Get risk color with alpha for backgrounds
   */
  private static getRiskColorRGBA(risk: string): string {
    switch (risk) {
      case 'Critical': return 'rgba(239, 68, 68, 0.5)';
      case 'High': return 'rgba(245, 158, 11, 0.5)';
      case 'Medium': return 'rgba(234, 179, 8, 0.5)';
      case 'Low': return 'rgba(16, 185, 129, 0.5)';
      default: return 'rgba(107, 114, 128, 0.5)';
    }
  }

  /**
   * Format confidence value
   */
  private static formatConfidence(confidence: number): string {
    if (confidence > 0.8) return 'High';
    if (confidence > 0.5) return 'Medium';
    return 'Low';
  }

  /**
   * Project metrics over timeframes
   */
  private static projectMetrics(forecast: ForecastResult, timeframes: string[]): number[] {
    // Simple linear projection based on current latency
    const baseLatency = forecast.predictedMetrics.latency;
    return timeframes.map((_, index) => baseLatency * (1 + index * 0.1));
  }

  /**
   * Predict risk level from latency
   */
  private static predictRiskLevel(latency: number): string {
    if (latency > 1000) return 'Critical';
    if (latency > 500) return 'High';
    if (latency > 200) return 'Medium';
    return 'Low';
  }

  /**
   * Format advisory list for UI
   */
  static formatAdvisories(advisories: PredictiveAdvisory[]): Array<{
    id: string;
    module: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    message: string;
    timestamp: string;
    actionable: boolean;
  }> {
    return advisories.map((advisory, index) => ({
      id: `advisory-${index}`,
      module: advisory.module,
      priority: this.mapActionToPriority(advisory.actionType),
      message: advisory.suggestion,
      timestamp: new Date(advisory.timestamp).toLocaleString(),
      actionable: advisory.autoApplicable
    }));
  }

  /**
   * Map action type to priority
   */
  private static mapActionToPriority(
    actionType: string
  ): 'urgent' | 'high' | 'medium' | 'low' {
    switch (actionType) {
      case 'urgent': return 'urgent';
      case 'restart': return 'high';
      case 'optimize': return 'medium';
      case 'scale': return 'medium';
      case 'monitor': return 'low';
      default: return 'low';
    }
  }
}
