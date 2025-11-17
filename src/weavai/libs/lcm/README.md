# LUMINA Context Memory (LCM)

AI-powered context memory library for PixoRA. Tracks user prompts, feedback, and preferences with intelligent insights for prompt optimization.

## Features

- **IndexedDB Storage**: Local-first prompt history with Dexie
- **Feedback Analysis**: Pattern extraction and suggestion engine
- **Supabase Sync**: Bidirectional cloud synchronization
- **React Hook**: Simple integration with `usePromptMemory`
- **Smart Insights**: Prompt scoring, trend analysis, and keyword suggestions

## Installation

```bash
cd libs/lcm
npm install
npm run build
```

## Usage

### React Hook (Recommended)

```typescript
import { usePromptMemory } from '@pixora/lcm';
import { createClient } from '@supabase/supabase-js';

function MyComponent() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  const {
    history,
    loading,
    savePrompt,
    updateFeedback,
    suggestions,
    calculateScore,
    stats,
    syncNow
  } = usePromptMemory({
    userId: 'user-123',
    supabase,
    autoSync: true,
    syncInterval: 60000 // 1 minute
  });

  const handleGenerate = async (prompt: string) => {
    const score = await calculateScore(prompt);
    console.log('Prompt quality score:', score);
    
    // Generate image...
    const result = 'https://example.com/image.png';
    
    await savePrompt(prompt, result, { score });
  };

  return (
    <div>
      <p>Prompts: {stats.totalPrompts} | Likes: {stats.likes}</p>
      <button onClick={() => handleGenerate('sunset over mountains')}>
        Generate
      </button>
      {suggestions.length > 0 && (
        <div>
          <h3>Suggestions based on your liked prompts:</h3>
          {suggestions.map(s => <span key={s}>{s}</span>)}
        </div>
      )}
    </div>
  );
}
```

### Direct API Usage

#### Storage

```typescript
import { IndexedDBStorage } from '@pixora/lcm';

// Save prompt
const id = await IndexedDBStorage.savePrompt({
  userId: 'user-123',
  prompt: 'sunset over mountains',
  result: 'https://example.com/image.png',
  metadata: { model: 'gemini-2.0' }
});

// Get history
const history = await IndexedDBStorage.getHistory('user-123', 50);

// Update feedback
await IndexedDBStorage.updateFeedback(id, 'like');

// Get stats
const stats = await IndexedDBStorage.getStats('user-123');
console.log(stats); // { totalPrompts, likes, dislikes, unsynced }
```

#### Feedback Engine

```typescript
import { FeedbackEngine } from '@pixora/lcm';

// Get suggestions based on liked prompts
const suggestions = await FeedbackEngine.getSuggestions('user-123');
console.log(suggestions); // ['sunset', 'mountains', 'nature']

// Calculate prompt quality score (0-100)
const score = await FeedbackEngine.calculatePromptScore('user-123', 'beautiful sunset');
console.log(score); // 85

// Analyze trends over last 30 days
const trends = await FeedbackEngine.getTrends('user-123', 30);
console.log(trends); // { likes, dislikes, neutrals, improvement }
```

#### Supabase Sync

```typescript
import { SupabaseSync } from '@pixora/lcm';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const sync = new SupabaseSync(supabase);

// Upload unsynced prompts
const { synced, errors } = await sync.syncPrompts('user-123');

// Download from Supabase
const downloaded = await sync.pullFromSupabase('user-123');

// Full bidirectional sync
const result = await sync.fullSync('user-123');
console.log(result); // { uploaded, downloaded, errors }
```

## Database Schema

LCM requires a Supabase table:

```sql
create table prompt_history (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  prompt text not null,
  result text not null,
  result_url text,
  feedback text check (feedback in ('like', 'dislike')),
  metadata jsonb,
  created_at timestamptz default now()
);

create index idx_prompt_history_user on prompt_history(user_id);
create index idx_prompt_history_feedback on prompt_history(user_id, feedback);
```

## API Reference

### `usePromptMemory(options)`

React hook for prompt memory management.

**Options:**
- `userId` (string, required): User identifier
- `supabase` (SupabaseClient, optional): Supabase client for sync
- `autoSync` (boolean, optional): Enable automatic syncing (default: false)
- `syncInterval` (number, optional): Sync interval in ms (default: 60000)

**Returns:**
- `history`: Array of prompt entries
- `loading`: Loading state
- `error`: Error message or null
- `savePrompt(prompt, result, metadata?)`: Save new prompt
- `updateFeedback(promptId, feedback)`: Update feedback
- `clearHistory()`: Clear all user data
- `suggestions`: Keyword suggestions
- `calculateScore(prompt)`: Calculate prompt quality score
- `trends`: Feedback trends
- `syncNow()`: Manual sync trigger
- `syncStatus`: Last sync result
- `stats`: Usage statistics

### `IndexedDBStorage`

Static class for IndexedDB operations.

**Methods:**
- `savePrompt(entry)`: Save prompt entry
- `getHistory(userId, limit?)`: Get prompt history
- `getPromptsByFeedback(userId, feedback)`: Filter by feedback
- `updateFeedback(id, feedback)`: Update feedback
- `getUnsyncedPrompts(userId)`: Get prompts not synced
- `markAsSynced(ids)`: Mark prompts as synced
- `savePreference(userId, key, value)`: Save user preference
- `getPreference(userId, key)`: Get user preference
- `clearUserData(userId)`: Clear all user data
- `getStats(userId)`: Get usage statistics

### `FeedbackEngine`

Static class for feedback analysis.

**Methods:**
- `analyzeLikedPrompts(userId)`: Extract liked patterns
- `analyzeDislikedPrompts(userId)`: Extract disliked patterns
- `getSuggestions(userId)`: Get keyword suggestions
- `calculatePromptScore(userId, prompt)`: Calculate quality score (0-100)
- `getTrends(userId, days)`: Get trends over time period

### `SupabaseSync`

Sync manager for cloud storage.

**Constructor:**
- `new SupabaseSync(supabase)`: Create sync manager

**Methods:**
- `syncPrompts(userId)`: Upload unsynced prompts
- `pullFromSupabase(userId, since?)`: Download remote data
- `fullSync(userId)`: Bidirectional sync

## TypeScript Types

```typescript
interface PromptEntry {
  id?: number;
  userId: string;
  prompt: string;
  result: string;
  resultUrl?: string;
  feedback?: 'like' | 'dislike' | null;
  metadata?: Record<string, unknown>;
  timestamp?: number;
  synced?: boolean;
}

interface UserPreference {
  id?: number;
  userId: string;
  key: string;
  value: unknown;
  timestamp?: number;
}
```

## Development

```bash
# Install dependencies
npm install

# Build library
npm run build

# Run tests
npm test

# Watch mode
npm run dev
```

## Dependencies

- `dexie` ^4.0.0 - IndexedDB wrapper
- `@supabase/supabase-js` ^2.0.0 (peer) - Supabase client

## Integration with PixoRA

LCM is designed to work seamlessly with other PixoRA libraries:

- **ai-core**: Use prompt scores to guide generation
- **pixoguard**: Track quality metrics alongside feedback
- **pixsync**: Coordinate sync across devices

## License

Proprietary - PixoRA Internal Library
