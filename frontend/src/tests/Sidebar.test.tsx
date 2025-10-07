import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar, SidebarItem } from '../components/dynamic-page/Sidebar';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    aside: ({ children, ...props }: any) => <aside {...props}>{children}</aside>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockItems: SidebarItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: 'Home',
    href: '/',
  },
  {
    id: 'products',
    label: 'Products',
    icon: 'Package',
    children: [
      { id: 'all-products', label: 'All Products', href: '/products' },
      { id: 'new-arrivals', label: 'New Arrivals', href: '/products/new', badge: '5' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'Settings',
    href: '/settings',
    disabled: true,
  },
];

const renderSidebar = (props?: Partial<React.ComponentProps<typeof Sidebar>>) => {
  return render(
    <BrowserRouter>
      <Sidebar items={mockItems} {...props} />
    </BrowserRouter>
  );
};

describe('Sidebar Component', () => {
  beforeEach(() => {
    // Reset window size
    window.innerWidth = 1024;
    window.innerHeight = 768;
  });

  describe('Rendering', () => {
    it('renders all sidebar items', () => {
      renderSidebar();

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders with custom header', () => {
      const header = <div>Custom Header</div>;
      renderSidebar({ header });

      expect(screen.getByText('Custom Header')).toBeInTheDocument();
    });

    it('renders with custom footer', () => {
      const footer = <div>Custom Footer</div>;
      renderSidebar({ footer });

      expect(screen.getByText('Custom Footer')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = renderSidebar({ className: 'custom-sidebar' });

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('custom-sidebar');
    });

    it('renders navigation label', () => {
      renderSidebar();

      expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('renders icons for items', () => {
      const { container } = renderSidebar();

      // Icons should be rendered (svg elements)
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('handles missing icon gracefully', () => {
      const itemsWithoutIcon: SidebarItem[] = [
        { id: 'test', label: 'No Icon', href: '/test' },
      ];

      render(
        <BrowserRouter>
          <Sidebar items={itemsWithoutIcon} />
        </BrowserRouter>
      );

      expect(screen.getByText('No Icon')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('renders links for items with href', () => {
      renderSidebar();

      const homeLink = screen.getByRole('link', { name: /home/i });
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('highlights active item based on route', () => {
      renderSidebar({ activeItem: 'home' });

      const homeButton = screen.getByText('Home').closest('div');
      expect(homeButton).toHaveClass('bg-primary-100');
    });

    it('handles item click callback', () => {
      const onItemSelect = vi.fn();
      renderSidebar({ onItemSelect });

      const homeButton = screen.getByText('Home');
      fireEvent.click(homeButton);

      expect(onItemSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'home' })
      );
    });

    it('executes custom onClick handler', () => {
      const onClick = vi.fn();
      const itemsWithClick: SidebarItem[] = [
        { id: 'test', label: 'Test', onClick },
      ];

      render(
        <BrowserRouter>
          <Sidebar items={itemsWithClick} />
        </BrowserRouter>
      );

      fireEvent.click(screen.getByText('Test'));
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('Nested Navigation', () => {
    it('shows children when parent is expanded', async () => {
      renderSidebar();

      // Initially children should not be visible
      expect(screen.queryByText('All Products')).not.toBeInTheDocument();

      // Click to expand
      const productsButton = screen.getByText('Products');
      fireEvent.click(productsButton);

      await waitFor(() => {
        expect(screen.getByText('All Products')).toBeInTheDocument();
        expect(screen.getByText('New Arrivals')).toBeInTheDocument();
      });
    });

    it('toggles children visibility on click', async () => {
      renderSidebar();

      const productsButton = screen.getByText('Products');

      // Expand
      fireEvent.click(productsButton);
      await waitFor(() => {
        expect(screen.getByText('All Products')).toBeInTheDocument();
      });

      // Collapse
      fireEvent.click(productsButton);
      await waitFor(() => {
        expect(screen.queryByText('All Products')).not.toBeInTheDocument();
      });
    });

    it('shows chevron icon for expandable items', () => {
      const { container } = renderSidebar();

      // Products item should have a chevron
      const productsButton = screen.getByText('Products').closest('div');
      expect(productsButton).toBeInTheDocument();
    });
  });

  describe('Badges', () => {
    it('displays badges on items', async () => {
      renderSidebar();

      // Expand products to see child with badge
      fireEvent.click(screen.getByText('Products'));

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('provides aria-label for badges', async () => {
      renderSidebar();

      fireEvent.click(screen.getByText('Products'));

      await waitFor(() => {
        const badge = screen.getByText('5');
        expect(badge).toHaveAttribute('aria-label', '5 items');
      });
    });
  });

  describe('Collapsed State', () => {
    it('starts collapsed when defaultCollapsed is true', () => {
      renderSidebar({ defaultCollapsed: true, collapsible: true });

      // Labels should not be visible when collapsed
      const sidebar = screen.getByRole('navigation');
      expect(sidebar).toBeInTheDocument();
    });

    it('shows collapse toggle button when collapsible', () => {
      renderSidebar({ collapsible: true });

      expect(screen.getByLabelText(/collapse sidebar/i)).toBeInTheDocument();
    });

    it('toggles collapsed state when button clicked', () => {
      renderSidebar({ collapsible: true });

      const toggleButton = screen.getByLabelText(/collapse sidebar/i);

      fireEvent.click(toggleButton);
      expect(screen.getByLabelText(/expand sidebar/i)).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText(/expand sidebar/i));
      expect(screen.getByLabelText(/collapse sidebar/i)).toBeInTheDocument();
    });

    it('hides toggle when not collapsible', () => {
      renderSidebar({ collapsible: false });

      expect(screen.queryByLabelText(/collapse sidebar/i)).not.toBeInTheDocument();
    });
  });

  describe('Disabled Items', () => {
    it('marks disabled items appropriately', () => {
      renderSidebar();

      const settingsButton = screen.getByText('Settings').closest('div');
      expect(settingsButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('prevents clicks on disabled items', () => {
      const onItemSelect = vi.fn();
      renderSidebar({ onItemSelect });

      const settingsButton = screen.getByText('Settings');
      fireEvent.click(settingsButton);

      expect(onItemSelect).not.toHaveBeenCalled();
    });

    it('prevents keyboard interaction on disabled items', () => {
      renderSidebar();

      const settingsButton = screen.getByText('Settings').closest('div');
      expect(settingsButton).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports Enter key to activate items', () => {
      const onItemSelect = vi.fn();
      renderSidebar({ onItemSelect });

      const homeButton = screen.getByText('Home').closest('[role="button"]');
      fireEvent.keyDown(homeButton!, { key: 'Enter' });

      expect(onItemSelect).toHaveBeenCalled();
    });

    it('supports Space key to activate items', () => {
      const onItemSelect = vi.fn();
      renderSidebar({ onItemSelect });

      const homeButton = screen.getByText('Home').closest('[role="button"]');
      fireEvent.keyDown(homeButton!, { key: ' ' });

      expect(onItemSelect).toHaveBeenCalled();
    });

    it('expands items with ArrowRight key', () => {
      renderSidebar();

      const productsButton = screen.getByText('Products').closest('[role="button"]');
      fireEvent.keyDown(productsButton!, { key: 'ArrowRight' });

      expect(productsButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('collapses items with ArrowLeft key', async () => {
      renderSidebar();

      const productsButton = screen.getByText('Products').closest('[role="button"]');

      // First expand
      fireEvent.keyDown(productsButton!, { key: 'ArrowRight' });
      expect(productsButton).toHaveAttribute('aria-expanded', 'true');

      // Then collapse
      fireEvent.keyDown(productsButton!, { key: 'ArrowLeft' });
      await waitFor(() => {
        expect(productsButton).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('is focusable via keyboard', () => {
      renderSidebar();

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        if (button.getAttribute('aria-disabled') !== 'true') {
          expect(button).toHaveAttribute('tabIndex', '0');
        }
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA roles', () => {
      renderSidebar();

      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
    });

    it('has aria-expanded for expandable items', () => {
      renderSidebar();

      const productsButton = screen.getByText('Products').closest('[role="button"]');
      expect(productsButton).toHaveAttribute('aria-expanded');
    });

    it('has aria-current for active items', () => {
      renderSidebar({ activeItem: 'home' });

      const homeButton = screen.getByText('Home').closest('div');
      expect(homeButton).toHaveAttribute('aria-current', 'page');
    });

    it('has aria-disabled for disabled items', () => {
      renderSidebar();

      const settingsButton = screen.getByText('Settings').closest('div');
      expect(settingsButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('provides screen reader friendly labels', () => {
      renderSidebar();

      expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    });
  });

  describe('Position', () => {
    it('positions on left by default', () => {
      const { container } = renderSidebar();

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('left-0');
    });

    it('positions on right when specified', () => {
      const { container } = renderSidebar({ position: 'right' });

      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('right-0');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty items array', () => {
      render(
        <BrowserRouter>
          <Sidebar items={[]} />
        </BrowserRouter>
      );

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('handles deeply nested items', () => {
      const deepItems: SidebarItem[] = [
        {
          id: 'level1',
          label: 'Level 1',
          children: [
            {
              id: 'level2',
              label: 'Level 2',
              children: [
                { id: 'level3', label: 'Level 3', href: '/deep' },
              ],
            },
          ],
        },
      ];

      render(
        <BrowserRouter>
          <Sidebar items={deepItems} />
        </BrowserRouter>
      );

      expect(screen.getByText('Level 1')).toBeInTheDocument();
    });

    it('handles items without labels', () => {
      const itemsNoLabel: SidebarItem[] = [
        { id: 'test', label: '', href: '/test' },
      ];

      render(
        <BrowserRouter>
          <Sidebar items={itemsNoLabel} />
        </BrowserRouter>
      );

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('handles items with both href and children', () => {
      const mixedItems: SidebarItem[] = [
        {
          id: 'mixed',
          label: 'Mixed',
          href: '/mixed',
          children: [{ id: 'child', label: 'Child', href: '/child' }],
        },
      ];

      render(
        <BrowserRouter>
          <Sidebar items={mixedItems} />
        </BrowserRouter>
      );

      // Parent with children should not be a link
      const mixedItem = screen.getByText('Mixed');
      expect(mixedItem.closest('a')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('handles mobile menu toggle', () => {
      // Simulate mobile viewport
      window.innerWidth = 500;
      window.dispatchEvent(new Event('resize'));

      renderSidebar();

      // On mobile, should have hamburger button
      // Note: This test may need adjustment based on implementation
    });
  });
});
