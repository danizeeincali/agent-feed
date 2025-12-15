/**
 * Sidebar Component Examples
 * Demonstrates various usage patterns and configurations
 */

import React, { useState } from 'react';
import { Sidebar, SidebarItem } from './Sidebar';
import { User, Settings, LogOut } from 'lucide-react';

/**
 * Example 1: Basic Sidebar with Simple Navigation
 */
export const BasicSidebarExample: React.FC = () => {
  const items: SidebarItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: 'Home',
      href: '/',
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'LayoutDashboard',
      href: '/dashboard',
      badge: '3',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: 'BarChart',
      href: '/analytics',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'Settings',
      href: '/settings',
    },
  ];

  return (
    <div className="flex h-screen">
      <Sidebar items={items} collapsible position="left" />
      <main className="flex-1 p-8 bg-gray-50">
        <h1 className="text-2xl font-bold">Basic Sidebar Example</h1>
        <p className="mt-2 text-gray-600">
          A simple sidebar with navigation links and badges.
        </p>
      </main>
    </div>
  );
};

/**
 * Example 2: Nested Navigation with Expandable Items
 */
export const NestedSidebarExample: React.FC = () => {
  const items: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'LayoutDashboard',
      href: '/dashboard',
    },
    {
      id: 'products',
      label: 'Products',
      icon: 'Package',
      children: [
        {
          id: 'all-products',
          label: 'All Products',
          icon: 'List',
          href: '/products',
        },
        {
          id: 'new-arrivals',
          label: 'New Arrivals',
          icon: 'Sparkles',
          href: '/products/new',
          badge: '12',
        },
        {
          id: 'categories',
          label: 'Categories',
          icon: 'Grid',
          children: [
            {
              id: 'electronics',
              label: 'Electronics',
              href: '/products/categories/electronics',
            },
            {
              id: 'clothing',
              label: 'Clothing',
              href: '/products/categories/clothing',
            },
          ],
        },
      ],
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: 'ShoppingCart',
      children: [
        {
          id: 'pending',
          label: 'Pending',
          icon: 'Clock',
          href: '/orders/pending',
          badge: '5',
        },
        {
          id: 'completed',
          label: 'Completed',
          icon: 'CheckCircle',
          href: '/orders/completed',
        },
      ],
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: 'Users',
      href: '/customers',
    },
  ];

  return (
    <div className="flex h-screen">
      <Sidebar
        items={items}
        collapsible
        position="left"
        defaultCollapsed={false}
      />
      <main className="flex-1 p-8 bg-gray-50">
        <h1 className="text-2xl font-bold">Nested Navigation Example</h1>
        <p className="mt-2 text-gray-600">
          Sidebar with nested navigation items that can be expanded and collapsed.
        </p>
      </main>
    </div>
  );
};

/**
 * Example 3: Sidebar with Custom Header and Footer
 */
export const SidebarWithHeaderFooterExample: React.FC = () => {
  const [activeItem, setActiveItem] = useState<string>('home');

  const items: SidebarItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: 'Home',
      href: '/',
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: 'FolderOpen',
      href: '/projects',
      badge: '8',
    },
    {
      id: 'team',
      label: 'Team',
      icon: 'Users',
      href: '/team',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: 'FileText',
      href: '/reports',
    },
  ];

  const header = (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
        <span className="text-white font-bold text-lg">A</span>
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Acme Corp
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Premium Plan
        </p>
      </div>
    </div>
  );

  const footer = (
    <div className="space-y-2">
      <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
        <User className="w-4 h-4" />
        <span>Profile</span>
      </button>
      <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
        <Settings className="w-4 h-4" />
        <span>Settings</span>
      </button>
      <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
        <LogOut className="w-4 h-4" />
        <span>Log Out</span>
      </button>
    </div>
  );

  return (
    <div className="flex h-screen">
      <Sidebar
        items={items}
        activeItem={activeItem}
        collapsible
        position="left"
        header={header}
        footer={footer}
        onItemSelect={(item) => setActiveItem(item.id)}
      />
      <main className="flex-1 p-8 bg-gray-50">
        <h1 className="text-2xl font-bold">Custom Header & Footer Example</h1>
        <p className="mt-2 text-gray-600">
          Sidebar with custom header showing company info and footer with user actions.
        </p>
        <div className="mt-4 p-4 bg-white rounded-lg shadow">
          <p className="text-sm text-gray-600">
            Active Item: <strong>{activeItem}</strong>
          </p>
        </div>
      </main>
    </div>
  );
};

/**
 * Example 4: Right-Positioned Sidebar
 */
export const RightSidebarExample: React.FC = () => {
  const items: SidebarItem[] = [
    {
      id: 'notifications',
      label: 'Notifications',
      icon: 'Bell',
      href: '/notifications',
      badge: '12',
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: 'MessageSquare',
      href: '/messages',
      badge: '5',
    },
    {
      id: 'activity',
      label: 'Activity Log',
      icon: 'Activity',
      href: '/activity',
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: 'HelpCircle',
      href: '/help',
    },
  ];

  return (
    <div className="flex h-screen">
      <main className="flex-1 p-8 bg-gray-50">
        <h1 className="text-2xl font-bold">Right Sidebar Example</h1>
        <p className="mt-2 text-gray-600">
          Sidebar positioned on the right side of the screen.
        </p>
      </main>
      <Sidebar
        items={items}
        collapsible
        position="right"
      />
    </div>
  );
};

/**
 * Example 5: Sidebar with Click Handlers and Disabled Items
 */
export const InteractiveSidebarExample: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const items: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'LayoutDashboard',
      href: '/dashboard',
      onClick: () => console.log('Dashboard clicked'),
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: 'BarChart',
      href: '/analytics',
      onClick: () => console.log('Analytics clicked'),
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: 'FileText',
      href: '/reports',
      disabled: true,
      badge: 'Soon',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'Settings',
      children: [
        {
          id: 'general',
          label: 'General',
          href: '/settings/general',
        },
        {
          id: 'security',
          label: 'Security',
          href: '/settings/security',
        },
        {
          id: 'integrations',
          label: 'Integrations',
          href: '/settings/integrations',
          disabled: true,
        },
      ],
    },
  ];

  return (
    <div className="flex h-screen">
      <Sidebar
        items={items}
        collapsible
        position="left"
        onItemSelect={(item) => {
          setSelectedItem(item.id);
          console.log('Selected item:', item);
        }}
      />
      <main className="flex-1 p-8 bg-gray-50">
        <h1 className="text-2xl font-bold">Interactive Sidebar Example</h1>
        <p className="mt-2 text-gray-600">
          Sidebar with click handlers and disabled items.
        </p>
        {selectedItem && (
          <div className="mt-4 p-4 bg-white rounded-lg shadow">
            <p className="text-sm text-gray-600">
              Last selected: <strong>{selectedItem}</strong>
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

/**
 * Example 6: Mobile-Responsive Sidebar
 */
export const MobileSidebarExample: React.FC = () => {
  const items: SidebarItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: 'Home',
      href: '/',
    },
    {
      id: 'explore',
      label: 'Explore',
      icon: 'Compass',
      href: '/explore',
    },
    {
      id: 'library',
      label: 'Library',
      icon: 'Library',
      href: '/library',
    },
    {
      id: 'saved',
      label: 'Saved',
      icon: 'Bookmark',
      href: '/saved',
      badge: '24',
    },
    {
      id: 'history',
      label: 'History',
      icon: 'History',
      href: '/history',
    },
  ];

  return (
    <div className="flex h-screen">
      <Sidebar
        items={items}
        collapsible
        position="left"
        mobileBreakpoint={768}
      />
      <main className="flex-1 p-8 bg-gray-50 overflow-auto">
        <h1 className="text-2xl font-bold">Mobile-Responsive Example</h1>
        <p className="mt-2 text-gray-600">
          Resize your browser to see the mobile hamburger menu (below 768px).
        </p>
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Try it:</strong> Resize your browser window to less than 768px
            to see the mobile hamburger menu appear.
          </p>
        </div>
      </main>
    </div>
  );
};

/**
 * Example 7: Complete E-commerce Application Layout
 */
export const CompleteApplicationExample: React.FC = () => {
  const items: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'LayoutDashboard',
      href: '/dashboard',
    },
    {
      id: 'catalog',
      label: 'Catalog',
      icon: 'Package',
      children: [
        {
          id: 'products',
          label: 'Products',
          icon: 'Box',
          href: '/catalog/products',
          badge: '234',
        },
        {
          id: 'collections',
          label: 'Collections',
          icon: 'Grid',
          href: '/catalog/collections',
        },
        {
          id: 'inventory',
          label: 'Inventory',
          icon: 'Database',
          href: '/catalog/inventory',
        },
      ],
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: 'ShoppingCart',
      children: [
        {
          id: 'all-orders',
          label: 'All Orders',
          href: '/orders/all',
        },
        {
          id: 'pending',
          label: 'Pending',
          href: '/orders/pending',
          badge: '8',
        },
        {
          id: 'fulfilled',
          label: 'Fulfilled',
          href: '/orders/fulfilled',
        },
      ],
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: 'Users',
      href: '/customers',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: 'TrendingUp',
      children: [
        {
          id: 'overview',
          label: 'Overview',
          href: '/analytics/overview',
        },
        {
          id: 'sales',
          label: 'Sales',
          href: '/analytics/sales',
        },
        {
          id: 'traffic',
          label: 'Traffic',
          href: '/analytics/traffic',
        },
      ],
    },
    {
      id: 'marketing',
      label: 'Marketing',
      icon: 'Megaphone',
      href: '/marketing',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'Settings',
      children: [
        {
          id: 'general',
          label: 'General',
          href: '/settings/general',
        },
        {
          id: 'payments',
          label: 'Payments',
          href: '/settings/payments',
        },
        {
          id: 'shipping',
          label: 'Shipping',
          href: '/settings/shipping',
        },
      ],
    },
  ];

  const header = (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center shadow-lg">
        <span className="text-white font-bold text-lg">S</span>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
          Store Admin
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          store.example.com
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen">
      <Sidebar
        items={items}
        collapsible
        position="left"
        header={header}
      />
      <main className="flex-1 p-8 bg-gray-50 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">
            Complete Application Example
          </h1>
          <p className="mt-2 text-gray-600">
            A full-featured e-commerce admin panel sidebar with nested navigation.
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900">
                Total Sales
              </h3>
              <p className="text-3xl font-bold text-primary-600 mt-2">
                $24,567
              </p>
              <p className="text-sm text-green-600 mt-1">
                +12.5% from last month
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900">
                Orders
              </h3>
              <p className="text-3xl font-bold text-primary-600 mt-2">
                156
              </p>
              <p className="text-sm text-green-600 mt-1">
                +8.2% from last month
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900">
                Customers
              </h3>
              <p className="text-3xl font-bold text-primary-600 mt-2">
                1,234
              </p>
              <p className="text-sm text-green-600 mt-1">
                +5.1% from last month
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Default export for easy importing
export default {
  BasicSidebarExample,
  NestedSidebarExample,
  SidebarWithHeaderFooterExample,
  RightSidebarExample,
  InteractiveSidebarExample,
  MobileSidebarExample,
  CompleteApplicationExample,
};
