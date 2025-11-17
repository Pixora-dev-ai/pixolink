# LUMINA Cognitive Chain (LCC)

Multi-step AI reasoning and context chaining for PixoRA. Enhances prompts through cognitive processing and historical learning.

## Features

- **Multi-Step Reasoning**: Chain analysis, enhancement, validation, and execution
- **Context Memory**: Integrates with LCM for historical learning
- **Prompt Enhancement**: Auto-improve prompts based on past performance
- **Validation**: Quality checks with confidence scoring
- **Session Management**: Track reasoning sessions and insights

## Installation

```bash
cd libs/lcc
npm install
npm run build
```

## Usage

### Basic Chain

```typescript
import { CognitiveChain } from '@pixora/lcc';

const chain = new CognitiveChain('user-123');

// Start session
const sessionId = chain.startSession('generate a sunset');

// Enhance prompt
const { enhanced, score } = await chain.enhancePrompt('generate a sunset');
console.log(enhanced); // "generate a sunset, mountains, vibrant colors"

// Validate
const { valid, issues } = await chain.validatePrompt(enhanced);
if (!valid) {
  console.log('Issues:', issues);
}

// Complete session
const result = await chain.completeSession();
console.log(result);
// { sessionId, finalOutput, steps, totalConfidence: 0.85, insights: [...] }
```

### Advanced Processing

```typescript
// Custom step processor
await chain.addStep('analyze', 'user input', async (input, context) => {
  // Custom AI analysis
  return {
    output: 'analyzed result',
    confidence: 0.9
  };
});
```

## API Reference

### `CognitiveChain`

**Constructor:**
```typescript
new CognitiveChain(userId: string)
```

**Methods:**
- `startSession(initialPrompt)`: Start new reasoning session
- `addStep(type, input, processor?)`: Add custom step
- `enhancePrompt(prompt)`: Auto-enhance with historical data
- `validatePrompt(prompt)`: Quality validation
- `completeSession()`: Finish and get results
- `getCurrentSession()`: Get active session

## Dependencies

- `@pixora/lcm` - Context memory integration

## License

Proprietary - PixoRA Internal Library
