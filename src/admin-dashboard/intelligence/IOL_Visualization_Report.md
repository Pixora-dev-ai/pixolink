# PixoRA Intelligence Orchestration Layer (IOL) Visualization Dashboard

**Status**: ✅ Complete  
**Version**: 1.0.0  
**Last Updated**: January 2025  
**Location**: `/src/admin/intelligence-dashboard/`

---

## 📋 Executive Summary

The Intelligence Dashboard provides real-time visualization and monitoring of PixoRA's Intelligence Orchestration Layer (IOL). It offers comprehensive insights into event flows, module health, performance metrics, quality assessments, and memory usage across the entire AI pipeline.

### Key Features
- **Real-time Event Streaming**: Live feed of all IOL events with filtering and pause controls
- **Module Health Monitoring**: Status tracking for all IOL modules with detailed metrics
- **Performance Analytics**: Multi-metric time-series charts for generation, sync, and assessment operations
- **Quality Insights**: VisionPulse quality score tracking with trend analysis
- **Memory Visualization**: Hierarchical user context memory mapping
- **Architecture Overview**: Interactive IOL system architecture diagram

### Access
- **URL**: `/app/admin/intelligence`
- **Sidebar**: Admin → IOL Monitor (Brain icon)
- **Permission**: Admin users only

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Intelligence Dashboard                        │
│                     (React + TypeScript)                         │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
            ┌───────▼───────┐       ┌───────▼───────┐
            │  Custom Hooks  │       │  UI Components │
            │                │       │                │
            │ useIOLFeed     │───────│ EventStream    │
            │ useTelemetry   │───────│ PerformanceChart│
            │ useModuleStatus│───────│ ModuleHealthCard│
            └───────┬────────┘       │ QualityInsights │
                    │                │ MemoryMap       │
                    │                │ IOLGraph        │
                    │                └────────────────┘
            ┌───────▼───────────────────────────────────┐
            │         IOL Backend Systems               │
            │                                           │
            │  IOLBus (Events)                         │
            │  Registry (Modules)                      │
            │  ErrorTracker (Errors)                   │
            │  Metrics (Performance)                   │
            │  UsageEvents (Telemetry)                 │
            └───────────────────────────────────────────┘
```

---

## 📂 Component Hierarchy

```
/src/admin/intelligence-dashboard/
│
├── pages/
│   └── IntelligenceDashboard.tsx      (350 lines) - Main dashboard with 4 tabs
│
├── hooks/
│   ├── useIOLFeed.ts                  (169 lines) - Real-time event subscription
│   ├── useTelemetry.ts                (200 lines) - Performance & error metrics
│   └── useModuleStatus.ts             (158 lines) - Module health monitoring
│
├── components/
│   ├── EventStream.tsx                (195 lines) - Live event feed
│   ├── ModuleHealthCard.tsx           (111 lines) - Module status cards
│   ├── PerformanceChart.tsx           (172 lines) - Recharts line graphs
│   ├── QualityInsights.tsx            (144 lines) - Quality trends
│   ├── MemoryMap.tsx                  (134 lines) - Context hierarchy
│   └── IOLGraph.tsx                   (193 lines) - Network diagram
│
├── data/
│   └── mockData.ts                    (500+ lines) - Mock data generators
│
└── styles.css                         (1000+ lines) - Comprehensive styling

