/**
 * London School TDD Tests for PostingTabs Component
 * Focus: Behavior verification and collaboration contracts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostingTabs } from '../../../src/components/posting/PostingTabs';
import { 
  createMockPostingTabsProps,
  createMockTabConfigs,
  assertTabBehaviorContract,
  mockGetBoundingClientRect
} from './mocks';
import './setup';

describe('PostingTabs - London School TDD', () => {
  let mockProps: ReturnType<typeof createMockPostingTabsProps>;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockProps = createMockPostingTabsProps();
    user = userEvent.setup();
  });

  describe('Contract: Tab Navigation Behavior', () => {
    it('should notify parent of tab changes through onTabChange contract', async () => {
      render(<PostingTabs {...mockProps} />);
      
      const quickTab = screen.getByTestId('posting-tab-quick');
      await user.click(quickTab);
      
      assertTabBehaviorContract.expectTabSwitch(mockProps.onTabChange, 'post', 'quick');
    });

    it('should maintain active tab state visually when activeTab prop changes', () => {
      const { rerender } = render(<PostingTabs {...mockProps} />);
      
      // Initially post tab should be active
      expect(screen.getByTestId('posting-tab-post')).toHaveClass('text-blue-600', 'bg-blue-50');
      
      // Change active tab prop
      rerender(<PostingTabs {...mockProps} activeTab="quick" />);
      
      expect(screen.getByTestId('posting-tab-quick')).toHaveClass('text-blue-600', 'bg-blue-50');
      expect(screen.getByTestId('posting-tab-post')).not.toHaveClass('text-blue-600', 'bg-blue-50');
    });

    it('should prevent interaction with disabled tabs', async () => {
      const disabledTabConfig = createMockTabConfigs();
      disabledTabConfig[2].disabled = true; // Disable Avi tab
      
      render(<PostingTabs {...mockProps} tabs={disabledTabConfig} />);
      
      const disabledTab = screen.getByTestId('posting-tab-avi');
      await user.click(disabledTab);
      
      assertTabBehaviorContract.expectNoSideEffects(mockProps.onTabChange);
      expect(disabledTab).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  describe('Contract: Responsive Layout Behavior', () => {
    it('should apply mobile layout classes when isMobile is true', () => {
      render(<PostingTabs {...mockProps} isMobile={true} layout="bottom-tabs" />);
      
      const container = screen.getByRole('tablist');
      expect(container).toHaveClass('border-t');
      
      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveClass('flex-1');
      });
    });

    it('should show overflow menu when tabs exceed mobile limit', () => {
      const manyTabs = [
        ...createMockTabConfigs(),
        { id: 'extra1', icon: 'edit-3', label: 'Extra 1', description: 'Extra tab' },
        { id: 'extra2', icon: 'zap', label: 'Extra 2', description: 'Another extra tab' }
      ];
      
      render(<PostingTabs {...mockProps} tabs={manyTabs as any} isMobile={true} />);
      
      // Should show overflow button
      expect(screen.getByRole('button')).toBeTruthy();
    });

    it('should adapt sidebar layout for tablet/desktop', () => {
      render(<PostingTabs {...mockProps} layout="sidebar" />);
      
      const container = screen.getByRole('tablist');
      expect(container).toHaveClass('flex-col', 'bg-gray-900');
      expect(screen.getByText('Create')).toBeTruthy();
    });
  });

  describe('Contract: Tab Indicator Animation Behavior', () => {
    beforeEach(() => {
      // Mock getBoundingClientRect for indicator positioning
      HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({
        width: 100,
        height: 40,
        top: 0,
        left: 0,
        bottom: 40,
        right: 100,
        x: 0,
        y: 0,
        toJSON: () => ({})
      }));
    });

    it('should position indicator correctly for horizontal tabs', async () => {
      render(<PostingTabs {...mockProps} layout="tabs" />);
      
      const indicator = document.querySelector('.absolute.bg-blue-600');
      expect(indicator).toBeTruthy();
      expect(indicator).toHaveClass('rounded-full');
    });

    it('should adapt indicator for sidebar layout', () => {
      render(<PostingTabs {...mockProps} layout="sidebar" />);
      
      const indicator = document.querySelector('.absolute.bg-blue-600');
      expect(indicator).toBeTruthy();
      expect(indicator).toHaveClass('rounded-r-full');
    });
  });

  describe('Contract: Accessibility Behavior', () => {
    it('should provide proper ARIA attributes', () => {
      render(<PostingTabs {...mockProps} />);
      
      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-label', 'Posting interface navigation');
      
      const tabs = screen.getAllByRole('tab');
      tabs.forEach((tab, index) => {
        const expectedTab = mockProps.tabs[index];
        expect(tab).toHaveAttribute('title', `${expectedTab.label}: ${expectedTab.description}`);
      });
    });

    it('should support keyboard navigation', async () => {
      render(<PostingTabs {...mockProps} />);
      
      const firstTab = screen.getByTestId('posting-tab-post');
      firstTab.focus();
      
      await user.keyboard('{Tab}');
      const secondTab = screen.getByTestId('posting-tab-quick');
      expect(secondTab).toHaveFocus();
    });

    it('should show focus rings for keyboard users', async () => {
      render(<PostingTabs {...mockProps} />);
      
      const tab = screen.getByTestId('posting-tab-post');
      await user.tab(); // Navigate to tab via keyboard
      
      expect(tab).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
    });
  });

  describe('Contract: Badge Display Behavior', () => {
    it('should display badges when provided', () => {
      const tabsWithBadges = createMockTabConfigs();
      tabsWithBadges[1].badge = 5; // Quick tab has 5 notifications
      
      render(<PostingTabs {...mockProps} tabs={tabsWithBadges} />);
      
      const badge = screen.getByText('5');
      expect(badge).toHaveClass('bg-red-500', 'text-white', 'rounded-full');
    });

    it('should handle high badge numbers correctly', () => {
      const tabsWithBadges = createMockTabConfigs();
      tabsWithBadges[1].badge = 150; // High number
      
      render(<PostingTabs {...mockProps} tabs={tabsWithBadges} />);
      
      expect(screen.getByText('99+')).toBeTruthy();
    });

    it('should not display badges when count is 0 or undefined', () => {
      const tabsWithoutBadges = createMockTabConfigs();
      tabsWithoutBadges[1].badge = 0;
      
      render(<PostingTabs {...mockProps} tabs={tabsWithoutBadges} />);
      
      expect(screen.queryByText('0')).toBeFalsy();
    });
  });

  describe('Contract: Label Display Behavior', () => {
    it('should show labels when showLabels is true', () => {
      render(<PostingTabs {...mockProps} showLabels={true} />);
      
      expect(screen.getByText('Post')).toBeTruthy();
      expect(screen.getByText('Quick')).toBeTruthy();
      expect(screen.getByText('Avi DM')).toBeTruthy();
    });

    it('should hide labels in compact mode on mobile', () => {
      render(<PostingTabs {...mockProps} isMobile={true} compact={true} />);
      
      expect(screen.queryByText('Post')).toBeFalsy();
      expect(screen.queryByText('Quick')).toBeFalsy();
      expect(screen.queryByText('Avi DM')).toBeFalsy();
    });

    it('should maintain labels in sidebar layout even when compact', () => {
      render(<PostingTabs {...mockProps} layout="sidebar" compact={true} showLabels={true} />);
      
      expect(screen.getByText('Post')).toBeTruthy();
      expect(screen.getByText('Quick')).toBeTruthy();
      expect(screen.getByText('Avi DM')).toBeTruthy();
    });
  });

  describe('Contract: Error Handling and Edge Cases', () => {
    it('should handle empty tabs array gracefully', () => {
      expect(() => {
        render(<PostingTabs {...mockProps} tabs={[]} />);
      }).not.toThrow();
    });

    it('should handle activeTab that does not exist in tabs', () => {
      render(<PostingTabs {...mockProps} activeTab={'nonexistent' as any} />);
      
      // Should not crash and should render all tabs
      expect(screen.getByTestId('posting-tab-post')).toBeTruthy();
      expect(screen.getByTestId('posting-tab-quick')).toBeTruthy();
      expect(screen.getByTestId('posting-tab-avi')).toBeTruthy();
    });

    it('should maintain performance with frequent prop changes', async () => {
      const { rerender } = render(<PostingTabs {...mockProps} />);
      
      // Simulate rapid prop changes
      for (let i = 0; i < 10; i++) {
        rerender(<PostingTabs {...mockProps} activeTab={i % 2 === 0 ? 'post' : 'quick'} />);
      }
      
      // Should still be responsive
      const quickTab = screen.getByTestId('posting-tab-quick');
      await user.click(quickTab);
      
      expect(mockProps.onTabChange).toHaveBeenCalledWith('quick');
    });
  });

  describe('Contract: Overflow Menu Behavior', () => {
    it('should open/close overflow menu correctly', async () => {
      const manyTabs = [
        ...createMockTabConfigs(),
        { id: 'extra1', icon: 'edit-3', label: 'Extra 1', description: 'Extra tab' },
        { id: 'extra2', icon: 'zap', label: 'Extra 2', description: 'Another extra tab' }
      ];
      
      render(<PostingTabs {...mockProps} tabs={manyTabs as any} isMobile={true} />);
      
      const overflowButton = screen.getByRole('button');
      await user.click(overflowButton);
      
      // Menu should be open
      expect(screen.getByText('Extra 1')).toBeTruthy();
      expect(screen.getByText('Extra 2')).toBeTruthy();
      
      // Click outside to close
      await user.click(document.body);
      
      expect(screen.queryByText('Extra 1')).toBeFalsy();
    });

    it('should handle tab selection from overflow menu', async () => {
      const manyTabs = [
        ...createMockTabConfigs(),
        { id: 'extra1', icon: 'edit-3', label: 'Extra 1', description: 'Extra tab' }
      ];
      
      render(<PostingTabs {...mockProps} tabs={manyTabs as any} isMobile={true} />);
      
      const overflowButton = screen.getByRole('button');
      await user.click(overflowButton);
      
      const hiddenTab = screen.getByText('Extra 1');
      await user.click(hiddenTab);
      
      expect(mockProps.onTabChange).toHaveBeenCalledWith('extra1');
    });
  });
});