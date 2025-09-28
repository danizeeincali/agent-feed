/**
 * Jest Setup for CSS Architecture Regression Tests
 *
 * Configures test environment for comprehensive CSS and React testing
 */

import { jest } from '@jest/globals';
import 'jsdom-global/register';

// Extend Jest matchers
expect.extend({
  toHaveValidCSSVariable(received, variableName) {
    const pass = received &&
                 received.includes(`--${variableName}:`) &&
                 !received.includes(`--${variableName}: ;`) &&
                 !received.includes(`--${variableName}:;`);

    return {
      message: () => pass
        ? `Expected CSS not to contain valid variable --${variableName}`
        : `Expected CSS to contain valid variable --${variableName}`,
      pass
    };
  },

  toHaveValidHSLFormat(received) {
    const hslPattern = /\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%/;
    const pass = hslPattern.test(received);

    return {
      message: () => pass
        ? `Expected "${received}" not to be valid HSL format`
        : `Expected "${received}" to be valid HSL format (H S% L%)`,
      pass
    };
  },

  toHaveTailwindClass(received, className) {
    const element = received instanceof Element ? received : document.querySelector(received);
    const pass = element && element.classList.contains(className);

    return {
      message: () => pass
        ? `Expected element not to have Tailwind class "${className}"`
        : `Expected element to have Tailwind class "${className}"`,
      pass
    };
  },

  toBeVisibleInViewport(received) {
    const element = received instanceof Element ? received : document.querySelector(received);

    if (!element) {
      return {
        message: () => 'Element not found',
        pass: false
      };
    }

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    const pass = rect.width > 0 &&
                 rect.height > 0 &&
                 style.visibility !== 'hidden' &&
                 style.display !== 'none' &&
                 style.opacity !== '0';

    return {
      message: () => pass
        ? 'Expected element not to be visible in viewport'
        : 'Expected element to be visible in viewport',
      pass
    };
  },

  toHaveResponsiveCSS(received, breakpoint) {
    const cssText = received;
    const mediaQuery = `@media.*${breakpoint}`;
    const pass = new RegExp(mediaQuery).test(cssText);

    return {
      message: () => pass
        ? `Expected CSS not to contain responsive styles for "${breakpoint}"`
        : `Expected CSS to contain responsive styles for "${breakpoint}"`,
      pass
    };
  }
});

// Mock environment setup
global.console = {
  ...console,
  // Suppress expected warnings in tests
  warn: jest.fn((message) => {
    if (!message.includes('React Router') && !message.includes('useNavigate')) {
      console.warn(message);
    }
  }),
  error: jest.fn((message) => {
    if (!message.includes('Not implemented: navigation')) {
      console.error(message);
    }
  })
};

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    beforePopState: jest.fn(),
    pathname: '/',
    route: '/',
    query: {},
    asPath: '/',
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    },
    isFallback: false,
    isLocaleDomain: false,
    isReady: true,
    defaultLocale: 'en',
    domainLocales: [],
    isPreview: false
  })
}));

// Mock Next.js head
jest.mock('next/head', () => {
  return function Head({ children }) {
    return children;
  };
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  // Simulate intersection
  simulateIntersection: (entries) => callback(entries)
}));

// Mock MutationObserver
global.MutationObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => []),
  // Simulate mutation
  simulateMutation: (mutations) => callback(mutations)
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: query.includes('min-width: 768px') ? true : false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
});

