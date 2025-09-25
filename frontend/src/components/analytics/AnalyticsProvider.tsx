import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AnalyticsDashboardState, RealTimeUpdate } from '../types/analytics';

interface AnalyticsContextType {
  state: AnalyticsDashboardState;
  updateState: (updates: Partial<AnalyticsDashboardState>) => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  refreshData: () => void;
  lastUpdate: Date | null;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

interface AnalyticsProviderProps {
  children: ReactNode;
  initialState?: Partial<AnalyticsDashboardState>;
  enableRealTime?: boolean;
  refreshInterval?: number;
}

const defaultState: AnalyticsDashboardState = {
  timeRange: '24h',
  selectedMetrics: ['cost', 'tokens', 'messages', 'steps'],
  refreshInterval: 30000,
  autoRefresh: true,
  showOptimizations: true,
  budgetAlerts: []
};

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({
  children,
  initialState = {},
  enableRealTime = true,
  refreshInterval = 30000
}) => {
  const [state, setState] = useState<AnalyticsDashboardState>({
    ...defaultState,
    ...initialState
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const updateState = (updates: Partial<AnalyticsDashboardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const clearError = () => {
    setError(null);
  };

  const refreshData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!state.autoRefresh || !enableRealTime) return;

    const interval = setInterval(() => {
      refreshData();
    }, state.refreshInterval);

    return () => clearInterval(interval);
  }, [state.autoRefresh, state.refreshInterval, enableRealTime]);

  // Initial data load
  useEffect(() => {
    refreshData();
  }, []);

  const contextValue: AnalyticsContextType = {
    state,
    updateState,
    isLoading,
    error,
    clearError,
    refreshData,
    lastUpdate
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = (): AnalyticsContextType => {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};

// HOC for automatic analytics provider wrapping
export const withAnalyticsProvider = <P extends object>(
  Component: React.ComponentType<P>,
  providerProps?: Omit<AnalyticsProviderProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <AnalyticsProvider {...providerProps}>
      <Component {...props} />
    </AnalyticsProvider>
  );
  
  WrappedComponent.displayName = `withAnalyticsProvider(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};
