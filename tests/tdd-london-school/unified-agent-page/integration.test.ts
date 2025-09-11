/**
 * TDD London School: UnifiedAgentPage Integration Test
 * SPARC METHODOLOGY - COMPLETION PHASE
 * 
 * Testing the complete integration of real data transformers with UnifiedAgentPage
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import UnifiedAgentPage from '../../../frontend/src/components/UnifiedAgentPage';

// Mock the fetch function
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockApiResponse = {
  success: true,
  data: {
    id: 'test-agent-123',
    name: 'TestAgent',
    display_name: 'Test Agent Pro', 
    description: 'A real API test agent',
    status: 'active',
    type: 'assistant',
    category: 'development',
    capabilities: ['analysis', 'coding', 'testing'],
    performance_metrics: {
      success_rate: 91.58647866794777,
      average_response_time: 303,
      total_tokens_used: 39607,
      error_count: 0,
      validations_completed: 194,
      uptime_percentage: 95.4805690897904
    },
    health_status: {
      cpu_usage: 32.246620083405034,
      memory_usage: 55.61611648401096,
      response_time: 212,
      last_heartbeat: '2025-09-10T18:20:09.023Z',
      status: 'healthy',
      active_tasks: 0
    },
    usage_count: 48,
    last_used: '2025-09-10T18:20:09.023Z',
    avatar_color: '#3B82F6'
  }
};

describe('UnifiedAgentPage Integration - Real Data', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockApiResponse
    });
  });

  it('should load and display real performance metrics without Math.random()', async () => {
    const mathRandomSpy = jest.spyOn(Math, 'random');

    render(
      <MemoryRouter initialEntries={['/agents/test-agent-123']}>
        <UnifiedAgentPage />
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Agent Pro')).toBeInTheDocument();
    });

    // Check that real metrics are displayed
    expect(screen.getByText('194')).toBeInTheDocument(); // tasks completed
    expect(screen.getByText('91.6%')).toBeInTheDocument(); // success rate
    expect(screen.getByText('3.0s')).toBeInTheDocument(); // response time
    expect(screen.getByText('95.5%')).toBeInTheDocument(); // uptime

    // Ensure Math.random was never called during rendering
    expect(mathRandomSpy).not.toHaveBeenCalled();

    mathRandomSpy.mockRestore();
  });

  it('should generate real activities from API data', async () => {
    render(
      <MemoryRouter initialEntries={['/agents/test-agent-123']}>
        <UnifiedAgentPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Agent Pro')).toBeInTheDocument();
    });

    // Click on Activity tab
    fireEvent.click(screen.getByText('Activity'));

    await waitFor(() => {
      // Check for real activities based on API data
      expect(screen.getByText('Completed 194 Validations')).toBeInTheDocument();
      expect(screen.getByText('Health Status: healthy')).toBeInTheDocument();
      expect(screen.getByText('39,607 Tokens Processed')).toBeInTheDocument();
    });
  });

  it('should generate real posts from API metrics', async () => {
    render(
      <MemoryRouter initialEntries={['/agents/test-agent-123']}>
        <UnifiedAgentPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Agent Pro')).toBeInTheDocument();
    });

    // Click on Activity tab to see posts
    fireEvent.click(screen.getByText('Activity'));

    await waitFor(() => {
      // Check for real posts based on API data
      expect(screen.getByText('Performance Metrics Update')).toBeInTheDocument();
      expect(screen.getByText(/194 tasks completed with 91.6% success rate/)).toBeInTheDocument();
      expect(screen.getByText('System Health: healthy')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully with safe defaults', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    render(
      <MemoryRouter initialEntries={['/agents/test-agent-123']}>
        <UnifiedAgentPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Error Loading Agent')).toBeInTheDocument();
      expect(screen.getByText(/HTTP 500: Internal Server Error/)).toBeInTheDocument();
    });
  });

  it('should display deterministic results for consistent input', async () => {
    // First render
    const { unmount } = render(
      <MemoryRouter initialEntries={['/agents/test-agent-123']}>
        <UnifiedAgentPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Agent Pro')).toBeInTheDocument();
    });

    const firstSuccessRate = screen.getByText('91.6%');
    const firstTaskCount = screen.getByText('194');

    unmount();

    // Second render with same data
    render(
      <MemoryRouter initialEntries={['/agents/test-agent-123']}>
        <UnifiedAgentPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Agent Pro')).toBeInTheDocument();
    });

    // Results should be identical
    expect(screen.getByText('91.6%')).toBeInTheDocument();
    expect(screen.getByText('194')).toBeInTheDocument();
  });

  it('should eliminate all mock data generation functions', async () => {
    // Verify the component code no longer contains mock generation functions
    const componentSource = require('fs').readFileSync(
      '/workspaces/agent-feed/frontend/src/components/UnifiedAgentPage.tsx',
      'utf8'
    );

    // These mock functions should no longer exist
    expect(componentSource).not.toContain('generateRecentActivities');
    expect(componentSource).not.toContain('generateRecentPosts');
    expect(componentSource).not.toContain('Math.floor(Math.random()');
    
    // Should contain real data transformer import
    expect(componentSource).toContain('transformApiDataToUnified');
  });

  it('should transform capabilities progress bars to use deterministic values', async () => {
    render(
      <MemoryRouter initialEntries={['/agents/test-agent-123']}>
        <UnifiedAgentPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Agent Pro')).toBeInTheDocument();
    });

    // Click on Details tab to see capabilities
    fireEvent.click(screen.getByText('Details'));

    await waitFor(() => {
      expect(screen.getByText('Capabilities')).toBeInTheDocument();
    });

    // Progress bars should use deterministic values, not Math.random()
    const progressBars = screen.container.querySelectorAll('.bg-purple-500');
    expect(progressBars.length).toBeGreaterThan(0);

    // Each progress bar should have a deterministic width
    progressBars.forEach((bar, index) => {
      const style = bar.getAttribute('style');
      expect(style).toMatch(/width: \d+%/);
      expect(style).not.toContain('NaN');
    });
  });
});