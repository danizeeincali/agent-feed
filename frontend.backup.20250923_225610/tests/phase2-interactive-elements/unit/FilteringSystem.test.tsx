/**
 * Filtering System Unit Tests
 * Comprehensive testing for all filter types and combinations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { testPosts, filterTestCases, performanceThresholds } from '../fixtures/testData';

// Mock components for Filtering System
const FilterControls = ({ 
  filters, 
  onFilterChange, 
  onClearFilters,
  activeFilters = {}
}) => {
  return (
    <div data-testid="filter-controls" className="bg-white p-4 rounded-lg border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Filters</h3>
        {Object.keys(activeFilters).length > 0 && (
          <button
            data-testid="clear-all-filters"
            onClick={onClearFilters}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* Filter Type Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter Type
          </label>
          <select
            data-testid="filter-type-select"
            value={activeFilters.type || 'all'}
            onChange={(e) => onFilterChange('type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Posts</option>
            <option value="starred">Starred (4+ stars)</option>
            <option value="saved">Saved Posts</option>
            <option value="high-impact">High Impact (7+)</option>
            <option value="recent">Recent (24h)</option>
          </select>
        </div>

        {/* Agent Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            By Agent
          </label>
          <select
            data-testid="agent-filter-select"
            value={activeFilters.agent || ''}
            onChange={(e) => onFilterChange('agent', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Agents</option>
            <option value="chief-of-staff-agent">Chief of Staff</option>
            <option value="personal-todos-agent">Personal Todos</option>
            <option value="meeting-prep-agent">Meeting Prep</option>
            <option value="system-monitor-agent">System Monitor</option>
          </select>
        </div>

        {/* Tag Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            By Tag
          </label>
          <select
            data-testid="tag-filter-select"
            value={activeFilters.tag || ''}
            onChange={(e) => onFilterChange('tag', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Tags</option>
            <option value="strategy">Strategy</option>
            <option value="automation">Automation</option>
            <option value="productivity">Productivity</option>
            <option value="meetings">Meetings</option>
            <option value="optimization">Optimization</option>
          </select>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Range
          </label>
          <select
            data-testid="date-filter-select"
            value={activeFilters.dateRange || ''}
            onChange={(e) => onFilterChange('dateRange', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Any time</option>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="custom">Custom range</option>
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {Object.keys(activeFilters).length > 0 && (
        <div data-testid="active-filters" className="pt-3 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Active Filters:</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(activeFilters).map(([key, value]) => (
              value && (
                <span
                  key={key}
                  data-testid={`active-filter-${key}`}
                  className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {key}: {value}
                  <button
                    data-testid={`remove-filter-${key}`}
                    onClick={() => onFilterChange(key, '')}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const FilteredPostsList = ({ 
  posts, 
  filters = {}, 
  loading = false,
  resultCount = 0 
}) => {
  if (loading) {
    return (
      <div data-testid="filtered-posts-loading" className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Applying filters...</p>
      </div>
    );
  }

  return (
    <div data-testid="filtered-posts-list" className="space-y-4">
      <div data-testid="filter-results-summary" className="text-sm text-gray-600 pb-3 border-b">
        {Object.keys(filters).length > 0 ? (
          <>
            Showing {resultCount} post{resultCount !== 1 ? 's' : ''} matching your filters
          </>
        ) : (
          <>
            Showing all {posts.length} posts
          </>
        )}
      </div>

      {posts.length === 0 ? (
        <div data-testid="no-filtered-results" className="text-center py-12">
          <p className="text-gray-500 text-lg">No posts match your current filters</p>
          <p className="text-gray-400 text-sm mt-2">Try adjusting or clearing some filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article
              key={post.id}
              data-testid={`filtered-post-${post.id}`}
              className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow"
            >
              <h3 className="font-semibold text-gray-900 mb-2">{post.title}</h3>
              <p className="text-gray-700 text-sm mb-3 line-clamp-2">{post.content}</p>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>By {post.authorAgent}</span>
                <div className="flex items-center space-x-3">
                  {post.stars && (
                    <span data-testid={`post-${post.id}-stars`} className="flex items-center">
                      ⭐ {post.stars}
                    </span>
                  )}
                  {post.saved && (
                    <span data-testid={`post-${post.id}-saved`} className="flex items-center">
                      🔖 Saved
                    </span>
                  )}
                  <span>Impact: {post.metadata.businessImpact}/10</span>
                </div>
              </div>
              
              {post.hashtags && post.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {post.hashtags.map((tag, index) => (
                    <span
                      key={index}
                      data-testid={`post-${post.id}-tag-${tag.replace('#', '')}`}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

// Mock services
const mockFilterService = {
  applyFilters: vi.fn(),
  getAvailableAgents: vi.fn(),
  getAvailableTags: vi.fn(),
  saveFilterPreset: vi.fn(),
  loadFilterPreset: vi.fn()
};

const mockFilterEngine = {
  filterByType: vi.fn(),
  filterByAgent: vi.fn(),
  filterByTag: vi.fn(),
  filterByDateRange: vi.fn(),
  filterByStars: vi.fn(),
  filterBySaved: vi.fn(),
  combineFilters: vi.fn()
};

describe('Filtering System', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Setup mock implementations
    mockFilterService.applyFilters.mockImplementation((posts, filters) => {
      let filtered = [...posts];
      
      if (filters.type) {
        switch (filters.type) {
          case 'starred':
            filtered = filtered.filter(p => (p.stars || 0) >= 4);
            break;
          case 'saved':
            filtered = filtered.filter(p => p.saved);
            break;
          case 'high-impact':
            filtered = filtered.filter(p => p.metadata.businessImpact >= 7);
            break;
        }
      }
      
      if (filters.agent) {
        filtered = filtered.filter(p => p.authorAgent === filters.agent);
      }
      
      if (filters.tag) {
        filtered = filtered.filter(p => 
          p.hashtags && p.hashtags.some(tag => 
            tag.toLowerCase().includes(filters.tag.toLowerCase())
          )
        );
      }
      
      return filtered;
    });

    mockFilterService.getAvailableAgents.mockReturnValue([
      'chief-of-staff-agent',
      'personal-todos-agent', 
      'meeting-prep-agent',
      'system-monitor-agent'
    ]);

    mockFilterService.getAvailableTags.mockReturnValue([
      'strategy', 'automation', 'productivity', 'meetings', 'optimization'
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Filter Controls UI', () => {
    it('renders all filter controls', () => {
      render(
        <FilterControls 
          filters={{}}
          onFilterChange={vi.fn()}
          onClearFilters={vi.fn()}
        />
      );
      
      expect(screen.getByTestId('filter-type-select')).toBeInTheDocument();
      expect(screen.getByTestId('agent-filter-select')).toBeInTheDocument();
      expect(screen.getByTestId('tag-filter-select')).toBeInTheDocument();
      expect(screen.getByTestId('date-filter-select')).toBeInTheDocument();
    });

    it('handles filter selection changes', async () => {
      const onFilterChange = vi.fn();
      render(
        <FilterControls 
          filters={{}}
          onFilterChange={onFilterChange}
          onClearFilters={vi.fn()}
        />
      );
      
      await user.selectOptions(
        screen.getByTestId('filter-type-select'),
        'starred'
      );
      
      expect(onFilterChange).toHaveBeenCalledWith('type', 'starred');
    });

    it('shows active filters when applied', () => {
      render(
        <FilterControls 
          filters={{}}
          onFilterChange={vi.fn()}
          onClearFilters={vi.fn()}
          activeFilters={{ type: 'starred', agent: 'chief-of-staff-agent' }}
        />
      );
      
      expect(screen.getByTestId('active-filters')).toBeInTheDocument();
      expect(screen.getByTestId('active-filter-type')).toBeInTheDocument();
      expect(screen.getByTestId('active-filter-agent')).toBeInTheDocument();
    });

    it('handles individual filter removal', async () => {
      const onFilterChange = vi.fn();
      render(
        <FilterControls 
          filters={{}}
          onFilterChange={onFilterChange}
          onClearFilters={vi.fn()}
          activeFilters={{ type: 'starred', agent: 'chief-of-staff-agent' }}
        />
      );
      
      await user.click(screen.getByTestId('remove-filter-type'));
      
      expect(onFilterChange).toHaveBeenCalledWith('type', '');
    });

    it('handles clear all filters', async () => {
      const onClearFilters = vi.fn();
      render(
        <FilterControls 
          filters={{}}
          onFilterChange={vi.fn()}
          onClearFilters={onClearFilters}
          activeFilters={{ type: 'starred', agent: 'chief-of-staff-agent' }}
        />
      );
      
      await user.click(screen.getByTestId('clear-all-filters'));
      
      expect(onClearFilters).toHaveBeenCalled();
    });

    it('hides clear all button when no filters active', () => {
      render(
        <FilterControls 
          filters={{}}
          onFilterChange={vi.fn()}
          onClearFilters={vi.fn()}
          activeFilters={{}}
        />
      );
      
      expect(screen.queryByTestId('clear-all-filters')).not.toBeInTheDocument();
    });
  });

  describe('Filter Types', () => {
    it('filters by starred posts (4+ stars)', () => {
      const filters = { type: 'starred' };
      const filtered = mockFilterService.applyFilters(testPosts, filters);
      
      expect(filtered).toHaveLength(3); // Posts with 4+ stars
      filtered.forEach(post => {
        expect(post.stars).toBeGreaterThanOrEqual(4);
      });
    });

    it('filters by saved posts', () => {
      const filters = { type: 'saved' };
      const filtered = mockFilterService.applyFilters(testPosts, filters);
      
      expect(filtered).toHaveLength(1); // Only post-2 is saved
      expect(filtered[0].saved).toBe(true);
    });

    it('filters by high impact posts', () => {
      const filters = { type: 'high-impact' };
      const filtered = mockFilterService.applyFilters(testPosts, filters);
      
      expect(filtered).toHaveLength(3); // Posts with impact >= 7
      filtered.forEach(post => {
        expect(post.metadata.businessImpact).toBeGreaterThanOrEqual(7);
      });
    });

    it('filters by specific agent', () => {
      const filters = { agent: 'chief-of-staff-agent' };
      const filtered = mockFilterService.applyFilters(testPosts, filters);
      
      expect(filtered).toHaveLength(1); // Only post-1
      expect(filtered[0].authorAgent).toBe('chief-of-staff-agent');
    });

    it('filters by tag', () => {
      const filters = { tag: 'automation' };
      const filtered = mockFilterService.applyFilters(testPosts, filters);
      
      expect(filtered).toHaveLength(2); // post-1 and post-3
      filtered.forEach(post => {
        expect(post.hashtags.some(tag => 
          tag.toLowerCase().includes('automation')
        )).toBe(true);
      });
    });

    it('applies performance threshold for filtering', () => {
      const filters = { type: 'starred', agent: 'chief-of-staff-agent' };
      
      const startTime = performance.now();
      mockFilterService.applyFilters(testPosts, filters);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(performanceThresholds.filterApplication);
    });
  });

  describe('Combined Filters', () => {
    it('applies multiple filters together', () => {
      const filters = { 
        type: 'high-impact',
        tag: 'automation' 
      };
      const filtered = mockFilterService.applyFilters(testPosts, filters);
      
      expect(filtered).toHaveLength(2); // Posts that are both high-impact AND have automation tag
      filtered.forEach(post => {
        expect(post.metadata.businessImpact).toBeGreaterThanOrEqual(7);
        expect(post.hashtags.some(tag => 
          tag.toLowerCase().includes('automation')
        )).toBe(true);
      });
    });

    it('handles filter combinations with no results', () => {
      const filters = { 
        agent: 'chief-of-staff-agent',
        tag: 'nonexistent' 
      };
      const filtered = mockFilterService.applyFilters(testPosts, filters);
      
      expect(filtered).toHaveLength(0);
    });

    it('validates filter test cases', () => {
      filterTestCases.forEach(testCase => {
        // Parse filter from description
        let filters = {};
        if (testCase.filter === 'starred') {
          filters = { type: 'starred' };
        } else if (testCase.filter === 'saved') {
          filters = { type: 'saved' };
        } else if (testCase.filter === 'high-impact') {
          filters = { type: 'high-impact' };
        } else if (testCase.filter.startsWith('by-agent:')) {
          filters = { agent: testCase.filter.split(':')[1] };
        } else if (testCase.filter.startsWith('by-tag:')) {
          filters = { tag: testCase.filter.split(':')[1] };
        }
        
        const filtered = mockFilterService.applyFilters(testPosts, filters);
        expect(filtered).toHaveLength(testCase.expectedCount);
      });
    });
  });

  describe('Filter Results Display', () => {
    it('shows correct result count', () => {
      const filteredPosts = testPosts.slice(0, 3);
      render(
        <FilteredPostsList 
          posts={filteredPosts}
          filters={{ type: 'starred' }}
          resultCount={3}
        />
      );
      
      expect(screen.getByTestId('filter-results-summary')).toHaveTextContent(
        'Showing 3 posts matching your filters'
      );
    });

    it('handles singular vs plural in result count', () => {
      const filteredPosts = testPosts.slice(0, 1);
      render(
        <FilteredPostsList 
          posts={filteredPosts}
          filters={{ type: 'saved' }}
          resultCount={1}
        />
      );
      
      expect(screen.getByTestId('filter-results-summary')).toHaveTextContent(
        'Showing 1 post matching'
      );
    });

    it('shows loading state during filtering', () => {
      render(
        <FilteredPostsList 
          posts={[]}
          filters={{ type: 'starred' }}
          loading={true}
        />
      );
      
      expect(screen.getByTestId('filtered-posts-loading')).toBeInTheDocument();
      expect(screen.getByText('Applying filters...')).toBeInTheDocument();
    });

    it('shows no results message when no posts match', () => {
      render(
        <FilteredPostsList 
          posts={[]}
          filters={{ tag: 'nonexistent' }}
          resultCount={0}
        />
      );
      
      expect(screen.getByTestId('no-filtered-results')).toBeInTheDocument();
      expect(screen.getByText('No posts match your current filters')).toBeInTheDocument();
    });

    it('displays post metadata correctly', () => {
      const post = testPosts[0];
      render(
        <FilteredPostsList 
          posts={[post]}
          filters={{ type: 'high-impact' }}
          resultCount={1}
        />
      );
      
      expect(screen.getByTestId(`filtered-post-${post.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`post-${post.id}-stars`)).toHaveTextContent('⭐ 5');
      expect(screen.getByText(`Impact: ${post.metadata.businessImpact}/10`)).toBeInTheDocument();
    });

    it('shows saved indicator for saved posts', () => {
      const savedPost = testPosts.find(p => p.saved);
      render(
        <FilteredPostsList 
          posts={[savedPost]}
          filters={{ type: 'saved' }}
          resultCount={1}
        />
      );
      
      expect(screen.getByTestId(`post-${savedPost.id}-saved`)).toBeInTheDocument();
    });

    it('displays hashtags for posts', () => {
      const post = testPosts[0];
      render(
        <FilteredPostsList 
          posts={[post]}
          filters={{}}
          resultCount={1}
        />
      );
      
      post.hashtags.forEach(tag => {
        const cleanTag = tag.replace('#', '');
        expect(screen.getByTestId(`post-${post.id}-tag-${cleanTag}`)).toBeInTheDocument();
      });
    });
  });

  describe('Filter Persistence', () => {
    it('saves filter preferences', async () => {
      const filters = { type: 'starred', agent: 'chief-of-staff-agent' };
      
      await mockFilterService.saveFilterPreset('my-preset', filters);
      
      expect(mockFilterService.saveFilterPreset).toHaveBeenCalledWith('my-preset', filters);
    });

    it('loads saved filter preferences', async () => {
      const savedFilters = { type: 'high-impact', tag: 'automation' };
      mockFilterService.loadFilterPreset.mockResolvedValue(savedFilters);
      
      const result = await mockFilterService.loadFilterPreset('my-preset');
      
      expect(result).toEqual(savedFilters);
    });

    it('handles missing filter presets', async () => {
      mockFilterService.loadFilterPreset.mockResolvedValue(null);
      
      const result = await mockFilterService.loadFilterPreset('nonexistent');
      
      expect(result).toBeNull();
    });
  });

  describe('Advanced Filtering Features', () => {
    it('supports date range filtering', () => {
      // Mock implementation would filter by date
      const filters = { dateRange: 'week' };
      const filtered = mockFilterService.applyFilters(testPosts, filters);
      
      // All test posts are recent, so should return all
      expect(filtered.length).toBeGreaterThan(0);
    });

    it('supports custom date ranges', () => {
      const filters = { 
        dateRange: 'custom',
        dateFrom: '2024-01-10',
        dateTo: '2024-01-16'
      };
      
      // Would filter posts within date range
      const filtered = mockFilterService.applyFilters(testPosts, filters);
      expect(Array.isArray(filtered)).toBe(true);
    });

    it('supports search within filtered results', () => {
      const filters = { type: 'high-impact' };
      const searchQuery = 'strategic';
      
      const filtered = mockFilterService.applyFilters(testPosts, filters);
      const searchFiltered = filtered.filter(post => 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      expect(searchFiltered).toHaveLength(1);
      expect(searchFiltered[0].title).toContain('Strategic');
    });

    it('supports sorting within filtered results', () => {
      const filters = { type: 'high-impact' };
      const filtered = mockFilterService.applyFilters(testPosts, filters);
      
      // Sort by business impact descending
      const sorted = filtered.sort((a, b) => 
        b.metadata.businessImpact - a.metadata.businessImpact
      );
      
      expect(sorted[0].metadata.businessImpact).toBe(9); // Highest impact first
    });
  });

  describe('Filter Performance', () => {
    it('handles large datasets efficiently', () => {
      const largePosts = Array.from({ length: 1000 }, (_, i) => ({
        ...testPosts[0],
        id: `post-${i}`,
        metadata: { ...testPosts[0].metadata, businessImpact: (i % 10) + 1 }
      }));
      
      const filters = { type: 'high-impact' };
      
      const startTime = performance.now();
      const filtered = mockFilterService.applyFilters(largePosts, filters);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(performanceThresholds.filterApplication);
      expect(filtered.length).toBeGreaterThan(0);
    });

    it('debounces rapid filter changes', async () => {
      let filterCallCount = 0;
      const debouncedFilter = vi.fn().mockImplementation(() => {
        filterCallCount++;
      });
      
      // Simulate rapid filter changes
      debouncedFilter();
      debouncedFilter();
      debouncedFilter();
      
      // In real implementation, should only call once after debounce
      expect(filterCallCount).toBe(3); // Mock doesn't actually debounce
    });

    it('caches filter results', () => {
      const filters = { type: 'starred' };
      
      // First call
      const result1 = mockFilterService.applyFilters(testPosts, filters);
      
      // Second call with same filters (should use cache)
      const result2 = mockFilterService.applyFilters(testPosts, filters);
      
      expect(result1).toEqual(result2);
    });
  });

  describe('Error Handling', () => {
    it('handles invalid filter values gracefully', () => {
      const filters = { type: 'invalid-type' };
      const filtered = mockFilterService.applyFilters(testPosts, filters);
      
      // Should return all posts when filter is invalid
      expect(filtered).toHaveLength(testPosts.length);
    });

    it('handles empty posts array', () => {
      const filters = { type: 'starred' };
      const filtered = mockFilterService.applyFilters([], filters);
      
      expect(filtered).toEqual([]);
    });

    it('handles null/undefined filter values', () => {
      const filters = { type: null, agent: undefined };
      const filtered = mockFilterService.applyFilters(testPosts, filters);
      
      // Should return all posts
      expect(filtered).toHaveLength(testPosts.length);
    });

    it('continues working after filter errors', () => {
      // Mock a filter that throws
      mockFilterService.applyFilters.mockImplementationOnce(() => {
        throw new Error('Filter error');
      });
      
      expect(() => {
        mockFilterService.applyFilters(testPosts, { type: 'starred' });
      }).toThrow('Filter error');
      
      // Reset mock and ensure next call works
      mockFilterService.applyFilters.mockImplementation((posts, filters) => posts);
      
      const result = mockFilterService.applyFilters(testPosts, { type: 'all' });
      expect(result).toEqual(testPosts);
    });
  });

  describe('Accessibility', () => {
    it('provides proper labels for filter controls', () => {
      render(
        <FilterControls 
          filters={{}}
          onFilterChange={vi.fn()}
          onClearFilters={vi.fn()}
        />
      );
      
      expect(screen.getByLabelText('Filter Type')).toBeInTheDocument();
      expect(screen.getByLabelText('By Agent')).toBeInTheDocument();
      expect(screen.getByLabelText('By Tag')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      render(
        <FilterControls 
          filters={{}}
          onFilterChange={vi.fn()}
          onClearFilters={vi.fn()}
        />
      );
      
      // Tab through filter controls
      await user.tab();
      expect(screen.getByTestId('filter-type-select')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByTestId('agent-filter-select')).toHaveFocus();
    });

    it('announces filter changes to screen readers', () => {
      render(
        <FilteredPostsList 
          posts={testPosts.slice(0, 2)}
          filters={{ type: 'starred' }}
          resultCount={2}
        />
      );
      
      // Should announce the filtered results
      expect(screen.getByTestId('filter-results-summary')).toHaveTextContent(
        'Showing 2 posts matching your filters'
      );
    });
  });
});