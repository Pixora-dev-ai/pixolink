import type { ConnectorHub, Connector } from '../types/Plugin';
import type { Logger } from '../types/Plugin';

/**
 * Connector hub implementation
 */
export class ConnectorHubImpl implements ConnectorHub {
  private connectors: Map<string, unknown> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  register(name: string, connector: unknown): void {
    if (this.connectors.has(name)) {
      throw new Error(`Connector "${name}" is already registered`);
    }

    this.connectors.set(name, connector);
    this.logger.debug(`[ConnectorHub] Registered connector: ${name}`);
  }

  get<T = unknown>(name: string): T {
    const connector = this.connectors.get(name);
    if (!connector) {
      throw new Error(`Connector "${name}" not found. Available: ${this.list().join(', ')}`);
    }
    return connector as T;
  }

  has(name: string): boolean {
    return this.connectors.has(name);
  }

  list(): string[] {
    return Array.from(this.connectors.keys());
  }

  /**
   * Remove a connector
   */
  async remove(name: string): Promise<void> {
    const connector = this.connectors.get(name);
    if (!connector) return;

    // Call disconnect if available
    if (typeof (connector as Connector).disconnect === 'function') {
      await (connector as Connector).disconnect!();
    }

    this.connectors.delete(name);
    this.logger.debug(`[ConnectorHub] Removed connector: ${name}`);
  }

  /**
   * Check health of all connectors
   */
  async checkHealth(): Promise<Map<string, boolean>> {
    const health = new Map<string, boolean>();

    for (const [name, connector] of this.connectors.entries()) {
      if (typeof (connector as Connector).isHealthy === 'function') {
        try {
          const healthy = await (connector as Connector).isHealthy();
          health.set(name, healthy);
        } catch (error) {
          this.logger.error(`[ConnectorHub] Health check failed for ${name}`, error as Error);
          health.set(name, false);
        }
      } else {
        health.set(name, true); // Assume healthy if no check available
      }
    }

    return health;
  }
}
