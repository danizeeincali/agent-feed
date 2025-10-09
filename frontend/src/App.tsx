import * as React from 'react';
import { useState, memo, Suspense, useEffect, useMemo } from 'react';

// Debug logging for App.tsx
console.log('DEBUG: App.tsx loading...');
import { BrowserRouter, MemoryRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import FallbackComponents from './components/FallbackComponents';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import AsyncErrorBoundary from './components/AsyncErrorBoundary';
import { VideoPlaybackProvider } from './contexts/VideoPlaybackContext';
import { useDarkMode } from './hooks/useDarkMode';

// Import components directly to fix loading issue - with error handling
try {
  console.log('DEBUG: Loading SocialMediaFeed...');
} catch (error) {
  console.error('DEBUG: Failed to load SocialMediaFeed:', error);
}
import SocialMediaFeed from './components/RealSocialMediaFeed';
import SafeFeedWrapper from './components/SafeFeedWrapper';
import RealAgentManager from './components/RealAgentManager';
import IsolatedRealAgentManager from './components/IsolatedRealAgentManager';
import RealActivityFeed from './components/RealActivityFeed';
import EnhancedAgentManagerWrapper from './components/EnhancedAgentManagerWrapper';
// import AgentManagerDebug from './components/AgentManagerDebug';
import RealAnalytics from './components/RealAnalytics';
import RouteWrapper from './components/RouteWrapper';
import AgentDashboard from './components/AgentDashboard';
// import WorkflowVisualizationFixed from './components/WorkflowVisualizationFixed'; // REMOVED: TDD GREEN Phase
import BulletproofActivityPanel from './components/BulletproofActivityPanel';
// Removed UnifiedAgentPage import - component deleted during cleanup
// Removed AgentDynamicPage import - component deleted during cleanup
// Removed AgentDynamicPageV2 import - component deleted during cleanup
import WorkingAgentProfile from './components/WorkingAgentProfile';
import DynamicPageRenderer from './components/DynamicPageRenderer';
import { WebSocketProvider } from './context/WebSocketSingletonContext';
import { DraftManager } from './components/DraftManager';
import DebugPostsDisplay from './components/DebugPostsDisplay';
// import './styles/agents.css'; // Moved to _app.tsx
import {
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
  FileText,
} from 'lucide-react';
import { cn } from './utils/cn';
import { ConnectionStatus } from './components/ConnectionStatus';

// Optimized QueryClient to reduce API calls and improve performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Reduced from 2 to minimize failed requests
      staleTime: 5 * 60 * 1000, // 5 minutes - much longer to reduce API calls
      gcTime: 10 * 60 * 1000, // 10 minutes cache (was cacheTime in v4)
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Prevent unnecessary refetches
      refetchOnReconnect: 'always',
    },
  },
});

// Loading spinner component for Suspense fallback
const LoadingSpinner = memo(() => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
));
LoadingSpinner.displayName = 'LoadingSpinner';

interface LayoutProps {
  children: React.ReactNode;
}