Total: 13 files, ~2,826 lines
```

---

## 🔧 Custom Hooks Specification

### 1. useIOLFeed

**Purpose**: Real-time event streaming from IOL to React UI

**Parameters**:
```typescript
interface UseIOLFeedOptions {
  eventTypes?: EventType[];      // Filter specific event types
  userId?: string;               // Filter by user
  sessionId?: string;            // Filter by session
  maxEvents?: number;            // Rolling buffer size (default: 50)
  autoConnect?: boolean;         // Auto-subscribe on mount (default: true)
}
```

**Return Values**:
```typescript
{
  events: IOLEvent[];           // Array of events (newest first)
  isConnected: boolean;         // Connection status
  eventCount: number;           // Total events in buffer
  clearEvents: () => void;      // Clear all events
  getEventsByType: (type: EventType) => IOLEvent[];
  getRecentEvents: (count: number) => IOLEvent[];
  getEventStats: () => Record<EventType, number>;
}
```

**Usage Example**:
```typescript
const { events, isConnected, clearEvents } = useIOLFeed({
  maxEvents: 100,
  eventTypes: ['generation:completed', 'generation:failed']
});
```

**Integration**: Subscribes to `IOLBus.subscribe()`, auto-unsubscribes on unmount

---

### 2. useTelemetry

**Purpose**: Aggregate performance and error metrics from telemetry systems

**Parameters**: None (polls automatically)

**Return Values**:
```typescript
{
  performanceMetrics: PerformanceDataPoint[];  // Time-series data
  errorMetrics: ErrorMetric[];                 // Categorized errors
  usageMetrics: UsageMetric[];                 // System usage data
  isInitialized: boolean;                      // Ready state
  getTotalErrors: () => number;                // Total error count
  getCriticalErrors: () => number;             // Critical error count
  getUsageSummary: () => UsageSummary;         // Summary statistics
  exportTelemetry: () => string;               // JSON export
  refresh: () => void;                         // Manual refresh
}
```

**Polling Interval**: 2 seconds (configurable)

**Data Sources**:
- `ErrorTracker.getStats()` - Error statistics
- `ErrorTracker.getHistory()` - Error history
- `UsageEvents.getAllMetrics()` - Usage metrics
- Mock performance data (replace with real metrics API)

**Usage Example**:
```typescript
const { 
  performanceMetrics, 
  getTotalErrors, 
  getCriticalErrors 
} = useTelemetry();
```

---

### 3. useModuleStatus

**Purpose**: Monitor health status of all IOL modules

**Parameters**: None (polls automatically)

**Return Values**:
```typescript
{
  modules: ModuleInfo[];                // All registered modules
  connections: ModuleConnection[];      // Module connections
  isLoading: boolean;                   // Loading state
  getModule: (id: string) => ModuleInfo | undefined;
  getHealthyModules: () => ModuleInfo[];
  getUnhealthyModules: () => ModuleInfo[];
  getModuleStats: () => ModuleStats;    // Summary stats
  getConnectionStats: () => ConnectionStats;
  refresh: () => void;                  // Manual refresh
}
```

**Polling Interval**: 5 seconds (configurable)

**Health States**: 
- `healthy` - Operating normally
- `degraded` - Partial functionality
- `unhealthy` - Critical issues

**Module Connection Architecture**:
```typescript
const connections: ModuleConnection[] = [
  { from: 'lcm', to: 'pixsync', type: 'data', status: 'active' },
  { from: 'visionpulse', to: 'lcc', type: 'data', status: 'active' },
  { from: 'lcc', to: 'lumina_adapter', type: 'control', status: 'active' },
  { from: 'lumina_adapter', to: 'lumina_storage', type: 'data', status: 'active' },
  { from: 'lumina_storage', to: 'pixsync', type: 'event', status: 'active' },
  { from: 'pixsync', to: 'supabase_storage', type: 'data', status: 'active' },
  { from: 'pixsync', to: 'supabase_db', type: 'data', status: 'active' },
  { from: 'visionpulse', to: 'supabase_db', type: 'data', status: 'active' },
  { from: 'lcm', to: 'supabase_db', type: 'data', status: 'active' },
  { from: 'lcc', to: 'iolbus', type: 'event', status: 'active' }
];
```

**Usage Example**:
```typescript
const { 
  modules, 
  getHealthyModules, 
  getModuleStats 
} = useModuleStatus();
```

---

## 🎨 UI Components Reference

### 1. EventStream

**Purpose**: Live event feed with filtering and pause controls

**Props**:
```typescript
interface EventStreamProps {
  maxEvents?: number;       // Buffer size (default: 50)
  autoScroll?: boolean;     // Auto-scroll to new events (default: true)
  showFilters?: boolean;    // Show filter controls (default: true)
}
```

**Features**:
- Real-time event display with color-coded badges
- Pause/resume functionality (stops auto-scroll)
- Filter dropdown by event type (17 types)
- Expandable JSON data preview
- Connection status indicator (green dot when connected)
- Event metadata display (userId, sessionId, timestamp)
- Clear button and event count

**Event Color Mapping**:
```typescript
const EVENT_COLORS = {
  'prompt:received': '#8b5cf6',
  'prompt:enhanced': '#a78bfa',
  'validation:started': '#06b6d4',
  'validation:completed': '#10b981',
  'validation:failed': '#ef4444',
  'generation:started': '#f59e0b',
  'generation:progress': '#fbbf24',
  'generation:completed': '#10b981',
  'generation:failed': '#ef4444',
  'assessment:started': '#ec4899',
  'assessment:completed': '#f472b6',
  'storage:started': '#3b82f6',
  'storage:completed': '#60a5fa',
  'storage:failed': '#ef4444',
  'sync:started': '#14b8a6',
  'sync:completed': '#2dd4bf',
  'sync:failed': '#ef4444',
};
```

**Empty State**: "📡 Waiting for events..."

---

### 2. ModuleHealthCard

**Purpose**: Individual module status card with health metrics

**Props**:
```typescript
interface ModuleHealthCardProps {
  module: ModuleInfo;
  onClick?: () => void;     // Optional click handler
}
```

**Metrics Displayed**:
1. **Uptime**: Formatted as `Xd Xh Xm Xs`
2. **Requests**: With K/M suffixes
3. **Error Rate**: Percentage (0-100%)
4. **Avg Response Time**: Milliseconds

**Health Colors**:
- `healthy` - #10b981 (green) with ✓ icon
- `degraded` - #f59e0b (orange) with ⚠ icon
- `unhealthy` - #ef4444 (red) with ✗ icon

**Animation**: Pulse effect for active modules (CSS keyframe)

---

### 3. PerformanceChart

**Purpose**: Real-time line chart for performance metrics

**Props**:
```typescript
interface PerformanceChartProps {
  data: PerformanceDataPoint[];
  height?: number;          // Chart height (default: 300)
  showLegend?: boolean;     // Show legend (default: true)
}
```

**Data Series**:
1. **Generation Time** - #8b5cf6 (purple)
2. **Sync Latency** - #06b6d4 (cyan)
3. **Assessment Time** - #f59e0b (orange)
4. **Memory Ops** - #10b981 (green)

**Statistics Header**: Displays avg generation time and avg sync latency

**Custom Tooltip**: Shows time (HH:MM:SS) and all metrics with color indicators

**X-axis**: Time (HH:MM:SS format)  
**Y-axis**: Milliseconds

**Library**: Recharts (LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer)

**Empty State**: "📊 No performance data available"

---

### 4. QualityInsights

**Purpose**: VisionPulse quality assessment visualization

**Props**:
```typescript
interface QualityInsightsProps {
  scores: QualityScore[];
  issues: QualityIssue[];
}
```

**Categories**:
- **Composition** - Layout and balance
- **Color** - Palette harmony
- **Clarity** - Detail and sharpness
- **Creativity** - Originality score

**Color Coding**:
- Score > 80: #10b981 (green)
- Score 60-80: #f59e0b (yellow)
- Score < 60: #ef4444 (red)

**Features**:
- Overall average score display
- Horizontal progress bars for each category
- Issues list with severity badges (low/medium/high)
- Recent trends mini-graph (last 10 assessments as vertical bars)

**Empty State**: "🎨 No quality data available"

---

### 5. MemoryMap

**Purpose**: User context hierarchy visualization (simplified treemap)

**Props**:
```typescript
interface MemoryMapProps {
  data: MemoryNode;
  height?: number;          // Container height (default: 400)
}
```

**MemoryNode Structure**:
```typescript
interface MemoryNode {
  id: string;
  label: string;
  value: number;            // Size in bytes
  color: string;            // Hex color
  children?: MemoryNode[];  // Nested nodes
}
```

**Features**:
- Flex-based layout (alternative to @nivo/treemap)
- Color-coded by depth (8 colors, opacity reduces with depth)
- Size formatting (B, KB, MB suffixes)
- Percentage labels on nodes (shows if >5% of total)
- Legend showing top-level nodes

**Installation Note**: Displays message for optional @nivo/treemap upgrade

**Future Enhancement**: Replace with `@nivo/treemap` ResponsiveTreeMap for interactive drill-down

**Empty State**: "🗂️ No memory data available"

---

### 6. IOLGraph

**Purpose**: Module connection network diagram

**Props**:
```typescript
interface IOLGraphProps {
  modules: ModuleInfo[];
  connections: ModuleConnection[];
  height?: number;          // Container height (default: 500)
}
```

**Layout**: 3-column structure
- **Column 1**: Internal Adapters (LCM, VisionPulse, LCC)
- **Column 2**: Core Systems (IOLBus, Orchestrator)
- **Column 3**: External Connectors (PixSync, Supabase Storage, Supabase DB)

**Node Categorization**:
- `adapter` - #8b5cf6 (purple border)
- `connector` - #06b6d4 (cyan border)
- `core` - #10b981 (green border)

**Connection Types**:
- `data` - Data flow connections
- `control` - Control flow connections
- `event` - Event flow connections

**Features**:
- Connection statistics by type
- Expandable connections list (from → type → to)
- Connection status indicators (active/inactive)
- Hover effects on nodes

**Installation Note**: Displays message for optional @xyflow/react upgrade

**Future Enhancement**: Replace with ReactFlow for draggable, zoomable interactive graph

**Empty State**: "🔗 No modules available"

---

## 📊 Dashboard Layout

### Header
- **Title**: "Intelligence Orchestration Layer"
- **Subtitle**: "Real-time monitoring and analytics for PixoRA's AI pipeline"
- **Refresh Button**: Manually refresh telemetry and module data

### Quick Stats Cards (4 cards)
1. **Total Events**: Live event count from useIOLFeed
2. **Active Modules**: X/Y format (active/total)
3. **Total Errors**: Aggregate error count
4. **Critical Errors**: High-severity error count (red, animated if >0)

### Tab Navigation (4 tabs)

#### Overview Tab
Grid Layout (2-column):
- **Performance Chart** (span-2, height 300)
- **Module Health** (6 modules in 3x2 grid)
- **Event Stream** (last 10 events, auto-scroll)
- **IOL Graph** (span-2, height 400)

#### Events Tab
Single Column:
- **Event Stream** (last 100 events, auto-scroll)
- **Event Statistics** (breakdown by EventType with counts)

#### Modules Tab
Grid Layout (2-column):
- **IOL Graph** (span-2, height 500)
- **All Modules** (grid of ModuleHealthCard)
- **Module Statistics** (total, active, healthy, degraded, unhealthy)

#### Quality Tab
Grid Layout (2-column):
- **Quality Insights** (span-2)
- **Memory Map** (span-2, height 400)
- **Performance Chart** (span-2, height 300)

### Error Summary Footer
Conditional (only if errors > 0):
- Shows recent errors by severity
- Color-coded badges (low/medium/high/critical)
- Error count per severity

---

## 🔌 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   IOL Backend Systems                        │
│                                                              │
│  IOLBus.publish(event)                                      │
│  Registry.healthCheck()                                     │
│  ErrorTracker.getStats()                                    │
│  Metrics.getAll()                                           │
│  UsageEvents.getAllMetrics()                                │
└───────────────────┬──────────────────────────────────────────┘
                    │
                    │ Real-time Subscriptions & Polling
                    │
        ┌───────────┴───────────────────────────┐
        │                                       │
┌───────▼──────────┐                  ┌─────────▼────────┐
│  useIOLFeed      │                  │  useTelemetry    │
│                  │                  │                  │
│ IOLBus.subscribe()│                 │ Poll every 2s   │
│ Real-time events │                  │ ErrorTracker    │
│ Rolling buffer   │                  │ Metrics         │
└───────┬──────────┘                  │ UsageEvents     │
        │                             └─────────┬────────┘
        │                                       │
        │              ┌────────────────────────┘
        │              │
        │      ┌───────▼──────────┐
        │      │ useModuleStatus  │
        │      │                  │
        │      │ Poll every 5s    │
        │      │ Registry.getAll()│
        │      │ healthCheck()    │
        │      └───────┬──────────┘
        │              │
        │              │
  ┌─────▼──────────────▼───────────────────────┐
  │         React UI Components                 │
  │                                             │
  │  EventStream       ModuleHealthCard        │
  │  PerformanceChart  QualityInsights         │
  │  MemoryMap         IOLGraph                │
  └─────────────────────┬───────────────────────┘
                        │
                        │
          ┌─────────────▼─────────────┐
          │   IntelligenceDashboard   │
          │   (Main Page - 4 Tabs)    │
          └───────────────────────────┘
```

