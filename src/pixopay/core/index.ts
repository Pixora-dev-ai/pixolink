/**
 * PixoPay - Payment Processing Module for PixoLink
 *
 * Provides unified payment processing for Egyptian and international markets:
 * - Instapay: Egyptian card/wallet/bank gateway
 * - VF Cash: Vodafone Cash mobile wallet (20M+ users)
 * - Stripe: Global payment processing
 *
 * @module @pixora/pixolink-pixopay
 */

// ============================================================================
// Plugin
// ============================================================================

export { PixoPayPlugin } from './plugin';
export type { PixoPayPluginConfig, PixoPayAPI } from './plugin';

// ============================================================================
// Types
// ============================================================================

export type {
  PaymentProvider,
  PaymentStatus,
  Currency,
  CustomerInfo,
  PaymentRequest,
  PaymentResult,
  Transaction,
  RefundRequest,
  RefundResult,
  WebhookEvent,
  WebhookEventType,
  PaymentAdapter,
  StripeConfig,
  InstapayConfig,
  VFCashConfig,
} from './types';

export {
  CustomerInfoSchema,
  PaymentRequestSchema,
  RefundRequestSchema,
} from './types';

// ============================================================================
// Adapters
// ============================================================================

export { InstapayAdapter } from './adapters/InstapayAdapter';
export { VFCashAdapter } from './adapters/VFCashAdapter';
export { StripeAdapter } from './adapters/StripeAdapter';

// ============================================================================
// Transaction Manager
// ============================================================================

export { TransactionManager } from './TransactionManager';