// Memoized Layout to prevent unnecessary re-renders
const Layout: React.FC<LayoutProps> = memo(({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const location = useLocation();

  // Memoized navigation to prevent re-creation on every render
  // Cleaned up navigation - keeping only essential pages
  const navigation = useMemo(() => [
    { name: 'Feed', href: '/', icon: Activity },
    { name: 'Drafts', href: '/drafts', icon: FileText },
    { name: 'Agents', href: '/agents', icon: Bot },
    // { name: 'Workflows', href: '/workflows', icon: Workflow }, // REMOVED: TDD GREEN Phase
    { name: 'Live Activity', href: '/activity', icon: GitBranch },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  ], []);

  return (
    <div className="h-screen bg-gray-50 flex" data-testid="app-root">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75"></div>
        </div>
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">AgentLink</span>
          </div>

          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-8 px-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-r-2 border-blue-700 dark:border-blue-500"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
                onClick={() => setIsSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Connection Status */}
        <ConnectionStatus />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden" data-testid="main-content">
        {/* Header */}
        <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700" data-testid="header">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </button>

              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                AgentLink - Claude Instance Manager
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-400" />
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                />
              </div>

            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-white dark:bg-gray-900" data-testid="app-container">
          <ErrorBoundary fallbackRender={({ error }) => (
            <div className="p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md">
              <h2>Something went wrong</h2>
              <p>{error?.message}</p>
            </div>
          )}>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
});

Layout.displayName = 'Layout';



const App: React.FC = () => {
  console.log('DEBUG: App component rendering...');

  // Enable automatic dark mode detection
  useDarkMode();

  useEffect(() => {
    console.log('DEBUG: App component mounted!');
  }, []);

  // SSR-safe router selection
  const Router = typeof window !== 'undefined' ? BrowserRouter : MemoryRouter;

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <VideoPlaybackProvider>
          <WebSocketProvider config={{
            autoConnect: true,
            reconnectAttempts: 3,
            reconnectInterval: 2000,
            heartbeatInterval: 20000,
          }}>
            <Router>
            <Layout>
              <ErrorBoundary fallbackRender={({ error }) => (
                <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
                  <h2>Error in AppRouter</h2>
                  <p>{error?.message}</p>
                </div>
              )}>
                <Suspense fallback={<FallbackComponents.LoadingFallback message="Loading page..." size="lg" />}>
                  <Routes>
                  <Route path="/" element={
                    <RouteWrapper routeKey="feed">
                      <RouteErrorBoundary routeName="Feed" key="feed-route">
                        <SafeFeedWrapper>
                          <Suspense fallback={<FallbackComponents.FeedFallback />}>
                            <SocialMediaFeed key="social-feed" />
                          </Suspense>
                        </SafeFeedWrapper>
                      </RouteErrorBoundary>
                    </RouteWrapper>
                  } />
                  
                  <Route path="/dashboard" element={
                    <RouteErrorBoundary routeName="Dashboard">
                      <Suspense fallback={<FallbackComponents.DashboardFallback />}>
                        <AgentDashboard />
                      </Suspense>
                    </RouteErrorBoundary>
                  } />
                  <Route path="/agents" element={
                    <RouteWrapper routeKey="agents">
                      <RouteErrorBoundary routeName="Agents" key="agents-route">
                        <Suspense fallback={<FallbackComponents.AgentManagerFallback />}>
                          <IsolatedRealAgentManager key="agents-manager" />
                        </Suspense>
                      </RouteErrorBoundary>
                    </RouteWrapper>
                  } />
                  <Route path="/agents/:agentSlug" element={
                    <RouteWrapper routeKey="agents">
                      <RouteErrorBoundary routeName="Agents" key="agents-route">
                        <Suspense fallback={<FallbackComponents.AgentManagerFallback />}>
                          <IsolatedRealAgentManager key="agents-manager" />
                        </Suspense>
                      </RouteErrorBoundary>
                    </RouteWrapper>
                  } />
                  <Route path="/agents/:agentId/pages/:pageId" element={
                    <RouteErrorBoundary routeName="DynamicAgentPage">
                      <Suspense fallback={<FallbackComponents.LoadingFallback message="Loading dynamic page..." />}>
                        <DynamicPageRenderer />
                      </Suspense>
                    </RouteErrorBoundary>
                  } />
                  {/* REMOVED: Workflows route - TDD GREEN Phase */}
                  <Route path="/analytics" element={
                    <RouteErrorBoundary routeName="Analytics">
                      <Suspense fallback={<FallbackComponents.AnalyticsFallback />}>
                        <RealAnalytics />
                      </Suspense>
                    </RouteErrorBoundary>
                  } />
                  <Route path="/activity" element={
                    <RouteErrorBoundary routeName="Activity">
                      <Suspense fallback={<FallbackComponents.ActivityFallback />}>
                        <RealActivityFeed />
                      </Suspense>
                    </RouteErrorBoundary>
                  } />
                  <Route path="/drafts" element={
                    <RouteErrorBoundary routeName="DraftManager">
                      <Suspense fallback={<FallbackComponents.LoadingFallback message="Loading Draft Manager..." />}>
                        <DraftManager />
                      </Suspense>
                    </RouteErrorBoundary>
                  } />
                  <Route path="/debug-posts" element={
                    <RouteErrorBoundary routeName="DebugPosts">
                      <Suspense fallback={<FallbackComponents.LoadingFallback message="Loading Debug Posts..." />}>
                        <DebugPostsDisplay />
                      </Suspense>
                    </RouteErrorBoundary>
                  } />
                  
                  
                  <Route path="*" element={<FallbackComponents.NotFoundFallback />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </Layout>
            </Router>
          </WebSocketProvider>
        </VideoPlaybackProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
};

export default App;