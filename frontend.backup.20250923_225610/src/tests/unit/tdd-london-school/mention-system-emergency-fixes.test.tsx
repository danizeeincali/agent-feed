/**
 * TDD EMERGENCY MISSION: @ mention system integration failure fixes
 * 
 * London School TDD approach:
 * 1. Write failing tests for each broken component
 * 2. Implement minimal fixes to make tests pass
 * 3. Refactor for clean integration
 * 4. Validate with comprehensive test suite
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Import components under test
import { PostCreator } from '../../../components/PostCreator';
import { CommentForm } from '../../../components/CommentForm';
import { MentionInput } from '../../../components/MentionInput';

// Mock external dependencies
vi.mock('../../../services/MentionService', () => ({
  MentionService: {
    searchMentions: vi.fn(),
    getQuickMentions: vi.fn(),
    getAllAgents: vi.fn(),
    extractMentions: vi.fn(),
  }
}));

vi.mock('../../../hooks/useDraftManager', () => ({
  useDraftManager: () => ({
    createDraft: vi.fn(),
    updateDraft: vi.fn(),
    deleteDraft: vi.fn()
  })
}));

vi.mock('../../../hooks/useTemplates', () => ({
  useTemplates: () => ({
    templates: [],
    loadTemplate: vi.fn()
  })
}));

vi.mock('../../../hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
  useShortcutsHelp: () => []
}));

// Import the mocked service
import { MentionService } from '../../../services/MentionService';
const mockMentionService = MentionService as any;

// Test wrapper with router
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

// Mock agent data
const mockAgents = [
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
  },
  {
    id: 'code-reviewer',
    name: 'code-reviewer-agent',
    displayName: 'Code Reviewer',
    description: 'Code quality and security analysis'
  }
];

describe('TDD Emergency: @ Mention System Integration Failures', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup MentionService mocks
    mockMentionService.searchMentions.mockResolvedValue(mockAgents);
    mockMentionService.getQuickMentions.mockReturnValue(mockAgents);
    mockMentionService.getAllAgents.mockReturnValue(mockAgents);
    mockMentionService.extractMentions.mockImplementation((content: string) => {
      const matches = content.match(/@([a-zA-Z0-9-_]+)/g);
      return matches ? matches.map(match => match.slice(1)) : [];
    });
  });

  describe('FAILING TEST 1: PostCreator @ mention integration', () => {
    it('should show mention dropdown when @ is typed in PostCreator content field', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={vi.fn()} />
        </TestWrapper>
      );
      
      // Find the content textarea (MentionInput)
      const contentTextarea = screen.getByPlaceholderText(/share your insights/i);
      expect(contentTextarea).toBeInTheDocument();
      
      // Type @ symbol
      await user.type(contentTextarea, '@');
      
      // Wait for mention dropdown to appear
      await waitFor(() => {
        const dropdown = screen.queryByRole('listbox', { name: /agent suggestions/i });
        expect(dropdown).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('FAILING TEST 2: MentionInput core functionality', () => {
    it('should show dropdown immediately when @ is typed', async () => {
      const user = userEvent.setup();
      const mockOnMentionSelect = vi.fn();
      
      render(
        <MentionInput
          value=""
          onChange={vi.fn()}
          onMentionSelect={mockOnMentionSelect}
          placeholder="Type @"
        />
      );
      
      const input = screen.getByPlaceholderText('Type @');
      
      // Type @ symbol
      await user.type(input, '@');
      
      // Dropdown should appear immediately
      await waitFor(() => {
        const dropdown = screen.queryByRole('listbox');
        expect(dropdown).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should handle basic mention functionality without crashing', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      
      // Use controlled component pattern
      const TestMentionInput = () => {
        const [value, setValue] = React.useState('');
        return (
          <MentionInput
            value={value}
            onChange={(newValue) => {
              setValue(newValue);
              mockOnChange(newValue);
            }}
          />
        );
      };
      
      render(<TestMentionInput />);
      
      const input = screen.getByRole('textbox');
      
      // Should not crash when typing @
      await user.type(input, '@test');
      
      // Component should remain functional
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('@test');
      expect(mockOnChange).toHaveBeenCalledWith('@test');
    });
  });

  describe('FAILING TEST 3: CommentForm @ mention integration', () => {
    it('should show mention dropdown when @ is typed in CommentForm', async () => {
      const user = userEvent.setup();
      
      render(
        <CommentForm 
          postId="test-post-id" 
          onCommentAdded={vi.fn()} 
          useMentionInput={true}
        />
      );
      
      // Find the comment textarea (MentionInput)
      const commentTextarea = screen.getByPlaceholderText(/provide technical analysis/i);
      expect(commentTextarea).toBeInTheDocument();
      
      // Type @ symbol
      await user.type(commentTextarea, '@');
      
      // Wait for mention dropdown (this should appear if MentionInput is working)
      await waitFor(() => {
        const dropdown = screen.queryByRole('listbox', { name: /agent suggestions/i });
        expect(dropdown).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });
});