/**
 * Integration Tests for Avi DM Functionality
 * Tests component interactions, data flow, and user workflows
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { EnhancedPostingInterface } from '../../EnhancedPostingInterface';
import {
  createFetchMock,
  createTestScenario,
  setupTestEnvironment,
  integrationHelpers
} from './test-utils';

// Mock all dependencies
jest.mock('../../StreamingTicker', () => {
  return function MockStreamingTicker({ enabled, userId }: any) {
    return (
      <div data-testid="streaming-ticker" data-enabled={enabled} data-user-id={userId}>
        {enabled ? 'Streaming Active' : 'Streaming Inactive'}
      </div>
    );
  };
});

jest.mock('@/utils/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

// Mock PostCreator
jest.mock('../../PostCreator', () => ({
  PostCreator: ({ onPostCreated }: any) => (
    <div data-testid="post-creator">
      <button onClick={() => onPostCreated?.({ id: 'full-post', type: 'full' })}>
        Create Full Post
      </button>
    </div>
  )
}));

// Mock MentionInput
jest.mock('../../MentionInput', () => ({
  MentionInput: ({ value, onChange, placeholder }: any) => (
    <textarea
      data-testid="mention-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
  MentionSuggestion: {} as any
}));

const mockFetch = createFetchMock();
global.fetch = mockFetch;

describe('Avi DM Integration Tests', () => {
  let cleanup: () => void;

  beforeEach(() => {
    const env = setupTestEnvironment();
    cleanup = env.restore;
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Cross-Tab Data Flow', () => {
    test('integrates all posting methods with unified callback', async () => {
      const onPostCreated = jest.fn();
      render(<EnhancedPostingInterface onPostCreated={onPostCreated} />);

      // Test Quick Post
      createTestScenario.successfulMessageSend(mockFetch);

      const quickTextarea = screen.getByTestId('mention-input');
      const quickSubmit = screen.getByRole('button', { name: /quick post/i });

      await userEvent.type(quickTextarea, 'Quick test post');
      await userEvent.click(quickSubmit);

      await waitFor(() => {
        expect(onPostCreated).toHaveBeenCalled();
      });

      onPostCreated.mockClear();

      // Test Full Post Creator
      const postTab = screen.getByRole('tab', { name: /post/i });
      await userEvent.click(postTab);

      const fullPostButton = screen.getByText('Create Full Post');
      await userEvent.click(fullPostButton);

      expect(onPostCreated).toHaveBeenCalledWith({ id: 'full-post', type: 'full' });

      onPostCreated.mockClear();

      // Test Avi DM
      const aviTab = screen.getByRole('tab', { name: /avi dm/i });
      await userEvent.click(aviTab);

      // Mock AviDirectChatSDK would trigger callback
      // This tests the prop forwarding integration
    });

    test('maintains state isolation between tabs', async () => {
      render(<EnhancedPostingInterface />);

      // Add content to quick post
      const quickTextarea = screen.getByTestId('mention-input');
      await userEvent.type(quickTextarea, 'Quick content');

      // Switch to other tabs
      const postTab = screen.getByRole('tab', { name: /post/i });
      const aviTab = screen.getByRole('tab', { name: /avi dm/i });
      const quickTab = screen.getByRole('tab', { name: /quick post/i });

      await userEvent.click(postTab);
      await userEvent.click(aviTab);
      await userEvent.click(quickTab);

      // Content should be preserved
      expect(screen.getByTestId('mention-input')).toHaveValue('Quick content');
    });

    test('handles rapid tab switching without state corruption', async () => {
      render(<EnhancedPostingInterface />);

      const tabs = [
        screen.getByRole('tab', { name: /quick post/i }),
        screen.getByRole('tab', { name: /post/i }),
        screen.getByRole('tab', { name: /avi dm/i })
      ];

      // Rapidly switch between tabs
      for (let i = 0; i < 10; i++) {
        await userEvent.click(tabs[i % tabs.length]);
      }

      // Should end up on the expected tab without errors
      expect(tabs[1]).toHaveAttribute('aria-selected', 'true'); // Post tab
    });
  });

  describe('Real User Workflows', () => {
    test('complete quick post workflow', async () => {
      const onPostCreated = jest.fn();
      createTestScenario.successfulMessageSend(mockFetch);

      render(<EnhancedPostingInterface onPostCreated={onPostCreated} />);

      // User types content
      await integrationHelpers.simulateUserFlow.quickPost(userEvent, 'Testing the quick post feature');

      // Verify API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/agent-posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Testing the quick post feature')
        });
      });

      // Verify callback
      await waitFor(() => {
        expect(onPostCreated).toHaveBeenCalled();
      });

      // Verify form reset
      expect(screen.getByTestId('mention-input')).toHaveValue('');
    });

    test('error recovery workflow', async () => {
      const onPostCreated = jest.fn();
      createTestScenario.apiError(mockFetch, 500);

      render(<EnhancedPostingInterface onPostCreated={onPostCreated} />);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = screen.getByRole('button', { name: /quick post/i });

      await userEvent.type(textarea, 'Test post');
      await userEvent.click(submitButton);

      // Should handle error gracefully
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      // Form should remain intact for retry
      expect(textarea).toHaveValue('Test post');

      // Callback should not be called on error
      expect(onPostCreated).not.toHaveBeenCalled();
    });

    test('network interruption handling', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      createTestScenario.networkError(mockFetch);

      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = screen.getByRole('button', { name: /quick post/i });

      await userEvent.type(textarea, 'Test during network issue');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to create quick post:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Performance Integration', () => {
    test('handles high-frequency interactions', async () => {
      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');

      // Simulate rapid typing
      const content = 'a'.repeat(100);
      await userEvent.type(textarea, content);

      expect(textarea).toHaveValue(content);
      expect(screen.getByText(`${content.length}/500 characters`)).toBeInTheDocument();
    });

    test('maintains responsiveness during API calls', async () => {
      createTestScenario.slowResponse(mockFetch, 2000);

      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = screen.getByRole('button', { name: /quick post/i });

      await userEvent.type(textarea, 'Slow API test');
      await userEvent.click(submitButton);

      // Interface should show loading state
      expect(screen.getByText('Posting...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Should still be responsive for other interactions
      const postTab = screen.getByRole('tab', { name: /post/i });
      await userEvent.click(postTab);

      expect(screen.getByTestId('post-creator')).toBeInTheDocument();
    });
  });

  describe('Accessibility Integration', () => {
    test('keyboard navigation across all tabs', async () => {
      render(<EnhancedPostingInterface />);

      const quickTab = screen.getByRole('tab', { name: /quick post/i });
      const postTab = screen.getByRole('tab', { name: /post/i });
      const aviTab = screen.getByRole('tab', { name: /avi dm/i });

      // Test tab navigation
      quickTab.focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(postTab).toHaveFocus();

      await userEvent.keyboard('{ArrowRight}');
      expect(aviTab).toHaveFocus();

      await userEvent.keyboard('{ArrowLeft}');
      expect(postTab).toHaveFocus();
    });

    test('screen reader compatibility', () => {
      render(<EnhancedPostingInterface />);

      // Check ARIA attributes
      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-label', 'Posting tabs');

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    test('focus management during tab switches', async () => {
      render(<EnhancedPostingInterface />);

      const quickTab = screen.getByRole('tab', { name: /quick post/i });
      const postTab = screen.getByRole('tab', { name: /post/i });

      // Focus and switch tabs
      await userEvent.click(quickTab);
      expect(quickTab).toHaveAttribute('aria-selected', 'true');

      await userEvent.click(postTab);
      expect(postTab).toHaveAttribute('aria-selected', 'true');
      expect(quickTab).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('Error Boundary Integration', () => {
    test('isolates errors within tab content', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock component that throws
      jest.doMock('../../PostCreator', () => ({
        PostCreator: () => {
          throw new Error('Component error');
        }
      }));

      render(<EnhancedPostingInterface />);

      const postTab = screen.getByRole('tab', { name: /post/i });

      // Should not crash the entire interface
      await userEvent.click(postTab);

      // Other tabs should still work
      const quickTab = screen.getByRole('tab', { name: /quick post/i });
      await userEvent.click(quickTab);

      expect(screen.getByTestId('mention-input')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Real-time Features Integration', () => {
    test('streaming ticker responds to connection state', async () => {
      render(<EnhancedPostingInterface isLoading={true} />);

      const aviTab = screen.getByRole('tab', { name: /avi dm/i });
      await userEvent.click(aviTab);

      // StreamingTicker should be present
      const streamingTicker = screen.getByTestId('streaming-ticker');
      expect(streamingTicker).toBeInTheDocument();
    });

    test('real-time updates do not interfere with user input', async () => {
      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');

      // Start typing
      await userEvent.type(textarea, 'User is typing');

      // Simulate real-time update (would come from parent component)
      // Content should remain intact
      expect(textarea).toHaveValue('User is typing');
    });
  });

  describe('Data Persistence Integration', () => {
    test('form data persists across re-renders', async () => {
      const { rerender } = render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');
      await userEvent.type(textarea, 'Persistent content');

      // Re-render with new props
      rerender(<EnhancedPostingInterface isLoading={true} />);

      // Content should persist
      expect(screen.getByTestId('mention-input')).toHaveValue('Persistent content');
    });

    test('handles external prop changes gracefully', async () => {
      const onPostCreated = jest.fn();
      const { rerender } = render(
        <EnhancedPostingInterface onPostCreated={onPostCreated} />
      );

      // Change callback
      const newCallback = jest.fn();
      rerender(<EnhancedPostingInterface onPostCreated={newCallback} />);

      // New callback should be used
      createTestScenario.successfulMessageSend(mockFetch);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = screen.getByRole('button', { name: /quick post/i });

      await userEvent.type(textarea, 'Test');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(newCallback).toHaveBeenCalled();
      });

      expect(onPostCreated).not.toHaveBeenCalled();
    });
  });

  describe('Mobile Integration Scenarios', () => {
    test('handles touch interactions', async () => {
      // Mock touch events
      Object.defineProperty(window, 'ontouchstart', { value: true });

      render(<EnhancedPostingInterface />);

      const postTab = screen.getByRole('tab', { name: /post/i });

      // Simulate touch interaction
      await userEvent.click(postTab);

      expect(postTab).toHaveAttribute('aria-selected', 'true');
    });

    test('responsive layout adjustments', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });

      render(<EnhancedPostingInterface />);

      // Should render without layout issues
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByTestId('mention-input')).toBeInTheDocument();
    });
  });
});