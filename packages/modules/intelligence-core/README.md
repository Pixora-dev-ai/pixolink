# @mamdouh-aboammar/pixolink-intelligence-core

Intelligence Orchestration Layer (IOL) plugin for PixoLink — Unified AI coordination, telemetry, and predictive analytics.

## 🎯 Overview

The Intelligence Core plugin wraps PixoRA's Intelligence Orchestration Layer, providing:

- **IOL Event Bus** - Inter-module communication system
- **Module Registry** - Track and manage active modules
- **Telemetry Suite** - Metrics, error tracking, usage analytics
- **Predictive Analytics** - Forecasting and summary generation
- **WeavAI Service** - Multi-provider AI orchestration

## 📦 Installation

```bash
pnpm add @mamdouh-aboammar/pixolink-intelligence-core
```

## 🚀 Quick Start

### Basic Setup

```typescript
import { PixoLink } from '@mamdouh-aboammar/pixolink-core';
import { createIntelligenceCorePlugin } from '@mamdouh-aboammar/pixolink-intelligence-core';

// Initialize PixoLink with Intelligence Core
const pixo = await PixoLink.init('./pixo.config.json');

// Get Intelligence Core API
const intelligenceCore = pixo.plugins.get('intelligence-core');
const api = intelligenceCore.getAPI();

// Use IOL Event Bus
api.eventBus.emit({
  type: 'DATA',
  moduleId: 'my-module',
  timestamp: Date.now(),
  payload: { message: 'Hello from Intelligence Core!' },
});

// Register a module
api.registry.register({
  id: 'my-module',
  name: 'My Module',
  version: '1.0.0',
  status: 'active',
});

// Track metrics
api.telemetry.metrics.track('user_action', { action: 'click', target: 'button' });

// Get AI insights
const insight = await api.weavAI.getInsight('Analyze user behavior patterns');
console.log(insight);
```

### Configuration

Add to your `pixo.config.json`:

```json
{
  "plugins": {
    "intelligence-core": {
      "enabled": true,
      "config": {
        "telemetry": {
          "enabled": true,
          "metricsInterval": 60000,
          "errorReporting": true
        },
        "predictive": {
          "enabled": true,
          "forecastWindow": 24
        },
        "weavAI": {
          "enabled": true,
          "providers": ["gemini", "openai"]
        },
        "eventBus": {
          "maxListeners": 100,
          "debugMode": false
        }
      }
    }
  }
}
```

## 📚 API Reference

### Event Bus

```typescript
// Emit events
api.eventBus.emit({
  type: 'DATA' | 'SYSTEM' | 'ERROR' | 'TELEMETRY' | 'PREDICTION',
  moduleId: string,
  timestamp: number,
  payload: any,
});

// Listen to events
api.eventBus.on('DATA', (event) => {
  console.log('Received event:', event);
});

// Listen once
api.eventBus.once('SYSTEM', (event) => {
  console.log('System event:', event);
});

// Remove listener
api.eventBus.off('DATA', handler);
```

### Module Registry

```typescript
// Register a module
api.registry.register({
  id: 'my-module',
  name: 'My Module',
  version: '1.0.0',
  status: 'active',
  capabilities: ['data-processing', 'ai-inference'],
});

// Get module info
const module = api.registry.get('my-module');

// List all modules
const modules = api.registry.listModules();

// Remove module
api.registry.remove('my-module');
```

### Telemetry

#### Metrics

```typescript
// Track metrics
api.telemetry.metrics.track('event_name', {
  userId: '123',
  action: 'click',
  timestamp: Date.now(),
});

// Get snapshot
const snapshot = api.telemetry.metrics.getSnapshot();
console.log('Total events:', snapshot.totalEvents);
```

#### Error Tracking

```typescript
// Track errors
try {
  // ... code that might fail
} catch (error) {
  api.telemetry.errors.track(error, {
    userId: '123',
    context: 'user-action',
  });
}

// Get recent errors
const recentErrors = api.telemetry.errors.getRecent();
```