---

## 🎨 Styling System

### CSS Architecture

**File**: `/src/admin/intelligence-dashboard/styles.css` (1000+ lines)

**Categories**:
1. **Dashboard Layout**: Container, header, content, grid system
2. **Quick Stats**: Stat cards with icons and metrics
3. **Tabs**: Tab navigation with active states
4. **EventStream**: Feed container, cards, filters, badges
5. **ModuleHealthCard**: Status badges, metrics, pulse animation
6. **PerformanceChart**: Chart container, tooltip, legend
7. **QualityInsights**: Score displays, progress bars, issues list
8. **MemoryMap**: Node grid, legend, installation note
9. **IOLGraph**: Network layout, nodes, connections
10. **Error Summary**: Error cards by severity

### Color Palette

**Primary Colors**:
- Purple: #8b5cf6 (IOL, primary brand)
- Cyan: #06b6d4 (sync, connections)
- Green: #10b981 (success, healthy)
- Orange: #f59e0b (warning, degraded)
- Red: #ef4444 (error, unhealthy)
- Pink: #ec4899 (assessments)

**Background Gradient**:
```css
background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
```

**Dark Theme**:
- Background: #0a0a0a
- Cards: #111827
- Borders: #1f2937
- Text: #e5e7eb
- Muted Text: #9ca3af

