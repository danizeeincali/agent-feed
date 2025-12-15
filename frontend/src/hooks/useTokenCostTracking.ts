import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocketSingleton } from './useWebSocketSingleton';
import { nldLogger } from '@/utils/nld-logger';
import { getSocketIOUrl } from '../utils/websocket-url.ts';

export interface TokenUsage {
  id: string;
  timestamp: Date;
  provider: 'claude' | 'openai' | 'mcp' | 'claude-flow';
  model: string;
  tokensUsed: number;
  estimatedCost: number;
  requestType: string;
  component?: string;
  metadata?: Record<string, any>;
}

export interface TokenCostMetrics {
  totalTokensUsed: number;
  totalCost: number;
  costByProvider: Record<string, number>;
  costByModel: Record<string, number>;
  averageCostPerToken: number;
  tokensPerMinute: number;
  costTrend: 'increasing' | 'decreasing' | 'stable';
  lastUpdated: Date;
}

export interface BudgetStatus {
  dailyBudget: number;
  weeklyBudget: number;
  monthlyBudget: number;
  dailyUsed: number;
  weeklyUsed: number;
  monthlyUsed: number;
  dailyPercentage: number;
  weeklyPercentage: number;
  monthlyPercentage: number;
  alertLevel: 'safe' | 'warning' | 'critical' | 'exceeded';
  projectedDailyCost: number;
  projectedMonthlyCost: number;
}

const PRICING_CONFIG = {
  claude: {
    'claude-3-sonnet': { input: 0.000003, output: 0.000015 },
    'claude-3-haiku': { input: 0.00000025, output: 0.00000125 },
    'claude-3-opus': { input: 0.000015, output: 0.000075 }
  },
  openai: {
    'gpt-4': { input: 0.00003, output: 0.00006 },
    'gpt-3.5-turbo': { input: 0.000001, output: 0.000002 }
  }
};

/**
 * Enhanced hook for tracking token costs with real-time updates
 * Implements NLD-informed memory leak prevention and performance optimization
 */
