import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostCreator } from '../../components/PostCreator';
import { CommentForm } from '../../components/CommentForm';
import { MentionInputDemo } from '../../components/MentionInputDemo';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, test, beforeEach, expect } from 'vitest';

// Mock dependencies
vi.mock('../../services/MentionService', () => ({
  MentionService: {
    searchMentions: vi.fn(() => Promise.resolve([
      {
        id: 'chief-of-staff',
        name: 'chief-of-staff-agent',
        displayName: 'Chief of Staff',
        description: 'Strategic coordination'
      },
      {
        id: 'personal-todos',
        name: 'personal-todos-agent', 
        displayName: 'Personal Todos',
        description: 'Task management'
      }
    ])),
    getQuickMentions: vi.fn(() => [
      {
        id: 'chief-of-staff',
        name: 'chief-of-staff-agent',
        displayName: 'Chief of Staff',
        description: 'Strategic coordination'
      }
    ]),
    getAllAgents: vi.fn(() => [
      {
        id: 'chief-of-staff',
        name: 'chief-of-staff-agent',
        displayName: 'Chief of Staff',
        description: 'Strategic coordination'
      }
    ]),
    extractMentions: vi.fn(() => [])
  }
}));

vi.mock('../../hooks/useDraftManager', () => ({
  useDraftManager: () => ({
    createDraft: vi.fn(),
    updateDraft: vi.fn(),
    deleteDraft: vi.fn()
  })
}));

vi.mock('../../hooks/useTemplates', () => ({
  useTemplates: () => ({
    templates: []
  })
}));

vi.mock('../../hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
  useShortcutsHelp: () => []
}));

