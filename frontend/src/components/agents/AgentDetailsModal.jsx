/**
 * AgentDetailsModal - Detailed view of an individual agent
 * Shows comprehensive information, files, capabilities, and real-time status
 */

import React, { useState, useEffect, useCallback } from 'react';
import { agentApi } from '../../services/agentApi.js';
import './AgentDetailsModal.css';

const AgentDetailsModal = ({ agent, status, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [agentFiles, setAgentFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [filesError, setFilesError] = useState(null);

  /**
   * Load agent files
   */
  const loadAgentFiles = useCallback(async () => {
    if (!agent?.id) return;

    try {
      setLoadingFiles(true);
      setFilesError(null);
      
      const response = await agentApi.getAgentFiles(agent.id);
      setAgentFiles(response.data?.files || []);
    } catch (error) {
      console.error('Failed to load agent files:', error);
      setFilesError(error.message || 'Failed to load files');
    } finally {
      setLoadingFiles(false);
    }
  }, [agent?.id]);

  /**
   * Load files when tab changes to files
   */
  useEffect(() => {
    if (activeTab === 'files') {
      loadAgentFiles();
    }
  }, [activeTab, loadAgentFiles]);

  /**
   * Handle escape key press
   */
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  /**
   * Handle backdrop click
   */
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * Format date
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  /**
   * Get status info
   */
  const getStatusInfo = () => {
    if (!status) return { color: 'gray', icon: '⚪', label: 'Unknown' };

    switch (status.status) {
      case 'active':
        return { color: 'green', icon: '🟢', label: 'Active' };
      case 'inactive':
        return { color: 'gray', icon: '⚪', label: 'Inactive' };
      case 'error':
        return { color: 'red', icon: '🔴', label: 'Error' };
      default:
        return { color: 'gray', icon: '⚪', label: 'Unknown' };
    }
  };

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

  const statusInfo = getStatusInfo();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'files', label: 'Files', icon: '📁' },
    { id: 'status', label: 'Status', icon: '📊' },
    { id: 'config', label: 'Configuration', icon: '⚙️' }
  ];

  return (
    <div className="agent-details-modal-backdrop" onClick={handleBackdropClick}>
      <div className="agent-details-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-section">
            <div className="agent-icon">
              {getCategoryIcon(agent.category)}
            </div>
            <div className="agent-title-info">
              <h2 className="agent-title">{agent.name}</h2>
              <div className="agent-subtitle">
                <span className="agent-category">{agent.category}</span>
                <span className="agent-version">v{agent.version}</span>
                <div className={`agent-status ${statusInfo.color}`}>
                  <span className="status-icon">{statusInfo.icon}</span>
                  <span className="status-text">{statusInfo.label}</span>
                </div>
              </div>
            </div>
          </div>
          
          <button className="modal-close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="modal-content">
          {activeTab === 'overview' && (
            <div className="tab-content overview-tab">
              {/* Description */}
              <section className="content-section">
                <h3 className="section-title">Description</h3>
                <div className="section-content">
                  <p className="agent-description">{agent.description}</p>
                </div>
              </section>

              {/* Capabilities */}
              {agent.capabilities && agent.capabilities.length > 0 && (
                <section className="content-section">
                  <h3 className="section-title">Capabilities</h3>
                  <div className="section-content">
                    <div className="capabilities-grid">
                      {agent.capabilities.map((capability, index) => (
                        <div key={index} className="capability-item">
                          <span className="capability-icon">⚡</span>
                          <span className="capability-text">{capability}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Tags */}
              {agent.tags && agent.tags.length > 0 && (
                <section className="content-section">
                  <h3 className="section-title">Tags</h3>
                  <div className="section-content">
                    <div className="tags-container">
                      {agent.tags.map((tag, index) => (
                        <span key={index} className="tag">#{tag}</span>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Metadata */}
              <section className="content-section">
                <h3 className="section-title">Information</h3>
                <div className="section-content">
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Type</span>
                      <span className="info-value">{agent.type}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Created</span>
                      <span className="info-value">{formatDate(agent.createdAt)}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Updated</span>
                      <span className="info-value">{formatDate(agent.updatedAt)}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Size</span>
                      <span className="info-value">{formatFileSize(agent.size)}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Files</span>
                      <span className="info-value">{agent.metadata?.fileCount || 0}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Path</span>
                      <span className="info-value path">{agent.path}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Languages */}
              {agent.metadata?.languages && agent.metadata.languages.length > 0 && (
                <section className="content-section">
                  <h3 className="section-title">Languages</h3>
                  <div className="section-content">
                    <div className="languages-container">
                      {agent.metadata.languages.map((language, index) => (
                        <span key={index} className="language-tag">{language}</span>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === 'files' && (
            <div className="tab-content files-tab">
              <section className="content-section">
                <div className="section-header">
                  <h3 className="section-title">Files</h3>
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={loadAgentFiles}
                    disabled={loadingFiles}
                  >
                    {loadingFiles ? 'Loading...' : '🔄 Refresh'}
                  </button>
                </div>
                
                <div className="section-content">
                  {loadingFiles ? (
                    <div className="loading-state">
                      <div className="spinner"></div>
                      <span>Loading files...</span>
                    </div>
                  ) : filesError ? (
                    <div className="error-state">
                      <span className="error-icon">⚠️</span>
                      <span className="error-text">{filesError}</span>
                      <button className="btn btn-sm btn-primary" onClick={loadAgentFiles}>
                        Retry
                      </button>
                    </div>
                  ) : agentFiles.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon">📁</span>
                      <span className="empty-text">No files found</span>
                    </div>
                  ) : (
                    <div className="files-list">
                      {agentFiles.map((file, index) => (
                        <div key={index} className="file-item">
                          <div className="file-info">
                            <div className="file-icon">
                              {file.type === 'markdown' ? '📝' : 
                               file.type === 'javascript' ? '📜' : 
                               file.type === 'json' ? '📋' : '📄'}
                            </div>
                            <div className="file-details">
                              <span className="file-name">{file.name}</span>
                              <span className="file-meta">
                                {formatFileSize(file.size)} • {file.type}
                                {file.lastModified && (
                                  <span> • {formatDate(file.lastModified)}</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'status' && (
            <div className="tab-content status-tab">
              <section className="content-section">
                <h3 className="section-title">Current Status</h3>
                <div className="section-content">
                  {status ? (
                    <div className="status-details">
                      <div className="status-overview">
                        <div className={`status-indicator large ${statusInfo.color}`}>
                          <span className="status-icon">{statusInfo.icon}</span>
                          <span className="status-label">{statusInfo.label}</span>
                        </div>
                        
                        {status.lastSeen && (
                          <div className="status-time">
                            Last seen: {formatDate(status.lastSeen)}
                          </div>
                        )}
                      </div>

                      <div className="status-metrics">
                        {status.uptime > 0 && (
                          <div className="metric-item">
                            <span className="metric-label">Uptime</span>
                            <span className="metric-value">{Math.floor(status.uptime / 60)}m {status.uptime % 60}s</span>
                          </div>
                        )}
                        
                        {status.processId && (
                          <div className="metric-item">
                            <span className="metric-label">Process ID</span>
                            <span className="metric-value">{status.processId}</span>
                          </div>
                        )}
                        
                        {status.memoryUsage > 0 && (
                          <div className="metric-item">
                            <span className="metric-label">Memory Usage</span>
                            <span className="metric-value">{formatFileSize(status.memoryUsage)}</span>
                          </div>
                        )}
                        
                        {status.cpuUsage > 0 && (
                          <div className="metric-item">
                            <span className="metric-label">CPU Usage</span>
                            <span className="metric-value">{status.cpuUsage.toFixed(1)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="no-status">
                      <span className="no-status-icon">❓</span>
                      <span className="no-status-text">Status information not available</span>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="tab-content config-tab">
              <section className="content-section">
                <h3 className="section-title">Configuration</h3>
                <div className="section-content">
                  {agent.config && Object.keys(agent.config).length > 0 ? (
                    <div className="config-display">
                      <pre className="config-content">
                        {JSON.stringify(agent.config, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="no-config">
                      <span className="no-config-icon">⚙️</span>
                      <span className="no-config-text">No configuration file found</span>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <div className="footer-info">
            <span>Agent ID: {agent.id}</span>
          </div>
          <div className="footer-actions">
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentDetailsModal;