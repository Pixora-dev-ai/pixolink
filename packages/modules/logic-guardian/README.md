# @mamdouh-aboammar/pixolink-logic-guardian

Logic Guardian module for PixoLink SDK — Runtime validation, circuit breakers, and defensive programming patterns.

## Features

- ✅ **Schema Validation** — Zod-based runtime validation
- 🔄 **Circuit Breakers** — Prevent cascading failures
- 🛡️ **Invariant Checks** — Pre/post-condition validation
- 🎯 **State Machines** — Type-safe state transitions
- 👁️ **Side Effect Tracking** — Monitor and control side effects
- 📊 **Performance Monitoring** — Track execution metrics

## Installation

This module is included with PixoLink SDK:

```bash
npm install @mamdouh-aboammar/pixolink
```

Or install separately:

```bash
npm install @mamdouh-aboammar/pixolink-logic-guardian
```

## Configuration

Add to your `pixo.config.json`:

```json
{
  "modules": {
    "logic_guardian": {
      "enabled": true,
      "config": {
        "debug": false,
        "circuitBreaker": {
          "maxFailures": 5,
          "resetTimeout": 60000,
          "timeout": 10000
        },
        "sideEffectTracking": {
          "enabled": true,
          "maxHistory": 1000,
          "warnOnUnknownEffect": true
        },
        "validation": {
          "abortEarly": false,
          "throwOnError": true
        }
      }
    }
  }
}
```

## Usage

### Basic Validation

```typescript
import { usePlugin } from '@mamdouh-aboammar/pixolink';
import { z } from 'zod';

const guardian = usePlugin('logic-guardian');

// Define schema
const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().positive()
});

// Validate data
const result = await guardian.validate(userData, userSchema);

if (result.success) {
  console.log('Valid user:', result.data);
} else {
  console.error('Validation errors:', result.errors);
}
```

### Circuit Breaker Pattern

```typescript
// Protect external API calls
const result = await guardian.executeWithCircuitBreaker(
  'external-api',
  async () => {
    const response = await fetch('https://api.example.com/data');
    return response.json();
  },
  {
    maxFailures: 3,
    resetTimeout: 30000,
    timeout: 5000
  }
);

// Check circuit breaker stats
const stats = guardian.getCircuitBreakerStats('external-api');
console.log('Circuit breaker stats:', stats);
```

### Invariant Checks

```typescript
// Precondition check
guardian.requireNotNull(userId, 'userId');
guardian.requirePositive(amount, 'amount');
guardian.requireInRange(age, 0, 120, 'age');

// Custom invariant
guardian.require(
  (value) => value.length > 0,
  items,
  'Items array must not be empty'
);

// Postcondition check
guardian.ensure(
  (result) => result.status === 'success',
  apiResult,
  'API call must succeed'
);
```

### State Machines

```typescript
// Create state machine
const orderStateMachine = guardian.createStateMachine({
  initialState: 'pending',
  transitions: [
    { from: 'pending', to: 'processing', event: 'process' },
    { from: 'processing', to: 'completed', event: 'complete' },
    { from: 'processing', to: 'failed', event: 'fail' },
    { from: 'failed', to: 'pending', event: 'retry' }
  ]
});

// Transition between states
orderStateMachine.transition('process'); // pending -> processing
orderStateMachine.transition('complete'); // processing -> completed

console.log('Current state:', orderStateMachine.getState());
```

### Side Effect Tracking

```typescript
// Track side effects during execution
const result = await guardian.trackSideEffects(
  async () => {
    // This function's side effects will be tracked
    await database.insert(data);
    await cache.set(key, value);
    return computeResult();
  },
  {
    allowedEffects: ['database_write', 'cache_write'],
    forbiddenEffects: ['network_call'],
    label: 'data-processing'
  }
);

// Check side effect summary
const summary = guardian.getSideEffectSummary();
console.log('Side effects:', summary);
```

### Mutation Detection

```typescript
// Create snapshot before mutation
const original = { name: 'John', age: 30 };
const tracked = guardian.snapshot(original, 'user-object');

// Modify the object
tracked.age = 31;

// Verify mutations (will throw if mutated)
try {
  guardian.verifyNoMutations(tracked);
} catch (error) {
  console.error('Object was mutated!', error);
}
```

### Complete Example

```typescript
import { PixoLink, usePlugin } from '@mamdouh-aboammar/pixolink';
import { z } from 'zod';

await PixoLink.init('./pixo.config.json');

const guardian = usePlugin('logic-guardian');

// Schema
const orderSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().positive(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive()
  })).min(1)
});

// Process order with full protection
async function processOrder(orderData: unknown) {
  // Validate input
  const validation = await guardian.validate(orderData, orderSchema);
  if (!validation.success) {
    throw new Error('Invalid order data');
  }

  const order = validation.data;

  // Check invariants
  guardian.requireNotEmpty(order.items, 'order.items');
  guardian.requirePositive(order.amount, 'order.amount');

  // Execute with circuit breaker
  const result = await guardian.executeWithCircuitBreaker(
    'payment-gateway',
    async () => {
      return await paymentGateway.charge(order.amount);
    },
    { maxFailures: 3, timeout: 10000 }
  );

  // Track side effects
  await guardian.trackSideEffects(
    async () => {
      await database.saveOrder(order);
      await analytics.track('order_completed', { orderId: order.id });
    },
    { allowedEffects: ['database_write', 'analytics'] }
  );

  return result;
}
```

## API Reference

### Validation Methods

- `validate<T>(data, schema, options?)` — Validate single item
- `validateBatch<T>(items, schema, options?)` — Validate array of items

### Circuit Breaker Methods

- `executeWithCircuitBreaker<T>(name, fn, config?)` — Execute with protection
- `getCircuitBreakerStats(name?)` — Get statistics

### State Machine Methods

- `createStateMachine<S>(config)` — Create state machine

### Side Effect Methods

- `trackSideEffects<T>(fn, options?)` — Track during execution
- `snapshot<T>(obj, label?)` — Create snapshot
- `verifyNoMutations<T>(obj)` — Verify no changes
- `getSideEffectSummary()` — Get summary
- `clearSideEffects()` — Clear history

### Invariant Methods

- `require<T>(condition, value, message, options?)` — Precondition
- `ensure<T>(condition, value, message, options?)` — Postcondition
- `requireNotNull<T>(value, name?)` — Null check
- `requireNotEmpty<T>(array, name?)` — Empty check
- `requirePositive(value, name?)` — Positive number
- `requireInRange(value, min, max, name?)` — Range check

### Reporting Methods

- `getReport()` — Get full report

## Advanced Configuration

### Custom Circuit Breaker

```typescript
const config = {
  maxFailures: 5,        // Open after 5 failures
  resetTimeout: 60000,   // Try again after 60s
  timeout: 10000,        // Request timeout 10s
  halfOpenRequests: 3,   // Test with 3 requests
  fallback: () => defaultValue  // Fallback function
};
```

### Custom Validation Options

```typescript
const options = {
  abortEarly: false,     // Collect all errors
  throwOnError: true,    // Throw on validation failure
  stripUnknown: false    // Keep unknown properties
};
```

## License

MIT
