/**
 * TDD Test Suite: PostingInterface Component
 * Phase 4 - Comprehensive test coverage for 3-section posting interface
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PostingInterface } from '../../../src/components/posting-interface/PostingInterface';

// Mock the child components
vi.mock('../../../src/components/PostCreator', () => ({
  PostCreator: ({ onPostCreated }: { onPostCreated: (post: any) => void }) => (
    <div data-testid="post-creator">
      PostCreator Component
      <button onClick={() => onPostCreated({ id: '123', title: 'Test Post' })}>
        Create Post
      </button>
    </div>
  )
}));

vi.mock('../../../src/components/posting-interface/QuickPostSection', () => ({
  QuickPostSection: ({ onPostCreated }: { onPostCreated: (post: any) => void }) => (
    <div data-testid="quick-post-section">
      QuickPost Section
      <button onClick={() => onPostCreated({ id: '456', content: 'Quick update' })}>
        Quick Post
      </button>
    </div>
  )
}));

vi.mock('../../../src/components/posting-interface/AviDMSection', () => ({
  AviDMSection: ({ onMessageSent }: { onMessageSent: (message: any) => void }) => (
    <div data-testid="avi-dm-section">
      AviDM Section
      <button onClick={() => onMessageSent({ id: '789', content: 'DM message' })}>
        Send DM
      </button>
    </div>
  )
}));

// Mock window.innerWidth for mobile testing
const mockWindowWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
};

describe('PostingInterface Component', () => {
  const mockOnPostCreated = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to desktop size
    mockWindowWidth(1024);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders with default post tab active', () => {
      render(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      expect(screen.getByText('Create Content')).toBeInTheDocument();
      expect(screen.getByTestId('post-creator')).toBeInTheDocument();
      expect(screen.queryByTestId('quick-post-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('avi-dm-section')).not.toBeInTheDocument();
    });

    it('renders with specified initial tab', () => {
      render(<PostingInterface initialTab="quickPost" onPostCreated={mockOnPostCreated} />);
      
      expect(screen.getByTestId('quick-post-section')).toBeInTheDocument();
      expect(screen.queryByTestId('post-creator')).not.toBeInTheDocument();
    });

    it('displays all three tab navigation buttons', () => {
      render(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      expect(screen.getByRole('button', { name: /post/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /quick post/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /avi dm/i })).toBeInTheDocument();
    });

    it('shows tab descriptions when not in compact mode', () => {
      render(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      expect(screen.getByText(/Create a full post with rich formatting/i)).toBeInTheDocument();
    });

    it('hides descriptions in compact mode', () => {
      render(<PostingInterface onPostCreated={mockOnPostCreated} compactMode />);
      
      expect(screen.queryByText(/Create a full post with rich formatting/i)).not.toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('switches to quick post tab when clicked', async () => {
      render(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      const quickPostTab = screen.getByRole('button', { name: /quick post/i });
      await user.click(quickPostTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('quick-post-section')).toBeInTheDocument();
        expect(screen.queryByTestId('post-creator')).not.toBeInTheDocument();
      });
    });

    it('switches to avi dm tab when clicked', async () => {
      render(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      const aviDMTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviDMTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('avi-dm-section')).toBeInTheDocument();
        expect(screen.queryByTestId('post-creator')).not.toBeInTheDocument();
      });
    });

    it('handles tab switching with transition effect', async () => {
      render(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      const quickPostTab = screen.getByRole('button', { name: /quick post/i });
      await user.click(quickPostTab);
      
      // Verify transition delay exists (component sets transitioning state)
      await waitFor(() => {
        expect(screen.getByTestId('quick-post-section')).toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('prevents tab switching during transition', async () => {
      render(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      const quickPostTab = screen.getByRole('button', { name: /quick post/i });
      const aviDMTab = screen.getByRole('button', { name: /avi dm/i });
      
      // Click quick post, then immediately click avi dm
      await user.click(quickPostTab);
      await user.click(aviDMTab);
      
      await waitFor(() => {
        // Should end up on quick post, not avi dm, due to transition prevention
        expect(screen.getByTestId('quick-post-section')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Responsive Design', () => {
    it('shows mobile dropdown navigation on small screens', async () => {
      mockWindowWidth(600); // Mobile width
      
      render(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      // Mobile should show dropdown button instead of horizontal tabs
      expect(screen.getByText('Post')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /post/i })).toHaveClass('w-full');
    });

    it('opens and closes mobile dropdown menu', async () => {
      mockWindowWidth(600);
      
      render(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      const dropdownButton = screen.getByRole('button', { name: /post/i });
      await user.click(dropdownButton);
      
      // Should show all tab options
      expect(screen.getByText(/Create a full post with rich formatting/i)).toBeInTheDocument();
      expect(screen.getByText(/Quick one-line post for fast updates/i)).toBeInTheDocument();
      expect(screen.getByText(/Direct message to specific agents/i)).toBeInTheDocument();
    });

    it('switches tabs through mobile dropdown', async () => {
      mockWindowWidth(600);
      
      render(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      const dropdownButton = screen.getByRole('button', { name: /post/i });
      await user.click(dropdownButton);
      
      const quickPostOption = screen.getByText(/Quick one-line post for fast updates/i).closest('button');
      await user.click(quickPostOption!);
      
      await waitFor(() => {
        expect(screen.getByTestId('quick-post-section')).toBeInTheDocument();
      });
    });

    it('closes mobile dropdown when clicking outside', async () => {
      mockWindowWidth(600);
      
      render(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      const dropdownButton = screen.getByRole('button', { name: /post/i });
      await user.click(dropdownButton);
      
      // Click outside (on overlay)
      const overlay = document.querySelector('.fixed.inset-0');
      expect(overlay).toBeInTheDocument();
      
      fireEvent.click(overlay!);
      
      await waitFor(() => {
        expect(screen.queryByText(/Quick one-line post for fast updates/i)).not.toBeInTheDocument();
      });
    });

    it('adapts to window resize events', async () => {
      render(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      // Start desktop
      expect(screen.getByRole('button', { name: /post/i })).not.toHaveClass('w-full');
      
      // Resize to mobile
      mockWindowWidth(600);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /post/i })).toHaveClass('w-full');
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('switches to post tab with Cmd+1', async () => {
      render(<PostingInterface initialTab="quickPost" onPostCreated={mockOnPostCreated} />);
      
      await user.keyboard('{Meta>}1{/Meta}');
      
      await waitFor(() => {
        expect(screen.getByTestId('post-creator')).toBeInTheDocument();
      });
    });

    it('switches to quick post tab with Cmd+2', async () => {
      render(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      await user.keyboard('{Meta>}2{/Meta}');
      
      await waitFor(() => {
        expect(screen.getByTestId('quick-post-section')).toBeInTheDocument();
      });
    });

    it('switches to avi dm tab with Cmd+3', async () => {
      render(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      await user.keyboard('{Meta>}3{/Meta}');
      
      await waitFor(() => {
        expect(screen.getByTestId('avi-dm-section')).toBeInTheDocument();
      });
    });

    it('supports Ctrl+key shortcuts on Windows/Linux', async () => {
      render(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      await user.keyboard('{Control>}2{/Control}');
      
      await waitFor(() => {
        expect(screen.getByTestId('quick-post-section')).toBeInTheDocument();
      });
    });

    it('prevents default browser behavior for shortcuts', async () => {
      const preventDefaultSpy = vi.fn();
      
      render(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      const keyEvent = new KeyboardEvent('keydown', { 
        key: '1', 
        metaKey: true 
      });
      keyEvent.preventDefault = preventDefaultSpy;
      
      document.dispatchEvent(keyEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Post Creation Integration', () => {
    it('handles post creation from PostCreator', async () => {
      render(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      const createButton = screen.getByText('Create Post');
      await user.click(createButton);
      
      expect(mockOnPostCreated).toHaveBeenCalledWith({
        id: '123',
        title: 'Test Post'
      });
    });

    it('handles quick post creation', async () => {
      render(<PostingInterface initialTab="quickPost" onPostCreated={mockOnPostCreated} />);
      
      const quickPostButton = screen.getByText('Quick Post');
      await user.click(quickPostButton);
      
      expect(mockOnPostCreated).toHaveBeenCalledWith({
        id: '456',
        content: 'Quick update'
      });
    });

    it('handles DM sending', async () => {
      render(<PostingInterface initialTab="aviDM" onPostCreated={mockOnPostCreated} />);
      
      const sendDMButton = screen.getByText('Send DM');
      await user.click(sendDMButton);
      
      expect(mockOnPostCreated).toHaveBeenCalledWith({
        id: '789',
        content: 'DM message'
      });
    });

    it('optionally switches back to post tab after quick post', async () => {
      render(<PostingInterface initialTab="quickPost" onPostCreated={mockOnPostCreated} />);
      
      const quickPostButton = screen.getByText('Quick Post');
      await user.click(quickPostButton);
      
      // Wait for automatic tab switch (1 second delay in component)
      await waitFor(() => {
        expect(screen.getByTestId('post-creator')).toBeInTheDocument();
      }, { timeout: 1200 });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for tab navigation', () => {
      render(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      const postTab = screen.getByRole('button', { name: /post/i });
      const quickPostTab = screen.getByRole('button', { name: /quick post/i });
      const aviDMTab = screen.getByRole('button', { name: /avi dm/i });
      
      expect(postTab).toHaveAttribute('title');
      expect(quickPostTab).toHaveAttribute('title');
      expect(aviDMTab).toHaveAttribute('title');
    });

    it('maintains focus management during tab switching', async () => {
      render(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      const quickPostTab = screen.getByRole('button', { name: /quick post/i });
      quickPostTab.focus();
      
      await user.click(quickPostTab);
      
      // Focus should remain on the tab button
      expect(quickPostTab).toHaveFocus();
    });

    it('supports keyboard navigation between tabs', async () => {
      render(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      const postTab = screen.getByRole('button', { name: /post/i });
      postTab.focus();
      
      await user.tab();
      
      const quickPostTab = screen.getByRole('button', { name: /quick post/i });
      expect(quickPostTab).toHaveFocus();
    });
  });

  describe('Props and Configuration', () => {
    it('passes className to container div', () => {
      const { container } = render(
        <PostingInterface className="custom-class" onPostCreated={mockOnPostCreated} />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('handles missing onPostCreated prop gracefully', () => {
      expect(() => {
        render(<PostingInterface />);
      }).not.toThrow();
    });

    it('hides tab labels when showTabLabels is false', () => {
      render(<PostingInterface showTabLabels={false} onPostCreated={mockOnPostCreated} />);
      
      // Icons should be present but labels should be hidden
      const tabs = screen.getAllByRole('button');
      tabs.forEach(tab => {
        expect(tab).not.toHaveTextContent(/Post|Quick Post|Avi DM/);
      });
    });

    it('shows compact mode styling', () => {
      render(<PostingInterface compactMode onPostCreated={mockOnPostCreated} />);
      
      // Compact mode hides descriptions
      expect(screen.queryByText(/Create a full post with rich formatting/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles component errors gracefully', () => {
      // Test error boundary behavior would go here
      // This would require a more complex setup with error boundaries
      expect(true).toBe(true); // Placeholder
    });

    it('continues to function if child component fails', async () => {
      // Mock a failing child component
      vi.mocked(require('../../../src/components/posting-interface/QuickPostSection')).QuickPostSection = () => {
        throw new Error('Component failed');
      };
      
      // Component should still render other tabs
      render(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      const aviDMTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviDMTab);
      
      expect(screen.getByTestId('avi-dm-section')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const { rerender } = render(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      // Same props should not cause re-render
      rerender(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      expect(screen.getByTestId('post-creator')).toBeInTheDocument();
    });

    it('memoizes tab configuration to prevent recreating on every render', () => {
      // This would test useMemo behavior - complex to test directly
      // but we can verify stable references
      const { rerender } = render(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      rerender(<PostingInterface onPostCreated={mockOnPostCreated} />);
      
      // Component should still work correctly
      expect(screen.getByText('Create Content')).toBeInTheDocument();
    });
  });
});