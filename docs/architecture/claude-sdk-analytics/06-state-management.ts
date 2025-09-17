/**
 * Claude Code SDK Cost Tracking Analytics - State Management Patterns
 * Redux Toolkit and React Query integration for scalable state management
 */

import { createSlice, createAsyncThunk, configureStore, PayloadAction } from '@reduxjs/toolkit';
import { QueryClient, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSelector } from 'reselect';
import { SDKUsageEvent, UsageAnalytics, LiveMetrics, Alert } from './01-data-models';

// =============================================
// REDUX STATE STRUCTURE
// =============================================

export interface RootState {
  analytics: AnalyticsState;
  dashboard: DashboardState;
  alerts: AlertsState;
  user: UserState;
  realtime: RealtimeState;
}

export interface AnalyticsState {
  // Data State
  usageData: UsageAnalytics | null;
  costData: CostAnalytics | null;
  performanceData: PerformanceAnalytics | null;

  // Loading States
  loading: {
    usage: boolean;
    costs: boolean;
    performance: boolean;
    export: boolean;
  };

  // Error States
  errors: {
    usage: string | null;
    costs: string | null;
    performance: string | null;
  };

  // Query Parameters
  filters: AnalyticsFilters;
  timeRange: TimeRange;
  granularity: 'hour' | 'day' | 'week' | 'month';

  // Cache Metadata
  lastUpdated: string | null;
  cacheValidUntil: string | null;
}

export interface DashboardState {
  // UI State
  activeTab: DashboardTab;
  selectedMetrics: string[];
  chartTypes: Record<string, ChartType>;

  // Layout State
  layout: DashboardLayout[];
  customizations: DashboardCustomizations;

  // View State
  viewMode: 'standard' | 'compact' | 'detailed';
  autoRefresh: boolean;
  refreshInterval: number;

  // Preferences
  preferences: UserPreferences;
}

export interface AlertsState {
  // Active Alerts
  activeAlerts: Alert[];
  alertHistory: Alert[];

  // Configuration
  thresholds: AlertThreshold[];
  channels: NotificationChannel[];
  suppressionRules: SuppressionRule[];

  // Status
  enabled: boolean;
  lastCheck: string | null;

  // Subscription State
  subscriptions: AlertSubscription[];
}

export interface RealtimeState {
  // Connection State
  connected: boolean;
  lastHeartbeat: string | null;
  connectionId: string | null;

  // Live Data
  currentMetrics: LiveMetrics | null;
  recentEvents: SDKUsageEvent[];

  // Streaming State
  streamingEnabled: boolean;
  bufferSize: number;
  updateFrequency: number;
}

// =============================================
// ANALYTICS SLICE
// =============================================

