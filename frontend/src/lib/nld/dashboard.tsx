/**
 * NLD Dashboard Component
 * Provides monitoring interface for NLD system
 */

import React, { useState, useEffect } from 'react';
import { nldIntegration } from './integration';
import { nldDatabase } from './database';
import { preventionEngine } from './prevention-engine';

interface DashboardProps {
  className?: string;
  compact?: boolean;
}

export const NLDDashboard: React.FC<DashboardProps> = ({ 
  className = '', 
  compact = false 
}) => {
  const [status, setStatus] = useState<any>(null);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const updateStatus = () => {
      const currentStatus = nldIntegration.getStatus();
      setStatus(currentStatus);
      
      if (currentStatus.enabled) {
        setPatterns(nldDatabase.getRecentPatterns(24));
        setRecommendations(preventionEngine.getRecommendations());
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 30000); // Update every 30 seconds

    // Listen for real-time pattern updates
    const handlePatternDetected = (event: CustomEvent) => {
      setPatterns(prev => [event.detail, ...prev.slice(0, 19)]); // Keep last 20
    };

    window.addEventListener('nld:pattern-detected', handlePatternDetected);

    return () => {
      clearInterval(interval);
      window.removeEventListener('nld:pattern-detected', handlePatternDetected);
    };
  }, []);

  if (!status) {
    return <div className={`nld-dashboard loading ${className}`}>Loading NLD status...</div>;
  }

  if (!status.enabled) {
    return (
      <div className={`nld-dashboard disabled ${className}`}>
        <div className="nld-header">
          <h3>Neural Learning Detection</h3>
          <span className="status-badge disabled">Disabled</span>
        </div>
        <p>NLD system is currently disabled.</p>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b', 
      high: '#ef4444',
      critical: '#dc2626'
    };
    return colors[severity] || '#6b7280';
  };

  const getPatternIcon = (type: string) => {
    const icons = {
      connection_loop: '🔄',
      race_condition: '⚡',
      timeout_cascade: '⏰',
      state_violation: '⚠️',
      user_confusion: '🤔'
    };
    return icons[type] || '📊';
  };

  if (compact && !isExpanded) {
    return (
      <div className={`nld-dashboard compact ${className}`}>
        <div className="nld-compact-view" onClick={() => setIsExpanded(true)}>
          <span className="nld-compact-icon">🧠</span>
          <span className="nld-compact-status">
            NLD: {status.recentPatterns} patterns
          </span>
          <span className="nld-compact-indicator">
            {status.recentPatterns > 0 && '🔴'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`nld-dashboard expanded ${className}`}>
      <div className="nld-header">
        <div className="nld-title">
          <h3>Neural Learning Detection</h3>
          {compact && (
            <button 
              className="nld-minimize"
              onClick={() => setIsExpanded(false)}
            >
              −
            </button>
          )}
        </div>
        <div className="nld-status">
          <span className={`status-badge ${status.connectionState}`}>
            {status.connectionState}
          </span>
          {status.autoFixEnabled && (
            <span className="auto-fix-badge">Auto-Fix On</span>
          )}
        </div>
      </div>

      <div className="nld-tabs">
        {['overview', 'patterns', 'recommendations', 'metrics'].map(tab => (
          <button
            key={tab}
            className={`nld-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="nld-content">
        {activeTab === 'overview' && (
          <div className="nld-overview">
            <div className="nld-stats-grid">
              <div className="nld-stat">
                <div className="nld-stat-value">{status.totalPatterns}</div>
                <div className="nld-stat-label">Total Patterns</div>
              </div>
              <div className="nld-stat">
                <div className="nld-stat-value">{status.recentPatterns}</div>
                <div className="nld-stat-label">Recent (24h)</div>
              </div>
              <div className="nld-stat">
                <div className="nld-stat-value">
                  {Math.round(status.statistics?.averageConfidence * 100 || 0)}%
                </div>
                <div className="nld-stat-label">Avg Confidence</div>
              </div>
            </div>
            
            {status.statistics?.patternsByType && (
              <div className="nld-pattern-types">
                <h4>Pattern Distribution</h4>
                {Object.entries(status.statistics.patternsByType).map(([type, count]) => (
                  <div key={type} className="nld-pattern-type-row">
                    <span className="pattern-icon">{getPatternIcon(type)}</span>
                    <span className="pattern-name">{type.replace('_', ' ')}</span>
                    <span className="pattern-count">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'patterns' && (
          <div className="nld-patterns">
            <h4>Recent Patterns ({patterns.length})</h4>
            {patterns.length === 0 ? (
              <div className="nld-empty">No patterns detected recently.</div>
            ) : (
              <div className="nld-pattern-list">
                {patterns.slice(0, 10).map(pattern => (
                  <div key={pattern.id} className="nld-pattern-item">
                    <div className="pattern-header">
                      <span className="pattern-icon">{getPatternIcon(pattern.type)}</span>
                      <span className="pattern-type">{pattern.type}</span>
                      <span 
                        className="pattern-severity"
                        style={{ color: getSeverityColor(pattern.severity) }}
                      >
                        {pattern.severity}
                      </span>
                      <span className="pattern-confidence">
                        {Math.round(pattern.confidence * 100)}%
                      </span>
                    </div>
                    <div className="pattern-description">{pattern.description}</div>
                    <div className="pattern-time">
                      {new Date(pattern.detectedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="nld-recommendations">
            <h4>Preventive Recommendations</h4>
            {recommendations.length === 0 ? (
              <div className="nld-empty">No recommendations available.</div>
            ) : (
              <div className="nld-recommendation-list">
                {recommendations.map((rec, index) => (
                  <div key={index} className="nld-recommendation-item">
                    <div className="rec-header">
                      <span 
                        className="rec-priority"
                        style={{ 
                          color: getSeverityColor(rec.priority),
                          fontWeight: 'bold' 
                        }}
                      >
                        {rec.priority.toUpperCase()}
                      </span>
                      <span className="rec-pattern">{rec.pattern}</span>
                    </div>
                    <div className="rec-description">{rec.recommendation}</div>
                    <div className="rec-impact">{rec.impact}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="nld-metrics">
            <h4>System Metrics</h4>
            {status.databaseMetrics && (
              <div className="nld-metrics-grid">
                <div className="metric-item">
                  <div className="metric-label">Database Size</div>
                  <div className="metric-value">{status.databaseMetrics.sizeInKB} KB</div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Pattern Count</div>
                  <div className="metric-value">{status.databaseMetrics.patternCount}</div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Record Count</div>
                  <div className="metric-value">{status.databaseMetrics.recordCount}</div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Memory Usage</div>
                  <div className="metric-value">
                    {Math.round(status.databaseMetrics.estimatedMemoryUsage / 1024)} KB
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="nld-actions">
        <button 
          className="nld-action-btn"
          onClick={() => nldIntegration.simulateFailureScenarios()}
        >
          Simulate Test Scenarios
        </button>
        <button 
          className="nld-action-btn"
          onClick={() => {
            const data = nldIntegration.exportTrainingData();
            console.log('Training data exported:', data);
            // Could trigger download or send to external system
          }}
        >
          Export Training Data
        </button>
      </div>
    </div>
  );
};

// Compact notification component for integration
export const NLDNotification: React.FC<{ pattern: any }> = ({ pattern }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className={`nld-notification ${pattern.severity}`}>
      <div className="notification-icon">{getPatternIcon(pattern.type)}</div>
      <div className="notification-content">
        <div className="notification-title">
          Pattern Detected: {pattern.type.replace('_', ' ')}
        </div>
        <div className="notification-description">
          {pattern.description}
        </div>
      </div>
      <button 
        className="notification-close"
        onClick={() => setVisible(false)}
      >
        ×
      </button>
    </div>
  );
};

// Styles (would normally be in a separate CSS file)
const dashboardStyles = `
.nld-dashboard {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.nld-dashboard.compact .nld-compact-view {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.nld-dashboard.expanded {
  min-width: 400px;
  max-width: 600px;
}

.nld-header {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nld-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nld-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: #f3f4f6;
  color: #374151;
}

.status-badge.connected { background: #dcfce7; color: #166534; }
.status-badge.connecting { background: #fef3c7; color: #92400e; }
.status-badge.disconnected { background: #fee2e2; color: #991b1b; }
.status-badge.disabled { background: #f3f4f6; color: #6b7280; }

.auto-fix-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  background: #dbeafe;
  color: #1e40af;
  margin-left: 8px;
}

.nld-tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
}

.nld-tab {
  padding: 12px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: #6b7280;
  border-bottom: 2px solid transparent;
}

.nld-tab.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.nld-content {
  padding: 16px;
}

.nld-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.nld-stat {
  text-align: center;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.nld-stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #1f2937;
}

.nld-stat-label {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}

.nld-pattern-list {
  max-height: 300px;
  overflow-y: auto;
}

.nld-pattern-item {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 8px;
}

.pattern-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.pattern-icon {
  font-size: 16px;
}

.pattern-type {
  font-weight: 500;
  text-transform: capitalize;
}

.pattern-severity {
  font-weight: 500;
  text-transform: uppercase;
  font-size: 12px;
}

.pattern-confidence {
  margin-left: auto;
  font-size: 12px;
  color: #6b7280;
}

.pattern-description {
  font-size: 14px;
  color: #374151;
  margin-bottom: 4px;
}

.pattern-time {
  font-size: 12px;
  color: #6b7280;
}

.nld-actions {
  padding: 16px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 8px;
}

.nld-action-btn {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 14px;
}

.nld-action-btn:hover {
  background: #f9fafb;
}

.nld-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 16px;
  border-radius: 8px;
  background: white;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 350px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  z-index: 1000;
}

.nld-notification.high {
  border-left: 4px solid #ef4444;
}

.nld-notification.critical {
  border-left: 4px solid #dc2626;
}

.notification-close {
  margin-left: auto;
  border: none;
  background: none;
  font-size: 18px;
  cursor: pointer;
  color: #6b7280;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = dashboardStyles;
  document.head.appendChild(styleSheet);
}