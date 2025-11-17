/**
 * QualityInsights Component - VisionPulse Quality Trends
 * Displays image quality assessment trends and insights
 */

interface QualityScore {
  timestamp: number;
  score: number;
  category: 'composition' | 'color' | 'clarity' | 'creativity';
  imageId?: string;
}

interface QualityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  count: number;
  description: string;
}

interface QualityInsightsProps {
  scores: QualityScore[];
  issues: QualityIssue[];
}

export function QualityInsights({ scores, issues }: QualityInsightsProps) {
  // Calculate average scores by category
  const categoryAverages = scores.reduce((acc, score) => {
    if (!acc[score.category]) {
      acc[score.category] = { total: 0, count: 0 };
    }
    acc[score.category].total += score.score;
    acc[score.category].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  const averages = Object.entries(categoryAverages).map(([category, data]) => ({
    category,
    average: data.total / data.count
  }));

  // Overall average
  const overallAverage = scores.length > 0
    ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length
    : 0;

  // Get color for score
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  // Get issue severity color
  const getSeverityColor = (severity: QualityIssue['severity']): string => {
    const colorMap = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444'
    };
    return colorMap[severity];
  };

  return (
    <div className="quality-insights-container">
      {/* Header */}
      <div className="insights-header">
        <h3>Quality Insights</h3>
        <div className="overall-score">
          <span className="score-label">Overall:</span>
          <span
            className="score-value"
            style={{ color: getScoreColor(overallAverage) }}
          >
            {overallAverage.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Category Scores */}
      <div className="category-scores">
        {averages.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🎨</span>
            <p>No quality data available</p>
            <small>Quality assessments will appear here</small>
          </div>
        ) : (
          averages.map(({ category, average }) => (
            <div key={category} className="category-item">
              <div className="category-info">
                <span className="category-name">{category}</span>
                <span
                  className="category-score"
                  style={{ color: getScoreColor(average) }}
                >
                  {average.toFixed(1)}
                </span>
              </div>
              <div className="category-bar">
                <div
                  className="category-fill"
                  style={{
                    width: `${average}%`,
                    backgroundColor: getScoreColor(average)
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Issues */}
      {issues.length > 0 && (
        <div className="quality-issues">
          <h4>Common Issues</h4>
          <div className="issues-list">
            {issues.map((issue, index) => (
              <div key={index} className="issue-item">
                <div className="issue-header">
                  <span
                    className="severity-badge"
                    style={{ backgroundColor: getSeverityColor(issue.severity) }}
                  >
                    {issue.severity}
                  </span>
                  <span className="issue-type">{issue.type}</span>
                  <span className="issue-count">×{issue.count}</span>
                </div>
                <p className="issue-description">{issue.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Trends */}
      <div className="quality-trends">
        <h4>Recent Assessments</h4>
        <div className="trends-graph">
          {scores.slice(-10).map((score, index) => (
            <div
              key={index}
              className="trend-bar"
              style={{
                height: `${score.score}%`,
                backgroundColor: getScoreColor(score.score)
              }}
              title={`${score.category}: ${score.score.toFixed(1)}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
