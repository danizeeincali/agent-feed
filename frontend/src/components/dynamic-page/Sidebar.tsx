import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Sidebar item interface with support for nested navigation
 */
export interface SidebarItem {
  id: string;
  label: string;
  icon?: string;
  href?: string;
  children?: SidebarItem[];
  onClick?: () => void;
  badge?: string | number;
  disabled?: boolean;
}

/**
 * Sidebar component props
 */
export interface SidebarProps {
  /** Array of sidebar navigation items */
  items: SidebarItem[];
  /** Active item ID for highlighting */
  activeItem?: string;
  /** Position of the sidebar */
  position?: 'left' | 'right';
  /** Whether sidebar can be collapsed */
  collapsible?: boolean;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Width when expanded (default: 280px) */
  width?: number;
  /** Width when collapsed (default: 64px) */
  collapsedWidth?: number;
  /** Mobile breakpoint (default: 768px) */
  mobileBreakpoint?: number;
  /** Callback when item is selected */
  onItemSelect?: (item: SidebarItem) => void;
  /** Custom logo/header content */
  header?: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
}

/**
 * Get Lucide icon component by name
 */
const getIconByName = (iconName: string): React.ComponentType<any> | null => {
  // Handle common icon name variations
  const normalizedName = iconName
    .replace(/[-_]/g, '')
    .replace(/^(icon|lucide)/i, '')
    .trim();

  // Try exact match first
  if ((LucideIcons as any)[iconName]) {
    return (LucideIcons as any)[iconName];
  }

  // Try normalized name
  const iconKeys = Object.keys(LucideIcons);
  const matchedKey = iconKeys.find(
    key => key.toLowerCase() === normalizedName.toLowerCase()
  );

  if (matchedKey) {
    return (LucideIcons as any)[matchedKey];
  }

  // Default to Circle icon if not found
  return LucideIcons.Circle;
};

/**
 * Sidebar Item Component
 */
interface SidebarItemComponentProps {
  item: SidebarItem;
  level: number;
  isActive: boolean;
  isCollapsed: boolean;
  onItemClick: (item: SidebarItem) => void;
  expandedItems: Set<string>;
  onToggleExpand: (itemId: string) => void;
}

