/**
 * VisionPulse Adapter - Image Quality Assessment Integration
 * Provides real-time image analysis
 */

import { VisionAnalyzer } from '../../../../../pixolink/src/weavai/libs/visionpulse/src/index';
import type { QualityReport } from '../../../../../pixolink/src/weavai/libs/visionpulse/src/index';
import { IOLBus } from '../eventBus';
import type { ConnectorResult, VisionAssessmentOptions, VisionAssessmentResult } from '../../types';

export class VisionPulseAdapter {
  private analyzer: VisionAnalyzer;

  constructor() {
    this.analyzer = new VisionAnalyzer();
  }

  /**
   * Assess image quality
   */
  async assessImage(options: VisionAssessmentOptions): Promise<ConnectorResult<VisionAssessmentResult>> {
    const startTime = Date.now();

    try {
      let result: VisionAssessmentResult;

      if (options.quickMode) {
        // Quick score only
        const score = await this.analyzer.quickScore(options.imageUrl);
        result = {
          imageUrl: options.imageUrl,
          score,
          metrics: {
            sharpness: 0,
            brightness: 0,
            contrast: 0,
            colorfulness: 0,
            composition: 0
          },
          issues: [],
          insights: {
            category: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor',
            suggestions: [],
            confidence: 0.8
          },
          timestamp: Date.now()
        };
      } else {
        // Full analysis
        const report = await this.analyzer.analyzeImage(options.imageUrl);
        result = this.convertReport(report);
      }

      // Publish quality check event
      await IOLBus.publish('IMAGE_ASSESSED', {
        userId: options.userId,
        imageUrl: options.imageUrl,
        score: result.score,
        metrics: result.metrics
      });

      // Publish quality alert if score is low
      if (result.score < 70) {
        await IOLBus.publish('QUALITY_CHECK_COMPLETE', {
          userId: options.userId,
          imageUrl: options.imageUrl,
          score: result.score,
          alert: 'low_quality',
          issues: result.issues
        });
      }

      return {
        success: true,
        data: result,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      await IOLBus.publish('ERROR_OCCURRED', {
        error: error instanceof Error ? error.message : 'Image assessment failed',
        context: 'visionpulse-assess',
        userId: options.userId
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Assessment failed',
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Assess multiple images
   */
  async assessBatch(
    images: Array<{ imageUrl: string; userId?: string }>
  ): Promise<ConnectorResult<VisionAssessmentResult[]>> {
    const startTime = Date.now();

    try {
      const imageUrls = images.map(img => img.imageUrl);
      const reports = await this.analyzer.analyzeBatch(imageUrls);

      const results: VisionAssessmentResult[] = reports.map(report => 
        this.convertReport(report)
      );

      return {
        success: true,
        data: results,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Batch assessment failed',
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Quick quality score (0-100)
   */
  async quickScore(imageUrl: string): Promise<ConnectorResult<number>> {
    const startTime = Date.now();

    try {
      const score = await this.analyzer.quickScore(imageUrl);

      return {
        success: true,
        data: score,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Quick score failed',
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Compare two images
   */
  async compareImages(
    imageUrl1: string,
    imageUrl2: string
  ): Promise<ConnectorResult<{
    image1: VisionAssessmentResult;
    image2: VisionAssessmentResult;
    comparison: {
      scoreDiff: number;
      betterImage: 1 | 2;
      improvements: string[];
    };
  }>> {
    const startTime = Date.now();

    try {
      const [report1, report2] = await this.analyzer.analyzeBatch([imageUrl1, imageUrl2]);

      const result1 = this.convertReport(report1);
      const result2 = this.convertReport(report2);

      const scoreDiff = Math.abs(result1.score - result2.score);
      const betterImage = result1.score > result2.score ? 1 : 2 as 1 | 2;
      const improvements: string[] = [];

      if (result1.insights.suggestions) {
        improvements.push(...result1.insights.suggestions);
      }
      if (result2.insights.suggestions) {
        improvements.push(...result2.insights.suggestions);
      }

      return {
        success: true,
        data: {
          image1: result1,
          image2: result2,
          comparison: {
            scoreDiff,
            betterImage,
            improvements: [...new Set(improvements)]
          }
        },
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Comparison failed',
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Convert QualityReport to VisionAssessmentResult
   */
  private convertReport(report: QualityReport): VisionAssessmentResult {
    return {
      imageUrl: report.url,
      score: report.score,
      metrics: {
        sharpness: report.metrics.sharpness,
        brightness: report.metrics.brightness,
        contrast: report.metrics.contrast,
        colorfulness: report.metrics.colorfulness,
        composition: report.metrics.composition
      },
      issues: report.issues,
      insights: {
        category: report.score >= 80 ? 'excellent' : report.score >= 60 ? 'good' : report.score >= 40 ? 'fair' : 'poor',
        suggestions: report.suggestions,
        confidence: 0.9
      },
      timestamp: report.timestamp
    };
  }
}
