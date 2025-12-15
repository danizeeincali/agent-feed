# Token Cost Analytics - Implementation Guide

## Implementation Roadmap

This guide provides step-by-step instructions for implementing token cost analytics in the existing analytics dashboard, designed for seamless integration with NLD (Neural Learning Development) intelligent testing.

## Phase 1: Foundation Setup (Days 1-3)

### Day 1: Environment and Dependencies

#### 1.1 Install Required Dependencies
```bash
# Frontend dependencies
npm install --save \
  recharts \
  date-fns \
  @tanstack/react-query \
  lucide-react \
  chart.js \
  react-chartjs-2

# Backend dependencies (if applicable)
npm install --save \
  ioredis \
  ws \
  decimal.js \
  node-cron
```

#### 1.2 Database Setup
```sql
-- Execute the database schema
-- (See SPARC_TOKEN_ANALYTICS_TECHNICAL_DESIGN.md for full schema)

-- Create initial tables
CREATE TABLE token_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL,
  service VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL,
  estimated_cost DECIMAL(12,8) NOT NULL,
  agent_id VARCHAR(100),
  task_id VARCHAR(100),
  session_id VARCHAR(100) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_token_events_timestamp ON token_usage_events(timestamp);
CREATE INDEX idx_token_events_service ON token_usage_events(service);
CREATE INDEX idx_token_events_agent ON token_usage_events(agent_id);
```

#### 1.3 Environment Configuration
```typescript
// config/tokenAnalytics.ts
export const tokenAnalyticsConfig = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/analytics',
    pool: {
      min: 2,
      max: 10
    }
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: {
      realtimeMetrics: 30,
      aggregatedData: 300,
      pricingModel: 3600
    }
  },
  websocket: {
    port: parseInt(process.env.WS_PORT || '8080'),
    pingInterval: 30000
  },
  pricing: {
    updateInterval: 3600000, // 1 hour
    fallbackRate: 0.00001 // $0.01 per 1000 tokens
  }
};
```

### Day 2: Core Data Models and Types

#### 2.1 Create Type Definitions
```typescript
// types/tokenAnalytics.ts
export interface TokenUsageEvent {
  id?: string;
  timestamp: string;
  service: 'claude' | 'openai' | 'mcp' | 'swarm';
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  actual_cost?: number;
  agent_id?: string;
  task_id?: string;
  session_id: string;
  metadata?: Record<string, any>;
}

export interface CostBreakdown {
  service: string;
  model: string;
  total_cost: number;
  total_tokens: number;
  request_count: number;
  avg_cost_per_request: number;
  avg_tokens_per_request: number;
  time_period: string;
}

export interface BudgetStatus {
  monthly_limit: number;
  current_spend: number;
  utilization_percentage: number;
  projected_end_of_month: number;
  days_remaining: number;
  alerts: BudgetAlert[];
}

export interface BudgetAlert {
  id: string;
  type: 'warning' | 'critical' | 'exceeded';
  threshold: number;
  current_usage: number;
  budget_limit: number;
  created_at: string;
  acknowledged: boolean;
}

export interface AgentCostMetrics {
  agent_id: string;
  agent_name: string;
  total_cost: number;
  total_tokens: number;
  request_count: number;
  cost_per_task: number;
  tokens_per_task: number;
  cost_efficiency_score: number;
  last_activity: string;
}

export interface RealtimeMetrics {
  current_hourly_rate: number;
  rate_trend: number;
  active_sessions: number;
  avg_cost_per_request: number;
  cost_efficiency_trend: number;
  top_agents_by_cost: AgentCostMetrics[];
}
```