### Animations

**Pulse** (for active modules, critical errors):
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

**Hover Effects**:
- `transform: translateY(-2px)` - Lift on hover
- `box-shadow: 0 10px 25px rgba(139, 92, 246, 0.3)` - Glow effect

### Responsive Breakpoints

**Tablet (max-width: 1024px)**:
- Grid layout → 1 column
- Quick stats → 2 columns

**Mobile (max-width: 640px)**:
- Dashboard padding → 1rem
- Header → Column layout
- Quick stats → 1 column
- Module grid → 1 column

---

## 🚀 Integration Guide

### Step 1: Routing Setup

**File**: `/AppRouter.tsx`

**Import**:
```typescript
import IntelligenceDashboard from './admin/intelligence-dashboard/pages/IntelligenceDashboard';
```

**Route**:
```tsx
<Route
  path="/app/admin"
  element={<AdminRoute><AdminLayout /></AdminRoute>}
>
  {/* ... existing routes ... */}
  <Route path="intelligence" element={<IntelligenceDashboard />} />
</Route>
```

### Step 2: Sidebar Navigation

**File**: `/layouts/AdminLayout.tsx`

**Import**:
```typescript
import { FaBrain } from 'react-icons/fa';
```

**Nav Item**:
```typescript
const navItems: NavItem[] = [
  // ... existing items ...
  { 
    path: '/app/admin/intelligence', 
    label: 'IOL Monitor', 
    icon: <FaBrain />, 
    color: 'cyan' 
  },
  // ... other items ...
];
```

