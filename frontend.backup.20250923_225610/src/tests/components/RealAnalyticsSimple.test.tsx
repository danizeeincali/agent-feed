/**
 * Simple TDD Test for RealAnalytics Tab Functionality
 *
 * This is a simplified version to verify the basic tab functionality works
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import RealAnalytics from '../../components/RealAnalytics';

// Mock the API service
vi.mock('../../services/api', () => ({
  apiService: {
    getSystemMetrics: vi.fn().mockResolvedValue({
      data: [{
        timestamp: new Date().toISOString(),
        server_id: 'main-server',
        cpu_usage: 45,
        memory_usage: 65,
        disk_usage: 50,
        active_agents: 8,
        total_posts: 156,
        avg_response_time: 285,
        system_health: 95
      }]
    }),
    getAnalytics: vi.fn().mockResolvedValue({
      data: {
        totalUsers: 42,
        activeUsers: 8,
        totalPosts: 156,
        engagement: 78.5,
        performance: {
          avgLoadTime: 285,
          errorRate: 0.5
        }
      }
    }),
    getFeedStats: vi.fn().mockResolvedValue({
      data: {
        totalPosts: 156,
        todayPosts: 12,
        avgEngagement: 6.2,
        topCategories: ['Technology', 'AI', 'Development']
      }
    }),
    on: vi.fn(),
    off: vi.fn()
  }
}));

// Mock the enhanced analytics page
vi.mock('../../components/analytics/EnhancedAnalyticsPage', () => ({
  default: () => (
    <div data-testid="claude-sdk-analytics">
      Claude SDK Analytics Component
    </div>
  )
}));

describe('RealAnalytics Simple TDD Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render analytics dashboard', async () => {
    render(<RealAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });
  });

  it('should have both tabs visible', async () => {
    render(<RealAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Check for tabs
    expect(screen.getByRole('tab', { name: /system analytics/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /claude sdk analytics/i })).toBeInTheDocument();
  });

  it('should have system tab active by default', async () => {
    render(<RealAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    const systemTab = screen.getByRole('tab', { name: /system analytics/i });
    const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });

    expect(systemTab).toHaveAttribute('aria-selected', 'true');
    expect(claudeSDKTab).toHaveAttribute('aria-selected', 'false');
  });

  it('should switch tabs when clicked', async () => {
    render(<RealAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
    await user.click(claudeSDKTab);

    expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
  });

  it('should display system metrics in system tab', async () => {
    render(<RealAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Should show system metrics
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('System Performance')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument(); // Active users
  });

  it('should load Claude SDK analytics in Claude SDK tab', async () => {
    render(<RealAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Switch to Claude SDK tab
    const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
    await user.click(claudeSDKTab);

    // Should load Claude SDK component
    await waitFor(() => {
      expect(screen.getByTestId('claude-sdk-analytics')).toBeInTheDocument();
    });
  });

  it('should have refresh button', async () => {
    render(<RealAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('should have time range selector', async () => {
    render(<RealAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('Last 24 Hours')).toBeInTheDocument();
  });

  it('should maintain tab state after refresh', async () => {
    render(<RealAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Switch to Claude SDK tab
    const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
    await user.click(claudeSDKTab);

    expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');

    // Click refresh
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    // Tab should remain active
    expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
  });
});