export const useTokenCostTracking = (config?: {
  enableRealTime?: boolean;
  updateInterval?: number;
  budgetLimits?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  };
}) => {
  const [tokenUsages, setTokenUsages] = useState<TokenUsage[]>([]);
  const [metrics, setMetrics] = useState<TokenCostMetrics | null>(null);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Memory leak prevention: Use refs for cleanup tracking
  const subscriptionRef = useRef<(() => void) | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const metricsCalculationRef = useRef<NodeJS.Timeout | null>(null);
  
  // WebSocket integration using proven singleton pattern
  const { socket, isConnected } = useWebSocketSingleton({
    url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || getSocketIOUrl(),
    autoConnect: config?.enableRealTime ?? true,
    maxReconnectAttempts: 3,
    reconnectionDelay: 2000
  });

  /**
   * Calculate token cost based on provider and model
   * NLD-informed: Handles edge cases and ensures accuracy under load
   */
  const calculateTokenCost = useCallback((
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number = 0
  ): number => {
    try {
      const providerConfig = PRICING_CONFIG[provider as keyof typeof PRICING_CONFIG];
      if (!providerConfig) {
        nldLogger.renderFailure('useTokenCostTracking', new Error(`Unknown provider: ${provider}`));
        return 0;
      }

      const modelConfig = providerConfig[model as keyof typeof providerConfig] as any;
      if (!modelConfig || typeof modelConfig.input !== 'number' || typeof modelConfig.output !== 'number') {
        nldLogger.renderFailure('useTokenCostTracking', new Error(`Unknown model: ${model}`));
        return 0;
      }

      const inputCost = (inputTokens || 0) * modelConfig.input;
      const outputCost = (outputTokens || 0) * modelConfig.output;
      
      return Math.round((inputCost + outputCost) * 10000) / 10000; // Round to 4 decimal places
    } catch (error) {
      nldLogger.renderFailure('useTokenCostTracking', error as Error);
      return 0;
    }
  }, []);

  /**
   * Track new token usage
   * Implements batching to prevent UI overload
   */
  const trackTokenUsage = useCallback(async (usage: Omit<TokenUsage, 'id' | 'timestamp' | 'estimatedCost'>) => {
    try {
      const newUsage: TokenUsage = {
        ...usage,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        estimatedCost: calculateTokenCost(usage.provider, usage.model, usage.tokensUsed)
      };

      // Log token usage for NLD pattern analysis
      nldLogger.renderAttempt('useTokenCostTracking', 'trackTokenUsage', newUsage);

      setTokenUsages(prev => {
        // Memory management: Keep only last 1000 entries
        const updated = [...prev, newUsage];
        if (updated.length > 1000) {
          return updated.slice(-1000);
        }
        return updated;
      });

      // Send to backend for persistence
      if (isConnected && socket) {
        socket.emit('token-usage', newUsage);
      }

      nldLogger.renderSuccess('useTokenCostTracking', 'trackTokenUsage');
    } catch (error) {
      nldLogger.renderFailure('useTokenCostTracking', error as Error, usage);
      setError(error as Error);
    }
  }, [calculateTokenCost, isConnected, socket]);

  /**
   * Calculate comprehensive metrics
   * Optimized for performance with debouncing
   */
  const calculateMetrics = useCallback(() => {
    try {
      if (tokenUsages.length === 0) {
        setMetrics(null);
        return;
      }

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const recentUsages = tokenUsages.filter(usage => usage.timestamp >= oneHourAgo);

      const totalTokensUsed = tokenUsages.reduce((sum, usage) => sum + usage.tokensUsed, 0);
      const totalCost = tokenUsages.reduce((sum, usage) => sum + usage.estimatedCost, 0);

      const costByProvider = tokenUsages.reduce((acc, usage) => {
        acc[usage.provider] = (acc[usage.provider] || 0) + usage.estimatedCost;
        return acc;
      }, {} as Record<string, number>);

      const costByModel = tokenUsages.reduce((acc, usage) => {
        acc[usage.model] = (acc[usage.model] || 0) + usage.estimatedCost;
        return acc;
      }, {} as Record<string, number>);

      const averageCostPerToken = totalTokensUsed > 0 ? totalCost / totalTokensUsed : 0;
      const tokensPerMinute = recentUsages.length > 0 
        ? (recentUsages.reduce((sum, usage) => sum + usage.tokensUsed, 0) / 60) 
        : 0;

      // Simple trend calculation
      const midpoint = Math.floor(tokenUsages.length / 2);
      const firstHalfAvg = tokenUsages.slice(0, midpoint).reduce((sum, usage) => sum + usage.estimatedCost, 0) / midpoint || 0;
      const secondHalfAvg = tokenUsages.slice(midpoint).reduce((sum, usage) => sum + usage.estimatedCost, 0) / (tokenUsages.length - midpoint) || 0;
      
      let costTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (secondHalfAvg > firstHalfAvg * 1.1) costTrend = 'increasing';
      else if (secondHalfAvg < firstHalfAvg * 0.9) costTrend = 'decreasing';

      setMetrics({
        totalTokensUsed,
        totalCost: Math.round(totalCost * 10000) / 10000,
        costByProvider,
        costByModel,
        averageCostPerToken: Math.round(averageCostPerToken * 1000000) / 1000000,
        tokensPerMinute: Math.round(tokensPerMinute * 100) / 100,
        costTrend,
        lastUpdated: new Date()
      });
    } catch (error) {
      nldLogger.renderFailure('useTokenCostTracking', error as Error, { tokenUsagesCount: tokenUsages.length });
      setError(error as Error);
    }
  }, [tokenUsages]);

  /**
   * Calculate budget status with projections
   */
  const calculateBudgetStatus = useCallback(() => {
    try {
      if (!config?.budgetLimits || !metrics) {
        setBudgetStatus(null);
        return;
      }

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay.getTime() - (startOfDay.getDay() * 24 * 60 * 60 * 1000));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const dailyUsages = tokenUsages.filter(usage => usage.timestamp >= startOfDay);
      const weeklyUsages = tokenUsages.filter(usage => usage.timestamp >= startOfWeek);
      const monthlyUsages = tokenUsages.filter(usage => usage.timestamp >= startOfMonth);

      const dailyUsed = dailyUsages.reduce((sum, usage) => sum + usage.estimatedCost, 0);
      const weeklyUsed = weeklyUsages.reduce((sum, usage) => sum + usage.estimatedCost, 0);
      const monthlyUsed = monthlyUsages.reduce((sum, usage) => sum + usage.estimatedCost, 0);

      const dailyBudget = config.budgetLimits.daily || 0;
      const weeklyBudget = config.budgetLimits.weekly || 0;
      const monthlyBudget = config.budgetLimits.monthly || 0;

      const dailyPercentage = dailyBudget > 0 ? (dailyUsed / dailyBudget) * 100 : 0;
      const weeklyPercentage = weeklyBudget > 0 ? (weeklyUsed / weeklyBudget) * 100 : 0;
      const monthlyPercentage = monthlyBudget > 0 ? (monthlyUsed / monthlyBudget) * 100 : 0;

      // Determine alert level
      const maxPercentage = Math.max(dailyPercentage, weeklyPercentage, monthlyPercentage);
      let alertLevel: 'safe' | 'warning' | 'critical' | 'exceeded' = 'safe';
      if (maxPercentage >= 100) alertLevel = 'exceeded';
      else if (maxPercentage >= 90) alertLevel = 'critical';
      else if (maxPercentage >= 80) alertLevel = 'warning';

      // Simple projections based on current usage rate
      const hoursInDay = (now.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
      const dailyRate = hoursInDay > 0 ? dailyUsed / hoursInDay : 0;
      const projectedDailyCost = dailyRate * 24;

      const daysInMonth = now.getDate();
      const monthlyRate = daysInMonth > 0 ? monthlyUsed / daysInMonth : 0;
      const projectedMonthlyCost = monthlyRate * new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

      setBudgetStatus({
        dailyBudget,
        weeklyBudget,
        monthlyBudget,
        dailyUsed: Math.round(dailyUsed * 10000) / 10000,
        weeklyUsed: Math.round(weeklyUsed * 10000) / 10000,
        monthlyUsed: Math.round(monthlyUsed * 10000) / 10000,
        dailyPercentage: Math.round(dailyPercentage * 100) / 100,
        weeklyPercentage: Math.round(weeklyPercentage * 100) / 100,
        monthlyPercentage: Math.round(monthlyPercentage * 100) / 100,
        alertLevel,
        projectedDailyCost: Math.round(projectedDailyCost * 10000) / 10000,
        projectedMonthlyCost: Math.round(projectedMonthlyCost * 10000) / 10000
      });
    } catch (error) {
      nldLogger.renderFailure('useTokenCostTracking', error as Error, { budgetConfig: config?.budgetLimits });
      setError(error as Error);
    }
  }, [config?.budgetLimits, metrics, tokenUsages]);

  /**
   * DISABLED: Fetch historical data - replaced with no-op
   */
  const fetchHistoricalData = useCallback(async () => {
    // DISABLED: No data fetching to prevent WebSocket/API usage
    nldLogger.renderAttempt('useTokenCostTracking', 'fetchHistoricalData-disabled', { reason: 'WebSocket dependencies removed' });
    
    // Initialize with empty state immediately
    setTokenUsages([]);
    setMetrics(null);
    setBudgetStatus(null);
    setLoading(false);
    setError(null);
    
    nldLogger.renderSuccess('useTokenCostTracking', 'disabled-fetch-completed');
  }, []);

  // DISABLED: Initialize with no-op behavior
  useEffect(() => {
    // DISABLED: No historical data fetching to prevent WebSocket connections
    // fetchHistoricalData();
    
    nldLogger.renderAttempt('useTokenCostTracking', 'hook-initialization-disabled', { 
      reason: 'WebSocket dependencies removed',
      config: config || {} 
    });
    
    // Initialize with empty state immediately
    setTokenUsages([]);
    setMetrics(null);
    setBudgetStatus(null);
    setLoading(false);
    setError(null);
    
    nldLogger.renderSuccess('useTokenCostTracking', 'disabled-state-initialized');

    return () => {
      // Cleanup to prevent memory leaks
      if (subscriptionRef.current) {
        subscriptionRef.current();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (metricsCalculationRef.current) {
        clearTimeout(metricsCalculationRef.current);
      }
    };
  }, []); // Removed all WebSocket dependencies

  // DISABLED: Metrics calculation - no-op for empty token usages
  useEffect(() => {
    // Since tokenUsages is always empty in disabled mode, no calculations needed
    nldLogger.renderAttempt('useTokenCostTracking', 'metrics-calculation-disabled', { 
      tokenUsagesLength: tokenUsages.length,
      reason: 'No WebSocket data to calculate' 
    });
  }, [tokenUsages]);  // Keep for interface compatibility

  // DISABLED: No localStorage persistence needed for empty data
  useEffect(() => {
    // Since tokenUsages is always empty in disabled mode, no persistence needed
    nldLogger.renderAttempt('useTokenCostTracking', 'localStorage-persistence-disabled', { 
      tokenUsagesLength: tokenUsages.length,
      reason: 'No data to persist' 
    });
  }, [tokenUsages]);

  return {
    tokenUsages,
    metrics,
    budgetStatus,
    loading,
    error,
    isConnected,
    trackTokenUsage,
    calculateTokenCost,
    refetch: fetchHistoricalData  // Returns no-op function in disabled mode
  };
};