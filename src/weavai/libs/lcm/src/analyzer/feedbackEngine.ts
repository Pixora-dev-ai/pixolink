/**
 * Feedback Analysis Engine
 * Analyzes user feedback to improve prompt suggestions
 */
import { IndexedDBStorage, PromptEntry } from '../storage/indexedDB';

export interface PromptPattern {
  keywords: string[];
  frequency: number;
  avgFeedback: number; // -1 to 1 scale
}

export class FeedbackEngine {
  /**
   * Analyze liked prompts to find patterns
   */
  static async analyzeLikedPrompts(userId: string): Promise<PromptPattern[]> {
    const likedPrompts = await IndexedDBStorage.getPromptsByFeedback(userId, 'like');
    return this.extractPatterns(likedPrompts);
  }

  /**
   * Analyze disliked prompts to find anti-patterns
   */
  static async analyzeDislikedPrompts(userId: string): Promise<PromptPattern[]> {
    const dislikedPrompts = await IndexedDBStorage.getPromptsByFeedback(userId, 'dislike');
    return this.extractPatterns(dislikedPrompts);
  }

  /**
   * Extract keyword patterns from prompts
   */
  private static extractPatterns(prompts: PromptEntry[]): PromptPattern[] {
    const keywordMap = new Map<string, { count: number; feedback: number }>();

    prompts.forEach((entry) => {
      const keywords = this.extractKeywords(entry.prompt);
      const feedbackValue = entry.feedback === 'like' ? 1 : entry.feedback === 'dislike' ? -1 : 0;

      keywords.forEach((keyword) => {
        const existing = keywordMap.get(keyword) || { count: 0, feedback: 0 };
        keywordMap.set(keyword, {
          count: existing.count + 1,
          feedback: existing.feedback + feedbackValue,
        });
      });
    });

    return Array.from(keywordMap.entries())
      .map(([keyword, data]) => ({
        keywords: [keyword],
        frequency: data.count,
        avgFeedback: data.count > 0 ? data.feedback / data.count : 0,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);
  }

  /**
   * Extract keywords from prompt text
   */
  private static extractKeywords(prompt: string): string[] {
    // Simple keyword extraction - remove common words and split
    const stopWords = new Set([
      'a',
      'an',
      'the',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'as',
      'is',
      'was',
      'are',
      'were',
      'be',
      'been',
      'being',
    ]);

    return prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));
  }

  /**
   * Get prompt improvement suggestions based on history
   */
  static async getSuggestions(userId: string, currentPrompt: string): Promise<string[]> {
    const likedPatterns = await this.analyzeLikedPrompts(userId);
    const currentKeywords = this.extractKeywords(currentPrompt);
    const suggestions: string[] = [];

    // Find patterns from liked prompts that aren't in current prompt
    likedPatterns.forEach((pattern) => {
      pattern.keywords.forEach((keyword) => {
        if (
          !currentKeywords.includes(keyword) &&
          pattern.avgFeedback > 0.5 &&
          suggestions.length < 5
        ) {
          suggestions.push(keyword);
        }
      });
    });

    return suggestions;
  }

  /**
   * Calculate quality score for a prompt based on historical patterns
   */
  static async calculatePromptScore(userId: string, prompt: string): Promise<number> {
    const likedPatterns = await this.analyzeLikedPrompts(userId);
    const dislikedPatterns = await this.analyzeDislikedPrompts(userId);
    const keywords = this.extractKeywords(prompt);

    let score = 50; // Base score

    keywords.forEach((keyword) => {
      const liked = likedPatterns.find((p) => p.keywords.includes(keyword));
      const disliked = dislikedPatterns.find((p) => p.keywords.includes(keyword));

      if (liked) {
        score += liked.avgFeedback * 10;
      }
      if (disliked) {
        score += disliked.avgFeedback * 10;
      }
    });

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get recent feedback trends
   */
  static async getTrends(userId: string, days = 7): Promise<{
    likes: number;
    dislikes: number;
    neutrals: number;
    improvement: number; // percentage change
  }> {
    const history = await IndexedDBStorage.getHistory(userId, 1000);
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    const recentHistory = history.filter((entry) => entry.timestamp > cutoffTime);

    const likes = recentHistory.filter((e) => e.feedback === 'like').length;
    const dislikes = recentHistory.filter((e) => e.feedback === 'dislike').length;
    const neutrals = recentHistory.filter((e) => !e.feedback).length;

    // Calculate improvement (simple metric: ratio of likes to dislikes)
    const currentRatio = likes / (dislikes || 1);
    const previousCutoff = cutoffTime - days * 24 * 60 * 60 * 1000;
    const previousHistory = history.filter(
      (e) => e.timestamp > previousCutoff && e.timestamp <= cutoffTime
    );
    const prevLikes = previousHistory.filter((e) => e.feedback === 'like').length;
    const prevDislikes = previousHistory.filter((e) => e.feedback === 'dislike').length;
    const previousRatio = prevLikes / (prevDislikes || 1);

    const improvement = previousRatio > 0 ? ((currentRatio - previousRatio) / previousRatio) * 100 : 0;

    return { likes, dislikes, neutrals, improvement };
  }
}
