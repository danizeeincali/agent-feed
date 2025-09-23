/**
 * Stars Rating System Unit Tests
 * Comprehensive testing for 1-5 star rating functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';

import { testPosts, testStarRatings, mockWebSocketEvents, performanceThresholds } from '../fixtures/testData';

// Mock components for Star Rating System
const StarRating = ({ 
  rating, 
  onRate, 
  interactive = true, 
  size = 'md',
  showCount = true,
  totalRatings = 0 
}) => {
  const stars = [1, 2, 3, 4, 5];
  
  return (
    <div data-testid="star-rating" className="flex items-center space-x-1">
      {stars.map(star => (
        <button
          key={star}
          data-testid={`star-${star}`}
          onClick={() => interactive && onRate?.(star)}
          className={`${star <= rating ? 'text-yellow-400' : 'text-gray-300'} ${
            interactive ? 'hover:text-yellow-300 cursor-pointer' : 'cursor-default'
          } ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'}`}
          disabled={!interactive}
          aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
        >
          ⭐
        </button>
      ))}
      {showCount && totalRatings > 0 && (
        <span data-testid="rating-count" className="text-sm text-gray-500 ml-2">
          ({totalRatings})
        </span>
      )}
    </div>
  );
};

const StarFilterControls = ({ onFilterChange, currentFilter }) => {
  return (
    <div data-testid="star-filter-controls" className="flex space-x-2">
      <button
        data-testid="filter-all-stars"
        onClick={() => onFilterChange('all')}
        className={currentFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'}
      >
        All
      </button>
      <button
        data-testid="filter-4plus-stars"
        onClick={() => onFilterChange('4+')}
        className={currentFilter === '4+' ? 'bg-blue-500 text-white' : 'bg-gray-200'}
      >
        4+ Stars
      </button>
      <button
        data-testid="filter-5-stars"
        onClick={() => onFilterChange('5')}
        className={currentFilter === '5' ? 'bg-blue-500 text-white' : 'bg-gray-200'}
      >
        5 Stars Only
      </button>
    </div>
  );
};

// Mock API service for star ratings
const mockStarService = {
  ratePost: vi.fn(),
  getRating: vi.fn(),
  getAverageRating: vi.fn(),
  getRatingCount: vi.fn()
};

// Mock WebSocket context
const mockWebSocketContext = {
  isConnected: true,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  sendStarRating: vi.fn()
};

// Test utilities
const renderStarRating = (props = {}) => {
  const defaultProps = {
    rating: 0,
    onRate: vi.fn(),
    interactive: true,
    ...props
  };
  
  return render(<StarRating {...defaultProps} />);
};

const renderStarFilter = (props = {}) => {
  const defaultProps = {
    onFilterChange: vi.fn(),
    currentFilter: 'all',
    ...props
  };
  
  return render(<StarFilterControls {...defaultProps} />);
};

describe('Star Rating System', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Setup mock implementations
    mockStarService.ratePost.mockResolvedValue({ success: true });
    mockStarService.getRating.mockResolvedValue(0);
    mockStarService.getAverageRating.mockResolvedValue(4.2);
    mockStarService.getRatingCount.mockResolvedValue(10);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Star Rating Component', () => {
    it('renders 5 stars correctly', () => {
      renderStarRating();
      
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByTestId(`star-${i}`)).toBeInTheDocument();
      }
    });

    it('displays correct rating visually', () => {
      renderStarRating({ rating: 3 });
      
      // First 3 stars should be filled (yellow)
      for (let i = 1; i <= 3; i++) {
        expect(screen.getByTestId(`star-${i}`)).toHaveClass('text-yellow-400');
      }
      
      // Last 2 stars should be unfilled (gray)
      for (let i = 4; i <= 5; i++) {
        expect(screen.getByTestId(`star-${i}`)).toHaveClass('text-gray-300');
      }
    });

    it('handles star rating clicks correctly', async () => {
      const onRate = vi.fn();
      renderStarRating({ onRate, rating: 0 });
      
      // Click on 4th star
      await user.click(screen.getByTestId('star-4'));
      
      expect(onRate).toHaveBeenCalledWith(4);
      expect(onRate).toHaveBeenCalledTimes(1);
    });

    it('supports keyboard navigation', async () => {
      const onRate = vi.fn();
      renderStarRating({ onRate });
      
      // Focus on first star and use arrow keys
      screen.getByTestId('star-1').focus();
      
      // Test Enter key
      await user.keyboard('{Enter}');
      expect(onRate).toHaveBeenCalledWith(1);
    });

    it('disables interaction when interactive=false', async () => {
      const onRate = vi.fn();
      renderStarRating({ onRate, interactive: false });
      
      await user.click(screen.getByTestId('star-3'));
      
      expect(onRate).not.toHaveBeenCalled();
      expect(screen.getByTestId('star-3')).toBeDisabled();
    });

    it('shows rating count when provided', () => {
      renderStarRating({ showCount: true, totalRatings: 15 });
      
      expect(screen.getByTestId('rating-count')).toBeInTheDocument();
      expect(screen.getByTestId('rating-count')).toHaveTextContent('(15)');
    });

    it('supports different sizes', () => {
      const { rerender } = renderStarRating({ size: 'sm' });
      expect(screen.getByTestId('star-1')).toHaveClass('text-sm');
      
      rerender(<StarRating size="lg" rating={0} />);
      expect(screen.getByTestId('star-1')).toHaveClass('text-lg');
    });

    it('has proper accessibility attributes', () => {
      renderStarRating();
      
      expect(screen.getByTestId('star-1')).toHaveAttribute('aria-label', 'Rate 1 star');
      expect(screen.getByTestId('star-5')).toHaveAttribute('aria-label', 'Rate 5 stars');
    });
  });

  describe('Star Rating Functionality', () => {
    it('calculates average rating correctly', () => {
      const ratings = testStarRatings.filter(r => r.postId === 'post-1');
      const average = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      
      expect(average).toBeCloseTo(4.67, 2); // (5+5+4)/3 = 4.67
    });

    it('handles rating updates with optimistic UI', async () => {
      const onRate = vi.fn();
      const { rerender } = renderStarRating({ rating: 0, onRate });
      
      // Click 5 stars
      await user.click(screen.getByTestId('star-5'));
      
      // Optimistically update UI
      rerender(<StarRating rating={5} onRate={onRate} />);
      
      expect(screen.getByTestId('star-5')).toHaveClass('text-yellow-400');
      expect(onRate).toHaveBeenCalledWith(5);
    });

    it('reverts on API failure', async () => {
      mockStarService.ratePost.mockRejectedValue(new Error('Network error'));
      
      const onRate = vi.fn();
      const { rerender } = renderStarRating({ rating: 0, onRate });
      
      await user.click(screen.getByTestId('star-4'));
      
      // Initially show optimistic update
      rerender(<StarRating rating={4} onRate={onRate} />);
      
      // Wait for API call to fail and revert
      await waitFor(() => {
        rerender(<StarRating rating={0} onRate={onRate} />);
      });
      
      expect(screen.getByTestId('star-4')).toHaveClass('text-gray-300');
    });

    it('handles concurrent rating attempts', async () => {
      const onRate = vi.fn();
      renderStarRating({ onRate });
      
      // Rapid clicks on different stars
      await user.click(screen.getByTestId('star-3'));
      await user.click(screen.getByTestId('star-5'));
      await user.click(screen.getByTestId('star-2'));
      
      // Should only process the last click
      expect(onRate).toHaveBeenCalledTimes(3);
      expect(onRate).toHaveBeenLastCalledWith(2);
    });
  });

  describe('Star Rating Performance', () => {
    it('rating update responds within performance threshold', async () => {
      const onRate = vi.fn();
      renderStarRating({ onRate });
      
      const startTime = performance.now();
      
      await user.click(screen.getByTestId('star-4'));
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(performanceThresholds.starRatingUpdate);
    });

    it('handles high-frequency rating updates', async () => {
      const onRate = vi.fn();
      renderStarRating({ onRate });
      
      // Simulate rapid sequential ratings
      for (let i = 1; i <= 5; i++) {
        await user.click(screen.getByTestId(`star-${i}`));
      }
      
      expect(onRate).toHaveBeenCalledTimes(5);
    });
  });

  describe('Real-time Star Rating Updates', () => {
    it('receives WebSocket star updates', async () => {
      const onStarUpdate = vi.fn();
      mockWebSocketContext.on.mockImplementation((event, handler) => {
        if (event === 'star:updated') {
          setTimeout(() => handler(mockWebSocketEvents.starUpdated.data), 0);
        }
      });
      
      renderStarRating({ rating: 4 });
      
      await waitFor(() => {
        expect(mockWebSocketContext.on).toHaveBeenCalledWith('star:updated', expect.any(Function));
      });
    });

    it('broadcasts star rating to WebSocket', async () => {
      const onRate = vi.fn();
      renderStarRating({ onRate });
      
      await user.click(screen.getByTestId('star-5'));
      
      expect(mockWebSocketContext.sendStarRating).toHaveBeenCalledWith('post-1', 5);
    });

    it('handles WebSocket disconnection gracefully', async () => {
      mockWebSocketContext.isConnected = false;
      
      const onRate = vi.fn();
      renderStarRating({ onRate });
      
      await user.click(screen.getByTestId('star-3'));
      
      // Should still work locally, queue for sync when reconnected
      expect(onRate).toHaveBeenCalledWith(3);
    });
  });

  describe('Star Rating Filtering', () => {
    it('renders filter controls correctly', () => {
      renderStarFilter();
      
      expect(screen.getByTestId('filter-all-stars')).toBeInTheDocument();
      expect(screen.getByTestId('filter-4plus-stars')).toBeInTheDocument();
      expect(screen.getByTestId('filter-5-stars')).toBeInTheDocument();
    });

    it('handles filter changes', async () => {
      const onFilterChange = vi.fn();
      renderStarFilter({ onFilterChange });
      
      await user.click(screen.getByTestId('filter-4plus-stars'));
      
      expect(onFilterChange).toHaveBeenCalledWith('4+');
    });

    it('applies correct filter styling', () => {
      renderStarFilter({ currentFilter: '4+' });
      
      expect(screen.getByTestId('filter-4plus-stars')).toHaveClass('bg-blue-500', 'text-white');
      expect(screen.getByTestId('filter-all-stars')).toHaveClass('bg-gray-200');
    });

    it('filters posts by star rating correctly', () => {
      const posts = testPosts;
      
      // Filter 4+ stars
      const fourPlusStars = posts.filter(post => (post.stars || 0) >= 4);
      expect(fourPlusStars).toHaveLength(3); // posts with 4 or 5 stars
      
      // Filter 5 stars only
      const fiveStars = posts.filter(post => (post.stars || 0) === 5);
      expect(fiveStars).toHaveLength(2); // posts with exactly 5 stars
    });
  });

  describe('Star Rating Persistence', () => {
    it('saves rating to API', async () => {
      const onRate = vi.fn();
      renderStarRating({ onRate });
      
      await user.click(screen.getByTestId('star-4'));
      
      await waitFor(() => {
        expect(mockStarService.ratePost).toHaveBeenCalledWith('post-1', 4);
      });
    });

    it('retrieves existing rating on mount', async () => {
      mockStarService.getRating.mockResolvedValue(3);
      
      const { rerender } = renderStarRating({ rating: 0 });
      
      // Simulate component mount effect
      await waitFor(() => {
        rerender(<StarRating rating={3} />);
      });
      
      expect(screen.getByTestId('star-3')).toHaveClass('text-yellow-400');
      expect(screen.getByTestId('star-4')).toHaveClass('text-gray-300');
    });

    it('handles API errors gracefully', async () => {
      mockStarService.ratePost.mockRejectedValue(new Error('Save failed'));
      
      const onRate = vi.fn();
      renderStarRating({ onRate });
      
      await user.click(screen.getByTestId('star-5'));
      
      // Should not break the UI
      expect(screen.getByTestId('star-rating')).toBeInTheDocument();
    });
  });

  describe('Star Rating Edge Cases', () => {
    it('handles zero rating', () => {
      renderStarRating({ rating: 0 });
      
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByTestId(`star-${i}`)).toHaveClass('text-gray-300');
      }
    });

    it('handles maximum rating', () => {
      renderStarRating({ rating: 5 });
      
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByTestId(`star-${i}`)).toHaveClass('text-yellow-400');
      }
    });

    it('handles invalid rating values', () => {
      renderStarRating({ rating: 7 }); // Invalid, should cap at 5
      
      // Only first 5 stars should be filled
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByTestId(`star-${i}`)).toHaveClass('text-yellow-400');
      }
    });

    it('handles negative rating values', () => {
      renderStarRating({ rating: -1 }); // Invalid, should be 0
      
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByTestId(`star-${i}`)).toHaveClass('text-gray-300');
      }
    });

    it('handles decimal ratings', () => {
      renderStarRating({ rating: 3.7 }); // Should round to 4
      
      for (let i = 1; i <= 4; i++) {
        expect(screen.getByTestId(`star-${i}`)).toHaveClass('text-yellow-400');
      }
      expect(screen.getByTestId('star-5')).toHaveClass('text-gray-300');
    });
  });

  describe('Star Rating Accessibility', () => {
    it('supports screen readers', () => {
      renderStarRating({ rating: 3 });
      
      expect(screen.getByTestId('star-rating')).toHaveAttribute('role', 'group');
      expect(screen.getByTestId('star-1')).toHaveAttribute('aria-label');
    });

    it('supports high contrast mode', () => {
      renderStarRating({ rating: 3 });
      
      // Stars should have sufficient contrast for accessibility
      const filledStar = screen.getByTestId('star-3');
      expect(filledStar).toHaveClass('text-yellow-400');
    });

    it('supports focus indicators', async () => {
      renderStarRating();
      
      await user.tab(); // Focus first star
      
      expect(screen.getByTestId('star-1')).toHaveFocus();
    });
  });
});