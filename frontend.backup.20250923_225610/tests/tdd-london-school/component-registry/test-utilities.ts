/**
 * Component Registry Test Utilities
 * Shared utilities, factories, and helpers for component testing
 */

import React from 'react';
import { render, RenderResult } from '@testing-library/react';
import { componentRegistry } from '@services/ComponentRegistry';
import type { 
  ValidationResult, 
  ComponentPropsMap, 
  ButtonProps, 
  InputProps, 
  CardProps,
  BaseComponentProps 
} from '@types/agent-dynamic-pages';

// ==================== TEST DATA FACTORIES ====================

export class ComponentTestFactory {
  /**
   * Generate base props that all components should accept
   */
  static createBaseProps(overrides: Partial<BaseComponentProps> = {}): BaseComponentProps {
    return {
      'data-testid': 'test-component',
      id: 'test-id',
      className: 'test-class',
      'aria-label': 'Test component',
      ...overrides
    };
  }

  /**
   * Generate valid Button props for testing
   */
  static createButtonProps(overrides: Partial<ButtonProps> = {}): ButtonProps {
    return {
      ...this.createBaseProps(),
      children: 'Test Button',
      variant: 'default',
      size: 'default',
      type: 'button',
      disabled: false,
      loading: false,
      ...overrides
    };
  }

  /**
   * Generate valid Input props for testing
   */
  static createInputProps(overrides: Partial<InputProps> = {}): InputProps {
    return {
      ...this.createBaseProps(),
      type: 'text',
      placeholder: 'Enter text...',
      value: '',
      disabled: false,
      required: false,
      ...overrides
    };
  }

  /**
   * Generate valid Card props for testing
   */
  static createCardProps(overrides: Partial<CardProps> = {}): CardProps {
    return {
      ...this.createBaseProps(),
      title: 'Test Card',
      description: 'Test card description',
      variant: 'default',
      padding: 'md',
      elevation: 'sm',
      interactive: false,
      ...overrides
    };
  }

  /**
   * Generate props for any registered component
   */
  static createPropsForComponent(componentName: string, overrides: any = {}): any {
    const baseProps = this.createBaseProps();
    
    switch (componentName) {
      case 'Button':
        return { ...this.createButtonProps(), ...overrides };
      case 'Input':
        return { ...this.createInputProps(), ...overrides };
      case 'Card':
        return { ...this.createCardProps(), ...overrides };
      case 'Badge':
        return { ...baseProps, children: 'Badge Text', ...overrides };
      case 'Alert':
        return { ...baseProps, children: 'Alert Message', ...overrides };
      case 'Avatar':
        return { ...baseProps, src: 'https://example.com/avatar.jpg', alt: 'Avatar', ...overrides };
      case 'Progress':
        return { ...baseProps, value: 50, max: 100, ...overrides };
      case 'Container':
        return { ...baseProps, children: 'Container Content', maxWidth: 'full', ...overrides };
      case 'Separator':
        return { ...baseProps, orientation: 'horizontal', ...overrides };
      default:
        return { ...baseProps, ...overrides };
    }
  }

  /**
   * Generate malicious props for security testing
   */
  static createMaliciousProps(): any {
    return {
      'data-testid': 'malicious-test',
      children: '<script>alert("XSS")</script>Malicious Content',
      title: '<img src="x" onerror="alert(1)">Malicious Title',
      src: 'javascript:alert("XSS")',
      href: 'data:text/html,<script>alert("XSS")</script>',
      onClick: () => eval('alert("danger")'),
      onMouseOver: () => document.write('malicious'),
      dangerouslySetInnerHTML: { __html: '<script>alert("XSS")</script>' },
      style: {
        backgroundImage: 'url("javascript:alert(1)")',
        color: '<script>alert(1)</script>'
      }
    };
  }

