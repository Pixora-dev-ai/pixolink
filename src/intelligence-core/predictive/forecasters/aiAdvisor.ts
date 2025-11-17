/**
 * AI Advisor - AI-driven recommendations via ai-core
 * Generates natural language suggestions for risk mitigation
 */

import type { RiskAssessment, PredictiveAdvisory } from '../types';

export class AIAdvisor {
  /**
   * Generate AI-powered suggestions for risk mitigation
   */
  static async suggest(
    assessment: RiskAssessment,
    context?: {
      recentPatterns?: string[];
      correlatedModules?: string[];
    }
  ): Promise<PredictiveAdvisory> {
    const suggestion = await this.generateSuggestion(assessment, context);

    // Determine action type
    let actionType: 'monitor' | 'optimize' | 'restart' | 'scale' | 'urgent';
    
    if (assessment.riskLevel === 'Critical') {
      actionType = 'urgent';
    } else if (assessment.probability > 0.8) {
      actionType = 'restart';
    } else if (assessment.probability > 0.5) {
      actionType = 'optimize';
    } else if (assessment.probability > 0.3) {
      actionType = 'scale';
    } else {
      actionType = 'monitor';
    }

    // Determine if auto-applicable
    const autoApplicable = assessment.riskLevel !== 'Critical' && 
                          actionType !== 'urgent' &&
                          assessment.probability > 0.7;

    return {
      module: assessment.module,
      risk: assessment.riskLevel,
      probability: assessment.probability,
      suggestion,
      actionType,
      autoApplicable,
      timestamp: Date.now()
    };
  }

  /**
   * Generate suggestion using AI or rule-based logic
   */
  private static async generateSuggestion(
    assessment: RiskAssessment,
    context?: {
      recentPatterns?: string[];
      correlatedModules?: string[];
    }
  ): Promise<string> {
    // Try to use AI core if available
    try {
      const aiSuggestion = await this.getAISuggestion(assessment, context);
      if (aiSuggestion) return aiSuggestion;
    } catch (error) {
      console.warn('AI advisor fallback to rule-based:', error);
    }

    // Fallback to rule-based suggestions
    return this.getRuleBasedSuggestion(assessment, context);
  }

  /**
   * Get AI-powered suggestion (placeholder for ai-core integration)
   */
  private static async getAISuggestion(
    assessment: RiskAssessment,
    context?: {
      recentPatterns?: string[];
      correlatedModules?: string[];
    }
  ): Promise<string | null> {
    // TODO: Integrate with @pixora/ai-core when available
    // const aiCore = await import('@pixora/ai-core');
    // const prompt = this.buildPrompt(assessment, context);
    // return await aiCore.generate({ prompt });
    
    return null; // Not implemented yet
  }

  /**
   * Get rule-based suggestion
   */
  private static getRuleBasedSuggestion(
    assessment: RiskAssessment,
    context?: {
      recentPatterns?: string[];
      correlatedModules?: string[];
    }
  ): string {
    const { module, riskLevel, probability, predictedFailureWindow } = assessment;

    let suggestion = `${module}: `;

    // Base suggestion on risk level
    if (riskLevel === 'Critical') {
      suggestion += `⚠️ Critical risk detected (${(probability * 100).toFixed(0)}% probability). `;
      suggestion += `Immediate action required. Consider: 1) Restart module to clear state, 2) Scale down load, 3) Enable circuit breaker.`;
    } else if (riskLevel === 'High') {
      suggestion += `⚡ High risk detected (${(probability * 100).toFixed(0)}% probability). `;
      suggestion += `Recommend: 1) Increase monitoring frequency, 2) Optimize slow queries, 3) Check resource allocation.`;
    } else if (riskLevel === 'Medium') {
      suggestion += `⚠️ Medium risk detected (${(probability * 100).toFixed(0)}% probability). `;
      suggestion += `Suggest: 1) Review recent changes, 2) Analyze performance metrics, 3) Consider scaling if needed.`;
    } else {
      suggestion += `✓ Low risk (${(probability * 100).toFixed(0)}% probability). `;
      suggestion += `Continue monitoring. No immediate action needed.`;
    }

    // Add time window if available
    if (predictedFailureWindow) {
      suggestion += ` Predicted failure ${predictedFailureWindow}.`;
    }

    // Add context-specific advice
    if (context?.correlatedModules && context.correlatedModules.length > 0) {
      suggestion += ` Note: Correlated with ${context.correlatedModules.join(', ')}. Check for cascading issues.`;
    }

    if (context?.recentPatterns && context.recentPatterns.length > 0) {
      suggestion += ` Patterns: ${context.recentPatterns.join(', ')}.`;
    }

    return suggestion;
  }

  /**
   * Build prompt for AI generation (future use)
   */
  private static buildPrompt(
    assessment: RiskAssessment,
    context?: {
      recentPatterns?: string[];
      correlatedModules?: string[];
    }
  ): string {
    return `
You are an AI system reliability expert. Analyze this module health assessment and provide actionable recommendations:

Module: ${assessment.module}
Risk Level: ${assessment.riskLevel}
Failure Probability: ${(assessment.probability * 100).toFixed(0)}%
Impact Score: ${assessment.impactScore}/100
${assessment.predictedFailureWindow ? `Predicted Failure: ${assessment.predictedFailureWindow}` : ''}

${context?.recentPatterns ? `Recent Patterns: ${context.recentPatterns.join(', ')}` : ''}
${context?.correlatedModules ? `Correlated Modules: ${context.correlatedModules.join(', ')}` : ''}

Provide:
1. Root cause hypothesis
2. 3 specific actionable recommendations (prioritized)
3. Prevention strategy for future occurrences

Keep the response concise (max 150 words).
    `.trim();
  }
}
