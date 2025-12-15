// TDD London School Debug App - Incrementally test each import
import React, { useState, memo, Suspense } from 'react';

// Step 1: Basic imports only
console.log('DEBUG: Starting App-Debug loading...');

// Test basic React Router imports
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
console.log('DEBUG: ✅ React Router imports loaded');

// Test Query Client imports
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
console.log('DEBUG: ✅ React Query imports loaded');

// Test utilities
import { cn } from '@/utils/cn';
console.log('DEBUG: ✅ Utility imports loaded');

// Test Lucide icons
import { 
  LayoutDashboard, 
  Activity, 
  GitBranch, 
  Settings as SettingsIcon, 
  Search,
  Menu,
  X,
  Zap,
  Bot,
  Workflow,
  BarChart3,
  Code,
} from 'lucide-react';
console.log('DEBUG: ✅ Lucide icon imports loaded');

// Create basic QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: 'always',
    },
  },
});
console.log('DEBUG: ✅ QueryClient created');

// Loading component
const LoadingSpinner = memo(() => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
));
LoadingSpinner.displayName = 'LoadingSpinner';
console.log('DEBUG: ✅ LoadingSpinner created');

// Test Layout component without complex imports
const SimpleLayout: React.FC<{ children: React.ReactNode }> = memo(({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const navigation = React.useMemo(() => [
    { name: 'Feed', href: '/', icon: Activity },
    { name: 'Agents', href: '/agents', icon: Bot },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ], []);

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <span className="text-lg font-semibold text-gray-900">AgentLink Debug</span>
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

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <h1 className="text-xl font-semibold text-gray-900">
              AgentLink Debug - Component Testing
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
SimpleLayout.displayName = 'SimpleLayout';
console.log('DEBUG: ✅ SimpleLayout created');

// Simple test page
const TestPage: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-2xl font-bold text-gray-900 mb-4">App Debug Test</h2>
    <div className="space-y-4">
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="font-semibold text-green-900">✅ Core Components Working</h3>
        <ul className="mt-2 text-sm text-green-700 space-y-1">
          <li>• React Router loaded successfully</li>
          <li>• React Query loaded successfully</li>
          <li>• Lucide icons loaded successfully</li>
          <li>• CSS utilities loaded successfully</li>
          <li>• Layout component rendered successfully</li>
        </ul>
      </div>
      
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900">🧪 Testing Status</h3>
        <p className="mt-2 text-sm text-blue-700">
          This debug version loads without the complex components that might be causing issues.
          If you see this page, the core infrastructure is working correctly.
        </p>
      </div>
    </div>
  </div>
);

// Debug App Component
const AppDebug: React.FC = () => {
  console.log('DEBUG: AppDebug component rendering...');
  
  React.useEffect(() => {
    console.log('DEBUG: ✅ AppDebug component mounted successfully!');
  }, []);
  
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

console.log('DEBUG: ✅ AppDebug component created successfully');

export default AppDebug;