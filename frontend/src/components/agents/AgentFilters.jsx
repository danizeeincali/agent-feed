/**
 * AgentFilters - Filter and sort controls for agents
 * Provides filtering by category, status, and sorting options
 */

import React, { useState, useEffect } from 'react';
import './AgentFilters.css';

const AgentFilters = ({ filters, categories, onFiltersChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  /**
   * Count active filters
   */
  useEffect(() => {
    const count = Object.values(filters).filter(value => 
      value && value !== '' && value !== 'all'
    ).length;
    setActiveFiltersCount(count);
  }, [filters]);

  /**
   * Handle filter change
   */
  const handleFilterChange = (key, value) => {
    onFiltersChange({
      [key]: value === 'all' ? '' : value
    });
  };

  /**
   * Clear all filters
   */
  const handleClearAll = () => {
    onFiltersChange({
      category: '',
      status: '',
      sortBy: 'name'
    });
  };

  /**
   * Toggle expanded view
   */
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const sortOptions = [
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'status', label: 'Status (Active First)' },
    { value: 'category', label: 'Category' },
    { value: 'updated', label: 'Recently Updated' },
    { value: 'created', label: 'Recently Created' },
    { value: 'size', label: 'Size (Largest First)' }
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'error', label: 'Error' }
  ];

  return (
    <div className={`agent-filters ${isExpanded ? 'expanded' : ''}`}>
      {/* Filter Toggle */}
      <div className="filters-header">
        <button
          className="filters-toggle"
          onClick={toggleExpanded}
          aria-expanded={isExpanded}
        >
          <span className="toggle-icon">
            <svg 
              viewBox="0 0 24 24" 
              width="16" 
              height="16"
              className={isExpanded ? 'rotated' : ''}
            >
              <path d="M7 10l5 5 5-5z" fill="currentColor" />
            </svg>
          </span>
          <span className="toggle-text">Filters</span>
          {activeFiltersCount > 0 && (
            <span className="active-filters-badge">{activeFiltersCount}</span>
          )}
        </button>

        {/* Quick Actions */}
        <div className="filters-quick-actions">
          {activeFiltersCount > 0 && (
            <button
              className="clear-filters-btn"
              onClick={handleClearAll}
              title="Clear all filters"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Filter Content */}
      <div className="filters-content">
        {/* Sort By */}
        <div className="filter-group">
          <label className="filter-label">Sort By</label>
          <select
            value={filters.sortBy || 'name'}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="filter-select"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="filter-group">
          <label className="filter-label">Status</label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div className="filter-group">
          <label className="filter-label">Category</label>
          <select
            value={filters.category || ''}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="filter-select"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.name} value={category.name}>
                {category.name} ({category.count})
              </option>
            ))}
          </select>
        </div>

        {/* Advanced Filters (when expanded) */}
        {isExpanded && (
          <div className="advanced-filters">
            {/* Status Chips */}
            <div className="filter-group">
              <label className="filter-label">Quick Status Filter</label>
              <div className="filter-chips">
                <button
                  className={`filter-chip ${filters.status === '' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('status', '')}
                >
                  All
                </button>
                <button
                  className={`filter-chip status-active ${filters.status === 'active' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('status', 'active')}
                >
                  🟢 Active
                </button>
                <button
                  className={`filter-chip status-inactive ${filters.status === 'inactive' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('status', 'inactive')}
                >
                  ⚪ Inactive
                </button>
                <button
                  className={`filter-chip status-error ${filters.status === 'error' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('status', 'error')}
                >
                  🔴 Error
                </button>
              </div>
            </div>

            {/* Category Chips */}
            {categories.length > 0 && (
              <div className="filter-group">
                <label className="filter-label">Quick Category Filter</label>
                <div className="filter-chips category-chips">
                  <button
                    className={`filter-chip ${filters.category === '' ? 'active' : ''}`}
                    onClick={() => handleFilterChange('category', '')}
                  >
                    All
                  </button>
                  {categories.slice(0, 6).map(category => (
                    <button
                      key={category.name}
                      className={`filter-chip ${filters.category === category.name ? 'active' : ''}`}
                      onClick={() => handleFilterChange('category', category.name)}
                      title={`${category.count} agents in ${category.name}`}
                    >
                      {category.name}
                      <span className="chip-count">({category.count})</span>
                    </button>
                  ))}
                  {categories.length > 6 && (
                    <span className="more-categories">
                      +{categories.length - 6} more in dropdown
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Sort Options */}
            <div className="filter-group">
              <label className="filter-label">Quick Sort</label>
              <div className="filter-chips sort-chips">
                {sortOptions.slice(0, 4).map(option => (
                  <button
                    key={option.value}
                    className={`filter-chip ${filters.sortBy === option.value ? 'active' : ''}`}
                    onClick={() => handleFilterChange('sortBy', option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Filters Summary */}
      {activeFiltersCount > 0 && (
        <div className="active-filters-summary">
          <div className="active-filters-list">
            {filters.category && (
              <span className="active-filter">
                Category: {filters.category}
                <button
                  className="remove-filter"
                  onClick={() => handleFilterChange('category', '')}
                  title="Remove category filter"
                >
                  ×
                </button>
              </span>
            )}
            {filters.status && (
              <span className="active-filter">
                Status: {filters.status}
                <button
                  className="remove-filter"
                  onClick={() => handleFilterChange('status', '')}
                  title="Remove status filter"
                >
                  ×
                </button>
              </span>
            )}
            {filters.sortBy && filters.sortBy !== 'name' && (
              <span className="active-filter">
                Sort: {sortOptions.find(opt => opt.value === filters.sortBy)?.label}
                <button
                  className="remove-filter"
                  onClick={() => handleFilterChange('sortBy', 'name')}
                  title="Reset to default sort"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentFilters;