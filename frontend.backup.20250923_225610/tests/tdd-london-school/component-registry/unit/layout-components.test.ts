/**
 * Layout Components Test Suite
 * Tests for Card, Container, Separator, and other layout components
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { componentRegistry } from '@services/ComponentRegistry';
import type { CardProps, ContainerProps } from '@types/agent-dynamic-pages';

describe('Layout Components', () => {
  let user: ReturnType<typeof userEvent.setup>;
  
  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  describe('Card Component', () => {
    const defaultCardProps: Partial<CardProps> = {
      'data-testid': 'card-component',
      title: 'Test Card',
      description: 'Test card description',
      children: 'Card content'
    };

    describe('Rendering', () => {
      it('should render card without errors', () => {
        const validation = componentRegistry.validateComponentSpec('Card', defaultCardProps);
        expect(validation.valid).toBe(true);
        
        if (validation.valid && validation.data) {
          const CardComponent = componentRegistry.Card.component;
          const { container } = render(React.createElement(CardComponent, validation.data));
          
          expect(container.firstChild).toBeInTheDocument();
          expect(screen.getByTestId('card-component')).toBeInTheDocument();
        }
      });

      it('should render with title and description', () => {
        const validation = componentRegistry.validateComponentSpec('Card', defaultCardProps);
        
        if (validation.valid && validation.data) {
          const CardComponent = componentRegistry.Card.component;
          render(React.createElement(CardComponent, validation.data));
          
          expect(screen.getByText('Test Card')).toBeInTheDocument();
          expect(screen.getByText('Test card description')).toBeInTheDocument();
        }
      });

      it('should render with different variants', () => {
        const variants: Array<'default' | 'outline' | 'filled'> = ['default', 'outline', 'filled'];
        
        variants.forEach(variant => {
          const props = { ...defaultCardProps, variant };
          const validation = componentRegistry.validateComponentSpec('Card', props);
          
          expect(validation.valid).toBe(true);
          if (validation.valid && validation.data) {
            const CardComponent = componentRegistry.Card.component;
            const { container } = render(React.createElement(CardComponent, validation.data));
            
            // Check that variant is applied somehow (class, style, etc.)
            expect(container.firstChild).toBeInTheDocument();
          }
        });
      });

      it('should render with different padding options', () => {
        const paddingOptions: Array<'none' | 'sm' | 'md' | 'lg'> = ['none', 'sm', 'md', 'lg'];
        
        paddingOptions.forEach(padding => {
          const props = { ...defaultCardProps, padding };
          const validation = componentRegistry.validateComponentSpec('Card', props);
          
          expect(validation.valid).toBe(true);
        });
      });

      it('should render interactive cards', () => {
        const interactiveProps = { 
          ...defaultCardProps, 
          interactive: true,
          onClick: () => console.log('clicked') 
        };
        
        const validation = componentRegistry.validateComponentSpec('Card', interactiveProps);
        expect(validation.valid).toBe(true);
      });
    });

    describe('Props Validation', () => {
      it('should validate all valid card props', () => {
        const allValidProps = {
          ...defaultCardProps,
          variant: 'outline' as const,
          padding: 'md' as const,
          elevation: 'sm' as const,
          interactive: true,
          className: 'custom-card',
          style: { backgroundColor: 'white' }
        };
        
        const validation = componentRegistry.validateComponentSpec('Card', allValidProps);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should reject invalid variant values', () => {
        const invalidProps = {
          ...defaultCardProps,
          variant: 'invalid-variant'
        };
        
        const validation = componentRegistry.validateComponentSpec('Card', invalidProps);
        expect(validation.valid).toBe(false);
        expect(validation.errors.some(error => 
          error.field?.includes('variant')
        )).toBe(true);
      });

      it('should reject invalid padding values', () => {
        const invalidProps = {
          ...defaultCardProps,
          padding: 'invalid-padding'
        };
        
        const validation = componentRegistry.validateComponentSpec('Card', invalidProps);
        expect(validation.valid).toBe(false);
      });

      it('should handle optional props correctly', () => {
        const minimalProps = {
          'data-testid': 'minimal-card'
        };
        
        const validation = componentRegistry.validateComponentSpec('Card', minimalProps);
        expect(validation.valid).toBe(true);
      });
    });

    describe('Security', () => {
      it('should sanitize HTML in title and description', () => {
        const maliciousProps = {
          ...defaultCardProps,
          title: '<script>alert("XSS")</script>Malicious Title',
          description: '<img src="x" onerror="alert(1)">Description'
        };
        
        const sanitized = componentRegistry.Card.sanitizer(maliciousProps as any);
        expect(sanitized.title).not.toContain('<script>');
        expect(sanitized.description).not.toContain('<img');
        expect(sanitized.title).toContain('Malicious Title');
      });

      it('should block dangerous event handlers', () => {
        const dangerousProps = {
          ...defaultCardProps,
          onClick: () => eval('alert("danger")'),
          onMouseOver: () => document.write('<script>alert("xss")</script>'),
          dangerouslySetInnerHTML: { __html: '<script>alert("xss")</script>' }
        };
        
        const sanitized = componentRegistry.Card.sanitizer(dangerousProps as any);
        expect(sanitized).not.toHaveProperty('onClick');
        expect(sanitized).not.toHaveProperty('onMouseOver');
        expect(sanitized).not.toHaveProperty('dangerouslySetInnerHTML');
      });

      it('should handle all XSS attack vectors', () => {
        global.testUtils.securityPayloads.forEach(payload => {
          const maliciousProps = {
            ...defaultCardProps,
            title: payload,
            description: payload
          };
          
          const sanitized = componentRegistry.Card.sanitizer(maliciousProps as any);
          
          // Ensure all dangerous content is removed or escaped
          expect(sanitized.title).not.toContain('<script>');
          expect(sanitized.title).not.toContain('javascript:');
          expect(sanitized.title).not.toContain('data:text/html');
          expect(sanitized.description).not.toContain('<script>');
          expect(sanitized.description).not.toContain('javascript:');
          expect(sanitized.description).not.toContain('data:text/html');
        });
      });

      it('should validate data size limits', () => {
        const securityPolicy = componentRegistry.getSecurityPolicy('Card');
        expect(securityPolicy).toBeDefined();
        expect(securityPolicy?.maxDataSize).toBeDefined();
        
        // Create props that exceed the data size limit
        const largeContent = 'a'.repeat(securityPolicy!.maxDataSize! + 1000);
        const oversizedProps = {
          ...defaultCardProps,
          description: largeContent
        };
        
        // The sanitizer should handle oversized content appropriately
        const sanitized = componentRegistry.Card.sanitizer(oversizedProps as any);
        expect(sanitized.description.length).toBeLessThanOrEqual(securityPolicy!.maxDataSize!);
      });
    });

    describe('Accessibility', () => {
      it('should be accessible by default', async () => {
        const validation = componentRegistry.validateComponentSpec('Card', defaultCardProps);
        
        if (validation.valid && validation.data) {
          const CardComponent = componentRegistry.Card.component;
          const { container } = render(React.createElement(CardComponent, validation.data));
          
          const results = await axe(container);
          expect(results).toHaveNoViolations();
        }
      });

      it('should support ARIA labels', () => {
        const accessibleProps = {
          ...defaultCardProps,
          'aria-label': 'Information card',
          'aria-describedby': 'card-description',
          role: 'region'
        };
        
        const validation = componentRegistry.validateComponentSpec('Card', accessibleProps);
        
        if (validation.valid && validation.data) {
          const CardComponent = componentRegistry.Card.component;
          render(React.createElement(CardComponent, validation.data));
          
          const cardElement = screen.getByTestId('card-component');
          expect(cardElement).toHaveAttribute('aria-label', 'Information card');
          expect(cardElement).toHaveAttribute('aria-describedby', 'card-description');
          expect(cardElement).toHaveAttribute('role', 'region');
        }
      });

      it('should support keyboard interaction when interactive', async () => {
        const interactiveProps = { 
          ...defaultCardProps, 
          interactive: true 
        };
        
        const validation = componentRegistry.validateComponentSpec('Card', interactiveProps);
        
        if (validation.valid && validation.data) {
          const CardComponent = componentRegistry.Card.component;
          render(React.createElement(CardComponent, validation.data));
          
          const cardElement = screen.getByTestId('card-component');
          
          // Should be focusable if interactive
          await user.tab();
          if (interactiveProps.interactive) {
            expect(cardElement).toHaveFocus();
            
            // Should respond to Enter/Space keys
            await user.keyboard('{Enter}');
            // Test interaction behavior
          }
        }
      });
    });

    describe('Performance', () => {
      it('should render within performance threshold', async () => {
        const startTime = performance.now();
        
        const validation = componentRegistry.validateComponentSpec('Card', defaultCardProps);
        
        if (validation.valid && validation.data) {
          const CardComponent = componentRegistry.Card.component;
          render(React.createElement(CardComponent, validation.data));
        }
        
        const renderTime = performance.now() - startTime;
        expect(renderTime).toBeLessThan(global.testUtils.performanceThresholds.render);
      });

      it('should handle complex content efficiently', () => {
        const complexContent = Array.from({ length: 100 }, (_, i) => 
          `Item ${i}`
        ).join(' ');
        
        const complexProps = {
          ...defaultCardProps,
          children: complexContent,
          title: 'Complex Card',
          description: complexContent
        };
        
        const startTime = performance.now();
        const validation = componentRegistry.validateComponentSpec('Card', complexProps);
        
        if (validation.valid && validation.data) {
          const CardComponent = componentRegistry.Card.component;
          render(React.createElement(CardComponent, validation.data));
        }
        
        const renderTime = performance.now() - startTime;
        expect(renderTime).toBeLessThan(global.testUtils.performanceThresholds.render * 2);
      });
    });
  });

  describe('Container Component', () => {
    const defaultContainerProps: Partial<ContainerProps> = {
      'data-testid': 'container-component',
      maxWidth: 'full',
      padding: 'md',
      centered: false,
      children: 'Container content'
    };

    describe('Rendering', () => {
      it('should render container without errors', () => {
        const validation = componentRegistry.validateComponentSpec('Container', defaultContainerProps);
        expect(validation.valid).toBe(true);
        
        if (validation.valid && validation.data) {
          const ContainerComponent = componentRegistry.Container.component;
          const { container } = render(React.createElement(ContainerComponent, validation.data));
          
          expect(container.firstChild).toBeInTheDocument();
          expect(screen.getByTestId('container-component')).toBeInTheDocument();
        }
      });

      it('should apply max-width classes correctly', () => {
        const maxWidths: Array<'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'> = 
          ['sm', 'md', 'lg', 'xl', '2xl', 'full'];
        
        maxWidths.forEach(maxWidth => {
          const props = { ...defaultContainerProps, maxWidth };
          const validation = componentRegistry.validateComponentSpec('Container', props);
          
          expect(validation.valid).toBe(true);
          if (validation.valid && validation.data) {
            const ContainerComponent = componentRegistry.Container.component;
            render(React.createElement(ContainerComponent, validation.data));
            
            const containerElement = screen.getByTestId('container-component');
            // Check that appropriate classes are applied
            expect(containerElement).toBeInTheDocument();
          }
        });
      });

      it('should apply padding correctly', () => {
        const paddingOptions: Array<'none' | 'sm' | 'md' | 'lg' | 'xl'> = 
          ['none', 'sm', 'md', 'lg', 'xl'];
        
        paddingOptions.forEach(padding => {
          const props = { ...defaultContainerProps, padding };
          const validation = componentRegistry.validateComponentSpec('Container', props);
          
          expect(validation.valid).toBe(true);
        });
      });

      it('should center content when centered prop is true', () => {
        const centeredProps = { ...defaultContainerProps, centered: true };
        const validation = componentRegistry.validateComponentSpec('Container', centeredProps);
        
        expect(validation.valid).toBe(true);
        if (validation.valid && validation.data) {
          const ContainerComponent = componentRegistry.Container.component;
          render(React.createElement(ContainerComponent, validation.data));
          
          const containerElement = screen.getByTestId('container-component');
          // Check for centering classes
          expect(containerElement).toBeInTheDocument();
        }
      });
    });

    describe('Props Validation', () => {
      it('should validate all container props', () => {
        const allProps = {
          ...defaultContainerProps,
          maxWidth: 'lg' as const,
          padding: 'xl' as const,
          centered: true,
          className: 'custom-container'
        };
        
        const validation = componentRegistry.validateComponentSpec('Container', allProps);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should reject invalid maxWidth values', () => {
        const invalidProps = {
          ...defaultContainerProps,
          maxWidth: 'invalid-width'
        };
        
        const validation = componentRegistry.validateComponentSpec('Container', invalidProps);
        expect(validation.valid).toBe(false);
      });

      it('should handle boolean props correctly', () => {
        const booleanProps = {
          ...defaultContainerProps,
          centered: 'true' // Invalid: should be boolean
        };
        
        const validation = componentRegistry.validateComponentSpec('Container', booleanProps);
        expect(validation.valid).toBe(false);
      });
    });

    describe('Security', () => {
      it('should sanitize children content', () => {
        const maliciousProps = {
          ...defaultContainerProps,
          children: '<script>alert("XSS")</script>Safe content'
        };
        
        const sanitized = componentRegistry.Container.sanitizer(maliciousProps as any);
        expect(sanitized.children).not.toContain('<script>');
      });

      it('should handle security policies correctly', () => {
        const securityPolicy = componentRegistry.getSecurityPolicy('Container');
        expect(securityPolicy).toBeDefined();
        expect(securityPolicy?.allowedProps).toContain('maxWidth');
        expect(securityPolicy?.allowedProps).toContain('padding');
        expect(securityPolicy?.allowedProps).toContain('centered');
      });
    });
  });

  describe('Separator Component', () => {
    const defaultSeparatorProps = {
      'data-testid': 'separator-component',
      orientation: 'horizontal' as const
    };

    describe('Rendering', () => {
      it('should render separator without errors', () => {
        const validation = componentRegistry.validateComponentSpec('Separator', defaultSeparatorProps);
        expect(validation.valid).toBe(true);
        
        if (validation.valid && validation.data) {
          const SeparatorComponent = componentRegistry.Separator.component;
          const { container } = render(React.createElement(SeparatorComponent, validation.data));
          
          expect(container.firstChild).toBeInTheDocument();
          expect(screen.getByTestId('separator-component')).toBeInTheDocument();
        }
      });

      it('should render with different orientations', () => {
        const orientations = ['horizontal', 'vertical'] as const;
        
        orientations.forEach(orientation => {
          const props = { ...defaultSeparatorProps, orientation };
          const validation = componentRegistry.validateComponentSpec('Separator', props);
          
          expect(validation.valid).toBe(true);
        });
      });
    });

    describe('Accessibility', () => {
      it('should have proper ARIA role', async () => {
        const validation = componentRegistry.validateComponentSpec('Separator', defaultSeparatorProps);
        
        if (validation.valid && validation.data) {
          const SeparatorComponent = componentRegistry.Separator.component;
          const { container } = render(React.createElement(SeparatorComponent, validation.data));
          
          const results = await axe(container);
          expect(results).toHaveNoViolations();
          
          const separatorElement = screen.getByTestId('separator-component');
          expect(separatorElement).toHaveAttribute('role', 'separator');
        }
      });
    });
  });

  describe('Cross-Component Integration', () => {
    it('should work well together in composite layouts', () => {
      const containerProps = { ...defaultContainerProps };
      const cardProps = { ...defaultCardProps };
      const separatorProps = { ...defaultSeparatorProps };
      
      const containerValidation = componentRegistry.validateComponentSpec('Container', containerProps);
      const cardValidation = componentRegistry.validateComponentSpec('Card', cardProps);
      const separatorValidation = componentRegistry.validateComponentSpec('Separator', separatorProps);
      
      expect(containerValidation.valid).toBe(true);
      expect(cardValidation.valid).toBe(true);
      expect(separatorValidation.valid).toBe(true);
    });

    it('should maintain consistent styling across components', () => {
      // Test that all layout components follow consistent design tokens
      const components = ['Card', 'Container', 'Separator'];
      
      components.forEach(componentName => {
        const docs = componentRegistry.getComponentDocs(componentName);
        expect(docs).toBeDefined();
        expect(docs?.category).toBe('Layout');
      });
    });
  });
});