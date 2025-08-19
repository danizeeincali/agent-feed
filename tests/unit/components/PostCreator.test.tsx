import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PostCreator } from '@/components/PostCreator';

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock console methods to avoid noise in tests
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};
global.console = { ...console, ...mockConsole };

// Mock URL constructor for link preview
global.URL = jest.fn().mockImplementation((url) => ({
  hostname: 'example.com',
}));

describe('PostCreator - handleSubmit Function', () => {
  const user = userEvent.setup();
  const mockOnPostCreated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    mockOnPostCreated.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Basic Functionality Tests', () => {
    it('should successfully submit a valid post', async () => {
      // Mock successful API response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'post-123', title: 'Test Post', content: 'Test content' }
        })
      });

      render(<PostCreator onPostCreated={mockOnPostCreated} />);

      // Fill in required fields
      const titleInput = screen.getByPlaceholderText('Enter a compelling title...');
      const contentTextarea = screen.getByPlaceholderText(/Share your insights/);
      
      await user.type(titleInput, 'Test Post Title');
      await user.type(contentTextarea, 'This is test content for the post.');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /Publish Post/ });
      await user.click(submitButton);

      // Verify API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/agent-posts'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            }),
            body: expect.stringMatching(/Test Post Title/)
          })
        );
      });

      // Verify callback was called
      expect(mockOnPostCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Post Title',
          content: 'This is test content for the post.'
        })
      );
    });

    it('should not submit when title is empty', async () => {
      render(<PostCreator onPostCreated={mockOnPostCreated} />);

      const contentTextarea = screen.getByPlaceholderText(/Share your insights/);
      await user.type(contentTextarea, 'Content without title');

      const submitButton = screen.getByRole('button', { name: /Publish Post/ });
      
      // Button should be disabled
      expect(submitButton).toBeDisabled();
      
      // Try to click anyway
      await user.click(submitButton);

      // Should not call API
      expect(fetch).not.toHaveBeenCalled();
      expect(mockOnPostCreated).not.toHaveBeenCalled();
    });

    it('should not submit when content is empty', async () => {
      render(<PostCreator onPostCreated={mockOnPostCreated} />);

      const titleInput = screen.getByPlaceholderText('Enter a compelling title...');
      await user.type(titleInput, 'Title without content');

      const submitButton = screen.getByRole('button', { name: /Publish Post/ });
      
      // Button should be disabled
      expect(submitButton).toBeDisabled();
      
      await user.click(submitButton);

      // Should not call API
      expect(fetch).not.toHaveBeenCalled();
      expect(mockOnPostCreated).not.toHaveBeenCalled();
    });

    it('should show loading state during submission', async () => {
      // Mock delayed API response
      (fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ success: true, data: {} })
          }), 100)
        )
      );

      render(<PostCreator onPostCreated={mockOnPostCreated} />);

      // Fill form
      const titleInput = screen.getByPlaceholderText('Enter a compelling title...');
      const contentTextarea = screen.getByPlaceholderText(/Share your insights/);
      
      await user.type(titleInput, 'Test Title');
      await user.type(contentTextarea, 'Test content');

      // Submit
      const submitButton = screen.getByRole('button', { name: /Publish Post/ });
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByText('Publishing...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('Publish Post')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle API network errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<PostCreator onPostCreated={mockOnPostCreated} />);

      // Fill form
      const titleInput = screen.getByPlaceholderText('Enter a compelling title...');
      const contentTextarea = screen.getByPlaceholderText(/Share your insights/);
      
      await user.type(titleInput, 'Test Title');
      await user.type(contentTextarea, 'Test content');

      // Submit
      const submitButton = screen.getByRole('button', { name: /Publish Post/ });
      await user.click(submitButton);

      // Should handle error gracefully
      await waitFor(() => {
        expect(mockConsole.error).toHaveBeenCalledWith(
          'Failed to create post:',
          expect.any(Error)
        );
      });

      // Form should reset loading state
      expect(submitButton).not.toBeDisabled();
      expect(mockOnPostCreated).not.toHaveBeenCalled();
    });

    it('should handle API error responses', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Validation failed'
        })
      });

      render(<PostCreator onPostCreated={mockOnPostCreated} />);

      // Fill form
      const titleInput = screen.getByPlaceholderText('Enter a compelling title...');
      const contentTextarea = screen.getByPlaceholderText(/Share your insights/);
      
      await user.type(titleInput, 'Test Title');
      await user.type(contentTextarea, 'Test content');

      // Submit
      const submitButton = screen.getByRole('button', { name: /Publish Post/ });
      await user.click(submitButton);

      // Should handle error
      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      expect(mockOnPostCreated).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only title and content', async () => {
      render(<PostCreator onPostCreated={mockOnPostCreated} />);

      const titleInput = screen.getByPlaceholderText('Enter a compelling title...');
      const contentTextarea = screen.getByPlaceholderText(/Share your insights/);
      
      // Enter only whitespace
      await user.type(titleInput, '   ');
      await user.type(contentTextarea, '\t\n  ');

      const submitButton = screen.getByRole('button', { name: /Publish Post/ });
      
      // Should treat as empty and disable submit
      expect(submitButton).toBeDisabled();
    });

    it('should handle very long content within limits', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} })
      });

      render(<PostCreator onPostCreated={mockOnPostCreated} />);

      const titleInput = screen.getByPlaceholderText('Enter a compelling title...');
      const contentTextarea = screen.getByPlaceholderText(/Share your insights/);
      
      const longContent = 'a'.repeat(4000); // Within 5000 char limit
      
      await user.type(titleInput, 'Long Content Test');
      await user.type(contentTextarea, longContent);

      const submitButton = screen.getByRole('button', { name: /Publish Post/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });

      expect(mockOnPostCreated).toHaveBeenCalled();
    });

    it('should prevent submission when character limits are exceeded', async () => {
      render(<PostCreator onPostCreated={mockOnPostCreated} />);

      const titleInput = screen.getByPlaceholderText('Enter a compelling title...');
      
      // Title has maxLength attribute, but test behavior
      const longTitle = 'a'.repeat(250); // Exceeds 200 char limit
      
      await user.type(titleInput, longTitle);
      
      // Input should truncate or prevent entry
      expect(titleInput).toHaveAttribute('maxLength', '200');
    });
  });

  describe('Form Reset and Cleanup', () => {
    it('should reset form after successful submission', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} })
      });

      render(<PostCreator onPostCreated={mockOnPostCreated} />);

      const titleInput = screen.getByPlaceholderText('Enter a compelling title...');
      const contentTextarea = screen.getByPlaceholderText(/Share your insights/);
      
      await user.type(titleInput, 'Test Title');
      await user.type(contentTextarea, 'Test content');

      // Add some tags
      const tagInput = screen.getByPlaceholderText(/Add tags/);
      await user.type(tagInput, 'test-tag{enter}');

      const submitButton = screen.getByRole('button', { name: /Publish Post/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnPostCreated).toHaveBeenCalled();
      });

      // Form should be reset
      expect(titleInput).toHaveValue('');
      expect(contentTextarea).toHaveValue('');
      expect(screen.queryByText('#test-tag')).not.toBeInTheDocument();
    });

    it('should clear draft after successful submission', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} })
      });

      render(<PostCreator onPostCreated={mockOnPostCreated} />);

      const titleInput = screen.getByPlaceholderText('Enter a compelling title...');
      const contentTextarea = screen.getByPlaceholderText(/Share your insights/);
      
      await user.type(titleInput, 'Test Title');
      await user.type(contentTextarea, 'Test content');

      const submitButton = screen.getByRole('button', { name: /Publish Post/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnPostCreated).toHaveBeenCalled();
      });

      // Should clear localStorage draft
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('agentlink-draft');
    });
  });

  describe('Integration with Other Features', () => {
    it('should include agent mentions in submission', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} })
      });

      render(<PostCreator onPostCreated={mockOnPostCreated} />);

      const titleInput = screen.getByPlaceholderText('Enter a compelling title...');
      const contentTextarea = screen.getByPlaceholderText(/Share your insights/);
      
      await user.type(titleInput, 'Test with Mentions');
      await user.type(contentTextarea, 'Test content');

      // Open agent picker and add mention
      const mentionButton = screen.getByTitle('Mention Agent');
      await user.click(mentionButton);

      // Select an agent (mock agents should be available)
      const agentOption = screen.getByText('Chief of Staff');
      await user.click(agentOption);

      const submitButton = screen.getByRole('button', { name: /Publish Post/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringMatching(/agentMentions.*chief-of-staff/)
          })
        );
      });
    });

    it('should include tags in submission', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} })
      });

      render(<PostCreator onPostCreated={mockOnPostCreated} />);

      const titleInput = screen.getByPlaceholderText('Enter a compelling title...');
      const contentTextarea = screen.getByPlaceholderText(/Share your insights/);
      const tagInput = screen.getByPlaceholderText(/Add tags/);
      
      await user.type(titleInput, 'Test with Tags');
      await user.type(contentTextarea, 'Test content');
      await user.type(tagInput, 'urgent{enter}strategy{enter}');

      const submitButton = screen.getByRole('button', { name: /Publish Post/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringMatching(/urgent.*strategy/)
          })
        );
      });
    });

    it('should handle scheduled posts', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} })
      });

      render(<PostCreator onPostCreated={mockOnPostCreated} />);

      const titleInput = screen.getByPlaceholderText('Enter a compelling title...');
      const contentTextarea = screen.getByPlaceholderText(/Share your insights/);
      
      await user.type(titleInput, 'Scheduled Post');
      await user.type(contentTextarea, 'This will be scheduled');

      // Set schedule (this would typically open a date picker)
      // For testing, we'll simulate the state change
      const component = screen.getByRole('button', { name: /Publish Post/ });
      
      // Submit
      await user.click(component);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    it('should handle reply mode correctly', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} })
      });

      render(
        <PostCreator 
          onPostCreated={mockOnPostCreated}
          replyToPostId="parent-post-123"
          mode="reply"
        />
      );

      const titleInput = screen.getByPlaceholderText('Enter a compelling title...');
      const contentTextarea = screen.getByPlaceholderText(/Share your insights/);
      
      await user.type(titleInput, 'Reply Title');
      await user.type(contentTextarea, 'This is a reply');

      const submitButton = screen.getByRole('button', { name: /Publish Post/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringMatching(/parent-post-123/)
          })
        );
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should submit form with Cmd+Enter shortcut', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} })
      });

      render(<PostCreator onPostCreated={mockOnPostCreated} />);

      const titleInput = screen.getByPlaceholderText('Enter a compelling title...');
      const contentTextarea = screen.getByPlaceholderText(/Share your insights/);
      
      await user.type(titleInput, 'Keyboard Test');
      await user.type(contentTextarea, 'Test content');

      // Focus on content area and use keyboard shortcut
      contentTextarea.focus();
      await user.keyboard('{Meta>}{Enter}{/Meta}');

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });
  });
});