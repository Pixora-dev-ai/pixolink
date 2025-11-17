/**
 * VisionTester - VisionPulse Testing Interface
 * Allows admins to test image quality assessment with VisionPulse
 */

import React, { useState } from 'react';

interface QualityAssessment {
  overall: number;
  metrics: {
    composition: number;
    color: number;
    clarity: number;
    creativity: number;
  };
  issues: string[];
  recommendations: string[];
  timestamp: number;
}

export const VisionTester: React.FC = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [assessment, setAssessment] = useState<QualityAssessment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageUrl('');
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    setImageFile(null);
    setPreviewUrl(url);
  };

  const analyzeImage = async () => {
    if (!imageUrl && !imageFile) {
      alert('Please provide an image URL or upload a file');
      return;
    }

    setIsAnalyzing(true);
    setAssessment(null);

    try {
      // TODO: Replace with actual VisionPulse API call
      // const result = await VisionPulse.assess(imageUrl || imageFile);

      // Simulate analysis with realistic timing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate mock assessment
      const mockAssessment: QualityAssessment = {
        overall: Math.floor(Math.random() * 30) + 70,
        metrics: {
          composition: Math.floor(Math.random() * 30) + 70,
          color: Math.floor(Math.random() * 30) + 70,
          clarity: Math.floor(Math.random() * 30) + 70,
          creativity: Math.floor(Math.random() * 30) + 70
        },
        issues: [
          Math.random() > 0.5 ? 'Low contrast in background' : null,
          Math.random() > 0.6 ? 'Slight color imbalance' : null,
          Math.random() > 0.7 ? 'Minor composition issues' : null
        ].filter(Boolean) as string[],
        recommendations: [
          'Enhance contrast for better visual impact',
          'Consider adjusting color temperature',
          'Apply rule of thirds for composition'
        ].slice(0, Math.floor(Math.random() * 3) + 1),
        timestamp: Date.now()
      };

      setAssessment(mockAssessment);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'score-excellent';
    if (score >= 70) return 'score-good';
    if (score >= 60) return 'score-fair';
    return 'score-poor';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="vision-tester">
      <div className="vision-tester-header">
        <h3 className="vision-tester-title">👁️ Vision Quality Tester</h3>
        <span className="vision-tester-subtitle">Test image quality assessment with VisionPulse</span>
      </div>

      <div className="vision-tester-body">
        <div className="image-input-section">
          <div className="input-tabs">
            <button
              className={`input-tab ${!imageFile ? 'active' : ''}`}
              onClick={() => {
                setImageFile(null);
                setPreviewUrl(imageUrl);
              }}
            >
              URL
            </button>
            <button
              className={`input-tab ${imageFile ? 'active' : ''}`}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              Upload
            </button>
          </div>

          {!imageFile ? (
            <div className="form-group">
              <label htmlFor="image-url">Image URL</label>
              <input
                id="image-url"
                type="text"
                className="form-input"
                placeholder="https://example.com/image.png"
                value={imageUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
              />
            </div>
          ) : (
            <div className="file-info">
              <p><strong>File:</strong> {imageFile.name}</p>
              <p><strong>Size:</strong> {(imageFile.size / 1024).toFixed(2)} KB</p>
              <button
                className="btn-clear-file"
                onClick={() => {
                  setImageFile(null);
                  setPreviewUrl(null);
                }}
              >
                Clear
              </button>
            </div>
          )}

          <input
            id="file-input"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          {previewUrl && (
            <div className="image-preview">
              <img src={previewUrl} alt="Preview" />
            </div>
          )}

          <button
            className="btn-analyze"
            onClick={analyzeImage}
            disabled={isAnalyzing || (!imageUrl && !imageFile)}
          >
            {isAnalyzing ? '🔍 Analyzing...' : '🚀 Analyze Image'}
          </button>
        </div>

        {assessment && (
          <div className="assessment-results">
            <div className="overall-score">
              <div className={`score-circle ${getScoreColor(assessment.overall)}`}>
                <span className="score-value">{assessment.overall}</span>
                <span className="score-max">/100</span>
              </div>
              <div className="score-label">{getScoreLabel(assessment.overall)}</div>
            </div>

            <div className="metrics-grid">
              {Object.entries(assessment.metrics).map(([key, value]) => (
                <div key={key} className="metric-item">
                  <div className="metric-header">
                    <span className="metric-name">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                    <span className={`metric-score ${getScoreColor(value)}`}>{value}</span>
                  </div>
                  <div className="metric-bar">
                    <div
                      className={`metric-fill ${getScoreColor(value)}`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {assessment.issues.length > 0 && (
              <div className="assessment-section">
                <h4>⚠️ Issues Detected</h4>
                <ul className="issues-list">
                  {assessment.issues.map((issue, i) => (
                    <li key={i} className="issue-item">{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {assessment.recommendations.length > 0 && (
              <div className="assessment-section">
                <h4>💡 Recommendations</h4>
                <ul className="recommendations-list">
                  {assessment.recommendations.map((rec, i) => (
                    <li key={i} className="recommendation-item">{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="assessment-footer">
              <span className="assessment-time">
                Analyzed at {new Date(assessment.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
