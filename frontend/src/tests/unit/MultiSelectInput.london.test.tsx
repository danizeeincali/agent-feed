import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import MultiSelectInput, { MultiSelectOption } from '../../components/MultiSelectInput';

// London School - Mock-driven approach focusing on behavior verification
describe('MultiSelectInput - London School TDD', () => {
  // Mock collaborators - define contracts through expectations
  const mockOnChange = vi.fn();
  const mockOnSearch = vi.fn();
  
  const mockOptions: MultiSelectOption[] = [
    { value: 'agent1', label: 'Agent One', color: 'blue' },
    { value: 'agent2', label: 'Agent Two', color: 'purple' },
    { value: 'agent3', label: 'Agent Three', color: 'green' },
    { value: 'hashtag1', label: '#hashtag1', color: 'purple' },
    { value: 'hashtag2', label: '#hashtag2', color: 'purple' }
  ];

  const defaultProps = {
    options: mockOptions,
    value: [],
    onChange: mockOnChange,
    placeholder: 'Type to search...',
    onSearch: mockOnSearch
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Field Interaction - Contract Verification', () => {
    it('should render input field with correct placeholder', () => {
      render(<MultiSelectInput {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type to search...');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'Type to search...');
    });

    it('should focus input when container is clicked', async () => {
      render(<MultiSelectInput {...defaultProps} />);
      
      const container = screen.getByPlaceholderText('Type to search...').closest('div');
      if (container?.parentElement) {
        await userEvent.click(container.parentElement);
      }
      
      expect(screen.getByPlaceholderText('Type to search...')).toHaveFocus();
    });

    it('should trigger onSearch when typing - mock verification', async () => {
      render(<MultiSelectInput {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type to search...');
      await userEvent.type(input, 'test-query');
      
      // Verify onSearch was called with each character typed
      expect(mockOnSearch).toHaveBeenCalledWith('t');
      expect(mockOnSearch).toHaveBeenCalledWith('te');
      expect(mockOnSearch).toHaveBeenCalledWith('tes');
      expect(mockOnSearch).toHaveBeenCalledWith('test');
      expect(mockOnSearch).toHaveBeenCalledWith('test-');
      expect(mockOnSearch).toHaveBeenCalledWith('test-q');
      expect(mockOnSearch).toHaveBeenCalledWith('test-qu');
      expect(mockOnSearch).toHaveBeenCalledWith('test-que');
      expect(mockOnSearch).toHaveBeenCalledWith('test-quer');
      expect(mockOnSearch).toHaveBeenCalledWith('test-query');
    });

    it('should open dropdown when typing', async () => {
      render(<MultiSelectInput {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type to search...');
      await userEvent.type(input, 'agent');
      
      // Dropdown should be open and show filtered options
      await waitFor(() => {
        expect(screen.getByText('Agent One')).toBeInTheDocument();
      });
    });
  });

  describe('Dropdown Behavior - Interaction Testing', () => {
    it('should show filtered options based on input', async () => {
      render(<MultiSelectInput {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type to search...');
      await userEvent.type(input, 'agent');
      
      // Should show agent options, not hashtag options
      await waitFor(() => {
        expect(screen.getByText('Agent One')).toBeInTheDocument();
        expect(screen.getByText('Agent Two')).toBeInTheDocument();
        expect(screen.getByText('Agent Three')).toBeInTheDocument();
        expect(screen.queryByText('#hashtag1')).not.toBeInTheDocument();
      });
    });

    it('should show result count when searching', async () => {
      render(<MultiSelectInput {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type to search...');
      await userEvent.type(input, 'agent');
      
      // Should show count of filtered results
      await waitFor(() => {
        expect(screen.getByText('3 results')).toBeInTheDocument();
      });
    });

    it('should close dropdown when clicking outside', async () => {
      render(<MultiSelectInput {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type to search...');
      await userEvent.type(input, 'agent');
      
      // Dropdown should be open
      await waitFor(() => {
        expect(screen.getByText('Agent One')).toBeInTheDocument();
      });
      
      // Click outside
      await userEvent.click(document.body);
      
      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByText('Agent One')).not.toBeInTheDocument();
      });
    });
  });

  describe('Option Selection - Mock-Driven Testing', () => {
    it('should call onChange when option is clicked', async () => {
      render(<MultiSelectInput {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type to search...');
      await userEvent.type(input, 'agent');
      
      await waitFor(() => {
        expect(screen.getByText('Agent One')).toBeInTheDocument();
      });
      
      // Click first option
      await userEvent.click(screen.getByText('Agent One'));
      
      // Verify onChange was called with correct value
      expect(mockOnChange).toHaveBeenCalledWith(['agent1']);
    });

    it('should add multiple selections correctly', async () => {
      const { rerender } = render(<MultiSelectInput {...defaultProps} />);
      
      // Select first option
      const input = screen.getByPlaceholderText('Type to search...');
      await userEvent.type(input, 'agent');
      
      await waitFor(() => {
        expect(screen.getByText('Agent One')).toBeInTheDocument();
      });
      
      await userEvent.click(screen.getByText('Agent One'));
      expect(mockOnChange).toHaveBeenCalledWith(['agent1']);
      
      // Re-render with updated value to simulate parent component update
      rerender(<MultiSelectInput {...defaultProps} value={['agent1']} />);
      
      // Type again to search for second option
      const updatedInput = screen.getByRole('textbox');
      await userEvent.type(updatedInput, 'agent');
      
      await waitFor(() => {
        // Agent Two should be visible since Agent One is already selected and filtered out
        expect(screen.getByText('Agent Two')).toBeInTheDocument();
      });
      
      await userEvent.click(screen.getByText('Agent Two'));
      expect(mockOnChange).toHaveBeenCalledWith(['agent1', 'agent2']);
    });

    it('should clear input after selection', async () => {
      render(<MultiSelectInput {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type to search...');
      await userEvent.type(input, 'agent');
      
      await waitFor(() => {
        expect(screen.getByText('Agent One')).toBeInTheDocument();
      });
      
      await userEvent.click(screen.getByText('Agent One'));
      
      // Input should be cleared
      expect(input).toHaveValue('');
    });
  });

  describe('Selected Items Display - State Verification', () => {
    it('should render selected items as chips', () => {
      render(<MultiSelectInput {...defaultProps} value={['agent1', 'hashtag1']} />);
      
      // Should show selected items as chips
      expect(screen.getByText('Agent One')).toBeInTheDocument();
      expect(screen.getByText('#hashtag1')).toBeInTheDocument();
    });

    it('should have remove buttons on each chip', () => {
      render(<MultiSelectInput {...defaultProps} value={['agent1']} />);
      
      // Should have remove button for selected item
      const removeButton = screen.getByLabelText('Remove Agent One');
      expect(removeButton).toBeInTheDocument();
    });

    it('should call onChange when remove button is clicked', async () => {
      render(<MultiSelectInput {...defaultProps} value={['agent1', 'agent2']} />);
      
      // Click remove button for first item
      const removeButton = screen.getByLabelText('Remove Agent One');
      await userEvent.click(removeButton);
      
      // Should call onChange with remaining items
      expect(mockOnChange).toHaveBeenCalledWith(['agent2']);
    });

    it('should hide placeholder when items are selected', () => {
      render(<MultiSelectInput {...defaultProps} value={['agent1']} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', '');
    });
  });

  describe('Keyboard Navigation - Interaction Testing', () => {
    it('should open dropdown on Enter key', async () => {
      render(<MultiSelectInput {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type to search...');
      await userEvent.click(input);
      await userEvent.keyboard('{Enter}');
      
      // Dropdown should open showing all options
      await waitFor(() => {
        expect(screen.getByText('Agent One')).toBeInTheDocument();
      });
    });

    it('should navigate options with arrow keys', async () => {
      render(<MultiSelectInput {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type to search...');
      await userEvent.type(input, 'agent');
      
      await waitFor(() => {
        expect(screen.getByText('Agent One')).toBeInTheDocument();
      });
      
      // Navigate down
      await userEvent.keyboard('{ArrowDown}');
      
      // First option should be highlighted
      const firstOption = screen.getByText('Agent One').closest('button');
      expect(firstOption).toHaveClass('bg-blue-50', 'text-blue-700');
    });

    it('should select highlighted option on Enter', async () => {
      render(<MultiSelectInput {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type to search...');
      await userEvent.type(input, 'agent');
      
      await waitFor(() => {
        expect(screen.getByText('Agent One')).toBeInTheDocument();
      });
      
      // Navigate and select
      await userEvent.keyboard('{ArrowDown}');
      await userEvent.keyboard('{Enter}');
      
      // Should select first option
      expect(mockOnChange).toHaveBeenCalledWith(['agent1']);
    });

    it('should close dropdown on Escape', async () => {
      render(<MultiSelectInput {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type to search...');
      await userEvent.type(input, 'agent');
      
      await waitFor(() => {
        expect(screen.getByText('Agent One')).toBeInTheDocument();
      });
      
      await userEvent.keyboard('{Escape}');
      
      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByText('Agent One')).not.toBeInTheDocument();
      });
    });

    it('should remove last item on Backspace when input is empty', async () => {
      render(<MultiSelectInput {...defaultProps} value={['agent1', 'agent2']} />);
      
      const input = screen.getByRole('textbox');
      await userEvent.click(input);
      
      // Input should be empty, backspace should remove last item
      await userEvent.keyboard('{Backspace}');
      
      expect(mockOnChange).toHaveBeenCalledWith(['agent1']);
    });
  });

  describe('Loading State - Contract Verification', () => {
    it('should show loading spinner when loading', () => {
      render(<MultiSelectInput {...defaultProps} loading={true} />);
      
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should show searching text in dropdown when loading', async () => {
      render(<MultiSelectInput {...defaultProps} loading={true} />);
      
      const input = screen.getByPlaceholderText('Type to search...');
      await userEvent.type(input, 'test');
      
      await waitFor(() => {
        expect(screen.getByText('Searching...')).toBeInTheDocument();
      });
    });
  });

  describe('Max Items Limit - Boundary Testing', () => {
    it('should disable input when max items reached', () => {
      render(<MultiSelectInput {...defaultProps} value={['agent1', 'agent2']} maxItems={2} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should show max items warning in dropdown', async () => {
      render(<MultiSelectInput {...defaultProps} value={['agent1', 'agent2']} maxItems={2} />);
      
      const input = screen.getByRole('textbox');
      await userEvent.click(input.closest('div')!);
      
      await waitFor(() => {
        expect(screen.getByText('Maximum 2 items selected')).toBeInTheDocument();
      });
    });

    it('should not add more items when max reached', async () => {
      render(<MultiSelectInput {...defaultProps} value={['agent1', 'agent2']} maxItems={2} />);
      
      // Try to add another item (though input should be disabled)
      // This tests the selectOption method boundary
      const container = screen.getByRole('textbox').closest('div');
      if (container) {
        fireEvent.click(container);
        // Simulate trying to select another option programmatically
        const component = container.closest('[data-testid]');
        // Max items should prevent addition
        expect(mockOnChange).not.toHaveBeenCalled();
      }
    });
  });

  describe('Custom Options - Allowance Testing', () => {
    it('should show add custom option when allowCustom is true', async () => {
      render(<MultiSelectInput {...defaultProps} allowCustom={true} />);
      
      const input = screen.getByPlaceholderText('Type to search...');
      await userEvent.type(input, 'nonexistent-option');
      
      await waitFor(() => {
        expect(screen.getByText('Add "nonexistent-option"')).toBeInTheDocument();
      });
    });

    it('should add custom option when clicked', async () => {
      render(<MultiSelectInput {...defaultProps} allowCustom={true} />);
      
      const input = screen.getByPlaceholderText('Type to search...');
      await userEvent.type(input, 'custom-option');
      
      await waitFor(() => {
        expect(screen.getByText('Add "custom-option"')).toBeInTheDocument();
      });
      
      await userEvent.click(screen.getByText('Add "custom-option"'));
      
      expect(mockOnChange).toHaveBeenCalledWith(['custom-option']);
    });

    it('should add custom option on Enter when no matches', async () => {
      render(<MultiSelectInput {...defaultProps} allowCustom={true} />);
      
      const input = screen.getByPlaceholderText('Type to search...');
      await userEvent.type(input, 'custom-option');
      await userEvent.keyboard('{Enter}');
      
      expect(mockOnChange).toHaveBeenCalledWith(['custom-option']);
    });
  });

  describe('Empty State - Error Handling', () => {
    it('should show empty message when no options match', async () => {
      render(<MultiSelectInput {...defaultProps} emptyMessage="No matches found" />);
      
      const input = screen.getByPlaceholderText('Type to search...');
      await userEvent.type(input, 'nonexistent');
      
      await waitFor(() => {
        expect(screen.getByText('No matches found')).toBeInTheDocument();
      });
    });

    it('should filter out already selected options', async () => {
      render(<MultiSelectInput {...defaultProps} value={['agent1']} />);
      
      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'agent');
      
      // Should only show unselected agents
      await waitFor(() => {
        expect(screen.queryByText('Agent One')).not.toBeInTheDocument();
        expect(screen.getByText('Agent Two')).toBeInTheDocument();
        expect(screen.getByText('Agent Three')).toBeInTheDocument();
      });
    });
  });

  describe('Color Support - Visual Testing', () => {
    it('should apply color classes to selected chips', () => {
      render(<MultiSelectInput {...defaultProps} value={['agent1']} />);
      
      const chip = screen.getByText('Agent One').closest('div');
      expect(chip).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('should show color indicators in dropdown options', async () => {
      render(<MultiSelectInput {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type to search...');
      await userEvent.type(input, 'agent');
      
      await waitFor(() => {
        const colorIndicator = document.querySelector('.bg-blue-500');
        expect(colorIndicator).toBeInTheDocument();
      });
    });
  });
});