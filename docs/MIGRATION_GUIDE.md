# 🔄 Migration Guide - PixoLink SDK

> **Guide for migrating to PixoLink from legacy systems**

---

## Table of Contents

- [From Standalone Modules](#from-standalone-modules)
- [From Other SDKs](#from-other-sdks)
- [Version Upgrades](#version-upgrades)

---

## From Standalone Modules

If you were using individual modules (LUMINA, WeavAI, PixoPay, etc.) separately, here's how to migrate:

### Before (Standalone)

```typescript
// Multiple imports
import { LuminaEngine } from './services/lumina';
import { WeavAI } from './services/weavai';
import { PixoPay } from './services/pixopay';
import { supabase } from './services/supabase';

// Initialize separately
const lumina = new LuminaEngine(config.lumina);
const weavai = new WeavAI(config.weavai);
const pixopay = new PixoPay(config.pixopay);
```

### After (PixoLink)

```typescript
// One import
import { PixoLink } from '@mamdouh-aboammar/pixolink';

// One initialization
await PixoLink.init('./pixo.config.json');

// Use connectors
const ai = PixoLink.useConnector('ai-core');
const payment = PixoLink.useConnector('payments');
const supabase = PixoLink.useConnector('supabase');
```

### Step-by-Step Migration

#### Step 1: Install PixoLink

```bash
npm install @mamdouh-aboammar/pixolink
```

#### Step 2: Create Configuration File

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
    },
    "payments": {
      "provider": "stripe",
      "apiKey": "${STRIPE_SECRET_KEY}"
    }
  },
  "modules": {
    "weavai": true,
    "pixopay": true,
    "lumina": true
  }
}
```

#### Step 3: Update Initialization Code

**Before**:
```typescript
// main.ts
import { initializeLumina } from './services/lumina';
import { initializeWeavAI } from './services/weavai';

async function bootstrap() {
  await initializeLumina();
  await initializeWeavAI();
  // ... more initializations
}
```

**After**:
```typescript
// main.ts
import { PixoLink } from '@mamdouh-aboammar/pixolink';

async function bootstrap() {
  await PixoLink.init('./pixo.config.json');
}
```

#### Step 4: Update Usage Code

**Before**:
```typescript
import { generateImage } from './services/lumina';

const result = await generateImage({
  prompt: 'Egyptian portrait',
  model: 'imagen-3.0'
});
```

**After**:
```typescript
import { PixoLink } from '@mamdouh-aboammar/pixolink';

const ai = PixoLink.useConnector('ai-core');
const result = await ai.generate('Egyptian portrait', {
  model: 'imagen-3.0-generate-001'
});
```

#### Step 5: Remove Old Dependencies

```bash
# Remove old packages
npm uninstall lumina weavai pixopay

# Remove old files
rm -rf src/services/lumina
rm -rf src/services/weavai
rm -rf src/services/pixopay
```

---

## From Other SDKs

### From Custom Supabase Setup

**Before**:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const { data } = await supabase.from('users').select('*');
```

**After**:
```typescript
import { PixoLink } from '@mamdouh-aboammar/pixolink';

await PixoLink.init('./pixo.config.json');

const supabase = PixoLink.useConnector('supabase');
const { data } = await supabase.from('users').select('*');
```

### From Custom AI Integration

**Before**:
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

const result = await model.generateContent('Hello');
```

**After**:
```typescript
import { PixoLink } from '@mamdouh-aboammar/pixolink';

await PixoLink.init('./pixo.config.json');

const ai = PixoLink.useConnector('ai-core');
const result = await ai.chat('Hello');
```

---

## Version Upgrades

### From v0.x to v1.0

No breaking changes - PixoLink v1.0 is the first stable release.

### Future Upgrades

Check [CHANGELOG.md](../CHANGELOG.md) for version-specific migration notes.

---

## Troubleshooting Migration

### Issue: "Module not found"

**Cause**: Old imports still referenced

**Solution**: Search and replace old imports
```bash
# Find old imports
grep -r "from './services/" src/

# Replace with PixoLink imports
# Update each file manually or use sed
```

### Issue: "Config not loading"

**Cause**: Environment variables not set

**Solution**: 
```bash
# Create .env file
cp .env.example .env

# Add your variables
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
GEMINI_API_KEY=...
```

### Issue: "Types not working"

**Cause**: TypeScript can't find types

**Solution**:
```bash
# Reinstall with types
npm install --save-dev @types/node

# Check tsconfig.json includes node_modules
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types"]
  }
}
```

---

## Need Help?

- Open an issue: https://github.com/Pixora-dev-ai/pixolink/issues
- Check examples: `./examples/`
- Read documentation: `./docs/`

---

**Last Updated**: November 17, 2025  
**Version**: 1.0.0
