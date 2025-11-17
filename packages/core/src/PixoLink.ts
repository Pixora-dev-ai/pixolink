import { loadConfig } from './config/loader';
import type { PixoConfig, ModuleConfig } from './config/schema';
import { isModuleEnabled, getModuleConfig } from './config/schema';
import type { PixoPlugin, PluginContext } from './types/Plugin';
import { SimpleLogger } from './utils/logger';
import { EventBusImpl } from './utils/eventBus';
import { ConnectorHubImpl } from './connectors/ConnectorHub';
import { PluginRegistryImpl } from './orchestrator/PluginRegistry';
import { ConfigResolverImpl } from './config/ConfigResolver';

/**
 * Main PixoLink SDK class
 */
export class PixoLink {
  private static instance?: PixoLink;

  public readonly config: PixoConfig;
  public readonly logger: SimpleLogger;
  public readonly eventBus: EventBusImpl;
  public readonly connectors: ConnectorHubImpl;
  public readonly plugins: PluginRegistryImpl;
  public readonly configResolver: ConfigResolverImpl;

  private isInitialized = false;

  private constructor(config: PixoConfig) {
    this.config = config;
    this.logger = new SimpleLogger({
      minLevel: config.environment === 'production' ? 'info' : 'debug',
      prefix: '[PixoLink]',
    });
    this.eventBus = new EventBusImpl();
    this.connectors = new ConnectorHubImpl(this.logger);
    this.plugins = new PluginRegistryImpl(this.logger);
    this.configResolver = new ConfigResolverImpl(config as unknown as Record<string, unknown>);
  }

