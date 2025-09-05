// SPARC Phase 1: Post Structure Enhancement - TDD Test Suite
// Enhanced Post Card Component Tests

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { EnhancedPostCard } from '@/components/enhanced-posts/EnhancedPostCard';
import { PostExpansionProvider } from '@/context/PostExpansionContext';
import { mockAgentPost, mockLongContentPost } from '../__mocks__/postMocks';

// Mock the animation functions
jest.mock('@/utils/animations', () => ({
  animateExpand: jest.fn().mockResolvedValue(undefined),
  animateCollapse: jest.fn().mockResolvedValue(undefined),
}));

describe('SPARC Phase 1: EnhancedPostCard', () => {
  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <PostExpansionProvider>
        {component}
      </PostExpansionProvider>
    );
  };

  describe('1. Post Structure Enhancement', () => {
    describe('1.1 Expandable Post Details', () => {
      it('should display posts in collapsed state by default', () => {
        renderWithProvider(<EnhancedPostCard post={mockLongContentPost} />);
        
        // Should show truncated content
        expect(screen.getByText(/This is a very long post content.../)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /read more/i })).toBeInTheDocument();
        
        // Should not show full content initially
        expect(screen.queryByText(mockLongContentPost.content)).not.toBeInTheDocument();
      });

      it('should expand to show full content when "Read more" is clicked', async () => {
        const user = userEvent.setup();
        renderWithProvider(<EnhancedPostCard post={mockLongContentPost} />);
        
        const expandButton = screen.getByRole('button', { name: /read more/i });
        await user.click(expandButton);
        
        await waitFor(() => {
          expect(screen.getByText(mockLongContentPost.content)).toBeInTheDocument();
          expect(screen.getByRole('button', { name: /read less/i })).toBeInTheDocument();
        });
      });

      it('should collapse back to summary view when "Read less" is clicked', async () => {
        const user = userEvent.setup();
        renderWithProvider(<EnhancedPostCard post={mockLongContentPost} />);
        
        // First expand
        const expandButton = screen.getByRole('button', { name: /read more/i });
        await user.click(expandButton);
        
        await waitFor(() => {
          expect(screen.getByText(mockLongContentPost.content)).toBeInTheDocument();
        });
        
        // Then collapse
        const collapseButton = screen.getByRole('button', { name: /read less/i });
        await user.click(collapseButton);
        
        await waitFor(() => {
          expect(screen.getByText(/This is a very long post content.../)).toBeInTheDocument();
          expect(screen.queryByText(mockLongContentPost.content)).not.toBeInTheDocument();
        });
      });

      it('should show visual indicator for expandable posts (chevron icon)', () => {
        renderWithProvider(<EnhancedPostCard post={mockLongContentPost} />);
        
        const expandButton = screen.getByRole('button', { name: /read more/i });
        const chevronIcon = expandButton.querySelector('[data-testid="chevron-down"]');
        
        expect(chevronIcon).toBeInTheDocument();
      });

      it('should preserve expansion state during feed updates', async () => {
        const user = userEvent.setup();
        const { rerender } = renderWithProvider(<EnhancedPostCard post={mockLongContentPost} />);
        
        // Expand the post
        const expandButton = screen.getByRole('button', { name: /read more/i });
        await user.click(expandButton);
        
        await waitFor(() => {
          expect(screen.getByText(mockLongContentPost.content)).toBeInTheDocument();
        });
        
        // Simulate feed update by re-rendering with updated likes
        const updatedPost = { ...mockLongContentPost, likes: 5 };
        rerender(
          <PostExpansionProvider>
            <EnhancedPostCard post={updatedPost} />
          </PostExpansionProvider>
        );
        
        // Should still be expanded
        expect(screen.getByText(mockLongContentPost.content)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /read less/i })).toBeInTheDocument();
      });

      it('should animate transitions smoothly (200ms)', async () => {
        const { animateExpand } = require('@/utils/animations');
        const user = userEvent.setup();
        
        renderWithProvider(<EnhancedPostCard post={mockLongContentPost} />);
        
        const expandButton = screen.getByRole('button', { name: /read more/i });
        await user.click(expandButton);
        
        expect(animateExpand).toHaveBeenCalledWith(
          expect.any(HTMLElement),
          expect.any(Number)
        );
      });
    });

    describe('1.2 Proper Post Hierarchy', () => {
      it('should render title as primary heading (h3, font-semibold, 18px)', () => {
        renderWithProvider(<EnhancedPostCard post={mockAgentPost} />);
        
        const title = screen.getByRole('heading', { level: 3 });
        expect(title).toHaveTextContent(mockAgentPost.title);
        expect(title).toHaveClass('font-semibold');
        
        // Check computed styles
        const styles = window.getComputedStyle(title);
        expect(styles.fontSize).toBe('18px');
      });

      it('should display hook as engaging first line (140 chars max)', () => {
        const postWithHook = {
          ...mockAgentPost,
          metadata: {
            ...mockAgentPost.metadata,
            hook: 'This is an engaging hook that should be displayed prominently'
          }
        };
        
        renderWithProvider(<EnhancedPostCard post={postWithHook} />);
        
        const hook = screen.getByTestId('post-hook');
        expect(hook).toHaveTextContent(postWithHook.metadata.hook!);
        expect(hook.textContent!.length).toBeLessThanOrEqual(140);
      });

      it('should show full post body in expandable section', async () => {
        const user = userEvent.setup();
        renderWithProvider(<EnhancedPostCard post={mockLongContentPost} />);
        
        // Initially collapsed
        expect(screen.queryByTestId('full-content')).not.toBeVisible();
        
        // Expand to show full content
        const expandButton = screen.getByRole('button', { name: /read more/i });
        await user.click(expandButton);
        
        await waitFor(() => {
          const fullContent = screen.getByTestId('full-content');
          expect(fullContent).toBeVisible();
          expect(fullContent).toHaveTextContent(mockLongContentPost.content);
        });
      });

      it('should show actions (like/comment) in dedicated section', () => {
        renderWithProvider(<EnhancedPostCard post={mockAgentPost} />);
        
        const actionsSection = screen.getByTestId('post-actions');
        expect(actionsSection).toBeInTheDocument();
        
        const likeButton = screen.getByRole('button', { name: /like/i });
        const commentButton = screen.getByRole('button', { name: /comment/i });
        
        expect(likeButton).toBeInTheDocument();
        expect(commentButton).toBeInTheDocument();
      });

      it('should display metadata (author, timestamp, impact, tags)', () => {
        renderWithProvider(<EnhancedPostCard post={mockAgentPost} />);
        
        // Author
        expect(screen.getByText(mockAgentPost.authorAgent)).toBeInTheDocument();
        
        // Timestamp
        expect(screen.getByTestId('timestamp')).toBeInTheDocument();
        
        // Impact score
        expect(screen.getByTestId('impact-score')).toHaveTextContent(
          mockAgentPost.metadata.businessImpact.toString()
        );
        
        // Tags
        mockAgentPost.metadata.tags.forEach(tag => {
          expect(screen.getByText(`#${tag}`)).toBeInTheDocument();
        });
      });
    });
  });

  describe('2. Character Count Management', () => {
    describe('2.1 Hook Character Limit (280 chars)', () => {
      it('should display hook character counter', () => {
        const postWithHook = {
          ...mockAgentPost,
          metadata: {
            ...mockAgentPost.metadata,
            hook: 'Test hook'
          }
        };
        
        renderWithProvider(<EnhancedPostCard post={postWithHook} />);
        
        // This test would be more relevant in PostCreator component
        // But we can check that hook is properly truncated if too long
        const hook = screen.getByTestId('post-hook');
        expect(hook.textContent!.length).toBeLessThanOrEqual(280);
      });
    });

    describe('2.2 Content Character Limit (500 chars)', () => {
      it('should handle content within 500 character limit', () => {
        const shortPost = {
          ...mockAgentPost,
          content: 'Short content within limit'
        };
        
        renderWithProvider(<EnhancedPostCard post={shortPost} />);
        
        // Should not show expand button for short content
        expect(screen.queryByRole('button', { name: /read more/i })).not.toBeInTheDocument();
      });

      it('should truncate content over 500 characters with expand option', () => {
        const longContent = 'A'.repeat(600);
        const longPost = {
          ...mockAgentPost,
          content: longContent
        };
        
        renderWithProvider(<EnhancedPostCard post={longPost} />);
        
        // Should show truncated content
        const truncatedContent = screen.getByTestId('content-preview');
        expect(truncatedContent.textContent!.length).toBeLessThan(longContent.length);
        
        // Should show expand button
        expect(screen.getByRole('button', { name: /read more/i })).toBeInTheDocument();
      });
    });
  });

  describe('3. Sharing Functionality Removal', () => {
    describe('3.1 Complete Sharing Removal', () => {
      it('should not render share buttons', () => {
        renderWithProvider(<EnhancedPostCard post={mockAgentPost} />);
        
        // Should not find any share buttons
        expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument();
        expect(screen.queryByTestId('share-button')).not.toBeInTheDocument();
        
        // Check that share icon is not present
        expect(screen.queryByTestId('share-icon')).not.toBeInTheDocument();
      });

      it('should only show like and comment actions', () => {
        renderWithProvider(<EnhancedPostCard post={mockAgentPost} />);
        
        const actionsSection = screen.getByTestId('post-actions');
        const buttons = actionsSection.querySelectorAll('button');
        
        // Should only have 2 buttons: like and comment
        expect(buttons).toHaveLength(2);
        
        const buttonTexts = Array.from(buttons).map(btn => btn.textContent?.toLowerCase());
        expect(buttonTexts).toEqual(expect.arrayContaining(['like', 'comment']));
        expect(buttonTexts).not.toEqual(expect.arrayContaining(['share']));
      });

      it('should not have sharing-related props or handlers', () => {
        const { container } = renderWithProvider(<EnhancedPostCard post={mockAgentPost} />);
        
        // Check that no elements have sharing-related attributes
        const elementsWithShareHandlers = container.querySelectorAll('[onclick*="share"], [data-action*="share"]');
        expect(elementsWithShareHandlers).toHaveLength(0);
      });

      it('should not display share count in engagement stats', () => {
        renderWithProvider(<EnhancedPostCard post={mockAgentPost} />);
        
        const engagementStats = screen.getByTestId('engagement-stats');
        
        // Should show likes and comments but not shares
        expect(engagementStats).toHaveTextContent('Like');
        expect(engagementStats).toHaveTextContent('Comment');
        expect(engagementStats).not.toHaveTextContent('Share');
      });
    });
  });

  describe('4. Enhanced User Experience', () => {
    describe('4.1 Visual Improvements', () => {
      it('should have clear visual separation between post sections', () => {
        renderWithProvider(<EnhancedPostCard post={mockAgentPost} />);
        
        const header = screen.getByTestId('post-header');
        const content = screen.getByTestId('post-content');
        const actions = screen.getByTestId('post-actions');
        const metadata = screen.getByTestId('post-metadata');
        
        expect(header).toHaveClass('border-b', 'border-gray-100');
        expect(actions).toHaveClass('border-t', 'border-gray-100');
        
        // Check spacing
        expect(content).toHaveClass('p-4');
        expect(actions).toHaveClass('px-4', 'py-3');
      });

      it('should show loading states for expand/collapse actions', async () => {
        const user = userEvent.setup();
        renderWithProvider(<EnhancedPostCard post={mockLongContentPost} />);
        
        const expandButton = screen.getByRole('button', { name: /read more/i });
        
        // Mock slow animation
        const { animateExpand } = require('@/utils/animations');
        animateExpand.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
        
        await user.click(expandButton);
        
        // Should show loading indicator during animation
        expect(screen.getByTestId('expansion-loading')).toBeInTheDocument();
        
        await waitFor(() => {
          expect(screen.queryByTestId('expansion-loading')).not.toBeInTheDocument();
        });
      });

      it('should be responsive for mobile and desktop', () => {
        // Mock mobile viewport
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 375,
        });
        
        renderWithProvider(<EnhancedPostCard post={mockAgentPost} />);
        
        const postCard = screen.getByTestId('enhanced-post-card');
        
        // Should have mobile-responsive classes
        expect(postCard).toHaveClass('mobile:px-3', 'mobile:py-2');
        
        // Mock desktop viewport
        Object.defineProperty(window, 'innerWidth', {
          value: 1024,
        });
        
        // Trigger resize
        fireEvent(window, new Event('resize'));
        
        // Should have desktop classes
        expect(postCard).toHaveClass('lg:px-6', 'lg:py-4');
      });
    });

    describe('4.2 Accessibility', () => {
      it('should have proper ARIA labels for expand/collapse buttons', () => {
        renderWithProvider(<EnhancedPostCard post={mockLongContentPost} />);
        
        const expandButton = screen.getByRole('button', { name: /read more/i });
        
        expect(expandButton).toHaveAttribute('aria-expanded', 'false');
        expect(expandButton).toHaveAttribute('aria-controls', expect.stringMatching(/post-content-\w+/));
        expect(expandButton).toHaveAttribute('aria-describedby', expect.stringMatching(/post-\w+-description/));
      });

      it('should support keyboard navigation (Enter/Space)', async () => {
        const user = userEvent.setup();
        renderWithProvider(<EnhancedPostCard post={mockLongContentPost} />);
        
        const expandButton = screen.getByRole('button', { name: /read more/i });
        expandButton.focus();
        
        // Should expand on Enter key
        await user.keyboard('{Enter}');
        
        await waitFor(() => {
          expect(screen.getByText(mockLongContentPost.content)).toBeInTheDocument();
        });
        
        const collapseButton = screen.getByRole('button', { name: /read less/i });
        collapseButton.focus();
        
        // Should collapse on Space key
        await user.keyboard(' ');
        
        await waitFor(() => {
          expect(screen.queryByText(mockLongContentPost.content)).not.toBeInTheDocument();
        });
      });

      it('should announce state changes to screen readers', async () => {
        const user = userEvent.setup();
        renderWithProvider(<EnhancedPostCard post={mockLongContentPost} />);
        
        const expandButton = screen.getByRole('button', { name: /read more/i });
        await user.click(expandButton);
        
        await waitFor(() => {
          const announcement = screen.getByRole('status');
          expect(announcement).toHaveTextContent('Post expanded');
        });
      });

      it('should have proper focus management', async () => {
        const user = userEvent.setup();
        renderWithProvider(<EnhancedPostCard post={mockLongContentPost} />);
        
        const expandButton = screen.getByRole('button', { name: /read more/i });
        await user.click(expandButton);
        
        await waitFor(() => {
          const collapseButton = screen.getByRole('button', { name: /read less/i });
          expect(collapseButton).toHaveFocus();
        });
      });

      it('should meet color contrast requirements (WCAG 2.1 AA)', () => {
        renderWithProvider(<EnhancedPostCard post={mockAgentPost} />);
        
        // Check high contrast elements
        const title = screen.getByRole('heading', { level: 3 });
        const computedStyle = window.getComputedStyle(title);
        
        // Title should have sufficient contrast (this would be tested with actual color values)
        expect(computedStyle.color).toBe('rgb(17, 24, 39)'); // text-gray-900
      });
    });
  });

  describe('5. Error Handling', () => {
    it('should handle expansion errors gracefully', async () => {
      const { animateExpand } = require('@/utils/animations');
      animateExpand.mockRejectedValue(new Error('Animation failed'));
      
      const user = userEvent.setup();
      renderWithProvider(<EnhancedPostCard post={mockLongContentPost} />);
      
      const expandButton = screen.getByRole('button', { name: /read more/i });
      await user.click(expandButton);
      
      await waitFor(() => {
        // Should show error message
        expect(screen.getByText('Unable to expand post. Please try again.')).toBeInTheDocument();
        
        // Should reset to collapsed state
        expect(screen.getByRole('button', { name: /read more/i })).toBeInTheDocument();
      });
    });

    it('should handle missing content gracefully', () => {
      const postWithoutContent = {
        ...mockAgentPost,
        content: ''
      };
      
      expect(() => {
        renderWithProvider(<EnhancedPostCard post={postWithoutContent} />);
      }).not.toThrow();
      
      // Should show placeholder or handle empty content
      expect(screen.getByTestId('empty-content-placeholder')).toBeInTheDocument();
    });
  });

  describe('6. Performance', () => {
    it('should minimize re-renders with React.memo', () => {
      const renderSpy = jest.fn();
      
      // Mock EnhancedPostCard to track renders
      const TrackedPostCard = React.memo((props: any) => {
        renderSpy();
        return <EnhancedPostCard {...props} />;
      });
      
      const { rerender } = renderWithProvider(<TrackedPostCard post={mockAgentPost} />);
      
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props - should not re-render
      rerender(
        <PostExpansionProvider>
          <TrackedPostCard post={mockAgentPost} />
        </PostExpansionProvider>
      );
      
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with different props - should re-render
      const updatedPost = { ...mockAgentPost, likes: 5 };
      rerender(
        <PostExpansionProvider>
          <TrackedPostCard post={updatedPost} />
        </PostExpansionProvider>
      );
      
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('should debounce rapid expand/collapse actions', async () => {
      const user = userEvent.setup();
      const { animateExpand, animateCollapse } = require('@/utils/animations');
      
      renderWithProvider(<EnhancedPostCard post={mockLongContentPost} />);
      
      const expandButton = screen.getByRole('button', { name: /read more/i });
      
      // Rapid clicks
      await user.click(expandButton);
      await user.click(expandButton);
      await user.click(expandButton);
      
      // Should only trigger animation once due to debouncing
      expect(animateExpand).toHaveBeenCalledTimes(1);
    });
  });
});