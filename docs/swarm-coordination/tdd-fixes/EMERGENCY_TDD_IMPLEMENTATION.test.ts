/**
 * EMERGENCY TDD IMPLEMENTATION
 * Test-Driven Development fixes for @ mention system
 * Agent: TDD London School Swarm
 * Priority: Emergency
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MentionInput } from '../../../frontend/src/components/MentionInput';
import { MentionService } from '../../../frontend/src/services/MentionService';

// Mock MentionService
vi.mock('../../../frontend/src/services/MentionService');
const mockMentionService = MentionService as any;

describe('EMERGENCY: @ Mention System TDD Fixes', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockMentionService.searchMentions = vi.fn();
    mockMentionService.getQuickMentions = vi.fn();
    mockMentionService.getAllAgents = vi.fn();
  });

  describe('CRITICAL: @ Symbol Detection', () => {
    it('FAILING: should trigger dropdown immediately when @ is typed', async () => {
      // ARRANGE: Setup mock data
      const mockSuggestions = [
        { id: '1', name: 'assistant', displayName: 'Assistant', description: 'AI Helper' }
      ];
      mockMentionService.searchMentions.mockResolvedValue(mockSuggestions);
      
      const onChange = vi.fn();
      
      // ACT: Render and type @
      render(<MentionInput value="" onChange={onChange} />);
      const textarea = screen.getByRole('textbox');
      
      // Type @ symbol
      fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });
      
      // ASSERT: Dropdown should appear
      await waitFor(() => {
        const dropdown = screen.getByRole('listbox');
        expect(dropdown).toBeInTheDocument();
      }, { timeout: 200 });
      
      // Verify searchMentions was called with empty string
      expect(mockMentionService.searchMentions).toHaveBeenCalledWith('', expect.any(Object));
    });

    it('FAILING: should handle @ symbol in middle of text', async () => {
      // ARRANGE
      const mockSuggestions = [
        { id: '1', name: 'chief', displayName: 'Chief of Staff', description: 'Strategic Lead' }
      ];
      mockMentionService.searchMentions.mockResolvedValue(mockSuggestions);
      
      const onChange = vi.fn();
      
      // ACT: Render with existing text and add @ in middle
      render(<MentionInput value="Hello " onChange={onChange} />);
      const textarea = screen.getByRole('textbox');
      
      // Simulate typing @ at end
      fireEvent.change(textarea, { 
        target: { value: 'Hello @', selectionStart: 7 } 
      });
      
      // ASSERT: Should detect @ and show dropdown
      await waitFor(() => {
        const dropdown = screen.getByRole('listbox');
        expect(dropdown).toBeInTheDocument();
      });
    });

    it('FAILING: should handle cursor position correctly after @', async () => {
      // ARRANGE
      const mockSuggestions = [
        { id: '1', name: 'test', displayName: 'Test Agent', description: 'Testing' }
      ];
      mockMentionService.searchMentions.mockResolvedValue(mockSuggestions);
      
      const onChange = vi.fn();
      
      // ACT
      render(<MentionInput value="" onChange={onChange} />);
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      
      // Simulate realistic input event with cursor position
      Object.defineProperty(textarea, 'selectionStart', { value: 1, configurable: true });
      fireEvent.change(textarea, { target: { value: '@' } });
      
      // ASSERT: Should call searchMentions with empty query
      await waitFor(() => {
        expect(mockMentionService.searchMentions).toHaveBeenCalledWith('', expect.any(Object));
      });
    });
  });

  describe('CRITICAL: Suggestion Loading', () => {
    it('FAILING: should load suggestions from searchMentions', async () => {
      // ARRANGE
      const mockSuggestions = [
        { id: '1', name: 'assistant', displayName: 'Assistant', description: 'AI Helper' },
        { id: '2', name: 'chief', displayName: 'Chief of Staff', description: 'Strategic Lead' }
      ];
      mockMentionService.searchMentions.mockResolvedValue(mockSuggestions);
      
      // ACT
      render(<MentionInput value="" onChange={vi.fn()} />);
      const textarea = screen.getByRole('textbox');
      
      fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });
      
      // ASSERT: Should show both suggestions
      await waitFor(() => {
        expect(screen.getByText('Assistant')).toBeInTheDocument();
        expect(screen.getByText('Chief of Staff')).toBeInTheDocument();
      });
    });

    it('FAILING: should fallback to getQuickMentions when searchMentions fails', async () => {
      // ARRANGE: searchMentions fails, getQuickMentions succeeds
      mockMentionService.searchMentions.mockRejectedValue(new Error('Search failed'));
      const fallbackSuggestions = [
        { id: '1', name: 'fallback', displayName: 'Fallback Agent', description: 'Emergency fallback' }
      ];
      mockMentionService.getQuickMentions.mockReturnValue(fallbackSuggestions);
      
      // ACT
      render(<MentionInput value="" onChange={vi.fn()} />);
      const textarea = screen.getByRole('textbox');
      
      fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });
      
      // ASSERT: Should show fallback suggestions
      await waitFor(() => {
        expect(screen.getByText('Fallback Agent')).toBeInTheDocument();
      });
      
      expect(mockMentionService.getQuickMentions).toHaveBeenCalled();
    });

    it('FAILING: should use getAllAgents as ultimate fallback', async () => {
      // ARRANGE: Both searchMentions and getQuickMentions fail
      mockMentionService.searchMentions.mockRejectedValue(new Error('Search failed'));
      mockMentionService.getQuickMentions.mockImplementation(() => {
        throw new Error('Quick mentions failed');
      });
      
      const allAgents = [
        { id: '1', name: 'ultimate', displayName: 'Ultimate Fallback', description: 'Last resort' }
      ];
      mockMentionService.getAllAgents.mockReturnValue(allAgents);
      
      // ACT
      render(<MentionInput value="" onChange={vi.fn()} />);
      const textarea = screen.getByRole('textbox');
      
      fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });
      
      // ASSERT: Should show ultimate fallback
      await waitFor(() => {
        expect(screen.getByText('Ultimate Fallback')).toBeInTheDocument();
      });
      
      expect(mockMentionService.getAllAgents).toHaveBeenCalled();
    });

    it('FAILING: should show hardcoded fallback when all services fail', async () => {
      // ARRANGE: All service methods fail
      mockMentionService.searchMentions.mockRejectedValue(new Error('Search failed'));
      mockMentionService.getQuickMentions.mockImplementation(() => {
        throw new Error('Quick mentions failed');
      });
      mockMentionService.getAllAgents.mockImplementation(() => {
        throw new Error('Get all agents failed');
      });
      
      // ACT
      render(<MentionInput value="" onChange={vi.fn()} />);
      const textarea = screen.getByRole('textbox');
      
      fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });
      
      // ASSERT: Should show hardcoded fallback
      await waitFor(() => {
        // Looking for fallback agents defined in the component
        const fallbackText = screen.getByText(/fallback/i);
        expect(fallbackText).toBeInTheDocument();
      });
    });
  });

  describe('CRITICAL: Dropdown Behavior', () => {
    it('FAILING: should open dropdown when @ is detected', async () => {
      // ARRANGE
      mockMentionService.searchMentions.mockResolvedValue([
        { id: '1', name: 'test', displayName: 'Test', description: 'Test agent' }
      ]);
      
      // ACT
      render(<MentionInput value="" onChange={vi.fn()} />);
      const textarea = screen.getByRole('textbox');
      
      fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });
      
      // ASSERT: Dropdown should be visible
      await waitFor(() => {
        const dropdown = screen.getByRole('listbox');
        expect(dropdown).toBeVisible();
      });
    });

    it('FAILING: should close dropdown when Escape is pressed', async () => {
      // ARRANGE
      mockMentionService.searchMentions.mockResolvedValue([
        { id: '1', name: 'test', displayName: 'Test', description: 'Test agent' }
      ]);
      
      render(<MentionInput value="" onChange={vi.fn()} />);
      const textarea = screen.getByRole('textbox');
      
      // Open dropdown
      fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      // ACT: Press Escape
      fireEvent.keyDown(textarea, { key: 'Escape' });
      
      // ASSERT: Dropdown should close
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('FAILING: should close dropdown on outside click', async () => {
      // ARRANGE
      mockMentionService.searchMentions.mockResolvedValue([
        { id: '1', name: 'test', displayName: 'Test', description: 'Test agent' }
      ]);
      
      render(
        <div>
          <MentionInput value="" onChange={vi.fn()} />
          <div data-testid="outside">Outside element</div>
        </div>
      );
      const textarea = screen.getByRole('textbox');
      
      // Open dropdown
      fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      // ACT: Click outside
      const outsideElement = screen.getByTestId('outside');
      fireEvent.mouseDown(outsideElement);
      
      // ASSERT: Dropdown should close
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('CRITICAL: User Interactions', () => {
    it('FAILING: should select suggestion with Enter key', async () => {
      // ARRANGE
      const mockSuggestions = [
        { id: '1', name: 'assistant', displayName: 'Assistant', description: 'AI Helper' }
      ];
      mockMentionService.searchMentions.mockResolvedValue(mockSuggestions);
      
      const onChange = vi.fn();
      
      render(<MentionInput value="" onChange={onChange} />);
      const textarea = screen.getByRole('textbox');
      
      // Open dropdown
      fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      // ACT: Press Enter to select first suggestion
      fireEvent.keyDown(textarea, { key: 'Enter' });
      
      // ASSERT: onChange should be called with mention text
      expect(onChange).toHaveBeenCalledWith(expect.stringContaining('@assistant '));
    });

    it('FAILING: should select suggestion with mouse click', async () => {
      // ARRANGE
      const mockSuggestions = [
        { id: '1', name: 'chief', displayName: 'Chief of Staff', description: 'Strategic Lead' }
      ];
      mockMentionService.searchMentions.mockResolvedValue(mockSuggestions);
      
      const onChange = vi.fn();
      
      render(<MentionInput value="" onChange={onChange} />);
      const textarea = screen.getByRole('textbox');
      
      // Open dropdown
      fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });
      
      await waitFor(() => {
        expect(screen.getByText('Chief of Staff')).toBeInTheDocument();
      });
      
      // ACT: Click on suggestion
      const suggestion = screen.getByRole('option');
      fireEvent.click(suggestion);
      
      // ASSERT: onChange should be called with mention text
      expect(onChange).toHaveBeenCalledWith(expect.stringContaining('@chief '));
    });

    it('FAILING: should navigate suggestions with arrow keys', async () => {
      // ARRANGE
      const mockSuggestions = [
        { id: '1', name: 'first', displayName: 'First Agent', description: 'First' },
        { id: '2', name: 'second', displayName: 'Second Agent', description: 'Second' }
      ];
      mockMentionService.searchMentions.mockResolvedValue(mockSuggestions);
      
      render(<MentionInput value="" onChange={vi.fn()} />);
      const textarea = screen.getByRole('textbox');
      
      // Open dropdown
      fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });
      
      await waitFor(() => {
        const firstOption = screen.getByText('First Agent').closest('[role="option"]');
        expect(firstOption).toHaveAttribute('aria-selected', 'true');
      });
      
      // ACT: Press ArrowDown
      fireEvent.keyDown(textarea, { key: 'ArrowDown' });
      
      // ASSERT: Second option should be selected
      await waitFor(() => {
        const secondOption = screen.getByText('Second Agent').closest('[role="option"]');
        expect(secondOption).toHaveAttribute('aria-selected', 'true');
      });
    });
  });

  describe('CRITICAL: Edge Cases and Error Handling', () => {
    it('FAILING: should handle empty suggestions gracefully', async () => {
      // ARRANGE
      mockMentionService.searchMentions.mockResolvedValue([]);
      mockMentionService.getQuickMentions.mockReturnValue([]);
      mockMentionService.getAllAgents.mockReturnValue([]);
      
      // ACT
      render(<MentionInput value="" onChange={vi.fn()} />);
      const textarea = screen.getByRole('textbox');
      
      fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });
      
      // ASSERT: Should show "no agents found" or fallback message
      await waitFor(() => {
        const noAgentsMessage = screen.getByText(/no agents/i) || 
                               screen.getByText(/type to search/i) ||
                               screen.getByText(/fallback/i);
        expect(noAgentsMessage).toBeInTheDocument();
      });
    });

    it('FAILING: should handle rapid typing without breaking', async () => {
      // ARRANGE
      mockMentionService.searchMentions.mockResolvedValue([
        { id: '1', name: 'test', displayName: 'Test', description: 'Test agent' }
      ]);
      
      const onChange = vi.fn();
      
      // ACT
      render(<MentionInput value="" onChange={onChange} />);
      const textarea = screen.getByRole('textbox');
      
      // Simulate rapid typing
      fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });
      fireEvent.change(textarea, { target: { value: '@t', selectionStart: 2 } });
      fireEvent.change(textarea, { target: { value: '@te', selectionStart: 3 } });
      fireEvent.change(textarea, { target: { value: '@tes', selectionStart: 4 } });
      
      // ASSERT: Should not crash and show final suggestions
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
      
      // Should have called searchMentions multiple times due to debouncing
      expect(mockMentionService.searchMentions).toHaveBeenCalled();
    });

    it('FAILING: should handle malformed suggestion data', async () => {
      // ARRANGE: Return malformed data
      mockMentionService.searchMentions.mockResolvedValue([
        null, // null suggestion
        { id: '1' }, // missing required fields
        { id: '2', name: 'valid', displayName: 'Valid Agent', description: 'Valid' }
      ] as any);
      
      // ACT
      render(<MentionInput value="" onChange={vi.fn()} />);
      const textarea = screen.getByRole('textbox');
      
      fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });
      
      // ASSERT: Should only show valid suggestions
      await waitFor(() => {
        expect(screen.getByText('Valid Agent')).toBeInTheDocument();
      });
      
      // Should not crash
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });
});

/**
 * INTEGRATION TESTS FOR COMPLETE MENTION FLOW
 */
describe('EMERGENCY: Integration Tests', () => {
  it('FAILING: should complete full mention flow end-to-end', async () => {
    // ARRANGE: Full mock setup
    const mockSuggestions = [
      { id: '1', name: 'assistant', displayName: 'Assistant', description: 'AI Helper' }
    ];
    mockMentionService.searchMentions.mockResolvedValue(mockSuggestions);
    
    const onChange = vi.fn();
    
    // ACT: Complete flow
    render(<MentionInput value="" onChange={onChange} />);
    const textarea = screen.getByRole('textbox');
    
    // 1. Type @
    fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });
    
    // 2. Wait for dropdown
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
    
    // 3. Select suggestion
    fireEvent.keyDown(textarea, { key: 'Enter' });
    
    // 4. Verify final state
    expect(onChange).toHaveBeenCalledWith('@assistant ');
    
    // 5. Dropdown should close
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });
});