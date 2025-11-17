import type { Connector } from '../types/Plugin';

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'openrouter';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  fallback?: AIProvider;
  models?: string[];
  config?: Record<string, unknown>;
}

export interface AIGenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  stream?: boolean;
}

export interface AIGenerateResult {
  text: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Unified AI connector for multi-provider AI operations
 */
export class AIConnector implements Connector<AIConfig> {
  readonly name = 'ai-core';
  readonly type = 'ai' as const;

  private config?: AIConfig;
  private provider?: unknown;

  async init(config: AIConfig): Promise<void> {
    this.config = config;

    // Initialize provider based on config
    switch (config.provider) {
      case 'gemini':
        await this.initGemini(config);
        break;
      case 'openai':
        await this.initOpenAI(config);
        break;
      case 'anthropic':
        await this.initAnthropic(config);
        break;
      case 'deepseek':
        await this.initDeepSeek(config);
        break;
      case 'openrouter':
        await this.initOpenRouter(config);
        break;
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  }

  async isHealthy(): Promise<boolean> {
    return this.provider !== undefined;
  }

  async disconnect(): Promise<void> {
    this.provider = undefined;
    this.config = undefined;
  }

  /**
   * Generate AI response
   */
  async generate(prompt: string, options: AIGenerateOptions = {}): Promise<AIGenerateResult> {
    if (!this.provider || !this.config) {
      throw new Error('AI connector not initialized');
    }

    try {
      switch (this.config.provider) {
        case 'gemini':
          return await this.generateGemini(prompt, options);
        case 'openai':
          return await this.generateOpenAI(prompt, options);
        case 'anthropic':
          return await this.generateAnthropic(prompt, options);
        default:
          throw new Error(`Generation not implemented for ${this.config.provider}`);
      }
    } catch (error) {
      throw new Error(`AI generation failed: ${(error as Error).message}`);
    }
  }

  private async initGemini(config: AIConfig): Promise<void> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    this.provider = new GoogleGenerativeAI(config.apiKey);
  }

  private async initOpenAI(config: AIConfig): Promise<void> {
    const { OpenAI } = await import('openai');
    this.provider = new OpenAI({ apiKey: config.apiKey });
  }

  private async initAnthropic(config: AIConfig): Promise<void> {
    const { Anthropic } = await import('@anthropic-ai/sdk');
    this.provider = new Anthropic({ apiKey: config.apiKey });
  }

  private async initDeepSeek(_config: AIConfig): Promise<void> {
    // DeepSeek uses OpenAI-compatible API
    this.provider = { type: 'deepseek' };
  }

  private async initOpenRouter(_config: AIConfig): Promise<void> {
    // OpenRouter uses OpenAI-compatible API
    this.provider = { type: 'openrouter' };
  }

  private async generateGemini(prompt: string, options: AIGenerateOptions): Promise<AIGenerateResult> {
    const genAI = this.provider as { getGenerativeModel: (config: { model: string }) => { generateContent: (prompt: string) => Promise<{ response: { text: () => string; usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number } } }> } };
    const model = genAI.getGenerativeModel({
      model: options.model || 'gemini-2.0-flash-exp',
    });

    const fullPrompt = options.systemPrompt ? `${options.systemPrompt}\n\n${prompt}` : prompt;
    const result = await model.generateContent(fullPrompt);
    const response = result.response;

    return {
      text: response.text(),
      model: options.model || 'gemini-2.0-flash-exp',
      usage: response.usageMetadata ? {
        inputTokens: response.usageMetadata.promptTokenCount,
        outputTokens: response.usageMetadata.candidatesTokenCount,
      } : undefined,
    };
  }

  private async generateOpenAI(prompt: string, options: AIGenerateOptions): Promise<AIGenerateResult> {
    const openai = this.provider as { chat: { completions: { create: (params: { model: string; messages: Array<{ role: string; content: string }>; temperature?: number; max_tokens?: number }) => Promise<{ choices: Array<{ message: { content: string } }>; usage?: { prompt_tokens: number; completion_tokens: number }; model: string }> } } };

    const messages: Array<{ role: string; content: string }> = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const completion = await openai.chat.completions.create({
      model: options.model || 'gpt-4o',
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    });

    return {
      text: completion.choices[0].message.content || '',
      model: completion.model,
      usage: completion.usage ? {
        inputTokens: completion.usage.prompt_tokens,
        outputTokens: completion.usage.completion_tokens,
      } : undefined,
    };
  }

  private async generateAnthropic(prompt: string, options: AIGenerateOptions): Promise<AIGenerateResult> {
    const anthropic = this.provider as { messages: { create: (params: { model: string; max_tokens: number; system?: string; messages: Array<{ role: string; content: string }> }) => Promise<{ content: Array<{ text: string }>; usage: { input_tokens: number; output_tokens: number }; model: string }> } };

    const result = await anthropic.messages.create({
      model: options.model || 'claude-3-5-sonnet-20241022',
      max_tokens: options.maxTokens || 4096,
      system: options.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    return {
      text: result.content[0].text,
      model: result.model,
      usage: {
        inputTokens: result.usage.input_tokens,
        outputTokens: result.usage.output_tokens,
      },
    };
  }
}