### Step 3: Access Control

**Permission**: Admin users only (enforced by `<AdminRoute>`)

**Check**:
```typescript
const { profile } = useAuth();
if (profile?.role !== 'admin') {
  return <Navigate to="/app" />;
}
```

---

## 📦 Optional Libraries

### @nivo/treemap

**Purpose**: Enhanced MemoryMap with interactive drill-down

**Installation**:
```bash
npm install @nivo/treemap
```

**Integration**:
```typescript
import { ResponsiveTreeMap } from '@nivo/treemap';

<ResponsiveTreeMap
  data={memoryData}
  identity="id"
  value="value"
  label={(node) => `${node.data.label}: ${formatBytes(node.value)}`}
  labelSkipSize={12}
  colors={{ scheme: 'nivo' }}
  borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
  enableParentLabel={true}
  parentLabelSize={24}
  parentLabelPosition="left"
  parentLabelPadding={6}
  animate={true}
  motionConfig="gentle"
  tooltip={({ node }) => (
    <div>
      <strong>{node.data.label}</strong>
      <div>{formatBytes(node.value)}</div>
    </div>
  )}
/>
```

### @xyflow/react

**Purpose**: Interactive, draggable IOL network diagram

**Installation**:
```bash
npm install @xyflow/react
```

**Integration**:
```typescript
import { ReactFlow, Controls, MiniMap, Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Convert modules to nodes
const nodes = modules.map((module, index) => ({
  id: module.id,
  type: 'default',
  data: { label: module.name },
  position: { x: columnX, y: index * 100 },
  style: {
    border: `2px solid ${getModuleColor(module.type)}`,
    background: '#1f2937',
    color: '#e5e7eb',
  },
}));

// Convert connections to edges
const edges = connections.map((conn, index) => ({
  id: `e${index}`,
  source: conn.from,
  target: conn.to,
  label: conn.type,
  animated: conn.status === 'active',
  style: { stroke: getConnectionColor(conn.type) },
}));

<ReactFlow
  nodes={nodes}
  edges={edges}
  fitView
  attributionPosition="bottom-right"
>
  <Controls />
  <MiniMap />
  <Background variant="dots" gap={12} size={1} />
</ReactFlow>
```

