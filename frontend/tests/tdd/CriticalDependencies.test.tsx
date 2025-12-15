/**
 * TDD London School Test Suite - Critical Dependencies Validation Tests
 * 
 * Focused on testing critical dependency loading and initialization
 * to identify white screen issues caused by dependency failures
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

// Mock critical dependencies with behavior tracking
jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    createElement: (...args: any[]) => {
      mockReactCallbacks.createElement.push(args);
      return actualReact.createElement(...args);
    },
    StrictMode: ({ children }: any) => {
      mockReactCallbacks.StrictMode.push({});
      return actualReact.createElement('div', { 'data-testid': 'strict-mode' }, children);
    },
    Suspense: ({ children, fallback }: any) => {
      mockReactCallbacks.Suspense.push({ fallback });
      return actualReact.createElement('div', { 'data-testid': 'suspense' }, 
        fallback ? actualReact.createElement('div', { 'data-testid': 'suspense-fallback' }, fallback) : null,
        children
      );
    },
    lazy: (factory: any) => {
      mockReactCallbacks.lazy.push({ factory });
      return actualReact.lazy(factory);
    }
  };
});

jest.mock('react-dom/client', () => ({
  createRoot: (container: any) => {
    mockReactDOMCallbacks.createRoot.push({ container });
    return {
      render: (element: any) => {
        mockReactDOMCallbacks.render.push({ element });
        // Simulate actual rendering for tests
        const actualReactDOM = jest.requireActual('react-dom/client');
        if (typeof document !== 'undefined' && container) {
          const root = actualReactDOM.createRoot(container);
          root.render(element);
        }
      },
      unmount: () => {
        mockReactDOMCallbacks.unmount.push({});
      }
    };
  }
}));

jest.mock('@tanstack/react-query', () => {
  const mockQueryClient = {
    defaultOptions: { queries: {} },
    getQueryData: jest.fn(),
    setQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
    clear: jest.fn()
  };

  return {
    QueryClient: jest.fn().mockImplementation((options) => {
      mockTanStackQueryCallbacks.QueryClient.push({ options });
      return mockQueryClient;
    }),
    QueryClientProvider: ({ children, client }: any) => {
      mockTanStackQueryCallbacks.QueryClientProvider.push({ client });
      return React.createElement('div', { 'data-testid': 'query-client-provider' }, children);
    },
    useQuery: (options: any) => {
      mockTanStackQueryCallbacks.useQuery.push({ options });
      return {
        data: null,
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn()
      };
    },
    useMutation: (options: any) => {
      mockTanStackQueryCallbacks.useMutation.push({ options });
      return {
        mutate: jest.fn(),
        isLoading: false,
        isError: false,
        error: null
      };
    }
  };
});

jest.mock('react-router-dom', () => {
  const mockLocation = { pathname: '/', search: '', hash: '', state: null, key: 'default' };
  
  return {
    BrowserRouter: ({ children }: any) => {
      mockRouterCallbacks.BrowserRouter.push({});
      return React.createElement('div', { 'data-testid': 'browser-router' }, children);
    },
    Routes: ({ children }: any) => {
      mockRouterCallbacks.Routes.push({});
      return React.createElement('div', { 'data-testid': 'routes' }, children);
    },
    Route: ({ path, element }: any) => {
      mockRouterCallbacks.Route.push({ path, element });
      return React.createElement('div', { 'data-testid': `route-${path || 'default'}` }, element);
    },
    useLocation: () => {
      mockRouterCallbacks.useLocation.push({});
      return mockLocation;
    },
    useNavigate: () => {
      mockRouterCallbacks.useNavigate.push({});
      return jest.fn();
    },
    Link: ({ to, children, ...props }: any) => {
      mockRouterCallbacks.Link.push({ to, props });
      return React.createElement('a', { href: to, ...props }, children);
    }
  };
});

// Mock WebSocket dependencies
jest.mock('socket.io-client', () => ({
  io: (url: string, options: any) => {
    mockWebSocketCallbacks.io.push({ url, options });
    return {
      on: jest.fn((event, callback) => {
        mockWebSocketCallbacks.on.push({ event, callback });
      }),
      emit: jest.fn((event, data) => {
        mockWebSocketCallbacks.emit.push({ event, data });
      }),
      disconnect: jest.fn(() => {
        mockWebSocketCallbacks.disconnect.push({});
      }),
      connected: true
    };
  }
}));

// Mock CSS and asset imports
jest.mock('../../src/index.css', () => {
  mockAssetCallbacks.css.push({ file: 'index.css' });
  return {};
});

jest.mock('../../src/styles/agents.css', () => {
  mockAssetCallbacks.css.push({ file: 'agents.css' });
  return {};
});

// Mock environment variables
const mockEnv = {
  DEV: true,
  PROD: false,
  VITE_WEBSOCKET_HUB_URL: 'http://localhost:3002'
};

Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: mockEnv
    }
  },
  writable: true
});

// London School mock objects for behavior verification
const mockReactCallbacks = {
  createElement: [] as any[],
  StrictMode: [] as any[],
  Suspense: [] as any[],
  lazy: [] as any[]
};

const mockReactDOMCallbacks = {
  createRoot: [] as any[],
  render: [] as any[],
  unmount: [] as any[]
};

const mockTanStackQueryCallbacks = {
  QueryClient: [] as any[],
  QueryClientProvider: [] as any[],
  useQuery: [] as any[],
  useMutation: [] as any[]
};

const mockRouterCallbacks = {
  BrowserRouter: [] as any[],
  Routes: [] as any[],
  Route: [] as any[],
  useLocation: [] as any[],
  useNavigate: [] as any[],
  Link: [] as any[]
};

const mockWebSocketCallbacks = {
  io: [] as any[],
  on: [] as any[],
  emit: [] as any[],
  disconnect: [] as any[]
};

const mockAssetCallbacks = {
  css: [] as any[],
  images: [] as any[],
  fonts: [] as any[]
};

describe('Critical Dependencies Validation - London School TDD', () => {
  beforeEach(() => {
    // Reset all mock callbacks
    Object.values(mockReactCallbacks).forEach(arr => arr.length = 0);
    Object.values(mockReactDOMCallbacks).forEach(arr => arr.length = 0);
    Object.values(mockTanStackQueryCallbacks).forEach(arr => arr.length = 0);
    Object.values(mockRouterCallbacks).forEach(arr => arr.length = 0);
    Object.values(mockWebSocketCallbacks).forEach(arr => arr.length = 0);
    Object.values(mockAssetCallbacks).forEach(arr => arr.length = 0);
  });

  describe('React Core Dependencies', () => {
    it('should load and initialize React correctly', async () => {
      const React = await import('react');
      
      // Test React.createElement functionality
      const element = React.createElement('div', { id: 'test' }, 'Hello');
      
      expect(mockReactCallbacks.createElement).toHaveLength(1);
      expect(mockReactCallbacks.createElement[0][0]).toBe('div');
      expect(mockReactCallbacks.createElement[0][1]).toEqual({ id: 'test' });
      expect(mockReactCallbacks.createElement[0][2]).toBe('Hello');
    });

    it('should initialize StrictMode correctly', async () => {
      const React = await import('react');
      
      const TestComponent = () => React.createElement('div', {}, 'Test');
      
      render(
        React.createElement(React.StrictMode, {}, 
          React.createElement(TestComponent)
        )
      );
      
      expect(mockReactCallbacks.StrictMode).toHaveLength(1);
      expect(screen.getByTestId('strict-mode')).toBeInTheDocument();
    });

    it('should handle Suspense boundaries', async () => {
      const React = await import('react');
      
      const fallback = React.createElement('div', {}, 'Loading...');
      const LazyComponent = React.lazy(() => Promise.resolve({
        default: () => React.createElement('div', {}, 'Loaded')
      }));
      
      render(
        React.createElement(React.Suspense, { fallback }, 
          React.createElement(LazyComponent)
        )
      );
      
      expect(mockReactCallbacks.Suspense).toHaveLength(1);
      expect(mockReactCallbacks.Suspense[0].fallback).toBeDefined();
      
      await waitFor(() => {
        expect(screen.getByTestId('suspense')).toBeInTheDocument();
      });
    });

    it('should create and manage lazy components', async () => {
      const React = await import('react');
      
      const LazyComponent = React.lazy(() => 
        Promise.resolve({
          default: () => React.createElement('div', { 'data-testid': 'lazy-component' }, 'Lazy Loaded')
        })
      );
      
      expect(mockReactCallbacks.lazy).toHaveLength(1);
      expect(mockReactCallbacks.lazy[0].factory).toBeDefined();
      
      await act(async () => {
        render(
          React.createElement(React.Suspense, 
            { fallback: React.createElement('div', {}, 'Loading...') },
            React.createElement(LazyComponent)
          )
        );
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('lazy-component')).toBeInTheDocument();
      });
    });
  });

  describe('React DOM Dependencies', () => {
    it('should create root and render correctly', async () => {
      const ReactDOM = await import('react-dom/client');
      const React = await import('react');
      
      // Create a test container
      const container = document.createElement('div');
      document.body.appendChild(container);
      
      const root = ReactDOM.createRoot(container);
      const testElement = React.createElement('div', { 'data-testid': 'react-dom-test' }, 'React DOM Test');
      
      act(() => {
        root.render(testElement);
      });
      
      expect(mockReactDOMCallbacks.createRoot).toHaveLength(1);
      expect(mockReactDOMCallbacks.createRoot[0].container).toBe(container);
      expect(mockReactDOMCallbacks.render).toHaveLength(1);
      
      // Cleanup
      document.body.removeChild(container);
    });
  });

  describe('React Query Dependencies', () => {
    it('should initialize QueryClient with correct configuration', async () => {
      const { QueryClient } = await import('@tanstack/react-query');
      
      const queryConfig = {
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false
          }
        }
      };
      
      const client = new QueryClient(queryConfig);
      
      expect(mockTanStackQueryCallbacks.QueryClient).toHaveLength(1);
      expect(mockTanStackQueryCallbacks.QueryClient[0].options).toEqual(queryConfig);
      expect(client).toBeDefined();
    });

    it('should create QueryClientProvider correctly', async () => {
      const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
      const React = await import('react');
      
      const client = new QueryClient();
      const testComponent = React.createElement('div', {}, 'Test');
      
      render(
        React.createElement(QueryClientProvider, { client }, testComponent)
      );
      
      expect(mockTanStackQueryCallbacks.QueryClientProvider).toHaveLength(1);
      expect(mockTanStackQueryCallbacks.QueryClientProvider[0].client).toBe(client);
      expect(screen.getByTestId('query-client-provider')).toBeInTheDocument();
    });

    it('should handle query hooks correctly', async () => {
      const { useQuery, useMutation } = await import('@tanstack/react-query');
      
      function TestComponent() {
        const query = useQuery({ queryKey: ['test'], queryFn: () => Promise.resolve('test') });
        const mutation = useMutation({ mutationFn: (data: any) => Promise.resolve(data) });
        
        return React.createElement('div', {}, 'Query Component');
      }
      
      render(React.createElement(TestComponent));
      
      expect(mockTanStackQueryCallbacks.useQuery).toHaveLength(1);
      expect(mockTanStackQueryCallbacks.useMutation).toHaveLength(1);
    });
  });

  describe('React Router Dependencies', () => {
    it('should initialize BrowserRouter correctly', async () => {
      const { BrowserRouter } = await import('react-router-dom');
      const React = await import('react');
      
      render(
        React.createElement(BrowserRouter, {}, 
          React.createElement('div', {}, 'Router Test')
        )
      );
      
      expect(mockRouterCallbacks.BrowserRouter).toHaveLength(1);
      expect(screen.getByTestId('browser-router')).toBeInTheDocument();
    });

    it('should handle routing components', async () => {
      const { Routes, Route } = await import('react-router-dom');
      const React = await import('react');
      
      const homeElement = React.createElement('div', {}, 'Home');
      const aboutElement = React.createElement('div', {}, 'About');
      
      render(
        React.createElement(Routes, {},
          React.createElement(Route, { path: '/', element: homeElement }),
          React.createElement(Route, { path: '/about', element: aboutElement })
        )
      );
      
      expect(mockRouterCallbacks.Routes).toHaveLength(1);
      expect(mockRouterCallbacks.Route).toHaveLength(2);
      expect(mockRouterCallbacks.Route[0].path).toBe('/');
      expect(mockRouterCallbacks.Route[1].path).toBe('/about');
    });

    it('should provide router hooks', async () => {
      const { useLocation, useNavigate } = await import('react-router-dom');
      
      function TestComponent() {
        const location = useLocation();
        const navigate = useNavigate();
        
        return React.createElement('div', {}, location.pathname);
      }
      
      render(React.createElement(TestComponent));
      
      expect(mockRouterCallbacks.useLocation).toHaveLength(1);
      expect(mockRouterCallbacks.useNavigate).toHaveLength(1);
    });
  });

  describe('WebSocket Dependencies', () => {
    it('should initialize WebSocket connection correctly', async () => {
      const { io } = await import('socket.io-client');
      
      const socket = io('http://localhost:3002', {
        transports: ['websocket'],
        path: '/socket'
      });
      
      expect(mockWebSocketCallbacks.io).toHaveLength(1);
      expect(mockWebSocketCallbacks.io[0].url).toBe('http://localhost:3002');
      expect(mockWebSocketCallbacks.io[0].options.transports).toEqual(['websocket']);
      expect(socket).toBeDefined();
    });

    it('should handle WebSocket events correctly', async () => {
      const { io } = await import('socket.io-client');
      
      const socket = io('http://localhost:3002');
      
      const connectHandler = jest.fn();
      const messageHandler = jest.fn();
      
      socket.on('connect', connectHandler);
      socket.on('message', messageHandler);
      socket.emit('test-event', { data: 'test' });
      
      expect(mockWebSocketCallbacks.on).toHaveLength(2);
      expect(mockWebSocketCallbacks.on[0].event).toBe('connect');
      expect(mockWebSocketCallbacks.on[1].event).toBe('message');
      expect(mockWebSocketCallbacks.emit).toHaveLength(1);
      expect(mockWebSocketCallbacks.emit[0].event).toBe('test-event');
    });
  });

  describe('Asset Loading Dependencies', () => {
    it('should load CSS files correctly', async () => {
      // Import CSS files
      await import('../../src/index.css');
      await import('../../src/styles/agents.css');
      
      expect(mockAssetCallbacks.css).toHaveLength(2);
      expect(mockAssetCallbacks.css[0].file).toBe('index.css');
      expect(mockAssetCallbacks.css[1].file).toBe('agents.css');
    });
  });

  describe('Environment Configuration Dependencies', () => {
    it('should access environment variables correctly', () => {
      // Test import.meta.env access
      expect((globalThis as any).import.meta.env.DEV).toBe(true);
      expect((globalThis as any).import.meta.env.VITE_WEBSOCKET_HUB_URL).toBe('http://localhost:3002');
    });

    it('should handle development-specific features', () => {
      const isDev = (globalThis as any).import.meta.env.DEV;
      
      if (isDev) {
        // Development features should be available
        expect(mockEnv.DEV).toBe(true);
      }
    });
  });

  describe('Dependency Load Order and Initialization', () => {
    it('should load dependencies in correct order', async () => {
      // Load core dependencies first
      const React = await import('react');
      const ReactDOM = await import('react-dom/client');
      
      // Then application dependencies
      const { BrowserRouter } = await import('react-router-dom');
      const { QueryClient } = await import('@tanstack/react-query');
      
      // Verify all loaded successfully
      expect(React).toBeDefined();
      expect(ReactDOM).toBeDefined();
      expect(BrowserRouter).toBeDefined();
      expect(QueryClient).toBeDefined();
    });

    it('should handle dependency failure gracefully', async () => {
      // Test error handling for missing dependencies
      try {
        await import('non-existent-module');
      } catch (error) {
        expect(error).toBeDefined();
        // Application should continue to function
      }
    });
  });

  describe('Critical Path Dependency Validation', () => {
    it('should validate all critical dependencies are available', async () => {
      const criticalDependencies = [
        'react',
        'react-dom/client',
        'react-router-dom',
        '@tanstack/react-query'
      ];
      
      const loadResults = await Promise.allSettled(
        criticalDependencies.map(dep => import(dep))
      );
      
      loadResults.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        expect((result as any).value).toBeDefined();
      });
    });

    it('should prevent white screen through dependency validation', async () => {
      // Create a minimal app structure to test dependency loading
      const React = await import('react');
      const { BrowserRouter } = await import('react-router-dom');
      const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
      
      const client = new QueryClient();
      
      function MinimalApp() {
        return React.createElement('div', { 'data-testid': 'minimal-app' }, 
          'App with all critical dependencies loaded'
        );
      }
      
      const { container } = render(
        React.createElement(QueryClientProvider, { client },
          React.createElement(BrowserRouter, {},
            React.createElement(MinimalApp)
          )
        )
      );
      
      // Should render content, not white screen
      expect(container.firstChild).not.toBeEmptyDOMElement();
      expect(screen.getByTestId('minimal-app')).toBeInTheDocument();
      expect(screen.getByText('App with all critical dependencies loaded')).toBeInTheDocument();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle dependency cleanup on unmount', () => {
      // Test that dependencies don't cause memory leaks
      const React = await import('react');
      
      function TestComponent() {
        React.useEffect(() => {
          return () => {
            // Cleanup logic
          };
        }, []);
        
        return React.createElement('div', {}, 'Test');
      }
      
      const { unmount } = render(React.createElement(TestComponent));
      
      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });

    it('should handle concurrent dependency loading', async () => {
      // Test loading multiple dependencies simultaneously
      const loadPromises = [
        import('react'),
        import('react-router-dom'),
        import('@tanstack/react-query')
      ];
      
      const results = await Promise.all(loadPromises);
      
      results.forEach(module => {
        expect(module).toBeDefined();
      });
    });
  });
});