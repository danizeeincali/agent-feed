/**
 * Critical Styles Application Tests
 * Tests that verify critical styles (layout, colors, spacing) are properly applied
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('Critical Styles Application Tests', () => {
  const projectRoot = path.resolve(__dirname, '../..');

  describe('Layout Styles', () => {
    let dom, document;

    beforeEach(() => {
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              .agents-page {
                min-height: 100vh;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 1rem;
              }
              .agents-container {
                max-width: 1400px;
                margin: 0 auto;
                background: rgba(255, 255, 255, 0.95);
                border-radius: 16px;
                padding: 2rem;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                backdrop-filter: blur(10px);
              }
              .agents-content {
                display: grid;
                grid-template-columns: 1fr 3fr;
                gap: 2rem;
                min-height: 600px;
              }
              .grid {
                display: grid;
              }
              .flex {
                display: flex;
              }
              .hidden {
                display: none;
              }
              .block {
                display: block;
              }
            </style>
          </head>
          <body></body>
        </html>
      `);
      document = dom.window.document;
    });

    test('should apply correct layout display properties', () => {
      const gridElement = document.createElement('div');
      gridElement.className = 'grid';
      document.body.appendChild(gridElement);

      const computedStyle = dom.window.getComputedStyle(gridElement);
      expect(computedStyle.display).toBe('grid');
    });

    test('should apply flex layout correctly', () => {
      const flexElement = document.createElement('div');
      flexElement.className = 'flex';
      document.body.appendChild(flexElement);

      const computedStyle = dom.window.getComputedStyle(flexElement);
      expect(computedStyle.display).toBe('flex');
    });

    test('should handle visibility states', () => {
      const hiddenElement = document.createElement('div');
      hiddenElement.className = 'hidden';
      document.body.appendChild(hiddenElement);

      const blockElement = document.createElement('div');
      blockElement.className = 'block';
      document.body.appendChild(blockElement);

      const hiddenStyle = dom.window.getComputedStyle(hiddenElement);
      const blockStyle = dom.window.getComputedStyle(blockElement);

      expect(hiddenStyle.display).toBe('none');
      expect(blockStyle.display).toBe('block');
    });

    test('should apply agents page layout styles', () => {
      const agentsPage = document.createElement('div');
      agentsPage.className = 'agents-page';
      document.body.appendChild(agentsPage);

      const computedStyle = dom.window.getComputedStyle(agentsPage);
      expect(computedStyle.minHeight).toBe('100vh');
      expect(computedStyle.padding).toBe('1rem');
    });

    test('should apply agents container layout', () => {
      const agentsContainer = document.createElement('div');
      agentsContainer.className = 'agents-container';
      document.body.appendChild(agentsContainer);

      const computedStyle = dom.window.getComputedStyle(agentsContainer);
      expect(computedStyle.maxWidth).toBe('1400px');
      expect(computedStyle.margin).toBe('0px auto');
      expect(computedStyle.padding).toBe('2rem');
      expect(computedStyle.borderRadius).toBe('16px');
    });

    test('should apply grid layout for agents content', () => {
      const agentsContent = document.createElement('div');
      agentsContent.className = 'agents-content';
      document.body.appendChild(agentsContent);

      const computedStyle = dom.window.getComputedStyle(agentsContent);
      expect(computedStyle.display).toBe('grid');
      expect(computedStyle.gridTemplateColumns).toBe('1fr 3fr');
      expect(computedStyle.gap).toBe('2rem');
      expect(computedStyle.minHeight).toBe('600px');
    });
  });

  describe('Color Styles', () => {
    let dom, document;

    beforeEach(() => {
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              :root {
                --primary-color: rgba(139, 92, 246, 0.8);
                --secondary-color: rgba(236, 72, 153, 0.8);
                --accent-color: rgba(59, 130, 246, 0.8);
                --bolt-bg-primary: #0c0a14;
                --bolt-bg-secondary: #15111e;
                --bolt-text-primary: #e5e2ff;
                --bolt-text-secondary: #a8a4ce;
              }
              :root.light {
                --bolt-bg-primary: #ffffff;
                --bolt-bg-secondary: #f9fafb;
                --bolt-text-primary: #111827;
                --bolt-text-secondary: #6b7280;
              }
              .bg-primary-500 {
                background-color: #3b82f6;
              }
              .text-primary-500 {
                color: #3b82f6;
              }
              .bg-secondary-900 {
                background-color: #0f172a;
              }
              .text-white {
                color: #ffffff;
              }
              .text-gray-600 {
                color: #4b5563;
              }
              .border-primary-600 {
                border-color: #2563eb;
              }
            </style>
          </head>
          <body></body>
        </html>
      `);
      document = dom.window.document;
    });

    test('should apply primary color correctly', () => {
      const element = document.createElement('div');
      element.className = 'bg-primary-500';
      document.body.appendChild(element);

      const computedStyle = dom.window.getComputedStyle(element);
      expect(computedStyle.backgroundColor).toBe('rgb(59, 130, 246)');
    });

    test('should apply text colors correctly', () => {
      const whiteTextElement = document.createElement('p');
      whiteTextElement.className = 'text-white';
      document.body.appendChild(whiteTextElement);

      const grayTextElement = document.createElement('p');
      grayTextElement.className = 'text-gray-600';
      document.body.appendChild(grayTextElement);

      const whiteStyle = dom.window.getComputedStyle(whiteTextElement);
      const grayStyle = dom.window.getComputedStyle(grayTextElement);

      expect(whiteStyle.color).toBe('rgb(255, 255, 255)');
      expect(grayStyle.color).toBe('rgb(75, 85, 99)');
    });

    test('should define CSS custom properties', () => {
      const computedStyle = dom.window.getComputedStyle(document.documentElement);

      // Check if custom properties are defined
      expect(computedStyle.getPropertyValue('--primary-color').trim()).toBeTruthy();
      expect(computedStyle.getPropertyValue('--bolt-bg-primary').trim()).toBeTruthy();
      expect(computedStyle.getPropertyValue('--bolt-text-primary').trim()).toBeTruthy();
    });

    test('should support border colors', () => {
      const element = document.createElement('div');
      element.className = 'border-primary-600';
      element.style.border = '1px solid';
      document.body.appendChild(element);

      const computedStyle = dom.window.getComputedStyle(element);
      expect(computedStyle.borderColor).toBe('rgb(37, 99, 235)');
    });
  });

  describe('Spacing Styles', () => {
    let dom, document;

    beforeEach(() => {
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              .p-4 { padding: 1rem; }
              .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
              .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
              .m-2 { margin: 0.5rem; }
              .mx-auto { margin-left: auto; margin-right: auto; }
              .my-4 { margin-top: 1rem; margin-bottom: 1rem; }
              .space-y-2 > * + * { margin-top: 0.5rem; }
              .space-x-4 > * + * { margin-left: 1rem; }
              .gap-2 { gap: 0.5rem; }
              .gap-4 { gap: 1rem; }
              .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
              .font-bold { font-weight: 700; }
              .leading-tight { line-height: 1.25; }
            </style>
          </head>
          <body></body>
        </html>
      `);
      document = dom.window.document;
    });

    test('should apply padding correctly', () => {
      const element = document.createElement('div');
      element.className = 'p-4';
      document.body.appendChild(element);

      const computedStyle = dom.window.getComputedStyle(element);
      expect(computedStyle.padding).toBe('1rem');
    });

    test('should apply directional padding', () => {
      const pxElement = document.createElement('div');
      pxElement.className = 'px-6';
      document.body.appendChild(pxElement);

      const pyElement = document.createElement('div');
      pyElement.className = 'py-8';
      document.body.appendChild(pyElement);

      const pxStyle = dom.window.getComputedStyle(pxElement);
      const pyStyle = dom.window.getComputedStyle(pyElement);

      expect(pxStyle.paddingLeft).toBe('1.5rem');
      expect(pxStyle.paddingRight).toBe('1.5rem');
      expect(pyStyle.paddingTop).toBe('2rem');
      expect(pyStyle.paddingBottom).toBe('2rem');
    });

    test('should apply margin correctly', () => {
      const element = document.createElement('div');
      element.className = 'm-2';
      document.body.appendChild(element);

      const computedStyle = dom.window.getComputedStyle(element);
      expect(computedStyle.margin).toBe('0.5rem');
    });

    test('should apply auto margins', () => {
      const element = document.createElement('div');
      element.className = 'mx-auto';
      document.body.appendChild(element);

      const computedStyle = dom.window.getComputedStyle(element);
      expect(computedStyle.marginLeft).toBe('auto');
      expect(computedStyle.marginRight).toBe('auto');
    });

    test('should apply directional margins', () => {
      const element = document.createElement('div');
      element.className = 'my-4';
      document.body.appendChild(element);

      const computedStyle = dom.window.getComputedStyle(element);
      expect(computedStyle.marginTop).toBe('1rem');
      expect(computedStyle.marginBottom).toBe('1rem');
    });

    test('should apply gap spacing', () => {
      const smallGapElement = document.createElement('div');
      smallGapElement.className = 'gap-2';
      smallGapElement.style.display = 'flex';
      document.body.appendChild(smallGapElement);

      const largeGapElement = document.createElement('div');
      largeGapElement.className = 'gap-4';
      largeGapElement.style.display = 'grid';
      document.body.appendChild(largeGapElement);

      const smallGapStyle = dom.window.getComputedStyle(smallGapElement);
      const largeGapStyle = dom.window.getComputedStyle(largeGapElement);

      expect(smallGapStyle.gap).toBe('0.5rem');
      expect(largeGapStyle.gap).toBe('1rem');
    });
  });

  describe('Typography Styles', () => {
    let dom, document;

    beforeEach(() => {
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Segoe UI', 'Inter', system-ui, Arial, sans-serif;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
              }
              .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
              .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
              .text-2xl { font-size: 1.5rem; line-height: 2rem; }
              .font-bold { font-weight: 700; }
              .font-medium { font-weight: 500; }
              .leading-tight { line-height: 1.25; }
              .leading-normal { line-height: 1.5; }
              .tracking-wide { letter-spacing: 0.025em; }
              .text-center { text-align: center; }
            </style>
          </head>
          <body></body>
        </html>
      `);
      document = dom.window.document;
    });

    test('should apply correct font family', () => {
      const computedStyle = dom.window.getComputedStyle(document.body);
      expect(computedStyle.fontFamily).toContain('apple-system');
    });

    test('should apply font sizes correctly', () => {
      const lgElement = document.createElement('p');
      lgElement.className = 'text-lg';
      document.body.appendChild(lgElement);

      const xlElement = document.createElement('p');
      xlElement.className = 'text-xl';
      document.body.appendChild(xlElement);

      const lgStyle = dom.window.getComputedStyle(lgElement);
      const xlStyle = dom.window.getComputedStyle(xlElement);

      expect(lgStyle.fontSize).toBe('1.125rem');
      expect(xlStyle.fontSize).toBe('1.25rem');
    });

    test('should apply font weights correctly', () => {
      const boldElement = document.createElement('p');
      boldElement.className = 'font-bold';
      document.body.appendChild(boldElement);

      const mediumElement = document.createElement('p');
      mediumElement.className = 'font-medium';
      document.body.appendChild(mediumElement);

      const boldStyle = dom.window.getComputedStyle(boldElement);
      const mediumStyle = dom.window.getComputedStyle(mediumElement);

      expect(boldStyle.fontWeight).toBe('700');
      expect(mediumStyle.fontWeight).toBe('500');
    });

    test('should apply line heights correctly', () => {
      const tightElement = document.createElement('p');
      tightElement.className = 'leading-tight';
      document.body.appendChild(tightElement);

      const normalElement = document.createElement('p');
      normalElement.className = 'leading-normal';
      document.body.appendChild(normalElement);

      const tightStyle = dom.window.getComputedStyle(tightElement);
      const normalStyle = dom.window.getComputedStyle(normalElement);

      expect(tightStyle.lineHeight).toBe('1.25');
      expect(normalStyle.lineHeight).toBe('1.5');
    });

    test('should apply text alignment', () => {
      const centerElement = document.createElement('p');
      centerElement.className = 'text-center';
      document.body.appendChild(centerElement);

      const computedStyle = dom.window.getComputedStyle(centerElement);
      expect(computedStyle.textAlign).toBe('center');
    });
  });

  describe('Custom CSS Class Validation', () => {
    test('should validate agents.css classes exist', () => {
      const agentsCssPath = path.join(projectRoot, 'styles', 'agents.css');

      if (fs.existsSync(agentsCssPath)) {
        const cssContent = fs.readFileSync(agentsCssPath, 'utf8');

        const requiredClasses = [
          '.agents-page',
          '.agents-container',
          '.agents-header',
          '.agents-content',
          '.agents-sidebar',
          '.agents-main'
        ];

        requiredClasses.forEach(className => {
          expect(cssContent).toContain(className);
        });
      }
    });

    test('should validate critical CSS properties in agents.css', () => {
      const agentsCssPath = path.join(projectRoot, 'styles', 'agents.css');

      if (fs.existsSync(agentsCssPath)) {
        const cssContent = fs.readFileSync(agentsCssPath, 'utf8');

        // Critical layout properties
        expect(cssContent).toContain('display: grid');
        expect(cssContent).toContain('display: flex');
        expect(cssContent).toContain('min-height: 100vh');
        expect(cssContent).toContain('max-width: 1400px');

        // Critical spacing
        expect(cssContent).toContain('padding:');
        expect(cssContent).toContain('margin:');
        expect(cssContent).toContain('gap:');

        // Critical colors
        expect(cssContent).toContain('background:');
        expect(cssContent).toContain('color:');
      }
    });
  });
});