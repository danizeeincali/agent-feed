// TDD London School Debug App - Synchronous testing approach
import React, { useState, memo, Suspense } from 'react';

console.log('DEBUG: Starting App-Debug-Sync loading...');

// Test basic imports
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cn } from '@/utils/cn';
import { Activity, Bot, Settings as SettingsIcon } from 'lucide-react';

console.log('DEBUG: ✅ Basic imports successful');

// Test ErrorBoundary imports - using try/catch for error detection
let ErrorBoundary: any = null;
let GlobalErrorBoundary: any = null;
let errorBoundaryError: string | null = null;

try {
  console.log('DEBUG: Attempting to import ErrorBoundary...');
  const ErrorBoundaryModule = require('@/components/ErrorBoundary');
  ErrorBoundary = ErrorBoundaryModule.ErrorBoundary;
  GlobalErrorBoundary = ErrorBoundaryModule.GlobalErrorBoundary;
  console.log('DEBUG: ✅ ErrorBoundary loaded successfully');
} catch (error: any) {
  console.error('DEBUG: ❌ ErrorBoundary failed to load:', error);
  errorBoundaryError = error.message || error.toString();
}

// Test FallbackComponents
let FallbackComponents: any = null;
let fallbackError: string | null = null;

try {
  console.log('DEBUG: Attempting to import FallbackComponents...');
  FallbackComponents = require('@/components/FallbackComponents').default;
  console.log('DEBUG: ✅ FallbackComponents loaded successfully');
} catch (error: any) {
  console.error('DEBUG: ❌ FallbackComponents failed to load:', error);
  fallbackError = error.message || error.toString();
}

// Test WebSocketContext
let WebSocketProvider: any = null;
let webSocketError: string | null = null;

try {
  console.log('DEBUG: Attempting to import WebSocketProvider...');
  const WebSocketModule = require('@/context/WebSocketSingletonContext');
  WebSocketProvider = WebSocketModule.WebSocketProvider;
  console.log('DEBUG: ✅ WebSocketProvider loaded successfully');
} catch (error: any) {
  console.error('DEBUG: ❌ WebSocketProvider failed to load:', error);
  webSocketError = error.message || error.toString();
}

// Create basic QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false },
  },
});

const LoadingSpinner = memo(() => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
));

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
          <span className="text-lg font-semibold text-gray-900">Import Test</span>
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
              Component Import Analysis
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

// Test page showing import status
const ImportTestPage: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-2xl font-bold text-gray-900 mb-4">Component Import Test Results</h2>
    
    <div className="space-y-4">
      {/* ErrorBoundary Status */}
      <div className={`p-4 border rounded-lg ${ErrorBoundary ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <h3 className={`font-semibold ${ErrorBoundary ? 'text-green-900' : 'text-red-900'}`}>
          {ErrorBoundary ? '✅' : '❌'} ErrorBoundary Components
        </h3>
        {errorBoundaryError && (
          <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto max-h-32">
            {errorBoundaryError}
          </pre>
        )}
      </div>

      {/* FallbackComponents Status */}
      <div className={`p-4 border rounded-lg ${FallbackComponents ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <h3 className={`font-semibold ${FallbackComponents ? 'text-green-900' : 'text-red-900'}`}>
          {FallbackComponents ? '✅' : '❌'} FallbackComponents
        </h3>
        {fallbackError && (
          <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto max-h-32">
            {fallbackError}
          </pre>
        )}
      </div>

      {/* WebSocketProvider Status */}
      <div className={`p-4 border rounded-lg ${WebSocketProvider ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <h3 className={`font-semibold ${WebSocketProvider ? 'text-green-900' : 'text-red-900'}`}>
          {WebSocketProvider ? '✅' : '❌'} WebSocketProvider
        </h3>
        {webSocketError && (
          <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto max-h-32">
            {webSocketError}
          </pre>
        )}
      </div>

      {/* Summary */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900">🔍 Analysis</h3>
        <p className="mt-2 text-sm text-blue-700">
          {(ErrorBoundary && FallbackComponents && WebSocketProvider) 
            ? 'All core components loaded successfully! The issue is likely in a specific component like SocialMediaFeed or one of the pages.'
            : 'One or more core components failed to load. Check the error details above for circular imports or missing dependencies.'
          }
        </p>
      </div>
    </div>
  </div>
);

// Debug App Component
const AppDebugSync: React.FC = () => {
  console.log('DEBUG: AppDebugSync rendering...');
  
  // Wrap in available providers
  const content = (
    <SimpleLayout>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="*" element={<ImportTestPage />} />
        </Routes>
      </Suspense>
    </SimpleLayout>
  );

  // Layer providers based on what loaded successfully
  let wrappedContent = content;

  if (WebSocketProvider) {
    wrappedContent = (
      <WebSocketProvider config={{ autoConnect: true }}>
        {wrappedContent}
      </WebSocketProvider>
    );
  }

  if (ErrorBoundary && GlobalErrorBoundary) {
    wrappedContent = (
      <GlobalErrorBoundary>
        <ErrorBoundary componentName="DebugApp">
          {wrappedContent}
        </ErrorBoundary>
      </GlobalErrorBoundary>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        {wrappedContent}
      </Router>
    </QueryClientProvider>
  );
};

console.log('DEBUG: ✅ AppDebugSync created successfully');

export default AppDebugSync;