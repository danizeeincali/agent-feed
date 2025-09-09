import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickPostSection } from '../../../components/posting-interface/QuickPostSection';
import { MentionService } from '../../../services/MentionService';

// Mock dependencies
jest.mock('../../../services/MentionService');

const MockedMentionService = MentionService as jest.Mocked<typeof MentionService>;

describe('TDD London School: QuickPostSection @ Mention Integration', () => {
  const mockOnPostCreated = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup MentionService mocks
    MockedMentionService.searchMentions.mockResolvedValue([
      {
        id: 'quick-agent-1',
        name: 'impact-filter-agent',
        displayName: 'Impact Filter',
        description: 'Business impact analysis'
      },
      {
        id: 'quick-agent-2',
        name: 'opportunity-scout-agent',
        displayName: 'Opportunity Scout',
        description: 'Market opportunity identification'
      }
    ]);
    
    MockedMentionService.getQuickMentions.mockReturnValue([
      {
        id: 'quick-agent-1',
        name: 'impact-filter-agent',
        displayName: 'Impact Filter',
        description: 'Business impact analysis'
      },
      {
        id: 'quick-agent-2',
        name: 'opportunity-scout-agent',
        displayName: 'Opportunity Scout',
        description: 'Market opportunity identification'
      },
      {
        id: 'quick-agent-3',
        name: 'goal-analyst-agent',
        displayName: 'Goal Analyst',
        description: 'Goal tracking and analysis'
      }
    ]);
    
    MockedMentionService.getAllAgents.mockReturnValue([
      {
        id: 'quick-agent-1',
        name: 'impact-filter-agent',
        displayName: 'Impact Filter',
        description: 'Business impact analysis'
      },
      {
        id: 'quick-agent-2',
        name: 'opportunity-scout-agent',
        displayName: 'Opportunity Scout',
        description: 'Market opportunity identification'
      }
    ]);
    
    MockedMentionService.extractMentions.mockImplementation((text: string) => {
      const mentions = text.match(/@([\w-]+)/g);
      return mentions ? mentions.map(m => m.slice(1)) : [];
    });
    
    // Mock fetch for API calls
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: '1', title: 'Quick Post' } })
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderQuickPostSection = (props = {}) => {
    return render(
      <QuickPostSection 
        onPostCreated={mockOnPostCreated}
        {...props}
      />
    );
  };

  describe('RED Phase: @ Keystroke Detection in QuickPost', () => {
    test('should use MentionInput for content field', () => {
      renderQuickPostSection();
      
      // Should show the MentionInput debug indicator
      expect(screen.getByText(/EMERGENCY DEBUG: QuickPost MentionInput ACTIVE/)).toBeInTheDocument();
    });

    test('should trigger MentionService.searchMentions when @ is typed in quick post', async () => {
      const user = userEvent.setup();
      renderQuickPostSection();
      
      // Find the content input (inside MentionInput)
      const contentInput = screen.getByPlaceholderText(/What's your quick update/i);
      
      // Type @ symbol
      await user.type(contentInput, '@');
      
      // Wait for debounced search call
      await waitFor(() => {
        expect(MockedMentionService.searchMentions).toHaveBeenCalledWith('', expect.any(Object));
      }, { timeout: 2000 });
    });

    test('should show mention dropdown when @ is typed in quick post', async () => {
      const user = userEvent.setup();
      renderQuickPostSection();
      
      const contentInput = screen.getByPlaceholderText(/What's your quick update/i);
      
      // Type @ symbol
      await user.type(contentInput, '@');
      
      // Wait for dropdown to appear
      await waitFor(() => {
        expect(screen.getByRole('listbox', { name: /agent suggestions/i })).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    test('should display agent suggestions specific to quick-post context', async () => {
      const user = userEvent.setup();
      renderQuickPostSection();
      
      const contentInput = screen.getByPlaceholderText(/What's your quick update/i);
      
      // Type @ symbol
      await user.type(contentInput, '@');
      
      // Wait for suggestions to load
      await waitFor(() => {
        expect(screen.getByText('Impact Filter')).toBeInTheDocument();
        expect(screen.getByText('Opportunity Scout')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    test('should allow keyboard navigation through agent suggestions in quick post', async () => {
      const user = userEvent.setup();
      renderQuickPostSection();
      
      const contentInput = screen.getByPlaceholderText(/What's your quick update/i);
      
      // Type @ and wait for dropdown
      await user.type(contentInput, '@');
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

    test('should insert mention when agent is selected via Enter key in quick post', async () => {
      const user = userEvent.setup();
      renderQuickPostSection();
      
      const contentInput = screen.getByPlaceholderText(/What's your quick update/i);
      
      // Type @ and wait for dropdown
      await user.type(contentInput, '@');
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      // Select first agent with Enter
      await user.keyboard('{Enter}');
      
      // Verify mention is inserted
      await waitFor(() => {
        expect(contentInput).toHaveValue('@impact-filter-agent ');
      });
    });

    test('should insert mention when agent is clicked in quick post', async () => {
      const user = userEvent.setup();
      renderQuickPostSection();
      
      const contentInput = screen.getByPlaceholderText(/What's your quick update/i);
      
      // Type @ and wait for dropdown
      await user.type(contentInput, '@');
      await waitFor(() => {
        expect(screen.getByText('Impact Filter')).toBeInTheDocument();
      });
      
      // Click on first agent
      await user.click(screen.getByText('Impact Filter'));
      
      // Verify mention is inserted
      await waitFor(() => {
        expect(contentInput).toHaveValue('@impact-filter-agent ');
      });
    });
  });

  describe('RED Phase: Quick Post Agent Buttons Integration', () => {
    test('should display quick mention agent buttons', () => {
      renderQuickPostSection();
      
      // Should show quick agent buttons from MentionService.getQuickMentions
      expect(screen.getByText('Impact Filter')).toBeInTheDocument();
      expect(screen.getByText('Opportunity Scout')).toBeInTheDocument();
      expect(screen.getByText('Goal Analyst')).toBeInTheDocument();
    });

    test('should add agent mention when quick button is clicked', async () => {
      const user = userEvent.setup();
      renderQuickPostSection();
      
      const contentInput = screen.getByPlaceholderText(/What's your quick update/i);
      
      // Click on Impact Filter button
      const impactFilterButton = screen.getByRole('button', { name: /Impact Filter/i });
      await user.click(impactFilterButton);
      
      // Should track the agent as mentioned
      expect(impactFilterButton).toHaveClass('bg-purple-100'); // Selected state
    });

    test('should toggle agent selection when quick button is clicked multiple times', async () => {
      const user = userEvent.setup();
      renderQuickPostSection();
      
      const impactFilterButton = screen.getByRole('button', { name: /Impact Filter/i });
      
      // Click once to select
      await user.click(impactFilterButton);
      expect(impactFilterButton).toHaveClass('bg-purple-100');
      
      // Click again to deselect
      await user.click(impactFilterButton);
      expect(impactFilterButton).not.toHaveClass('bg-purple-100');
    });

    test('should call MentionService.getQuickMentions with quick-post context', () => {
      renderQuickPostSection();
      
      // Verify the service was called with correct context
      expect(MockedMentionService.getQuickMentions).toHaveBeenCalledWith('quick-post');
    });
  });

  describe('RED Phase: Quick Post Form Submission', () => {
    test('should include mentioned agents in quick post submission', async () => {
      const user = userEvent.setup();
      renderQuickPostSection();
      
      const contentInput = screen.getByPlaceholderText(/What's your quick update/i);
      
      // Type content with mention
      await user.type(contentInput, 'Quick update @impact-filter-agent for review');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /Quick Post/i });
      await user.click(submitButton);
      
      // Verify API call includes agent mentions
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/agent-posts', 
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('agentMentions')
          })
        );
      });
    });

    test('should extract mentions from content using MentionService', async () => {
      const user = userEvent.setup();
      renderQuickPostSection();
      
      const contentInput = screen.getByPlaceholderText(/What's your quick update/i);
      
      // Type content with multiple mentions
      await user.type(contentInput, 'Update for @impact-filter-agent and @opportunity-scout-agent');
      
      // Wait for auto-detection to trigger
      await waitFor(() => {
        expect(MockedMentionService.extractMentions).toHaveBeenCalledWith(
          expect.stringContaining('@impact-filter-agent')
        );
      });
    });

    test('should handle quick post submission with keyboard shortcut', async () => {
      const user = userEvent.setup();
      renderQuickPostSection();
      
      const contentInput = screen.getByPlaceholderText(/What's your quick update/i);
      
      // Type content
      await user.type(contentInput, 'Quick update with @impact-filter-agent');
      
      // Use keyboard shortcut (Cmd+Enter)
      await user.keyboard('{Meta>}{Enter}');
      
      // Verify submission
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    test('should show success state after successful submission', async () => {
      const user = userEvent.setup();
      renderQuickPostSection();
      
      const contentInput = screen.getByPlaceholderText(/What's your quick update/i);
      
      // Type and submit
      await user.type(contentInput, 'Test quick post');
      const submitButton = screen.getByRole('button', { name: /Quick Post/i });
      await user.click(submitButton);
      
      // Should show success state
      await waitFor(() => {
        expect(screen.getByText('Posted!')).toBeInTheDocument();
      });
    });

    test('should clear form and refocus after successful submission', async () => {
      const user = userEvent.setup();
      renderQuickPostSection();
      
      const contentInput = screen.getByPlaceholderText(/What's your quick update/i);
      
      // Type and submit
      await user.type(contentInput, 'Test quick post');
      const submitButton = screen.getByRole('button', { name: /Quick Post/i });
      await user.click(submitButton);
      
      // Wait for success and reset
      await waitFor(() => {
        expect(contentInput).toHaveValue('');
      }, { timeout: 3000 });
    });

    test('should call onPostCreated callback after successful submission', async () => {
      const user = userEvent.setup();
      renderQuickPostSection();
      
      const contentInput = screen.getByPlaceholderText(/What's your quick update/i);
      
      // Type and submit
      await user.type(contentInput, 'Test post');
      const submitButton = screen.getByRole('button', { name: /Quick Post/i });
      await user.click(submitButton);
      
      // Verify callback is called
      await waitFor(() => {
        expect(mockOnPostCreated).toHaveBeenCalled();
      });
    });
  });

  describe('RED Phase: Character Limit Integration', () => {
    test('should enforce character limit and show counter', async () => {
      const user = userEvent.setup();
      renderQuickPostSection();
      
      const contentInput = screen.getByPlaceholderText(/What's your quick update/i);
      
      // Type some content
      await user.type(contentInput, 'Test content @impact-filter-agent');
      
      // Should show character counter
      expect(screen.getByText(/\/500/)).toBeInTheDocument();
    });

    test('should disable submission when over character limit', async () => {
      const user = userEvent.setup();
      renderQuickPostSection();
      
      const contentInput = screen.getByPlaceholderText(/What's your quick update/i);
      
      // Type content over limit (501 characters)
      const longContent = 'a'.repeat(501);
      await user.type(contentInput, longContent);
      
      // Submit button should be disabled
      const submitButton = screen.getByRole('button', { name: /Quick Post/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('RED Phase: Auto-detection Features', () => {
    test('should auto-detect hashtags from content', async () => {
      const user = userEvent.setup();
      renderQuickPostSection();
      
      const contentInput = screen.getByPlaceholderText(/What's your quick update/i);
      
      // Type content with hashtags
      await user.type(contentInput, 'Quick #update about #progress');
      
      // Should auto-select corresponding tags
      await waitFor(() => {
        const updateTag = screen.getByText('#update');
        expect(updateTag).toHaveClass('bg-blue-100'); // Selected state
      });
    });

    test('should auto-detect mentions and update selected agents', async () => {
      const user = userEvent.setup();
      renderQuickPostSection();
      
      const contentInput = screen.getByPlaceholderText(/What's your quick update/i);
      
      // Type content with mention
      await user.type(contentInput, 'Update @impact-filter-agent please review');
      
      // Should auto-detect and track the mention
      await waitFor(() => {
        expect(MockedMentionService.extractMentions).toHaveBeenCalled();
      });
    });
  });

  describe('RED Phase: Error Handling', () => {
    test('should handle MentionService errors gracefully', async () => {
      MockedMentionService.searchMentions.mockRejectedValue(new Error('Service error'));
      
      const user = userEvent.setup();
      renderQuickPostSection();
      
      const contentInput = screen.getByPlaceholderText(/What's your quick update/i);
      
      // Type @ symbol
      await user.type(contentInput, '@');
      
      // Should not crash the component
      await waitFor(() => {
        expect(contentInput).toBeInTheDocument();
      });
    });

    test('should handle API submission errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));
      
      const user = userEvent.setup();
      renderQuickPostSection();
      
      const contentInput = screen.getByPlaceholderText(/What's your quick update/i);
      
      // Type and submit
      await user.type(contentInput, 'Test post');
      const submitButton = screen.getByRole('button', { name: /Quick Post/i });
      await user.click(submitButton);
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Failed to create post/i)).toBeInTheDocument();
      });
    });

    test('should prevent submission of empty content', async () => {
      const user = userEvent.setup();
      renderQuickPostSection();
      
      const submitButton = screen.getByRole('button', { name: /Quick Post/i });
      
      // Submit button should be disabled for empty content
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Mock Behavior Verification (London School)', () => {
    test('should verify correct interaction sequence with MentionService for quick posts', async () => {
      const user = userEvent.setup();
      renderQuickPostSection();
      
      const contentInput = screen.getByPlaceholderText(/What's your quick update/i);
      
      // Type @ symbol
      await user.type(contentInput, '@');
      
      // Verify search call with quick-post context
      await waitFor(() => {
        expect(MockedMentionService.searchMentions).toHaveBeenCalledWith('', 
          expect.objectContaining({
            maxSuggestions: expect.any(Number)
          })
        );
      });
    });

    test('should verify MentionService.getQuickMentions is called for button rendering', () => {
      renderQuickPostSection();
      
      // Should call getQuickMentions with 'quick-post' context
      expect(MockedMentionService.getQuickMentions).toHaveBeenCalledWith('quick-post');
    });

    test('should verify MentionService.extractMentions is called during auto-detection', async () => {
      const user = userEvent.setup();
      renderQuickPostSection();
      
      const contentInput = screen.getByPlaceholderText(/What's your quick update/i);
      
      // Type content with mention
      await user.type(contentInput, 'Test @impact-filter-agent');
      
      // Verify extraction is called during auto-detection
      await waitFor(() => {
        expect(MockedMentionService.extractMentions).toHaveBeenCalledWith(
          expect.stringContaining('@impact-filter-agent')
        );
      });
    });

    test('should verify mention workflow: search -> select -> track -> submit', async () => {
      const user = userEvent.setup();
      renderQuickPostSection();
      
      const contentInput = screen.getByPlaceholderText(/What's your quick update/i);
      
      // Step 1: Search
      await user.type(contentInput, '@');
      await waitFor(() => {
        expect(MockedMentionService.searchMentions).toHaveBeenCalled();
      });
      
      // Step 2: Select (simulated by typing full mention)
      await user.type(contentInput, 'impact-filter-agent quick update');
      
      // Step 3: Track (auto-detection)
      await waitFor(() => {
        expect(MockedMentionService.extractMentions).toHaveBeenCalled();
      });
      
      // Step 4: Submit
      const submitButton = screen.getByRole('button', { name: /Quick Post/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });
});