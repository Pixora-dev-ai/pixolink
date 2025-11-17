# @pixora/pixolink-admin-dashboard

Admin Dashboard plugin for PixoLink — User management, credits, payments, and system administration.

## 🎯 Overview

The Admin Dashboard plugin provides comprehensive admin functionality APIs for managing PixoRA applications:

- **User Management** - CRUD operations, roles, status management
- **Credits Management** - Add/deduct credits, transaction history
- **Payment Management** - View payments, refunds, revenue reports
- **System Analytics** - Real-time stats, user activity, revenue tracking

## 📦 Installation

```bash
pnpm add @pixora/pixolink-admin-dashboard
```

## 🚀 Quick Start

### Basic Setup

```typescript
import { PixoLink } from '@pixora/pixolink-core';
import { createAdminDashboardPlugin } from '@pixora/pixolink-admin-dashboard';

// Initialize PixoLink with Admin Dashboard
const pixo = await PixoLink.init('./pixo.config.json');

// Get Admin Dashboard API
const admin = pixo.plugins.get('admin-dashboard');
const api = admin.getAPI();

// List all users
const users = await api.users.list();
console.log('Total users:', users.length);

// Get system stats
const stats = await api.analytics.getStats();
console.log('Active users:', stats.activeUsers);
```

### Configuration

Add to your `pixo.config.json`:

```json
{
  "plugins": {
    "admin-dashboard": {
      "enabled": true,
      "config": {
        "userManagement": {
          "enabled": true,
          "allowBulkOperations": true
        },
        "credits": {
          "enabled": true,
          "autoRefresh": true
        },
        "payments": {
          "enabled": true,
          "providers": ["stripe", "instapay", "vfcash"]
        },
        "analytics": {
          "enabled": true,
          "realtime": true
        },
        "permissions": {
          "requireAdminRole": true,
          "allowedUsers": ["admin@pixora.ai"]
        }
      }
    }
  }
}
```

## 📚 API Reference

### User Management

```typescript
// List users
const users = await api.users.list();

// Filter users
const admins = await api.users.list({ role: 'admin' });
const activeUsers = await api.users.list({ status: 'active' });

// Get specific user
const user = await api.users.get('user-id');

// Update user
await api.users.update('user-id', {
  role: 'admin',
  credits: 1000,
});

// Suspend user
await api.users.suspend('user-id', 'Violating terms of service');

// Activate user
await api.users.activate('user-id');

// Delete user
await api.users.delete('user-id');
```

### Credits Management

```typescript
// Get user's credit balance
const balance = await api.credits.getBalance('user-id');

// Add credits
await api.credits.addCredits('user-id', 100, 'Promotional bonus');

// Deduct credits
await api.credits.deductCredits('user-id', 50, 'Image generation');

// Get transaction history
const transactions = await api.credits.getTransactions('user-id');
transactions.forEach(tx => {
  console.log(`${tx.type}: ${tx.amount} credits - ${tx.reason}`);
});
```

### Payment Management

```typescript
// List all payments
const allPayments = await api.payments.list();

// Filter by status
const completedPayments = await api.payments.list({ status: 'completed' });

// Filter by user
const userPayments = await api.payments.list({ userId: 'user-id' });

// Get specific payment
const payment = await api.payments.get('payment-id');

// Refund payment
await api.payments.refund('payment-id', 'Customer request');
```

### System Analytics

```typescript
// Get overall system stats
const stats = await api.analytics.getStats();
console.log('System Stats:', {
  totalUsers: stats.totalUsers,
  activeUsers: stats.activeUsers,
  totalCredits: stats.totalCredits,
  totalRevenue: stats.totalRevenue,
  activeGenerations: stats.activeGenerations,
  systemHealth: stats.systemHealth,
});

// Get user activity for last 7 days
const activity = await api.analytics.getUserActivity(7);
console.log('User Signups by Day:', activity);

// Get revenue by day for last 30 days
const revenue = await api.analytics.getRevenueByDay(30);
console.log('Revenue by Day:', revenue);
```

## 🎭 Events

The Admin Dashboard plugin emits events for all admin actions:

### User Events

```typescript
pixo.eventBus.on('admin-dashboard:user-updated', ({ userId, updates }) => {
  console.log(`User ${userId} updated:`, updates);
});

pixo.eventBus.on('admin-dashboard:user-deleted', ({ userId }) => {
  console.log(`User ${userId} deleted`);
});

pixo.eventBus.on('admin-dashboard:user-suspended', ({ userId, reason }) => {
  console.log(`User ${userId} suspended:`, reason);
});

pixo.eventBus.on('admin-dashboard:user-activated', ({ userId }) => {
  console.log(`User ${userId} activated`);
});
```

### Credits Events

```typescript
pixo.eventBus.on('admin-dashboard:credits-added', (transaction) => {
  console.log('Credits added:', transaction);
});

pixo.eventBus.on('admin-dashboard:credits-deducted', (transaction) => {
  console.log('Credits deducted:', transaction);
});
```

### Payment Events

