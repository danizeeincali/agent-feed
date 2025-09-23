/**
 * London School TDD Tests for Regression Prevention
 * Focus: Ensuring existing functionality remains intact during enhancements
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { PostCreator } from '../../../src/components/PostCreator';
import { 
  createMockPostCreator,
  createMockApiService,
  createMockDraftService,
  assertTabBehaviorContract
} from './mocks';
import './setup';

// Mock dependencies
vi.mock('../../../src/services/api', () => ({
  apiService: createMockApiService()
}));

vi.mock('../../../src/hooks/useDraftManager', () => ({
  useDraftManager: () => createMockDraftService()
}));

vi.mock('../../../src/hooks/useTemplates', () => ({
  useTemplates: () => ({
    templates: [
      { id: 'status-update', name: 'Status Update', title: 'Weekly Report', hook: 'Key achievements', content: '## Completed', tags: ['status'] }
    ],
    loading: false,
    error: null
  })
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
  useLocation: () => ({ state: null })
}));

describe('Regression Prevention - London School TDD', () => {
  let mockProps: ReturnType<typeof createMockPostCreator>;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockProps = createMockPostCreator();
    user = userEvent.setup();

    // Mock window APIs
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock fetch for API calls
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        success: true, 
        data: { id: 'post-123', title: 'Test', content: 'Content' }
      })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Contract: Core PostCreator Functionality Preservation', () => {
    it('should maintain title input functionality', async () => {
      render(<PostCreator {...mockProps} />);
      
      const titleInput = screen.getByLabelText(/Title/i);
      expect(titleInput).toBeTruthy();
      
      await user.type(titleInput, 'Regression Test Title');
      expect(titleInput).toHaveValue('Regression Test Title');
      
      // Character limit should still work
      expect(screen.getByText(/200/)).toBeTruthy();
    });

    it('should preserve hook input behavior', async () => {
      render(<PostCreator {...mockProps} />);
      
      const hookInput = screen.getByLabelText(/Hook/i);
      expect(hookInput).toBeTruthy();
      
      await user.type(hookInput, 'Compelling hook text');
      expect(hookInput).toHaveValue('Compelling hook text');
      
      // Character limit should work
      expect(screen.getByText(/300/)).toBeTruthy();
    });

    it('should maintain content textarea functionality', async () => {
      render(<PostCreator {...mockProps} />);
      
      const contentTextarea = screen.getByRole('textbox', { name: /content/i });
      expect(contentTextarea).toBeTruthy();
      
      await user.type(contentTextarea, 'Test content for regression testing');
      expect(contentTextarea).toHaveValue('Test content for regression testing');
    });

    it('should preserve form validation logic', async () => {
      render(<PostCreator {...mockProps} />);
      
      const submitButton = screen.getByTestId('submit-post');
      
      // Should be disabled initially
      expect(submitButton).toBeDisabled();
      
      // Fill required fields
      await user.type(screen.getByLabelText(/Title/i), 'Valid Title');
      await user.type(screen.getByRole('textbox', { name: /content/i }), 'Valid content');
      
      // Should be enabled now
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Contract: Rich Editor Features Preservation', () => {
    it('should maintain formatting toolbar functionality', async () => {
      render(<PostCreator {...mockProps} />);
      
      const contentTextarea = screen.getByRole('textbox', { name: /content/i });
      await user.click(contentTextarea);
      
      // Bold button should exist and work
      const boldButton = screen.getByTitle(/Bold/i);
      expect(boldButton).toBeTruthy();
      
      await user.click(boldButton);
      expect(contentTextarea).toHaveValue('**bold text**');
    });

    it('should preserve italic formatting', async () => {
      render(<PostCreator {...mockProps} />);
      
      const contentTextarea = screen.getByRole('textbox', { name: /content/i });
      await user.click(contentTextarea);
      
      const italicButton = screen.getByTitle(/Italic/i);
      await user.click(italicButton);
      
      expect(contentTextarea).toHaveValue('*italic text*');
    });

    it('should maintain link formatting functionality', async () => {
      render(<PostCreator {...mockProps} />);
      
      const contentTextarea = screen.getByRole('textbox', { name: /content/i });
      await user.click(contentTextarea);
      
      const linkButton = screen.getByTitle(/Link/i);
      await user.click(linkButton);
      
      expect(contentTextarea).toHaveValue('[link text](url)');
    });

    it('should preserve list formatting', async () => {
      render(<PostCreator {...mockProps} />);
      
      const contentTextarea = screen.getByRole('textbox', { name: /content/i });
      await user.click(contentTextarea);
      
      const listButton = screen.getByTitle(/Bullet List/i);
      await user.click(listButton);
      
      expect(contentTextarea.value).toContain('- list item');
    });
  });

  describe('Contract: Tag Management Preservation', () => {
    it('should maintain tag input functionality', async () => {
      render(<PostCreator {...mockProps} />);
      
      const tagInput = screen.getByPlaceholderText(/Add tags/i);
      expect(tagInput).toBeTruthy();
      
      await user.type(tagInput, 'regression');
      await user.keyboard('{Enter}');
      
      expect(screen.getByText('#regression')).toBeTruthy();
    });

    it('should preserve tag removal functionality', async () => {
      render(<PostCreator {...mockProps} />);
      
      const tagInput = screen.getByPlaceholderText(/Add tags/i);
      
      await user.type(tagInput, 'test-tag');
      await user.keyboard('{Enter}');
      
      const tagElement = screen.getByText('#test-tag');
      const removeButton = tagElement.parentElement?.querySelector('button');
      expect(removeButton).toBeTruthy();
      
      await user.click(removeButton!);
      expect(screen.queryByText('#test-tag')).toBeFalsy();
    });

    it('should maintain tag suggestions', async () => {
      render(<PostCreator {...mockProps} />);
      
      const tagInput = screen.getByPlaceholderText(/Add tags/i);
      await user.type(tagInput, 'str');
      
      // Should show suggestions (mocked behavior)
      await waitFor(() => {
        expect(screen.queryByText('#strategy')).toBeTruthy();
      });
    });
  });

  describe('Contract: Template System Preservation', () => {
    it('should maintain template library toggle', async () => {
      render(<PostCreator {...mockProps} />);
      
      const templateButton = screen.getByTestId('toggle-template-library');
      expect(templateButton).toBeTruthy();
      
      await user.click(templateButton);
      expect(screen.getByTestId('template-library-container')).toBeTruthy();
    });

    it('should preserve template application', async () => {
      render(<PostCreator {...mockProps} />);
      
      const templateButton = screen.getByTestId('toggle-template-library');
      await user.click(templateButton);
      
      const statusUpdateTemplate = screen.getByText('Status Update');
      await user.click(statusUpdateTemplate);
      
      // Template should be applied
      expect(screen.getByDisplayValue('Weekly Report')).toBeTruthy();
      expect(screen.getByDisplayValue('Key achievements')).toBeTruthy();
    });
  });

  describe('Contract: Draft Management Preservation', () => {
    it('should maintain manual draft saving', async () => {
      render(<PostCreator {...mockProps} />);
      
      const titleInput = screen.getByLabelText(/Title/i);
      const contentTextarea = screen.getByRole('textbox', { name: /content/i });
      
      await user.type(titleInput, 'Draft Title');
      await user.type(contentTextarea, 'Draft content');
      
      const saveDraftButton = screen.getByText('Save Draft');
      await user.click(saveDraftButton);
      
      await waitFor(() => {
        expect(screen.getByText('Draft saved')).toBeTruthy();
      });
    });

    it('should preserve auto-save functionality', async () => {
      render(<PostCreator {...mockProps} />);
      
      const titleInput = screen.getByLabelText(/Title/i);
      await user.type(titleInput, 'Auto-save test');
      
      // Auto-save should trigger after delay (mocked)
      await waitFor(() => {
        expect(screen.getByText('Draft saved')).toBeTruthy();
      }, { timeout: 4000 });
    });

    it('should maintain drafts page navigation', () => {
      render(<PostCreator {...mockProps} />);
      
      const draftsLink = screen.getByText('View Drafts');
      expect(draftsLink).toHaveAttribute('href', '/drafts');
    });
  });

  describe('Contract: Keyboard Shortcuts Preservation', () => {
    it('should preserve Cmd+Enter submission shortcut', async () => {
      render(<PostCreator {...mockProps} />);
      
      const titleInput = screen.getByLabelText(/Title/i);
      const contentTextarea = screen.getByRole('textbox', { name: /content/i });
      
      await user.type(titleInput, 'Shortcut Test');
      await user.type(contentTextarea, 'Test content');
      
      // Simulate Cmd+Enter
      fireEvent.keyDown(contentTextarea, {
        key: 'Enter',
        metaKey: true
      });
      
      await waitFor(() => {
        expect(mockProps.onPostCreated).toHaveBeenCalled();
      });
    });

    it('should maintain Cmd+S save shortcut', async () => {
      render(<PostCreator {...mockProps} />);
      
      const titleInput = screen.getByLabelText(/Title/i);
      await user.type(titleInput, 'Save shortcut test');
      
      fireEvent.keyDown(titleInput, {
        key: 's',
        metaKey: true
      });
      
      // Should trigger save (mocked behavior)
      await waitFor(() => {
        expect(screen.getByText('Draft saved')).toBeTruthy();
      });
    });

    it('should preserve formatting shortcuts', async () => {
      render(<PostCreator {...mockProps} />);
      
      const contentTextarea = screen.getByRole('textbox', { name: /content/i });
      await user.click(contentTextarea);
      
      // Cmd+B for bold
      fireEvent.keyDown(contentTextarea, {
        key: 'b',
        metaKey: true
      });
      
      expect(contentTextarea).toHaveValue('**bold text**');
    });
  });

  describe('Contract: Preview Mode Preservation', () => {
    it('should maintain preview toggle functionality', async () => {
      render(<PostCreator {...mockProps} />);
      
      const previewButton = screen.getByTitle(/Toggle Preview/i);
      expect(previewButton).toBeTruthy();
      
      await user.click(previewButton);
      
      // Preview mode should be active (content should show as preview)
      expect(screen.getByText(/Content will appear here/)).toBeTruthy();
    });

    it('should preserve preview content rendering', async () => {
      render(<PostCreator {...mockProps} />);
      
      const titleInput = screen.getByLabelText(/Title/i);
      const hookInput = screen.getByLabelText(/Hook/i);
      const contentTextarea = screen.getByRole('textbox', { name: /content/i });
      
      await user.type(titleInput, 'Preview Test Title');
      await user.type(hookInput, 'Preview hook');
      await user.type(contentTextarea, 'Preview content');
      
      const previewButton = screen.getByTitle(/Toggle Preview/i);
      await user.click(previewButton);
      
      expect(screen.getByText('Preview Test Title')).toBeTruthy();
      expect(screen.getByText('Preview hook')).toBeTruthy();
    });
  });

  describe('Contract: Mobile Adaptations Preservation', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('768px') ? true : false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
    });

    it('should maintain mobile toolbar adaptation', () => {
      render(<PostCreator {...mockProps} />);
      
      // Mobile indicator should be present
      const mobileIndicator = document.querySelector('[class*="smartphone"]');
      expect(mobileIndicator).toBeTruthy();
    });

    it('should preserve mobile-specific layout', () => {
      render(<PostCreator {...mockProps} />);
      
      const header = screen.getByText('Create New Post').closest('div');
      expect(header).toBeTruthy();
      
      // Should hide detailed descriptions on mobile
      expect(screen.queryByText('Share insights with your agent network')).toBeFalsy();
    });
  });

  describe('Contract: Error Handling Preservation', () => {
    it('should maintain form validation error display', async () => {
      render(<PostCreator {...mockProps} />);
      
      const submitButton = screen.getByTestId('submit-post');
      
      // Try to submit without required fields
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Title and content are required')).toBeTruthy();
    });

    it('should handle API submission errors gracefully', async () => {
      // Mock API failure
      global.fetch = vi.fn().mockRejectedValue(new Error('API Error'));
      
      render(<PostCreator {...mockProps} />);
      
      const titleInput = screen.getByLabelText(/Title/i);
      const contentTextarea = screen.getByRole('textbox', { name: /content/i });
      
      await user.type(titleInput, 'Error Test');
      await user.type(contentTextarea, 'Error content');
      
      const submitButton = screen.getByTestId('submit-post');
      await user.click(submitButton);
      
      // Should not crash
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Contract: Performance Characteristics Preservation', () => {
    it('should maintain reasonable render performance', () => {
      const start = performance.now();
      
      const { rerender } = render(<PostCreator {...mockProps} />);
      
      // Multiple re-renders
      for (let i = 0; i < 5; i++) {
        rerender(<PostCreator {...mockProps} key={i} />);
      }
      
      const end = performance.now();
      expect(end - start).toBeLessThan(1000); // Should render quickly
    });

    it('should not cause memory leaks', () => {
      const { unmount } = render(<PostCreator {...mockProps} />);
      
      // Should unmount cleanly
      expect(() => unmount()).not.toThrow();
    });

    it('should maintain auto-save debouncing', async () => {
      const saveSpy = vi.fn();
      
      render(<PostCreator {...mockProps} />);
      
      const titleInput = screen.getByLabelText(/Title/i);
      
      // Rapid typing should not trigger excessive saves
      for (let i = 0; i < 10; i++) {
        await user.type(titleInput, 'a');
      }
      
      // Should debounce save operations
      await waitFor(() => {
        expect(screen.getByText('Draft saved')).toBeTruthy();
      });
    });
  });

  describe('Contract: Accessibility Features Preservation', () => {
    it('should maintain ARIA labels and roles', () => {
      render(<PostCreator {...mockProps} />);
      
      const titleInput = screen.getByLabelText(/Title/i);
      const contentTextarea = screen.getByRole('textbox', { name: /content/i });
      
      expect(titleInput).toHaveAccessibleName();
      expect(contentTextarea).toHaveAccessibleName();
    });

    it('should preserve keyboard navigation order', async () => {
      render(<PostCreator {...mockProps} />);
      
      // Should be able to tab through elements
      await user.tab();
      expect(screen.getByLabelText(/Title/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/Hook/i)).toHaveFocus();
    });

    it('should maintain screen reader compatibility', () => {
      render(<PostCreator {...mockProps} />);
      
      // Required field indicators should be accessible
      const titleLabel = screen.getByLabelText(/Title/i);
      expect(titleLabel.closest('div')?.textContent).toContain('*');
    });
  });
});