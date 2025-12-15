import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FilterPanel from '../../src/components/FilterPanel';
import { RealSocialMediaFeed } from '../../src/components/RealSocialMediaFeed';
import * as apiService from '../../src/services/api';

// Mock the API service
jest.mock('../../src/services/api');
const mockedApiService = apiService as jest.Mocked<typeof apiService>;

// Mock data for testing filters
const mockPosts = [
  {
    id: 'post-1',
    title: 'My Agent Post 1',
    content: 'This is my first post #testing @agent1',
    authorAgent: 'current-user-agent',
    publishedAt: new Date().toISOString(),
    engagement: {
      likes: 5,
      comments: 3,
      stars: { average: 4.5, count: 10 },
      isSaved: true,
      userRating: 5
    },
    tags: ['testing', 'mypost'],
    metadata: {
      businessImpact: 85,
      isAgentResponse: false
    }
  },
  {
    id: 'post-2',
    title: 'Other Agent Post',
    content: 'This is from another agent #different @agent2',
    authorAgent: 'other-agent',
    publishedAt: new Date().toISOString(),
    engagement: {
      likes: 2,
      comments: 1,
      stars: { average: 3.0, count: 2 },
      isSaved: false,
      userRating: 0
    },
    tags: ['different', 'other'],
    metadata: {
      businessImpact: 60,
      isAgentResponse: true
    }
  },
  {
    id: 'post-3',
    title: 'High Rated Post',
    content: 'This has high rating #quality',
    authorAgent: 'quality-agent',
    publishedAt: new Date().toISOString(),
    engagement: {
      likes: 10,
      comments: 5,
      stars: { average: 4.8, count: 20 },
      isSaved: true,
      userRating: 4
    },
    tags: ['quality', 'high'],
    metadata: {
      businessImpact: 95,
      isAgentResponse: false
    }
  }
];

const mockFilterData = {
  agents: ['current-user-agent', 'other-agent', 'quality-agent'],
  hashtags: ['testing', 'different', 'quality', 'other', 'mypost', 'high']
};

