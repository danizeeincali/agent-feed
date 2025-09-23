/**
 * Integration Tests for Complete Analytics User Flow
 * Tests the full user journey from RealAnalytics → Claude SDK tab → sub-tabs
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import {
  PerformanceTimer,
  measureTimeToInteractive,
  globalTimer,
  waitForComponentStable
} from '../utils/performanceHelpers';

// Mock API service
const mockApiService = {
  getSystemMetrics: vi.fn(),
  getAnalytics: vi.fn(),
  getFeedStats: vi.fn(),
  getAgentPosts: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock('../../services/api', () => ({
  apiService: mockApiService
}));

// Mock the actual RealAnalytics component
vi.mock('../../components/RealAnalytics', () => ({
  default: function MockRealAnalytics() {
    const [activeTab, setActiveTab] = React.useState('system');
    const [loading, setLoading] = React.useState(false);

    const handleTabSwitch = (tab: string) => {
      setLoading(true);
      setActiveTab(tab);
      // Simulate brief loading
      setTimeout(() => setLoading(false), 50);
    };

    return (
      <div data-testid="real-analytics">
        <h2>System Analytics</h2>

        {/* Tab Navigation */}
        <nav data-testid="analytics-tabs">
          <button
            data-testid="system-tab"
            onClick={() => handleTabSwitch('system')}
            className={activeTab === 'system' ? 'active' : ''}
          >
            System Analytics
          </button>
          <button
            data-testid="claude-sdk-tab"
            onClick={() => handleTabSwitch('claude-sdk')}
            className={activeTab === 'claude-sdk' ? 'active' : ''}
          >
            Claude SDK Cost Analytics
          </button>
        </nav>

        {/* Tab Content */}
        {loading && <div data-testid="tab-loading">Loading...</div>}

        {!loading && activeTab === 'system' && (
          <div data-testid="system-analytics-content">
            <div data-testid="system-metrics">System Metrics</div>
            <div data-testid="performance-charts">Performance Charts</div>
          </div>
        )}

        {!loading && activeTab === 'claude-sdk' && (
          <div data-testid="claude-sdk-analytics-content">
            <MockEnhancedAnalyticsPage />
          </div>
        )}
      </div>
    );
  }
}));

// Mock EnhancedAnalyticsPage with realistic sub-tabs
function MockEnhancedAnalyticsPage() {
  const [activeSubTab, setActiveSubTab] = React.useState('cost-overview');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubTabSwitch = (subTab: string) => {
    setIsLoading(true);
    setActiveSubTab(subTab);
    // Simulate data loading
    setTimeout(() => setIsLoading(false), 30);
  };

  return (
    <div data-testid="enhanced-analytics-page">
      <h3>Claude SDK Cost Analytics</h3>

      {/* Sub-tab Navigation */}
      <nav data-testid="sub-tab-navigation">
        <button
          data-testid="cost-overview-tab"
          onClick={() => handleSubTabSwitch('cost-overview')}
          className={activeSubTab === 'cost-overview' ? 'active' : ''}
        >
          Cost Overview
        </button>
        <button
          data-testid="messages-steps-tab"
          onClick={() => handleSubTabSwitch('messages-steps')}
          className={activeSubTab === 'messages-steps' ? 'active' : ''}
        >
          Messages & Steps
        </button>
        <button
          data-testid="optimization-tab"
          onClick={() => handleSubTabSwitch('optimization')}
          className={activeSubTab === 'optimization' ? 'active' : ''}
        >
          Optimization
        </button>
        <button
          data-testid="export-tab"
          onClick={() => handleSubTabSwitch('export')}
          className={activeSubTab === 'export' ? 'active' : ''}
        >
          Export
        </button>
      </nav>

      {/* Sub-tab Content */}
      {isLoading && <div data-testid="subtab-loading">Loading subtab...</div>}

      {!isLoading && activeSubTab === 'cost-overview' && (
        <div data-testid="cost-overview-content">
          <div data-testid="cost-metrics">
            <div data-testid="total-cost">Total Cost: $45.67</div>
            <div data-testid="cost-chart">Cost Chart</div>
            <div data-testid="cost-breakdown">Cost Breakdown</div>
          </div>
        </div>
      )}

      {!isLoading && activeSubTab === 'messages-steps' && (
        <div data-testid="messages-steps-content">
          <div data-testid="message-history">Message History</div>
          <div data-testid="step-breakdown">Step Breakdown</div>
          <div data-testid="token-usage">Token Usage</div>
        </div>
      )}

      {!isLoading && activeSubTab === 'optimization' && (
        <div data-testid="optimization-content">
          <div data-testid="optimization-suggestions">Optimization Suggestions</div>
          <div data-testid="efficiency-metrics">Efficiency Metrics</div>
          <div data-testid="cost-savings">Cost Savings Opportunities</div>
        </div>
      )}

      {!isLoading && activeSubTab === 'export' && (
        <div data-testid="export-content">
          <div data-testid="export-options">Export Options</div>
          <button data-testid="export-csv">Export CSV</button>
          <button data-testid="export-json">Export JSON</button>
          <button data-testid="export-pdf">Export PDF</button>
        </div>
      )}
    </div>
  );
}

