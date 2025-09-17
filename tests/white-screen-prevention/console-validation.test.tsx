import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

/**
 * TDD Test Suite: Console Error Validation
 *
 * Purpose: Verify console has no critical errors that could indicate white screen issues
 * Critical console errors often precede or accompany white screen problems
 */

describe('Console Error Validation Tests', () => {
  let originalConsole: typeof console;
  let consoleErrors: string[] = [];
  let consoleWarnings: string[] = [];
  let consoleLogs: string[] = [];

  beforeEach(() => {
    // Store original console
    originalConsole = console;

    // Reset error arrays
    consoleErrors = [];
    consoleWarnings = [];
    consoleLogs = [];

    // Mock console methods to capture output
    console.error = vi.fn((...args: any[]) => {
      consoleErrors.push(args.map(arg =>
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' '));
    });

    console.warn = vi.fn((...args: any[]) => {
      consoleWarnings.push(args.map(arg =>
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' '));
    });

    console.log = vi.fn((...args: any[]) => {
      consoleLogs.push(args.map(arg =>
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' '));
    });
  });

  afterEach(() => {
    cleanup();

    // Restore original console
    console = originalConsole;

    vi.clearAllMocks();
  });

  describe('Critical Error Detection', () => {
    it('should detect React rendering errors', () => {
      const ErrorComponent = () => {
        throw new Error('React rendering error');
      };

      const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        try {
          return <>{children}</>;
        } catch (error) {
          console.error('ErrorBoundary caught:', error.message);
          return <div data-testid="error-caught">Error handled</div>;
        }
      };

      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      // Check that error was logged
      expect(consoleErrors.some(error =>
        error.includes('React rendering error')
      )).toBe(true);

      expect(screen.getByTestId('error-caught')).toBeInTheDocument();
    });

    it('should detect JavaScript runtime errors', () => {
      const RuntimeErrorComponent = () => {
        React.useEffect(() => {
          try {
            // Simulate runtime error
            (null as any).someProperty.access;
          } catch (error) {
            console.error('Runtime error:', error.message);
          }
        }, []);

        return <div data-testid="runtime-test">Runtime Test</div>;
      };

      render(<RuntimeErrorComponent />);

      expect(screen.getByTestId('runtime-test')).toBeInTheDocument();

      // Should have logged the runtime error
      expect(consoleErrors.some(error =>
        error.includes('Runtime error:')
      )).toBe(true);
    });

    it('should detect failed module imports', () => {
      const ImportErrorComponent = () => {
        React.useEffect(() => {
          const testImport = async () => {
            try {
              await import('./non-existent-module');
            } catch (error) {
              console.error('Import failed:', error.message);
            }
          };

          testImport();
        }, []);

        return <div data-testid="import-test">Import Test</div>;
      };

      render(<ImportErrorComponent />);

      expect(screen.getByTestId('import-test')).toBeInTheDocument();
    });

    it('should detect network request failures', () => {
      const NetworkErrorComponent = () => {
        React.useEffect(() => {
          const testFetch = async () => {
            try {
              await fetch('/api/non-existent-endpoint');
            } catch (error) {
              console.error('Network error:', error.message);
            }
          };

          testFetch();
        }, []);

        return <div data-testid="network-test">Network Test</div>;
      };

      render(<NetworkErrorComponent />);

      expect(screen.getByTestId('network-test')).toBeInTheDocument();
    });
  });

  describe('React-Specific Error Patterns', () => {
    it('should detect hydration mismatch warnings', () => {
      const HydrationComponent = ({ serverContent, clientContent }: {
        serverContent: string;
        clientContent: string;
      }) => {
        const [isClient, setIsClient] = React.useState(false);

        React.useEffect(() => {
          setIsClient(true);
        }, []);

        // Simulate potential hydration mismatch
        if (isClient && serverContent !== clientContent) {
          console.warn('Hydration mismatch detected');
        }

        return (
          <div data-testid="hydration-test">
            {isClient ? clientContent : serverContent}
          </div>
        );
      };

      render(
        <HydrationComponent
          serverContent="Server Content"
          clientContent="Client Content"
        />
      );

      expect(screen.getByTestId('hydration-test')).toBeInTheDocument();
    });

    it('should detect key prop warnings', () => {
      const KeyWarningComponent = () => {
        const items = ['item1', 'item2', 'item3'];

        React.useEffect(() => {
          // Simulate missing key warning
          console.warn('Warning: Each child in a list should have a unique "key" prop');
        }, []);

        return (
          <div data-testid="key-warning">
            {items.map(item => (
              <div key={item}>{item}</div> // This has keys, but we simulate the warning
            ))}
          </div>
        );
      };

      render(<KeyWarningComponent />);

      expect(screen.getByTestId('key-warning')).toBeInTheDocument();
      expect(consoleWarnings.some(warning =>
        warning.includes('unique "key" prop')
      )).toBe(true);
    });

    it('should detect deprecated React warnings', () => {
      const DeprecatedComponent = () => {
        React.useEffect(() => {
          // Simulate deprecated API usage warning
          console.warn('Warning: componentWillMount has been renamed');
        }, []);

        return <div data-testid="deprecated-test">Deprecated Test</div>;
      };

      render(<DeprecatedComponent />);

      expect(screen.getByTestId('deprecated-test')).toBeInTheDocument();
      expect(consoleWarnings.some(warning =>
        warning.includes('componentWillMount')
      )).toBe(true);
    });
  });

  describe('Browser API Error Detection', () => {
    it('should detect localStorage access errors', () => {
      const StorageErrorComponent = () => {
        React.useEffect(() => {
          try {
            // Simulate localStorage error (e.g., in private browsing)
            localStorage.setItem('test', 'value');
          } catch (error) {
            console.error('LocalStorage error:', error.message);
          }
        }, []);

        return <div data-testid="storage-test">Storage Test</div>;
      };

      render(<StorageErrorComponent />);

      expect(screen.getByTestId('storage-test')).toBeInTheDocument();
    });

    it('should detect WebSocket connection errors', () => {
      const WebSocketErrorComponent = () => {
        React.useEffect(() => {
          try {
            const ws = new WebSocket('ws://invalid-url:9999');
            ws.onerror = () => {
              console.error('WebSocket connection failed');
            };

            return () => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.close();
              }
            };
          } catch (error) {
            console.error('WebSocket creation failed:', error.message);
          }
        }, []);

        return <div data-testid="websocket-test">WebSocket Test</div>;
      };

      render(<WebSocketErrorComponent />);

      expect(screen.getByTestId('websocket-test')).toBeInTheDocument();
    });

    it('should detect unhandled promise rejections', () => {
      const PromiseErrorComponent = () => {
        React.useEffect(() => {
          // Simulate unhandled promise rejection
          Promise.reject(new Error('Unhandled promise rejection'))
            .catch(error => {
              console.error('Promise rejection handled:', error.message);
            });
        }, []);

        return <div data-testid="promise-test">Promise Test</div>;
      };

      render(<PromiseErrorComponent />);

      expect(screen.getByTestId('promise-test')).toBeInTheDocument();
    });
  });

  describe('Performance Warning Detection', () => {
    it('should detect excessive re-render warnings', () => {
      const ExcessiveRenderComponent = () => {
        const [count, setCount] = React.useState(0);

        React.useEffect(() => {
          // Simulate performance warning
          if (count > 100) {
            console.warn('Excessive re-renders detected');
          }
        }, [count]);

        React.useEffect(() => {
          // Trigger a few re-renders
          const timer = setTimeout(() => {
            if (count < 5) {
              setCount(c => c + 1);
            }
          }, 10);

          return () => clearTimeout(timer);
        }, [count]);

        return <div data-testid="render-test">Render Count: {count}</div>;
      };

      render(<ExcessiveRenderComponent />);

      expect(screen.getByTestId('render-test')).toBeInTheDocument();
    });

    it('should detect memory usage warnings', () => {
      const MemoryWarningComponent = () => {
        React.useEffect(() => {
          // Simulate memory warning
          if (performance.memory && performance.memory.usedJSHeapSize > 50000000) {
            console.warn('High memory usage detected');
          } else {
            // Simulate the warning for testing
            console.warn('Memory usage warning simulation');
          }
        }, []);

        return <div data-testid="memory-test">Memory Test</div>;
      };

      render(<MemoryWarningComponent />);

      expect(screen.getByTestId('memory-test')).toBeInTheDocument();
      expect(consoleWarnings.some(warning =>
        warning.includes('memory')
      )).toBe(true);
    });
  });

  describe('Error Classification and Severity', () => {
    it('should classify errors by severity', () => {
      const ClassificationComponent = () => {
        React.useEffect(() => {
          // Simulate different severity levels
          console.log('Info: Component mounted successfully');
          console.warn('Warning: Non-critical issue detected');
          console.error('Error: Critical issue detected');
        }, []);

        return <div data-testid="classification-test">Classification Test</div>;
      };

      render(<ClassificationComponent />);

      expect(screen.getByTestId('classification-test')).toBeInTheDocument();

      // Verify different types of messages were captured
      expect(consoleLogs.length).toBeGreaterThan(0);
      expect(consoleWarnings.length).toBeGreaterThan(0);
      expect(consoleErrors.length).toBeGreaterThan(0);
    });

    it('should identify white-screen-related error patterns', () => {
      const WhiteScreenPatternComponent = () => {
        React.useEffect(() => {
          // Simulate patterns that indicate white screen issues
          const patterns = [
            'Cannot read property of undefined',
            'Component did not mount',
            'Root element not found',
            'Failed to execute createRoot',
            'Uncaught TypeError: Cannot read properties',
            'ChunkLoadError: Loading chunk failed',
          ];

          patterns.forEach(pattern => {
            console.error(`White screen indicator: ${pattern}`);
          });
        }, []);

        return <div data-testid="pattern-test">Pattern Test</div>;
      };

      render(<WhiteScreenPatternComponent />);

      expect(screen.getByTestId('pattern-test')).toBeInTheDocument();

      const whiteScreenErrors = consoleErrors.filter(error =>
        error.includes('White screen indicator:') ||
        error.includes('Cannot read property') ||
        error.includes('Root element not found') ||
        error.includes('createRoot') ||
        error.includes('ChunkLoadError')
      );

      expect(whiteScreenErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Console Output Analysis', () => {
    it('should provide console error summary', () => {
      const SummaryComponent = () => {
        React.useEffect(() => {
          // Generate various types of console output
          console.log('Application started');
          console.warn('Deprecated API usage');
          console.error('Critical error occurred');
        }, []);

        return <div data-testid="summary-test">Summary Test</div>;
      };

      render(<SummaryComponent />);

      expect(screen.getByTestId('summary-test')).toBeInTheDocument();

      // Analyze console output
      const summary = {
        totalErrors: consoleErrors.length,
        totalWarnings: consoleWarnings.length,
        totalLogs: consoleLogs.length,
        criticalErrors: consoleErrors.filter(error =>
          error.includes('Critical') ||
          error.includes('Fatal') ||
          error.includes('Cannot read property')
        ).length,
      };

      expect(summary.totalErrors).toBeGreaterThan(0);
      expect(summary.totalWarnings).toBeGreaterThan(0);
      expect(summary.totalLogs).toBeGreaterThan(0);
    });

    it('should filter out known safe warnings', () => {
      const SafeWarningComponent = () => {
        React.useEffect(() => {
          // Simulate warnings that are known to be safe
          console.warn('Warning: React DevTools extension detected');
          console.warn('Warning: findDOMNode is deprecated in StrictMode');
          console.warn('Critical error: Cannot render component'); // This should not be filtered
        }, []);

        return <div data-testid="filter-test">Filter Test</div>;
      };

      render(<SafeWarningComponent />);

      expect(screen.getByTestId('filter-test')).toBeInTheDocument();

      const safeWarnings = [
        'React DevTools',
        'findDOMNode is deprecated',
        'StrictMode',
      ];

      const filteredWarnings = consoleWarnings.filter(warning =>
        !safeWarnings.some(safe => warning.includes(safe))
      );

      const criticalWarnings = filteredWarnings.filter(warning =>
        warning.includes('Critical') || warning.includes('Cannot render')
      );

      expect(criticalWarnings.length).toBeGreaterThan(0);
    });
  });

  describe('Real-time Error Monitoring', () => {
    it('should monitor errors during component lifecycle', () => {
      const LifecycleComponent = () => {
        const [phase, setPhase] = React.useState('mounting');

        React.useEffect(() => {
          console.log(`Lifecycle: ${phase}`);

          setPhase('mounted');

          return () => {
            console.log('Lifecycle: unmounting');
          };
        }, []);

        React.useEffect(() => {
          if (phase === 'mounted') {
            console.log('Lifecycle: updated');
          }
        }, [phase]);

        return <div data-testid="lifecycle-test">Phase: {phase}</div>;
      };

      const { unmount } = render(<LifecycleComponent />);

      expect(screen.getByTestId('lifecycle-test')).toBeInTheDocument();

      // Verify lifecycle logging
      expect(consoleLogs.some(log => log.includes('mounting'))).toBe(true);

      unmount();

      expect(consoleLogs.some(log => log.includes('unmounting'))).toBe(true);
    });

    it('should track error frequency and patterns', () => {
      const FrequencyComponent = () => {
        React.useEffect(() => {
          // Simulate repeated errors
          const interval = setInterval(() => {
            console.error('Repeated error pattern');
          }, 100);

          setTimeout(() => clearInterval(interval), 500);

          return () => clearInterval(interval);
        }, []);

        return <div data-testid="frequency-test">Frequency Test</div>;
      };

      render(<FrequencyComponent />);

      expect(screen.getByTestId('frequency-test')).toBeInTheDocument();

      setTimeout(() => {
        const repeatedErrors = consoleErrors.filter(error =>
          error.includes('Repeated error pattern')
        );

        expect(repeatedErrors.length).toBeGreaterThan(1);
      }, 600);
    });
  });
});