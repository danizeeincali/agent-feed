/**
 * Component Registry Integration Tests
 * Tests for overall registry functionality, component lookup, and coordination
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { componentRegistry } from '@services/ComponentRegistry';
import type { ValidationResult, ComponentDocumentation, SecurityPolicy } from '@types/agent-dynamic-pages';

describe('Component Registry Integration', () => {
  describe('Registry Initialization', () => {
    it('should initialize with core components', () => {
      const expectedComponents = [
        'Button', 'Input', 'Card', 'Badge', 'Alert', 
        'Avatar', 'Progress', 'Container', 'Separator'
      ];
      
      expectedComponents.forEach(componentName => {
        expect(componentRegistry.hasComponent(componentName)).toBe(true);
      });
    });

    it('should have valid component mappers for all registered components', () => {
      const registeredComponents = [
        'Button', 'Input', 'Card', 'Badge', 'Alert', 
        'Avatar', 'Progress', 'Container', 'Separator'
      ];
      
      registeredComponents.forEach(componentName => {
        const mapper = (componentRegistry as any)[componentName];
        expect(mapper).toBeDefined();
        expect(mapper.component).toBeDefined();
        expect(mapper.validator).toBeDefined();
        expect(mapper.sanitizer).toBeDefined();
        expect(mapper.security).toBeDefined();
        expect(mapper.documentation).toBeDefined();
      });
    });

    it('should provide consistent interface across all components', () => {
      const components = ['Button', 'Input', 'Card'];
      
      components.forEach(componentName => {
        if (!componentRegistry.hasComponent(componentName)) return;
        
        // Each component should have the same interface
        const mapper = (componentRegistry as any)[componentName];
        expect(typeof mapper.component).toBe('function');
        expect(typeof mapper.validator).toBe('function');
        expect(typeof mapper.sanitizer).toBe('function');
        expect(typeof mapper.security).toBe('object');
        expect(typeof mapper.documentation).toBe('object');
      });
    });
  });

  describe('Component Validation System', () => {
    it('should validate known components correctly', () => {
      const testCases = [
        {
          component: 'Button',
          validProps: { children: 'Test Button', variant: 'default' },
          invalidProps: { variant: 'invalid-variant', size: 'invalid-size' }
        },
        {
          component: 'Input',
          validProps: { placeholder: 'Enter text', type: 'text' },
          invalidProps: { type: 'invalid-type', maxLength: 'not-a-number' }
        },
        {
          component: 'Card',
          validProps: { title: 'Test Card', variant: 'default' },
          invalidProps: { variant: 'invalid-variant', padding: 'invalid-padding' }
        }
      ];
      
      testCases.forEach(({ component, validProps, invalidProps }) => {
        // Valid props should pass
        const validResult = componentRegistry.validateComponentSpec(component, validProps);
        expect(validResult.valid).toBe(true);
        expect(validResult.errors).toHaveLength(0);
        
        // Invalid props should fail
        const invalidResult = componentRegistry.validateComponentSpec(component, invalidProps);
        expect(invalidResult.valid).toBe(false);
        expect(invalidResult.errors.length).toBeGreaterThan(0);
      });
    });

    it('should reject unknown components', () => {
      const unknownComponent = 'NonExistentComponent';
      const result = componentRegistry.validateComponentSpec(unknownComponent, {});
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Unknown component type');
      expect(result.errors[0].code).toBe('UNKNOWN_COMPONENT');
    });

    it('should provide detailed validation errors', () => {
      const invalidProps = {
        variant: 'invalid-variant',
        size: 'invalid-size',
        disabled: 'not-a-boolean'
      };
      
      const result = componentRegistry.validateComponentSpec('Button', invalidProps);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Should have specific error information
      result.errors.forEach(error => {
        expect(error.field).toBeDefined();
        expect(error.message).toBeDefined();
        expect(error.code).toBeDefined();
        expect(error.severity).toBe('error');
      });
    });

    it('should handle complex nested validation', () => {
      const complexProps = {
        'data-testid': 'complex-test',
        style: {
          color: 'red',
          backgroundColor: 'blue',
          fontSize: '16px',
          invalidProperty: 'should-be-ignored'
        },
        'aria-label': 'Complex component',
        className: 'test-class',
        children: 'Test content'
      };
      
      const result = componentRegistry.validateComponentSpec('Card', complexProps);
      
      // Should handle nested objects appropriately
      expect(result.valid).toBe(true);
      if (result.valid && result.data) {
        expect(result.data.style).toBeDefined();
        expect(result.data['aria-label']).toBe('Complex component');
        expect(result.data.className).toBe('test-class');
      }
    });
  });

  describe('Component Rendering Integration', () => {
    it('should render all registered components without errors', () => {
      const components = [
        { name: 'Button', props: { children: 'Test Button', 'data-testid': 'test-button' } },
        { name: 'Input', props: { placeholder: 'Test Input', 'data-testid': 'test-input' } },
        { name: 'Card', props: { title: 'Test Card', 'data-testid': 'test-card' } },
        { name: 'Badge', props: { children: 'Test Badge', 'data-testid': 'test-badge' } },
        { name: 'Container', props: { children: 'Test Container', 'data-testid': 'test-container' } }
      ];
      
      components.forEach(({ name, props }) => {
        if (!componentRegistry.hasComponent(name)) return;
        
        const validation = componentRegistry.validateComponentSpec(name, props);
        expect(validation.valid).toBe(true);
        
        if (validation.valid && validation.data) {
          const Component = (componentRegistry as any)[name].component;
          const { container } = render(React.createElement(Component, validation.data));
          
          expect(container.firstChild).toBeInTheDocument();
          expect(screen.getByTestId(props['data-testid'])).toBeInTheDocument();
        }
      });
    });

    it('should handle component composition correctly', () => {
      // Test Card containing Button
      const cardProps = {
        'data-testid': 'composition-card',
        title: 'Card with Button'
      };
      
      const buttonProps = {
        'data-testid': 'composition-button',
        children: 'Card Button'
      };
      
      const cardValidation = componentRegistry.validateComponentSpec('Card', cardProps);
      const buttonValidation = componentRegistry.validateComponentSpec('Button', buttonProps);
      
      expect(cardValidation.valid).toBe(true);
      expect(buttonValidation.valid).toBe(true);
      
      if (cardValidation.valid && buttonValidation.valid && cardValidation.data && buttonValidation.data) {
        const CardComponent = componentRegistry.Card.component;
        const ButtonComponent = componentRegistry.Button.component;
        
        render(
          React.createElement(CardComponent, cardValidation.data, [
            React.createElement(ButtonComponent, buttonValidation.data)
          ])
        );
        
        expect(screen.getByTestId('composition-card')).toBeInTheDocument();
        expect(screen.getByTestId('composition-button')).toBeInTheDocument();
      }
    });

    it('should maintain component state and props correctly', () => {
      const initialProps = {
        'data-testid': 'stateful-button',
        children: 'Initial Text',
        variant: 'default' as const
      };
      
      const validation = componentRegistry.validateComponentSpec('Button', initialProps);
      if (validation.valid && validation.data) {
        const ButtonComponent = componentRegistry.Button.component;
        const { rerender } = render(React.createElement(ButtonComponent, validation.data));
        
        expect(screen.getByText('Initial Text')).toBeInTheDocument();
        
        // Update props
        const updatedProps = {
          ...initialProps,
          children: 'Updated Text',
          variant: 'outline' as const
        };
        
        const updatedValidation = componentRegistry.validateComponentSpec('Button', updatedProps);
        if (updatedValidation.valid && updatedValidation.data) {
          rerender(React.createElement(ButtonComponent, updatedValidation.data));
          expect(screen.getByText('Updated Text')).toBeInTheDocument();
        }
      }
    });
  });

  describe('Security Policy Integration', () => {
    it('should have consistent security policies across components', () => {
      const components = ['Button', 'Input', 'Card', 'Badge'];
      
      components.forEach(componentName => {
        if (!componentRegistry.hasComponent(componentName)) return;
        
        const policy = componentRegistry.getSecurityPolicy(componentName);
        expect(policy).toBeDefined();
        
        // Common security requirements
        expect(policy?.sanitizeHtml).toBe(true);
        expect(policy?.allowExternalContent).toBe(false);
        expect(policy?.maxDataSize).toBeGreaterThan(0);
        expect(policy?.allowedProps).toBeDefined();
        expect(policy?.blockedProps).toBeDefined();
        
        // Should block dangerous props
        expect(policy?.blockedProps).toContain('dangerouslySetInnerHTML');
        expect(policy?.blockedProps.some(prop => prop.startsWith('on'))).toBe(true);
      });
    });

    it('should apply security policies during validation', () => {
      const maliciousProps = {
        'data-testid': 'security-test',
        children: '<script>alert("XSS")</script>Safe Content',
        onClick: () => eval('malicious code'),
        dangerouslySetInnerHTML: { __html: '<script>alert("XSS")</script>' }
      };
      
      const components = ['Button', 'Card', 'Badge'];
      
      components.forEach(componentName => {
        if (!componentRegistry.hasComponent(componentName)) return;
        
        const sanitized = (componentRegistry as any)[componentName].sanitizer(maliciousProps);
        
        // Dangerous content should be removed or sanitized
        expect(sanitized).not.toHaveProperty('onClick');
        expect(sanitized).not.toHaveProperty('dangerouslySetInnerHTML');
        
        if (sanitized.children && typeof sanitized.children === 'string') {
          expect(sanitized.children).not.toContain('<script>');
          expect(sanitized.children).toContain('Safe Content');
        }
      });
    });

    it('should validate URL security across components', () => {
      const urlProps = {
        'data-testid': 'url-test',
        src: 'javascript:alert("XSS")',
        href: 'data:text/html,<script>alert("XSS")</script>'
      };
      
      const componentsWithUrls = ['Avatar', 'Button', 'Card'];
      
      componentsWithUrls.forEach(componentName => {
        if (!componentRegistry.hasComponent(componentName)) return;
        
        const sanitized = (componentRegistry as any)[componentName].sanitizer(urlProps);
        
        // Dangerous URLs should be blocked
        if (sanitized.src) {
          expect(sanitized.src).not.toMatch(/^javascript:/i);
          expect(sanitized.src).not.toMatch(/^data:text\/html/i);
        }
        
        if (sanitized.href) {
          expect(sanitized.href).not.toMatch(/^javascript:/i);
          expect(sanitized.href).not.toMatch(/^data:text\/html/i);
        }
      });
    });
  });

  describe('Documentation System', () => {
    it('should provide comprehensive documentation for all components', () => {
      const components = ['Button', 'Input', 'Card', 'Badge'];
      
      components.forEach(componentName => {
        if (!componentRegistry.hasComponent(componentName)) return;
        
        const docs = componentRegistry.getComponentDocs(componentName);
        expect(docs).toBeDefined();
        
        // Required documentation fields
        expect(docs?.name).toBe(componentName);
        expect(docs?.description).toBeDefined();
        expect(docs?.category).toBeDefined();
        expect(docs?.examples).toBeDefined();
        expect(docs?.props).toBeDefined();
        expect(docs?.accessibility).toBeDefined();
        expect(docs?.browserSupport).toBeDefined();
        
        // Examples should be valid
        docs?.examples.forEach(example => {
          expect(example.name).toBeDefined();
          expect(example.description).toBeDefined();
          expect(example.code).toBeDefined();
          expect(example.props).toBeDefined();
        });
        
        // Props documentation should be complete
        docs?.props.forEach(prop => {
          expect(prop.name).toBeDefined();
          expect(prop.type).toBeDefined();
          expect(prop.description).toBeDefined();
        });
      });
    });

    it('should provide searchable component categories', () => {
      const expectedCategories = ['Form', 'Layout', 'Display', 'Feedback', 'Navigation'];
      const foundCategories = new Set<string>();
      
      const components = ['Button', 'Input', 'Card', 'Badge', 'Alert'];
      
      components.forEach(componentName => {
        if (!componentRegistry.hasComponent(componentName)) return;
        
        const docs = componentRegistry.getComponentDocs(componentName);
        if (docs?.category) {
          foundCategories.add(docs.category);
        }
      });
      
      // Should have multiple categories represented
      expect(foundCategories.size).toBeGreaterThan(1);
      
      // Common categories should be present
      const commonCategories = ['Form', 'Layout', 'Display'];
      commonCategories.forEach(category => {
        const hasCategory = Array.from(foundCategories).some(c => 
          c.includes(category) || category.includes(c)
        );
        expect(hasCategory).toBe(true);
      });
    });

    it('should maintain documentation consistency', () => {
      const components = ['Button', 'Input', 'Card'];
      
      components.forEach(componentName => {
        if (!componentRegistry.hasComponent(componentName)) return;
        
        const docs = componentRegistry.getComponentDocs(componentName);
        
        // Documentation should follow consistent format
        expect(docs?.name).toMatch(/^[A-Z][a-zA-Z]*$/); // PascalCase
        expect(docs?.description).toMatch(/^[A-Z].*[^.]$/); // Sentence case, no period
        expect(docs?.category).toMatch(/^[A-Z][a-zA-Z]*$/); // PascalCase
        
        // Should have at least one example
        expect(docs?.examples.length).toBeGreaterThan(0);
        
        // Should have accessibility information
        expect(docs?.accessibility.length).toBeGreaterThan(0);
        
        // Should have browser support information
        expect(docs?.browserSupport.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance Integration', () => {
    it('should handle bulk component operations efficiently', () => {
      const startTime = performance.now();
      
      // Validate multiple components in bulk
      const components = ['Button', 'Input', 'Card', 'Badge', 'Alert'];
      const results: ValidationResult[] = [];
      
      for (let i = 0; i < 100; i++) {
        components.forEach(componentName => {
          if (!componentRegistry.hasComponent(componentName)) return;
          
          const props = {
            'data-testid': `bulk-${componentName.toLowerCase()}-${i}`,
            children: `Test content ${i}`
          };
          
          const result = componentRegistry.validateComponentSpec(componentName, props);
          results.push(result);
        });
      }
      
      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / results.length;
      
      // Should handle bulk operations efficiently
      expect(averageTime).toBeLessThan(5); // 5ms per validation is reasonable
      expect(results.every(r => r.valid)).toBe(true);
    });

    it('should cache component lookups efficiently', () => {
      const startTime = performance.now();
      
      // Repeat component existence checks
      for (let i = 0; i < 1000; i++) {
        componentRegistry.hasComponent('Button');
        componentRegistry.hasComponent('Input');
        componentRegistry.hasComponent('Card');
        componentRegistry.hasComponent('NonExistentComponent');
      }
      
      const totalTime = performance.now() - startTime;
      
      // Should be very fast due to caching
      expect(totalTime).toBeLessThan(100); // 100ms for 4000 lookups
    });

    it('should handle component registry memory usage', () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Create and destroy many component instances
      const components = ['Button', 'Input', 'Card'];
      
      for (let i = 0; i < 50; i++) {
        components.forEach(componentName => {
          if (!componentRegistry.hasComponent(componentName)) return;
          
          const props = { 'data-testid': `memory-${i}`, children: `Test ${i}` };
          const validation = componentRegistry.validateComponentSpec(componentName, props);
          
          if (validation.valid && validation.data) {
            const Component = (componentRegistry as any)[componentName].component;
            const { unmount } = render(React.createElement(Component, validation.data));
            unmount();
          }
        });
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // Less than 20MB
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed component specifications gracefully', () => {
      const malformedSpecs = [
        null,
        undefined,
        { circular: {} },
        { deeply: { nested: { object: { that: { goes: { very: { deep: true } } } } } } },
        { withFunction: () => console.log('test') },
        { withSymbol: Symbol('test') }
      ];
      
      malformedSpecs.forEach(spec => {
        expect(() => {
          componentRegistry.validateComponentSpec('Button', spec);
        }).not.toThrow();
      });
    });

    it('should provide helpful error messages', () => {
      const invalidSpecs = [
        { variant: 'invalid-variant' },
        { size: 123 },
        { disabled: 'true' } // Should be boolean
      ];
      
      invalidSpecs.forEach(spec => {
        const result = componentRegistry.validateComponentSpec('Button', spec);
        
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        
        result.errors.forEach(error => {
          expect(error.message).toBeDefined();
          expect(error.code).toBeDefined();
          expect(error.field).toBeDefined();
        });
      });
    });

    it('should handle component rendering errors gracefully', () => {
      // Test with props that might cause rendering issues
      const problematicProps = {
        'data-testid': 'error-test',
        children: null,
        style: { display: 'invalid-display-value' }
      };
      
      const components = ['Button', 'Card'];
      
      components.forEach(componentName => {
        if (!componentRegistry.hasComponent(componentName)) return;
        
        expect(() => {
          const sanitized = (componentRegistry as any)[componentName].sanitizer(problematicProps);
          const Component = (componentRegistry as any)[componentName].component;
          render(React.createElement(Component, sanitized));
        }).not.toThrow();
      });
    });
  });
});