---

## 🔮 Future Enhancements

### 1. Real-time WebSocket Updates
- Replace polling with WebSocket subscriptions
- Reduce latency and server load
- Push notifications for critical events

### 2. Historical Data Queries
- Time-range selector for historical analysis
- Exportable reports (CSV, JSON, PDF)
- Trend analysis over days/weeks/months

### 3. Custom Dashboards
- User-configurable layouts
- Drag-and-drop widget arrangement
- Saved dashboard presets

### 4. Alerting System
- Configurable threshold alerts
- Email/SMS notifications
- Slack/Discord integrations

### 5. Drill-down Details
- Click module → detailed metrics modal
- Click event → full event trace
- Click error → stack trace and context

### 6. Performance Optimization
- Virtual scrolling for large event lists
- Memoization of expensive calculations
- Web Workers for data processing

### 7. Advanced Filtering
- Multi-select event type filters
- Date range pickers
- User/session search

### 8. Quality Trends
- Historical quality score graphs
- Category-specific trend analysis
- Image comparison tools

### 9. Memory Profiling
- Real-time memory leak detection
- Garbage collection insights
- Memory allocation heatmaps

### 10. Module Dependencies
- Dependency graph visualization
- Impact analysis for changes
- Critical path highlighting

---

## ⚡ Performance Considerations

### Polling Intervals
- **useIOLFeed**: Real-time (no polling, event-driven)
- **useTelemetry**: 2 seconds (adjustable)
- **useModuleStatus**: 5 seconds (adjustable)

**Recommendation**: Increase intervals during low-activity periods

### Event Buffer Limits
- **Default**: 50 events (configurable via `maxEvents`)
- **Maximum recommended**: 500 events (browser memory)
- **Strategy**: Implement virtual scrolling for >500 events

### Component Memoization
**Optimize re-renders**:
```typescript
const MemoizedEventStream = React.memo(EventStream);
const MemoizedModuleHealthCard = React.memo(ModuleHealthCard);
const MemoizedPerformanceChart = React.memo(PerformanceChart);
```

