/**
 * Debug test to identify Claude SDK Analytics loading issue
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RealAnalytics from '../components/RealAnalytics';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    getSystemMetrics: vi.fn().mockResolvedValue({
      data: [{
        timestamp: new Date().toISOString(),
        server_id: 'main-server',
        cpu_usage: 45,
        memory_usage: 65,
        disk_usage: 50,
        network_io: { bytes_in: 0, bytes_out: 0, packets_in: 0, packets_out: 0 },
        response_time: 285,
        throughput: 100,
        error_rate: 0.5,
        active_connections: 42,
        queue_depth: 5,
        cache_hit_rate: 0.85,
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

describe('Claude SDK Analytics Debug Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any console errors before each test
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('should render without errors and show claude-sdk tab', async () => {
    const { container } = render(<RealAnalytics />);

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Check if the Claude SDK tab is present
    const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
    expect(claudeSDKTab).toBeInTheDocument();

    // Check if system tab is active by default
    const systemTab = screen.getByRole('tab', { name: /system analytics/i });
    expect(systemTab).toHaveAttribute('aria-selected', 'true');
    expect(claudeSDKTab).toHaveAttribute('aria-selected', 'false');

    // Log the initial state
    console.log('Initial render complete, tabs found');
  });

  it('should click claude-sdk tab and show loading state', async () => {
    render(<RealAnalytics />);

    // Wait for initial loading
    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });

    // Click the Claude SDK tab
    fireEvent.click(claudeSDKTab);

    // Check if tab becomes active
    await waitFor(() => {
      expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
    });

    // Look for loading state or content
    const loadingElement = screen.queryByTestId('claude-sdk-loading');
    const contentElement = screen.queryByText(/Claude Code SDK Analytics/i);

    console.log('Loading element found:', !!loadingElement);
    console.log('Content element found:', !!contentElement);

    // Should have either loading state or content
    expect(loadingElement || contentElement).toBeTruthy();
  });

  it('should show enhanced analytics content after tab switch', async () => {
    render(<RealAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
    fireEvent.click(claudeSDKTab);

    // Wait for lazy loading and content to appear
    await waitFor(() => {
      // Look for any of these potential indicators of content
      const hasHeader = screen.queryByText(/Claude Code SDK Analytics/i);
      const hasContent = screen.queryByText(/Cost Overview/i);
      const hasLoading = screen.queryByTestId('claude-sdk-loading');

      return hasHeader || hasContent || hasLoading;
    }, { timeout: 10000 });

    // Log what we found
    const allText = screen.getByTestId ?
      Array.from(document.querySelectorAll('*')).map(el => el.textContent).filter(Boolean).join(' ') :
      'Could not get all text';

    console.log('Content after tab switch:', allText.slice(0, 500));

    // Should have some content or loading state
    expect(
      screen.queryByText(/Claude Code SDK Analytics/i) ||
      screen.queryByText(/Cost Overview/i) ||
      screen.queryByTestId('claude-sdk-loading') ||
      screen.queryByText(/Loading/i)
    ).toBeTruthy();
  });
});