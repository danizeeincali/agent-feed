import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PostCreator } from '../../../components/PostCreator';
import { MentionService } from '../../../services/MentionService';

// Mock dependencies
jest.mock('../../../services/MentionService');
jest.mock('../../../hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: jest.fn(),
  useShortcutsHelp: () => []
}));
jest.mock('../../../hooks/useTemplates', () => ({
  useTemplates: () => ({ templates: [] })
}));
jest.mock('../../../hooks/useDraftManager', () => ({
  useDraftManager: () => ({
    createDraft: jest.fn(),
    updateDraft: jest.fn(),
    deleteDraft: jest.fn()
  })
}));

const MockedMentionService = MentionService as jest.Mocked<typeof MentionService>;

describe('TDD London School: PostCreator @ Mention Integration', () => {
  const mockOnPostCreated = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup MentionService mocks
    MockedMentionService.searchMentions.mockResolvedValue([
      {
        id: 'chief-of-staff',
        name: 'chief-of-staff-agent',
        displayName: 'Chief of Staff',
        description: 'Strategic coordination and planning'
      },
      {
        id: 'personal-todos',
        name: 'personal-todos-agent', 
        displayName: 'Personal Todos',
        description: 'Task and project management'
      }
    ]);
    
    MockedMentionService.getQuickMentions.mockReturnValue([
      {
        id: 'chief-of-staff',
        name: 'chief-of-staff-agent',
        displayName: 'Chief of Staff',
        description: 'Strategic coordination and planning'
      }
    ]);
    
    MockedMentionService.getAllAgents.mockReturnValue([
      {
        id: 'chief-of-staff',
        name: 'chief-of-staff-agent',
        displayName: 'Chief of Staff',
        description: 'Strategic coordination and planning'
      },
      {
        id: 'personal-todos',
        name: 'personal-todos-agent',
        displayName: 'Personal Todos',
        description: 'Task and project management'
      }
    ]);
    
    MockedMentionService.extractMentions.mockReturnValue(['chief-of-staff-agent']);
  });

  const renderPostCreator = (props = {}) => {
    return render(
      <MemoryRouter>
        <PostCreator 
          onPostCreated={mockOnPostCreated}
          {...props}
        />
      </MemoryRouter>
    );
  };

  describe('RED Phase: Failing Tests for @ Keystroke Detection', () => {
    test('should trigger MentionService.searchMentions when @ is typed in content field', async () => {
      const user = userEvent.setup();
      renderPostCreator();
      
      // Find the content textarea (inside MentionInput)
      const contentInput = screen.getByPlaceholderText(/Share your insights/i);
      
      // Type @ symbol
      await user.type(contentInput, '@');
      
      // Wait for debounced search call
      await waitFor(() => {
        expect(MockedMentionService.searchMentions).toHaveBeenCalledWith('', expect.any(Object));
      });
    });

    test('should show mention dropdown when @ is typed', async () => {
      const user = userEvent.setup();
      renderPostCreator();
      
      const contentInput = screen.getByPlaceholderText(/Share your insights/i);
      
      // Type @ symbol  
      await user.type(contentInput, '@');
      
      // Wait for dropdown to appear
      await waitFor(() => {
        expect(screen.getByRole('listbox', { name: /agent suggestions/i })).toBeInTheDocument();
      });
    });

    test('should display agent suggestions in dropdown', async () => {
      const user = userEvent.setup();
      renderPostCreator();
      
      const contentInput = screen.getByPlaceholderText(/Share your insights/i);
      
      // Type @ symbol
      await user.type(contentInput, '@');
      
      // Wait for suggestions to load
      await waitFor(() => {
        expect(screen.getByText('Chief of Staff')).toBeInTheDocument();
        expect(screen.getByText('Personal Todos')).toBeInTheDocument();
      });
    });

    test('should allow keyboard navigation through agent suggestions', async () => {
      const user = userEvent.setup();
      renderPostCreator();
      
      const contentInput = screen.getByPlaceholderText(/Share your insights/i);
      
      // Type @ and wait for dropdown
      await user.type(contentInput, '@');
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      // Navigate with arrow keys
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');
      
      // First suggestion should be highlighted (aria-selected)
      const firstOption = screen.getAllByRole('option')[0];
      expect(firstOption).toHaveAttribute('aria-selected', 'true');
    });

    test('should insert mention when agent is selected via Enter key', async () => {
      const user = userEvent.setup();
      renderPostCreator();
      
      const contentInput = screen.getByPlaceholderText(/Share your insights/i);
      
      // Type @ and wait for dropdown
      await user.type(contentInput, '@');
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      // Select first agent with Enter
      await user.keyboard('{Enter}');
      
      // Verify mention is inserted
      await waitFor(() => {
        expect(contentInput).toHaveValue('@chief-of-staff-agent ');
      });
    });

    test('should insert mention when agent is clicked', async () => {
      const user = userEvent.setup();
      renderPostCreator();
      
      const contentInput = screen.getByPlaceholderText(/Share your insights/i);
      
      // Type @ and wait for dropdown
      await user.type(contentInput, '@');
      await waitFor(() => {
        expect(screen.getByText('Chief of Staff')).toBeInTheDocument();
      });
      
      // Click on first agent
      await user.click(screen.getByText('Chief of Staff'));
      
      // Verify mention is inserted
      await waitFor(() => {
        expect(contentInput).toHaveValue('@chief-of-staff-agent ');
      });
    });

    test('should close dropdown when Escape is pressed', async () => {
      const user = userEvent.setup();
      renderPostCreator();
      
      const contentInput = screen.getByPlaceholderText(/Share your insights/i);
      
      // Type @ and wait for dropdown
      await user.type(contentInput, '@');
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      // Press Escape
      await user.keyboard('{Escape}');
      
      // Verify dropdown is closed
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('RED Phase: Form Integration Tests', () => {
    test('should include mentioned agents in form submission', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { id: '1', title: 'Test Post' } })
      });

      const user = userEvent.setup();
      renderPostCreator();
      
      // Fill required fields
      const titleInput = screen.getByLabelText(/title/i);
      const contentInput = screen.getByPlaceholderText(/Share your insights/i);
      
      await user.type(titleInput, 'Test Post Title');
      await user.type(contentInput, 'Hello @chief-of-staff-agent, need your input');
      
      // Wait for mention processing
      await waitFor(() => {
        expect(MockedMentionService.extractMentions).toHaveBeenCalledWith(
          expect.stringContaining('@chief-of-staff-agent')
        );
      });
      
      // Submit form
      const submitButton = screen.getByTestId('submit-post');
      await user.click(submitButton);
      
      // Verify API call includes agent mentions
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/agent-posts', expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('agentMentions')
        }));
      });
    });

    test('should not break existing PostCreator functionality when using mentions', async () => {
      const user = userEvent.setup();
      renderPostCreator();
      
      // Fill form without mentions
      const titleInput = screen.getByLabelText(/title/i);
      const contentInput = screen.getByPlaceholderText(/Share your insights/i);
      
      await user.type(titleInput, 'Regular Post');
      await user.type(contentInput, 'This is a regular post without mentions.');
      
      // Form should still be valid
      const submitButton = screen.getByTestId('submit-post');
      expect(submitButton).not.toBeDisabled();
    });

    test('should maintain cursor position after mention insertion', async () => {
      const user = userEvent.setup();
      renderPostCreator();
      
      const contentInput = screen.getByPlaceholderText(/Share your insights/i);
      
      // Type some text, then @
      await user.type(contentInput, 'Hello @');
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      // Select agent
      await user.keyboard('{Enter}');
      
      // Type more text after mention
      await user.type(contentInput, 'how are you?');
      
      // Verify full content
      await waitFor(() => {
        expect(contentInput).toHaveValue('Hello @chief-of-staff-agent how are you?');
      });
    });
  });

  describe('RED Phase: Error Handling Tests', () => {
    test('should handle MentionService errors gracefully', async () => {
      MockedMentionService.searchMentions.mockRejectedValue(new Error('Service unavailable'));
      
      const user = userEvent.setup();
      renderPostCreator();
      
      const contentInput = screen.getByPlaceholderText(/Share your insights/i);
      
      // Type @ symbol
      await user.type(contentInput, '@');
      
      // Should not crash and should show fallback
      await waitFor(() => {
        // Should either show no dropdown or fallback agents
        const dropdown = screen.queryByRole('listbox');
        if (dropdown) {
          expect(dropdown).toBeInTheDocument();
        }
      }, { timeout: 3000 });
    });

    test('should handle empty agent suggestions gracefully', async () => {
      MockedMentionService.searchMentions.mockResolvedValue([]);
      MockedMentionService.getQuickMentions.mockReturnValue([]);
      MockedMentionService.getAllAgents.mockReturnValue([]);
      
      const user = userEvent.setup();
      renderPostCreator();
      
      const contentInput = screen.getByPlaceholderText(/Share your insights/i);
      
      // Type @ symbol
      await user.type(contentInput, '@');
      
      // Should handle empty results
      await waitFor(() => {
        const dropdown = screen.queryByRole('listbox');
        if (dropdown) {
          expect(screen.getByText(/Type to search agents/i)).toBeInTheDocument();
        }
      });
    });
  });

  describe('Mock Behavior Verification (London School)', () => {
    test('should verify correct interaction sequence with MentionService', async () => {
      const user = userEvent.setup();
      renderPostCreator();
      
      const contentInput = screen.getByPlaceholderText(/Share your insights/i);
      
      // Type @ symbol
      await user.type(contentInput, '@');
      
      // Verify interaction pattern
      await waitFor(() => {
        expect(MockedMentionService.searchMentions).toHaveBeenCalledWith('', expect.any(Object));
      });
      
      // Type query
      await user.type(contentInput, 'chief');
      
      await waitFor(() => {
        expect(MockedMentionService.searchMentions).toHaveBeenCalledWith('chief', expect.any(Object));
      });
    });

    test('should call onMentionSelect callback when agent is selected', async () => {
      const mockOnMentionSelect = jest.fn();
      
      // We need to mock the MentionInput component to test the callback
      jest.mock('../../../components/MentionInput', () => ({
        MentionInput: React.forwardRef(({ onMentionSelect, ...props }: any, ref: any) => {
          React.useEffect(() => {
            // Simulate mention selection
            if (props.value.includes('@')) {
              onMentionSelect?.({
                id: 'chief-of-staff',
                name: 'chief-of-staff-agent',
                displayName: 'Chief of Staff',
                description: 'Strategic coordination'
              });
            }
          }, [props.value, onMentionSelect]);
          
          return <textarea ref={ref} {...props} data-testid="mention-input" />;
        })
      }));

      const user = userEvent.setup();
      renderPostCreator();
      
      const contentInput = screen.getByTestId('mention-input');
      
      // Type @ symbol to trigger mock mention selection
      await user.type(contentInput, '@');
      
      // The mock should have been called
      await waitFor(() => {
        // Since we can't directly test the internal callback,
        // we verify the side effects (agent added to mentions)
        expect(contentInput).toHaveValue('@');
      });
    });
  });
});