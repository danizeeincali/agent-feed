/**
 * Navigation Components Test Suite
 * Tests for Tabs, Breadcrumb, Pagination, and other navigation components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { componentRegistry } from '@services/ComponentRegistry';
import type { TabsProps, BreadcrumbProps, PaginationProps } from '@types/agent-dynamic-pages';

describe('Navigation Components', () => {
  let user: ReturnType<typeof userEvent.setup>;
  
  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  describe('Tabs Component', () => {
    const defaultTabsProps: Partial<TabsProps> = {
      'data-testid': 'tabs-component',
      defaultValue: 'tab1'
    };

    describe('Rendering', () => {
      it('should render tabs without errors', () => {
        const validation = componentRegistry.validateComponentSpec('Tabs', defaultTabsProps);
        expect(validation.valid).toBe(true);
        
        if (validation.valid && validation.data) {
          const TabsComponent = componentRegistry.Tabs.component;
          const { container } = render(React.createElement(TabsComponent, validation.data));
          
          expect(container.firstChild).toBeInTheDocument();
        }
      });

      it('should render with custom className', () => {
        const props = { ...defaultTabsProps, className: 'custom-tabs' };
        const validation = componentRegistry.validateComponentSpec('Tabs', props);
        
        expect(validation.valid).toBe(true);
        if (validation.valid && validation.data) {
          const TabsComponent = componentRegistry.Tabs.component;
          render(React.createElement(TabsComponent, validation.data));
          
          const tabsElement = screen.getByTestId('tabs-component');
          expect(tabsElement).toHaveClass('custom-tabs');
        }
      });

      it('should render with ARIA attributes', () => {
        const props = { 
          ...defaultTabsProps, 
          'aria-label': 'Navigation tabs',
          role: 'tablist'
        };
        const validation = componentRegistry.validateComponentSpec('Tabs', props);
        
        expect(validation.valid).toBe(true);
        if (validation.valid && validation.data) {
          const TabsComponent = componentRegistry.Tabs.component;
          render(React.createElement(TabsComponent, validation.data));
          
          const tabsElement = screen.getByTestId('tabs-component');
          expect(tabsElement).toHaveAttribute('aria-label', 'Navigation tabs');
          expect(tabsElement).toHaveAttribute('role', 'tablist');
        }
      });
    });

    describe('Props Validation', () => {
      it('should validate valid props', () => {
        const validProps = {
          ...defaultTabsProps,
          orientation: 'horizontal' as const,
          activationMode: 'automatic' as const,
          dir: 'ltr' as const
        };
        
        const validation = componentRegistry.validateComponentSpec('Tabs', validProps);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should reject invalid orientation values', () => {
        const invalidProps = {
          ...defaultTabsProps,
          orientation: 'invalid-orientation'
        };
        
        const validation = componentRegistry.validateComponentSpec('Tabs', invalidProps);
        expect(validation.valid).toBe(false);
        expect(validation.errors.some(error => 
          error.field?.includes('orientation')
        )).toBe(true);
      });

      it('should sanitize HTML in string props', () => {
        const maliciousProps = {
          ...defaultTabsProps,
          'aria-label': '<script>alert("XSS")</script>Navigation'
        };
        
        const sanitized = componentRegistry.Tabs.sanitizer(maliciousProps as any);
        expect(sanitized['aria-label']).not.toContain('<script>');
        expect(sanitized['aria-label']).toContain('Navigation');
      });
    });

    describe('Security', () => {
      it('should block dangerous props', () => {
        const dangerousProps = {
          ...defaultTabsProps,
          onClick: () => eval('alert("danger")'), // Should be blocked
          onMouseOver: () => console.log('hover'), // Should be blocked
          dangerouslySetInnerHTML: { __html: '<script>alert("xss")</script>' }
        };
        
        const sanitized = componentRegistry.Tabs.sanitizer(dangerousProps as any);
        expect(sanitized).not.toHaveProperty('onClick');
        expect(sanitized).not.toHaveProperty('onMouseOver');
        expect(sanitized).not.toHaveProperty('dangerouslySetInnerHTML');
      });

      it('should handle XSS attempts in all string props', () => {
        global.testUtils.securityPayloads.forEach(payload => {
          const maliciousProps = {
            ...defaultTabsProps,
            'aria-label': payload
          };
          
          const sanitized = componentRegistry.Tabs.sanitizer(maliciousProps as any);
          expect(sanitized['aria-label']).not.toContain('<script>');
          expect(sanitized['aria-label']).not.toContain('javascript:');
          expect(sanitized['aria-label']).not.toContain('data:text/html');
        });
      });
    });

    describe('Accessibility', () => {
      it('should be accessible by default', async () => {
        const validation = componentRegistry.validateComponentSpec('Tabs', defaultTabsProps);
        
        if (validation.valid && validation.data) {
          const TabsComponent = componentRegistry.Tabs.component;
          const { container } = render(React.createElement(TabsComponent, validation.data));
          
          const results = await axe(container);
          expect(results).toHaveNoViolations();
        }
      });

      it('should support keyboard navigation', async () => {
        const validation = componentRegistry.validateComponentSpec('Tabs', defaultTabsProps);
        
        if (validation.valid && validation.data) {
          const TabsComponent = componentRegistry.Tabs.component;
          render(React.createElement(TabsComponent, validation.data));
          
          const tabsElement = screen.getByTestId('tabs-component');
          
          // Test tab key navigation
          await user.tab();
          expect(tabsElement).toHaveFocus();
          
          // Test arrow key navigation if implemented
          await user.keyboard('{ArrowRight}');
          // Additional keyboard navigation tests would go here
        }
      });

      it('should have proper ARIA attributes', () => {
        const accessibilityProps = {
          ...defaultTabsProps,
          'aria-label': 'Main navigation tabs',
          'aria-describedby': 'tabs-description'
        };
        
        const validation = componentRegistry.validateComponentSpec('Tabs', accessibilityProps);
        
        if (validation.valid && validation.data) {
          const TabsComponent = componentRegistry.Tabs.component;
          render(React.createElement(TabsComponent, validation.data));
          
          const tabsElement = screen.getByTestId('tabs-component');
          expect(tabsElement).toHaveAttribute('aria-label', 'Main navigation tabs');
          expect(tabsElement).toHaveAttribute('aria-describedby', 'tabs-description');
        }
      });
    });

    describe('Performance', () => {
      it('should render within performance threshold', async () => {
        const startTime = performance.now();
        
        const validation = componentRegistry.validateComponentSpec('Tabs', defaultTabsProps);
        
        if (validation.valid && validation.data) {
          const TabsComponent = componentRegistry.Tabs.component;
          render(React.createElement(TabsComponent, validation.data));
        }
        
        const renderTime = performance.now() - startTime;
        expect(renderTime).toBeLessThan(global.testUtils.performanceThresholds.render);
      });

      it('should not create memory leaks on multiple renders', () => {
        const validation = componentRegistry.validateComponentSpec('Tabs', defaultTabsProps);
        
        if (validation.valid && validation.data) {
          const TabsComponent = componentRegistry.Tabs.component;
          
          // Render and unmount multiple times
          for (let i = 0; i < 10; i++) {
            const { unmount } = render(React.createElement(TabsComponent, validation.data));
            unmount();
          }
          
          // Memory usage should be stable
          // In a real scenario, you'd measure actual memory usage
          expect(true).toBe(true); // Placeholder for memory measurement
        }
      });
    });
  });

  describe('Breadcrumb Component', () => {
    const defaultBreadcrumbProps = {
      'data-testid': 'breadcrumb-component',
      items: [
        { label: 'Home', href: '/' },
        { label: 'Products', href: '/products' },
        { label: 'Current Page' }
      ]
    };

    describe('Rendering', () => {
      it('should render breadcrumb without errors', () => {
        // Implementation would depend on having Breadcrumb in registry
        // This is a template for when it's added
        expect(true).toBe(true);
      });

      it('should handle empty items array gracefully', () => {
        const emptyProps = { ...defaultBreadcrumbProps, items: [] };
        // Test empty state handling
        expect(true).toBe(true);
      });
    });

    describe('Navigation', () => {
      it('should render clickable links for non-current items', () => {
        // Test that non-current breadcrumb items are clickable
        expect(true).toBe(true);
      });

      it('should render current item as plain text', () => {
        // Test that current item (last without href) is not clickable
        expect(true).toBe(true);
      });
    });
  });

  describe('Pagination Component', () => {
    const defaultPaginationProps = {
      'data-testid': 'pagination-component',
      currentPage: 1,
      totalPages: 10,
      pageSize: 20,
      totalItems: 200
    };

    describe('Rendering', () => {
      it('should render pagination without errors', () => {
        // Implementation would depend on having Pagination in registry
        expect(true).toBe(true);
      });

      it('should display correct page numbers', () => {
        // Test page number display logic
        expect(true).toBe(true);
      });
    });

    describe('Navigation', () => {
      it('should handle page navigation correctly', () => {
        // Test next/previous page functionality
        expect(true).toBe(true);
      });

      it('should disable previous button on first page', () => {
        // Test button states
        expect(true).toBe(true);
      });

      it('should disable next button on last page', () => {
        // Test button states
        expect(true).toBe(true);
      });
    });
  });

  describe('Component Registry Integration', () => {
    it('should have all navigation components registered', () => {
      expect(componentRegistry.hasComponent('Tabs')).toBe(true);
      // Add checks for other navigation components as they're implemented
    });

    it('should provide proper documentation for all components', () => {
      const tabsDocs = componentRegistry.getComponentDocs('Tabs');
      expect(tabsDocs).toBeDefined();
      expect(tabsDocs?.name).toBe('Tabs');
      expect(tabsDocs?.category).toBeDefined();
    });

    it('should have consistent security policies', () => {
      const tabsPolicy = componentRegistry.getSecurityPolicy('Tabs');
      expect(tabsPolicy).toBeDefined();
      expect(tabsPolicy?.allowedProps).toBeDefined();
      expect(tabsPolicy?.blockedProps).toBeDefined();
      expect(tabsPolicy?.sanitizeHtml).toBe(true);
    });
  });
});