// Async Thunks for Data Fetching
export const fetchUsageAnalytics = createAsyncThunk(
  'analytics/fetchUsage',
  async (params: { timeRange: TimeRange; filters: AnalyticsFilters }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/analytics/usage?${buildQueryParams(params)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const fetchCostAnalytics = createAsyncThunk(
  'analytics/fetchCosts',
  async (params: { timeRange: TimeRange; breakdown: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/analytics/costs?${buildQueryParams(params)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const exportAnalyticsData = createAsyncThunk(
  'analytics/export',
  async (params: { format: 'csv' | 'json' | 'pdf'; timeRange: TimeRange }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/analytics/export?${buildQueryParams(params)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (params.format === 'pdf') {
        const blob = await response.blob();
        return { blob, filename: `analytics-${Date.now()}.pdf` };
      } else {
        const text = await response.text();
        return { text, filename: `analytics-${Date.now()}.${params.format}` };
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Export failed');
    }
  }
);

// Analytics Slice
const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: {
    usageData: null,
    costData: null,
    performanceData: null,
    loading: { usage: false, costs: false, performance: false, export: false },
    errors: { usage: null, costs: null, performance: null },
    filters: getDefaultFilters(),
    timeRange: getDefaultTimeRange(),
    granularity: 'day' as const,
    lastUpdated: null,
    cacheValidUntil: null
  } as AnalyticsState,
  reducers: {
    // Filter Management
    updateFilters: (state, action: PayloadAction<Partial<AnalyticsFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    clearFilters: (state) => {
      state.filters = getDefaultFilters();
    },

    // Time Range Management
    setTimeRange: (state, action: PayloadAction<TimeRange>) => {
      state.timeRange = action.payload;
    },

    setGranularity: (state, action: PayloadAction<'hour' | 'day' | 'week' | 'month'>) => {
      state.granularity = action.payload;
    },

    // Error Handling
    clearErrors: (state) => {
      state.errors = { usage: null, costs: null, performance: null };
    },

    // Cache Management
    invalidateCache: (state) => {
      state.cacheValidUntil = null;
      state.lastUpdated = null;
    },

    updateCacheMetadata: (state, action: PayloadAction<{ validUntil: string }>) => {
      state.cacheValidUntil = action.payload.validUntil;
      state.lastUpdated = new Date().toISOString();
    }
  },
  extraReducers: (builder) => {
    // Usage Analytics
    builder
      .addCase(fetchUsageAnalytics.pending, (state) => {
        state.loading.usage = true;
        state.errors.usage = null;
      })
      .addCase(fetchUsageAnalytics.fulfilled, (state, action) => {
        state.loading.usage = false;
        state.usageData = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchUsageAnalytics.rejected, (state, action) => {
        state.loading.usage = false;
        state.errors.usage = action.payload as string;
      });

    // Cost Analytics
    builder
      .addCase(fetchCostAnalytics.pending, (state) => {
        state.loading.costs = true;
        state.errors.costs = null;
      })
      .addCase(fetchCostAnalytics.fulfilled, (state, action) => {
        state.loading.costs = false;
        state.costData = action.payload;
      })
      .addCase(fetchCostAnalytics.rejected, (state, action) => {
        state.loading.costs = false;
        state.errors.costs = action.payload as string;
      });

    // Export
    builder
      .addCase(exportAnalyticsData.pending, (state) => {
        state.loading.export = true;
      })
      .addCase(exportAnalyticsData.fulfilled, (state) => {
        state.loading.export = false;
      })
      .addCase(exportAnalyticsData.rejected, (state) => {
        state.loading.export = false;
      });
  }
});

// =============================================
// DASHBOARD SLICE
// =============================================

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    activeTab: 'overview' as DashboardTab,
    selectedMetrics: ['requests', 'tokens', 'cost', 'responseTime'],
    chartTypes: {
      usage: 'line',
      costs: 'pie',
      performance: 'bar'
    },
    layout: getDefaultLayout(),
    customizations: getDefaultCustomizations(),
    viewMode: 'standard' as const,
    autoRefresh: true,
    refreshInterval: 30000,
    preferences: getDefaultPreferences()
  } as DashboardState,
  reducers: {
    // Tab Management
    setActiveTab: (state, action: PayloadAction<DashboardTab>) => {
      state.activeTab = action.payload;
    },

    // Metrics Selection
    toggleMetric: (state, action: PayloadAction<string>) => {
      const metric = action.payload;
      if (state.selectedMetrics.includes(metric)) {
        state.selectedMetrics = state.selectedMetrics.filter(m => m !== metric);
      } else {
        state.selectedMetrics.push(metric);
      }
    },

    setSelectedMetrics: (state, action: PayloadAction<string[]>) => {
      state.selectedMetrics = action.payload;
    },

    // Chart Configuration
    setChartType: (state, action: PayloadAction<{ metric: string; type: ChartType }>) => {
      state.chartTypes[action.payload.metric] = action.payload.type;
    },

    // Layout Management
    updateLayout: (state, action: PayloadAction<DashboardLayout[]>) => {
      state.layout = action.payload;
    },

    resetLayout: (state) => {
      state.layout = getDefaultLayout();
    },

    // View Mode
    setViewMode: (state, action: PayloadAction<'standard' | 'compact' | 'detailed'>) => {
      state.viewMode = action.payload;
    },

    // Auto Refresh
    toggleAutoRefresh: (state) => {
      state.autoRefresh = !state.autoRefresh;
    },

    setRefreshInterval: (state, action: PayloadAction<number>) => {
      state.refreshInterval = action.payload;
    },

    // Preferences
    updatePreferences: (state, action: PayloadAction<Partial<UserPreferences>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    }
  }
});

// =============================================
// ALERTS SLICE
// =============================================

const alertsSlice = createSlice({
  name: 'alerts',
  initialState: {
    activeAlerts: [],
    alertHistory: [],
    thresholds: [],
    channels: [],
    suppressionRules: [],
    enabled: true,
    lastCheck: null,
    subscriptions: []
  } as AlertsState,
  reducers: {
    // Alert Management
    addAlert: (state, action: PayloadAction<Alert>) => {
      state.activeAlerts.unshift(action.payload);
      state.alertHistory.unshift(action.payload);

      // Keep only last 100 alerts in history
      if (state.alertHistory.length > 100) {
        state.alertHistory = state.alertHistory.slice(0, 100);
      }
    },

    acknowledgeAlert: (state, action: PayloadAction<{ alertId: string; userId: string }>) => {
      const alert = state.activeAlerts.find(a => a.id === action.payload.alertId);
      if (alert) {
        alert.status = 'acknowledged';
        alert.acknowledgedBy = action.payload.userId;
        alert.acknowledgedAt = new Date().toISOString();
      }
    },

    resolveAlert: (state, action: PayloadAction<{ alertId: string; userId: string; notes?: string }>) => {
      const alertIndex = state.activeAlerts.findIndex(a => a.id === action.payload.alertId);
      if (alertIndex !== -1) {
        const alert = state.activeAlerts[alertIndex];
        alert.status = 'resolved';
        alert.resolvedAt = new Date().toISOString();
        if (action.payload.notes) {
          alert.resolutionNotes = action.payload.notes;
        }

        // Remove from active alerts
        state.activeAlerts.splice(alertIndex, 1);
      }
    },

    dismissAlert: (state, action: PayloadAction<string>) => {
      state.activeAlerts = state.activeAlerts.filter(a => a.id !== action.payload);
    },

    // Configuration
    addThreshold: (state, action: PayloadAction<AlertThreshold>) => {
      state.thresholds.push(action.payload);
    },

    updateThreshold: (state, action: PayloadAction<{ id: string; updates: Partial<AlertThreshold> }>) => {
      const threshold = state.thresholds.find(t => t.id === action.payload.id);
      if (threshold) {
        Object.assign(threshold, action.payload.updates);
      }
    },

    removeThreshold: (state, action: PayloadAction<string>) => {
      state.thresholds = state.thresholds.filter(t => t.id !== action.payload);
    },

    // System Control
    enableAlerts: (state) => {
      state.enabled = true;
    },

    disableAlerts: (state) => {
      state.enabled = false;
    },

    updateLastCheck: (state) => {
      state.lastCheck = new Date().toISOString();
    }
  }
});

// =============================================
// REALTIME SLICE
// =============================================

const realtimeSlice = createSlice({
  name: 'realtime',
  initialState: {
    connected: false,
    lastHeartbeat: null,
    connectionId: null,
    currentMetrics: null,
    recentEvents: [],
    streamingEnabled: true,
    bufferSize: 50,
    updateFrequency: 5000
  } as RealtimeState,
  reducers: {
    // Connection Management
    setConnected: (state, action: PayloadAction<{ connected: boolean; connectionId?: string }>) => {
      state.connected = action.payload.connected;
      if (action.payload.connectionId) {
        state.connectionId = action.payload.connectionId;
      }
    },

    updateHeartbeat: (state) => {
      state.lastHeartbeat = new Date().toISOString();
    },

    // Metrics Updates
    updateLiveMetrics: (state, action: PayloadAction<LiveMetrics>) => {
      state.currentMetrics = action.payload;
    },

    // Event Management
    addRecentEvent: (state, action: PayloadAction<SDKUsageEvent>) => {
      state.recentEvents.unshift(action.payload);

      // Keep buffer size limited
      if (state.recentEvents.length > state.bufferSize) {
        state.recentEvents = state.recentEvents.slice(0, state.bufferSize);
      }
    },

    clearRecentEvents: (state) => {
      state.recentEvents = [];
    },

    // Configuration
    toggleStreaming: (state) => {
      state.streamingEnabled = !state.streamingEnabled;
    },

    setBufferSize: (state, action: PayloadAction<number>) => {
      state.bufferSize = action.payload;

      // Trim existing events if needed
      if (state.recentEvents.length > action.payload) {
        state.recentEvents = state.recentEvents.slice(0, action.payload);
      }
    },

    setUpdateFrequency: (state, action: PayloadAction<number>) => {
      state.updateFrequency = action.payload;
    }
  }
});

// =============================================
// SELECTORS
// =============================================

// Analytics Selectors
export const selectAnalyticsState = (state: RootState) => state.analytics;
export const selectUsageData = (state: RootState) => state.analytics.usageData;
export const selectCostData = (state: RootState) => state.analytics.costData;
export const selectAnalyticsLoading = (state: RootState) => state.analytics.loading;
export const selectAnalyticsErrors = (state: RootState) => state.analytics.errors;

// Dashboard Selectors
export const selectDashboardState = (state: RootState) => state.dashboard;
export const selectActiveTab = (state: RootState) => state.dashboard.activeTab;
export const selectSelectedMetrics = (state: RootState) => state.dashboard.selectedMetrics;
export const selectChartTypes = (state: RootState) => state.dashboard.chartTypes;

// Alert Selectors
export const selectActiveAlerts = (state: RootState) => state.alerts.activeAlerts;
export const selectCriticalAlerts = createSelector(
  [selectActiveAlerts],
  (alerts) => alerts.filter(alert => alert.severity === 'critical')
);
export const selectAlertCount = createSelector(
  [selectActiveAlerts],
  (alerts) => alerts.length
);

// Realtime Selectors
export const selectRealtimeState = (state: RootState) => state.realtime;
export const selectIsConnected = (state: RootState) => state.realtime.connected;
export const selectLiveMetrics = (state: RootState) => state.realtime.currentMetrics;
export const selectRecentEvents = (state: RootState) => state.realtime.recentEvents;

// Complex Selectors
export const selectDashboardData = createSelector(
  [selectUsageData, selectCostData, selectLiveMetrics, selectSelectedMetrics],
  (usage, costs, live, selectedMetrics) => ({
    usage,
    costs,
    live,
    selectedMetrics,
    hasData: !!(usage || costs || live)
  })
);

export const selectFilteredAlerts = createSelector(
  [selectActiveAlerts, (_, severity?: string) => severity],
  (alerts, severity) => {
    if (!severity) return alerts;
    return alerts.filter(alert => alert.severity === severity);
  }
);

// =============================================
// STORE CONFIGURATION
// =============================================

export const store = configureStore({
  reducer: {
    analytics: analyticsSlice.reducer,
    dashboard: dashboardSlice.reducer,
    alerts: alertsSlice.reducer,
    realtime: realtimeSlice.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST']
      }
    }),
  devTools: process.env.NODE_ENV !== 'production'
});

// =============================================
// REACT QUERY CONFIGURATION
// =============================================

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always'
    },
    mutations: {
      retry: 1
    }
  }
});

