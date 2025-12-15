/**
 * TDD Test Suite: QuickPostSection Component
 * Phase 4 - Comprehensive test coverage for quick posting functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QuickPostSection } from '../../../src/components/posting-interface/QuickPostSection';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('QuickPostSection Component', () => {
  const mockOnPostCreated = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders with auto-focused textarea', () => {
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i);
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveFocus();
    });

    it('displays character counter', () => {
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      expect(screen.getByText('0/500')).toBeInTheDocument();
    });

    it('shows quick tag buttons', () => {
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      expect(screen.getByText('#update')).toBeInTheDocument();
      expect(screen.getByText('#insight')).toBeInTheDocument();
      expect(screen.getByText('#question')).toBeInTheDocument();
      expect(screen.getByText('#urgent')).toBeInTheDocument();
    });

    it('shows agent mention buttons', () => {
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      expect(screen.getByText('@TechReviewer')).toBeInTheDocument();
      expect(screen.getByText('@SystemValidator')).toBeInTheDocument();
      expect(screen.getByText('@CodeAuditor')).toBeInTheDocument();
    });

    it('has disabled submit button initially', () => {
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      const submitButton = screen.getByRole('button', { name: /quick post/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Text Input Handling', () => {
    it('updates character counter as user types', async () => {
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i);
      await user.type(textarea, 'Test content');
      
      expect(screen.getByText('12/500')).toBeInTheDocument();
    });

    it('auto-expands textarea as content grows', async () => {
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i) as HTMLTextAreaElement;
      const initialHeight = textarea.style.height;
      
      await user.type(textarea, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
      
      // Height should have increased (this tests the useEffect that adjusts height)
      await waitFor(() => {
        expect(textarea.style.height).not.toBe(initialHeight);
      });
    });

    it('shows error state when exceeding character limit', async () => {
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i);
      const longText = 'a'.repeat(501);
      
      await user.type(textarea, longText);
      
      expect(screen.getByText('501/500')).toHaveClass('text-red-500');
      expect(textarea).toHaveClass('border-red-300');
      
      const submitButton = screen.getByRole('button', { name: /quick post/i });
      expect(submitButton).toBeDisabled();
    });

    it('enables submit button when content is present and within limits', async () => {
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i);
      await user.type(textarea, 'Valid content');
      
      const submitButton = screen.getByRole('button', { name: /quick post/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Auto-detection Features', () => {
    it('auto-detects and selects hashtags from content', async () => {
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i);
      await user.type(textarea, 'This is an #update with #insight');
      
      await waitFor(() => {
        const updateTag = screen.getByText('#update');
        const insightTag = screen.getByText('#insight');
        
        expect(updateTag).toHaveClass('bg-blue-100');
        expect(insightTag).toHaveClass('bg-blue-100');
      });
    });

    it('auto-detects and selects agent mentions from content', async () => {
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i);
      await user.type(textarea, 'Need review from @TechReviewer and @CodeAuditor');
      
      await waitFor(() => {
        const techReviewer = screen.getByText('@TechReviewer');
        const codeAuditor = screen.getByText('@CodeAuditor');
        
        expect(techReviewer).toHaveClass('bg-purple-100');
        expect(codeAuditor).toHaveClass('bg-purple-100');
      });
    });

    it('handles mixed hashtags and mentions', async () => {
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i);
      await user.type(textarea, '#urgent question for @SystemValidator about #planning');
      
      await waitFor(() => {
        expect(screen.getByText('#urgent')).toHaveClass('bg-blue-100');
        expect(screen.getByText('#planning')).toHaveClass('bg-blue-100');
        expect(screen.getByText('@SystemValidator')).toHaveClass('bg-purple-100');
      });
    });
  });

  describe('Tag Management', () => {
    it('toggles tag selection when clicked', async () => {
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      const updateTag = screen.getByText('#update');
      expect(updateTag).toHaveClass('bg-gray-100');
      
      await user.click(updateTag);
      expect(updateTag).toHaveClass('bg-blue-100');
      
      await user.click(updateTag);
      expect(updateTag).toHaveClass('bg-gray-100');
    });

    it('handles multiple tag selections', async () => {
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      const updateTag = screen.getByText('#update');
      const insightTag = screen.getByText('#insight');
      
      await user.click(updateTag);
      await user.click(insightTag);
      
      expect(updateTag).toHaveClass('bg-blue-100');
      expect(insightTag).toHaveClass('bg-blue-100');
    });

    it('toggles agent selection when clicked', async () => {
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      const techReviewer = screen.getByText('@TechReviewer');
      expect(techReviewer).toHaveClass('bg-gray-100');
      
      await user.click(techReviewer);
      expect(techReviewer).toHaveClass('bg-purple-100');
      
      await user.click(techReviewer);
      expect(techReviewer).toHaveClass('bg-gray-100');
    });
  });

  describe('Formatting Features', () => {
    it('inserts bold formatting with keyboard shortcut', async () => {
      render(<QuickPostSection />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i);
      await user.type(textarea, 'Some text');
      
      // Select text
      textarea.setSelectionRange(0, 4); // Select "Some"
      
      await user.keyboard('{Meta>}b{/Meta}');
      
      expect(textarea.value).toContain('**Some**');
    });

    it('inserts italic formatting with keyboard shortcut', async () => {
      render(<QuickPostSection />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i);
      await user.type(textarea, 'Some text');
      
      textarea.setSelectionRange(0, 4);
      
      await user.keyboard('{Meta>}i{/Meta}');
      
      expect(textarea.value).toContain('*Some*');
    });

    it('inserts link formatting with keyboard shortcut', async () => {
      render(<QuickPostSection />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i);
      await user.type(textarea, 'Click here');
      
      textarea.setSelectionRange(0, 10);
      
      await user.keyboard('{Meta>}k{/Meta}');
      
      expect(textarea.value).toContain('[Click here](url)');
    });

    it('shows formatting toolbar on desktop', () => {
      render(<QuickPostSection isMobile={false} />);
      
      expect(screen.getByTitle(/Bold/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Italic/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Link/i)).toBeInTheDocument();
    });

    it('hides formatting toolbar on mobile', () => {
      render(<QuickPostSection isMobile={true} />);
      
      expect(screen.queryByTitle(/Bold/i)).not.toBeInTheDocument();
      expect(screen.queryByTitle(/Italic/i)).not.toBeInTheDocument();
      expect(screen.queryByTitle(/Link/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { id: 'quick-123', title: 'Quick Post', content: 'Test content' }
        })
      });
    });

    it('submits quick post with correct API payload', async () => {
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i);
      await user.type(textarea, 'This is a quick #update');
      
      const submitButton = screen.getByRole('button', { name: /quick post/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/agent-posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('"isQuickPost":true')
        });
      });
    });

    it('submits with selected tags and agents', async () => {
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i);
      await user.type(textarea, 'Quick post content');
      
      // Select tags and agents
      await user.click(screen.getByText('#urgent'));
      await user.click(screen.getByText('@TechReviewer'));
      
      const submitButton = screen.getByRole('button', { name: /quick post/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        const callArgs = mockFetch.mock.calls[0];
        const payload = JSON.parse(callArgs[1].body);
        
        expect(payload.metadata.tags).toContain('urgent');
        expect(payload.metadata.agentMentions).toContain('TechReviewer');
      });
    });

    it('shows loading state during submission', async () => {
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: {} })
        }), 100))
      );
      
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i);
      await user.type(textarea, 'Test content');
      
      const submitButton = screen.getByRole('button', { name: /quick post/i });
      await user.click(submitButton);
      
      expect(screen.getByText('Posting...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('shows success state after successful submission', async () => {
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i);
      await user.type(textarea, 'Test content');
      
      const submitButton = screen.getByRole('button', { name: /quick post/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Posted!')).toBeInTheDocument();
      });
    });

    it('clears form after successful submission', async () => {
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i);
      await user.type(textarea, 'Test content');
      
      // Select tag
      await user.click(screen.getByText('#update'));
      
      const submitButton = screen.getByRole('button', { name: /quick post/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(textarea.value).toBe('');
        expect(screen.getByText('#update')).toHaveClass('bg-gray-100'); // Deselected
      });
    });

    it('calls onPostCreated callback with result', async () => {
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i);
      await user.type(textarea, 'Test content');
      
      const submitButton = screen.getByRole('button', { name: /quick post/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnPostCreated).toHaveBeenCalledWith({
          id: 'quick-123',
          title: 'Quick Post',
          content: 'Test content'
        });
      });
    });

    it('submits with Cmd+Enter keyboard shortcut', async () => {
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i);
      await user.type(textarea, 'Test content');
      
      await user.keyboard('{Meta>}{Enter}{/Meta}');
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API call fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i);
      await user.type(textarea, 'Test content');
      
      const submitButton = screen.getByRole('button', { name: /quick post/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });

    it('displays API error message from server', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({
          error: 'Content too short'
        })
      });
      
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i);
      await user.type(textarea, 'Test');
      
      const submitButton = screen.getByRole('button', { name: /quick post/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Content too short')).toBeInTheDocument();
      });
    });

    it('retains form data when submission fails', async () => {
      mockFetch.mockRejectedValue(new Error('Server error'));
      
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i);
      await user.type(textarea, 'Test content');
      
      await user.click(screen.getByText('#urgent'));
      
      const submitButton = screen.getByRole('button', { name: /quick post/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Server error/i)).toBeInTheDocument();
      });
      
      // Form should retain data
      expect(textarea.value).toBe('Test content');
      expect(screen.getByText('#urgent')).toHaveClass('bg-blue-100');
    });
  });

  describe('Mobile Optimizations', () => {
    it('uses correct input type for mobile to prevent zoom', () => {
      render(<QuickPostSection isMobile={true} />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i);
      expect(textarea).toHaveClass('text-base');
    });

    it('adapts layout for mobile screens', () => {
      render(<QuickPostSection isMobile={true} />);
      
      // Mobile should have more compact styling
      expect(screen.getByRole('button', { name: /quick post/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper labels and descriptions', () => {
      render(<QuickPostSection />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i);
      expect(textarea).toHaveAttribute('placeholder');
      
      expect(screen.getByText('Quick Tags')).toBeInTheDocument();
      expect(screen.getByText('Mention Agents')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      render(<QuickPostSection />);
      
      const textarea = screen.getByPlaceholderText(/What's your quick update/i);
      expect(textarea).toHaveFocus();
      
      await user.tab();
      
      // Should move to first tag or button
      expect(document.activeElement).not.toBe(textarea);
    });

    it('has accessible button states', () => {
      render(<QuickPostSection />);
      
      const submitButton = screen.getByRole('button', { name: /quick post/i });
      expect(submitButton).toHaveAttribute('disabled');
      
      // ARIA states would be tested here in a more complete implementation
    });
  });
});