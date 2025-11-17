import type { WeavAIConnectorConfig } from './legacy-types';

const FORCE_CONNECTORS_KEY = 'WEAVAI_FORCE_CONNECTORS';

type EnvSource = Record<string, string | undefined>;

const getImportMetaEnv = (): EnvSource => {
  try {
    return (import.meta as unknown as { env?: EnvSource })?.env ?? {};
  } catch {
    return {};
  }
};

const getProcessEnv = (): EnvSource => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env as EnvSource;
  }
  return {};
};

function readEnv(...keys: string[]): string | undefined {
  const sources = [getImportMetaEnv(), getProcessEnv()];
  for (const source of sources) {
    for (const key of keys) {
      const value = source?.[key];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }
  }
  return undefined;
}

export function resolveWeavAIConnectorConfig(): WeavAIConnectorConfig {
  if (shouldDisableConnectors()) {
    return {};
  }

  const connectors: WeavAIConnectorConfig = {};

  const geminiKey = readEnv('VITE_GEMINI_API_KEY', 'GEMINI_API_KEY', 'API_KEY');
  if (geminiKey) {
    connectors.gemini = {
      apiKey: geminiKey,
      defaultModel: readEnv('VITE_GEMINI_MODEL', 'GEMINI_MODEL') || 'gemini-2.5-flash',
    };
  }

  const openaiKey = readEnv('VITE_OPENAI_API_KEY', 'OPENAI_API_KEY');
  if (openaiKey) {
    connectors.openai = {
      apiKey: openaiKey,
      defaultModel: readEnv('VITE_OPENAI_MODEL', 'OPENAI_MODEL') || 'gpt-4o-mini',
    };
  }

  const anthropicKey = readEnv('VITE_ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY');
  if (anthropicKey) {
    connectors.anthropic = {
      apiKey: anthropicKey,
      defaultModel: readEnv('VITE_ANTHROPIC_MODEL', 'ANTHROPIC_MODEL') || 'claude-3-5-sonnet-latest',
    };
  }

  const deepSeekKey = readEnv('VITE_DEEPSEEK_API_KEY', 'DEEPSEEK_API_KEY');
  if (deepSeekKey) {
    connectors.deepseek = {
      apiKey: deepSeekKey,
      defaultModel: readEnv('VITE_DEEPSEEK_MODEL', 'DEEPSEEK_MODEL') || 'deepseek-chat',
    };
  }

  const openRouterKey = readEnv('VITE_OPENROUTER_API_KEY', 'OPENROUTER_API_KEY');
  if (openRouterKey) {
    connectors.openrouter = {
      apiKey: openRouterKey,
      defaultModel: readEnv('VITE_OPENROUTER_MODEL', 'OPENROUTER_MODEL') || 'openrouter/cinematika-7b',
    };
  }

  return connectors;
}

function isTestEnvironment(): boolean {
  const metaMode = (() => {
    try {
      return (import.meta as unknown as { env?: EnvSource })?.env?.MODE;
    } catch {
      return undefined;
    }
  })();

  if (metaMode === 'test') {
    return true;
  }

  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return true;
  }

  return false;
}

function shouldDisableConnectors(): boolean {
  const processEnv = getProcessEnv();
  if (processEnv[FORCE_CONNECTORS_KEY] === 'true') {
    return false;
  }
  return isTestEnvironment();
}
