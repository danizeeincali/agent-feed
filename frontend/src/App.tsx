import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AgentFeedDashboard } from '@/components/AgentFeedDashboard';
import SocialMediaFeed from '@/components/SocialMediaFeed';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RealTimeNotifications } from '@/components/RealTimeNotifications';
import AgentManager from '@/components/AgentManager';
import WorkflowOrchestrator from '@/components/WorkflowOrchestrator';
import SystemAnalytics from '@/components/SystemAnalytics';
import ClaudeCodePanel from '@/components/ClaudeCodePanel';
import AgentDashboard from '@/components/AgentDashboard';
import WorkflowVisualization from '@/components/WorkflowVisualization';
import AgentProfile from '@/components/AgentProfile';
import ActivityPanel from '@/components/ActivityPanel';
import DualInstanceDashboard from '@/components/DualInstanceDashboard';
import { WebSocketProvider } from '@/context/WebSocketContext';
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
  Code
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { ConnectionStatus } from '@/components/ConnectionStatus';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const navigation = [
    { name: 'Feed', href: '/', icon: Activity },
    { name: 'Dual Instance', href: '/dual-instance', icon: LayoutDashboard },
    { name: 'Agent Manager', href: '/agents', icon: Bot },
    { name: 'Workflows', href: '/workflows', icon: Workflow },
    { name: 'Live Activity', href: '/activity', icon: GitBranch },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Claude Code', href: '/claude-code', icon: Code },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
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
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:bg-gray-100"
              onClick={() => setIsSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </a>
          ))}
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
                AgentLink Feed System
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
};

// Settings component
const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600 mt-1">Configure your AgentLink preferences</p>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Base URL
            </label>
            <input
              type="url"
              defaultValue="/api/v1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="notifications"
              defaultChecked
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="notifications" className="text-sm text-gray-700">
              Enable real-time notifications
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider config={{
          autoConnect: true,
          reconnectAttempts: 10,
          reconnectInterval: 2000,
          heartbeatInterval: 30000,
        }}>
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={<SocialMediaFeed />} />
                <Route path="/dual-instance" element={<DualInstanceDashboard />} />
                <Route path="/dashboard" element={<AgentDashboard />} />
                <Route path="/agents" element={<AgentManager />} />
                <Route path="/agent/:agentId" element={<AgentProfile />} />
                <Route path="/workflows" element={<WorkflowVisualization />} />
                <Route path="/analytics" element={<SystemAnalytics />} />
                <Route path="/claude-code" element={<ClaudeCodePanel />} />
                <Route path="/activity" element={<ActivityPanel />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={
                  <div className="text-center py-12" data-testid="error-fallback">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h1>
                    <p className="text-gray-600">The page you're looking for doesn't exist.</p>
                    <a href="/" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Go Home
                    </a>
                  </div>
                } />
              </Routes>
            </Layout>
          </Router>
        </WebSocketProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;