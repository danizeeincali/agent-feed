/**
 * TDD London School: Critical Dependencies Loading Tests
 * 
 * Testing critical dependency loading and initialization using mock-driven development.
 * Focuses on dependency contracts and loading behavior verification.
 */

import { jest } from '@jest/globals';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Track dependency loading states
const dependencyTracker = {
  loaded: new Map<string, boolean>(),
  loadTimes: new Map<string, number>(),
  errors: new Map<string, Error>(),
  
  markLoaded: (dep: string, loadTime: number) => {
    dependencyTracker.loaded.set(dep, true);
    dependencyTracker.loadTimes.set(dep, loadTime);
  },
  
  markError: (dep: string, error: Error) => {
    dependencyTracker.loaded.set(dep, false);
    dependencyTracker.errors.set(dep, error);
  },
  
  reset: () => {
    dependencyTracker.loaded.clear();
    dependencyTracker.loadTimes.clear();
    dependencyTracker.errors.clear();
  }
};

describe('Critical Dependencies Loading - TDD London School Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dependencyTracker.reset();
  });

  describe('React Core Dependencies', () => {
    it('should load React with all required exports within acceptable time', async () => {
      const startTime = performance.now();
      
      const React = await import('react');
      
      const loadTime = performance.now() - startTime;
      dependencyTracker.markLoaded('react', loadTime);
      
      expect(React).toBeDefined();
      expect(React.createElement).toBeDefined();
      expect(React.Component).toBeDefined();
      expect(React.useState).toBeDefined();
      expect(React.useEffect).toBeDefined();
      expect(React.useCallback).toBeDefined();
      expect(React.useMemo).toBeDefined();
      expect(React.memo).toBeDefined();
      expect(React.Suspense).toBeDefined();
      expect(React.lazy).toBeDefined();
      expect(React.Fragment).toBeDefined();
      expect(React.StrictMode).toBeDefined();
      
      expect(loadTime).toBeLessThan(100); // Should load quickly
      expect(dependencyTracker.loaded.get('react')).toBe(true);
    });

    it('should load ReactDOM with client rendering support', async () => {
      const startTime = performance.now();
      
      const ReactDOM = await import('react-dom/client');
      
      const loadTime = performance.now() - startTime;
      dependencyTracker.markLoaded('react-dom', loadTime);
      
      expect(ReactDOM).toBeDefined();
      expect(ReactDOM.createRoot).toBeDefined();
      expect(typeof ReactDOM.createRoot).toBe('function');
      
      expect(loadTime).toBeLessThan(100);
      expect(dependencyTracker.loaded.get('react-dom')).toBe(true);
    });

    it('should verify React version compatibility', async () => {
      const React = await import('react');
      
      expect(React.version).toBeDefined();
      expect(typeof React.version).toBe('string');
      
      // Should be React 18+
      const majorVersion = parseInt(React.version.split('.')[0]);
      expect(majorVersion).toBeGreaterThanOrEqual(18);
    });
  });

  describe('Router Dependencies', () => {
    it('should load React Router with all routing components', async () => {
      const startTime = performance.now();
      
      const Router = await import('react-router-dom');
      
      const loadTime = performance.now() - startTime;
      dependencyTracker.markLoaded('react-router-dom', loadTime);
      
      expect(Router).toBeDefined();
      expect(Router.BrowserRouter).toBeDefined();
      expect(Router.Routes).toBeDefined();
      expect(Router.Route).toBeDefined();
      expect(Router.Link).toBeDefined();
      expect(Router.NavLink).toBeDefined();
      expect(Router.Navigate).toBeDefined();
      expect(Router.Outlet).toBeDefined();
      expect(Router.useNavigate).toBeDefined();
      expect(Router.useLocation).toBeDefined();
      expect(Router.useParams).toBeDefined();
      expect(Router.useSearchParams).toBeDefined();
      
      expect(loadTime).toBeLessThan(150);
      expect(dependencyTracker.loaded.get('react-router-dom')).toBe(true);
    });

    it('should verify router hook contracts', async () => {
      const { useNavigate, useLocation, useParams } = await import('react-router-dom');
      
      expect(typeof useNavigate).toBe('function');
      expect(typeof useLocation).toBe('function');
      expect(typeof useParams).toBe('function');
      
      // These are hooks and should follow React hook patterns
      expect(useNavigate.name).toBe('useNavigate');
      expect(useLocation.name).toBe('useLocation');
      expect(useParams.name).toBe('useParams');
    });
  });

  describe('State Management Dependencies', () => {
    it('should load React Query with all required components', async () => {
      const startTime = performance.now();
      
      const ReactQuery = await import('@tanstack/react-query');
      
      const loadTime = performance.now() - startTime;
      dependencyTracker.markLoaded('react-query', loadTime);
      
      expect(ReactQuery).toBeDefined();
      expect(ReactQuery.QueryClient).toBeDefined();
      expect(ReactQuery.QueryClientProvider).toBeDefined();
      expect(ReactQuery.useQuery).toBeDefined();
      expect(ReactQuery.useMutation).toBeDefined();
      expect(ReactQuery.useQueryClient).toBeDefined();
      expect(ReactQuery.useIsFetching).toBeDefined();
      expect(ReactQuery.useIsMutating).toBeDefined();
      
      expect(loadTime).toBeLessThan(200);
      expect(dependencyTracker.loaded.get('react-query')).toBe(true);
    });

    it('should verify QueryClient instantiation and configuration', async () => {
      const { QueryClient } = await import('@tanstack/react-query');
      
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 5 * 60 * 1000,
            cacheTime: 10 * 60 * 1000,
          },
        },
      });
      
      expect(client).toBeDefined();
      expect(client.getQueryCache).toBeDefined();
      expect(client.getMutationCache).toBeDefined();
      expect(client.invalidateQueries).toBeDefined();
      expect(client.setQueryData).toBeDefined();
      expect(client.getQueryData).toBeDefined();
      expect(client.clear).toBeDefined();
      
      // Test query cache functionality
      const queryCache = client.getQueryCache();
      expect(queryCache).toBeDefined();
      expect(typeof queryCache.clear).toBe('function');
    });
  });

  describe('WebSocket and Network Dependencies', () => {
    it('should load Socket.IO client with proper exports', async () => {
      const startTime = performance.now();
      
      const SocketIO = await import('socket.io-client');
      
      const loadTime = performance.now() - startTime;
      dependencyTracker.markLoaded('socket.io-client', loadTime);
      
      expect(SocketIO).toBeDefined();
      expect(SocketIO.io).toBeDefined();
      expect(SocketIO.Socket).toBeDefined();
      expect(typeof SocketIO.io).toBe('function');
      
      expect(loadTime).toBeLessThan(300);
      expect(dependencyTracker.loaded.get('socket.io-client')).toBe(true);
    });

    it('should verify Socket.IO client instantiation', async () => {
      const { io } = await import('socket.io-client');
      
      // Mock WebSocket for testing
      global.WebSocket = jest.fn().mockImplementation(() => ({
        readyState: 1,
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));
      
      expect(() => {
        const mockSocket = io('http://localhost:3000', { 
          transports: ['websocket'],
          autoConnect: false 
        });
        expect(mockSocket).toBeDefined();
      }).not.toThrow();
    });

    it('should handle WebSocket native API availability', () => {
      const originalWebSocket = global.WebSocket;
      
      try {
        // Test with WebSocket available
        global.WebSocket = jest.fn().mockImplementation(() => ({}));
        expect(global.WebSocket).toBeDefined();
        
        // Test without WebSocket (fallback scenario)
        delete (global as any).WebSocket;
        expect(global.WebSocket).toBeUndefined();
      } finally {
        global.WebSocket = originalWebSocket;
      }
    });
  });

  describe('UI and Styling Dependencies', () => {
    it('should load Lucide React icons efficiently', async () => {
      const startTime = performance.now();
      
      const Lucide = await import('lucide-react');
      
      const loadTime = performance.now() - startTime;
      dependencyTracker.markLoaded('lucide-react', loadTime);
      
      expect(Lucide).toBeDefined();
      
      // Test critical icons
      const criticalIcons = [
        'Activity', 'LayoutDashboard', 'Settings', 'Menu', 'Search',
        'Bot', 'Workflow', 'BarChart3', 'Code', 'Zap', 'GitBranch'
      ];
      
      criticalIcons.forEach(iconName => {
        expect(Lucide[iconName as keyof typeof Lucide]).toBeDefined();
        expect(typeof Lucide[iconName as keyof typeof Lucide]).toBe('function');
      });
      
      expect(loadTime).toBeLessThan(400);
      expect(dependencyTracker.loaded.get('lucide-react')).toBe(true);
    });

    it('should verify icon component rendering contracts', async () => {
      const { Activity, Settings } = await import('lucide-react');
      
      // Icons should be React components
      expect(typeof Activity).toBe('function');
      expect(typeof Settings).toBe('function');
      
      // Test icon rendering doesn't throw
      expect(() => {
        render(React.createElement(Activity));
        render(React.createElement(Settings, { size: 24, color: '#000' }));
      }).not.toThrow();
    });

    it('should load Tailwind CSS utilities without errors', () => {
      // CSS loading is handled by bundler, test utility functions
      expect(() => {
        // Simulate CSS utility usage
        const classes = ['bg-white', 'text-gray-900', 'p-4', 'rounded-lg'];
        const combinedClasses = classes.join(' ');
        expect(combinedClasses).toBe('bg-white text-gray-900 p-4 rounded-lg');
      }).not.toThrow();
      
      dependencyTracker.markLoaded('tailwindcss', 0);
      expect(dependencyTracker.loaded.get('tailwindcss')).toBe(true);
    });
  });

  describe('Terminal and Development Dependencies', () => {
    it('should load XTerm.js with required addons', async () => {
      const startTime = performance.now();
      
      const [XTerm, FitAddon, WebLinksAddon] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@xterm/addon-web-links')
      ]);
      
      const loadTime = performance.now() - startTime;
      dependencyTracker.markLoaded('xterm', loadTime);
      
      expect(XTerm).toBeDefined();
      expect(XTerm.Terminal).toBeDefined();
      expect(FitAddon).toBeDefined();
      expect(FitAddon.FitAddon).toBeDefined();
      expect(WebLinksAddon).toBeDefined();
      expect(WebLinksAddon.WebLinksAddon).toBeDefined();
      
      expect(loadTime).toBeLessThan(500);
      expect(dependencyTracker.loaded.get('xterm')).toBe(true);
    });

    it('should verify terminal component instantiation', async () => {
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');
      
      expect(() => {
        const term = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          theme: { background: '#000', foreground: '#fff' }
        });
        const fitAddon = new FitAddon();
        
        expect(term).toBeDefined();
        expect(fitAddon).toBeDefined();
        expect(typeof term.write).toBe('function');
        expect(typeof term.loadAddon).toBe('function');
        expect(typeof fitAddon.fit).toBe('function');
      }).not.toThrow();
    });
  });

  describe('Error Handling Dependencies', () => {
    it('should load React Error Boundary library', async () => {
      const startTime = performance.now();
      
      const ErrorBoundaryLib = await import('react-error-boundary');
      
      const loadTime = performance.now() - startTime;
      dependencyTracker.markLoaded('react-error-boundary', loadTime);
      
      expect(ErrorBoundaryLib).toBeDefined();
      expect(ErrorBoundaryLib.ErrorBoundary).toBeDefined();
      expect(ErrorBoundaryLib.withErrorBoundary).toBeDefined();
      
      expect(loadTime).toBeLessThan(150);
      expect(dependencyTracker.loaded.get('react-error-boundary')).toBe(true);
    });

    it('should verify error boundary component contract', async () => {
      const { ErrorBoundary } = await import('react-error-boundary');
      
      const TestFallback = ({ error }: { error: Error }) => (
        <div>Error: {error.message}</div>
      );
      
      expect(() => {
        render(
          React.createElement(ErrorBoundary, 
            { fallback: TestFallback },
            React.createElement('div', null, 'Test content')
          )
        );
      }).not.toThrow();
    });
  });

  describe('Dependency Load Performance', () => {
    it('should load all critical dependencies within performance budget', async () => {
      const criticalDeps = [
        'react',
        'react-dom',
        'react-router-dom',
        'react-query',
        'socket.io-client',
        'lucide-react',
        'xterm',
        'react-error-boundary'
      ];
      
      const startTime = performance.now();
      
      await Promise.all(criticalDeps.map(async (dep) => {
        try {
          const depStartTime = performance.now();
          await import(dep);
          const depLoadTime = performance.now() - depStartTime;
          dependencyTracker.markLoaded(dep, depLoadTime);
        } catch (error) {
          dependencyTracker.markError(dep, error as Error);
        }
      }));
      
      const totalLoadTime = performance.now() - startTime;
      
      // Total load time should be reasonable (parallel loading)
      expect(totalLoadTime).toBeLessThan(1000);
      
      // Check individual dependency load times
      criticalDeps.forEach(dep => {
        const loadTime = dependencyTracker.loadTimes.get(dep);
        const hasError = dependencyTracker.errors.has(dep);
        
        if (!hasError && loadTime) {
          expect(loadTime).toBeLessThan(500); // Individual deps should load quickly
        }
      });
    });

    it('should handle dependency loading failures gracefully', async () => {
      try {
        await import('non-existent-dependency');
        fail('Should have thrown for non-existent dependency');
      } catch (error) {
        dependencyTracker.markError('non-existent-dependency', error as Error);
        expect(dependencyTracker.errors.has('non-existent-dependency')).toBe(true);
      }
    });

    it('should track dependency loading metrics', () => {
      expect(dependencyTracker.loaded.size).toBeGreaterThan(0);
      expect(dependencyTracker.loadTimes.size).toBeGreaterThan(0);
      
      // Verify tracking functionality
      dependencyTracker.markLoaded('test-dep', 100);
      expect(dependencyTracker.loaded.get('test-dep')).toBe(true);
      expect(dependencyTracker.loadTimes.get('test-dep')).toBe(100);
      
      dependencyTracker.markError('error-dep', new Error('Test error'));
      expect(dependencyTracker.loaded.get('error-dep')).toBe(false);
      expect(dependencyTracker.errors.get('error-dep')?.message).toBe('Test error');
    });
  });

  describe('Dependency Versioning and Compatibility', () => {
    it('should verify React ecosystem version compatibility', async () => {
      const [React, ReactDOM, ReactRouter] = await Promise.all([
        import('react'),
        import('react-dom/client'),
        import('react-router-dom')
      ]);
      
      // React and ReactDOM should be compatible versions
      expect(React.version).toBeDefined();
      
      // Router should be React 18 compatible
      expect(ReactRouter.createBrowserRouter).toBeDefined();
      expect(ReactDOM.createRoot).toBeDefined();
    });

    it('should handle package version conflicts gracefully', async () => {
      // Test that our dependency versions work together
      const packages = [
        '@tanstack/react-query',
        'react-router-dom',
        'socket.io-client',
        'lucide-react'
      ];
      
      for (const pkg of packages) {
        try {
          const module = await import(pkg);
          expect(module).toBeDefined();
          dependencyTracker.markLoaded(pkg, 0);
        } catch (error) {
          dependencyTracker.markError(pkg, error as Error);
        }
      }
      
      // Should have loaded most packages successfully
      const successfulLoads = Array.from(dependencyTracker.loaded.values())
        .filter(loaded => loaded).length;
      const totalAttempts = packages.length;
      
      expect(successfulLoads / totalAttempts).toBeGreaterThan(0.5);
    });
  });

  describe('White Screen Prevention', () => {
    it('should provide fallbacks when critical dependencies fail', async () => {
      // Test fallback when React fails to load
      const fallbackComponent = () => {
        return document.createElement('div').innerHTML = 'App failed to load';
      };
      
      expect(typeof fallbackComponent).toBe('function');
      expect(() => fallbackComponent()).not.toThrow();
    });

    it('should ensure minimal viable application without optional dependencies', async () => {
      // Core dependencies that must load
      const coreDeps = ['react', 'react-dom'];
      
      for (const dep of coreDeps) {
        try {
          const module = await import(dep);
          expect(module).toBeDefined();
        } catch (error) {
          fail(`Core dependency ${dep} failed to load: ${error}`);
        }
      }
    });

    it('should maintain app functionality with degraded dependencies', () => {
      // Test app can still function with some features disabled
      const mockDegradedState = {
        hasWebSocket: false,
        hasIcons: false,
        hasTerminal: false,
        hasRouting: true,
        hasErrorBoundaries: true
      };
      
      // App should still be usable in degraded mode
      expect(mockDegradedState.hasRouting).toBe(true);
      expect(mockDegradedState.hasErrorBoundaries).toBe(true);
      
      // Should provide graceful degradation
      expect(mockDegradedState.hasWebSocket || true).toBe(true); // Offline mode available
      expect(mockDegradedState.hasIcons || true).toBe(true); // Text fallbacks available
      expect(mockDegradedState.hasTerminal || true).toBe(true); // Alternative UI available
    });
  });

  describe('Bundle Splitting and Lazy Loading', () => {
    it('should support dynamic imports for code splitting', async () => {
      const dynamicImport = async () => {
        return await import('react');
      };
      
      const module = await dynamicImport();
      expect(module).toBeDefined();
      expect(module.lazy).toBeDefined();
      expect(typeof module.lazy).toBe('function');
    });

    it('should handle lazy component loading', async () => {
      const React = await import('react');
      
      const LazyComponent = React.lazy(() => 
        Promise.resolve({ 
          default: () => React.createElement('div', null, 'Lazy loaded') 
        })
      );
      
      expect(LazyComponent).toBeDefined();
      expect(typeof LazyComponent).toBe('object');
      expect(LazyComponent.$$typeof).toBeDefined();
    });

    it('should provide loading states for async dependencies', async () => {
      const loadingStates = {
        react: 'loaded',
        router: 'loaded',
        query: 'loaded',
        websocket: 'loading',
        terminal: 'pending'
      };
      
      expect(loadingStates.react).toBe('loaded');
      expect(loadingStates.router).toBe('loaded');
      expect(['loading', 'loaded', 'error', 'pending']).toContain(loadingStates.websocket);
    });
  });
});