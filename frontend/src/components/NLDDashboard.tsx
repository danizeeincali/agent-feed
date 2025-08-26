/**
 * NLD Dashboard Component
 * Provides real-time insights and analytics for UI pattern capture system
 */

import React, { useState, useEffect } from 'react';
import { nldCapture, UIPattern, UIFailurePattern, NLDRecommendation } from '../utils/nld-ui-capture';
import { neuralEngine, PredictionResult } from '../utils/nld-neural-patterns';
import { nldDatabase, AnalyticsReport } from '../utils/nld-database';

interface NLDDashboardProps {
  isVisible: boolean;
  onClose: () => void;
}

const NLDDashboard: React.FC<NLDDashboardProps> = ({ isVisible, onClose }) => {
  const [activeTab, setActiveTab] = useState<'patterns' | 'failures' | 'recommendations' | 'analytics'>('patterns');
  const [patterns, setPatterns] = useState<UIPattern[]>([]);
  const [failurePatterns, setFailurePatterns] = useState<UIFailurePattern[]>([]);
  const [recommendations, setRecommendations] = useState<NLDRecommendation[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsReport | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      loadDashboardData();
    }
  }, [isVisible]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Get recent patterns
      const recentPatterns = await nldDatabase.getPatterns(50);
      setPatterns(recentPatterns);

      // Get failure patterns
      const failures = await nldDatabase.getFailurePatterns();
      setFailurePatterns(failures);

      // Generate recommendations
      const recs = nldCapture.generateRecommendations();
      setRecommendations(recs);

      // Generate analytics report
      const report = await nldDatabase.generateAnalyticsReport();
      setAnalytics(report);

      // Generate failure prediction
      if (recentPatterns.length > 10) {
        const pred = neuralEngine.predictFailure(recentPatterns.slice(-10));
        setPrediction(pred);
      }
    } catch (error) {
      console.error('Failed to load NLD dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const exportedData = nldCapture.exportPatterns();
      const blob = new Blob([JSON.stringify(exportedData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nld-patterns-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export NLD data:', error);
    }
  };

  const clearData = async () => {
    if (confirm('Are you sure you want to clear all NLD data? This cannot be undone.')) {
      nldCapture.clearPatterns();
      await nldDatabase.clearAllData();
      await loadDashboardData();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="nld-dashboard-overlay">
      <div className="nld-dashboard">
        <div className="nld-header">
          <h2>🧠 Neural Learning Database Dashboard</h2>
          <div className="nld-header-actions">
            <button onClick={loadDashboardData} className="btn-refresh" disabled={isLoading}>
              {isLoading ? '🔄' : '↻'} Refresh
            </button>
            <button onClick={exportData} className="btn-export">
              📥 Export
            </button>
            <button onClick={clearData} className="btn-clear">
              🗑️ Clear
            </button>
            <button onClick={onClose} className="btn-close">
              ✕
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="nld-loading">
            <div className="loading-spinner"></div>
            <p>Loading NLD analytics...</p>
          </div>
        )}

        <div className="nld-tabs">
          <button 
            className={`tab ${activeTab === 'patterns' ? 'active' : ''}`}
            onClick={() => setActiveTab('patterns')}
          >
            📊 Patterns ({patterns.length})
          </button>
          <button 
            className={`tab ${activeTab === 'failures' ? 'active' : ''}`}
            onClick={() => setActiveTab('failures')}
          >
            ⚠️ Failures ({failurePatterns.length})
          </button>
          <button 
            className={`tab ${activeTab === 'recommendations' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommendations')}
          >
            💡 Recommendations ({recommendations.length})
          </button>
          <button 
            className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📈 Analytics
          </button>
        </div>

        <div className="nld-content">
          {activeTab === 'patterns' && (
            <div className="patterns-tab">
              <div className="patterns-summary">
                <div className="summary-card">
                  <h3>Success Rate</h3>
                  <div className="metric">
                    {patterns.length > 0 
                      ? Math.round((patterns.filter(p => p.outcome === 'success').length / patterns.length) * 100)
                      : 0}%
                  </div>
                </div>
                <div className="summary-card">
                  <h3>Average Duration</h3>
                  <div className="metric">
                    {patterns.length > 0
                      ? Math.round(patterns.reduce((sum, p) => sum + (p.performanceMetrics?.duration || 0), 0) / patterns.length)
                      : 0}ms
                  </div>
                </div>
                <div className="summary-card">
                  <h3>Most Active Component</h3>
                  <div className="metric">
                    {patterns.length > 0
                      ? (() => {
                          const counts = patterns.reduce((acc, p) => {
                            acc[p.context.component] = (acc[p.context.component] || 0) + 1;
                            return acc;
                          }, {} as any);
                          const sortedEntries = Object.entries(counts).sort(([,a], [,b]) => (b as number) - (a as number));
                          return sortedEntries[0]?.[0] || 'N/A';
                        })()
                      : 'N/A'
                    }
                  </div>
                </div>
              </div>

              <div className="patterns-list">
                <h3>Recent Patterns</h3>
                <div className="patterns-table">
                  {patterns.slice(0, 20).map((pattern, index) => (
                    <div key={pattern.id} className={`pattern-row ${pattern.outcome}`}>
                      <div className="pattern-time">
                        {pattern.timestamp.toLocaleTimeString()}
                      </div>
                      <div className="pattern-component">
                        {pattern.context.component}
                      </div>
                      <div className="pattern-action">
                        {pattern.action}
                      </div>
                      <div className="pattern-outcome">
                        <span className={`outcome-badge ${pattern.outcome}`}>
                          {pattern.outcome}
                        </span>
                      </div>
                      <div className="pattern-duration">
                        {pattern.performanceMetrics?.duration ? `${Math.round(pattern.performanceMetrics.duration)}ms` : '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'failures' && (
            <div className="failures-tab">
              {prediction && (
                <div className="prediction-card">
                  <h3>🔮 Failure Prediction</h3>
                  <div className={`prediction-result ${prediction.prediction}`}>
                    <div className="prediction-outcome">
                      Prediction: <strong>{prediction.prediction}</strong>
                    </div>
                    <div className="prediction-confidence">
                      Confidence: <strong>{Math.round(prediction.confidence * 100)}%</strong>
                    </div>
                  </div>
                  <div className="prediction-factors">
                    <h4>Key Factors:</h4>
                    {prediction.factors.slice(0, 3).map((factor, index) => (
                      <div key={index} className="factor-item">
                        <span className="factor-name">{factor.factor}</span>
                        <span className="factor-weight">{Math.round(factor.weight * 100)}%</span>
                      </div>
                    ))}
                  </div>
                  {prediction.recommendations.length > 0 && (
                    <div className="prediction-recommendations">
                      <h4>Recommendations:</h4>
                      <ul>
                        {prediction.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="failure-patterns-list">
                <h3>Failure Patterns</h3>
                {failurePatterns.length === 0 ? (
                  <p className="no-data">No failure patterns detected yet.</p>
                ) : (
                  <div className="failure-patterns-grid">
                    {failurePatterns.map((failure) => (
                      <div key={failure.patternId} className="failure-card">
                        <div className="failure-header">
                          <h4>{failure.patternId}</h4>
                          <span className={`failure-type ${failure.failureType}`}>
                            {failure.failureType}
                          </span>
                        </div>
                        <div className="failure-stats">
                          <div className="stat">
                            <label>Frequency:</label>
                            <span className="frequency">{failure.frequency}</span>
                          </div>
                          <div className="stat">
                            <label>Last Occurred:</label>
                            <span>{failure.lastOccurrence.toLocaleString()}</span>
                          </div>
                          <div className="stat">
                            <label>Status:</label>
                            <span className={failure.resolved ? 'resolved' : 'unresolved'}>
                              {failure.resolved ? '✅ Resolved' : '🔴 Active'}
                            </span>
                          </div>
                        </div>
                        {failure.preventionStrategy && (
                          <div className="prevention-strategy">
                            <label>Prevention:</label>
                            <p>{failure.preventionStrategy}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="recommendations-tab">
              <h3>💡 System Recommendations</h3>
              {recommendations.length === 0 ? (
                <p className="no-data">No recommendations available. Keep using the system to generate insights!</p>
              ) : (
                <div className="recommendations-list">
                  {recommendations.map((rec, index) => (
                    <div key={index} className={`recommendation-card ${rec.priority}`}>
                      <div className="rec-header">
                        <span className={`rec-type ${rec.type}`}>{rec.type}</span>
                        <span className={`rec-priority ${rec.priority}`}>
                          {rec.priority.toUpperCase()}
                        </span>
                      </div>
                      <div className="rec-message">{rec.message}</div>
                      <div className="rec-action">{rec.action}</div>
                      <div className="rec-confidence">
                        Confidence: {Math.round(rec.confidence * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="analytics-tab">
              {analytics ? (
                <>
                  <div className="analytics-summary">
                    <div className="summary-grid">
                      <div className="analytics-card">
                        <h4>Total Patterns</h4>
                        <div className="analytics-value">{analytics.summary.totalPatterns}</div>
                      </div>
                      <div className="analytics-card">
                        <h4>Success Rate</h4>
                        <div className="analytics-value">
                          {Math.round(analytics.summary.successRate * 100)}%
                        </div>
                      </div>
                      <div className="analytics-card">
                        <h4>Avg Session</h4>
                        <div className="analytics-value">
                          {Math.round(analytics.summary.averageSessionLength / 1000 / 60)}min
                        </div>
                      </div>
                      <div className="analytics-card">
                        <h4>Avg Response</h4>
                        <div className="analytics-value">
                          {Math.round(analytics.summary.performanceMetrics.avgDuration)}ms
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="analytics-trends">
                    <div className="trends-section">
                      <h4>Component Usage</h4>
                      <div className="component-usage">
                        {analytics.trends.componentUsage.slice(0, 5).map((comp, index) => (
                          <div key={index} className="usage-item">
                            <span className="component-name">{comp.component}</span>
                            <div className="usage-bars">
                              <div className="usage-bar">
                                <div 
                                  className="usage-fill"
                                  style={{ width: `${(comp.usage / analytics.trends.componentUsage[0].usage) * 100}%` }}
                                />
                              </div>
                              <span className="usage-count">{comp.usage}</span>
                            </div>
                            <span className={`error-rate ${comp.errorRate > 0.1 ? 'high' : 'low'}`}>
                              {Math.round(comp.errorRate * 100)}% errors
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="trends-section">
                      <h4>User Behavior Insights</h4>
                      <div className="behavior-insights">
                        {analytics.trends.userBehaviorInsights.length === 0 ? (
                          <p>No insights available yet.</p>
                        ) : (
                          analytics.trends.userBehaviorInsights.map((insight, index) => (
                            <div key={index} className="insight-item">
                              💡 {insight}
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="trends-section">
                      <h4>Risk Areas & Optimizations</h4>
                      <div className="risk-optimizations">
                        {analytics.predictions.riskAreas.length > 0 && (
                          <div className="risk-areas">
                            <h5>⚠️ Risk Areas:</h5>
                            <ul>
                              {analytics.predictions.riskAreas.map((risk, index) => (
                                <li key={index}>{risk}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {analytics.predictions.recommendedOptimizations.length > 0 && (
                          <div className="optimizations">
                            <h5>🚀 Recommended Optimizations:</h5>
                            <ul>
                              {analytics.predictions.recommendedOptimizations.map((opt, index) => (
                                <li key={index}>{opt}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="no-data">Loading analytics...</p>
              )}
            </div>
          )}
        </div>

        <style>{`
          .nld-dashboard-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            z-index: 9999;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .nld-dashboard {
            background: #1a1a1a;
            color: #ffffff;
            border-radius: 12px;
            width: 95vw;
            height: 90vh;
            max-width: 1400px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
          }

          .nld-header {
            background: #2d2d2d;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #444;
          }

          .nld-header h2 {
            margin: 0;
            color: #4CAF50;
            font-size: 24px;
          }

          .nld-header-actions {
            display: flex;
            gap: 10px;
          }

          .nld-header-actions button {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
          }

          .btn-refresh {
            background: #2196F3;
            color: white;
          }

          .btn-export {
            background: #FF9800;
            color: white;
          }

          .btn-clear {
            background: #f44336;
            color: white;
          }

          .btn-close {
            background: #666;
            color: white;
          }

          .nld-header-actions button:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }

          .nld-header-actions button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .nld-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 200px;
            color: #999;
          }

          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #333;
            border-top: 3px solid #4CAF50;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 15px;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .nld-tabs {
            display: flex;
            background: #2d2d2d;
            border-bottom: 1px solid #444;
          }

          .tab {
            padding: 15px 20px;
            background: none;
            border: none;
            color: #999;
            cursor: pointer;
            transition: all 0.2s;
            border-bottom: 3px solid transparent;
          }

          .tab.active {
            color: #4CAF50;
            border-bottom-color: #4CAF50;
          }

          .tab:hover {
            color: #fff;
            background: #333;
          }

          .nld-content {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
          }

          .patterns-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }

          .summary-card,
          .analytics-card {
            background: #2d2d2d;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
          }

          .summary-card h3,
          .analytics-card h4 {
            margin: 0 0 10px 0;
            color: #999;
            font-size: 14px;
            text-transform: uppercase;
          }

          .metric,
          .analytics-value {
            font-size: 32px;
            font-weight: bold;
            color: #4CAF50;
          }

          .patterns-table {
            background: #2d2d2d;
            border-radius: 8px;
            overflow: hidden;
          }

          .pattern-row {
            display: grid;
            grid-template-columns: 80px 150px 1fr 100px 80px;
            gap: 15px;
            padding: 12px 15px;
            border-bottom: 1px solid #444;
            align-items: center;
          }

          .pattern-row:last-child {
            border-bottom: none;
          }

          .pattern-row.success {
            border-left: 3px solid #4CAF50;
          }

          .pattern-row.failure {
            border-left: 3px solid #f44336;
          }

          .pattern-row.timeout {
            border-left: 3px solid #FF9800;
          }

          .outcome-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            text-transform: uppercase;
            font-weight: bold;
          }

          .outcome-badge.success {
            background: #4CAF50;
            color: white;
          }

          .outcome-badge.failure {
            background: #f44336;
            color: white;
          }

          .outcome-badge.timeout {
            background: #FF9800;
            color: white;
          }

          .prediction-card {
            background: #2d2d2d;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #2196F3;
          }

          .prediction-result {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
          }

          .prediction-result.failure {
            color: #f44336;
          }

          .prediction-result.timeout {
            color: #FF9800;
          }

          .prediction-result.success {
            color: #4CAF50;
          }

          .prediction-factors {
            margin-bottom: 15px;
          }

          .factor-item {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #444;
          }

          .failure-patterns-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
          }

          .failure-card {
            background: #2d2d2d;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #f44336;
          }

          .failure-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
          }

          .failure-type {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            text-transform: uppercase;
            font-weight: bold;
            background: #666;
            color: white;
          }

          .failure-type.websocket {
            background: #9C27B0;
          }

          .failure-type.api {
            background: #FF5722;
          }

          .failure-type.performance {
            background: #FF9800;
          }

          .failure-type.ui {
            background: #2196F3;
          }

          .failure-stats {
            margin-bottom: 15px;
          }

          .stat {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }

          .stat label {
            color: #999;
            font-size: 14px;
          }

          .frequency {
            background: #f44336;
            color: white;
            padding: 2px 6px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
          }

          .resolved {
            color: #4CAF50;
          }

          .unresolved {
            color: #f44336;
          }

          .recommendations-list {
            display: flex;
            flex-direction: column;
            gap: 15px;
          }

          .recommendation-card {
            background: #2d2d2d;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #666;
          }

          .recommendation-card.high {
            border-left-color: #f44336;
          }

          .recommendation-card.medium {
            border-left-color: #FF9800;
          }

          .recommendation-card.low {
            border-left-color: #4CAF50;
          }

          .recommendation-card.critical {
            border-left-color: #9C27B0;
          }

          .rec-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
          }

          .rec-type,
          .rec-priority {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
          }

          .rec-type.optimization {
            background: #4CAF50;
            color: white;
          }

          .rec-type.prevention {
            background: #f44336;
            color: white;
          }

          .rec-type.enhancement {
            background: #2196F3;
            color: white;
          }

          .rec-priority.high {
            background: #f44336;
            color: white;
          }

          .rec-priority.medium {
            background: #FF9800;
            color: white;
          }

          .rec-priority.low {
            background: #4CAF50;
            color: white;
          }

          .rec-priority.critical {
            background: #9C27B0;
            color: white;
          }

          .rec-message {
            margin-bottom: 10px;
            color: #fff;
          }

          .rec-action {
            color: #999;
            font-style: italic;
            margin-bottom: 10px;
          }

          .rec-confidence {
            color: #4CAF50;
            font-size: 12px;
          }

          .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }

          .trends-section {
            background: #2d2d2d;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
          }

          .trends-section h4 {
            margin-top: 0;
            color: #4CAF50;
            border-bottom: 1px solid #444;
            padding-bottom: 10px;
          }

          .usage-item {
            display: grid;
            grid-template-columns: 150px 1fr 100px;
            gap: 15px;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #444;
          }

          .usage-bars {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .usage-bar {
            flex: 1;
            height: 8px;
            background: #444;
            border-radius: 4px;
            overflow: hidden;
          }

          .usage-fill {
            height: 100%;
            background: #4CAF50;
            transition: width 0.3s ease;
          }

          .error-rate.high {
            color: #f44336;
          }

          .error-rate.low {
            color: #4CAF50;
          }

          .insight-item {
            padding: 10px;
            background: #333;
            border-radius: 6px;
            margin-bottom: 10px;
            border-left: 3px solid #4CAF50;
          }

          .risk-optimizations {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }

          .risk-areas,
          .optimizations {
            background: #333;
            padding: 15px;
            border-radius: 6px;
          }

          .risk-areas h5 {
            color: #f44336;
            margin-top: 0;
          }

          .optimizations h5 {
            color: #4CAF50;
            margin-top: 0;
          }

          .no-data {
            text-align: center;
            color: #666;
            font-style: italic;
            padding: 40px;
          }
        `}</style>
      </div>
    </div>
  );
};

export default NLDDashboard;