vi.mock('../../services/api', () => ({
  apiService: {
    createComment: vi.fn(() => Promise.resolve({ id: 'comment-1' }))
  }
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('TDD London School: Mention Dropdown Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RED PHASE - Failing Tests (Current State)', () => {
    
    test('FAIL: PostCreator should show dropdown when @ is typed', async () => {
      const user = userEvent.setup();
      renderWithRouter(<PostCreator />);
      
      // Find the content textarea in PostCreator - CRITICAL FIX: Use correct placeholder
      const contentInput = screen.getByPlaceholderText(/Share your insights.*agent network/i);
      
      // Type @ to trigger dropdown
      await user.click(contentInput);
      await user.type(contentInput, '@');
      
      // Wait for dropdown to appear
      await waitFor(() => {
        // This should pass but currently fails
        expect(screen.queryByText(/EMERGENCY DEBUG: Dropdown Open/i)).toBeInTheDocument();
      }, { timeout: 2000 });
      
      // Also check for actual dropdown content
      await waitFor(() => {
        expect(screen.queryByText('Chief of Staff')).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Debug menu should be visible
      expect(screen.queryByText(/Query:/i)).toBeInTheDocument();
      expect(screen.queryByText(/Suggestions:/i)).toBeInTheDocument();
    });

    test('FAIL: CommentForm should show dropdown when @ is typed', async () => {
      const user = userEvent.setup();
      render(<CommentForm postId="test-post" />);
      
      // Find the comment textarea - CRITICAL FIX: Use correct placeholder
      const commentInput = screen.getByPlaceholderText(/Provide technical analysis.*feedback/i);
      
      // Type @ to trigger dropdown
      await user.click(commentInput);
      await user.type(commentInput, '@');
      
      // Wait for dropdown to appear
      await waitFor(() => {
        // This should pass but currently fails
        expect(screen.queryByText(/EMERGENCY DEBUG: Dropdown Open/i)).toBeInTheDocument();
      }, { timeout: 2000 });
      
      // Also check for actual dropdown content
      await waitFor(() => {
        expect(screen.queryByText('Chief of Staff')).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Debug menu should be visible
      expect(screen.queryByText(/Query:/i)).toBeInTheDocument();
      expect(screen.queryByText(/Suggestions:/i)).toBeInTheDocument();
    });

    test('PASS: MentionInputDemo should show dropdown when @ is typed (Control)', async () => {
      const user = userEvent.setup();
      render(<MentionInputDemo />);
      
      // Find the demo input - CRITICAL FIX: Use correct placeholder text
      const demoInput = screen.getByPlaceholderText(/Type your message here.*Use @ to mention agents/i);
      
      // Type @ to trigger dropdown
      await user.click(demoInput);
      await user.type(demoInput, '@');
      
      // Wait for dropdown to appear
      await waitFor(() => {
        // This should pass and is our working control
        expect(screen.queryByText(/EMERGENCY DEBUG: Dropdown Open/i)).toBeInTheDocument();
      }, { timeout: 2000 });
      
      // Also check for actual dropdown content
      await waitFor(() => {
        expect(screen.queryByText('Chief of Staff')).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Debug menu should be visible
      expect(screen.queryByText(/Query:/i)).toBeInTheDocument();
      expect(screen.queryByText(/Suggestions:/i)).toBeInTheDocument();
    });
  });

  describe('Behavior Verification Tests', () => {
    
    test('MOCK: PostCreator MentionInput should receive correct props', () => {
      // Mock the MentionInput to verify it receives expected props
      const MockMentionInput = vi.fn(() => <div data-testid="mention-input-mock">Mock MentionInput</div>);
      
      // This test verifies the collaboration between PostCreator and MentionInput
      vi.doMock('../../components/MentionInput', () => ({
        MentionInput: MockMentionInput
      }));
      
      renderWithRouter(<PostCreator />);
      
      // Verify MentionInput was called with expected props
      expect(MockMentionInput).toHaveBeenCalledWith(
        expect.objectContaining({
          mentionContext: 'post',
          onMentionSelect: expect.any(Function),
          placeholder: expect.stringContaining('insights')
        }),
        expect.any(Object) // ref
      );
    });

    test('MOCK: CommentForm MentionInput should receive correct props', () => {
      // Mock the MentionInput to verify it receives expected props
      const MockMentionInput = vi.fn(() => <div data-testid="mention-input-mock">Mock MentionInput</div>);
      
      vi.doMock('../../components/MentionInput', () => ({
        MentionInput: MockMentionInput
      }));
      
      render(<CommentForm postId="test-post" />);
      
      // Verify MentionInput was called with expected props
      expect(MockMentionInput).toHaveBeenCalledWith(
        expect.objectContaining({
          mentionContext: 'comment',
          onMentionSelect: expect.any(Function),
          placeholder: expect.stringContaining('technical analysis')
        }),
        expect.any(Object) // ref
      );
    });
  });

  describe('Contract Testing', () => {
    
    test('MentionInput contract: should emit dropdown open events', async () => {
      // Test the contract that MentionInput should fulfill
      const mockOnMentionSelect = vi.fn();
      const { MentionInput } = await import('../../components/MentionInput');
      
      const user = userEvent.setup();
      render(
        <MentionInput
          value=""
          onChange={() => {}}
          onMentionSelect={mockOnMentionSelect}
          placeholder="Test input"
          mentionContext="post"
        />
      );
      
      const input = screen.getByPlaceholderText('Test input');
      
      // Type @ to trigger dropdown
      await user.click(input);
      await user.type(input, '@');
      
      // Verify the contract is fulfilled
      await waitFor(() => {
        expect(screen.queryByText(/EMERGENCY DEBUG: Dropdown Open/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('State Management Testing', () => {
    
    test('MentionInput state: should manage dropdown visibility correctly', async () => {
      const { MentionInput } = await import('../../components/MentionInput');
      
      const user = userEvent.setup();
      const { rerender } = render(
        <MentionInput
          value=""
          onChange={() => {}}
          placeholder="Test input"
          mentionContext="post"
        />
      );
      
      const input = screen.getByPlaceholderText('Test input');
      
      // Initial state: no dropdown
      expect(screen.queryByText(/EMERGENCY DEBUG: Dropdown Open/i)).not.toBeInTheDocument();
      
      // Type @ to trigger dropdown
      await user.click(input);
      await user.type(input, '@');
      
      // State should change to show dropdown
      await waitFor(() => {
        expect(screen.queryByText(/EMERGENCY DEBUG: Dropdown Open/i)).toBeInTheDocument();
      }, { timeout: 2000 });
      
      // Clear input should close dropdown
      await user.clear(input);
      
      await waitFor(() => {
        expect(screen.queryByText(/EMERGENCY DEBUG: Dropdown Open/i)).not.toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });
});