#### Usage Events

```typescript
// Track usage
api.telemetry.usage.track('page_view', 'user123');
api.telemetry.usage.track('feature_used', 'user123');

// Get stats
const stats = api.telemetry.usage.getStats();
console.log('Total users:', stats.totalUsers);
console.log('Total events:', stats.totalEvents);
```

### Predictive Analytics

```typescript
// Generate predictive summary
const summary = await api.predictive.generateSummary();
console.log('Forecast:', summary.forecast);

// Visualize forecast
const visualization = api.predictive.visualizeForecast(summary);
console.log(visualization);
```

### WeavAI Service

```typescript
// Get AI insights
const insight = await api.weavAI.getInsight('What are the key trends?');
console.log('Insight:', insight.text);

// Analyze images
const imageAnalysis = await api.weavAI.analyzeImage(base64ImageData);
console.log('Analysis:', imageAnalysis);
```

## 🎭 Events

The Intelligence Core plugin emits the following events to the PixoLink EventBus:

### System Events

```typescript
pixo.eventBus.on('iol:system', (event) => {
  console.log('IOL system event:', event);
});
```

### Data Events

```typescript
pixo.eventBus.on('iol:data', (event) => {
  console.log('IOL data event:', event);
});
```

### Error Events

```typescript
pixo.eventBus.on('iol:error', (event) => {
  console.error('IOL error:', event);
});
```

### Telemetry Events

```typescript
pixo.eventBus.on('iol:telemetry', (event) => {
  console.log('IOL telemetry:', event);
});
```

### Metrics Snapshots

```typescript
pixo.eventBus.on('intelligence-core:metrics', (snapshot) => {
  console.log('Metrics snapshot:', snapshot);
});
```

## 🏗️ Architecture

```
Intelligence Core Plugin
├── IOL Event Bus
│   ├── Event emission
│   ├── Event subscription
│   └── Event bridging to PixoLink
├── Module Registry
│   ├── Module registration
│   ├── Module tracking
│   └── Capability discovery
├── Telemetry Suite
│   ├── Metrics Tracker
│   ├── Error Reporter
│   └── Usage Events
├── Predictive Analytics
│   ├── Summary Generator
│   └── Forecast Visualizer
└── WeavAI Service
    ├── Multi-provider orchestration
    ├── Insight generation
    └── Image analysis
```

## 🔧 Advanced Usage

### Custom Event Handlers

```typescript
// Create custom event handler
api.eventBus.on('DATA', (event) => {
  if (event.moduleId === 'analytics') {
    // Process analytics events
    api.telemetry.metrics.track('analytics_event', event.payload);
  }
});
```

### Module Health Monitoring

```typescript
// Monitor module health
setInterval(() => {
  const modules = api.registry.listModules();
  
  modules.forEach(module => {
    if (module.status !== 'active') {
      console.warn(`Module ${module.id} is ${module.status}`);
      
      api.telemetry.errors.track(
        new Error(`Module unhealthy: ${module.id}`),
        { module }
      );
    }
  });
}, 30000); // Check every 30 seconds
```

### Predictive Alerts

```typescript
// Generate alerts based on predictions
const summary = await api.predictive.generateSummary();

if (summary.forecast.trend === 'declining') {
  api.eventBus.emit({
    type: 'PREDICTION',
    moduleId: 'intelligence-core',
    timestamp: Date.now(),
    payload: {
      alert: 'Declining trend detected',
      forecast: summary.forecast,
    },
  });
}
```

## 📊 Metrics and Monitoring

### Plugin Health

```typescript
const status = intelligenceCore.getStatus();

console.log('Healthy:', status.healthy);
console.log('Registered modules:', status.metrics?.registeredModules);
console.log('Total events:', status.metrics?.totalEvents);
console.log('Uptime:', status.metrics?.uptime);
```

### Telemetry Dashboard

