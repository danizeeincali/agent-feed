# Token Cost Analytics Component Specifications

## Component Architecture Overview

This document provides detailed specifications for implementing the token cost analytics components, extending the existing SystemAnalytics patterns with specialized token tracking capabilities.

## Core TypeScript Interfaces

```typescript
// /src/types/token-cost.ts
export interface TokenUsage {
  id: string;
  timestamp: string;
  service: 'claude' | 'openai' | 'mcp' | 'claude-flow' | 'anthropic';
  operation: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  actualCost?: number;
  userId?: string;
  agentId?: string;
  sessionId: string;
  requestId?: string;
  metadata?: {
    endpoint?: string;
    responseTime?: number;
    toolsUsed?: string[];
    messageType?: string;
    contextSize?: number;
    [key: string]: any;
  };
}

export interface CostRate {
  service: string;
  model: string;
  inputCostPerToken: number;
  outputCostPerToken: number;
  currency: string;
  effectiveDate: string;
  rateLimit?: {
    tokensPerMinute: number;
    tokensPerHour: number;
    tokensPerDay: number;
  };
}

export interface BudgetConfiguration {
  id: string;
  name: string;
  userId?: string;
  totalBudget: number;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  services: string[];
  models?: string[];
  alertThresholds: {
    warning: number; // percentage (0-100)
    critical: number; // percentage (0-100)
  };
  autoShutoff: boolean;
  autoShutoffThreshold: number; // percentage (0-100)
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetAlert {
  id: string;
  budgetId: string;
  type: 'warning' | 'critical' | 'limit_exceeded' | 'auto_shutoff';
  currentSpend: number;
  budgetLimit: number;
  percentageUsed: number;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  message: string;
  actions?: string[]; // Recommended actions
}

export interface TokenCostMetrics {
  timestamp: string;
  period: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  
  // Overall metrics
  totalCost: number;
  totalTokens: number;
  totalOperations: number;
  
  // Breakdown by service
  serviceBreakdown: {
    [service: string]: {
      cost: number;
      tokens: number;
      inputTokens: number;
      outputTokens: number;
      operations: number;
      avgCostPerOperation: number;
      avgTokensPerOperation: number;
    };
  };
  
  // Breakdown by model
  modelBreakdown: {
    [model: string]: {
      cost: number;
      inputTokens: number;
      outputTokens: number;
      operations: number;
      efficiency: number; // tokens per dollar
    };
  };
  
  // Time-based spending
  currentPeriodSpend: number;
  previousPeriodSpend: number;
  trendPercentage: number; // percentage change from previous period
  
  // Performance metrics
  efficiency: {
    costPerOperation: number;
    tokensPerOperation: number;
    avgResponseTime: number;
    errorRate: number;
  };
  
  // Projections
  projections?: {
    endOfPeriodSpend: number;
    monthlySpendRate: number;
    annualSpendProjection: number;
  };
}

export interface TokenCostFilter {
  timeRange: '1h' | '24h' | '7d' | '30d' | 'custom';
  customStart?: string;
  customEnd?: string;
  services?: string[];
  models?: string[];
  operations?: string[];
  userId?: string;
  agentId?: string;
  minCost?: number;
  maxCost?: number;
}

export interface CostOptimizationSuggestion {
  id: string;
  type: 'model_switch' | 'prompt_optimization' | 'batch_requests' | 'caching' | 'rate_limiting';
  title: string;
  description: string;
  estimatedSavings: number;
  impact: 'low' | 'medium' | 'high';
  difficulty: 'easy' | 'medium' | 'hard';
  actions: string[];
}
```

## Custom Hooks

### 1. useTokenCostTracking