// =============================================
// CUSTOM HOOKS
// =============================================

// Analytics Data Hook
export const useAnalyticsData = (timeRange: TimeRange, filters: AnalyticsFilters) => {
  const queryKey = ['analytics', 'usage', timeRange, filters];

  return useQuery({
    queryKey,
    queryFn: () => fetchUsageAnalytics({ timeRange, filters }),
    staleTime: 2 * 60 * 1000, // 2 minutes for analytics data
    enabled: !!(timeRange.startDate && timeRange.endDate)
  });
};

// Cost Analytics Hook
export const useCostAnalytics = (timeRange: TimeRange, breakdown: string) => {
  return useQuery({
    queryKey: ['analytics', 'costs', timeRange, breakdown],
    queryFn: () => fetchCostAnalytics({ timeRange, breakdown }),
    staleTime: 5 * 60 * 1000 // 5 minutes for cost data
  });
};

// Real-time Metrics Hook
export const useLiveMetrics = () => {
  return useQuery({
    queryKey: ['analytics', 'live'],
    queryFn: () => fetch('/api/analytics/live').then(res => res.json()),
    refetchInterval: 5000, // Update every 5 seconds
    refetchIntervalInBackground: true
  });
};

// Alert Management Hook
export const useAlertActions = () => {
  const queryClient = useQueryClient();

  const acknowledgeAlert = useMutation({
    mutationFn: ({ alertId, userId }: { alertId: string; userId: string }) =>
      fetch(`/api/analytics/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    }
  });

  const resolveAlert = useMutation({
    mutationFn: ({ alertId, userId, notes }: { alertId: string; userId: string; notes?: string }) =>
      fetch(`/api/analytics/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notes })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    }
  });

  return { acknowledgeAlert, resolveAlert };
};