**Dependency arrays**:
- Only re-render when relevant data changes
- Use `useMemo` for expensive calculations
- Use `useCallback` for event handlers

### Data Processing
- Process telemetry data in batches
- Debounce chart updates (200-500ms)
- Throttle scroll events

### Bundle Size
- Lazy load dashboard components
- Code splitting by route
- Tree-shake unused Recharts components

---

## 🧪 Testing Strategy

### Component Tests

**Tools**: Vitest, React Testing Library

**EventStream Tests**:
```typescript
describe('EventStream', () => {
  it('renders events correctly', () => {
    render(<EventStream />);
    expect(screen.getByText('Live Event Feed')).toBeInTheDocument();
  });

  it('filters events by type', () => {
    render(<EventStream />);
    fireEvent.change(screen.getByRole('combobox'), { 
      target: { value: 'generation:completed' } 
    });
    // Assert filtered events
  });

  it('pauses auto-scroll when clicked', () => {
    render(<EventStream />);
    fireEvent.click(screen.getByText('Pause'));
    expect(screen.getByText('Resume')).toBeInTheDocument();
  });
});
```

**ModuleHealthCard Tests**:
```typescript
describe('ModuleHealthCard', () => {
  it('displays healthy status correctly', () => {
    const module = { status: 'active', health: 'healthy', name: 'LCM' };
    render(<ModuleHealthCard module={module} />);
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('shows pulse animation for active modules', () => {
    const module = { status: 'active', health: 'healthy', name: 'LCM' };
    const { container } = render(<ModuleHealthCard module={module} />);
    expect(container.querySelector('.status-badge')).toHaveStyle('animation: pulse 2s infinite');
  });
});
```

### Hook Tests

**useIOLFeed Tests**:
```typescript
describe('useIOLFeed', () => {
  it('subscribes to IOLBus on mount', () => {
    const { result } = renderHook(() => useIOLFeed());
    expect(result.current.isConnected).toBe(true);
  });

  it('filters events by type', () => {
    const { result } = renderHook(() => useIOLFeed({ 
      eventTypes: ['generation:completed'] 
    }));
    // Assert only generation:completed events in result.current.events
  });

  it('maintains rolling buffer of maxEvents', () => {
    const { result } = renderHook(() => useIOLFeed({ maxEvents: 10 }));
    // Emit 20 events
    expect(result.current.events.length).toBe(10);
  });
});
```

### Integration Tests

**Full Dashboard Tests**:
```typescript
describe('IntelligenceDashboard', () => {
  it('renders all tabs correctly', () => {
    render(<IntelligenceDashboard />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('Modules')).toBeInTheDocument();
    expect(screen.getByText('Quality')).toBeInTheDocument();
  });

  it('switches tabs on click', () => {
    render(<IntelligenceDashboard />);
    fireEvent.click(screen.getByText('Events'));
    expect(screen.getByText('Event Statistics')).toBeInTheDocument();
  });

  it('displays error summary when errors exist', () => {
    // Mock useTelemetry to return errors
    render(<IntelligenceDashboard />);
    expect(screen.getByText('Error Summary')).toBeInTheDocument();
  });
});
```

---

## 📸 Screenshots / Mockups

