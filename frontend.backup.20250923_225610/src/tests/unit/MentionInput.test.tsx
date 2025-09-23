import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MentionInput, MentionInputProps, MentionSuggestion } from '../../components/MentionInput';

// Mock MentionService
vi.mock('../../services/MentionService', () => ({
  MentionService: {
    searchMentions: vi.fn(),
    getQuickMentions: vi.fn(),
    validateMention: vi.fn(),
    extractMentions: vi.fn(),
  },
}));

const mockSuggestions: MentionSuggestion[] = [
  {
    id: 'test-agent-1',
    name: 'test-agent',
    displayName: 'Test Agent',
    description: 'A test agent for testing',
    type: 'tester',
  },
  {
    id: 'code-reviewer',
    name: 'code-reviewer-agent',
    displayName: 'Code Reviewer',
    description: 'Code review and analysis',
    type: 'reviewer',
  },
  {
    id: 'bug-hunter',
    name: 'bug-hunter-agent',
    displayName: 'Bug Hunter',
    description: 'Bug detection and debugging',
    type: 'tester',
  },
];

describe('MentionInput', () => {
  const defaultProps: MentionInputProps = {
    value: '',
    onChange: vi.fn(),
    placeholder: 'Type @ to mention agents...',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('@ Character Detection', () => {
    it('should detect @ character and open dropdown', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.getQuickMentions as any).mockReturnValue(mockSuggestions);

      render(<MentionInput {...defaultProps} />);
      const textarea = screen.getByRole('textbox');

      await user.type(textarea, '@');

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    });

    it('should NOT open dropdown for @ character in middle of word', async () => {
      const user = userEvent.setup();
      render(<MentionInput {...defaultProps} value="email@domain.com" onChange={vi.fn()} />);
      const textarea = screen.getByRole('textbox');

      // Position cursor after @
      fireEvent.click(textarea);
      fireEvent.select(textarea, { anchorOffset: 6, focusOffset: 6 });

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('should close dropdown when @ is deleted', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.getQuickMentions as any).mockReturnValue(mockSuggestions);

      const onChange = vi.fn();
      render(<MentionInput {...defaultProps} value="@" onChange={onChange} />);

      // Verify dropdown is open
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('should handle multiple @ characters correctly', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.getQuickMentions as any).mockReturnValue(mockSuggestions);

      render(<MentionInput {...defaultProps} />);
      const textarea = screen.getByRole('textbox');

      await user.type(textarea, 'Hello @agent1 and @');

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    });

    it('should detect @ at beginning of line', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.getQuickMentions as any).mockReturnValue(mockSuggestions);

      render(<MentionInput {...defaultProps} />);
      const textarea = screen.getByRole('textbox');

      await user.type(textarea, '@test');

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    });

    it('should detect @ after whitespace', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.getQuickMentions as any).mockReturnValue(mockSuggestions);

      render(<MentionInput {...defaultProps} />);
      const textarea = screen.getByRole('textbox');

      await user.type(textarea, 'Hello @');

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    });

    it('should detect @ after newline', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.getQuickMentions as any).mockReturnValue(mockSuggestions);

      render(<MentionInput {...defaultProps} />);
      const textarea = screen.getByRole('textbox');

      await user.type(textarea, 'First line\n@');

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    });
  });

  describe('Mention Query Extraction', () => {
    it('should extract query after @ character', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.searchMentions as any).mockResolvedValue(mockSuggestions);

      render(<MentionInput {...defaultProps} />);
      const textarea = screen.getByRole('textbox');

      await user.type(textarea, '@test');

      await waitFor(() => {
        expect(MentionService.searchMentions).toHaveBeenCalledWith('test', expect.any(Object));
      });
    });

    it('should handle empty query after @', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.getQuickMentions as any).mockReturnValue(mockSuggestions);

      render(<MentionInput {...defaultProps} />);
      const textarea = screen.getByRole('textbox');

      await user.type(textarea, '@');

      await waitFor(() => {
        expect(MentionService.getQuickMentions).toHaveBeenCalled();
      });
    });

    it('should stop query extraction at whitespace', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.searchMentions as any).mockResolvedValue(mockSuggestions);

      render(<MentionInput {...defaultProps} />);
      const textarea = screen.getByRole('textbox');

      await user.type(textarea, '@test hello');

      // Should not trigger search because space breaks the mention
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Dropdown Visibility and Positioning', () => {
    it('should show loading state while fetching suggestions', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      
      // Mock a delayed response
      (MentionService.searchMentions as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockSuggestions), 100))
      );

      render(<MentionInput {...defaultProps} />);
      const textarea = screen.getByRole('textbox');

      await user.type(textarea, '@test');

      await waitFor(() => {
        expect(screen.getByText('Loading agents...')).toBeInTheDocument();
      });
    });

    it('should show suggestions in dropdown when loaded', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.searchMentions as any).mockResolvedValue(mockSuggestions);

      render(<MentionInput {...defaultProps} />);
      const textarea = screen.getByRole('textbox');

      await user.type(textarea, '@test');

      await waitFor(() => {
        expect(screen.getByText('Test Agent')).toBeInTheDocument();
        expect(screen.getByText('Code Reviewer')).toBeInTheDocument();
      });
    });

    it('should show "no results" message when no suggestions found', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.searchMentions as any).mockResolvedValue([]);

      render(<MentionInput {...defaultProps} />);
      const textarea = screen.getByRole('textbox');

      await user.type(textarea, '@nonexistent');

      await waitFor(() => {
        expect(screen.getByText('No agents found matching "nonexistent"')).toBeInTheDocument();
      });
    });

    it('should close dropdown on Escape key', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.getQuickMentions as any).mockReturnValue(mockSuggestions);

      render(<MentionInput {...defaultProps} />);
      const textarea = screen.getByRole('textbox');

      await user.type(textarea, '@');

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('should close dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.getQuickMentions as any).mockReturnValue(mockSuggestions);

      render(
        <div>
          <MentionInput {...defaultProps} />
          <button>Outside button</button>
        </div>
      );
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '@');

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Outside button'));

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate suggestions with ArrowDown key', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.getQuickMentions as any).mockReturnValue(mockSuggestions);

      render(<MentionInput {...defaultProps} />);
      const textarea = screen.getByRole('textbox');

      await user.type(textarea, '@');

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      // First item should be selected by default
      expect(screen.getByText('Test Agent').closest('li')).toHaveAttribute('aria-selected', 'true');

      await user.keyboard('{ArrowDown}');

      // Second item should be selected
      expect(screen.getByText('Code Reviewer').closest('li')).toHaveAttribute('aria-selected', 'true');
    });

    it('should navigate suggestions with ArrowUp key', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.getQuickMentions as any).mockReturnValue(mockSuggestions);

      render(<MentionInput {...defaultProps} />);
      const textarea = screen.getByRole('textbox');

      await user.type(textarea, '@');

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.keyboard('{ArrowUp}');

      // Should wrap to last item
      expect(screen.getByText('Bug Hunter').closest('li')).toHaveAttribute('aria-selected', 'true');
    });

    it('should select suggestion with Enter key', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.getQuickMentions as any).mockReturnValue(mockSuggestions);

      const onChange = vi.fn();
      const onMentionSelect = vi.fn();

      render(<MentionInput {...defaultProps} onChange={onChange} onMentionSelect={onMentionSelect} />);
      const textarea = screen.getByRole('textbox');

      await user.type(textarea, '@');

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.keyboard('{Enter}');

      expect(onChange).toHaveBeenCalledWith('@test-agent ');
      expect(onMentionSelect).toHaveBeenCalledWith(mockSuggestions[0]);

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('should select suggestion with Tab key', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.getQuickMentions as any).mockReturnValue(mockSuggestions);

      const onChange = vi.fn();

      render(<MentionInput {...defaultProps} onChange={onChange} />);
      const textarea = screen.getByRole('textbox');

      await user.type(textarea, '@');

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.keyboard('{Tab}');

      expect(onChange).toHaveBeenCalledWith('@test-agent ');
    });

    it('should allow normal Enter when dropdown is closed', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(<MentionInput {...defaultProps} onSubmit={onSubmit} value="Hello world" />);
      const textarea = screen.getByRole('textbox');

      await user.keyboard('{Enter}');

      expect(onSubmit).toHaveBeenCalledWith('Hello world');
    });
  });

  describe('Mouse Interaction', () => {
    it('should select suggestion on mouse click', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.getQuickMentions as any).mockReturnValue(mockSuggestions);

      const onChange = vi.fn();
      const onMentionSelect = vi.fn();

      render(<MentionInput {...defaultProps} onChange={onChange} onMentionSelect={onMentionSelect} />);
      const textarea = screen.getByRole('textbox');

      await user.type(textarea, '@');

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Code Reviewer'));

      expect(onChange).toHaveBeenCalledWith('@code-reviewer-agent ');
      expect(onMentionSelect).toHaveBeenCalledWith(mockSuggestions[1]);

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('should update selected index on mouse hover', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.getQuickMentions as any).mockReturnValue(mockSuggestions);

      render(<MentionInput {...defaultProps} />);
      const textarea = screen.getByRole('textbox');

      await user.type(textarea, '@');

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      const secondOption = screen.getByText('Code Reviewer').closest('li');
      await user.hover(secondOption!);

      expect(secondOption).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Mention Insertion', () => {
    it('should insert mention at correct position', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.getQuickMentions as any).mockReturnValue(mockSuggestions);

      const onChange = vi.fn();

      render(<MentionInput {...defaultProps} onChange={onChange} value="Hello @" />);
      const textarea = screen.getByRole('textbox');

      // Position cursor after @
      fireEvent.click(textarea);
      fireEvent.select(textarea, { anchorOffset: 7, focusOffset: 7 });

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Test Agent'));

      expect(onChange).toHaveBeenCalledWith('Hello @test-agent ');
    });

    it('should replace partial mention query', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.searchMentions as any).mockResolvedValue(mockSuggestions);

      const onChange = vi.fn();

      render(<MentionInput {...defaultProps} onChange={onChange} value="Hello @te" />);
      const textarea = screen.getByRole('textbox');

      // Position cursor after @te
      fireEvent.click(textarea);
      fireEvent.select(textarea, { anchorOffset: 9, focusOffset: 9 });

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Test Agent'));

      expect(onChange).toHaveBeenCalledWith('Hello @test-agent ');
    });

    it('should preserve text after mention', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.getQuickMentions as any).mockReturnValue(mockSuggestions);

      const onChange = vi.fn();

      render(<MentionInput {...defaultProps} onChange={onChange} value="Hello @ world" />);
      const textarea = screen.getByRole('textbox');

      // Position cursor after @
      fireEvent.click(textarea);
      fireEvent.select(textarea, { anchorOffset: 7, focusOffset: 7 });

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Test Agent'));

      expect(onChange).toHaveBeenCalledWith('Hello @test-agent  world');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.searchMentions as any).mockRejectedValue(new Error('API Error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<MentionInput {...defaultProps} />);
      const textarea = screen.getByRole('textbox');

      await user.type(textarea, '@test');

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching agent suggestions:', expect.any(Error));
      });

      // Should not show suggestions on error
      expect(screen.queryByText('Test Agent')).not.toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('should handle disabled state', () => {
      render(<MentionInput {...defaultProps} disabled />);
      const textarea = screen.getByRole('textbox');

      expect(textarea).toBeDisabled();
      expect(textarea).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('should respect maxLength prop', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<MentionInput {...defaultProps} onChange={onChange} maxLength={5} />);
      const textarea = screen.getByRole('textbox');

      await user.type(textarea, 'Hello World');

      expect(onChange).not.toHaveBeenCalledWith('Hello World');
      // Should only accept up to maxLength characters
    });

    it('should show character count when maxLength is set', () => {
      render(<MentionInput {...defaultProps} value="Hello" maxLength={100} />);
      expect(screen.getByText('5/100')).toBeInTheDocument();
    });

    it('should handle rapid typing without errors', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.searchMentions as any).mockResolvedValue(mockSuggestions);

      render(<MentionInput {...defaultProps} debounceMs={100} />);
      const textarea = screen.getByRole('textbox');

      // Type rapidly
      await user.type(textarea, '@test', { delay: 10 });

      // Should still work correctly after debouncing
      await waitFor(() => {
        expect(MentionService.searchMentions).toHaveBeenCalledWith('test', expect.any(Object));
      }, { timeout: 500 });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      const user = userEvent.setup();
      const { MentionService } = await import('../../services/MentionService');
      (MentionService.getQuickMentions as any).mockReturnValue(mockSuggestions);

      render(<MentionInput {...defaultProps} />);
      const textarea = screen.getByRole('textbox');

      expect(textarea).toHaveAttribute('aria-label', 'Compose message with agent mentions');
      expect(textarea).toHaveAttribute('aria-expanded', 'false');
      expect(textarea).toHaveAttribute('aria-haspopup', 'listbox');

      await user.type(textarea, '@');

      await waitFor(() => {
        expect(textarea).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('listbox')).toHaveAttribute('aria-label', 'Agent suggestions');
      });
    });

    it('should support custom aria-label and aria-describedby', () => {
      render(
        <MentionInput 
          {...defaultProps} 
          aria-label="Custom label"
          aria-describedby="custom-description"
        />
      );
      const textarea = screen.getByRole('textbox');

      expect(textarea).toHaveAttribute('aria-label', 'Custom label');
      expect(textarea).toHaveAttribute('aria-describedby', 'custom-description');
    });
  });
});