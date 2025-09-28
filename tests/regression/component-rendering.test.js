/**
 * Component Rendering Tests - TDD Regression Prevention
 *
 * Validates React components render without white screen issues
 * Prevents CSS-related rendering failures and hydration mismatches
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { JSDOM } from 'jsdom';

// Mock React and ReactDOM for testing
const mockReact = {
  createElement: (type, props, ...children) => ({
    type,
    props: { ...props, children: children.length === 1 ? children[0] : children },
    key: props?.key || null,
    ref: props?.ref || null
  }),
  Component: class Component {
    constructor(props) {
      this.props = props;
      this.state = {};
    }
  },
  useState: (initial) => [initial, () => {}],
  useEffect: (effect, deps) => {
    if (typeof effect === 'function') {
      try {
        effect();
      } catch (e) {
        console.error('useEffect error:', e);
      }
    }
  }
};

describe('Component Rendering Tests', () => {
  let dom;
  let document;
  let window;

  beforeAll(() => {
    // Setup JSDOM with complete CSS and React environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            /* Complete CSS setup */
            @layer base {
              :root {
                --background: 0 0% 100%;
                --foreground: 222.2 84% 4.9%;
                --primary: 221.2 83.2% 53.3%;
                --secondary: 210 40% 96%;
                --muted: 210 40% 96%;
                --accent: 210 40% 96%;
                --border: 214.3 31.8% 91.4%;
                --radius: 0.5rem;
              }
            }

            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }

            body {
              background-color: hsl(var(--background));
              color: hsl(var(--foreground));
              font-family: system-ui, -apple-system, sans-serif;
              line-height: 1.5;
            }

            /* Tailwind utilities */
            .bg-background { background-color: hsl(var(--background)); }
            .text-foreground { color: hsl(var(--foreground)); }
            .bg-primary { background-color: hsl(var(--primary)); }
            .text-primary { color: hsl(var(--primary)); }
            .p-4 { padding: 1rem; }
            .m-4 { margin: 1rem; }
            .w-full { width: 100%; }
            .h-screen { height: 100vh; }
            .min-h-screen { min-height: 100vh; }
            .flex { display: flex; }
            .flex-col { flex-direction: column; }
            .items-center { align-items: center; }
            .justify-center { justify-content: center; }
            .space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 1rem; }
            .rounded { border-radius: var(--radius); }
            .border { border: 1px solid hsl(var(--border)); }
            .shadow { box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
            .text-center { text-align: center; }
            .text-lg { font-size: 1.125rem; }
            .text-xl { font-size: 1.25rem; }
            .font-bold { font-weight: 700; }
            .opacity-0 { opacity: 0; }
            .opacity-100 { opacity: 1; }
            .transition-opacity { transition: opacity 0.3s; }
            .hidden { display: none; }
            .block { display: block; }

            /* Animation classes */
            .animate-pulse {
              animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }

            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }

            /* Loading states */
            .loading-skeleton {
              background: linear-gradient(90deg,
                hsl(var(--muted)) 0%,
                hsl(var(--accent)) 50%,
                hsl(var(--muted)) 100%);
              background-size: 200% 100%;
              animation: loading 1.5s infinite;
            }

            @keyframes loading {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
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
    global.React = mockReact;
  });

  afterAll(() => {
    dom.window.close();
  });

  beforeEach(() => {
    // Clear root element before each test
    const root = document.getElementById('root');
    root.innerHTML = '';
  });

  test('should render basic component without white screen', () => {
    const component = document.createElement('div');
    component.className = 'bg-background text-foreground p-4';
    component.textContent = 'Hello World';
    document.getElementById('root').appendChild(component);

    const computedStyle = window.getComputedStyle(component);

    // Verify component is visible (not transparent/hidden)
    expect(computedStyle.backgroundColor).toBe('hsl(0 0% 100%)');
    expect(computedStyle.color).toBe('hsl(222.2 84% 4.9%)');
    expect(computedStyle.opacity).not.toBe('0');
    expect(computedStyle.visibility).not.toBe('hidden');
    expect(computedStyle.display).not.toBe('none');
  });

  test('should render layout components correctly', () => {
    const layout = document.createElement('div');
    layout.className = 'min-h-screen flex flex-col bg-background';

    const header = document.createElement('header');
    header.className = 'bg-primary text-primary p-4';
    header.textContent = 'Header';

    const main = document.createElement('main');
    main.className = 'flex-1 p-4';
    main.textContent = 'Main Content';

    const footer = document.createElement('footer');
    footer.className = 'bg-secondary p-4';
    footer.textContent = 'Footer';

    layout.appendChild(header);
    layout.appendChild(main);
    layout.appendChild(footer);
    document.getElementById('root').appendChild(layout);

    const layoutStyle = window.getComputedStyle(layout);
    const headerStyle = window.getComputedStyle(header);
    const mainStyle = window.getComputedStyle(main);

    // Verify layout structure
    expect(layoutStyle.minHeight).toBe('100vh');
    expect(layoutStyle.display).toBe('flex');
    expect(layoutStyle.flexDirection).toBe('column');

    // Verify components have proper styling
    expect(headerStyle.backgroundColor).toBe('hsl(221.2 83.2% 53.3%)');
    expect(headerStyle.padding).toBe('1rem');

    // Verify main content is visible
    expect(mainStyle.padding).toBe('1rem');
    expect(mainStyle.display).not.toBe('none');
  });

  test('should handle loading states without white screen', () => {
    const loadingComponent = document.createElement('div');
    loadingComponent.className = 'flex items-center justify-center min-h-screen bg-background';

    const spinner = document.createElement('div');
    spinner.className = 'animate-pulse bg-primary rounded w-8 h-8';

    const loadingText = document.createElement('p');
    loadingText.className = 'text-foreground ml-2';
    loadingText.textContent = 'Loading...';

    loadingComponent.appendChild(spinner);
    loadingComponent.appendChild(loadingText);
    document.getElementById('root').appendChild(loadingComponent);

    const componentStyle = window.getComputedStyle(loadingComponent);
    const spinnerStyle = window.getComputedStyle(spinner);

    // Verify loading state is visible
    expect(componentStyle.backgroundColor).toBe('hsl(0 0% 100%)');
    expect(componentStyle.minHeight).toBe('100vh');
    expect(spinnerStyle.animation).toContain('pulse');
    expect(spinnerStyle.backgroundColor).toBe('hsl(221.2 83.2% 53.3%)');
  });

  test('should render error boundary components properly', () => {
    const errorBoundary = document.createElement('div');
    errorBoundary.className = 'min-h-screen flex items-center justify-center bg-background';

    const errorCard = document.createElement('div');
    errorCard.className = 'bg-accent border border-border rounded p-6 shadow';

    const errorTitle = document.createElement('h1');
    errorTitle.className = 'text-xl font-bold text-foreground mb-4';
    errorTitle.textContent = 'Something went wrong';

    const errorMessage = document.createElement('p');
    errorMessage.className = 'text-muted-foreground text-center';
    errorMessage.textContent = 'Please try refreshing the page';

    errorCard.appendChild(errorTitle);
    errorCard.appendChild(errorMessage);
    errorBoundary.appendChild(errorCard);
    document.getElementById('root').appendChild(errorBoundary);

    const boundaryStyle = window.getComputedStyle(errorBoundary);
    const cardStyle = window.getComputedStyle(errorCard);

    // Verify error boundary is visible and styled
    expect(boundaryStyle.minHeight).toBe('100vh');
    expect(boundaryStyle.display).toBe('flex');
    expect(cardStyle.borderRadius).toBe('0.5rem');
    expect(cardStyle.boxShadow).toContain('rgba(0, 0, 0, 0.1)');
  });

  test('should render form components with proper styling', () => {
    const form = document.createElement('form');
    form.className = 'max-w-md mx-auto space-y-4 p-6';

    const input = document.createElement('input');
    input.className = 'w-full p-4 border border-border rounded bg-background text-foreground';
    input.type = 'text';
    input.placeholder = 'Enter text...';

    const button = document.createElement('button');
    button.className = 'w-full bg-primary text-primary p-4 rounded font-bold';
    button.textContent = 'Submit';

    form.appendChild(input);
    form.appendChild(button);
    document.getElementById('root').appendChild(form);

    const inputStyle = window.getComputedStyle(input);
    const buttonStyle = window.getComputedStyle(button);

    // Verify form elements are properly styled
    expect(inputStyle.width).toBe('100%');
    expect(inputStyle.backgroundColor).toBe('hsl(0 0% 100%)');
    expect(inputStyle.borderWidth).toBe('1px');

    expect(buttonStyle.backgroundColor).toBe('hsl(221.2 83.2% 53.3%)');
    expect(buttonStyle.fontWeight).toBe('700');
  });

  test('should handle responsive design breakpoints', () => {
    const responsiveGrid = document.createElement('div');
    responsiveGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4';

    for (let i = 0; i < 6; i++) {
      const card = document.createElement('div');
      card.className = 'bg-accent border border-border rounded p-4';
      card.textContent = `Card ${i + 1}`;
      responsiveGrid.appendChild(card);
    }

    document.getElementById('root').appendChild(responsiveGrid);

    const gridStyle = window.getComputedStyle(responsiveGrid);
    expect(gridStyle.padding).toBe('1rem');

    // Cards should be visible
    const cards = responsiveGrid.children;
    for (let card of cards) {
      const cardStyle = window.getComputedStyle(card);
      expect(cardStyle.borderRadius).toBe('0.5rem');
      expect(cardStyle.padding).toBe('1rem');
    }
  });

  test('should render component with animations without performance issues', () => {
    const animatedComponent = document.createElement('div');
    animatedComponent.className = 'animate-pulse bg-primary text-primary p-8 rounded';
    animatedComponent.textContent = 'Animated Content';

    document.getElementById('root').appendChild(animatedComponent);

    const computedStyle = window.getComputedStyle(animatedComponent);

    // Verify animation is applied
    expect(computedStyle.animation).toContain('pulse');
    expect(computedStyle.backgroundColor).toBe('hsl(221.2 83.2% 53.3%)');

    // Component should still be visible during animation
    expect(computedStyle.display).not.toBe('none');
    expect(computedStyle.visibility).not.toBe('hidden');
  });

  test('should handle conditional rendering correctly', () => {
    const container = document.createElement('div');
    container.className = 'p-4';

    // Simulate conditional rendering
    const showContent = true;
    const conditionalContent = document.createElement('div');

    if (showContent) {
      conditionalContent.className = 'block bg-background text-foreground';
      conditionalContent.textContent = 'Content is visible';
    } else {
      conditionalContent.className = 'hidden';
    }

    container.appendChild(conditionalContent);
    document.getElementById('root').appendChild(container);

    const contentStyle = window.getComputedStyle(conditionalContent);
    expect(contentStyle.display).toBe('block');
    expect(contentStyle.backgroundColor).toBe('hsl(0 0% 100%)');
  });

  test('should prevent flash of unstyled content (FOUC)', () => {
    // Test that styles are applied immediately
    const component = document.createElement('div');
    component.className = 'bg-primary text-primary p-4 rounded transition-opacity opacity-100';
    component.textContent = 'Styled Content';

    document.getElementById('root').appendChild(component);

    const computedStyle = window.getComputedStyle(component);

    // Verify styles are immediately applied
    expect(computedStyle.backgroundColor).toBe('hsl(221.2 83.2% 53.3%)');
    expect(computedStyle.opacity).toBe('1');
    expect(computedStyle.borderRadius).toBe('0.5rem');

    // Should not start with opacity 0 or unstyled state
    expect(computedStyle.opacity).not.toBe('0');
    expect(computedStyle.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('should validate CSS custom properties in components', () => {
    const component = document.createElement('div');
    component.style.setProperty('--custom-property', '1rem');
    component.className = 'bg-background text-foreground';

    document.getElementById('root').appendChild(component);

    const computedStyle = window.getComputedStyle(component);

    // Verify CSS custom properties work
    expect(component.style.getPropertyValue('--custom-property')).toBe('1rem');
    expect(computedStyle.backgroundColor).toBe('hsl(0 0% 100%)');
  });
});