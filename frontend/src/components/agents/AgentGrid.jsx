/**
 * AgentGrid - Responsive grid display for agents
 * Displays agents in a masonry-style grid with real-time status updates
 */

import React, { useState, useMemo } from 'react';
import AgentCard from './AgentCard.jsx';
import AgentDetailsModal from './AgentDetailsModal.jsx';
import './AgentGrid.css';

const AgentGrid = ({ agents, statuses, loading }) => {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  /**
   * Sort agents based on selected criteria
   */
  const sortedAgents = useMemo(() => {
    if (!agents || agents.length === 0) return [];

    const sorted = [...agents].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        
        case 'status':
          const aStatus = statuses[a.id]?.status || 'inactive';
          const bStatus = statuses[b.id]?.status || 'inactive';
          // Active first, then alphabetical
          if (aStatus !== bStatus) {
            return aStatus === 'active' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        
        case 'category':
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }
          return a.name.localeCompare(b.name);
        
        case 'updated':
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        
        case 'created':
          return new Date(b.createdAt) - new Date(a.createdAt);
        
        case 'size':
          return (b.size || 0) - (a.size || 0);
        
        default:
          return 0;
      }
    });

    return sorted;
  }, [agents, statuses, sortBy]);

  /**
   * Group agents by category for better organization
   */
  const groupedAgents = useMemo(() => {
    if (viewMode !== 'grouped') return { all: sortedAgents };

    const groups = {};
    sortedAgents.forEach(agent => {
      const category = agent.category || 'Uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(agent);
    });

    return groups;
  }, [sortedAgents, viewMode]);

  /**
   * Handle agent card click
   */
  const handleAgentClick = (agent) => {
    setSelectedAgent(agent);
  };

  /**
   * Handle modal close
   */
  const handleCloseModal = () => {
    setSelectedAgent(null);
  };

  /**
   * Handle sort change
   */
  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
  };

  /**
   * Handle view mode change
   */
  const handleViewModeChange = (newViewMode) => {
    setViewMode(newViewMode);
  };

  /**
   * Get status statistics
   */
  const statusStats = useMemo(() => {
    const stats = { active: 0, inactive: 0, error: 0 };
    
    agents.forEach(agent => {
      const status = statuses[agent.id]?.status || 'inactive';
      stats[status] = (stats[status] || 0) + 1;
    });
    
    return stats;
  }, [agents, statuses]);

  if (!agents || agents.length === 0) {
    return (
      <div className="agent-grid-empty">
        <div className="empty-state">
          <div className="empty-icon">🤖</div>
          <h3>No Agents Found</h3>
          <p>No production agents are currently available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-grid-container">
      {/* Grid Controls */}
      <div className="agent-grid-controls">
        <div className="grid-stats">
          <span className="stat-item">
            <span className="stat-value">{agents.length}</span>
            <span className="stat-label">Total</span>
          </span>
          <span className="stat-item active">
            <span className="stat-value">{statusStats.active}</span>
            <span className="stat-label">Active</span>
          </span>
          <span className="stat-item inactive">
            <span className="stat-value">{statusStats.inactive}</span>
            <span className="stat-label">Inactive</span>
          </span>
          {statusStats.error > 0 && (
            <span className="stat-item error">
              <span className="stat-value">{statusStats.error}</span>
              <span className="stat-label">Error</span>
            </span>
          )}
        </div>

        <div className="grid-actions">
          {/* Sort Options */}
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="sort-select"
            disabled={loading}
          >
            <option value="name">Sort by Name</option>
            <option value="status">Sort by Status</option>
            <option value="category">Sort by Category</option>
            <option value="updated">Sort by Updated</option>
            <option value="created">Sort by Created</option>
            <option value="size">Sort by Size</option>
          </select>

          {/* View Mode Toggle */}
          <div className="view-mode-toggle">
            <button
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('grid')}
              title="Grid View"
            >
              <svg viewBox="0 0 24 24" width="16" height="16">
                <rect x="3" y="3" width="7" height="7" fill="currentColor" />
                <rect x="14" y="3" width="7" height="7" fill="currentColor" />
                <rect x="3" y="14" width="7" height="7" fill="currentColor" />
                <rect x="14" y="14" width="7" height="7" fill="currentColor" />
              </svg>
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('list')}
              title="List View"
            >
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" fill="currentColor" />
              </svg>
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'grouped' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('grouped')}
              title="Grouped View"
            >
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M3 3h6v6H3V3zm8 0h6v6h-6V3zM3 11h6v6H3v-6zm8 0h6v6h-6v-6z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className={`agent-grid ${viewMode}`} data-view-mode={viewMode}>
        {viewMode === 'grouped' ? (
          // Grouped view
          Object.entries(groupedAgents).map(([category, categoryAgents]) => (
            <div key={category} className="agent-category-group">
              <div className="category-header">
                <h3 className="category-title">{category}</h3>
                <span className="category-count">({categoryAgents.length})</span>
              </div>
              <div className="category-grid">
                {categoryAgents.map(agent => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    status={statuses[agent.id]}
                    onClick={() => handleAgentClick(agent)}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          // Regular grid or list view
          sortedAgents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              status={statuses[agent.id]}
              onClick={() => handleAgentClick(agent)}
              viewMode={viewMode}
            />
          ))
        )}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="agent-grid-loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span>Updating agents...</span>
          </div>
        </div>
      )}

      {/* Agent Details Modal */}
      {selectedAgent && (
        <AgentDetailsModal
          agent={selectedAgent}
          status={statuses[selectedAgent.id]}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default AgentGrid;