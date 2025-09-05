import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import FilterPanel, { FilterOptions } from '../../components/FilterPanel';
import RealSocialMediaFeed from '../../components/RealSocialMediaFeed';

// London School - Regression tests for existing functionality
describe('Multi-Select Filtering - Regression Tests', () => {
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

  describe('Backward Compatibility - Existing Filter Types', () => {
    it('should still support basic "all" filter', async () => {
      render(<FilterPanel {...defaultProps} />);
      
      // Should render with "All Posts" label
      expect(screen.getByText('All Posts')).toBeInTheDocument();
      expect(screen.getByText('42 posts')).toBeInTheDocument();
    });

    it('should still support single agent filtering', async () => {
      const agentFilter: FilterOptions = { type: 'agent', agent: 'Agent1' };
      render(<FilterPanel {...defaultProps} currentFilter={agentFilter} />);
      
      // Should show current agent filter
      expect(screen.getByText('Agent: Agent1')).toBeInTheDocument();
    });

    it('should still support single hashtag filtering', async () => {
      const hashtagFilter: FilterOptions = { type: 'hashtag', hashtag: 'hashtag1' };
      render(<FilterPanel {...defaultProps} currentFilter={hashtagFilter} />);
      
      // Should show current hashtag filter
      expect(screen.getByText('#hashtag1')).toBeInTheDocument();
    });

    it('should still support saved posts filtering', async () => {
      const savedFilter: FilterOptions = { type: 'saved' };
      render(<FilterPanel {...defaultProps} currentFilter={savedFilter} />);
      
      // Should show saved posts filter
      expect(screen.getByText('Saved Posts')).toBeInTheDocument();
    });

    it('should still support myposts filtering', async () => {
      const myPostsFilter: FilterOptions = { type: 'myposts' };
      render(<FilterPanel {...defaultProps} currentFilter={myPostsFilter} />);
      
      // Should show my posts filter
      expect(screen.getByText('My Posts')).toBeInTheDocument();
    });
  });

  describe('Clear Filter Functionality - Regression', () => {
    it('should clear multi-select filters properly', async () => {
      const multiFilter: FilterOptions = {
        type: 'multi-select',
        agents: ['Agent1'],
        hashtags: ['hashtag1']
      };
      
      render(<FilterPanel {...defaultProps} currentFilter={multiFilter} />);
      
      // Should show clear button for active multi-select filter
      const clearButton = screen.getByText('Clear').closest('button');
      expect(clearButton).toBeInTheDocument();
      
      // Click clear
      await userEvent.click(clearButton!);
      
      // Should call onFilterChange with 'all' type
      expect(mockOnFilterChange).toHaveBeenCalledWith({ type: 'all' });
    });

    it('should clear single filters properly', async () => {
      const agentFilter: FilterOptions = { type: 'agent', agent: 'Agent1' };
      render(<FilterPanel {...defaultProps} currentFilter={agentFilter} />);
      
      // Should show clear button
      const clearButton = screen.getByText('Clear').closest('button');
      expect(clearButton).toBeInTheDocument();
      
      // Click clear
      await userEvent.click(clearButton!);
      
      // Should call onFilterChange with 'all' type
      expect(mockOnFilterChange).toHaveBeenCalledWith({ type: 'all' });
    });
  });

  describe('Filter Dropdown Navigation - Regression', () => {
    it('should open and close dropdown correctly', async () => {
      render(<FilterPanel {...defaultProps} />);
      
      // Click to open dropdown
      const filterButton = screen.getByText('All Posts').closest('button');
      await userEvent.click(filterButton!);
      
      // Should show all filter options
      expect(screen.getByText('By Agent')).toBeInTheDocument();
      expect(screen.getByText('By Hashtag')).toBeInTheDocument();
      expect(screen.getByText('Advanced Filter')).toBeInTheDocument();
      expect(screen.getByText('Saved Posts')).toBeInTheDocument();
      expect(screen.getByText('My Posts')).toBeInTheDocument();
    });

    it('should switch to agent filter from dropdown', async () => {
      render(<FilterPanel {...defaultProps} />);
      
      // Open dropdown and click "By Agent"
      const filterButton = screen.getByText('All Posts').closest('button');
      await userEvent.click(filterButton!);
      
      const agentOption = screen.getByText('By Agent').closest('button');
      await userEvent.click(agentOption!);
      
      // Should open agent selection dropdown
      expect(screen.getByText('Select Agent')).toBeInTheDocument();
      expect(screen.getByText('Agent1')).toBeInTheDocument();
    });

    it('should switch to hashtag filter from dropdown', async () => {
      render(<FilterPanel {...defaultProps} />);
      
      // Open dropdown and click "By Hashtag"
      const filterButton = screen.getByText('All Posts').closest('button');
      await userEvent.click(filterButton!);
      
      const hashtagOption = screen.getByText('By Hashtag').closest('button');
      await userEvent.click(hashtagOption!);
      
      // Should open hashtag selection dropdown
      expect(screen.getByText('Select Hashtag')).toBeInTheDocument();
      expect(screen.getByText('#hashtag1')).toBeInTheDocument();
    });
  });

  describe('Advanced Filter Integration - New Feature', () => {
    it('should open advanced filter panel without breaking existing functionality', async () => {
      render(<FilterPanel {...defaultProps} />);
      
      // Open dropdown and click "Advanced Filter"
      const filterButton = screen.getByText('All Posts').closest('button');
      await userEvent.click(filterButton!);
      
      const advancedOption = screen.getByText('Advanced Filter').closest('button');
      await userEvent.click(advancedOption!);
      
      // Should open advanced filter panel
      expect(screen.getByText('Agents (0 selected)')).toBeInTheDocument();
      expect(screen.getByText('Hashtags (0 selected)')).toBeInTheDocument();
      
      // Should have combination mode buttons
      expect(screen.getByText(/AND - Match all selected/i)).toBeInTheDocument();
      expect(screen.getByText(/OR - Match any selected/i)).toBeInTheDocument();
      
      // Should have action buttons
      expect(screen.getByRole('button', { name: /apply filter/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should cancel advanced filter without affecting existing state', async () => {
      render(<FilterPanel {...defaultProps} />);
      
      // Open advanced filter
      const filterButton = screen.getByText('All Posts').closest('button');
      await userEvent.click(filterButton!);
      await userEvent.click(screen.getByText('Advanced Filter').closest('button')!);
      
      // Cancel
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
      
      // Should return to original state
      await waitFor(() => {
        expect(screen.queryByText('Agents (0 selected)')).not.toBeInTheDocument();
      });
      expect(screen.getByText('All Posts')).toBeInTheDocument();
    });
  });

  describe('Post Count Display - Regression', () => {
    it('should continue showing post count for all filter types', async () => {
      const testFilters: FilterOptions[] = [
        { type: 'all' },
        { type: 'agent', agent: 'Agent1' },
        { type: 'hashtag', hashtag: 'hashtag1' },
        { type: 'saved' },
        { type: 'myposts' },
        { type: 'multi-select', agents: ['Agent1'], hashtags: ['hashtag1'] }
      ];

      for (const filter of testFilters) {
        const { rerender } = render(
          <FilterPanel {...defaultProps} currentFilter={filter} />
        );
        
        // Should always show post count
        expect(screen.getByText('42 posts')).toBeInTheDocument();
        
        // Clean up for next iteration
        rerender(<div />);
      }
    });
  });

  describe('Visual State Consistency - Regression', () => {
    it('should maintain consistent visual states for active filters', async () => {
      const activeFilter: FilterOptions = { type: 'agent', agent: 'Agent1' };
      render(<FilterPanel {...defaultProps} currentFilter={activeFilter} />);
      
      // Active filter should have blue styling
      const filterButton = screen.getByText('Agent: Agent1').closest('button');
      expect(filterButton).toHaveClass('bg-blue-50', 'border-blue-200', 'text-blue-700');
      
      // Clear button should be visible
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('should maintain consistent visual states for multi-select filters', async () => {
      const multiFilter: FilterOptions = {
        type: 'multi-select',
        agents: ['Agent1'],
        hashtags: ['hashtag1']
      };
      
      render(<FilterPanel {...defaultProps} currentFilter={multiFilter} />);
      
      // Should show combined label
      expect(screen.getByText('1 agent + 1 tag')).toBeInTheDocument();
      
      // Should have active styling
      const filterButton = screen.getByText('1 agent + 1 tag').closest('button');
      expect(filterButton).toHaveClass('bg-blue-50', 'border-blue-200', 'text-blue-700');
    });
  });

  describe('Event Handler Compatibility - Regression', () => {
    it('should continue calling onFilterChange for all filter types', async () => {
      render(<FilterPanel {...defaultProps} />);
      
      // Test single filter selection
      const filterButton = screen.getByText('All Posts').closest('button');
      await userEvent.click(filterButton!);
      await userEvent.click(screen.getByText('Saved Posts').closest('button')!);
      
      expect(mockOnFilterChange).toHaveBeenCalledWith({ type: 'saved' });
    });

    it('should continue calling onSuggestionsRequest when provided', async () => {
      render(<FilterPanel {...defaultProps} />);
      
      // Open advanced filter and type in agent input
      const filterButton = screen.getByText('All Posts').closest('button');
      await userEvent.click(filterButton!);
      await userEvent.click(screen.getByText('Advanced Filter').closest('button')!);
      
      const agentInput = screen.getByPlaceholderText('Search and select agents...');
      await userEvent.type(agentInput, 'test');
      
      expect(mockOnSuggestionsRequest).toHaveBeenCalledWith('agents', 'test');
    });
  });

  describe('Performance - No Regressions', () => {
    it('should render without performance regressions', () => {
      const startTime = performance.now();
      
      render(<FilterPanel {...defaultProps} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render in under 50ms (generous threshold for tests)
      expect(renderTime).toBeLessThan(50);
    });

    it('should handle large filter lists without performance issues', () => {
      const largeProps = {
        ...defaultProps,
        availableAgents: Array.from({ length: 100 }, (_, i) => `Agent${i}`),
        availableHashtags: Array.from({ length: 100 }, (_, i) => `hashtag${i}`)
      };
      
      const startTime = performance.now();
      
      render(<FilterPanel {...largeProps} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should still render efficiently with large data sets
      expect(renderTime).toBeLessThan(100);
    });
  });
});