#### 2.2 Create Utility Functions
```typescript
// utils/tokenCalculations.ts
import { TokenUsageEvent, CostBreakdown } from '../types/tokenAnalytics';

export const calculateCostFromTokens = (
  model: string,
  inputTokens: number,
  outputTokens: number,
  pricingModel: any
): number => {
  const pricing = pricingModel[model];
  if (!pricing) {
    // Fallback pricing
    return (inputTokens + outputTokens) * 0.00001;
  }

  const inputCost = (inputTokens / 1000) * pricing.input_price_per_1k;
  const outputCost = (outputTokens / 1000) * pricing.output_price_per_1k;
  const requestCost = pricing.request_price || 0;

  return inputCost + outputCost + requestCost;
};

export const estimateTokensFromText = (text: string, model: string = 'claude-3-haiku'): number => {
  // Rough estimation: ~4 characters per token for English text
  const baseEstimate = Math.ceil(text.length / 4);
  
  // Model-specific adjustments
  const modelMultipliers: Record<string, number> = {
    'claude-3-haiku': 1.0,
    'claude-3-sonnet': 1.1,
    'claude-3-opus': 1.2,
    'gpt-3.5-turbo': 0.9,
    'gpt-4': 1.1
  };
  
  const multiplier = modelMultipliers[model] || 1.0;
  return Math.ceil(baseEstimate * multiplier);
};

export const aggregateTokenUsage = (events: TokenUsageEvent[], groupBy: 'service' | 'model' | 'agent'): CostBreakdown[] => {
  const grouped = events.reduce((acc, event) => {
    const key = event[groupBy === 'agent' ? 'agent_id' : groupBy] || 'unknown';
    
    if (!acc[key]) {
      acc[key] = {
        service: event.service,
        model: event.model,
        total_cost: 0,
        total_tokens: 0,
        request_count: 0,
        avg_cost_per_request: 0,
        avg_tokens_per_request: 0,
        time_period: 'custom'
      };
    }
    
    acc[key].total_cost += event.estimated_cost;
    acc[key].total_tokens += event.total_tokens;
    acc[key].request_count += 1;
    
    return acc;
  }, {} as Record<string, CostBreakdown>);

  // Calculate averages
  return Object.values(grouped).map(item => ({
    ...item,
    avg_cost_per_request: item.total_cost / item.request_count,
    avg_tokens_per_request: item.total_tokens / item.request_count
  }));
};

export const calculateBudgetUtilization = (currentSpend: number, monthlyLimit: number): {
  percentage: number;
  status: 'safe' | 'warning' | 'critical' | 'exceeded';
  daysToExceed?: number;
} => {
  const percentage = (currentSpend / monthlyLimit) * 100;
  
  let status: 'safe' | 'warning' | 'critical' | 'exceeded';
  if (percentage >= 100) status = 'exceeded';
  else if (percentage >= 90) status = 'critical';
  else if (percentage >= 80) status = 'warning';
  else status = 'safe';

  // Calculate days to exceed budget at current rate
  const daysInMonth = new Date().getDate();
  const dailyRate = currentSpend / daysInMonth;
  const daysToExceed = dailyRate > 0 ? Math.ceil((monthlyLimit - currentSpend) / dailyRate) : undefined;

  return { percentage, status, daysToExceed };
};
```

### Day 3: Basic Hooks Implementation

#### 3.1 Token Tracking Hook
```typescript
// hooks/useTokenTracking.ts
import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { TokenUsageEvent } from '../types/tokenAnalytics';

export const useTokenTracking = () => {
  const [currentSessionTokens, setCurrentSessionTokens] = useState(0);
  const [currentSessionCost, setCurrentSessionCost] = useState(0);
  const [recentUsage, setRecentUsage] = useState<TokenUsageEvent[]>([]);
  const [isTracking, setIsTracking] = useState(false);

  // WebSocket connection for real-time updates
  const { data: wsData, sendMessage, isConnected } = useWebSocket('/ws/token-analytics');

  // Process incoming token usage events
  useEffect(() => {
    if (wsData?.type === 'token_usage_update') {
      const event: TokenUsageEvent = wsData.data;
      
      // Update session totals
      setCurrentSessionTokens(prev => prev + event.total_tokens);
      setCurrentSessionCost(prev => prev + event.estimated_cost);
      
      // Add to recent usage (keep last 50 events)
      setRecentUsage(prev => [...prev.slice(-49), event]);
    }
  }, [wsData]);

  // Track a new token usage event
  const trackTokenUsage = useCallback((usage: Omit<TokenUsageEvent, 'timestamp' | 'id'>) => {
    const event: TokenUsageEvent = {
      ...usage,
      timestamp: new Date().toISOString()
    };

    // Send to server for persistence
    if (isConnected) {
      sendMessage({
        type: 'track_token_usage',
        data: event
      });
    }

    // Update local state immediately for responsiveness
    setCurrentSessionTokens(prev => prev + event.total_tokens);
    setCurrentSessionCost(prev => prev + event.estimated_cost);
    setRecentUsage(prev => [...prev.slice(-49), event]);

    return event;
  }, [sendMessage, isConnected]);

  // Start tracking session
  const startTracking = useCallback(() => {
    setIsTracking(true);
    if (isConnected) {
      sendMessage({ type: 'start_session_tracking' });
    }
  }, [sendMessage, isConnected]);

  // Stop tracking session
  const stopTracking = useCallback(() => {
    setIsTracking(false);
    if (isConnected) {
      sendMessage({ type: 'stop_session_tracking' });
    }
  }, [sendMessage, isConnected]);

  // Reset session counters
  const resetSession = useCallback(() => {
    setCurrentSessionTokens(0);
    setCurrentSessionCost(0);
    setRecentUsage([]);
    if (isConnected) {
      sendMessage({ type: 'reset_session' });
    }
  }, [sendMessage, isConnected]);

  return {
    currentSessionTokens,
    currentSessionCost,
    recentUsage,
    isTracking,
    isConnected,
    trackTokenUsage,
    startTracking,
    stopTracking,
    resetSession
  };
};
```

