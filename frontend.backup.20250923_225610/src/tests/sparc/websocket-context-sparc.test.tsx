/**
 * SPARC Methodology Test Suite for WebSocket Context
 * 
 * S - Specification: Test requirements and behavior specifications
 * P - Pseudocode: Test algorithmic logic and flow
 * A - Architecture: Test component structure and design patterns
 * R - Refinement: Test edge cases and optimizations
 * C - Completion: Test integration and final validation
 */

import { render, screen, waitFor, act, renderHook } from '@testing-library/react';
import { WebSocketSingletonProvider, useWebSocketSingletonContext } from '../../context/WebSocketSingletonContext';
import { ReactContextValidator } from '../../utils/validation/react-context-validator';
import { TemporalDeadZoneDetector } from '../../patterns/temporal-dead-zone-prevention';
import React from 'react';

// Mock dependencies
jest.mock('../../hooks/useWebSocketSingleton', () => ({
  useWebSocketSingleton: jest.fn(() => ({
    socket: {
      id: 'test-socket',
      connected: true,
      disconnected: false,
      io: { readyState: 'open' },
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    },
    isConnected: true,
    connect: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn()
  }))
}));

describe('SPARC Methodology: WebSocket Context', () => {
  let mockConsole: { error: any; warn: any; log: any };
  
  beforeEach(() => {
    // Capture console output for testing
    mockConsole = {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn()
    };
    
    jest.spyOn(console, 'error').mockImplementation(mockConsole.error);
    jest.spyOn(console, 'warn').mockImplementation(mockConsole.warn);
    jest.spyOn(console, 'log').mockImplementation(mockConsole.log);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('S - Specification Tests', () => {
    it('should meet the requirement: Fix connectionState temporal dead zone initialization error', () => {
      // Specification: The context must not throw "Cannot access 'connectionState' before initialization"
      expect(() => {
        render(
          <WebSocketSingletonProvider>
            <div>Test</div>
          </WebSocketSingletonProvider>
        );
      }).not.toThrow();
    });

    it('should meet the requirement: Provide all required context properties', async () => {
      const TestComponent = () => {
        const context = useWebSocketSingletonContext();
        return (
          <div data-testid="context-properties">
            {JSON.stringify(Object.keys(context).sort())}
          </div>
        );
      };

      render(
        <WebSocketSingletonProvider>
          <TestComponent />
        </WebSocketSingletonProvider>
      );

      await waitFor(() => {
        const element = screen.getByTestId('context-properties');
        const properties = JSON.parse(element.textContent || '[]');
        
        const requiredProperties = [
          'socket', 'isConnected', 'connect', 'disconnect', 'emit',
          'on', 'off', 'subscribe', 'unsubscribe', 'connectionState',
          'connectionError', 'notifications', 'onlineUsers', 'systemStats',
          'clearNotifications', 'markNotificationAsRead', 'addNotification',
          'subscribeFeed', 'unsubscribeFeed', 'subscribePost', 'unsubscribePost',
          'sendLike', 'sendMessage', 'reconnect'
        ];

        requiredProperties.forEach(prop => {
          expect(properties).toContain(prop);
        });
      });
    });

    it('should meet the requirement: Handle Socket.IO specific connection states', async () => {
      const TestComponent = () => {
        const { connectionState } = useWebSocketSingletonContext();
        return (
          <div data-testid="connection-state">
            {JSON.stringify(connectionState)}
          </div>
        );
      };

      render(
        <WebSocketSingletonProvider>
          <TestComponent />
        </WebSocketSingletonProvider>
      );

      await waitFor(() => {
        const element = screen.getByTestId('connection-state');
        const state = JSON.parse(element.textContent || '{}');
        
        expect(state).toHaveProperty('isConnected');
        expect(state).toHaveProperty('isConnecting');
        expect(state).toHaveProperty('reconnectAttempt');
        expect(state).toHaveProperty('lastConnected');
        expect(state).toHaveProperty('connectionError');
      });
    });
  });

  describe('P - Pseudocode Tests', () => {
    it('should follow the algorithmic flow: Variable Declaration Before Usage', async () => {
      // Pseudocode verification:
      // 1. Declare all state variables
      // 2. Calculate derived state (connectionState)
      // 3. Define callback functions
      // 4. Build context value
      // 5. Return provider with value

      const detector = new TemporalDeadZoneDetector();
      const fs = await import('fs');
      const contextCode = await fs.promises.readFile(
        '/workspaces/agent-feed/frontend/src/context/WebSocketSingletonContext.tsx',
        'utf8'
      );

      const analysis = detector.analyzeCode(contextCode);
      
      // Should not have any temporal dead zone issues
      expect(analysis.issues).toHaveLength(0);
      expect(analysis.riskLevel).toBe('low');
    });

    it('should follow the memoization algorithm correctly', async () => {
      const TestComponent = () => {
        const context = useWebSocketSingletonContext();
        
        // Test memoization stability
        React.useEffect(() => {
          (window as any).contextReferenceCount = 
            ((window as any).contextReferenceCount || 0) + 1;
        }, [context]);
        
        return <div>Test</div>;
      };

      const { rerender } = render(
        <WebSocketSingletonProvider>
          <TestComponent />
        </WebSocketSingletonProvider>
      );

      // Force re-render with same props
      rerender(
        <WebSocketSingletonProvider>
          <TestComponent />
        </WebSocketSingletonProvider>
      );

      // Context should maintain referential stability
      await waitFor(() => {
        const referenceCount = (window as any).contextReferenceCount;
        expect(referenceCount).toBe(1); // Should not create new references
      });
    });
  });

  describe('A - Architecture Tests', () => {
    it('should follow React context architecture patterns', async () => {
      const validator = new ReactContextValidator();
      const fs = await import('fs');
      const contextCode = await fs.promises.readFile(
        '/workspaces/agent-feed/frontend/src/context/WebSocketSingletonContext.tsx',
        'utf8'
      );

      const validation = validator.validate(contextCode);
      
      // Should have no architecture errors
      const architectureErrors = validation.results.filter(r => 
        r.severity === 'error' && r.ruleId === 'temporal-dead-zone'
      );
      
      expect(architectureErrors).toHaveLength(0);
    });

    it('should implement proper separation of concerns', () => {
      const TestComponent = () => {
        const context = useWebSocketSingletonContext();
        
        // Context should separate different concerns
        return (
          <div>
            <div data-testid="connection-concern">
              {typeof context.connect === 'function' ? 'Connection methods available' : 'Missing'}
            </div>
            <div data-testid="notification-concern">
              {Array.isArray(context.notifications) ? 'Notification management available' : 'Missing'}
            </div>
            <div data-testid="subscription-concern">
              {typeof context.subscribeFeed === 'function' ? 'Subscription management available' : 'Missing'}
            </div>
          </div>
        );
      };

      render(
        <WebSocketSingletonProvider>
          <TestComponent />
        </WebSocketSingletonProvider>
      );

      expect(screen.getByTestId('connection-concern')).toHaveTextContent('Connection methods available');
      expect(screen.getByTestId('notification-concern')).toHaveTextContent('Notification management available');
      expect(screen.getByTestId('subscription-concern')).toHaveTextContent('Subscription management available');
    });

    it('should implement proper error boundary integration', () => {
      const ErrorBoundaryTest = ({ children }: { children: React.ReactNode }) => {
        const [hasError, setHasError] = React.useState(false);
        
        React.useEffect(() => {
          const handleError = (event: ErrorEvent) => {
            if (event.message.includes('connectionState') && 
                event.message.includes('before initialization')) {
              setHasError(true);
            }
          };
          
          window.addEventListener('error', handleError);
          return () => window.removeEventListener('error', handleError);
        }, []);
        
        if (hasError) {
          return <div data-testid="error-boundary">Error caught</div>;
        }
        
        return <>{children}</>;
      };

      render(
        <ErrorBoundaryTest>
          <WebSocketSingletonProvider>
            <div data-testid="success">Context rendered successfully</div>
          </WebSocketSingletonProvider>
        </ErrorBoundaryTest>
      );

      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      expect(screen.getByTestId('success')).toBeInTheDocument();
    });
  });

  describe('R - Refinement Tests', () => {
    it('should handle edge case: Rapid re-renders without temporal dead zone errors', async () => {
      const TestComponent = () => {
        const context = useWebSocketSingletonContext();
        const [renderCount, setRenderCount] = React.useState(0);
        
        React.useEffect(() => {
          const timer = setTimeout(() => {
            setRenderCount(count => count + 1);
          }, 10);
          return () => clearTimeout(timer);
        }, [renderCount]);
        
        return (
          <div data-testid="render-count">{renderCount}</div>
        );
      };

      render(
        <WebSocketSingletonProvider>
          <TestComponent />
        </WebSocketSingletonProvider>
      );

      // Wait for several re-renders
      await waitFor(() => {
        const element = screen.getByTestId('render-count');
        expect(parseInt(element.textContent || '0')).toBeGreaterThan(3);
      }, { timeout: 1000 });

      // Should not have thrown any temporal dead zone errors
      expect(mockConsole.error).not.toHaveBeenCalledWith(
        expect.stringMatching(/Cannot access.*before initialization/)
      );
    });

    it('should handle edge case: Dynamic configuration changes', async () => {
      const TestComponent = () => {
        const context = useWebSocketSingletonContext();
        return (
          <div data-testid="context-stable">
            {context ? 'Context Available' : 'Context Missing'}
          </div>
        );
      };

      const { rerender } = render(
        <WebSocketSingletonProvider config={{ url: 'ws://localhost:3001' }}>
          <TestComponent />
        </WebSocketSingletonProvider>
      );

      // Change configuration
      rerender(
        <WebSocketSingletonProvider config={{ url: 'ws://localhost:3002', autoConnect: false }}>
          <TestComponent />
        </WebSocketSingletonProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('context-stable')).toHaveTextContent('Context Available');
      });
    });

    it('should optimize performance through proper memoization', async () => {
      let renderCount = 0;
      
      const TestComponent = () => {
        renderCount++;
        const context = useWebSocketSingletonContext();
        return <div data-testid="component">Render {renderCount}</div>;
      };

      const MemoizedTestComponent = React.memo(TestComponent);

      const { rerender } = render(
        <WebSocketSingletonProvider>
          <MemoizedTestComponent />
        </WebSocketSingletonProvider>
      );

      const initialRenderCount = renderCount;

      // Re-render with same props - should not cause child re-render
      rerender(
        <WebSocketSingletonProvider>
          <MemoizedTestComponent />
        </WebSocketSingletonProvider>
      );

      // Render count should not increase significantly due to memoization
      expect(renderCount - initialRenderCount).toBeLessThanOrEqual(1);
    });
  });

  describe('C - Completion Tests', () => {
    it('should integrate properly with the complete application', async () => {
      // Test that the context works in a realistic application scenario
      const MockApp = () => {
        const { 
          isConnected, 
          connectionState, 
          notifications, 
          sendMessage 
        } = useWebSocketSingletonContext();
        
        React.useEffect(() => {
          // Simulate application usage
          sendMessage('test_event', { data: 'test' });
        }, [sendMessage]);
        
        return (
          <div>
            <div data-testid="app-connection-status">
              {isConnected ? 'App Connected' : 'App Disconnected'}
            </div>
            <div data-testid="app-connection-state">
              {JSON.stringify(connectionState)}
            </div>
            <div data-testid="app-notifications">
              {notifications.length} notifications
            </div>
          </div>
        );
      };

      render(
        <WebSocketSingletonProvider>
          <MockApp />
        </WebSocketSingletonProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('app-connection-status')).toHaveTextContent('App Connected');
        expect(screen.getByTestId('app-connection-state')).toBeInTheDocument();
        expect(screen.getByTestId('app-notifications')).toHaveTextContent('0 notifications');
      });
    });

    it('should pass comprehensive validation suite', async () => {
      const validator = new ReactContextValidator();
      const fs = await import('fs');
      const contextCode = await fs.promises.readFile(
        '/workspaces/agent-feed/frontend/src/context/WebSocketSingletonContext.tsx',
        'utf8'
      );

      const validation = validator.validate(contextCode);
      const report = validator.generateReport(contextCode);
      
      console.log('SPARC Validation Report:', report);
      
      // Should have no critical errors
      const criticalErrors = validation.results.filter(r => 
        r.severity === 'error'
      );
      
      expect(criticalErrors).toHaveLength(0);
    });

    it('should demonstrate zero temporal dead zone errors in production scenario', async () => {
      const ProductionSimulation = () => {
        const context = useWebSocketSingletonContext();
        
        // Simulate production-like usage patterns
        const [state, setState] = React.useState({
          users: [],
          messages: [],
          connectionHistory: []
        });
        
        React.useEffect(() => {
          // Multiple context property access
          const connectionInfo = {
            isConnected: context.isConnected,
            state: context.connectionState,
            socket: context.socket?.id,
            error: context.connectionError
          };
          
          setState(prev => ({
            ...prev,
            connectionHistory: [...prev.connectionHistory, connectionInfo]
          }));
        }, [context.isConnected, context.connectionState, context.socket, context.connectionError]);
        
        return (
          <div data-testid="production-sim">
            Production simulation running: {state.connectionHistory.length} state updates
          </div>
        );
      };

      render(
        <WebSocketSingletonProvider>
          <ProductionSimulation />
        </WebSocketSingletonProvider>
      );

      await waitFor(() => {
        const element = screen.getByTestId('production-sim');
        expect(element.textContent).toMatch(/Production simulation running: \d+ state updates/);
      });

      // Verify no temporal dead zone errors were logged
      expect(mockConsole.error).not.toHaveBeenCalledWith(
        expect.stringMatching(/Cannot access.*connectionState.*before initialization/)
      );
    });
  });
});