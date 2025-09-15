/**
 * TDD London School: Component Failure Diagnostic Tool
 *
 * Creates a working minimal app to verify the core issue and
 * provides a mock-driven fallback for the white screen
 */

import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

// Mock all potentially failing components with working implementations
const MockSocialMediaFeed = () => (
  <div className="p-6 bg-white rounded-lg shadow" data-testid="mock-social-feed">
    <h2 className="text-xl font-bold mb-4">Social Media Feed (Mock)</h2>
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 rounded">
        <h3 className="font-semibold">Mock Post 1</h3>
        <p>This is a mock social media post to verify the app works</p>
      </div>
      <div className="p-4 bg-gray-50 rounded">
        <h3 className="font-semibold">Mock Post 2</h3>
        <p>Another mock post to show the feed is working</p>
      </div>
    </div>
  </div>
);

const MockAgentManager = () => (
  <div className="p-6 bg-white rounded-lg shadow" data-testid="mock-agent-manager">
    <h2 className="text-xl font-bold mb-4">Agent Manager (Mock)</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="p-4 bg-blue-50 rounded border">
        <h3 className="font-semibold">Agent 1</h3>
        <p>Status: Active</p>
        <button className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm">
          Manage
        </button>
      </div>
      <div className="p-4 bg-green-50 rounded border">
        <h3 className="font-semibold">Agent 2</h3>
        <p>Status: Running</p>
        <button className="mt-2 px-3 py-1 bg-green-600 text-white rounded text-sm">
          Manage
        </button>
      </div>
    </div>
  </div>
);

const MockClaudeManager = () => (
  <div className="p-6 bg-white rounded-lg shadow" data-testid="mock-claude-manager">
    <h2 className="text-xl font-bold mb-4">Claude Manager (Mock)</h2>
    <div className="space-y-4">
      <div className="p-4 bg-purple-50 rounded border">
        <h3 className="font-semibold">Claude Instance 1</h3>
        <p>Status: Connected</p>
        <div className="mt-2 flex space-x-2">
          <button className="px-3 py-1 bg-purple-600 text-white rounded text-sm">
            Chat
          </button>
          <button className="px-3 py-1 bg-gray-600 text-white rounded text-sm">
            Settings
          </button>
        </div>
      </div>
    </div>
  </div>
);

const MockLoadingFallback = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="flex items-center justify-center p-8" data-testid="mock-loading">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
    <span className="text-gray-600">{message}</span>
  </div>
);

const MockErrorFallback = ({ error }: { error?: Error }) => (
  <div className="p-6 bg-red-50 border border-red-200 rounded-lg" data-testid="mock-error">
    <h2 className="text-lg font-semibold text-red-800 mb-2">
      Something went wrong
    </h2>
    <p className="text-red-600">
      {error?.message || 'An unexpected error occurred'}
    </p>
    <button
      onClick={() => window.location.reload()}
      className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Reload Page
    </button>
  </div>
);

// Mock Layout Component
const MockLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="h-screen bg-gray-50 flex" data-testid="mock-layout">
    {/* Sidebar */}
    <div className="w-64 bg-white shadow-lg">
      <div className="p-4 border-b">
        <h1 className="text-lg font-semibold">AgentLink (Mock)</h1>
      </div>
      <nav className="p-4 space-y-2">
        <a href="/" className="block p-2 text-blue-600 bg-blue-50 rounded">
          Feed
        </a>
        <a href="/agents" className="block p-2 text-gray-700 hover:bg-gray-100 rounded">
          Agents
        </a>
        <a href="/claude-manager" className="block p-2 text-gray-700 hover:bg-gray-100 rounded">
          Claude Manager
        </a>
      </nav>
    </div>

    {/* Main Content */}
    <div className="flex-1 flex flex-col">
      <header className="bg-white shadow-sm border-b p-4">
        <h1 className="text-xl font-semibold">Component Failure Diagnostic</h1>
      </header>
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  </div>
);

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * DiagnosticApp - A fully working mock version of the app
 * This proves that the core structure works and helps isolate component issues
 */
export const DiagnosticApp: React.FC = () => {
  console.log('DiagnosticApp: Rendering...');

  return (
    <ErrorBoundary fallbackRender={({ error }) => <MockErrorFallback error={error} />}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <MockLayout>
            <Suspense fallback={<MockLoadingFallback message="Loading page..." />}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <ErrorBoundary fallbackRender={({ error }) => <MockErrorFallback error={error} />}>
                      <Suspense fallback={<MockLoadingFallback message="Loading feed..." />}>
                        <MockSocialMediaFeed />
                      </Suspense>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/agents"
                  element={
                    <ErrorBoundary fallbackRender={({ error }) => <MockErrorFallback error={error} />}>
                      <Suspense fallback={<MockLoadingFallback message="Loading agents..." />}>
                        <MockAgentManager />
                      </Suspense>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/claude-manager"
                  element={
                    <ErrorBoundary fallbackRender={({ error }) => <MockErrorFallback error={error} />}>
                      <Suspense fallback={<MockLoadingFallback message="Loading Claude manager..." />}>
                        <MockClaudeManager />
                      </Suspense>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="*"
                  element={
                    <div className="text-center p-8">
                      <h2 className="text-xl font-semibold mb-2">Page Not Found</h2>
                      <p className="text-gray-600">The page you're looking for doesn't exist.</p>
                      <a href="/" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded">
                        Go Home
                      </a>
                    </div>
                  }
                />
              </Routes>
            </Suspense>
          </MockLayout>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default DiagnosticApp;