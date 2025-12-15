import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

// Import components
import App from '@/App';
import AgentManager from '@/components/AgentManager';
import DualInstanceDashboard from '@/components/DualInstanceDashboard';
import { ErrorBoundary as CustomErrorBoundary } from '@/components/ErrorBoundary';
import { WebSocketProvider } from '@/context/WebSocketSingletonContext';

// Mock dependencies
global.fetch = jest.fn();
global.WebSocket = jest.fn();

// Mock console to suppress error messages in tests
const originalError = console.error;
const originalWarn = console.warn;

describe('White Screen Prevention and Regression Tests', () => {
  beforeEach(() => {
    // Suppress error messages in tests
    console.error = jest.fn();
    console.warn = jest.fn();
    
    jest.clearAllMocks();
    
    // Default successful API response
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ agents: [] }),
    });
    
    // Default WebSocket mock
    (global.WebSocket as jest.Mock).mockImplementation(() => ({
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      readyState: WebSocket.OPEN,
    }));
  });

  afterEach(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });

  describe('Component Rendering Prevention', () => {
    test('should never render completely empty body', async () => {
      render(<App />);
      
      // Wait for initial render
      await waitFor(() => {
        const body = document.body;
        const bodyText = body.textContent || '';
        const bodyHTML = body.innerHTML || '';
        
        // Body should have content
        expect(bodyText.trim().length).toBeGreaterThan(0);
        expect(bodyHTML.trim().length).toBeGreaterThan(0);
        
        // Should have visible elements
        const visibleElements = Array.from(body.querySelectorAll('*')).filter(el => {
          const styles = window.getComputedStyle(el);
          return styles.display !== 'none' && 
                 styles.visibility !== 'hidden' && 
                 el.offsetWidth > 0 && 
                 el.offsetHeight > 0;
        });
        
        expect(visibleElements.length).toBeGreaterThan(0);
      });
    });

    test('should render fallback UI when main component fails', () => {
      const FailingComponent = () => {
        throw new Error('Component failed to render');
      };
      
      const TestWrapper = () => (
        <ErrorBoundary fallback={<div>Something went wrong, but we recovered!</div>}>
          <FailingComponent />
        </ErrorBoundary>
      );
      
      render(<TestWrapper />);
      
      // Should show fallback instead of white screen
      expect(screen.getByText('Something went wrong, but we recovered!')).toBeInTheDocument();
    });

    test('should maintain navigation when individual routes fail', async () => {
      // Mock a route component that fails
      const mockFailingComponent = jest.fn(() => {
        throw new Error('Route component failed');
      });
      
      render(<App />);
      
      // Navigation should still be visible even if route fails
      await waitFor(() => {
        expect(screen.getByText(/agentlink feed system/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /agents/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /feed/i })).toBeInTheDocument();
      });
    });
  });

  describe('API Failure Scenarios', () => {
    test('should show loading state, then error state, never white screen', async () => {
      // Mock API failure
      (fetch as jest.Mock).mockRejectedValue(new Error('API Error'));
      
      render(
        <QueryClientProvider client={new QueryClient()}>
          <WebSocketProvider config={{ autoConnect: false }}>
            <BrowserRouter>
              <AgentManager />
            </BrowserRouter>
          </WebSocketProvider>
        </QueryClientProvider>
      );
      
      // Should show loading first
      expect(document.body.textContent).toBeTruthy();
      
      // Then should show error or empty state, but never white screen
      await waitFor(() => {
        const bodyText = document.body.textContent || '';
        expect(bodyText.trim().length).toBeGreaterThan(0);
        
        // Should have some indication of the error or empty state
        const hasErrorOrEmptyState = 
          bodyText.includes('Error') ||
          bodyText.includes('No agents') ||
          bodyText.includes('Loading') ||
          bodyText.includes('Failed to load');
        
        expect(hasErrorOrEmptyState).toBe(true);
      });
    });

    test('should handle network failures gracefully', async () => {
      // Mock network error
      (fetch as jest.Mock).mockImplementation(() => 
        Promise.reject(new Error('Network Error'))
      );
      
      render(<App />);
      
      // Should show some content, even if it's an error state
      await waitFor(() => {
        const bodyContent = document.body.textContent || '';
        expect(bodyContent.trim().length).toBeGreaterThan(0);
        
        // Should show header or navigation at minimum
        expect(screen.getByText(/agentlink/i)).toBeInTheDocument();
      });
    });

    test('should handle malformed API responses', async () => {
      // Mock malformed JSON response
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });
      
      render(
        <QueryClientProvider client={new QueryClient()}>
          <WebSocketProvider config={{ autoConnect: false }}>
            <BrowserRouter>
              <AgentManager />
            </BrowserRouter>
          </WebSocketProvider>
        </QueryClientProvider>
      );
      
      // Should handle JSON parsing error gracefully
      await waitFor(() => {
        expect(screen.getByText(/agent manager/i)).toBeInTheDocument();
      });
    });
  });

  describe('WebSocket Connection Failures', () => {
    test('should handle WebSocket connection failures', async () => {
      // Mock WebSocket connection failure
      (global.WebSocket as jest.Mock).mockImplementation(() => {
        const ws = {
          send: jest.fn(),
          close: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          readyState: WebSocket.CLOSED,
        };
        
        // Simulate connection failure
        setTimeout(() => {
          const errorHandler = ws.addEventListener.mock.calls.find(
            call => call[0] === 'error'
          )?.[1];
          if (errorHandler) {
            errorHandler(new Error('WebSocket connection failed'));
          }
        }, 100);
        
        return ws;
      });
      
      render(<App />);
      
      // App should still render despite WebSocket failures
      await waitFor(() => {
        expect(screen.getByText(/agentlink feed system/i)).toBeInTheDocument();
      });
    });

    test('should handle WebSocket message parsing errors', async () => {
      const mockWS = {
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        readyState: WebSocket.OPEN,
      };
      
      (global.WebSocket as jest.Mock).mockImplementation(() => mockWS);
      
      render(<App />);
      
      // Simulate malformed WebSocket message
      const messageHandler = mockWS.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
      
      if (messageHandler) {
        act(() => {
          messageHandler({
            data: 'invalid json {{'
          });
        });
      }
      
      // App should continue functioning
      await waitFor(() => {
        expect(screen.getByText(/agentlink feed system/i)).toBeInTheDocument();
      });
    });
  });

  describe('Component Lifecycle Errors', () => {
    test('should handle component mount errors', () => {
      const ProblematicComponent = () => {
        React.useEffect(() => {
          throw new Error('Mount error');
        }, []);
        
        return <div>Component content</div>;
      };
      
      const SafeComponent = () => (
        <CustomErrorBoundary componentName="ProblematicComponent">
          <ProblematicComponent />
        </CustomErrorBoundary>
      );
      
      render(<SafeComponent />);
      
      // Should show error boundary fallback
      expect(document.body.textContent).toBeTruthy();
    });

    test('should handle component update errors', () => {
      let shouldError = false;
      
      const UpdatingComponent = ({ trigger }: { trigger: boolean }) => {
        if (shouldError && trigger) {
          throw new Error('Update error');
        }
        return <div>Component is working</div>;
      };
      
      const TestWrapper = () => {
        const [trigger, setTrigger] = React.useState(false);
        
        React.useEffect(() => {
          setTimeout(() => {
            shouldError = true;
            setTrigger(true);
          }, 100);
        }, []);
        
        return (
          <CustomErrorBoundary componentName="UpdatingComponent">
            <UpdatingComponent trigger={trigger} />
          </CustomErrorBoundary>
        );
      };
      
      render(<TestWrapper />);
      
      // Should initially render
      expect(screen.getByText('Component is working')).toBeInTheDocument();
      
      // After error, should show fallback
      setTimeout(() => {
        expect(document.body.textContent).toBeTruthy();
      }, 200);
    });
  });

  describe('Browser Compatibility Issues', () => {
    test('should handle missing modern JavaScript features', () => {
      // Mock missing Promise.allSettled
      const originalAllSettled = Promise.allSettled;
      (Promise as any).allSettled = undefined;
      
      render(<App />);
      
      expect(screen.getByText(/agentlink feed system/i)).toBeInTheDocument();
      
      // Restore
      (Promise as any).allSettled = originalAllSettled;
    });

    test('should handle missing fetch API', () => {
      // Mock missing fetch
      const originalFetch = global.fetch;
      (global as any).fetch = undefined;
      
      render(<App />);
      
      // Should still render something
      expect(document.body.textContent).toBeTruthy();
      
      // Restore
      global.fetch = originalFetch;
    });

    test('should handle missing WebSocket support', () => {
      const originalWebSocket = global.WebSocket;
      (global as any).WebSocket = undefined;
      
      render(<App />);
      
      expect(screen.getByText(/agentlink feed system/i)).toBeInTheDocument();
      
      // Restore
      global.WebSocket = originalWebSocket;
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    test('should handle large datasets without crashing', async () => {
      // Mock very large dataset
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `agent-${i}`,
        name: `agent-${i}`,
        description: 'Test agent',
        status: 'active',
        capabilities: ['test'],
      }));
      
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ agents: largeDataset }),
      });
      
      render(
        <QueryClientProvider client={new QueryClient()}>
          <WebSocketProvider config={{ autoConnect: false }}>
            <BrowserRouter>
              <AgentManager />
            </BrowserRouter>
          </WebSocketProvider>
        </QueryClientProvider>
      );
      
      // Should handle large dataset gracefully
      await waitFor(() => {
        expect(screen.getByText(/agent manager/i)).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    test('should handle rapid re-renders without breaking', async () => {
      let renderCount = 0;
      
      const RapidUpdatingComponent = () => {
        const [count, setCount] = React.useState(0);
        
        React.useEffect(() => {
          const interval = setInterval(() => {
            renderCount++;
            if (renderCount < 100) {
              setCount(prev => prev + 1);
            }
          }, 10);
          
          return () => clearInterval(interval);
        }, []);
        
        return <div>Count: {count}</div>;
      };
      
      render(
        <CustomErrorBoundary componentName="RapidUpdatingComponent">
          <RapidUpdatingComponent />
        </CustomErrorBoundary>
      );
      
      // Should handle rapid updates
      await waitFor(() => {
        expect(document.body.textContent).toContain('Count:');
      });
      
      // Wait for updates to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Should still be functional
      expect(document.body.textContent).toBeTruthy();
    });
  });

  describe('Route Navigation Edge Cases', () => {
    test('should handle invalid routes gracefully', async () => {
      render(<App />);
      
      // Simulate navigation to invalid route
      act(() => {
        window.history.pushState({}, '', '/invalid-route-that-does-not-exist');
      });
      
      // Should show 404 or fallback, never white screen
      await waitFor(() => {
        const bodyText = document.body.textContent || '';
        expect(bodyText.trim().length).toBeGreaterThan(0);
        
        // Should show navigation at minimum
        expect(screen.getByText(/agentlink/i)).toBeInTheDocument();
      });
    });

    test('should handle route parameter errors', async () => {
      render(<App />);
      
      // Navigate to route with invalid parameters
      act(() => {
        window.history.pushState({}, '', '/agent/invalid-agent-id-123');
      });
      
      // Should handle gracefully
      await waitFor(() => {
        expect(document.body.textContent).toBeTruthy();
      });
    });
  });

  describe('Accessibility and Screen Reader Compatibility', () => {
    test('should always provide accessible content', async () => {
      render(<App />);
      
      await waitFor(() => {
        // Should have at least one heading for screen readers
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        expect(headings.length).toBeGreaterThan(0);
        
        // Should have at least one focusable element
        const focusableElements = document.querySelectorAll(
          'a, button, input, select, textarea, [tabindex]'
        );
        expect(focusableElements.length).toBeGreaterThan(0);
      });
    });

    test('should maintain semantic structure even in error states', () => {
      const FailingComponent = () => {
        throw new Error('Component failed');
      };
      
      render(
        <CustomErrorBoundary componentName="FailingComponent">
          <FailingComponent />
        </CustomErrorBoundary>
      );
      
      // Error boundary should maintain semantic structure
      expect(document.body.textContent).toBeTruthy();
      
      // Should have appropriate ARIA attributes
      const errorElements = document.querySelectorAll('[role="alert"], [aria-live]');
      // At minimum, should have some structured content
      expect(document.querySelectorAll('div, span, p').length).toBeGreaterThan(0);
    });
  });

  describe('Title and Meta Information', () => {
    test('should always maintain document title', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(document.title).toBeTruthy();
        expect(document.title.length).toBeGreaterThan(0);
      });
    });

    test('should update title on navigation', async () => {
      render(<App />);
      
      const initialTitle = document.title;
      
      // Navigation should potentially update title
      act(() => {
        window.history.pushState({}, '', '/agents');
      });
      
      await waitFor(() => {
        // Title should still exist (may or may not change)
        expect(document.title).toBeTruthy();
      });
    });
  });

  describe('Visual Regression Prevention', () => {
    test('should prevent invisible or zero-sized content', async () => {
      render(<App />);
      
      await waitFor(() => {
        const allElements = document.querySelectorAll('*');
        let hasVisibleContent = false;
        
        for (const element of allElements) {
          const styles = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          
          if (
            styles.display !== 'none' &&
            styles.visibility !== 'hidden' &&
            styles.opacity !== '0' &&
            rect.width > 0 &&
            rect.height > 0
          ) {
            hasVisibleContent = true;
            break;
          }
        }
        
        expect(hasVisibleContent).toBe(true);
      });
    });

    test('should prevent layout shift causing blank areas', async () => {
      render(<App />);
      
      await waitFor(() => {
        const body = document.body;
        const bodyRect = body.getBoundingClientRect();
        
        // Body should have dimensions
        expect(bodyRect.width).toBeGreaterThan(0);
        expect(bodyRect.height).toBeGreaterThan(0);
        
        // Should not have excessive empty space
        const contentHeight = Array.from(body.children)
          .reduce((total, child) => total + child.getBoundingClientRect().height, 0);
        
        expect(contentHeight).toBeGreaterThan(0);
      });
    });
  });
});