  /**
   * Generate edge case props for stress testing
   */
  static createEdgeCaseProps(): any[] {
    return [
      // Empty/null values
      { children: '', title: '', placeholder: '' },
      { children: null, title: null },
      { children: undefined, title: undefined },
      
      // Very long content
      {
        children: 'x'.repeat(10000),
        title: 'Very Long Title '.repeat(100),
        placeholder: 'Long placeholder '.repeat(50)
      },
      
      // Special characters
      {
        children: '🚀 Special chars: @#$%^&*()[]{}|\\:";\'<>?,./`~',
        title: 'Title with émojis 🎉 and ñiño',
        placeholder: 'Spëcial chårs plàceholder'
      },
      
      // Mixed content types
      {
        children: ['string', 123, true, null, undefined],
        title: { toString: () => 'Object Title' },
        value: 42
      },
      
      // Deeply nested objects
      {
        style: {
          nested: {
            deeply: {
              very: {
                deep: {
                  property: 'value'
                }
              }
            }
          }
        }
      }
    ];
  }
}

// ==================== TEST RENDERING UTILITIES ====================

export class ComponentRenderer {
  /**
   * Render a component safely with validation
   */
  static renderComponent(
    componentName: string, 
    props: any = {}
  ): { result: RenderResult | null; validation: ValidationResult; error?: Error } {
    try {
      const validation = componentRegistry.validateComponentSpec(componentName, props);
      
      if (!validation.valid || !validation.data) {
        return { result: null, validation };
      }
      
      const Component = (componentRegistry as any)[componentName]?.component;
      if (!Component) {
        throw new Error(`Component ${componentName} not found in registry`);
      }
      
      const result = render(React.createElement(Component, validation.data));
      return { result, validation };
    } catch (error) {
      return { 
        result: null, 
        validation: { valid: false, errors: [], warnings: [] }, 
        error: error as Error 
      };
    }
  }

  /**
   * Render multiple components for batch testing
   */
  static renderComponents(
    components: Array<{ name: string; props: any }>
  ): Array<{ name: string; result: RenderResult | null; validation: ValidationResult; error?: Error }> {
    return components.map(({ name, props }) => ({
      name,
      ...this.renderComponent(name, props)
    }));
  }

  /**
   * Render component with all variants for comprehensive testing
   */
  static renderAllVariants(componentName: string, baseProps: any = {}): RenderResult[] {
    const results: RenderResult[] = [];
    
    // Get component documentation to find variants
    const docs = componentRegistry.getComponentDocs(componentName);
    if (!docs) return results;
    
    // Extract variant information from documentation
    const variantProp = docs.props.find(prop => prop.name === 'variant');
    if (variantProp && variantProp.examples) {
      variantProp.examples.forEach(variant => {
        const props = { ...baseProps, variant };
        const { result } = this.renderComponent(componentName, props);
        if (result) results.push(result);
      });
    } else {
      // Fallback: render with base props
      const { result } = this.renderComponent(componentName, baseProps);
      if (result) results.push(result);
    }
    
    return results;
  }
}

// ==================== SECURITY TEST UTILITIES ====================

export class SecurityTestUtils {
  /**
   * XSS payload collection for security testing
   */
  static readonly XSS_PAYLOADS = [
    '<script>alert("XSS")</script>',
    '<SCRIPT>alert("XSS")</SCRIPT>',
    '<script src="malicious.js"></script>',
    '<img src="x" onerror="alert(1)">',
    '<svg onload="alert(1)">',
    '<iframe src="javascript:alert(1)"></iframe>',
    '<object data="javascript:alert(1)">',
    '<embed src="javascript:alert(1)">',
    '<link rel="stylesheet" href="javascript:alert(1)">',
    '<style>body{background:url("javascript:alert(1)")}</style>',
    '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
    'javascript:alert("XSS")',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox("XSS")',
    '&lt;script&gt;alert("XSS")&lt;/script&gt;',
    '<div onload="alert(1)">content</div>',
    '<form action="javascript:alert(1)"><input type="submit"></form>'
  ];

  /**
   * Test component against XSS attacks
   */
  static testXSSResistance(componentName: string, propNames: string[] = []): boolean {
    const testProps = ComponentTestFactory.createPropsForComponent(componentName);
    const propsToTest = propNames.length > 0 ? propNames : Object.keys(testProps);
    
    return this.XSS_PAYLOADS.every(payload => {
      const maliciousProps = { ...testProps };
      
      propsToTest.forEach(propName => {
        maliciousProps[propName] = payload;
      });
      
      try {
        const sanitized = (componentRegistry as any)[componentName]?.sanitizer(maliciousProps);
        if (!sanitized) return false;
        
        // Check that dangerous content was removed or escaped
        return propsToTest.every(propName => {
          const value = sanitized[propName];
          if (typeof value !== 'string') return true;
          
          return !value.match(/<script[\s\S]*?>[\s\S]*?<\/script>/gi) &&
                 !value.match(/javascript:/gi) &&
                 !value.match(/data:text\/html/gi) &&
                 !value.match(/vbscript:/gi);
        });
      } catch (error) {
        return false;
      }
    });
  }

  /**
   * Test component against dangerous event handlers
   */
  static testEventHandlerBlocking(componentName: string): boolean {
    const dangerousHandlers = {
      onClick: () => eval('alert("danger")'),
      onMouseOver: () => document.write('malicious'),
      onFocus: () => location.href = 'javascript:alert(1)',
      onBlur: () => fetch('/steal-data'),
      onChange: () => new Function('alert("xss")')(),
      dangerouslySetInnerHTML: { __html: '<script>alert("xss")</script>' }
    };
    
    const baseProps = ComponentTestFactory.createPropsForComponent(componentName);
    const testProps = { ...baseProps, ...dangerousHandlers };
    
    try {
      const sanitized = (componentRegistry as any)[componentName]?.sanitizer(testProps);
      if (!sanitized) return false;
      
      // Check that dangerous handlers were removed
      return Object.keys(dangerousHandlers).every(handler => 
        !sanitized.hasOwnProperty(handler)
      );
    } catch (error) {
      return false;
    }
  }
}

// ==================== ACCESSIBILITY TEST UTILITIES ====================

export class AccessibilityTestUtils {
  /**
   * Test component accessibility compliance
   */
  static async testAccessibility(componentName: string, props: any = {}): Promise<boolean> {
    const testProps = { 
      ...ComponentTestFactory.createPropsForComponent(componentName),
      ...props 
    };
    
    const { result } = ComponentRenderer.renderComponent(componentName, testProps);
    if (!result) return false;
    
    try {
      const { axe } = await import('jest-axe');
      const results = await axe(result.container);
      return results.violations.length === 0;
    } catch (error) {
      console.warn('Accessibility testing failed:', error);
      return false;
    }
  }

  /**
   * Test keyboard navigation support
   */
  static testKeyboardNavigation(componentName: string): boolean {
    const props = ComponentTestFactory.createPropsForComponent(componentName);
    const { result } = ComponentRenderer.renderComponent(componentName, props);
    
    if (!result) return false;
    
    const element = result.container.firstChild as HTMLElement;
    if (!element) return false;
    
    // Check if element is focusable
    const isFocusable = element.tabIndex >= 0 || 
                       ['button', 'input', 'select', 'textarea', 'a'].includes(element.tagName.toLowerCase());
    
    // Check for ARIA attributes
    const hasAriaLabel = element.hasAttribute('aria-label') || 
                        element.hasAttribute('aria-labelledby');
    
    return isFocusable || hasAriaLabel;
  }

  /**
   * Test screen reader compatibility
   */
  static testScreenReaderSupport(componentName: string): boolean {
    const props = ComponentTestFactory.createPropsForComponent(componentName);
    const { result } = ComponentRenderer.renderComponent(componentName, props);
    
    if (!result) return false;
    
    const element = result.container.firstChild as HTMLElement;
    if (!element) return false;
    
    // Check for semantic HTML or proper ARIA roles
    const semanticTags = ['button', 'input', 'main', 'nav', 'section', 'article', 'header', 'footer'];
    const hasSemanticTag = semanticTags.includes(element.tagName.toLowerCase());
    const hasRole = element.hasAttribute('role');
    const hasAriaLabel = element.hasAttribute('aria-label') || 
                        element.hasAttribute('aria-labelledby') ||
                        element.hasAttribute('aria-describedby');
    
    return hasSemanticTag || hasRole || hasAriaLabel;
  }
}

// ==================== PERFORMANCE TEST UTILITIES ====================

export class PerformanceTestUtils {
  /**
   * Measure component render time
   */
  static measureRenderTime(componentName: string, props: any = {}): number {
    const testProps = { 
      ...ComponentTestFactory.createPropsForComponent(componentName),
      ...props 
    };
    
    const startTime = performance.now();
    ComponentRenderer.renderComponent(componentName, testProps);
    const endTime = performance.now();
    
    return endTime - startTime;
  }

  /**
   * Test memory usage over multiple renders
   */
  static measureMemoryUsage(componentName: string, iterations: number = 100): number {
    const testProps = ComponentTestFactory.createPropsForComponent(componentName);
    const initialMemory = performance.memory?.usedJSHeapSize || 0;
    
    for (let i = 0; i < iterations; i++) {
      const { result } = ComponentRenderer.renderComponent(componentName, {
        ...testProps,
        'data-testid': `memory-test-${i}`
      });
      result?.unmount();
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = performance.memory?.usedJSHeapSize || 0;
    return finalMemory - initialMemory;
  }

  /**
   * Benchmark component performance
   */
  static benchmarkComponent(componentName: string): {
    averageRenderTime: number;
    maxRenderTime: number;
    minRenderTime: number;
    memoryUsage: number;
  } {
    const renderTimes: number[] = [];
    const iterations = 50;
    
    // Measure render times
    for (let i = 0; i < iterations; i++) {
      const time = this.measureRenderTime(componentName, { 'data-testid': `benchmark-${i}` });
      renderTimes.push(time);
    }
    
    // Measure memory usage
    const memoryUsage = this.measureMemoryUsage(componentName, iterations);
    
    return {
      averageRenderTime: renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length,
      maxRenderTime: Math.max(...renderTimes),
      minRenderTime: Math.min(...renderTimes),
      memoryUsage
    };
  }
}

// ==================== RESPONSIVE TEST UTILITIES ====================

export class ResponsiveTestUtils {
  static readonly VIEWPORTS = {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1920, height: 1080 }
  };

  /**
   * Set viewport for responsive testing
   */
  static setViewport(viewport: { width: number; height: number }): void {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: viewport.width,
    });
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: viewport.height,
    });
    
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: this.evaluateMediaQuery(query, viewport.width),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  }

  /**
   * Evaluate media query for given viewport width
   */
  private static evaluateMediaQuery(query: string, width: number): boolean {
    if (query.includes('max-width: 480px')) return width <= 480;
    if (query.includes('max-width: 768px')) return width <= 768;
    if (query.includes('max-width: 1024px')) return width <= 1024;
    if (query.includes('min-width: 481px')) return width >= 481;
    if (query.includes('min-width: 769px')) return width >= 769;
    if (query.includes('min-width: 1025px')) return width >= 1025;
    return false;
  }

  /**
   * Test component across all viewports
   */
  static testAllViewports(
    componentName: string, 
    props: any = {}
  ): Record<string, { success: boolean; error?: string }> {
    const results: Record<string, { success: boolean; error?: string }> = {};
    
    Object.entries(this.VIEWPORTS).forEach(([name, viewport]) => {
      try {
        this.setViewport(viewport);
        const { result } = ComponentRenderer.renderComponent(componentName, {
          ...ComponentTestFactory.createPropsForComponent(componentName),
          ...props
        });
        
        results[name] = { success: !!result };
      } catch (error) {
        results[name] = { 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        };
      }
    });
    
    return results;
  }
}

// ==================== EXPORT ALL UTILITIES ====================

export const TestUtils = {
  Factory: ComponentTestFactory,
  Renderer: ComponentRenderer,
  Security: SecurityTestUtils,
  Accessibility: AccessibilityTestUtils,
  Performance: PerformanceTestUtils,
  Responsive: ResponsiveTestUtils
};

export default TestUtils;