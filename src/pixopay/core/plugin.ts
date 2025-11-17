import type { PixoPlugin, PluginContext } from '@pixora/pixolink';
import { InstapayAdapter } from './adapters/InstapayAdapter';
import { VFCashAdapter } from './adapters/VFCashAdapter';
import { StripeAdapter } from './adapters/StripeAdapter';
import { TransactionManager } from './TransactionManager';
import type {
  PaymentAdapter,
  PaymentProvider,
  PaymentRequest,
  PaymentResult,
  RefundRequest,
  RefundResult,
  WebhookEvent,
  Transaction,
  StripeConfig,
  InstapayConfig,
  VFCashConfig,
} from './types';

// ============================================================================
// Plugin Configuration
// ============================================================================

export interface PixoPayPluginConfig {
  /**
   * Default payment provider
   */
  defaultProvider: PaymentProvider;

  /**
   * Provider-specific configurations
   */
  providers: {
    stripe?: StripeConfig;
    instapay?: InstapayConfig;
    'vf-cash'?: VFCashConfig;
  };

  /**
   * Enable transaction tracking
   * @default true
   */
  enableTransactionTracking?: boolean;

  /**
   * Auto-check stale transactions interval (minutes)
   * Set to 0 to disable
   * @default 30
   */
  staleTransactionCheckInterval?: number;

  /**
   * Debug mode
   * @default false
   */
  debug?: boolean;
}

// ============================================================================
// Plugin API
// ============================================================================

export interface PixoPayAPI {
  /**
   * Create a payment
   */
  createPayment(request: PaymentRequest, provider?: PaymentProvider): Promise<PaymentResult>;

  /**
   * Get payment status
   */
  getPaymentStatus(transactionId: string, provider?: PaymentProvider): Promise<PaymentResult>;

  /**
   * Refund a payment
   */
  refundPayment(request: RefundRequest, provider?: PaymentProvider): Promise<RefundResult>;

  /**
   * Verify webhook signature and parse event
   */
  verifyWebhook(
    provider: PaymentProvider,
    payload: string,
    signature: string
  ): Promise<WebhookEvent>;

  /**
   * Get transaction by ID
   */
  getTransaction(transactionId: string): Transaction | undefined;

  /**
   * Get all transactions
   */
  getAllTransactions(): Transaction[];

  /**
   * Get transactions by status
   */
  getTransactionsByStatus(status: Transaction['status']): Transaction[];

  /**
   * Get available providers
   */
  getProviders(): PaymentProvider[];

  /**
   * Check if provider is available
   */
  isProviderAvailable(provider: PaymentProvider): boolean;

  /**
   * Get statistics
   */
  getStats(): {
    transactions: ReturnType<TransactionManager['getStats']>;
    providers: Record<PaymentProvider, { healthy: boolean; adapter: string }>;
  };
}

// ============================================================================
// PixoPay Plugin Implementation
// ============================================================================

export class PixoPayPlugin implements PixoPlugin<PixoPayPluginConfig, PixoPayAPI> {
  readonly name = 'pixopay';
  readonly version = '1.0.0';

  private config?: PixoPayPluginConfig;
  private context?: PluginContext;
  private adapters: Map<PaymentProvider, PaymentAdapter> = new Map();
  private transactionManager: TransactionManager = new TransactionManager();
  private staleCheckInterval?: ReturnType<typeof setInterval>;

  async init(config: PixoPayPluginConfig, context: PluginContext): Promise<void> {
    this.config = config;
    this.context = context;

    context.logger.info('Initializing PixoPay plugin', {
      defaultProvider: config.defaultProvider,
      providers: Object.keys(config.providers),
    });

    // Initialize adapters
    await this.initializeAdapters();

    // Setup stale transaction checker
    if (config.staleTransactionCheckInterval && config.staleTransactionCheckInterval > 0) {
      this.startStaleTransactionChecker();
    }

    context.logger.info('PixoPay plugin initialized', {
      adaptersCount: this.adapters.size,
      transactionTracking: config.enableTransactionTracking ?? true,
    });
  }

  async start(): Promise<void> {
    if (!this.context) {
      throw new Error('Plugin not initialized');
    }

    this.context.logger.info('PixoPay plugin started', {
      providers: Array.from(this.adapters.keys()),
    });

    this.context.eventBus.emit('pixopay:started', {
      providers: Array.from(this.adapters.keys()),
      defaultProvider: this.config?.defaultProvider,
    });
  }

  async stop(): Promise<void> {
    if (!this.context) return;

    // Stop stale transaction checker
    if (this.staleCheckInterval) {
      clearInterval(this.staleCheckInterval);
      this.staleCheckInterval = undefined;
    }

    this.context.logger.info('PixoPay plugin stopped');
    this.context.eventBus.emit('pixopay:stopped', {});
  }

  async getStatus(): Promise<{
    ready: boolean;
    providers: Record<PaymentProvider, boolean>;
    transactions: number;
  }> {
    const providerStatus: Record<PaymentProvider, boolean> = {} as Record<PaymentProvider, boolean>;

    for (const [provider, adapter] of this.adapters.entries()) {
      providerStatus[provider] = await adapter.isHealthy();
    }

    return {
      ready: this.adapters.size > 0,
      providers: providerStatus,
      transactions: this.transactionManager.count(),
    };
  }

  getAPI(): PixoPayAPI {
    return {
      createPayment: this.createPayment.bind(this),
      getPaymentStatus: this.getPaymentStatus.bind(this),
      refundPayment: this.refundPayment.bind(this),
      verifyWebhook: this.verifyWebhook.bind(this),
      getTransaction: this.getTransaction.bind(this),
      getAllTransactions: this.getAllTransactions.bind(this),
      getTransactionsByStatus: this.getTransactionsByStatus.bind(this),
      getProviders: this.getProviders.bind(this),
      isProviderAvailable: this.isProviderAvailable.bind(this),
      getStats: this.getStats.bind(this),
    };
  }

  // ============================================================================
  // API Implementation
  // ============================================================================

