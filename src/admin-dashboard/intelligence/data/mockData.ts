/**
 * Mock Data Generators for Intelligence Dashboard
 * Provides realistic mock data for testing and development
 */

import type { EventType, EventPayload } from '../../intelligence-core/types';

// ===========================
// Types
// ===========================

export interface IOLEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  data: EventPayload;
}

export interface PerformanceDataPoint {
  time: string;
  generationTime: number;
  syncLatency: number;
  assessmentTime: number;
  memoryOps: number;
}

export interface QualityScore {
  timestamp: Date;
  score: number;
  category: 'composition' | 'color' | 'clarity' | 'creativity';
  imageId: string;
}

export interface QualityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  count: number;
  description: string;
}

export interface MemoryNode {
  id: string;
  label: string;
  value: number;
  color: string;
  children?: MemoryNode[];
}

export interface ModuleMetrics {
  requestCount: number;
  errorRate: number;
  avgResponseTime: number;
  uptime: number;
}

// ===========================
// Event Generation
// ===========================

const EVENT_TYPES: EventType[] = [
  'PROMPT_GENERATED',
  'PROMPT_ENHANCED',
  'IMAGE_GENERATED',
  'IMAGE_ASSESSED',
  'QUALITY_CHECK_COMPLETE',
  'SYNC_STARTED',
  'SYNC_COMPLETE',
  'SYNC_FAILED',
  'RULE_CONFLICT',
  'VALIDATION_ERROR',
  'SESSION_STARTED',
  'SESSION_ENDED',
  'FEEDBACK_RECEIVED',
  'LEARNING_UPDATED',
  'TELEMETRY_LOGGED',
  'ERROR_OCCURRED'
];

const USER_IDS = [
  'user_123',
  'user_456',
  'user_789',
  'user_abc',
  'user_def',
];

const SESSION_IDS = [
  'session_alpha',
  'session_beta',
  'session_gamma',
  'session_delta',
];

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function generateMockEvent(type?: EventType): IOLEvent {
  const eventType = type || randomChoice(EVENT_TYPES);
  const timestamp = new Date();
  const userId = Math.random() > 0.3 ? randomChoice(USER_IDS) : undefined;
  const sessionId = Math.random() > 0.2 ? randomChoice(SESSION_IDS) : undefined;

  // Generate appropriate data based on event type
  let eventData: Record<string, unknown> = {};

  if (eventType === 'PROMPT_GENERATED' || eventType === 'PROMPT_ENHANCED') {
    eventData = {
      promptId: `prompt_${randomInt(1000, 9999)}`,
      prompt: `A ${randomChoice(['beautiful', 'stunning', 'mystical', 'futuristic', 'vintage'])} ${randomChoice(['landscape', 'portrait', 'abstract art', 'cityscape', 'character design'])}`,
      enhancedPrompt: eventType === 'PROMPT_ENHANCED' ? 'Enhanced with artistic details and composition guidance' : undefined,
    };
  } else if (eventType === 'VALIDATION_ERROR') {
    eventData = {
      promptId: `prompt_${randomInt(1000, 9999)}`,
      isValid: false,
      issues: ['Invalid content detected', 'Policy violation'],
    };
  } else if (eventType === 'IMAGE_GENERATED') {
    eventData = {
      promptId: `prompt_${randomInt(1000, 9999)}`,
      imageId: `img_${randomInt(1000, 9999)}`,
    };
  } else if (eventType === 'IMAGE_ASSESSED' || eventType === 'QUALITY_CHECK_COMPLETE') {
    eventData = {
      imageId: `img_${randomInt(1000, 9999)}`,
      qualityScore: randomFloat(60, 95),
      metrics: {
        composition: randomFloat(60, 95),
        color: randomFloat(60, 95),
        clarity: randomFloat(60, 95),
        creativity: randomFloat(60, 95),
      },
    };
  } else if (eventType === 'SYNC_STARTED' || eventType === 'SYNC_COMPLETE') {
    eventData = {
      imageId: `img_${randomInt(1000, 9999)}`,
      syncTarget: 'supabase',
      success: eventType === 'SYNC_COMPLETE',
    };
  } else if (eventType === 'SYNC_FAILED') {
    eventData = {
      imageId: `img_${randomInt(1000, 9999)}`,
      syncTarget: 'supabase',
      success: false,
      error: 'Network timeout',
    };
  } else if (eventType === 'ERROR_OCCURRED') {
    eventData = {
      error: randomChoice(['API rate limit exceeded', 'Storage quota exceeded', 'Network timeout']),
      severity: randomChoice(['low', 'medium', 'high', 'critical']),
    };
  } else {
    eventData = { message: 'Generic event data' };
  }

  const data: EventPayload = {
    type: eventType,
    data: eventData,
    timestamp: timestamp.getTime(),
    userId,
    sessionId,
  };

  return {
    id: `event_${Date.now()}_${randomInt(1000, 9999)}`,
    type: eventType,
    timestamp,
    userId,
    sessionId,
    data,
  };
}

export function generateMockEvents(count: number, type?: EventType): IOLEvent[] {
  const events: IOLEvent[] = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const event = generateMockEvent(type);
    // Spread events across last 5 minutes
    event.timestamp = new Date(now - (count - i) * (5 * 60 * 1000 / count));
    events.push(event);
  }
  
  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

