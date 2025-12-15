/**
 * AgentCard - Individual agent card component
 * Displays agent information, status, and key metrics
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './AgentCard.css';

const AgentCard = ({ agent, status, onClick, viewMode = 'grid' }) => {
  const navigate = useNavigate();
  /**
   * Format file size for display
   */
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  /**
   * Get status display information
   */
  const statusInfo = useMemo(() => {
    const defaultStatus = {
      status: 'inactive',
      color: 'gray',
      icon: '⚪',
      label: 'Inactive'
    };

    if (!status) return defaultStatus;

    switch (status.status) {
      case 'active':
        return {
          ...status,
          color: 'green',
          icon: '🟢',
          label: 'Active'
        };
      case 'inactive':
        return {
          ...status,
          color: 'gray',
          icon: '⚪',
          label: 'Inactive'
        };
      case 'error':
        return {
          ...status,
          color: 'red',
          icon: '🔴',
          label: 'Error'
        };
      default:
        return defaultStatus;
    }
  }, [status]);

  /**
   * Get category icon
   */
  const getCategoryIcon = (category) => {
    const icons = {
      'Communication': '💬',
      'Creativity': '🎨',
      'Productivity': '⚡',
      'Task Management': '📋',
      'Monitoring': '📊',
      'System': '⚙️',
      'Maintenance': '🔧',
      'Social': '👥',
      'General': '🤖'
    };
    return icons[category] || '🤖';
  };

  /**
   * Get capability badges
   */
  const capabilityBadges = useMemo(() => {
    if (!agent.capabilities || agent.capabilities.length === 0) return [];
    return agent.capabilities.slice(0, 3); // Show max 3 capabilities
  }, [agent.capabilities]);

  /**
   * Handle card click
   */
  const handleClick = () => {
    if (onClick) {
      onClick(agent);
    }
  };

  /**
   * Navigate to agent home page
   */
  const handleNavigateToHome = (e) => {
    e.stopPropagation();
    navigate(`/agents/${agent.slug}/home`);
  };

  /**
   * Navigate to agent detail page
   */
  const handleNavigateToDetails = (e) => {
    e.stopPropagation();
    navigate(`/agents/${agent.slug}`);
  };

  const cardClassName = `agent-card ${viewMode} ${statusInfo.status} ${agent.isActive ? 'active' : 'inactive'}`;

  if (viewMode === 'list') {
    return (
      <div className={cardClassName} onClick={handleClick}>
        <div className="agent-card-status">
          <span className={`status-indicator ${statusInfo.color}`}>
            {statusInfo.icon}
          </span>
        </div>

        <div className="agent-card-info">
          <div className="agent-card-header">
            <h3 className="agent-name">{agent.name}</h3>
            <span className="agent-category">
              {getCategoryIcon(agent.category)} {agent.category}
            </span>
          </div>
          <p className="agent-description">{agent.description}</p>
        </div>

        <div className="agent-card-meta">
          <div className="agent-meta-item">
            <span className="meta-label">Files:</span>
            <span className="meta-value">{agent.metadata?.fileCount || 0}</span>
          </div>
          <div className="agent-meta-item">
            <span className="meta-label">Size:</span>
            <span className="meta-value">{formatFileSize(agent.size)}</span>
          </div>
          <div className="agent-meta-item">
            <span className="meta-label">Updated:</span>
            <span className="meta-value">{formatDate(agent.updatedAt)}</span>
          </div>
        </div>

        <div className="agent-card-actions">
          <div className="agent-card-actions-list">
            <button 
              className="btn btn-sm btn-primary"
              onClick={handleNavigateToHome}
              title="Go to Agent Home"
            >
              Home
            </button>
            <button 
              className="btn btn-sm btn-outline"
              onClick={handleNavigateToDetails}
              title="View Detailed Information"
            >
              Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cardClassName} onClick={handleClick}>
      {/* Status Indicator */}
      <div className="agent-card-status">
        <span className={`status-indicator ${statusInfo.color}`} title={statusInfo.label}>
          {statusInfo.icon}
        </span>
        {status?.uptime > 0 && (
          <span className="uptime-badge" title={`Uptime: ${status.uptime}s`}>
            {Math.floor(status.uptime / 60)}m
          </span>
        )}
      </div>

      {/* Main Content */}
      <div className="agent-card-content">
        {/* Header */}
        <div className="agent-card-header">
          <h3 className="agent-name" title={agent.name}>
            {agent.name}
          </h3>
          <span className="agent-version">v{agent.version}</span>
        </div>

        {/* Category */}
        <div className="agent-category">
          <span className="category-icon">{getCategoryIcon(agent.category)}</span>
          <span className="category-name">{agent.category}</span>
        </div>

        {/* Description */}
        <p className="agent-description" title={agent.description}>
          {agent.description}
        </p>

        {/* Capabilities */}
        {capabilityBadges.length > 0 && (
          <div className="agent-capabilities">
            {capabilityBadges.map((capability, index) => (
              <span key={index} className="capability-badge">
                {capability}
              </span>
            ))}
            {agent.capabilities && agent.capabilities.length > 3 && (
              <span className="capability-badge more">
                +{agent.capabilities.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Tags */}
        {agent.tags && agent.tags.length > 0 && (
          <div className="agent-tags">
            {agent.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="tag">
                #{tag}
              </span>
            ))}
            {agent.tags.length > 3 && (
              <span className="tag more">+{agent.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="agent-card-footer">
        <div className="agent-metadata">
          <div className="meta-item">
            <span className="meta-icon">📁</span>
            <span className="meta-text">{agent.metadata?.fileCount || 0} files</span>
          </div>
          <div className="meta-item">
            <span className="meta-icon">💾</span>
            <span className="meta-text">{formatFileSize(agent.size)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-icon">🕒</span>
            <span className="meta-text">{formatDate(agent.updatedAt)}</span>
          </div>
        </div>

        {/* Languages */}
        {agent.metadata?.languages && agent.metadata.languages.length > 0 && (
          <div className="agent-languages">
            {agent.metadata.languages.slice(0, 3).map((language, index) => (
              <span key={index} className="language-tag">
                {language}
              </span>
            ))}
            {agent.metadata.languages.length > 3 && (
              <span className="language-tag more">...</span>
            )}
          </div>
        )}
      </div>

      {/* Hover Actions */}
      <div className="agent-card-actions">
        <div className="flex gap-2">
          <button 
            className="action-btn" 
            onClick={handleNavigateToHome}
            title="Go to Agent Home"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" fill="currentColor"/>
            </svg>
          </button>
          <button 
            className="action-btn" 
            onClick={handleNavigateToDetails}
            title="View Details"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Active Indicator */}
      {agent.isActive && (
        <div className="active-pulse" title="Agent is currently active"></div>
      )}
    </div>
  );
};

export default AgentCard;