  private async createPayment(
    request: PaymentRequest,
    provider?: PaymentProvider
  ): Promise<PaymentResult> {
    const selectedProvider = provider || this.config?.defaultProvider;
    if (!selectedProvider) {
      throw new Error('No payment provider specified');
    }

    const adapter = this.adapters.get(selectedProvider);
    if (!adapter) {
      throw new Error(`Payment provider ${selectedProvider} not configured`);
    }

    const startTime = Date.now();

    try {
      this.context?.logger.info('Creating payment', {
        provider: selectedProvider,
        amount: request.amount,
        currency: request.currency,
      });

      const result = await adapter.createPayment(request);

      // Track transaction
      if (this.config?.enableTransactionTracking !== false) {
        this.transactionManager.createTransaction(result);
      }

      const latency = Date.now() - startTime;

      this.context?.eventBus.emit('pixopay:payment:created', {
        transactionId: result.transactionId,
        provider: selectedProvider,
        amount: request.amount,
        currency: request.currency,
        status: result.status,
        latency,
      });

      this.context?.logger.info('Payment created', {
        transactionId: result.transactionId,
        status: result.status,
        latency,
      });

      return result;
    } catch (error) {
      this.context?.logger.error('Payment creation failed', {
        provider: selectedProvider,
        error: (error as Error).message,
      });

      this.context?.eventBus.emit('pixopay:payment:error', {
        provider: selectedProvider,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  private async getPaymentStatus(
    transactionId: string,
    provider?: PaymentProvider
  ): Promise<PaymentResult> {
    // Try to find transaction to determine provider
    const transaction = this.transactionManager.getTransaction(transactionId);
    const selectedProvider = provider || transaction?.provider || this.config?.defaultProvider;

    if (!selectedProvider) {
      throw new Error('Cannot determine payment provider');
    }

    const adapter = this.adapters.get(selectedProvider);
    if (!adapter) {
      throw new Error(`Payment provider ${selectedProvider} not configured`);
    }

    try {
      const result = await adapter.getPaymentStatus(transactionId);

      // Update transaction
      if (this.config?.enableTransactionTracking !== false && transaction) {
        this.transactionManager.updateStatus(transactionId, result.status, result.metadata);
      }

      return result;
    } catch (error) {
      this.context?.logger.error('Failed to get payment status', {
        transactionId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  private async refundPayment(
    request: RefundRequest,
    provider?: PaymentProvider
  ): Promise<RefundResult> {
    // Find transaction to determine provider
    const transaction = this.transactionManager.getTransaction(request.transactionId);
    const selectedProvider = provider || transaction?.provider;

    if (!selectedProvider) {
      throw new Error('Cannot determine payment provider for refund');
    }

    const adapter = this.adapters.get(selectedProvider);
    if (!adapter) {
      throw new Error(`Payment provider ${selectedProvider} not configured`);
    }

    try {
      this.context?.logger.info('Processing refund', {
        transactionId: request.transactionId,
        amount: request.amount,
      });

      const result = await adapter.refundPayment(request);

      // Update transaction
      if (this.config?.enableTransactionTracking !== false && result.success) {
        this.transactionManager.updateStatus(request.transactionId, 'refunded', {
          refundId: result.refundId,
          refundAmount: result.amount,
        });
      }

      this.context?.eventBus.emit('pixopay:payment:refunded', {
        transactionId: request.transactionId,
        refundId: result.refundId,
        amount: result.amount,
      });

      return result;
    } catch (error) {
      this.context?.logger.error('Refund failed', {
        transactionId: request.transactionId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  private async verifyWebhook(
    provider: PaymentProvider,
    payload: string,
    signature: string
  ): Promise<WebhookEvent> {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`Payment provider ${provider} not configured`);
    }

    try {
      const event = await adapter.verifyWebhook(payload, signature);

      // Update transaction based on webhook event
      if (this.config?.enableTransactionTracking !== false) {
        const statusMap: Record<WebhookEvent['type'], Transaction['status']> = {
          'payment.success': 'completed',
          'payment.failed': 'failed',
          'payment.cancelled': 'cancelled',
          'payment.refunded': 'refunded',
        };

        const newStatus = statusMap[event.type];
        if (newStatus) {
          try {
            this.transactionManager.updateStatus(event.transactionId, newStatus, event.data);
          } catch {
            // Transaction might not exist yet
          }
        }
      }

      this.context?.eventBus.emit('pixopay:webhook:received', {
        provider,
        eventType: event.type,
        transactionId: event.transactionId,
      });

      return event;
    } catch (error) {
      this.context?.logger.error('Webhook verification failed', {
        provider,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  private getTransaction(transactionId: string): Transaction | undefined {
    return this.transactionManager.getTransaction(transactionId);
  }

  private getAllTransactions(): Transaction[] {
    return this.transactionManager.getAllTransactions();
  }

  private getTransactionsByStatus(status: Transaction['status']): Transaction[] {
    return this.transactionManager.getTransactionsByStatus(status);
  }

  private getProviders(): PaymentProvider[] {
    return Array.from(this.adapters.keys());
  }

  private isProviderAvailable(provider: PaymentProvider): boolean {
    return this.adapters.has(provider);
  }

  private getStats() {
    const providerStatus: Record<PaymentProvider, { healthy: boolean; adapter: string }> = {
      stripe: { healthy: false, adapter: '' },
      instapay: { healthy: false, adapter: '' },
      'vf-cash': { healthy: false, adapter: '' },
    };

    for (const [provider, adapter] of this.adapters.entries()) {
      providerStatus[provider] = {
        healthy: false, // Will be checked async
        adapter: adapter.constructor.name,
      };
    }

    return {
      transactions: this.transactionManager.getStats(),
      providers: providerStatus,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async initializeAdapters(): Promise<void> {
    if (!this.config) return;

    // Initialize Stripe
    if (this.config.providers.stripe) {
      const adapter = new StripeAdapter();
      await adapter.init(this.config.providers.stripe);
      this.adapters.set('stripe', adapter);
      this.context?.logger.info('Stripe adapter initialized');
    }

    // Initialize Instapay
    if (this.config.providers.instapay) {
      const adapter = new InstapayAdapter();
      await adapter.init(this.config.providers.instapay);
      this.adapters.set('instapay', adapter);
      this.context?.logger.info('Instapay adapter initialized');
    }

    // Initialize VF Cash
    if (this.config.providers['vf-cash']) {
      const adapter = new VFCashAdapter();
      await adapter.init(this.config.providers['vf-cash']);
      this.adapters.set('vf-cash', adapter);
      this.context?.logger.info('VF Cash adapter initialized');
    }

    if (this.adapters.size === 0) {
      throw new Error('No payment providers configured');
    }
  }

  private startStaleTransactionChecker(): void {
    if (!this.config) return;

    const intervalMinutes = this.config.staleTransactionCheckInterval || 30;

    this.staleCheckInterval = setInterval(() => {
      const staleTransactions = this.transactionManager.getStaleTransactions(intervalMinutes);

      if (staleTransactions.length > 0) {
        this.context?.logger.warn('Found stale transactions', {
          count: staleTransactions.length,
          transactions: staleTransactions.map((tx) => ({
            id: tx.id,
            provider: tx.provider,
            status: tx.status,
            age: Math.round((Date.now() - tx.createdAt.getTime()) / 60000), // minutes
          })),
        });

        this.context?.eventBus.emit('pixopay:stale:transactions', {
          count: staleTransactions.length,
          transactions: staleTransactions,
        });
      }
    }, intervalMinutes * 60 * 1000);
  }
}
