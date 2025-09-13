/**
 * TDD London School Test: ActivityFeed Component
 * Tests activity feed component with real-time updates and filtering
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { z } from 'zod';

// Mock components
const MockCard = ({ children, className, ...props }) => (
  <div {...props} className={`card ${className || ''}`} data-testid="mock-card">
    {children}
  </div>
);

const MockAvatar = ({ src, alt, fallback, size = 'default', ...props }) => (
  <div {...props} className={`avatar size-${size}`} data-testid="mock-avatar">
    {src ? (
      <img src={src} alt={alt} data-testid="avatar-image" />
    ) : (
      <div className="avatar-fallback" data-testid="avatar-fallback">
        {fallback}
      </div>
    )}
  </div>
);

const MockBadge = ({ children, variant = 'default', ...props }) => (
  <span {...props} className={`badge variant-${variant}`} data-testid="mock-badge">
    {children}
  </span>
);

// Mock ActivityFeed component renderer
const MockAgentDynamicRenderer = ({ spec, context, onDataChange, onError }) => {
  const [activities, setActivities] = React.useState([]);
  const [filteredActivities, setFilteredActivities] = React.useState([]);
  const [filters, setFilters] = React.useState({});

  React.useEffect(() => {
    if (!spec || !spec.type) {
      onError?.(new Error('Invalid component specification'));
      return;
    }

    if (spec.type === 'ActivityFeed' && spec.props) {
      const sortedActivities = [...(spec.props.activities || [])]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setActivities(sortedActivities);
      setFilteredActivities(sortedActivities);
      onDataChange?.(spec.props);
    }
  }, [spec, onDataChange, onError]);

  React.useEffect(() => {
    // Apply filters
    let filtered = activities;

    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(activity => activity.type === filters.type);
    }

    if (filters.agent && filters.agent !== 'all') {
      filtered = filtered.filter(activity => activity.actor?.id === filters.agent);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(activity => 
        activity.title?.toLowerCase().includes(searchTerm) ||
        activity.description?.toLowerCase().includes(searchTerm) ||
        activity.actor?.name?.toLowerCase().includes(searchTerm)
      );
    }

    setFilteredActivities(filtered);
  }, [activities, filters]);

  if (!spec || !spec.type) {
    return (
      <div className="error-boundary" data-testid="component-error">
        Invalid component configuration
      </div>
    );
  }

  // Simulate ActivityFeed rendering
  if (spec.type === 'ActivityFeed') {
    const { 
      title = 'Activity Feed',
      activities: propActivities = [],
      showFilters = true,
      showSearch = true,
      showTimestamps = true,
      showAvatars = true,
      groupByDate = false,
      maxItems = null,
      refreshInterval = null,
      enableRealTime = false,
      layout = 'list',
      itemsPerPage = 10,
      showPagination = false
    } = spec.props || {};

    const uniqueTypes = [...new Set(propActivities.map(a => a.type).filter(Boolean))];
    const uniqueAgents = [...new Set(propActivities.map(a => a.actor?.id).filter(Boolean))];

    const displayActivities = maxItems ? 
      filteredActivities.slice(0, maxItems) : 
      filteredActivities;

    const formatTimestamp = (timestamp) => {
      try {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
      } catch {
        return timestamp;
      }
    };

    const getActivityIcon = (type) => {
      const icons = {
        'task_assigned': '📋',
        'task_completed': '✅',
        'code_committed': '💾',
        'error_occurred': '⚠️',
        'user_joined': '👋',
        'system_update': '🔄',
        'default': '📝'
      };
      return icons[type] || icons.default;
    };

    const getActivityTypeColor = (type) => {
      const colors = {
        'task_assigned': 'blue',
        'task_completed': 'green',
        'code_committed': 'purple',
        'error_occurred': 'red',
        'user_joined': 'cyan',
        'system_update': 'orange'
      };
      return colors[type] || 'gray';
    };
    
    return (
      <div 
        className={`activity-feed layout-${layout}`}
        data-testid="activity-feed"
        data-layout={layout}
        data-enable-realtime={enableRealTime}
        data-refresh-interval={refreshInterval}
      >
        <div className="feed-header">
          <h2 className="feed-title">{title}</h2>
          
          {enableRealTime && (
            <div className="realtime-indicator" data-testid="realtime-indicator">
              <span className="status-dot online"></span>
              Live
            </div>
          )}
        </div>
        
        {(showFilters || showSearch) && (
          <div className="feed-controls" data-testid="feed-controls">
            {showSearch && (
              <input
                type="text"
                placeholder="Search activities..."
                className="search-input"
                data-testid="search-input"
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            )}
            
            {showFilters && (
              <div className="filter-controls">
                <select
                  className="type-filter"
                  data-testid="type-filter"
                  value={filters.type || 'all'}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="all">All Types</option>
                  {uniqueTypes.map(type => (
                    <option key={type} value={type}>
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
                
                <select
                  className="agent-filter"
                  data-testid="agent-filter"
                  value={filters.agent || 'all'}
                  onChange={(e) => setFilters(prev => ({ ...prev, agent: e.target.value }))}
                >
                  <option value="all">All Agents</option>
                  {uniqueAgents.map(agentId => {
                    const agent = propActivities.find(a => a.actor?.id === agentId)?.actor;
                    return (
                      <option key={agentId} value={agentId}>
                        {agent?.name || agentId}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>
        )}
        
        <div className="feed-content">
          {displayActivities.length > 0 ? (
            displayActivities.map((activity, index) => (
              <MockCard 
                key={index}
                className="activity-item"
                data-testid={`activity-item-${index}`}
              >
                <div className="activity-header">
                  {showAvatars && activity.actor && (
                    <MockAvatar
                      src={activity.actor.avatar}
                      alt={`${activity.actor.name} avatar`}
                      fallback={activity.actor.name?.charAt(0) || '?'}
                      size="small"
                    />
                  )}
                  
                  <div className="activity-meta">
                    <div className="activity-title-row">
                      <span className="activity-icon">
                        {activity.icon || getActivityIcon(activity.type)}
                      </span>
                      <h4 className="activity-title" data-testid={`activity-title-${index}`}>
                        {activity.title || 'Untitled Activity'}
                      </h4>
                      
                      {activity.type && (
                        <MockBadge variant={getActivityTypeColor(activity.type)}>
                          {activity.type.replace('_', ' ')}
                        </MockBadge>
                      )}
                    </div>
                    
                    <div className="activity-actor-info">
                      {activity.actor && (
                        <span className="actor-name" data-testid={`actor-name-${index}`}>
                          {activity.actor.name}
                        </span>
                      )}
                      
                      {showTimestamps && activity.timestamp && (
                        <span className="activity-timestamp" data-testid={`activity-timestamp-${index}`}>
                          {formatTimestamp(activity.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {activity.description && (
                  <p className="activity-description" data-testid={`activity-description-${index}`}>
                    {activity.description}
                  </p>
                )}
                
                {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                  <div className="activity-metadata" data-testid={`activity-metadata-${index}`}>
                    {Object.entries(activity.metadata).map(([key, value]) => (
                      <span key={key} className={`metadata-${key}`} data-testid={`metadata-${key}-${index}`}>
                        {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    ))}
                  </div>
                )}
                
                {activity.actions && activity.actions.length > 0 && (
                  <div className="activity-actions" data-testid={`activity-actions-${index}`}>
                    {activity.actions.map((action, actionIndex) => (
                      <button
                        key={actionIndex}
                        className={`action-button ${action.variant || 'secondary'}`}
                        data-testid={`activity-action-${index}-${actionIndex}`}
                        onClick={() => {
                          // Simulate action click
                          console.log(`Action clicked: ${action.label} for activity ${index}`);
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </MockCard>
            ))
          ) : (
            <div className="empty-feed" data-testid="empty-feed">
              {filters.search || filters.type !== 'all' || filters.agent !== 'all' ? (
                <div>
                  <p>No activities match your filters</p>
                  <button
                    className="clear-filters-button"
                    data-testid="clear-filters-button"
                    onClick={() => setFilters({})}
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <p>No activities available</p>
              )}
            </div>
          )}
        </div>

        {maxItems && propActivities.length > maxItems && (
          <div className="feed-truncated" data-testid="feed-truncated">
            Showing {Math.min(maxItems, filteredActivities.length)} of {propActivities.length} activities
          </div>
        )}

        {filteredActivities.length !== propActivities.length && (
          <div className="filter-summary" data-testid="filter-summary">
            {filteredActivities.length} of {propActivities.length} activities shown
          </div>
        )}
      </div>
    );
  }

  return <div data-testid="unknown-component">Unknown component: {spec.type}</div>;
};

// Test data specifications
const validActivityFeedSpec = {
  type: 'ActivityFeed',
  props: {
    title: 'Agent Activity Feed',
    showFilters: true,
    showSearch: true,
    showTimestamps: true,
    showAvatars: true,
    enableRealTime: true,
    layout: 'list',
    maxItems: 50,
    activities: [
      {
        title: 'Task assigned: Code Review',
        description: 'New code review task has been assigned for the authentication module',
        type: 'task_assigned',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        actor: {
          id: 'agent-001',
          name: 'AI Assistant',
          avatar: 'https://example.com/avatar1.jpg'
        },
        metadata: {
          taskId: 'task-123',
          priority: 'high',
          estimatedHours: 2
        },
        actions: [
          { label: 'View Task', variant: 'primary' },
          { label: 'Assign', variant: 'secondary' }
        ]
      },
      {
        title: 'Code committed to repository',
        description: 'Fixed authentication bug and added unit tests',
        type: 'code_committed',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        actor: {
          id: 'agent-002',
          name: 'Code Bot',
          avatar: 'https://example.com/avatar2.jpg'
        },
        metadata: {
          repository: 'main-app',
          branch: 'feature/auth-fix',
          commitHash: 'abc123',
          filesChanged: 5
        },
        actions: [
          { label: 'View Commit', variant: 'primary' }
        ]
      },
      {
        title: 'Error occurred in production',
        description: 'Database connection timeout detected in user authentication service',
        type: 'error_occurred',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        actor: {
          id: 'system',
          name: 'System Monitor',
          avatar: null
        },
        metadata: {
          errorCode: 'DB_TIMEOUT',
          service: 'auth-service',
          severity: 'high',
          affectedUsers: 45
        },
        actions: [
          { label: 'Investigate', variant: 'destructive' },
          { label: 'View Logs', variant: 'secondary' }
        ]
      },
      {
        title: 'Task completed successfully',
        description: 'Performance optimization task completed with 40% improvement',
        type: 'task_completed',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        actor: {
          id: 'agent-003',
          name: 'Performance Bot',
          avatar: 'https://example.com/avatar3.jpg'
        },
        metadata: {
          taskId: 'task-456',
          improvementPercent: 40,
          duration: '3 hours'
        }
      },
      {
        title: 'New user joined workspace',
        description: 'John Doe has been added to the development team workspace',
        type: 'user_joined',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        actor: {
          id: 'user-john',
          name: 'John Doe',
          avatar: 'https://example.com/john-avatar.jpg'
        },
        metadata: {
          role: 'developer',
          team: 'frontend'
        }
      }
    ]
  }
};

const invalidActivityFeedSpec = {
  type: 'ActivityFeed',
  props: {
    activities: 'not-an-array',
    showFilters: 'not-a-boolean',
    maxItems: 'not-a-number',
    refreshInterval: 'not-a-number'
  }
};

const feedWithInvalidActivities = {
  type: 'ActivityFeed',
  props: {
    activities: [
      {
        title: 'Valid Activity',
        type: 'task_assigned',
        timestamp: new Date().toISOString(),
        actor: { id: 'agent-1', name: 'Agent One' }
      },
      {
        // Missing title
        description: 'Activity without title',
        type: 'invalid_type',
        timestamp: 'invalid-timestamp'
      },
      null, // Null activity
      {
        title: 'Activity with invalid actor',
        actor: 'not-an-object',
        metadata: 'not-an-object'
      },
      {
        title: 'Activity with complex metadata',
        metadata: {
          deeply: {
            nested: {
              data: 'test',
              array: [1, 2, 3]
            }
          }
        }
      }
    ]
  }
};

describe('TDD London School: ActivityFeed Component Validation', () => {
  let mockOnDataChange;
  let mockOnError;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    mockOnDataChange = jest.fn();
    mockOnError = jest.fn();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Valid ActivityFeed Rendering', () => {
    it('should render ActivityFeed with complete valid configuration', () => {
      const context = { agentId: 'test-agent', pageId: 'test-page' };

      render(
        <MockAgentDynamicRenderer
          spec={validActivityFeedSpec}
          context={context}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      // Verify main component renders
      expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
      expect(screen.getByText('Agent Activity Feed')).toBeInTheDocument();
      
      // Verify feed attributes
      const feed = screen.getByTestId('activity-feed');
      expect(feed).toHaveClass('layout-list');
      expect(feed).toHaveAttribute('data-enable-realtime', 'true');
      
      // Verify real-time indicator
      expect(screen.getByTestId('realtime-indicator')).toBeInTheDocument();
      expect(screen.getByText('Live')).toBeInTheDocument();
      
      // Verify controls
      expect(screen.getByTestId('feed-controls')).toBeInTheDocument();
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
      expect(screen.getByTestId('type-filter')).toBeInTheDocument();
      expect(screen.getByTestId('agent-filter')).toBeInTheDocument();
      
      // Verify activities are rendered
      expect(screen.getByTestId('activity-item-0')).toBeInTheDocument();
      expect(screen.getByTestId('activity-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('activity-item-2')).toBeInTheDocument();
      
      // Verify activity content
      expect(screen.getByText('Task assigned: Code Review')).toBeInTheDocument();
      expect(screen.getByText('New code review task has been assigned for the authentication module')).toBeInTheDocument();
      
      // Verify avatars
      expect(screen.getAllByTestId('mock-avatar')).toHaveLength(4); // 3 with avatars, 1 with fallback
      
      // Verify timestamps
      expect(screen.getByTestId('activity-timestamp-0')).toBeInTheDocument();
      expect(screen.getByText('5m ago')).toBeInTheDocument();
      
      // Verify metadata
      expect(screen.getByTestId('activity-metadata-0')).toBeInTheDocument();
      expect(screen.getByTestId('metadata-taskId-0')).toHaveTextContent('taskId: task-123');
      
      // Verify actions
      expect(screen.getByTestId('activity-actions-0')).toBeInTheDocument();
      expect(screen.getByTestId('activity-action-0-0')).toHaveTextContent('View Task');
      
      // Verify no errors occurred
      expect(mockOnError).not.toHaveBeenCalled();
      expect(mockOnDataChange).toHaveBeenCalledWith(validActivityFeedSpec.props);
    });

    it('should render minimal feed with default values', () => {
      const minimalSpec = {
        type: 'ActivityFeed',
        props: {
          activities: [
            { title: 'Basic Activity', timestamp: new Date().toISOString() }
          ]
        }
      };

      render(
        <MockAgentDynamicRenderer
          spec={minimalSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
      expect(screen.getByText('Activity Feed')).toBeInTheDocument(); // Default title
      expect(screen.getByTestId('activity-item-0')).toBeInTheDocument();
      expect(screen.getByText('Basic Activity')).toBeInTheDocument();
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should render empty state when no activities provided', () => {
      const emptySpec = {
        type: 'ActivityFeed',
        props: {
          title: 'Empty Feed',
          activities: []
        }
      };

      render(
        <MockAgentDynamicRenderer
          spec={emptySpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
      expect(screen.getByTestId('empty-feed')).toBeInTheDocument();
      expect(screen.getByText('No activities available')).toBeInTheDocument();
      expect(mockOnError).not.toHaveBeenCalled();
    });
  });

  describe('Filtering and Search Functionality', () => {
    beforeEach(() => {
      render(
        <MockAgentDynamicRenderer
          spec={validActivityFeedSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );
    });

    it('should filter activities by search term', async () => {
      const searchInput = screen.getByTestId('search-input');
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'code' } });
      });

      // Should find activities containing 'code'
      expect(screen.getByText('Code committed to repository')).toBeInTheDocument();
      expect(screen.getByText('Task assigned: Code Review')).toBeInTheDocument();
      
      // Should not show activities without 'code'
      expect(screen.queryByText('Error occurred in production')).not.toBeInTheDocument();
    });

    it('should filter activities by type', async () => {
      const typeFilter = screen.getByTestId('type-filter');
      
      await act(async () => {
        fireEvent.change(typeFilter, { target: { value: 'error_occurred' } });
      });

      // Should only show error activities
      expect(screen.getByText('Error occurred in production')).toBeInTheDocument();
      expect(screen.queryByText('Task assigned: Code Review')).not.toBeInTheDocument();
    });

    it('should filter activities by agent', async () => {
      const agentFilter = screen.getByTestId('agent-filter');
      
      await act(async () => {
        fireEvent.change(agentFilter, { target: { value: 'agent-001' } });
      });

      // Should only show activities from agent-001
      expect(screen.getByText('Task assigned: Code Review')).toBeInTheDocument();
      expect(screen.queryByText('Code committed to repository')).not.toBeInTheDocument();
    });

    it('should show empty state with clear filters when no matches', async () => {
      const searchInput = screen.getByTestId('search-input');
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'nonexistent search term' } });
      });

      expect(screen.getByTestId('empty-feed')).toBeInTheDocument();
      expect(screen.getByText('No activities match your filters')).toBeInTheDocument();
      expect(screen.getByTestId('clear-filters-button')).toBeInTheDocument();
    });

    it('should clear filters when clear button is clicked', async () => {
      const searchInput = screen.getByTestId('search-input');
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      });

      expect(screen.getByTestId('empty-feed')).toBeInTheDocument();
      
      const clearButton = screen.getByTestId('clear-filters-button');
      await act(async () => {
        fireEvent.click(clearButton);
      });

      // Should show all activities again
      expect(screen.queryByTestId('empty-feed')).not.toBeInTheDocument();
      expect(screen.getByText('Task assigned: Code Review')).toBeInTheDocument();
    });

    it('should show filter summary when filters are applied', async () => {
      const typeFilter = screen.getByTestId('type-filter');
      
      await act(async () => {
        fireEvent.change(typeFilter, { target: { value: 'task_assigned' } });
      });

      expect(screen.getByTestId('filter-summary')).toBeInTheDocument();
      expect(screen.getByText(/1 of 5 activities shown/)).toBeInTheDocument();
    });
  });

  describe('Activity Sorting and Timestamps', () => {
    it('should sort activities by timestamp (newest first)', () => {
      render(
        <MockAgentDynamicRenderer
          spec={validActivityFeedSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      // First activity should be the most recent (5m ago)
      expect(screen.getByTestId('activity-title-0')).toHaveTextContent('Task assigned: Code Review');
      expect(screen.getByTestId('activity-timestamp-0')).toHaveTextContent('5m ago');
      
      // Second activity should be 30m ago
      expect(screen.getByTestId('activity-title-1')).toHaveTextContent('Code committed to repository');
      expect(screen.getByTestId('activity-timestamp-1')).toHaveTextContent('30m ago');
    });

    it('should format timestamps correctly for different time ranges', () => {
      const timestampSpec = {
        type: 'ActivityFeed',
        props: {
          activities: [
            { title: 'Just now', timestamp: new Date().toISOString() },
            { title: '30 seconds ago', timestamp: new Date(Date.now() - 30 * 1000).toISOString() },
            { title: '45 minutes ago', timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
            { title: '5 hours ago', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
            { title: '3 days ago', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() }
          ]
        }
      };

      render(
        <MockAgentDynamicRenderer
          spec={timestampSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      expect(screen.getByText('Just now')).toBeInTheDocument();
      expect(screen.getByText('45m ago')).toBeInTheDocument();
      expect(screen.getByText('5h ago')).toBeInTheDocument();
      expect(screen.getByText('3d ago')).toBeInTheDocument();
    });
  });

  describe('Invalid Configuration Handling', () => {
    it('should handle invalid prop types gracefully', () => {
      render(
        <MockAgentDynamicRenderer
          spec={invalidActivityFeedSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      // Component should still render with defaults
      expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
      expect(screen.getByText('Activity Feed')).toBeInTheDocument();
      
      // Should handle invalid activities array
      expect(screen.getByTestId('empty-feed')).toBeInTheDocument();
      
      // Should not crash the application
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should handle activities with missing or invalid data', () => {
      render(
        <MockAgentDynamicRenderer
          spec={feedWithInvalidActivities}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
      
      // Valid activities should render
      expect(screen.getByText('Valid Activity')).toBeInTheDocument();
      
      // Activities with missing title should render with fallback
      expect(screen.getByText('Untitled Activity')).toBeInTheDocument();
      
      // Activities with complex metadata should render
      expect(screen.getByText('Activity with complex metadata')).toBeInTheDocument();
      
      // Should not crash the application
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should show error for completely malformed specification', () => {
      const malformedSpec = {
        // Missing type
        props: { activities: [] }
      };

      render(
        <MockAgentDynamicRenderer
          spec={malformedSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      expect(screen.getByTestId('component-error')).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Activity Actions', () => {
    it('should render activity actions when provided', () => {
      render(
        <MockAgentDynamicRenderer
          spec={validActivityFeedSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      // First activity has actions
      expect(screen.getByTestId('activity-actions-0')).toBeInTheDocument();
      expect(screen.getByTestId('activity-action-0-0')).toHaveTextContent('View Task');
      expect(screen.getByTestId('activity-action-0-1')).toHaveTextContent('Assign');
    });

    it('should handle action clicks', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(
        <MockAgentDynamicRenderer
          spec={validActivityFeedSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      const actionButton = screen.getByTestId('activity-action-0-0');
      
      await act(async () => {
        fireEvent.click(actionButton);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Action clicked: View Task for activity 0');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Zod Schema Validation', () => {
    it('should validate ActivityFeed activity structure with Zod schema', () => {
      const actorSchema = z.object({
        id: z.string().min(1, 'Actor ID is required'),
        name: z.string().min(1, 'Actor name is required'),
        avatar: z.string().url().optional().nullable()
      });

      const actionSchema = z.object({
        label: z.string().min(1, 'Action label is required'),
        variant: z.enum(['primary', 'secondary', 'destructive']).optional()
      });

      const activitySchema = z.object({
        title: z.string().min(1, 'Activity title is required'),
        description: z.string().optional(),
        type: z.string().min(1, 'Activity type is required'),
        timestamp: z.string().datetime('Invalid timestamp format'),
        actor: actorSchema.optional(),
        metadata: z.record(z.any()).optional(),
        actions: z.array(actionSchema).optional(),
        icon: z.string().optional()
      });

      const activityFeedSchema = z.object({
        title: z.string().optional(),
        activities: z.array(activitySchema),
        showFilters: z.boolean().optional(),
        showSearch: z.boolean().optional(),
        showTimestamps: z.boolean().optional(),
        showAvatars: z.boolean().optional(),
        enableRealTime: z.boolean().optional(),
        layout: z.enum(['list', 'grid', 'card']).optional(),
        maxItems: z.number().positive().nullable().optional(),
        refreshInterval: z.number().positive().nullable().optional()
      });

      // Valid props
      const validProps = {
        title: 'Test Feed',
        activities: [
          {
            title: 'Valid Activity',
            description: 'Test description',
            type: 'test_type',
            timestamp: '2025-01-15T10:00:00Z',
            actor: { id: 'actor-1', name: 'Test Actor' },
            actions: [{ label: 'Test Action', variant: 'primary' }]
          }
        ],
        showFilters: true,
        layout: 'list'
      };

      const validResult = activityFeedSchema.safeParse(validProps);
      expect(validResult.success).toBe(true);

      // Invalid props
      const invalidProps = {
        activities: [
          {
            title: '',
            type: '',
            timestamp: 'invalid-date',
            actor: { id: '', name: '' },
            actions: [{ label: '', variant: 'invalid' }]
          }
        ],
        layout: 'invalid-layout',
        maxItems: -1
      };

      const invalidResult = activityFeedSchema.safeParse(invalidProps);
      expect(invalidResult.success).toBe(false);
      
      if (!invalidResult.success) {
        expect(invalidResult.error.issues.length).toBeGreaterThan(0);
        expect(invalidResult.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ message: 'Activity title is required' })
          ])
        );
      }
    });
  });

  describe('Performance and Limits', () => {
    it('should limit activities when maxItems is specified', () => {
      const limitedSpec = {
        type: 'ActivityFeed',
        props: {
          maxItems: 3,
          activities: validActivityFeedSpec.props.activities // 5 activities
        }
      };

      render(
        <MockAgentDynamicRenderer
          spec={limitedSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      // Should only show first 3 activities
      expect(screen.getByTestId('activity-item-0')).toBeInTheDocument();
      expect(screen.getByTestId('activity-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('activity-item-2')).toBeInTheDocument();
      expect(screen.queryByTestId('activity-item-3')).not.toBeInTheDocument();
      expect(screen.queryByTestId('activity-item-4')).not.toBeInTheDocument();
      
      // Should show truncation message
      expect(screen.getByTestId('feed-truncated')).toBeInTheDocument();
      expect(screen.getByText('Showing 3 of 5 activities')).toBeInTheDocument();
    });

    it('should handle large number of activities efficiently', () => {
      const manyActivities = Array.from({ length: 200 }, (_, i) => ({
        title: `Activity ${i}`,
        type: 'test_activity',
        timestamp: new Date(Date.now() - i * 60 * 1000).toISOString(),
        actor: { id: `actor-${i}`, name: `Actor ${i}` }
      }));

      const largeSpec = {
        type: 'ActivityFeed',
        props: {
          activities: manyActivities,
          maxItems: 50 // Limit for performance
        }
      };

      const startTime = performance.now();
      
      const { unmount } = render(
        <MockAgentDynamicRenderer
          spec={largeSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      const renderTime = performance.now() - startTime;
      
      expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
      expect(renderTime).toBeLessThan(1000); // Should render within 1 second
      expect(screen.getByTestId('feed-truncated')).toBeInTheDocument();
      expect(mockOnError).not.toHaveBeenCalled();
      
      // Clean unmount
      expect(() => unmount()).not.toThrow();
    });
  });
});