const SidebarItemComponent: React.FC<SidebarItemComponentProps> = ({
  item,
  level,
  isActive,
  isCollapsed,
  onItemClick,
  expandedItems,
  onToggleExpand,
}) => {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.has(item.id);
  const Icon = item.icon ? getIconByName(item.icon) : null;
  const ChevronIcon = isExpanded ? LucideIcons.ChevronDown : LucideIcons.ChevronRight;

  const handleClick = (e: React.MouseEvent) => {
    if (item.disabled) {
      e.preventDefault();
      return;
    }

    if (hasChildren) {
      e.preventDefault();
      onToggleExpand(item.id);
    }

    if (item.onClick) {
      item.onClick();
    }

    onItemClick(item);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (item.disabled) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e as any);
    } else if (hasChildren) {
      if (e.key === 'ArrowRight' && !isExpanded) {
        e.preventDefault();
        onToggleExpand(item.id);
      } else if (e.key === 'ArrowLeft' && isExpanded) {
        e.preventDefault();
        onToggleExpand(item.id);
      }
    }
  };

  const content = (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        isActive && 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300',
        !isActive && 'text-gray-700 dark:text-gray-300',
        item.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
        level > 0 && 'ml-4'
      )}
      style={{ paddingLeft: isCollapsed ? '1rem' : `${1 + level * 0.75}rem` }}
      role="button"
      tabIndex={item.disabled ? -1 : 0}
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-disabled={item.disabled}
      aria-current={isActive ? 'page' : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Icon */}
      {Icon && (
        <div className="flex-shrink-0">
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
      )}

      {/* Label */}
      {!isCollapsed && (
        <>
          <span className="flex-1 truncate font-medium text-sm">
            {item.label}
          </span>

          {/* Badge */}
          {item.badge && (
            <span
              className={cn(
                'px-2 py-0.5 text-xs font-semibold rounded-full',
                isActive
                  ? 'bg-primary-200 dark:bg-primary-800 text-primary-900 dark:text-primary-100'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              )}
              aria-label={`${item.badge} items`}
            >
              {item.badge}
            </span>
          )}

          {/* Chevron for expandable items */}
          {hasChildren && (
            <ChevronIcon
              className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
              aria-hidden="true"
            />
          )}
        </>
      )}
    </div>
  );

  const itemElement = item.href && !hasChildren ? (
    item.href.startsWith('#') ? (
      // Use native anchor link for hash fragments (enables browser scrolling)
      <a
        href={item.href}
        className="block"
        onClick={(e) => {
          // Smooth scroll to anchor
          const targetId = item.href.substring(1);
          const target = document.getElementById(targetId);
          if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
      >
        {content}
      </a>
    ) : (
      // Use React Router Link for route navigation
      <Link to={item.href} className="block">
        {content}
      </Link>
    )
  ) : (
    content
  );

  return (
    <div className="relative">
      {itemElement}

      {/* Children */}
      {hasChildren && !isCollapsed && (
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="py-1 space-y-1">
                {item.children!.map((child) => (
                  <SidebarItemComponent
                    key={child.id}
                    item={child}
                    level={level + 1}
                    isActive={child.id === item.id}
                    isCollapsed={false}
                    onItemClick={onItemClick}
                    expandedItems={expandedItems}
                    onToggleExpand={onToggleExpand}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

/**
 * Production-ready Sidebar Navigation Component
 *
 * Features:
 * - Nested navigation support with expand/collapse
 * - Left/right positioning
 * - Collapsible with smooth animations
 * - Active item highlighting based on route
 * - Icon support using lucide-react
 * - Mobile-responsive with hamburger menu
 * - Full keyboard navigation (Tab, Enter, Space, Arrow keys)
 * - Accessible ARIA attributes
 * - Badge support for notifications
 * - Custom header and footer content
 *
 * @example
 * ```tsx
 * <Sidebar
 *   items={[
 *     { id: 'home', label: 'Home', icon: 'Home', href: '/' },
 *     {
 *       id: 'products',
 *       label: 'Products',
 *       icon: 'Package',
 *       children: [
 *         { id: 'all', label: 'All Products', href: '/products' },
 *         { id: 'new', label: 'New Arrivals', href: '/products/new', badge: '5' }
 *       ]
 *     }
 *   ]}
 *   collapsible
 *   position="left"
 * />
 * ```
 */
export const Sidebar: React.FC<SidebarProps> = ({
  items,
  activeItem: propActiveItem,
  position = 'left',
  collapsible = true,
  defaultCollapsed = false,
  className = '',
  width = 280,
  collapsedWidth = 64,
  mobileBreakpoint = 768,
  onItemSelect,
  header,
  footer,
}) => {
  const location = useLocation();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Determine active item from route or prop
  const activeItemId = useMemo(() => {
    if (propActiveItem) return propActiveItem;

    // Find active item based on current route
    const findActiveItem = (items: SidebarItem[]): string | null => {
      for (const item of items) {
        if (item.href && location.pathname === item.href) {
          return item.id;
        }
        if (item.children) {
          const childActive = findActiveItem(item.children);
          if (childActive) {
            // Auto-expand parent if child is active
            setExpandedItems(prev => new Set(prev).add(item.id));
            return childActive;
          }
        }
      }
      return null;
    };

    return findActiveItem(items);
  }, [propActiveItem, location.pathname, items]);

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < mobileBreakpoint;
      setIsMobile(mobile);
      if (mobile) {
        setIsMobileOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [mobileBreakpoint]);

  // Close mobile menu on route change
  useEffect(() => {
    if (isMobile) {
      setIsMobileOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Handle click outside on mobile
  useEffect(() => {
    if (!isMobile || !isMobileOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsMobileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, isMobileOpen]);

  // Handle Escape key to close mobile menu
  useEffect(() => {
    if (!isMobile || !isMobileOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobile, isMobileOpen]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const toggleExpand = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const handleItemClick = useCallback((item: SidebarItem) => {
    if (onItemSelect) {
      onItemSelect(item);
    }
  }, [onItemSelect]);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileOpen(prev => !prev);
  }, []);

  const currentWidth = isCollapsed ? collapsedWidth : width;

  return (
    <>
      {/* Mobile hamburger button */}
      {isMobile && (
        <button
          onClick={toggleMobileMenu}
          className={cn(
            'fixed top-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg',
            'hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
            position === 'left' ? 'left-4' : 'right-4'
          )}
          aria-label={isMobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileOpen}
        >
          {isMobileOpen ? (
            <LucideIcons.X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          ) : (
            <LucideIcons.Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          )}
        </button>
      )}

      {/* Overlay for mobile */}
      <AnimatePresence>
        {isMobile && isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        ref={sidebarRef}
        initial={false}
        animate={{
          width: isMobile ? (isMobileOpen ? width : 0) : currentWidth,
          x: isMobile && !isMobileOpen
            ? position === 'left' ? -width : width
            : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn(
          'flex flex-col bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-lg',
          position === 'left' ? 'border-r' : 'border-l',
          isMobile ? 'fixed top-0 bottom-0 z-50' : 'sticky top-0 h-screen',
          position === 'left' ? 'left-0' : 'right-0',
          className
        )}
        style={{
          maxWidth: isMobile ? width : undefined,
        }}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Header */}
        {header && (
          <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 p-4">
            {header}
          </div>
        )}

        {/* Collapse toggle button (desktop only) */}
        {!isMobile && collapsible && (
          <div className={cn(
            'flex items-center p-4 border-b border-gray-200 dark:border-gray-800',
            isCollapsed ? 'justify-center' : 'justify-between'
          )}>
            {!isCollapsed && (
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Navigation
              </h2>
            )}
            <button
              onClick={toggleCollapse}
              className={cn(
                'p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                'transition-colors'
              )}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!isCollapsed}
            >
              {position === 'left' ? (
                isCollapsed ? (
                  <LucideIcons.ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <LucideIcons.ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )
              ) : (
                isCollapsed ? (
                  <LucideIcons.ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <LucideIcons.ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )
              )}
            </button>
          </div>
        )}

        {/* Navigation items */}
        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-1"
          role="menu"
        >
          {items.map((item) => (
            <SidebarItemComponent
              key={item.id}
              item={item}
              level={0}
              isActive={item.id === activeItemId}
              isCollapsed={!isMobile && isCollapsed}
              onItemClick={handleItemClick}
              expandedItems={expandedItems}
              onToggleExpand={toggleExpand}
            />
          ))}
        </nav>

        {/* Footer */}
        {footer && !isCollapsed && (
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 p-4">
            {footer}
          </div>
        )}
      </motion.aside>
    </>
  );
};

export default Sidebar;
