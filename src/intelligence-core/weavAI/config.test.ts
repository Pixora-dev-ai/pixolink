import { describe, it, expect, afterEach } from 'vitest';
import { resolveWeavAIConnectorConfig } from './config';

const originalEnv = { ...process.env };
const touchedKeys = new Set<string>();

function setEnv(key: string, value?: string) {
  touchedKeys.add(key);
  if (typeof value === 'string') {
    process.env[key] = value;
  } else {
    delete process.env[key];
  }
}

afterEach(() => {
  for (const key of touchedKeys) {
    const original = originalEnv[key];
    if (typeof original === 'string') {
      process.env[key] = original;
    } else {
      delete process.env[key];
    }
  }
  touchedKeys.clear();
});

describe('resolveWeavAIConnectorConfig', () => {
  it('returns empty configuration when no env is set', () => {
    setEnv('VITE_OPENAI_API_KEY');
    setEnv('OPENAI_API_KEY');
    setEnv('WEAVAI_FORCE_CONNECTORS');

    const config = resolveWeavAIConnectorConfig();
    expect(config.openai).toBeUndefined();
  });

  it('reads OpenAI key from env variables', () => {
    setEnv('WEAVAI_FORCE_CONNECTORS', 'true');
    setEnv('VITE_OPENAI_API_KEY', 'sk-test');
    setEnv('VITE_OPENAI_MODEL', 'gpt-test');

    const config = resolveWeavAIConnectorConfig();
    expect(config.openai?.apiKey).toBe('sk-test');
    expect(config.openai?.defaultModel).toBe('gpt-test');
  });
});
