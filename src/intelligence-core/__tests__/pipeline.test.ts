/**
 * IOL Pipeline Integration Tests
 * Tests full orchestration flow from prompt to sync
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { IntelligenceOrchestrator } from '../orchestrator';
import { IOLBus } from '../orchestrator/eventBus';
import { Registry } from '../orchestrator/registry';
import { Metrics } from '../telemetry/metricsTracker';
import { ErrorTracker } from '../telemetry/errorReporter';
import { UsageEvents } from '../telemetry/usageEvents';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockResolvedValue({ data: [], error: null }),
    insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
    update: vi.fn().mockResolvedValue({ data: {}, error: null }),
    delete: vi.fn().mockResolvedValue({ data: {}, error: null }),
    upsert: vi.fn().mockResolvedValue({ data: {}, error: null })
  }),
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: {}, error: null })
    })
  }
};

describe('Intelligence Orchestration Layer', () => {
  let orchestrator: IntelligenceOrchestrator;
  const testUserId = 'test_user_123';
  const testPrompt = 'A beautiful sunset over mountains';

  beforeEach(() => {
    // Reset all event listeners
    IOLBus.clearListeners();
    IOLBus.clearHistory();

    // Reset telemetry
    UsageEvents.reset();

    // Create orchestrator
    orchestrator = new IntelligenceOrchestrator({
      userId: testUserId,
      sessionId: 'test_session',
      supabaseClient: mockSupabaseClient as any,
      enableTelemetry: false, // Disable for tests
      enableAutoSync: false
    });
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      const status = orchestrator.getStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.config.userId).toBe(testUserId);
      expect(status.session).toBeNull();
    });

    it('should register all adapters', () => {
      const adapters = orchestrator.getAdapters();
      
      expect(adapters.lcm).toBeDefined();
      expect(adapters.lcc).toBeDefined();
      expect(adapters.pixsync).toBeDefined();
      expect(adapters.logicsim).toBeDefined();
      expect(adapters.visionpulse).toBeDefined();
    });

    it('should register all connectors', () => {
      const connectors = orchestrator.getConnectors();
      
      expect(connectors.lumina).toBeDefined();
      expect(connectors.supabase).toBeDefined();
      expect(connectors.pixoguard).toBeDefined();
      expect(connectors.logicguardian).toBeDefined();
    });

    it('should initialize event listeners', () => {
      const stats = IOLBus.getStats();
      
      // Should have listeners for key events
      expect(stats.listenersByType.PROMPT_GENERATED).toBeGreaterThan(0);
      expect(stats.listenersByType.IMAGE_GENERATED).toBeGreaterThan(0);
      expect(stats.listenersByType.IMAGE_ASSESSED).toBeGreaterThan(0);
    });

    it('should access registry modules', () => {
      const registry = orchestrator.getRegistry();
      
      expect(registry.has('lcm.storage')).toBe(true);
      expect(registry.has('lcc.chain')).toBe(true);
      expect(registry.has('visionpulse.analyzer')).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('should start a new session', async () => {
      await orchestrator.startSession();
      
      const session = orchestrator.getCurrentSession();
      expect(session).not.toBeNull();
      expect(session?.userId).toBe(testUserId);
      expect(session?.sessionId).toBe('test_session');
      expect(session?.startTime).toBeDefined();
    });

    it('should publish SESSION_STARTED event', async () => {
      const events: any[] = [];
      IOLBus.subscribe('SESSION_STARTED', (payload) => {
        events.push(payload);
      });

      await orchestrator.startSession();
      
      expect(events.length).toBe(1);
      expect(events[0].data.userId).toBe(testUserId);
    });

    it('should end session and return metrics', async () => {
      await orchestrator.startSession();
      
      // Simulate some activity
      const session = orchestrator.getCurrentSession();
      if (session) {
        session.metrics.promptsGenerated = 5;
        session.metrics.imagesGenerated = 5;
      }

      const completedSession = await orchestrator.endSession();
      
      expect(completedSession).not.toBeNull();
      expect(completedSession?.endTime).toBeDefined();
      expect(completedSession?.metrics.promptsGenerated).toBe(5);
    });

    it('should clear current session after ending', async () => {
      await orchestrator.startSession();
      await orchestrator.endSession();
      
      expect(orchestrator.getCurrentSession()).toBeNull();
    });
  });

  describe('Event Bus Integration', () => {
    it('should publish and receive events', async () => {
      const receivedEvents: any[] = [];
      
      IOLBus.subscribe('PROMPT_GENERATED', (payload) => {
        receivedEvents.push(payload);
      });

      await IOLBus.publish('PROMPT_GENERATED', {
        userId: testUserId,
        prompt: testPrompt
      });

      expect(receivedEvents.length).toBe(1);
      expect(receivedEvents[0].data.prompt).toBe(testPrompt);
    });

    it('should track event history', async () => {
      await IOLBus.publish('IMAGE_GENERATED', {
        userId: testUserId,
        result: { imageUrl: 'test.jpg', generationId: 'gen_123' }
      });

      const history = IOLBus.getHistory({ type: 'IMAGE_GENERATED', limit: 1 });
      
      expect(history.length).toBe(1);
      expect(history[0].type).toBe('IMAGE_GENERATED');
    });

    it('should wait for events with promise', async () => {
      const promise = IOLBus.waitFor('SYNC_COMPLETE', 1000);
      
      setTimeout(() => {
        IOLBus.publish('SYNC_COMPLETE', { userId: testUserId, result: {} });
      }, 100);

      const result = await promise;
      expect(result).toBeDefined();
      expect(result.type).toBe('SYNC_COMPLETE');
    });

    it('should handle multiple listeners for same event', async () => {
      let count = 0;
      
      IOLBus.subscribe('TEST_EVENT', () => count++);
      IOLBus.subscribe('TEST_EVENT', () => count++);
      IOLBus.subscribe('TEST_EVENT', () => count++);

      await IOLBus.publish('TEST_EVENT' as any, {});
      
      expect(count).toBe(3);
    });
  });

  describe('Full Generation Pipeline', () => {
    it('should run complete pipeline successfully', async () => {
      await orchestrator.startSession();
      
      const result = await orchestrator.runGenerationPipeline(testPrompt);

      // Check overall success
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(0);

      // Check pipeline object
      expect(result.pipeline.originalPrompt).toBe(testPrompt);
      expect(result.pipeline.enhancedPrompt).toBeDefined();
      expect(result.pipeline.generationResult).toBeDefined();

      // Check all steps
      expect(result.steps.intelligence).toBeDefined();
      expect(typeof result.steps.intelligence.success).toBe('boolean');
      expect(result.steps.enhance.success).toBe(true);
      expect(result.steps.validate.success).toBe(true);
      expect(result.steps.generate.success).toBe(true);
      expect(result.steps.assess.success).toBe(true);
      expect(result.steps.save.success).toBe(true);
    });

    it('should enhance prompt via LCC', async () => {
      const result = await orchestrator.runGenerationPipeline(testPrompt);
      
      expect(result.pipeline.enhancedPrompt).toBeDefined();
      expect(result.pipeline.enhancedPrompt).not.toBe(testPrompt);
    });

    it('should validate prompt', async () => {
      const result = await orchestrator.runGenerationPipeline(testPrompt);
      
      expect(result.steps.validate.success).toBe(true);
      expect(result.steps.validate.data).toHaveProperty('isValid');
    });

    it('should generate image', async () => {
      const result = await orchestrator.runGenerationPipeline(testPrompt);
      
      expect(result.steps.generate.success).toBe(true);
      expect(result.pipeline.generationResult).toHaveProperty('imageUrl');
      expect(result.pipeline.generationResult).toHaveProperty('generationId');
    });

    it('should assess image quality', async () => {
      const result = await orchestrator.runGenerationPipeline(testPrompt);
      
      expect(result.steps.assess.success).toBe(true);
      expect(result.pipeline.qualityAssessment).toHaveProperty('score');
      expect(result.pipeline.qualityAssessment?.score).toBeGreaterThanOrEqual(0);
      expect(result.pipeline.qualityAssessment?.score).toBeLessThanOrEqual(100);
    });

    it('should save to memory', async () => {
      const result = await orchestrator.runGenerationPipeline(testPrompt);
      
      expect(result.steps.save.success).toBe(true);
      expect(result.pipeline.saved).toBe(true);
    });

    it('should update session metrics', async () => {
      await orchestrator.startSession();
      await orchestrator.runGenerationPipeline(testPrompt);
      
      const session = orchestrator.getCurrentSession();
      
      expect(session?.metrics.promptsGenerated).toBe(1);
      expect(session?.metrics.imagesGenerated).toBe(1);
      expect(session?.metrics.qualityChecks).toBe(1);
    });

    it('should handle pipeline errors gracefully', async () => {
      // Test with invalid prompt
      const result = await orchestrator.runGenerationPipeline('');
      
      // Pipeline should fail but not throw
      expect(result.success).toBe(false);
      expect(result.pipeline.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Adapter Integration', () => {
    it('should access LCM adapter', async () => {
      const adapters = orchestrator.getAdapters();
      
      const result = await adapters.lcm.savePrompt({
        userId: testUserId,
        prompt: testPrompt,
        response: 'test_image.jpg',
        feedback: 'liked'
      });

      expect(result.success).toBe(true);
    });

    it('should access LCC adapter', async () => {
      const adapters = orchestrator.getAdapters();
      
      const result = await adapters.lcc.enhancePrompt(
        { prompt: testPrompt, userId: testUserId },
        mockSupabaseClient as any
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('enhanced');
    });

    it('should access VisionPulse adapter', async () => {
      const adapters = orchestrator.getAdapters();
      
      const result = await adapters.visionpulse.quickScore('test_image.jpg');

      expect(result.success).toBe(true);
      expect(typeof result.data).toBe('number');
    });

    it('should access PixSync adapter', async () => {
      const adapters = orchestrator.getAdapters();
      
      const pendingCount = adapters.pixsync.getPendingCount();
      expect(typeof pendingCount).toBe('number');
    });

    it('should access LogicSim adapter', async () => {
      const adapters = orchestrator.getAdapters();
      
      adapters.logicsim.addScenario({
        id: 'test_1',
        name: 'Test Scenario',
        description: 'Test',
        category: 'validation',
        expectedOutcome: 'pass',
        testData: {}
      });

      const scenarios = adapters.logicsim.getScenarios();
      expect(scenarios.length).toBeGreaterThan(0);
    });
  });

  describe('Connector Integration', () => {
    it('should access LUMINA connector', async () => {
      const connectors = orchestrator.getConnectors();
      
      const result = await connectors.lumina.generate({
        prompt: testPrompt,
        userId: testUserId
      });

      expect(result.success).toBe(true);
    });

    it('should access PixoGuard connector', async () => {
      const connectors = orchestrator.getConnectors();
      
      await connectors.pixoguard.reportAnomaly(
        'Test anomaly',
        'low',
        { test: true }
      );

      const reports = connectors.pixoguard.getReports({ type: 'anomaly' });
      expect(reports.length).toBeGreaterThan(0);
    });

    it('should access LogicGuardian connector', async () => {
      const connectors = orchestrator.getConnectors();
      
      const result = await connectors.logicguardian.validatePrompt(testPrompt);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('isValid');
    });
  });

  describe('Event Listener Behavior', () => {
    it('should track prompt generation', async () => {
      const events: any[] = [];
      IOLBus.subscribe('PROMPT_GENERATED', (payload) => events.push(payload));

      await IOLBus.publish('PROMPT_GENERATED', {
        userId: testUserId,
        prompt: testPrompt
      });

      expect(events.length).toBe(1);
    });

    it('should auto-assess images after generation', async () => {
      const events: any[] = [];
      IOLBus.subscribe('IMAGE_ASSESSED', (payload) => events.push(payload));

      // Run pipeline which should trigger auto-assessment
      await orchestrator.runGenerationPipeline(testPrompt);

      // Wait for async event processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it('should report low quality to PixoGuard', async () => {
      const connectors = orchestrator.getConnectors();
      
      // Simulate low quality image
      await IOLBus.publish('IMAGE_ASSESSED', {
        userId: testUserId,
        imageUrl: 'low_quality.jpg',
        score: 50
      });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const reports = connectors.pixoguard.getReports({ type: 'quality' });
      expect(reports.length).toBeGreaterThan(0);
    });

    it('should handle sync failures', async () => {
      const connectors = orchestrator.getConnectors();
      
      await IOLBus.publish('SYNC_FAILED', {
        userId: testUserId,
        error: 'Network error'
      });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const reports = connectors.pixoguard.getReports({ type: 'anomaly' });
      expect(reports.length).toBeGreaterThan(0);
    });
  });

  describe('Status and Monitoring', () => {
    it('should provide orchestrator status', () => {
      const status = orchestrator.getStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.adapters).toHaveProperty('lcm');
      expect(status.adapters).toHaveProperty('lcc');
      expect(status.adapters).toHaveProperty('pixsync');
      expect(status.telemetry).toBeDefined();
      expect(status.eventBus).toBeDefined();
    });

    it('should track event statistics', () => {
      IOLBus.publish('TEST_EVENT' as any, {});
      IOLBus.publish('TEST_EVENT' as any, {});
      IOLBus.publish('TEST_EVENT' as any, {});

      const stats = IOLBus.getStats();
      expect(stats.totalEvents).toBeGreaterThanOrEqual(3);
    });

    it('should provide module health status', () => {
      const registry = orchestrator.getRegistry();
      const health = registry.healthCheck();

      expect(health['lcm.storage'].isHealthy).toBe(true);
      expect(health['lcc.chain'].isHealthy).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing userId gracefully', async () => {
      const noUserOrchestrator = new IntelligenceOrchestrator({
        userId: '',
        supabaseClient: mockSupabaseClient as any
      });

      const result = await noUserOrchestrator.runGenerationPipeline(testPrompt);
      
      // Should still attempt to run but may have errors
      expect(result).toBeDefined();
    });

    it('should capture errors in pipeline', async () => {
      // Force validation error with harmful content
      const result = await orchestrator.runGenerationPipeline('<script>alert("xss")</script>');
      
      expect(result.success).toBe(false);
      expect(result.pipeline.errors.length).toBeGreaterThan(0);
    });

    it('should publish error events', async () => {
      const errors: any[] = [];
      IOLBus.subscribe('ERROR_OCCURRED', (payload) => errors.push(payload));

      await IOLBus.publish('ERROR_OCCURRED', {
        error: 'Test error',
        context: 'test',
        userId: testUserId
      });

      expect(errors.length).toBe(1);
    });
  });
});
