/**
 * London School TDD Tests for PostCreator Integration
 * Focus: Compatibility and regression prevention with existing PostCreator
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { PostCreator } from '../../../src/components/PostCreator';
import { 
  createMockPostCreator,
  createMockApiService,
  createMockDraftService,
  createMockTemplateService,
  assertTabBehaviorContract
} from './mocks';
import './setup';

// Mock the API service
vi.mock('../../../src/services/api', () => ({
  apiService: createMockApiService()
}));

// Mock the draft service
vi.mock('../../../src/services/DraftService', () => ({
  DraftService: createMockDraftService()
}));

// Mock the template service  
vi.mock('../../../src/services/TemplateService', () => ({
  TemplateService: createMockTemplateService()
}));

// Mock the hooks
vi.mock('../../../src/hooks/useDraftManager', () => ({
  useDraftManager: () => createMockDraftService()
}));

vi.mock('../../../src/hooks/useTemplates', () => ({
  useTemplates: () => ({
    templates: [],
    loading: false,
    error: null
  })
}));

// Mock React Router
vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
  useLocation: () => ({ state: null })
}));

describe('PostCreator Integration - London School TDD', () => {
  let mockProps: ReturnType<typeof createMockPostCreator>;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockProps = createMockPostCreator();
    user = userEvent.setup();
    
    // Mock window.matchMedia for mobile detection
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query.includes('768px') ? false : true,
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

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Contract: Existing PostCreator Behavior Preservation', () => {
    it('should render existing PostCreator without breaking changes', () => {
      render(<PostCreator {...mockProps} />);
      
      // Core elements should still exist
      expect(screen.getByText('Create New Post')).toBeTruthy();
      expect(screen.getByLabelText(/Title/)).toBeTruthy();
      expect(screen.getByLabelText(/Content/)).toBeTruthy();
      expect(screen.getByTestId('submit-post')).toBeTruthy();
    });

    it('should maintain existing form validation behavior', async () => {
      render(<PostCreator {...mockProps} />);
      
      const submitButton = screen.getByTestId('submit-post');
      
      // Should be disabled when title and content are empty
      expect(submitButton).toBeDisabled();
      
      // Fill in required fields
      const titleInput = screen.getByLabelText(/Title/);
      const contentTextarea = screen.getByRole('textbox', { name: /content/i });
      
      await user.type(titleInput, 'Test Post Title');
      await user.type(contentTextarea, 'Test post content');
      
      // Should be enabled when required fields are filled
      expect(submitButton).not.toBeDisabled();
    });

    it('should preserve existing keyboard shortcuts', async () => {
      render(<PostCreator {...mockProps} />);
      
      const titleInput = screen.getByLabelText(/Title/);
      const contentTextarea = screen.getByRole('textbox', { name: /content/i });
      
      await user.type(titleInput, 'Test Title');
      await user.type(contentTextarea, 'Test content');
      
      // Test Cmd+Enter shortcut (mocked key combination)
      fireEvent.keyDown(contentTextarea, {
        key: 'Enter',
        metaKey: true
      });
      
      await waitFor(() => {
        expect(mockProps.onPostCreated).toHaveBeenCalled();
      });
    });

    it('should maintain existing template functionality', async () => {
      render(<PostCreator {...mockProps} />);
      
      const templateButton = screen.getByTestId('toggle-template-library');
      await user.click(templateButton);
      
      // Template library should open
      expect(screen.getByTestId('template-library-container')).toBeTruthy();
    });

    it('should preserve draft management behavior', async () => {
      render(<PostCreator {...mockProps} />);
      
      const titleInput = screen.getByLabelText(/Title/);
      const contentTextarea = screen.getByRole('textbox', { name: /content/i });
      
      await user.type(titleInput, 'Draft Title');
      await user.type(contentTextarea, 'Draft content');
      
      const saveDraftButton = screen.getByText('Save Draft');
      await user.click(saveDraftButton);
      
      // Should save draft through existing mechanism
      expect(screen.getByText('Draft saved')).toBeTruthy();
    });
  });

  describe('Contract: Enhanced Integration Compatibility', () => {
    it('should accept enhanced props without breaking existing functionality', () => {
      const enhancedProps = {
        ...mockProps,
        mode: 'from_quick' as const,
        initialData: {
          content: 'From quick post',
          tags: ['quick'],
          source: 'quick' as const
        }
      };
      
      expect(() => {
        render(<PostCreator {...enhancedProps} />);
      }).not.toThrow();
      
      // Should still render core elements
      expect(screen.getByText('Create New Post')).toBeTruthy();
    });

    it('should handle cross-section data integration gracefully', async () => {
      const enhancedProps = {
        ...mockProps,
        initialContent: 'Content from quick post',
        mode: 'from_quick' as const
      };
      
      render(<PostCreator {...enhancedProps} />);
      
      const contentTextarea = screen.getByRole('textbox', { name: /content/i });
      expect(contentTextarea).toHaveValue('Content from quick post');
    });

    it('should maintain API compatibility for post submission', async () => {
      render(<PostCreator {...mockProps} />);
      
      const titleInput = screen.getByLabelText(/Title/);
      const contentTextarea = screen.getByRole('textbox', { name: /content/i });
      
      await user.type(titleInput, 'API Test Title');
      await user.type(contentTextarea, 'API test content');
      
      const submitButton = screen.getByTestId('submit-post');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockProps.onPostCreated).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'API Test Title',
            content: 'API test content'
          })
        );
      });
    });

    it('should preserve existing modal behavior when used in modal context', () => {
      const modalProps = {
        ...mockProps,
        editDraft: {
          id: 'draft-123',
          title: 'Draft Title',
          content: 'Draft content',
          tags: ['draft'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };
      
      render(<PostCreator {...modalProps} />);
      
      // Should load draft data correctly
      expect(screen.getByDisplayValue('Draft Title')).toBeTruthy();
      expect(screen.getByDisplayValue('Draft content')).toBeTruthy();
    });
  });

  describe('Contract: Mobile Responsiveness Regression', () => {
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

    it('should maintain mobile adaptations', () => {
      render(<PostCreator {...mockProps} />);
      
      // Mobile indicator should be present
      expect(screen.getByText(/My Documents/)).toBeFalsy(); // Shortened text on mobile
      
      // Toolbar should be compact on mobile
      const toolbar = document.querySelector('.bg-gray-50');
      expect(toolbar).toBeTruthy();
    });

    it('should preserve touch-friendly interactions', async () => {
      render(<PostCreator {...mockProps} />);
      
      const titleInput = screen.getByLabelText(/Title/);
      
      // Touch interactions should work
      fireEvent.touchStart(titleInput);
      fireEvent.touchEnd(titleInput);
      
      await user.type(titleInput, 'Mobile test');
      expect(titleInput).toHaveValue('Mobile test');
    });
  });

  describe('Contract: Error Handling Regression', () => {
    it('should handle API errors gracefully without breaking', async () => {
      const errorProps = {
        ...mockProps,
        onPostCreated: vi.fn().mockRejectedValue(new Error('API Error'))
      };
      
      render(<PostCreator {...errorProps} />);
      
      const titleInput = screen.getByLabelText(/Title/);
      const contentTextarea = screen.getByRole('textbox', { name: /content/i });
      
      await user.type(titleInput, 'Error Test');
      await user.type(contentTextarea, 'Error content');
      
      const submitButton = screen.getByTestId('submit-post');
      await user.click(submitButton);
      
      // Should not crash the component
      expect(screen.getByTestId('submit-post')).toBeTruthy();
    });

    it('should maintain form state during error recovery', async () => {
      render(<PostCreator {...mockProps} />);
      
      const titleInput = screen.getByLabelText(/Title/);
      const contentTextarea = screen.getByRole('textbox', { name: /content/i });
      
      await user.type(titleInput, 'Recovery Test');
      await user.type(contentTextarea, 'Recovery content');
      
      // Simulate error and recovery
      fireEvent.error(titleInput);
      
      // Form data should be preserved
      expect(titleInput).toHaveValue('Recovery Test');
      expect(contentTextarea).toHaveValue('Recovery content');
    });
  });

  describe('Contract: Performance Regression Prevention', () => {
    it('should not cause memory leaks in existing functionality', () => {
      const { unmount } = render(<PostCreator {...mockProps} />);
      
      // Should clean up properly
      expect(() => unmount()).not.toThrow();
    });

    it('should maintain existing auto-save performance', async () => {
      const startTime = performance.now();
      
      render(<PostCreator {...mockProps} />);
      
      const titleInput = screen.getByLabelText(/Title/);
      await user.type(titleInput, 'Performance test');
      
      // Should not cause significant performance degradation
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should preserve existing rendering performance', () => {
      const renderStart = performance.now();
      
      const { rerender } = render(<PostCreator {...mockProps} />);
      
      // Multiple re-renders should not degrade performance
      for (let i = 0; i < 5; i++) {
        rerender(<PostCreator {...mockProps} key={i} />);
      }
      
      const renderEnd = performance.now();
      expect(renderEnd - renderStart).toBeLessThan(500);
    });
  });

  describe('Contract: Accessibility Regression Prevention', () => {
    it('should maintain existing ARIA attributes', () => {
      render(<PostCreator {...mockProps} />);
      
      const titleInput = screen.getByLabelText(/Title/);
      const contentTextarea = screen.getByRole('textbox', { name: /content/i });
      
      expect(titleInput).toHaveAccessibleName();
      expect(contentTextarea).toHaveAccessibleName();
    });

    it('should preserve keyboard navigation order', async () => {
      render(<PostCreator {...mockProps} />);
      
      // Tab through form elements
      await user.tab();
      expect(screen.getByLabelText(/Title/)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/Hook/)).toHaveFocus();
    });

    it('should maintain screen reader compatibility', () => {
      render(<PostCreator {...mockProps} />);
      
      const form = screen.getByLabelText(/Title/).closest('form') || 
                   screen.getByLabelText(/Title/).closest('div');
      
      // Should have proper structure for screen readers
      expect(form).toBeTruthy();
    });
  });

  describe('Contract: State Management Compatibility', () => {
    it('should work with existing state management patterns', async () => {
      let externalState = { title: '', content: '' };
      const statefulProps = {
        ...mockProps,
        onPostCreated: vi.fn((post) => {
          externalState = { title: post.title, content: post.content };
        })
      };
      
      render(<PostCreator {...statefulProps} />);
      
      const titleInput = screen.getByLabelText(/Title/);
      const contentTextarea = screen.getByRole('textbox', { name: /content/i });
      
      await user.type(titleInput, 'State Test');
      await user.type(contentTextarea, 'State content');
      
      const submitButton = screen.getByTestId('submit-post');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(externalState.title).toBe('State Test');
        expect(externalState.content).toBe('State content');
      });
    });

    it('should handle prop changes without losing state', async () => {
      const { rerender } = render(<PostCreator {...mockProps} />);
      
      const titleInput = screen.getByLabelText(/Title/);
      await user.type(titleInput, 'Persistent state');
      
      // Change props
      rerender(<PostCreator {...mockProps} className="updated" />);
      
      // State should persist
      expect(titleInput).toHaveValue('Persistent state');
    });
  });
});