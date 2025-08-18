import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  LayoutDashboard, 
  Activity, 
  GitBranch, 
  Settings as SettingsIcon, 
  Bell, 
  Search,
  Menu,
  X,
  Zap
} from 'lucide-react';
import { AgentFeedDashboard } from '@/components/AgentFeedDashboard';
import { BackgroundActivityPanel } from '@/components/BackgroundActivityPanel';
import { WorkflowStatusBar } from '@/components/WorkflowStatusBar';
import SocialMediaFeed from '@/components/SocialMediaFeed';
import { useBackgroundOrchestration } from '@/hooks/useBackgroundOrchestration-simple';
import { wsService } from '@/services/websocket';
import { cn } from '@/utils/cn';

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
  const { isConnected, updateCount, triggerOrchestration } = useBackgroundOrchestration();

  // Disable WebSocket for now to prevent errors
  // useEffect(() => {
  //   // Initialize WebSocket connection when app starts
  //   const initializeConnection = async () => {
  //     try {
  //       await wsService.connect();
  //     } catch (error) {
  //       console.error('Failed to initialize WebSocket connection:', error);
  //     }
  //   };

  //   initializeConnection();

  //   return () => {
  //     wsService.disconnect();
  //   };
  // }, []);

  const handleQuickOrchestration = async () => {
    try {
      const description = searchTerm || "Analyze system and optimize performance";
      await triggerOrchestration(description);
      setSearchTerm('');
    } catch (error) {
      console.error('Failed to trigger orchestration:', error);
    }
  };

  const navigation = [
    { name: 'Feed', href: '/', icon: Activity },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Workflows', href: '/workflows', icon: GitBranch },
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
            <span className="text-lg font-semibold text-gray-900">Agent Feed</span>
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
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) => cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                isActive
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              )}
              onClick={() => setIsSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Connection Status */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className={cn(
            "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm",
            isConnected ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
            )} />
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            {updateCount > 0 && (
              <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {updateCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-gray-400 hover:text-gray-600 lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <h1 className="text-xl font-semibold text-gray-900">
                AgentLink
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Quick Orchestration */}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Quick orchestration..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleQuickOrchestration()}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                  />
                </div>
                
                <button
                  onClick={handleQuickOrchestration}
                  disabled={!isConnected}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                    isConnected
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  )}
                >
                  Orchestrate
                </button>
              </div>

              {/* Notifications */}
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Bell className="w-5 h-5" />
                {updateCount > 0 && (
                  <span className="absolute -mt-1 -ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                    {updateCount > 99 ? '99+' : updateCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

// Settings placeholder component
const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600 mt-1">Configure your agent orchestration preferences</p>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WebSocket URL
            </label>
            <input
              type="url"
              defaultValue="ws://localhost:8000/ws"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Base URL
            </label>
            <input
              type="url"
              defaultValue="http://localhost:8000/api"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoConnect"
              defaultChecked
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="autoConnect" className="text-sm text-gray-700">
              Auto-connect on page load
            </label>
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
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<SocialMediaFeed />} />
            <Route path="/dashboard" element={<AgentFeedDashboard />} />
            <Route path="/workflows" element={<WorkflowStatusBar />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </Router>
    </QueryClientProvider>
  );
};

export default App;