```typescript
// /src/hooks/useTokenCostTracking.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocketSingletonContext } from '@/context/WebSocketSingletonContext';
import { TokenUsage, TokenCostMetrics } from '@/types/token-cost';

interface UseTokenCostTrackingOptions {
  autoTrack?: boolean;
  bufferSize?: number;
  flushInterval?: number;
  enableRealTimeUpdates?: boolean;
  enablePersistence?: boolean;
}

interface UseTokenCostTrackingReturn {
  // Current session data
  currentSession: TokenUsage[];
  totalCost: number;
  totalTokens: number;
  operationCount: number;
  
  // Real-time metrics
  currentHourCost: number;
  currentDayCost: number;
  realtimeMetrics: TokenCostMetrics | null;
  
  // Tracking controls
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  clearSession: () => void;
  
  // Manual tracking
  trackTokenUsage: (usage: Omit<TokenUsage, 'id' | 'timestamp'>) => void;
  trackBatchUsage: (usages: Omit<TokenUsage, 'id' | 'timestamp'>[]) => void;
  
  // Data export
  exportSession: (format?: 'json' | 'csv') => void;
  getSessionSummary: () => {
    totalCost: number;
    totalTokens: number;
    operationCount: number;
    serviceBreakdown: Record<string, any>;
    timeRange: { start: string; end: string };
  };
  
  // WebSocket status
  isConnected: boolean;
  connectionError: string | null;
}

export const useTokenCostTracking = (
  options: UseTokenCostTrackingOptions = {}
): UseTokenCostTrackingReturn => {
  const {
    autoTrack = true,
    bufferSize = 50,
    flushInterval = 2000,
    enableRealTimeUpdates = true,
    enablePersistence = true
  } = options;

  const wsContext = useWebSocketSingletonContext();
  const [currentSession, setCurrentSession] = useState<TokenUsage[]>([]);
  const [isTracking, setIsTracking] = useState(autoTrack);
  const [realtimeMetrics, setRealtimeMetrics] = useState<TokenCostMetrics | null>(null);
  
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bufferRef = useRef<TokenUsage[]>([]);

  // Calculate derived metrics
  const totalCost = currentSession.reduce((sum, usage) => sum + usage.estimatedCost, 0);
  const totalTokens = currentSession.reduce((sum, usage) => sum + usage.totalTokens, 0);
  const operationCount = currentSession.length;

  // Calculate time-based costs
  const now = new Date();
  const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const currentHourCost = currentSession
    .filter(usage => new Date(usage.timestamp) >= hourStart)
    .reduce((sum, usage) => sum + usage.estimatedCost, 0);

  const currentDayCost = currentSession
    .filter(usage => new Date(usage.timestamp) >= dayStart)
    .reduce((sum, usage) => sum + usage.estimatedCost, 0);

  // Track token usage
  const trackTokenUsage = useCallback((usage: Omit<TokenUsage, 'id' | 'timestamp'>) => {
    if (!isTracking) return;

    const newUsage: TokenUsage = {
      ...usage,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    setCurrentSession(prev => [...prev, newUsage]);
    bufferRef.current.push(newUsage);

    // Flush buffer if it's full
    if (bufferRef.current.length >= bufferSize) {
      flushBuffer();
    } else if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(flushBuffer, flushInterval);
    }

    // Persist to localStorage if enabled
    if (enablePersistence) {
      persistSession([...currentSession, newUsage]);
    }
  }, [isTracking, bufferSize, flushInterval, enablePersistence, currentSession]);

  // Batch tracking
  const trackBatchUsage = useCallback((usages: Omit<TokenUsage, 'id' | 'timestamp'>[]) => {
    const newUsages = usages.map(usage => ({
      ...usage,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    }));

    setCurrentSession(prev => [...prev, ...newUsages]);
    bufferRef.current.push(...newUsages);
    
    flushBuffer(); // Immediately flush batch operations
  }, []);

  // Flush buffer to WebSocket
  const flushBuffer = useCallback(() => {
    if (bufferRef.current.length === 0) return;

    const batch = [...bufferRef.current];
    bufferRef.current = [];

    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    // Send batch via WebSocket
    if (wsContext.isConnected && enableRealTimeUpdates) {
      wsContext.emit('token_usage_batch', {
        usage: batch,
        timestamp: new Date().toISOString(),
        sessionId: generateSessionId()
      });
    }
  }, [wsContext, enableRealTimeUpdates]);

  // Tracking controls
  const startTracking = useCallback(() => setIsTracking(true), []);
  const stopTracking = useCallback(() => {
    setIsTracking(false);
    flushBuffer();
  }, [flushBuffer]);

  const clearSession = useCallback(() => {
    setCurrentSession([]);
    bufferRef.current = [];
    if (enablePersistence) {
      localStorage.removeItem('tokenCostSession');
    }
  }, [enablePersistence]);

  // Export functions
  const exportSession = useCallback((format: 'json' | 'csv' = 'json') => {
    const data = getSessionSummary();
    
    if (format === 'json') {
      downloadJSON(data, `token-cost-session-${new Date().toISOString().split('T')[0]}.json`);
    } else {
      downloadCSV(currentSession, `token-cost-session-${new Date().toISOString().split('T')[0]}.csv`);
    }
  }, [currentSession]);

  const getSessionSummary = useCallback(() => {
    const serviceBreakdown = currentSession.reduce((acc, usage) => {
      if (!acc[usage.service]) {
        acc[usage.service] = {
          cost: 0,
          tokens: 0,
          operations: 0,
          models: new Set()
        };
      }
      
      acc[usage.service].cost += usage.estimatedCost;
      acc[usage.service].tokens += usage.totalTokens;
      acc[usage.service].operations += 1;
      acc[usage.service].models.add(usage.model);
      
      return acc;
    }, {} as Record<string, any>);

    // Convert Sets to arrays for JSON serialization
    Object.values(serviceBreakdown).forEach((breakdown: any) => {
      breakdown.models = Array.from(breakdown.models);
    });

    const timestamps = currentSession.map(u => u.timestamp).sort();
    const timeRange = {
      start: timestamps[0] || new Date().toISOString(),
      end: timestamps[timestamps.length - 1] || new Date().toISOString()
    };

    return {
      totalCost,
      totalTokens,
      operationCount,
      serviceBreakdown,
      timeRange
    };
  }, [currentSession, totalCost, totalTokens, operationCount]);

  // WebSocket event handlers
  useEffect(() => {
    if (!enableRealTimeUpdates) return;

    const handleMetricsUpdate = (metrics: TokenCostMetrics) => {
      setRealtimeMetrics(metrics);
    };

    wsContext.subscribe('token_cost_metrics_update', handleMetricsUpdate);

    return () => {
      wsContext.unsubscribe('token_cost_metrics_update', handleMetricsUpdate);
    };
  }, [wsContext, enableRealTimeUpdates]);

  // Load persisted session on mount
  useEffect(() => {
    if (enablePersistence) {
      loadPersistedSession();
    }
  }, [enablePersistence]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
      }
      flushBuffer();
    };
  }, [flushBuffer]);

  // Helper functions
  const generateSessionId = () => {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const persistSession = (session: TokenUsage[]) => {
    try {
      localStorage.setItem('tokenCostSession', JSON.stringify(session));
    } catch (error) {
      console.warn('Failed to persist token cost session:', error);
    }
  };

  const loadPersistedSession = () => {
    try {
      const stored = localStorage.getItem('tokenCostSession');
      if (stored) {
        const session = JSON.parse(stored);
        setCurrentSession(session);
      }
    } catch (error) {
      console.warn('Failed to load persisted session:', error);
    }
  };

  const downloadJSON = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCSV = (data: TokenUsage[], filename: string) => {
    const headers = ['timestamp', 'service', 'operation', 'model', 'inputTokens', 'outputTokens', 'totalTokens', 'estimatedCost'];
    const csvContent = [
      headers.join(','),
      ...data.map(usage => [
        usage.timestamp,
        usage.service,
        usage.operation,
        usage.model,
        usage.inputTokens,
        usage.outputTokens,
        usage.totalTokens,
        usage.estimatedCost
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    currentSession,
    totalCost,
    totalTokens,
    operationCount,
    currentHourCost,
    currentDayCost,
    realtimeMetrics,
    isTracking,
    startTracking,
    stopTracking,
    clearSession,
    trackTokenUsage,
    trackBatchUsage,
    exportSession,
    getSessionSummary,
    isConnected: wsContext.isConnected,
    connectionError: wsContext.connectionError
  };
};
```

### 2. useBudgetManagement

```typescript
// /src/hooks/useBudgetManagement.ts
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BudgetConfiguration, BudgetAlert, TokenCostMetrics } from '@/types/token-cost';
import { tokenCostApiService } from '@/services/tokenCostApiService';

interface UseBudgetManagementReturn {
  // Budget data
  budgets: BudgetConfiguration[];
  activeBudget: BudgetConfiguration | null;
  alerts: BudgetAlert[];
  
  // Current status
  currentSpend: number;
  remainingBudget: number;
  percentageUsed: number;
  isOverBudget: boolean;
  isApproachingLimit: boolean;
  
  // Budget operations
  createBudget: (budget: Omit<BudgetConfiguration, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBudget: (id: string, updates: Partial<BudgetConfiguration>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  activateBudget: (id: string) => Promise<void>;
  deactivateBudget: (id: string) => Promise<void>;
  
  // Alert operations
  acknowledgeAlert: (alertId: string) => Promise<void>;
  dismissAlert: (alertId: string) => Promise<void>;
  
  // Budget checking
  checkBudgetStatus: () => Promise<void>;
  validateBudgetExceeded: (additionalCost: number) => boolean;
  
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  
  // Errors
  error: string | null;
}

export const useBudgetManagement = (): UseBudgetManagementReturn => {
  const queryClient = useQueryClient();
  const [currentSpend, setCurrentSpend] = useState(0);
  
  // Fetch budgets
  const { 
    data: budgets = [], 
    isLoading: isBudgetsLoading,
    error: budgetsError 
  } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => tokenCostApiService.getBudgets(),
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch alerts
  const { 
    data: alerts = [],
    isLoading: isAlertsLoading 
  } = useQuery({
    queryKey: ['budget-alerts'],
    queryFn: () => tokenCostApiService.getBudgetAlerts(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch current spend
  const { data: spendData } = useQuery({
    queryKey: ['current-spend'],
    queryFn: () => tokenCostApiService.getCurrentSpend(),
    refetchInterval: 10000, // Refetch every 10 seconds
    onSuccess: (data) => setCurrentSpend(data.totalSpend || 0)
  });

  // Create budget mutation
  const createBudgetMutation = useMutation({
    mutationFn: (budget: Omit<BudgetConfiguration, 'id' | 'createdAt' | 'updatedAt'>) =>
      tokenCostApiService.createBudget(budget),
    onSuccess: () => {
      queryClient.invalidateQueries(['budgets']);
    }
  });

  // Update budget mutation
  const updateBudgetMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<BudgetConfiguration> }) =>
      tokenCostApiService.updateBudget(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['budgets']);
    }
  });

  // Delete budget mutation
  const deleteBudgetMutation = useMutation({
    mutationFn: (id: string) => tokenCostApiService.deleteBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['budgets']);
    }
  });

  // Acknowledge alert mutation
  const acknowledgeAlertMutation = useMutation({
    mutationFn: (alertId: string) => tokenCostApiService.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries(['budget-alerts']);
    }
  });

  // Calculate derived values
  const activeBudget = budgets.find(budget => budget.isActive) || null;
  const remainingBudget = activeBudget ? Math.max(0, activeBudget.totalBudget - currentSpend) : 0;
  const percentageUsed = activeBudget ? Math.min(100, (currentSpend / activeBudget.totalBudget) * 100) : 0;
  const isOverBudget = percentageUsed >= 100;
  const isApproachingLimit = percentageUsed >= (activeBudget?.alertThresholds.warning || 75);

  // Budget operations
  const createBudget = useCallback(async (budget: Omit<BudgetConfiguration, 'id' | 'createdAt' | 'updatedAt'>) => {
    await createBudgetMutation.mutateAsync(budget);
  }, [createBudgetMutation]);

  const updateBudget = useCallback(async (id: string, updates: Partial<BudgetConfiguration>) => {
    await updateBudgetMutation.mutateAsync({ id, updates });
  }, [updateBudgetMutation]);

  const deleteBudget = useCallback(async (id: string) => {
    await deleteBudgetMutation.mutateAsync(id);
  }, [deleteBudgetMutation]);

  const activateBudget = useCallback(async (id: string) => {
    // Deactivate all other budgets first
    const updatePromises = budgets
      .filter(budget => budget.id !== id && budget.isActive)
      .map(budget => updateBudget(budget.id, { isActive: false }));
    
    await Promise.all(updatePromises);
    await updateBudget(id, { isActive: true });
  }, [budgets, updateBudget]);

  const deactivateBudget = useCallback(async (id: string) => {
    await updateBudget(id, { isActive: false });
  }, [updateBudget]);

  // Alert operations
  const acknowledgeAlert = useCallback(async (alertId: string) => {
    await acknowledgeAlertMutation.mutateAsync(alertId);
  }, [acknowledgeAlertMutation]);

  const dismissAlert = useCallback(async (alertId: string) => {
    await acknowledgeAlert(alertId);
  }, [acknowledgeAlert]);

  // Budget validation
  const validateBudgetExceeded = useCallback((additionalCost: number): boolean => {
    if (!activeBudget) return false;
    return (currentSpend + additionalCost) > activeBudget.totalBudget;
  }, [activeBudget, currentSpend]);

  const checkBudgetStatus = useCallback(async () => {
    if (!activeBudget) return;

    const warningThreshold = (activeBudget.totalBudget * activeBudget.alertThresholds.warning) / 100;
    const criticalThreshold = (activeBudget.totalBudget * activeBudget.alertThresholds.critical) / 100;

    if (currentSpend >= criticalThreshold) {
      // Trigger critical alert
      console.warn('Budget critical threshold reached:', {
        budget: activeBudget.name,
        currentSpend,
        threshold: criticalThreshold,
        percentage: percentageUsed
      });
    } else if (currentSpend >= warningThreshold) {
      // Trigger warning alert
      console.warn('Budget warning threshold reached:', {
        budget: activeBudget.name,
        currentSpend,
        threshold: warningThreshold,
        percentage: percentageUsed
      });
    }

    // Auto-shutoff check
    if (activeBudget.autoShutoff && percentageUsed >= activeBudget.autoShutoffThreshold) {
      console.error('Auto-shutoff threshold reached:', {
        budget: activeBudget.name,
        percentage: percentageUsed,
        threshold: activeBudget.autoShutoffThreshold
      });
      // TODO: Implement auto-shutoff logic
    }
  }, [activeBudget, currentSpend, percentageUsed]);

  // Check budget status when spend changes
  useEffect(() => {
    checkBudgetStatus();
  }, [checkBudgetStatus, currentSpend]);

  const isLoading = isBudgetsLoading || isAlertsLoading;
  const error = budgetsError?.message || null;

  return {
    budgets,
    activeBudget,
    alerts,
    currentSpend,
    remainingBudget,
    percentageUsed,
    isOverBudget,
    isApproachingLimit,
    createBudget,
    updateBudget,
    deleteBudget,
    activateBudget,
    deactivateBudget,
    acknowledgeAlert,
    dismissAlert,
    checkBudgetStatus,
    validateBudgetExceeded,
    isLoading,
    isCreating: createBudgetMutation.isLoading,
    isUpdating: updateBudgetMutation.isLoading,
    isDeleting: deleteBudgetMutation.isLoading,
    error
  };
};
```

