# PixoPay Module

**Payment processing for Egyptian and international markets**

PixoPay provides a unified payment processing interface supporting three payment providers:

- **Instapay** - Egyptian card/wallet/bank gateway (Visa, Mastercard, Meeza)
- **VF Cash** - Vodafone Cash mobile wallet (20M+ users in Egypt)
- **Stripe** - Global payment processing with 3D Secure

## Features

✅ **Egyptian Market Support** - Native integration with local payment methods  
✅ **Mobile Wallet** - USSD code support for feature phones  
✅ **OAuth Management** - Automatic token refresh for VF Cash  
✅ **Webhook Verification** - HMAC-SHA256 signature validation  
✅ **Transaction Tracking** - In-memory state management (extensible to database)  
✅ **Currency Conversion** - Automatic EGP piastre and zero-decimal currency handling  
✅ **Provider Abstraction** - Unified API across all payment providers  
✅ **Type Safety** - Full TypeScript support with Zod validation  

## Installation

```bash
npm install @mamdouh-aboammar/pixolink-pixopay
```

## Quick Start

```typescript
import { PixoPayPlugin } from '@mamdouh-aboammar/pixolink-pixopay';
import { initPixoLink } from '@mamdouh-aboammar/pixolink';

// Initialize PixoLink with PixoPay
const pixo = await initPixoLink({
  plugins: [
    {
      plugin: new PixoPayPlugin(),
      config: {
        defaultProvider: 'instapay',
        providers: {
          instapay: {
            merchantId: 'MERCHANT_123',
            apiKey: process.env.INSTAPAY_API_KEY!,
            secretKey: process.env.INSTAPAY_SECRET_KEY!,
            webhookSecret: process.env.INSTAPAY_WEBHOOK_SECRET!,
            sandboxMode: true,
          },
          'vf-cash': {
            merchantCode: 'VFC_MERCHANT',
            apiKey: process.env.VFCASH_API_KEY!,
            secretKey: process.env.VFCASH_SECRET_KEY!,
            webhookSecret: process.env.VFCASH_WEBHOOK_SECRET!,
            sandboxMode: true,
          },
          stripe: {
            apiKey: process.env.STRIPE_SECRET_KEY!,
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
            apiVersion: '2024-12-18.acacia',
          },
        },
      },
    },
  ],
});

// Get PixoPay API
const pixopay = pixo.getPlugin<PixoPayAPI>('pixopay');

// Create payment
const result = await pixopay.createPayment({
  amount: 100, // EGP 100
  currency: 'EGP',
  customer: {
    name: 'Ahmed Hassan',
    email: 'ahmed@example.com',
    phone: '01012345678', // Egyptian format
  },
  description: 'Product purchase',
  returnUrl: 'https://mysite.com/success',
  webhookUrl: 'https://mysite.com/webhook',
});

if (result.success) {
  console.log('Payment created:', result.transactionId);
  console.log('Payment URL:', result.paymentUrl);
}
```

## Provider Configuration

### Instapay (Egyptian Gateway)

```typescript
instapay: {
  merchantId: 'MERCHANT_123',
  apiKey: 'your_api_key',
  secretKey: 'your_secret_key',
  webhookSecret: 'your_webhook_secret',
  sandboxMode: true, // Use sandbox for testing
  baseUrl: 'https://sandbox.instapay.com.eg', // Optional, auto-set based on sandboxMode
}
```

**Supported Payment Methods:**
- Cards: Visa, Mastercard, Meeza
- Mobile Wallets: Vodafone Cash, Etisalat Cash, Orange Cash, etc.
- Bank Transfers

**Features:**
- HMAC-SHA256 signature verification
- Automatic piastre conversion (1 EGP = 100 piastres)
- Credential validation on init
- Health check endpoint

### VF Cash (Mobile Wallet)

```typescript
'vf-cash': {
  merchantCode: 'VFC_MERCHANT',
  apiKey: 'your_api_key',
  secretKey: 'your_secret_key',
  webhookSecret: 'your_webhook_secret',
  sandboxMode: true,
  baseUrl: 'https://sandbox-api.vodafone.com.eg/vfcash', // Optional
}
```

**Features:**
- OAuth 2.0 authentication with automatic token refresh
- USSD code generation for feature phones
- Egyptian phone number normalization (01XXXXXXXXX)
- Token expiry handling (1-hour tokens, 5-min refresh buffer)

**Phone Number Formats Supported:**
```typescript
'01012345678'     // 11 digits (standard)
'+201012345678'   // 13 digits (international)
'00201012345678'  // 14 digits (international)
```

### Stripe (Global Payments)

