import React, { useState, memo, Suspense } from 'react';

// Debug logging for App.tsx
console.log('DEBUG: App.tsx loading...');
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  ErrorBoundary, 
  RouteErrorBoundary, 
  GlobalErrorBoundary,
  AsyncErrorBoundary 
} from '@/components/ErrorBoundary';
import FallbackComponents from '@/components/FallbackComponents';
import { RealTimeNotifications } from '@/components/RealTimeNotifications';

// Import components directly to fix loading issue - with error handling
try {
  console.log('DEBUG: Loading SocialMediaFeed...');
} catch (error) {
  console.error('DEBUG: Failed to load SocialMediaFeed:', error);
}
import SocialMediaFeed from '@/components/SocialMediaFeed';
import SimpleAgentManager from '@/components/SimpleAgentManager';
import EnhancedAgentManagerWrapper from '@/components/EnhancedAgentManagerWrapper';
// import AgentManagerDebug from '@/components/AgentManagerDebug';
import SimpleAnalytics from '@/components/SimpleAnalytics';
import BulletproofClaudeCodePanel from '@/components/BulletproofClaudeCodePanel';
import AgentDashboard from '@/components/AgentDashboard';
import WorkflowVisualizationFixed from '@/components/WorkflowVisualizationFixed';
import BulletproofAgentProfile from '@/components/BulletproofAgentProfile';
import BulletproofActivityPanel from '@/components/BulletproofActivityPanel';
import SimpleSettings from '@/components/SimpleSettings';
import DualModeClaudeManager from '@/components/claude-manager/DualModeClaudeManager';
import { ClaudeInstanceManagerComponentSSE } from '@/components/claude-manager/ClaudeInstanceManagerComponentSSE';
import EnhancedSSEInterface from '@/components/claude-manager/EnhancedSSEInterface';
import PerformanceMonitor from '@/components/PerformanceMonitor';
import { WebSocketProvider } from '@/context/WebSocketSingletonContext';
import '@/styles/agents.css';
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
import { cn } from '@/utils/cn';
import { ConnectionStatus } from '@/components/ConnectionStatus';

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
  const navigation = React.useMemo(() => [
    { name: 'Interactive Control', href: '/interactive-control', icon: Bot },
    { name: 'Claude Manager', href: '/claude-manager', icon: LayoutDashboard },
    { name: 'Feed', href: '/', icon: Activity },
    { name: 'Agents', href: '/agents', icon: Bot },
    { name: 'Workflows', href: '/workflows', icon: Workflow },
    { name: 'Claude Code', href: '/claude-code', icon: Code },
    { name: 'Live Activity', href: '/activity', icon: GitBranch },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Performance Monitor', href: '/performance-monitor', icon: Zap },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ], []);

  return (
    <div className="h-screen bg-gray-50 flex">
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
        "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900">AgentLink</span>
          </div>
          
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 text-gray-400 hover:text-gray-600 lg:hidden"
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
                    ? "bg-blue-100 text-blue-700 border-r-2 border-blue-700" 
                    : "text-gray-700 hover:bg-gray-100"
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200" data-testid="header">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-gray-400 hover:text-gray-600 lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <h1 className="text-xl font-semibold text-gray-900">
                AgentLink - Claude Instance Manager
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                />
              </div>

              {/* Notifications */}
              <RealTimeNotifications />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" data-testid="agent-feed">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
});

Layout.displayName = 'Layout';

// Using BulletproofSettings component instead of inline Settings


const App: React.FC = () => {
  console.log('DEBUG: App component rendering...');
  
  React.useEffect(() => {
    console.log('DEBUG: App component mounted!');
  }, []);
  
  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider config={{
          autoConnect: true,
          reconnectAttempts: 3,
          reconnectInterval: 2000,
          heartbeatInterval: 20000,
        }}>
          <Router>
            <Layout>
              <ErrorBoundary componentName="AppRouter">
                <Suspense fallback={<FallbackComponents.LoadingFallback message="Loading page..." size="lg" />}>
                  <Routes>
                  <Route path="/" element={
                    <RouteErrorBoundary routeName="Feed">
                      <Suspense fallback={<FallbackComponents.FeedFallback />}>
                        <SocialMediaFeed />
                      </Suspense>
                    </RouteErrorBoundary>
                  } />
                  {/* SPARC Phase 5: SSE-based Interactive Control */}
                  <Route path="/interactive-control" element={
                    <RouteErrorBoundary routeName="InteractiveControlSSE" fallback={<FallbackComponents.DualInstanceFallback />}>
                      <AsyncErrorBoundary componentName="EnhancedSSEInterface">
                        <Suspense fallback={<FallbackComponents.LoadingFallback message="Loading Enhanced Interactive Control..." />}>
                          <div className="h-screen flex flex-col">
                            <EnhancedSSEInterface />
                          </div>
                        </Suspense>
                      </AsyncErrorBoundary>
                    </RouteErrorBoundary>
                  } />
                  
                  {/* New Claude Instance Manager Routes */}
                  <Route path="/claude-manager" element={
                    <RouteErrorBoundary routeName="ClaudeManager" fallback={<FallbackComponents.DualInstanceFallback />}>
                      <AsyncErrorBoundary componentName="DualModeClaudeManager">
                        <Suspense fallback={<FallbackComponents.DualInstanceFallback />}>
                          <DualModeClaudeManager />
                        </Suspense>
                      </AsyncErrorBoundary>
                    </RouteErrorBoundary>
                  } />
                  <Route path="/dashboard" element={
                    <RouteErrorBoundary routeName="Dashboard">
                      <Suspense fallback={<FallbackComponents.DashboardFallback />}>
                        <AgentDashboard />
                      </Suspense>
                    </RouteErrorBoundary>
                  } />
                  <Route path="/agents" element={
                    <RouteErrorBoundary routeName="Agents">
                      <Suspense fallback={<FallbackComponents.AgentManagerFallback />}>
                        <EnhancedAgentManagerWrapper />
                      </Suspense>
                    </RouteErrorBoundary>
                  } />
                  <Route path="/agents-legacy" element={
                    <RouteErrorBoundary routeName="LegacyAgentManager">
                      <Suspense fallback={<FallbackComponents.AgentManagerFallback />}>
                        <SimpleAgentManager />
                      </Suspense>
                    </RouteErrorBoundary>
                  } />
                  <Route path="/agent/:agentId" element={
                    <RouteErrorBoundary routeName="AgentProfile" fallback={<FallbackComponents.AgentProfileFallback />}>
                      <AsyncErrorBoundary componentName="AgentProfile">
                        <Suspense fallback={<FallbackComponents.AgentProfileFallback />}>
                          <BulletproofAgentProfile />
                        </Suspense>
                      </AsyncErrorBoundary>
                    </RouteErrorBoundary>
                  } />
                  <Route path="/workflows" element={
                    <RouteErrorBoundary routeName="Workflows">
                      <Suspense fallback={<FallbackComponents.WorkflowFallback />}>
                        <WorkflowVisualizationFixed />
                      </Suspense>
                    </RouteErrorBoundary>
                  } />
                  <Route path="/analytics" element={
                    <RouteErrorBoundary routeName="Analytics">
                      <Suspense fallback={<FallbackComponents.AnalyticsFallback />}>
                        <SimpleAnalytics />
                      </Suspense>
                    </RouteErrorBoundary>
                  } />
                  <Route path="/claude-code" element={
                    <RouteErrorBoundary routeName="ClaudeCode">
                      <Suspense fallback={<FallbackComponents.ClaudeCodeFallback />}>
                        <BulletproofClaudeCodePanel />
                      </Suspense>
                    </RouteErrorBoundary>
                  } />
                  <Route path="/activity" element={
                    <RouteErrorBoundary routeName="Activity">
                      <Suspense fallback={<FallbackComponents.ActivityFallback />}>
                        <BulletproofActivityPanel />
                      </Suspense>
                    </RouteErrorBoundary>
                  } />
                  <Route path="/settings" element={
                    <RouteErrorBoundary routeName="Settings">
                      <Suspense fallback={<FallbackComponents.SettingsFallback />}>
                        <SimpleSettings />
                      </Suspense>
                    </RouteErrorBoundary>
                  } />
                  <Route path="/performance-monitor" element={
                    <RouteErrorBoundary routeName="PerformanceMonitor">
                      <Suspense fallback={<FallbackComponents.LoadingFallback message="Loading Performance Monitor..." />}>
                        <PerformanceMonitor />
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
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
};

export default App;