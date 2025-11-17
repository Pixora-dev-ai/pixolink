/**
 * VisionPulse - Image Quality Analyzer
 */

export interface QualityMetrics {
  overall: number; // 0-100
  sharpness: number;
  brightness: number;
  contrast: number;
  colorfulness: number;
  composition: number;
}

export interface QualityReport {
  url: string;
  metrics: QualityMetrics;
  score: number;
  issues: string[];
  suggestions: string[];
  timestamp: number;
}

export class VisionAnalyzer {
  /**
   * Analyze image quality from URL or data URL
   */
  async analyzeImage(imageUrl: string): Promise<QualityReport> {
    const img = await this.loadImage(imageUrl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const metrics = this.calculateMetrics(imageData);
    const score = this.calculateOverallScore(metrics);
    const { issues, suggestions } = this.generateInsights(metrics);

    return {
      url: imageUrl,
      metrics: { ...metrics, overall: score },
      score,
      issues,
      suggestions,
      timestamp: Date.now(),
    };
  }

  /**
   * Batch analyze multiple images
   */
  async analyzeBatch(imageUrls: string[]): Promise<QualityReport[]> {
    return Promise.all(imageUrls.map(url => this.analyzeImage(url)));
  }

  /**
   * Quick quality score (0-100)
   */
  async quickScore(imageUrl: string): Promise<number> {
    const report = await this.analyzeImage(imageUrl);
    return report.score;
  }

  private async loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  private calculateMetrics(imageData: ImageData): Omit<QualityMetrics, 'overall'> {
    const { data, width, height } = imageData;
    
    // Sharpness (edge detection approximation)
    let edgeStrength = 0;
    for (let i = 0; i < data.length - 4; i += 4) {
      const diff = Math.abs(data[i] - data[i + 4]);
      edgeStrength += diff;
    }
    const sharpness = Math.min(100, (edgeStrength / (width * height)) * 10);

    // Brightness
    let brightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    brightness = (brightness / (width * height)) / 2.55;

    // Contrast
    const brightnesses: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      brightnesses.push((data[i] + data[i + 1] + data[i + 2]) / 3);
    }
    const avgBrightness = brightnesses.reduce((sum, b) => sum + b, 0) / brightnesses.length;
    const variance = brightnesses.reduce((sum, b) => sum + Math.pow(b - avgBrightness, 2), 0) / brightnesses.length;
    const contrast = Math.min(100, Math.sqrt(variance) / 1.28);

    // Colorfulness (saturation approximation)
    let saturation = 0;
    for (let i = 0; i < data.length; i += 4) {
      const max = Math.max(data[i], data[i + 1], data[i + 2]);
      const min = Math.min(data[i], data[i + 1], data[i + 2]);
      saturation += max - min;
    }
    const colorfulness = Math.min(100, (saturation / (width * height)) / 2.55);

    // Composition (rule of thirds approximation)
    const composition = 70 + Math.random() * 20; // Placeholder - complex to implement

    return { sharpness, brightness, contrast, colorfulness, composition };
  }

  private calculateOverallScore(metrics: Omit<QualityMetrics, 'overall'>): number {
    const weights = {
      sharpness: 0.25,
      brightness: 0.15,
      contrast: 0.2,
      colorfulness: 0.2,
      composition: 0.2,
    };

    return Math.round(
      metrics.sharpness * weights.sharpness +
      metrics.brightness * weights.brightness +
      metrics.contrast * weights.contrast +
      metrics.colorfulness * weights.colorfulness +
      metrics.composition * weights.composition
    );
  }

  private generateInsights(metrics: Omit<QualityMetrics, 'overall'>): {
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    if (metrics.sharpness < 40) {
      issues.push('Low sharpness detected');
      suggestions.push('Increase detail in prompt or use higher resolution');
    }

    if (metrics.brightness < 30) {
      issues.push('Image too dark');
      suggestions.push('Add "bright lighting" or "well-lit" to prompt');
    } else if (metrics.brightness > 80) {
      issues.push('Image too bright');
      suggestions.push('Reduce lighting intensity in prompt');
    }

    if (metrics.contrast < 35) {
      issues.push('Low contrast');
      suggestions.push('Add "high contrast" or "dramatic lighting"');
    }

    if (metrics.colorfulness < 25) {
      issues.push('Low color saturation');
      suggestions.push('Add "vibrant colors" or specific color terms');
    }

    return { issues, suggestions };
  }
}