### Overview Tab Layout
```
┌────────────────────────────────────────────────────────────────┐
│  Intelligence Orchestration Layer                    [Refresh] │
│  Real-time monitoring and analytics                            │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Events  │ │ Modules  │ │  Errors  │ │ Critical │          │
│  │   156    │ │   7/8    │ │    12    │ │    2     │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
├────────────────────────────────────────────────────────────────┤
│  [Overview] [Events] [Modules] [Quality]                       │
├────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────┐│
│  │         Performance Metrics (Line Chart)                   ││
│  │  ✸ Generation  ✸ Sync  ✸ Assessment  ✸ Memory             ││
│  │                                                             ││
│  │    ⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰⋰    ││
│  │                                                             ││
│  └────────────────────────────────────────────────────────────┘│
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐│
│  │ 🧠 LCM           │  │ 🧠 VisionPulse   │  │ 🧠 LCC        ││
│  │ ✓ Healthy        │  │ ✓ Healthy        │  │ ✓ Healthy     ││
│  │ Uptime: 2d 5h    │  │ Uptime: 2d 5h    │  │ Uptime: 2d 5h ││
│  │ Requests: 1.2K   │  │ Requests: 856    │  │ Requests: 1.5K││
│  └──────────────────┘  └──────────────────┘  └───────────────┘│
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐│
│  │ 🧠 LUMINA Adapter│  │ 🧠 PixSync       │  │ 🧠 Supabase DB││
│  │ ✓ Healthy        │  │ ⚠ Degraded       │  │ ✓ Healthy     ││
│  │ Uptime: 2d 5h    │  │ Uptime: 1d 12h   │  │ Uptime: 2d 5h ││
│  │ Requests: 789    │  │ Requests: 2.1K   │  │ Requests: 3.2K││
│  └──────────────────┘  └──────────────────┘  └───────────────┘│
│  ┌────────────────────────────────────────────────────────────┐│
│  │  📡 Live Event Feed                      🟢 Connected      ││
│  │  ├─ generation:completed  12:34:56  user_123             │ │
│  │  ├─ sync:started          12:34:54  user_123             │ │
│  │  ├─ assessment:completed  12:34:52  user_456             │ │
│  │  ├─ generation:progress   12:34:50  user_789 (45%)       │ │
│  │  └─ prompt:enhanced       12:34:48  user_abc             │ │
│  └────────────────────────────────────────────────────────────┘│
│  ┌────────────────────────────────────────────────────────────┐│
│  │         IOL Architecture Graph                             ││
│  │  ┌────────────┐   ┌────────────┐   ┌────────────┐         ││
│  │  │  Adapters  │ → │    Core    │ → │ Connectors │         ││
│  │  └────────────┘   └────────────┘   └────────────┘         ││
│  └────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────┘
```

---

## 📝 Changelog

### Version 1.0.0 (January 2025)
- ✅ Initial release
- ✅ 3 custom hooks (useIOLFeed, useTelemetry, useModuleStatus)
- ✅ 6 UI components (EventStream, ModuleHealthCard, PerformanceChart, QualityInsights, MemoryMap, IOLGraph)
- ✅ Main dashboard with 4-tab layout
- ✅ Comprehensive CSS styling (1000+ lines)
- ✅ Mock data generators
- ✅ Routing and navigation integration
- ✅ Admin-only access control

### Planned Enhancements (v1.1.0)
- 🔄 Replace mock data with real IOL metrics
- 🔄 Install @nivo/treemap for enhanced MemoryMap
- 🔄 Install @xyflow/react for interactive IOLGraph
- 🔄 Add WebSocket real-time updates
- 🔄 Implement historical data queries
- 🔄 Add alerting system

---

## 🤝 Contributing

### Development Workflow
1. Create feature branch: `git checkout -b feature/dashboard-enhancement`
2. Make changes to dashboard files
3. Test locally: `npm run dev`
4. Run tests: `npm test`
5. Build: `npm run build`
6. Submit PR with description

### Code Style
- Use TypeScript strict mode
- Follow ESLint configuration
- Use Prettier for formatting
- Write descriptive component props
- Add JSDoc comments for hooks

### Component Guidelines
- Keep components under 250 lines
- Extract complex logic to custom hooks
- Use CSS modules or styled-components
- Implement error boundaries
- Add loading states

---

## 📞 Support

### Documentation
- **IOL Backend**: `/IOL_Status_Report.md`
- **IOL Complete Guide**: `/IOL_COMPLETE.md`
- **Dashboard Guide**: This document

### Contact
- **Team**: PixoRA Engineering
- **Project**: Intelligence Orchestration Layer
- **Priority**: High

---

**End of Document**  
Last Updated: January 2025  
Document Version: 1.0.0