```typescript
pixo.eventBus.on('admin-dashboard:payment-refunded', ({ paymentId, reason }) => {
  console.log(`Payment ${paymentId} refunded:`, reason);
});
```

## 🔧 Advanced Usage

### Bulk User Operations

```typescript
// Suspend multiple users
const usersToSuspend = ['user1', 'user2', 'user3'];

for (const userId of usersToSuspend) {
  await api.users.suspend(userId, 'Bulk suspension');
}

// Add credits to multiple users
const usersForBonus = ['user1', 'user2', 'user3'];

for (const userId of usersForBonus) {
  await api.credits.addCredits(userId, 50, 'Welcome bonus');
}
```

### Credit Management with Validation

```typescript
import { z } from 'zod';

const creditSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().min(5),
});

async function addCreditsWithValidation(data: unknown) {
  const validated = creditSchema.parse(data);
  
  return await api.credits.addCredits(
    validated.userId,
    validated.amount,
    validated.reason
  );
}
```

### Revenue Reports

```typescript
// Generate monthly revenue report
async function generateMonthlyReport() {
  const revenue = await api.analytics.getRevenueByDay(30);
  
  const total = Object.values(revenue).reduce((sum, amount) => sum + amount, 0);
  const average = total / 30;
  
  return {
    total,
    average,
    dailyBreakdown: revenue,
  };
}

const report = await generateMonthlyReport();
console.log('Monthly Revenue:', report);
```

### Real-time System Monitoring

```typescript
// Monitor system health every minute
setInterval(async () => {
  const stats = await api.analytics.getStats();
  
  if (stats.systemHealth !== 'healthy') {
    console.error('System health degraded!', stats);
    
    // Send alert
    pixo.eventBus.emit('system:health-alert', {
      status: stats.systemHealth,
      timestamp: Date.now(),
      metrics: stats,
    });
  }
}, 60000);
```

### User Activity Dashboard

```typescript
// Build real-time dashboard data
async function getDashboardData() {
  const [stats, activity, revenue, payments] = await Promise.all([
    api.analytics.getStats(),
    api.analytics.getUserActivity(7),
    api.analytics.getRevenueByDay(30),
    api.payments.list({ status: 'completed' }),
  ]);
  
  return {
    overview: stats,
    userGrowth: activity,
    revenueGrowth: revenue,
    recentPayments: payments.slice(0, 10),
  };
}

const dashboard = await getDashboardData();
console.log('Dashboard Data:', dashboard);
```

## 🔒 Security & Permissions

### Role-Based Access

```typescript
// Check if user is admin before allowing operations
async function ensureAdmin(userId: string) {
  const user = await api.users.get(userId);
  
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized: Admin role required');
  }
}

// Protected admin action
async function protectedAdminAction(userId: string, targetUserId: string) {
  await ensureAdmin(userId);
  
  // Perform admin action
  await api.users.suspend(targetUserId, 'Admin action');
}
```

### Audit Logging

```typescript
// Log all admin actions
pixo.eventBus.on('admin-dashboard:*', (event, data) => {
  console.log('Admin Action:', {
    event,
    data,
    timestamp: new Date().toISOString(),
  });
  
  // Store in audit log
  // await supabase.from('audit_log').insert({ event, data, timestamp });
});
```

## 📊 TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
  AdminDashboardConfig,
  AdminUser,
  CreditTransaction,
  PaymentRecord,
  SystemStats,
} from '@pixora/pixolink-admin-dashboard';

// Fully typed configuration
const config: AdminDashboardConfig = {
  userManagement: {
    enabled: true,
    allowBulkOperations: true,
  },
  credits: {
    enabled: true,
    autoRefresh: true,
  },
};

// Fully typed API responses
const user: AdminUser = await api.users.get('user-id');
const transaction: CreditTransaction = await api.credits.addCredits('user-id', 100);
const stats: SystemStats = await api.analytics.getStats();
```

## 🐛 Troubleshooting

### Plugin Not Loading

```typescript
// Check if plugin is registered
if (!pixo.plugins.has('admin-dashboard')) {
  console.error('Admin Dashboard plugin not loaded');
}

// Check plugin status
const status = pixo.plugins.get('admin-dashboard').getStatus();
console.log('Plugin status:', status);
```

### Supabase Connector Missing

```typescript
// Verify Supabase connector is available
if (!pixo.connectors.has('supabase')) {
  console.error('Supabase connector required');
  // Add Supabase configuration to pixo.config.json
}
```

### Permission Errors

```typescript
// Check user permissions
const user = await api.users.get('user-id');

if (user.role !== 'admin') {
  console.error('User does not have admin permissions');
}
```

## 📄 License

MIT © PixoRA Team

## 🔗 Related Packages

- [@pixora/pixolink-core](../../../core) - Core PixoLink SDK
- [@pixora/pixolink-intelligence-core](../intelligence-core) - Intelligence orchestration
- [@pixora/pixolink-pixopay](../pixopay) - Payment processing
- [@pixora/pixolink-logic-guardian](../logic-guardian) - Validation and error handling
