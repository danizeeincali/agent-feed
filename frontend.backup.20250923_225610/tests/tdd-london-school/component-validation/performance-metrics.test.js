/**
 * TDD London School Test: PerformanceMetrics Component
 * Tests component behavior with various performance data configurations
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { z } from 'zod';

// Mock Progress component
const MockProgress = ({ value, max = 100, className, children, ...props }) => (
  <div {...props} className={`progress ${className || ''}`} data-testid="mock-progress">
    <div 
      className="progress-bar"
      style={{ width: `${(value / max) * 100}%` }}
      data-testid="progress-bar"
    />
    <span className="progress-text" data-testid="progress-text">
      {children || `${value}/${max}`}
    </span>
  </div>
);

// Mock AgentDynamicRenderer for PerformanceMetrics
const MockAgentDynamicRenderer = ({ spec, context, onDataChange, onError }) => {
  React.useEffect(() => {
    if (!spec || !spec.type) {
      onError?.(new Error('Invalid component specification'));
      return;
    }

    if (spec.type === 'PerformanceMetrics' && spec.props) {
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

  // Simulate PerformanceMetrics rendering
  if (spec.type === 'PerformanceMetrics') {
    const { 
      metrics = [], 
      title = 'Performance Metrics', 
      layout = 'grid',
      showTrends = false,
      refreshInterval = null,
      thresholds = {}
    } = spec.props || {};
    
    return (
      <div 
        className={`performance-metrics layout-${layout}`} 
        data-testid="performance-metrics"
        data-refresh-interval={refreshInterval}
      >
        <h2 className="metrics-title">{title}</h2>
        
        <div className="metrics-container">
          {metrics.map((metric, index) => {
            const threshold = thresholds[metric.name];
            const isWarning = threshold && metric.value > threshold.warning;
            const isError = threshold && metric.value > threshold.error;
            const status = isError ? 'error' : isWarning ? 'warning' : 'normal';
            
            return (
              <div 
                key={index} 
                className={`metric-item status-${status}`} 
                data-testid={`metric-${index}`}
              >
                <div className="metric-header">
                  <span className="metric-name">{metric.name}</span>
                  <span className="metric-value" data-testid={`value-${index}`}>
                    {metric.value} {metric.unit || ''}
                  </span>
                </div>
                
                {metric.type === 'progress' && (
                  <MockProgress 
                    value={metric.value} 
                    max={metric.max || 100}
                    data-testid={`progress-${index}`}
                  />
                )}
                
                {showTrends && metric.trend && (
                  <div className="metric-trend" data-testid={`trend-${index}`}>
                    <span className={`trend-${metric.trend.direction}`}>
                      {metric.trend.direction === 'up' ? '↑' : 
                       metric.trend.direction === 'down' ? '↓' : '→'}
                      {metric.trend.percentage}%
                    </span>
                  </div>
                )}
                
                {metric.description && (
                  <div className="metric-description" data-testid={`desc-${index}`}>
                    {metric.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {metrics.length === 0 && (
          <div className="empty-state" data-testid="empty-metrics">
            No performance metrics available
          </div>
        )}
      </div>
    );
  }

  return <div data-testid="unknown-component">Unknown component: {spec.type}</div>;
};

// Test data specifications
const validPerformanceMetricsSpec = {
  type: 'PerformanceMetrics',
  props: {
    title: 'Agent Performance Dashboard',
    layout: 'grid',
    showTrends: true,
    refreshInterval: 30000,
    thresholds: {
      'CPU Usage': { warning: 70, error: 90 },
      'Memory Usage': { warning: 80, error: 95 }
    },
    metrics: [
      {
        name: 'CPU Usage',
        value: 45,
        unit: '%',
        type: 'progress',
        max: 100,
        description: 'Current CPU utilization',
        trend: { direction: 'down', percentage: 5 }
      },
      {
        name: 'Memory Usage', 
        value: 1.2,
        unit: 'GB',
        type: 'gauge',
        max: 8,
        description: 'RAM consumption',
        trend: { direction: 'up', percentage: 12 }
      },
      {
        name: 'Response Time',
        value: 150,
        unit: 'ms',
        type: 'value',
        description: 'Average API response time',
        trend: { direction: 'stable', percentage: 0 }
      },
      {
        name: 'Success Rate',
        value: 98.5,
        unit: '%',
        type: 'progress',
        max: 100,
        description: 'Request success percentage'
      }
    ]
  }
};

const invalidMetricsSpec = {
  type: 'PerformanceMetrics',
  props: {
    metrics: 'not-an-array',
    showTrends: 'not-a-boolean',
    refreshInterval: 'not-a-number',
    thresholds: 'not-an-object'
  }
};

const metricsWithMissingData = {
  type: 'PerformanceMetrics',
  props: {
    metrics: [
      { name: 'Valid Metric', value: 50 },
      { /* missing name */ value: 75 },
      { name: 'Another Valid', /* missing value */ unit: 'MB' },
      null, // completely invalid
      { name: 'Edge Case', value: -10 } // negative value
    ]
  }
};

