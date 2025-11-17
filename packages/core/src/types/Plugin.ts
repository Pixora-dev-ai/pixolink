/**
 * Base interface that all PixoLink plugins must implement
 */
export interface PixoPlugin<TConfig = any> {
  /** Unique plugin identifier */
  readonly name: string;

  /** Plugin version (semver) */
  readonly version: string;

  /** Plugin dependencies (other plugin names) */
  readonly dependencies?: string[];

  /** Required connectors */
  readonly requiredConnectors?: string[];

  /** Initialize plugin with config and context */
  init(config: TConfig, context: PluginContext): Promise<void>;

  /** Start plugin (called after all plugins initialized) */
  start?(): Promise<void>;

  /** Stop plugin (cleanup) */
  stop?(): Promise<void>;

  /** Get plugin health status */
  getStatus?(): PluginStatus;

  /** Get public API surface */
  getAPI?(): Record<string, any>;
}

/**
 * Context provided to plugins during initialization
 */
export interface PluginContext {
  /** Logger instance */
  logger: Logger;

  /** Event bus for inter-plugin communication */
  eventBus: EventBus;

  /** Access to connectors */
  connectors: ConnectorHub;

  /** Access to other plugins */
  plugins: PluginRegistry;

  /** Config resolver */
  config: ConfigResolver;
}

/**
 * Plugin health status
 */
export interface PluginStatus {
  healthy: boolean;
  message?: string;
  metrics?: Record<string, number | string | boolean>;
  lastCheck?: Date;
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: Error, meta?: any): void;
}

/**
 * Event bus for inter-plugin communication
 */
export interface EventBus {
  on(event: string, handler: (...args: any[]) => void | Promise<void>): void;
  off(event: string, handler: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): Promise<void>;
  once(event: string, handler: (...args: any[]) => void | Promise<void>): void;
}

/**
 * Connector hub for external services
 */
export interface ConnectorHub {
  get<T = any>(name: string): T;
  register(name: string, connector: any): void;
  has(name: string): boolean;
  list(): string[];
}

/**
 * Plugin registry
 */
export interface PluginRegistry {
  get<T = any>(name: string): T;
  register(plugin: PixoPlugin): Promise<void>;
  has(name: string): boolean;
  list(): string[];
  getAll(): Map<string, PixoPlugin>;
}

/**
 * Config resolver for accessing configuration values
 */
export interface ConfigResolver {
  get<T = any>(path: string, defaultValue?: T): T;
  set(path: string, value: any): void;
  has(path: string): boolean;
  getAll(): any;
}

/**
 * Base connector interface
 */
export interface Connector<TConfig = any> {
  readonly name: string;
  readonly type: ConnectorType;
  init(config: TConfig): Promise<void>;
  isHealthy(): Promise<boolean>;
  disconnect?(): Promise<void>;
}

/**
 * Connector types
 */
export type ConnectorType = 
  | 'database'
  | 'ai'
  | 'payment'
  | 'analytics'
  | 'storage'
  | 'social'
  | 'custom';
