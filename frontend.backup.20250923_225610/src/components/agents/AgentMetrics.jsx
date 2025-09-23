/**
 * AgentMetrics - Dashboard showing agent statistics and metrics
 * Displays real-time metrics, status distribution, and system health
 */

import React, { useMemo } from 'react';
import './AgentMetrics.css';

const AgentMetrics = ({ 
  metrics, 
  activeCount = 0, 
  totalCount = 0, 
  lastUpdate 
}) => {
  /**
   * Calculate status distribution
   */
  const statusDistribution = useMemo(() => {
    if (!metrics) return { active: 0, inactive: 0, error: 0 };
    
    const total = metrics.total || totalCount;
    const active = metrics.active || activeCount;
    const inactive = metrics.inactive || (total - active);
    
    return {
      active,
      inactive,
      error: metrics.error || 0,
      total
    };
  }, [metrics, activeCount, totalCount]);

  /**
   * Calculate percentages for status
   */
  const statusPercentages = useMemo(() => {
    const { active, inactive, error, total } = statusDistribution;
    
    if (total === 0) return { active: 0, inactive: 0, error: 0 };
    
    return {
      active: Math.round((active / total) * 100),
      inactive: Math.round((inactive / total) * 100),
      error: Math.round((error / total) * 100)
    };
  }, [statusDistribution]);

  /**
   * Get health status
   */
  const healthStatus = useMemo(() => {
    const { active, total, error } = statusDistribution;
    
    if (total === 0) return { status: 'unknown', color: 'gray', icon: '❓' };
    
    const activeRatio = active / total;
    const errorRatio = error / total;
    
    if (errorRatio > 0.1) return { status: 'critical', color: 'red', icon: '🔴' };
    if (activeRatio < 0.3) return { status: 'warning', color: 'yellow', icon: '🟡' };
    if (activeRatio > 0.7) return { status: 'healthy', color: 'green', icon: '🟢' };
    
    return { status: 'fair', color: 'blue', icon: '🔵' };
  }, [statusDistribution]);

  /**
   * Format last update time
   */
  const formatLastUpdate = (date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    
    return date.toLocaleDateString();
  };

  /**
   * Get category stats
   */
  const categoryStats = useMemo(() => {
    if (!metrics?.categories) return [];
    
    return Object.entries(metrics.categories)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [metrics?.categories]);

  if (!metrics && totalCount === 0) {
    return (
      <div className="agent-metrics">
        <div className="metrics-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span>Loading metrics...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-metrics">
      <div className="metrics-header">
        <h2 className="metrics-title">Agent Dashboard</h2>
        <div className="metrics-update-info">
          <span className="update-time">
            Updated: {formatLastUpdate(lastUpdate || metrics?.lastUpdate)}
          </span>
          <div className={`health-indicator ${healthStatus.color}`}>
            <span className="health-icon">{healthStatus.icon}</span>
            <span className="health-text">{healthStatus.status}</span>
          </div>
        </div>
      </div>

      <div className="metrics-grid">
        {/* Overview Cards */}
        <div className="metric-card overview-card">
          <div className="card-header">
            <h3 className="card-title">Overview</h3>
            <div className="card-icon">📊</div>
          </div>
          <div className="card-content">
            <div className="overview-stats">
              <div className="stat-item primary">
                <div className="stat-value">{statusDistribution.total}</div>
                <div className="stat-label">Total Agents</div>
              </div>
              <div className="stat-item success">
                <div className="stat-value">{statusDistribution.active}</div>
                <div className="stat-label">Active</div>
                <div className="stat-percentage">{statusPercentages.active}%</div>
              </div>
              <div className="stat-item muted">
                <div className="stat-value">{statusDistribution.inactive}</div>
                <div className="stat-label">Inactive</div>
                <div className="stat-percentage">{statusPercentages.inactive}%</div>
              </div>
              {statusDistribution.error > 0 && (
                <div className="stat-item error">
                  <div className="stat-value">{statusDistribution.error}</div>
                  <div className="stat-label">Error</div>
                  <div className="stat-percentage">{statusPercentages.error}%</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="metric-card status-card">
          <div className="card-header">
            <h3 className="card-title">Status Distribution</h3>
            <div className="card-icon">⚡</div>
          </div>
          <div className="card-content">
            <div className="status-chart">
              <div className="status-bar">
                {statusPercentages.active > 0 && (
                  <div 
                    className="status-segment active"
                    style={{ width: `${statusPercentages.active}%` }}
                    title={`Active: ${statusDistribution.active} (${statusPercentages.active}%)`}
                  ></div>
                )}
                {statusPercentages.inactive > 0 && (
                  <div 
                    className="status-segment inactive"
                    style={{ width: `${statusPercentages.inactive}%` }}
                    title={`Inactive: ${statusDistribution.inactive} (${statusPercentages.inactive}%)`}
                  ></div>
                )}
                {statusPercentages.error > 0 && (
                  <div 
                    className="status-segment error"
                    style={{ width: `${statusPercentages.error}%` }}
                    title={`Error: ${statusDistribution.error} (${statusPercentages.error}%)`}
                  ></div>
                )}
              </div>
              <div className="status-legend">
                <div className="legend-item">
                  <span className="legend-color active"></span>
                  <span className="legend-label">Active ({statusDistribution.active})</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color inactive"></span>
                  <span className="legend-label">Inactive ({statusDistribution.inactive})</span>
                </div>
                {statusDistribution.error > 0 && (
                  <div className="legend-item">
                    <span className="legend-color error"></span>
                    <span className="legend-label">Error ({statusDistribution.error})</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        {categoryStats.length > 0 && (
          <div className="metric-card categories-card">
            <div className="card-header">
              <h3 className="card-title">Categories</h3>
              <div className="card-icon">📂</div>
            </div>
            <div className="card-content">
              <div className="categories-list">
                {categoryStats.slice(0, 6).map(category => (
                  <div key={category.name} className="category-item">
                    <div className="category-info">
                      <span className="category-name">{category.name}</span>
                      <span className="category-count">{category.count}</span>
                    </div>
                    <div className="category-bar">
                      <div 
                        className="category-fill"
                        style={{ 
                          width: `${Math.min((category.count / statusDistribution.total) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
                {categoryStats.length > 6 && (
                  <div className="categories-more">
                    +{categoryStats.length - 6} more categories
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* System Health */}
        <div className="metric-card health-card">
          <div className="card-header">
            <h3 className="card-title">System Health</h3>
            <div className={`card-icon ${healthStatus.color}`}>{healthStatus.icon}</div>
          </div>
          <div className="card-content">
            <div className="health-summary">
              <div className={`health-status ${healthStatus.color}`}>
                <div className="health-value">{healthStatus.status.toUpperCase()}</div>
                <div className="health-description">
                  {healthStatus.status === 'healthy' && 'All systems operational'}
                  {healthStatus.status === 'fair' && 'Some agents inactive'}
                  {healthStatus.status === 'warning' && 'Low agent activity'}
                  {healthStatus.status === 'critical' && 'Multiple agent errors'}
                  {healthStatus.status === 'unknown' && 'Status unknown'}
                </div>
              </div>
            </div>
            
            <div className="health-metrics">
              <div className="health-metric">
                <span className="metric-label">Availability</span>
                <span className="metric-value">
                  {statusDistribution.total > 0 
                    ? Math.round(((statusDistribution.active + statusDistribution.inactive) / statusDistribution.total) * 100)
                    : 0
                  }%
                </span>
              </div>
              <div className="health-metric">
                <span className="metric-label">Active Rate</span>
                <span className="metric-value">{statusPercentages.active}%</span>
              </div>
              {statusDistribution.error > 0 && (
                <div className="health-metric error">
                  <span className="metric-label">Error Rate</span>
                  <span className="metric-value">{statusPercentages.error}%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="metric-card actions-card">
          <div className="card-header">
            <h3 className="card-title">Quick Actions</h3>
            <div className="card-icon">⚡</div>
          </div>
          <div className="card-content">
            <div className="quick-actions">
              <button className="action-btn primary">
                <span className="btn-icon">🔄</span>
                <span className="btn-text">Refresh All</span>
              </button>
              <button className="action-btn secondary">
                <span className="btn-icon">📊</span>
                <span className="btn-text">View Details</span>
              </button>
              <button className="action-btn secondary">
                <span className="btn-icon">⚙️</span>
                <span className="btn-text">Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentMetrics;