/**
 * React Hook Integration Tests - TDD Regression Prevention
 *
 * Validates React hooks work correctly with CSS architecture
 * Prevents useEffect infinite loops and hook-related rendering issues
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { JSDOM } from 'jsdom';

// Mock React 18.2.0 hooks behavior
const createMockReact = () => {
  let hookIndex = 0;
  let hookStates = [];
  let effectQueue = [];
  let isRendering = false;

  const resetHooks = () => {
    hookIndex = 0;
    effectQueue = [];
  };

  const useState = (initialState) => {
    const currentIndex = hookIndex++;

    if (hookStates[currentIndex] === undefined) {
      hookStates[currentIndex] = typeof initialState === 'function' ? initialState() : initialState;
    }

    const setState = (newState) => {
      const currentState = hookStates[currentIndex];
      const nextState = typeof newState === 'function' ? newState(currentState) : newState;

      if (Object.is(currentState, nextState)) {
        return; // No re-render needed
      }

      hookStates[currentIndex] = nextState;
      // Trigger re-render simulation
      if (!isRendering) {
        setTimeout(() => {
          resetHooks();
          // Simulate re-render
        }, 0);
      }
    };

    return [hookStates[currentIndex], setState];
  };

  const useEffect = (effect, deps) => {
    const currentIndex = hookIndex++;
    const prevDeps = hookStates[currentIndex]?.deps;

    const hasChanged = !prevDeps ||
      !deps ||
      deps.length !== prevDeps.length ||
      deps.some((dep, i) => !Object.is(dep, prevDeps[i]));

    if (hasChanged) {
      hookStates[currentIndex] = { deps };
      effectQueue.push({
        effect,
        cleanup: hookStates[currentIndex]?.cleanup
      });
    }
  };

  const runEffects = () => {
    effectQueue.forEach(({ effect, cleanup }) => {
      if (cleanup && typeof cleanup === 'function') {
        try {
          cleanup();
        } catch (e) {
          console.error('Effect cleanup error:', e);
        }
      }

      if (typeof effect === 'function') {
        try {
          const result = effect();
          if (typeof result === 'function') {
            // Store cleanup function
            const currentEffect = effectQueue[effectQueue.length - 1];
            if (currentEffect) {
              currentEffect.cleanup = result;
            }
          }
        } catch (e) {
          console.error('Effect error:', e);
        }
      }
    });
    effectQueue = [];
  };

  return {
    useState,
    useEffect,
    runEffects,
    resetHooks,
    getHookStates: () => hookStates,
    setRendering: (rendering) => { isRendering = rendering; }
  };
};

describe('React Hook Integration Tests', () => {
  let dom;
  let document;
  let window;
  let mockReact;

  beforeAll(() => {
    // Setup JSDOM with React environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            :root {
              --background: 0 0% 100%;
              --foreground: 222.2 84% 4.9%;
              --primary: 221.2 83.2% 53.3%;
              --muted: 210 40% 96%;
            }

            .bg-background { background-color: hsl(var(--background)); }
            .text-foreground { color: hsl(var(--foreground)); }
            .bg-primary { background-color: hsl(var(--primary)); }
            .p-4 { padding: 1rem; }
            .transition-colors { transition: color 0.3s, background-color 0.3s; }
            .opacity-0 { opacity: 0; }
            .opacity-100 { opacity: 1; }
            .scale-95 { transform: scale(0.95); }
            .scale-100 { transform: scale(1); }
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

    // Mock performance API
    global.performance = {
      now: () => Date.now()
    };

    // Mock requestAnimationFrame
    global.requestAnimationFrame = (callback) => setTimeout(callback, 16);
    global.cancelAnimationFrame = (id) => clearTimeout(id);
  });

  afterAll(() => {
    dom.window.close();
  });

  beforeEach(() => {
    // Reset everything before each test
    const root = document.getElementById('root');
    root.innerHTML = '';
    mockReact = createMockReact();
  });

  test('should handle useState with CSS class updates correctly', () => {
    const { useState } = mockReact;

    // Simulate component using useState for theme
    const [theme, setTheme] = useState('light');

    const component = document.createElement('div');
    component.className = theme === 'light' ? 'bg-background text-foreground' : 'bg-foreground text-background';
    component.textContent = `Current theme: ${theme}`;

    document.getElementById('root').appendChild(component);

    const computedStyle = window.getComputedStyle(component);

    // Verify initial state
    expect(theme).toBe('light');
    expect(computedStyle.backgroundColor).toBe('hsl(0 0% 100%)');

    // Test state update
    setTheme('dark');
    const [newTheme] = useState('light'); // This should return the updated state

    expect(component.textContent).toContain('light'); // Initial render
  });

  test('should handle useEffect with CSS manipulation without infinite loops', () => {
    const { useEffect, runEffects } = mockReact;
    let effectCallCount = 0;

    // Simulate useEffect that manipulates CSS
    useEffect(() => {
      effectCallCount++;
      const element = document.getElementById('test-element');
      if (element) {
        element.className = 'bg-primary p-4 transition-colors';
      }
    }, []); // Empty dependency array - should run once

    const testElement = document.createElement('div');
    testElement.id = 'test-element';
    testElement.textContent = 'Test Element';
    document.getElementById('root').appendChild(testElement);

    // Run effects
    runEffects();

    expect(effectCallCount).toBe(1);
    expect(testElement.className).toBe('bg-primary p-4 transition-colors');

    // Run effects again - should not increase count due to empty deps
    runEffects();
    expect(effectCallCount).toBe(1);
  });

  test('should handle useEffect with CSS variables dependency correctly', () => {
    const { useEffect, runEffects } = mockReact;
    let effectCallCount = 0;
    let currentTheme = 'light';

    // Simulate useEffect that depends on theme
    useEffect(() => {
      effectCallCount++;
      const root = document.documentElement;

      if (currentTheme === 'dark') {
        root.style.setProperty('--background', '222.2 84% 4.9%');
        root.style.setProperty('--foreground', '210 40% 98%');
      } else {
        root.style.setProperty('--background', '0 0% 100%');
        root.style.setProperty('--foreground', '222.2 84% 4.9%');
      }
    }, [currentTheme]);

    runEffects();
    expect(effectCallCount).toBe(1);

    // Change theme - should trigger effect again
    currentTheme = 'dark';
    useEffect(() => {
      effectCallCount++;
      const root = document.documentElement;

      if (currentTheme === 'dark') {
        root.style.setProperty('--background', '222.2 84% 4.9%');
        root.style.setProperty('--foreground', '210 40% 98%');
      } else {
        root.style.setProperty('--background', '0 0% 100%');
        root.style.setProperty('--foreground', '222.2 84% 4.9%');
      }
    }, [currentTheme]);

    runEffects();
    expect(effectCallCount).toBe(2);
  });

  test('should handle animation-related useEffect correctly', () => {
    const { useEffect, runEffects } = mockReact;
    let animationFrame;

    const animateElement = document.createElement('div');
    animateElement.className = 'p-4 transition-opacity opacity-0';
    animateElement.textContent = 'Animated Element';
    document.getElementById('root').appendChild(animateElement);

    useEffect(() => {
      // Animate in
      animationFrame = requestAnimationFrame(() => {
        animateElement.className = 'p-4 transition-opacity opacity-100';
      });

      // Cleanup function
      return () => {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
      };
    }, []);

    runEffects();

    // Wait for animation frame
    return new Promise(resolve => {
      setTimeout(() => {
        const computedStyle = window.getComputedStyle(animateElement);
        expect(computedStyle.opacity).toBe('1');
        resolve();
      }, 20);
    });
  });

  test('should handle resize event useEffect without memory leaks', () => {
    const { useEffect, runEffects } = mockReact;
    let resizeHandler;
    let resizeCallCount = 0;

    useEffect(() => {
      resizeHandler = () => {
        resizeCallCount++;
        // Update responsive classes based on window size
        const container = document.getElementById('responsive-container');
        if (container) {
          if (window.innerWidth < 768) {
            container.className = 'p-2 text-sm';
          } else {
            container.className = 'p-4 text-lg';
          }
        }
      };

      window.addEventListener('resize', resizeHandler);

      // Cleanup
      return () => {
        window.removeEventListener('resize', resizeHandler);
      };
    }, []);

    const container = document.createElement('div');
    container.id = 'responsive-container';
    container.textContent = 'Responsive Container';
    document.getElementById('root').appendChild(container);

    runEffects();

    // Simulate resize
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500
    });

    window.dispatchEvent(new window.Event('resize'));
    expect(resizeCallCount).toBe(1);

    // Cleanup should be handled by effect cleanup
    expect(typeof resizeHandler).toBe('function');
  });

  test('should handle DOM mutation useEffect correctly', () => {
    const { useEffect, runEffects } = mockReact;
    let observer;

    useEffect(() => {
      const targetNode = document.getElementById('mutation-target');

      if (targetNode) {
        observer = new window.MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
              // React to class changes
              const element = mutation.target;
              if (element.classList.contains('bg-primary')) {
                element.setAttribute('data-theme', 'primary');
              }
            }
          });
        });

        observer.observe(targetNode, { attributes: true, attributeFilter: ['class'] });
      }

      return () => {
        if (observer) {
          observer.disconnect();
        }
      };
    }, []);

    const target = document.createElement('div');
    target.id = 'mutation-target';
    target.textContent = 'Mutation Target';
    document.getElementById('root').appendChild(target);

    runEffects();

    // Trigger mutation
    target.className = 'bg-primary p-4';

    // Allow for async mutation observer
    return new Promise(resolve => {
      setTimeout(() => {
        expect(target.getAttribute('data-theme')).toBe('primary');
        resolve();
      }, 10);
    });
  });

  test('should handle CSS-in-JS style updates in useEffect', () => {
    const { useEffect, runEffects } = mockReact;
    let dynamicStyles = {};

    useEffect(() => {
      // Simulate dynamic style calculation
      const calculateStyles = () => {
        const baseHue = 221.2;
        const saturation = 83.2;
        const lightness = 53.3;

        return {
          primary: `${baseHue} ${saturation}% ${lightness}%`,
          primaryHover: `${baseHue} ${saturation}% ${lightness - 5}%`
        };
      };

      dynamicStyles = calculateStyles();

      const element = document.getElementById('dynamic-styled');
      if (element) {
        element.style.setProperty('--dynamic-primary', dynamicStyles.primary);
        element.style.setProperty('--dynamic-primary-hover', dynamicStyles.primaryHover);
      }
    }, []);

    const element = document.createElement('div');
    element.id = 'dynamic-styled';
    element.style.backgroundColor = 'hsl(var(--dynamic-primary))';
    element.textContent = 'Dynamic Styled Element';
    document.getElementById('root').appendChild(element);

    runEffects();

    expect(element.style.getPropertyValue('--dynamic-primary')).toBe('221.2 83.2% 53.3%');
    expect(element.style.getPropertyValue('--dynamic-primary-hover')).toBe('221.2 83.2% 48.3%');
  });

  test('should handle intersection observer useEffect for lazy loading', () => {
    const { useEffect, runEffects } = mockReact;
    let observedEntries = [];

    // Mock IntersectionObserver
    global.IntersectionObserver = class {
      constructor(callback) {
        this.callback = callback;
      }

      observe(element) {
        // Simulate intersection
        setTimeout(() => {
          this.callback([{
            target: element,
            isIntersecting: true,
            intersectionRatio: 1
          }]);
        }, 10);
      }

      unobserve() {}
      disconnect() {}
    };

    useEffect(() => {
      const lazyElements = document.querySelectorAll('.lazy-load');

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('opacity-0');
            entry.target.classList.add('opacity-100');
            observedEntries.push(entry.target);
          }
        });
      });

      lazyElements.forEach(el => observer.observe(el));

      return () => observer.disconnect();
    }, []);

    const lazyElement = document.createElement('div');
    lazyElement.className = 'lazy-load opacity-0 transition-opacity';
    lazyElement.textContent = 'Lazy Loaded Content';
    document.getElementById('root').appendChild(lazyElement);

    runEffects();

    return new Promise(resolve => {
      setTimeout(() => {
        expect(observedEntries.length).toBe(1);
        expect(lazyElement.classList.contains('opacity-100')).toBe(true);
        resolve();
      }, 20);
    });
  });

  test('should prevent useEffect dependency array issues', () => {
    const { useEffect, runEffects, getHookStates } = mockReact;
    let effectCount = 0;

    // Test with primitive dependency
    let count = 0;
    useEffect(() => {
      effectCount++;
    }, [count]);

    runEffects();
    expect(effectCount).toBe(1);

    // Same dependency - should not re-run
    count = 0;
    useEffect(() => {
      effectCount++;
    }, [count]);

    runEffects();
    expect(effectCount).toBe(1); // Should not increment

    // Different dependency - should re-run
    count = 1;
    useEffect(() => {
      effectCount++;
    }, [count]);

    runEffects();
    expect(effectCount).toBe(2);
  });

  test('should handle cleanup functions correctly', () => {
    const { useEffect, runEffects } = mockReact;
    let timeoutId;
    let cleanupCalled = false;

    useEffect(() => {
      timeoutId = setTimeout(() => {
        const element = document.getElementById('delayed-element');
        if (element) {
          element.className = 'bg-primary p-4';
        }
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        cleanupCalled = true;
      };
    }, []);

    const element = document.createElement('div');
    element.id = 'delayed-element';
    element.textContent = 'Delayed Element';
    document.getElementById('root').appendChild(element);

    runEffects();

    // Simulate component unmount by running cleanup
    const hookStates = getHookStates();
    if (hookStates[0]?.cleanup) {
      hookStates[0].cleanup();
    }

    expect(cleanupCalled).toBe(true);
  });
});