/**
 * EnhancedPostingInterface Component Test Suite
 * TDD London School Approach with comprehensive mocks and stubs
 *
 * Test Categories:
 * 1. Component Rendering & Tab Navigation
 * 2. Props Validation & Default Values
 * 3. Tab Content Switching
 * 4. Quick Post Functionality
 * 5. Post Creator Integration
 * 6. Avi DM Integration
 * 7. State Management & Callbacks
 * 8. Error Handling & Edge Cases
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { EnhancedPostingInterface } from '../EnhancedPostingInterface';

// Mock child components
jest.mock('../PostCreator', () => {
  return {
    PostCreator: ({ onPostCreated, className }: any) => (
      <div data-testid="post-creator" className={className}>
        Mock Post Creator
        <button onClick={() => onPostCreated?.({ id: 'test-post', content: 'Test post' })}>
          Create Post
        </button>
      </div>
    )
  };
});

jest.mock('../MentionInput', () => {
  return {
    MentionInput: ({ value, onChange, onMentionSelect, placeholder, className, rows, maxLength, mentionContext }: any) => (
      <textarea
        data-testid="mention-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        rows={rows}
        maxLength={maxLength}
        data-mention-context={mentionContext}
      />
    ),
    MentionSuggestion: {} as any
  };
});

jest.mock('./posting-interface/AviDirectChatSDK', () => {
  return {
    AviDirectChatSDK: ({ onMessageSent, className, isLoading }: any) => (
      <div data-testid="avi-direct-chat-sdk" className={className} data-loading={isLoading}>
        Mock Avi Direct Chat SDK
        <button onClick={() => onMessageSent?.({ id: 'test-message', content: 'Test message' })}>
          Send Message
        </button>
      </div>
    )
  };
});

jest.mock('../utils/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

// Mock fetch for quick post functionality
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('EnhancedPostingInterface Component', () => {
  const defaultProps = {
    className: 'test-class',
    onPostCreated: jest.fn(),
    isLoading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Component Rendering & Tab Navigation', () => {
    test('renders with default props', () => {
      render(<EnhancedPostingInterface />);

      expect(screen.getByRole('tablist', { name: /posting tabs/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /quick post/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /post/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /avi dm/i })).toBeInTheDocument();
    });

    test('applies custom className', () => {
      render(<EnhancedPostingInterface className="custom-class" />);

      const container = screen.getByRole('tablist').closest('div');
      expect(container).toHaveClass('custom-class');
    });

    test('defaults to quick post tab', () => {
      render(<EnhancedPostingInterface />);

      const quickTab = screen.getByRole('tab', { name: /quick post/i });
      expect(quickTab).toHaveAttribute('aria-selected', 'true');
      expect(quickTab).toHaveClass('border-blue-500', 'text-blue-600');
    });

    test('renders all tab icons and labels', () => {
      render(<EnhancedPostingInterface />);

      expect(screen.getByText('Quick Post')).toBeInTheDocument();
      expect(screen.getByText('Post')).toBeInTheDocument();
      expect(screen.getByText('Avi DM')).toBeInTheDocument();

      // Check for descriptions
      expect(screen.getByTitle('One-line posting')).toBeInTheDocument();
      expect(screen.getByTitle('Full post creator')).toBeInTheDocument();
      expect(screen.getByTitle('Chat with Avi')).toBeInTheDocument();
    });

    test('handles tab switching via keyboard', async () => {
      render(<EnhancedPostingInterface />);

      const quickTab = screen.getByRole('tab', { name: /quick post/i });
      const postTab = screen.getByRole('tab', { name: /post/i });

      // Focus and use arrow keys
      quickTab.focus();
      await userEvent.keyboard('{ArrowRight}');

      expect(postTab).toHaveFocus();
    });

    test('switches tabs when clicked', async () => {
      render(<EnhancedPostingInterface />);

      const quickTab = screen.getByRole('tab', { name: /quick post/i });
      const postTab = screen.getByRole('tab', { name: /post/i });
      const aviTab = screen.getByRole('tab', { name: /avi dm/i });

      // Switch to post tab
      await userEvent.click(postTab);
      expect(postTab).toHaveAttribute('aria-selected', 'true');
      expect(quickTab).toHaveAttribute('aria-selected', 'false');

      // Switch to avi tab
      await userEvent.click(aviTab);
      expect(aviTab).toHaveAttribute('aria-selected', 'true');
      expect(postTab).toHaveAttribute('aria-selected', 'false');

      // Switch back to quick tab
      await userEvent.click(quickTab);
      expect(quickTab).toHaveAttribute('aria-selected', 'true');
      expect(aviTab).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('Props Validation & Default Values', () => {
    test('handles undefined props gracefully', () => {
      render(<EnhancedPostingInterface />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    test('passes isLoading prop to AviDirectChatSDK', async () => {
      render(<EnhancedPostingInterface isLoading={true} />);

      const aviTab = screen.getByRole('tab', { name: /avi dm/i });
      await userEvent.click(aviTab);

      const aviSDK = screen.getByTestId('avi-direct-chat-sdk');
      expect(aviSDK).toHaveAttribute('data-loading', 'true');
    });

    test('defaults isLoading to false', async () => {
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('tab', { name: /avi dm/i });
      await userEvent.click(aviTab);

      const aviSDK = screen.getByTestId('avi-direct-chat-sdk');
      expect(aviSDK).toHaveAttribute('data-loading', 'false');
    });

    test('calls onPostCreated callback when provided', async () => {
      const onPostCreated = jest.fn();
      render(<EnhancedPostingInterface onPostCreated={onPostCreated} />);

      const postTab = screen.getByRole('tab', { name: /post/i });
      await userEvent.click(postTab);

      const createButton = screen.getByText('Create Post');
      await userEvent.click(createButton);

      expect(onPostCreated).toHaveBeenCalledWith({ id: 'test-post', content: 'Test post' });
    });
  });

  describe('Tab Content Switching', () => {
    test('shows quick post content by default', () => {
      render(<EnhancedPostingInterface />);

      expect(screen.getByText('Quick Post')).toBeInTheDocument();
      expect(screen.getByText('Share a quick thought or update')).toBeInTheDocument();
      expect(screen.getByTestId('mention-input')).toBeInTheDocument();
    });

    test('shows post creator when post tab selected', async () => {
      render(<EnhancedPostingInterface />);

      const postTab = screen.getByRole('tab', { name: /post/i });
      await userEvent.click(postTab);

      expect(screen.getByTestId('post-creator')).toBeInTheDocument();
      expect(screen.queryByTestId('mention-input')).not.toBeInTheDocument();
      expect(screen.queryByTestId('avi-direct-chat-sdk')).not.toBeInTheDocument();
    });

    test('shows avi chat when avi tab selected', async () => {
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('tab', { name: /avi dm/i });
      await userEvent.click(aviTab);

      expect(screen.getByTestId('avi-direct-chat-sdk')).toBeInTheDocument();
      expect(screen.queryByTestId('mention-input')).not.toBeInTheDocument();
      expect(screen.queryByTestId('post-creator')).not.toBeInTheDocument();
    });

    test('maintains component state when switching tabs', async () => {
      render(<EnhancedPostingInterface />);

      // Type in quick post
      const quickTextarea = screen.getByTestId('mention-input');
      await userEvent.type(quickTextarea, 'Quick post content');

      // Switch to post tab and back
      const postTab = screen.getByRole('tab', { name: /post/i });
      const quickTab = screen.getByRole('tab', { name: /quick post/i });

      await userEvent.click(postTab);
      await userEvent.click(quickTab);

      // Content should be preserved
      expect(screen.getByTestId('mention-input')).toHaveValue('Quick post content');
    });

    test('passes correct props to child components', async () => {
      const onPostCreated = jest.fn();
      render(<EnhancedPostingInterface onPostCreated={onPostCreated} />);

      // Test PostCreator props
      const postTab = screen.getByRole('tab', { name: /post/i });
      await userEvent.click(postTab);

      const postCreator = screen.getByTestId('post-creator');
      expect(postCreator).toHaveClass('border-0', 'shadow-none');

      // Test AviDirectChatSDK props
      const aviTab = screen.getByRole('tab', { name: /avi dm/i });
      await userEvent.click(aviTab);

      const aviSDK = screen.getByTestId('avi-direct-chat-sdk');
      expect(aviSDK).toHaveClass('h-96');
    });
  });

  describe('Quick Post Functionality', () => {
    test('renders quick post form elements', () => {
      render(<EnhancedPostingInterface />);

      expect(screen.getByText('Quick Post')).toBeInTheDocument();
      expect(screen.getByText('Share a quick thought or update')).toBeInTheDocument();
      expect(screen.getByTestId('mention-input')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /quick post/i })).toBeInTheDocument();
    });

    test('shows character count', async () => {
      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');
      expect(screen.getByText('0/500 characters')).toBeInTheDocument();

      await userEvent.type(textarea, 'Hello world');
      expect(screen.getByText('11/500 characters')).toBeInTheDocument();
    });

    test('enables submit button when content entered', async () => {
      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = screen.getByRole('button', { name: /quick post/i });

      expect(submitButton).toBeDisabled();

      await userEvent.type(textarea, 'Test content');
      expect(submitButton).not.toBeDisabled();

      await userEvent.clear(textarea);
      expect(submitButton).toBeDisabled();
    });

    test('submits quick post with correct API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'post-123', content: 'Test post' } })
      });

      const onPostCreated = jest.fn();
      render(<EnhancedPostingInterface onPostCreated={onPostCreated} />);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = screen.getByRole('button', { name: /quick post/i });

      await userEvent.type(textarea, 'This is a test post');
      await userEvent.click(submitButton);

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/agent-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'This is a test post',
          content: 'This is a test post',
          author_agent: 'user-agent',
          metadata: {
            businessImpact: 5,
            tags: [],
            isAgentResponse: false,
            postType: 'quick',
            wordCount: 5,
            readingTime: 1
          }
        })
      });

      await waitFor(() => {
        expect(onPostCreated).toHaveBeenCalledWith({ id: 'post-123', content: 'Test post' });
      });
    });

    test('generates correct title for long content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} })
      });

      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = screen.getByRole('button', { name: /quick post/i });

      const longContent = 'This is a very long post content that exceeds fifty characters';
      await userEvent.type(textarea, longContent);
      await userEvent.click(submitButton);

      const expectedTitle = longContent.slice(0, 50) + '...';
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/agent-posts',
        expect.objectContaining({
          body: expect.stringContaining(`"title":"${expectedTitle}"`)
        })
      );
    });

    test('calculates word count correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} })
      });

      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = screen.getByRole('button', { name: /quick post/i });

      await userEvent.type(textarea, 'One two three four five');
      await userEvent.click(submitButton);

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/agent-posts',
        expect.objectContaining({
          body: expect.stringContaining('"wordCount":5')
        })
      );
    });

    test('handles API error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = screen.getByRole('button', { name: /quick post/i });

      await userEvent.type(textarea, 'Test post');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to create quick post:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    test('shows loading state during submission', async () => {
      mockFetch.mockImplementationOnce(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ data: {} })
          }), 100)
        )
      );

      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = screen.getByRole('button', { name: /quick post/i });

      await userEvent.type(textarea, 'Test post');
      await userEvent.click(submitButton);

      expect(screen.getByText('Posting...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByText('Quick Post')).toBeInTheDocument();
      });
    });

    test('clears form after successful submission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} })
      });

      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = screen.getByRole('button', { name: /quick post/i });

      await userEvent.type(textarea, 'Test post');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    test('handles mention input correctly', async () => {
      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');

      expect(textarea).toHaveAttribute('data-mention-context', 'quick-post');
      expect(textarea).toHaveAttribute('maxLength', '500');
      expect(textarea).toHaveAttribute('rows', '3');
      expect(textarea).toHaveAttribute('placeholder', "What's on your mind? (One line works great!)");
    });

    test('handles form submission via Enter key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} })
      });

      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');
      await userEvent.type(textarea, 'Test post');
      await userEvent.keyboard('{Enter}');

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Post Creator Integration', () => {
    test('renders PostCreator with correct props', async () => {
      const onPostCreated = jest.fn();
      render(<EnhancedPostingInterface onPostCreated={onPostCreated} />);

      const postTab = screen.getByRole('tab', { name: /post/i });
      await userEvent.click(postTab);

      const postCreator = screen.getByTestId('post-creator');
      expect(postCreator).toBeInTheDocument();
      expect(postCreator).toHaveClass('border-0', 'shadow-none');
    });

    test('forwards onPostCreated callback to PostCreator', async () => {
      const onPostCreated = jest.fn();
      render(<EnhancedPostingInterface onPostCreated={onPostCreated} />);

      const postTab = screen.getByRole('tab', { name: /post/i });
      await userEvent.click(postTab);

      const createButton = screen.getByText('Create Post');
      await userEvent.click(createButton);

      expect(onPostCreated).toHaveBeenCalledWith({ id: 'test-post', content: 'Test post' });
    });
  });

  describe('Avi DM Integration', () => {
    test('renders AviDirectChatSDK with correct props', async () => {
      const onPostCreated = jest.fn();
      render(<EnhancedPostingInterface onPostCreated={onPostCreated} isLoading={true} />);

      const aviTab = screen.getByRole('tab', { name: /avi dm/i });
      await userEvent.click(aviTab);

      const aviSDK = screen.getByTestId('avi-direct-chat-sdk');
      expect(aviSDK).toBeInTheDocument();
      expect(aviSDK).toHaveClass('h-96');
      expect(aviSDK).toHaveAttribute('data-loading', 'true');
    });

    test('forwards onPostCreated as onMessageSent to AviDirectChatSDK', async () => {
      const onPostCreated = jest.fn();
      render(<EnhancedPostingInterface onPostCreated={onPostCreated} />);

      const aviTab = screen.getByRole('tab', { name: /avi dm/i });
      await userEvent.click(aviTab);

      const sendButton = screen.getByText('Send Message');
      await userEvent.click(sendButton);

      expect(onPostCreated).toHaveBeenCalledWith({ id: 'test-message', content: 'Test message' });
    });
  });

  describe('State Management & Callbacks', () => {
    test('maintains independent state for each tab', async () => {
      render(<EnhancedPostingInterface />);

      // Add content to quick post
      const quickTextarea = screen.getByTestId('mention-input');
      await userEvent.type(quickTextarea, 'Quick content');

      // Switch to post tab and back
      const postTab = screen.getByRole('tab', { name: /post/i });
      const quickTab = screen.getByRole('tab', { name: /quick post/i });

      await userEvent.click(postTab);
      await userEvent.click(quickTab);

      // Quick post content should be preserved
      expect(screen.getByTestId('mention-input')).toHaveValue('Quick content');
    });

    test('calls onPostCreated from any tab', async () => {
      const onPostCreated = jest.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'quick-post' } })
      });

      render(<EnhancedPostingInterface onPostCreated={onPostCreated} />);

      // Test quick post callback
      const textarea = screen.getByTestId('mention-input');
      const submitButton = screen.getByRole('button', { name: /quick post/i });

      await userEvent.type(textarea, 'Test');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onPostCreated).toHaveBeenCalled();
      });

      onPostCreated.mockClear();

      // Test post creator callback
      const postTab = screen.getByRole('tab', { name: /post/i });
      await userEvent.click(postTab);

      const createButton = screen.getByText('Create Post');
      await userEvent.click(createButton);

      expect(onPostCreated).toHaveBeenCalled();

      onPostCreated.mockClear();

      // Test Avi DM callback
      const aviTab = screen.getByRole('tab', { name: /avi dm/i });
      await userEvent.click(aviTab);

      const sendButton = screen.getByText('Send Message');
      await userEvent.click(sendButton);

      expect(onPostCreated).toHaveBeenCalled();
    });
  });

  describe('Error Handling & Edge Cases', () => {
    test('handles missing onPostCreated callback gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} })
      });

      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = screen.getByRole('button', { name: /quick post/i });

      await userEvent.type(textarea, 'Test');
      await userEvent.click(submitButton);

      // Should not throw error
      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    test('handles empty content submission', async () => {
      render(<EnhancedPostingInterface />);

      const submitButton = screen.getByRole('button', { name: /quick post/i });

      // Button should be disabled for empty content
      expect(submitButton).toBeDisabled();

      // Clicking disabled button should not trigger API call
      await userEvent.click(submitButton);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('handles whitespace-only content', async () => {
      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = screen.getByRole('button', { name: /quick post/i });

      await userEvent.type(textarea, '   ');
      expect(submitButton).toBeDisabled();
    });

    test('handles API response without data field', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      });

      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = screen.getByRole('button', { name: /quick post/i });

      await userEvent.type(textarea, 'Test');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    test('prevents double submission', async () => {
      mockFetch.mockImplementationOnce(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ data: {} })
          }), 100)
        )
      );

      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = screen.getByRole('button', { name: /quick post/i });

      await userEvent.type(textarea, 'Test');
      await userEvent.click(submitButton);
      await userEvent.click(submitButton); // Second click

      // Should only be called once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility & ARIA', () => {
    test('has proper ARIA attributes', () => {
      render(<EnhancedPostingInterface />);

      const tablist = screen.getByRole('tablist', { name: /posting tabs/i });
      expect(tablist).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    test('supports keyboard navigation', async () => {
      render(<EnhancedPostingInterface />);

      const quickTab = screen.getByRole('tab', { name: /quick post/i });
      const postTab = screen.getByRole('tab', { name: /post/i });

      quickTab.focus();
      await userEvent.keyboard('{ArrowRight}');

      expect(postTab).toHaveFocus();
    });

    test('maintains focus management', async () => {
      render(<EnhancedPostingInterface />);

      const quickTab = screen.getByRole('tab', { name: /quick post/i });
      await userEvent.click(quickTab);

      expect(quickTab).toHaveAttribute('aria-selected', 'true');
    });
  });
});