### 3. useTokenCostMetrics

```typescript
// /src/hooks/useTokenCostMetrics.ts
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWebSocketSingletonContext } from '@/context/WebSocketSingletonContext';
import { TokenCostMetrics, TokenCostFilter, CostOptimizationSuggestion } from '@/types/token-cost';
import { tokenCostApiService } from '@/services/tokenCostApiService';

interface UseTokenCostMetricsOptions {
  defaultTimeRange?: '1h' | '24h' | '7d' | '30d';
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealTimeUpdates?: boolean;
}

interface UseTokenCostMetricsReturn {
  // Current metrics
  metrics: TokenCostMetrics | null;
  historicalData: TokenCostMetrics[];
  
  // Filtering
  filter: TokenCostFilter;
  setFilter: (filter: Partial<TokenCostFilter>) => void;
  resetFilter: () => void;
  
  // Optimization suggestions
  suggestions: CostOptimizationSuggestion[];
  
  // Data operations
  refetch: () => void;
  exportMetrics: (timeRange?: string, format?: 'json' | 'csv') => void;
  
  // Comparison data
  periodComparison: {
    current: TokenCostMetrics | null;
    previous: TokenCostMetrics | null;
    percentageChange: number;
  } | null;
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  
  // Real-time updates
  isRealTimeConnected: boolean;
  lastUpdateTime: string | null;
}

export const useTokenCostMetrics = (
  options: UseTokenCostMetricsOptions = {}
): UseTokenCostMetricsReturn => {
  const {
    defaultTimeRange = '24h',
    autoRefresh = true,
    refreshInterval = 30000,
    enableRealTimeUpdates = true
  } = options;

  const wsContext = useWebSocketSingletonContext();
  const [filter, setFilterState] = useState<TokenCostFilter>({
    timeRange: defaultTimeRange
  });
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);

  // Fetch current metrics
  const { 
    data: metrics = null, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['token-cost-metrics', filter],
    queryFn: () => tokenCostApiService.getMetrics(filter),
    refetchInterval: autoRefresh ? refreshInterval : false,
    keepPreviousData: true
  });

  // Fetch historical data for trends
  const { data: historicalData = [] } = useQuery({
    queryKey: ['token-cost-historical', filter.timeRange],
    queryFn: () => tokenCostApiService.getHistoricalMetrics(filter.timeRange),
    enabled: !!filter.timeRange,
    keepPreviousData: true
  });

  // Fetch optimization suggestions
  const { data: suggestions = [] } = useQuery({
    queryKey: ['cost-optimization-suggestions', filter.timeRange],
    queryFn: () => tokenCostApiService.getOptimizationSuggestions(filter),
    refetchInterval: 300000, // Refetch every 5 minutes
    keepPreviousData: true
  });

  // Calculate period comparison
  const periodComparison = useMemo(() => {
    if (historicalData.length < 2) return null;

    const current = historicalData[0];
    const previous = historicalData[1];
    
    if (!current || !previous) return null;

    const percentageChange = previous.totalCost > 0 
      ? ((current.totalCost - previous.totalCost) / previous.totalCost) * 100 
      : 0;

    return {
      current,
      previous,
      percentageChange
    };
  }, [historicalData]);

  // Filter management
  const setFilter = useCallback((newFilter: Partial<TokenCostFilter>) => {
    setFilterState(prev => ({ ...prev, ...newFilter }));
  }, []);

  const resetFilter = useCallback(() => {
    setFilterState({ timeRange: defaultTimeRange });
  }, [defaultTimeRange]);

  // Export functionality
  const exportMetrics = useCallback((timeRange?: string, format: 'json' | 'csv' = 'json') => {
    const exportFilter = timeRange ? { ...filter, timeRange } : filter;
    
    const data = {
      filter: exportFilter,
      metrics,
      historicalData,
      suggestions,
      exportedAt: new Date().toISOString()
    };

    const filename = `token-cost-metrics-${exportFilter.timeRange}-${new Date().toISOString().split('T')[0]}`;

    if (format === 'json') {
      downloadJSON(data, `${filename}.json`);
    } else {
      // Convert to CSV format
      const csvData = historicalData.map(metric => ({
        timestamp: metric.timestamp,
        period: metric.period,
        totalCost: metric.totalCost,
        totalTokens: metric.totalTokens,
        totalOperations: metric.totalOperations,
        costPerOperation: metric.efficiency.costPerOperation,
        tokensPerOperation: metric.efficiency.tokensPerOperation,
        avgResponseTime: metric.efficiency.avgResponseTime,
        errorRate: metric.efficiency.errorRate
      }));
      
      downloadCSV(csvData, `${filename}.csv`);
    }
  }, [filter, metrics, historicalData, suggestions]);

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!enableRealTimeUpdates) return;

    const handleMetricsUpdate = (updatedMetrics: TokenCostMetrics) => {
      setLastUpdateTime(new Date().toISOString());
      // Trigger refetch to get updated data
      refetch();
    };

    wsContext.subscribe('token_cost_metrics_update', handleMetricsUpdate);

    return () => {
      wsContext.unsubscribe('token_cost_metrics_update', handleMetricsUpdate);
    };
  }, [wsContext, enableRealTimeUpdates, refetch]);

  // Helper functions
  const downloadJSON = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(key => row[key]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    metrics,
    historicalData,
    filter,
    setFilter,
    resetFilter,
    suggestions,
    refetch,
    exportMetrics,
    periodComparison,
    isLoading,
    error: error?.message || null,
    isRealTimeConnected: wsContext.isConnected,
    lastUpdateTime
  };
};
```

