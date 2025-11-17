import { z } from 'zod';

// ============================================================================
// Core Payment Types
// ============================================================================

export type PaymentProvider = 'stripe' | 'instapay' | 'vf-cash';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
export type Currency = 'EGP' | 'USD' | 'EUR' | 'GBP';

// ============================================================================
// Customer Information
// ============================================================================

export interface CustomerInfo {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  metadata?: Record<string, string>;
}

export const CustomerInfoSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

// ============================================================================
// Payment Request
// ============================================================================

export interface PaymentRequest {
  amount: number;
  currency: Currency;
  customer?: CustomerInfo;
  description?: string;
  metadata?: Record<string, string>;
  returnUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
}

export const PaymentRequestSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(['EGP', 'USD', 'EUR', 'GBP']),
  customer: CustomerInfoSchema.optional(),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
  returnUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  webhookUrl: z.string().url().optional(),
});

// ============================================================================
// Payment Result
// ============================================================================

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  status: PaymentStatus;
  amount: number;
  currency: Currency;
  provider: PaymentProvider;
  paymentUrl?: string;
  message?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// ============================================================================
// Transaction Record
// ============================================================================

export interface Transaction {
  id: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  currency: Currency;
  customer?: CustomerInfo;
  description?: string;
  paymentUrl?: string;
  providerTransactionId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
}

// ============================================================================
// Refund Request
// ============================================================================

export interface RefundRequest {
  transactionId: string;
  amount?: number; // Partial refund if specified, full refund if omitted
  reason?: string;
  metadata?: Record<string, string>;
}

export const RefundRequestSchema = z.object({
  transactionId: z.string(),
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

// ============================================================================
// Refund Result
// ============================================================================

export interface RefundResult {
  success: boolean;
  refundId: string;
  transactionId: string;
  amount: number;
  currency: Currency;
  status: 'pending' | 'completed' | 'failed';
  message?: string;
}

// ============================================================================
// Webhook Event
// ============================================================================

export type WebhookEventType = 'payment.success' | 'payment.failed' | 'payment.refunded' | 'payment.cancelled';

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  provider: PaymentProvider;
  transactionId: string;
  data: Record<string, unknown>;
  receivedAt: Date;
}

// ============================================================================
// Provider Configuration
// ============================================================================

export interface StripeConfig {
  apiKey: string;
  webhookSecret?: string;
  apiVersion?: string;
}

export interface InstapayConfig {
  merchantId: string;
  apiKey: string;
  secretKey: string;
  webhookSecret?: string;
  sandboxMode?: boolean;
  baseUrl?: string;
}

export interface VFCashConfig {
  merchantCode: string;
  apiKey: string;
  secretKey: string;
  webhookSecret?: string;
  sandboxMode?: boolean;
  baseUrl?: string;
}

export type PaymentProviderConfig = StripeConfig | InstapayConfig | VFCashConfig;

// ============================================================================
// Payment Adapter Interface
// ============================================================================

export interface PaymentAdapter {
  readonly provider: PaymentProvider;
  
  /**
   * Initialize the payment adapter
   */
  init(config: PaymentProviderConfig): Promise<void>;
  
  /**
   * Create a payment request
   */
  createPayment(request: PaymentRequest): Promise<PaymentResult>;
  
  /**
   * Get payment status
   */
  getPaymentStatus(transactionId: string): Promise<PaymentResult>;
  
  /**
   * Refund a payment
   */
  refundPayment(request: RefundRequest): Promise<RefundResult>;
  
  /**
   * Verify webhook signature
   */
  verifyWebhook(payload: string, signature: string): Promise<WebhookEvent>;
  
  /**
   * Check if adapter is healthy
   */
  isHealthy(): Promise<boolean>;
}
