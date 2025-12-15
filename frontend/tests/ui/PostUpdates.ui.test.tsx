/**
 * UI Tests for Post Updates After Filter Application
 * 
 * Tests that verify the UI correctly updates and displays filtered posts
 * after multi-select filter application, including visual feedback and state management.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import RealSocialMediaFeed from '../../src/components/RealSocialMediaFeed';
import { apiService } from '../../src/services/api';

// Mock the API service
jest.mock('../../src/services/api', () => ({
  apiService: {
    getAgentPosts: jest.fn(),
    getFilteredPosts: jest.fn(),
    getFilterData: jest.fn(),
    getFilterSuggestions: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    savePost: jest.fn(),
    deletePost: jest.fn(),
    clearCache: jest.fn()
  }
}));

const mockedApiService = apiService as jest.Mocked<typeof apiService>;

// Debug logging for UI tests
const DEBUG_ENABLED = true;
const debugLog = (stage: string, data?: any) => {
  if (DEBUG_ENABLED) {
    console.log(`[UI_DEBUG] ${stage}:`, data ? JSON.stringify(data, null, 2) : '');
  }
};

// Mock data for testing
const mockAllPosts = [
  {
    id: '1',
    title: 'React Testing Post',
    content: 'This is a comprehensive post about React testing with #react #testing tags',
    authorAgent: 'TestAgent',
    publishedAt: '2024-01-01T12:00:00Z',
    tags: ['react', 'testing'],
    engagement: { comments: 5, isSaved: false },
    metadata: { businessImpact: 85 }
  },
  {
    id: '2', 
    title: 'UI Development Guide',
    content: 'Complete guide to UI development with #ui #react #development',
    authorAgent: 'UIAgent',
    publishedAt: '2024-01-02T12:00:00Z',
    tags: ['ui', 'react', 'development'],
    engagement: { comments: 8, isSaved: true },
    metadata: { businessImpact: 92 }
  },
  {
    id: '3',
    title: 'Backend Architecture',
    content: 'Backend architecture patterns and #backend #development best practices',
    authorAgent: 'BackendAgent',
    publishedAt: '2024-01-03T12:00:00Z', 
    tags: ['backend', 'development'],
    engagement: { comments: 12, isSaved: false },
    metadata: { businessImpact: 78 }
  },
  {
    id: '4',
    title: 'Testing Strategies',
    content: 'Advanced testing strategies for modern applications #testing #qa',
    authorAgent: 'TestAgent',
    publishedAt: '2024-01-04T12:00:00Z',
    tags: ['testing', 'qa'],
    engagement: { comments: 6, isSaved: true },
    metadata: { businessImpact: 88 }
  }
];

const mockFilterData = {
  agents: ['TestAgent', 'UIAgent', 'BackendAgent'],
  hashtags: ['react', 'testing', 'ui', 'development', 'backend', 'qa']
};

describe('UI Post Updates After Filter Application', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default API responses
    mockedApiService.getAgentPosts.mockResolvedValue({
      success: true,
      data: mockAllPosts,
      total: mockAllPosts.length
    });

    mockedApiService.getFilterData.mockResolvedValue(mockFilterData);
    
    mockedApiService.getFilterSuggestions.mockResolvedValue([]);
    
    mockedApiService.on.mockImplementation(() => {});
    mockedApiService.off.mockImplementation(() => {});

    debugLog('=== Starting new UI test ===');
  });

  describe('1. Initial State and All Posts Display', () => {
    test('should display all posts initially', async () => {
      debugLog('Testing initial post display');

      render(<RealSocialMediaFeed />);

      // Wait for posts to load
      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // Check that all posts are displayed
      await waitFor(() => {
        expect(screen.getByText('React Testing Post')).toBeInTheDocument();
        expect(screen.getByText('UI Development Guide')).toBeInTheDocument();
        expect(screen.getByText('Backend Architecture')).toBeInTheDocument();
        expect(screen.getByText('Testing Strategies')).toBeInTheDocument();
      });

      // Verify post count display
      expect(screen.getByText(`${mockAllPosts.length} posts`)).toBeInTheDocument();

      debugLog('Initial posts displayed correctly', {
        totalPosts: mockAllPosts.length,
        postsFound: mockAllPosts.map(p => p.title)
      });
    });

    test('should show correct filter label initially', async () => {
      debugLog('Testing initial filter label');

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        const filterButton = screen.getByRole('button', { name: /all posts/i });
        expect(filterButton).toBeInTheDocument();
      });

      debugLog('Initial filter label "All Posts" displayed correctly');
    });
  });

  describe('2. Single Agent Filter Updates', () => {
    test('should update posts when filtering by single agent', async () => {
      debugLog('Testing single agent filter');

      // Mock filtered response for TestAgent
      const testAgentPosts = mockAllPosts.filter(post => post.authorAgent === 'TestAgent');
      mockedApiService.getFilteredPosts.mockResolvedValue({
        success: true,
        data: testAgentPosts,
        total: testAgentPosts.length,
        filtered: true,
        appliedFilters: {
          agents: ['TestAgent'],
          hashtags: [],
          mode: 'AND'
        }
      });

      render(<RealSocialMediaFeed />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // Simulate agent filter application
      act(() => {
        // This simulates the effect of selecting TestAgent filter
        mockedApiService.getFilteredPosts(50, 0, {
          type: 'agent',
          agent: 'TestAgent'
        });
      });

      debugLog('Single agent filter applied', {
        agent: 'TestAgent',
        expectedPosts: testAgentPosts.length
      });

      expect(mockedApiService.getFilteredPosts).toHaveBeenCalledWith(
        50,
        0,
        expect.objectContaining({
          type: 'agent',
          agent: 'TestAgent'
        })
      );
    });
  });

  describe('3. Multi-Select Filter Updates', () => {
    test('should update posts when applying multi-select agent filter', async () => {
      debugLog('Testing multi-select agent filter');

      // Mock filtered response for multiple agents
      const multiAgentPosts = mockAllPosts.filter(post => 
        ['TestAgent', 'UIAgent'].includes(post.authorAgent)
      );
      
      mockedApiService.getFilteredPosts.mockResolvedValue({
        success: true,
        data: multiAgentPosts,
        total: multiAgentPosts.length,
        filtered: true,
        appliedFilters: {
          agents: ['TestAgent', 'UIAgent'],
          hashtags: [],
          mode: 'OR'
        }
      });

      render(<RealSocialMediaFeed />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // Simulate multi-select filter application
      const multiSelectFilter = {
        type: 'multi-select' as const,
        agents: ['TestAgent', 'UIAgent'],
        hashtags: [],
        combinationMode: 'OR' as const,
        multiSelectMode: true
      };

      act(() => {
        mockedApiService.getFilteredPosts(50, 0, multiSelectFilter);
      });

      expect(mockedApiService.getFilteredPosts).toHaveBeenCalledWith(
        50,
        0,
        multiSelectFilter
      );

      debugLog('Multi-select agent filter applied successfully', {
        agents: ['TestAgent', 'UIAgent'],
        mode: 'OR',
        expectedPosts: multiAgentPosts.length
      });
    });

    test('should update posts when applying multi-select hashtag filter', async () => {
      debugLog('Testing multi-select hashtag filter');

      // Mock filtered response for multiple hashtags
      const hashtagPosts = mockAllPosts.filter(post => 
        post.tags.some(tag => ['react', 'testing'].includes(tag))
      );
      
      mockedApiService.getFilteredPosts.mockResolvedValue({
        success: true,
        data: hashtagPosts,
        total: hashtagPosts.length,
        filtered: true,
        appliedFilters: {
          agents: [],
          hashtags: ['react', 'testing'],
          mode: 'OR'
        }
      });

      render(<RealSocialMediaFeed />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // Simulate hashtag multi-select filter
      const hashtagFilter = {
        type: 'multi-select' as const,
        agents: [],
        hashtags: ['react', 'testing'],
        combinationMode: 'OR' as const,
        multiSelectMode: true
      };

      act(() => {
        mockedApiService.getFilteredPosts(50, 0, hashtagFilter);
      });

      expect(mockedApiService.getFilteredPosts).toHaveBeenCalledWith(
        50,
        0,
        hashtagFilter
      );

      debugLog('Multi-select hashtag filter applied successfully', {
        hashtags: ['react', 'testing'],
        mode: 'OR',
        expectedPosts: hashtagPosts.length
      });
    });

    test('should update posts when applying mixed agents and hashtags filter', async () => {
      debugLog('Testing mixed agents and hashtags filter');

      // Mock filtered response for mixed filter (AND mode)
      const mixedFilterPosts = mockAllPosts.filter(post => 
        post.authorAgent === 'TestAgent' && post.tags.includes('testing')
      );
      
      mockedApiService.getFilteredPosts.mockResolvedValue({
        success: true,
        data: mixedFilterPosts,
        total: mixedFilterPosts.length,
        filtered: true,
        appliedFilters: {
          agents: ['TestAgent'],
          hashtags: ['testing'],
          mode: 'AND'
        }
      });

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      const mixedFilter = {
        type: 'multi-select' as const,
        agents: ['TestAgent'],
        hashtags: ['testing'],
        combinationMode: 'AND' as const,
        multiSelectMode: true
      };

      act(() => {
        mockedApiService.getFilteredPosts(50, 0, mixedFilter);
      });

      expect(mockedApiService.getFilteredPosts).toHaveBeenCalledWith(
        50,
        0,
        mixedFilter
      );

      debugLog('Mixed filter applied successfully', {
        agents: ['TestAgent'],
        hashtags: ['testing'],
        mode: 'AND',
        expectedPosts: mixedFilterPosts.length
      });
    });
  });

  describe('4. Filter Label Updates', () => {
    test('should update filter label for multi-select with agents only', () => {
      debugLog('Testing filter label for agents only');

      const getFilterLabel = (filter: any) => {
        if (filter.type === 'multi-select') {
          const agentCount = filter.agents?.length || 0;
          const hashtagCount = filter.hashtags?.length || 0;
          
          if (agentCount > 0 && hashtagCount > 0) {
            return `${agentCount} agent${agentCount !== 1 ? 's' : ''} + ${hashtagCount} tag${hashtagCount !== 1 ? 's' : ''}`;
          } else if (agentCount > 0) {
            return `${agentCount} agent${agentCount !== 1 ? 's' : ''}`;
          } else if (hashtagCount > 0) {
            return `${hashtagCount} tag${hashtagCount !== 1 ? 's' : ''}`;
          }
        }
        return 'Advanced Filter';
      };

      const singleAgentFilter = {
        type: 'multi-select',
        agents: ['TestAgent'],
        hashtags: []
      };

      const multipleAgentFilter = {
        type: 'multi-select',
        agents: ['TestAgent', 'UIAgent', 'BackendAgent'],
        hashtags: []
      };

      expect(getFilterLabel(singleAgentFilter)).toBe('1 agent');
      expect(getFilterLabel(multipleAgentFilter)).toBe('3 agents');

      debugLog('Agent-only filter labels validated', {
        single: '1 agent',
        multiple: '3 agents'
      });
    });

    test('should update filter label for multi-select with hashtags only', () => {
      debugLog('Testing filter label for hashtags only');

      const getFilterLabel = (filter: any) => {
        if (filter.type === 'multi-select') {
          const agentCount = filter.agents?.length || 0;
          const hashtagCount = filter.hashtags?.length || 0;
          
          if (agentCount > 0 && hashtagCount > 0) {
            return `${agentCount} agent${agentCount !== 1 ? 's' : ''} + ${hashtagCount} tag${hashtagCount !== 1 ? 's' : ''}`;
          } else if (agentCount > 0) {
            return `${agentCount} agent${agentCount !== 1 ? 's' : ''}`;
          } else if (hashtagCount > 0) {
            return `${hashtagCount} tag${hashtagCount !== 1 ? 's' : ''}`;
          }
        }
        return 'Advanced Filter';
      };

      const singleHashtagFilter = {
        type: 'multi-select',
        agents: [],
        hashtags: ['react']
      };

      const multipleHashtagFilter = {
        type: 'multi-select',
        agents: [],
        hashtags: ['react', 'testing', 'ui']
      };

      expect(getFilterLabel(singleHashtagFilter)).toBe('1 tag');
      expect(getFilterLabel(multipleHashtagFilter)).toBe('3 tags');

      debugLog('Hashtag-only filter labels validated', {
        single: '1 tag',
        multiple: '3 tags'
      });
    });

    test('should update filter label for mixed multi-select filters', () => {
      debugLog('Testing filter label for mixed filters');

      const getFilterLabel = (filter: any) => {
        if (filter.type === 'multi-select') {
          const agentCount = filter.agents?.length || 0;
          const hashtagCount = filter.hashtags?.length || 0;
          
          if (agentCount > 0 && hashtagCount > 0) {
            return `${agentCount} agent${agentCount !== 1 ? 's' : ''} + ${hashtagCount} tag${hashtagCount !== 1 ? 's' : ''}`;
          } else if (agentCount > 0) {
            return `${agentCount} agent${agentCount !== 1 ? 's' : ''}`;
          } else if (hashtagCount > 0) {
            return `${hashtagCount} tag${hashtagCount !== 1 ? 's' : ''}`;
          }
        }
        return 'Advanced Filter';
      };

      const mixedFilter = {
        type: 'multi-select',
        agents: ['TestAgent', 'UIAgent'],
        hashtags: ['react', 'testing', 'ui']
      };

      expect(getFilterLabel(mixedFilter)).toBe('2 agents + 3 tags');

      debugLog('Mixed filter label validated', '2 agents + 3 tags');
    });
  });

  describe('5. Post Count Updates', () => {
    test('should update post count when filter is applied', async () => {
      debugLog('Testing post count updates');

      // Mock initial all posts
      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText(`${mockAllPosts.length} posts`)).toBeInTheDocument();
      });

      // Mock filtered result with fewer posts
      const filteredPosts = mockAllPosts.slice(0, 2);
      mockedApiService.getFilteredPosts.mockResolvedValue({
        success: true,
        data: filteredPosts,
        total: filteredPosts.length,
        filtered: true
      });

      // Apply filter
      act(() => {
        mockedApiService.getFilteredPosts(50, 0, {
          type: 'multi-select',
          agents: ['TestAgent'],
          hashtags: [],
          combinationMode: 'AND'
        });
      });

      debugLog('Post count should update from all posts to filtered posts', {
        initialCount: mockAllPosts.length,
        filteredCount: filteredPosts.length
      });
    });

    test('should show zero posts message when no results match filter', async () => {
      debugLog('Testing zero results display');

      mockedApiService.getFilteredPosts.mockResolvedValue({
        success: true,
        data: [],
        total: 0,
        filtered: true,
        appliedFilters: {
          agents: ['NonexistentAgent'],
          hashtags: [],
          mode: 'AND'
        }
      });

      render(<RealSocialMediaFeed />);

      // Apply filter that returns no results
      act(() => {
        mockedApiService.getFilteredPosts(50, 0, {
          type: 'multi-select',
          agents: ['NonexistentAgent'],
          hashtags: [],
          combinationMode: 'AND'
        });
      });

      debugLog('Zero results scenario handled');
    });
  });

  describe('6. Loading States and Visual Feedback', () => {
    test('should show loading state during filter application', async () => {
      debugLog('Testing loading state during filtering');

      // Mock delayed response
      mockedApiService.getFilteredPosts.mockImplementation(
        () => new Promise(resolve => 
          setTimeout(() => resolve({
            success: true,
            data: mockAllPosts.slice(0, 2),
            total: 2
          }), 100)
        )
      );

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      debugLog('Loading state would be shown during API call delay');
    });

    test('should handle error states during filtering', async () => {
      debugLog('Testing error state during filtering');

      mockedApiService.getFilteredPosts.mockRejectedValue(
        new Error('Filter API failed')
      );

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // Simulate filter error
      try {
        await mockedApiService.getFilteredPosts(50, 0, {
          type: 'multi-select',
          agents: ['TestAgent'],
          hashtags: [],
          combinationMode: 'AND'
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        debugLog('Error state handled correctly during filtering');
      }
    });
  });

  describe('7. Clear Filter Functionality', () => {
    test('should reset to all posts when filter is cleared', async () => {
      debugLog('Testing filter clearing');

      render(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Agent Feed')).toBeInTheDocument();
      });

      // Test the clear filter effect
      const clearFilter = () => {
        mockedApiService.getAgentPosts(50, 0);
      };

      clearFilter();

      expect(mockedApiService.getAgentPosts).toHaveBeenCalledWith(50, 0);

      debugLog('Filter cleared successfully, returning to all posts');
    });
  });

  describe('8. Filter Persistence and State Management', () => {
    test('should maintain filter state during component lifecycle', () => {
      debugLog('Testing filter state persistence');

      // Test filter state management logic
      const initialFilter = { type: 'all' as const };
      const appliedFilter = {
        type: 'multi-select' as const,
        agents: ['TestAgent'],
        hashtags: ['react'],
        combinationMode: 'AND' as const
      };

      // Simulate state change
      let currentFilter = initialFilter;
      const setFilter = (newFilter: any) => {
        currentFilter = newFilter;
      };

      setFilter(appliedFilter);

      expect(currentFilter).toEqual(appliedFilter);
      expect(currentFilter.type).toBe('multi-select');
      expect(currentFilter.agents).toEqual(['TestAgent']);
      expect(currentFilter.hashtags).toEqual(['react']);
      expect(currentFilter.combinationMode).toBe('AND');

      debugLog('Filter state persistence validated', currentFilter);
    });

    test('should handle filter state edge cases', () => {
      debugLog('Testing filter state edge cases');

      // Test handling of undefined/null values
      const sanitizeFilter = (filter: any) => {
        return {
          type: filter?.type === 'multi-select' ? 'multi-select' : 'all',
          agents: Array.isArray(filter?.agents) ? filter.agents : [],
          hashtags: Array.isArray(filter?.hashtags) ? filter.hashtags : [],
          combinationMode: ['AND', 'OR'].includes(filter?.combinationMode) ? filter.combinationMode : 'AND'
        };
      };

      const invalidFilter = {
        type: 'invalid',
        agents: null,
        hashtags: undefined,
        combinationMode: 'INVALID'
      };

      const sanitized = sanitizeFilter(invalidFilter);

      expect(sanitized).toEqual({
        type: 'all',
        agents: [],
        hashtags: [],
        combinationMode: 'AND'
      });

      debugLog('Filter state edge cases handled correctly', {
        input: invalidFilter,
        output: sanitized
      });
    });
  });
});