#### 3.2 Cost Calculation Hook
```typescript
// hooks/useCostCalculation.ts
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calculateCostFromTokens } from '../utils/tokenCalculations';

interface PricingModel {
  [model: string]: {
    input_price_per_1k: number;
    output_price_per_1k: number;
    request_price?: number;
  };
}

export const useCostCalculation = () => {
  // Fetch current pricing model
  const { data: pricingModel, isLoading: isPricingLoading } = useQuery<PricingModel>({
    queryKey: ['pricing-model'],
    queryFn: async () => {
      const response = await fetch('/api/v1/analytics/pricing');
      if (!response.ok) {
        throw new Error('Failed to fetch pricing model');
      }
      return response.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: 60 * 60 * 1000, // Refresh hourly
    retry: 3
  });

  // Calculate cost for specific usage
  const calculateCost = useMemo(() => {
    return (model: string, inputTokens: number, outputTokens: number): number => {
      if (!pricingModel) {
        return 0; // Return 0 if pricing not loaded yet
      }
      return calculateCostFromTokens(model, inputTokens, outputTokens, pricingModel);
    };
  }, [pricingModel]);

  // Calculate cost with confidence intervals
  const calculateCostWithConfidence = useMemo(() => {
    return (model: string, inputTokens: number, outputTokens: number) => {
      const baseCost = calculateCost(model, inputTokens, outputTokens);
      
      // Add 5% uncertainty for pricing fluctuations
      const uncertainty = baseCost * 0.05;
      
      return {
        estimated_cost: baseCost,
        min_cost: Math.max(0, baseCost - uncertainty),
        max_cost: baseCost + uncertainty,
        confidence: 0.95
      };
    };
  }, [calculateCost]);

  // Get supported models
  const supportedModels = useMemo(() => {
    return pricingModel ? Object.keys(pricingModel) : [];
  }, [pricingModel]);

  // Get pricing for a specific model
  const getModelPricing = useCallback((model: string) => {
    return pricingModel?.[model] || null;
  }, [pricingModel]);

  return {
    calculateCost,
    calculateCostWithConfidence,
    getModelPricing,
    supportedModels,
    pricingModel,
    isLoading: isPricingLoading
  };
};
```

## Phase 2: Core Components (Days 4-6)

### Day 4: Basic UI Components

#### 4.1 Token Usage Metrics Component
```typescript
// components/analytics/token/TokenUsageMetrics.tsx
import React from 'react';
import { DollarSign, Hash, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TokenUsageMetricsProps {
  currentMetrics: {
    totalCost: number;
    tokenCount: number;
    costTrend: number;
    tokenTrend: number;
  } | null;
  realtimeData: any;
  isLoading: boolean;
}

export const TokenUsageMetrics: React.FC<TokenUsageMetricsProps> = ({
  currentMetrics,
  realtimeData,
  isLoading
}) => {
  const metrics = [
    {
      id: 'total-cost',
      title: 'Total Cost (24h)',
      value: currentMetrics?.totalCost || 0,
      format: (value: number) => `$${value.toFixed(4)}`,
      trend: currentMetrics?.costTrend || 0,
      icon: DollarSign,
      color: 'blue'
    },
    {
      id: 'total-tokens',
      title: 'Total Tokens (24h)',
      value: currentMetrics?.tokenCount || 0,
      format: (value: number) => value.toLocaleString(),
      trend: currentMetrics?.tokenTrend || 0,
      icon: Hash,
      color: 'green'
    },
    {
      id: 'current-rate',
      title: 'Current Hourly Rate',
      value: realtimeData?.current_hourly_rate || 0,
      format: (value: number) => `$${value.toFixed(4)}/hr`,
      trend: realtimeData?.rate_trend || 0,
      icon: TrendingUp,
      color: 'purple'
    },
    {
      id: 'avg-cost-per-request',
      title: 'Avg Cost/Request',
      value: realtimeData?.avg_cost_per_request || 0,
      format: (value: number) => `$${value.toFixed(6)}`,
      trend: realtimeData?.cost_efficiency_trend || 0,
      icon: DollarSign,
      color: 'orange'
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map(({ id, title, value, format, trend, icon: Icon, color }) => (
        <Card key={id}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 bg-${color}-100 rounded-lg`}>
                <Icon className={`w-5 h-5 text-${color}-600`} />
              </div>
              {Math.abs(trend) > 0.1 && (
                <div className={`flex items-center text-sm ${
                  trend > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {trend > 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                  {Math.abs(trend).toFixed(1)}%
                </div>
              )}
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {format(value)}
              </div>
              <div className="text-sm text-gray-600">{title}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
```

#### 4.2 Cost Breakdown Charts Component
```typescript
// components/analytics/token/CostBreakdownCharts.tsx
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CostBreakdownChartsProps {
  data: any[];
  timeRange: string;
}

export const CostBreakdownCharts: React.FC<CostBreakdownChartsProps> = ({
  data,
  timeRange
}) => {
  // Prepare data for service breakdown pie chart
  const serviceBreakdown = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const breakdown = data.reduce((acc, item) => {
      if (!acc[item.service]) {
        acc[item.service] = { name: item.service, value: 0, cost: 0 };
      }
      acc[item.service].value += item.total_tokens;
      acc[item.service].cost += item.estimated_cost;
      return acc;
    }, {} as Record<string, any>);
    
    return Object.values(breakdown);
  }, [data]);

  // Prepare data for cost trend over time
  const costTrend = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Group by hour/day based on time range
    const granularity = timeRange === '1h' ? 'minute' : timeRange === '24h' ? 'hour' : 'day';
    
    return data.map(item => ({
      time: new Date(item.timestamp).toLocaleString(),
      cost: item.estimated_cost,
      tokens: item.total_tokens,
      service: item.service
    })).slice(-20); // Show last 20 data points
  }, [data, timeRange]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Service Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Cost by Service</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={serviceBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, cost }) => `${name}: $${cost.toFixed(4)}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="cost"
              >
                {serviceBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`$${Number(value).toFixed(4)}`, 'Cost']} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cost Trend Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Trend ({timeRange})</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip formatter={(value, name) => [
                name === 'cost' ? `$${Number(value).toFixed(4)}` : Number(value).toLocaleString(),
                name === 'cost' ? 'Cost' : 'Tokens'
              ]} />
              <Legend />
              <Bar dataKey="cost" fill="#8884d8" name="Cost ($)" />
              <Bar dataKey="tokens" fill="#82ca9d" name="Tokens" yAxisId="right" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
```

### Day 5: Integration with Existing Analytics

#### 5.1 Modify SystemAnalytics Component
```typescript
// Update existing SystemAnalytics.tsx to include token analytics
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TokenCostAnalytics } from './token/TokenCostAnalytics';
// ... other imports

export const SystemAnalytics: React.FC<SystemAnalyticsProps> = ({ className }) => {
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Existing code...

  return (
    <div className={cn('space-y-6', className)}>
      {/* Existing header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="w-8 h-8 mr-3 text-blue-600" />
            System Analytics
          </h2>
          <p className="text-gray-600 mt-1">Real-time performance monitoring and system insights</p>
        </div>
        
        {/* Existing controls */}
        <div className="mt-4 lg:mt-0 flex items-center space-x-3">
          {/* Existing time range and controls */}
        </div>
      </div>

      {/* New Tabs Layout */}
      <Tabs defaultValue="system" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="system">System Metrics</TabsTrigger>
          <TabsTrigger value="tokens">Token Analytics</TabsTrigger>
          <TabsTrigger value="agents">Agent Performance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="system" className="space-y-6">
          {/* Existing system analytics content */}
          {/* System Health Overview */}
          {systemHealth && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              {/* Existing system health content */}
            </div>
          )}

          {/* Performance Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Existing performance metrics */}
          </div>
        </TabsContent>
        
        <TabsContent value="tokens" className="space-y-6">
          {/* New Token Analytics */}
          <TokenCostAnalytics 
            timeRange={timeRange}
            autoRefresh={autoRefresh}
            className="w-full"
          />
        </TabsContent>
        
        <TabsContent value="agents" className="space-y-6">
          {/* Existing agent performance table */}
          <div className="bg-white rounded-lg border border-gray-200">
            {/* Existing agent performance content */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

#### 5.2 Create Main Token Analytics Container
```typescript
// components/analytics/token/TokenCostAnalytics.tsx
import React, { useState, useEffect } from 'react';
import { useTokenTracking } from '../../../hooks/useTokenTracking';
import { useCostCalculation } from '../../../hooks/useCostCalculation';
import { TokenUsageMetrics } from './TokenUsageMetrics';
import { CostBreakdownCharts } from './CostBreakdownCharts';
import { BudgetManagement } from './BudgetManagement';
import { AgentCostAnalysis } from './AgentCostAnalysis';

interface TokenCostAnalyticsProps {
  timeRange: string;
  autoRefresh: boolean;
  className?: string;
}

export const TokenCostAnalytics: React.FC<TokenCostAnalyticsProps> = ({
  timeRange,
  autoRefresh,
  className
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'budget' | 'agents'>('overview');
  
  // Hooks
  const {
    currentSessionTokens,
    currentSessionCost,
    recentUsage,
    isConnected,
    trackTokenUsage
  } = useTokenTracking();

  const { calculateCost, isLoading: isPricingLoading } = useCostCalculation();

  // Fetch historical data
  const { data: historicalData, isLoading: isHistoricalLoading } = useQuery({
    queryKey: ['token-historical', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/v1/analytics/tokens?range=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch token data');
      return response.json();
    },
    refetchInterval: autoRefresh ? 30000 : false
  });

  // Calculate current metrics
  const currentMetrics = useMemo(() => {
    if (!historicalData?.length) return null;
    
    const totalCost = historicalData.reduce((sum: number, item: any) => sum + item.estimated_cost, 0);
    const totalTokens = historicalData.reduce((sum: number, item: any) => sum + item.total_tokens, 0);
    
    // Calculate trends (simplified)
    const recent = historicalData.slice(-10);
    const older = historicalData.slice(-20, -10);
    
    const recentAvgCost = recent.reduce((sum: number, item: any) => sum + item.estimated_cost, 0) / recent.length;
    const olderAvgCost = older.reduce((sum: number, item: any) => sum + item.estimated_cost, 0) / older.length;
    
    const costTrend = olderAvgCost > 0 ? ((recentAvgCost - olderAvgCost) / olderAvgCost) * 100 : 0;
    const tokenTrend = 0; // Implement similar calculation for tokens
    
    return {
      totalCost,
      tokenCount: totalTokens,
      costTrend,
      tokenTrend
    };
  }, [historicalData]);

  return (
    <div className={className}>
      {/* Status indicator */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Real-time active' : 'Disconnected'}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            Session: {currentSessionTokens.toLocaleString()} tokens, ${currentSessionCost.toFixed(4)}
          </div>
        </div>
        
        {/* View toggle */}
        <div className="flex space-x-2">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'budget', label: 'Budget' },
            { id: 'agents', label: 'Agents' }
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveView(id as any)}
              className={`px-3 py-2 rounded text-sm ${
                activeView === id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content based on active view */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          <TokenUsageMetrics
            currentMetrics={currentMetrics}
            realtimeData={{ current_hourly_rate: 0, avg_cost_per_request: 0 }}
            isLoading={isHistoricalLoading || isPricingLoading}
          />
          <CostBreakdownCharts
            data={historicalData || []}
            timeRange={timeRange}
          />
        </div>
      )}

      {activeView === 'budget' && (
        <BudgetManagement />
      )}

      {activeView === 'agents' && (
        <AgentCostAnalysis timeRange={timeRange} />
      )}
    </div>
  );
};
```

### Day 6: API Integration and Testing

#### 6.1 Create API Service Methods
```typescript
// services/api.ts - Add to existing API service
export class ApiService {
  // ... existing methods

