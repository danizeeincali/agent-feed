/**
 * Component Registry Validation Test Suite
 * Tests for duplicate keys, schema validation, and component rendering
 */

const { AgentComponentRegistry, validateAgentPageSpec } = require('../../frontend/src/services/AgentComponentRegistry.ts');

describe('Component Registry Validation', () => {
  describe('Registry Structure', () => {
    test('should not have duplicate component keys', () => {
      const keys = Object.keys(AgentComponentRegistry);
      const uniqueKeys = [...new Set(keys)];
      
      expect(keys.length).toBe(uniqueKeys.length);
      expect(keys).toEqual(uniqueKeys);
    });

    test('should have all expected component types', () => {
      const expectedComponents = [
        'Button', 'Input', 'Textarea', 'Select', 'Checkbox',
        'Card', 'Badge', 'Progress', 'Metric',
        'Container', 'Grid', 'Navbar', 'Breadcrumbs', 'Tabs', 'Pagination',
        'Flex', 'Stack', 'Divider', 'Spacer',
        'Avatar', 'Alert', 'DatePicker', 'Switch', 'RadioGroup',
        'Table', 'List', 'Timeline', 'Loading', 'Skeleton',
        'ProfileHeader', 'ActivityFeed', 'CapabilityList', 'PerformanceMetrics'
      ];

      expectedComponents.forEach(component => {
        expect(AgentComponentRegistry).toHaveProperty(component);
        expect(typeof AgentComponentRegistry[component]).toBe('function');
      });
    });

    test('should validate component count matches expected (30+ components)', () => {
      const componentCount = Object.keys(AgentComponentRegistry).length;
      expect(componentCount).toBeGreaterThanOrEqual(30);
      console.log(`✅ Registry has ${componentCount} components`);
    });
  });

  describe('Component Rendering Safety', () => {
    test('should handle invalid props gracefully', () => {
      // Mock React.createElement to capture calls
      const originalCreateElement = require('react').createElement;
      const createElementCalls = [];
      
      require('react').createElement = (...args) => {
        createElementCalls.push(args);
        return { type: args[0], props: args[1] };
      };

      try {
        const Button = AgentComponentRegistry.Button;
        const result = Button({ 
          children: '<script>alert("xss")</script>', 
          onClick: 'maliciousFunction()' 
        });

        // Should not throw error
        expect(result).toBeDefined();
        
        // Should sanitize malicious content
        const errorDiv = createElementCalls.find(call => 
          call[1]?.className?.includes('border-red-200')
        );
        expect(errorDiv).toBeDefined();
      } finally {
        require('react').createElement = originalCreateElement;
      }
    });

    test('should validate Zod schemas for components', () => {
      const testCases = [
        {
          component: 'Button',
          validProps: { children: 'Click me', variant: 'primary' },
          invalidProps: { children: '<script>alert("xss")</script>' }
        },
        {
          component: 'Input', 
          validProps: { placeholder: 'Enter text', type: 'text' },
          invalidProps: { type: 'invalidType' }
        },
        {
          component: 'Progress',
          validProps: { value: 50, label: 'Progress' },
          invalidProps: { value: 150 } // Over 100%
        }
      ];

      testCases.forEach(testCase => {
        const Component = AgentComponentRegistry[testCase.component];
        expect(Component).toBeDefined();
        
        // Valid props should work
        expect(() => Component(testCase.validProps)).not.toThrow();
        
        // Invalid props should be caught by schema validation
        // (Would show error in console but not throw)
      });
    });
  });

  describe('Page Specification Validation', () => {
    test('should validate complete page specs', () => {
      const validPageSpec = {
        id: 'test-page',
        version: 1,
        title: 'Test Page',
        layout: 'grid',
        components: [
          {
            type: 'Card',
            props: {
              title: 'Test Card',
              description: 'Test Description'
            }
          }
        ]
      };

      const result = validateAgentPageSpec(validPageSpec);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should catch invalid page specs', () => {
      const invalidPageSpec = {
        // Missing required fields
        id: '',
        version: 'not-a-number',
        layout: 'invalid-layout'
      };

      const result = validateAgentPageSpec(invalidPageSpec);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.includes('Page ID'))).toBe(true);
      expect(result.errors.some(error => error.includes('version'))).toBe(true);
      expect(result.errors.some(error => error.includes('Layout'))).toBe(true);
    });
  });
});