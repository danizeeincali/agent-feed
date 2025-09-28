/**
 * Next.js Dynamic Import Validation Tests
 *
 * Tests for Next.js dynamic import validation with React hooks
 * Ensures proper loading and context establishment for dynamically imported components
 */

const { JSDOM } = require('jsdom');
const React = require('react');
const { render, screen, waitFor } = require('@testing-library/react');
require('@testing-library/jest-dom');

// Mock Next.js dynamic import functionality
const mockDynamic = (importFn, options = {}) => {
  const DynamicComponent = React.forwardRef((props, ref) => {
    const [Component, setComponent] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
      let isMounted = true;

      const loadComponent = async () => {
        try {
          setLoading(true);

          // Simulate async import
          const module = await importFn();

          if (isMounted) {
            setComponent(() => module.default || module);
            setError(null);
            setLoading(false);
          }
        } catch (err) {
          if (isMounted) {
            setError(err);
            setLoading(false);
          }
        }
      };

      loadComponent();

      return () => {
        isMounted = false;
      };
    }, []);

    if (loading) {
      return options.loading || <div data-testid="dynamic-loading">Loading...</div>;
    }

    if (error) {
      return <div data-testid="dynamic-error">Error loading component</div>;
    }

    if (!Component) {
      return null;
    }

    return <Component {...props} ref={ref} />;
  });

  DynamicComponent.displayName = 'DynamicComponent';
  return DynamicComponent;
};

