import { z } from 'zod';

/**
 * Zod schema for pixo.config.json
 */
export const PixoConfigSchema = z.object({
  /** Project metadata */
  project_name: z.string().min(1, 'Project name is required'),
  version: z.string().optional(),
  description: z.string().optional(),

  /** Connector configurations */
  connectors: z.object({
    /** Database connector (Supabase, Firebase, Postgres) */
    supabase: z.object({
      url: z.string().url(),
      anonKey: z.string().optional(),
      serviceKey: z.string().optional(),
      config: z.record(z.any()).optional(),
    }).optional(),

    /** AI connector (Gemini, OpenAI, Anthropic, DeepSeek) */
    ai: z.object({
      provider: z.enum(['gemini', 'openai', 'anthropic', 'deepseek', 'openrouter']),
      apiKey: z.string(),
      fallback: z.string().optional(),
      models: z.array(z.string()).optional(),
      config: z.record(z.any()).optional(),
    }).optional(),

    /** Analytics connectors */
    analytics: z.array(z.object({
      provider: z.enum(['posthog', 'ga4', 'mixpanel', 'amplitude']),
      apiKey: z.string(),
      projectId: z.string().optional(),
      config: z.record(z.any()).optional(),
    })).optional(),

    /** Payment connector (Stripe, Instapay, VF Cash, PayPal) */
    payments: z.object({
      provider: z.enum(['stripe', 'instapay', 'vf-cash', 'paypal']),
      apiKey: z.string(),
      webhookSecret: z.string().optional(),
      config: z.record(z.any()).optional(),
    }).optional(),

    /** Storage connector (S3, Cloudflare R2, Supabase Storage) */
    storage: z.object({
      provider: z.enum(['s3', 'r2', 'supabase']),
      bucket: z.string(),
      region: z.string().optional(),
      config: z.record(z.any()).optional(),
    }).optional(),
  }).optional(),

  /** Module configurations */
  modules: z.object({
    pixoguard: z.union([
      z.boolean(),
      z.object({
        enabled: z.boolean(),
        config: z.record(z.any()).optional(),
      }),
    ]).optional(),

    logic_guardian: z.union([
      z.boolean(),
      z.object({
        enabled: z.boolean(),
        config: z.record(z.any()).optional(),
      }),
    ]).optional(),

    weavai: z.union([
      z.boolean(),
      z.object({
        enabled: z.boolean(),
        config: z.record(z.any()).optional(),
      }),
    ]).optional(),

    pixopay: z.union([
      z.boolean(),
      z.object({
        enabled: z.boolean(),
        config: z.record(z.any()).optional(),
      }),
    ]).optional(),

    lumina: z.union([
      z.boolean(),
      z.object({
        enabled: z.boolean(),
        config: z.record(z.any()).optional(),
      }),
    ]).optional(),

    admin_dashboard: z.union([
      z.boolean(),
      z.object({
        enabled: z.boolean(),
        config: z.record(z.any()).optional(),
      }),
    ]).optional(),

    intelligence_core: z.union([
      z.boolean(),
      z.object({
        enabled: z.boolean(),
        config: z.record(z.any()).optional(),
      }),
    ]).optional(),
  }).passthrough().optional(),

  /** Global settings */
  telemetry: z.object({
    enabled: z.boolean().default(true),
    anonymous: z.boolean().default(true),
  }).optional(),

  locale: z.enum(['en', 'ar']).default('en').optional(),

  /** Environment (development, staging, production) */
  environment: z.enum(['development', 'staging', 'production']).default('development').optional(),
});

export type PixoConfig = z.infer<typeof PixoConfigSchema>;

/**
 * Module configuration type
 */
export type ModuleConfig = boolean | {
  enabled: boolean;
  config?: Record<string, any>;
};

/**
 * Helper to check if module is enabled
 */
export function isModuleEnabled(moduleConfig: ModuleConfig | undefined): boolean {
  if (moduleConfig === undefined) return false;
  if (typeof moduleConfig === 'boolean') return moduleConfig;
  return moduleConfig.enabled;
}

/**
 * Helper to get module config
 */
export function getModuleConfig(moduleConfig: ModuleConfig | undefined): Record<string, any> {
  if (!moduleConfig || typeof moduleConfig === 'boolean') return {};
  return moduleConfig.config || {};
}
