# 🤖 AI Agents Guide - PixoLink SDK

> **Comprehensive guide for AI coding assistants** (GitHub Copilot, Cursor, Bolt, Windsurf, etc.)

This guide provides AI agents with structured context about PixoLink SDK to assist with code generation, debugging, and implementation.

---

## 📚 Table of Contents

- [Quick Context](#quick-context)
- [Architecture Overview](#architecture-overview)
- [Core Concepts](#core-concepts)
- [Common Tasks](#common-tasks)
- [Module Reference](#module-reference)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Quick Context

### What is PixoLink?

PixoLink is a **unified SDK** that consolidates multiple systems into one modular library:

```typescript
// One SDK, multiple capabilities
import { PixoLink } from '@mamdouh-aboammar/pixolink';

await PixoLink.init('./pixo.config.json');

// AI generation
const ai = PixoLink.useConnector('ai-core');
const image = await ai.generate('Egyptian portrait');

// Payments
const payment = PixoLink.useConnector('payments');
await payment.processPayment({ amount: 100, method: 'instapay' });

// Analytics
const analytics = PixoLink.useConnector('analytics');
await analytics.track('user_action', { action: 'generate_image' });
```

### Package Structure

```
@mamdouh-aboammar/pixolink              → Core SDK
@mamdouh-aboammar/pixolink-admin-dashboard    → Admin UI
@mamdouh-aboammar/pixolink-intelligence-core  → AI orchestration
@mamdouh-aboammar/pixolink-logic-guardian     → Validation & circuit breakers
@mamdouh-aboammar/pixolink-pixoguard          → Security & monitoring
@mamdouh-aboammar/pixolink-pixopay            → Payment processing
@mamdouh-aboammar/pixolink-weavai             → Multi-provider AI
```

---

## 🏗️ Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│                    PixoLink Core                        │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Config    │  │   Plugin    │  │  Connector  │   │
│  │   Loader    │  │   Registry  │  │     Hub     │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
│         │                 │                 │          │
└─────────┼─────────────────┼─────────────────┼──────────┘
          │                 │                 │
          └─────────────────┴─────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Modules    │    │  Connectors  │    │      UI      │
│              │    │              │    │              │
│ • WeavAI     │    │ • Supabase   │    │ • Dashboard  │
│ • PixoGuard  │    │ • Gemini     │    │ • Components │
│ • Logic      │    │ • OpenAI     │    │ • Hooks      │
│   Guardian   │    │ • Stripe     │    │              │
│ • PixoPay    │    │ • Instapay   │    │              │
│ • Admin      │    │ • Analytics  │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Configuration Flow

```typescript
// 1. Configuration file (pixo.config.json)
{
  "project_name": "my-app",
  "connectors": {
    "supabase": { "url": "...", "anonKey": "..." },
    "ai": { "provider": "gemini", "apiKey": "..." }
  },
  "modules": {
    "pixoguard": true,
    "weavai": true
  }
}

// 2. Initialize at app startup
await PixoLink.init('./pixo.config.json');

// 3. Use connectors anywhere
const connector = PixoLink.useConnector('supabase');
```

---

## 💡 Core Concepts

### 1. Configuration Management

**Config File Location**: `./pixo.config.json` (root of project)

**Environment Variable Substitution**:
```json
{
  "connectors": {
    "supabase": {
      "url": "${SUPABASE_URL}",           // Replaced at runtime
      "anonKey": "${SUPABASE_ANON_KEY}"
    }
  }
}
```

**TypeScript Types**:
```typescript
import type { PixoLinkConfig } from '@mamdouh-aboammar/pixolink';

const config: PixoLinkConfig = {
  project_name: 'my-app',
  connectors: { /* ... */ },
  modules: { /* ... */ }
};
```

### 2. Connector System

**What are connectors?**
- Unified interface to external services
- Singleton instances (created once)
- Type-safe access via `useConnector()`

**Available Connectors**:
```typescript
type ConnectorType = 
  | 'supabase'        // Database & auth
  | 'ai-core'         // AI generation
  | 'payments'        // Payment processing
  | 'analytics'       // Usage tracking
  | 'storage';        // File storage
```

**Usage Pattern**:
```typescript
// Get connector
const supabase = PixoLink.useConnector('supabase');

// Use connector methods
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId);
```

### 3. Plugin System

**What are plugins?**
- Modular extensions to core functionality
- Self-contained with their own configuration
- Can be enabled/disabled via config

**Creating a Plugin**:
```typescript
import type { Plugin } from '@mamdouh-aboammar/pixolink';

export const myPlugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  
  async init(config) {
    // Setup logic
    console.log('Plugin initialized');
  },
  
  async cleanup() {
    // Teardown logic
  }
};
```

**Registering Plugins**:
```typescript
import { PixoLink } from '@mamdouh-aboammar/pixolink';
import { myPlugin } from './my-plugin';

PixoLink.registerPlugin(myPlugin);
await PixoLink.init('./pixo.config.json');
```

---

## 🛠️ Common Tasks

### Task 1: Initialize PixoLink in a New Project

```typescript
// 1. Install package
// npm install @mamdouh-aboammar/pixolink

// 2. Create config file (pixo.config.json)
{
  "project_name": "my-app",
  "connectors": {
    "supabase": {
      "url": "${SUPABASE_URL}",
      "anonKey": "${SUPABASE_ANON_KEY}"
    }
  },
  "modules": {}
}

// 3. Initialize in main entry point (e.g., main.tsx, index.ts)
import { PixoLink } from '@mamdouh-aboammar/pixolink';

async function bootstrap() {
  await PixoLink.init('./pixo.config.json');
  console.log('✅ PixoLink initialized');
}

bootstrap();
```

### Task 2: Add AI Image Generation

```typescript
// 1. Add to config
{
  "connectors": {
    "ai": {
      "provider": "gemini",
      "apiKey": "${GEMINI_API_KEY}"
    }
  },
  "modules": {
    "weavai": true  // Enable WeavAI module
  }
}

// 2. Use in code
import { PixoLink } from '@mamdouh-aboammar/pixolink';

const ai = PixoLink.useConnector('ai-core');

const result = await ai.generate('Egyptian digital portrait', {
  model: 'imagen-3.0-generate-001',
  aspectRatio: '1:1',
  negativePrompt: 'blurry, low quality'
});

console.log('Image URL:', result.url);
```

### Task 3: Add Payment Processing

```typescript
// 1. Install payment module
// npm install @mamdouh-aboammar/pixolink-pixopay

// 2. Add to config
{
  "connectors": {
    "payments": {
      "provider": "stripe",
      "apiKey": "${STRIPE_SECRET_KEY}"
    }
  },
  "modules": {
    "pixopay": true
  }
}

// 3. Process payment
import { PixoLink } from '@mamdouh-aboammar/pixolink';

const payment = PixoLink.useConnector('payments');

const result = await payment.processPayment({
  amount: 100,
  currency: 'USD',
  method: 'stripe',
  metadata: { orderId: '12345' }
});

if (result.success) {
  console.log('Payment successful:', result.transactionId);
}
```

### Task 4: Add Admin Dashboard

```tsx
// 1. Install admin module
// npm install @mamdouh-aboammar/pixolink-admin-dashboard

// 2. Add to config
{
  "modules": {
    "admin_dashboard": true
  }
}

// 3. Use in React component
import { AdminDashboard } from '@mamdouh-aboammar/pixolink-admin-dashboard';

function AdminPage() {
  return (
    <div>
      <h1>Admin Panel</h1>
      <AdminDashboard />
    </div>
  );
}
```

### Task 5: Add Runtime Validation

```typescript
// 1. Install logic guardian
// npm install @mamdouh-aboammar/pixolink-logic-guardian

// 2. Use decorators
import { validateWith, circuitBreaker } from '@mamdouh-aboammar/pixolink-logic-guardian';
import { z } from 'zod';

class UserService {
  @validateWith(z.object({
    email: z.string().email(),
    age: z.number().min(18)
  }))
  async createUser(data: { email: string; age: number }) {
    // Method automatically validates input
    return await db.users.create(data);
  }
  
  @circuitBreaker({ threshold: 5, timeout: 60000 })
  async fetchExternalAPI() {
    // Circuit breaker protects against cascading failures
    return await fetch('https://api.example.com/data');
  }
}
```

---

## 📦 Module Reference

### WeavAI (Multi-Provider AI)

**Purpose**: Unified interface for multiple AI providers

**Supported Providers**:
- Google Gemini
- OpenAI
- Anthropic Claude
- DeepSeek

**Usage**:
```typescript
const ai = PixoLink.useConnector('ai-core');

// Text generation
const text = await ai.chat('Explain quantum computing');

// Image generation
const image = await ai.generate('Futuristic cityscape');

// Vision analysis
const analysis = await ai.analyzeImage('path/to/image.jpg');
```

### PixoGuard (Security & Monitoring)

**Purpose**: Database security, behavior analysis, anomaly detection

**Features**:
- Row-level security (RLS) validation
- Query pattern analysis
- Suspicious activity detection
- Real-time alerts

**Usage**:
```typescript
import { PixoGuard } from '@mamdouh-aboammar/pixolink-pixoguard';

// Enable monitoring
await PixoGuard.enable({
  alertThreshold: 5,
  suspiciousPatterns: ['excessive_queries', 'unauthorized_access']
});

// Get security report
const report = await PixoGuard.getReport();
console.log('Threats detected:', report.threats.length);
```

### Logic Guardian (Validation & Circuit Breakers)

**Purpose**: Runtime validation, error handling, fault tolerance

**Features**:
- Zod-based validation decorators
- Circuit breaker pattern
- Invariant checking
- Side-effect tracking

**Usage**:
```typescript
import { validateWith, circuitBreaker, invariant } from '@mamdouh-aboammar/pixolink-logic-guardian';

class PaymentService {
  @validateWith(paymentSchema)
  @circuitBreaker({ threshold: 3, timeout: 30000 })
  async processPayment(data: PaymentInput) {
    invariant(data.amount > 0, 'Amount must be positive');
    // Process payment
  }
}
```

### PixoPay (Payment Processing)

**Purpose**: Unified payment interface for multiple providers

**Supported Providers**:
- Stripe
- Instapay (Egypt)
- Vodafone Cash (Egypt)

**Usage**:
```typescript
const payment = PixoLink.useConnector('payments');

// Process payment
const result = await payment.processPayment({
  amount: 50,
  currency: 'EGP',
  method: 'instapay',
  customerPhone: '+201234567890'
});

// Handle webhook
import { pixopayWebhook } from '@mamdouh-aboammar/pixolink-pixopay';

app.post('/webhook/pixopay', pixopayWebhook({
  onSuccess: (data) => console.log('Payment success:', data),
  onFailure: (data) => console.log('Payment failed:', data)
}));
```

### Admin Dashboard

**Purpose**: Complete admin interface with analytics

**Features**:
- User management
- Payment approval
- Credits management
- Analytics dashboard
- System settings

**Usage**:
```tsx
import { 
  AdminDashboard,
  UserManagement,
  PaymentApproval,
  SystemAnalytics 
} from '@mamdouh-aboammar/pixolink-admin-dashboard';

function AdminApp() {
  return (
    <AdminDashboard>
      <UserManagement />
      <PaymentApproval />
      <SystemAnalytics />
    </AdminDashboard>
  );
}
```

---

## ✅ Best Practices

### 1. Configuration Management

**DO**:
```typescript
// ✅ Use environment variables
{
  "connectors": {
    "supabase": {
      "url": "${SUPABASE_URL}",
      "anonKey": "${SUPABASE_ANON_KEY}"
    }
  }
}
```

**DON'T**:
```typescript
// ❌ Hardcode secrets
{
  "connectors": {
    "supabase": {
      "url": "https://xyz.supabase.co",
      "anonKey": "eyJhbGc..."
    }
  }
}
```

### 2. Error Handling

**DO**:
```typescript
// ✅ Handle errors gracefully
try {
  const ai = PixoLink.useConnector('ai-core');
  const result = await ai.generate('prompt');
  return result;
} catch (error) {
  console.error('AI generation failed:', error);
  return { error: 'Generation failed' };
}
```

**DON'T**:
```typescript
// ❌ Ignore errors
const result = await ai.generate('prompt');
return result; // What if it fails?
```

### 3. Connector Usage

**DO**:
```typescript
// ✅ Get connector once, use multiple times
const ai = PixoLink.useConnector('ai-core');

for (const prompt of prompts) {
  await ai.generate(prompt);
}
```

**DON'T**:
```typescript
// ❌ Get connector repeatedly
for (const prompt of prompts) {
  const ai = PixoLink.useConnector('ai-core'); // Inefficient
  await ai.generate(prompt);
}
```

### 4. Module Configuration

**DO**:
```typescript
// ✅ Enable only needed modules
{
  "modules": {
    "weavai": true,
    "pixopay": true,
    "admin_dashboard": false  // Not needed in this app
  }
}
```

**DON'T**:
```typescript
// ❌ Enable all modules unnecessarily
{
  "modules": {
    "weavai": true,
    "pixopay": true,
    "pixoguard": true,
    "logic_guardian": true,
    "admin_dashboard": true  // Increases bundle size
  }
}
```

---

## 🔧 Troubleshooting

### Issue: "PixoLink not initialized"

**Cause**: Trying to use connectors before calling `PixoLink.init()`

**Solution**:
```typescript
// ❌ Wrong order
const ai = PixoLink.useConnector('ai-core'); // Error!
await PixoLink.init('./pixo.config.json');

// ✅ Correct order
await PixoLink.init('./pixo.config.json');
const ai = PixoLink.useConnector('ai-core'); // Works!
```

### Issue: "Connector not found"

**Cause**: Connector not configured in `pixo.config.json`

**Solution**:
```json
// Add connector configuration
{
  "connectors": {
    "ai": {
      "provider": "gemini",
      "apiKey": "${GEMINI_API_KEY}"
    }
  }
}
```

### Issue: "Module not loaded"

**Cause**: Module not enabled or installed

**Solution**:
```bash
# 1. Install module
npm install @mamdouh-aboammar/pixolink-weavai

# 2. Enable in config
{
  "modules": {
    "weavai": true
  }
}
```

### Issue: Environment variables not replaced

**Cause**: Environment variables not set

**Solution**:
```bash
# Create .env file
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
GEMINI_API_KEY=AIzaSy...

# Load with dotenv (Node.js)
import 'dotenv/config';
await PixoLink.init('./pixo.config.json');
```

---

## 🎯 AI Agent Guidelines

When helping users with PixoLink:

1. **Always suggest installing the correct package**:
   ```bash
   npm install @mamdouh-aboammar/pixolink
   ```

2. **Check if configuration exists** before suggesting code changes

3. **Recommend environment variables** for sensitive data

4. **Suggest enabling only needed modules** to reduce bundle size

5. **Provide complete examples** with proper error handling

6. **Reference official documentation** when available:
   - Developer Guide: `./docs/DEVELOPERS_GUIDE.md`
   - Module Reference: `./docs/MODULES_REFERENCE.md`
   - Migration Guide: `./docs/MIGRATION_GUIDE.md`

---

## 📖 Additional Resources

- **GitHub Repository**: https://github.com/Pixora-dev-ai/pixolink
- **npm Package**: https://www.npmjs.com/package/@mamdouh-aboammar/pixolink
- **Developer Guide**: [DEVELOPERS_GUIDE.md](./DEVELOPERS_GUIDE.md)
- **Changelog**: [CHANGELOG.md](../CHANGELOG.md)

---

**Last Updated**: November 17, 2025  
**Version**: 1.0.0  
**License**: MIT
