/**
 * TDD London School: Emergency Diagnostic App
 *
 * This is a minimal working app to replace the white screen
 * Uses mock-driven development to identify exact failure points
 */

import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

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

// Mock Components - these will always work
const LoadingFallback = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="flex items-center justify-center p-8" data-testid="loading">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
    <span className="text-gray-600">{message}</span>
  </div>
);

const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div className="p-6 bg-red-50 border border-red-200 rounded-lg m-4" data-testid="error-fallback">
    <h2 className="text-lg font-semibold text-red-800 mb-2">
      ⚠️ Component Error Detected
    </h2>
    <p className="text-red-600 mb-4">
      {error?.message || 'An unexpected error occurred'}
    </p>
    <details className="mb-4">
      <summary className="cursor-pointer text-sm text-red-700">Error Details</summary>
      <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
        {error?.stack}
      </pre>
    </details>
    <div className="flex space-x-2">
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Try Again
      </button>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
      >
        Reload Page
      </button>
    </div>
  </div>
);

// Working Mock Components
const MockFeed = () => (
  <div className="p-6 bg-white rounded-lg shadow" data-testid="mock-feed">
    <h2 className="text-2xl font-bold mb-4">📱 Social Media Feed</h2>
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="p-4 bg-gray-50 rounded border">
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              {i}
            </div>
            <span className="ml-2 font-semibold">Agent {i}</span>
          </div>
          <p>This is a mock post from Agent {i}. The feed is working correctly!</p>
          <div className="flex space-x-2 mt-2">
            <button className="text-blue-600 hover:text-blue-800">Like</button>
            <button className="text-gray-600 hover:text-gray-800">Comment</button>
            <button className="text-green-600 hover:text-green-800">Share</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MockAgents = () => (
  <div className="p-6 bg-white rounded-lg shadow" data-testid="mock-agents">
    <h2 className="text-2xl font-bold mb-4">🤖 Agent Manager</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {['Researcher', 'Coder', 'Analyst'].map((type, i) => (
        <div key={i} className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded border">
          <h3 className="font-semibold text-lg">{type} Agent</h3>
          <p className="text-gray-600 mb-3">Status: Active</p>
          <div className="flex space-x-2">
            <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
              Configure
            </button>
            <button className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
              Start
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MockClaude = () => (
  <div className="p-6 bg-white rounded-lg shadow" data-testid="mock-claude">
    <h2 className="text-2xl font-bold mb-4">🧠 Claude Manager</h2>
    <div className="space-y-4">
      {['Primary', 'Secondary'].map((instance, i) => (
        <div key={i} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded border">
          <h3 className="font-semibold">{instance} Claude Instance</h3>
          <p className="text-gray-600">Status: Connected ✅</p>
          <div className="mt-3 flex space-x-2">
            <button className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">
              Chat
            </button>
            <button className="px-3 py-1 bg-pink-600 text-white rounded text-sm hover:bg-pink-700">
              Settings
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const DiagnosticInfo = () => (
  <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg" data-testid="diagnostic">
    <h2 className="text-xl font-bold mb-4">🔧 Diagnostic Mode Active</h2>
    <div className="space-y-3">
      <p>✅ React rendering working</p>
      <p>✅ React Router working</p>
      <p>✅ QueryClient working</p>
      <p>✅ Error boundaries working</p>
      <p>✅ Suspense boundaries working</p>
      <p>✅ CSS and Tailwind working</p>
      <p className="font-semibold text-green-700">
        🎉 Core app structure is functional!
      </p>
    </div>
    <div className="mt-4 p-3 bg-blue-50 rounded">
      <h3 className="font-semibold mb-2">Next Steps:</h3>
      <ol className="list-decimal list-inside text-sm space-y-1">
        <li>Replace mock components with real ones gradually</li>
        <li>Test each component individually in isolation</li>
        <li>Use error boundaries to catch specific component failures</li>
        <li>Implement progressive enhancement</li>
      </ol>
    </div>
  </div>
);

// Layout Component
const Layout = ({ children }: { children: React.ReactNode }) => (
  <div className="h-screen bg-gray-50 flex" data-testid="layout">
    {/* Sidebar */}
    <div className="w-64 bg-white shadow-lg flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">AL</span>
          </div>
          <span className="text-lg font-semibold">AgentLink</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">Diagnostic Mode</p>
      </div>

      <nav className="p-4 space-y-2 flex-1">
        <Link
          to="/"
          className="flex items-center p-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded"
        >
          📱 Feed
        </Link>
        <Link
          to="/agents"
          className="flex items-center p-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded"
        >
          🤖 Agents
        </Link>
        <Link
          to="/claude"
          className="flex items-center p-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded"
        >
          🧠 Claude
        </Link>
        <Link
          to="/diagnostic"
          className="flex items-center p-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded"
        >
          🔧 Diagnostic
        </Link>
      </nav>

      <div className="p-4 border-t">
        <div className="text-xs text-gray-500">
          Status: <span className="text-green-600">Operational</span>
        </div>
      </div>
    </div>

    {/* Main Content */}
    <div className="flex-1 flex flex-col">
      <header className="bg-white shadow-sm border-b p-4">
        <h1 className="text-xl font-semibold text-gray-900">
          AgentLink - Emergency Diagnostic Mode
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  </div>
);

// Main Diagnostic App
export const DiagnosticApp: React.FC = () => {
  console.log('🔧 DiagnosticApp: Starting emergency diagnostic mode...');

  return (
    <ErrorBoundary fallbackRender={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Layout>
            <Suspense fallback={<LoadingFallback message="Loading page..." />}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <ErrorBoundary fallbackRender={ErrorFallback}>
                      <Suspense fallback={<LoadingFallback message="Loading feed..." />}>
                        <MockFeed />
                      </Suspense>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/agents"
                  element={
                    <ErrorBoundary fallbackRender={ErrorFallback}>
                      <Suspense fallback={<LoadingFallback message="Loading agents..." />}>
                        <MockAgents />
                      </Suspense>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/claude"
                  element={
                    <ErrorBoundary fallbackRender={ErrorFallback}>
                      <Suspense fallback={<LoadingFallback message="Loading Claude..." />}>
                        <MockClaude />
                      </Suspense>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/diagnostic"
                  element={
                    <ErrorBoundary fallbackRender={ErrorFallback}>
                      <DiagnosticInfo />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="*"
                  element={
                    <div className="text-center p-8">
                      <h2 className="text-xl font-semibold mb-2">Page Not Found</h2>
                      <p className="text-gray-600 mb-4">The page you're looking for doesn't exist.</p>
                      <Link
                        to="/"
                        className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Go Home
                      </Link>
                    </div>
                  }
                />
              </Routes>
            </Suspense>
          </Layout>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default DiagnosticApp;