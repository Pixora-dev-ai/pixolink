import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { PixoConfigSchema, type PixoConfig } from './schema';

/**
 * Load and validate config from file
 */
export async function loadConfig(path: string): Promise<PixoConfig> {
  const configPath = resolve(process.cwd(), path);

  try {
    // Read file
    const content = await readFile(configPath, 'utf-8');

    // Parse JSON
    const raw = JSON.parse(content);

    // Interpolate environment variables
    const interpolated = interpolateEnvVars(raw);

    // Validate with Zod
    const result = PixoConfigSchema.safeParse(interpolated);

    if (!result.success) {
      throw new Error(`Invalid config: ${result.error.message}`);
    }

    return result.data;
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      throw new Error(`Config file not found: ${configPath}`);
    }
    throw error;
  }
}

/**
 * Replace ${ENV_VAR} with process.env.ENV_VAR
 */
function interpolateEnvVars(obj: any): any {
  if (typeof obj === 'string') {
    // Match ${VAR} or ${VAR:-default}
    const match = obj.match(/^\$\{([^:}]+)(?::-(.*))?\}$/);
    if (match) {
      const envVar = match[1];
      const defaultValue = match[2];
      const value = process.env[envVar];

      if (!value && !defaultValue) {
        throw new Error(`Missing environment variable: ${envVar}`);
      }

      return value || defaultValue;
    }

    // Replace inline ${VAR} references
    return obj.replace(/\$\{([^:}]+)(?::-(.*))?\}/g, (_, envVar, defaultValue) => {
      const value = process.env[envVar];
      if (!value && !defaultValue) {
        throw new Error(`Missing environment variable: ${envVar}`);
      }
      return value || defaultValue || '';
    });
  }

  if (Array.isArray(obj)) {
    return obj.map(interpolateEnvVars);
  }

  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateEnvVars(value);
    }
    return result;
  }

  return obj;
}

/**
 * Load config from TypeScript file (advanced use case)
 */
export async function loadConfigFromModule(path: string): Promise<PixoConfig> {
  const configPath = resolve(process.cwd(), path);

  try {
    const module = await import(configPath);
    const config = module.default || module.config;

    if (!config) {
      throw new Error('Config module must export default or config');
    }

    // Validate
    const result = PixoConfigSchema.safeParse(config);

    if (!result.success) {
      throw new Error(`Invalid config: ${result.error.message}`);
    }

    return result.data;
  } catch (error) {
    throw new Error(`Failed to load config module: ${(error as Error).message}`);
  }
}