// Mock getComputedStyle for consistent CSS testing
const originalGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = jest.fn().mockImplementation((element) => {
  const style = originalGetComputedStyle(element);

  // Add CSS custom property values for testing
  const mockStyle = {
    ...style,
    getPropertyValue: jest.fn().mockImplementation((property) => {
      // Mock CSS variables
      if (property === '--background') return '0 0% 100%';
      if (property === '--foreground') return '222.2 84% 4.9%';
      if (property === '--primary') return '221.2 83.2% 53.3%';
      if (property === '--secondary') return '210 40% 96%';
      if (property === '--muted') return '210 40% 96%';
      if (property === '--accent') return '210 40% 96%';
      if (property === '--border') return '214.3 31.8% 91.4%';
      if (property === '--radius') return '0.5rem';

      // Mock common CSS properties
      if (property === 'background-color' && element.classList.contains('bg-background')) {
        return 'hsl(0 0% 100%)';
      }
      if (property === 'color' && element.classList.contains('text-foreground')) {
        return 'hsl(222.2 84% 4.9%)';
      }
      if (property === 'padding' && element.classList.contains('p-4')) {
        return '1rem';
      }
      if (property === 'display' && element.classList.contains('flex')) {
        return 'flex';
      }

      return style.getPropertyValue ? style.getPropertyValue(property) : '';
    })
  };

  // Mock specific style properties
  Object.defineProperty(mockStyle, 'backgroundColor', {
    get: () => {
      if (element.classList.contains('bg-background')) return 'hsl(0 0% 100%)';
      if (element.classList.contains('bg-primary')) return 'hsl(221.2 83.2% 53.3%)';
      return style.backgroundColor || '';
    }
  });

  Object.defineProperty(mockStyle, 'color', {
    get: () => {
      if (element.classList.contains('text-foreground')) return 'hsl(222.2 84% 4.9%)';
      if (element.classList.contains('text-primary')) return 'hsl(221.2 83.2% 53.3%)';
      return style.color || '';
    }
  });

  Object.defineProperty(mockStyle, 'padding', {
    get: () => {
      if (element.classList.contains('p-4')) return '1rem';
      if (element.classList.contains('p-2')) return '0.5rem';
      if (element.classList.contains('p-6')) return '1.5rem';
      return style.padding || '';
    }
  });

  Object.defineProperty(mockStyle, 'margin', {
    get: () => {
      if (element.classList.contains('m-4')) return '1rem';
      if (element.classList.contains('m-2')) return '0.5rem';
      return style.margin || '';
    }
  });

  Object.defineProperty(mockStyle, 'display', {
    get: () => {
      if (element.classList.contains('flex')) return 'flex';
      if (element.classList.contains('block')) return 'block';
      if (element.classList.contains('hidden')) return 'none';
      return style.display || 'block';
    }
  });

  Object.defineProperty(mockStyle, 'flexDirection', {
    get: () => {
      if (element.classList.contains('flex-col')) return 'column';
      if (element.classList.contains('flex-row')) return 'row';
      return style.flexDirection || 'row';
    }
  });

  Object.defineProperty(mockStyle, 'alignItems', {
    get: () => {
      if (element.classList.contains('items-center')) return 'center';
      if (element.classList.contains('items-start')) return 'flex-start';
      return style.alignItems || 'stretch';
    }
  });

  Object.defineProperty(mockStyle, 'justifyContent', {
    get: () => {
      if (element.classList.contains('justify-center')) return 'center';
      if (element.classList.contains('justify-between')) return 'space-between';
      return style.justifyContent || 'flex-start';
    }
  });

  Object.defineProperty(mockStyle, 'width', {
    get: () => {
      if (element.classList.contains('w-full')) return '100%';
      if (element.classList.contains('w-1/2')) return '50%';
      return style.width || 'auto';
    }
  });

  Object.defineProperty(mockStyle, 'height', {
    get: () => {
      if (element.classList.contains('h-screen')) return '100vh';
      if (element.classList.contains('h-full')) return '100%';
      return style.height || 'auto';
    }
  });

  Object.defineProperty(mockStyle, 'minHeight', {
    get: () => {
      if (element.classList.contains('min-h-screen')) return '100vh';
      return style.minHeight || 'auto';
    }
  });

  Object.defineProperty(mockStyle, 'borderRadius', {
    get: () => {
      if (element.classList.contains('rounded')) return '0.25rem';
      if (element.classList.contains('rounded-lg')) return '0.5rem';
      return style.borderRadius || '0';
    }
  });

  Object.defineProperty(mockStyle, 'opacity', {
    get: () => {
      if (element.classList.contains('opacity-0')) return '0';
      if (element.classList.contains('opacity-100')) return '1';
      return style.opacity || '1';
    }
  });

  Object.defineProperty(mockStyle, 'visibility', {
    get: () => {
      return style.visibility || 'visible';
    }
  });

  return mockStyle;
});

// Mock CSS loading for tests
const mockStyleElement = document.createElement('style');
mockStyleElement.textContent = `
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
  .bg-background { background-color: hsl(var(--background)); }
  .text-foreground { color: hsl(var(--foreground)); }
  .bg-primary { background-color: hsl(var(--primary)); }
  .text-primary { color: hsl(var(--primary)); }
  .p-4 { padding: 1rem; }
  .m-4 { margin: 1rem; }
  .flex { display: flex; }
  .flex-col { flex-direction: column; }
  .items-center { align-items: center; }
  .justify-center { justify-content: center; }
  .w-full { width: 100%; }
  .h-screen { height: 100vh; }
  .min-h-screen { min-height: 100vh; }
  .rounded { border-radius: 0.25rem; }
  .opacity-0 { opacity: 0; }
  .opacity-100 { opacity: 1; }
  .hidden { display: none; }
  .block { display: block; }
`;

document.head.appendChild(mockStyleElement);

// Performance mock
global.performance = {
  ...global.performance,
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => [])
};

// Mock fetch for server integration tests
global.fetch = jest.fn();

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  document.body.innerHTML = '';
  document.head.querySelectorAll('style:not([data-test-keep])').forEach(el => el.remove());
});

// Global error handling for tests
global.addEventListener('error', (event) => {
  if (event.error && event.error.message.includes('Not implemented')) {
    event.preventDefault();
  }
});

global.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes('Not implemented')) {
    event.preventDefault();
  }
});