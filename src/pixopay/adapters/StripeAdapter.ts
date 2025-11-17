import Stripe from 'stripe';
import type {
  PaymentAdapter,
  PaymentRequest,
  PaymentResult,
  RefundRequest,
  RefundResult,
  WebhookEvent,
  StripeConfig,
} from '../types';

/**
 * Stripe Payment Adapter
 * 
 * Comprehensive Stripe integration supporting:
 * - Payment Intents (3D Secure, SCA)
 * - Subscriptions
 * - Refunds
 * - Webhooks
 * - Multi-currency
 * 
 * API Documentation: https://stripe.com/docs/api
 */
export class StripeAdapter implements PaymentAdapter {
  readonly provider = 'stripe' as const;
  
  private stripe?: Stripe;
  private config?: StripeConfig;

  async init(config: StripeConfig): Promise<void> {
    this.config = config;
    
    this.stripe = new Stripe(config.apiKey, {
      apiVersion: (config.apiVersion as Stripe.LatestApiVersion) || '2024-12-18.acacia',
      typescript: true,
    });
    
    // Verify API key is valid
    await this.validateApiKey();
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResult> {
    if (!this.stripe) {
      throw new Error('Stripe adapter not initialized');
    }

    try {
      // Create a Payment Intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: this.convertToMinorUnits(request.amount, request.currency),
        currency: request.currency.toLowerCase(),
        description: request.description,
        metadata: {
          ...(request.metadata || {}),
          customer_name: request.customer?.name,
          customer_email: request.customer?.email,
          customer_phone: request.customer?.phone,
        },
        // Enable automatic payment methods
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'always',
        },
        // Receipt email
        receipt_email: request.customer?.email,
        // Setup for future usage (optional)
        setup_future_usage: request.metadata?.save_card === 'true' ? 'off_session' : undefined,
      });

