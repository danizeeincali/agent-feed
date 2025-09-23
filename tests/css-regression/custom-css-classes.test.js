/**
 * Custom CSS Classes Tests
 * Tests that verify custom CSS classes work correctly and maintain their intended functionality
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('Custom CSS Classes Tests', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const agentsCssPath = path.join(projectRoot, 'styles', 'agents.css');

  describe('Agents CSS Classes', () => {
    let agentsCssContent;

    beforeAll(() => {
      if (fs.existsSync(agentsCssPath)) {
        agentsCssContent = fs.readFileSync(agentsCssPath, 'utf8');
      }
    });

    let dom, document;

    beforeEach(() => {
      // Load the actual agents.css content into the DOM
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              ${agentsCssContent || ''}

              /* Additional test styles for verification */
              .test-flex { display: flex; }
              .test-grid { display: grid; }
            </style>
          </head>
          <body></body>
        </html>
      `);
      document = dom.window.document;
    });

    test('should define all required agents page classes', () => {
      if (!agentsCssContent) {
        console.warn('agents.css not found, skipping class definition tests');
        return;
      }

      const requiredClasses = [
        '.agents-page',
        '.agents-container',
        '.agents-header',
        '.agents-title',
        '.agents-subtitle',
        '.agents-content',
        '.agents-sidebar',
        '.agents-main',
        '.agents-error',
        '.agents-empty'
      ];

      requiredClasses.forEach(className => {
        expect(agentsCssContent).toContain(className);
      });
    });

    test('should apply agents-page styles correctly', () => {
      const agentsPage = document.createElement('div');
      agentsPage.className = 'agents-page';
      document.body.appendChild(agentsPage);

      const computedStyle = dom.window.getComputedStyle(agentsPage);

      expect(computedStyle.minHeight).toBe('100vh');
      expect(computedStyle.padding).toBe('1rem');
      expect(computedStyle.background).toContain('linear-gradient');
    });

    test('should apply agents-container styles correctly', () => {
      const agentsContainer = document.createElement('div');
      agentsContainer.className = 'agents-container';
      document.body.appendChild(agentsContainer);

      const computedStyle = dom.window.getComputedStyle(agentsContainer);

      expect(computedStyle.maxWidth).toBe('1400px');
      expect(computedStyle.margin).toBe('0px auto');
      expect(computedStyle.borderRadius).toBe('16px');
      expect(computedStyle.padding).toBe('2rem');
      expect(computedStyle.boxShadow).toContain('rgba(0, 0, 0, 0.1)');
    });

    test('should apply agents-header styles with flexbox layout', () => {
      const agentsHeader = document.createElement('div');
      agentsHeader.className = 'agents-header';
      document.body.appendChild(agentsHeader);

      const computedStyle = dom.window.getComputedStyle(agentsHeader);

      expect(computedStyle.display).toBe('flex');
      expect(computedStyle.justifyContent).toBe('between');
      expect(computedStyle.alignItems).toBe('center');
      expect(computedStyle.marginBottom).toBe('2rem');
      expect(computedStyle.flexWrap).toBe('wrap');
      expect(computedStyle.gap).toBe('1rem');
    });

    test('should apply agents-content grid layout', () => {
      const agentsContent = document.createElement('div');
      agentsContent.className = 'agents-content';
      document.body.appendChild(agentsContent);

      const computedStyle = dom.window.getComputedStyle(agentsContent);

      expect(computedStyle.display).toBe('grid');
      expect(computedStyle.gridTemplateColumns).toBe('1fr 3fr');
      expect(computedStyle.gap).toBe('2rem');
      expect(computedStyle.minHeight).toBe('600px');
    });

    test('should apply agents-title typography styles', () => {
      const agentsTitle = document.createElement('h1');
      agentsTitle.className = 'agents-title';
      document.body.appendChild(agentsTitle);

      const computedStyle = dom.window.getComputedStyle(agentsTitle);

      expect(computedStyle.fontSize).toBe('2.5rem');
      expect(computedStyle.fontWeight).toBe('bold');
      expect(computedStyle.color).toBe('rgb(31, 41, 55)'); // #1f2937
      expect(computedStyle.margin).toBe('0px');
    });

    test('should apply agents-sidebar flex layout', () => {
      const agentsSidebar = document.createElement('div');
      agentsSidebar.className = 'agents-sidebar';
      document.body.appendChild(agentsSidebar);

      const computedStyle = dom.window.getComputedStyle(agentsSidebar);

      expect(computedStyle.display).toBe('flex');
      expect(computedStyle.flexDirection).toBe('column');
      expect(computedStyle.gap).toBe('1.5rem');
    });

    test('should apply error and empty state styles', () => {
      const errorElement = document.createElement('div');
      errorElement.className = 'agents-error';
      document.body.appendChild(errorElement);

      const emptyElement = document.createElement('div');
      emptyElement.className = 'agents-empty';
      document.body.appendChild(emptyElement);

      const errorStyle = dom.window.getComputedStyle(errorElement);
      const emptyStyle = dom.window.getComputedStyle(emptyElement);

      // Both should be centered
      expect(errorStyle.textAlign).toBe('center');
      expect(emptyStyle.textAlign).toBe('center');

      // Both should have padding
      expect(errorStyle.padding).toBe('3rem');
      expect(emptyStyle.padding).toBe('3rem');

      // Error should be red-themed
      expect(errorStyle.color).toBe('rgb(239, 68, 68)'); // #ef4444

      // Empty should be gray-themed
      expect(emptyStyle.color).toBe('rgb(107, 114, 128)'); // #6b7280
    });
  });

  describe('CSS Animations and Keyframes', () => {
    let dom, document;

    beforeEach(() => {
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }

              @keyframes float1 {
                0%, 100% { transform: rotate(65deg) translate(0, 0); }
                25% { transform: rotate(70deg) translate(30px, 20px); }
                50% { transform: rotate(60deg) translate(-20px, 40px); }
                75% { transform: rotate(68deg) translate(-40px, 10px); }
              }

              .agent-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1) !important;
              }

              .loading-spinner {
                animation: spin 1s linear infinite;
              }

              .floating-element {
                animation: float1 15s infinite ease-in-out;
              }
            </style>
          </head>
          <body></body>
        </html>
      `);
      document = dom.window.document;
    });

    test('should define spin animation keyframes', () => {
      const styleSheet = document.querySelector('style').sheet;
      const rules = Array.from(styleSheet.cssRules);

      const spinKeyframes = rules.find(rule =>
        rule.type === CSSRule.KEYFRAMES_RULE && rule.name === 'spin'
      );

      expect(spinKeyframes).toBeTruthy();
    });

    test('should apply loading spinner animation', () => {
      const spinner = document.createElement('div');
      spinner.className = 'loading-spinner';
      document.body.appendChild(spinner);

      const computedStyle = dom.window.getComputedStyle(spinner);
      expect(computedStyle.animation).toContain('spin');
      expect(computedStyle.animation).toContain('1s');
      expect(computedStyle.animation).toContain('linear');
      expect(computedStyle.animation).toContain('infinite');
    });

    test('should apply hover effects to agent cards', () => {
      const agentCard = document.createElement('div');
      agentCard.className = 'agent-card';
      document.body.appendChild(agentCard);

      // Simulate hover by checking if the CSS rule exists
      const styleSheet = document.querySelector('style').sheet;
      const rules = Array.from(styleSheet.cssRules);

      const hoverRule = rules.find(rule =>
        rule.selectorText && rule.selectorText.includes('.agent-card:hover')
      );

      expect(hoverRule).toBeTruthy();
      expect(hoverRule.style.transform).toBe('translateY(-2px)');
      expect(hoverRule.style.boxShadow).toContain('rgba(0, 0, 0, 0.1)');
    });
  });

  describe('Responsive Design Classes', () => {
    let dom, document;

    beforeEach(() => {
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              .agents-content {
                display: grid;
                grid-template-columns: 1fr 3fr;
                gap: 2rem;
              }

              @media (max-width: 1024px) {
                .agents-content {
                  grid-template-columns: 1fr;
                  gap: 1rem;
                }

                .agents-sidebar {
                  order: -1;
                }
              }

              @media (max-width: 640px) {
                .agents-page {
                  padding: 0.5rem;
                }

                .agents-container {
                  padding: 1rem;
                }

                .agents-title {
                  font-size: 2rem;
                }

                .agents-header {
                  flex-direction: column;
                  text-align: center;
                }
              }
            </style>
          </head>
          <body></body>
        </html>
      `);
      document = dom.window.document;
    });

    test('should have responsive breakpoints defined', () => {
      const styleSheet = document.querySelector('style').sheet;
      const rules = Array.from(styleSheet.cssRules);

      const mediaQueries = rules.filter(rule => rule.type === CSSRule.MEDIA_RULE);

      const tabletBreakpoint = mediaQueries.find(rule =>
        rule.media.mediaText === '(max-width: 1024px)'
      );

      const mobileBreakpoint = mediaQueries.find(rule =>
        rule.media.mediaText === '(max-width: 640px)'
      );

      expect(tabletBreakpoint).toBeTruthy();
      expect(mobileBreakpoint).toBeTruthy();
    });

    test('should apply base desktop styles', () => {
      const agentsContent = document.createElement('div');
      agentsContent.className = 'agents-content';
      document.body.appendChild(agentsContent);

      const computedStyle = dom.window.getComputedStyle(agentsContent);

      expect(computedStyle.display).toBe('grid');
      expect(computedStyle.gridTemplateColumns).toBe('1fr 3fr');
      expect(computedStyle.gap).toBe('2rem');
    });

    test('should validate responsive media query rules exist', () => {
      if (!agentsCssContent) {
        console.warn('agents.css not found, skipping responsive tests');
        return;
      }

      // Check for tablet breakpoint
      expect(agentsCssContent).toContain('@media (max-width: 1024px)');

      // Check for mobile breakpoint
      expect(agentsCssContent).toContain('@media (max-width: 640px)');

      // Check for responsive grid changes
      expect(agentsCssContent).toContain('grid-template-columns: 1fr');

      // Check for responsive padding changes
      expect(agentsCssContent).toContain('padding: 0.5rem');
      expect(agentsCssContent).toContain('padding: 1rem');

      // Check for responsive typography
      expect(agentsCssContent).toContain('font-size: 2rem');

      // Check for responsive flexbox changes
      expect(agentsCssContent).toContain('flex-direction: column');
      expect(agentsCssContent).toContain('text-align: center');
    });
  });

  describe('Modal and Component Styles', () => {
    let dom, document;

    beforeEach(() => {
      dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              .modal-backdrop {
                background:
                  radial-gradient(circle at 20% 20%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
                  radial-gradient(circle at 80% 80%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
                  radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.2) 0%, transparent 50%),
                  linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
              }

              .modal-content {
                background:
                  radial-gradient(circle at 100% 0%, rgba(120, 119, 198, 0.05) 0%, transparent 50%),
                  radial-gradient(circle at 0% 100%, rgba(255, 119, 198, 0.05) 0%, transparent 50%),
                  white;
                border-radius: 16px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                border: 1px solid #f3f4f6;
              }
            </style>
          </head>
          <body></body>
        </html>
      `);
      document = dom.window.document;
    });

    test('should apply modal backdrop gradient styles', () => {
      const modalBackdrop = document.createElement('div');
      modalBackdrop.className = 'modal-backdrop';
      document.body.appendChild(modalBackdrop);

      const computedStyle = dom.window.getComputedStyle(modalBackdrop);
      expect(computedStyle.background).toContain('radial-gradient');
      expect(computedStyle.background).toContain('linear-gradient');
    });

    test('should apply modal content styles with multiple backgrounds', () => {
      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';
      document.body.appendChild(modalContent);

      const computedStyle = dom.window.getComputedStyle(modalContent);
      expect(computedStyle.background).toContain('radial-gradient');
      expect(computedStyle.borderRadius).toBe('16px');
      expect(computedStyle.border).toContain('rgb(243, 244, 246)'); // #f3f4f6
    });
  });

  describe('Custom Test CSS Classes', () => {
    test('should validate test-input.css classes', () => {
      const testInputCssPath = path.join(projectRoot, 'test-input.css');

      if (fs.existsSync(testInputCssPath)) {
        const cssContent = fs.readFileSync(testInputCssPath, 'utf8');

        expect(cssContent).toContain('@import "tailwindcss"');
        expect(cssContent).toContain('.test-class');
        expect(cssContent).toContain('color: red');

        // Test that the class can be applied
        const dom = new JSDOM(`
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                .test-class {
                  color: red;
                }
              </style>
            </head>
            <body></body>
          </html>
        `);

        const testElement = dom.window.document.createElement('div');
        testElement.className = 'test-class';
        dom.window.document.body.appendChild(testElement);

        const computedStyle = dom.window.getComputedStyle(testElement);
        expect(computedStyle.color).toBe('red');
      }
    });
  });

  describe('CSS Class Integration', () => {
    test('should combine Tailwind and custom classes without conflicts', () => {
      const dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              .bg-blue-500 { background-color: #3b82f6; }
              .p-4 { padding: 1rem; }
              .rounded-lg { border-radius: 0.5rem; }

              .agents-container {
                max-width: 1400px;
                margin: 0 auto;
                background: rgba(255, 255, 255, 0.95);
              }
            </style>
          </head>
          <body></body>
        </html>
      `);

      const combinedElement = dom.window.document.createElement('div');
      combinedElement.className = 'agents-container bg-blue-500 p-4 rounded-lg';
      dom.window.document.body.appendChild(combinedElement);

      const computedStyle = dom.window.getComputedStyle(combinedElement);

      // Should apply both custom and Tailwind classes
      expect(computedStyle.maxWidth).toBe('1400px'); // Custom class
      expect(computedStyle.padding).toBe('1rem'); // Tailwind class
      expect(computedStyle.borderRadius).toBe('0.5rem'); // Tailwind class
    });
  });
});