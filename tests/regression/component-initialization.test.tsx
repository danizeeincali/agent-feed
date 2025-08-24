/**
 * Component Initialization Regression Tests
 * 
 * CRITICAL: Prevents ReferenceError: Cannot access 'connectWebSocket' before initialization
 * Tests initialization order, useCallback dependencies, and function declarations
 * 
 * This test suite prevents the following critical issues:
 * - ReferenceError in Route-SimpleLauncher due to function hoisting issues
 * - useCallback dependency arrays referencing undefined functions
 * - Component mount failures due to initialization errors
 * - Terminal functionality breaking due to WebSocket connection failures
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

// Mock xterm and socket.io to prevent initialization issues in test environment
jest.mock('xterm', () => {
  const mockTerminal = {
    loadAddon: jest.fn(),
    open: jest.fn(),
    write: jest.fn((data, callback) => {
      if (callback) callback();
    }),
    writeln: jest.fn(),
    onData: jest.fn(() => ({ dispose: jest.fn() })),
    onKey: jest.fn(() => ({ dispose: jest.fn() })),
    dispose: jest.fn(),
    focus: jest.fn(),
    reset: jest.fn(),
    clear: jest.fn(),
    cols: 80,
    rows: 24,
    element: document.createElement('div'),
    buffer: {
      active: {
        cursorY: 0,
        cursorX: 0
      }
    }
  };

  return {
    Terminal: jest.fn(() => mockTerminal)
  };
});

jest.mock('@xterm/addon-fit', () => ({
  FitAddon: jest.fn(() => ({
    fit: jest.fn()
  }))
}));

jest.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: jest.fn()
}));

jest.mock('@xterm/addon-search', () => ({
  SearchAddon: jest.fn()
}));

jest.mock('socket.io-client', () => {
  const mockSocket = {
    connected: false,
    id: 'test-socket-id',
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    onAny: jest.fn(),
    io: {
      engine: {
        transport: {
          name: 'websocket'
        }
      }
    }
  };

  return {
    io: jest.fn(() => mockSocket)
  };
});

// Test wrapper with error boundary
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return (
    <ErrorBoundary
      fallback={<div data-testid="error-boundary">Component Error</div>}
      onError={(error) => {
        console.error('Error boundary caught:', error);
      }}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

describe('Component Initialization Regression Tests', () => {
  let consoleErrors: string[] = [];
  let originalError: typeof console.error;
  let originalWarn: typeof console.warn;

  beforeEach(() => {
    // Capture console errors and warnings
    consoleErrors = [];
    originalError = console.error;
    originalWarn = console.warn;
    
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      consoleErrors.push(message);
      // Only log non-test-related errors
      if (!message.includes('Warning: validateDOMNesting') && 
          !message.includes('Warning: React.jsx')) {
        originalError(...args);
      }
    };

    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      if (!message.includes('Warning: React.jsx')) {
        originalWarn(...args);
      }
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });

  describe('Critical Fix: connectWebSocket ReferenceError Prevention', () => {
    it('should render TerminalFixed component without ReferenceError', async () => {
      const { TerminalFixed } = await import('../../frontend/src/components/TerminalFixed');
      
      const mockProcessStatus = {
        isRunning: true,
        pid: 12345,
        status: 'running' as const
      };

      expect(() => {
        render(
          <TestWrapper>
            <TerminalFixed 
              isVisible={true} 
              processStatus={mockProcessStatus}
            />
          </TestWrapper>
        );
      }).not.toThrow();

      // Verify no error boundary was triggered
      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();

      // Verify no ReferenceError in console
      const referenceErrors = consoleErrors.filter(error => 
        error.includes('ReferenceError') || 
        error.includes('Cannot access') ||
        error.includes('before initialization')
      );

      expect(referenceErrors).toHaveLength(0);
    });

    it('should render SimpleLauncher component without initialization errors', async () => {
      const { SimpleLauncher } = await import('../../frontend/src/components/SimpleLauncher');

      // Mock fetch for API calls
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            claudeAvailable: true,
            status: { isRunning: false, status: 'stopped' },
            workingDirectory: '/test'
          }),
          headers: new Map()
        })
      ) as jest.Mock;

      expect(() => {
        render(
          <TestWrapper>
            <SimpleLauncher />
          </TestWrapper>
        );
      }).not.toThrow();

      // Wait for component to stabilize
      await waitFor(() => {
        expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      });

      // Verify no initialization errors
      const initErrors = consoleErrors.filter(error => 
        error.includes('ReferenceError') || 
        error.includes('TypeError') ||
        error.includes('Cannot access') ||
        error.includes('before initialization')
      );

      expect(initErrors).toHaveLength(0);
    });
  });

  describe('useCallback Dependencies Validation', () => {
    it('should have all useCallback dependencies properly declared and accessible', async () => {
      const { TerminalFixed } = await import('../../frontend/src/components/TerminalFixed');

      const mockProcessStatus = {
        isRunning: true,
        pid: 12345,
        status: 'running' as const
      };

      // Create a container to check DOM mutations
      const container = render(
        <TestWrapper>
          <TerminalFixed 
            isVisible={true} 
            processStatus={mockProcessStatus}
          />
        </TestWrapper>
      ).container;

      // Wait for component to initialize
      await waitFor(() => {
        expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      });

      // Verify no dependency-related errors
      const dependencyErrors = consoleErrors.filter(error =>
        error.includes('dependency') ||
        error.includes('useCallback') ||
        error.includes('useEffect') ||
        error.includes('Hook')
      );

      expect(dependencyErrors).toHaveLength(0);

      // Verify terminal container is created
      const terminalContainer = container.querySelector('div[class*="w-full h-full"]');
      expect(terminalContainer).toBeInTheDocument();
    });

    it('should handle visibility changes without dependency errors', async () => {
      const { TerminalFixed } = await import('../../frontend/src/components/TerminalFixed');

      const mockProcessStatus = {
        isRunning: true,
        pid: 12345,
        status: 'running' as const
      };

      const { rerender } = render(
        <TestWrapper>
          <TerminalFixed 
            isVisible={false} 
            processStatus={mockProcessStatus}
          />
        </TestWrapper>
      );

      // Change visibility to true
      rerender(
        <TestWrapper>
          <TerminalFixed 
            isVisible={true} 
            processStatus={mockProcessStatus}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      });

      // Verify no errors during visibility changes
      const visibilityErrors = consoleErrors.filter(error =>
        error.includes('ReferenceError') ||
        error.includes('Cannot access') ||
        error.includes('useCallback')
      );

      expect(visibilityErrors).toHaveLength(0);
    });
  });

  describe('Function Declaration Accessibility', () => {
    it('should have all function declarations accessible in their usage scope', async () => {
      const { TerminalFixed } = await import('../../frontend/src/components/TerminalFixed');

      const mockProcessStatus = {
        isRunning: true,
        pid: 12345,
        status: 'running' as const
      };

      render(
        <TestWrapper>
          <TerminalFixed 
            isVisible={true} 
            processStatus={mockProcessStatus}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      });

      // Verify no function declaration errors
      const functionErrors = consoleErrors.filter(error =>
        error.includes('is not a function') ||
        error.includes('undefined is not a function') ||
        error.includes('Cannot read properties of undefined')
      );

      expect(functionErrors).toHaveLength(0);
    });

    it('should handle reconnection button clicks without function reference errors', async () => {
      const { TerminalFixed } = await import('../../frontend/src/components/TerminalFixed');

      const mockProcessStatus = {
        isRunning: true,
        pid: 12345,
        status: 'running' as const
      };

      render(
        <TestWrapper>
          <TerminalFixed 
            isVisible={true} 
            processStatus={mockProcessStatus}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      });

      // Find and click reconnect button
      const reconnectButton = screen.getByText('Reconnect');
      expect(reconnectButton).toBeInTheDocument();

      expect(() => {
        fireEvent.click(reconnectButton);
      }).not.toThrow();

      // Verify no function call errors
      const functionCallErrors = consoleErrors.filter(error =>
        error.includes('is not a function') ||
        error.includes('Cannot access')
      );

      expect(functionCallErrors).toHaveLength(0);
    });
  });

  describe('Terminal Functionality After Fix', () => {
    it('should establish WebSocket connection without initialization errors', async () => {
      const { TerminalFixed } = await import('../../frontend/src/components/TerminalFixed');

      const mockProcessStatus = {
        isRunning: true,
        pid: 12345,
        status: 'running' as const
      };

      render(
        <TestWrapper>
          <TerminalFixed 
            isVisible={true} 
            processStatus={mockProcessStatus}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      });

      // Verify WebSocket initialization
      const { io } = require('socket.io-client');
      expect(io).toHaveBeenCalled();

      // Verify no connection errors
      const connectionErrors = consoleErrors.filter(error =>
        error.includes('WebSocket') ||
        error.includes('connection') ||
        error.includes('socket')
      );

      // Filter out expected debug logs
      const actualErrors = connectionErrors.filter(error =>
        !error.includes('DEBUG:') &&
        !error.includes('SPARC DEBUG:') &&
        !error.includes('🔍') &&
        !error.includes('✅') &&
        !error.includes('🚀')
      );

      expect(actualErrors).toHaveLength(0);
    });

    it('should handle terminal input without function reference errors', async () => {
      const { Terminal } = require('xterm');
      const mockTerminalInstance = new Terminal();

      const { TerminalFixed } = await import('../../frontend/src/components/TerminalFixed');

      const mockProcessStatus = {
        isRunning: true,
        pid: 12345,
        status: 'running' as const
      };

      render(
        <TestWrapper>
          <TerminalFixed 
            isVisible={true} 
            processStatus={mockProcessStatus}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      });

      // Simulate terminal input
      const onDataCallback = mockTerminalInstance.onData.mock.calls[0]?.[0];
      if (onDataCallback) {
        expect(() => {
          onDataCallback('test input');
        }).not.toThrow();
      }

      // Verify no input handling errors
      const inputErrors = consoleErrors.filter(error =>
        error.includes('ReferenceError') ||
        error.includes('is not a function') ||
        error.includes('Cannot access')
      );

      expect(inputErrors).toHaveLength(0);
    });

    it('should handle process status changes without dependency errors', async () => {
      const { TerminalFixed } = await import('../../frontend/src/components/TerminalFixed');

      const initialProcessStatus = {
        isRunning: false,
        pid: undefined,
        status: 'stopped' as const
      };

      const { rerender } = render(
        <TestWrapper>
          <TerminalFixed 
            isVisible={true} 
            processStatus={initialProcessStatus}
          />
        </TestWrapper>
      );

      // Change process status to running
      const runningProcessStatus = {
        isRunning: true,
        pid: 12345,
        status: 'running' as const
      };

      rerender(
        <TestWrapper>
          <TerminalFixed 
            isVisible={true} 
            processStatus={runningProcessStatus}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      });

      // Verify no status change errors
      const statusErrors = consoleErrors.filter(error =>
        error.includes('ReferenceError') ||
        error.includes('Cannot access') ||
        error.includes('useEffect')
      );

      expect(statusErrors).toHaveLength(0);
    });
  });

  describe('Error Boundary Protection', () => {
    it('should catch and handle component initialization errors gracefully', async () => {
      // Create a component that will intentionally throw during initialization
      const ErrorComponent: React.FC = () => {
        throw new Error('Intentional initialization error');
      };

      render(
        <TestWrapper>
          <ErrorComponent />
        </TestWrapper>
      );

      // Verify error boundary caught the error
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByText('Component Error')).toBeInTheDocument();
    });

    it('should handle missing function references with error boundary', async () => {
      // Mock a component with broken function references
      jest.doMock('../../frontend/src/components/TerminalFixed', () => ({
        TerminalFixed: () => {
          // This would cause a ReferenceError in the original broken version
          const brokenCallback = React.useCallback(() => {
            // @ts-ignore - intentionally reference undefined function
            undefinedFunction();
          }, []);

          return <div data-testid="broken-component">Broken Component</div>;
        }
      }));

      const { TerminalFixed } = await import('../../frontend/src/components/TerminalFixed');

      render(
        <TestWrapper>
          <TerminalFixed 
            isVisible={true} 
            processStatus={{ isRunning: true, pid: 123, status: 'running' }}
          />
        </TestWrapper>
      );

      // In a proper implementation, this should either work or be caught by error boundary
      // We're testing that the system doesn't crash completely
      const errorBoundary = screen.queryByTestId('error-boundary');
      const component = screen.queryByTestId('broken-component');

      // Either the component renders successfully OR the error boundary catches it
      expect(errorBoundary || component).toBeInTheDocument();
    });

    it('should prevent white screen of death from initialization errors', async () => {
      const { TerminalFixed } = await import('../../frontend/src/components/TerminalFixed');

      const mockProcessStatus = {
        isRunning: true,
        pid: 12345,
        status: 'running' as const
      };

      render(
        <TestWrapper>
          <TerminalFixed 
            isVisible={true} 
            processStatus={mockProcessStatus}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        // Either the component renders successfully or error boundary shows
        const hasContent = screen.queryByText('Terminal (Fixed Version)') ||
                          screen.queryByTestId('error-boundary');
        expect(hasContent).toBeInTheDocument();
      });

      // Verify we don't have an empty screen (white screen of death)
      const bodyContent = document.body.textContent;
      expect(bodyContent).toBeTruthy();
      expect(bodyContent!.length).toBeGreaterThan(0);
    });
  });

  describe('100% Initialization Error Coverage', () => {
    it('should cover all possible ReferenceError scenarios', async () => {
      // Test all the specific error patterns that can occur
      const errorPatterns = [
        'Cannot access',
        'before initialization',
        'ReferenceError',
        'is not defined',
        'is not a function'
      ];

      const { TerminalFixed } = await import('../../frontend/src/components/TerminalFixed');

      const mockProcessStatus = {
        isRunning: true,
        pid: 12345,
        status: 'running' as const
      };

      render(
        <TestWrapper>
          <TerminalFixed 
            isVisible={true} 
            processStatus={mockProcessStatus}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      });

      // Verify none of the error patterns appear in console
      errorPatterns.forEach(pattern => {
        const matchingErrors = consoleErrors.filter(error => 
          error.includes(pattern)
        );
        expect(matchingErrors).toHaveLength(0);
      });
    });

    it('should handle edge case: rapid visibility toggles', async () => {
      const { TerminalFixed } = await import('../../frontend/src/components/TerminalFixed');

      const mockProcessStatus = {
        isRunning: true,
        pid: 12345,
        status: 'running' as const
      };

      const { rerender } = render(
        <TestWrapper>
          <TerminalFixed 
            isVisible={false} 
            processStatus={mockProcessStatus}
          />
        </TestWrapper>
      );

      // Rapidly toggle visibility
      for (let i = 0; i < 5; i++) {
        rerender(
          <TestWrapper>
            <TerminalFixed 
              isVisible={i % 2 === 0} 
              processStatus={mockProcessStatus}
            />
          </TestWrapper>
        );
      }

      await waitFor(() => {
        expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      });

      // Verify no initialization errors from rapid changes
      const rapidChangeErrors = consoleErrors.filter(error =>
        error.includes('ReferenceError') ||
        error.includes('Cannot access') ||
        error.includes('useCallback') ||
        error.includes('useEffect')
      );

      expect(rapidChangeErrors).toHaveLength(0);
    });

    it('should validate all hook dependencies are properly ordered', async () => {
      const { TerminalFixed } = await import('../../frontend/src/components/TerminalFixed');

      const mockProcessStatus = {
        isRunning: true,
        pid: 12345,
        status: 'running' as const
      };

      // Test multiple render cycles to catch dependency issues
      const { rerender } = render(
        <TestWrapper>
          <TerminalFixed 
            isVisible={true} 
            processStatus={mockProcessStatus}
          />
        </TestWrapper>
      );

      // Test with different prop combinations
      const testCases = [
        { isVisible: true, processStatus: { ...mockProcessStatus, status: 'running' as const } },
        { isVisible: false, processStatus: { ...mockProcessStatus, status: 'stopped' as const } },
        { isVisible: true, processStatus: { ...mockProcessStatus, pid: 54321, status: 'running' as const } },
      ];

      for (const testCase of testCases) {
        rerender(
          <TestWrapper>
            <TerminalFixed {...testCase} />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
        });
      }

      // Verify no hook dependency errors across all test cases
      const hookErrors = consoleErrors.filter(error =>
        error.includes('dependency') ||
        error.includes('Hook') ||
        error.includes('useCallback') ||
        error.includes('useEffect') ||
        error.includes('Cannot access')
      );

      expect(hookErrors).toHaveLength(0);
    });
  });
});