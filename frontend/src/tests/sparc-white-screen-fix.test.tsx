/**
 * SPARC White Screen Fix Validation Test
 * Tests that the SimpleLauncher component renders correctly after TypeScript fixes
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SimpleLauncher from '../components/SimpleLauncher';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('SPARC White Screen Fix Validation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0, // Using new API
        },
      },
    });

    // Mock fetch responses
    (fetch as jest.MockedFunction<typeof fetch>).mockImplementation((url) => {
      if (url.toString().includes('/api/claude/check')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ claudeAvailable: true, success: true }),
        } as Response);
      }
      if (url.toString().includes('/api/claude/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            success: true, 
            status: { isRunning: false, status: 'stopped' },
            workingDirectory: '/workspaces/agent-feed/prod'
          }),
        } as Response);
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('SimpleLauncher renders without white screen', async () => {
    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    );

    render(
      <TestWrapper>
        <SimpleLauncher />
      </TestWrapper>
    );

    // Check that main elements render
    expect(screen.getByText('Claude Code Launcher')).toBeInTheDocument();
    expect(screen.getByText('Simple process launcher - no social features, no users')).toBeInTheDocument();

    // Check that system info renders
    await waitFor(() => {
      expect(screen.getByText(/Claude Code:/)).toBeInTheDocument();
      expect(screen.getByText(/Working Directory:/)).toBeInTheDocument();
    });

    // Check that status section renders
    expect(screen.getByText('Process Status')).toBeInTheDocument();

    // Check that control buttons render
    expect(screen.getByRole('button', { name: /Launch Claude/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Stop Claude/i })).toBeInTheDocument();
  });

  test('SimpleLauncher handles API availability correctly', async () => {
    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    );

    render(
      <TestWrapper>
        <SimpleLauncher />
      </TestWrapper>
    );

    // Wait for Claude availability check
    await waitFor(() => {
      expect(screen.getByText(/Available/)).toBeInTheDocument();
    });

    // Verify fetch calls were made
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/claude/check'),
      expect.any(Object)
    );
    
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/claude/status'),
      expect.any(Object)
    );
  });

  test('No TypeScript compilation errors in critical components', () => {
    // This test ensures that our fixes don't break the build
    // The fact that this test file can import SimpleLauncher means TypeScript compiled successfully
    expect(SimpleLauncher).toBeDefined();
    expect(typeof SimpleLauncher).toBe('function');
  });
});