```typescript
// Get comprehensive telemetry
const snapshot = api.telemetry.metrics.getSnapshot();
const errors = api.telemetry.errors.getRecent();
const usage = api.telemetry.usage.getStats();

const dashboard = {
  metrics: snapshot,
  errors: errors.slice(0, 10), // Last 10 errors
  usage,
  modules: api.registry.listModules(),
};

console.log('Dashboard:', dashboard);
```

## 🛠️ Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `telemetry.enabled` | boolean | true | Enable telemetry collection |
| `telemetry.metricsInterval` | number | - | Metrics snapshot interval (ms) |
| `telemetry.errorReporting` | boolean | true | Enable error reporting |
| `predictive.enabled` | boolean | false | Enable predictive analytics |
| `predictive.forecastWindow` | number | 24 | Forecast window (hours) |
| `weavAI.enabled` | boolean | true | Enable WeavAI service |
| `weavAI.providers` | string[] | - | AI providers to use |
| `eventBus.maxListeners` | number | 10 | Max event listeners |
| `eventBus.debugMode` | boolean | false | Enable debug logging |

## 🤝 Integration with Other Plugins

### With Logic Guardian

```typescript
// Validate IOL events
import { validateWith } from '@mamdouh-aboammar/pixolink-logic-guardian';

const eventSchema = z.object({
  type: z.enum(['DATA', 'SYSTEM', 'ERROR', 'TELEMETRY', 'PREDICTION']),
  moduleId: z.string(),
  timestamp: z.number(),
  payload: z.any(),
});

api.eventBus.on('DATA', validateWith(eventSchema, (event) => {
  // Process validated event
  console.log('Valid event:', event);
}));
```

### With WeavAI Plugin

```typescript
// Use WeavAI for event analysis
api.eventBus.on('DATA', async (event) => {
  if (event.type === 'DATA') {
    const insight = await api.weavAI.getInsight(
      `Analyze this event: ${JSON.stringify(event.payload)}`
    );
    
    console.log('AI Insight:', insight);
  }
});
```

## 📝 TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
  IntelligenceCoreConfig,
  IOLEvent,
  ModuleMetadata,
  WeavAIInsight,
  PredictiveSummary,
} from '@mamdouh-aboammar/pixolink-intelligence-core';

// Fully typed configuration
const config: IntelligenceCoreConfig = {
  telemetry: {
    enabled: true,
    metricsInterval: 60000,
  },
  predictive: {
    enabled: true,
    forecastWindow: 24,
  },
};

// Fully typed events
const event: IOLEvent = {
  type: 'DATA',
  moduleId: 'my-module',
  timestamp: Date.now(),
  payload: { message: 'Hello' },
};
```

## 🐛 Troubleshooting

### Plugin Not Loading

```typescript
// Check if plugin is registered
if (!pixo.plugins.has('intelligence-core')) {
  console.error('Intelligence Core plugin not loaded');
}

// Check plugin status
const status = pixo.plugins.get('intelligence-core').getStatus();
console.log('Plugin status:', status);
```

### Events Not Firing

```typescript
// Enable debug mode
const config = {
  eventBus: {
    debugMode: true,
  },
};

// Check event listeners
api.eventBus.on('DATA', (event) => {
  console.log('[DEBUG] Event received:', event);
});
```

### Telemetry Not Working

```typescript
// Verify telemetry is enabled
const api = pixo.plugins.get('intelligence-core').getAPI();

if (!api.telemetry) {
  console.error('Telemetry is disabled');
}

// Check metrics snapshot
const snapshot = api.telemetry?.metrics.getSnapshot();
console.log('Metrics snapshot:', snapshot);
```

## 📄 License

MIT © PixoRA Team

## 🔗 Related Packages

- [@mamdouh-aboammar/pixolink-core](../../../core) - Core PixoLink SDK
- [@mamdouh-aboammar/pixolink-weavai](../weavai) - WeavAI orchestration plugin
- [@mamdouh-aboammar/pixolink-logic-guardian](../logic-guardian) - Validation and error handling
- [@mamdouh-aboammar/pixolink-pixopay](../pixopay) - Payment processing
