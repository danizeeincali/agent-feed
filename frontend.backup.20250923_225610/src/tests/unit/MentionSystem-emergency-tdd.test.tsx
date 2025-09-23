import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MentionInput } from '../../components/MentionInput';
import { MentionService } from '../../services/MentionService';
import React from 'react';

// Mock MentionService
vi.mock('../../services/MentionService');

describe('EMERGENCY TDD: @ Mention System Critical Failures', () => {
  const mockMentionService = vi.mocked(MentionService);
  const mockSearchMentions = vi.fn();
  const mockGetQuickMentions = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockMentionService.mockImplementation(() => ({
      searchMentions: mockSearchMentions,
      getQuickMentions: mockGetQuickMentions,
      getSuggestions: vi.fn(),
      getAgentById: vi.fn(),
    }) as any);
  });

  describe('CRITICAL: Current Broken State Reproduction', () => {
    it('should reproduce the "Query: none" bug when typing @', async () => {
      // Setup: Mock service to return valid suggestions
      mockSearchMentions.mockResolvedValue([
        { id: 'agent1', name: 'Assistant', type: 'agent', description: 'AI Assistant' }
      ]);
      mockGetQuickMentions.mockReturnValue([
        { id: 'agent1', name: 'Assistant', type: 'agent', description: 'AI Assistant' }
      ]);

      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      const mockOnMention = vi.fn();

      render(
        <MentionInput
          value=""
          onChange={mockOnChange}
          onMention={mockOnMention}
          placeholder="Type @ to mention..."
        />
      );

      const textarea = screen.getByPlaceholderText('Type @ to mention...');
      
      // CRITICAL TEST: Type @ character
      await user.type(textarea, '@');

      // EXPECT: Dropdown should show but currently shows "Query: none"
      await waitFor(() => {
        const dropdown = screen.queryByText(/suggestions/i);
        if (dropdown) {
          // This test should FAIL in current broken state
          expect(screen.queryByText('Query: none')).toBeNull();
          expect(screen.queryByText('0 suggestions')).toBeNull();
        }
      });
    });

    it('FAILING TEST: should extract valid query from @ input instead of "none"', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      const mockOnMention = vi.fn();

      render(
        <MentionInput
          value=""
          onChange={mockOnChange}
          onMention={mockOnMention}
          placeholder="Test input"
        />
      );

      const textarea = screen.getByPlaceholderText('Test input');
      
      // Type @ followed by query
      await user.type(textarea, '@ass');

      // This should extract query "ass" but currently returns "none"
      await waitFor(() => {
        // Check if MentionService was called with correct query
        expect(mockSearchMentions).toHaveBeenCalledWith('ass');
      }, { timeout: 1000 });
    });

    it('FAILING TEST: MentionService should return suggestions > 0', async () => {
      const mentionService = new MentionService();
      
      // Direct service test - should return agent suggestions
      const emptySuggestions = await mentionService.searchMentions('');
      const querySuggestions = await mentionService.searchMentions('ass');
      const quickSuggestions = mentionService.getQuickMentions('post');

      // These should pass but currently fail due to broken service
      expect(emptySuggestions.length).toBeGreaterThan(0);
      expect(querySuggestions.length).toBeGreaterThan(0);
      expect(quickSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('DEBUGGING: Query Extraction Pipeline', () => {
    it('should test findMentionQuery function directly', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      const mockOnMention = vi.fn();

      render(
        <MentionInput
          value="@"
          onChange={mockOnChange}
          onMention={mockOnMention}
          placeholder="Test input"
        />
      );

      const textarea = screen.getByPlaceholderText('Test input');
      
      // Set cursor position after @
      textarea.focus();
      textarea.setSelectionRange(1, 1);

      // Trigger input event to test query extraction
      fireEvent.input(textarea, { target: { value: '@' } });

      await waitFor(() => {
        // Should call searchMentions with empty string, not fail
        expect(mockSearchMentions).toHaveBeenCalled();
      });
    });

    it('should test cursor position calculation during @ input', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      const mockOnMention = vi.fn();

      render(
        <MentionInput
          value="Hello @world"
          onChange={mockOnChange}
          onMention={mockOnMention}
          placeholder="Test input"
        />
      );

      const textarea = screen.getByPlaceholderText('Test input') as HTMLTextAreaElement;
      
      // Position cursor at different locations
      textarea.focus();
      textarea.setSelectionRange(7, 7); // After @
      
      fireEvent.input(textarea, { target: { value: 'Hello @world' } });

      await waitFor(() => {
        // Should detect @ at position 6 and extract query "world"
        expect(mockSearchMentions).toHaveBeenCalledWith('world');
      });
    });
  });

  describe('LIVE DEBUGGING: Real-time State Analysis', () => {
    it('should capture exact dropdown state when showing "Query: none"', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      const mockOnMention = vi.fn();

      // Force service to return empty results to simulate current bug
      mockSearchMentions.mockResolvedValue([]);
      mockGetQuickMentions.mockReturnValue([]);

      render(
        <MentionInput
          value=""
          onChange={mockOnChange}
          onMention={mockOnMention}
          placeholder="Debug test"
        />
      );

      const textarea = screen.getByPlaceholderText('Debug test');
      
      await user.type(textarea, '@');

      await waitFor(() => {
        // Capture current broken state for analysis
        const dropdown = screen.queryByRole('listbox');
        if (dropdown) {
          console.log('EMERGENCY DEBUG - Dropdown content:', dropdown.textContent);
          console.log('EMERGENCY DEBUG - Service calls:', {
            searchMentions: mockSearchMentions.mock.calls,
            getQuickMentions: mockGetQuickMentions.mock.calls
          });
        }
      });
    });

    it('should test complete pipeline: @ detection → query extraction → suggestion display', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      const mockOnMention = vi.fn();

      // Mock valid agent data
      const mockAgents = [
        { id: 'assistant', name: 'Assistant', type: 'agent', description: 'AI Assistant' },
        { id: 'researcher', name: 'Researcher', type: 'agent', description: 'Research Agent' }
      ];

      mockSearchMentions.mockResolvedValue(mockAgents);
      mockGetQuickMentions.mockReturnValue(mockAgents);

      render(
        <MentionInput
          value=""
          onChange={mockOnChange}
          onMention={mockOnMention}
          placeholder="Pipeline test"
        />
      );

      const textarea = screen.getByPlaceholderText('Pipeline test');
      
      // Step 1: Type @ to trigger detection
      await user.type(textarea, '@');

      // Step 2: Verify query extraction works
      await waitFor(() => {
        expect(mockSearchMentions).toHaveBeenCalled();
      });

      // Step 3: Type additional characters
      await user.type(textarea, 'ass');

      // Step 4: Verify suggestion display
      await waitFor(() => {
        expect(mockSearchMentions).toHaveBeenCalledWith('ass');
      });

      // Step 5: Check if suggestions are displayed
      await waitFor(() => {
        const suggestions = screen.queryByText(/Assistant/i);
        expect(suggestions).toBeTruthy();
      }, { timeout: 2000 });
    });
  });
});