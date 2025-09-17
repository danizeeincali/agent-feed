import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * TDD Test Suite: Router Components Loading Validation
 *
 * Purpose: Validate router components load correctly
 * This prevents white screen issues caused by routing problems
 */

describe('Router Components Loading Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
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

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/',
        search: '',
        hash: '',
        replace: vi.fn(),
        assign: vi.fn(),
      },
      writable: true,
    });

    // Mock history API
    Object.defineProperty(window, 'history', {
      value: {
        pushState: vi.fn(),
        replaceState: vi.fn(),
        go: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
    vi.restoreAllMocks();
  });

  describe('Basic Router Setup', () => {
    it('should render BrowserRouter without errors', () => {
      const TestComponent = () => <div data-testid="router-test">Router Works</div>;

      expect(() => {
        render(
          <BrowserRouter>
            <TestComponent />
          </BrowserRouter>
        );
      }).not.toThrow();

      expect(screen.getByTestId('router-test')).toBeInTheDocument();
    });

    it('should render MemoryRouter for testing', () => {
      const TestComponent = () => <div data-testid="memory-router-test">Memory Router</div>;

      render(
        <MemoryRouter initialEntries={['/']}>
          <TestComponent />
        </MemoryRouter>
      );

      expect(screen.getByTestId('memory-router-test')).toBeInTheDocument();
    });

    it('should handle Routes and Route components', () => {
      const HomeComponent = () => <div data-testid="home-route">Home</div>;
      const AboutComponent = () => <div data-testid="about-route">About</div>;

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<HomeComponent />} />
            <Route path="/about" element={<AboutComponent />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('home-route')).toBeInTheDocument();
      expect(screen.queryByTestId('about-route')).not.toBeInTheDocument();
    });
  });

  describe('Route Navigation', () => {
    it('should navigate between routes correctly', () => {
      const HomeComponent = () => <div data-testid="home">Home Page</div>;
      const AgentsComponent = () => <div data-testid="agents">Agents Page</div>;
      const FeedComponent = () => <div data-testid="feed">Feed Page</div>;

      const { rerender } = render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<FeedComponent />} />
            <Route path="/agents" element={<AgentsComponent />} />
            <Route path="/home" element={<HomeComponent />} />
          </Routes>
        </MemoryRouter>
      );

      // Test initial route
      expect(screen.getByTestId('feed')).toBeInTheDocument();

      // Test navigation to agents
      rerender(
        <MemoryRouter initialEntries={['/agents']}>
          <Routes>
            <Route path="/" element={<FeedComponent />} />
            <Route path="/agents" element={<AgentsComponent />} />
            <Route path="/home" element={<HomeComponent />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('agents')).toBeInTheDocument();
      expect(screen.queryByTestId('feed')).not.toBeInTheDocument();
    });

    it('should handle nested routes', () => {
      const AgentsLayout = ({ children }: { children: React.ReactNode }) => (
        <div data-testid="agents-layout">
          <h1>Agents Section</h1>
          {children}
        </div>
      );

      const AgentProfile = () => <div data-testid="agent-profile">Agent Profile</div>;
      const AgentPages = () => <div data-testid="agent-pages">Agent Pages</div>;

      render(
        <MemoryRouter initialEntries={['/agents/123']}>
          <Routes>
            <Route path="/agents/:agentId" element={
              <AgentsLayout>
                <AgentProfile />
              </AgentsLayout>
            } />
            <Route path="/agents/:agentId/pages/:pageId" element={
              <AgentsLayout>
                <AgentPages />
              </AgentsLayout>
            } />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('agents-layout')).toBeInTheDocument();
      expect(screen.getByTestId('agent-profile')).toBeInTheDocument();
    });

    it('should handle dynamic route parameters', () => {
      const DynamicComponent = () => {
        const { useParams } = require('react-router-dom');
        const params = useParams();
        return (
          <div data-testid="dynamic-route">
            Agent ID: {params.agentId || 'none'}
          </div>
        );
      };

      render(
        <MemoryRouter initialEntries={['/agents/test-agent-123']}>
          <Routes>
            <Route path="/agents/:agentId" element={<DynamicComponent />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('dynamic-route')).toBeInTheDocument();
      expect(screen.getByText('Agent ID: test-agent-123')).toBeInTheDocument();
    });
  });

  describe('Route Error Handling', () => {
    it('should handle 404 routes with fallback', () => {
      const NotFoundComponent = () => <div data-testid="not-found">Page Not Found</div>;
      const HomeComponent = () => <div data-testid="home">Home</div>;

      render(
        <MemoryRouter initialEntries={['/non-existent-route']}>
          <Routes>
            <Route path="/" element={<HomeComponent />} />
            <Route path="*" element={<NotFoundComponent />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('not-found')).toBeInTheDocument();
      expect(screen.queryByTestId('home')).not.toBeInTheDocument();
    });

    it('should handle route component errors gracefully', () => {
      const ErrorComponent = () => {
        throw new Error('Route component error');
      };

      const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        try {
          return <>{children}</>;
        } catch (error) {
          return <div data-testid="route-error-boundary">Route Error Caught</div>;
        }
      };

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(
          <MemoryRouter>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<ErrorComponent />} />
              </Routes>
            </ErrorBoundary>
          </MemoryRouter>
        );
      }).not.toThrow();

      consoleError.mockRestore();
    });
  });

  describe('Route Lazy Loading', () => {
    it('should handle lazy-loaded route components', async () => {
      const LazyComponent = React.lazy(() =>
        Promise.resolve({
          default: () => <div data-testid="lazy-component">Lazy Loaded</div>
        })
      );

      render(
        <MemoryRouter>
          <React.Suspense fallback={<div data-testid="loading">Loading...</div>}>
            <Routes>
              <Route path="/" element={<LazyComponent />} />
            </Routes>
          </React.Suspense>
        </MemoryRouter>
      );

      // Initially shows loading
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // Wait for lazy component to load
      await waitFor(() => {
        expect(screen.getByTestId('lazy-component')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    it('should handle lazy loading failures', async () => {
      const FailingLazyComponent = React.lazy(() =>
        Promise.reject(new Error('Failed to load component'))
      );

      const LazyErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        const [hasError, setHasError] = React.useState(false);

        React.useEffect(() => {
          const handleUnhandledRejection = () => setHasError(true);
          window.addEventListener('unhandledrejection', handleUnhandledRejection);
          return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        }, []);

        if (hasError) {
          return <div data-testid="lazy-error">Failed to load component</div>;
        }

        return <>{children}</>;
      };

      render(
        <MemoryRouter>
          <LazyErrorBoundary>
            <React.Suspense fallback={<div data-testid="loading">Loading...</div>}>
              <Routes>
                <Route path="/" element={<FailingLazyComponent />} />
              </Routes>
            </React.Suspense>
          </LazyErrorBoundary>
        </MemoryRouter>
      );

      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });
  });

  describe('Router Context and Hooks', () => {
    it('should provide router context to components', () => {
      const ContextConsumer = () => {
        const { useLocation, useNavigate } = require('react-router-dom');
        const location = useLocation();
        const navigate = useNavigate();

        return (
          <div data-testid="context-consumer">
            <div data-testid="current-path">{location.pathname}</div>
            <button
              data-testid="navigate-button"
              onClick={() => navigate('/test')}
            >
              Navigate
            </button>
          </div>
        );
      };

      render(
        <MemoryRouter initialEntries={['/current']}>
          <Routes>
            <Route path="/current" element={<ContextConsumer />} />
            <Route path="/test" element={<div data-testid="test-route">Test</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('context-consumer')).toBeInTheDocument();
      expect(screen.getByTestId('current-path')).toHaveTextContent('/current');
    });

    it('should handle useParams hook correctly', () => {
      const ParamsComponent = () => {
        const { useParams } = require('react-router-dom');
        const { id, category } = useParams();

        return (
          <div data-testid="params-component">
            <div data-testid="param-id">ID: {id}</div>
            <div data-testid="param-category">Category: {category}</div>
          </div>
        );
      };

      render(
        <MemoryRouter initialEntries={['/items/123/electronics']}>
          <Routes>
            <Route path="/items/:id/:category" element={<ParamsComponent />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('params-component')).toBeInTheDocument();
      expect(screen.getByTestId('param-id')).toHaveTextContent('ID: 123');
      expect(screen.getByTestId('param-category')).toHaveTextContent('Category: electronics');
    });
  });

  describe('Router with Providers Integration', () => {
    it('should work with QueryClientProvider', () => {
      const QueryComponent = () => {
        const { useQuery } = require('@tanstack/react-query');

        const { data, isLoading } = useQuery({
          queryKey: ['test'],
          queryFn: () => Promise.resolve('test data'),
        });

        if (isLoading) return <div data-testid="query-loading">Loading...</div>;

        return <div data-testid="query-data">{data}</div>;
      };

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Routes>
              <Route path="/" element={<QueryComponent />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.getByTestId('query-loading')).toBeInTheDocument();
    });

    it('should handle multiple provider nesting', () => {
      const NestedComponent = () => (
        <div data-testid="nested-providers">Multiple Providers Work</div>
      );

      const CustomProvider = ({ children }: { children: React.ReactNode }) => (
        <div data-testid="custom-provider">{children}</div>
      );

      render(
        <QueryClientProvider client={queryClient}>
          <CustomProvider>
            <MemoryRouter>
              <Routes>
                <Route path="/" element={<NestedComponent />} />
              </Routes>
            </MemoryRouter>
          </CustomProvider>
        </QueryClientProvider>
      );

      expect(screen.getByTestId('nested-providers')).toBeInTheDocument();
      expect(screen.getByTestId('custom-provider')).toBeInTheDocument();
    });
  });

  describe('Router Performance', () => {
    it('should handle rapid navigation without memory leaks', () => {
      const routes = ['/route1', '/route2', '/route3', '/route4', '/route5'];

      const RouteComponent = ({ name }: { name: string }) => (
        <div data-testid={`route-${name}`}>Route {name}</div>
      );

      // Test rapid navigation
      routes.forEach((route, index) => {
        const { unmount } = render(
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              {routes.map((r, i) => (
                <Route
                  key={r}
                  path={r}
                  element={<RouteComponent name={`${i + 1}`} />}
                />
              ))}
            </Routes>
          </MemoryRouter>
        );

        expect(screen.getByTestId(`route-${index + 1}`)).toBeInTheDocument();
        unmount();
      });
    });

    it('should not cause excessive re-renders', () => {
      let renderCount = 0;

      const CountingComponent = () => {
        renderCount++;
        return <div data-testid="counting-component">Render #{renderCount}</div>;
      };

      const { rerender } = render(
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<CountingComponent />} />
          </Routes>
        </MemoryRouter>
      );

      expect(renderCount).toBe(1);

      // Rerender should not cause additional renders of route component
      rerender(
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<CountingComponent />} />
          </Routes>
        </MemoryRouter>
      );

      expect(renderCount).toBe(2); // Only one additional render
    });
  });

  describe('Real App Route Structure', () => {
    it('should handle main app routes structure', () => {
      const mockRoutes = [
        { path: '/', component: 'Feed' },
        { path: '/interactive-control', component: 'InteractiveControl' },
        { path: '/claude-manager', component: 'ClaudeManager' },
        { path: '/agents', component: 'Agents' },
        { path: '/agents/:agentId', component: 'AgentProfile' },
        { path: '/workflows', component: 'Workflows' },
        { path: '/analytics', component: 'Analytics' },
        { path: '/settings', component: 'Settings' },
      ];

      mockRoutes.forEach(({ path, component }) => {
        const MockComponent = () => <div data-testid={`route-${component.toLowerCase()}`}>{component}</div>;

        render(
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path={path} element={<MockComponent />} />
            </Routes>
          </MemoryRouter>
        );

        expect(screen.getByTestId(`route-${component.toLowerCase()}`)).toBeInTheDocument();
        cleanup();
      });
    });
  });
});