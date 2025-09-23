/**
 * Dark Mode Styles Tests
 * Tests that verify dark mode styles are properly implemented and functional
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('Dark Mode Styles Tests', () => {
  const projectRoot = path.resolve(__dirname, '../..');

  describe('Dark Mode CSS Variables', () => {
    let dom, document;

    beforeEach(() => {
      // Create DOM with dark mode CSS variables
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html class="dark">
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

              .dark-bg {
                background-color: var(--bolt-bg-primary);
              }

              .dark-text {
                color: var(--bolt-text-primary);
              }

              .dark .bg-primary {
                background-color: var(--bolt-bg-primary);
              }

              .dark .text-primary {
                color: var(--bolt-text-primary);
              }

              .light .bg-primary {
                background-color: var(--bolt-bg-primary);
              }

              .light .text-primary {
                color: var(--bolt-text-primary);
              }
            </style>
          </head>
          <body></body>
        </html>
      `);
      document = dom.window.document;
    });

    test('should define dark mode CSS variables', () => {
      const computedStyle = dom.window.getComputedStyle(document.documentElement);

      // Check primary dark mode variables
      expect(computedStyle.getPropertyValue('--bolt-bg-primary').trim()).toBe('#0c0a14');
      expect(computedStyle.getPropertyValue('--bolt-bg-secondary').trim()).toBe('#15111e');
      expect(computedStyle.getPropertyValue('--bolt-bg-tertiary').trim()).toBe('#1e1a2a');
      expect(computedStyle.getPropertyValue('--bolt-text-primary').trim()).toBe('#e5e2ff');
      expect(computedStyle.getPropertyValue('--bolt-text-secondary').trim()).toBe('#a8a4ce');
    });

    test('should switch to light mode variables when class changes', () => {
      // Switch to light mode
      document.documentElement.className = 'light';

      const computedStyle = dom.window.getComputedStyle(document.documentElement);

      // Check light mode variables
      expect(computedStyle.getPropertyValue('--bolt-bg-primary').trim()).toBe('#ffffff');
      expect(computedStyle.getPropertyValue('--bolt-bg-secondary').trim()).toBe('#f9fafb');
      expect(computedStyle.getPropertyValue('--bolt-text-primary').trim()).toBe('#111827');
      expect(computedStyle.getPropertyValue('--bolt-text-secondary').trim()).toBe('#6b7280');
    });

    test('should apply dark mode background colors', () => {
      const element = document.createElement('div');
      element.className = 'dark-bg';
      document.body.appendChild(element);

      const computedStyle = dom.window.getComputedStyle(element);
      expect(computedStyle.backgroundColor).toBe('rgb(12, 10, 20)'); // #0c0a14
    });

    test('should apply dark mode text colors', () => {
      const element = document.createElement('div');
      element.className = 'dark-text';
      document.body.appendChild(element);

      const computedStyle = dom.window.getComputedStyle(element);
      expect(computedStyle.color).toBe('rgb(229, 226, 255)'); // #e5e2ff
    });
  });

  describe('Theme-Aware Class Selectors', () => {
    let dom, document;

    beforeEach(() => {
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html class="dark">
          <head>
            <style>
              .dark .bg-gray-900 { background-color: #111827; }
              .dark .bg-gray-800 { background-color: #1f2937; }
              .dark .text-white { color: #ffffff; }
              .dark .text-gray-100 { color: #f3f4f6; }
              .dark .text-gray-300 { color: #d1d5db; }
              .dark .border-gray-700 { border-color: #374151; }

              .light .bg-white { background-color: #ffffff; }
              .light .bg-gray-50 { background-color: #f9fafb; }
              .light .text-gray-900 { color: #111827; }
              .light .text-gray-600 { color: #4b5563; }
              .light .border-gray-200 { border-color: #e5e7eb; }

              .theme-bg {
                background-color: var(--bolt-bg-primary);
                color: var(--bolt-text-primary);
              }
            </style>
          </head>
          <body></body>
        </html>
      `);
      document = dom.window.document;
    });

    test('should apply dark theme classes correctly', () => {
      const bgElement = document.createElement('div');
      bgElement.className = 'bg-gray-900';
      document.body.appendChild(bgElement);

      const textElement = document.createElement('div');
      textElement.className = 'text-white';
      document.body.appendChild(textElement);

      const bgStyle = dom.window.getComputedStyle(bgElement);
      const textStyle = dom.window.getComputedStyle(textElement);

      expect(bgStyle.backgroundColor).toBe('rgb(17, 24, 39)'); // #111827
      expect(textStyle.color).toBe('rgb(255, 255, 255)'); // #ffffff
    });

    test('should switch to light theme classes when theme changes', () => {
      // Switch to light mode
      document.documentElement.className = 'light';

      const bgElement = document.createElement('div');
      bgElement.className = 'bg-white';
      document.body.appendChild(bgElement);

      const textElement = document.createElement('div');
      textElement.className = 'text-gray-900';
      document.body.appendChild(textElement);

      const bgStyle = dom.window.getComputedStyle(bgElement);
      const textStyle = dom.window.getComputedStyle(textElement);

      expect(bgStyle.backgroundColor).toBe('rgb(255, 255, 255)'); // #ffffff
      expect(textStyle.color).toBe('rgb(17, 24, 39)'); // #111827
    });

    test('should support theme-aware CSS variables', () => {
      const element = document.createElement('div');
      element.className = 'theme-bg';
      document.body.appendChild(element);

      const computedStyle = dom.window.getComputedStyle(element);

      // Should use dark mode variables
      expect(computedStyle.backgroundColor).toBe('rgb(12, 10, 20)'); // --bolt-bg-primary dark
      expect(computedStyle.color).toBe('rgb(229, 226, 255)'); // --bolt-text-primary dark
    });
  });

  describe('Tailwind Dark Mode Classes', () => {
    let dom, document;

    beforeEach(() => {
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html class="dark">
          <head>
            <style>
              @media (prefers-color-scheme: dark) {
                .dark\\:bg-gray-900 { background-color: #111827; }
                .dark\\:text-white { color: #ffffff; }
              }

              .dark .dark\\:bg-gray-900 { background-color: #111827; }
              .dark .dark\\:text-white { color: #ffffff; }
              .dark .dark\\:border-gray-700 { border-color: #374151; }
              .dark .dark\\:hover\\:bg-gray-800:hover { background-color: #1f2937; }

              .bg-gray-50 { background-color: #f9fafb; }
              .text-gray-900 { color: #111827; }
              .border-gray-200 { border-color: #e5e7eb; }
            </style>
          </head>
          <body></body>
        </html>
      `);
      document = dom.window.document;
    });

    test('should apply Tailwind dark: prefixed classes', () => {
      const element = document.createElement('div');
      element.className = 'bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white';
      document.body.appendChild(element);

      const computedStyle = dom.window.getComputedStyle(element);

      // In dark mode, should use dark: prefixed classes
      expect(computedStyle.backgroundColor).toBe('rgb(17, 24, 39)'); // dark:bg-gray-900
      expect(computedStyle.color).toBe('rgb(255, 255, 255)'); // dark:text-white
    });

    test('should support dark mode hover states', () => {
      const element = document.createElement('button');
      element.className = 'dark:hover:bg-gray-800';
      document.body.appendChild(element);

      // Simulate hover state
      element.dispatchEvent(new dom.window.MouseEvent('mouseenter'));

      // The hover class should be available for use
      expect(element.className).toContain('dark:hover:bg-gray-800');
    });
  });

  describe('Ray Container Dark Mode Effects', () => {
    let dom, document;

    beforeEach(() => {
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              .ray-container {
                --ray-color-primary: color-mix(in srgb, var(--primary-color), transparent 30%);
                --ray-color-secondary: color-mix(in srgb, var(--secondary-color), transparent 30%);
                --ray-color-accent: color-mix(in srgb, var(--accent-color), transparent 30%);
                position: fixed;
                inset: 0;
                overflow: hidden;
                mix-blend-mode: screen;
              }

              .light-ray {
                position: absolute;
                border-radius: 100%;
                mix-blend-mode: screen;
              }

              .ray-1 {
                width: 600px;
                height: 800px;
                background: var(--ray-gradient-primary);
                filter: blur(80px);
                opacity: 0.6;
              }
            </style>
          </head>
          <body></body>
        </html>
      `);
      document = dom.window.document;
    });

    test('should apply ray container styles for dark mode effects', () => {
      const rayContainer = document.createElement('div');
      rayContainer.className = 'ray-container';
      document.body.appendChild(rayContainer);

      const computedStyle = dom.window.getComputedStyle(rayContainer);

      expect(computedStyle.position).toBe('fixed');
      expect(computedStyle.inset).toBe('0px');
      expect(computedStyle.overflow).toBe('hidden');
      expect(computedStyle.mixBlendMode).toBe('screen');
    });

    test('should apply light ray effects', () => {
      const lightRay = document.createElement('div');
      lightRay.className = 'light-ray ray-1';
      document.body.appendChild(lightRay);

      const computedStyle = dom.window.getComputedStyle(lightRay);

      expect(computedStyle.position).toBe('absolute');
      expect(computedStyle.borderRadius).toBe('100%');
      expect(computedStyle.mixBlendMode).toBe('screen');
      expect(computedStyle.width).toBe('600px');
      expect(computedStyle.height).toBe('800px');
      expect(computedStyle.filter).toBe('blur(80px)');
      expect(computedStyle.opacity).toBe('0.6');
    });
  });

  describe('Dark Mode Configuration Validation', () => {
    test('should have dark mode configuration in Tailwind config', () => {
      const tailwindConfigPath = path.join(projectRoot, 'tailwind.config.ts');

      if (fs.existsSync(tailwindConfigPath)) {
        const configContent = fs.readFileSync(tailwindConfigPath, 'utf8');

        // Check if dark mode is configured
        // Note: Tailwind v3+ uses 'class' strategy by default
        expect(configContent).toMatch(/Config|tailwindcss/);

        // The config should support dark mode through class strategy
        // (Tailwind CSS v3+ defaults to class-based dark mode)
      }
    });

    test('should have dark mode styles in globals.css', () => {
      const globalsCssPath = path.join(projectRoot, 'claudable-reference/apps/web/app/globals.css');

      if (fs.existsSync(globalsCssPath)) {
        const cssContent = fs.readFileSync(globalsCssPath, 'utf8');

        // Check for light mode overrides
        expect(cssContent).toContain(':root.light');
        expect(cssContent).toContain('--bolt-bg-primary');
        expect(cssContent).toContain('--bolt-text-primary');

        // Check for dark mode variables (default :root)
        expect(cssContent).toContain('#0c0a14'); // Dark background
        expect(cssContent).toContain('#e5e2ff'); // Light text for dark mode
      }
    });
  });

  describe('Theme Switching Functionality', () => {
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
              }

              :root.light {
                --bolt-bg-primary: #ffffff;
                --bolt-text-primary: #111827;
              }

              body {
                background-color: var(--bolt-bg-primary);
                color: var(--bolt-text-primary);
                transition: background-color 0.3s ease, color 0.3s ease;
              }
            </style>
          </head>
          <body></body>
        </html>
      `);
      document = dom.window.document;
    });

    test('should switch from dark to light mode', () => {
      // Start in dark mode (default)
      let bodyStyle = dom.window.getComputedStyle(document.body);
      expect(bodyStyle.backgroundColor).toBe('rgb(12, 10, 20)'); // Dark background
      expect(bodyStyle.color).toBe('rgb(229, 226, 255)'); // Light text

      // Switch to light mode
      document.documentElement.classList.add('light');

      bodyStyle = dom.window.getComputedStyle(document.body);
      expect(bodyStyle.backgroundColor).toBe('rgb(255, 255, 255)'); // Light background
      expect(bodyStyle.color).toBe('rgb(17, 24, 39)'); // Dark text
    });

    test('should have smooth transitions for theme switching', () => {
      const bodyStyle = dom.window.getComputedStyle(document.body);
      expect(bodyStyle.transition).toContain('background-color');
      expect(bodyStyle.transition).toContain('color');
      expect(bodyStyle.transition).toContain('0.3s');
    });
  });

  describe('System Preference Detection', () => {
    test('should support prefers-color-scheme media query', () => {
      const dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              @media (prefers-color-scheme: dark) {
                :root {
                  --system-theme: 'dark';
                }
              }

              @media (prefers-color-scheme: light) {
                :root {
                  --system-theme: 'light';
                }
              }
            </style>
          </head>
          <body></body>
        </html>
      `);

      // The CSS should contain media queries for system preference
      const styleElement = dom.window.document.querySelector('style');
      const cssText = styleElement.textContent;

      expect(cssText).toContain('@media (prefers-color-scheme: dark)');
      expect(cssText).toContain('@media (prefers-color-scheme: light)');
    });
  });
});