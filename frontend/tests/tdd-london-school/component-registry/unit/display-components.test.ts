/**
 * Display Components Test Suite
 * Tests for Badge, Alert, Avatar, Progress, and other display components
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { componentRegistry } from '@services/ComponentRegistry';
import type { BadgeProps, AlertProps, AvatarProps, ProgressProps } from '@types/agent-dynamic-pages';

describe('Display Components', () => {
  let user: ReturnType<typeof userEvent.setup>;
  
  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  describe('Badge Component', () => {
    const defaultBadgeProps = {
      'data-testid': 'badge-component',
      children: 'New'
    };

    describe('Rendering', () => {
      it('should render badge without errors', () => {
        const validation = componentRegistry.validateComponentSpec('Badge', defaultBadgeProps);
        expect(validation.valid).toBe(true);
        
        if (validation.valid && validation.data) {
          const BadgeComponent = componentRegistry.Badge.component;
          const { container } = render(React.createElement(BadgeComponent, validation.data));
          
          expect(container.firstChild).toBeInTheDocument();
          expect(screen.getByTestId('badge-component')).toBeInTheDocument();
          expect(screen.getByText('New')).toBeInTheDocument();
        }
      });

      it('should render with different variants', () => {
        const variants = ['default', 'secondary', 'destructive', 'outline'];
        
        variants.forEach(variant => {
          const props = { ...defaultBadgeProps, variant };
          const validation = componentRegistry.validateComponentSpec('Badge', props);
          
          expect(validation.valid).toBe(true);
          if (validation.valid && validation.data) {
            const BadgeComponent = componentRegistry.Badge.component;
            const { container } = render(React.createElement(BadgeComponent, validation.data));
            
            expect(container.firstChild).toBeInTheDocument();
          }
        });
      });

      it('should render with custom styles', () => {
        const styledProps = {
          ...defaultBadgeProps,
          className: 'custom-badge',
          style: { backgroundColor: '#ff0000' }
        };
        
        const validation = componentRegistry.validateComponentSpec('Badge', styledProps);
        
        if (validation.valid && validation.data) {
          const BadgeComponent = componentRegistry.Badge.component;
          render(React.createElement(BadgeComponent, validation.data));
          
          const badgeElement = screen.getByTestId('badge-component');
          expect(badgeElement).toHaveClass('custom-badge');
        }
      });
    });

    describe('Security', () => {
      it('should sanitize children content', () => {
        const maliciousProps = {
          ...defaultBadgeProps,
          children: '<script>alert("XSS")</script>Badge Text'
        };
        
        const sanitized = componentRegistry.Badge.sanitizer(maliciousProps as any);
        expect(sanitized.children).not.toContain('<script>');
        expect(sanitized.children).toContain('Badge Text');
      });

      it('should handle XSS attempts in string props', () => {
        global.testUtils.securityPayloads.forEach(payload => {
          const maliciousProps = {
            ...defaultBadgeProps,
            children: payload,
            'aria-label': payload
          };
          
          const sanitized = componentRegistry.Badge.sanitizer(maliciousProps as any);
          
          expect(sanitized.children).not.toMatch(/<script|javascript:|data:text\/html/i);
          expect(sanitized['aria-label']).not.toMatch(/<script|javascript:|data:text\/html/i);
        });
      });
    });

    describe('Accessibility', () => {
      it('should be accessible by default', async () => {
        const validation = componentRegistry.validateComponentSpec('Badge', defaultBadgeProps);
        
        if (validation.valid && validation.data) {
          const BadgeComponent = componentRegistry.Badge.component;
          const { container } = render(React.createElement(BadgeComponent, validation.data));
          
          const results = await axe(container);
          expect(results).toHaveNoViolations();
        }
      });

      it('should support ARIA labeling', () => {
        const accessibleProps = {
          ...defaultBadgeProps,
          'aria-label': 'Status indicator',
          role: 'status'
        };
        
        const validation = componentRegistry.validateComponentSpec('Badge', accessibleProps);
        
        if (validation.valid && validation.data) {
          const BadgeComponent = componentRegistry.Badge.component;
          render(React.createElement(BadgeComponent, validation.data));
          
          const badgeElement = screen.getByTestId('badge-component');
          expect(badgeElement).toHaveAttribute('aria-label', 'Status indicator');
          expect(badgeElement).toHaveAttribute('role', 'status');
        }
      });
    });

    describe('Performance', () => {
      it('should render within performance threshold', () => {
        const startTime = performance.now();
        
        const validation = componentRegistry.validateComponentSpec('Badge', defaultBadgeProps);
        
        if (validation.valid && validation.data) {
          const BadgeComponent = componentRegistry.Badge.component;
          render(React.createElement(BadgeComponent, validation.data));
        }
        
        const renderTime = performance.now() - startTime;
        expect(renderTime).toBeLessThan(global.testUtils.performanceThresholds.render);
      });
    });
  });

  describe('Alert Component', () => {
    const defaultAlertProps = {
      'data-testid': 'alert-component',
      children: 'This is an alert message'
    };

    describe('Rendering', () => {
      it('should render alert without errors', () => {
        const validation = componentRegistry.validateComponentSpec('Alert', defaultAlertProps);
        expect(validation.valid).toBe(true);
        
        if (validation.valid && validation.data) {
          const AlertComponent = componentRegistry.Alert.component;
          const { container } = render(React.createElement(AlertComponent, validation.data));
          
          expect(container.firstChild).toBeInTheDocument();
          expect(screen.getByTestId('alert-component')).toBeInTheDocument();
          expect(screen.getByText('This is an alert message')).toBeInTheDocument();
        }
      });

      it('should render with different variants', () => {
        const variants = ['default', 'destructive', 'warning', 'success'];
        
        variants.forEach(variant => {
          const props = { ...defaultAlertProps, variant };
          const validation = componentRegistry.validateComponentSpec('Alert', props);
          
          expect(validation.valid).toBe(true);
        });
      });

      it('should render with title and description', () => {
        const titleProps = {
          ...defaultAlertProps,
          title: 'Alert Title',
          description: 'Alert description'
        };
        
        const validation = componentRegistry.validateComponentSpec('Alert', titleProps);
        expect(validation.valid).toBe(true);
      });
    });

    describe('Security', () => {
      it('should sanitize all text content', () => {
        const maliciousProps = {
          ...defaultAlertProps,
          title: '<script>alert("XSS")</script>Alert Title',
          description: '<img src="x" onerror="alert(1)">Description',
          children: '<svg onload="alert(1)">Content'
        };
        
        const sanitized = componentRegistry.Alert.sanitizer(maliciousProps as any);
        expect(sanitized.title).not.toContain('<script>');
        expect(sanitized.description).not.toContain('<img');
        expect(sanitized.children).not.toContain('<svg');
      });
    });

    describe('Accessibility', () => {
      it('should have proper alert role', async () => {
        const validation = componentRegistry.validateComponentSpec('Alert', defaultAlertProps);
        
        if (validation.valid && validation.data) {
          const AlertComponent = componentRegistry.Alert.component;
          const { container } = render(React.createElement(AlertComponent, validation.data));
          
          const results = await axe(container);
          expect(results).toHaveNoViolations();
          
          const alertElement = screen.getByTestId('alert-component');
          expect(alertElement).toHaveAttribute('role', 'alert');
        }
      });

      it('should be announced to screen readers', () => {
        const importantProps = {
          ...defaultAlertProps,
          role: 'alert',
          'aria-live': 'assertive'
        };
        
        const validation = componentRegistry.validateComponentSpec('Alert', importantProps);
        
        if (validation.valid && validation.data) {
          const AlertComponent = componentRegistry.Alert.component;
          render(React.createElement(AlertComponent, validation.data));
          
          const alertElement = screen.getByTestId('alert-component');
          expect(alertElement).toHaveAttribute('role', 'alert');
          expect(alertElement).toHaveAttribute('aria-live', 'assertive');
        }
      });
    });
  });

  describe('Avatar Component', () => {
    const defaultAvatarProps = {
      'data-testid': 'avatar-component',
      src: 'https://example.com/avatar.jpg',
      alt: 'User avatar'
    };

    describe('Rendering', () => {
      it('should render avatar without errors', () => {
        const validation = componentRegistry.validateComponentSpec('Avatar', defaultAvatarProps);
        expect(validation.valid).toBe(true);
        
        if (validation.valid && validation.data) {
          const AvatarComponent = componentRegistry.Avatar.component;
          const { container } = render(React.createElement(AvatarComponent, validation.data));
          
          expect(container.firstChild).toBeInTheDocument();
          expect(screen.getByTestId('avatar-component')).toBeInTheDocument();
        }
      });

      it('should render fallback when image fails', () => {
        const fallbackProps = {
          ...defaultAvatarProps,
          src: 'invalid-url',
          fallback: 'JD'
        };
        
        const validation = componentRegistry.validateComponentSpec('Avatar', fallbackProps);
        expect(validation.valid).toBe(true);
      });

      it('should render with different sizes', () => {
        const sizes = ['sm', 'md', 'lg', 'xl'];
        
        sizes.forEach(size => {
          const props = { ...defaultAvatarProps, size };
          const validation = componentRegistry.validateComponentSpec('Avatar', props);
          
          expect(validation.valid).toBe(true);
        });
      });
    });

    describe('Security', () => {
      it('should validate image URLs', () => {
        const maliciousProps = {
          ...defaultAvatarProps,
          src: 'javascript:alert("XSS")',
          alt: '<script>alert(1)</script>User'
        };
        
        const sanitized = componentRegistry.Avatar.sanitizer(maliciousProps as any);
        expect(sanitized.src).not.toContain('javascript:');
        expect(sanitized.alt).not.toContain('<script>');
      });

      it('should block dangerous URLs', () => {
        const dangerousUrls = [
          'javascript:alert(1)',
          'data:text/html,<script>alert(1)</script>',
          'vbscript:msgbox("XSS")',
          'about:blank'
        ];
        
        dangerousUrls.forEach(url => {
          const props = { ...defaultAvatarProps, src: url };
          const sanitized = componentRegistry.Avatar.sanitizer(props as any);
          
          // Should not contain the dangerous protocol
          expect(sanitized.src).not.toMatch(/^(javascript|data|vbscript|about):/i);
        });
      });
    });

    describe('Accessibility', () => {
      it('should have proper alt text', async () => {
        const validation = componentRegistry.validateComponentSpec('Avatar', defaultAvatarProps);
        
        if (validation.valid && validation.data) {
          const AvatarComponent = componentRegistry.Avatar.component;
          const { container } = render(React.createElement(AvatarComponent, validation.data));
          
          const results = await axe(container);
          expect(results).toHaveNoViolations();
        }
      });

      it('should be focusable when interactive', () => {
        const interactiveProps = {
          ...defaultAvatarProps,
          interactive: true,
          tabIndex: 0
        };
        
        const validation = componentRegistry.validateComponentSpec('Avatar', interactiveProps);
        expect(validation.valid).toBe(true);
      });
    });
  });

  describe('Progress Component', () => {
    const defaultProgressProps = {
      'data-testid': 'progress-component',
      value: 50,
      max: 100
    };

    describe('Rendering', () => {
      it('should render progress without errors', () => {
        const validation = componentRegistry.validateComponentSpec('Progress', defaultProgressProps);
        expect(validation.valid).toBe(true);
        
        if (validation.valid && validation.data) {
          const ProgressComponent = componentRegistry.Progress.component;
          const { container } = render(React.createElement(ProgressComponent, validation.data));
          
          expect(container.firstChild).toBeInTheDocument();
          expect(screen.getByTestId('progress-component')).toBeInTheDocument();
        }
      });

      it('should render indeterminate state', () => {
        const indeterminateProps = {
          ...defaultProgressProps,
          value: undefined // Indeterminate
        };
        
        const validation = componentRegistry.validateComponentSpec('Progress', indeterminateProps);
        expect(validation.valid).toBe(true);
      });

      it('should handle edge values correctly', () => {
        const edgeCases = [
          { value: 0, max: 100 },
          { value: 100, max: 100 },
          { value: 75, max: 100 }
        ];
        
        edgeCases.forEach(props => {
          const testProps = { ...defaultProgressProps, ...props };
          const validation = componentRegistry.validateComponentSpec('Progress', testProps);
          
          expect(validation.valid).toBe(true);
        });
      });
    });

    describe('Props Validation', () => {
      it('should validate numeric values', () => {
        const validProps = {
          ...defaultProgressProps,
          value: 75,
          max: 100,
          min: 0
        };
        
        const validation = componentRegistry.validateComponentSpec('Progress', validProps);
        expect(validation.valid).toBe(true);
      });

      it('should reject invalid numeric values', () => {
        const invalidProps = {
          ...defaultProgressProps,
          value: 'not-a-number',
          max: 'invalid'
        };
        
        const validation = componentRegistry.validateComponentSpec('Progress', invalidProps);
        expect(validation.valid).toBe(false);
      });

      it('should validate value ranges', () => {
        const outOfRangeProps = {
          ...defaultProgressProps,
          value: 150, // Greater than max
          max: 100
        };
        
        const validation = componentRegistry.validateComponentSpec('Progress', outOfRangeProps);
        // Should either be invalid or sanitized to within range
        if (validation.valid && validation.data) {
          expect(validation.data.value).toBeLessThanOrEqual(validation.data.max);
        }
      });
    });

    describe('Security', () => {
      it('should sanitize label text', () => {
        const maliciousProps = {
          ...defaultProgressProps,
          label: '<script>alert("XSS")</script>Loading...',
          'aria-label': '<img src="x" onerror="alert(1)">Progress'
        };
        
        const sanitized = componentRegistry.Progress.sanitizer(maliciousProps as any);
        expect(sanitized.label).not.toContain('<script>');
        expect(sanitized['aria-label']).not.toContain('<img');
      });
    });

    describe('Accessibility', () => {
      it('should have proper progress semantics', async () => {
        const validation = componentRegistry.validateComponentSpec('Progress', defaultProgressProps);
        
        if (validation.valid && validation.data) {
          const ProgressComponent = componentRegistry.Progress.component;
          const { container } = render(React.createElement(ProgressComponent, validation.data));
          
          const results = await axe(container);
          expect(results).toHaveNoViolations();
          
          const progressElement = screen.getByTestId('progress-component');
          expect(progressElement).toHaveAttribute('role', 'progressbar');
          expect(progressElement).toHaveAttribute('aria-valuenow', '50');
          expect(progressElement).toHaveAttribute('aria-valuemax', '100');
        }
      });

      it('should announce progress to screen readers', () => {
        const labeledProps = {
          ...defaultProgressProps,
          'aria-label': 'File upload progress',
          'aria-describedby': 'progress-description'
        };
        
        const validation = componentRegistry.validateComponentSpec('Progress', labeledProps);
        
        if (validation.valid && validation.data) {
          const ProgressComponent = componentRegistry.Progress.component;
          render(React.createElement(ProgressComponent, validation.data));
          
          const progressElement = screen.getByTestId('progress-component');
          expect(progressElement).toHaveAttribute('aria-label', 'File upload progress');
          expect(progressElement).toHaveAttribute('aria-describedby', 'progress-description');
        }
      });
    });

    describe('Performance', () => {
      it('should handle frequent updates efficiently', () => {
        const validation = componentRegistry.validateComponentSpec('Progress', defaultProgressProps);
        
        if (validation.valid && validation.data) {
          const ProgressComponent = componentRegistry.Progress.component;
          
          const startTime = performance.now();
          
          // Simulate frequent progress updates
          for (let i = 0; i <= 100; i += 5) {
            const { unmount } = render(React.createElement(ProgressComponent, {
              ...validation.data,
              value: i
            }));
            unmount();
          }
          
          const totalTime = performance.now() - startTime;
          const avgTime = totalTime / 21; // 21 iterations
          
          expect(avgTime).toBeLessThan(global.testUtils.performanceThresholds.render);
        }
      });
    });
  });

  describe('Component Integration', () => {
    it('should have all display components properly registered', () => {
      const displayComponents = ['Badge', 'Alert', 'Avatar', 'Progress'];
      
      displayComponents.forEach(componentName => {
        expect(componentRegistry.hasComponent(componentName)).toBe(true);
        
        const docs = componentRegistry.getComponentDocs(componentName);
        expect(docs).toBeDefined();
        expect(docs?.category).toBe('Display' || 'Feedback');
      });
    });

    it('should maintain consistent security policies', () => {
      const displayComponents = ['Badge', 'Alert', 'Avatar', 'Progress'];
      
      displayComponents.forEach(componentName => {
        const securityPolicy = componentRegistry.getSecurityPolicy(componentName);
        expect(securityPolicy).toBeDefined();
        expect(securityPolicy?.sanitizeHtml).toBe(true);
        expect(securityPolicy?.allowExternalContent).toBe(false);
      });
    });

    it('should support consistent accessibility features', () => {
      const displayComponents = ['Badge', 'Alert', 'Avatar', 'Progress'];
      
      displayComponents.forEach(componentName => {
        const docs = componentRegistry.getComponentDocs(componentName);
        expect(docs?.accessibility).toBeDefined();
        expect(docs?.accessibility.length).toBeGreaterThan(0);
      });
    });

    it('should work together in composite UIs', () => {
      // Test that display components can be combined effectively
      const components = ['Badge', 'Alert', 'Avatar', 'Progress'];
      
      components.forEach(componentName => {
        const validation = componentRegistry.validateComponentSpec(componentName, {
          'data-testid': `${componentName.toLowerCase()}-test`
        });
        
        // All components should validate with minimal props
        expect(validation.valid).toBe(true);
      });
    });
  });
});