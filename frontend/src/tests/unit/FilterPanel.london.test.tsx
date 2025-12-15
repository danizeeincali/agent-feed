import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import FilterPanel, { FilterOptions } from '../../components/FilterPanel';

// London School - Mock-driven approach
describe('FilterPanel - London School TDD', () => {
  // Mock dependencies - define contracts through expectations
  const mockOnFilterChange = vi.fn();
  const mockOnSuggestionsRequest = vi.fn();
  
  const defaultProps = {
    currentFilter: { type: 'all' as const },
    availableAgents: ['Agent1', 'Agent2', 'Agent3'],
    availableHashtags: ['hashtag1', 'hashtag2', 'hashtag3'],
    onFilterChange: mockOnFilterChange,
    postCount: 42,
    onSuggestionsRequest: mockOnSuggestionsRequest,
    suggestionsLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Advanced Filter Button Interaction', () => {
    it('should render Advanced Filter option in dropdown', async () => {
      render(<FilterPanel {...defaultProps} />);
      
      // Click filter dropdown to open
      const filterButton = screen.getByRole('button', { name: /all posts/i });
      await userEvent.click(filterButton);
      
      // Expect Advanced Filter option to be visible
      expect(screen.getByText('Advanced Filter')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /advanced filter/i })).toBeInTheDocument();
    });

    it('should open multi-select panel when Advanced Filter is clicked', async () => {
      render(<FilterPanel {...defaultProps} />);
      
      // Open dropdown
      const filterButton = screen.getByRole('button', { name: /all posts/i });
      await userEvent.click(filterButton);
      
      // Click Advanced Filter
      const advancedFilterButton = screen.getByRole('button', { name: /advanced filter/i });
      await userEvent.click(advancedFilterButton);
      
      // Expect multi-select panel to be visible
      expect(screen.getByText('Advanced Filter')).toBeInTheDocument();
      expect(screen.getByText('Agents (0 selected)')).toBeInTheDocument();
      expect(screen.getByText('Hashtags (0 selected)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /apply filter/i })).toBeInTheDocument();
    });

    it('should show Cancel and Apply buttons in multi-select panel', async () => {
      render(<FilterPanel {...defaultProps} />);
      
      // Navigate to multi-select panel
      const filterButton = screen.getByRole('button', { name: /all posts/i });
      await userEvent.click(filterButton);
      
      const advancedFilterButton = screen.getByRole('button', { name: /advanced filter/i });
      await userEvent.click(advancedFilterButton);
      
      // Verify action buttons exist
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /apply filter/i })).toBeInTheDocument();
    });
  });

  describe('MultiSelectInput Integration - Contract Verification', () => {
    it('should render MultiSelectInput components for agents and hashtags', async () => {
      render(<FilterPanel {...defaultProps} />);
      
      // Navigate to multi-select
      await userEvent.click(screen.getByRole('button', { name: /all posts/i }));
      await userEvent.click(screen.getByRole('button', { name: /advanced filter/i }));
      
      // Expect both multi-select inputs to be present
      const agentInput = screen.getByPlaceholderText('Search and select agents...');
      const hashtagInput = screen.getByPlaceholderText('Search and select hashtags...');
      
      expect(agentInput).toBeInTheDocument();
      expect(hashtagInput).toBeInTheDocument();
    });

    it('should pass correct props to agent MultiSelectInput', async () => {
      render(<FilterPanel {...defaultProps} />);
      
      // Navigate to multi-select
      await userEvent.click(screen.getByRole('button', { name: /all posts/i }));
      await userEvent.click(screen.getByRole('button', { name: /advanced filter/i }));
      
      const agentInput = screen.getByPlaceholderText('Search and select agents...');
      expect(agentInput).toBeInTheDocument();
      expect(agentInput).toHaveAttribute('placeholder', 'Search and select agents...');
    });

    it('should handle typing in agent input and trigger suggestions request', async () => {
      render(<FilterPanel {...defaultProps} />);
      
      // Navigate to multi-select
      await userEvent.click(screen.getByRole('button', { name: /all posts/i }));
      await userEvent.click(screen.getByRole('button', { name: /advanced filter/i }));
      
      // Type in agent input
      const agentInput = screen.getByPlaceholderText('Search and select agents...');
      await userEvent.type(agentInput, 'test-agent');
      
      // Verify suggestions request was triggered - London School contract verification
      expect(mockOnSuggestionsRequest).toHaveBeenCalledWith('agents', 'test-agent');
    });

    it('should handle typing in hashtag input and trigger suggestions request', async () => {
      render(<FilterPanel {...defaultProps} />);
      
      // Navigate to multi-select
      await userEvent.click(screen.getByRole('button', { name: /all posts/i }));
      await userEvent.click(screen.getByRole('button', { name: /advanced filter/i }));
      
      // Type in hashtag input
      const hashtagInput = screen.getByPlaceholderText('Search and select hashtags...');
      await userEvent.type(hashtagInput, 'test-hashtag');
      
      // Verify suggestions request was triggered
      expect(mockOnSuggestionsRequest).toHaveBeenCalledWith('hashtags', 'test-hashtag');
    });
  });

  describe('Apply Filter Behavior - Mock Verification', () => {
    it('should be disabled when no agents or hashtags are selected', async () => {
      render(<FilterPanel {...defaultProps} />);
      
      // Navigate to multi-select
      await userEvent.click(screen.getByRole('button', { name: /all posts/i }));
      await userEvent.click(screen.getByRole('button', { name: /advanced filter/i }));
      
      // Apply button should be disabled initially
      const applyButton = screen.getByRole('button', { name: /apply filter/i });
      expect(applyButton).toBeDisabled();
    });

    it('should call onFilterChange with correct multi-select filter when applied', async () => {
      // Start with multi-select filter to test apply behavior
      const multiSelectFilter: FilterOptions = {
        type: 'multi-select',
        multiSelectMode: true,
        agents: ['Agent1'],
        hashtags: ['hashtag1'],
        combinationMode: 'AND'
      };
      
      render(<FilterPanel {...defaultProps} currentFilter={multiSelectFilter} />);
      
      // Navigate to multi-select - get specific filter button by text content
      const filterButton = screen.getByText('1 agent + 1 tag').closest('button');
      expect(filterButton).toBeInTheDocument();
      await userEvent.click(filterButton!);
      
      await userEvent.click(screen.getByRole('button', { name: /advanced filter/i }));
      
      // Apply the filter
      const applyButton = screen.getByRole('button', { name: /apply filter/i });
      await userEvent.click(applyButton);
      
      // Verify onFilterChange was called with multi-select filter
      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'multi-select',
          multiSelectMode: true
        })
      );
    });
  });

  describe('Combination Mode Selection - Interaction Testing', () => {
    it('should render AND/OR mode buttons', async () => {
      render(<FilterPanel {...defaultProps} />);
      
      // Navigate to multi-select
      await userEvent.click(screen.getByRole('button', { name: /all posts/i }));
      await userEvent.click(screen.getByRole('button', { name: /advanced filter/i }));
      
      // Check for combination mode buttons
      expect(screen.getByRole('button', { name: /and - match all selected/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /or - match any selected/i })).toBeInTheDocument();
    });

    it('should default to AND mode', async () => {
      render(<FilterPanel {...defaultProps} />);
      
      // Navigate to multi-select
      await userEvent.click(screen.getByRole('button', { name: /all posts/i }));
      await userEvent.click(screen.getByRole('button', { name: /advanced filter/i }));
      
      // AND button should be selected (active styles)
      const andButton = screen.getByRole('button', { name: /and - match all selected/i });
      expect(andButton).toHaveClass('bg-blue-50', 'border-blue-200', 'text-blue-700');
    });

    it('should switch to OR mode when clicked', async () => {
      render(<FilterPanel {...defaultProps} />);
      
      // Navigate to multi-select
      await userEvent.click(screen.getByRole('button', { name: /all posts/i }));
      await userEvent.click(screen.getByRole('button', { name: /advanced filter/i }));
      
      // Click OR button
      const orButton = screen.getByRole('button', { name: /or - match any selected/i });
      await userEvent.click(orButton);
      
      // OR button should now be active
      expect(orButton).toHaveClass('bg-blue-50', 'border-blue-200', 'text-blue-700');
    });
  });

  describe('Cancel Behavior - State Management Testing', () => {
    it('should close multi-select panel when Cancel is clicked', async () => {
      render(<FilterPanel {...defaultProps} />);
      
      // Navigate to multi-select
      await userEvent.click(screen.getByRole('button', { name: /all posts/i }));
      await userEvent.click(screen.getByRole('button', { name: /advanced filter/i }));
      
      // Panel should be open
      expect(screen.getByText('Advanced Filter')).toBeInTheDocument();
      
      // Click Cancel
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
      
      // Panel should be closed
      await waitFor(() => {
        expect(screen.queryByText('Agents (0 selected)')).not.toBeInTheDocument();
      });
    });

    it('should close multi-select panel when clicking outside', async () => {
      render(<FilterPanel {...defaultProps} />);
      
      // Navigate to multi-select
      await userEvent.click(screen.getByRole('button', { name: /all posts/i }));
      await userEvent.click(screen.getByRole('button', { name: /advanced filter/i }));
      
      // Panel should be open
      expect(screen.getByText('Advanced Filter')).toBeInTheDocument();
      
      // Click outside (on the overlay)
      const overlay = document.querySelector('.fixed.inset-0');
      if (overlay) {
        fireEvent.click(overlay);
      }
      
      // Panel should be closed
      await waitFor(() => {
        expect(screen.queryByText('Agents (0 selected)')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State Handling - Contract Verification', () => {
    it('should pass loading state to MultiSelectInput components', async () => {
      render(<FilterPanel {...defaultProps} suggestionsLoading={true} />);
      
      // Navigate to multi-select
      await userEvent.click(screen.getByRole('button', { name: /all posts/i }));
      await userEvent.click(screen.getByRole('button', { name: /advanced filter/i }));
      
      // MultiSelectInput should show loading state (spinner)
      const spinners = document.querySelectorAll('.animate-spin');
      expect(spinners.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling - Failure Cases', () => {
    it('should handle missing onSuggestionsRequest gracefully', async () => {
      render(<FilterPanel {...defaultProps} onSuggestionsRequest={undefined} />);
      
      // Navigate to multi-select
      await userEvent.click(screen.getByRole('button', { name: /all posts/i }));
      await userEvent.click(screen.getByRole('button', { name: /advanced filter/i }));
      
      // Typing should not crash the component
      const agentInput = screen.getByPlaceholderText('Search and select agents...');
      await userEvent.type(agentInput, 'test');
      
      // Component should still be functional
      expect(agentInput).toHaveValue('test');
    });
  });

  describe('Integration with Parent Component - Contract Testing', () => {
    it('should maintain filter state when switching between modes', async () => {
      const currentFilter: FilterOptions = {
        type: 'multi-select',
        agents: ['Agent1'],
        hashtags: ['hashtag1'],
        combinationMode: 'OR'
      };
      
      render(<FilterPanel {...defaultProps} currentFilter={currentFilter} />);
      
      // Navigate to multi-select
      await userEvent.click(screen.getByRole('button'));
      await userEvent.click(screen.getByRole('button', { name: /advanced filter/i }));
      
      // Should show current selections
      expect(screen.getByText('Agents (1 selected)')).toBeInTheDocument();
      expect(screen.getByText('Hashtags (1 selected)')).toBeInTheDocument();
      
      // OR mode should be selected
      const orButton = screen.getByRole('button', { name: /or - match any selected/i });
      expect(orButton).toHaveClass('bg-blue-50', 'border-blue-200', 'text-blue-700');
    });
  });
});