```typescript
stripe: {
  apiKey: 'sk_test_...',
  webhookSecret: 'whsec_...',
  apiVersion: '2024-12-18.acacia',
}
```

**Features:**
- Payment Intents API with 3D Secure/SCA
- Automatic payment methods
- Zero-decimal currency support (JPY, KRW, VND, CLP)
- Card saving with `setup_future_usage`
- Manual capture and cancellation
- Customer creation for recurring payments

## API Reference

### Creating Payments

```typescript
const result = await pixopay.createPayment({
  amount: 250.50, // Major units (EGP, USD, EUR, etc.)
  currency: 'EGP',
  customer: {
    id: 'cust_123', // Optional
    name: 'Ahmed Hassan',
    email: 'ahmed@example.com',
    phone: '01012345678', // Required for VF Cash
  },
  description: 'Product purchase',
  metadata: {
    orderId: 'ORD_12345',
    userId: 'user_789',
  },
  returnUrl: 'https://mysite.com/success',
  cancelUrl: 'https://mysite.com/cancel',
  webhookUrl: 'https://mysite.com/webhook',
});

if (result.success) {
  console.log('Transaction ID:', result.transactionId);
  console.log('Payment URL:', result.paymentUrl); // Redirect customer here
  console.log('Status:', result.status); // 'pending'
  
  // Provider-specific metadata
  if (result.provider === 'vf-cash') {
    console.log('USSD Code:', result.metadata?.ussdCode); // For feature phones
  }
}
```

### Checking Payment Status

```typescript
const status = await pixopay.getPaymentStatus('TXN_12345');

console.log('Status:', status.status); // pending, processing, completed, failed
console.log('Amount:', status.amount);
console.log('Currency:', status.currency);
```

### Processing Refunds

```typescript
// Full refund
const refund = await pixopay.refundPayment({
  transactionId: 'TXN_12345',
  reason: 'Customer request',
  metadata: {
    requestedBy: 'admin_user',
  },
});

// Partial refund
const partialRefund = await pixopay.refundPayment({
  transactionId: 'TXN_12345',
  amount: 50.00, // Refund 50 EGP out of 100 EGP
  reason: 'Partial refund for returned item',
});

if (refund.success) {
  console.log('Refund ID:', refund.refundId);
  console.log('Refunded amount:', refund.amount);
}
```

### Webhook Handling

```typescript
// Express.js example
app.post('/webhook/instapay', async (req, res) => {
  const payload = JSON.stringify(req.body);
  const signature = req.headers['x-signature'] as string;
  
  try {
    const event = await pixopay.verifyWebhook('instapay', payload, signature);
    
    console.log('Event type:', event.type); // payment.success, payment.failed, etc.
    console.log('Transaction ID:', event.transactionId);
    console.log('Event data:', event.data);
    
    // Handle event
    switch (event.type) {
      case 'payment.success':
        await fulfillOrder(event.transactionId);
        break;
      case 'payment.failed':
        await notifyCustomer(event.transactionId);
        break;
      case 'payment.refunded':
        await processRefund(event.transactionId);
        break;
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook verification failed:', error);
    res.status(400).send('Invalid signature');
  }
});
```

### Transaction Management

```typescript
// Get transaction by ID
const transaction = pixopay.getTransaction('TXN_12345');
console.log('Transaction:', transaction);

// Get all transactions
const allTransactions = pixopay.getAllTransactions();

// Get transactions by status
const pending = pixopay.getTransactionsByStatus('pending');
const completed = pixopay.getTransactionsByStatus('completed');

// Get statistics
const stats = pixopay.getStats();
console.log('Total transactions:', stats.transactions.total);
console.log('By status:', stats.transactions.byStatus);
console.log('By provider:', stats.transactions.byProvider);
console.log('Total revenue:', stats.transactions.totalAmount);
// Example: { EGP: 15000, USD: 500 }
```

### Provider Management

```typescript
// Get available providers
const providers = pixopay.getProviders();
console.log('Providers:', providers); // ['instapay', 'vf-cash', 'stripe']

// Check if provider is available
const hasInstapay = pixopay.isProviderAvailable('instapay');

// Create payment with specific provider
const result = await pixopay.createPayment(
  paymentRequest,
  'stripe' // Override default provider
);
```

## Advanced Usage

### Stripe-Specific Features

```typescript
import { StripeAdapter } from '@mamdouh-aboammar/pixolink-pixopay';

const stripe = new StripeAdapter();
await stripe.init(stripeConfig);

// Manual capture (authorization flow)
const authResult = await stripe.createPayment({
  ...paymentRequest,
  captureMethod: 'manual',
});

// Later, capture the payment
await stripe.capturePayment(authResult.transactionId, 100.00);

// Or cancel it
await stripe.cancelPayment(authResult.transactionId);

// Create customer for recurring payments
const customer = await stripe.createCustomer({
  name: 'Ahmed Hassan',
  email: 'ahmed@example.com',
  metadata: { userId: 'user_123' },
});
```