// ===========================
// Performance Data Generation
// ===========================

export function generateMockPerformanceData(points: number): PerformanceDataPoint[] {
  const data: PerformanceDataPoint[] = [];
  const now = Date.now();
  
  for (let i = 0; i < points; i++) {
    const timestamp = new Date(now - (points - i) * 2000); // 2 seconds per point
    const time = timestamp.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    
    // Generate realistic performance metrics with some variation
    const baseGeneration = 2000;
    const baseSync = 150;
    const baseAssessment = 800;
    const baseMemory = 50;
    
    data.push({
      time,
      generationTime: baseGeneration + randomFloat(-500, 500),
      syncLatency: baseSync + randomFloat(-30, 50),
      assessmentTime: baseAssessment + randomFloat(-200, 200),
      memoryOps: baseMemory + randomFloat(-10, 15),
    });
  }
  
  return data;
}

// ===========================
// Quality Data Generation
// ===========================

export function generateMockQualityScores(count: number): QualityScore[] {
  const categories: Array<'composition' | 'color' | 'clarity' | 'creativity'> = [
    'composition',
    'color',
    'clarity',
    'creativity',
  ];
  
  const scores: QualityScore[] = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];
    const timestamp = new Date(now - (count - i) * 60000); // 1 minute apart
    
    scores.push({
      timestamp,
      score: randomFloat(65, 92),
      category,
      imageId: `img_${randomInt(1000, 9999)}`,
    });
  }
  
  return scores;
}

export function generateMockQualityIssues(): QualityIssue[] {
  const possibleIssues = [
    { type: 'Low Contrast', severity: 'low' as const, description: 'Some images have insufficient contrast between elements' },
    { type: 'Composition Balance', severity: 'medium' as const, description: 'Asymmetric elements affecting visual balance' },
    { type: 'Color Harmony', severity: 'low' as const, description: 'Minor color palette inconsistencies detected' },
    { type: 'Detail Loss', severity: 'high' as const, description: 'High compression causing fine detail degradation' },
    { type: 'Overexposure', severity: 'medium' as const, description: 'Highlights blown out in bright areas' },
    { type: 'Noise Artifacts', severity: 'low' as const, description: 'Digital noise visible in shadow regions' },
  ];
  
  return possibleIssues
    .sort(() => Math.random() - 0.5)
    .slice(0, randomInt(2, 4))
    .map(issue => ({
      ...issue,
      count: randomInt(3, 15),
    }));
}

// ===========================
// Memory Data Generation
// ===========================

export function generateMockMemoryData(): MemoryNode {
  const colors = [
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#10b981', // green
    '#f59e0b', // orange
    '#ec4899', // pink
    '#ef4444', // red
    '#8b5cf6', // purple
    '#06b6d4', // cyan
  ];
  
  return {
    id: 'root',
    label: 'User Context',
    value: 5 * 1024 * 1024, // 5MB total
    color: colors[0],
    children: [
      {
        id: 'preferences',
        label: 'User Preferences',
        value: 1024 * 1024, // 1MB
        color: colors[1],
        children: [
          { id: 'ui_settings', label: 'UI Settings', value: 256 * 1024, color: colors[2] },
          { id: 'style_prefs', label: 'Style Preferences', value: 512 * 1024, color: colors[3] },
          { id: 'defaults', label: 'Defaults', value: 256 * 1024, color: colors[4] },
        ],
      },
      {
        id: 'history',
        label: 'Generation History',
        value: 2 * 1024 * 1024, // 2MB
        color: colors[2],
        children: [
          { id: 'recent', label: 'Recent (7 days)', value: 1024 * 1024, color: colors[3] },
          { id: 'archive', label: 'Archive', value: 768 * 1024, color: colors[4] },
          { id: 'favorites', label: 'Favorites', value: 256 * 1024, color: colors[5] },
        ],
      },
      {
        id: 'models',
        label: 'LUMINA Models',
        value: 1536 * 1024, // 1.5MB
        color: colors[3],
        children: [
          { id: 'trained', label: 'Trained Models', value: 1024 * 1024, color: colors[4] },
          { id: 'training', label: 'In Training', value: 512 * 1024, color: colors[5] },
        ],
      },
      {
        id: 'cache',
        label: 'Cache',
        value: 512 * 1024, // 512KB
        color: colors[4],
      },
    ],
  };
}

// ===========================
// Module Metrics Generation
// ===========================

export function generateMockModuleMetrics(): ModuleMetrics {
  return {
    requestCount: randomInt(100, 10000),
    errorRate: randomFloat(0, 5), // 0-5% error rate
    avgResponseTime: randomFloat(50, 500), // 50-500ms
    uptime: randomInt(3600, 86400 * 7), // 1 hour to 7 days in seconds
  };
}

// ===========================
// Continuous Data Stream
// ===========================

export class MockDataStream {
  private intervalId: number | null = null;
  private callbacks: Array<(event: IOLEvent) => void> = [];

  start(intervalMs: number = 2000): void {
    if (this.intervalId) return;

    this.intervalId = window.setInterval(() => {
      const event = generateMockEvent();
      this.callbacks.forEach(cb => cb(event));
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  subscribe(callback: (event: IOLEvent) => void): () => void {
    this.callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }
}

// ===========================
// Utility Functions
// ===========================

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}
