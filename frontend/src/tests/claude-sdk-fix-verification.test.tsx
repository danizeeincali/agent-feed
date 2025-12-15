/**
 * Verification test for Claude SDK Analytics fix
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
        cache_hit_rate: 0.85
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

describe('Claude SDK Analytics Fix Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show Claude SDK Analytics content when tab is clicked', async () => {
    render(<RealAnalytics />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Click Claude SDK tab
    const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
    fireEvent.click(claudeSDKTab);

    // Should show loading first
    expect(screen.getByText(/Loading Claude SDK Analytics/i)).toBeInTheDocument();

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText(/Claude Code SDK Analytics/i)).toBeInTheDocument();
    }, { timeout: 15000 });

    // Should show the analytics content
    expect(screen.getByText(/Cost Analytics Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Real-time Claude Code SDK cost tracking/i)).toBeInTheDocument();
  });

  it('should show tabs within the analytics page', async () => {
    render(<RealAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    const claudeSDKTab = screen.getByRole('tab', { name: /claude sdk analytics/i });
    fireEvent.click(claudeSDKTab);

    await waitFor(() => {
      expect(screen.getByText(/Claude Code SDK Analytics/i)).toBeInTheDocument();
    }, { timeout: 15000 });

    // Should show the internal tabs
    expect(screen.getByText(/Cost Overview/i)).toBeInTheDocument();
    expect(screen.getByText(/Messages & Steps/i)).toBeInTheDocument();
    expect(screen.getByText(/Optimization/i)).toBeInTheDocument();
    expect(screen.getByText(/Export & Reports/i)).toBeInTheDocument();
  });
});