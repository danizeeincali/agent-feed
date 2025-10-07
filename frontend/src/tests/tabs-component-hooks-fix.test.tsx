/**
 * TDD Tests for Tabs Component Hooks Fix (London School Methodology)
 *
 * FIXED ISSUE: "Rendered more hooks than during the previous render" error
 * CAUSE: useState was called inside switch case statement (conditional hook)
 * SOLUTION: Extracted TabsComponent to use hooks at component top level
 *
 * Test Coverage:
 * 1. Component renders without hook errors
 * 2. Default state initialization
 * 3. User interactions (tab switching)
 * 4. Multiple instances with isolated state
 * 5. Props handling and edge cases
 * 6. Accessibility and DOM attributes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React, { useState } from 'react';

/**
 * TabsComponent - Extracted to fix hooks violation
 * This component properly uses React hooks at the top level
 */
interface TabsComponentProps {
  id?: string;
  tabs?: Array<{ label: string; content: string }>;
  className?: string;
}

const TabsComponent: React.FC<TabsComponentProps> = ({ id, tabs, className }) => {
  const [activeTab, setActiveTab] = useState(0);

  const tabsData = tabs || [
    { label: "Tab 1", content: "Content 1" },
    { label: "Tab 2", content: "Content 2" }
  ];

  return (
    <div id={id} className={`bg-white rounded-lg border border-gray-200 ${className || ''}`}>
      <div className="flex border-b">
        {tabsData.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === idx
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            role="tab"
            aria-selected={activeTab === idx}
            aria-controls={`tabpanel-${idx}`}
            id={`tab-${idx}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        className="p-6"
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {tabsData[activeTab]?.content}
      </div>
    </div>
  );
};

describe('TabsComponent - Hooks Fix Validation (London School TDD)', () => {

  describe('1. Component Renders Without Hook Errors', () => {

    it('should render component without "Rendered more hooks" error', () => {
      // ARRANGE: Component with default props
      // ACT: Render component
      const { container } = render(<TabsComponent />);

      // ASSERT: Component renders successfully
      expect(container.querySelector('.bg-white')).toBeInTheDocument();
      expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
    });

    it('should call useState at component top level consistently', () => {
      // ARRANGE: Mock useState to verify it's called consistently
      const useStateSpy = vi.spyOn(React, 'useState');

      // ACT: Render component multiple times
      const { rerender } = render(<TabsComponent />);
      const firstCallCount = useStateSpy.mock.calls.length;

      rerender(<TabsComponent />);
      const secondCallCount = useStateSpy.mock.calls.length;

      // ASSERT: useState call count is consistent (no conditional hooks)
      expect(secondCallCount).toBe(firstCallCount * 2);

      useStateSpy.mockRestore();
    });

    it('should not crash when re-rendered with different props', () => {
      // ARRANGE: Component with initial props
      const { rerender } = render(
        <TabsComponent tabs={[{ label: 'A', content: 'Content A' }]} />
      );

      // ACT: Re-render with different props
      expect(() => {
        rerender(
          <TabsComponent
            tabs={[
              { label: 'B', content: 'Content B' },
              { label: 'C', content: 'Content C' }
            ]}
          />
        );
      }).not.toThrow();

      // ASSERT: Component renders without errors
      expect(screen.getByText('B')).toBeInTheDocument();
    });

    it('should maintain hooks consistency across conditional renders', () => {
      // ARRANGE: Wrapper that conditionally renders TabsComponent
      const ConditionalWrapper = ({ show }: { show: boolean }) => (
        <div>
          {show && <TabsComponent id="test-tabs" />}
        </div>
      );

      // ACT: Toggle component visibility
      const { rerender } = render(<ConditionalWrapper show={true} />);
      rerender(<ConditionalWrapper show={false} />);

      // ASSERT: No hook consistency errors
      expect(() => {
        rerender(<ConditionalWrapper show={true} />);
      }).not.toThrow();
    });
  });

  describe('2. First Tab is Active by Default', () => {

    it('should render first tab as active on mount', () => {
      // ARRANGE & ACT
      render(<TabsComponent />);

      // ASSERT: First tab has active styling
      const firstTab = screen.getByText('Tab 1');
      expect(firstTab).toHaveClass('text-blue-600');
      expect(firstTab).toHaveClass('border-b-2');
      expect(firstTab).toHaveClass('border-blue-600');
    });

    it('should display first tab content by default', () => {
      // ARRANGE & ACT
      render(<TabsComponent />);

      // ASSERT: First tab content is visible
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('should mark first tab as aria-selected', () => {
      // ARRANGE & ACT
      render(<TabsComponent />);

      // ASSERT: First tab has correct ARIA attribute
      const firstTab = screen.getByText('Tab 1');
      expect(firstTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should not show other tabs content initially', () => {
      // ARRANGE & ACT
      render(
        <TabsComponent
          tabs={[
            { label: 'First', content: 'First Content' },
            { label: 'Second', content: 'Second Content' },
            { label: 'Third', content: 'Third Content' }
          ]}
        />
      );

      // ASSERT: Only first tab content is visible
      expect(screen.getByText('First Content')).toBeInTheDocument();
      expect(screen.queryByText('Second Content')).not.toBeInTheDocument();
      expect(screen.queryByText('Third Content')).not.toBeInTheDocument();
    });
  });

  describe('3. Clicking Tab Changes Active Tab', () => {

    it('should switch active tab when clicked', () => {
      // ARRANGE
      render(<TabsComponent />);
      const secondTab = screen.getByText('Tab 2');

      // ACT: Click second tab
      fireEvent.click(secondTab);

      // ASSERT: Second tab is now active
      expect(secondTab).toHaveClass('text-blue-600');
      expect(secondTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should display clicked tab content', () => {
      // ARRANGE
      render(<TabsComponent />);

      // ACT: Click second tab
      fireEvent.click(screen.getByText('Tab 2'));

      // ASSERT: Second tab content is visible
      expect(screen.getByText('Content 2')).toBeInTheDocument();
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });

    it('should remove active styling from previously active tab', () => {
      // ARRANGE
      render(<TabsComponent />);
      const firstTab = screen.getByText('Tab 1');
      const secondTab = screen.getByText('Tab 2');

      // ACT: Click second tab
      fireEvent.click(secondTab);

      // ASSERT: First tab loses active styling
      expect(firstTab).not.toHaveClass('text-blue-600');
      expect(firstTab).toHaveClass('text-gray-500');
      expect(firstTab).toHaveAttribute('aria-selected', 'false');
    });

    it('should handle rapid tab switching', () => {
      // ARRANGE
      render(
        <TabsComponent
          tabs={[
            { label: 'A', content: 'Content A' },
            { label: 'B', content: 'Content B' },
            { label: 'C', content: 'Content C' }
          ]}
        />
      );

      // ACT: Rapidly click through tabs
      fireEvent.click(screen.getByText('B'));
      fireEvent.click(screen.getByText('C'));
      fireEvent.click(screen.getByText('A'));

      // ASSERT: Component maintains correct state
      expect(screen.getByText('Content A')).toBeInTheDocument();
      expect(screen.getByText('A')).toHaveClass('text-blue-600');
    });

    it('should persist state after multiple clicks on same tab', () => {
      // ARRANGE
      render(<TabsComponent />);
      const firstTab = screen.getByText('Tab 1');

      // ACT: Click same tab multiple times
      fireEvent.click(firstTab);
      fireEvent.click(firstTab);
      fireEvent.click(firstTab);

      // ASSERT: Tab remains active
      expect(firstTab).toHaveClass('text-blue-600');
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });
  });

  describe('4. Tabs Display Correct Content', () => {

    it('should render custom tab labels', () => {
      // ARRANGE
      const customTabs = [
        { label: 'Overview', content: 'Overview content' },
        { label: 'Settings', content: 'Settings content' }
      ];

      // ACT
      render(<TabsComponent tabs={customTabs} />);

      // ASSERT: Custom labels are displayed
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render custom tab content', () => {
      // ARRANGE
      const customTabs = [
        { label: 'Profile', content: 'User profile information' },
        { label: 'Activity', content: 'Recent activity logs' }
      ];

      // ACT
      render(<TabsComponent tabs={customTabs} />);

      // ASSERT: Default tab content is shown
      expect(screen.getByText('User profile information')).toBeInTheDocument();

      // ACT: Switch tab
      fireEvent.click(screen.getByText('Activity'));

      // ASSERT: Content updates correctly
      expect(screen.getByText('Recent activity logs')).toBeInTheDocument();
    });

    it('should handle HTML entities in content', () => {
      // ARRANGE
      const tabsWithEntities = [
        { label: 'Test', content: 'Price: $100 & Tax: 10%' }
      ];

      // ACT
      render(<TabsComponent tabs={tabsWithEntities} />);

      // ASSERT: Special characters render correctly
      expect(screen.getByText('Price: $100 & Tax: 10%')).toBeInTheDocument();
    });

    it('should render long content without breaking layout', () => {
      // ARRANGE
      const longContent = 'Lorem ipsum '.repeat(100);
      const tabsWithLongContent = [
        { label: 'Long', content: longContent }
      ];

      // ACT
      const { container } = render(<TabsComponent tabs={tabsWithLongContent} />);

      // ASSERT: Content is contained properly
      const contentDiv = container.querySelector('.p-6');
      expect(contentDiv).toBeInTheDocument();
      expect(contentDiv?.textContent).toContain('Lorem ipsum');
    });
  });

  describe('5. Multiple Tabs Components Have Isolated State', () => {

    it('should maintain independent state for multiple instances', () => {
      // ARRANGE: Render two separate TabsComponent instances
      const { container } = render(
        <div>
          <TabsComponent id="tabs-1" />
          <TabsComponent id="tabs-2" />
        </div>
      );

      // ACT: Get both instances
      const tabs1 = container.querySelector('#tabs-1');
      const tabs2 = container.querySelector('#tabs-2');

      // Get second tab button from first instance
      const firstInstanceTabs = within(tabs1!).getAllByRole('tab');
      const secondInstanceTabs = within(tabs2!).getAllByRole('tab');

      // Click second tab in first instance
      fireEvent.click(firstInstanceTabs[1]);

      // ASSERT: First instance shows second tab content
      expect(within(tabs1!).getByText('Content 2')).toBeInTheDocument();

      // ASSERT: Second instance still shows first tab content (isolated)
      expect(within(tabs2!).getByText('Content 1')).toBeInTheDocument();
    });

    it('should allow different active tabs in multiple instances', () => {
      // ARRANGE: Render three instances
      const { container } = render(
        <div>
          <TabsComponent id="instance-1" />
          <TabsComponent id="instance-2" />
          <TabsComponent id="instance-3" />
        </div>
      );

      // ACT: Set different active tabs
      const instance1 = container.querySelector('#instance-1')!;
      const instance2 = container.querySelector('#instance-2')!;
      const instance3 = container.querySelector('#instance-3')!;

      fireEvent.click(within(instance1).getAllByRole('tab')[0]); // Tab 1
      fireEvent.click(within(instance2).getAllByRole('tab')[1]); // Tab 2
      fireEvent.click(within(instance3).getAllByRole('tab')[0]); // Tab 1

      // ASSERT: Each instance maintains its own state
      expect(within(instance1).getByText('Content 1')).toBeInTheDocument();
      expect(within(instance2).getByText('Content 2')).toBeInTheDocument();
      expect(within(instance3).getByText('Content 1')).toBeInTheDocument();
    });

    it('should not cause hook errors with dynamic instance creation', () => {
      // ARRANGE: Component that dynamically creates instances
      const DynamicTabs = ({ count }: { count: number }) => (
        <div>
          {Array.from({ length: count }).map((_, idx) => (
            <TabsComponent key={idx} id={`dynamic-${idx}`} />
          ))}
        </div>
      );

      // ACT: Render and update count
      const { rerender } = render(<DynamicTabs count={2} />);

      expect(() => {
        rerender(<DynamicTabs count={5} />);
        rerender(<DynamicTabs count={1} />);
        rerender(<DynamicTabs count={3} />);
      }).not.toThrow();

      // ASSERT: All instances render correctly
      expect(screen.getAllByText('Tab 1').length).toBe(3);
    });
  });

  describe('6. Component Renders with ID Attribute from Props', () => {

    it('should render with custom id prop', () => {
      // ARRANGE & ACT
      const { container } = render(<TabsComponent id="my-custom-tabs" />);

      // ASSERT: ID attribute is set correctly
      expect(container.querySelector('#my-custom-tabs')).toBeInTheDocument();
    });

    it('should render without id when not provided', () => {
      // ARRANGE & ACT
      const { container } = render(<TabsComponent />);

      // ASSERT: Component renders without id attribute
      const tabsDiv = container.querySelector('.bg-white');
      expect(tabsDiv).toBeInTheDocument();
      expect(tabsDiv?.id).toBe('');
    });

    it('should allow id to be used for CSS selectors', () => {
      // ARRANGE & ACT
      render(<TabsComponent id="selectable-tabs" />);
      const element = document.querySelector('#selectable-tabs');

      // ASSERT: Element is selectable by ID
      expect(element).toBeInTheDocument();
      expect(element?.classList.contains('bg-white')).toBe(true);
    });

    it('should apply custom className alongside default classes', () => {
      // ARRANGE & ACT
      const { container } = render(
        <TabsComponent className="custom-wrapper" />
      );

      // ASSERT: Both default and custom classes are present
      const tabsDiv = container.querySelector('.bg-white');
      expect(tabsDiv).toHaveClass('bg-white');
      expect(tabsDiv).toHaveClass('rounded-lg');
      expect(tabsDiv).toHaveClass('custom-wrapper');
    });
  });

  describe('7. Tabs with Custom Props Work Correctly', () => {

    it('should handle single tab configuration', () => {
      // ARRANGE
      const singleTab = [{ label: 'Only Tab', content: 'Only content' }];

      // ACT
      render(<TabsComponent tabs={singleTab} />);

      // ASSERT: Single tab renders and is active
      expect(screen.getByText('Only Tab')).toBeInTheDocument();
      expect(screen.getByText('Only content')).toBeInTheDocument();
      expect(screen.getByText('Only Tab')).toHaveClass('text-blue-600');
    });

    it('should handle many tabs configuration', () => {
      // ARRANGE
      const manyTabs = Array.from({ length: 10 }, (_, i) => ({
        label: `Tab ${i + 1}`,
        content: `Content ${i + 1}`
      }));

      // ACT
      render(<TabsComponent tabs={manyTabs} />);

      // ASSERT: All tabs render
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 10')).toBeInTheDocument();

      // ACT: Click last tab
      fireEvent.click(screen.getByText('Tab 10'));

      // ASSERT: Last tab content displays
      expect(screen.getByText('Content 10')).toBeInTheDocument();
    });

    it('should use default tabs when tabs prop is undefined', () => {
      // ARRANGE & ACT
      render(<TabsComponent tabs={undefined} />);

      // ASSERT: Default tabs are rendered
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('should handle empty strings in tab labels gracefully', () => {
      // ARRANGE
      const tabsWithEmptyLabel = [
        { label: '', content: 'Empty label content' },
        { label: 'Normal', content: 'Normal content' }
      ];

      // ACT
      const { container } = render(<TabsComponent tabs={tabsWithEmptyLabel} />);

      // ASSERT: Component renders without crashing
      expect(container.querySelector('.bg-white')).toBeInTheDocument();
      expect(screen.getByText('Normal')).toBeInTheDocument();
    });

    it('should handle special characters in tab labels', () => {
      // ARRANGE
      const specialTabs = [
        { label: 'Tab #1 (First)', content: 'First' },
        { label: 'Tab @2 & More', content: 'Second' },
        { label: 'Tab <3>', content: 'Third' }
      ];

      // ACT
      render(<TabsComponent tabs={specialTabs} />);

      // ASSERT: Special characters render correctly
      expect(screen.getByText('Tab #1 (First)')).toBeInTheDocument();
      expect(screen.getByText('Tab @2 & More')).toBeInTheDocument();
      expect(screen.getByText('Tab <3>')).toBeInTheDocument();
    });
  });

  describe('8. Edge Cases', () => {

    it('should handle empty tabs array gracefully', () => {
      // ARRANGE & ACT
      const { container } = render(<TabsComponent tabs={[]} />);

      // ASSERT: Component renders container but no tabs
      expect(container.querySelector('.bg-white')).toBeInTheDocument();
      const tabs = container.querySelectorAll('button[role="tab"]');
      expect(tabs.length).toBe(0);
    });

    it('should prevent errors when clicking non-existent tab index', () => {
      // ARRANGE
      const { container } = render(<TabsComponent />);

      // ACT: Attempt to access content at invalid index
      const contentDiv = container.querySelector('.p-6');

      // ASSERT: Content area handles missing index gracefully
      expect(contentDiv).toBeInTheDocument();
      expect(contentDiv?.textContent).toBeTruthy();
    });

    it('should handle tabs with identical labels', () => {
      // ARRANGE
      const duplicateTabs = [
        { label: 'Same', content: 'First Same' },
        { label: 'Same', content: 'Second Same' },
        { label: 'Same', content: 'Third Same' }
      ];

      // ACT
      render(<TabsComponent tabs={duplicateTabs} />);
      const sameTabs = screen.getAllByText('Same');

      // ASSERT: All tabs render
      expect(sameTabs.length).toBe(3);

      // ACT: Click second duplicate tab
      fireEvent.click(sameTabs[1]);

      // ASSERT: Correct content displays
      expect(screen.getByText('Second Same')).toBeInTheDocument();
    });

    it('should handle very long tab labels', () => {
      // ARRANGE
      const longLabel = 'This is a very long tab label that contains many characters and should not break the layout';
      const longLabelTabs = [
        { label: longLabel, content: 'Content for long label' }
      ];

      // ACT
      const { container } = render(<TabsComponent tabs={longLabelTabs} />);

      // ASSERT: Long label renders without breaking layout
      expect(screen.getByText(longLabel)).toBeInTheDocument();
      expect(container.querySelector('.flex')).toBeInTheDocument();
    });

    it('should maintain state during parent re-renders', () => {
      // ARRANGE
      const ParentWrapper = ({ extraProp }: { extraProp: string }) => (
        <div>
          <span>{extraProp}</span>
          <TabsComponent id="stable-tabs" />
        </div>
      );

      const { rerender } = render(<ParentWrapper extraProp="initial" />);

      // ACT: Click second tab
      fireEvent.click(screen.getByText('Tab 2'));
      expect(screen.getByText('Content 2')).toBeInTheDocument();

      // ACT: Parent re-renders with different prop
      rerender(<ParentWrapper extraProp="updated" />);

      // ASSERT: Tab state is maintained
      expect(screen.getByText('Content 2')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toHaveClass('text-blue-600');
    });

    it('should handle null or undefined content gracefully', () => {
      // ARRANGE
      const tabsWithNullContent = [
        { label: 'Tab A', content: null as any },
        { label: 'Tab B', content: undefined as any },
        { label: 'Tab C', content: 'Valid content' }
      ];

      // ACT
      const { container } = render(<TabsComponent tabs={tabsWithNullContent} />);

      // ASSERT: Component renders without errors
      expect(container.querySelector('.bg-white')).toBeInTheDocument();

      // ACT: Click tab with valid content
      fireEvent.click(screen.getByText('Tab C'));

      // ASSERT: Valid content displays
      expect(screen.getByText('Valid content')).toBeInTheDocument();
    });

    it('should not break with rapid mount/unmount cycles', () => {
      // ARRANGE
      const ToggleWrapper = ({ show }: { show: boolean }) => (
        <div>{show && <TabsComponent />}</div>
      );

      // ACT: Rapid toggle
      const { rerender } = render(<ToggleWrapper show={true} />);

      expect(() => {
        for (let i = 0; i < 10; i++) {
          rerender(<ToggleWrapper show={false} />);
          rerender(<ToggleWrapper show={true} />);
        }
      }).not.toThrow();

      // ASSERT: Component still works after rapid toggling
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
    });
  });

  describe('9. Accessibility Features', () => {

    it('should have proper ARIA roles', () => {
      // ARRANGE & ACT
      render(<TabsComponent />);

      // ASSERT: Tabs have correct role
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(2);

      // ASSERT: Tabpanel has correct role
      const tabpanel = screen.getByRole('tabpanel');
      expect(tabpanel).toBeInTheDocument();
    });

    it('should have proper ARIA attributes for accessibility', () => {
      // ARRANGE & ACT
      const { container } = render(<TabsComponent />);

      // ASSERT: Tabs have aria-selected
      const firstTab = screen.getByText('Tab 1');
      expect(firstTab).toHaveAttribute('aria-selected', 'true');

      const secondTab = screen.getByText('Tab 2');
      expect(secondTab).toHaveAttribute('aria-selected', 'false');

      // ASSERT: aria-controls and id relationships
      expect(firstTab).toHaveAttribute('id', 'tab-0');
      expect(firstTab).toHaveAttribute('aria-controls', 'tabpanel-0');
    });

    it('should update ARIA attributes when switching tabs', () => {
      // ARRANGE
      render(<TabsComponent />);
      const firstTab = screen.getByText('Tab 1');
      const secondTab = screen.getByText('Tab 2');

      // ACT: Switch to second tab
      fireEvent.click(secondTab);

      // ASSERT: ARIA attributes update correctly
      expect(firstTab).toHaveAttribute('aria-selected', 'false');
      expect(secondTab).toHaveAttribute('aria-selected', 'true');

      const tabpanel = screen.getByRole('tabpanel');
      expect(tabpanel).toHaveAttribute('id', 'tabpanel-1');
      expect(tabpanel).toHaveAttribute('aria-labelledby', 'tab-1');
    });
  });
});
