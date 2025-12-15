/**
 * Test React.lazy() dynamic import for TokenAnalyticsDashboard
 */

import React, { Suspense, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Test React.lazy() like in RealAnalytics.tsx
const TokenAnalyticsDashboard = React.lazy(() => import('./TokenAnalyticsDashboard.tsx'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const LazyImportTest = () => {
  const [showComponent, setShowComponent] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleLoadComponent = async () => {
    try {
      setImportError(null);
      setShowComponent(true);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">React.lazy() Import Test</h1>
            <p className="text-gray-600 mb-4">
              Testing dynamic import of TokenAnalyticsDashboard component using React.lazy()
              (same method used in RealAnalytics.tsx)
            </p>

            <div className="flex gap-4 mb-4">
              <button
                onClick={handleLoadComponent}
                disabled={showComponent}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {showComponent ? '✅ Component Loaded' : 'Load Component with React.lazy()'}
              </button>

              <button
                onClick={() => setShowComponent(false)}
                disabled={!showComponent}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                Hide Component
              </button>
            </div>

            {importError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h3 className="text-red-800 font-semibold">Import Error:</h3>
                <p className="text-red-600 text-sm">{importError}</p>
              </div>
            )}
          </div>

          {showComponent && (
            <Suspense
              fallback={
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-blue-600">Loading TokenAnalyticsDashboard...</p>
                </div>
              }
            >
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-800">
                  ✅ React.lazy() import successful! Component rendered below:
                </p>
              </div>
              <TokenAnalyticsDashboard />
            </Suspense>
          )}
        </div>
      </div>
    </QueryClientProvider>
  );
};

// Only render if this is the lazy test page
if (typeof window !== 'undefined' && window.location.pathname === '/test-lazy-import') {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(<LazyImportTest />);
  }
}

export default LazyImportTest;