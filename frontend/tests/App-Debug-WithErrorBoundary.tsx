// TDD London School Debug App - Add ErrorBoundary step by step
import React, { useState, memo, Suspense } from 'react';

console.log('DEBUG: Starting App-Debug-WithErrorBoundary loading...');

// Test basic imports
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cn } from '@/utils/cn';
import { 
  Activity, 
  Bot, 
  SettingsIcon, 
} from 'lucide-react';

// CRITICAL TEST: Add ErrorBoundary imports step by step
let errorBoundaryLoaded = false;
let errorBoundaryError = null;

try {
  console.log('DEBUG: Attempting to load ErrorBoundary...');
  // Import specific ErrorBoundary components
  const ErrorBoundaryModule = await import('@/components/ErrorBoundary');
  console.log('DEBUG: ✅ ErrorBoundary module loaded successfully', ErrorBoundaryModule);
  errorBoundaryLoaded = true;
} catch (error) {
  console.error('DEBUG: ❌ ErrorBoundary failed to load:', error);
  errorBoundaryError = error;
}

// Create basic QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false },
  },
});

// Loading component
const LoadingSpinner = memo(() => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
));

// Simple Layout
const SimpleLayout: React.FC<{ children: React.ReactNode }> = memo(({ children }) => {
  const navigation = [
    { name: 'Feed', href: '/', icon: Activity },
    { name: 'Agents', href: '/agents', icon: Bot },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  return (
    <div className="h-screen bg-gray-50 flex">
      <div className="w-64 bg-white shadow-lg">
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <span className="text-lg font-semibold text-gray-900">ErrorBoundary Test</span>
        </div>
        <nav className="mt-8 px-4 space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100"
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <h1 className="text-xl font-semibold text-gray-900">
              ErrorBoundary Loading Test
            </h1>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
});

// Test page with ErrorBoundary status
const TestPage: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-2xl font-bold text-gray-900 mb-4">ErrorBoundary Loading Test</h2>
    
    <div className="space-y-4">
      {errorBoundaryLoaded ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900">✅ ErrorBoundary Components Loaded</h3>
          <p className="mt-2 text-sm text-green-700">
            All ErrorBoundary components imported successfully! The issue is likely elsewhere.
          </p>
        </div>
      ) : (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-semibold text-red-900">❌ ErrorBoundary Loading Failed</h3>
          <p className="mt-2 text-sm text-red-700">
            ErrorBoundary components failed to load. This is likely the cause of the white screen.
          </p>
          {errorBoundaryError && (
            <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
              {errorBoundaryError.toString()}
            </pre>
          )}
        </div>
      )}
      
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900">🔍 Next Steps</h3>
        <p className="mt-2 text-sm text-blue-700">
          {errorBoundaryLoaded 
            ? 'Try adding other components like FallbackComponents, WebSocketContext, etc.'
            : 'Fix the ErrorBoundary loading issue first - check for circular imports or missing dependencies.'
          }
        </p>
      </div>
    </div>
  </div>
);

// Debug App Component
const AppDebugWithErrorBoundary: React.FC = () => {
  console.log('DEBUG: AppDebugWithErrorBoundary rendering...', { errorBoundaryLoaded, errorBoundaryError });
  
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <SimpleLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="*" element={<TestPage />} />
            </Routes>
          </Suspense>
        </SimpleLayout>
      </Router>
    </QueryClientProvider>
  );
};

console.log('DEBUG: ✅ AppDebugWithErrorBoundary created successfully');

export default AppDebugWithErrorBoundary;