  // Token Analytics endpoints
  async getTokenUsage(params: {
    range: string;
    service?: string;
    agentId?: string;
  }): Promise<TokenUsageEvent[]> {
    const query = new URLSearchParams(params as any).toString();
    return this.request<TokenUsageEvent[]>(`/analytics/tokens?${query}`);
  }

  async getCostBreakdown(params: {
    range: string;
    breakdown: 'service' | 'model' | 'agent';
  }): Promise<CostBreakdown[]> {
    const query = new URLSearchParams(params as any).toString();
    return this.request<CostBreakdown[]>(`/analytics/costs?${query}`);
  }

  async getBudgetStatus(): Promise<BudgetStatus> {
    return this.request<BudgetStatus>('/analytics/budget');
  }

  async setBudgetConfiguration(config: {
    monthly_limit: number;
    thresholds: number[];
    notification_emails: string[];
  }): Promise<void> {
    return this.request<void>('/analytics/budget', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  async getAgentCostMetrics(timeRange: string): Promise<AgentCostMetrics[]> {
    return this.request<AgentCostMetrics[]>(`/analytics/agents/costs?range=${timeRange}`);
  }

  async trackTokenUsage(usage: TokenUsageEvent): Promise<void> {
    return this.request<void>('/analytics/tokens/track', {
      method: 'POST',
      body: JSON.stringify(usage)
    });
  }

  async getPricingModel(): Promise<any> {
    return this.request<any>('/analytics/pricing');
  }
}
```

#### 6.2 Basic Integration Testing
```typescript
// __tests__/integration/tokenAnalytics.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TokenCostAnalytics } from '../components/analytics/token/TokenCostAnalytics';

// Mock WebSocket
jest.mock('../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    data: null,
    isConnected: true,
    sendMessage: jest.fn()
  })
}));