## Component Specifications

### 1. TokenCostDashboard Component

```typescript
// /src/components/token-cost/TokenCostDashboard.tsx
import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Clock,
  BarChart3,
  PieChart,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useTokenCostMetrics } from '@/hooks/useTokenCostMetrics';
import { useBudgetManagement } from '@/hooks/useBudgetManagement';
import { TokenCostMetrics } from '@/types/token-cost';

interface TokenCostDashboardProps {
  className?: string;
  showBudgetInfo?: boolean;
  enableExport?: boolean;
}

export const TokenCostDashboard: React.FC<TokenCostDashboardProps> = ({
  className,
  showBudgetInfo = true,
  enableExport = true
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [selectedView, setSelectedView] = useState<'overview' | 'breakdown' | 'trends'>('overview');
  
  const {
    metrics,
    historicalData,
    filter,
    setFilter,
    refetch,
    exportMetrics,
    periodComparison,
    isLoading,
    error,
    isRealTimeConnected,
    lastUpdateTime
  } = useTokenCostMetrics({
    defaultTimeRange: selectedTimeRange,
    enableRealTimeUpdates: true
  });

  const {
    activeBudget,
    currentSpend,
    remainingBudget,
    percentageUsed,
    isOverBudget,
    isApproachingLimit
  } = useBudgetManagement();

  // Handle time range changes
  const handleTimeRangeChange = (timeRange: '1h' | '24h' | '7d' | '30d') => {
    setSelectedTimeRange(timeRange);
    setFilter({ timeRange });
  };

  // Calculate trend indicators
  const getTrendIndicator = (current: number, previous: number) => {
    if (previous === 0) return { icon: CheckCircle, color: 'text-gray-500', text: 'No data' };
    
    const change = ((current - previous) / previous) * 100;
    const isPositive = change > 0;
    
    return {
      icon: isPositive ? TrendingUp : TrendingDown,
      color: isPositive ? 'text-red-500' : 'text-green-500',
      text: `${Math.abs(change).toFixed(1)}% ${isPositive ? 'increase' : 'decrease'}`
    };
  };

  // Render loading state
  if (isLoading && !metrics) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border p-6">
                <div className="h-6 bg-gray-200 rounded mb-3"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <h3 className="text-sm font-medium text-red-800">Error loading token cost data</h3>
          </div>
          <p className="text-sm text-red-600 mt-1">{error}</p>
          <button
            onClick={() => refetch()}
            className="mt-3 inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center">
            <DollarSign className="w-8 h-8 mr-3 text-green-600" />
            Token Cost Analytics
          </h2>
          <p className="text-gray-600 mt-1">
            Real-time token usage and cost monitoring
            {lastUpdateTime && (
              <span className="ml-2 text-xs">
                Last update: {new Date(lastUpdateTime).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>

        <div className="mt-4 lg:mt-0 flex items-center space-x-3">
          {/* Time range selector */}
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <select
              value={selectedTimeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          {/* Export button */}
          {enableExport && (
            <button
              onClick={() => exportMetrics()}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Export
            </button>
          )}

          {/* Refresh button */}
          <button
            onClick={() => refetch()}
            className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>

          {/* Connection status */}
          <div className="flex items-center space-x-2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              isRealTimeConnected ? 'bg-green-500' : 'bg-red-500'
            )} />
            <span className="text-xs text-gray-500">
              {isRealTimeConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Budget Status (if enabled) */}
      {showBudgetInfo && activeBudget && (
        <div className={cn(
          'bg-white rounded-lg border p-6',
          isOverBudget ? 'border-red-200 bg-red-50' :
          isApproachingLimit ? 'border-yellow-200 bg-yellow-50' :
          'border-gray-200'
        )}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Budget Status</h3>
            <span className={cn(
              'px-3 py-1 rounded-full text-sm font-medium',
              isOverBudget ? 'bg-red-100 text-red-800' :
              isApproachingLimit ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            )}>
              {isOverBudget ? 'Over Budget' :
               isApproachingLimit ? 'Approaching Limit' :
               'On Track'}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Budget Name</p>
              <p className="text-lg font-bold text-gray-900">{activeBudget.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Current Spend</p>
              <p className="text-lg font-bold text-gray-900">${currentSpend.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Remaining</p>
              <p className="text-lg font-bold text-gray-900">${remainingBudget.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Usage</p>
              <p className="text-lg font-bold text-gray-900">{percentageUsed.toFixed(1)}%</p>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={cn(
                  'h-3 rounded-full transition-all duration-300',
                  isOverBudget ? 'bg-red-500' :
                  isApproachingLimit ? 'bg-yellow-500' :
                  'bg-green-500'
                )}
                style={{ width: `${Math.min(100, percentageUsed)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Metrics Overview Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              key: 'totalCost',
              label: 'Total Cost',
              value: `$${metrics.totalCost.toFixed(2)}`,
              icon: DollarSign,
              color: 'green',
              trend: periodComparison ? getTrendIndicator(metrics.totalCost, periodComparison.previous?.totalCost || 0) : null
            },
            {
              key: 'totalTokens',
              label: 'Total Tokens',
              value: metrics.totalTokens.toLocaleString(),
              icon: Zap,
              color: 'blue',
              trend: periodComparison ? getTrendIndicator(metrics.totalTokens, periodComparison.previous?.totalTokens || 0) : null
            },
            {
              key: 'operations',
              label: 'Operations',
              value: metrics.totalOperations.toLocaleString(),
              icon: BarChart3,
              color: 'purple',
              trend: periodComparison ? getTrendIndicator(metrics.totalOperations, periodComparison.previous?.totalOperations || 0) : null
            },
            {
              key: 'costPerOp',
              label: 'Cost/Operation',
              value: `$${metrics.efficiency.costPerOperation.toFixed(4)}`,
              icon: PieChart,
              color: 'orange',
              trend: periodComparison ? getTrendIndicator(metrics.efficiency.costPerOperation, periodComparison.previous?.efficiency.costPerOperation || 0) : null
            }
          ].map(({ key, label, value, icon: Icon, color, trend }) => (
            <div key={key} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 bg-${color}-100 rounded-lg`}>
                  <Icon className={`w-6 h-6 text-${color}-600`} />
                </div>
                {trend && (
                  <div className="flex items-center">
                    <trend.icon className={cn('w-4 h-4 mr-1', trend.color)} />
                    <span className={cn('text-xs', trend.color)}>{trend.text}</span>
                  </div>
                )}
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-600">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Service Breakdown */}
      {metrics && Object.keys(metrics.serviceBreakdown).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Service Breakdown</h3>
            <p className="text-sm text-gray-600 mt-1">Cost and token usage by service</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tokens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Cost/Op
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(metrics.serviceBreakdown).map(([service, data]) => {
                  const percentage = (data.cost / metrics.totalCost) * 100;
                  return (
                    <tr key={service} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={cn(
                            'w-3 h-3 rounded-full mr-3',
                            service === 'claude' ? 'bg-orange-500' :
                            service === 'openai' ? 'bg-green-500' :
                            service === 'mcp' ? 'bg-blue-500' :
                            'bg-purple-500'
                          )} />
                          <span className="text-sm font-medium text-gray-900 capitalize">{service}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${data.cost.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {data.tokens.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {data.operations.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${data.avgCostPerOperation.toFixed(4)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-900 mr-2">{percentage.toFixed(1)}%</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenCostDashboard;
```

This comprehensive specification provides:

1. **Complete TypeScript interfaces** for all token cost related data structures
2. **Three specialized hooks** with full implementations:
   - `useTokenCostTracking` for real-time token tracking
   - `useBudgetManagement` for budget operations and alerts
   - `useTokenCostMetrics` for analytics and reporting
3. **Detailed TokenCostDashboard component** that follows the existing SystemAnalytics pattern
4. **Integration with existing WebSocket singleton** for real-time updates
5. **Export functionality** for both JSON and CSV formats
6. **Error handling and loading states** consistent with existing components
7. **Responsive design** and accessibility considerations

The architecture extends the proven patterns from the existing codebase while adding specialized functionality for token cost analytics, ensuring seamless integration with the current system.