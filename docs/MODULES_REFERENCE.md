# 📦 PixoLink Modules Reference

> **Complete API reference for all PixoLink modules**

---

## Table of Contents

- [Core SDK](#core-sdk)
- [Admin Dashboard](#admin-dashboard)
- [Intelligence Core](#intelligence-core)
- [Logic Guardian](#logic-guardian)
- [PixoGuard](#pixoguard)
- [PixoPay](#pixopay)
- [WeavAI](#weavai)

---

## Core SDK

**Package**: `@mamdouh-aboammar/pixolink`

### Installation

```bash
npm install @mamdouh-aboammar/pixolink
```

### API

#### `PixoLink.init(configPath: string): Promise<void>`

Initialize PixoLink with configuration file.

```typescript
await PixoLink.init('./pixo.config.json');
```

#### `PixoLink.useConnector<T>(type: ConnectorType): T`

Get a connector instance.

```typescript
const supabase = PixoLink.useConnector('supabase');
const ai = PixoLink.useConnector('ai-core');
```

#### `PixoLink.registerPlugin(plugin: Plugin): void`

Register a custom plugin.

```typescript
PixoLink.registerPlugin(myCustomPlugin);
```

---

## Admin Dashboard

**Package**: `@mamdouh-aboammar/pixolink-admin-dashboard`

### Installation

```bash
npm install @mamdouh-aboammar/pixolink-admin-dashboard
```

### Components

#### `<AdminDashboard />`

Complete admin interface with all features.

```tsx
import { AdminDashboard } from '@mamdouh-aboammar/pixolink-admin-dashboard';

function AdminPage() {
  return <AdminDashboard />;
}
```

#### `<UserManagement />`

User management component.

```tsx
import { UserManagement } from '@mamdouh-aboammar/pixolink-admin-dashboard';

<UserManagement 
  onUserUpdate={(user) => console.log('Updated:', user)}
/>
```

---

## Intelligence Core

**Package**: `@mamdouh-aboammar/pixolink-intelligence-core`

### Installation

```bash
npm install @mamdouh-aboammar/pixolink-intelligence-core
```

### Features

- AI orchestration
- Predictive analytics
- Telemetry tracking
- Event streaming

---

## Logic Guardian

**Package**: `@mamdouh-aboammar/pixolink-logic-guardian`

### Installation

```bash
npm install @mamdouh-aboammar/pixolink-logic-guardian
```

### Decorators

#### `@validateWith(schema: ZodSchema)`

Validate method input with Zod schema.

```typescript
import { validateWith } from '@mamdouh-aboammar/pixolink-logic-guardian';
import { z } from 'zod';

class UserService {
  @validateWith(z.object({
    email: z.string().email()
  }))
  async createUser(data: { email: string }) {
    // Auto-validated
  }
}
```

#### `@circuitBreaker(options: CircuitBreakerOptions)`

Add circuit breaker protection.

```typescript
@circuitBreaker({ threshold: 5, timeout: 60000 })
async callExternalAPI() {
  // Protected from cascading failures
}
```

---

## PixoGuard

**Package**: `@mamdouh-aboammar/pixolink-pixoguard`

### Installation

```bash
npm install @mamdouh-aboammar/pixolink-pixoguard
```

### API

#### `PixoGuard.enable(config: PixoGuardConfig): Promise<void>`

Enable security monitoring.

```typescript
await PixoGuard.enable({
  alertThreshold: 5,
  suspiciousPatterns: ['excessive_queries']
});
```

---

## PixoPay

**Package**: `@mamdouh-aboammar/pixolink-pixopay`

### Installation

```bash
npm install @mamdouh-aboammar/pixolink-pixopay
```

### API

#### `processPayment(options: PaymentOptions): Promise<PaymentResult>`

Process a payment.

```typescript
const payment = PixoLink.useConnector('payments');

const result = await payment.processPayment({
  amount: 100,
  currency: 'USD',
  method: 'stripe'
});
```

---

## WeavAI

**Package**: `@mamdouh-aboammar/pixolink-weavai`

### Installation

```bash
npm install @mamdouh-aboammar/pixolink-weavai
```

### API

#### `generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult>`

Generate AI content.

```typescript
const ai = PixoLink.useConnector('ai-core');

const result = await ai.generate('Egyptian portrait', {
  model: 'imagen-3.0-generate-001',
  aspectRatio: '1:1'
});
```

---

**Last Updated**: November 17, 2025  
**Version**: 1.0.0
