import crypto from 'crypto';
import type {
  PaymentAdapter,
  PaymentRequest,
  PaymentResult,
  RefundRequest,
  RefundResult,
  WebhookEvent,
  VFCashConfig,
} from '../types';

/**
 * Vodafone Cash Payment Adapter for Egypt
 * 
 * Vodafone Cash is Egypt's leading mobile wallet service with over 20 million users.
 * Supports:
 * - Mobile wallet payments
 * - P2P transfers
 * - Bill payments
 * - Merchant payments
 * 
 * API Documentation: https://developer.vodafone.com.eg/vfcash/
 */
export class VFCashAdapter implements PaymentAdapter {
  readonly provider = 'vf-cash' as const;
  
  private config?: VFCashConfig;
  private baseUrl: string = 'https://api.vodafone.com.eg/vfcash';
  private accessToken?: string;
  private tokenExpiresAt?: Date;

  async init(config: VFCashConfig): Promise<void> {
    this.config = config;
    
    if (config.sandboxMode) {
      this.baseUrl = config.baseUrl || 'https://sandbox.vodafone.com.eg/vfcash';
    } else {
      this.baseUrl = config.baseUrl || 'https://api.vodafone.com.eg/vfcash';
    }
    
    // Authenticate and get access token
    await this.authenticate();
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResult> {
    if (!this.config) {
      throw new Error('VF Cash adapter not initialized');
    }

    // Ensure we have a valid token
    await this.ensureValidToken();

    // Generate unique transaction reference
    const transactionRef = `VFC_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // VF Cash requires phone number in specific format: 01XXXXXXXXX
    const phoneNumber = this.normalizePhoneNumber(request.customer?.phone);
    if (!phoneNumber) {
      throw new Error('Valid Egyptian phone number is required for VF Cash payments');
    }

    // Prepare VF Cash API request
    const paymentData = {
      merchant_code: this.config.merchantCode,
      transaction_ref: transactionRef,
      amount: this.convertToMinorUnits(request.amount, request.currency),
      currency: request.currency,
      customer_phone: phoneNumber,
      customer_name: request.customer?.name,
      customer_email: request.customer?.email,
      description: request.description,
      callback_url: request.webhookUrl,
      return_url: request.returnUrl,
      cancel_url: request.cancelUrl,
      metadata: request.metadata,
      timestamp: new Date().toISOString(),
    };

    // Generate HMAC signature
    const signature = this.generateSignature(paymentData);
    
    try {
      const response = await fetch(`${this.baseUrl}/v2/payments/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
          'X-Merchant-Code': this.config.merchantCode,
          'X-Signature': signature,
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`VF Cash API error: ${error.message || error.error_description || response.statusText}`);
      }

      const result = await response.json();

