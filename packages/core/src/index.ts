// Main exports
export { PixoLink, initPixoLink, useConnector, usePlugin } from './PixoLink';

// Type exports
export type {
  PixoPlugin,
  PluginContext,
  PluginStatus,
  Logger,
  EventBus,
  ConnectorHub,
  PluginRegistry,
  ConfigResolver,
  Connector,
  ConnectorType,
} from './types/Plugin';

export type { PixoConfig, ModuleConfig } from './config/schema';
export { isModuleEnabled, getModuleConfig } from './config/schema';

// Utility exports
export { SimpleLogger } from './utils/logger';
export type { LogLevel, LogEntry } from './utils/logger';

export { EventBusImpl } from './utils/eventBus';
export { PluginRegistryImpl } from './orchestrator/PluginRegistry';
export { ConnectorHubImpl } from './connectors/ConnectorHub';
export { ConfigResolverImpl } from './config/ConfigResolver';

// Config exports
export { loadConfig, loadConfigFromModule } from './config/loader';
export { PixoConfigSchema } from './config/schema';