  /**
   * Initialize PixoLink SDK
   */
  static async init(configPath = './pixo.config.json'): Promise<PixoLink> {
    if (PixoLink.instance) {
      throw new Error('PixoLink already initialized. Call PixoLink.getInstance() instead.');
    }

    // Load config
    const config = await loadConfig(configPath);

    // Create instance
    const instance = new PixoLink(config);

    // Initialize connectors
    await instance.initConnectors();

    // Initialize plugins
    await instance.initPlugins();

    // Start plugins
    await instance.startPlugins();

    instance.isInitialized = true;
    PixoLink.instance = instance;

    instance.logger.info('PixoLink SDK initialized successfully', {
      project: config.project_name,
      environment: config.environment,
      plugins: instance.plugins.list(),
      connectors: instance.connectors.list(),
    });

    // Emit initialization complete event
    await instance.eventBus.emit('pixolink:initialized', instance);

    return instance;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PixoLink {
    if (!PixoLink.instance) {
      throw new Error('PixoLink not initialized. Call PixoLink.init() first.');
    }
    return PixoLink.instance;
  }

  /**
   * Shutdown PixoLink
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      this.logger.warn('PixoLink not initialized, skipping shutdown');
      return;
    }

    this.logger.info('Shutting down PixoLink...');

    // Emit shutdown event
    await this.eventBus.emit('pixolink:shutdown');

    // Stop plugins in reverse order
    const plugins = this.plugins.list().reverse();
    for (const name of plugins) {
      try {
        const plugin = this.plugins.getPlugin(name);
        if (plugin && plugin.stop) {
          await plugin.stop();
          this.logger.debug(`Stopped plugin: ${name}`);
        }
      } catch (error) {
        this.logger.error(`Failed to stop plugin ${name}`, error as Error);
      }
    }

    // Disconnect connectors
    for (const name of this.connectors.list()) {
      try {
        await this.connectors.remove(name);
      } catch (error) {
        this.logger.error(`Failed to disconnect connector ${name}`, error as Error);
      }
    }

    this.isInitialized = false;
    PixoLink.instance = undefined;
    this.logger.info('PixoLink shutdown complete');
  }

  /**
   * Get plugin API
   */
  getPlugin<T = unknown>(name: string): T {
    return this.plugins.get<T>(name);
  }

  /**
   * Get connector
   */
  getConnector<T = unknown>(name: string): T {
    return this.connectors.get<T>(name);
  }

  /**
   * Check if plugin is enabled
   */
  isPluginEnabled(name: string): boolean {
    const moduleConfig = (this.config.modules as Record<string, unknown>)?.[name];
    return isModuleEnabled(moduleConfig as boolean | { enabled: boolean });
  }

  /**
   * Get system status
   */
  async getStatus(): Promise<{
    initialized: boolean;
    plugins: Record<string, { healthy: boolean; message?: string }>;
    connectors: Record<string, boolean>;
  }> {
    const pluginStatus: Record<string, { healthy: boolean; message?: string }> = {};

    for (const name of this.plugins.list()) {
      const plugin = this.plugins.getPlugin(name);
      if (plugin && plugin.getStatus) {
        const status = plugin.getStatus();
        pluginStatus[name] = {
          healthy: status.healthy,
          message: status.message,
        };
      } else {
        pluginStatus[name] = { healthy: true };
      }
    }

    const connectorHealth = await this.connectors.checkHealth();
    const connectors: Record<string, boolean> = {};
    for (const [name, healthy] of connectorHealth.entries()) {
      connectors[name] = healthy;
    }

    return {
      initialized: this.isInitialized,
      plugins: pluginStatus,
      connectors,
    };
  }

  private async initConnectors(): Promise<void> {
    this.logger.debug('Initializing connectors...');

    // Initialize connectors based on config
    // Connectors will be initialized by individual modules that need them
    // This is just a placeholder for manual connector registration

    this.logger.info('Connectors initialization complete');
  }

  private async initPlugins(): Promise<void> {
    this.logger.debug('Initializing plugins...');

    const modulesConfig = this.config.modules;
    if (!modulesConfig) {
      this.logger.warn('No modules configured');
      return;
    }

    // Get plugin context
    const context: PluginContext = {
      logger: this.logger,
      eventBus: this.eventBus,
      connectors: this.connectors,
      plugins: this.plugins,
      config: this.configResolver,
    };

    // Collect enabled plugins
    const enabledPlugins: Array<{ name: string; plugin: PixoPlugin }> = [];

    for (const [name, moduleConfig] of Object.entries(modulesConfig)) {
      if (!isModuleEnabled(moduleConfig as ModuleConfig)) {
        this.logger.debug(`Plugin ${name} is disabled`);
        continue;
      }

      // Dynamic import would go here
      // For now, plugins must be registered manually
      this.logger.debug(`Plugin ${name} is enabled but not loaded (dynamic loading not implemented)`);
    }

    // Initialize plugins in dependency order
    if (enabledPlugins.length > 0) {
      for (const { name, plugin } of enabledPlugins) {
        try {
          await this.plugins.register(plugin);
          const pluginConfig = getModuleConfig((modulesConfig as Record<string, any>)[name]);
          await plugin.init(pluginConfig, context);
          this.logger.info(`Initialized plugin: ${name}`);
        } catch (error) {
          this.logger.error(`Failed to initialize plugin ${name}`, error as Error);
          throw error;
        }
      }
    }

    this.logger.info('Plugins initialization complete');
  }

  private async startPlugins(): Promise<void> {
    this.logger.debug('Starting plugins...');

    const order = this.plugins.getInitializationOrder();

    for (const name of order) {
      const plugin = this.plugins.getPlugin(name);
      if (plugin && plugin.start) {
        try {
          await plugin.start();
          this.logger.info(`Started plugin: ${name}`);
        } catch (error) {
          this.logger.error(`Failed to start plugin ${name}`, error as Error);
          throw error;
        }
      }
    }

    this.logger.info('All plugins started successfully');
  }

  /**
   * Manually register a plugin (for use when dynamic imports aren't available)
   */
  async registerPlugin(plugin: PixoPlugin): Promise<void> {
    const context: PluginContext = {
      logger: this.logger,
      eventBus: this.eventBus,
      connectors: this.connectors,
      plugins: this.plugins,
      config: this.configResolver,
    };

    await this.plugins.register(plugin);

    const modulesConfig = this.config.modules || {};
    const pluginConfig = getModuleConfig((modulesConfig as Record<string, any>)[plugin.name]);

    await plugin.init(pluginConfig, context);

    if (plugin.start) {
      await plugin.start();
    }

    this.logger.info(`Manually registered and started plugin: ${plugin.name}`);
  }
}

/**
 * Convenience function to initialize PixoLink
 */
export async function initPixoLink(configPath?: string): Promise<PixoLink> {
  return PixoLink.init(configPath);
}

/**
 * Convenience function to get connector
 */
export function useConnector<T = unknown>(name: string): T {
  return PixoLink.getInstance().getConnector<T>(name);
}

/**
 * Convenience function to get plugin
 */
export function usePlugin<T = unknown>(name: string): T {
  return PixoLink.getInstance().getPlugin<T>(name);
}
