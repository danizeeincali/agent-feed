import { useState, useEffect, useCallback } from 'react';
import { 
  CostMetrics, 
  TokenUsageMetrics, 
  MessageAnalytics, 
  StepAnalytics,
  ServiceTierUsage,
  BudgetAlert,
  AnalyticsTimeRange
} from '@/types/analytics';

interface UseAnalyticsOptions {
  timeRange?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealTime?: boolean;
}

interface UseAnalyticsReturn {
  costMetrics: CostMetrics | null;
  tokenMetrics: TokenUsageMetrics | null;
  messageAnalytics: MessageAnalytics | null;
  stepAnalytics: StepAnalytics | null;
  serviceTiers: ServiceTierUsage[];
  budgetAlerts: BudgetAlert[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isConnected: boolean;
}

/**
 * Custom hook for managing analytics data
 * Provides centralized data fetching and real-time updates
 */
export const useAnalytics = (options: UseAnalyticsOptions = {}): UseAnalyticsReturn => {
  const {
    timeRange = '24h',
    autoRefresh = true,
    refreshInterval = 30000,
    enableRealTime = true
  } = options;

  const [costMetrics, setCostMetrics] = useState<CostMetrics | null>(null);
  const [tokenMetrics, setTokenMetrics] = useState<TokenUsageMetrics | null>(null);
  const [messageAnalytics, setMessageAnalytics] = useState<MessageAnalytics | null>(null);
  const [stepAnalytics, setStepAnalytics] = useState<StepAnalytics | null>(null);
  const [serviceTiers, setServiceTiers] = useState<ServiceTierUsage[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Mock data generation for demonstration
  const generateMockData = useCallback(() => {
    const now = new Date();
    
    // DISABLED: Mock data replaced with real API integration
    const realCostMetrics: CostMetrics = {
      totalCost: 0, // Will be fetched from /api/token-analytics/summary
      dailyCost: 0, // Will be fetched from /api/token-analytics/daily
      weeklyCost: 0, // Calculated from real data
      monthlyCost: 0, // Calculated from real data
      costTrend: 'stable', // Will be calculated from real usage trends
      averageCostPerRequest: 0, // Will be calculated from real API calls
      lastUpdated: now
    };

    const mockTokenMetrics: TokenUsageMetrics = {
      totalTokens: 2847392 + Math.floor(Math.random() * 100000),
      inputTokens: 1698234 + Math.floor(Math.random() * 50000),
      outputTokens: 1149158 + Math.floor(Math.random() * 50000),
      tokensPerHour: 12453 + Math.floor(Math.random() * 2000),
      tokensPerDay: 298872 + Math.floor(Math.random() * 50000),
      averageTokensPerRequest: 1247 + Math.floor(Math.random() * 200),
      tokenEfficiency: 0.87 + Math.random() * 0.1
    };

    const mockMessageAnalytics: MessageAnalytics = {
      totalMessages: 1247 + Math.floor(Math.random() * 100),
      successfulMessages: 1198 + Math.floor(Math.random() * 50),
      failedMessages: 49 + Math.floor(Math.random() * 10),
      averageResponseTime: 1234 + Math.floor(Math.random() * 500),
      messageTypes: {
        'text-generation': 567 + Math.floor(Math.random() * 100),
        'code-analysis': 234 + Math.floor(Math.random() * 50),
        'data-processing': 189 + Math.floor(Math.random() * 30),
        'image-generation': 123 + Math.floor(Math.random() * 20),
        'document-parsing': 89 + Math.floor(Math.random() * 15),
        'other': 45 + Math.floor(Math.random() * 10)
      },
      errorRate: 0.039 + Math.random() * 0.01
    };

    const mockStepAnalytics: StepAnalytics = {
      totalSteps: 3456 + Math.floor(Math.random() * 500),
      completedSteps: 3298 + Math.floor(Math.random() * 400),
      failedSteps: 158 + Math.floor(Math.random() * 50),
      averageStepDuration: 2340 + Math.floor(Math.random() * 500),
      stepTypes: {
        'prompt-generation': 1234 + Math.floor(Math.random() * 200),
        'api-call': 987 + Math.floor(Math.random() * 150),
        'response-parsing': 654 + Math.floor(Math.random() * 100),
        'data-validation': 321 + Math.floor(Math.random() * 50),
        'error-handling': 158 + Math.floor(Math.random() * 30),
        'caching': 102 + Math.floor(Math.random() * 20)
      },
      stepSuccessRate: 0.954 + Math.random() * 0.03
    };

    const mockServiceTiers: ServiceTierUsage[] = [
      {
        tier: 'basic',
        requestCount: 1247 + Math.floor(Math.random() * 200),
        tokenUsage: 847392 + Math.floor(Math.random() * 100000),
        cost: 45.67 + Math.random() * 10,
        percentage: 29.1 + Math.random() * 5,
        responseTime: 234 + Math.floor(Math.random() * 50)
      },
      {
        tier: 'premium',
        requestCount: 856 + Math.floor(Math.random() * 150),
        tokenUsage: 1294857 + Math.floor(Math.random() * 150000),
        cost: 78.45 + Math.random() * 15,
        percentage: 50.0 + Math.random() * 5,
        responseTime: 156 + Math.floor(Math.random() * 30)
      },
      {
        tier: 'enterprise',
        requestCount: 423 + Math.floor(Math.random() * 100),
        tokenUsage: 705143 + Math.floor(Math.random() * 80000),
        cost: 32.66 + Math.random() * 8,
        percentage: 20.9 + Math.random() * 3,
        responseTime: 89 + Math.floor(Math.random() * 20)
      }
    ];

    const mockBudgetAlerts: BudgetAlert[] = Math.random() > 0.7 ? [
      {
        id: '1',
        type: 'warning',
        message: `Daily budget at ${(78 + Math.random() * 15).toFixed(0)}% - approaching limit`,
        threshold: 80,
        currentValue: 78 + Math.random() * 15,
        timestamp: now
      }
    ] : [];

    return {
      costMetrics: mockCostMetrics,
      tokenMetrics: mockTokenMetrics,
      messageAnalytics: mockMessageAnalytics,
      stepAnalytics: mockStepAnalytics,
      serviceTiers: mockServiceTiers,
      budgetAlerts: mockBudgetAlerts
    };
  }, []);

  // Fetch analytics data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In a real implementation, this would make actual API calls
      const data = generateMockData();
      
      setCostMetrics(data.costMetrics);
      setTokenMetrics(data.tokenMetrics);
      setMessageAnalytics(data.messageAnalytics);
      setStepAnalytics(data.stepAnalytics);
      setServiceTiers(data.serviceTiers);
      setBudgetAlerts(data.budgetAlerts);
      setIsConnected(true);
      
    } catch (err) {
      setError(err as Error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [generateMockData]);

  // Auto-refresh effect
  useEffect(() => {
    fetchData();
    
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, autoRefresh, refreshInterval, timeRange]);

  // Real-time updates simulation
  useEffect(() => {
    if (!enableRealTime) return;
    
    const interval = setInterval(() => {
      // Simulate real-time cost updates
      setCostMetrics(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          totalCost: prev.totalCost + Math.random() * 0.1 - 0.05,
          lastUpdated: new Date()
        };
      });
    }, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, [enableRealTime]);

  const refetch = useCallback(() => fetchData(), [fetchData]);

  return {
    costMetrics,
    tokenMetrics,
    messageAnalytics,
    stepAnalytics,
    serviceTiers,
    budgetAlerts,
    loading,
    error,
    refetch,
    isConnected
  };
};

export default useAnalytics;