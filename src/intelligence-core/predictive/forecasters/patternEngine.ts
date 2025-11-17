/**
 * Pattern Engine - Recurring pattern detection
 * Identifies repeated issues and behavioral patterns
 */

import type { HealthLog, AnomalyPrediction } from '../types';

export interface RecurringPattern {
  module: string;
  patternType: 'spike' | 'drift' | 'oscillation' | 'degradation';
  frequency: number;
  description: string;
  firstSeen: number;
  lastSeen: number;
  occurrences: number;
}

export class PatternEngine {
  /**
   * Detect recurring patterns from historical logs
   */
  static detectPatterns(logs: HealthLog[]): RecurringPattern[] {
    const patterns: RecurringPattern[] = [];

    // Group by module
    const moduleGroups = new Map<string, HealthLog[]>();
    logs.forEach(log => {
      if (!moduleGroups.has(log.module)) {
        moduleGroups.set(log.module, []);
      }
      moduleGroups.get(log.module)!.push(log);
    });

    moduleGroups.forEach((moduleLogs, module) => {
      // Detect latency spikes
      const spikePattern = this.detectSpikes(module, moduleLogs);
      if (spikePattern) patterns.push(spikePattern);

      // Detect gradual drift
      const driftPattern = this.detectDrift(module, moduleLogs);
      if (driftPattern) patterns.push(driftPattern);

      // Detect oscillations
      const oscillationPattern = this.detectOscillations(module, moduleLogs);
      if (oscillationPattern) patterns.push(oscillationPattern);
    });

    return patterns;
  }

  /**
   * Detect latency spikes
   */
  private static detectSpikes(module: string, logs: HealthLog[]): RecurringPattern | null {
    const latencies = logs.map(l => l.latency || 0).filter(l => l > 0);
    if (latencies.length < 10) return null;

    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const threshold = avg * 2;

    const spikes = latencies.filter(l => l > threshold);
    
    if (spikes.length > 3) {
      return {
        module,
        patternType: 'spike',
        frequency: spikes.length / logs.length,
        description: `${spikes.length} latency spikes detected (>${threshold.toFixed(0)}ms)`,
        firstSeen: logs[0].timestamp,
        lastSeen: logs[logs.length - 1].timestamp,
        occurrences: spikes.length
      };
    }

    return null;
  }

  /**
   * Detect gradual drift
   */
  private static detectDrift(module: string, logs: HealthLog[]): RecurringPattern | null {
    const latencies = logs.map(l => l.latency || 0).filter(l => l > 0);
    if (latencies.length < 20) return null;

    const firstHalf = latencies.slice(0, latencies.length / 2);
    const secondHalf = latencies.slice(latencies.length / 2);

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const drift = ((avgSecond - avgFirst) / avgFirst) * 100;

    if (Math.abs(drift) > 20) {
      return {
        module,
        patternType: 'drift',
        frequency: 1,
        description: `${drift > 0 ? 'Upward' : 'Downward'} drift of ${Math.abs(drift).toFixed(1)}% detected`,
        firstSeen: logs[0].timestamp,
        lastSeen: logs[logs.length - 1].timestamp,
        occurrences: 1
      };
    }

    return null;
  }

  /**
   * Detect oscillations (repeated up/down patterns)
   */
  private static detectOscillations(module: string, logs: HealthLog[]): RecurringPattern | null {
    const latencies = logs.map(l => l.latency || 0).filter(l => l > 0);
    if (latencies.length < 10) return null;

    let oscillations = 0;
    for (let i = 1; i < latencies.length - 1; i++) {
      const prev = latencies[i - 1];
      const curr = latencies[i];
      const next = latencies[i + 1];

      // Check for peak or valley
      if ((curr > prev && curr > next) || (curr < prev && curr < next)) {
        oscillations++;
      }
    }

    const frequency = oscillations / latencies.length;

    if (frequency > 0.3) {
      return {
        module,
        patternType: 'oscillation',
        frequency,
        description: `High oscillation detected (${oscillations} peaks/valleys)`,
        firstSeen: logs[0].timestamp,
        lastSeen: logs[logs.length - 1].timestamp,
        occurrences: oscillations
      };
    }

    return null;
  }

  /**
   * Predict if pattern will continue
   */
  static predictContinuation(pattern: RecurringPattern): boolean {
    // High frequency patterns are more likely to continue
    if (pattern.frequency > 0.5) return true;

    // Recent patterns are more likely to continue
    const timeSinceLastSeen = Date.now() - pattern.lastSeen;
    const patternDuration = pattern.lastSeen - pattern.firstSeen;
    
    return timeSinceLastSeen < patternDuration * 0.2;
  }
}