// Mock API responses
const mockApiResponse = {
  '/api/v1/analytics/tokens': [
    {
      timestamp: '2025-01-20T10:00:00Z',
      service: 'claude',
      model: 'claude-3-sonnet',
      input_tokens: 150,
      output_tokens: 75,
      total_tokens: 225,
      estimated_cost: 0.0045,
      session_id: 'test-session'
    }
  ],
  '/api/v1/analytics/pricing': {
    'claude-3-sonnet': {
      input_price_per_1k: 0.003,
      output_price_per_1k: 0.015
    }
  }
};

// Setup fetch mock
global.fetch = jest.fn((url: string) => {
  const response = mockApiResponse[url as keyof typeof mockApiResponse];
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(response)
  } as Response);
});

describe('TokenCostAnalytics Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  it('should render token analytics dashboard', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TokenCostAnalytics 
          timeRange="24h" 
          autoRefresh={false} 
        />
      </QueryClientProvider>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Real-time active')).toBeInTheDocument();
    });

    // Check for metric cards
    expect(screen.getByText(/Total Cost/)).toBeInTheDocument();
    expect(screen.getByText(/Total Tokens/)).toBeInTheDocument();
  });

  it('should calculate costs correctly', async () => {
    const { useCostCalculation } = await import('../hooks/useCostCalculation');
    
    // This would be a more detailed test of the cost calculation logic
    // Implementation depends on how you structure your hooks
  });
});
```

## Phase 3: Advanced Features (Days 7-10)

### Day 7: Budget Management Implementation

#### 7.1 Budget Management Component
```typescript
// components/analytics/token/BudgetManagement.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Settings, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const BudgetManagement: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    monthly_limit: 0,
    thresholds: [50, 80, 90],
    notification_emails: ['']
  });

  const queryClient = useQueryClient();

  // Fetch current budget status
  const { data: budgetStatus, isLoading } = useQuery({
    queryKey: ['budget-status'],
    queryFn: async () => {
      const response = await fetch('/api/v1/analytics/budget');
      if (!response.ok) throw new Error('Failed to fetch budget status');
      return response.json();
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch budget configuration
  const { data: budgetConfig } = useQuery({
    queryKey: ['budget-config'],
    queryFn: async () => {
      const response = await fetch('/api/v1/analytics/budget/config');
      if (!response.ok) throw new Error('Failed to fetch budget config');
      return response.json();
    }
  });

  // Update budget configuration
  const updateBudgetMutation = useMutation({
    mutationFn: async (config: typeof budgetForm) => {
      const response = await fetch('/api/v1/analytics/budget/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!response.ok) throw new Error('Failed to update budget');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-status'] });
      queryClient.invalidateQueries({ queryKey: ['budget-config'] });
      setIsEditing(false);
    }
  });

  // Initialize form with current config
  useEffect(() => {
    if (budgetConfig) {
      setBudgetForm({
        monthly_limit: budgetConfig.monthly_limit || 0,
        thresholds: budgetConfig.thresholds || [50, 80, 90],
        notification_emails: budgetConfig.notification_emails || ['']
      });
    }
  }, [budgetConfig]);

  const handleSaveBudget = () => {
    updateBudgetMutation.mutate(budgetForm);
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return 'text-red-600 bg-red-100';
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 80) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 90) return AlertTriangle;
    return CheckCircle;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Budget Overview */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Monthly Budget Overview</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              disabled={updateBudgetMutation.isPending}
            >
              <Settings className="w-4 h-4 mr-2" />
              {isEditing ? 'Cancel' : 'Configure'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {budgetStatus ? (
            <div className="space-y-4">
              {/* Budget Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Current Usage</span>
                  <span className="text-sm text-gray-600">
                    ${budgetStatus.current_spend?.toFixed(2)} / ${budgetStatus.monthly_limit?.toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-300 ${
                      budgetStatus.utilization_percentage >= 90 ? 'bg-red-500' :
                      budgetStatus.utilization_percentage >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, budgetStatus.utilization_percentage)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>0%</span>
                  <span>{budgetStatus.utilization_percentage?.toFixed(1)}%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Budget Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    ${budgetStatus.projected_end_of_month?.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Projected Month-End</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {budgetStatus.days_remaining}
                  </div>
                  <div className="text-sm text-gray-600">Days Remaining</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    ${((budgetStatus.monthly_limit - budgetStatus.current_spend) || 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Remaining Budget</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Budget not configured</p>
              <Button onClick={() => setIsEditing(true)} className="mt-2">
                Set Budget
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Configuration */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>Budget Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Monthly Limit */}
            <div>
              <Label htmlFor="monthly-limit">Monthly Limit ($)</Label>
              <Input
                id="monthly-limit"
                type="number"
                step="0.01"
                value={budgetForm.monthly_limit}
                onChange={(e) => setBudgetForm(prev => ({
                  ...prev,
                  monthly_limit: parseFloat(e.target.value) || 0
                }))}
                placeholder="Enter monthly budget limit"
              />
            </div>

            {/* Alert Thresholds */}
            <div>
              <Label>Alert Thresholds (%)</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {budgetForm.thresholds.map((threshold, index) => (
                  <Input
                    key={index}
                    type="number"
                    min="0"
                    max="100"
                    value={threshold}
                    onChange={(e) => {
                      const newThresholds = [...budgetForm.thresholds];
                      newThresholds[index] = parseInt(e.target.value) || 0;
                      setBudgetForm(prev => ({ ...prev, thresholds: newThresholds }));
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Notification Emails */}
            <div>
              <Label>Notification Emails</Label>
              <div className="space-y-2 mt-2">
                {budgetForm.notification_emails.map((email, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        const newEmails = [...budgetForm.notification_emails];
                        newEmails[index] = e.target.value;
                        setBudgetForm(prev => ({ ...prev, notification_emails: newEmails }));
                      }}
                      placeholder="Enter email address"
                    />
                    {index === budgetForm.notification_emails.length - 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setBudgetForm(prev => ({
                          ...prev,
                          notification_emails: [...prev.notification_emails, '']
                        }))}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveBudget}
                disabled={updateBudgetMutation.isPending}
              >
                {updateBudgetMutation.isPending ? 'Saving...' : 'Save Budget'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Alerts */}
      {budgetStatus?.alerts && budgetStatus.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Budget Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {budgetStatus.alerts.map((alert: any) => {
                const StatusIcon = getStatusIcon(alert.threshold);
                return (
                  <div key={alert.id} className={`p-4 rounded-lg border ${getStatusColor(alert.threshold)}`}>
                    <div className="flex items-center">
                      <StatusIcon className="w-5 h-5 mr-3" />
                      <div className="flex-1">
                        <div className="font-medium">
                          {alert.type === 'exceeded' ? 'Budget Exceeded' : 
                           alert.type === 'critical' ? 'Critical Alert' : 'Budget Warning'}
                        </div>
                        <div className="text-sm">
                          {alert.threshold}% of monthly budget reached
                          (${alert.current_usage.toFixed(2)} / ${alert.budget_limit.toFixed(2)})
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(alert.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
```

This implementation guide provides a structured approach to building the token cost analytics feature. Continue with the remaining phases to implement agent analysis, real-time features, and advanced optimization strategies.