### Direct Adapter Usage

If you need to use adapters without the plugin wrapper:

```typescript
import { InstapayAdapter } from '@mamdouh-aboammar/pixolink-pixopay';

const instapay = new InstapayAdapter();
await instapay.init({
  merchantId: 'MERCHANT_123',
  apiKey: 'api_key',
  secretKey: 'secret_key',
  sandboxMode: true,
});

const result = await instapay.createPayment(paymentRequest);
const status = await instapay.getPaymentStatus(result.transactionId);
const refund = await instapay.refundPayment(refundRequest);
const healthy = await instapay.isHealthy();
```

### Transaction Export/Import

```typescript
import { TransactionManager } from '@mamdouh-aboammar/pixolink-pixopay';

const manager = new TransactionManager();

// Export transactions
const json = manager.export();
localStorage.setItem('transactions', json);

// Import transactions
const json = localStorage.getItem('transactions');
if (json) {
  const count = manager.import(json);
  console.log(`Imported ${count} transactions`);
}
```

### Stale Transaction Detection

```typescript
// Plugin automatically checks for stale transactions
// Configure in plugin config:
{
  staleTransactionCheckInterval: 30, // Check every 30 minutes
}

// Listen for stale transaction events
pixo.eventBus.on('pixopay:stale:transactions', (data) => {
  console.log('Found stale transactions:', data.count);
  
  // Manually check status for each
  for (const tx of data.transactions) {
    pixopay.getPaymentStatus(tx.id).then((status) => {
      console.log(`Transaction ${tx.id} status: ${status.status}`);
    });
  }
});
```

## Event System

PixoPay emits events for monitoring and debugging:

```typescript
// Payment created
pixo.eventBus.on('pixopay:payment:created', (data) => {
  console.log('Payment created:', data.transactionId);
  console.log('Provider:', data.provider);
  console.log('Amount:', data.amount, data.currency);
  console.log('Latency:', data.latency, 'ms');
});

// Payment error
pixo.eventBus.on('pixopay:payment:error', (data) => {
  console.error('Payment error:', data.provider, data.error);
});

// Payment refunded
pixo.eventBus.on('pixopay:payment:refunded', (data) => {
  console.log('Refund processed:', data.refundId);
});

// Webhook received
pixo.eventBus.on('pixopay:webhook:received', (data) => {
  console.log('Webhook:', data.provider, data.eventType);
});

// Plugin lifecycle
pixo.eventBus.on('pixopay:started', (data) => {
  console.log('PixoPay started with providers:', data.providers);
});
```

## Phone Number Normalization (VF Cash)

VF Cash requires Egyptian phone numbers in the format `01XXXXXXXXX`. The adapter automatically normalizes various formats:

```typescript
// All these formats are normalized to: 01012345678
'01012345678'      // Already normalized ✓
'+201012345678'    // International format ✓
'00201012345678'   // International format ✓
'1012345678'       // Missing leading 0 → INVALID ✗
'0101234567'       // Only 10 digits → INVALID ✗
```

**Best Practice:** Always collect phone numbers with country code (+20) and normalize before storing.

## Currency Handling

### EGP (Egyptian Pound)

Instapay and VF Cash use **piastres** as minor units:
- 1 EGP = 100 piastres
- API sends amounts in piastres
- PixoPay automatically converts: `100.50 EGP → 10050 piastres`

### Zero-Decimal Currencies (Stripe)

Some currencies don't use decimal places. Stripe handles these automatically:
- **JPY** (Japanese Yen): ¥1,000 = 1000 (no conversion)
- **KRW** (South Korean Won): ₩50,000 = 50000
- **VND** (Vietnamese Dong): ₫100,000 = 100000
- **CLP** (Chilean Peso): $5,000 = 5000

PixoPay detects these currencies and handles conversion correctly.

## Error Handling

```typescript
try {
  const result = await pixopay.createPayment(request);
  if (!result.success) {
    console.error('Payment failed:', result.message);
    // Handle user-facing error
  }
} catch (error) {
  if (error.message.includes('provider') && error.message.includes('not configured')) {
    console.error('Payment provider not available');
  } else if (error.message.includes('webhook')) {
    console.error('Webhook verification failed');
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Testing

### Sandbox Credentials

**Instapay Sandbox:**
- Base URL: `https://sandbox.instapay.com.eg`
- Test cards: Visa `4111111111111111`, Mastercard `5555555555554444`
- Set `sandboxMode: true` in config

