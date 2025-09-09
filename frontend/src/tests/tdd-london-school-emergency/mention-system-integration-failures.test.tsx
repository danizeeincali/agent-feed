/**
 * TDD London School Emergency Tests - Mention System Integration Failures
 * 
 * FAILING TEST SCENARIOS:
 * - ❌ PostCreator: @ keystroke → no dropdown appears
 * - ❌ CommentForm: @ keystroke → no dropdown appears  
 * - ❌ QuickPostSection: @ keystroke → no dropdown appears
 * - ✅ MentionInputDemo: @ keystroke → dropdown works perfectly
 * 
 * This test suite follows London School TDD principles:
 * 1. Mock all collaborations and focus on interactions
 * 2. Verify component behavior through mock expectations
 * 3. Test the conversation between objects, not implementations
 * 4. Drive design through failing tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

// Mock the MentionInput component to verify interactions
const mockMentionInput = {
  focus: vi.fn(),
  blur: vi.fn(),
  insertMention: vi.fn(),
  getCurrentMentionQuery: vi.fn()
};

// Mock MentionInput component
vi.mock('../../components/MentionInput', () => ({
  MentionInput: React.forwardRef<any, any>(({ value, onChange, onMentionSelect, ...props }, ref) => {
    React.useImperativeHandle(ref, () => mockMentionInput);
    
    return (
      <div data-testid="mention-input-mock">
        <textarea
          data-testid="mention-textarea"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            // Simulate @ detection - this is what should trigger dropdown
            if (e.target.value.includes('@')) {
              // Mock dropdown trigger
              setTimeout(() => {
                const event = new CustomEvent('mention-dropdown-triggered', {
                  detail: { query: e.target.value.split('@').pop() || '' }
                });
                document.dispatchEvent(event);
              }, 50);
            }
          }}
          {...props}
        />
        {/* Mock dropdown that appears when @ is detected */}
        {value.includes('@') && (
          <div data-testid="mention-dropdown" className="mention-dropdown">
            <div data-testid="mention-suggestion" onClick={() => onMentionSelect?.({
              id: 'test-agent',
              name: 'test-agent',
              displayName: 'Test Agent',
              description: 'Test agent for TDD'
            })}>
              Test Agent
            </div>
          </div>
        )}
      </div>
    );
  })
}));

// Mock MentionService
vi.mock('../../services/MentionService', () => ({
  MentionService: {
    extractMentions: vi.fn(() => ['test-agent']),
    searchMentions: vi.fn(() => Promise.resolve([
      { id: 'test-agent', name: 'test-agent', displayName: 'Test Agent', description: 'Test agent' }
    ])),
    getQuickMentions: vi.fn(() => [
      { id: 'test-agent', name: 'test-agent', displayName: 'Test Agent', description: 'Test agent' }
    ]),
    getAllAgents: vi.fn(() => [
      { id: 'test-agent', name: 'test-agent', displayName: 'Test Agent', description: 'Test agent' }
    ])
  }
}));

// Import components after mocking
import { PostCreator } from '../../components/PostCreator';
import { CommentForm } from '../../components/CommentForm';
import { QuickPostSection } from '../../components/posting-interface/QuickPostSection';
import { MentionInputDemo } from '../../components/MentionInputDemo';

