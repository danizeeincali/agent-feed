/**
 * TDD London School Tests - Claude Code Removal from RealSocialMediaFeed
 *
 * This test suite follows the London School TDD approach with:
 * - Outside-in development (starting with behavior)
 * - Mock-driven development (isolating units)
 * - Behavior verification (testing interactions)
 * - Contract definition through mock expectations
 *
 * RED-GREEN-REFACTOR Cycle:
 * 1. RED: Write failing tests that verify Claude Code is completely removed
 * 2. GREEN: Implement removal to make tests pass
 * 3. REFACTOR: Clean up code while keeping tests green
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RealSocialMediaFeed } from '../components/RealSocialMediaFeed';
import { apiService } from '../services/api';

// Mock dependencies using London School approach
vi.mock('../services/api', () => ({
  apiService: {
    getAgentPosts: vi.fn(),
    getFilteredPosts: vi.fn(),
    getFilterData: vi.fn(),
    getFilterStats: vi.fn(),
    savePost: vi.fn(),
    deletePost: vi.fn(),
    getPostComments: vi.fn(),
    createComment: vi.fn(),
    getFilterSuggestions: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
}));

// Mock other dependencies
vi.mock('../components/FilterPanel', () => ({
  default: ({ onFilterChange }: any) => (
    <div data-testid="filter-panel">
      <button onClick={() => onFilterChange({ type: 'all' })}>Filter</button>
    </div>
  ),
}));

vi.mock('../components/EnhancedPostingInterface', () => ({
  EnhancedPostingInterface: () => <div data-testid="posting-interface" />,
}));

vi.mock('../StreamingTickerWorking', () => ({
  default: () => <div data-testid="streaming-ticker" />,
}));

// Mock console methods to capture errors
const consoleSpy = {
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
};

describe('TDD London School: Claude Code Removal from RealSocialMediaFeed', () => {
  // Mock API responses for successful component rendering
  const mockPosts = [
    {
      id: '1',
      title: 'Test Post',
      content: 'Test content',
      authorAgent: 'TestAgent',
      publishedAt: new Date().toISOString(),
      engagement: { comments: 0, saves: 0, isSaved: false },
      tags: ['test'],
      metadata: { businessImpact: 75 },
    },
  ];

  const mockApiService = apiService as any;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    consoleSpy.error.mockClear();
    consoleSpy.warn.mockClear();
    consoleSpy.log.mockClear();

    // Setup default mock responses for component to render successfully
    mockApiService.getAgentPosts.mockResolvedValue({
      success: true,
      data: mockPosts,
      total: 1,
    });
    mockApiService.getFilterData.mockResolvedValue({
      agents: ['TestAgent'],
      hashtags: ['test'],
    });
    mockApiService.getFilterStats.mockResolvedValue({
      savedPosts: 0,
      myPosts: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Claude Code Button Removal', () => {
    it('should NOT render Claude Code button in header', async () => {
      // ARRANGE: Render the component
      render(<RealSocialMediaFeed />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // ACT & ASSERT: Verify Claude Code button is not present
      const claudeButton = screen.queryByText(/Claude Code/i);
      expect(claudeButton).not.toBeInTheDocument();

      // Also check by role and data-testid
      const claudeButtonByRole = screen.queryByRole('button', { name: /Claude Code/i });
      expect(claudeButtonByRole).not.toBeInTheDocument();

      // Check for any button containing 'Claude' or 'Code'
      const buttonsWithClaude = screen.queryAllByRole('button').filter(button =>
        button.textContent?.toLowerCase().includes('claude') ||
        button.textContent?.toLowerCase().includes('code')
      );
      expect(buttonsWithClaude).toHaveLength(0);
    });

    it('should only have Refresh button in header actions', async () => {
      // ARRANGE: Render the component
      render(<RealSocialMediaFeed />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // ACT & ASSERT: Verify only Refresh button exists
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();

      // Count buttons in the header actions area (the right side with flex space-x-2)
      const headerActionsDiv = screen.getByText('Refresh').closest('div');
      const headerButtons = headerActionsDiv ?
        Array.from(headerActionsDiv.querySelectorAll('button')) : [];

      // Should only have the Refresh button
      expect(headerButtons).toHaveLength(1);
      expect(headerButtons[0]).toHaveTextContent(/refresh/i);
    });
  });

  describe('Claude Code State Variables Removal', () => {
    it('should not have claudeMessage state affecting component behavior', async () => {
      // ARRANGE: Render component and get its instance
      const { container } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // ACT & ASSERT: Check that no input fields related to Claude Code exist
      const claudeInputs = container.querySelectorAll('input[placeholder*="Claude" i], input[placeholder*="Code" i]');
      expect(claudeInputs).toHaveLength(0);

      // Check that no elements with Claude-related data attributes exist
      const claudeElements = container.querySelectorAll('[data-testid*="claude" i], [class*="claude" i]');
      expect(claudeElements).toHaveLength(0);
    });

    it('should not have claudeLoading state causing UI loading states', async () => {
      // ARRANGE: Render component
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // ACT & ASSERT: Check for any Claude-related loading indicators
      const loadingElements = screen.queryAllByText(/executing tools/i, /claude.*loading/i);
      expect(loadingElements).toHaveLength(0);

      // Check for spinning indicators related to Claude
      const spinningElements = screen.queryAllByText(/⏳/);
      expect(spinningElements).toHaveLength(0);
    });

    it('should not have showClaudeCode state affecting component structure', async () => {
      // ARRANGE: Mock component spy to track state changes
      const { container } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // ACT & ASSERT: Verify no Claude Code toggle affects layout
      // The component should render consistently without state-dependent Claude Code sections
      const gridContainer = container.querySelector('.grid.grid-cols-1.lg\\:grid-cols-3');
      expect(gridContainer).toBeInTheDocument();

      // Should have 2 main sections: feed and sidebar (no Claude Code section)
      const mainSections = gridContainer?.children;
      expect(mainSections).toHaveLength(2); // Feed column + Sidebar column
    });
  });

  describe('sendToClaudeCode Function Removal', () => {
    it('should not have any function calls to sendToClaudeCode', async () => {
      // ARRANGE: Spy on fetch to catch any Claude Code API calls
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'response' }),
      } as Response);

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // ACT: Simulate various user interactions that might trigger Claude Code calls
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockApiService.getAgentPosts).toHaveBeenCalled();
      });

      // ASSERT: No fetch calls to Claude Code endpoints should be made
      const claudeCodeCalls = fetchSpy.mock.calls.filter(call =>
        call[0] && String(call[0]).includes('claude-code')
      );
      expect(claudeCodeCalls).toHaveLength(0);

      fetchSpy.mockRestore();
    });

    it('should not respond to Enter key events for Claude Code input', async () => {
      // ARRANGE: Render component
      const { container } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // ACT: Try to find any inputs that might respond to Claude Code commands
      const allInputs = container.querySelectorAll('input, textarea');

      // ASSERT: No inputs should be related to Claude Code functionality
      allInputs.forEach(input => {
        const placeholder = input.getAttribute('placeholder') || '';
        const className = input.getAttribute('class') || '';

        expect(placeholder.toLowerCase()).not.toContain('claude');
        expect(placeholder.toLowerCase()).not.toContain('ask claude code');
        expect(className.toLowerCase()).not.toContain('claude');
      });
    });
  });

  describe('Claude Code UI Panel Removal', () => {
    it('should not render Claude Code interface panel', async () => {
      // ARRANGE: Render component
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // ACT & ASSERT: Check for Claude Code UI elements
      const claudeHeaders = screen.queryAllByText(/Claude Code SDK/i, /🤖 Claude Code/i);
      expect(claudeHeaders).toHaveLength(0);

      // Check for Claude Code specific text
      const claudeText = screen.queryByText(/Real file system access & tool execution/i);
      expect(claudeText).not.toBeInTheDocument();

      // Check for Claude Code input placeholder
      const claudeInput = screen.queryByPlaceholderText(/Ask Claude Code to work with files/i);
      expect(claudeInput).not.toBeInTheDocument();
    });

    it('should not have conditional rendering based on showClaudeCode', async () => {
      // ARRANGE: Render component and check layout structure
      const { container } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // ACT & ASSERT: Check sidebar structure
      const sidebar = container.querySelector('.lg\\:col-span-1');
      expect(sidebar).toBeInTheDocument();

      // Should only contain StreamingTicker, not Claude Code interface
      const sidebarChildren = sidebar?.children;
      expect(sidebarChildren).toHaveLength(1); // Only StreamingTicker container

      // Verify StreamingTicker is present
      expect(screen.getByTestId('streaming-ticker')).toBeInTheDocument();
    });

    it('should not have chat message history UI', async () => {
      // ARRANGE: Render component
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // ACT & ASSERT: Check for chat-related UI elements
      const chatMessages = screen.queryAllByText(/You/, /🤖 Claude Code/);
      expect(chatMessages).toHaveLength(0);

      // Check for message history container
      const messageContainers = screen.queryAllByText(/Send a message to Claude Code/i);
      expect(messageContainers).toHaveLength(0);

      // Check for working directory display
      const workingDirText = screen.queryByText(/Working directory:/i);
      expect(workingDirText).not.toBeInTheDocument();
    });
  });

  describe('Console Error Prevention', () => {
    it('should not produce console errors related to Claude Code functionality', async () => {
      // ARRANGE: Clear console spies
      consoleSpy.error.mockClear();
      consoleSpy.warn.mockClear();

      // ACT: Render component and perform common interactions
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // Simulate user interactions
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockApiService.getAgentPosts).toHaveBeenCalled();
      });

      // ASSERT: No console errors should mention Claude Code
      const consoleErrors = consoleSpy.error.mock.calls;
      const consoleWarnings = consoleSpy.warn.mock.calls;

      const claudeRelatedErrors = [...consoleErrors, ...consoleWarnings].filter(call =>
        call.some(arg =>
          String(arg).toLowerCase().includes('claude') ||
          String(arg).toLowerCase().includes('sendtoclaudecode') ||
          String(arg).toLowerCase().includes('claudemessage')
        )
      );

      expect(claudeRelatedErrors).toHaveLength(0);
    });

    it('should not have undefined function calls related to Claude Code', async () => {
      // ARRANGE: Mock window.onerror to catch runtime errors
      const errorSpy = vi.fn();
      window.addEventListener('error', errorSpy);

      // ACT: Render component
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // Let the component fully mount and execute
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT: No JavaScript errors should occur
      expect(errorSpy).not.toHaveBeenCalled();

      // Clean up
      window.removeEventListener('error', errorSpy);
    });
  });

  describe('Behavior Verification - Component Functionality', () => {
    it('should maintain all original functionality without Claude Code features', async () => {
      // ARRANGE: Render component
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // ACT & ASSERT: Verify core functionality still works

      // 1. Header should render correctly
      expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      expect(screen.getByText('Real-time posts from production agents')).toBeInTheDocument();

      // 2. Refresh functionality should work
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();

      // 3. Filter panel should be present
      expect(screen.getByTestId('filter-panel')).toBeInTheDocument();

      // 4. Enhanced posting interface should be present
      expect(screen.getByTestId('posting-interface')).toBeInTheDocument();

      // 5. Streaming ticker should be present
      expect(screen.getByTestId('streaming-ticker')).toBeInTheDocument();
    });

    it('should have clean grid layout without Claude Code column', async () => {
      // ARRANGE: Render component
      const { container } = render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // ACT & ASSERT: Verify layout structure
      const gridContainer = container.querySelector('.max-w-7xl.mx-auto.grid.grid-cols-1.lg\\:grid-cols-3');
      expect(gridContainer).toBeInTheDocument();

      // Should have main feed (col-span-2) and sidebar (col-span-1)
      const mainFeed = container.querySelector('.lg\\:col-span-2');
      const sidebar = container.querySelector('.lg\\:col-span-1');

      expect(mainFeed).toBeInTheDocument();
      expect(sidebar).toBeInTheDocument();

      // Sidebar should only contain StreamingTicker
      const sidebarContent = sidebar?.textContent || '';
      expect(sidebarContent).toContain('Live Tool Execution');
      expect(sidebarContent).not.toContain('Claude Code SDK');
    });
  });

  describe('Contract Verification - API Interactions', () => {
    it('should only make expected API calls without Claude Code endpoints', async () => {
      // ARRANGE: Track all API service calls
      const apiCallTracker = {
        getAgentPosts: mockApiService.getAgentPosts,
        getFilterData: mockApiService.getFilterData,
        getFilterStats: mockApiService.getFilterStats,
      };

      render(<RealSocialMediaFeed />);

      // ACT: Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // ASSERT: Verify expected API calls were made
      expect(apiCallTracker.getAgentPosts).toHaveBeenCalledWith(20, 0);
      expect(apiCallTracker.getFilterData).toHaveBeenCalled();
      expect(apiCallTracker.getFilterStats).toHaveBeenCalledWith('anonymous');

      // Verify no unexpected calls to Claude Code related endpoints
      const allCalls = Object.entries(mockApiService).filter(([key, value]) =>
        vi.isMockFunction && vi.isMockFunction(value) && (value as any).mock.calls.length > 0
      );

      const claudeCodeCalls = allCalls.filter(([key]) =>
        key.toLowerCase().includes('claude') || key.toLowerCase().includes('code')
      );

      expect(claudeCodeCalls).toHaveLength(0);
    });
  });
});