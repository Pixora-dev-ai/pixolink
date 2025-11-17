/**
 * PixoGuard Connector - Security & Anomaly Detection
 * Reports telemetry and anomalies to PixoGuard
 */

import { IOLBus } from '../eventBus';
import type { ConnectorResult, PixoGuardReport } from '../../types';

export class PixoGuardConnector {
  private reports: PixoGuardReport[] = [];
  private maxReports = 1000;

  /**
   * Report an anomaly or issue
   */
  async report(report: Omit<PixoGuardReport, 'timestamp'>): Promise<ConnectorResult> {
    const startTime = Date.now();

    try {
      const fullReport: PixoGuardReport = {
        ...report,
        timestamp: Date.now()
      };

      // Store report
      this.reports.push(fullReport);

      // Maintain max size
      if (this.reports.length > this.maxReports) {
        this.reports = this.reports.slice(-this.maxReports);
      }

      // Publish telemetry event
      await IOLBus.publish('TELEMETRY_LOGGED', {
        source: 'pixoguard',
        report: fullReport
      });

      // Log to console for development
      if (import.meta.env.DEV) {
        console.log(`[PixoGuard] ${report.severity.toUpperCase()}: ${report.message}`, report.data);
      }

      return {
        success: true,
        data: fullReport,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Report failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Report anomaly
   */
  async reportAnomaly(
    message: string,
    severity: PixoGuardReport['severity'],
    data?: Record<string, unknown>
  ): Promise<ConnectorResult> {
    return this.report({
      type: 'anomaly',
      severity,
      message,
      data
    });
  }

  /**
   * Report performance issue
   */
  async reportPerformance(
    message: string,
    severity: PixoGuardReport['severity'],
    data?: Record<string, unknown>
  ): Promise<ConnectorResult> {
    return this.report({
      type: 'performance',
      severity,
      message,
      data
    });
  }

  /**
   * Report security issue
   */
  async reportSecurity(
    message: string,
    severity: PixoGuardReport['severity'],
    data?: Record<string, unknown>
  ): Promise<ConnectorResult> {
    return this.report({
      type: 'security',
      severity,
      message,
      data
    });
  }

  /**
   * Report quality issue
   */
  async reportQuality(
    message: string,
    severity: PixoGuardReport['severity'],
    data?: Record<string, unknown>
  ): Promise<ConnectorResult> {
    return this.report({
      type: 'quality',
      severity,
      message,
      data
    });
  }

  /**
   * Get all reports
   */
  getReports(options?: {
    type?: PixoGuardReport['type'];
    severity?: PixoGuardReport['severity'];
    limit?: number;
  }): PixoGuardReport[] {
    let reports = [...this.reports];

    if (options?.type) {
      reports = reports.filter((r) => r.type === options.type);
    }

    if (options?.severity) {
      reports = reports.filter((r) => r.severity === options.severity);
    }

    if (options?.limit) {
      reports = reports.slice(-options.limit);
    }

    return reports;
  }

  /**
   * Get report statistics
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    recentCount: number;
  } {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let recentCount = 0;

    for (const report of this.reports) {
      byType[report.type] = (byType[report.type] ?? 0) + 1;
      bySeverity[report.severity] = (bySeverity[report.severity] ?? 0) + 1;

      if (report.timestamp > oneHourAgo) {
        recentCount++;
      }
    }

    return {
      total: this.reports.length,
      byType,
      bySeverity,
      recentCount
    };
  }

  /**
   * Clear reports
   */
  clearReports(): void {
    this.reports = [];
  }

  /**
   * Export reports
   */
  exportReports(): string {
    return JSON.stringify(this.reports, null, 2);
  }
}

// Singleton instance
export const pixoguardConnector = new PixoGuardConnector();
