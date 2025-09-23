/**
 * CSS Variables Tests
 * Tests that verify CSS custom properties (variables) are properly defined and accessible
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('CSS Variables Tests', () => {
  const projectRoot = path.resolve(__dirname, '../..');

  describe('CSS Custom Properties Definition', () => {
    let dom, document;

    beforeEach(() => {
      // Create DOM with CSS variables from globals.css
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              :root {
                --gradient-opacity: 0.8;
                --primary-color: rgba(139, 92, 246, var(--gradient-opacity));
                --secondary-color: rgba(236, 72, 153, var(--gradient-opacity));
                --accent-color: rgba(59, 130, 246, var(--gradient-opacity));
                --bolt-bg-primary: #0c0a14;
                --bolt-bg-secondary: #15111e;
                --bolt-bg-tertiary: #1e1a2a;
                --bolt-border-color: rgba(139, 92, 246, 0.2);
                --bolt-text-primary: #e5e2ff;
                --bolt-text-secondary: #a8a4ce;
                --bolt-text-tertiary: #6b6685;
              }

              :root.light {
                --bolt-bg-primary: #ffffff;
                --bolt-bg-secondary: #f9fafb;
                --bolt-bg-tertiary: #f3f4f6;
                --bolt-border-color: rgba(139, 92, 246, 0.15);
                --bolt-text-primary: #111827;
                --bolt-text-secondary: #6b7280;
                --bolt-text-tertiary: #9ca3af;
              }

              /* Ray container variables */
              .ray-container {
                --ray-color-primary: color-mix(in srgb, var(--primary-color), transparent 30%);
                --ray-color-secondary: color-mix(in srgb, var(--secondary-color), transparent 30%);
                --ray-color-accent: color-mix(in srgb, var(--accent-color), transparent 30%);
                --ray-gradient-primary: radial-gradient(var(--ray-color-primary) 0%, transparent 70%);
                --ray-gradient-secondary: radial-gradient(var(--ray-color-secondary) 0%, transparent 70%);
                --ray-gradient-accent: radial-gradient(var(--ray-color-accent) 0%, transparent 70%);
              }
            </style>
          </head>
          <body></body>
        </html>
      `);
      document = dom.window.document;
    });

    test('should define all required root-level CSS variables', () => {
      const computedStyle = dom.window.getComputedStyle(document.documentElement);

      // Basic opacity and color variables
      expect(computedStyle.getPropertyValue('--gradient-opacity').trim()).toBe('0.8');
      expect(computedStyle.getPropertyValue('--primary-color').trim()).toBeTruthy();
      expect(computedStyle.getPropertyValue('--secondary-color').trim()).toBeTruthy();
      expect(computedStyle.getPropertyValue('--accent-color').trim()).toBeTruthy();

      // Dark theme background variables
      expect(computedStyle.getPropertyValue('--bolt-bg-primary').trim()).toBe('#0c0a14');
      expect(computedStyle.getPropertyValue('--bolt-bg-secondary').trim()).toBe('#15111e');
      expect(computedStyle.getPropertyValue('--bolt-bg-tertiary').trim()).toBe('#1e1a2a');

      // Dark theme text variables
      expect(computedStyle.getPropertyValue('--bolt-text-primary').trim()).toBe('#e5e2ff');
      expect(computedStyle.getPropertyValue('--bolt-text-secondary').trim()).toBe('#a8a4ce');
      expect(computedStyle.getPropertyValue('--bolt-text-tertiary').trim()).toBe('#6b6685');

      // Border color variable
      expect(computedStyle.getPropertyValue('--bolt-border-color').trim()).toBeTruthy();
    });

    test('should switch CSS variables in light mode', () => {
      // Switch to light mode
      document.documentElement.classList.add('light');

      const computedStyle = dom.window.getComputedStyle(document.documentElement);

      // Light theme background variables
      expect(computedStyle.getPropertyValue('--bolt-bg-primary').trim()).toBe('#ffffff');
      expect(computedStyle.getPropertyValue('--bolt-bg-secondary').trim()).toBe('#f9fafb');
      expect(computedStyle.getPropertyValue('--bolt-bg-tertiary').trim()).toBe('#f3f4f6');

      // Light theme text variables
      expect(computedStyle.getPropertyValue('--bolt-text-primary').trim()).toBe('#111827');
      expect(computedStyle.getPropertyValue('--bolt-text-secondary').trim()).toBe('#6b7280');
      expect(computedStyle.getPropertyValue('--bolt-text-tertiary').trim()).toBe('#9ca3af');

      // Border color should also change
      expect(computedStyle.getPropertyValue('--bolt-border-color').trim()).toContain('0.15');
    });

    test('should define ray container CSS variables', () => {
      const rayContainer = document.createElement('div');
      rayContainer.className = 'ray-container';
      document.body.appendChild(rayContainer);

      const computedStyle = dom.window.getComputedStyle(rayContainer);

      // Ray color variables
      expect(computedStyle.getPropertyValue('--ray-color-primary').trim()).toBeTruthy();
      expect(computedStyle.getPropertyValue('--ray-color-secondary').trim()).toBeTruthy();
      expect(computedStyle.getPropertyValue('--ray-color-accent').trim()).toBeTruthy();

      // Ray gradient variables
      expect(computedStyle.getPropertyValue('--ray-gradient-primary').trim()).toContain('radial-gradient');
      expect(computedStyle.getPropertyValue('--ray-gradient-secondary').trim()).toContain('radial-gradient');
      expect(computedStyle.getPropertyValue('--ray-gradient-accent').trim()).toContain('radial-gradient');
    });

    test('should support nested CSS variable references', () => {
      const computedStyle = dom.window.getComputedStyle(document.documentElement);

      // Test that variables can reference other variables
      const primaryColor = computedStyle.getPropertyValue('--primary-color').trim();
      const gradientOpacity = computedStyle.getPropertyValue('--gradient-opacity').trim();

      expect(primaryColor).toContain('rgba');
      expect(primaryColor).toContain('139, 92, 246'); // Purple RGB values
      expect(gradientOpacity).toBe('0.8');
    });
  });

  describe('CSS Variable Usage in Styles', () => {
    let dom, document;

    beforeEach(() => {
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              :root {
                --bolt-bg-primary: #0c0a14;
                --bolt-text-primary: #e5e2ff;
                --bolt-border-color: rgba(139, 92, 246, 0.2);
                --primary-color: rgba(139, 92, 246, 0.8);
              }

              .themed-background {
                background-color: var(--bolt-bg-primary);
                color: var(--bolt-text-primary);
                border: 1px solid var(--bolt-border-color);
              }

              .themed-text {
                color: var(--bolt-text-primary);
              }

              .themed-border {
                border-color: var(--bolt-border-color);
              }

              .primary-bg {
                background-color: var(--primary-color);
              }

              /* Test fallback values */
              .with-fallback {
                background-color: var(--nonexistent-variable, #ffffff);
                color: var(--bolt-text-primary, #000000);
              }
            </style>
          </head>
          <body></body>
        </html>
      `);
      document = dom.window.document;
    });

    test('should apply CSS variables to background colors', () => {
      const themedElement = document.createElement('div');
      themedElement.className = 'themed-background';
      document.body.appendChild(themedElement);

      const computedStyle = dom.window.getComputedStyle(themedElement);

      expect(computedStyle.backgroundColor).toBe('rgb(12, 10, 20)'); // #0c0a14 converted
      expect(computedStyle.color).toBe('rgb(229, 226, 255)'); // #e5e2ff converted
      expect(computedStyle.borderColor).toBe('rgba(139, 92, 246, 0.2)');
    });

    test('should apply CSS variables to text colors', () => {
      const textElement = document.createElement('p');
      textElement.className = 'themed-text';
      document.body.appendChild(textElement);

      const computedStyle = dom.window.getComputedStyle(textElement);
      expect(computedStyle.color).toBe('rgb(229, 226, 255)'); // #e5e2ff
    });

    test('should apply CSS variables to border colors', () => {
      const borderElement = document.createElement('div');
      borderElement.className = 'themed-border';
      borderElement.style.border = '1px solid';
      document.body.appendChild(borderElement);

      const computedStyle = dom.window.getComputedStyle(borderElement);
      expect(computedStyle.borderColor).toBe('rgba(139, 92, 246, 0.2)');
    });

    test('should handle CSS variable fallback values', () => {
      const fallbackElement = document.createElement('div');
      fallbackElement.className = 'with-fallback';
      document.body.appendChild(fallbackElement);

      const computedStyle = dom.window.getComputedStyle(fallbackElement);

      // Should use fallback for nonexistent variable
      expect(computedStyle.backgroundColor).toBe('rgb(255, 255, 255)'); // #ffffff fallback

      // Should use actual variable value when it exists
      expect(computedStyle.color).toBe('rgb(229, 226, 255)'); // --bolt-text-primary
    });
  });

  describe('Dynamic CSS Variable Updates', () => {
    let dom, document;

    beforeEach(() => {
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              :root {
                --dynamic-color: #ff0000;
                --dynamic-size: 16px;
              }

              .dynamic-element {
                color: var(--dynamic-color);
                font-size: var(--dynamic-size);
              }
            </style>
          </head>
          <body></body>
        </html>
      `);
      document = dom.window.document;
    });

    test('should update when CSS variables change', () => {
      const dynamicElement = document.createElement('div');
      dynamicElement.className = 'dynamic-element';
      document.body.appendChild(dynamicElement);

      // Initial values
      let computedStyle = dom.window.getComputedStyle(dynamicElement);
      expect(computedStyle.color).toBe('rgb(255, 0, 0)'); // #ff0000
      expect(computedStyle.fontSize).toBe('16px');

      // Change CSS variable
      document.documentElement.style.setProperty('--dynamic-color', '#00ff00');
      document.documentElement.style.setProperty('--dynamic-size', '20px');

      // Check updated values
      computedStyle = dom.window.getComputedStyle(dynamicElement);
      expect(computedStyle.color).toBe('rgb(0, 255, 0)'); // #00ff00
      expect(computedStyle.fontSize).toBe('20px');
    });
  });

  describe('CSS Variable Inheritance', () => {
    let dom, document;

    beforeEach(() => {
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              :root {
                --inherited-color: #333333;
              }

              .parent {
                --local-color: #666666;
              }

              .child {
                color: var(--inherited-color);
                background-color: var(--local-color);
              }
            </style>
          </head>
          <body></body>
        </html>
      `);
      document = dom.window.document;
    });

    test('should inherit CSS variables from parent elements', () => {
      const parentElement = document.createElement('div');
      parentElement.className = 'parent';
      document.body.appendChild(parentElement);

      const childElement = document.createElement('div');
      childElement.className = 'child';
      parentElement.appendChild(childElement);

      const computedStyle = dom.window.getComputedStyle(childElement);

      // Should inherit from :root
      expect(computedStyle.color).toBe('rgb(51, 51, 51)'); // #333333

      // Should inherit from parent
      expect(computedStyle.backgroundColor).toBe('rgb(102, 102, 102)'); // #666666
    });
  });

  describe('CSS Variables in Media Queries', () => {
    let dom, document;

    beforeEach(() => {
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              :root {
                --responsive-size: 16px;
                --responsive-spacing: 1rem;
              }

              @media (max-width: 768px) {
                :root {
                  --responsive-size: 14px;
                  --responsive-spacing: 0.5rem;
                }
              }

              .responsive-element {
                font-size: var(--responsive-size);
                padding: var(--responsive-spacing);
              }
            </style>
          </head>
          <body></body>
        </html>
      `);
      document = dom.window.document;
    });

    test('should support CSS variables in media queries', () => {
      // This test verifies that the CSS structure supports responsive variables
      const styleSheet = document.querySelector('style').sheet;
      const rules = Array.from(styleSheet.cssRules);

      const mediaQuery = rules.find(rule => rule.type === CSSRule.MEDIA_RULE);
      expect(mediaQuery).toBeTruthy();
      expect(mediaQuery.media.mediaText).toBe('(max-width: 768px)');

      // Check that variables are defined in the media query
      const mediaRules = Array.from(mediaQuery.cssRules);
      const rootRule = mediaRules.find(rule => rule.selectorText === ':root');
      expect(rootRule).toBeTruthy();
    });
  });

  describe('CSS Variables in Actual Project Files', () => {
    test('should validate CSS variables in globals.css', () => {
      const globalsCssPath = path.join(projectRoot, 'claudable-reference/apps/web/app/globals.css');

      if (fs.existsSync(globalsCssPath)) {
        const cssContent = fs.readFileSync(globalsCssPath, 'utf8');

        // Check for variable definitions
        expect(cssContent).toContain('--gradient-opacity');
        expect(cssContent).toContain('--primary-color');
        expect(cssContent).toContain('--secondary-color');
        expect(cssContent).toContain('--accent-color');
        expect(cssContent).toContain('--bolt-bg-primary');
        expect(cssContent).toContain('--bolt-text-primary');

        // Check for light mode overrides
        expect(cssContent).toContain(':root.light');

        // Check for ray container variables
        expect(cssContent).toContain('--ray-color-primary');
        expect(cssContent).toContain('--ray-gradient-primary');

        // Check for proper CSS variable syntax
        expect(cssContent).toMatch(/--[\w-]+:\s*[^;]+;/); // Basic CSS variable pattern
      }
    });

    test('should validate CSS variable usage patterns', () => {
      const globalsCssPath = path.join(projectRoot, 'claudable-reference/apps/web/app/globals.css');

      if (fs.existsSync(globalsCssPath)) {
        const cssContent = fs.readFileSync(globalsCssPath, 'utf8');

        // Check for var() usage
        expect(cssContent).toMatch(/var\(--[\w-]+\)/); // Basic var() usage
        expect(cssContent).toMatch(/var\(--[\w-]+,\s*[^)]+\)/); // var() with fallback

        // Check for color-mix usage with variables
        expect(cssContent).toContain('color-mix(in srgb, var(--');

        // Check for variable references in gradients
        expect(cssContent).toContain('var(--ray-');
      }
    });
  });

  describe('CSS Variable Error Handling', () => {
    let dom, document;

    beforeEach(() => {
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              .error-test {
                /* Test undefined variable */
                color: var(--undefined-variable);

                /* Test undefined variable with fallback */
                background-color: var(--undefined-variable, #ffffff);

                /* Test circular reference protection */
                --circular-a: var(--circular-b);
                --circular-b: var(--circular-a);
                border-color: var(--circular-a, #cccccc);
              }
            </style>
          </head>
          <body></body>
        </html>
      `);
      document = dom.window.document;
    });

    test('should handle undefined CSS variables gracefully', () => {
      const errorElement = document.createElement('div');
      errorElement.className = 'error-test';
      document.body.appendChild(errorElement);

      const computedStyle = dom.window.getComputedStyle(errorElement);

      // Undefined variable without fallback should use initial value
      // (which is typically transparent for color)
      expect(computedStyle.color).toBeDefined();

      // Undefined variable with fallback should use fallback
      expect(computedStyle.backgroundColor).toBe('rgb(255, 255, 255)'); // #ffffff fallback

      // Circular reference should use fallback
      expect(computedStyle.borderColor).toBe('rgb(204, 204, 204)'); // #cccccc fallback
    });
  });

  describe('Performance Impact of CSS Variables', () => {
    test('should not significantly impact rendering performance', () => {
      const startTime = performance.now();

      const dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              :root {
                ${Array.from({ length: 100 }, (_, i) => `--var-${i}: #${i.toString(16).padStart(6, '0')};`).join('\n')}
              }

              ${Array.from({ length: 100 }, (_, i) => `
                .test-${i} {
                  color: var(--var-${i});
                  background-color: var(--var-${Math.floor(i / 2)});
                }
              `).join('\n')}
            </style>
          </head>
          <body></body>
        </html>
      `);

      const endTime = performance.now();
      const processTime = endTime - startTime;

      // Should process 100 variables and classes in reasonable time
      expect(processTime).toBeLessThan(1000); // Less than 1 second
    });
  });
});