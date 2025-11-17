import type { PluginRegistry, PixoPlugin } from '../types/Plugin';
import type { Logger } from '../types/Plugin';

/**
 * Plugin registry implementation
 */
export class PluginRegistryImpl implements PluginRegistry {
  private plugins: Map<string, PixoPlugin> = new Map();
  private apis: Map<string, Record<string, unknown>> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async register(plugin: PixoPlugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`);
    }

    this.plugins.set(plugin.name, plugin);
    this.logger.debug(`[Registry] Registered plugin: ${plugin.name} v${plugin.version}`);

    // Store API if available
    if (plugin.getAPI) {
      const api = plugin.getAPI();
      this.apis.set(plugin.name, api);
    }
  }

  get<T = unknown>(name: string): T {
    // First check if we have a cached API
    const api = this.apis.get(name);
    if (api) {
      return api as T;
    }

    // Otherwise get plugin directly
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin "${name}" not found`);
    }

    // Try to get API and cache it
    if (plugin.getAPI) {
      const newApi = plugin.getAPI();
      this.apis.set(name, newApi);
      return newApi as T;
    }

    return plugin as T;
  }

  has(name: string): boolean {
    return this.plugins.has(name);
  }

  list(): string[] {
    return Array.from(this.plugins.keys());
  }

  getAll(): Map<string, PixoPlugin> {
    return new Map(this.plugins);
  }

  /**
   * Get plugin instance (not API)
   */
  getPlugin(name: string): PixoPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Check plugin dependencies
   */
  checkDependencies(plugin: PixoPlugin): string[] {
    const missing: string[] = [];

    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.has(dep)) {
          missing.push(dep);
        }
      }
    }

    return missing;
  }

  /**
   * Get initialization order based on dependencies
   */
  getInitializationOrder(): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (name: string) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected involving plugin "${name}"`);
      }

      visiting.add(name);

      const plugin = this.plugins.get(name);
      if (plugin && plugin.dependencies) {
        for (const dep of plugin.dependencies) {
          if (!this.has(dep)) {
            throw new Error(`Plugin "${name}" depends on missing plugin "${dep}"`);
          }
          visit(dep);
        }
      }

      visiting.delete(name);
      visited.add(name);
      order.push(name);
    };

    for (const name of this.plugins.keys()) {
      visit(name);
    }

    return order;
  }
}
