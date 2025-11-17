# 🎨 PixoLink Unified SDK

> **One SDK to rule them all** — Modular AI, Security, Payments, and Admin Platform

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@mamdouh-aboammar/pixolink.svg)](https://www.npmjs.com/package/@mamdouh-aboammar/pixolink)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)

> “Because wasting tokens is not a personality trait.”

---

## 🧩 ABOUT – The Story Behind PixoLink SDK

### 🚀 What is PixoLink SDK?

PixoLink SDK is a unified developer toolkit designed for modern builders who code with vibes, not burnout. It’s a smart, ready-to-inject SDK that merges AI logic, payment systems, security layers, logic guards, and admin dashboards — all under one simple import.

Think of it as your instant full‑stack starter, made for the new era of AI‑powered indie devs and vibe coders who just want to ship faster, smarter, and saner.

### 💡 Why We Built It

We got tired of seeing devs rebuild the same stuff — authentication, dashboards, payments, AI connectors — every single time. Every new project felt like déjà vu with more boilerplate, more tokens wasted, and less fun.

So we asked ourselves:

“Why rebuild what’s already built and working?”

And that’s how PixoLink SDK was born. A toolkit that just works, out of the box — no 400‑tab debugging, no setup purgatory. Just plug, vibe, and ship.

### 🧠 The Core Idea

PixoLink isn’t just a library — it’s a modular ecosystem. Each module works alone or together:

- 🧩 Logic Guardian — Keeps your code clean, consistent, and safe from spaghetti.
- 💳 PixoPay — Build your own payment gateway in minutes (yes, even in Egypt 🇪🇬).
- 🔒 PixoGuard — Security that actually understands your app’s behavior.
- 🤖 WeavAI — The multi‑brain AI core that syncs with Gemini, OpenAI, and Anthropic.
- ⚙️ Admin Dashboard — Because your backend deserves to look good too.
- 🎨 LUMINA Engine — A powerful visual engine for generating images, videos, and beyond.

All wrapped in one SDK that feels like magic — but it’s just clean engineering and smart integration.

### 🌍 The Mission

To give every developer — from Cairo to California — the ability to launch powerful AI‑integrated products in hours, not months. We believe dev tools should feel like music, not machinery. And PixoLink is our instrument for that.

### ❤️ Built by PixoRA

PixoLink SDK is part of the PixoRA ecosystem, created with the same obsessive focus on:

- Developer experience
- Simplicity
- Humor
- Real‑world practicality

We build tools that remove friction, save tokens, and help coders create amazing products — without feeling like they’re doing unpaid DevOps.

## 🚀 What is PixoLink?

PixoLink is a **unified SDK** that combines powerful subsystems into one modular library:

- 🎨 **LUMINA Engine** — AI image/video generation (text-to-image, image-to-video)
- 🤖 **WeavAI** — Multi-provider AI orchestration (OpenAI, Gemini, Anthropic, DeepSeek)
- 🛡️ **PixoGuard** — Security & behavior intelligence
- ⚖️ **Logic Guardian** — Runtime validation & circuit breakers
- 💳 **PixoPay** — Payment processing (Instapay, Vodafone Cash, Stripe)
- 📊 **Admin Dashboard** — Complete admin interface with analytics

## ✨ Features

✅ **One-line initialization** — Configure everything via `pixo.config.json`  
✅ **Modular architecture** — Enable/disable modules as needed  
✅ **Type-safe** — Full TypeScript support with IntelliSense  
✅ **Framework agnostic** — Works with React, Next.js, Node.js, Edge functions  
✅ **Unified connectors** — Single interface for Supabase, AI providers, analytics, payments  
✅ **AI-agent friendly** — Built-in documentation for Copilot, Cursor, Bolt  
✅ **Production-ready** — Battle-tested in PrePilot.cloud and PixoRA

## 📦 Installation

```bash
# Using pnpm (recommended)
pnpm add @mamdouh-aboammar/pixolink

# Using npm
npm install @mamdouh-aboammar/pixolink

# Using yarn
yarn add @mamdouh-aboammar/pixolink
```

## 🎯 Quick Start

### 1. Create Configuration

Create `pixo.config.json`:

```json
{
  "project_name": "my-app",
  "connectors": {
    "supabase": {
      "url": "${SUPABASE_URL}",
      "anonKey": "${SUPABASE_ANON_KEY}",
      "serviceKey": "${SUPABASE_SERVICE_KEY}"
    },
    "ai": {
      "provider": "gemini",
      "apiKey": "${GEMINI_API_KEY}"
    },
    "payments": {
      "provider": "stripe",
      "apiKey": "${STRIPE_SECRET_KEY}"
    }
  },
  "modules": {
    "pixoguard": true,
    "logic_guardian": true,
    "weavai": true,
    "pixopay": true,
    "lumina": true,
    "admin_dashboard": false
  }
}
```

### 2. Initialize SDK

```typescript
import { PixoLink, useConnector } from '@mamdouh-aboammar/pixolink';

// Initialize once at app startup
await PixoLink.init('./pixo.config.json');

// Use connectors
const ai = useConnector('ai-core');
const result = await ai.generate('an Egyptian digital portrait in neon style');

console.log(result.url);
```

### 3. Use UI Components

```tsx
import { PixoDashboard } from '@mamdouh-aboammar/pixolink/ui';

function AdminPage() {
  return <PixoDashboard />;
}
```

## 🧩 Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                    PixoLink Core                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Config    │  │   Plugin    │  │  Connector  │    │
│  │   Loader    │  │   Manager   │  │     Hub     │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Modules    │  │  Connectors  │  │      UI      │
├──────────────┤  ├──────────────┤  ├──────────────┤
│ • WeavAI     │  │ • Supabase   │  │ • Dashboard  │
│ • PixoGuard  │  │ • OpenAI     │  │ • Widgets    │
│ • Logic      │  │ • Gemini     │  │ • Hooks      │
│   Guardian   │  │ • Stripe     │  │              │
│ • PixoPay    │  │ • Instapay   │  │              │
│ • LUMINA     │  │ • Analytics  │  │              │
│ • Admin      │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

## 📚 Documentation

- [**Developer Guide**](./docs/DEVELOPERS_GUIDE.md) — Setup, examples, API reference
- [**AI Agents Guide**](./docs/AI_AGENTS_GUIDE.md) — Documentation for Copilot/Cursor
- [**Module Reference**](./docs/MODULES_REFERENCE.md) — Detailed API for each module
- [**Migration Guide**](./docs/MIGRATION_GUIDE.md) — Upgrading from legacy systems

## 🛠️ CLI Tools

```bash
# Initialize new project with template
pixolink init my-app --template=saas

# Add a module
pixolink add lumina

# Configure interactively
pixolink config

# Sync database schemas
pixolink sync

# Diagnose setup issues
pixolink diagnose
```

## 🎨 Module Overview

### WeavAI (Multi-Provider AI)

```typescript
const ai = useConnector('ai-core');
const response = await ai.generate('Create a cinematic photo', {
  model: 'gemini-2.0-flash-exp',
  temperature: 0.7
});
```

### LUMINA (Image/Video Generation)

```typescript
const lumina = PixoLink.modules.get('lumina');
const image = await lumina.textToImage('Egyptian pyramid at sunset');
const video = await lumina.imageToVideo(image.url);
```

### PixoPay (Payments)

```typescript
const payment = useConnector('pixopay');
await payment.handlePayment('instapay', {
  amount: 200,
  currency: 'EGP',
  phone: '+201234567890'
});
```

### Logic Guardian (Validation)

```typescript
const guardian = PixoLink.modules.get('logic-guardian');
const result = await guardian.executeWithCircuitBreaker(
  async () => fetchExternalAPI(),
  { maxRetries: 3 }
);
```

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT © PixoRA Team

## 🔗 Links

- [Documentation (GitHub)](https://github.com/Pixora-dev-ai/pixolink/tree/main/docs)
- [GitHub](https://github.com/Pixora-dev-ai/pixolink)
- [npm](https://www.npmjs.com/package/@mamdouh-aboammar/pixolink)

---

### Built with ❤️ by the PixoRA Team
