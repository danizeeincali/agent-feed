/**
 * TDD EMERGENCY: QuickPost @ mention integration tests
 * 
 * Testing the QuickPost component's mention functionality integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';

// Import components under test - QuickPost is likely part of EnhancedPostingInterface
import { EnhancedPostingInterface } from '../../src/components/EnhancedPostingInterface';
import { MentionService } from '../../src/services/MentionService';

// Mock dependencies
jest.mock('../../src/services/MentionService');
jest.mock('../../src/services/api', () => ({
  apiService: {
    createPost: jest.fn().mockResolvedValue({ id: 'post-1' }),
    getAgentPosts: jest.fn().mockResolvedValue({ data: [], total: 0 })
  }
}));

const mockMentionService = MentionService as jest.Mocked<typeof MentionService>;

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

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
  }
];

describe('TDD Emergency: QuickPost @ Mention Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup MentionService mocks
    mockMentionService.searchMentions.mockResolvedValue(mockAgents);
    mockMentionService.getQuickMentions.mockReturnValue(mockAgents);
    mockMentionService.getAllAgents.mockReturnValue(mockAgents);
    mockMentionService.extractMentions.mockImplementation((content: string) => {
      const matches = content.match(/@([a-zA-Z0-9-_]+)/g);
      return matches ? matches.map(match => match.slice(1)) : [];
    });
  });

  describe('FAILING TEST: QuickPost Section Mention Integration', () => {
    it('should show mention dropdown in QuickPost textarea when @ is typed', async () => {
      const user = userEvent.setup();
      const mockOnPostCreated = jest.fn();
      
      render(
        <TestWrapper>
          <EnhancedPostingInterface onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );
      
      // Find QuickPost section - it should be the second posting section
      const quickPostTextareas = screen.getAllByRole('textbox');
      expect(quickPostTextareas.length).toBeGreaterThanOrEqual(2);
      
      // QuickPost is likely the second textarea or one with specific placeholder
      const quickPostTextarea = quickPostTextareas.find(textarea => 
        textarea.getAttribute('placeholder')?.includes('quick') ||
        textarea.getAttribute('placeholder')?.includes('Quick') ||
        textarea.getAttribute('data-testid')?.includes('quick')
      ) || quickPostTextareas[1]; // fallback to second textarea
      
      expect(quickPostTextarea).toBeInTheDocument();
      
      // Type @ in QuickPost
      await user.type(quickPostTextarea, '@');
      
      // Wait for mention dropdown
      await waitFor(() => {
        const dropdown = screen.queryByRole('listbox', { name: /agent suggestions/i });
        expect(dropdown).toBeInTheDocument();
      }, { timeout: 2000 });
      
      // Verify agents are shown
      expect(screen.getByText('Chief of Staff')).toBeInTheDocument();
      expect(screen.getByText('Personal Todos')).toBeInTheDocument();
    });

    it('should insert mention when agent is selected in QuickPost', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <EnhancedPostingInterface onPostCreated={jest.fn()} />
        </TestWrapper>
      );
      
      // Find QuickPost textarea
      const textareas = screen.getAllByRole('textbox');
      const quickPostTextarea = textareas[1]; // Assuming second is QuickPost
      
      // Type @ and wait for dropdown
      await user.type(quickPostTextarea, '@');
      
      await waitFor(() => {
        const dropdown = screen.getByRole('listbox');
        expect(dropdown).toBeInTheDocument();
      });
      
      // Click on agent
      const agentOption = screen.getByText('Chief of Staff');
      await user.click(agentOption);
      
      // Verify mention inserted
      await waitFor(() => {
        expect(quickPostTextarea).toHaveValue('@chief-of-staff-agent ');
      });
      
      // Dropdown should close
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('should extract mentions when QuickPost is submitted', async () => {
      const user = userEvent.setup();
      const mockOnPostCreated = jest.fn();
      
      // Mock successful post creation
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'quick-post-1' } })
      });
      
      render(
        <TestWrapper>
          <EnhancedPostingInterface onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );
      
      // Find QuickPost elements
      const textareas = screen.getAllByRole('textbox');
      const quickPostTextarea = textareas[1];
      
      // Type content with mention
      await user.type(quickPostTextarea, 'Quick update @chief-of-staff-agent please review');
      
      // Find and click submit button for QuickPost
      const submitButtons = screen.getAllByRole('button');
      const quickPostSubmit = submitButtons.find(button => 
        button.textContent?.includes('Post') ||
        button.textContent?.includes('Submit') ||
        button.getAttribute('data-testid')?.includes('quick')
      );
      
      expect(quickPostSubmit).toBeInTheDocument();
      await user.click(quickPostSubmit!);
      
      // Verify mention extraction was called
      await waitFor(() => {
        expect(mockMentionService.extractMentions).toHaveBeenCalledWith(
          expect.stringContaining('@chief-of-staff-agent')
        );
      });
    });

    it('should handle multiple mentions in QuickPost', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <EnhancedPostingInterface onPostCreated={jest.fn()} />
        </TestWrapper>
      );
      
      const textareas = screen.getAllByRole('textbox');
      const quickPostTextarea = textareas[1];
      
      // Type first mention
      await user.type(quickPostTextarea, '@chief');
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Chief of Staff'));
      
      // Type second mention
      await user.type(quickPostTextarea, ' and @personal');
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Personal Todos'));
      
      // Verify both mentions in content
      await waitFor(() => {
        expect(quickPostTextarea).toHaveValue(
          expect.stringContaining('@chief-of-staff-agent')
        );
        expect(quickPostTextarea).toHaveValue(
          expect.stringContaining('@personal-todos-agent')
        );
      });
    });

    it('should use context-specific agents for QuickPost', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <EnhancedPostingInterface onPostCreated={jest.fn()} />
        </TestWrapper>
      );
      
      const textareas = screen.getAllByRole('textbox');
      const quickPostTextarea = textareas[1];
      
      await user.type(quickPostTextarea, '@');
      
      // Should call with 'quick-post' context
      await waitFor(() => {
        expect(mockMentionService.getQuickMentions).toHaveBeenCalledWith('quick-post');
      });
    });
  });

  describe('FAILING TEST: QuickPost Error Handling', () => {
    it('should handle mention service errors gracefully in QuickPost', async () => {
      const user = userEvent.setup();
      
      // Mock service error
      mockMentionService.searchMentions.mockRejectedValue(new Error('Service error'));
      
      render(
        <TestWrapper>
          <EnhancedPostingInterface onPostCreated={jest.fn()} />
        </TestWrapper>
      );
      
      const textareas = screen.getAllByRole('textbox');
      const quickPostTextarea = textareas[1];
      
      // Should not crash when typing @
      await user.type(quickPostTextarea, '@');
      
      // Component should remain functional
      expect(quickPostTextarea).toBeInTheDocument();
      expect(quickPostTextarea).toHaveValue('@');
    });

    it('should handle empty agent list in QuickPost', async () => {
      const user = userEvent.setup();
      
      // Mock empty results
      mockMentionService.searchMentions.mockResolvedValue([]);
      mockMentionService.getQuickMentions.mockReturnValue([]);
      
      render(
        <TestWrapper>
          <EnhancedPostingInterface onPostCreated={jest.fn()} />
        </TestWrapper>
      );
      
      const textareas = screen.getAllByRole('textbox');
      const quickPostTextarea = textareas[1];
      
      await user.type(quickPostTextarea, '@');
      
      // Should show appropriate message or fallback
      await waitFor(() => {
        // Either no dropdown or dropdown with "no agents" message
        const dropdown = screen.queryByRole('listbox');
        if (dropdown) {
          // Should show some indication of no results
          expect(dropdown).toBeInTheDocument();
        }
      });
    });
  });

  describe('FAILING TEST: QuickPost Performance', () => {
    it('should debounce mention queries in QuickPost', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <EnhancedPostingInterface onPostCreated={jest.fn()} />
        </TestWrapper>
      );
      
      const textareas = screen.getAllByRole('textbox');
      const quickPostTextarea = textareas[1];
      
      // Type quickly
      await user.type(quickPostTextarea, '@test');
      
      // Should not call service for every character
      await waitFor(() => {
        // Should be debounced to fewer calls than characters typed
        const callCount = mockMentionService.searchMentions.mock.calls.length;
        expect(callCount).toBeLessThanOrEqual(2); // Allow for initial @ and final query
      });
    });

    it('should clean up mention dropdown when QuickPost loses focus', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <EnhancedPostingInterface onPostCreated={jest.fn()} />
        </TestWrapper>
      );
      
      const textareas = screen.getAllByRole('textbox');
      const quickPostTextarea = textareas[1];
      const otherTextarea = textareas[0];
      
      // Open dropdown
      await user.type(quickPostTextarea, '@');
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      // Click away
      await user.click(otherTextarea);
      
      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });
});