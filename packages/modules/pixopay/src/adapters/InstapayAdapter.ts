import crypto from 'crypto';
import type {
  PaymentAdapter,
  PaymentRequest,
  PaymentResult,
  RefundRequest,
  RefundResult,
  WebhookEvent,
  InstapayConfig,
} from '../types';

/**
 * Instapay Payment Adapter for Egypt
 * 
 * Instapay is a leading Egyptian payment gateway supporting:
 * - Card payments (Visa, Mastercard, Meeza)
 * - Mobile wallets (Vodafone Cash, Orange Cash, Etisalat Cash)
 * - Bank transfers
 * 
 * API Documentation: https://developer.instapay.com.eg/
 */
export class InstapayAdapter implements PaymentAdapter {
  readonly provider = 'instapay' as const;
  
  private config?: InstapayConfig;
  private baseUrl: string = 'https://api.instapay.com.eg';

  async init(config: InstapayConfig): Promise<void> {
    this.config = config;
    
    if (config.sandboxMode) {
      this.baseUrl = config.baseUrl || 'https://sandbox.instapay.com.eg';
    } else {
      this.baseUrl = config.baseUrl || 'https://api.instapay.com.eg';
    }
    
    // Validate credentials by making a test API call
    await this.validateCredentials();
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResult> {
    if (!this.config) {
      throw new Error('Instapay adapter not initialized');
    }

    // Generate unique transaction reference
    const transactionRef = `INS_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Prepare Instapay API request
    const paymentData = {
      merchant_id: this.config.merchantId,
      amount: this.convertToMinorUnits(request.amount, request.currency),
      currency: request.currency,
      transaction_ref: transactionRef,
      customer: {
        name: request.customer?.name,
        email: request.customer?.email,
        phone: request.customer?.phone,
      },
      description: request.description,
      return_url: request.returnUrl,
      cancel_url: request.cancelUrl,
      webhook_url: request.webhookUrl,
      metadata: request.metadata,
    };

    // Generate signature
    const signature = this.generateSignature(paymentData);
    
    try {
      const response = await fetch(`${this.baseUrl}/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
          'X-Signature': signature,
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Instapay API error: ${error.message || response.statusText}`);
      }

      const result = await response.json();

      return {
        success: true,
        transactionId: transactionRef,
        status: this.mapInstapayStatus(result.status),
        amount: request.amount,
        currency: request.currency,
        provider: 'instapay',
        paymentUrl: result.payment_url,
        message: result.message,
        metadata: {
          instapayId: result.payment_id,
          expiresAt: result.expires_at,
        },
        createdAt: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        transactionId: transactionRef,
        status: 'failed',
        amount: request.amount,
        currency: request.currency,
        provider: 'instapay',
        message: (error as Error).message,
        createdAt: new Date(),
      };
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentResult> {
    if (!this.config) {
      throw new Error('Instapay adapter not initialized');
    }

    const signature = this.generateSignature({ transaction_ref: transactionId });

    try {
      const response = await fetch(
        `${this.baseUrl}/v1/payments/${encodeURIComponent(transactionId)}`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': this.config.apiKey,
            'X-Signature': signature,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get payment status: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: result.status !== 'failed',
        transactionId,
        status: this.mapInstapayStatus(result.status),
        amount: this.convertFromMinorUnits(result.amount, result.currency),
        currency: result.currency,
        provider: 'instapay',
        metadata: result,
        createdAt: new Date(result.created_at),
      };
    } catch (error) {
      throw new Error(`Failed to get payment status: ${(error as Error).message}`);
    }
  }

  async refundPayment(request: RefundRequest): Promise<RefundResult> {
    if (!this.config) {
      throw new Error('Instapay adapter not initialized');
    }

    const refundData = {
      transaction_ref: request.transactionId,
      amount: request.amount,
      reason: request.reason,
      metadata: request.metadata,
    };

    const signature = this.generateSignature(refundData);

    try {
      const response = await fetch(`${this.baseUrl}/v1/refunds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
          'X-Signature': signature,
        },
        body: JSON.stringify(refundData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Refund failed: ${error.message || response.statusText}`);
      }

      const result = await response.json();

      return {
        success: true,
        refundId: result.refund_id,
        transactionId: request.transactionId,
        amount: this.convertFromMinorUnits(result.amount, result.currency),
        currency: result.currency,
        status: result.status === 'completed' ? 'completed' : 'pending',
        message: result.message,
      };
    } catch (error) {
      return {
        success: false,
        refundId: '',
        transactionId: request.transactionId,
        amount: 0,
        currency: 'EGP',
        status: 'failed',
        message: (error as Error).message,
      };
    }
  }

  async verifyWebhook(payload: string, signature: string): Promise<WebhookEvent> {
    if (!this.config?.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new Error('Invalid webhook signature');
    }

    // Parse payload
    const event = JSON.parse(payload);

    return {
      id: event.id,
      type: this.mapWebhookEventType(event.type),
      provider: 'instapay',
      transactionId: event.transaction_ref,
      data: event,
      receivedAt: new Date(),
    };
  }

  async isHealthy(): Promise<boolean> {
    if (!this.config) return false;
    
    try {
      // Ping the API to check connectivity
      const response = await fetch(`${this.baseUrl}/v1/health`, {
        method: 'GET',
        headers: {
          'X-API-Key': this.config.apiKey,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async validateCredentials(): Promise<void> {
    if (!this.config) {
      throw new Error('Config not set');
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/merchant/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify({
          merchant_id: this.config.merchantId,
        }),
      });

      if (!response.ok) {
        throw new Error('Invalid Instapay credentials');
      }
    } catch (error) {
      throw new Error(`Instapay credential validation failed: ${(error as Error).message}`);
    }
  }

  private generateSignature(data: Record<string, unknown>): string {
    if (!this.config) {
      throw new Error('Config not set');
    }

    // Sort keys alphabetically
    const sortedKeys = Object.keys(data).sort();
    
    // Build signature string
    const signatureString = sortedKeys
      .map((key) => `${key}=${data[key]}`)
      .join('&');
    
    // Add secret key
    const stringToSign = `${signatureString}&secret=${this.config.secretKey}`;
    
    // Generate HMAC SHA256 signature
    return crypto
      .createHmac('sha256', this.config.secretKey)
      .update(stringToSign)
      .digest('hex');
  }

  private mapInstapayStatus(status: string): PaymentResult['status'] {
    const statusMap: Record<string, PaymentResult['status']> = {
      pending: 'pending',
      processing: 'processing',
      completed: 'completed',
      success: 'completed',
      failed: 'failed',
      cancelled: 'cancelled',
      refunded: 'refunded',
    };

    return statusMap[status.toLowerCase()] || 'pending';
  }

  private mapWebhookEventType(type: string): WebhookEvent['type'] {
    const typeMap: Record<string, WebhookEvent['type']> = {
      'payment.success': 'payment.success',
      'payment.completed': 'payment.success',
      'payment.failed': 'payment.failed',
      'payment.cancelled': 'payment.cancelled',
      'payment.refunded': 'payment.refunded',
    };

    return typeMap[type] || 'payment.failed';
  }

  private convertToMinorUnits(amount: number, _currency: string): number {
    // EGP uses piastres (100 piastres = 1 EGP)
    // USD, EUR, GBP use cents (100 cents = 1 unit)
    return Math.round(amount * 100);
  }

  private convertFromMinorUnits(amount: number, _currency: string): number {
    return amount / 100;
  }
}
