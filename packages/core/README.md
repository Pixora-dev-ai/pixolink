# @pixora/pixolink

<div align="center">

![PixoLink Logo](https://img.shields.io/badge/PixoLink-Core-blue?style=for-the-badge)
[![npm version](https://img.shields.io/npm/v/@pixora/pixolink?style=flat-square)](https://www.npmjs.com/package/@pixora/pixolink)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](../../LICENSE)

**Unified SDK orchestrator for PixoRA ecosystem**

</div>

## 📦 Overview

PixoLink Core is the central orchestration layer for the PixoRA SDK ecosystem. It provides a unified interface for managing all PixoLink modules, coordinating their interactions, and ensuring seamless integration.

## ✨ Features

- 🎯 **Unified API** - Single entry point for all PixoLink modules
- 🔌 **Plugin System** - Extensible architecture for custom modules
- 🛡️ **Type Safety** - Full TypeScript support with Zod validation
- 🚀 **Performance** - Optimized for both CJS and ESM environments
- 📊 **Monitoring** - Built-in telemetry and observability

## 📥 Installation

```bash
# Using npm
npm install @pixora/pixolink

# Using pnpm
pnpm add @pixora/pixolink

# Using yarn
yarn add @pixora/pixolink
```

## 🚀 Quick Start

```typescript
import { PixoLink } from '@pixora/pixolink';

// Initialize PixoLink
const pixolink = new PixoLink({
  apiKey: 'your-api-key',
  environment: 'production'
});

// Use with modules
await pixolink.initialize();
```

## 📚 Available Modules

PixoLink Core works seamlessly with these modules:

- **[@pixora/pixolink-admin-dashboard](../modules/admin-dashboard)** - Admin & user management
- **[@pixora/pixolink-intelligence-core](../modules/intelligence-core)** - AI coordination
- **[@pixora/pixolink-logic-guardian](../modules/logic-guardian)** - Runtime validation
- **[@pixora/pixolink-pixoguard](../modules/pixoguard)** - Database security
- **[@pixora/pixolink-pixopay](../modules/pixopay)** - Payment processing
- **[@pixora/pixolink-weavai](../modules/weavai)** - AI orchestration

## 🔧 Configuration

```typescript
import { PixoLink, PixoLinkConfig } from '@pixora/pixolink';

const config: PixoLinkConfig = {
  apiKey: process.env.PIXOLINK_API_KEY,
  environment: 'production',
  modules: {
    adminDashboard: true,
    intelligenceCore: true,
    pixoPay: {
      providers: ['stripe', 'instapay']
    }
  },
  telemetry: {
    enabled: true,
    level: 'info'
  }
};

const pixolink = new PixoLink(config);
```

## 📖 Documentation

For detailed documentation, visit [PixoLink Documentation](https://docs.pixora.ai/pixolink)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

## 📄 License

MIT © 2025 PixoRA Team

## 🔗 Links

- [GitHub Repository](https://github.com/pixora/pixolink)
- [npm Package](https://www.npmjs.com/package/@pixora/pixolink)
- [Documentation](https://docs.pixora.ai/pixolink)
- [Issue Tracker](https://github.com/pixora/pixolink/issues)