// Export Actions
export const {
  updateFilters,
  clearFilters,
  setTimeRange,
  setGranularity,
  clearErrors,
  invalidateCache
} = analyticsSlice.actions;

export const {
  setActiveTab,
  toggleMetric,
  setSelectedMetrics,
  setChartType,
  updateLayout,
  resetLayout,
  setViewMode,
  toggleAutoRefresh,
  setRefreshInterval,
  updatePreferences
} = dashboardSlice.actions;

export const {
  addAlert,
  acknowledgeAlert,
  resolveAlert,
  dismissAlert,
  addThreshold,
  updateThreshold,
  removeThreshold,
  enableAlerts,
  disableAlerts
} = alertsSlice.actions;

export const {
  setConnected,
  updateHeartbeat,
  updateLiveMetrics,
  addRecentEvent,
  clearRecentEvents,
  toggleStreaming,
  setBufferSize,
  setUpdateFrequency
} = realtimeSlice.actions;

// =============================================
// UTILITY FUNCTIONS
// =============================================

function buildQueryParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object') {
        searchParams.append(key, JSON.stringify(value));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  return searchParams.toString();
}

function getDefaultFilters(): AnalyticsFilters {
  return {
    userId: undefined,
    model: undefined,
    feature: undefined,
    region: undefined,
    minCost: undefined,
    maxCost: undefined
  };
}

