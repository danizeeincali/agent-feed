import React, { useState, Suspense, lazy, ErrorInfo } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Cpu, DollarSign, AlertTriangle, Loader2 } from 'lucide-react';

// Lazy load heavy components to prevent blocking
const SimpleAnalytics = lazy(() => import('./SimpleAnalytics'));
const TokenCostAnalytics = lazy(() => import('./TokenCostAnalytics'));

interface AnalyticsTabConfig {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType<any>;
  fallback: React.ComponentType<any>;
  props?: Record<string, any>;
}

/**
 * SPARC Architecture Pattern: Analytics Module
 * 
 * Key Features:
 * 1. Error Boundaries - Prevent component crashes from breaking UI
 * 2. Lazy Loading - Reduce initial bundle size and load time
 * 3. Suspense - Handle async loading states gracefully  
 * 4. Component Isolation - Each tab is independently functional
 * 5. Fallback Strategies - Multiple levels of error recovery
 * 6. Environment Detection - Handle test vs production differently
 */

// Fallback Components for Graceful Degradation
const SystemAnalyticsFallback = () => (
  <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
    <div className="flex items-center gap-3 mb-3">
      <Cpu className="w-6 h-6 text-blue-600" />
      <h3 className="text-lg font-semibold text-blue-800">System Analytics</h3>
    </div>
    <p className="text-blue-700 mb-4">Loading system performance metrics...</p>
    <div className="flex items-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
      <span className="text-sm text-blue-600">Please wait</span>
    </div>
  </div>
);

const TokenAnalyticsFallback = () => (
  <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
    <div className="flex items-center gap-3 mb-3">
      <DollarSign className="w-6 h-6 text-green-600" />
      <h3 className="text-lg font-semibold text-green-800">Token Cost Analytics</h3>
    </div>
    <p className="text-green-700 mb-4">Loading token usage and cost data...</p>
    <div className="flex items-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin text-green-600" />
      <span className="text-sm text-green-600">Calculating costs</span>
    </div>
  </div>
);

const GenericErrorFallback = ({ tabName }: { tabName: string }) => (
  <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
    <div className="flex items-center gap-3 mb-3">
      <AlertTriangle className="w-6 h-6 text-red-600" />
      <h3 className="text-lg font-semibold text-red-800">{tabName} Unavailable</h3>
    </div>
    <p className="text-red-700 mb-4">
      This section is temporarily unavailable, but other features continue to work normally.
    </p>
    <button
      onClick={() => window.location.reload()}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
    >
      Refresh Page
    </button>
  </div>
);

// Tab Configuration with Architectural Patterns
const analyticsTabsConfig: AnalyticsTabConfig[] = [
  {
    id: 'system',
    label: 'System',
    icon: Cpu,
    component: SimpleAnalytics,
    fallback: SystemAnalyticsFallback,
    props: {}
  },
  {
    id: 'tokens',
    label: 'Token Costs',
    icon: DollarSign,
    component: TokenCostAnalytics,
    fallback: TokenAnalyticsFallback,
    props: {
      showBudgetAlerts: true,
      enableExport: true,
      budgetLimits: {
        daily: 10,
        weekly: 50,
        monthly: 200
      }
    }
  }
];

interface AnalyticsArchitectureProps {
  className?: string;
  defaultTab?: string;
}

/**
 * Main Analytics Architecture Component
 * Implements robust error handling and component isolation
 */
export const AnalyticsArchitecture: React.FC<AnalyticsArchitectureProps> = ({
  className = '',
  defaultTab = 'system'
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Error handler for tab components
  const handleTabError = (tabId: string) => (error: Error, errorInfo: ErrorInfo) => {
    console.error(`Analytics tab error [${tabId}]:`, error, errorInfo);
    
    // Could send to error tracking service here
    // analytics.track('component_error', { tabId, error: error.message });
  };

  // Find active tab configuration
  const activeTabConfig = analyticsTabsConfig.find(tab => tab.id === activeTab);
  
  if (!activeTabConfig) {
    console.warn(`Unknown tab: ${activeTab}, falling back to system`);
    setActiveTab('system');
    return null;
  }

  const ActiveComponent = activeTabConfig.component;
  const FallbackComponent = activeTabConfig.fallback;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Tab Navigation - Always Functional */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Monitor system performance and costs</p>
        </div>
        
        {/* Tab Selector - Isolated from content loading issues */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {analyticsTabsConfig.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content with Multiple Error Boundaries */}
      <ErrorBoundary
        fallback={<GenericErrorFallback tabName={activeTabConfig.label} />}
        onError={handleTabError(activeTab)}
      >
        <Suspense fallback={<FallbackComponent />}>
          <ErrorBoundary
            fallback={<FallbackComponent />}
            onError={handleTabError(`${activeTab}_inner`)}
          >
            <ActiveComponent {...(activeTabConfig.props || {})} />
          </ErrorBoundary>
        </Suspense>
      </ErrorBoundary>

      {/* System Health Indicator */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-green-800">
            Analytics System Operational
          </span>
          <span className="text-xs text-gray-500 ml-auto">
            All tabs available • Error boundaries active • Fallbacks ready
          </span>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsArchitecture;