/**
 * Mobile Responsiveness Test Suite
 * Tests for responsive behavior across different device sizes and orientations
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { componentRegistry } from '@services/ComponentRegistry';

// Mock window.matchMedia for responsive testing
const createMockMatchMedia = (width: number) => {
  return jest.fn().mockImplementation(query => {
    const matches = (() => {
      if (query.includes('max-width: 480px')) return width <= 480;
      if (query.includes('max-width: 768px')) return width <= 768;
      if (query.includes('max-width: 1024px')) return width <= 1024;
      if (query.includes('min-width: 481px')) return width >= 481;
      if (query.includes('min-width: 769px')) return width >= 769;
      if (query.includes('min-width: 1025px')) return width >= 1025;
      return false;
    })();

    return {
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
  });
};

// Mock ResizeObserver for component resize handling
const mockResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.ResizeObserver = mockResizeObserver;

describe('Mobile Responsiveness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Reset viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  const viewports = {
    mobile: { width: 375, height: 667, name: 'Mobile' },
    tablet: { width: 768, height: 1024, name: 'Tablet' },
    desktop: { width: 1920, height: 1080, name: 'Desktop' }
  };

  const setViewport = (viewport: { width: number; height: number }) => {
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
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: createMockMatchMedia(viewport.width),
    });
  };

  describe('Layout Components Responsiveness', () => {
    describe('Card Component', () => {
      const cardProps = {
        'data-testid': 'responsive-card',
        title: 'Responsive Card',
        description: 'This card should adapt to different screen sizes',
        children: 'Card content that may wrap or adjust on smaller screens'
      };

      Object.entries(viewports).forEach(([size, viewport]) => {
        it(`should render appropriately on ${size} (${viewport.width}x${viewport.height})`, () => {
          setViewport(viewport);
          
          const validation = componentRegistry.validateComponentSpec('Card', cardProps);
          expect(validation.valid).toBe(true);
          
          if (validation.valid && validation.data) {
            const CardComponent = componentRegistry.Card.component;
            const { container } = render(React.createElement(CardComponent, validation.data));
            
            const cardElement = screen.getByTestId('responsive-card');
            expect(cardElement).toBeInTheDocument();
            
            // Verify the card is visible and properly sized
            const rect = cardElement.getBoundingClientRect();
            expect(rect.width).toBeGreaterThan(0);
            expect(rect.height).toBeGreaterThan(0);
            
            // On mobile, card should not exceed viewport width
            if (size === 'mobile') {
              expect(rect.width).toBeLessThanOrEqual(viewport.width);
            }
          }
        });
      });

      it('should handle long content gracefully on mobile', () => {
        setViewport(viewports.mobile);
        
        const longContentProps = {
          ...cardProps,
          title: 'Very Long Card Title That Should Wrap or Truncate on Mobile Devices',
          description: 'This is a very long description that contains multiple sentences and should wrap appropriately on smaller screens without breaking the layout or causing horizontal scrolling issues.',
          children: 'Long content text that needs to be displayed properly on mobile devices with limited screen real estate.'
        };
        
        const validation = componentRegistry.validateComponentSpec('Card', longContentProps);
        if (validation.valid && validation.data) {
          const CardComponent = componentRegistry.Card.component;
          render(React.createElement(CardComponent, validation.data));
          
          const cardElement = screen.getByTestId('responsive-card');
          const rect = cardElement.getBoundingClientRect();
          
          // Should not cause horizontal overflow
          expect(rect.width).toBeLessThanOrEqual(viewports.mobile.width);
        }
      });
    });

    describe('Container Component', () => {
      const containerProps = {
        'data-testid': 'responsive-container',
        maxWidth: 'full' as const,
        padding: 'md' as const,
        children: 'Container content'
      };

      Object.entries(viewports).forEach(([size, viewport]) => {
        it(`should apply appropriate max-width on ${size}`, () => {
          setViewport(viewport);
          
          const validation = componentRegistry.validateComponentSpec('Container', containerProps);
          if (validation.valid && validation.data) {
            const ContainerComponent = componentRegistry.Container.component;
            render(React.createElement(ContainerComponent, validation.data));
            
            const containerElement = screen.getByTestId('responsive-container');
            expect(containerElement).toBeInTheDocument();
            
            // Container should never exceed viewport width
            const rect = containerElement.getBoundingClientRect();
            expect(rect.width).toBeLessThanOrEqual(viewport.width);
          }
        });
      });

      it('should adjust padding on different screen sizes', () => {
        const paddingSizes = ['sm', 'md', 'lg', 'xl'] as const;
        
        paddingSizes.forEach(padding => {
          Object.entries(viewports).forEach(([size, viewport]) => {
            setViewport(viewport);
            
            const props = { ...containerProps, padding };
            const validation = componentRegistry.validateComponentSpec('Container', props);
            
            if (validation.valid && validation.data) {
              const ContainerComponent = componentRegistry.Container.component;
              render(React.createElement(ContainerComponent, validation.data));
              
              const containerElement = screen.getByTestId('responsive-container');
              expect(containerElement).toBeInTheDocument();
              
              // On mobile, padding should be more conservative
              if (size === 'mobile' && padding === 'xl') {
                // Large padding on mobile might be adjusted
                const rect = containerElement.getBoundingClientRect();
                expect(rect.width).toBeLessThanOrEqual(viewport.width);
              }
            }
          });
        });
      });
    });
  });

  describe('Form Components Responsiveness', () => {
    describe('Button Component', () => {
      const buttonProps = {
        'data-testid': 'responsive-button',
        children: 'Responsive Button'
      };

      Object.entries(viewports).forEach(([size, viewport]) => {
        it(`should render with appropriate size on ${size}`, () => {
          setViewport(viewport);
          
          const validation = componentRegistry.validateComponentSpec('Button', buttonProps);
          if (validation.valid && validation.data) {
            const ButtonComponent = componentRegistry.Button.component;
            render(React.createElement(ButtonComponent, validation.data));
            
            const buttonElement = screen.getByTestId('responsive-button');
            expect(buttonElement).toBeInTheDocument();
            
            // Button should be tappable on mobile (minimum 44px)
            if (size === 'mobile') {
              const rect = buttonElement.getBoundingClientRect();
              expect(rect.height).toBeGreaterThanOrEqual(44);
              expect(rect.width).toBeGreaterThanOrEqual(44);
            }
          }
        });
      });

      it('should handle long button text on mobile', () => {
        setViewport(viewports.mobile);
        
        const longTextProps = {
          ...buttonProps,
          children: 'Very Long Button Text That Might Need Special Handling'
        };
        
        const validation = componentRegistry.validateComponentSpec('Button', longTextProps);
        if (validation.valid && validation.data) {
          const ButtonComponent = componentRegistry.Button.component;
          render(React.createElement(ButtonComponent, validation.data));
          
          const buttonElement = screen.getByTestId('responsive-button');
          const rect = buttonElement.getBoundingClientRect();
          
          // Should not exceed viewport width
          expect(rect.width).toBeLessThanOrEqual(viewports.mobile.width);
        }
      });

      it('should maintain accessibility on touch devices', () => {
        setViewport(viewports.mobile);
        
        const accessibleProps = {
          ...buttonProps,
          'aria-label': 'Mobile accessible button',
          size: 'lg' as const // Larger for better touch targets
        };
        
        const validation = componentRegistry.validateComponentSpec('Button', accessibleProps);
        if (validation.valid && validation.data) {
          const ButtonComponent = componentRegistry.Button.component;
          render(React.createElement(ButtonComponent, validation.data));
          
          const buttonElement = screen.getByTestId('responsive-button');
          
          // Should have minimum touch target size
          const rect = buttonElement.getBoundingClientRect();
          expect(rect.height).toBeGreaterThanOrEqual(44);
          expect(rect.width).toBeGreaterThanOrEqual(44);
          
          // Should maintain accessibility attributes
          expect(buttonElement).toHaveAttribute('aria-label', 'Mobile accessible button');
        }
      });
    });

    describe('Input Component', () => {
      const inputProps = {
        'data-testid': 'responsive-input',
        placeholder: 'Enter text...',
        label: 'Responsive Input'
      };

      Object.entries(viewports).forEach(([size, viewport]) => {
        it(`should render appropriately on ${size}`, () => {
          setViewport(viewport);
          
          const validation = componentRegistry.validateComponentSpec('Input', inputProps);
          if (validation.valid && validation.data) {
            const InputComponent = componentRegistry.Input.component;
            render(React.createElement(InputComponent, validation.data));
            
            const inputElement = screen.getByTestId('responsive-input');
            expect(inputElement).toBeInTheDocument();
            
            // Input should be appropriately sized for touch on mobile
            if (size === 'mobile') {
              const rect = inputElement.getBoundingClientRect();
              expect(rect.height).toBeGreaterThanOrEqual(44); // Minimum touch target
            }
          }
        });
      });

      it('should handle virtual keyboard on mobile', () => {
        setViewport(viewports.mobile);
        
        const mobileProps = {
          ...inputProps,
          type: 'email' as const,
          inputMode: 'email',
          autoComplete: 'email'
        };
        
        const validation = componentRegistry.validateComponentSpec('Input', mobileProps);
        if (validation.valid && validation.data) {
          const InputComponent = componentRegistry.Input.component;
          render(React.createElement(InputComponent, validation.data));
          
          const inputElement = screen.getByTestId('responsive-input');
          
          // Should have appropriate input type for mobile keyboard
          expect(inputElement).toHaveAttribute('type', 'email');
        }
      });
    });
  });

  describe('Display Components Responsiveness', () => {
    describe('Badge Component', () => {
      const badgeProps = {
        'data-testid': 'responsive-badge',
        children: 'Badge'
      };

      Object.entries(viewports).forEach(([size, viewport]) => {
        it(`should scale appropriately on ${size}`, () => {
          setViewport(viewport);
          
          const validation = componentRegistry.validateComponentSpec('Badge', badgeProps);
          if (validation.valid && validation.data) {
            const BadgeComponent = componentRegistry.Badge.component;
            render(React.createElement(BadgeComponent, validation.data));
            
            const badgeElement = screen.getByTestId('responsive-badge');
            expect(badgeElement).toBeInTheDocument();
            
            // Badge should remain readable on all screen sizes
            const rect = badgeElement.getBoundingClientRect();
            expect(rect.width).toBeGreaterThan(0);
            expect(rect.height).toBeGreaterThan(0);
          }
        });
      });
    });

    describe('Progress Component', () => {
      const progressProps = {
        'data-testid': 'responsive-progress',
        value: 50,
        max: 100
      };

      Object.entries(viewports).forEach(([size, viewport]) => {
        it(`should render full-width on ${size}`, () => {
          setViewport(viewport);
          
          const validation = componentRegistry.validateComponentSpec('Progress', progressProps);
          if (validation.valid && validation.data) {
            const ProgressComponent = componentRegistry.Progress.component;
            render(React.createElement(ProgressComponent, validation.data));
            
            const progressElement = screen.getByTestId('responsive-progress');
            expect(progressElement).toBeInTheDocument();
            
            // Progress should adapt to container width
            const rect = progressElement.getBoundingClientRect();
            expect(rect.width).toBeGreaterThan(0);
            expect(rect.width).toBeLessThanOrEqual(viewport.width);
          }
        });
      });
    });
  });

  describe('Cross-Component Responsive Behavior', () => {
    it('should maintain layout integrity when components are combined', () => {
      Object.entries(viewports).forEach(([size, viewport]) => {
        setViewport(viewport);
        
        // Create a composite layout
        const containerProps = {
          'data-testid': 'composite-container',
          maxWidth: 'full' as const,
          padding: 'md' as const
        };
        
        const cardProps = {
          'data-testid': 'composite-card',
          title: 'Composite Layout Test'
        };
        
        const buttonProps = {
          'data-testid': 'composite-button',
          children: 'Action Button'
        };
        
        // Validate all components
        const containerValidation = componentRegistry.validateComponentSpec('Container', containerProps);
        const cardValidation = componentRegistry.validateComponentSpec('Card', cardProps);
        const buttonValidation = componentRegistry.validateComponentSpec('Button', buttonProps);
        
        expect(containerValidation.valid).toBe(true);
        expect(cardValidation.valid).toBe(true);
        expect(buttonValidation.valid).toBe(true);
        
        if (containerValidation.valid && cardValidation.valid && buttonValidation.valid) {
          const ContainerComponent = componentRegistry.Container.component;
          const CardComponent = componentRegistry.Card.component;
          const ButtonComponent = componentRegistry.Button.component;
          
          render(
            React.createElement(ContainerComponent, containerValidation.data, [
              React.createElement(CardComponent, cardValidation.data, [
                React.createElement(ButtonComponent, buttonValidation.data)
              ])
            ])
          );
          
          // All components should render without layout breaks
          expect(screen.getByTestId('composite-container')).toBeInTheDocument();
          expect(screen.getByTestId('composite-card')).toBeInTheDocument();
          expect(screen.getByTestId('composite-button')).toBeInTheDocument();
        }
      });
    });

    it('should handle orientation changes gracefully', () => {
      // Test landscape to portrait transition
      const landscapeViewport = { width: 667, height: 375 };
      const portraitViewport = { width: 375, height: 667 };
      
      const testProps = {
        'data-testid': 'orientation-test',
        title: 'Orientation Test Card'
      };
      
      // Render in landscape
      setViewport(landscapeViewport);
      const validation = componentRegistry.validateComponentSpec('Card', testProps);
      
      if (validation.valid && validation.data) {
        const CardComponent = componentRegistry.Card.component;
        const { rerender } = render(React.createElement(CardComponent, validation.data));
        
        let cardElement = screen.getByTestId('orientation-test');
        let landscapeRect = cardElement.getBoundingClientRect();
        
        // Switch to portrait
        setViewport(portraitViewport);
        rerender(React.createElement(CardComponent, validation.data));
        
        cardElement = screen.getByTestId('orientation-test');
        let portraitRect = cardElement.getBoundingClientRect();
        
        // Layout should adapt to new orientation
        expect(portraitRect.width).toBeLessThanOrEqual(portraitViewport.width);
        expect(cardElement).toBeInTheDocument();
      }
    });
  });

  describe('Touch and Gesture Support', () => {
    it('should provide adequate touch targets on mobile', () => {
      setViewport(viewports.mobile);
      
      const interactiveComponents = [
        { name: 'Button', props: { 'data-testid': 'touch-button', children: 'Touch Me' } }
      ];
      
      interactiveComponents.forEach(({ name, props }) => {
        if (!componentRegistry.hasComponent(name)) return;
        
        const validation = componentRegistry.validateComponentSpec(name, props);
        if (validation.valid && validation.data) {
          const Component = (componentRegistry as any)[name].component;
          render(React.createElement(Component, validation.data));
          
          const element = screen.getByTestId(props['data-testid']);
          const rect = element.getBoundingClientRect();
          
          // Minimum touch target size (44px x 44px on iOS, similar on Android)
          expect(rect.height).toBeGreaterThanOrEqual(44);
          expect(rect.width).toBeGreaterThanOrEqual(44);
        }
      });
    });

    it('should handle high DPI displays', () => {
      // Simulate high DPI display
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        value: 2,
      });
      
      setViewport(viewports.mobile);
      
      const testProps = {
        'data-testid': 'high-dpi-test',
        children: 'High DPI Content'
      };
      
      const validation = componentRegistry.validateComponentSpec('Button', testProps);
      if (validation.valid && validation.data) {
        const ButtonComponent = componentRegistry.Button.component;
        render(React.createElement(ButtonComponent, validation.data));
        
        const buttonElement = screen.getByTestId('high-dpi-test');
        expect(buttonElement).toBeInTheDocument();
        
        // Content should remain crisp and appropriately sized
        const rect = buttonElement.getBoundingClientRect();
        expect(rect.width).toBeGreaterThan(0);
        expect(rect.height).toBeGreaterThan(0);
      }
      
      // Reset device pixel ratio
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        value: 1,
      });
    });
  });

  describe('Performance on Mobile', () => {
    it('should render efficiently on mobile devices', () => {
      setViewport(viewports.mobile);
      
      const components = ['Button', 'Input', 'Card', 'Badge'];
      
      components.forEach(componentName => {
        if (!componentRegistry.hasComponent(componentName)) return;
        
        const startTime = performance.now();
        
        const testProps = {
          'data-testid': `mobile-perf-${componentName.toLowerCase()}`,
          children: 'Mobile Performance Test'
        };
        
        const validation = componentRegistry.validateComponentSpec(componentName, testProps);
        if (validation.valid && validation.data) {
          const Component = (componentRegistry as any)[componentName].component;
          render(React.createElement(Component, validation.data));
        }
        
        const renderTime = performance.now() - startTime;
        
        // Should render quickly even on slower mobile devices
        expect(renderTime).toBeLessThan(global.testUtils.performanceThresholds.render * 1.5);
      });
    });

    it('should handle multiple components efficiently on mobile', () => {
      setViewport(viewports.mobile);
      
      const startTime = performance.now();
      
      // Render multiple components as would appear in a real mobile UI
      for (let i = 0; i < 10; i++) {
        const cardProps = {
          'data-testid': `mobile-card-${i}`,
          title: `Card ${i}`,
          children: `Content for card ${i}`
        };
        
        const validation = componentRegistry.validateComponentSpec('Card', cardProps);
        if (validation.valid && validation.data) {
          const CardComponent = componentRegistry.Card.component;
          const { unmount } = render(React.createElement(CardComponent, validation.data));
          unmount();
        }
      }
      
      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / 10;
      
      // Average render time should be reasonable for mobile
      expect(averageTime).toBeLessThan(global.testUtils.performanceThresholds.render);
    });
  });
});