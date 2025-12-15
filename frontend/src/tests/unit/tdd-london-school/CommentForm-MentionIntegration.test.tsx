import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentForm } from '../../../components/CommentForm';
import { MentionService } from '../../../services/MentionService';
import { apiService } from '../../../services/api';

// Mock dependencies
jest.mock('../../../services/MentionService');
jest.mock('../../../services/api');

const MockedMentionService = MentionService as jest.Mocked<typeof MentionService>;
const MockedApiService = apiService as jest.Mocked<typeof apiService>;

describe('TDD London School: CommentForm @ Mention Integration', () => {
  const mockOnCommentAdded = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup MentionService mocks
    MockedMentionService.searchMentions.mockResolvedValue([
      {
        id: 'analyst',
        name: 'data-analyst-agent',
        displayName: 'Data Analyst',
        description: 'Data analysis and insights'
      },
      {
        id: 'reviewer',
        name: 'code-reviewer-agent',
        displayName: 'Code Reviewer',
        description: 'Code review and quality assurance'
      }
    ]);
    
    MockedMentionService.getQuickMentions.mockReturnValue([
      {
        id: 'analyst',
        name: 'data-analyst-agent',
        displayName: 'Data Analyst',
        description: 'Data analysis and insights'
      }
    ]);
    
    MockedMentionService.getAllAgents.mockReturnValue([
      {
        id: 'analyst',
        name: 'data-analyst-agent',
        displayName: 'Data Analyst',
        description: 'Data analysis and insights'
      },
      {
        id: 'reviewer',
        name: 'code-reviewer-agent',
        displayName: 'Code Reviewer',
        description: 'Code review and quality assurance'
      }
    ]);
    
    MockedMentionService.extractMentions.mockImplementation((text: string) => {
      const mentions = text.match(/@([\w-]+)/g);
      return mentions ? mentions.map(m => m.slice(1)) : [];
    });
    
    // Mock API service
    MockedApiService.createComment.mockResolvedValue({ 
      id: '1', 
      content: 'Test comment',
      author: 'test-user'
    });
  });

  const renderCommentForm = (props = {}) => {
    return render(
      <CommentForm 
        postId="test-post-1"
        onCommentAdded={mockOnCommentAdded}
        useMentionInput={true}
        {...props}
      />
    );
  };

  describe('RED Phase: @ Keystroke Detection in MentionInput Mode', () => {
    test('should use MentionInput when useMentionInput is true', () => {
      renderCommentForm({ useMentionInput: true });
      
      // Should show the MentionInput debug indicator
      expect(screen.getByText(/EMERGENCY DEBUG: MentionInput ACTIVE/)).toBeInTheDocument();
    });

    test('should trigger MentionService.searchMentions when @ is typed', async () => {
      const user = userEvent.setup();
      renderCommentForm();
      
      // Find the comment input (inside MentionInput)
      const commentInput = screen.getByPlaceholderText(/Provide technical analysis/i);
      
      // Type @ symbol
      await user.type(commentInput, '@');
      
      // Wait for debounced search call
      await waitFor(() => {
        expect(MockedMentionService.searchMentions).toHaveBeenCalledWith('', expect.any(Object));
      }, { timeout: 2000 });
    });

    test('should show mention dropdown when @ is typed', async () => {
      const user = userEvent.setup();
      renderCommentForm();
      
      const commentInput = screen.getByPlaceholderText(/Provide technical analysis/i);
      
      // Type @ symbol
      await user.type(commentInput, '@');
      
      // Wait for dropdown to appear
      await waitFor(() => {
        expect(screen.getByRole('listbox', { name: /agent suggestions/i })).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    test('should display agent suggestions in dropdown', async () => {
      const user = userEvent.setup();
      renderCommentForm();
      
      const commentInput = screen.getByPlaceholderText(/Provide technical analysis/i);
      
      // Type @ symbol
      await user.type(commentInput, '@');
      
      // Wait for suggestions to load
      await waitFor(() => {
        expect(screen.getByText('Data Analyst')).toBeInTheDocument();
        expect(screen.getByText('Code Reviewer')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    test('should allow keyboard navigation through agent suggestions', async () => {
      const user = userEvent.setup();
      renderCommentForm();
      
      const commentInput = screen.getByPlaceholderText(/Provide technical analysis/i);
      
      // Type @ and wait for dropdown
      await user.type(commentInput, '@');
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      // Navigate with arrow keys
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');
      
      // First suggestion should be highlighted
      const firstOption = screen.getAllByRole('option')[0];
      expect(firstOption).toHaveAttribute('aria-selected', 'true');
    });

    test('should insert mention when agent is selected via Enter key', async () => {
      const user = userEvent.setup();
      renderCommentForm();
      
      const commentInput = screen.getByPlaceholderText(/Provide technical analysis/i);
      
      // Type @ and wait for dropdown
      await user.type(commentInput, '@');
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      // Select first agent with Enter
      await user.keyboard('{Enter}');
      
      // Verify mention is inserted
      await waitFor(() => {
        expect(commentInput).toHaveValue('@data-analyst-agent ');
      });
    });

    test('should insert mention when agent is clicked', async () => {
      const user = userEvent.setup();
      renderCommentForm();
      
      const commentInput = screen.getByPlaceholderText(/Provide technical analysis/i);
      
      // Type @ and wait for dropdown
      await user.type(commentInput, '@');
      await waitFor(() => {
        expect(screen.getByText('Data Analyst')).toBeInTheDocument();
      });
      
      // Click on first agent
      await user.click(screen.getByText('Data Analyst'));
      
      // Verify mention is inserted
      await waitFor(() => {
        expect(commentInput).toHaveValue('@data-analyst-agent ');
      });
    });
  });

  describe('RED Phase: Legacy Textarea Mode Compatibility', () => {
    test('should use legacy textarea when useMentionInput is false', () => {
      renderCommentForm({ useMentionInput: false });
      
      // Should NOT show the MentionInput debug indicator
      expect(screen.queryByText(/EMERGENCY DEBUG: MentionInput ACTIVE/)).not.toBeInTheDocument();
      
      // Should show regular textarea
      const textarea = screen.getByPlaceholderText(/Provide technical analysis/i);
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    test('should show legacy mention suggestions in textarea mode', async () => {
      const user = userEvent.setup();
      renderCommentForm({ 
        useMentionInput: false,
        mentionSuggestions: ['data-analyst-agent', 'code-reviewer-agent']
      });
      
      const textarea = screen.getByPlaceholderText(/Provide technical analysis/i);
      
      // Type @ symbol
      await user.type(textarea, '@data');
      
      // Should show legacy mention dropdown (different from MentionInput)
      await waitFor(() => {
        // Legacy mode shows username suggestions differently
        expect(screen.getByText('data-analyst-agent')).toBeInTheDocument();
      });
    });
  });

  describe('RED Phase: Form Submission Integration', () => {
    test('should extract mentions and include in API call when using MentionInput', async () => {
      const user = userEvent.setup();
      renderCommentForm();
      
      const commentInput = screen.getByPlaceholderText(/Provide technical analysis/i);
      
      // Type comment with mention
      await user.type(commentInput, 'Great analysis @data-analyst-agent!');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /Submit Analysis/i });
      await user.click(submitButton);
      
      // Verify API call includes extracted mentions
      await waitFor(() => {
        expect(MockedApiService.createComment).toHaveBeenCalledWith(
          'test-post-1',
          'Great analysis @data-analyst-agent!',
          expect.objectContaining({
            mentionedUsers: ['data-analyst-agent']
          })
        );
      });
    });

    test('should handle multiple mentions in comment', async () => {
      const user = userEvent.setup();
      renderCommentForm();
      
      const commentInput = screen.getByPlaceholderText(/Provide technical analysis/i);
      
      // Type comment with multiple mentions
      await user.type(commentInput, 'CC @data-analyst-agent and @code-reviewer-agent');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /Submit Analysis/i });
      await user.click(submitButton);
      
      // Verify API call includes all mentions
      await waitFor(() => {
        expect(MockedApiService.createComment).toHaveBeenCalledWith(
          'test-post-1',
          'CC @data-analyst-agent and @code-reviewer-agent',
          expect.objectContaining({
            mentionedUsers: ['data-analyst-agent', 'code-reviewer-agent']
          })
        );
      });
    });

    test('should call onCommentAdded callback after successful submission', async () => {
      const user = userEvent.setup();
      renderCommentForm();
      
      const commentInput = screen.getByPlaceholderText(/Provide technical analysis/i);
      
      // Type and submit comment
      await user.type(commentInput, 'Test comment @data-analyst-agent');
      const submitButton = screen.getByRole('button', { name: /Submit Analysis/i });
      await user.click(submitButton);
      
      // Verify callback is called
      await waitFor(() => {
        expect(mockOnCommentAdded).toHaveBeenCalled();
      });
    });

    test('should clear form after successful submission', async () => {
      const user = userEvent.setup();
      renderCommentForm();
      
      const commentInput = screen.getByPlaceholderText(/Provide technical analysis/i);
      
      // Type and submit comment
      await user.type(commentInput, 'Test comment');
      const submitButton = screen.getByRole('button', { name: /Submit Analysis/i });
      await user.click(submitButton);
      
      // Verify form is cleared
      await waitFor(() => {
        expect(commentInput).toHaveValue('');
      });
    });
  });

  describe('RED Phase: Reply Mode Integration', () => {
    test('should show reply indicator when parentId is provided', () => {
      renderCommentForm({ parentId: 'parent-comment-123' });
      
      expect(screen.getByText(/Replying with technical analysis/i)).toBeInTheDocument();
    });

    test('should include parentId in API call for replies', async () => {
      const user = userEvent.setup();
      renderCommentForm({ parentId: 'parent-comment-123' });
      
      const commentInput = screen.getByPlaceholderText(/Provide technical analysis/i);
      
      // Type and submit reply
      await user.type(commentInput, 'Reply with @data-analyst-agent mention');
      const submitButton = screen.getByRole('button', { name: /Submit Analysis/i });
      await user.click(submitButton);
      
      // Verify API call includes parentId
      await waitFor(() => {
        expect(MockedApiService.createComment).toHaveBeenCalledWith(
          'test-post-1',
          'Reply with @data-analyst-agent mention',
          expect.objectContaining({
            parentId: 'parent-comment-123'
          })
        );
      });
    });
  });

  describe('RED Phase: Error Handling', () => {
    test('should handle MentionService failures gracefully', async () => {
      MockedMentionService.searchMentions.mockRejectedValue(new Error('Service error'));
      
      const user = userEvent.setup();
      renderCommentForm();
      
      const commentInput = screen.getByPlaceholderText(/Provide technical analysis/i);
      
      // Type @ symbol
      await user.type(commentInput, '@');
      
      // Should not crash the component
      await waitFor(() => {
        expect(commentInput).toBeInTheDocument();
      });
    });

    test('should handle API submission errors', async () => {
      MockedApiService.createComment.mockRejectedValue(new Error('API Error'));
      
      const user = userEvent.setup();
      renderCommentForm();
      
      const commentInput = screen.getByPlaceholderText(/Provide technical analysis/i);
      
      // Type and submit comment
      await user.type(commentInput, 'Test comment');
      const submitButton = screen.getByRole('button', { name: /Submit Analysis/i });
      await user.click(submitButton);
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Failed to post technical analysis/i)).toBeInTheDocument();
      });
    });

    test('should prevent submission of empty comments', async () => {
      const user = userEvent.setup();
      renderCommentForm();
      
      const submitButton = screen.getByRole('button', { name: /Submit Analysis/i });
      
      // Try to submit empty form
      await user.click(submitButton);
      
      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/Comment content is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Mock Behavior Verification (London School)', () => {
    test('should verify correct collaboration between MentionInput and MentionService', async () => {
      const user = userEvent.setup();
      renderCommentForm();
      
      const commentInput = screen.getByPlaceholderText(/Provide technical analysis/i);
      
      // Type @ symbol
      await user.type(commentInput, '@');
      
      // Verify initial search call
      await waitFor(() => {
        expect(MockedMentionService.searchMentions).toHaveBeenCalledWith('', expect.any(Object));
      });
      
      // Type query
      await user.type(commentInput, 'data');
      
      // Verify search call with query
      await waitFor(() => {
        expect(MockedMentionService.searchMentions).toHaveBeenCalledWith('data', expect.any(Object));
      });
    });

    test('should verify MentionService.extractMentions is called during submission', async () => {
      const user = userEvent.setup();
      renderCommentForm();
      
      const commentInput = screen.getByPlaceholderText(/Provide technical analysis/i);
      
      // Type comment with mention
      await user.type(commentInput, 'Comment with @data-analyst-agent mention');
      
      // Submit
      const submitButton = screen.getByRole('button', { name: /Submit Analysis/i });
      await user.click(submitButton);
      
      // Verify extractMentions was called
      await waitFor(() => {
        expect(MockedMentionService.extractMentions).toHaveBeenCalledWith(
          'Comment with @data-analyst-agent mention'
        );
      });
    });

    test('should verify interaction sequence: search -> select -> extract -> submit', async () => {
      const user = userEvent.setup();
      renderCommentForm();
      
      const commentInput = screen.getByPlaceholderText(/Provide technical analysis/i);
      
      // Step 1: Search
      await user.type(commentInput, '@');
      await waitFor(() => {
        expect(MockedMentionService.searchMentions).toHaveBeenCalled();
      });
      
      // Step 2: Select (simulated by typing full mention)
      await user.type(commentInput, 'data-analyst-agent test comment');
      
      // Step 3: Submit (which should extract mentions)
      const submitButton = screen.getByRole('button', { name: /Submit Analysis/i });
      await user.click(submitButton);
      
      // Step 4: Verify extraction and submission
      await waitFor(() => {
        expect(MockedMentionService.extractMentions).toHaveBeenCalled();
        expect(MockedApiService.createComment).toHaveBeenCalled();
      });
    });
  });
});