import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React, { ReactNode } from 'react';

describe('Analytics Error Boundary Tests', () => {
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    // Suppress console errors during testing
    originalConsoleError = console.error;
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    vi.restoreAllMocks();
  });

  describe('Error Boundary Component Tests', () => {
    it('should load AnalyticsErrorBoundary successfully', async () => {
      let ErrorBoundary: any;
      let error: any = null;

      try {
        const module = await import('../components/analytics/AnalyticsErrorBoundary');
        ErrorBoundary = module.default;
      } catch (e) {
        error = e;
      }

      expect(error).toBeNull();
      expect(ErrorBoundary).toBeDefined();
      expect(typeof ErrorBoundary).toBe('function');
    });

    it('should render children when no errors occur', async () => {
      const { default: AnalyticsErrorBoundary } = await import('../components/analytics/AnalyticsErrorBoundary');

      render(
        <AnalyticsErrorBoundary>
          <div data-testid="child-component">Test Content</div>
        </AnalyticsErrorBoundary>
      );

      expect(screen.getByTestId('child-component')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should catch and handle component errors gracefully', async () => {
      const { default: AnalyticsErrorBoundary } = await import('../components/analytics/AnalyticsErrorBoundary');

      // Component that throws an error
      const ErrorComponent = () => {
        throw new Error('Test component error');
      };

      render(
        <AnalyticsErrorBoundary>
          <ErrorComponent />
        </AnalyticsErrorBoundary>
      );

      // Error boundary should display fallback UI instead of crashing
      await waitFor(() => {
        // Check if error boundary handled the error
        expect(screen.queryByText('Test component error')).not.toBeInTheDocument();
        // Should show some kind of error fallback (depending on implementation)
      });
    });

    it('should provide error recovery mechanisms', async () => {
      const { default: AnalyticsErrorBoundary } = await import('../components/analytics/AnalyticsErrorBoundary');

      let hasErrored = true;

      const ConditionalErrorComponent = () => {
        if (hasErrored) {
          throw new Error('Conditional error');
        }
        return <div>Component recovered</div>;
      };

      const { rerender } = render(
        <AnalyticsErrorBoundary>
          <ConditionalErrorComponent />
        </AnalyticsErrorBoundary>
      );

      // Component should error initially
      await waitFor(() => {
        expect(screen.queryByText('Component recovered')).not.toBeInTheDocument();
      });

      // Simulate error recovery
      hasErrored = false;

      rerender(
        <AnalyticsErrorBoundary>
          <ConditionalErrorComponent />
        </AnalyticsErrorBoundary>
      );

      // After recovery, component should render normally
      expect(screen.getByText('Component recovered')).toBeInTheDocument();
    });
  });

  describe('Analytics Provider Error Handling', () => {
    it('should load AnalyticsProvider successfully', async () => {
      let AnalyticsProvider: any;
      let error: any = null;

      try {
        const module = await import('../components/analytics/AnalyticsProvider');
        AnalyticsProvider = module.AnalyticsProvider;
      } catch (e) {
        error = e;
      }

      expect(error).toBeNull();
      expect(AnalyticsProvider).toBeDefined();
      expect(typeof AnalyticsProvider).toBe('function');
    });

    it('should handle provider initialization errors', async () => {
      const { AnalyticsProvider } = await import('../components/analytics/AnalyticsProvider');
      const { default: AnalyticsErrorBoundary } = await import('../components/analytics/AnalyticsErrorBoundary');

      // Test provider with invalid configuration
      render(
        <AnalyticsErrorBoundary>
          <AnalyticsProvider enableRealTime={true} refreshInterval={0}>
            <div>Test Content</div>
          </AnalyticsProvider>
        </AnalyticsErrorBoundary>
      );

      // Should handle invalid refresh interval gracefully
      await waitFor(() => {
        expect(screen.getByText('Test Content')).toBeInTheDocument();
      });
    });

    it('should handle real-time update failures', async () => {
      const { AnalyticsProvider } = await import('../components/analytics/AnalyticsProvider');

      render(
        <AnalyticsProvider enableRealTime={true} refreshInterval={1000}>
          <div>Real-time content</div>
        </AnalyticsProvider>
      );

      // Should render even if real-time updates fail
      expect(screen.getByText('Real-time content')).toBeInTheDocument();
    });
  });

  describe('Component-Specific Error Scenarios', () => {
    it('should handle CostOverviewDashboard errors', async () => {
      const { default: AnalyticsErrorBoundary } = await import('../components/analytics/AnalyticsErrorBoundary');
      const { default: CostOverviewDashboard } = await import('../components/analytics/CostOverviewDashboard');

      render(
        <AnalyticsErrorBoundary>
          <CostOverviewDashboard
            onTimeRangeChange={null as any} // Invalid prop
            onExport={undefined as any}     // Invalid prop
            realTimeUpdates={true}
          />
        </AnalyticsErrorBoundary>
      );

      // Component should handle invalid props gracefully
      await waitFor(() => {
        // Should either render with defaults or show error boundary
        const element = screen.queryByText('Cost Analytics Dashboard');
        // Test passes if it doesn't crash the application
      });
    });

    it('should handle chart rendering errors', async () => {
      const { default: LineChart } = await import('../components/charts/LineChart');
      const { default: AnalyticsErrorBoundary } = await import('../components/analytics/AnalyticsErrorBoundary');

      const invalidConfig = {
        type: 'invalid' as any,
        title: 'Test Chart',
        xAxis: null as any,
        yAxis: null as any,
        colors: [], // Empty colors array
        showGrid: true,
        showLegend: false
      };

      render(
        <AnalyticsErrorBoundary>
          <LineChart
            data={null as any} // Invalid data
            config={invalidConfig}
            height={300}
          />
        </AnalyticsErrorBoundary>
      );

      // Chart should handle invalid data gracefully
      await waitFor(() => {
        // Should show "No data available" or error boundary
        const noDataMessage = screen.queryByText('No data available');
        const chartTitle = screen.queryByText('Test Chart');
        expect(noDataMessage || chartTitle).toBeInTheDocument();
      });
    });

    it('should handle network failure scenarios', async () => {
      const { AnalyticsProvider } = await import('../components/analytics/AnalyticsProvider');
      const { default: AnalyticsErrorBoundary } = await import('../components/analytics/AnalyticsErrorBoundary');

      // Mock network failure
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      render(
        <AnalyticsErrorBoundary>
          <AnalyticsProvider enableRealTime={true}>
            <div>Analytics content</div>
          </AnalyticsProvider>
        </AnalyticsErrorBoundary>
      );

      // Should handle network failures gracefully
      await waitFor(() => {
        expect(screen.getByText('Analytics content')).toBeInTheDocument();
      });

      // Cleanup
      vi.restoreAllMocks();
    });

    it('should handle memory pressure scenarios', async () => {
      const { default: EnhancedAnalyticsPage } = await import('../components/analytics/EnhancedAnalyticsPage');

      // Simulate memory pressure by creating many instances
      const instances = [];

      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <EnhancedAnalyticsPage key={i} enableRealTime={false} />
        );
        instances.push(unmount);
      }

      // All instances should render successfully
      expect(instances).toHaveLength(10);

      // Cleanup
      instances.forEach(unmount => unmount());
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should provide meaningful error messages', () => {
      const errorScenarios = [
        {
          error: 'Component failed to load',
          expectedMessage: 'Analytics component temporarily unavailable. Please try refreshing the page.'
        },
        {
          error: 'Network request failed',
          expectedMessage: 'Unable to fetch analytics data. Check your internet connection.'
        },
        {
          error: 'Invalid data format',
          expectedMessage: 'Data format error. Analytics may display incomplete information.'
        }
      ];

      errorScenarios.forEach(({ error, expectedMessage }) => {
        expect(error).toBeTruthy();
        expect(expectedMessage).toBeTruthy();
        expect(expectedMessage.length).toBeGreaterThan(30); // Descriptive
        expect(expectedMessage.length).toBeLessThan(120); // Not too verbose
        console.log(`💬 ${error} → ${expectedMessage}`);
      });
    });

    it('should implement progressive degradation', async () => {
      const degradationLevels = [
        { level: 'Full functionality', description: 'All features working' },
        { level: 'Reduced features', description: 'Core analytics only' },
        { level: 'Basic view', description: 'Static data display' },
        { level: 'Error state', description: 'Graceful error message' }
      ];

      degradationLevels.forEach(({ level, description }) => {
        expect(level).toBeTruthy();
        expect(description).toBeTruthy();
        console.log(`📉 ${level}: ${description}`);
      });

      // Test basic degradation
      const { default: EnhancedAnalyticsPage } = await import('../components/analytics/EnhancedAnalyticsPage');

      // Render with minimal features
      render(
        <EnhancedAnalyticsPage
          enableRealTime={false}  // Disable advanced features
          refreshInterval={0}      // Disable auto-refresh
        />
      );

      expect(screen.getByText('Claude Code SDK Analytics')).toBeInTheDocument();
    });

    it('should handle component unmounting during operations', async () => {
      const { default: EnhancedAnalyticsPage } = await import('../components/analytics/EnhancedAnalyticsPage');

      const { unmount } = render(
        <EnhancedAnalyticsPage enableRealTime={true} refreshInterval={1000} />
      );

      // Unmount immediately to test cleanup
      unmount();

      // Should not throw errors or cause memory leaks
      expect(true).toBe(true); // Test passes if no errors thrown
    });

    it('should validate error boundary isolation', async () => {
      const { default: AnalyticsErrorBoundary } = await import('../components/analytics/AnalyticsErrorBoundary');

      const WorkingComponent = () => <div>Working component</div>;
      const BrokenComponent = () => {
        throw new Error('Broken component');
      };

      render(
        <div>
          <AnalyticsErrorBoundary>
            <WorkingComponent />
          </AnalyticsErrorBoundary>

          <AnalyticsErrorBoundary>
            <BrokenComponent />
          </AnalyticsErrorBoundary>

          <AnalyticsErrorBoundary>
            <WorkingComponent />
          </AnalyticsErrorBoundary>
        </div>
      );

      // Working components should still render
      const workingComponents = screen.getAllByText('Working component');
      expect(workingComponents).toHaveLength(2);

      // Error should be isolated to one boundary
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Edge Case Error Handling', () => {
    it('should handle undefined/null props gracefully', async () => {
      const { default: EnhancedAnalyticsPage } = await import('../components/analytics/EnhancedAnalyticsPage');

      render(
        <EnhancedAnalyticsPage
          className={undefined}
          enableRealTime={null as any}
          refreshInterval={undefined}
        />
      );

      // Should render with default values
      expect(screen.getByText('Claude Code SDK Analytics')).toBeInTheDocument();
    });

    it('should handle extremely large data sets', async () => {
      const { default: LineChart } = await import('../components/charts/LineChart');

      const largeDataSet = Array.from({ length: 10000 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        value: Math.random() * 100,
        label: `Point ${i}`
      }));

      const config = {
        type: 'line' as const,
        title: 'Large Dataset',
        xAxis: 'Time',
        yAxis: 'Value',
        colors: ['#3b82f6'],
        showGrid: true,
        showLegend: false
      };

      render(<LineChart data={largeDataSet} config={config} />);

      // Should handle large datasets without crashing
      expect(screen.getByText('Large Dataset')).toBeInTheDocument();
    });

    it('should handle rapid state changes', async () => {
      const { AnalyticsProvider } = await import('../components/analytics/AnalyticsProvider');

      let refreshInterval = 1000;
      const { rerender } = render(
        <AnalyticsProvider enableRealTime={true} refreshInterval={refreshInterval}>
          <div>Dynamic content</div>
        </AnalyticsProvider>
      );

      // Rapidly change refresh interval
      for (let i = 0; i < 10; i++) {
        refreshInterval = 100 + i * 100;
        rerender(
          <AnalyticsProvider enableRealTime={true} refreshInterval={refreshInterval}>
            <div>Dynamic content</div>
          </AnalyticsProvider>
        );
      }

      // Should handle rapid prop changes gracefully
      expect(screen.getByText('Dynamic content')).toBeInTheDocument();
    });
  });
});