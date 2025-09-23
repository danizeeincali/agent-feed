import React from 'react';
import { render, screen, fireEvent, waitFor, act, renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import RealSocialMediaFeed from '../../src/components/RealSocialMediaFeed';
import { apiService } from '../../src/services/api';

// Mock dependencies
vi.mock('../../src/services/api', () => ({
  apiService: {
    getAgentPosts: vi.fn(),
    getFilteredPosts: vi.fn(),
    getFilterData: vi.fn(),
    getFilterStats: vi.fn(),
    savePost: vi.fn(),
    deletePost: vi.fn(),
    getPostComments: vi.fn(),
    createComment: vi.fn(),
    getFilterSuggestions: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
}));

vi.mock('../../src/utils/contentParser', () => ({
  renderParsedContent: vi.fn((content) => content),
  parseContent: vi.fn((content) => content),
  extractHashtags: vi.fn(() => []),
  extractMentions: vi.fn(() => []),
}));

vi.mock('../../src/components/FilterPanel', () => ({
  default: ({ onFilterChange }: any) => (
    <div data-testid="filter-panel">
      <button onClick={() => onFilterChange({ type: 'all' })}>All Posts</button>
    </div>
  ),
}));

vi.mock('../../src/components/EnhancedPostingInterface', () => ({
  EnhancedPostingInterface: () => <div data-testid="posting-interface" />,
}));

vi.mock('../../src/components/ThreadedCommentSystem', () => ({
  default: () => <div data-testid="comment-system" />,
}));

vi.mock('../../src/components/CommentThread', () => ({
  CommentThread: () => <div data-testid="comment-thread" />,
}));

vi.mock('../../src/components/CommentForm', () => ({
  CommentForm: () => <div data-testid="comment-form" />,
}));

vi.mock('../../src/components/MentionInput', () => ({
  MentionInput: ({ value, onChange, onKeyDown }: any) => (
    <textarea
      data-testid="mention-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
    />
  ),
}));

vi.mock('../../src/components/PostCreator', () => ({
  PostCreator: () => <div data-testid="post-creator" />,
}));

vi.mock('../../src/StreamingTickerWorking', () => ({
  default: () => <div data-testid="streaming-ticker" />,
}));

const mockPosts = [
  {
    id: 'post-1',
    title: 'Test Post 1',
    content: 'This is a test post content',
    authorAgent: 'TestAgent',
    publishedAt: '2023-01-01T00:00:00Z',
    engagement: { comments: 0, saves: 0, isSaved: false },
    metadata: { businessImpact: 75 },
    tags: ['test', 'demo'],
  },
  {
    id: 'post-2',
    title: 'Test Post 2',
    content: 'This is another test post',
    authorAgent: 'TestAgent2',
    publishedAt: '2023-01-02T00:00:00Z',
    engagement: { comments: 5, saves: 2, isSaved: true },
    metadata: { businessImpact: 90 },
    tags: ['test'],
  },
];

describe('RealSocialMediaFeed - React Hooks Consistency Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiService.getAgentPosts as Mock).mockResolvedValue({
      data: mockPosts,
      total: mockPosts.length,
    });
    (apiService.getFilterData as Mock).mockResolvedValue({
      agents: ['TestAgent', 'TestAgent2'],
      hashtags: ['test', 'demo'],
    });
    (apiService.getFilterStats as Mock).mockResolvedValue({
      savedPosts: 1,
      myPosts: 2,
    });
  });

  /**
   * TEST 1: Hook Count Consistency
   * Verifies the same number of hooks are called on each render
   */
  describe('Hook Count Consistency', () => {
    it('should maintain consistent hook count across renders', async () => {
      // Mock React hooks to track calls
      const originalUseState = React.useState;
      const originalUseEffect = React.useEffect;
      const originalUseCallback = React.useCallback;
      
      let useStateCount = 0;
      let useEffectCount = 0;
      let useCallbackCount = 0;
      
      const trackingUseState = vi.fn((...args) => {
        useStateCount++;
        return originalUseState(...args);
      });
      
      const trackingUseEffect = vi.fn((...args) => {
        useEffectCount++;
        return originalUseEffect(...args);
      });
      
      const trackingUseCallback = vi.fn((...args) => {
        useCallbackCount++;
        return originalUseCallback(...args);
      });
      
      // Spy on React hooks
      const useStateSpy = vi.spyOn(React, 'useState').mockImplementation(trackingUseState);
      const useEffectSpy = vi.spyOn(React, 'useEffect').mockImplementation(trackingUseEffect);
      const useCallbackSpy = vi.spyOn(React, 'useCallback').mockImplementation(trackingUseCallback);
      
      try {
        // First render
        const { rerender } = render(<RealSocialMediaFeed />);
        await waitFor(() => expect(screen.getByTestId('social-media-feed')).toBeInTheDocument());
        
        const firstRenderCounts = {
          useState: useStateCount,
          useEffect: useEffectCount,
          useCallback: useCallbackCount,
        };
        
        // Reset counters
        useStateCount = 0;
        useEffectCount = 0;
        useCallbackCount = 0;
        
        // Second render with same props
        rerender(<RealSocialMediaFeed />);
        
        const secondRenderCounts = {
          useState: useStateCount,
          useEffect: useEffectCount,
          useCallback: useCallbackCount,
        };
        
        // Verify hook counts are consistent
        expect(secondRenderCounts.useState).toBe(firstRenderCounts.useState);
        expect(secondRenderCounts.useEffect).toBe(firstRenderCounts.useEffect);
        expect(secondRenderCounts.useCallback).toBe(firstRenderCounts.useCallback);
        
        // Log for debugging
        console.log('Hook count consistency test passed:', {
          firstRender: firstRenderCounts,
          secondRender: secondRenderCounts,
        });
      } finally {
        useStateSpy.mockRestore();
        useEffectSpy.mockRestore();
        useCallbackSpy.mockRestore();
      }
    });

    it('should maintain hook count consistency with different props', async () => {
      let renderCount = 0;
      const hookCounts: Array<{ useState: number; useEffect: number; useCallback: number }> = [];
      
      const trackHooks = (hookName: string) => {
        return (...args: any[]) => {
          if (!hookCounts[renderCount]) {
            hookCounts[renderCount] = { useState: 0, useEffect: 0, useCallback: 0 };
          }
          hookCounts[renderCount][hookName as keyof typeof hookCounts[0]]++;
          return (React as any)[hookName](...args);
        };
      };
      
      const useStateSpy = vi.spyOn(React, 'useState').mockImplementation(trackHooks('useState'));
      const useEffectSpy = vi.spyOn(React, 'useEffect').mockImplementation(trackHooks('useEffect'));
      const useCallbackSpy = vi.spyOn(React, 'useCallback').mockImplementation(trackHooks('useCallback'));
      
      try {
        // Render with different className props
        const { rerender } = render(<RealSocialMediaFeed className="test-1" />);
        renderCount++;
        
        rerender(<RealSocialMediaFeed className="test-2" />);
        renderCount++;
        
        rerender(<RealSocialMediaFeed className="test-3" />);
        renderCount++;
        
        // Verify all renders have same hook counts
        const firstRenderHooks = hookCounts[0];
        for (let i = 1; i < hookCounts.length; i++) {
          expect(hookCounts[i].useState).toBe(firstRenderHooks.useState);
          expect(hookCounts[i].useEffect).toBe(firstRenderHooks.useEffect);
          expect(hookCounts[i].useCallback).toBe(firstRenderHooks.useCallback);
        }
      } finally {
        useStateSpy.mockRestore();
        useEffectSpy.mockRestore();
        useCallbackSpy.mockRestore();
      }
    });
  });

  /**
   * TEST 2: Conditional Rendering Test
   * Verify hooks remain consistent during conditional state changes
   */
  describe('Conditional Rendering Hook Consistency', () => {
    it('should maintain hook order during loading state changes', async () => {
      // Mock API to control loading state
      let resolveApiCall: (value: any) => void;
      const apiPromise = new Promise(resolve => { resolveApiCall = resolve; });
      (apiService.getAgentPosts as Mock).mockReturnValue(apiPromise);
      
      const { rerender } = render(<RealSocialMediaFeed />);
      
      // Component should be in loading state
      expect(screen.getByText('Loading real post data...')).toBeInTheDocument();
      
      // Resolve API call to exit loading state
      act(() => {
        resolveApiCall({ data: mockPosts, total: mockPosts.length });
      });
      
      await waitFor(() => {
        expect(screen.queryByText('Loading real post data...')).not.toBeInTheDocument();
      });
      
      // Rerender multiple times and verify no hooks error
      for (let i = 0; i < 5; i++) {
        rerender(<RealSocialMediaFeed />);
        expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
      }
    });

    it('should handle error state without breaking hooks', async () => {
      (apiService.getAgentPosts as Mock).mockRejectedValue(new Error('API Error'));
      
      const { rerender } = render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
      });
      
      // Rerender in error state should not break hooks
      for (let i = 0; i < 3; i++) {
        rerender(<RealSocialMediaFeed />);
        expect(screen.getByText('Error')).toBeInTheDocument();
      }
    });
  });

  /**
   * TEST 3: State Change Consistency Test
   * Verify hooks remain consistent during state updates
   */
  describe('State Change Hook Consistency', () => {
    it('should maintain hook consistency during post expansion', async () => {
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
      });
      
      // Wait for posts to load
      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });
      
      // Find and click expand button
      const expandButtons = screen.getAllByLabelText('Expand post');
      
      // Test multiple expand/collapse cycles
      for (let i = 0; i < 3; i++) {
        fireEvent.click(expandButtons[0]);
        await waitFor(() => {
          expect(screen.getByLabelText('Collapse post')).toBeInTheDocument();
        });
        
        fireEvent.click(screen.getByLabelText('Collapse post'));
        await waitFor(() => {
          expect(screen.getByLabelText('Expand post')).toBeInTheDocument();
        });
      }
    });

    it('should handle comment toggle state changes', async () => {
      (apiService.getPostComments as Mock).mockResolvedValue([]);
      
      render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });
      
      // Find comment buttons
      const commentButtons = screen.getAllByTitle('View Comments');
      
      // Test multiple comment toggle cycles
      for (let i = 0; i < 3; i++) {
        fireEvent.click(commentButtons[0]);
        await waitFor(() => {
          expect(screen.getByText(/Comments/)).toBeInTheDocument();
        });
        
        fireEvent.click(commentButtons[0]);
      }
    });
  });

  /**
   * TEST 4: Mount/Unmount Lifecycle Test
   * Test component lifecycle doesn't break hooks
   */
  describe('Mount/Unmount Hook Consistency', () => {
    it('should handle multiple mount/unmount cycles', async () => {
      for (let cycle = 0; cycle < 5; cycle++) {
        const { unmount } = render(<RealSocialMediaFeed />);
        
        await waitFor(() => {
          expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
        });
        
        unmount();
      }
    });

    it('should cleanup effects properly on unmount', async () => {
      const mockEventListener = vi.fn();
      (apiService.on as Mock).mockImplementation((event, handler) => {
        mockEventListener(event, handler);
      });
      
      const mockOffEventListener = vi.fn();
      (apiService.off as Mock).mockImplementation((event, handler) => {
        mockOffEventListener(event, handler);
      });
      
      const { unmount } = render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
      });
      
      // Verify event listener was registered
      expect(mockEventListener).toHaveBeenCalledWith('posts_updated', expect.any(Function));
      
      unmount();
      
      // Verify cleanup was called
      expect(mockOffEventListener).toHaveBeenCalledWith('posts_updated', expect.any(Function));
    });
  });

  /**
   * TEST 5: Re-render Stability Test
   * Force multiple re-renders and verify hook stability
   */
  describe('Re-render Hook Stability', () => {
    it('should handle rapid consecutive re-renders', async () => {
      const { rerender } = render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
      });
      
      // Rapid consecutive re-renders
      const renderCount = 20;
      for (let i = 0; i < renderCount; i++) {
        rerender(<RealSocialMediaFeed key={i} />);
      }
      
      // Component should still be functional
      expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
    });

    it('should handle state updates during re-renders', async () => {
      const { rerender } = render(<RealSocialMediaFeed />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      });
      
      // Trigger state updates while re-rendering
      const expandButton = screen.getAllByLabelText('Expand post')[0];
      
      for (let i = 0; i < 10; i++) {
        fireEvent.click(expandButton);
        rerender(<RealSocialMediaFeed />);
        
        if (i % 2 === 0) {
          await waitFor(() => {
            expect(screen.getByLabelText('Collapse post')).toBeInTheDocument();
          });
        }
      }
    });
  });

  /**
   * TEST 6: Hooks Rules Violation Test
   * Test various scenarios that could violate hooks rules
   */
  describe('Hooks Rules Compliance', () => {
    it('should not have hooks inside conditional statements', () => {
      // This test ensures our component doesn't violate hooks rules
      // by checking that all hooks are called at the top level
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      try {
        render(<RealSocialMediaFeed />);
        
        // No React hooks violations should trigger console errors
        const hooksErrors = consoleErrorSpy.mock.calls.filter(call => 
          call[0] && typeof call[0] === 'string' && 
          call[0].includes('Rendered more hooks') || 
          call[0].includes('Rendered fewer hooks')
        );
        
        expect(hooksErrors).toHaveLength(0);
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });

    it('should maintain hook order consistency across different prop combinations', async () => {
      const propCombinations = [
        {},
        { className: 'test' },
        { className: 'test another-class' },
        { className: '' },
      ];
      
      for (const props of propCombinations) {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        try {
          const { unmount } = render(<RealSocialMediaFeed {...props} />);
          
          await waitFor(() => {
            expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
          });
          
          // Check for hooks violations
          const hooksErrors = consoleErrorSpy.mock.calls.filter(call => 
            call[0] && typeof call[0] === 'string' && 
            (call[0].includes('Rendered more hooks') || call[0].includes('Rendered fewer hooks'))
          );
          
          expect(hooksErrors).toHaveLength(0);
          
          unmount();
        } finally {
          consoleErrorSpy.mockRestore();
        }
      }
    });
  });

  /**
   * TEST 7: Hooks Performance and Memory Test
   * Verify hooks don't cause memory leaks or performance issues
   */
  describe('Hooks Performance and Memory', () => {
    it('should not create excessive re-renders due to hook dependencies', async () => {
      let renderCount = 0;
      
      const WrappedComponent = () => {
        renderCount++;
        return <RealSocialMediaFeed />;
      };
      
      render(<WrappedComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
      });
      
      const initialRenderCount = renderCount;
      
      // Wait a bit more to check for unexpected re-renders
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should not have excessive re-renders
      expect(renderCount - initialRenderCount).toBeLessThan(5);
    });
  });
});
