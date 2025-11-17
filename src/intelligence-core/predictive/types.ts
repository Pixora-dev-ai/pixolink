/**
 * Predictive Maintenance AI Layer (PMAL) - Type Definitions
 * Defines interfaces for forecasting, risk assessment, and proactive optimization
 */

export interface HealthLog {
  timestamp: number;
  module: string;
  latency?: number;
  errorRate?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  requestCount?: number;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  message?: string;
}

export interface TrendData {
  module: string;
  avgLatency: number;
  avgErrorRate: number;
  avgMemoryUsage: number;
  trend: number[]; // Recent values (last 5-10 data points)
  timestamp: number;
}

export interface AnomalyPrediction {
  module: string;
  metric: 'latency' | 'errorRate' | 'memory' | 'cpu';
  avg: number;
  slope: number; // Rate of change
  risk: 'Low' | 'Medium' | 'High' | 'Critical';
  confidence: number; // 0-1
  timestamp: number;
}

export interface RiskAssessment {
  module: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  probability: number; // 0-1
  impactScore: number; // 0-100
  predictedFailureWindow?: string; // e.g., "within 2 hours"
  confidence: number;
  timestamp: number;
}

export interface PredictiveAdvisory {
  module: string;
  risk: 'Low' | 'Medium' | 'High' | 'Critical';
  probability: number;
  suggestion: string;
  actionType: 'monitor' | 'optimize' | 'restart' | 'scale' | 'urgent';
  autoApplicable: boolean;
  timestamp: number;
}

export interface CorrelationPattern {
  modules: string[];
  correlationType: 'positive' | 'negative' | 'cascading';
  strength: number; // 0-1
  description: string;
}

export interface ForecastResult {
  module: string;
  timeframe: '1h' | '6h' | '24h' | '7d';
  predictedMetrics: {
    latency: number;
    errorRate: number;
    memoryUsage: number;
  };
  confidence: number;
  warnings: string[];
}

export interface AutoTuningConfig {
  module: string;
  mode: 'safe' | 'balanced' | 'aggressive';
  adjustments: {
    concurrencyLimit?: number;
    timeout?: number;
    cacheSize?: number;
    retryStrategy?: 'exponential' | 'linear' | 'fixed';
  };
  reason: string;
  appliedAt: number;
}

export interface PredictiveSummary {
  timestamp: number;
  overallHealth: 'Healthy' | 'Warning' | 'Critical';
  advisories: PredictiveAdvisory[];
  riskAssessments: RiskAssessment[];
  correlations: CorrelationPattern[];
  forecasts: ForecastResult[];
  autoTuningActions: AutoTuningConfig[];
}

export type RiskThreshold = {
  low: number;
  medium: number;
  high: number;
  critical: number;
};

export type PredictionAlgorithm = 'linear-regression' | 'moving-average' | 'exponential-smoothing' | 'ai-powered';
