import { describe, it, expect, afterEach } from 'vitest';
import { createWeavAIService } from './service';

describe('WeavAIService', () => {
  let service = createWeavAIService();

  afterEach(async () => {
    await service.shutdown();
    service = createWeavAIService();
  });

  it('returns unavailable result when connectors are not configured', async () => {
    const result = await service.analyzePrompt({ prompt: 'Test prompt' });
    expect(result.available).toBe(false);
    expect(result.reason).toBe('weavai_not_ready');
  });
});