      return {
        success: true,
        transactionId: paymentIntent.id,
        status: this.mapStripeStatus(paymentIntent.status),
        amount: request.amount,
        currency: request.currency,
        provider: 'stripe',
        paymentUrl: paymentIntent.client_secret 
          ? `https://checkout.stripe.com/pay/${paymentIntent.client_secret}`
          : undefined,
        message: 'Payment intent created successfully',
        metadata: {
          clientSecret: paymentIntent.client_secret,
          nextAction: paymentIntent.next_action,
          paymentMethod: paymentIntent.payment_method,
        },
        createdAt: new Date(paymentIntent.created * 1000),
      };
    } catch (error) {
      const stripeError = error as Stripe.StripeError;
      return {
        success: false,
        transactionId: '',
        status: 'failed',
        amount: request.amount,
        currency: request.currency,
        provider: 'stripe',
        message: stripeError.message || 'Payment creation failed',
        metadata: {
          errorCode: stripeError.code,
          errorType: stripeError.type,
        },
        createdAt: new Date(),
      };
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentResult> {
    if (!this.stripe) {
      throw new Error('Stripe adapter not initialized');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(transactionId);

      return {
        success: paymentIntent.status === 'succeeded',
        transactionId: paymentIntent.id,
        status: this.mapStripeStatus(paymentIntent.status),
        amount: this.convertFromMinorUnits(paymentIntent.amount, paymentIntent.currency),
        currency: paymentIntent.currency.toUpperCase() as PaymentResult['currency'],
        provider: 'stripe',
        metadata: {
          paymentMethod: paymentIntent.payment_method,
          charges: paymentIntent.charges,
          amountReceived: paymentIntent.amount_received,
        },
        createdAt: new Date(paymentIntent.created * 1000),
      };
    } catch (error) {
      throw new Error(`Failed to get payment status: ${(error as Error).message}`);
    }
  }

  async refundPayment(request: RefundRequest): Promise<RefundResult> {
    if (!this.stripe) {
      throw new Error('Stripe adapter not initialized');
    }

    try {
      // Get the payment intent to find the charge
      const paymentIntent = await this.stripe.paymentIntents.retrieve(request.transactionId);
      
      if (!paymentIntent.latest_charge) {
        throw new Error('No charge found for this payment');
      }

      // Create refund
      const refund = await this.stripe.refunds.create({
        charge: paymentIntent.latest_charge as string,
        amount: request.amount 
          ? this.convertToMinorUnits(request.amount, paymentIntent.currency)
          : undefined, // Full refund if amount not specified
        reason: this.mapRefundReason(request.reason),
        metadata: request.metadata,
      });

      return {
        success: true,
        refundId: refund.id,
        transactionId: request.transactionId,
        amount: this.convertFromMinorUnits(refund.amount, refund.currency),
        currency: refund.currency.toUpperCase() as RefundResult['currency'],
        status: refund.status === 'succeeded' ? 'completed' : 'pending',
        message: 'Refund processed successfully',
      };
    } catch (error) {
      const stripeError = error as Stripe.StripeError;
      return {
        success: false,
        refundId: '',
        transactionId: request.transactionId,
        amount: 0,
        currency: 'USD',
        status: 'failed',
        message: stripeError.message || 'Refund failed',
      };
    }
  }

  async verifyWebhook(payload: string, signature: string): Promise<WebhookEvent> {
    if (!this.stripe || !this.config?.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    try {
      // Verify webhook signature
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret
      );

      // Map Stripe event to our webhook event format
      return {
        id: event.id,
        type: this.mapWebhookEventType(event.type),
        provider: 'stripe',
        transactionId: this.extractTransactionId(event),
        data: event.data.object,
        receivedAt: new Date(event.created * 1000),
      };
    } catch (error) {
      throw new Error(`Webhook verification failed: ${(error as Error).message}`);
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.stripe) return false;
    
    try {
      // Try to retrieve account info as a health check
      await this.stripe.accounts.retrieve();
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Additional Stripe-Specific Methods
  // ============================================================================

  /**
   * Capture a payment intent (for manual capture flows)
   */
  async capturePayment(transactionId: string, amount?: number): Promise<PaymentResult> {
    if (!this.stripe) {
      throw new Error('Stripe adapter not initialized');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.capture(transactionId, {
        amount_to_capture: amount ? this.convertToMinorUnits(amount, 'USD') : undefined,
      });

      return {
        success: true,
        transactionId: paymentIntent.id,
        status: this.mapStripeStatus(paymentIntent.status),
        amount: this.convertFromMinorUnits(paymentIntent.amount, paymentIntent.currency),
        currency: paymentIntent.currency.toUpperCase() as PaymentResult['currency'],
        provider: 'stripe',
        message: 'Payment captured successfully',
        createdAt: new Date(paymentIntent.created * 1000),
      };
    } catch (error) {
      throw new Error(`Failed to capture payment: ${(error as Error).message}`);
    }
  }

  /**
   * Cancel a payment intent
   */
  async cancelPayment(transactionId: string): Promise<boolean> {
    if (!this.stripe) {
      throw new Error('Stripe adapter not initialized');
    }

    try {
      await this.stripe.paymentIntents.cancel(transactionId);
      return true;
    } catch (error) {
      throw new Error(`Failed to cancel payment: ${(error as Error).message}`);
    }
  }

  /**
   * Create a customer
   */
  async createCustomer(customer: {
    email?: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, string>;
  }): Promise<string> {
    if (!this.stripe) {
      throw new Error('Stripe adapter not initialized');
    }

    try {
      const stripeCustomer = await this.stripe.customers.create({
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        metadata: customer.metadata,
      });

      return stripeCustomer.id;
    } catch (error) {
      throw new Error(`Failed to create customer: ${(error as Error).message}`);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async validateApiKey(): Promise<void> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      // Try to retrieve balance as a test
      await this.stripe.balance.retrieve();
    } catch (error) {
      throw new Error(`Invalid Stripe API key: ${(error as Error).message}`);
    }
  }

  private mapStripeStatus(status: string): PaymentResult['status'] {
    const statusMap: Record<string, PaymentResult['status']> = {
      requires_payment_method: 'pending',
      requires_confirmation: 'pending',
      requires_action: 'pending',
      processing: 'processing',
      requires_capture: 'processing',
      succeeded: 'completed',
      canceled: 'cancelled',
    };

    return statusMap[status] || 'failed';
  }

  private mapWebhookEventType(type: string): WebhookEvent['type'] {
    const typeMap: Record<string, WebhookEvent['type']> = {
      'payment_intent.succeeded': 'payment.success',
      'payment_intent.payment_failed': 'payment.failed',
      'payment_intent.canceled': 'payment.cancelled',
      'charge.refunded': 'payment.refunded',
    };

    return typeMap[type] || 'payment.failed';
  }

  private extractTransactionId(event: Stripe.Event): string {
    const obj = event.data.object as { id?: string; payment_intent?: string };
    
    // For payment_intent events, use the payment_intent ID directly
    if (event.type.startsWith('payment_intent.')) {
      return obj.id || '';
    }
    
    // For charge events, try to get payment_intent ID
    if (event.type.startsWith('charge.')) {
      return obj.payment_intent || obj.id || '';
    }
    
    return obj.id || '';
  }

  private mapRefundReason(reason?: string): Stripe.RefundCreateParams.Reason | undefined {
    if (!reason) return undefined;

    const reasonMap: Record<string, Stripe.RefundCreateParams.Reason> = {
      duplicate: 'duplicate',
      fraudulent: 'fraudulent',
      requested_by_customer: 'requested_by_customer',
    };

    return reasonMap[reason.toLowerCase()] || 'requested_by_customer';
  }

  private convertToMinorUnits(amount: number, currency: string): number {
    // Most currencies use 2 decimal places (cents)
    // Some currencies like JPY, KRW have no decimal places
    const zeroDecimalCurrencies = ['jpy', 'krw', 'vnd', 'clp'];
    
    if (zeroDecimalCurrencies.includes(currency.toLowerCase())) {
      return Math.round(amount);
    }
    
    return Math.round(amount * 100);
  }

  private convertFromMinorUnits(amount: number, currency: string): number {
    const zeroDecimalCurrencies = ['jpy', 'krw', 'vnd', 'clp'];
    
    if (zeroDecimalCurrencies.includes(currency.toLowerCase())) {
      return amount;
    }
    
    return amount / 100;
  }
}
