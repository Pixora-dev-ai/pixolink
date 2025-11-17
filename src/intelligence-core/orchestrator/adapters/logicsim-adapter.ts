/**
 * LogicSim Adapter - AI Behavioral Simulator Integration
 * Manages scenario testing and validation
 */

import { LogicSimulator } from '../../../../../pixolink/src/weavai/libs/logicsim/src/index';
import { IOLBus } from '../eventBus';
import type { ConnectorResult, LogicSimScenario, LogicSimResult } from '../../types';

export class LogicSimAdapter {
  private simulator: LogicSimulator;

  constructor() {
    this.simulator = new LogicSimulator();
  }

  /**
   * Add test scenario
   */
  addScenario(scenario: LogicSimScenario): void {
    this.simulator.addScenario(scenario);
  }

  /**
   * Run single scenario
   */
  async runScenario(scenarioId: string): Promise<ConnectorResult<LogicSimResult>> {
    const startTime = Date.now();

    try {
      const result = await this.simulator.runScenario(scenarioId);

      if (!result.passed) {
        await IOLBus.publish('RULE_CONFLICT', {
          scenarioId,
          error: result.error?.message,
          output: result.output
        });
      }

      return {
        success: true,
        data: result as LogicSimResult,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Run scenario failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Run all scenarios
   */
  async runAll(): Promise<ConnectorResult<LogicSimResult[]>> {
    const startTime = Date.now();

    try {
      const results = await this.simulator.runAll();

      const failed = results.filter((r) => !r.passed);
      if (failed.length > 0) {
        await IOLBus.publish('RULE_CONFLICT', {
          total: results.length,
          failed: failed.length,
          failedScenarios: failed.map((r) => r.scenarioId)
        });
      }

      return {
        success: true,
        data: results as LogicSimResult[],
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Run all scenarios failed'),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get all scenarios
   */
  getScenarios(): LogicSimScenario[] {
    return this.simulator.getScenarios() as LogicSimScenario[];
  }

  /**
   * Get scenario by ID
   */
  getScenario(scenarioId: string): LogicSimScenario | undefined {
    const scenarios = this.simulator.getScenarios();
    return scenarios.find((s) => s.id === scenarioId) as LogicSimScenario | undefined;
  }

  /**
   * Remove scenario
   */
  removeScenario(scenarioId: string): boolean {
    const scenarios = this.simulator.getScenarios();
    const index = scenarios.findIndex((s) => s.id === scenarioId);
    
    if (index !== -1) {
      scenarios.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Clear all scenarios
   */
  clearScenarios(): void {
    const scenarios = this.simulator.getScenarios();
    scenarios.length = 0;
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    categories: Record<string, number>;
  } {
    const scenarios = this.simulator.getScenarios();
    const stats = {
      total: scenarios.length,
      categories: {} as Record<string, number>
    };

    // Count by category (if scenarios have category property)
    for (const scenario of scenarios) {
      const category = (scenario as { category?: string }).category ?? 'uncategorized';
      stats.categories[category] = (stats.categories[category] ?? 0) + 1;
    }

    return stats;
  }
}
