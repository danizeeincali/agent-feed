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
 * 9. NEW: Quick Post Interface Changes (TDD - TESTS FIRST)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi, describe, test, beforeEach, expect } from 'vitest';
import { EnhancedPostingInterface } from '../../../components/EnhancedPostingInterface';

// Mock child components
vi.mock('../../../components/PostCreator', () => {
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

vi.mock('../../../components/MentionInput', () => {
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

vi.mock('../../../components/AviTypingIndicator', () => {
  return {
    default: ({ isVisible, inline }: any) => (
      <div data-testid="avi-typing-indicator" data-visible={isVisible} data-inline={inline}>
        Typing...
      </div>
    )
  };
});

vi.mock('../../../components/markdown/MarkdownRenderer', () => {
  return {
    default: ({ content, className }: any) => (
      <div data-testid="markdown-renderer" className={className}>
        {content}
      </div>
    )
  };
});

vi.mock('../../../utils/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

// Mock fetch for quick post functionality
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper function to get the Quick Post submit button (not the tab button)
const getQuickPostSubmitButton = (container: HTMLElement | Document = document) => {
  const buttons = Array.from(container.querySelectorAll('button[type="submit"]'));
  return buttons.find(btn => btn.textContent?.includes('Quick Post')) as HTMLButtonElement;
};

// Helper function to get tab buttons specifically
const getQuickPostTab = () => {
  const allButtons = screen.getAllByRole('button');
  return allButtons.find(btn =>
    btn.textContent?.includes('Quick Post') &&
    btn.hasAttribute('aria-selected')
  ) as HTMLButtonElement;
};

describe('EnhancedPostingInterface Component', () => {
  const defaultProps = {
    className: 'test-class',
    onPostCreated: vi.fn(),
    isLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Component Rendering & Tab Navigation', () => {
    test('renders with default props', () => {
      render(<EnhancedPostingInterface />);

      expect(screen.getByRole('navigation', { name: /posting tabs/i })).toBeInTheDocument();
      expect(getQuickPostTab()).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /avi dm/i })).toBeInTheDocument();
    });

    test('applies custom className', () => {
      const { container } = render(<EnhancedPostingInterface className="custom-class" />);

      const wrapper = container.querySelector('.custom-class');
      expect(wrapper).toBeInTheDocument();
    });

    test('defaults to quick post tab', () => {
      render(<EnhancedPostingInterface />);

      const quickTab = getQuickPostTab();
      expect(quickTab).toBeDefined();
      expect(quickTab).toHaveAttribute('aria-selected', 'true');
      expect(quickTab).toHaveClass('border-blue-500', 'text-blue-600');
    });

    test('renders all tab icons and labels', () => {
      render(<EnhancedPostingInterface />);

      const quickPostElements = screen.getAllByText('Quick Post');
      expect(quickPostElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Avi DM')).toBeInTheDocument();
    });

    test('switches tabs when clicked', async () => {
      render(<EnhancedPostingInterface />);

      const quickTab = getQuickPostTab();
      const aviTab = screen.getByRole('button', { name: /avi dm/i });

      expect(quickTab).toBeDefined();

      // Switch to avi tab
      await userEvent.click(aviTab);
      expect(aviTab).toHaveAttribute('aria-selected', 'true');
      expect(quickTab).toHaveAttribute('aria-selected', 'false');

      // Switch back to quick tab
      await userEvent.click(quickTab!);
      expect(quickTab).toHaveAttribute('aria-selected', 'true');
      expect(aviTab).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('Props Validation & Default Values', () => {
    test('handles undefined props gracefully', () => {
      render(<EnhancedPostingInterface />);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    test('passes isLoading prop to Avi chat', async () => {
      render(<EnhancedPostingInterface isLoading={true} />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await userEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/type your message to λvi/i);
      expect(input).toBeDisabled();
    });

    test('defaults isLoading to false', async () => {
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await userEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/type your message to λvi/i);
      expect(input).not.toBeDisabled();
    });

    test('calls onPostCreated callback when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'test-post', content: 'Test post' } })
      });

      const onPostCreated = vi.fn();
      render(<EnhancedPostingInterface onPostCreated={onPostCreated} />);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = getQuickPostSubmitButton();

      await userEvent.type(textarea, 'Test post');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onPostCreated).toHaveBeenCalled();
      });
    });
  });

  describe('Tab Content Switching', () => {
    test('shows quick post content by default', () => {
      render(<EnhancedPostingInterface />);

      const quickPostElements = screen.getAllByText('Quick Post');
      expect(quickPostElements.length).toBeGreaterThan(0);
      expect(screen.getByTestId('mention-input')).toBeInTheDocument();
    });

    test('shows avi chat when avi tab selected', async () => {
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await userEvent.click(aviTab);

      expect(screen.getByText(/chat with λvi/i)).toBeInTheDocument();
      expect(screen.queryByTestId('mention-input')).not.toBeInTheDocument();
    });

    test('maintains component state when switching tabs', async () => {
      render(<EnhancedPostingInterface />);

      // Type in quick post
      const quickTextarea = screen.getByTestId('mention-input');
      await userEvent.type(quickTextarea, 'Quick post content');

      // Switch to avi tab and back
      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      const quickTab = getQuickPostTab();

      await userEvent.click(aviTab);
      await userEvent.click(quickTab!);

      // Content should be preserved
      expect(screen.getByTestId('mention-input')).toHaveValue('Quick post content');
    });
  });

  describe('Quick Post Functionality', () => {
    test('renders quick post form elements', () => {
      render(<EnhancedPostingInterface />);

      const quickPostElements = screen.getAllByText('Quick Post');
      expect(quickPostElements.length).toBeGreaterThan(0);
      expect(screen.getByTestId('mention-input')).toBeInTheDocument();
      expect(getQuickPostSubmitButton()).toBeInTheDocument();
    });

    test('shows character count only when approaching limit', async () => {
      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');

      // Character counter should NOT be visible for short content
      expect(screen.queryByText(/\/10,000 characters/)).not.toBeInTheDocument();

      // Paste content close to limit (using fireEvent for performance)
      const longContent = 'A'.repeat(9500);
      fireEvent.change(textarea, { target: { value: longContent } });

      // Now character counter SHOULD be visible
      expect(screen.getByText(/9,500\/10,000 characters/)).toBeInTheDocument();
    });

    test('enables submit button when content entered', async () => {
      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = getQuickPostSubmitButton();

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

      const onPostCreated = vi.fn();
      render(<EnhancedPostingInterface onPostCreated={onPostCreated} />);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = getQuickPostSubmitButton();

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
      const submitButton = getQuickPostSubmitButton();

      const longContent = 'This is a very long post content that exceeds fifty characters';
      fireEvent.change(textarea, { target: { value: longContent } });
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
      const submitButton = getQuickPostSubmitButton();

      await userEvent.type(textarea, 'One two three four five');
      await userEvent.click(submitButton);

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/agent-posts',
        expect.objectContaining({
          body: expect.stringContaining('"wordCount":5')
        })
      );
    });

    test('handles API error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = getQuickPostSubmitButton();

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
      const submitButton = getQuickPostSubmitButton();

      await userEvent.type(textarea, 'Test post');
      await userEvent.click(submitButton);

      expect(screen.getByText('Posting...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        const quickPostElements = screen.getAllByText('Quick Post');
        expect(quickPostElements.length).toBeGreaterThan(0);
      });
    });

    test('clears form after successful submission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} })
      });

      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = getQuickPostSubmitButton();

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
      expect(textarea).toHaveAttribute('maxLength', '10000');
      expect(textarea).toHaveAttribute('rows', '6');
      expect(textarea).toHaveAttribute('placeholder', "What's on your mind? Write as much as you need!");
    });
  });

  // Post Creator Integration tests removed - Post tab has been removed from UI
  // PostCreator component still exists but is not accessible via the UI tabs

  describe('Avi DM Integration', () => {
    test('renders Avi chat section with correct elements', async () => {
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await userEvent.click(aviTab);

      expect(screen.getByText(/chat with λvi/i)).toBeInTheDocument();
      expect(screen.getByText(/direct message with your chief of staff/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/type your message to λvi/i)).toBeInTheDocument();
    });

    test('displays empty chat state initially', async () => {
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await userEvent.click(aviTab);

      expect(screen.getByText(/λvi is ready to assist/i)).toBeInTheDocument();
    });

    test('handles Avi chat message submission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Hello from Avi' })
      });

      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await userEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/type your message to λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await userEvent.type(input, 'Hello Avi');
      await userEvent.click(sendButton);

      expect(mockFetch).toHaveBeenCalledWith('/api/claude-code/streaming-chat', expect.any(Object));
    });
  });

  describe('State Management & Callbacks', () => {
    test('maintains independent state for each tab', async () => {
      render(<EnhancedPostingInterface />);

      // Add content to quick post
      const quickTextarea = screen.getByTestId('mention-input');
      await userEvent.type(quickTextarea, 'Quick content');

      // Switch to avi tab and back
      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      const quickTab = getQuickPostTab();

      await userEvent.click(aviTab);
      await userEvent.click(quickTab);

      // Quick post content should be preserved
      expect(screen.getByTestId('mention-input')).toHaveValue('Quick content');
    });

    test('calls onPostCreated from any tab', async () => {
      const onPostCreated = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'quick-post' } })
      });

      render(<EnhancedPostingInterface onPostCreated={onPostCreated} />);

      // Test quick post callback
      const textarea = screen.getByTestId('mention-input');
      const submitButton = getQuickPostSubmitButton();

      await userEvent.type(textarea, 'Test');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onPostCreated).toHaveBeenCalled();
      });
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
      const submitButton = getQuickPostSubmitButton();

      await userEvent.type(textarea, 'Test');
      await userEvent.click(submitButton);

      // Should not throw error
      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    test('handles empty content submission', async () => {
      render(<EnhancedPostingInterface />);

      const submitButton = getQuickPostSubmitButton();

      // Button should be disabled for empty content
      expect(submitButton).toBeDisabled();

      // Clicking disabled button should not trigger API call
      await userEvent.click(submitButton);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('handles whitespace-only content', async () => {
      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = getQuickPostSubmitButton();

      await userEvent.type(textarea, '   ');
      expect(submitButton).toBeDisabled();
    });

    test('handles API response without data field', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      });

      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = getQuickPostSubmitButton();

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
      const submitButton = getQuickPostSubmitButton();

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

      const navigation = screen.getByRole('navigation', { name: /posting tabs/i });
      expect(navigation).toBeInTheDocument();

      const tabs = screen.getAllByRole('button');
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    test('maintains focus management', async () => {
      render(<EnhancedPostingInterface />);

      const quickTab = getQuickPostTab();
      await userEvent.click(quickTab);

      expect(quickTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  // ===================================================================
  // TDD LONDON SCHOOL: NEW FAILING TESTS FOR QUICK POST CHANGES
  // These tests should FAIL before implementation
  // ===================================================================

  describe('[TDD] Quick Post Interface Changes - FAILING TESTS FIRST', () => {
    describe('1. Post Tab Removal', () => {
      test('should NOT render Post tab in navigation', () => {
        render(<EnhancedPostingInterface />);

        // This should fail - Post tab currently exists
        const postTab = screen.queryByRole('button', { name: /^post$/i });
        expect(postTab).not.toBeInTheDocument();
      });

      test('should only render Quick Post and Avi DM tabs', () => {
        render(<EnhancedPostingInterface />);

        const tabs = screen.getAllByRole('button', { name: /(quick post|avi dm)/i });

        // This should fail - currently 3 tabs exist
        expect(tabs).toHaveLength(2);
        expect(screen.getByRole('button', { name: /quick post/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /avi dm/i })).toBeInTheDocument();
      });

      test('should not render PostCreator component at all', async () => {
        render(<EnhancedPostingInterface />);

        // Try to find any PostCreator instance
        const postCreator = screen.queryByTestId('post-creator');

        // This should fail - PostCreator is still rendered in Post tab
        expect(postCreator).not.toBeInTheDocument();
      });
    });

    describe('2. Quick Post as First/Default Tab', () => {
      test('Quick Post should be first tab in tabs array', () => {
        render(<EnhancedPostingInterface />);

        const navigation = screen.getByRole('navigation');
        const buttons = navigation.querySelectorAll('button');

        // This should fail - need to verify Quick Post is first
        expect(buttons[0]).toHaveTextContent(/quick post/i);
      });

      test('Quick Post tab should be selected by default', () => {
        render(<EnhancedPostingInterface />);

        const quickTab = getQuickPostTab();

        // This should pass - already default behavior
        expect(quickTab).toHaveAttribute('aria-selected', 'true');
      });

      test('Quick Post content should be visible on initial render', () => {
        render(<EnhancedPostingInterface />);

        // This should pass - already default behavior
        expect(screen.getByTestId('mention-input')).toBeInTheDocument();
        expect(screen.getByText(/share a quick thought or update/i)).toBeInTheDocument();
      });
    });

    describe('3. 10,000 Character Limit', () => {
      test('textarea should accept maxLength of 10000 characters', () => {
        render(<EnhancedPostingInterface />);

        const textarea = screen.getByTestId('mention-input');

        // This should fail - currently maxLength is 500
        expect(textarea).toHaveAttribute('maxLength', '10000');
      });

      test('should allow typing up to 10000 characters', async () => {
        render(<EnhancedPostingInterface />);

        const textarea = screen.getByTestId('mention-input');
        const longContent = 'A'.repeat(10000);

        fireEvent.change(textarea, { target: { value: longContent } });

        // This should pass - now limited to 10000
        expect(textarea).toHaveValue(longContent);
      });

      test('should show correct character count with 10000 limit', async () => {
        render(<EnhancedPostingInterface />);

        const textarea = screen.getByTestId('mention-input');

        // This should fail - currently shows /500
        expect(screen.getByText('0/10000 characters')).toBeInTheDocument();

        await userEvent.type(textarea, 'Hello');

        // This should fail - currently shows /500
        expect(screen.getByText('5/10000 characters')).toBeInTheDocument();
      });

      test('should submit post with content exactly 10000 characters', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 'post-123' } })
        });

        render(<EnhancedPostingInterface />);

        const textarea = screen.getByTestId('mention-input');
        const submitButton = getQuickPostSubmitButton();
        const longContent = 'A'.repeat(10000);

        fireEvent.change(textarea, { target: { value: longContent } });
        await userEvent.click(submitButton);

        // This should fail - currently limited to 500
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/agent-posts',
          expect.objectContaining({
            body: expect.stringContaining(`"content":"${longContent}"`)
          })
        );
      });
    });

    describe('4. Character Counter Hidden Below 9500', () => {
      test('character counter should be hidden when content is empty', () => {
        render(<EnhancedPostingInterface />);

        const characterCounter = screen.queryByText(/\/10000 characters/i);

        // This should fail - counter currently always visible
        expect(characterCounter).not.toBeInTheDocument();
      });

      test('character counter should be hidden with 100 characters', async () => {
        render(<EnhancedPostingInterface />);

        const textarea = screen.getByTestId('mention-input');
        fireEvent.change(textarea, { target: { value: 'A'.repeat(100) } });

        const characterCounter = screen.queryByText('100/10000 characters');

        // This should fail - counter currently always visible
        expect(characterCounter).not.toBeInTheDocument();
      });

      test('character counter should be hidden at 9499 characters', async () => {
        render(<EnhancedPostingInterface />);

        const textarea = screen.getByTestId('mention-input');
        fireEvent.change(textarea, { target: { value: 'A'.repeat(9499) } });

        const characterCounter = screen.queryByText('9499/10000 characters');

        // This should fail - counter currently always visible
        expect(characterCounter).not.toBeInTheDocument();
      });

      test('character counter container should not exist below 9500', () => {
        const { container } = render(<EnhancedPostingInterface />);

        // This should fail - counter div currently exists
        const counterDiv = container.querySelector('.text-xs.text-gray-500');
        expect(counterDiv).not.toBeInTheDocument();
      });
    });

    describe('5. Character Counter Visible at 9500+', () => {
      test('character counter should appear at exactly 9500 characters', async () => {
        render(<EnhancedPostingInterface />);

        const textarea = screen.getByTestId('mention-input');
        fireEvent.change(textarea, { target: { value: 'A'.repeat(9500) } });

        // This should fail - need to implement visibility threshold
        expect(screen.getByText('9500/10000 characters')).toBeInTheDocument();
      });

      test('character counter should be visible at 9501 characters', async () => {
        render(<EnhancedPostingInterface />);

        const textarea = screen.getByTestId('mention-input');
        fireEvent.change(textarea, { target: { value: 'A'.repeat(9501) } });

        // This should fail - need to implement visibility threshold
        expect(screen.getByText('9501/10000 characters')).toBeInTheDocument();
      });

      test('character counter should be visible at 10000 characters', async () => {
        render(<EnhancedPostingInterface />);

        const textarea = screen.getByTestId('mention-input');
        fireEvent.change(textarea, { target: { value: 'A'.repeat(10000) } });

        // This should fail - need to implement visibility threshold
        expect(screen.getByText('10000/10000 characters')).toBeInTheDocument();
      });

      test('character counter should have warning style at 9500+', async () => {
        render(<EnhancedPostingInterface />);

        const textarea = screen.getByTestId('mention-input');
        fireEvent.change(textarea, { target: { value: 'A'.repeat(9500) } });

        const characterCounter = screen.getByText('9500/10000 characters');

        // This should fail - need to add warning styling
        expect(characterCounter).toHaveClass('text-amber-600', 'font-medium');
      });

      test('character counter should transition smoothly when crossing threshold', async () => {
        render(<EnhancedPostingInterface />);

        const textarea = screen.getByTestId('mention-input');

        // Start below threshold
        fireEvent.change(textarea, { target: { value: 'A'.repeat(9499) } });
        expect(screen.queryByText(/\/10000 characters/i)).not.toBeInTheDocument();

        // Cross threshold
        await userEvent.type(textarea, 'A');

        // This should fail - need to implement threshold behavior
        expect(screen.getByText('9500/10000 characters')).toBeInTheDocument();
      });
    });

    describe('6. Textarea Rows Configuration', () => {
      test('textarea should have 6 rows instead of 3', () => {
        render(<EnhancedPostingInterface />);

        const textarea = screen.getByTestId('mention-input');

        // This should fail - currently has 3 rows
        expect(textarea).toHaveAttribute('rows', '6');
      });

      test('textarea rows should increase visible height', () => {
        const { container } = render(<EnhancedPostingInterface />);

        const textarea = screen.getByTestId('mention-input');

        // This should fail - need to verify increased height
        expect(textarea).toHaveAttribute('rows', '6');
      });
    });

    describe('7. Placeholder Text Update', () => {
      test('placeholder should be updated to new text', () => {
        render(<EnhancedPostingInterface />);

        const textarea = screen.getByTestId('mention-input');

        // This should fail - need to update placeholder
        expect(textarea).toHaveAttribute(
          'placeholder',
          "What's on your mind? (Works best with clear, concise thoughts!)"
        );
      });

      test('old placeholder text should not be present', () => {
        render(<EnhancedPostingInterface />);

        const textarea = screen.getByTestId('mention-input');

        // This should fail - old placeholder still exists
        expect(textarea).not.toHaveAttribute(
          'placeholder',
          "What's on your mind? (One line works great!)"
        );
      });
    });

    describe('8. Section Description Update', () => {
      test('section description should be updated', () => {
        render(<EnhancedPostingInterface />);

        // This should fail - need to update description
        expect(screen.getByText(/share your thoughts, ideas, or updates with the community/i)).toBeInTheDocument();
      });

      test('old description should not be present', () => {
        render(<EnhancedPostingInterface />);

        // This should fail - old description still exists
        expect(screen.queryByText(/share a quick thought or update/i)).not.toBeInTheDocument();
      });

      test('description should maintain proper styling', () => {
        const { container } = render(<EnhancedPostingInterface />);

        const description = screen.getByText(/share your thoughts, ideas, or updates with the community/i);

        // This should fail - need to verify styling
        expect(description).toHaveClass('text-sm', 'text-gray-600');
      });
    });

    describe('9. Mentions Functionality Preserved', () => {
      test('MentionInput component should still be used', () => {
        render(<EnhancedPostingInterface />);

        const mentionInput = screen.getByTestId('mention-input');

        // This should pass - MentionInput already in use
        expect(mentionInput).toBeInTheDocument();
      });

      test('mention context should remain as quick-post', () => {
        render(<EnhancedPostingInterface />);

        const textarea = screen.getByTestId('mention-input');

        // This should pass - context already set
        expect(textarea).toHaveAttribute('data-mention-context', 'quick-post');
      });

      test('onMentionSelect handler should still work', async () => {
        render(<EnhancedPostingInterface />);

        // Mentions functionality should be preserved
        const textarea = screen.getByTestId('mention-input');
        expect(textarea).toBeInTheDocument();

        // MentionInput mock would handle mention selection
        // This should pass - functionality preserved
      });

      test('selectedMentions state should be maintained', () => {
        render(<EnhancedPostingInterface />);

        // This should pass - state management unchanged
        const textarea = screen.getByTestId('mention-input');
        expect(textarea).toBeInTheDocument();
      });
    });

    describe('10. Form Submission with Long Content', () => {
      test('should submit 5000 character post successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 'long-post-1' } })
        });

        const onPostCreated = vi.fn();
        render(<EnhancedPostingInterface onPostCreated={onPostCreated} />);

        const textarea = screen.getByTestId('mention-input');
        const submitButton = getQuickPostSubmitButton();
        const longContent = 'A'.repeat(5000);

        fireEvent.change(textarea, { target: { value: longContent } });
        await userEvent.click(submitButton);

        // This should fail - currently limited to 500
        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            '/api/v1/agent-posts',
            expect.objectContaining({
              body: expect.stringContaining(`"content":"${longContent}"`)
            })
          );
        });
      });

      test('should submit 10000 character post successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 'long-post-2' } })
        });

        const onPostCreated = vi.fn();
        render(<EnhancedPostingInterface onPostCreated={onPostCreated} />);

        const textarea = screen.getByTestId('mention-input');
        const submitButton = getQuickPostSubmitButton();
        const longContent = 'B'.repeat(10000);

        fireEvent.change(textarea, { target: { value: longContent } });
        await userEvent.click(submitButton);

        // This should fail - currently limited to 500
        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            '/api/v1/agent-posts',
            expect.objectContaining({
              body: expect.stringContaining(`"content":"${longContent}"`)
            })
          );
        });
      });

      test('should generate correct title for 10000 char content', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: {} })
        });

        render(<EnhancedPostingInterface />);

        const textarea = screen.getByTestId('mention-input');
        const submitButton = getQuickPostSubmitButton();
        const longContent = 'C'.repeat(10000);

        fireEvent.change(textarea, { target: { value: longContent } });
        await userEvent.click(submitButton);

        const expectedTitle = longContent.slice(0, 50) + '...';

        // This should fail - need to handle long content
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/agent-posts',
          expect.objectContaining({
            body: expect.stringContaining(`"title":"${expectedTitle}"`)
          })
        );
      });

      test('should calculate correct word count for long content', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: {} })
        });

        render(<EnhancedPostingInterface />);

        const textarea = screen.getByTestId('mention-input');
        const submitButton = getQuickPostSubmitButton();

        // Create content with known word count
        const words = Array(1000).fill('word').join(' ');
        await userEvent.type(textarea, words);
        await userEvent.click(submitButton);

        // This should fail - need to verify word count calculation
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/agent-posts',
          expect.objectContaining({
            body: expect.stringContaining('"wordCount":1000')
          })
        );
      });

      test('should clear form after successful long content submission', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 'post-123' } })
        });

        render(<EnhancedPostingInterface />);

        const textarea = screen.getByTestId('mention-input');
        const submitButton = getQuickPostSubmitButton();
        const longContent = 'D'.repeat(8000);

        fireEvent.change(textarea, { target: { value: longContent } });
        await userEvent.click(submitButton);

        // This should fail - need to verify clearing works with long content
        await waitFor(() => {
          expect(textarea).toHaveValue('');
        });
      });

      test('should show loading state during long content submission', async () => {
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
        const submitButton = getQuickPostSubmitButton();
        const longContent = 'E'.repeat(9000);

        fireEvent.change(textarea, { target: { value: longContent } });
        await userEvent.click(submitButton);

        // This should pass - loading state should work the same
        expect(screen.getByText('Posting...')).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });
    });
  });
});