// Test wrapper for components that need Router context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('TDD London School - Mention System Integration Failures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MentionInputDemo - Working Reference Pattern', () => {
    it('should demonstrate the working @ keystroke → dropdown pattern', async () => {
      const user = userEvent.setup();
      
      render(<MentionInputDemo />);
      
      const textarea = screen.getByLabelText(/demo message input/i);
      
      // PASSING BEHAVIOR: Type @ should trigger dropdown
      await act(async () => {
        await user.type(textarea, '@');
      });
      
      // Verify dropdown appears
      await waitFor(() => {
        expect(screen.getByTestId('mention-dropdown')).toBeInTheDocument();
      });
      
      // Verify @ detection message appears
      expect(screen.getByText(/@ detected - try typing agent names!/i)).toBeInTheDocument();
    });
  });

  describe('PostCreator - FAILING @ keystroke detection', () => {
    it('should detect @ keystroke and trigger mention dropdown - CURRENTLY FAILS', async () => {
      const user = userEvent.setup();
      const mockOnPostCreated = vi.fn();
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );
      
      // Find the MentionInput within PostCreator
      const mentionTextarea = screen.getByTestId('mention-textarea');
      expect(mentionTextarea).toBeInTheDocument();
      
      // FAILING TEST: Type @ should trigger dropdown but doesn't
      await act(async () => {
        await user.type(mentionTextarea, '@');
      });
      
      // This assertion SHOULD PASS but FAILS due to integration issues
      await waitFor(() => {
        expect(screen.getByTestId('mention-dropdown')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should handle mention selection in PostCreator - CURRENTLY FAILS', async () => {
      const user = userEvent.setup();
      const mockOnPostCreated = vi.fn();
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );
      
      const mentionTextarea = screen.getByTestId('mention-textarea');
      
      // Type @ to trigger dropdown
      await act(async () => {
        await user.type(mentionTextarea, '@test');
      });
      
      // Wait for dropdown and click suggestion
      await waitFor(() => {
        const dropdown = screen.getByTestId('mention-dropdown');
        expect(dropdown).toBeInTheDocument();
      });
      
      const suggestion = screen.getByTestId('mention-suggestion');
      await user.click(suggestion);
      
      // Verify mention was inserted into content
      await waitFor(() => {
        expect(mentionTextarea).toHaveValue('@test-agent ');
      });
    });

    it('should track mentioned agents for form submission - CURRENTLY FAILS', async () => {
      const user = userEvent.setup();
      const mockOnPostCreated = vi.fn();
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );
      
      // Fill required fields
      const titleInput = screen.getByPlaceholderText(/enter a compelling title/i);
      await user.type(titleInput, 'Test Post Title');
      
      const mentionTextarea = screen.getByTestId('mention-textarea');
      await user.type(mentionTextarea, '@test-agent and some content');
      
      // Verify mentioned agents are tracked (this should be visible in UI)
      await waitFor(() => {
        expect(screen.getByText(/mentioned agents/i)).toBeInTheDocument();
        expect(screen.getByText(/test agent/i)).toBeInTheDocument();
      });
    });
  });

  describe('CommentForm - FAILING @ keystroke detection', () => {
    it('should detect @ keystroke in comment form - CURRENTLY FAILS', async () => {
      const user = userEvent.setup();
      const mockOnCommentAdded = vi.fn();
      
      render(
        <CommentForm 
          postId="test-post" 
          onCommentAdded={mockOnCommentAdded}
          useMentionInput={true}
        />
      );
      
      const mentionTextarea = screen.getByTestId('mention-textarea');
      
      // FAILING: @ keystroke should trigger dropdown
      await act(async () => {
        await user.type(mentionTextarea, '@');
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('mention-dropdown')).toBeInTheDocument();
      });
    });

    it('should handle mention selection in CommentForm - CURRENTLY FAILS', async () => {
      const user = userEvent.setup();
      
      render(
        <CommentForm 
          postId="test-post"
          useMentionInput={true}
        />
      );
      
      const mentionTextarea = screen.getByTestId('mention-textarea');
      
      await act(async () => {
        await user.type(mentionTextarea, '@test');
      });
      
      // Should show dropdown with suggestions
      await waitFor(() => {
        expect(screen.getByTestId('mention-dropdown')).toBeInTheDocument();
      });
      
      // Click suggestion
      const suggestion = screen.getByTestId('mention-suggestion');
      await user.click(suggestion);
      
      // Verify content was updated
      expect(mentionTextarea).toHaveValue('@test-agent ');
    });

    it('should extract mentions for comment submission - CURRENTLY FAILS', async () => {
      const user = userEvent.setup();
      
      // Mock the API call
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { id: 'test-comment' } })
      });
      global.fetch = mockFetch;
      
      render(<CommentForm postId="test-post" useMentionInput={true} />);
      
      const mentionTextarea = screen.getByTestId('mention-textarea');
      
      // Type comment with mention
      await user.type(mentionTextarea, '@test-agent This is a comment');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /post analysis/i });
      await user.click(submitButton);
      
      // Verify API was called with extracted mentions
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining('"mentionedUsers":["test-agent"]')
          })
        );
      });
    });
  });

  describe('QuickPostSection - FAILING @ keystroke detection', () => {
    it('should detect @ keystroke in quick post - CURRENTLY FAILS', async () => {
      const user = userEvent.setup();
      const mockOnPostCreated = vi.fn();
      
      render(<QuickPostSection onPostCreated={mockOnPostCreated} />);
      
      const mentionTextarea = screen.getByTestId('mention-textarea');
      
      // FAILING: @ keystroke should trigger dropdown
      await act(async () => {
        await user.type(mentionTextarea, '@');
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('mention-dropdown')).toBeInTheDocument();
      });
    });

    it('should handle mention selection in QuickPostSection - CURRENTLY FAILS', async () => {
      const user = userEvent.setup();
      
      render(<QuickPostSection />);
      
      const mentionTextarea = screen.getByTestId('mention-textarea');
      
      await act(async () => {
        await user.type(mentionTextarea, '@chief');
      });
      
      // Should show dropdown
      await waitFor(() => {
        expect(screen.getByTestId('mention-dropdown')).toBeInTheDocument();
      });
      
      // Select mention
      const suggestion = screen.getByTestId('mention-suggestion');
      await user.click(suggestion);
      
      // Verify content updated
      expect(mentionTextarea).toHaveValue('@test-agent ');
      
      // Verify selectedAgents state was updated (should be reflected in UI)
      await waitFor(() => {
        expect(screen.getByText(/test agent/i)).toBeInTheDocument();
      });
    });

    it('should sync bidirectional state between MentionInput and QuickPost state', async () => {
      const user = userEvent.setup();
      
      render(<QuickPostSection />);
      
      const mentionTextarea = screen.getByTestId('mention-textarea');
      
      // Type mention directly in textarea
      await user.type(mentionTextarea, '@test-agent Some quick update');
      
      // Verify QuickPostSection detected the mention and updated its internal state
      await waitFor(() => {
        // Should show in mentioned agents section
        expect(screen.getByText(/mention agents/i)).toBeInTheDocument();
      });
      
      // Click quick agent button should also update MentionInput content
      const agentButtons = screen.getAllByRole('button');
      const mentionAgentButton = agentButtons.find(button => 
        button.textContent?.includes('Test Agent')
      );
      
      if (mentionAgentButton) {
        await user.click(mentionAgentButton);
        
        // Should update the textarea content
        await waitFor(() => {
          expect(mentionTextarea.value).toContain('@test-agent');
        });
      }
    });
  });

  describe('Contract Verification - Mock Expectations', () => {
    it('should verify MentionInput component contracts are called correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PostCreator />
        </TestWrapper>
      );
      
      const mentionTextarea = screen.getByTestId('mention-textarea');
      
      // Type to trigger mention detection
      await user.type(mentionTextarea, '@test');
      
      // Should trigger dropdown (verified through DOM)
      await waitFor(() => {
        expect(screen.getByTestId('mention-dropdown')).toBeInTheDocument();
      });
      
      // Click suggestion
      const suggestion = screen.getByTestId('mention-suggestion');
      await user.click(suggestion);
      
      // Contract verification: onMentionSelect should have been called
      // This would be verified by checking if the parent component
      // handled the mention selection properly
      await waitFor(() => {
        expect(mentionTextarea.value).toContain('@test-agent');
      });
    });

    it('should verify handleMentionSelect contracts in all components', async () => {
      const components = [
        { Component: PostCreator, name: 'PostCreator' },
        { Component: () => <CommentForm postId="test" useMentionInput={true} />, name: 'CommentForm' },
        { Component: QuickPostSection, name: 'QuickPostSection' }
      ];

      for (const { Component, name } of components) {
        const { unmount } = render(
          <TestWrapper>
            <Component />
          </TestWrapper>
        );
        
        const mentionTextarea = screen.getByTestId('mention-textarea');
        
        // Each component should handle mention selection
        const user = userEvent.setup();
        await user.type(mentionTextarea, '@test');
        
        await waitFor(() => {
          expect(screen.getByTestId('mention-dropdown')).toBeInTheDocument();
        }, { timeout: 500 });
        
        unmount();
      }
    });
  });

  describe('Integration Test - End-to-End Mention Workflow', () => {
    it('should complete full mention workflow: @ → dropdown → select → insert → submit', async () => {
      const user = userEvent.setup();
      const mockOnPostCreated = vi.fn();
      
      // Mock API
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { id: 'test-post' } })
      });
      global.fetch = mockFetch;
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );
      
      // Fill required fields
      const titleInput = screen.getByPlaceholderText(/enter a compelling title/i);
      await user.type(titleInput, 'Test Post');
      
      const mentionTextarea = screen.getByTestId('mention-textarea');
      
      // Step 1: Type @ to trigger dropdown
      await act(async () => {
        await user.type(mentionTextarea, '@');
      });
      
      // Step 2: Dropdown should appear
      await waitFor(() => {
        expect(screen.getByTestId('mention-dropdown')).toBeInTheDocument();
      });
      
      // Step 3: Select mention
      const suggestion = screen.getByTestId('mention-suggestion');
      await user.click(suggestion);
      
      // Step 4: Verify mention was inserted
      expect(mentionTextarea).toHaveValue('@test-agent ');
      
      // Step 5: Add more content and submit
      await user.type(mentionTextarea, 'some content');
      
      const submitButton = screen.getByTestId('submit-post');
      await user.click(submitButton);
      
      // Step 6: Verify submission includes mention data
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining('"agentMentions":["test-agent"]')
          })
        );
      });
    });
  });

  describe('Regression Prevention Tests', () => {
    it('should prevent mention dropdown from disappearing immediately', async () => {
      const user = userEvent.setup();
      
      render(<MentionInputDemo />);
      
      const textarea = screen.getByLabelText(/demo message input/i);
      
      await user.type(textarea, '@');
      
      // Dropdown should appear and stay visible
      await waitFor(() => {
        expect(screen.getByTestId('mention-dropdown')).toBeInTheDocument();
      });
      
      // Wait a bit more to ensure it doesn't disappear
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(screen.getByTestId('mention-dropdown')).toBeInTheDocument();
    });

    it('should maintain dropdown state during rapid typing', async () => {
      const user = userEvent.setup();
      
      render(<MentionInputDemo />);
      
      const textarea = screen.getByLabelText(/demo message input/i);
      
      // Type @ followed by rapid typing
      await user.type(textarea, '@chi');
      
      await waitFor(() => {
        expect(screen.getByTestId('mention-dropdown')).toBeInTheDocument();
      });
      
      // Continue typing
      await user.type(textarea, 'ef');
      
      // Dropdown should still be there
      expect(screen.getByTestId('mention-dropdown')).toBeInTheDocument();
    });
  });
});