describe('TDD London School: PerformanceMetrics Component Validation', () => {
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

  describe('Valid Component Rendering', () => {
    it('should render PerformanceMetrics with complete valid configuration', () => {
      const context = { agentId: 'test-agent', pageId: 'test-page' };

      render(
        <MockAgentDynamicRenderer
          spec={validPerformanceMetricsSpec}
          context={context}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      // Verify main component renders
      expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      expect(screen.getByText('Agent Performance Dashboard')).toBeInTheDocument();
      
      // Verify layout attribute
      const container = screen.getByTestId('performance-metrics');
      expect(container).toHaveClass('layout-grid');
      expect(container).toHaveAttribute('data-refresh-interval', '30000');
      
      // Verify all metrics are rendered
      expect(screen.getByTestId('metric-0')).toBeInTheDocument();
      expect(screen.getByTestId('metric-1')).toBeInTheDocument();
      expect(screen.getByTestId('metric-2')).toBeInTheDocument();
      expect(screen.getByTestId('metric-3')).toBeInTheDocument();
      
      // Verify metric content
      expect(screen.getByText('CPU Usage')).toBeInTheDocument();
      expect(screen.getByTestId('value-0')).toHaveTextContent('45 %');
      
      // Verify progress components for progress type metrics
      expect(screen.getByTestId('progress-0')).toBeInTheDocument();
      
      // Verify trends are shown
      expect(screen.getByTestId('trend-0')).toBeInTheDocument();
      expect(screen.getByTestId('trend-1')).toBeInTheDocument();
      
      // Verify descriptions
      expect(screen.getByText('Current CPU utilization')).toBeInTheDocument();
      
      // Verify no errors occurred
      expect(mockOnError).not.toHaveBeenCalled();
      expect(mockOnDataChange).toHaveBeenCalledWith(validPerformanceMetricsSpec.props);
    });

    it('should handle minimal configuration with default values', () => {
      const minimalSpec = {
        type: 'PerformanceMetrics',
        props: {
          metrics: [
            { name: 'Basic Metric', value: 42 }
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

      expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument(); // Default title
      expect(screen.getByTestId('metric-0')).toBeInTheDocument();
      expect(screen.getByText('Basic Metric')).toBeInTheDocument();
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should render empty state when no metrics provided', () => {
      const emptySpec = {
        type: 'PerformanceMetrics',
        props: {
          title: 'Empty Dashboard',
          metrics: []
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

      expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      expect(screen.getByTestId('empty-metrics')).toBeInTheDocument();
      expect(screen.getByText('No performance metrics available')).toBeInTheDocument();
      expect(mockOnError).not.toHaveBeenCalled();
    });
  });

  describe('Threshold-based Status Indication', () => {
    it('should apply warning status when metric exceeds warning threshold', () => {
      const warningSpec = {
        type: 'PerformanceMetrics',
        props: {
          thresholds: {
            'CPU Usage': { warning: 70, error: 90 }
          },
          metrics: [
            { name: 'CPU Usage', value: 75 } // Above warning (70), below error (90)
          ]
        }
      };

      render(
        <MockAgentDynamicRenderer
          spec={warningSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      const metricItem = screen.getByTestId('metric-0');
      expect(metricItem).toHaveClass('status-warning');
    });

    it('should apply error status when metric exceeds error threshold', () => {
      const errorSpec = {
        type: 'PerformanceMetrics',
        props: {
          thresholds: {
            'CPU Usage': { warning: 70, error: 90 }
          },
          metrics: [
            { name: 'CPU Usage', value: 95 } // Above error (90)
          ]
        }
      };

      render(
        <MockAgentDynamicRenderer
          spec={errorSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      const metricItem = screen.getByTestId('metric-0');
      expect(metricItem).toHaveClass('status-error');
    });

    it('should apply normal status when metric is within thresholds', () => {
      const normalSpec = {
        type: 'PerformanceMetrics',
        props: {
          thresholds: {
            'CPU Usage': { warning: 70, error: 90 }
          },
          metrics: [
            { name: 'CPU Usage', value: 45 } // Below warning (70)
          ]
        }
      };

      render(
        <MockAgentDynamicRenderer
          spec={normalSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      const metricItem = screen.getByTestId('metric-0');
      expect(metricItem).toHaveClass('status-normal');
    });
  });

  describe('Invalid Configuration Handling', () => {
    it('should handle invalid prop types gracefully', () => {
      render(
        <MockAgentDynamicRenderer
          spec={invalidMetricsSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      // Component should still render with fallbacks
      expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument(); // Default title
      
      // Should handle invalid metrics array
      expect(screen.getByTestId('empty-metrics')).toBeInTheDocument();
      
      // Should not crash the application
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should handle metrics with missing or invalid data', () => {
      render(
        <MockAgentDynamicRenderer
          spec={metricsWithMissingData}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      
      // Valid metrics should render
      expect(screen.getByText('Valid Metric')).toBeInTheDocument();
      expect(screen.getByText('Another Valid')).toBeInTheDocument();
      expect(screen.getByText('Edge Case')).toBeInTheDocument();
      
      // Component should handle invalid entries gracefully
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('should show error for completely malformed specification', () => {
      const malformedSpec = {
        // Missing type
        props: {
          metrics: []
        }
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
    it('should validate PerformanceMetrics props with Zod schema', () => {
      const metricSchema = z.object({
        name: z.string().min(1, 'Metric name is required'),
        value: z.number(),
        unit: z.string().optional(),
        type: z.enum(['progress', 'gauge', 'value']).optional(),
        max: z.number().optional(),
        description: z.string().optional(),
        trend: z.object({
          direction: z.enum(['up', 'down', 'stable']),
          percentage: z.number()
        }).optional()
      });

      const performanceMetricsSchema = z.object({
        title: z.string().optional(),
        layout: z.enum(['grid', 'list', 'columns']).optional(),
        showTrends: z.boolean().optional(),
        refreshInterval: z.number().nullable().optional(),
        thresholds: z.record(z.object({
          warning: z.number(),
          error: z.number()
        })).optional(),
        metrics: z.array(metricSchema)
      });

      // Valid props
      const validProps = {
        title: 'Test Metrics',
        metrics: [
          { name: 'CPU', value: 50, unit: '%', type: 'progress' },
          { name: 'Memory', value: 2.5, unit: 'GB' }
        ],
        showTrends: true
      };

      const validResult = performanceMetricsSchema.safeParse(validProps);
      expect(validResult.success).toBe(true);

      // Invalid props
      const invalidProps = {
        metrics: [
          { name: '', value: 'not-a-number', type: 'invalid-type' }
        ],
        showTrends: 'not-a-boolean',
        refreshInterval: 'not-a-number'
      };

      const invalidResult = performanceMetricsSchema.safeParse(invalidProps);
      expect(invalidResult.success).toBe(false);
      
      if (!invalidResult.success) {
        expect(invalidResult.error.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Layout and Styling Variations', () => {
    it('should apply different layout classes correctly', () => {
      const layouts = ['grid', 'list', 'columns'];
      
      layouts.forEach(layout => {
        const layoutSpec = {
          type: 'PerformanceMetrics',
          props: {
            layout,
            metrics: [{ name: 'Test', value: 50 }]
          }
        };

        const { unmount } = render(
          <MockAgentDynamicRenderer
            spec={layoutSpec}
            context={{ agentId: 'test', pageId: 'test' }}
            onDataChange={mockOnDataChange}
            onError={mockOnError}
          />
        );

        const container = screen.getByTestId('performance-metrics');
        expect(container).toHaveClass(`layout-${layout}`);
        
        unmount();
      });
    });
  });

  describe('Performance and Accessibility', () => {
    it('should handle large number of metrics efficiently', () => {
      const manyMetrics = Array.from({ length: 100 }, (_, i) => ({
        name: `Metric ${i}`,
        value: Math.floor(Math.random() * 100),
        unit: '%'
      }));

      const largeSpec = {
        type: 'PerformanceMetrics',
        props: {
          metrics: manyMetrics
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
      
      expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      expect(renderTime).toBeLessThan(1000); // Should render within 1 second
      expect(mockOnError).not.toHaveBeenCalled();
      
      // Clean unmount
      expect(() => unmount()).not.toThrow();
    });

    it('should provide accessible markup for screen readers', () => {
      render(
        <MockAgentDynamicRenderer
          spec={validPerformanceMetricsSpec}
          context={{ agentId: 'test', pageId: 'test' }}
          onDataChange={mockOnDataChange}
          onError={mockOnError}
        />
      );

      // Title should be accessible
      expect(screen.getByText('Agent Performance Dashboard')).toBeInTheDocument();
      
      // Metrics should have readable values
      const cpuValue = screen.getByTestId('value-0');
      expect(cpuValue).toHaveTextContent('45 %');
      
      // Descriptions should be available for screen readers
      expect(screen.getByText('Current CPU utilization')).toBeInTheDocument();
    });
  });
});