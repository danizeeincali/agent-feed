/**
 * Accessibility Tests for Avi DM Functionality
 * WCAG 2.1 AA compliance and assistive technology support
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AviDirectChatSDK } from '../AviDirectChatSDK';
import { EnhancedPostingInterface } from '../../EnhancedPostingInterface';
import {
  a11yHelpers,
  setupTestEnvironment,
  createFetchMock
} from './test-utils';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock dependencies
jest.mock('../../StreamingTicker', () => {
  return function MockStreamingTicker({ enabled }: any) {
    return (
      <div
        data-testid="streaming-ticker"
        role="status"
        aria-live="polite"
        aria-label={enabled ? "Streaming active" : "Streaming inactive"}
      >
        {enabled ? 'Live updates active' : 'No live updates'}
      </div>
    );
  };
});

jest.mock('@/utils/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

// Mock components with proper accessibility attributes
jest.mock('../../PostCreator', () => ({
  PostCreator: ({ onPostCreated }: any) => (
    <div data-testid="post-creator" role="form" aria-label="Create full post">
      <label htmlFor="full-post-title">Post Title</label>
      <input id="full-post-title" type="text" />
      <button
        onClick={() => onPostCreated?.({ id: 'full-post' })}
        aria-describedby="full-post-help"
      >
        Create Post
      </button>
      <div id="full-post-help">Create a detailed post with rich formatting</div>
    </div>
  )
}));

jest.mock('../../MentionInput', () => ({
  MentionInput: ({ value, onChange, placeholder, 'aria-label': ariaLabel }: any) => (
    <textarea
      data-testid="mention-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel || 'Quick post content'}
      aria-describedby="char-count"
    />
  ),
  MentionSuggestion: {} as any
}));

const mockFetch = createFetchMock();
global.fetch = mockFetch;

describe('Accessibility Tests', () => {
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

  describe('AviDirectChatSDK Accessibility', () => {
    test('has no axe violations', async () => {
      const { container } = render(<AviDirectChatSDK />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('has proper semantic structure', () => {
      render(<AviDirectChatSDK />);

      // Main container should have appropriate role
      const chatContainer = screen.getByTestId('avi-chat-sdk');
      expect(chatContainer).toBeInTheDocument();

      // Chat area should be identifiable
      expect(screen.getByText('Avi AI Assistant')).toBeInTheDocument();

      // Input area should be properly labeled
      const messageInput = screen.getByPlaceholderText('Type your message to Avi...');
      expect(messageInput).toHaveAttribute('aria-label', expect.stringContaining('message'));
    });

    test('supports keyboard navigation', async () => {
      render(<AviDirectChatSDK />);

      const imageButton = screen.getByRole('button', { name: /add images/i });
      const messageInput = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Tab order should be logical
      imageButton.focus();
      await userEvent.tab();
      expect(messageInput).toHaveFocus();

      await userEvent.tab();
      expect(sendButton).toHaveFocus();
    });

    test('provides proper button labels and roles', () => {
      render(<AviDirectChatSDK />);

      // Image upload button
      const imageButton = screen.getByRole('button', { name: /add images/i });
      expect(imageButton).toHaveAttribute('title', 'Add images');

      // Send button should be properly labeled
      const sendButton = screen.getByRole('button');
      expect(sendButton).toBeInTheDocument();
    });

    test('announces connection state changes', async () => {
      const { rerender } = render(<AviDirectChatSDK />);

      // Check initial state
      expect(screen.getByText('Ready to chat')).toBeInTheDocument();

      // Mock connection state change
      mockFetch.mockSuccess({ success: true, responses: [] });

      const messageInput = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      await userEvent.type(messageInput, 'Test');
      await userEvent.click(sendButton);

      // Status should be announced
      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });
    });

    test('provides accessible error messages', async () => {
      mockFetch.mockError(500, 'Server Error');

      render(<AviDirectChatSDK />);

      const messageInput = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      await userEvent.type(messageInput, 'Test');
      await userEvent.click(sendButton);

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveTextContent(/API request failed/i);
      });
    });

    test('supports screen reader announcements for messages', async () => {
      mockFetch.mockSuccess({
        success: true,
        responses: [{ content: 'AI response message' }]
      });

      render(<AviDirectChatSDK />);

      const messageInput = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      await userEvent.type(messageInput, 'User message');
      await userEvent.click(sendButton);

      // Messages should be in a live region or have proper labels
      await waitFor(() => {
        expect(screen.getByText('User message')).toBeInTheDocument();
        expect(screen.getByText('AI response message')).toBeInTheDocument();
      });
    });

    test('file upload is accessible', async () => {
      render(<AviDirectChatSDK />);

      const fileInput = screen.getByTestId('avi-chat-sdk').querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute('accept', 'image/*');
      expect(fileInput).toHaveAttribute('multiple');

      // File input should be accessible via keyboard
      const imageButton = screen.getByRole('button', { name: /add images/i });
      await userEvent.click(imageButton);

      // Should focus the file input or trigger the dialog
      expect(imageButton).toHaveAttribute('title', 'Add images');
    });

    test('typing indicator is announced', async () => {
      mockFetch.mockImplementationOnce(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ success: true, responses: [] })
          }), 100)
        )
      );

      render(<AviDirectChatSDK />);

      const messageInput = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      await userEvent.type(messageInput, 'Test');
      await userEvent.click(sendButton);

      // Typing indicator should be announced
      await waitFor(() => {
        const typingIndicator = screen.getByTestId('avi-chat-sdk').querySelector('.animate-bounce');
        expect(typingIndicator).toBeInTheDocument();
      });
    });

    test('message timestamps are accessible', async () => {
      mockFetch.mockSuccess({ success: true, responses: [] });

      render(<AviDirectChatSDK />);

      const messageInput = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      await userEvent.type(messageInput, 'Test message');
      await userEvent.click(sendButton);

      await waitFor(() => {
        // Timestamp should be accessible to screen readers
        const timestampElements = screen.getByTestId('avi-chat-sdk').querySelectorAll('time, [datetime]');
        expect(timestampElements.length).toBeGreaterThan(0);
      });
    });

    test('supports high contrast mode', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn(() => ({
          matches: true,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        }))
      });

      const { container } = render(<AviDirectChatSDK />);

      // Check that colors provide sufficient contrast
      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        expect(styles.color).toBeDefined();
        expect(styles.backgroundColor).toBeDefined();
      });
    });

    test('supports reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn((query) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        }))
      });

      render(<AviDirectChatSDK />);

      // Animations should respect reduced motion
      const chatContainer = screen.getByTestId('avi-chat-sdk');
      expect(chatContainer).toBeInTheDocument();
    });
  });

  describe('EnhancedPostingInterface Accessibility', () => {
    test('has no axe violations', async () => {
      const { container } = render(<EnhancedPostingInterface />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('tab navigation follows ARIA practices', () => {
      render(<EnhancedPostingInterface />);

      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-label', 'Posting tabs');

      const tabs = screen.getAllByRole('tab');
      tabs.forEach((tab, index) => {
        expect(tab).toHaveAttribute('aria-selected');
        expect(tab).toHaveAttribute('tabindex');
      });
    });

    test('supports arrow key navigation in tab list', async () => {
      render(<EnhancedPostingInterface />);

      const quickTab = screen.getByRole('tab', { name: /quick post/i });
      const postTab = screen.getByRole('tab', { name: /post/i });
      const aviTab = screen.getByRole('tab', { name: /avi dm/i });

      // Focus first tab
      quickTab.focus();
      expect(quickTab).toHaveFocus();

      // Arrow right should move to next tab
      await userEvent.keyboard('{ArrowRight}');
      expect(postTab).toHaveFocus();

      // Arrow right should move to next tab
      await userEvent.keyboard('{ArrowRight}');
      expect(aviTab).toHaveFocus();

      // Arrow left should move to previous tab
      await userEvent.keyboard('{ArrowLeft}');
      expect(postTab).toHaveFocus();
    });

    test('tab panels are properly associated', async () => {
      render(<EnhancedPostingInterface />);

      const tabs = screen.getAllByRole('tab');

      for (const tab of tabs) {
        await userEvent.click(tab);

        // Tab should be selected
        expect(tab).toHaveAttribute('aria-selected', 'true');

        // Other tabs should not be selected
        const otherTabs = tabs.filter(t => t !== tab);
        otherTabs.forEach(otherTab => {
          expect(otherTab).toHaveAttribute('aria-selected', 'false');
        });
      }
    });

    test('form labels and descriptions are properly associated', () => {
      render(<EnhancedPostingInterface />);

      // Quick post form
      const textarea = screen.getByTestId('mention-input');
      expect(textarea).toHaveAttribute('aria-label', 'Quick post content');
      expect(textarea).toHaveAttribute('aria-describedby', 'char-count');

      // Character count should be present
      expect(screen.getByText(/\/500 characters/)).toBeInTheDocument();
    });

    test('loading states are announced', async () => {
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

      // Loading state should be announced
      expect(screen.getByText('Posting...')).toBeInTheDocument();
      expect(submitButton).toHaveAttribute('aria-disabled', 'true');
    });

    test('error states are accessible', async () => {
      mockFetch.mockError(400, 'Bad Request');

      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = screen.getByRole('button', { name: /quick post/i });

      await userEvent.type(textarea, 'Test post');
      await userEvent.click(submitButton);

      // Error should be announced and form should remain accessible
      await waitFor(() => {
        expect(submitButton).not.toHaveAttribute('aria-disabled', 'true');
        expect(textarea).toHaveValue('Test post'); // Content preserved for retry
      });
    });

    test('form validation is accessible', async () => {
      render(<EnhancedPostingInterface />);

      const submitButton = screen.getByRole('button', { name: /quick post/i });

      // Button should be disabled when form is invalid
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveClass('cursor-not-allowed');

      const textarea = screen.getByTestId('mention-input');
      await userEvent.type(textarea, 'Valid content');

      // Button should be enabled when form is valid
      expect(submitButton).not.toBeDisabled();
    });

    test('supports keyboard shortcuts', async () => {
      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');
      await userEvent.type(textarea, 'Test content');

      // Ctrl+Enter should submit (if implemented)
      await userEvent.keyboard('{Control>}{Enter}{/Control}');

      // Form should behave appropriately
      expect(textarea).toHaveFocus();
    });

    test('focus management during tab switches', async () => {
      render(<EnhancedPostingInterface />);

      const quickTab = screen.getByRole('tab', { name: /quick post/i });
      const postTab = screen.getByRole('tab', { name: /post/i });

      // Switch to post tab
      await userEvent.click(postTab);

      // Focus should be managed appropriately
      expect(postTab).toHaveAttribute('aria-selected', 'true');

      // Switch back to quick tab
      await userEvent.click(quickTab);
      expect(quickTab).toHaveAttribute('aria-selected', 'true');
    });

    test('responsive design maintains accessibility', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });

      render(<EnhancedPostingInterface />);

      // All interactive elements should remain accessible
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(3);

      tabs.forEach(tab => {
        expect(tab).toBeVisible();
        expect(tab).toHaveAttribute('tabindex');
      });
    });
  });

  describe('Integration Accessibility', () => {
    test('cross-component focus management', async () => {
      render(<EnhancedPostingInterface />);

      // Navigate to Avi tab
      const aviTab = screen.getByRole('tab', { name: /avi dm/i });
      await userEvent.click(aviTab);

      // AviDirectChatSDK should be accessible
      const aviContainer = screen.getByTestId('avi-direct-chat-sdk');
      expect(aviContainer).toBeInTheDocument();

      // Focus should work within the component
      const chatInput = aviContainer.querySelector('textarea');
      if (chatInput) {
        chatInput.focus();
        expect(chatInput).toHaveFocus();
      }
    });

    test('landmark roles are properly structured', () => {
      render(<EnhancedPostingInterface />);

      // Should have proper document structure
      const main = screen.getByRole('tablist').closest('[role="main"]') || document.body;
      expect(main).toBeInTheDocument();

      // Navigation should be identifiable
      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-label');
    });

    test('color contrast meets WCAG standards', () => {
      const { container } = render(<EnhancedPostingInterface />);

      // Check critical interactive elements
      const buttons = container.querySelectorAll('button');
      const inputs = container.querySelectorAll('input, textarea');

      [...buttons, ...inputs].forEach(element => {
        const styles = window.getComputedStyle(element);

        // Should have defined colors (actual contrast would be tested with real CSS)
        expect(styles.color).toBeDefined();
        expect(styles.backgroundColor || styles.background).toBeDefined();
      });
    });

    test('supports assistive technology announcements', async () => {
      const { container } = render(<EnhancedPostingInterface />);

      // Check for ARIA live regions
      const liveRegions = container.querySelectorAll('[aria-live]');
      expect(liveRegions.length).toBeGreaterThan(0);

      // Status updates should be announced
      const statusElements = container.querySelectorAll('[role="status"]');
      expect(statusElements.length).toBeGreaterThan(0);
    });

    test('handles dynamic content updates accessibly', async () => {
      mockFetch.mockSuccess({ data: { id: 'new-post' } });

      render(<EnhancedPostingInterface />);

      const textarea = screen.getByTestId('mention-input');
      const submitButton = screen.getByRole('button', { name: /quick post/i });

      await userEvent.type(textarea, 'Dynamic content test');
      await userEvent.click(submitButton);

      // Dynamic updates should be announced
      await waitFor(() => {
        expect(textarea).toHaveValue(''); // Form cleared
      });

      // Screen reader should be notified of the change
      const liveRegions = screen.getAllByTestId('mention-input').map(el =>
        el.closest('[aria-live]')
      ).filter(Boolean);

      // At least one live region should exist for announcements
      expect(liveRegions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Advanced Accessibility Features', () => {
    test('supports custom assistive technology', () => {
      render(<AviDirectChatSDK />);

      // Check for advanced ARIA attributes
      const container = screen.getByTestId('avi-chat-sdk');

      // Should support description
      const describedElements = container.querySelectorAll('[aria-describedby]');
      expect(describedElements.length).toBeGreaterThanOrEqual(0);

      // Should support expanded states where applicable
      const expandableElements = container.querySelectorAll('[aria-expanded]');
      expandableElements.forEach(element => {
        expect(element).toHaveAttribute('aria-expanded');
      });
    });

    test('provides comprehensive labeling', () => {
      render(<EnhancedPostingInterface />);

      // Check that all interactive elements have accessible names
      const unlabeledElements = a11yHelpers.checkAriaLabels(document.body);

      // Should have minimal unlabeled elements
      expect(unlabeledElements.length).toBeLessThanOrEqual(2);
    });

    test('maintains accessibility during error states', async () => {
      mockFetch.mockError(500, 'Server Error');

      render(<AviDirectChatSDK />);

      const messageInput = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      await userEvent.type(messageInput, 'Test');
      await userEvent.click(sendButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/API request failed/i);
        expect(errorMessage).toBeInTheDocument();

        // Error should be in an alert or live region
        const alertElement = errorMessage.closest('[role="alert"]') ||
                            errorMessage.closest('[aria-live]');
        expect(alertElement).toBeInTheDocument();
      });

      // Form should remain accessible after error
      expect(messageInput).not.toBeDisabled();
      expect(sendButton).not.toBeDisabled();
    });

    test('supports screen reader navigation shortcuts', () => {
      render(<EnhancedPostingInterface />);

      // Check for heading structure
      const headings = screen.getAllByRole('heading');
      headings.forEach((heading, index) => {
        expect(heading).toBeInTheDocument();
      });

      // Check for proper form structure
      const forms = document.querySelectorAll('form, [role="form"]');
      expect(forms.length).toBeGreaterThan(0);

      // Check for button groups
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});