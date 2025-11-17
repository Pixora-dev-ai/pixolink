/**
 * PixoPay - Unified Payment Processing System
 * 
 * Multi-provider payment solution supporting:
 * - Instapay (Egyptian instant payment system)
 * - Vodafone Cash (Mobile wallet)
 * - Stripe (International payments)
 * 
 * @module pixolink/src/pixopay
 */

// ============================================================================
// Core Payment Processing
// ============================================================================

export { TransactionManager } from './core/TransactionManager';

// Re-export ALL types from core/types.ts
export type {
  // Core Types
  PaymentProvider,
  PaymentStatus,
  Currency,
  
  // Customer
  CustomerInfo,
  
  // Payment Flow
  PaymentRequest,
  PaymentResult,
  Transaction,
  
  // Refunds
  RefundRequest,
  RefundResult,
  
  // Webhooks
  WebhookEventType,
  WebhookEvent,
  
  // Provider Configs
  StripeConfig,
  InstapayConfig,
  VFCashConfig,
  PaymentProviderConfig,
  
  // Adapter Interface
  PaymentAdapter,
} from './core/types';

// ============================================================================
// Payment Adapters
// ============================================================================

export { InstapayAdapter } from './adapters/InstapayAdapter';
export { StripeAdapter } from './adapters/StripeAdapter';
export { VFCashAdapter } from './adapters/VFCashAdapter';

// ============================================================================
// UI Components
// ============================================================================

export { default as PixopayModal } from './ui/PixopayModal';
export { default as PixoPayManager } from './ui/PixoPayManager';

// ============================================================================
// Webhooks & Integrations
// ============================================================================

export { default as pixopayWebhookHandler } from './webhooks/pixopayWebhook';

// ============================================================================
// Plugin Export (for SDK)
// ============================================================================

export { PixoPayPlugin } from './core/plugin';
export type { PixoPayAPI } from './core/plugin';

// ============================================================================
// Unified PixoPay Namespace
// ============================================================================

import { TransactionManager as TM } from './core/TransactionManager';
import { InstapayAdapter as IA } from './adapters/InstapayAdapter';
import { StripeAdapter as SA } from './adapters/StripeAdapter';
import { VFCashAdapter as VA } from './adapters/VFCashAdapter';
import PM from './ui/PixopayModal';
import PPM from './ui/PixoPayManager';
import PWH from './webhooks/pixopayWebhook';
import { PixoPayPlugin as PPP } from './core/plugin';

export const PixoPay = {
  TransactionManager: TM,
  InstapayAdapter: IA,
  StripeAdapter: SA,
  VFCashAdapter: VA,
  PixopayModal: PM,
  PixoPayManager: PPM,
  pixopayWebhookHandler: PWH,
  PixoPayPlugin: PPP,
} as const;

// ============================================================================
// Version & Metadata
// ============================================================================

export const PIXOPAY_VERSION = '1.0.0';
export const SUPPORTED_PROVIDERS = ['instapay', 'vodafone-cash', 'stripe'] as const;