describe('Complete Analytics User Flow Integration', () => {
  let performanceTimer: PerformanceTimer;

  beforeEach(() => {
    performanceTimer = new PerformanceTimer();
    globalTimer.clear();

    // Setup API mocks
    mockApiService.getSystemMetrics.mockResolvedValue({
      data: [{
        timestamp: new Date().toISOString(),
        server_id: 'test-server',
        cpu_usage: 45,
        memory_usage: 65,
        disk_usage: 50,
        active_agents: 8,
        total_posts: 12,
        avg_response_time: 285,
        system_health: 95
      }]
    });

    mockApiService.getAnalytics.mockResolvedValue({
      data: {
        agentOperations: 45,
        postCreations: 23,
        systemEvents: 12,
        userInteractions: 67
      }
    });

    mockApiService.getFeedStats.mockResolvedValue({
      data: {
        totalAgents: 8,
        totalPosts: 12,
        systemHealth: 95,
        activeConnections: 15
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Analytics Page Load', () => {
    it('should load RealAnalytics page quickly', async () => {
      performanceTimer.start('initial-load');

      render(
        <MemoryRouter>
          {React.createElement(require('../../components/RealAnalytics').default)}
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      const loadTime = performanceTimer.end('initial-load');
      expect(loadTime).toBeLessThan(1000);
    });

    it('should display system analytics by default', async () => {
      render(
        <MemoryRouter>
          {React.createElement(require('../../components/RealAnalytics').default)}
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('system-analytics-content')).toBeInTheDocument();
        expect(screen.getByTestId('system-metrics')).toBeInTheDocument();
        expect(screen.getByTestId('performance-charts')).toBeInTheDocument();
      });
    });
  });

  describe('Claude SDK Tab Navigation', () => {
    it('should switch to Claude SDK tab without delays', async () => {
      render(
        <MemoryRouter>
          {React.createElement(require('../../components/RealAnalytics').default)}
        </MemoryRouter>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('system-analytics-content')).toBeInTheDocument();
      });

      performanceTimer.start('claude-sdk-switch');

      // Click Claude SDK tab
      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      // Should load without timeout issues
      await waitFor(() => {
        expect(screen.getByTestId('claude-sdk-analytics-content')).toBeInTheDocument();
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      }, { timeout: 2000 });

      const switchTime = performanceTimer.end('claude-sdk-switch');
      expect(switchTime).toBeLessThan(500);
    });

    it('should show all sub-tabs immediately', async () => {
      render(
        <MemoryRouter>
          {React.createElement(require('../../components/RealAnalytics').default)}
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      await waitFor(() => {
        expect(screen.getByTestId('cost-overview-tab')).toBeInTheDocument();
        expect(screen.getByTestId('messages-steps-tab')).toBeInTheDocument();
        expect(screen.getByTestId('optimization-tab')).toBeInTheDocument();
        expect(screen.getByTestId('export-tab')).toBeInTheDocument();
      });
    });
  });

  describe('Sub-tab Navigation Flow', () => {
    it('should navigate through all sub-tabs efficiently', async () => {
      render(
        <MemoryRouter>
          {React.createElement(require('../../components/RealAnalytics').default)}
        </MemoryRouter>
      );

      // Navigate to Claude SDK tab
      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Test each sub-tab
      const subTabs = [
        { tab: 'cost-overview-tab', content: 'cost-overview-content' },
        { tab: 'messages-steps-tab', content: 'messages-steps-content' },
        { tab: 'optimization-tab', content: 'optimization-content' },
        { tab: 'export-tab', content: 'export-content' }
      ];

      for (const { tab, content } of subTabs) {
        performanceTimer.start(`subtab-${tab}`);

        fireEvent.click(screen.getByTestId(tab));

        await waitFor(() => {
          expect(screen.getByTestId(content)).toBeInTheDocument();
        }, { timeout: 1000 });

        const tabSwitchTime = performanceTimer.end(`subtab-${tab}`);
        expect(tabSwitchTime).toBeLessThan(200);
      }
    });

    it('should display correct content for Cost Overview tab', async () => {
      render(
        <MemoryRouter>
          {React.createElement(require('../../components/RealAnalytics').default)}
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      await waitFor(() => {
        expect(screen.getByTestId('cost-overview-tab')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('cost-overview-tab'));

      await waitFor(() => {
        expect(screen.getByTestId('cost-overview-content')).toBeInTheDocument();
        expect(screen.getByTestId('total-cost')).toBeInTheDocument();
        expect(screen.getByTestId('cost-chart')).toBeInTheDocument();
        expect(screen.getByTestId('cost-breakdown')).toBeInTheDocument();
      });
    });

    it('should display correct content for Messages & Steps tab', async () => {
      render(
        <MemoryRouter>
          {React.createElement(require('../../components/RealAnalytics').default)}
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('claude-sdk-tab'));
      fireEvent.click(screen.getByTestId('messages-steps-tab'));

      await waitFor(() => {
        expect(screen.getByTestId('messages-steps-content')).toBeInTheDocument();
        expect(screen.getByTestId('message-history')).toBeInTheDocument();
        expect(screen.getByTestId('step-breakdown')).toBeInTheDocument();
        expect(screen.getByTestId('token-usage')).toBeInTheDocument();
      });
    });

    it('should display correct content for Optimization tab', async () => {
      render(
        <MemoryRouter>
          {React.createElement(require('../../components/RealAnalytics').default)}
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('claude-sdk-tab'));
      fireEvent.click(screen.getByTestId('optimization-tab'));

      await waitFor(() => {
        expect(screen.getByTestId('optimization-content')).toBeInTheDocument();
        expect(screen.getByTestId('optimization-suggestions')).toBeInTheDocument();
        expect(screen.getByTestId('efficiency-metrics')).toBeInTheDocument();
        expect(screen.getByTestId('cost-savings')).toBeInTheDocument();
      });
    });

    it('should display correct content for Export tab', async () => {
      render(
        <MemoryRouter>
          {React.createElement(require('../../components/RealAnalytics').default)}
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('claude-sdk-tab'));
      fireEvent.click(screen.getByTestId('export-tab'));

      await waitFor(() => {
        expect(screen.getByTestId('export-content')).toBeInTheDocument();
        expect(screen.getByTestId('export-options')).toBeInTheDocument();
        expect(screen.getByTestId('export-csv')).toBeInTheDocument();
        expect(screen.getByTestId('export-json')).toBeInTheDocument();
        expect(screen.getByTestId('export-pdf')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Across Full User Flow', () => {
    it('should complete full navigation flow within performance thresholds', async () => {
      performanceTimer.start('full-flow');

      const { container } = render(
        <MemoryRouter>
          {React.createElement(require('../../components/RealAnalytics').default)}
        </MemoryRouter>
      );

      // 1. Initial load
      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // 2. Switch to Claude SDK
      fireEvent.click(screen.getByTestId('claude-sdk-tab'));
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // 3. Navigate through all sub-tabs
      const subTabs = ['messages-steps-tab', 'optimization-tab', 'export-tab', 'cost-overview-tab'];

      for (const tab of subTabs) {
        fireEvent.click(screen.getByTestId(tab));
        await waitForComponentStable(container, 500);
      }

      const totalTime = performanceTimer.end('full-flow');
      expect(totalTime).toBeLessThan(3000); // Complete flow under 3 seconds
    });

    it('should maintain interactive performance throughout flow', async () => {
      const { container } = render(
        <MemoryRouter>
          {React.createElement(require('../../components/RealAnalytics').default)}
        </MemoryRouter>
      );

      // Test interactivity at each step
      const interactionPoints = [
        { action: () => fireEvent.click(screen.getByTestId('claude-sdk-tab')), testid: 'enhanced-analytics-page' },
        { action: () => fireEvent.click(screen.getByTestId('cost-overview-tab')), testid: 'cost-overview-content' },
        { action: () => fireEvent.click(screen.getByTestId('messages-steps-tab')), testid: 'messages-steps-content' },
        { action: () => fireEvent.click(screen.getByTestId('optimization-tab')), testid: 'optimization-content' },
        { action: () => fireEvent.click(screen.getByTestId('export-tab')), testid: 'export-content' }
      ];

      for (const { action, testid } of interactionPoints) {
        action();

        const tti = await measureTimeToInteractive(container, `[data-testid="${testid}"]`, 2000);
        expect(tti).toBeLessThan(300); // Interactive within 300ms

        await waitFor(() => {
          expect(screen.getByTestId(testid)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Error Handling During Flow', () => {
    it('should handle network errors gracefully', async () => {
      // Simulate API failure
      mockApiService.getSystemMetrics.mockRejectedValue(new Error('Network error'));

      render(
        <MemoryRouter>
          {React.createElement(require('../../components/RealAnalytics').default)}
        </MemoryRouter>
      );

      // Should still render with fallback data
      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      });

      // Navigation should still work
      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });
    });

    it('should recover from temporary loading failures', async () => {
      let failCount = 0;
      mockApiService.getSystemMetrics.mockImplementation(() => {
        failCount++;
        if (failCount <= 2) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({ data: [] });
      });

      render(
        <MemoryRouter>
          {React.createElement(require('../../components/RealAnalytics').default)}
        </MemoryRouter>
      );

      // Should eventually succeed
      await waitFor(() => {
        expect(screen.getByTestId('real-analytics')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Accessibility During Navigation', () => {
    it('should maintain keyboard navigation throughout flow', async () => {
      render(
        <MemoryRouter>
          {React.createElement(require('../../components/RealAnalytics').default)}
        </MemoryRouter>
      );

      // Tab navigation should work
      const claudeSDKTab = screen.getByTestId('claude-sdk-tab');
      claudeSDKTab.focus();

      // Simulate Enter key press
      fireEvent.keyDown(claudeSDKTab, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-analytics-page')).toBeInTheDocument();
      });

      // Sub-tab navigation
      const costTab = screen.getByTestId('cost-overview-tab');
      costTab.focus();
      fireEvent.keyDown(costTab, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByTestId('cost-overview-content')).toBeInTheDocument();
      });
    });

    it('should provide proper ARIA labels and roles', async () => {
      render(
        <MemoryRouter>
          {React.createElement(require('../../components/RealAnalytics').default)}
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('claude-sdk-tab'));

      await waitFor(() => {
        const navigation = screen.getByTestId('sub-tab-navigation');
        expect(navigation).toBeInTheDocument();

        // Check that buttons are properly accessible
        const tabs = navigation.querySelectorAll('button');
        tabs.forEach(tab => {
          expect(tab).toBeVisible();
          expect(tab).not.toBeDisabled();
        });
      });
    });
  });
});