describe('Next.js Dynamic Import React Hooks Validation', () => {
  let originalError;
  let consoleErrors = [];

  beforeAll(() => {
    // Mock Next.js environment
    global.window = new JSDOM().window;
    global.document = global.window.document;
    global.navigator = global.window.navigator;

    // Capture console errors
    originalError = console.error;
    console.error = (...args) => {
      consoleErrors.push(args);
      originalError(...args);
    };
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    consoleErrors = [];
    jest.clearAllMocks();
  });

  describe('Dynamic Import Hook Integration Tests', () => {
    test('should load dynamically imported component without context errors', async () => {
      // Mock component that uses hooks
      const MockAgentComponent = () => {
        const [agents, setAgents] = React.useState([]);
        const [loading, setLoading] = React.useState(true);

        React.useEffect(() => {
          // Simulate data loading
          setTimeout(() => {
            setAgents([
              { id: 1, name: 'Agent 1' },
              { id: 2, name: 'Agent 2' }
            ]);
            setLoading(false);
          }, 100);
        }, []);

        if (loading) return <div data-testid="component-loading">Loading agents...</div>;

        return (
          <div data-testid="agent-component">
            {agents.map(agent => (
              <div key={agent.id} data-testid={`agent-${agent.id}`}>
                {agent.name}
              </div>
            ))}
          </div>
        );
      };

      // Create dynamic component
      const DynamicAgentComponent = mockDynamic(() =>
        Promise.resolve({ default: MockAgentComponent })
      );

      render(<DynamicAgentComponent />);

      // Wait for dynamic loading
      await waitFor(() => {
        expect(screen.getByTestId('dynamic-loading')).toBeInTheDocument();
      });

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByTestId('component-loading')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('agent-component')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify no context errors during dynamic import
      const dynamicErrors = consoleErrors.filter(error =>
        error.some(arg =>
          typeof arg === 'string' &&
          (arg.includes('Warning: Invalid hook call') ||
           arg.includes('Warning: Cannot update during an existing state transition'))
        )
      );

      expect(dynamicErrors).toHaveLength(0);
    });

    test('should handle dynamic import with SSR considerations', async () => {
      const SSRSafeComponent = () => {
        const [isClient, setIsClient] = React.useState(false);
        const [data, setData] = React.useState(null);

        React.useEffect(() => {
          setIsClient(true);
          // Simulate client-side only operations
          if (typeof window !== 'undefined') {
            setData('Client-side data loaded');
          }
        }, []);

        if (!isClient) {
          return <div data-testid="ssr-placeholder">SSR Placeholder</div>;
        }

        return (
          <div data-testid="ssr-component">
            <div data-testid="client-data">{data}</div>
          </div>
        );
      };

      const DynamicSSRComponent = mockDynamic(() =>
        Promise.resolve({ default: SSRSafeComponent })
      );

      render(<DynamicSSRComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('ssr-component')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('client-data')).toHaveTextContent('Client-side data loaded');
      });

      // Check for SSR-related context errors
      const ssrErrors = consoleErrors.filter(error =>
        error.some(arg =>
          typeof arg === 'string' &&
          (arg.includes('Warning: useLayoutEffect does nothing on the server') ||
           arg.includes('Warning: Text content did not match'))
        )
      );

      expect(ssrErrors).toHaveLength(0);
    });

    test('should handle dynamic import failures gracefully', async () => {
      const DynamicFailingComponent = mockDynamic(() =>
        Promise.reject(new Error('Import failed'))
      );

      render(<DynamicFailingComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('dynamic-error')).toBeInTheDocument();
      });

      // Verify error handling doesn't cause additional context issues
      const errorHandlingErrors = consoleErrors.filter(error =>
        error.some(arg =>
          typeof arg === 'string' &&
          arg.includes('Warning: Cannot update a component') &&
          !arg.includes('Import failed')
        )
      );

      expect(errorHandlingErrors).toHaveLength(0);
    });

    test('should handle dynamic component with complex hooks', async () => {
      const ComplexHooksComponent = () => {
        const [state1, setState1] = React.useState('initial');
        const [state2, setState2] = React.useState([]);
        const [state3, setState3] = React.useState({});

        // Multiple useEffect hooks
        React.useEffect(() => {
          setState1('updated');
        }, []);

        React.useEffect(() => {
          setState2([1, 2, 3]);
        }, [state1]);

        React.useEffect(() => {
          setState3({ loaded: true, timestamp: Date.now() });
        }, [state2]);

        // Custom hook simulation
        const useCustomHook = () => {
          const [value, setValue] = React.useState('custom');
          React.useEffect(() => {
            setValue('custom-updated');
          }, []);
          return value;
        };

        const customValue = useCustomHook();

        return (
          <div data-testid="complex-hooks-component">
            <div data-testid="state1">{state1}</div>
            <div data-testid="state2">{state2.join(',')}</div>
            <div data-testid="state3">{JSON.stringify(state3)}</div>
            <div data-testid="custom-value">{customValue}</div>
          </div>
        );
      };

      const DynamicComplexComponent = mockDynamic(() =>
        Promise.resolve({ default: ComplexHooksComponent })
      );

      render(<DynamicComplexComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('complex-hooks-component')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('custom-value')).toHaveTextContent('custom-updated');
      });

      // Check for complex hooks context errors
      const complexHooksErrors = consoleErrors.filter(error =>
        error.some(arg =>
          typeof arg === 'string' &&
          (arg.includes('Warning: useEffect') ||
           arg.includes('Warning: Invalid hook call'))
        )
      );

      expect(complexHooksErrors).toHaveLength(0);
    });
  });

  describe('Dynamic Import Memory Management Tests', () => {
    test('should properly cleanup dynamic components on unmount', async () => {
      const CleanupComponent = () => {
        const [timer, setTimer] = React.useState(null);

        React.useEffect(() => {
          const interval = setInterval(() => {
            // Simulate ongoing operation
          }, 100);
          setTimer(interval);

          return () => {
            if (timer) {
              clearInterval(timer);
            }
            clearInterval(interval);
          };
        }, []);

        return <div data-testid="cleanup-component">Cleanup Component</div>;
      };

      const DynamicCleanupComponent = mockDynamic(() =>
        Promise.resolve({ default: CleanupComponent })
      );

      const { unmount } = render(<DynamicCleanupComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('cleanup-component')).toBeInTheDocument();
      });

      unmount();

      // Check for memory leak warnings
      const memoryLeakErrors = consoleErrors.filter(error =>
        error.some(arg =>
          typeof arg === 'string' &&
          (arg.includes('Warning: Can\'t perform a React state update') ||
           arg.includes('memory leak'))
        )
      );

      expect(memoryLeakErrors).toHaveLength(0);
    });

    test('should handle multiple dynamic imports simultaneously', async () => {
      const Component1 = () => {
        const [loaded, setLoaded] = React.useState(false);
        React.useEffect(() => {
          setLoaded(true);
        }, []);
        return <div data-testid="component-1">Component 1: {loaded.toString()}</div>;
      };

      const Component2 = () => {
        const [loaded, setLoaded] = React.useState(false);
        React.useEffect(() => {
          setLoaded(true);
        }, []);
        return <div data-testid="component-2">Component 2: {loaded.toString()}</div>;
      };

      const Component3 = () => {
        const [loaded, setLoaded] = React.useState(false);
        React.useEffect(() => {
          setLoaded(true);
        }, []);
        return <div data-testid="component-3">Component 3: {loaded.toString()}</div>;
      };

      const DynamicComponent1 = mockDynamic(() => Promise.resolve({ default: Component1 }));
      const DynamicComponent2 = mockDynamic(() => Promise.resolve({ default: Component2 }));
      const DynamicComponent3 = mockDynamic(() => Promise.resolve({ default: Component3 }));

      render(
        <div>
          <DynamicComponent1 />
          <DynamicComponent2 />
          <DynamicComponent3 />
        </div>
      );

      await waitFor(() => {
        expect(screen.getByTestId('component-1')).toHaveTextContent('Component 1: true');
        expect(screen.getByTestId('component-2')).toHaveTextContent('Component 2: true');
        expect(screen.getByTestId('component-3')).toHaveTextContent('Component 3: true');
      });

      // Check for concurrent loading context errors
      const concurrentErrors = consoleErrors.filter(error =>
        error.some(arg =>
          typeof arg === 'string' &&
          (arg.includes('Warning: Cannot update during an existing state transition') ||
           arg.includes('Warning: flushSync'))
        )
      );

      expect(concurrentErrors).toHaveLength(0);
    });
  });

  describe('Dynamic Import Performance Tests', () => {
    test('should handle dynamic import loading states efficiently', async () => {
      const LoadingStateComponent = () => {
        const [progress, setProgress] = React.useState(0);

        React.useEffect(() => {
          const interval = setInterval(() => {
            setProgress(prev => {
              if (prev >= 100) {
                clearInterval(interval);
                return 100;
              }
              return prev + 10;
            });
          }, 50);

          return () => clearInterval(interval);
        }, []);

        return (
          <div data-testid="loading-state-component">
            Loading: {progress}%
          </div>
        );
      };

      const DynamicLoadingComponent = mockDynamic(
        () => {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({ default: LoadingStateComponent });
            }, 200);
          });
        },
        {
          loading: () => <div data-testid="custom-loading">Custom loading...</div>
        }
      );

      render(<DynamicLoadingComponent />);

      // Check custom loading state
      expect(screen.getByTestId('custom-loading')).toBeInTheDocument();

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByTestId('loading-state-component')).toBeInTheDocument();
      }, { timeout: 1000 });

      // Wait for progress to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading-state-component')).toHaveTextContent('Loading: 100%');
      }, { timeout: 2000 });

      // Check for performance-related context errors
      const performanceErrors = consoleErrors.filter(error =>
        error.some(arg =>
          typeof arg === 'string' &&
          (arg.includes('Warning: Each child in a list should have a unique "key"') ||
           arg.includes('Warning: A component is changing an uncontrolled input'))
        )
      );

      expect(performanceErrors).toHaveLength(0);
    });
  });
});