      return {
        success: true,
        transactionId: transactionRef,
        status: this.mapVFCashStatus(result.status),
        amount: request.amount,
        currency: request.currency,
        provider: 'vf-cash',
        paymentUrl: result.payment_url || result.ussd_code, // VF Cash can use USSD codes
        message: result.message || 'Payment initiated. Customer will receive USSD prompt on their phone.',
        metadata: {
          vfCashId: result.payment_id,
          ussdCode: result.ussd_code,
          expiresAt: result.expires_at,
          requestId: result.request_id,
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
        provider: 'vf-cash',
        message: (error as Error).message,
        createdAt: new Date(),
      };
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentResult> {
    if (!this.config) {
      throw new Error('VF Cash adapter not initialized');
    }

    await this.ensureValidToken();

    const queryData = {
      transaction_ref: transactionId,
      timestamp: new Date().toISOString(),
    };
    
    const signature = this.generateSignature(queryData);

    try {
      const response = await fetch(
        `${this.baseUrl}/v2/payments/status/${encodeURIComponent(transactionId)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'X-Merchant-Code': this.config.merchantCode,
            'X-Signature': signature,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get payment status: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: result.status !== 'failed' && result.status !== 'rejected',
        transactionId,
        status: this.mapVFCashStatus(result.status),
        amount: this.convertFromMinorUnits(result.amount, result.currency),
        currency: result.currency,
        provider: 'vf-cash',
        metadata: {
          vfCashTransactionId: result.vf_transaction_id,
          customerPhone: result.customer_phone,
          completedAt: result.completed_at,
        },
        createdAt: new Date(result.created_at),
      };
    } catch (error) {
      throw new Error(`Failed to get payment status: ${(error as Error).message}`);
    }
  }

  async refundPayment(request: RefundRequest): Promise<RefundResult> {
    if (!this.config) {
      throw new Error('VF Cash adapter not initialized');
    }

    await this.ensureValidToken();

    const refundData = {
      transaction_ref: request.transactionId,
      amount: request.amount,
      reason: request.reason,
      metadata: request.metadata,
      timestamp: new Date().toISOString(),
    };

    const signature = this.generateSignature(refundData);

    try {
      const response = await fetch(`${this.baseUrl}/v2/refunds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
          'X-Merchant-Code': this.config.merchantCode,
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
        message: result.message || 'Refund initiated successfully',
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

    // VF Cash uses HMAC-SHA256 for webhook signatures
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
      id: event.event_id || event.id,
      type: this.mapWebhookEventType(event.event_type || event.type),
      provider: 'vf-cash',
      transactionId: event.transaction_ref,
      data: event,
      receivedAt: new Date(),
    };
  }

  async isHealthy(): Promise<boolean> {
    if (!this.config) return false;
    
    try {
      await this.ensureValidToken();
      return !!this.accessToken;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async authenticate(): Promise<void> {
    if (!this.config) {
      throw new Error('Config not set');
    }

    try {
      const response = await fetch(`${this.baseUrl}/v2/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: this.config.merchantCode,
          client_secret: this.config.apiKey,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Authentication failed: ${error.error_description || response.statusText}`);
      }

      const result = await response.json();
      this.accessToken = result.access_token;
      
      // Set token expiry (VF Cash tokens typically last 1 hour)
      const expiresIn = result.expires_in || 3600; // seconds
      this.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
    } catch (error) {
      throw new Error(`VF Cash authentication failed: ${(error as Error).message}`);
    }
  }

  private async ensureValidToken(): Promise<void> {
    // Check if token is expired or about to expire (5 min buffer)
    if (!this.accessToken || !this.tokenExpiresAt || 
        this.tokenExpiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
      await this.authenticate();
    }
  }

  private generateSignature(data: Record<string, unknown>): string {
    if (!this.config) {
      throw new Error('Config not set');
    }

    // Sort keys alphabetically
    const sortedKeys = Object.keys(data).sort();
    
    // Build signature string (VF Cash format)
    const signatureString = sortedKeys
      .filter(key => data[key] !== undefined && data[key] !== null)
      .map((key) => `${key}=${JSON.stringify(data[key])}`)
      .join('&');
    
    // Generate HMAC SHA256 signature using secret key
    return crypto
      .createHmac('sha256', this.config.secretKey)
      .update(signatureString)
      .digest('hex');
  }

  private normalizePhoneNumber(phone?: string): string | null {
    if (!phone) return null;

    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Egyptian phone numbers:
    // - Start with 01 (11 digits total)
    // - Or with +2 or 002 (country code)
    
    if (cleaned.length === 11 && cleaned.startsWith('01')) {
      return cleaned; // 01XXXXXXXXX
    }
    
    if (cleaned.length === 13 && cleaned.startsWith('201')) {
      return cleaned.substring(2); // Remove country code 20
    }
    
    if (cleaned.length === 14 && cleaned.startsWith('0201')) {
      return cleaned.substring(3); // Remove 020 prefix
    }
    
    return null; // Invalid format
  }

  private mapVFCashStatus(status: string): PaymentResult['status'] {
    const statusMap: Record<string, PaymentResult['status']> = {
      initiated: 'pending',
      pending: 'pending',
      processing: 'processing',
      completed: 'completed',
      success: 'completed',
      successful: 'completed',
      failed: 'failed',
      rejected: 'failed',
      cancelled: 'cancelled',
      refunded: 'refunded',
      expired: 'cancelled',
    };

    return statusMap[status.toLowerCase()] || 'pending';
  }

  private mapWebhookEventType(type: string): WebhookEvent['type'] {
    const typeMap: Record<string, WebhookEvent['type']> = {
      'payment.success': 'payment.success',
      'payment.completed': 'payment.success',
      'payment.successful': 'payment.success',
      'payment.failed': 'payment.failed',
      'payment.rejected': 'payment.failed',
      'payment.cancelled': 'payment.cancelled',
      'payment.refunded': 'payment.refunded',
    };

    return typeMap[type.toLowerCase()] || 'payment.failed';
  }

  private convertToMinorUnits(amount: number, _currency: string): number {
    // EGP uses piastres (100 piastres = 1 EGP)
    return Math.round(amount * 100);
  }

  private convertFromMinorUnits(amount: number, _currency: string): number {
    return amount / 100;
  }
}
