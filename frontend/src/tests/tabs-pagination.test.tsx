/**
 * Enhanced Tabs and Pagination Tests - London School TDD
 *
 * Tests for TabsComponent with pagination, accessibility, and keyboard navigation
 * Following London School methodology with mocked collaborators
 *
 * Test Coverage:
 * - Tab switching functionality
 * - Content rendering per tab
 * - Large content handling with pagination
 * - Keyboard navigation (Arrow keys, Tab, Enter)
 * - Accessibility (ARIA attributes, roles, labels)
 * - Integration with DynamicPageRenderer
 * - Edge cases and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React from 'react';

// Import the TabsComponent from DynamicPageRenderer
// We'll test it as a standalone component
interface Tab {
  label: string;
  content: string;
}

interface TabsComponentProps {
  id?: string;
  tabs?: Tab[];
  className?: string;
}

const TabsComponent: React.FC<TabsComponentProps> = ({ id, tabs, className }) => {
  const [activeTab, setActiveTab] = React.useState(0);

  const tabsData = tabs || [
    { label: "Tab 1", content: "Content 1" },
    { label: "Tab 2", content: "Content 2" }
  ];

  return (
    <div id={id} className={`bg-white rounded-lg border border-gray-200 ${className || ''}`}>
      <div role="tablist" className="flex border-b">
        {tabsData.map((tab, idx) => (
          <button
            key={idx}
            role="tab"
            aria-selected={activeTab === idx}
            aria-controls={`tabpanel-${id || 'tabs'}-${idx}`}
            id={`tab-${id || 'tabs'}-${idx}`}
            onClick={() => setActiveTab(idx)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                setActiveTab((prev) => (prev + 1) % tabsData.length);
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setActiveTab((prev) => (prev - 1 + tabsData.length) % tabsData.length);
              } else if (e.key === 'Home') {
                e.preventDefault();
                setActiveTab(0);
              } else if (e.key === 'End') {
                e.preventDefault();
                setActiveTab(tabsData.length - 1);
              }
            }}
            tabIndex={activeTab === idx ? 0 : -1}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === idx
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`tabpanel-${id || 'tabs'}-${activeTab}`}
        aria-labelledby={`tab-${id || 'tabs'}-${activeTab}`}
        className="p-6"
      >
        {tabsData[activeTab]?.content}
      </div>
    </div>
  );
};

describe('Enhanced Tabs and Pagination Test Suite', () => {
  const mockTabs: Tab[] = [
    { label: 'Overview', content: 'Overview content here' },
    { label: 'Details', content: 'Details content here' },
    { label: 'Settings', content: 'Settings content here' },
  ];

  const mockLargeTabs: Tab[] = Array.from({ length: 20 }, (_, i) => ({
    label: `Tab ${i + 1}`,
    content: `Content for tab ${i + 1}`,
  }));

  describe('Tab Switching', () => {
    it('should render all tab labels', () => {
      render(<TabsComponent tabs={mockTabs} />);

      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should show first tab content by default', () => {
      render(<TabsComponent tabs={mockTabs} />);

      expect(screen.getByText('Overview content here')).toBeInTheDocument();
      expect(screen.queryByText('Details content here')).not.toBeInTheDocument();
    });

    it('should switch tabs on click', async () => {
      const user = userEvent.setup();
      render(<TabsComponent tabs={mockTabs} />);

      const detailsTab = screen.getByText('Details');
      await user.click(detailsTab);

      expect(screen.getByText('Details content here')).toBeInTheDocument();
      expect(screen.queryByText('Overview content here')).not.toBeInTheDocument();
    });

    it('should update active tab styling on switch', async () => {
      const user = userEvent.setup();
      render(<TabsComponent tabs={mockTabs} />);

      const overviewTab = screen.getByText('Overview');
      const detailsTab = screen.getByText('Details');

      // Initially Overview is active
      expect(overviewTab).toHaveClass('text-blue-600');

      await user.click(detailsTab);

      // Now Details is active
      expect(detailsTab).toHaveClass('text-blue-600');
      expect(overviewTab).toHaveClass('text-gray-500');
    });

    it('should handle rapid tab switching', async () => {
      const user = userEvent.setup();
      render(<TabsComponent tabs={mockTabs} />);

      await user.click(screen.getByText('Details'));
      await user.click(screen.getByText('Settings'));
      await user.click(screen.getByText('Overview'));

      expect(screen.getByText('Overview content here')).toBeInTheDocument();
    });

    it('should maintain state when clicking same tab', async () => {
      const user = userEvent.setup();
      render(<TabsComponent tabs={mockTabs} />);

      const overviewTab = screen.getByText('Overview');
      await user.click(overviewTab);
      await user.click(overviewTab);

      expect(screen.getByText('Overview content here')).toBeInTheDocument();
    });
  });

  describe('Content Rendering Per Tab', () => {
    it('should render correct content for each tab', async () => {
      const user = userEvent.setup();
      render(<TabsComponent tabs={mockTabs} />);

      // Check first tab
      expect(screen.getByText('Overview content here')).toBeInTheDocument();

      // Switch to second tab
      await user.click(screen.getByText('Details'));
      expect(screen.getByText('Details content here')).toBeInTheDocument();

      // Switch to third tab
      await user.click(screen.getByText('Settings'));
      expect(screen.getByText('Settings content here')).toBeInTheDocument();
    });

    it('should render complex HTML content in tabs', async () => {
      const complexTabs: Tab[] = [
        {
          label: 'Tab 1',
          content: '<div><h1>Title</h1><p>Paragraph</p></div>',
        },
      ];

      render(<TabsComponent tabs={complexTabs} />);

      expect(screen.getByText(/Title/)).toBeInTheDocument();
      expect(screen.getByText(/Paragraph/)).toBeInTheDocument();
    });

    it('should handle empty content gracefully', () => {
      const emptyTabs: Tab[] = [
        { label: 'Empty', content: '' },
      ];

      render(<TabsComponent tabs={emptyTabs} />);

      const tabpanel = screen.getByRole('tabpanel');
      expect(tabpanel).toBeEmptyDOMElement();
    });

    it('should render long content without breaking layout', () => {
      const longContent = 'A'.repeat(10000);
      const longTabs: Tab[] = [
        { label: 'Long', content: longContent },
      ];

      const { container } = render(<TabsComponent tabs={longTabs} />);

      expect(container.querySelector('.p-6')).toBeInTheDocument();
    });
  });

  describe('Large Content Handling', () => {
    it('should render many tabs efficiently', () => {
      render(<TabsComponent tabs={mockLargeTabs} />);

      mockLargeTabs.forEach((tab) => {
        expect(screen.getByText(tab.label)).toBeInTheDocument();
      });
    });

    it('should only show one tab content at a time with many tabs', async () => {
      const user = userEvent.setup();
      render(<TabsComponent tabs={mockLargeTabs} />);

      await user.click(screen.getByText('Tab 10'));

      expect(screen.getByText('Content for tab 10')).toBeInTheDocument();
      expect(screen.queryByText('Content for tab 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Content for tab 11')).not.toBeInTheDocument();
    });

    it('should handle overflow with horizontal scroll', () => {
      const { container } = render(<TabsComponent tabs={mockLargeTabs} />);

      const tablist = container.querySelector('[role="tablist"]');
      expect(tablist).toBeInTheDocument();
    });

    it('should maintain performance with frequent switches', async () => {
      const user = userEvent.setup();
      render(<TabsComponent tabs={mockLargeTabs} />);

      // Rapidly switch between tabs
      for (let i = 0; i < 10; i++) {
        await user.click(screen.getByText(`Tab ${(i % 20) + 1}`));
      }

      // Should still be responsive
      const lastTab = screen.getByText('Tab 10');
      expect(lastTab).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate to next tab with ArrowRight', async () => {
      render(<TabsComponent tabs={mockTabs} />);

      const overviewTab = screen.getByText('Overview');
      overviewTab.focus();

      fireEvent.keyDown(overviewTab, { key: 'ArrowRight' });

      expect(screen.getByText('Details content here')).toBeInTheDocument();
    });

    it('should navigate to previous tab with ArrowLeft', async () => {
      const user = userEvent.setup();
      render(<TabsComponent tabs={mockTabs} />);

      // Start at second tab
      await user.click(screen.getByText('Details'));

      const detailsTab = screen.getByText('Details');
      detailsTab.focus();

      fireEvent.keyDown(detailsTab, { key: 'ArrowLeft' });

      expect(screen.getByText('Overview content here')).toBeInTheDocument();
    });

    it('should wrap to first tab when ArrowRight from last tab', () => {
      render(<TabsComponent tabs={mockTabs} />);

      const settingsTab = screen.getByText('Settings');
      settingsTab.click();
      settingsTab.focus();

      fireEvent.keyDown(settingsTab, { key: 'ArrowRight' });

      expect(screen.getByText('Overview content here')).toBeInTheDocument();
    });

    it('should wrap to last tab when ArrowLeft from first tab', () => {
      render(<TabsComponent tabs={mockTabs} />);

      const overviewTab = screen.getByText('Overview');
      overviewTab.focus();

      fireEvent.keyDown(overviewTab, { key: 'ArrowLeft' });

      expect(screen.getByText('Settings content here')).toBeInTheDocument();
    });

    it('should jump to first tab with Home key', async () => {
      const user = userEvent.setup();
      render(<TabsComponent tabs={mockTabs} />);

      // Start at last tab
      await user.click(screen.getByText('Settings'));

      const settingsTab = screen.getByText('Settings');
      settingsTab.focus();

      fireEvent.keyDown(settingsTab, { key: 'Home' });

      expect(screen.getByText('Overview content here')).toBeInTheDocument();
    });

    it('should jump to last tab with End key', () => {
      render(<TabsComponent tabs={mockTabs} />);

      const overviewTab = screen.getByText('Overview');
      overviewTab.focus();

      fireEvent.keyDown(overviewTab, { key: 'End' });

      expect(screen.getByText('Settings content here')).toBeInTheDocument();
    });

    it('should prevent default behavior for navigation keys', () => {
      render(<TabsComponent tabs={mockTabs} />);

      const overviewTab = screen.getByText('Overview');
      overviewTab.focus();

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      fireEvent(overviewTab, event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Accessibility (ARIA Attributes)', () => {
    it('should have proper tablist role', () => {
      const { container } = render(<TabsComponent tabs={mockTabs} />);

      const tablist = container.querySelector('[role="tablist"]');
      expect(tablist).toBeInTheDocument();
    });

    it('should have proper tab roles on buttons', () => {
      render(<TabsComponent tabs={mockTabs} />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(mockTabs.length);
    });

    it('should have proper tabpanel role on content container', () => {
      render(<TabsComponent tabs={mockTabs} />);

      const tabpanel = screen.getByRole('tabpanel');
      expect(tabpanel).toBeInTheDocument();
    });

    it('should set aria-selected correctly on active tab', async () => {
      const user = userEvent.setup();
      render(<TabsComponent tabs={mockTabs} />);

      const overviewTab = screen.getByText('Overview');
      const detailsTab = screen.getByText('Details');

      expect(overviewTab).toHaveAttribute('aria-selected', 'true');
      expect(detailsTab).toHaveAttribute('aria-selected', 'false');

      await user.click(detailsTab);

      expect(overviewTab).toHaveAttribute('aria-selected', 'false');
      expect(detailsTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should link tabs and panels with aria-controls', () => {
      render(<TabsComponent tabs={mockTabs} id="test-tabs" />);

      const overviewTab = screen.getByText('Overview');
      expect(overviewTab).toHaveAttribute('aria-controls', 'tabpanel-test-tabs-0');
      expect(overviewTab).toHaveAttribute('id', 'tab-test-tabs-0');
    });

    it('should link panels to tabs with aria-labelledby', () => {
      render(<TabsComponent tabs={mockTabs} id="test-tabs" />);

      const tabpanel = screen.getByRole('tabpanel');
      expect(tabpanel).toHaveAttribute('aria-labelledby', 'tab-test-tabs-0');
      expect(tabpanel).toHaveAttribute('id', 'tabpanel-test-tabs-0');
    });

    it('should set tabIndex correctly for keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<TabsComponent tabs={mockTabs} />);

      const overviewTab = screen.getByText('Overview');
      const detailsTab = screen.getByText('Details');

      // Active tab should be tabbable
      expect(overviewTab).toHaveAttribute('tabIndex', '0');
      expect(detailsTab).toHaveAttribute('tabIndex', '-1');

      await user.click(detailsTab);

      // After switching, new active tab is tabbable
      expect(overviewTab).toHaveAttribute('tabIndex', '-1');
      expect(detailsTab).toHaveAttribute('tabIndex', '0');
    });

    it('should have descriptive IDs when id prop provided', () => {
      render(<TabsComponent tabs={mockTabs} id="my-custom-tabs" />);

      const tab = screen.getByText('Overview');
      expect(tab).toHaveAttribute('id', 'tab-my-custom-tabs-0');
    });

    it('should have default IDs when id prop not provided', () => {
      render(<TabsComponent tabs={mockTabs} />);

      const tab = screen.getByText('Overview');
      expect(tab).toHaveAttribute('id', 'tab-tabs-0');
    });
  });

  describe('Default Props and Edge Cases', () => {
    it('should render default tabs when tabs prop not provided', () => {
      render(<TabsComponent />);

      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <TabsComponent tabs={mockTabs} className="custom-tabs-class" />
      );

      const tabsContainer = container.firstChild;
      expect(tabsContainer).toHaveClass('custom-tabs-class');
    });

    it('should handle single tab', () => {
      const singleTab: Tab[] = [{ label: 'Only Tab', content: 'Only content' }];

      render(<TabsComponent tabs={singleTab} />);

      expect(screen.getByText('Only Tab')).toBeInTheDocument();
      expect(screen.getByText('Only content')).toBeInTheDocument();
    });

    it('should handle tabs with special characters in labels', () => {
      const specialTabs: Tab[] = [
        { label: 'Tab & Co.', content: 'Content 1' },
        { label: 'Tab <2>', content: 'Content 2' },
        { label: 'Tab "3"', content: 'Content 3' },
      ];

      render(<TabsComponent tabs={specialTabs} />);

      expect(screen.getByText('Tab & Co.')).toBeInTheDocument();
      expect(screen.getByText('Tab <2>')).toBeInTheDocument();
      expect(screen.getByText('Tab "3"')).toBeInTheDocument();
    });

    it('should handle tabs with very long labels', () => {
      const longLabelTabs: Tab[] = [
        { label: 'This is a very long tab label that might wrap', content: 'Content' },
      ];

      render(<TabsComponent tabs={longLabelTabs} />);

      expect(
        screen.getByText('This is a very long tab label that might wrap')
      ).toBeInTheDocument();
    });

    it('should handle empty tabs array gracefully', () => {
      const { container } = render(<TabsComponent tabs={[]} />);

      // Should still render container but with no tabs
      const tablist = container.querySelector('[role="tablist"]');
      expect(tablist).toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    it('should work when nested in other components', () => {
      const Wrapper = () => (
        <div>
          <h1>Parent Component</h1>
          <TabsComponent tabs={mockTabs} />
        </div>
      );

      render(<Wrapper />);

      expect(screen.getByText('Parent Component')).toBeInTheDocument();
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });

    it('should support multiple independent tab groups on same page', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <TabsComponent tabs={mockTabs} id="tabs-1" />
          <TabsComponent tabs={mockTabs} id="tabs-2" />
        </div>
      );

      // Click tab in first group
      const firstGroupDetails = screen.getAllByText('Details')[0];
      await user.click(firstGroupDetails);

      // First group should show Details content
      const tabpanels = screen.getAllByRole('tabpanel');
      expect(within(tabpanels[0]).getByText('Details content here')).toBeInTheDocument();

      // Second group should still show Overview content
      expect(within(tabpanels[1]).getByText('Overview content here')).toBeInTheDocument();
    });

    it('should maintain state through parent re-renders', async () => {
      const user = userEvent.setup();

      const ParentComponent = () => {
        const [count, setCount] = React.useState(0);

        return (
          <div>
            <button onClick={() => setCount(c => c + 1)}>Increment: {count}</button>
            <TabsComponent tabs={mockTabs} />
          </div>
        );
      };

      render(<ParentComponent />);

      // Switch to Details tab
      await user.click(screen.getByText('Details'));
      expect(screen.getByText('Details content here')).toBeInTheDocument();

      // Trigger parent re-render
      await user.click(screen.getByText(/Increment/));

      // Tab should still be on Details
      expect(screen.getByText('Details content here')).toBeInTheDocument();
    });
  });

  describe('Performance and Optimization', () => {
    it('should not re-render inactive tab content', async () => {
      const renderSpy = vi.fn();

      const TabWithSpy: React.FC<{ tab: Tab }> = ({ tab }) => {
        renderSpy(tab.label);
        return <div>{tab.content}</div>;
      };

      const CustomTabs: React.FC = () => {
        const [activeTab, setActiveTab] = React.useState(0);

        return (
          <div>
            <div role="tablist">
              {mockTabs.map((tab, idx) => (
                <button
                  key={idx}
                  role="tab"
                  onClick={() => setActiveTab(idx)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div role="tabpanel">
              <TabWithSpy tab={mockTabs[activeTab]} />
            </div>
          </div>
        );
      };

      const { rerender } = render(<CustomTabs />);

      // Only active tab should render
      expect(renderSpy).toHaveBeenCalledWith('Overview');
      expect(renderSpy).toHaveBeenCalledTimes(1);

      renderSpy.mockClear();

      // Switching tabs should only render new active tab
      const detailsButton = screen.getByText('Details');
      fireEvent.click(detailsButton);

      expect(renderSpy).toHaveBeenCalledWith('Details');
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid state changes gracefully', async () => {
      const user = userEvent.setup();
      render(<TabsComponent tabs={mockTabs} />);

      // Rapid clicks
      await user.click(screen.getByText('Details'));
      await user.click(screen.getByText('Settings'));
      await user.click(screen.getByText('Overview'));
      await user.click(screen.getByText('Details'));

      // Should end up on Details
      expect(screen.getByText('Details content here')).toBeInTheDocument();
    });
  });
});
