/**
 * Cognitive Chain Engine
 * Multi-step reasoning with context memory
 */
import { IndexedDBStorage, FeedbackEngine } from '@pixora/lcm';

export interface ChainStep {
  id: string;
  type: 'analyze' | 'enhance' | 'validate' | 'execute';
  input: string;
  output?: string;
  confidence?: number;
  timestamp: number;
}

export interface ChainSession {
  id: string;
  userId: string;
  steps: ChainStep[];
  context: Record<string, unknown>;
  startTime: number;
  endTime?: number;
}

export interface ChainResult {
  sessionId: string;
  finalOutput: string;
  steps: ChainStep[];
  totalConfidence: number;
  insights: string[];
}

export class CognitiveChain {
  private userId: string;
  private currentSession?: ChainSession;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Start a new reasoning session
   */
  startSession(initialPrompt: string): string {
    const sessionId = `chain-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentSession = {
      id: sessionId,
      userId: this.userId,
      steps: [],
      context: { initialPrompt },
      startTime: Date.now(),
    };

    return sessionId;
  }

  /**
   * Add a step to the chain
   */
  async addStep(
    type: ChainStep['type'],
    input: string,
    processor?: (input: string, context: Record<string, unknown>) => Promise<{ output: string; confidence: number }>
  ): Promise<ChainStep> {
    if (!this.currentSession) {
      throw new Error('No active session. Call startSession() first.');
    }

    const step: ChainStep = {
      id: `step-${this.currentSession.steps.length + 1}`,
      type,
      input,
      timestamp: Date.now(),
    };

    if (processor) {
      const result = await processor(input, this.currentSession.context);
      step.output = result.output;
      step.confidence = result.confidence;
    }

    this.currentSession.steps.push(step);
    return step;
  }

  /**
   * Enhance prompt using historical feedback
   */
  async enhancePrompt(prompt: string): Promise<{ enhanced: string; suggestions: string[]; score: number }> {
    const suggestions = await FeedbackEngine.getSuggestions(this.userId, 'liked');
    const score = await FeedbackEngine.calculatePromptScore(this.userId, prompt);

    // Simple enhancement: add top suggestions if score is low
    let enhanced = prompt;
    if (score < 70 && suggestions.length > 0) {
      const topSuggestions = suggestions.slice(0, 3).join(', ');
      enhanced = `${prompt}, ${topSuggestions}`;
    }

    await this.addStep('enhance', prompt, async () => ({
      output: enhanced,
      confidence: score / 100,
    }));

    return { enhanced, suggestions, score };
  }

  /**
   * Validate prompt quality
   */
  async validatePrompt(prompt: string): Promise<{ valid: boolean; issues: string[]; confidence: number }> {
    const issues: string[] = [];
    let confidence = 1.0;

    // Check length
    if (prompt.length < 5) {
      issues.push('Prompt too short');
      confidence -= 0.3;
    }

    // Check for vague terms
    const vagueTerms = ['good', 'nice', 'beautiful', 'cool'];
    const hasVague = vagueTerms.some(term => prompt.toLowerCase().includes(term));
    if (hasVague) {
      issues.push('Contains vague terms - be more specific');
      confidence -= 0.2;
    }

    // Check historical performance
    const score = await FeedbackEngine.calculatePromptScore(this.userId, prompt);
    if (score < 50) {
      issues.push('Similar prompts had low ratings');
      confidence -= 0.3;
    }

    await this.addStep('validate', prompt, async () => ({
      output: issues.length === 0 ? 'Valid' : issues.join(', '),
      confidence,
    }));

    return { valid: issues.length === 0, issues, confidence: Math.max(0, confidence) };
  }

  /**
   * Complete the session and get results
   */
  async completeSession(): Promise<ChainResult> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession.endTime = Date.now();

    // Calculate overall confidence
    const confidences = this.currentSession.steps
      .map(s => s.confidence)
      .filter((c): c is number => c !== undefined);
    const avgConfidence = confidences.length > 0
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
      : 0.5;

    // Extract insights
    const insights: string[] = [];
    const enhanceSteps = this.currentSession.steps.filter(s => s.type === 'enhance');
    if (enhanceSteps.length > 0) {
      insights.push(`Enhanced prompt through ${enhanceSteps.length} iterations`);
    }

    const validateSteps = this.currentSession.steps.filter(s => s.type === 'validate');
    if (validateSteps.some(s => s.output?.includes('vague'))) {
      insights.push('Prompt clarity could be improved');
    }

    const finalStep = this.currentSession.steps[this.currentSession.steps.length - 1];
    const result: ChainResult = {
      sessionId: this.currentSession.id,
      finalOutput: finalStep?.output || finalStep?.input || '',
      steps: this.currentSession.steps,
      totalConfidence: avgConfidence,
      insights,
    };

    // Save to history if LCM is available
    try {
      await IndexedDBStorage.savePrompt({
        userId: this.userId,
        prompt: this.currentSession.context.initialPrompt as string,
        result: result.finalOutput,
        metadata: {
          sessionId: this.currentSession.id,
          confidence: avgConfidence,
          steps: this.currentSession.steps.length,
        },
      });
    } catch (err) {
      console.warn('Failed to save to LCM:', err);
    }

    this.currentSession = undefined;
    return result;
  }

  /**
   * Get current session
   */
  getCurrentSession(): ChainSession | undefined {
    return this.currentSession;
  }
}
