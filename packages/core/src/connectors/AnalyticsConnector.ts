import type { Connector } from '../types/Plugin';

export type AnalyticsProvider = 'posthog' | 'ga4' | 'mixpanel' | 'amplitude';

export interface AnalyticsConfig {
  provider: AnalyticsProvider;
  apiKey: string;
  projectId?: string;
  config?: Record<string, unknown>;
}

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  userId?: string;
  timestamp?: Date;
}

/**
 * Unified analytics connector for multi-provider analytics
 */
export class AnalyticsConnector implements Connector<AnalyticsConfig> {
  readonly name = 'analytics';
  readonly type = 'analytics' as const;

  private config?: AnalyticsConfig;
  private provider?: unknown;

  async init(config: AnalyticsConfig): Promise<void> {
    this.config = config;

    switch (config.provider) {
      case 'posthog':
        await this.initPostHog(config);
        break;
      case 'ga4':
        await this.initGA4(config);
        break;
      case 'mixpanel':
        await this.initMixpanel(config);
        break;
      case 'amplitude':
        await this.initAmplitude(config);
        break;
      default:
        throw new Error(`Unsupported analytics provider: ${config.provider}`);
    }
  }

  async isHealthy(): Promise<boolean> {
    return this.provider !== undefined;
  }

  async disconnect(): Promise<void> {
    if (this.provider && this.config?.provider === 'posthog') {
      const posthog = this.provider as { shutdown: () => Promise<void> };
      await posthog.shutdown();
    }
    this.provider = undefined;
    this.config = undefined;
  }

  /**
   * Track an event
   */
  async track(event: AnalyticsEvent): Promise<void> {
    if (!this.provider || !this.config) {
      throw new Error('Analytics connector not initialized');
    }

    try {
      switch (this.config.provider) {
        case 'posthog':
          await this.trackPostHog(event);
          break;
        case 'ga4':
          await this.trackGA4(event);
          break;
        case 'mixpanel':
          await this.trackMixpanel(event);
          break;
        case 'amplitude':
          await this.trackAmplitude(event);
          break;
      }
    } catch (error) {
      // Don't throw on analytics errors, just log
      console.error(`Analytics tracking failed: ${(error as Error).message}`);
    }
  }

  /**
   * Identify a user
   */
  async identify(userId: string, properties?: Record<string, unknown>): Promise<void> {
    if (!this.provider || !this.config) {
      throw new Error('Analytics connector not initialized');
    }

    try {
      switch (this.config.provider) {
        case 'posthog': {
          const posthog = this.provider as { identify: (userId: string, properties?: Record<string, unknown>) => void };
          posthog.identify(userId, properties);
          break;
        }
        case 'mixpanel': {
          const mixpanel = this.provider as { identify: (userId: string) => void; people: { set: (properties: Record<string, unknown>) => void } };
          mixpanel.identify(userId);
          if (properties) {
            mixpanel.people.set(properties);
          }
          break;
        }
        case 'amplitude': {
          const amplitude = this.provider as { setUserId: (userId: string) => void };
          amplitude.setUserId(userId);
          break;
        }
      }
    } catch (error) {
      console.error(`Analytics identify failed: ${(error as Error).message}`);
    }
  }

  private async initPostHog(config: AnalyticsConfig): Promise<void> {
    const { PostHog } = await import('posthog-node');
    this.provider = new PostHog(config.apiKey, config.config);
  }

  private async initGA4(_config: AnalyticsConfig): Promise<void> {
    // GA4 client-side only
    this.provider = { type: 'ga4' };
  }

  private async initMixpanel(config: AnalyticsConfig): Promise<void> {
    const Mixpanel = await import('mixpanel');
    this.provider = Mixpanel.default.init(config.apiKey);
  }

  private async initAmplitude(_config: AnalyticsConfig): Promise<void> {
    // Amplitude initialization
    this.provider = { type: 'amplitude' };
  }

  private async trackPostHog(event: AnalyticsEvent): Promise<void> {
    const posthog = this.provider as { capture: (params: { distinctId: string; event: string; properties?: Record<string, unknown> }) => void };
    posthog.capture({
      distinctId: event.userId || 'anonymous',
      event: event.name,
      properties: event.properties,
    });
  }

  private async trackGA4(event: AnalyticsEvent): Promise<void> {
    // GA4 implementation (client-side only)
    console.warn('GA4 tracking should be done client-side');
  }

  private async trackMixpanel(event: AnalyticsEvent): Promise<void> {
    const mixpanel = this.provider as { track: (event: string, properties?: Record<string, unknown>) => void };
    mixpanel.track(event.name, {
      ...event.properties,
      distinct_id: event.userId,
    });
  }

  private async trackAmplitude(event: AnalyticsEvent): Promise<void> {
    // Amplitude implementation
    console.log('Amplitude track:', event);
  }
}
