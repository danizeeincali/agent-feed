// TDD London School Incremental App Loading Test
// Purpose: Create progressive App.tsx versions to isolate failing component

import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create test QueryClient
const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Minimal App - Just basic structure
export const MinimalApp: React.FC = () => {
  return (
    <QueryClientProvider client={testQueryClient}>
      <Router>
        <div data-testid="minimal-app">
          <h1>Minimal App Loading</h1>
        </div>
      </Router>
    </QueryClientProvider>
  );
};

// App with ErrorBoundary only
export const AppWithErrorBoundary: React.FC = () => {
  const [ErrorBoundaryComponents, setErrorBoundaryComponents] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    import('@/components/ErrorBoundary')
      .then((modules) => {
        console.log('✅ ErrorBoundary loaded successfully', modules);
        setErrorBoundaryComponents(modules);
      })
      .catch((err) => {
        console.error('❌ ErrorBoundary failed to load:', err);
        setError(err.message);
      });
  }, []);

  if (error) {
    return <div data-testid="error">ErrorBoundary Load Error: {error}</div>;
  }

  if (!ErrorBoundaryComponents) {
    return <div data-testid="loading">Loading ErrorBoundary...</div>;
  }

  const { ErrorBoundary, GlobalErrorBoundary } = ErrorBoundaryComponents;

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={testQueryClient}>
        <Router>
          <ErrorBoundary>
            <div data-testid="app-with-errorboundary">
              <h1>App with ErrorBoundary Loading</h1>
            </div>
          </ErrorBoundary>
        </Router>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
};

// App with ErrorBoundary + FallbackComponents
export const AppWithFallbacks: React.FC = () => {
  const [components, setComponents] = React.useState<any>({});
  const [error, setError] = React.useState<string | null>(null);
  const [loadingStep, setLoadingStep] = React.useState('ErrorBoundary');

  React.useEffect(() => {
    const loadComponents = async () => {
      try {
        // Load ErrorBoundary
        setLoadingStep('ErrorBoundary');
        const errorBoundaryModules = await import('@/components/ErrorBoundary');
        console.log('✅ ErrorBoundary loaded');
        
        // Load FallbackComponents
        setLoadingStep('FallbackComponents');
        const fallbackModules = await import('@/components/FallbackComponents');
        console.log('✅ FallbackComponents loaded');
        
        setComponents({
          errorBoundary: errorBoundaryModules,
          fallback: fallbackModules
        });
      } catch (err: any) {
        console.error(`❌ Failed to load ${loadingStep}:`, err);
        setError(`${loadingStep}: ${err.message}`);
      }
    };

    loadComponents();
  }, []);

  if (error) {
    return <div data-testid="error">Component Load Error: {error}</div>;
  }

  if (!components.errorBoundary || !components.fallback) {
    return <div data-testid="loading">Loading {loadingStep}...</div>;
  }

  const { ErrorBoundary, GlobalErrorBoundary } = components.errorBoundary;
  const FallbackComponents = components.fallback.default;

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={testQueryClient}>
        <Router>
          <ErrorBoundary>
            <div data-testid="app-with-fallbacks">
              <h1>App with ErrorBoundary + FallbackComponents</h1>
              <React.Suspense fallback={<FallbackComponents.LoadingFallback />}>
                <div>Suspense content loaded!</div>
              </React.Suspense>
            </div>
          </ErrorBoundary>
        </Router>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
};

