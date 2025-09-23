/**
 * TDD London School Test: Timeline Component
 * Tests timeline component rendering and event structure validation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { z } from 'zod';

// Mock Timeline component renderer
const MockAgentDynamicRenderer = ({ spec, context, onDataChange, onError }) => {
  React.useEffect(() => {
    if (!spec || !spec.type) {
      onError?.(new Error('Invalid component specification'));
      return;
    }

    if (spec.type === 'Timeline' && spec.props) {
      onDataChange?.(spec.props);
    }
  }, [spec, onDataChange, onError]);

  if (!spec || !spec.type) {
    return (
      <div className="error-boundary" data-testid="component-error">
        Invalid component configuration
      </div>
    );
  }

  // Simulate Timeline rendering
  if (spec.type === 'Timeline') {
    const { 
      events = [], 
      title = 'Timeline', 
      orientation = 'vertical',
      showDates = true,
      showIcons = true,
      groupByDate = false,
      allowFiltering = false,
      maxEvents = null
    } = spec.props || {};
    
    // Sort events by timestamp
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Group events by date if requested
    const groupedEvents = groupByDate ? 
      sortedEvents.reduce((groups, event) => {
        const date = new Date(event.timestamp).toDateString();
        if (!groups[date]) groups[date] = [];
        groups[date].push(event);
        return groups;
      }, {}) : 
      { all: sortedEvents };

    // Limit events if specified
    const displayEvents = maxEvents ? 
      sortedEvents.slice(0, maxEvents) : 
      sortedEvents;
    
    return (
      <div 
        className={`timeline orientation-${orientation}`} 
        data-testid="timeline"
        data-orientation={orientation}
        data-show-dates={showDates}
        data-show-icons={showIcons}
      >
        <h2 className="timeline-title">{title}</h2>
        
        {allowFiltering && (
          <div className="timeline-filters" data-testid="timeline-filters">
            <input 
              type="text" 
              placeholder="Filter events..."
              className="filter-input"
              data-testid="filter-input"
            />
          </div>
        )}
        
        <div className="timeline-container">
          {groupByDate ? (
            Object.entries(groupedEvents).map(([date, dateEvents]) => (
              <div key={date} className="timeline-date-group" data-testid={`date-group-${date}`}>
                <h3 className="date-header">{date}</h3>
                <div className="timeline-events">
                  {dateEvents.map((event, index) => (
                    <TimelineEvent 
                      key={`${date}-${index}`}
                      event={event}
                      index={index}
                      showDates={showDates}
                      showIcons={showIcons}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="timeline-events">
              {displayEvents.map((event, index) => (
                <TimelineEvent 
                  key={index}
                  event={event}
                  index={index}
                  showDates={showDates}
                  showIcons={showIcons}
                />
              ))}
            </div>
          )}
        </div>
        
        {displayEvents.length === 0 && (
          <div className="empty-timeline" data-testid="empty-timeline">
            No timeline events available
          </div>
        )}

        {maxEvents && events.length > maxEvents && (
          <div className="timeline-truncated" data-testid="timeline-truncated">
            Showing {maxEvents} of {events.length} events
          </div>
        )}
      </div>
    );
  }

  return <div data-testid="unknown-component">Unknown component: {spec.type}</div>;
};

// Timeline Event Component
const TimelineEvent = ({ event, index, showDates, showIcons }) => {
  const {
    title,
    description,
    timestamp,
    type = 'default',
    icon,
    status = 'completed',
    metadata = {}
  } = event || {};

  const formatTimestamp = (ts) => {
    try {
      const date = new Date(ts);
      return showDates ? date.toLocaleString() : date.toLocaleTimeString();
    } catch {
      return ts;
    }
  };

  return (
    <div 
      className={`timeline-event event-${type} status-${status}`} 
      data-testid={`timeline-event-${index}`}
    >
      {showIcons && (
        <div className="event-icon" data-testid={`event-icon-${index}`}>
          {icon || getDefaultIcon(type)}
        </div>
      )}
      
      <div className="event-content">
        <div className="event-header">
          <h4 className="event-title" data-testid={`event-title-${index}`}>
            {title || 'Untitled Event'}
          </h4>
          {showDates && timestamp && (
            <span className="event-timestamp" data-testid={`event-timestamp-${index}`}>
              {formatTimestamp(timestamp)}
            </span>
          )}
        </div>
        
        {description && (
          <p className="event-description" data-testid={`event-description-${index}`}>
            {description}
          </p>
        )}
        
        {Object.keys(metadata).length > 0 && (
          <div className="event-metadata" data-testid={`event-metadata-${index}`}>
            {Object.entries(metadata).map(([key, value]) => (
              <span key={key} className={`metadata-${key}`} data-testid={`metadata-${key}-${index}`}>
                {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const getDefaultIcon = (type) => {
  const icons = {
    default: '●',
    milestone: '◆', 
    warning: '⚠',
    error: '✕',
    success: '✓',
    info: 'ⓘ'
  };
  return icons[type] || icons.default;
};

// Test data specifications
const validTimelineSpec = {
  type: 'Timeline',
  props: {
    title: 'Agent Activity Timeline',
    orientation: 'vertical',
    showDates: true,
    showIcons: true,
    groupByDate: false,
    allowFiltering: true,
    events: [
      {
        title: 'Agent Initialization',
        description: 'Agent successfully started and configured',
        timestamp: '2025-01-15T10:00:00Z',
        type: 'milestone',
        status: 'completed',
        icon: '🚀',
        metadata: {
          agentId: 'agent-001',
          version: '1.0.0'
        }
      },
      {
        title: 'Task Assignment',
        description: 'New task assigned: Code Review',
        timestamp: '2025-01-15T10:30:00Z',
        type: 'info',
        status: 'in-progress',
        metadata: {
          taskId: 'task-123',
          priority: 'high'
        }
      },
      {
        title: 'Error Encountered',
        description: 'Network timeout during API call',
        timestamp: '2025-01-15T11:00:00Z',
        type: 'error',
        status: 'failed',
        icon: '⚠️',
        metadata: {
          errorCode: 'TIMEOUT',
          retryCount: 3
        }
      },
      {
        title: 'Task Completed',
        description: 'Code review task completed successfully',
        timestamp: '2025-01-15T11:30:00Z',
        type: 'success',
        status: 'completed',
        metadata: {
          duration: '30 minutes',
          filesReviewed: 12
        }
      }
    ]
  }
};

const invalidTimelineSpec = {
  type: 'Timeline',
  props: {
    events: 'not-an-array',
    orientation: 'invalid-orientation',
    showDates: 'not-a-boolean',
    maxEvents: 'not-a-number'
  }
};

const timelineWithInvalidEvents = {
  type: 'Timeline',
  props: {
    events: [
      {
        title: 'Valid Event',
        timestamp: '2025-01-15T10:00:00Z',
        type: 'info'
      },
      {
        // Missing required fields
        description: 'Event with missing title and timestamp'
      },
      null, // Null event
      {
        title: 'Invalid Timestamp',
        timestamp: 'not-a-valid-date',
        type: 'invalid-type'
      },
      {
        title: 'Valid Event 2',
        timestamp: '2025-01-15T11:00:00Z',
        metadata: {
          nested: {
            deeply: {
              nested: 'value'
            }
          }
        }
      }
    ]
  }
};

describe('TDD London School: Timeline Component Validation', () => {
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

  describe('Valid Timeline Rendering', () => {
    it('should render Timeline with complete valid configuration', () => {
      const context = { agentId: 'test-agent', pageId: 'test-page' };

      render(
        <MockAgentDynamicRenderer
          spec={validTimelineSpec}
          context={context}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      // Verify main component renders
      expect(screen.getByTestId('timeline')).toBeInTheDocument();
      expect(screen.getByText('Agent Activity Timeline')).toBeInTheDocument();
      
      // Verify timeline attributes
      const timeline = screen.getByTestId('timeline');
      expect(timeline).toHaveClass('orientation-vertical');
      expect(timeline).toHaveAttribute('data-show-dates', 'true');
      expect(timeline).toHaveAttribute('data-show-icons', 'true');
      
      // Verify filtering is available
      expect(screen.getByTestId('timeline-filters')).toBeInTheDocument();
      expect(screen.getByTestId('filter-input')).toBeInTheDocument();
      
      // Verify all events are rendered
      expect(screen.getByTestId('timeline-event-0')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-event-1')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-event-2')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-event-3')).toBeInTheDocument();
      
      // Verify event content
      expect(screen.getByText('Agent Initialization')).toBeInTheDocument();
      expect(screen.getByText('Agent successfully started and configured')).toBeInTheDocument();
      
      // Verify timestamps are shown
      expect(screen.getByTestId('event-timestamp-0')).toBeInTheDocument();
      
      // Verify icons are shown
      expect(screen.getByTestId('event-icon-0')).toBeInTheDocument();
      
      // Verify metadata is displayed
      expect(screen.getByTestId('event-metadata-0')).toBeInTheDocument();
      expect(screen.getByTestId('metadata-agentId-0')).toHaveTextContent('agentId: agent-001');
      
      // Verify no errors occurred
      expect(mockOnError).not.toHaveBeenCalled();
      expect(mockOnDataChange).toHaveBeenCalledWith(validTimelineSpec.props);
    });

    it('should render minimal timeline with default values', () => {
      const minimalSpec = {
        type: 'Timeline',
        props: {
          events: [
            { title: 'Basic Event', timestamp: '2025-01-15T10:00:00Z' }
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

      expect(screen.getByTestId('timeline')).toBeInTheDocument();
      expect(screen.getByText('Timeline')).toBeInTheDocument(); // Default title
      expect(screen.getByTestId('timeline-event-0')).toBeInTheDocument();
      expect(screen.getByText('Basic Event')).toBeInTheDocument();
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should render empty state when no events provided', () => {
      const emptySpec = {
        type: 'Timeline',
        props: {
          title: 'Empty Timeline',
          events: []
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

      expect(screen.getByTestId('timeline')).toBeInTheDocument();
      expect(screen.getByTestId('empty-timeline')).toBeInTheDocument();
      expect(screen.getByText('No timeline events available')).toBeInTheDocument();
      expect(mockOnError).not.toHaveBeenCalled();
    });
  });

  describe('Event Sorting and Grouping', () => {
    it('should sort events chronologically by timestamp', () => {
      const unsortedSpec = {
        type: 'Timeline',
        props: {
          events: [
            { title: 'Third Event', timestamp: '2025-01-15T12:00:00Z' },
            { title: 'First Event', timestamp: '2025-01-15T10:00:00Z' },
            { title: 'Second Event', timestamp: '2025-01-15T11:00:00Z' }
          ]
        }
      };

      render(
        <MockAgentDynamicRenderer
          spec={unsortedSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      // Events should be sorted chronologically
      const events = screen.getAllByTestId(/^timeline-event-\d+$/);
      expect(events).toHaveLength(3);
      
      // Verify sorting by checking event titles
      expect(screen.getByTestId('event-title-0')).toHaveTextContent('First Event');
      expect(screen.getByTestId('event-title-1')).toHaveTextContent('Second Event');
      expect(screen.getByTestId('event-title-2')).toHaveTextContent('Third Event');
    });

    it('should group events by date when groupByDate is enabled', () => {
      const groupedSpec = {
        type: 'Timeline',
        props: {
          groupByDate: true,
          events: [
            { title: 'Event 1', timestamp: '2025-01-15T10:00:00Z' },
            { title: 'Event 2', timestamp: '2025-01-15T11:00:00Z' },
            { title: 'Event 3', timestamp: '2025-01-16T10:00:00Z' }
          ]
        }
      };

      render(
        <MockAgentDynamicRenderer
          spec={groupedSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      // Should have date group headers
      expect(screen.getByText(/Tue Jan 15 2025|Wed Jan 15 2025/)).toBeInTheDocument();
      expect(screen.getByText(/Thu Jan 16 2025|Wed Jan 16 2025/)).toBeInTheDocument();
    });

    it('should limit events when maxEvents is specified', () => {
      const limitedSpec = {
        type: 'Timeline',
        props: {
          maxEvents: 2,
          events: [
            { title: 'Event 1', timestamp: '2025-01-15T10:00:00Z' },
            { title: 'Event 2', timestamp: '2025-01-15T11:00:00Z' },
            { title: 'Event 3', timestamp: '2025-01-15T12:00:00Z' },
            { title: 'Event 4', timestamp: '2025-01-15T13:00:00Z' }
          ]
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

      // Should only show first 2 events
      expect(screen.getByTestId('timeline-event-0')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-event-1')).toBeInTheDocument();
      expect(screen.queryByTestId('timeline-event-2')).not.toBeInTheDocument();
      
      // Should show truncation message
      expect(screen.getByTestId('timeline-truncated')).toBeInTheDocument();
      expect(screen.getByText('Showing 2 of 4 events')).toBeInTheDocument();
    });
  });

  describe('Invalid Configuration Handling', () => {
    it('should handle invalid prop types gracefully', () => {
      render(
        <MockAgentDynamicRenderer
          spec={invalidTimelineSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      // Component should still render with defaults
      expect(screen.getByTestId('timeline')).toBeInTheDocument();
      expect(screen.getByText('Timeline')).toBeInTheDocument();
      
      // Should handle invalid events array
      expect(screen.getByTestId('empty-timeline')).toBeInTheDocument();
      
      // Should not crash the application
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should handle events with missing or invalid data', () => {
      render(
        <MockAgentDynamicRenderer
          spec={timelineWithInvalidEvents}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      expect(screen.getByTestId('timeline')).toBeInTheDocument();
      
      // Valid events should render
      expect(screen.getByText('Valid Event')).toBeInTheDocument();
      expect(screen.getByText('Valid Event 2')).toBeInTheDocument();
      
      // Events with missing data should render with fallbacks
      expect(screen.getByText('Untitled Event')).toBeInTheDocument();
      
      // Should handle nested metadata
      expect(screen.getByTestId('metadata-nested-4')).toBeInTheDocument();
      
      // Should not crash the application
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should show error for completely malformed specification', () => {
      const malformedSpec = {
        // Missing type
        props: { events: [] }
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

  describe('Zod Schema Validation', () => {
    it('should validate Timeline event structure with Zod schema', () => {
      const timelineEventSchema = z.object({
        title: z.string().min(1, 'Event title is required'),
        description: z.string().optional(),
        timestamp: z.string().datetime('Invalid timestamp format'),
        type: z.enum(['default', 'milestone', 'warning', 'error', 'success', 'info']).optional(),
        status: z.enum(['completed', 'in-progress', 'failed', 'pending']).optional(),
        icon: z.string().optional(),
        metadata: z.record(z.any()).optional()
      });

      const timelineSchema = z.object({
        title: z.string().optional(),
        orientation: z.enum(['vertical', 'horizontal']).optional(),
        showDates: z.boolean().optional(),
        showIcons: z.boolean().optional(),
        groupByDate: z.boolean().optional(),
        allowFiltering: z.boolean().optional(),
        maxEvents: z.number().positive().nullable().optional(),
        events: z.array(timelineEventSchema)
      });

      // Valid props
      const validProps = {
        title: 'Test Timeline',
        events: [
          {
            title: 'Valid Event',
            description: 'Event description',
            timestamp: '2025-01-15T10:00:00Z',
            type: 'info',
            status: 'completed'
          }
        ],
        orientation: 'vertical',
        showDates: true
      };

      const validResult = timelineSchema.safeParse(validProps);
      expect(validResult.success).toBe(true);

      // Invalid props
      const invalidProps = {
        events: [
          {
            title: '',
            timestamp: 'invalid-date',
            type: 'invalid-type',
            status: 'invalid-status'
          }
        ],
        orientation: 'invalid',
        showDates: 'not-boolean',
        maxEvents: -1
      };

      const invalidResult = timelineSchema.safeParse(invalidProps);
      expect(invalidResult.success).toBe(false);
      
      if (!invalidResult.success) {
        expect(invalidResult.error.issues.length).toBeGreaterThan(0);
        expect(invalidResult.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ message: 'Event title is required' }),
            expect.objectContaining({ message: expect.stringContaining('Invalid') })
          ])
        );
      }
    });
  });

  describe('Orientation and Layout Variations', () => {
    it('should apply correct orientation classes', () => {
      const orientations = ['vertical', 'horizontal'];
      
      orientations.forEach(orientation => {
        const orientationSpec = {
          type: 'Timeline',
          props: {
            orientation,
            events: [{ title: 'Test', timestamp: '2025-01-15T10:00:00Z' }]
          }
        };

        const { unmount } = render(
          <MockAgentDynamicRenderer
            spec={orientationSpec}
            context={{ agentId: 'test', pageId: 'test' }}
            onDataChange={mockOnDataChange}
            onError={mockOnError}
          />
        );

        const timeline = screen.getByTestId('timeline');
        expect(timeline).toHaveClass(`orientation-${orientation}`);
        expect(timeline).toHaveAttribute('data-orientation', orientation);
        
        unmount();
      });
    });

    it('should conditionally show dates and icons based on props', () => {
      const configurations = [
        { showDates: true, showIcons: true },
        { showDates: false, showIcons: true },
        { showDates: true, showIcons: false },
        { showDates: false, showIcons: false }
      ];

      configurations.forEach(config => {
        const configSpec = {
          type: 'Timeline',
          props: {
            ...config,
            events: [{ title: 'Test Event', timestamp: '2025-01-15T10:00:00Z' }]
          }
        };

        const { unmount } = render(
          <MockAgentDynamicRenderer
            spec={configSpec}
            context={{ agentId: 'test', pageId: 'test' }}
            onDataChange={mockOnDataChange}
            onError={mockOnError}
          />
        );

        const timeline = screen.getByTestId('timeline');
        expect(timeline).toHaveAttribute('data-show-dates', String(config.showDates));
        expect(timeline).toHaveAttribute('data-show-icons', String(config.showIcons));

        if (config.showDates) {
          expect(screen.queryByTestId('event-timestamp-0')).toBeInTheDocument();
        } else {
          expect(screen.queryByTestId('event-timestamp-0')).not.toBeInTheDocument();
        }

        if (config.showIcons) {
          expect(screen.queryByTestId('event-icon-0')).toBeInTheDocument();
        } else {
          expect(screen.queryByTestId('event-icon-0')).not.toBeInTheDocument();
        }

        unmount();
      });
    });
  });

  describe('Performance and Accessibility', () => {
    it('should handle large number of events efficiently', () => {
      const manyEvents = Array.from({ length: 500 }, (_, i) => ({
        title: `Event ${i}`,
        timestamp: new Date(2025, 0, 15, 10, i % 60).toISOString(),
        type: ['info', 'success', 'warning', 'error'][i % 4]
      }));

      const largeSpec = {
        type: 'Timeline',
        props: {
          events: manyEvents,
          maxEvents: 50 // Limit for performance
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
      
      expect(screen.getByTestId('timeline')).toBeInTheDocument();
      expect(renderTime).toBeLessThan(1000); // Should render within 1 second
      expect(screen.getByTestId('timeline-truncated')).toBeInTheDocument();
      expect(mockOnError).not.toHaveBeenCalled();
      
      // Clean unmount
      expect(() => unmount()).not.toThrow();
    });
  });
});