describe('Filter System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses
    mockedApiService.getAgentPosts.mockResolvedValue({
      success: true,
      data: mockPosts,
      total: mockPosts.length
    });
    
    mockedApiService.getFilterData.mockResolvedValue(mockFilterData);
    mockedApiService.getFilteredPosts.mockResolvedValue({
      success: true,
      data: [],
      total: 0
    });

    // Mock event listeners
    mockedApiService.on = jest.fn();
    mockedApiService.off = jest.fn();

    // Mock current user context for "My posts" filter
    global.currentUserAgent = 'current-user-agent';
  });

  describe('Filter Panel Component', () => {
    const defaultProps = {
      currentFilter: { type: 'all' as const },
      availableAgents: mockFilterData.agents,
      availableHashtags: mockFilterData.hashtags,
      onFilterChange: jest.fn(),
      postCount: 3
    };

    it('should render filter button with current filter state', () => {
      render(<FilterPanel {...defaultProps} />);
      
      expect(screen.getByText('All Posts')).toBeInTheDocument();
      expect(screen.getByText('3 posts')).toBeInTheDocument();
    });

    it('should show filter dropdown when clicked', async () => {
      render(<FilterPanel {...defaultProps} />);
      
      const filterButton = screen.getByRole('button', { name: /All Posts/ });
      fireEvent.click(filterButton);
      
      await waitFor(() => {
        expect(screen.getByText('All Posts')).toBeInTheDocument();
        expect(screen.getByText('Starred Posts')).toBeInTheDocument();
        expect(screen.getByText('By Agent')).toBeInTheDocument();
        expect(screen.getByText('By Hashtag')).toBeInTheDocument();
        expect(screen.getByText('Saved Posts')).toBeInTheDocument();
      });
    });

    it('should show My Posts filter option', async () => {
      render(<FilterPanel {...defaultProps} />);
      
      const filterButton = screen.getByRole('button', { name: /All Posts/ });
      fireEvent.click(filterButton);
      
      await waitFor(() => {
        expect(screen.getByText('By Agent')).toBeInTheDocument();
      });
    });
  });

  describe('My Posts Filter', () => {
    it('should filter posts by current user agent', async () => {
      const filteredPosts = mockPosts.filter(post => post.authorAgent === 'current-user-agent');
      mockedApiService.getFilteredPosts.mockResolvedValue({
        success: true,
        data: filteredPosts,
        total: filteredPosts.length
      });

      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('All Posts')).toBeInTheDocument();
      });

      // Click filter button
      const filterButton = screen.getByRole('button', { name: /All Posts/ });
      fireEvent.click(filterButton);
      
      // Click "By Agent" to show agent dropdown
      await waitFor(() => {
        const agentFilter = screen.getByText('By Agent');
        fireEvent.click(agentFilter);
      });

      // Select current user agent (equivalent to "My posts")
      await waitFor(() => {
        const myAgentOption = screen.getByText('current-user-agent');
        fireEvent.click(myAgentOption);
      });

      await waitFor(() => {
        expect(mockedApiService.getFilteredPosts).toHaveBeenCalledWith(
          50, 0,
          { type: 'agent', agent: 'current-user-agent' }
        );
      });
    });

    it('should show only current user posts when My Posts is active', async () => {
      const myPosts = [mockPosts[0]]; // Only current user's posts
      mockedApiService.getFilteredPosts.mockResolvedValue({
        success: true,
        data: myPosts,
        total: myPosts.length
      });

      render(<RealSocialMediaFeed />);
      
      // Apply "My Posts" filter
      await waitFor(() => {
        const filterButton = screen.getByRole('button', { name: /All Posts/ });
        fireEvent.click(filterButton);
      });

      await waitFor(() => {
        const agentFilter = screen.getByText('By Agent');
        fireEvent.click(agentFilter);
      });

      await waitFor(() => {
        const myAgentOption = screen.getByText('current-user-agent');
        fireEvent.click(myAgentOption);
      });

      // Should show filter is applied
      await waitFor(() => {
        expect(screen.getByText('Agent: current-user-agent')).toBeInTheDocument();
      });
    });

    it('should clear My Posts filter when Clear is clicked', async () => {
      render(<RealSocialMediaFeed />);
      
      // First apply the filter
      await waitFor(() => {
        const filterButton = screen.getByRole('button', { name: /All Posts/ });
        fireEvent.click(filterButton);
      });

      await waitFor(() => {
        const agentFilter = screen.getByText('By Agent');
        fireEvent.click(agentFilter);
      });

      await waitFor(() => {
        const myAgentOption = screen.getByText('current-user-agent');
        fireEvent.click(myAgentOption);
      });

      // Should show clear button
      await waitFor(() => {
        const clearButton = screen.getByText('Clear');
        fireEvent.click(clearButton);
      });

      await waitFor(() => {
        expect(screen.getByText('All Posts')).toBeInTheDocument();
        expect(mockedApiService.getAgentPosts).toHaveBeenCalled();
      });
    });
  });

  describe('Star Rating Filter', () => {
    it('should filter posts by minimum star rating', async () => {
      const highRatedPosts = mockPosts.filter(post => post.engagement.stars.average >= 4);
      mockedApiService.getFilteredPosts.mockResolvedValue({
        success: true,
        data: highRatedPosts,
        total: highRatedPosts.length
      });

      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        const filterButton = screen.getByRole('button', { name: /All Posts/ });
        fireEvent.click(filterButton);
      });

      await waitFor(() => {
        const starredFilter = screen.getByText('Starred Posts');
        fireEvent.click(starredFilter);
      });

      // Select 4+ stars
      await waitFor(() => {
        const fourStars = screen.getByText('4+ Stars');
        fireEvent.click(fourStars);
      });

      await waitFor(() => {
        expect(mockedApiService.getFilteredPosts).toHaveBeenCalledWith(
          50, 0,
          { type: 'starred', minRating: 4 }
        );
      });
    });

    it('should show star rating in filter button when active', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        const filterButton = screen.getByRole('button', { name: /All Posts/ });
        fireEvent.click(filterButton);
      });

      await waitFor(() => {
        const starredFilter = screen.getByText('Starred Posts');
        fireEvent.click(starredFilter);
      });

      await waitFor(() => {
        const fiveStars = screen.getByText('5 Stars Only');
        fireEvent.click(fiveStars);
      });

      await waitFor(() => {
        expect(screen.getByText('5+ Stars')).toBeInTheDocument();
      });
    });
  });

  describe('Hashtag Filter', () => {
    it('should filter posts by hashtag', async () => {
      const hashtagPosts = mockPosts.filter(post => post.tags.includes('testing'));
      mockedApiService.getFilteredPosts.mockResolvedValue({
        success: true,
        data: hashtagPosts,
        total: hashtagPosts.length
      });

      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        const filterButton = screen.getByRole('button', { name: /All Posts/ });
        fireEvent.click(filterButton);
      });

      await waitFor(() => {
        const hashtagFilter = screen.getByText('By Hashtag');
        fireEvent.click(hashtagFilter);
      });

      await waitFor(() => {
        const testingHashtag = screen.getByText('#testing');
        fireEvent.click(testingHashtag);
      });

      await waitFor(() => {
        expect(mockedApiService.getFilteredPosts).toHaveBeenCalledWith(
          50, 0,
          { type: 'hashtag', hashtag: 'testing' }
        );
      });
    });

    it('should show hashtag in filter button when active', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        const filterButton = screen.getByRole('button', { name: /All Posts/ });
        fireEvent.click(filterButton);
      });

      await waitFor(() => {
        const hashtagFilter = screen.getByText('By Hashtag');
        fireEvent.click(hashtagFilter);
      });

      await waitFor(() => {
        const qualityHashtag = screen.getByText('#quality');
        fireEvent.click(qualityHashtag);
      });

      await waitFor(() => {
        expect(screen.getByText('#quality')).toBeInTheDocument();
      });
    });

    it('should show all available hashtags in dropdown', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        const filterButton = screen.getByRole('button', { name: /All Posts/ });
        fireEvent.click(filterButton);
      });

      await waitFor(() => {
        const hashtagFilter = screen.getByText('By Hashtag');
        fireEvent.click(hashtagFilter);
      });

      await waitFor(() => {
        mockFilterData.hashtags.forEach(hashtag => {
          expect(screen.getByText(`#${hashtag}`)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Saved Posts Filter', () => {
    it('should filter posts by saved status', async () => {
      const savedPosts = mockPosts.filter(post => post.engagement.isSaved);
      mockedApiService.getFilteredPosts.mockResolvedValue({
        success: true,
        data: savedPosts,
        total: savedPosts.length
      });

      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        const filterButton = screen.getByRole('button', { name: /All Posts/ });
        fireEvent.click(filterButton);
      });

      await waitFor(() => {
        const savedFilter = screen.getByText('Saved Posts');
        fireEvent.click(savedFilter);
      });

      await waitFor(() => {
        expect(mockedApiService.getFilteredPosts).toHaveBeenCalledWith(
          50, 0,
          { type: 'saved' }
        );
      });
    });

    it('should show saved posts label when active', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        const filterButton = screen.getByRole('button', { name: /All Posts/ });
        fireEvent.click(filterButton);
      });

      await waitFor(() => {
        const savedFilter = screen.getByText('Saved Posts');
        fireEvent.click(savedFilter);
      });

      await waitFor(() => {
        expect(screen.getByText('Saved Posts')).toBeInTheDocument();
      });
    });
  });

  describe('Agent Filter (Not Current User)', () => {
    it('should filter posts by specific agent', async () => {
      const agentPosts = mockPosts.filter(post => post.authorAgent === 'other-agent');
      mockedApiService.getFilteredPosts.mockResolvedValue({
        success: true,
        data: agentPosts,
        total: agentPosts.length
      });

      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        const filterButton = screen.getByRole('button', { name: /All Posts/ });
        fireEvent.click(filterButton);
      });

      await waitFor(() => {
        const agentFilter = screen.getByText('By Agent');
        fireEvent.click(agentFilter);
      });

      await waitFor(() => {
        const otherAgent = screen.getByText('other-agent');
        fireEvent.click(otherAgent);
      });

      await waitFor(() => {
        expect(mockedApiService.getFilteredPosts).toHaveBeenCalledWith(
          50, 0,
          { type: 'agent', agent: 'other-agent' }
        );
      });
    });

    it('should show all available agents in dropdown', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        const filterButton = screen.getByRole('button', { name: /All Posts/ });
        fireEvent.click(filterButton);
      });

      await waitFor(() => {
        const agentFilter = screen.getByText('By Agent');
        fireEvent.click(agentFilter);
      });

      await waitFor(() => {
        mockFilterData.agents.forEach(agent => {
          expect(screen.getByText(agent)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Filter State Management', () => {
    it('should maintain filter state across component re-renders', async () => {
      const { rerender } = render(<RealSocialMediaFeed />);
      
      // Apply a filter
      await waitFor(() => {
        const filterButton = screen.getByRole('button', { name: /All Posts/ });
        fireEvent.click(filterButton);
      });

      await waitFor(() => {
        const savedFilter = screen.getByText('Saved Posts');
        fireEvent.click(savedFilter);
      });

      // Re-render component
      rerender(<RealSocialMediaFeed />);

      await waitFor(() => {
        expect(screen.getByText('Saved Posts')).toBeInTheDocument();
      });
    });

    it('should reset page when filter changes', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        const filterButton = screen.getByRole('button', { name: /All Posts/ });
        fireEvent.click(filterButton);
      });

      await waitFor(() => {
        const starredFilter = screen.getByText('Starred Posts');
        fireEvent.click(starredFilter);
      });

      await waitFor(() => {
        const threeStars = screen.getByText('3+ Stars');
        fireEvent.click(threeStars);
      });

      // Should call filtered posts with offset 0 (reset page)
      await waitFor(() => {
        expect(mockedApiService.getFilteredPosts).toHaveBeenCalledWith(
          50, 0,
          { type: 'starred', minRating: 3 }
        );
      });
    });

    it('should update post count when filters are applied', async () => {
      const filteredPosts = [mockPosts[0]];
      mockedApiService.getFilteredPosts.mockResolvedValue({
        success: true,
        data: filteredPosts,
        total: filteredPosts.length
      });

      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('3 posts')).toBeInTheDocument();
      });

      // Apply filter
      await waitFor(() => {
        const filterButton = screen.getByRole('button', { name: /All Posts/ });
        fireEvent.click(filterButton);
      });

      await waitFor(() => {
        const agentFilter = screen.getByText('By Agent');
        fireEvent.click(agentFilter);
      });

      await waitFor(() => {
        const myAgent = screen.getByText('current-user-agent');
        fireEvent.click(myAgent);
      });

      await waitFor(() => {
        expect(screen.getByText('1 post')).toBeInTheDocument();
      });
    });
  });

  describe('Filter Interactions', () => {
    it('should close dropdown when clicking outside', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        const filterButton = screen.getByRole('button', { name: /All Posts/ });
        fireEvent.click(filterButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Starred Posts')).toBeInTheDocument();
      });

      // Click outside
      fireEvent.click(document.body);

      await waitFor(() => {
        expect(screen.queryByText('Starred Posts')).not.toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      render(<RealSocialMediaFeed />);
      
      const filterButton = screen.getByRole('button', { name: /All Posts/ });
      
      // Focus and open with keyboard
      filterButton.focus();
      expect(filterButton).toHaveFocus();
      
      fireEvent.keyDown(filterButton, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Starred Posts')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should debounce filter changes to avoid excessive API calls', async () => {
      jest.useFakeTimers();
      
      render(<RealSocialMediaFeed />);
      
      // Make multiple rapid filter changes
      const filterButton = screen.getByRole('button', { name: /All Posts/ });
      
      fireEvent.click(filterButton);
      await waitFor(() => {
        fireEvent.click(screen.getByText('Saved Posts'));
      });
      
      fireEvent.click(filterButton);
      await waitFor(() => {
        fireEvent.click(screen.getByText('Starred Posts'));
      });

      // Fast-forward timers
      jest.runAllTimers();
      
      // Should not make excessive API calls
      expect(mockedApiService.getFilteredPosts).toHaveBeenCalledTimes(2);
      
      jest.useRealTimers();
    });
  });
});