// App with WebSocket Context
export const AppWithWebSocket: React.FC = () => {
  const [components, setComponents] = React.useState<any>({});
  const [error, setError] = React.useState<string | null>(null);
  const [loadingStep, setLoadingStep] = React.useState('ErrorBoundary');

  React.useEffect(() => {
    const loadComponents = async () => {
      try {
        setLoadingStep('ErrorBoundary');
        const errorBoundaryModules = await import('@/components/ErrorBoundary');
        
        setLoadingStep('FallbackComponents');
        const fallbackModules = await import('@/components/FallbackComponents');
        
        setLoadingStep('WebSocketProvider');
        const webSocketModules = await import('@/context/WebSocketSingletonContext');
        console.log('✅ WebSocketProvider loaded');
        
        setComponents({
          errorBoundary: errorBoundaryModules,
          fallback: fallbackModules,
          webSocket: webSocketModules
        });
      } catch (err: any) {
        console.error(`❌ Failed to load ${loadingStep}:`, err);
        setError(`${loadingStep}: ${err.message}`);
      }
    };

    loadComponents();
  }, []);

  if (error) {
    return <div data-testid="error">Component Load Error: {error}</div>;
  }

  if (!components.errorBoundary || !components.fallback || !components.webSocket) {
    return <div data-testid="loading">Loading {loadingStep}...</div>;
  }

  const { ErrorBoundary, GlobalErrorBoundary } = components.errorBoundary;
  const FallbackComponents = components.fallback.default;
  const { WebSocketProvider } = components.webSocket;

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={testQueryClient}>
        <WebSocketProvider config={{
          autoConnect: true,
          reconnectAttempts: 3,
          reconnectInterval: 2000,
          heartbeatInterval: 20000,
        }}>
          <Router>
            <ErrorBoundary>
              <div data-testid="app-with-websocket">
                <h1>App with WebSocket Context</h1>
                <React.Suspense fallback={<FallbackComponents.LoadingFallback />}>
                  <div>WebSocket connection established!</div>
                </React.Suspense>
              </div>
            </ErrorBoundary>
          </Router>
        </WebSocketProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
};

// App with SocialMediaFeed - This is likely where the problem is
export const AppWithSocialFeed: React.FC = () => {
  const [components, setComponents] = React.useState<any>({});
  const [error, setError] = React.useState<string | null>(null);
  const [loadingStep, setLoadingStep] = React.useState('ErrorBoundary');

  React.useEffect(() => {
    const loadComponents = async () => {
      try {
        setLoadingStep('ErrorBoundary');
        const errorBoundaryModules = await import('@/components/ErrorBoundary');
        
        setLoadingStep('FallbackComponents');
        const fallbackModules = await import('@/components/FallbackComponents');
        
        setLoadingStep('WebSocketProvider');
        const webSocketModules = await import('@/context/WebSocketSingletonContext');
        
        setLoadingStep('SocialMediaFeed');
        const socialFeedModules = await import('@/components/SocialMediaFeed');
        console.log('✅ SocialMediaFeed loaded');
        
        setComponents({
          errorBoundary: errorBoundaryModules,
          fallback: fallbackModules,
          webSocket: webSocketModules,
          socialFeed: socialFeedModules
        });
      } catch (err: any) {
        console.error(`❌ Failed to load ${loadingStep}:`, err);
        setError(`${loadingStep}: ${err.message}`);
      }
    };

    loadComponents();
  }, []);

  if (error) {
    return <div data-testid="error">SocialMediaFeed Load Error: {error}</div>;
  }

  if (!components.errorBoundary || !components.fallback || !components.webSocket || !components.socialFeed) {
    return <div data-testid="loading">Loading {loadingStep}...</div>;
  }

  const { ErrorBoundary, GlobalErrorBoundary, RouteErrorBoundary } = components.errorBoundary;
  const FallbackComponents = components.fallback.default;
  const { WebSocketProvider } = components.webSocket;
  const SocialMediaFeed = components.socialFeed.default;

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={testQueryClient}>
        <WebSocketProvider config={{
          autoConnect: true,
          reconnectAttempts: 3,
          reconnectInterval: 2000,
          heartbeatInterval: 20000,
        }}>
          <Router>
            <ErrorBoundary>
              <div data-testid="app-with-socialfeed">
                <h1>App with SocialMediaFeed</h1>
                <RouteErrorBoundary routeName="Feed">
                  <React.Suspense fallback={<FallbackComponents.FeedFallback />}>
                    <SocialMediaFeed />
                  </React.Suspense>
                </RouteErrorBoundary>
              </div>
            </ErrorBoundary>
          </Router>
        </WebSocketProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
};