**VF Cash Sandbox:**
- Base URL: `https://sandbox-api.vodafone.com.eg/vfcash`
- Test phone: `01000000001` (always succeeds)
- Test phone: `01000000002` (always fails)
- Set `sandboxMode: true` in config

**Stripe Test Mode:**
- Use test API key: `sk_test_...`
- Test cards: https://stripe.com/docs/testing

### Unit Tests

```typescript
import { InstapayAdapter } from '@mamdouh-aboammar/pixolink-pixopay';
import { describe, it, expect } from 'vitest';

describe('InstapayAdapter', () => {
  it('should create payment successfully', async () => {
    const adapter = new InstapayAdapter();
    await adapter.init({
      merchantId: 'TEST_MERCHANT',
      apiKey: 'test_key',
      secretKey: 'test_secret',
      sandboxMode: true,
    });
    
    const result = await adapter.createPayment({
      amount: 100,
      currency: 'EGP',
      customer: {
        name: 'Test User',
        email: 'test@example.com',
      },
      description: 'Test payment',
    });
    
    expect(result.success).toBe(true);
    expect(result.transactionId).toBeDefined();
    expect(result.paymentUrl).toBeDefined();
  });
});
```

## Security Best Practices

1. **Never expose API keys** - Use environment variables
2. **Verify webhook signatures** - Always use `verifyWebhook()` before processing
3. **Use HTTPS** - All webhook endpoints must use HTTPS in production
4. **Validate amounts** - Use Zod schemas to validate payment requests
5. **Set sandboxMode correctly** - Use sandbox for testing, production for live payments
6. **Rotate webhook secrets** - Regularly rotate secrets and update config

## Production Checklist

- [ ] Switch `sandboxMode: false` for all providers
- [ ] Use production API keys (not test keys)
- [ ] Configure webhook endpoints with HTTPS
- [ ] Set up webhook signature verification
- [ ] Implement proper error logging (Sentry, etc.)
- [ ] Add transaction persistence (database instead of in-memory)
- [ ] Set up monitoring for stale transactions
- [ ] Test all payment flows end-to-end
- [ ] Implement refund workflows
- [ ] Add rate limiting for API calls

## Database Integration

The `TransactionManager` currently uses in-memory storage. For production, extend it with database persistence:

```typescript
import { TransactionManager, Transaction } from '@mamdouh-aboammar/pixolink-pixopay';
import { db } from './database';

class DatabaseTransactionManager extends TransactionManager {
  async createTransaction(result: PaymentResult): Transaction {
    const transaction = super.createTransaction(result);
    
    // Save to database
    await db.transactions.create({
      data: {
        id: transaction.id,
        provider: transaction.provider,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        metadata: JSON.stringify(transaction.metadata),
        createdAt: transaction.createdAt,
      },
    });
    
    return transaction;
  }
  
  async getTransaction(id: string): Promise<Transaction | undefined> {
    const tx = await db.transactions.findUnique({ where: { id } });
    if (!tx) return super.getTransaction(id);
    
    return {
      id: tx.id,
      provider: tx.provider as PaymentProvider,
      status: tx.status as PaymentStatus,
      amount: tx.amount,
      currency: tx.currency as Currency,
      metadata: JSON.parse(tx.metadata || '{}'),
      createdAt: new Date(tx.createdAt),
      updatedAt: new Date(tx.updatedAt),
    };
  }
  
  // Override other methods...
}
```

## Type Exports

```typescript
import type {
  PaymentProvider,    // 'stripe' | 'instapay' | 'vf-cash'
  PaymentStatus,      // 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled'
  Currency,           // 'EGP' | 'USD' | 'EUR' | 'GBP'
  CustomerInfo,
  PaymentRequest,
  PaymentResult,
  Transaction,
  RefundRequest,
  RefundResult,
  WebhookEvent,
  WebhookEventType,   // 'payment.success' | 'payment.failed' | 'payment.refunded' | 'payment.cancelled'
  PaymentAdapter,
  StripeConfig,
  InstapayConfig,
  VFCashConfig,
} from '@mamdouh-aboammar/pixolink-pixopay';

// Zod schemas for validation
import {
  CustomerInfoSchema,
  PaymentRequestSchema,
  RefundRequestSchema,
} from '@mamdouh-aboammar/pixolink-pixopay';
```

## License

MIT

## Support

For issues and questions:
- GitHub: https://github.com/pixora/pixolink
- Email: support@pixora.com
- Documentation: https://pixolink.pixora.com

---

**Built with ❤️ for the Egyptian market and beyond**
