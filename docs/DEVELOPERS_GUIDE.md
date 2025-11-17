# 📖 PixoLink Developer Guide

Complete guide to building applications with PixoLink SDK.

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Core Concepts](#core-concepts)
5. [Connectors](#connectors)
6. [Modules](#modules)
7. [Event System](#event-system)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)
10. [Examples](#examples)

---

## Installation

### NPM

```bash
npm install @pixora/pixolink
```

### pnpm

```bash
pnpm add @pixora/pixolink
```

### Yarn

```bash
yarn add @pixora/pixolink
```

---

## Quick Start

### 1. Create Configuration

Create `pixo.config.json`:

```json
{
  "project_name": "my-app",
  "connectors": {
    "supabase": {
      "url": "${SUPABASE_URL}",
      "anonKey": "${SUPABASE_ANON_KEY}"
    },
    "ai": {
      "provider": "gemini",
      "apiKey": "${GEMINI_API_KEY}"
    }
  },
  "modules": {
    "weavai": true,
    "pixopay": true
  }
}
```

### 2. Set Environment Variables

Create `.env`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-key-here
GEMINI_API_KEY=your-key-here
```

### 3. Initialize and Use

```typescript
import { PixoLink, useConnector } from '@pixora/pixolink';

// Initialize once at app startup
await PixoLink.init('./pixo.config.json');

// Use connectors
const ai = useConnector('ai-core');
const result = await ai.generate('Hello world');

console.log(result.text);
```

---

## Configuration

### Config File Structure

```typescript
{
  // Project metadata
  "project_name": string,
  "version"?: string,
  "description"?: string,
  "environment"?: "development" | "staging" | "production",

  // Connector configurations
  "connectors": {
    "supabase"?: {
      "url": string,
      "anonKey"?: string,
      "serviceKey"?: string
    },
    "ai"?: {
      "provider": "gemini" | "openai" | "anthropic" | "deepseek",
      "apiKey": string,
      "models"?: string[]
    },
    "payments"?: {
      "provider": "stripe" | "instapay" | "vf-cash",
      "apiKey": string
    },
    "analytics"?: [{
      "provider": "posthog" | "ga4" | "mixpanel",
      "apiKey": string
    }]
  },

  // Module configurations
  "modules": {
    "pixoguard"?: boolean | { enabled: boolean, config?: object },
    "logic_guardian"?: boolean | { enabled: boolean, config?: object },
    "weavai"?: boolean | { enabled: boolean, config?: object },
    "pixopay"?: boolean | { enabled: boolean, config?: object },
    "lumina"?: boolean | { enabled: boolean, config?: object },
    "admin_dashboard"?: boolean | { enabled: boolean, config?: object }
  },

  // Global settings
  "telemetry"?: {
    "enabled": boolean,
    "anonymous": boolean
  },
  "locale"?: "en" | "ar"
}
```

### Environment Variable Interpolation

Use `${VAR}` syntax to reference environment variables:

```json
{
  "connectors": {
    "supabase": {
      "url": "${SUPABASE_URL}",
      "anonKey": "${SUPABASE_ANON_KEY}",
      "serviceKey": "${SUPABASE_SERVICE_KEY:-default_value}"
    }
  }
}
```

Syntax:
- `${VAR}` — Required variable (throws if missing)
- `${VAR:-default}` — Optional with fallback

---

## Core Concepts

### 1. PixoLink Instance

Central orchestrator that manages everything:

```typescript
const pixo = await PixoLink.init('./pixo.config.json');

// Access subsystems
pixo.logger       // Logger
pixo.eventBus     // Event bus
pixo.connectors   // Connector hub
pixo.plugins      // Plugin registry
pixo.config       // Configuration

// Get status
const status = await pixo.getStatus();

// Shutdown
await pixo.shutdown();
```

### 2. Connectors

External service integrations (databases, AI, payments, analytics):

```typescript
const ai = useConnector('ai-core');
const db = useConnector('supabase');
const payment = useConnector('pixopay');
```

### 3. Plugins

Feature modules that can be enabled/disabled:

```typescript
const lumina = usePlugin('lumina');
const guardian = usePlugin('logic-guardian');
```

### 4. Event Bus

Inter-module communication:

```typescript
const pixo = PixoLink.getInstance();

// Subscribe
pixo.eventBus.on('event:name', (data) => {
  console.log('Event received:', data);
});

// Publish
await pixo.eventBus.emit('event:name', { key: 'value' });
```

---

## Connectors

### Supabase Connector

```typescript
const db = useConnector('supabase');
const client = db.getClient();

// Use Supabase client
const { data, error } = await client
  .from('users')
  .select('*')
  .eq('id', userId);

// Or use helper
const users = await db.executeQuery('fetch_users', () =>
  client.from('users').select('*')
);
```

### AI Connector

```typescript
const ai = useConnector('ai-core');

// Generate text
const result = await ai.generate('Write a poem about AI', {
  model: 'gemini-2.0-flash-exp',
  temperature: 0.7,
  maxTokens: 500
});

console.log(result.text);
console.log(`Tokens used: ${result.usage?.inputTokens} in, ${result.usage?.outputTokens} out`);
```

### Payment Connector

```typescript
const payment = useConnector('pixopay');

const result = await payment.processPayment({
  amount: 99.99,
  currency: 'USD',
  customerInfo: {
    email: 'customer@example.com',
    phone: '+1234567890'
  },
  metadata: {
    orderId: 'ORD-12345'
  }
});

if (result.success) {
  console.log('Transaction ID:', result.transactionId);
}
```

### Analytics Connector

```typescript
const analytics = useConnector('analytics');

// Track event
await analytics.track({
  name: 'button_clicked',
  properties: {
    button_name: 'signup',
    page: '/landing'
  },
  userId: 'user-123'
});

// Identify user
await analytics.identify('user-123', {
  email: 'user@example.com',
  plan: 'pro'
});
```

---

## Modules

### Logic Guardian

Runtime validation and circuit breakers:

```typescript
const guardian = usePlugin('logic-guardian');

// Execute with circuit breaker
const result = await guardian.executeWithCircuitBreaker(
  async () => {
    return await externalAPI.call();
  },
  { maxRetries: 3, timeout: 5000 }
);

// Validate data
guardian.validate(data, schema);
```

### LUMINA Engine

AI image/video generation:

```typescript
const lumina = usePlugin('lumina');

// Text to image
const image = await lumina.textToImage('Egyptian pyramids at sunset');

// Image to video
const video = await lumina.imageToVideo(image.url, {
  duration: 5,
  fps: 30
});

// Image to image
const enhanced = await lumina.imageToImage(image.url, {
  prompt: 'Make it more cinematic',
  strength: 0.7
});
```

### PixoGuard

Security and behavior intelligence:

```typescript
const guard = usePlugin('pixoguard');

// Scan database schema
await guard.scanSchema();

// Check RLS policies
const issues = await guard.checkRLS();

// Auto-fix issues
await guard.applyFixes(issues);
```

---

## Event System

### Built-in Events

```typescript
const pixo = PixoLink.getInstance();

// Lifecycle events
pixo.eventBus.on('pixolink:initialized', () => {});
pixo.eventBus.on('pixolink:shutdown', () => {});

// AI events
pixo.eventBus.on('ai:generation:start', (prompt) => {});
pixo.eventBus.on('ai:generation:complete', (result) => {});
pixo.eventBus.on('ai:generation:error', (error) => {});

// Payment events
pixo.eventBus.on('payment:success', (transaction) => {});
pixo.eventBus.on('payment:failed', (error) => {});

// Custom events
pixo.eventBus.on('app:user:signup', (user) => {});
```

### Publishing Events

```typescript
await pixo.eventBus.emit('app:custom:event', {
  data: 'value',
  timestamp: new Date()
});
```

### One-time Handlers

```typescript
pixo.eventBus.once('app:ready', () => {
  console.log('App is ready!');
});
```

---

## Error Handling

### Try-Catch Pattern

```typescript
try {
  const result = await ai.generate(prompt);
} catch (error) {
  console.error('AI generation failed:', error);
  // Handle error
}
```

### Circuit Breaker Pattern

```typescript
const guardian = usePlugin('logic-guardian');

const result = await guardian.executeWithCircuitBreaker(
  async () => risky Operation(),
  {
    maxRetries: 3,
    timeout: 10000,
    fallback: () => defaultValue()
  }
);
```

### Validation

```typescript
const guardian = usePlugin('logic-guardian');

try {
  guardian.validate(userData, userSchema);
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

---

## Best Practices

### 1. Initialize Once

```typescript
// ✅ Good - Initialize at app startup
const pixo = await PixoLink.init();

// ❌ Bad - Multiple initializations
await PixoLink.init();
await PixoLink.init(); // Throws error!
```

### 2. Use Connectors via Helpers

```typescript
// ✅ Good
const ai = useConnector('ai-core');

// ❌ Bad
const pixo = PixoLink.getInstance();
const ai = pixo.connectors.get('ai-core');
```

### 3. Always Shutdown

```typescript
try {
  await PixoLink.init();
  // Your app logic
} finally {
  await PixoLink.getInstance().shutdown();
}
```

### 4. Handle Errors Gracefully

```typescript
try {
  const result = await ai.generate(prompt);
} catch (error) {
  logger.error('Generation failed', error);
  // Fallback logic
}
```

### 5. Use Environment Variables

```typescript
// ✅ Good - Use env vars
{
  "apiKey": "${API_KEY}"
}

// ❌ Bad - Hardcode secrets
{
  "apiKey": "sk-1234567890"
}
```

---

## Examples

### Example 1: AI Image Generation App

```typescript
import { PixoLink, useConnector } from '@pixora/pixolink';

await PixoLink.init();

const ai = useConnector('ai-core');
const lumina = usePlugin('lumina');
const db = useConnector('supabase');

// Generate description
const description = await ai.generate('Describe a futuristic city');

// Generate image
const image = await lumina.textToImage(description.text);

// Save to database
const client = db.getClient();
await client.from('generations').insert({
  prompt: description.text,
  image_url: image.url,
  created_at: new Date()
});

console.log('Image generated:', image.url);
```

### Example 2: SaaS with Payments

```typescript
await PixoLink.init();

const payment = useConnector('pixopay');
const db = useConnector('supabase');
const analytics = useConnector('analytics');

// Process subscription payment
const result = await payment.processPayment({
  amount: 49.99,
  currency: 'USD',
  customerInfo: { email: user.email }
});

if (result.success) {
  // Update database
  const client = db.getClient();
  await client.from('subscriptions').insert({
    user_id: user.id,
    plan: 'pro',
    transaction_id: result.transactionId
  });

  // Track conversion
  await analytics.track({
    name: 'subscription_purchased',
    properties: { plan: 'pro', amount: 49.99 },
    userId: user.id
  });
}
```

---

## Need Help?

- 📚 [Full API Reference](./API_REFERENCE.md)
- 🤖 [AI Agents Guide](./AI_AGENTS_GUIDE.md)
- 💬 [Discord Community](https://discord.gg/pixolink)
- 🐛 [Report Issues](https://github.com/pixora/pixolink/issues)

---

**Happy Building! 🎨✨**
