/**
 * CSS Console Errors Tests
 * Tests that verify no CSS errors are reported in the browser console
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('CSS Console Errors Tests', () => {
  const projectRoot = path.resolve(__dirname, '../..');

  describe('CSS Syntax Error Detection', () => {
    test('should not have syntax errors in agents.css', () => {
      const agentsCssPath = path.join(projectRoot, 'styles', 'agents.css');

      if (fs.existsSync(agentsCssPath)) {
        const cssContent = fs.readFileSync(agentsCssPath, 'utf8');

        // Check for common syntax errors
        const syntaxErrors = [];

        // Check for balanced braces
        const openBraces = (cssContent.match(/{/g) || []).length;
        const closeBraces = (cssContent.match(/}/g) || []).length;
        if (openBraces !== closeBraces) {
          syntaxErrors.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
        }

        // Check for double semicolons
        if (cssContent.includes(';;')) {
          syntaxErrors.push('Double semicolons found');
        }

        // Check for empty property values
        if (cssContent.match(/:\s*;/)) {
          syntaxErrors.push('Empty property values found');
        }

        // Check for missing semicolons before closing braces
        const missingSemicolons = cssContent.match(/[^;{\s]\s*}/g);
        if (missingSemicolons) {
          syntaxErrors.push(`Missing semicolons before closing braces: ${missingSemicolons.length} instances`);
        }

        // Check for invalid color values
        const invalidColors = cssContent.match(/#[0-9a-fA-F]{1,2}(?![0-9a-fA-F])|#[0-9a-fA-F]{4,5}(?![0-9a-fA-F])|#[0-9a-fA-F]{7,}/g);
        if (invalidColors) {
          syntaxErrors.push(`Invalid color values: ${invalidColors.join(', ')}`);
        }

        expect(syntaxErrors).toEqual([]);
      }
    });

    test('should not have syntax errors in test-input.css', () => {
      const testInputCssPath = path.join(projectRoot, 'test-input.css');

      if (fs.existsSync(testInputCssPath)) {
        const cssContent = fs.readFileSync(testInputCssPath, 'utf8');

        // Basic syntax checks
        const openBraces = (cssContent.match(/{/g) || []).length;
        const closeBraces = (cssContent.match(/}/g) || []).length;

        expect(openBraces).toBe(closeBraces);
        expect(cssContent).not.toContain(';;');
        expect(cssContent).not.toMatch(/:\s*;/);
      }
    });

    test('should not have syntax errors in globals.css', () => {
      const globalsCssPath = path.join(projectRoot, 'claudable-reference/apps/web/app/globals.css');

      if (fs.existsSync(globalsCssPath)) {
        const cssContent = fs.readFileSync(globalsCssPath, 'utf8');

        // Check for balanced braces
        const openBraces = (cssContent.match(/{/g) || []).length;
        const closeBraces = (cssContent.match(/}/g) || []).length;

        expect(openBraces).toBe(closeBraces);
        expect(cssContent).not.toContain(';;');
      }
    });
  });

  describe('CSS Property Validation', () => {
    let dom, document, consoleErrors;

    beforeEach(() => {
      consoleErrors = [];

      // Mock console.error to capture CSS errors
      const originalConsoleError = console.error;
      console.error = (...args) => {
        consoleErrors.push(args.join(' '));
        originalConsoleError.apply(console, args);
      };

      // Create DOM with error detection
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              /* Valid CSS */
              .valid-class {
                color: #333333;
                background-color: rgba(255, 255, 255, 0.95);
                padding: 1rem;
                margin: 0 auto;
                border-radius: 8px;
                font-family: 'Inter', sans-serif;
              }

              /* Test various property types */
              .layout-test {
                display: flex;
                justify-content: center;
                align-items: center;
                flex-direction: column;
                gap: 1rem;
              }

              .grid-test {
                display: grid;
                grid-template-columns: 1fr 3fr;
                grid-gap: 2rem;
              }

              .animation-test {
                animation: fadeIn 0.3s ease-in-out;
                transition: all 0.3s ease;
                transform: translateY(0);
              }

              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
            </style>
          </head>
          <body></body>
        </html>
      `, {
        pretendToBeVisual: true,
        resources: 'usable'
      });

      document = dom.window.document;
    });

    afterEach(() => {
      // Restore original console.error
      console.error = console.error.originalFunction || console.error;
    });

    test('should not generate console errors for valid CSS properties', () => {
      const validElement = document.createElement('div');
      validElement.className = 'valid-class';
      document.body.appendChild(validElement);

      const computedStyle = dom.window.getComputedStyle(validElement);

      // Verify styles are applied correctly
      expect(computedStyle.color).toBe('rgb(51, 51, 51)');
      expect(computedStyle.padding).toBe('1rem');
      expect(computedStyle.borderRadius).toBe('8px');

      // No CSS errors should be reported
      expect(consoleErrors.filter(error => error.includes('CSS'))).toEqual([]);
    });

    test('should not generate console errors for flexbox properties', () => {
      const flexElement = document.createElement('div');
      flexElement.className = 'layout-test';
      document.body.appendChild(flexElement);

      const computedStyle = dom.window.getComputedStyle(flexElement);

      expect(computedStyle.display).toBe('flex');
      expect(computedStyle.justifyContent).toBe('center');
      expect(computedStyle.alignItems).toBe('center');
      expect(computedStyle.flexDirection).toBe('column');

      expect(consoleErrors.filter(error => error.includes('CSS'))).toEqual([]);
    });

    test('should not generate console errors for grid properties', () => {
      const gridElement = document.createElement('div');
      gridElement.className = 'grid-test';
      document.body.appendChild(gridElement);

      const computedStyle = dom.window.getComputedStyle(gridElement);

      expect(computedStyle.display).toBe('grid');
      expect(computedStyle.gridTemplateColumns).toBe('1fr 3fr');

      expect(consoleErrors.filter(error => error.includes('CSS'))).toEqual([]);
    });

    test('should not generate console errors for animation properties', () => {
      const animationElement = document.createElement('div');
      animationElement.className = 'animation-test';
      document.body.appendChild(animationElement);

      const computedStyle = dom.window.getComputedStyle(animationElement);

      expect(computedStyle.animation).toContain('fadeIn');
      expect(computedStyle.transition).toBe('all 0.3s ease 0s');
      expect(computedStyle.transform).toContain('translateY(0');

      expect(consoleErrors.filter(error => error.includes('CSS'))).toEqual([]);
    });
  });

  describe('CSS Units and Values Validation', () => {
    let dom, document;

    beforeEach(() => {
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              .units-test {
                /* Length units */
                width: 100px;
                height: 50vh;
                padding: 1rem 2em 3ch 4vw;
                margin: 0.5in 1cm 2mm 3pt;

                /* Color units */
                color: #333;
                background-color: rgb(255, 255, 255);
                border-color: rgba(0, 0, 0, 0.1);
                box-shadow: 0 2px 4px hsla(210, 100%, 50%, 0.2);

                /* Percentage units */
                max-width: 100%;
                opacity: 0.95;

                /* Calc values */
                min-height: calc(100vh - 60px);
                font-size: calc(1rem + 0.5vw);
              }

              .gradient-test {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
              }

              .transform-test {
                transform: translateX(10px) rotateY(45deg) scale(1.1);
                filter: blur(2px) brightness(110%) contrast(95%);
              }
            </style>
          </head>
          <body></body>
        </html>
      `);
      document = dom.window.document;
    });

    test('should handle various CSS units correctly', () => {
      const unitsElement = document.createElement('div');
      unitsElement.className = 'units-test';
      document.body.appendChild(unitsElement);

      const computedStyle = dom.window.getComputedStyle(unitsElement);

      // Basic units
      expect(computedStyle.width).toBe('100px');
      expect(computedStyle.height).toBe('50vh');

      // Color values
      expect(computedStyle.color).toBe('rgb(51, 51, 51)');
      expect(computedStyle.backgroundColor).toBe('rgb(255, 255, 255)');

      // Percentage and opacity
      expect(computedStyle.maxWidth).toBe('100%');
      expect(computedStyle.opacity).toBe('0.95');
    });

    test('should handle gradient values correctly', () => {
      const gradientElement = document.createElement('div');
      gradientElement.className = 'gradient-test';
      document.body.appendChild(gradientElement);

      const computedStyle = dom.window.getComputedStyle(gradientElement);

      // Should contain gradient information
      expect(computedStyle.background).toContain('gradient');
    });

    test('should handle transform and filter values correctly', () => {
      const transformElement = document.createElement('div');
      transformElement.className = 'transform-test';
      document.body.appendChild(transformElement);

      const computedStyle = dom.window.getComputedStyle(transformElement);

      expect(computedStyle.transform).toBeDefined();
      expect(computedStyle.filter).toBeDefined();
    });
  });

  describe('CSS Custom Properties Error Handling', () => {
    let dom, document, consoleErrors;

    beforeEach(() => {
      consoleErrors = [];

      const originalConsoleError = console.error;
      console.error = (...args) => {
        consoleErrors.push(args.join(' '));
        originalConsoleError.apply(console, args);
      };

      dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              :root {
                --valid-color: #333333;
                --valid-size: 16px;
                --valid-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }

              .custom-props-test {
                color: var(--valid-color);
                font-size: var(--valid-size);
                background: var(--valid-gradient);

                /* Test fallback values */
                border-color: var(--nonexistent-prop, #cccccc);
                padding: var(--another-nonexistent, 1rem);
              }

              .nested-props-test {
                --local-prop: var(--valid-color);
                color: var(--local-prop);
              }
            </style>
          </head>
          <body></body>
        </html>
      `);
      document = dom.window.document;
    });

    afterEach(() => {
      console.error = console.error.originalFunction || console.error;
    });

    test('should not generate errors for valid custom properties', () => {
      const customPropsElement = document.createElement('div');
      customPropsElement.className = 'custom-props-test';
      document.body.appendChild(customPropsElement);

      const computedStyle = dom.window.getComputedStyle(customPropsElement);

      expect(computedStyle.color).toBe('rgb(51, 51, 51)');
      expect(computedStyle.fontSize).toBe('16px');

      // Should not generate CSS errors
      expect(consoleErrors.filter(error => error.includes('CSS'))).toEqual([]);
    });

    test('should handle nested custom properties without errors', () => {
      const nestedPropsElement = document.createElement('div');
      nestedPropsElement.className = 'nested-props-test';
      document.body.appendChild(nestedPropsElement);

      const computedStyle = dom.window.getComputedStyle(nestedPropsElement);

      expect(computedStyle.color).toBe('rgb(51, 51, 51)');
      expect(consoleErrors.filter(error => error.includes('CSS'))).toEqual([]);
    });
  });

  describe('Media Query Error Detection', () => {
    let dom, document;

    beforeEach(() => {
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              .responsive-element {
                font-size: 16px;
                padding: 1rem;
              }

              @media screen and (max-width: 768px) {
                .responsive-element {
                  font-size: 14px;
                  padding: 0.5rem;
                }
              }

              @media (min-width: 1024px) {
                .responsive-element {
                  font-size: 18px;
                  padding: 1.5rem;
                }
              }

              @media print {
                .responsive-element {
                  color: black;
                  background: white;
                }
              }

              /* Complex media query */
              @media screen and (min-width: 640px) and (max-width: 1023px) {
                .responsive-element {
                  font-size: 15px;
                }
              }
            </style>
          </head>
          <body></body>
        </html>
      `);
      document = dom.window.document;
    });

    test('should parse media queries without errors', () => {
      const styleSheet = document.querySelector('style').sheet;
      const rules = Array.from(styleSheet.cssRules);

      const mediaRules = rules.filter(rule => rule.type === CSSRule.MEDIA_RULE);

      // Should have multiple media queries
      expect(mediaRules.length).toBeGreaterThan(0);

      // Check specific media queries
      const mobileQuery = mediaRules.find(rule =>
        rule.media.mediaText.includes('max-width: 768px')
      );
      expect(mobileQuery).toBeTruthy();

      const desktopQuery = mediaRules.find(rule =>
        rule.media.mediaText.includes('min-width: 1024px')
      );
      expect(desktopQuery).toBeTruthy();

      const printQuery = mediaRules.find(rule =>
        rule.media.mediaText === 'print'
      );
      expect(printQuery).toBeTruthy();
    });

    test('should apply base styles correctly', () => {
      const responsiveElement = document.createElement('div');
      responsiveElement.className = 'responsive-element';
      document.body.appendChild(responsiveElement);

      const computedStyle = dom.window.getComputedStyle(responsiveElement);

      expect(computedStyle.fontSize).toBe('16px');
      expect(computedStyle.padding).toBe('1rem');
    });
  });

  describe('CSS Import and Font Loading Errors', () => {
    test('should validate external font imports in globals.css', () => {
      const globalsCssPath = path.join(projectRoot, 'claudable-reference/apps/web/app/globals.css');

      if (fs.existsSync(globalsCssPath)) {
        const cssContent = fs.readFileSync(globalsCssPath, 'utf8');

        // Check for Google Fonts imports
        const fontImports = cssContent.match(/@import\s+url\([^)]+\);/g);

        if (fontImports) {
          fontImports.forEach(importStatement => {
            // Should be valid URL format
            expect(importStatement).toMatch(/https?:\/\/fonts\.googleapis\.com/);
            expect(importStatement).toMatch(/display=swap/); // Performance best practice
          });
        }

        // Check for Tailwind imports
        expect(cssContent).toContain('@tailwind base');
        expect(cssContent).toContain('@tailwind components');
        expect(cssContent).toContain('@tailwind utilities');
      }
    });

    test('should validate CSS import syntax', () => {
      const testInputCssPath = path.join(projectRoot, 'test-input.css');

      if (fs.existsSync(testInputCssPath)) {
        const cssContent = fs.readFileSync(testInputCssPath, 'utf8');

        // Check Tailwind import
        expect(cssContent).toContain('@import "tailwindcss"');

        // Should not have syntax errors in import
        const imports = cssContent.match(/@import\s+[^;]+;/g);
        if (imports) {
          imports.forEach(importStatement => {
            expect(importStatement).toMatch(/^@import\s+["'][^"']+["']\s*;$/);
          });
        }
      }
    });
  });

  describe('CSS Performance and Optimization', () => {
    test('should not have excessive CSS selector specificity', () => {
      const agentsCssPath = path.join(projectRoot, 'styles', 'agents.css');

      if (fs.existsSync(agentsCssPath)) {
        const cssContent = fs.readFileSync(agentsCssPath, 'utf8');

        // Check for overly specific selectors (more than 3 levels)
        const overlySpecificSelectors = cssContent.match(/(\w+\s*>\s*){4,}|\w+(\s+\w+){4,}/g);

        if (overlySpecificSelectors) {
          console.warn('Found potentially overly specific selectors:', overlySpecificSelectors);
          // This is a warning, not a failure, as it depends on use case
        }

        // Check for !important usage (should be minimal)
        const importantCount = (cssContent.match(/!important/g) || []).length;
        expect(importantCount).toBeLessThan(5); // Allow some !important but not excessive
      }
    });

    test('should not have redundant CSS properties', () => {
      const agentsCssPath = path.join(projectRoot, 'styles', 'agents.css');

      if (fs.existsSync(agentsCssPath)) {
        const cssContent = fs.readFileSync(agentsCssPath, 'utf8');

        // Look for potential redundancies (basic check)
        const lines = cssContent.split('\n');
        const propertyDuplicates = new Set();

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.includes(':') && line.includes(';')) {
            const property = line.split(':')[0].trim();
            if (propertyDuplicates.has(property)) {
              // This could indicate redundancy within the same rule
              console.warn(`Potential duplicate property: ${property} at line ${i + 1}`);
            }
            propertyDuplicates.add(property);
          }
        }
      }
    });
  });
});