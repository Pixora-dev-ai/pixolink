/**
 * LogicSim - AI Behavioral Simulator
 */

export interface SimulationScenario {
  id: string;
  name: string;
  inputs: Record<string, unknown>;
  expectedOutputs?: Record<string, unknown>;
}

export interface SimulationResult {
  scenarioId: string;
  passed: boolean;
  outputs: Record<string, unknown>;
  duration: number;
  insights: string[];
}

export class LogicSimulator {
  private scenarios: Map<string, SimulationScenario> = new Map();

  addScenario(scenario: SimulationScenario): void {
    this.scenarios.set(scenario.id, scenario);
  }

  async runScenario(
    scenarioId: string,
    executor: (inputs: Record<string, unknown>) => Promise<Record<string, unknown>>
  ): Promise<SimulationResult> {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) throw new Error(`Scenario ${scenarioId} not found`);

    const startTime = Date.now();
    const outputs = await executor(scenario.inputs);
    const duration = Date.now() - startTime;

    const insights: string[] = [];
    let passed = true;

    if (scenario.expectedOutputs) {
      for (const [key, expected] of Object.entries(scenario.expectedOutputs)) {
        if (outputs[key] !== expected) {
          passed = false;
          insights.push(`Mismatch: ${key} expected ${expected}, got ${outputs[key]}`);
        }
      }
    }

    if (duration > 5000) insights.push('Performance: Slow execution detected');

    return { scenarioId, passed, outputs, duration, insights };
  }

  async runAll(
    executor: (inputs: Record<string, unknown>) => Promise<Record<string, unknown>>
  ): Promise<SimulationResult[]> {
    const results: SimulationResult[] = [];
    for (const [id] of this.scenarios) {
      results.push(await this.runScenario(id, executor));
    }
    return results;
  }

  getScenarios(): SimulationScenario[] {
    return Array.from(this.scenarios.values());
  }
}
