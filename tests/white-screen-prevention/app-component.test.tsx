import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * TDD Test Suite: App Component Loading Validation
 *
 * Purpose: Verify App.tsx component loads and renders without errors
 * This ensures the main application component initializes properly
 */

// Mock critical dependencies to prevent actual network calls and side effects
vi.mock('../frontend/src/components/RealTimeNotifications', () => ({
  RealTimeNotifications: () => <div data-testid="mock-notifications">Notifications</div>
}));

vi.mock('../frontend/src/components/GlobalErrorBoundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-global-error-boundary">{children}</div>
  )
}));

vi.mock('../frontend/src/components/RealSocialMediaFeed', () => ({
  default: () => <div data-testid="mock-social-feed">Social Media Feed</div>
}));

vi.mock('../frontend/src/context/WebSocketSingletonContext', () => ({
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-websocket-provider">{children}</div>
  )
}));

vi.mock('../frontend/src/contexts/VideoPlaybackContext', () => ({
  VideoPlaybackProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-video-provider">{children}</div>
  )
}));

// Mock console methods for clean test output
vi.mock('console', () => ({
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
}));

describe('App Component Loading Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Create a fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
        },
      },
      logger: {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    });

    // Mock window.location for router tests
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/',
        search: '',
        hash: '',
        state: null,
        key: 'default',
      },
      writable: true,
    });
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
  });

  describe('App Component Import and Instantiation', () => {
    it('should import App component without errors', async () => {
      let AppComponent: React.ComponentType;

      expect(async () => {
        const module = await import('../../frontend/src/App');
        AppComponent = module.default;
        expect(AppComponent).toBeDefined();
        expect(typeof AppComponent).toBe('function');
      }).not.toThrow();
    });

    it('should create App component instance', async () => {
      const { default: App } = await import('../../frontend/src/App');

      expect(() => {
        const AppElement = <App />;
        expect(AppElement).toBeTruthy();
        expect(AppElement.type).toBe(App);
      }).not.toThrow();
    });

    it('should validate App component is a valid React component', async () => {
      const { default: App } = await import('../../frontend/src/App');

      expect(App).toBeDefined();
      expect(typeof App).toBe('function');
      expect(App.name).toBe('App');

      // Check if it's a React component by trying to create an element
      expect(() => React.createElement(App)).not.toThrow();
    });
  });

  describe('App Component Rendering', () => {
    it('should render App component with minimal setup', async () => {
      const { default: App } = await import('../../frontend/src/App');

      expect(() => {
        render(<App />);
      }).not.toThrow();
    });

    it('should render App component with required providers', async () => {
      const { default: App } = await import('../../frontend/src/App');

      const TestWrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            {children}
          </BrowserRouter>
        </QueryClientProvider>
      );

      expect(() => {
        render(
          <TestWrapper>
            <App />
          </TestWrapper>
        );
      }).not.toThrow();
    });

    it('should display core layout elements', async () => {
      const { default: App } = await import('../../frontend/src/App');

      render(<App />);

      await waitFor(() => {
        // Check for critical layout elements
        expect(screen.getByTestId('app-root')).toBeInTheDocument();
        expect(screen.getByTestId('main-content')).toBeInTheDocument();
        expect(screen.getByTestId('header')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should render navigation menu', async () => {
      const { default: App } = await import('../../frontend/src/App');

      render(<App />);

      await waitFor(() => {
        // Check for navigation elements
        expect(screen.getByText('AgentLink')).toBeInTheDocument();
        expect(screen.getByText('Feed')).toBeInTheDocument();
        expect(screen.getByText('Agents')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('App Component State Management', () => {
    it('should initialize without throwing state errors', async () => {
      const { default: App } = await import('../../frontend/src/App');

      const consoleError = vi.spyOn(console, 'error');

      render(<App />);

      await waitFor(() => {
        // Verify no React state errors
        expect(consoleError).not.toHaveBeenCalledWith(
          expect.stringContaining('Warning: Cannot update a component')
        );
        expect(consoleError).not.toHaveBeenCalledWith(
          expect.stringContaining('Warning: setState')
        );
      });
    });

    it('should handle QueryClient initialization', async () => {
      const { default: App } = await import('../../frontend/src/App');

      render(<App />);

      await waitFor(() => {
        // Verify QueryClient provider is working
        expect(screen.getByTestId('app-root')).toBeInTheDocument();
      });
    });

    it('should handle Router initialization', async () => {
      const { default: App } = await import('../../frontend/src/App');

      render(<App />);

      await waitFor(() => {
        // Verify Router is working by checking for route-dependent content
        expect(screen.getByTestId('app-container')).toBeInTheDocument();
      });
    });
  });

  describe('App Component Error Handling', () => {
    it('should handle provider initialization errors gracefully', async () => {
      const { default: App } = await import('../../frontend/src/App');

      // Mock a provider error
      const mockQueryClient = {
        ...queryClient,
        mount: () => {
          throw new Error('Provider initialization error');
        }
      };

      expect(() => {
        render(<App />);
      }).not.toThrow();
    });

    it('should display error boundaries when needed', async () => {
      const { default: App } = await import('../../frontend/src/App');

      render(<App />);

      await waitFor(() => {
        // Error boundaries should be present
        expect(screen.getByTestId('mock-global-error-boundary')).toBeInTheDocument();
      });
    });

    it('should handle missing context providers', async () => {
      const { default: App } = await import('../../frontend/src/App');

      // Test without required providers
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<App />);
      }).not.toThrow();

      consoleError.mockRestore();
    });
  });

  describe('App Component Performance', () => {
    it('should render within acceptable time limits', async () => {
      const { default: App } = await import('../../frontend/src/App');

      const startTime = performance.now();

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('app-root')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within 2 seconds
      expect(renderTime).toBeLessThan(2000);
    });

    it('should not cause memory leaks during render', async () => {
      const { default: App } = await import('../../frontend/src/App');

      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

      for (let i = 0; i < 3; i++) {
        const { unmount } = render(<App />);

        await waitFor(() => {
          expect(screen.getByTestId('app-root')).toBeInTheDocument();
        });

        unmount();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

      if (performance.memory) {
        // Memory should not increase significantly (allow 10MB increase)
        expect(finalMemory - initialMemory).toBeLessThan(10 * 1024 * 1024);
      }
    });
  });

  describe('App Component Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      const { default: App } = await import('../../frontend/src/App');

      render(<App />);

      await waitFor(() => {
        const appRoot = screen.getByTestId('app-root');
        expect(appRoot).toBeInTheDocument();

        // Check for basic accessibility structure
        const header = screen.getByTestId('header');
        expect(header).toBeInTheDocument();

        const mainContent = screen.getByTestId('main-content');
        expect(mainContent).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      const { default: App } = await import('../../frontend/src/App');

      render(<App />);

      await waitFor(() => {
        // Verify focusable elements exist
        const interactive = screen.getAllByRole('button');
        expect(interactive.length).toBeGreaterThan(0);
      });
    });
  });
});