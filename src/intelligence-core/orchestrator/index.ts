/**
 * Intelligence Orchestrator - Central Coordination Brain
 * Manages all AI subsystems and external integrations
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { IOLBus } from './eventBus';
import { Registry } from './registry';

// Connectors
import { luminaConnector } from './connectors/lumina-connector';
import { supabaseConnector } from './connectors/supabase-connector';
import { pixoguardConnector } from './connectors/pixoguard-connector';
import { logicguardianConnector } from './connectors/logicguardian-connector';

// Adapters
import { LCMAdapter } from './adapters/lcm-adapter';
import { LCCAdapter } from './adapters/lcc-adapter';
import { PixSyncAdapter } from './adapters/pixsync-adapter';
import { LogicSimAdapter } from './adapters/logicsim-adapter';
import { VisionPulseAdapter } from './adapters/visionpulse-adapter';
import { WeavAIAdapter } from './adapters/weavai-adapter';

// Telemetry
import { Metrics } from '../telemetry/metricsTracker';
import { ErrorTracker } from '../telemetry/errorReporter';
import { UsageEvents } from '../telemetry/usageEvents';

import type {
  OrchestratorConfig,
  OrchestratorSession,
  GenerationPipeline,
  PipelineResult,
  LuminaGenerationOptions
} from '../types';

export class IntelligenceOrchestrator {
  private config: OrchestratorConfig;
  private session: OrchestratorSession | null = null;
  private adapters: {
    lcm: LCMAdapter;
    lcc: LCCAdapter;
    pixsync: PixSyncAdapter;
    logicsim: LogicSimAdapter;
    visionpulse: VisionPulseAdapter;
    weavai: WeavAIAdapter;
  };
  private weavAiReady: Promise<void> | null = null;

  constructor(config: OrchestratorConfig) {
    this.config = config;

    // Initialize adapters
    this.adapters = {
      lcm: new LCMAdapter(config.supabaseClient),
      lcc: new LCCAdapter(),
      pixsync: new PixSyncAdapter(config.supabaseClient),
      logicsim: new LogicSimAdapter(),
      visionpulse: new VisionPulseAdapter(),
      weavai: new WeavAIAdapter({
        userId: config.userId,
        sessionId: config.sessionId
      })
    };

    this.weavAiReady = this.adapters.weavai.initialize().catch((error) => {
      console.error('[IOL] Failed to initialize WeavAI adapter', error);
      return undefined;
    });

    // Initialize connectors
    if (config.supabaseClient) {
      supabaseConnector.setClient(config.supabaseClient as SupabaseClient);
    }

    // Setup event listeners
    this.initializeListeners();

    // Initialize telemetry
    if (config.enableTelemetry !== false) {
      this.initializeTelemetry();
    }

    // Enable auto-sync if configured
    if (config.enableAutoSync && config.supabaseClient) {
      this.adapters.pixsync.enableAutoSync(config.syncInterval ?? 60000);
    }
  }

  /**
   * Initialize event listeners
   */
  private initializeListeners(): void {
    // Prompt generated -> Save to memory
    IOLBus.subscribe('PROMPT_GENERATED', async ({ data }) => {
      const { prompt, userId } = data;
      
      if (userId) {
        UsageEvents.promptGenerated(userId, prompt as string);
      }
    });

    // Image generated -> Assess quality
    IOLBus.subscribe('IMAGE_GENERATED', async ({ data }) => {
      const { result, userId } = data;

      if (userId && result) {
        const imageResult = result as { imageUrl: string; generationId: string };
        UsageEvents.imageGenerated(userId, imageResult.generationId, 0);

        // Auto-assess quality
        try {
          await this.adapters.visionpulse.assessImage({
            imageUrl: imageResult.imageUrl,
            userId
          });
        } catch (error) {
          ErrorTracker.low(
            error instanceof Error ? error : new Error('Quality assessment failed'),
            { userId, imageUrl: imageResult.imageUrl }
          );
        }
      }
    });

    // Image assessed -> Log quality
    IOLBus.subscribe('IMAGE_ASSESSED', async ({ data }) => {
      const { userId, imageUrl, score } = data;

      if (userId) {
        UsageEvents.qualityAssessed(userId, score as number, imageUrl as string);
      }

      // Report low quality to PixoGuard
      if (typeof score === 'number' && score < 70) {
        await pixoguardConnector.reportQuality(
          `Low quality image detected (score: ${score})`,
          'medium',
          { userId, imageUrl, score }
        );
      }
    });

    // Sync complete -> Log metrics
    IOLBus.subscribe('SYNC_COMPLETE', async ({ data }) => {
      const { userId, result } = data;

      if (userId && result) {
        const syncResult = result as { uploaded: number; downloaded: number };
        UsageEvents.syncPerformed(userId, syncResult.uploaded, syncResult.downloaded, 0);
      }
    });

    // Sync failed -> Report error
    IOLBus.subscribe('SYNC_FAILED', async ({ data }) => {
      const { userId, error } = data;

      if (userId) {
        UsageEvents.errorEncountered(userId, error as string, { source: 'sync' });
      }

      await pixoguardConnector.reportAnomaly(
        'Sync operation failed',
        'medium',
        { userId, error }
      );
    });

    // Rule conflict -> Report to PixoGuard
    IOLBus.subscribe('RULE_CONFLICT', async ({ data }) => {
      await pixoguardConnector.report({
        type: 'anomaly',
        severity: 'high',
        message: 'Logic rule conflict detected',
        data
      });
    });

    // Validation error -> Report
    IOLBus.subscribe('VALIDATION_ERROR', async ({ data }) => {
      await pixoguardConnector.report({
        type: 'quality',
        severity: 'low',
        message: 'Validation error',
        data
      });
    });

    // Error occurred -> Track
    IOLBus.subscribe('ERROR_OCCURRED', async ({ data }) => {
      const { error, context, userId } = data;

      if (error && typeof error === 'string' && ErrorTracker.isInitialized()) {
        ErrorTracker.medium(new Error(error), context as Record<string, unknown>, userId as string);
      }
    });

    // Feedback received -> Update learning
    IOLBus.subscribe('FEEDBACK_RECEIVED', async ({ data }) => {
      const { promptId, feedback, userId } = data;

      if (userId) {
        UsageEvents.feedbackGiven(
          userId,
          promptId as string,
          feedback as 'liked' | 'disliked' | 'neutral'
        );
      }
    });
  }

  /**
   * Initialize telemetry systems
   */
  private initializeTelemetry(): void {
    try {
      Metrics.initialize();
      ErrorTracker.initialize();

      if (this.config.userId) {
        Metrics.identify(this.config.userId);
        ErrorTracker.setUser(this.config.userId);
      }
    } catch (error) {
      console.error('[IOL] Failed to initialize telemetry:', error);
    }
  }

  /**
   * Start a new session
   */
  async startSession(): Promise<void> {
    const sessionId = this.config.sessionId ?? `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    this.session = {
      sessionId,
      userId: this.config.userId,
      startTime: Date.now(),
      events: [],
      metrics: {
        promptsGenerated: 0,
        imagesGenerated: 0,
        qualityChecks: 0,
        syncOperations: 0
      }
    };

    await IOLBus.publish('SESSION_STARTED', {
      userId: this.config.userId,
      sessionId
    });

    UsageEvents.sessionStarted(this.config.userId, sessionId);
    Metrics.track('session_started', { userId: this.config.userId, sessionId });
  }

  /**
   * End current session
   */
  async endSession(): Promise<OrchestratorSession | null> {
    if (!this.session) return null;

    this.session.endTime = Date.now();
    const duration = this.session.endTime - this.session.startTime;

    await IOLBus.publish('SESSION_ENDED', {
      userId: this.config.userId,
      sessionId: this.session.sessionId,
      duration
    });

    UsageEvents.sessionEnded(this.config.userId, this.session.sessionId, duration);
    Metrics.track('session_ended', {
      userId: this.config.userId,
      sessionId: this.session.sessionId,
      duration,
      metrics: this.session.metrics
    });

    const completedSession = { ...this.session };
    this.session = null;

    return completedSession;
  }

  /**
   * Run full generation pipeline
   */
  async runGenerationPipeline(
    originalPrompt: string,
    options?: Partial<LuminaGenerationOptions>
  ): Promise<PipelineResult> {
    const startTime = Date.now();

    const pipeline: GenerationPipeline = {
      userId: this.config.userId,
      sessionId: this.session?.sessionId ?? 'no-session',
      originalPrompt,
      saved: false,
      synced: false,
      errors: []
    };

    const steps = {
      intelligence: { success: false, duration: 0, timestamp: Date.now() },
      enhance: { success: false, duration: 0, timestamp: Date.now() },
      validate: { success: false, duration: 0, timestamp: Date.now() },
      generate: { success: false, duration: 0, timestamp: Date.now() },
      assess: { success: false, duration: 0, timestamp: Date.now() },
      save: { success: false, duration: 0, timestamp: Date.now() },
      sync: { success: false, duration: 0, timestamp: Date.now() }
    };

    try {
      // Step 0: Pre-process prompt with WeavAI intelligence layer
      try {
        await this.weavAiReady;
        const intelligenceResult = await this.adapters.weavai.analyzePrompt(originalPrompt, {
          stage: 'pipeline',
          userId: this.config.userId
        });
        steps.intelligence = intelligenceResult;

        if (intelligenceResult.success && intelligenceResult.data?.insight) {
          pipeline.weavAi = intelligenceResult.data;
          if (!pipeline.enhancedPrompt) {
            pipeline.enhancedPrompt = intelligenceResult.data.insight.optimizedPrompt;
          }
        }
      } catch (error) {
        steps.intelligence = {
          success: false,
          duration: 0,
          timestamp: Date.now(),
          error: error instanceof Error ? error : new Error('WeavAI analysis failed')
        };
      }

      // Step 1: Enhance prompt with LCC
      const enhanceResult = await this.adapters.lcc.enhancePrompt(
        { prompt: originalPrompt, userId: this.config.userId },
        this.config.supabaseClient
      );
      steps.enhance = enhanceResult;

      if (enhanceResult.success && enhanceResult.data) {
        pipeline.enhancedPrompt = enhanceResult.data.enhanced;
      }

      // Step 2: Validate prompt
      const validateResult = await logicguardianConnector.validatePrompt(
        pipeline.enhancedPrompt ?? originalPrompt
      );
      steps.validate = validateResult;

      if (!validateResult.success || !validateResult.data?.isValid) {
        throw new Error('Prompt validation failed');
      }

      // Step 3: Generate image with LUMINA
      const generateResult = await luminaConnector.generate({
        prompt: originalPrompt,
        enhancedPrompt: pipeline.enhancedPrompt,
        userId: this.config.userId,
        sessionId: this.session?.sessionId,
        ...options
      });
      steps.generate = generateResult;

      if (generateResult.success && generateResult.data) {
        pipeline.generationResult = generateResult.data;
      }

      // Step 4: Assess quality with VisionPulse
      if (pipeline.generationResult) {
        const assessResult = await this.adapters.visionpulse.assessImage({
          imageUrl: pipeline.generationResult.imageUrl,
          userId: this.config.userId
        });
        steps.assess = assessResult;

        if (assessResult.success && assessResult.data) {
          pipeline.qualityAssessment = assessResult.data;
        }
      }

      // Step 5: Save to memory (LCM)
      if (pipeline.generationResult) {
        const saveResult = await this.adapters.lcm.savePrompt({
          userId: this.config.userId,
          prompt: originalPrompt,
          response: pipeline.generationResult.imageUrl,
          feedback: 'neutral',
          metadata: {
            enhancedPrompt: pipeline.enhancedPrompt,
            qualityScore: pipeline.qualityAssessment?.score
          }
        });
        steps.save = saveResult;
        pipeline.saved = saveResult.success;
      }

      // Step 6: Sync to cloud (PixSync)
      if (this.config.enableAutoSync !== false) {
        const syncResult = await this.adapters.pixsync.sync({
          userId: this.config.userId
        });
        steps.sync = syncResult;
        pipeline.synced = syncResult.success;
      }

      // Update session metrics
      if (this.session) {
        this.session.metrics.promptsGenerated++;
        this.session.metrics.imagesGenerated++;
        if (steps.assess.success) this.session.metrics.qualityChecks++;
        if (steps.sync.success) this.session.metrics.syncOperations++;
      }

      return {
        success: true,
        pipeline,
        duration: Date.now() - startTime,
        steps
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Pipeline failed');
      pipeline.errors.push(err);

      ErrorTracker.high(err, {
        userId: this.config.userId,
        pipeline,
        steps
      });

      return {
        success: false,
        pipeline,
        duration: Date.now() - startTime,
        steps
      };
    }
  }

  /**
   * Get adapters (for direct access)
   */
  getAdapters() {
    return this.adapters;
  }

  /**
   * Get connectors (for direct access)
   */
  getConnectors() {
    return {
      lumina: luminaConnector,
      supabase: supabaseConnector,
      pixoguard: pixoguardConnector,
      logicguardian: logicguardianConnector
    };
  }

  /**
   * Get event bus
   */
  getEventBus() {
    return IOLBus;
  }

  /**
   * Get registry
   */
  getRegistry() {
    return Registry;
  }

  /**
   * Get current session
   */
  getCurrentSession(): OrchestratorSession | null {
    return this.session;
  }

  /**
   * Get orchestrator status
   */
  getStatus() {
    return {
      initialized: true,
      session: this.session,
      config: this.config,
      adapters: {
        lcm: 'active',
        lcc: 'active',
        pixsync: this.adapters.pixsync.getPendingCount() > 0 ? 'syncing' : 'active',
        logicsim: 'active',
        visionpulse: 'active',
        weavai: this.weavAiReady ? 'active' : 'initializing'
      },
      telemetry: {
        metrics: Metrics.isInitialized(),
        errors: ErrorTracker.isInitialized()
      },
      eventBus: {
        listeners: IOLBus.getStats().listenersByType,
        events: IOLBus.getStats().totalEvents
      }
    };
  }
}

// Export singleton creator
export function createOrchestrator(config: OrchestratorConfig): IntelligenceOrchestrator {
  return new IntelligenceOrchestrator(config);
}

// Export all components
export { IOLBus, Registry, Metrics, ErrorTracker, UsageEvents };
export * from './connectors/lumina-connector';
export * from './connectors/supabase-connector';
export * from './connectors/pixoguard-connector';
export * from './connectors/logicguardian-connector';
export * from './adapters/lcm-adapter';
export * from './adapters/lcc-adapter';
export * from './adapters/pixsync-adapter';
export * from './adapters/logicsim-adapter';
export * from './adapters/visionpulse-adapter';