function getDefaultTimeRange(): TimeRange {
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  return {
    startDate: sevenDaysAgo,
    endDate: now
  };
}

function getDefaultLayout(): DashboardLayout[] {
  return [
    { id: 'metrics', x: 0, y: 0, w: 12, h: 2 },
    { id: 'usage-trends', x: 0, y: 2, w: 8, h: 4 },
    { id: 'cost-breakdown', x: 8, y: 2, w: 4, h: 4 },
    { id: 'performance', x: 0, y: 6, w: 6, h: 3 },
    { id: 'top-tools', x: 6, y: 6, w: 6, h: 3 }
  ];
}

function getDefaultCustomizations(): DashboardCustomizations {
  return {
    theme: 'light',
    colorScheme: 'default',
    showGrid: true,
    showLegends: true,
    animations: true
  };
}

function getDefaultPreferences(): UserPreferences {
  return {
    defaultTimeRange: '7d',
    defaultGranularity: 'day',
    preferredCharts: ['line', 'bar'],
    emailNotifications: true,
    browserNotifications: false,
    compactMode: false
  };
}

// Type Definitions
export type DashboardTab = 'overview' | 'costs' | 'performance' | 'users' | 'alerts';
export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'scatter';

export interface AnalyticsFilters {
  userId?: string;
  model?: string;
  feature?: string;
  region?: string;
  minCost?: number;
  maxCost?: number;
}

export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

export interface DashboardLayout {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardCustomizations {
  theme: 'light' | 'dark';
  colorScheme: string;
  showGrid: boolean;
  showLegends: boolean;
  animations: boolean;
}

export interface UserPreferences {
  defaultTimeRange: string;
  defaultGranularity: string;
  preferredCharts: string[];
  emailNotifications: boolean;
  browserNotifications: boolean;
  compactMode: boolean;
}

export interface AlertThreshold {
  id: string;
  metric: string;
  operator: string;
  value: number;
  severity: string;
  enabled: boolean;
}

export interface NotificationChannel {
  id: string;
  type: string;
  config: Record<string, any>;
  enabled: boolean;
}

export interface SuppressionRule {
  id: string;
  pattern: string;
  duration: number;
  enabled: boolean;
}

export interface AlertSubscription {
  id: string;
  userId: string;
  channels: string[];
  filters: Record<string, any>;
}