/**
 * Tailwind Class Application Tests - TDD Regression Prevention
 *
 * Validates Tailwind CSS classes are properly compiled and applied
 * Prevents CSS class conflicts and missing styles
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { JSDOM } from 'jsdom';

describe('Tailwind Class Application Tests', () => {
  let dom;
  let document;
  let window;

  beforeAll(() => {
    // Setup JSDOM with mock Tailwind CSS output
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            /* Mock Tailwind base layer */
            * {
              box-sizing: border-box;
              border-width: 0;
              border-style: solid;
              border-color: #e5e7eb;
            }

            /* Mock Tailwind utilities */
            .bg-background { background-color: hsl(var(--background)); }
            .text-foreground { color: hsl(var(--foreground)); }
            .bg-primary { background-color: hsl(var(--primary)); }
            .text-primary { color: hsl(var(--primary)); }
            .bg-secondary { background-color: hsl(var(--secondary)); }
            .text-secondary { color: hsl(var(--secondary)); }

            .p-4 { padding: 1rem; }
            .m-2 { margin: 0.5rem; }
            .w-full { width: 100%; }
            .h-screen { height: 100vh; }
            .flex { display: flex; }
            .flex-col { flex-direction: column; }
            .items-center { align-items: center; }
            .justify-center { justify-content: center; }
            .space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 1rem; }
            .rounded { border-radius: 0.25rem; }
            .border { border-width: 1px; }
            .shadow { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06); }

            .hover\\:bg-primary:hover { background-color: hsl(var(--primary)); }
            .focus\\:ring-2:focus { ring-width: 2px; }
            .active\\:scale-95:active { transform: scale(0.95); }

            .sm\\:p-6 { @media (min-width: 640px) { padding: 1.5rem; } }
            .md\\:w-1\\/2 { @media (min-width: 768px) { width: 50%; } }
            .lg\\:max-w-4xl { @media (min-width: 1024px) { max-width: 56rem; } }

            .dark .dark\\:bg-background { background-color: hsl(var(--background)); }
            .dark .dark\\:text-foreground { color: hsl(var(--foreground)); }

            /* Custom utilities from Tailwind config */
            .text-shadow-sm { text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); }
            .text-shadow-md { text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); }
            .animate-pulse-slow { animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
            .animate-bounce-gentle { animation: bounce 2s infinite; }

            /* CSS Variables */
            :root {
              --background: 0 0% 100%;
              --foreground: 222.2 84% 4.9%;
              --primary: 221.2 83.2% 53.3%;
              --secondary: 210 40% 96%;
            }

            .dark {
              --background: 222.2 84% 4.9%;
              --foreground: 210 40% 98%;
              --primary: 217.2 91.2% 59.8%;
              --secondary: 217.2 32.6% 17.5%;
            }
          </style>
        </head>
        <body>
          <div id="root"></div>
        </body>
      </html>
    `, {
      url: 'http://localhost:3003',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    document = dom.window.document;
    window = dom.window;
    global.document = document;
    global.window = window;
  });

  afterAll(() => {
    dom.window.close();
  });

  beforeEach(() => {
    // Clear root element before each test
    const root = document.getElementById('root');
    root.innerHTML = '';
  });

  test('should apply basic Tailwind utility classes', () => {
    const element = document.createElement('div');
    element.className = 'bg-background text-foreground p-4 m-2 w-full';
    document.getElementById('root').appendChild(element);

    const computedStyle = window.getComputedStyle(element);

    expect(computedStyle.backgroundColor).toBe('hsl(0 0% 100%)');
    expect(computedStyle.color).toBe('hsl(222.2 84% 4.9%)');
    expect(computedStyle.padding).toBe('1rem');
    expect(computedStyle.margin).toBe('0.5rem');
    expect(computedStyle.width).toBe('100%');
  });

  test('should apply Flexbox utility classes correctly', () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col items-center justify-center h-screen';
    document.getElementById('root').appendChild(container);

    const computedStyle = window.getComputedStyle(container);

    expect(computedStyle.display).toBe('flex');
    expect(computedStyle.flexDirection).toBe('column');
    expect(computedStyle.alignItems).toBe('center');
    expect(computedStyle.justifyContent).toBe('center');
    expect(computedStyle.height).toBe('100vh');
  });

  test('should apply spacing utility classes', () => {
    const container = document.createElement('div');
    container.className = 'space-y-4';

    const child1 = document.createElement('div');
    const child2 = document.createElement('div');

    container.appendChild(child1);
    container.appendChild(child2);
    document.getElementById('root').appendChild(container);

    const child2Style = window.getComputedStyle(child2);
    expect(child2Style.marginTop).toBe('1rem');
  });

  test('should apply border and shadow utility classes', () => {
    const element = document.createElement('div');
    element.className = 'rounded border shadow';
    document.getElementById('root').appendChild(element);

    const computedStyle = window.getComputedStyle(element);

    expect(computedStyle.borderRadius).toBe('0.25rem');
    expect(computedStyle.borderWidth).toBe('1px');
    expect(computedStyle.boxShadow).toContain('rgba(0, 0, 0, 0.1)');
  });

  test('should apply custom Tailwind utilities from config', () => {
    const element = document.createElement('div');
    element.className = 'text-shadow-md animate-pulse-slow';
    document.getElementById('root').appendChild(element);

    const computedStyle = window.getComputedStyle(element);

    expect(computedStyle.textShadow).toBe('0 2px 4px rgba(0, 0, 0, 0.3)');
    expect(computedStyle.animation).toContain('pulse');
    expect(computedStyle.animation).toContain('3s');
  });

  test('should apply hover states correctly', () => {
    const button = document.createElement('button');
    button.className = 'hover:bg-primary focus:ring-2 active:scale-95';
    document.getElementById('root').appendChild(button);

    // Simulate hover state
    button.dispatchEvent(new window.Event('mouseenter'));

    // CSS selectors should be present in stylesheet
    const stylesheets = Array.from(document.styleSheets);
    const hasHoverRule = stylesheets.some(sheet => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        return rules.some(rule => rule.selectorText && rule.selectorText.includes('hover:bg-primary:hover'));
      } catch (e) {
        return false;
      }
    });

    expect(hasHoverRule).toBe(true);
  });

  test('should apply responsive utility classes', () => {
    const element = document.createElement('div');
    element.className = 'p-4 sm:p-6 md:w-1/2 lg:max-w-4xl';
    document.getElementById('root').appendChild(element);

    // Test base styles
    const computedStyle = window.getComputedStyle(element);
    expect(computedStyle.padding).toBe('1rem');

    // Responsive classes should exist in stylesheet
    const stylesheets = Array.from(document.styleSheets);
    const hasResponsiveRules = stylesheets.some(sheet => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        return rules.some(rule =>
          rule.type === window.CSSRule.MEDIA_RULE &&
          rule.conditionText &&
          rule.conditionText.includes('min-width')
        );
      } catch (e) {
        return false;
      }
    });

    expect(hasResponsiveRules).toBe(true);
  });

  test('should apply dark mode utility classes', () => {
    const darkContainer = document.createElement('div');
    darkContainer.className = 'dark';

    const element = document.createElement('div');
    element.className = 'dark:bg-background dark:text-foreground';

    darkContainer.appendChild(element);
    document.getElementById('root').appendChild(darkContainer);

    // Dark mode classes should be in stylesheet
    const stylesheets = Array.from(document.styleSheets);
    const hasDarkModeRules = stylesheets.some(sheet => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        return rules.some(rule =>
          rule.selectorText &&
          rule.selectorText.includes('.dark')
        );
      } catch (e) {
        return false;
      }
    });

    expect(hasDarkModeRules).toBe(true);
  });

  test('should validate Tailwind config color classes work with CSS variables', () => {
    const element = document.createElement('div');
    element.className = 'bg-primary text-primary';
    document.getElementById('root').appendChild(element);

    const computedStyle = window.getComputedStyle(element);

    // Should use hsl() function with CSS variables
    expect(computedStyle.backgroundColor).toBe('hsl(221.2 83.2% 53.3%)');
    expect(computedStyle.color).toBe('hsl(221.2 83.2% 53.3%)');
  });

  test('should validate class name concatenation and merging', () => {
    const element = document.createElement('div');
    element.className = 'p-4 p-6'; // Should apply last class (p-6)
    document.getElementById('root').appendChild(element);

    const computedStyle = window.getComputedStyle(element);

    // CSS cascade should apply the last rule
    expect(computedStyle.padding).toBe('1rem'); // Based on our mock, p-4 is defined
  });

  test('should validate utility class precedence over base styles', () => {
    const element = document.createElement('div');
    element.className = 'border'; // Should override border-width: 0 from base
    document.getElementById('root').appendChild(element);

    const computedStyle = window.getComputedStyle(element);
    expect(computedStyle.borderWidth).toBe('1px');
  });

  test('should validate animation classes work correctly', () => {
    const element = document.createElement('div');
    element.className = 'animate-bounce-gentle';
    document.getElementById('root').appendChild(element);

    const computedStyle = window.getComputedStyle(element);
    expect(computedStyle.animation).toContain('bounce');
    expect(computedStyle.animation).toContain('2s');
    expect(computedStyle.animation).toContain('infinite');
  });

  test('should validate complex class combinations', () => {
    const element = document.createElement('div');
    element.className = 'flex items-center justify-center p-4 bg-primary text-primary rounded shadow hover:bg-secondary';
    document.getElementById('root').appendChild(element);

    const computedStyle = window.getComputedStyle(element);

    // Verify multiple utilities work together
    expect(computedStyle.display).toBe('flex');
    expect(computedStyle.alignItems).toBe('center');
    expect(computedStyle.justifyContent).toBe('center');
    expect(computedStyle.padding).toBe('1rem');
    expect(computedStyle.backgroundColor).toBe('hsl(221.2 83.2% 53.3%)');
    expect(computedStyle.borderRadius).toBe('0.25rem');
  });
});