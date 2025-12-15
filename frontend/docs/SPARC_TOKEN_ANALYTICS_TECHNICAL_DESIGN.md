# Token Cost Analytics - Technical Design Specification

## Architecture Overview

This document provides the detailed technical design for implementing real-time token cost analytics within the existing SystemAnalytics dashboard, specifically designed for integration with the NLD (Neural Learning Development) system.

## System Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Data Layer    │
│   Dashboard     │◄──►│   Services      │◄──►│   Storage       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WebSocket     │    │   Token         │    │   Time Series   │
│   Real-time     │◄──►│   Interceptors  │◄──►│   Database      │
│   Updates       │    │   & Trackers    │    │   (InfluxDB)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Integration Flow
```
Claude API Call ──┐
                  │
OpenAI API Call ──┼─► Token Interceptor ──► Cost Calculator ──► Real-time Stream
                  │                                               │
MCP Protocol ─────┤                                               │
                  │                                               ▼
Swarm Agents ─────┘                                    ┌─────────────────┐
                                                       │   Dashboard     │
Budget Alerts ◄── Alert Engine ◄── Cost Aggregator ◄─┤   Components    │
                                                       │   - Metrics     │
Historical Data ◄── Data Store ◄── Data Persister ◄──┤   - Charts      │
                                                       │   - Alerts      │
                                                       └─────────────────┘
```

## Frontend Implementation

### Component Architecture

#### 1. Core Components Structure
```typescript
src/components/analytics/token/
├── TokenCostAnalytics.tsx          // Main container component
├── TokenUsageMetrics.tsx           // Real-time usage displays
├── CostBreakdownCharts.tsx         // Visualization components
├── BudgetManagement.tsx            // Budget controls and alerts
├── AgentCostAnalysis.tsx           // Per-agent cost tracking
├── CostTrendAnalysis.tsx           // Historical analysis
├── AlertsNotifications.tsx         // Alert system UI
└── hooks/
    ├── useTokenTracking.ts         // Real-time token tracking
    ├── useCostCalculation.ts       // Cost computation logic
    ├── useBudgetManagement.ts      // Budget management
    ├── useTokenAnalytics.ts        // Analytics queries
    └── useRealTimeUpdates.ts       // WebSocket integration
```

#### 2. Main Container Component
```typescript
// TokenCostAnalytics.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  TokenUsageMetrics,
  CostBreakdownCharts,
  BudgetManagement,
  AgentCostAnalysis 
} from './components';

interface TokenCostAnalyticsProps {
  className?: string;
  timeRange?: string;
  autoRefresh?: boolean;
}

export const TokenCostAnalytics: React.FC<TokenCostAnalyticsProps> = ({
  className,
  timeRange = '24h',
  autoRefresh = true
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'budget'>('overview');
  const [realTimeEnabled, setRealTimeEnabled] = useState(autoRefresh);

  // Real-time token usage tracking
  const { data: realtimeData, isConnected } = useWebSocket('/ws/token-analytics', {
    enabled: realTimeEnabled
  });

  // Historical token usage data
  const { data: historicalData, isLoading } = useQuery({
    queryKey: ['token-usage', timeRange],
    queryFn: () => fetchTokenUsageData(timeRange),
    refetchInterval: autoRefresh ? 30000 : false
  });

  // Budget status and alerts
  const { data: budgetStatus } = useQuery({
    queryKey: ['budget-status'],
    queryFn: fetchBudgetStatus,
    refetchInterval: 60000
  });

  // Aggregate current metrics
  const currentMetrics = useMemo(() => {
    if (!historicalData?.length) return null;
    
    const latest = historicalData[historicalData.length - 1];
    const previous = historicalData[historicalData.length - 2];
    
    return {
      totalCost: latest.total_cost,
      tokenCount: latest.total_tokens,
      costTrend: previous ? (latest.total_cost - previous.total_cost) / previous.total_cost * 100 : 0,
      tokenTrend: previous ? (latest.total_tokens - previous.total_tokens) / previous.total_tokens * 100 : 0
    };
  }, [historicalData]);

  return (
    <div className={`token-cost-analytics ${className}`}>
      {/* Header with controls */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Token Cost Analytics</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={() => setRealTimeEnabled(!realTimeEnabled)}
            className={`px-3 py-1 rounded ${realTimeEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}
          >
            Real-time: {realTimeEnabled ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'agents', label: 'Agent Analysis', icon: '🤖' },
            { id: 'budget', label: 'Budget Management', icon: '💰' }
          ].map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-2">{icon}</span>
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <TokenUsageMetrics 
            currentMetrics={currentMetrics}
            realtimeData={realtimeData}
            isLoading={isLoading}
          />
          <CostBreakdownCharts 
            data={historicalData}
            timeRange={timeRange}
          />
        </div>
      )}

      {activeTab === 'agents' && (
        <AgentCostAnalysis 
          timeRange={timeRange}
          realtimeData={realtimeData}
        />
      )}

      {activeTab === 'budget' && (
        <BudgetManagement 
          budgetStatus={budgetStatus}
          currentSpend={currentMetrics?.totalCost || 0}
        />
      )}
    </div>
  );
};
```

#### 3. Token Usage Metrics Component
```typescript
// TokenUsageMetrics.tsx
import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Hash } from 'lucide-react';

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
      label: 'Total Cost (24h)',
      value: currentMetrics?.totalCost || 0,
      format: (value: number) => `$${value.toFixed(4)}`,
      trend: currentMetrics?.costTrend || 0,
      icon: DollarSign,
      color: 'blue'
    },
    {
      id: 'total-tokens',
      label: 'Total Tokens (24h)',
      value: currentMetrics?.tokenCount || 0,
      format: (value: number) => value.toLocaleString(),
      trend: currentMetrics?.tokenTrend || 0,
      icon: Hash,
      color: 'green'
    },
    {
      id: 'current-rate',
      label: 'Current Hourly Rate',
      value: realtimeData?.current_hourly_rate || 0,
      format: (value: number) => `$${value.toFixed(4)}/hr`,
      trend: realtimeData?.rate_trend || 0,
      icon: TrendingUp,
      color: 'purple'
    },
    {
      id: 'avg-cost-per-request',
      label: 'Avg Cost/Request',
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
          <div key={i} className="bg-white p-6 rounded-lg border animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map(({ id, label, value, format, trend, icon: Icon, color }) => (
        <div key={id} className="bg-white p-6 rounded-lg border">
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
            <div className="text-sm text-gray-600">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

### Custom Hooks

#### 1. Token Tracking Hook
```typescript
// hooks/useTokenTracking.ts
import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';

export interface TokenUsageEvent {
  timestamp: string;
  service: 'claude' | 'openai' | 'mcp' | 'swarm';
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  agent_id?: string;
  task_id?: string;
  session_id: string;
}

export const useTokenTracking = () => {
  const [currentSessionTokens, setCurrentSessionTokens] = useState(0);
  const [currentSessionCost, setCurrentSessionCost] = useState(0);
  const [recentUsage, setRecentUsage] = useState<TokenUsageEvent[]>([]);

  // WebSocket connection for real-time updates
  const { data: wsData, sendMessage } = useWebSocket('/ws/token-analytics');

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
  const trackTokenUsage = useCallback((usage: Omit<TokenUsageEvent, 'timestamp'>) => {
    const event: TokenUsageEvent = {
      ...usage,
      timestamp: new Date().toISOString()
    };

    // Send to server for persistence
    sendMessage({
      type: 'track_token_usage',
      data: event
    });

    // Update local state immediately
    setCurrentSessionTokens(prev => prev + event.total_tokens);
    setCurrentSessionCost(prev => prev + event.estimated_cost);
    setRecentUsage(prev => [...prev.slice(-49), event]);

    return event;
  }, [sendMessage]);

  // Reset session counters
  const resetSession = useCallback(() => {
    setCurrentSessionTokens(0);
    setCurrentSessionCost(0);
    setRecentUsage([]);
  }, []);

  return {
    currentSessionTokens,
    currentSessionCost,
    recentUsage,
    trackTokenUsage,
    resetSession,
    isConnected: !!wsData
  };
};
```

#### 2. Cost Calculation Hook
```typescript
// hooks/useCostCalculation.ts
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

interface PricingModel {
  [model: string]: {
    input_price_per_1k: number;
    output_price_per_1k: number;
    request_price?: number;
  };
}

export const useCostCalculation = () => {
  // Fetch current pricing model
  const { data: pricingModel } = useQuery<PricingModel>({
    queryKey: ['pricing-model'],
    queryFn: async () => {
      const response = await fetch('/api/v1/analytics/pricing');
      return response.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: 60 * 60 * 1000 // Refresh hourly
  });

  // Calculate cost for a specific usage
  const calculateCost = useMemo(() => {
    return (model: string, inputTokens: number, outputTokens: number): number => {
      if (!pricingModel || !pricingModel[model]) {
        // Fallback pricing if model not found
        console.warn(`Pricing not found for model: ${model}, using fallback`);
        return (inputTokens + outputTokens) * 0.00001; // $0.01 per 1000 tokens fallback
      }

      const pricing = pricingModel[model];
      const inputCost = (inputTokens / 1000) * pricing.input_price_per_1k;
      const outputCost = (outputTokens / 1000) * pricing.output_price_per_1k;
      const requestCost = pricing.request_price || 0;

      return inputCost + outputCost + requestCost;
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
        min_cost: baseCost - uncertainty,
        max_cost: baseCost + uncertainty,
        confidence: 0.95
      };
    };
  }, [calculateCost]);

  // Estimate tokens from text content
  const estimateTokens = useMemo(() => {
    return (text: string, model: string = 'claude-3-haiku'): number => {
      // Simple estimation: ~4 characters per token for English text
      const baseEstimate = Math.ceil(text.length / 4);
      
      // Model-specific adjustments
      const modelMultipliers = {
        'claude-3-haiku': 1.0,
        'claude-3-sonnet': 1.1,
        'claude-3-opus': 1.2,
        'gpt-3.5-turbo': 0.9,
        'gpt-4': 1.1
      };
      
      const multiplier = modelMultipliers[model as keyof typeof modelMultipliers] || 1.0;
      return Math.ceil(baseEstimate * multiplier);
    };
  }, []);

  return {
    calculateCost,
    calculateCostWithConfidence,
    estimateTokens,
    pricingModel,
    isLoading: !pricingModel
  };
};
```

## Backend Implementation

### API Service Layer

#### 1. Token Analytics Service
```typescript
// services/TokenAnalyticsService.ts
import { TokenUsageEvent, CostBreakdown, BudgetStatus } from '../types';
import { TokenStorage } from '../storage/TokenStorage';
import { PricingService } from './PricingService';
import { AlertService } from './AlertService';

export class TokenAnalyticsService {
  constructor(
    private storage: TokenStorage,
    private pricingService: PricingService,
    private alertService: AlertService
  ) {}

  async trackTokenUsage(usage: TokenUsageEvent): Promise<void> {
    // Calculate accurate cost
    const cost = await this.pricingService.calculateCost(
      usage.model,
      usage.input_tokens,
      usage.output_tokens
    );

    // Store the usage event
    await this.storage.storeTokenUsage({
      ...usage,
      estimated_cost: cost.estimated_cost,
      timestamp: new Date().toISOString()
    });

    // Check budget alerts
    await this.checkBudgetAlerts(usage.session_id);

    // Emit real-time update
    this.emitRealtimeUpdate(usage);
  }

  async getTokenAnalytics(params: {
    timeRange: string;
    breakdown?: string;
    agentId?: string;
  }): Promise<CostBreakdown[]> {
    const { timeRange, breakdown = 'service', agentId } = params;
    
    const data = await this.storage.getAggregatedUsage({
      start_time: this.getStartTime(timeRange),
      end_time: new Date(),
      group_by: breakdown,
      agent_id: agentId
    });

    return data.map(item => ({
      service: item.service,
      model: item.model,
      total_cost: item.total_cost,
      total_tokens: item.total_tokens,
      request_count: item.request_count,
      avg_cost_per_request: item.total_cost / item.request_count,
      time_period: timeRange
    }));
  }

  async getBudgetStatus(): Promise<BudgetStatus> {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlySpend = await this.storage.getMonthlySpend(currentYear, currentMonth);
    const budget = await this.storage.getBudgetConfiguration();
    
    if (!budget) {
      throw new Error('Budget not configured');
    }

    const utilizationPercentage = (monthlySpend / budget.monthly_limit) * 100;
    const projectedSpend = this.calculateProjectedSpend(monthlySpend);
    
    return {
      monthly_limit: budget.monthly_limit,
      current_spend: monthlySpend,
      utilization_percentage: utilizationPercentage,
      projected_end_of_month: projectedSpend,
      days_remaining: this.getDaysRemainingInMonth(),
      alerts: await this.getActiveAlerts()
    };
  }

  private async checkBudgetAlerts(sessionId: string): Promise<void> {
    const budgetStatus = await this.getBudgetStatus();
    const thresholds = [50, 80, 90, 100];
    
    for (const threshold of thresholds) {
      if (budgetStatus.utilization_percentage >= threshold) {
        await this.alertService.triggerBudgetAlert({
          threshold,
          current_usage: budgetStatus.current_spend,
          budget_limit: budgetStatus.monthly_limit,
          session_id: sessionId
        });
      }
    }
  }

  private emitRealtimeUpdate(usage: TokenUsageEvent): void {
    // Emit to WebSocket clients
    this.websocketService.broadcast('token_usage_update', {
      timestamp: usage.timestamp,
      cost: usage.estimated_cost,
      tokens: usage.total_tokens,
      service: usage.service,
      model: usage.model
    });
  }

  private getStartTime(timeRange: string): Date {
    const now = new Date();
    switch (timeRange) {
      case '1h': return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private calculateProjectedSpend(currentSpend: number): number {
    const daysInMonth = new Date().getDate();
    const totalDaysInMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    ).getDate();
    
    return (currentSpend / daysInMonth) * totalDaysInMonth;
  }

  private getDaysRemainingInMonth(): number {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return lastDay.getDate() - today.getDate();
  }
}
```

#### 2. Token Interceptors

##### Claude API Interceptor
```typescript
// interceptors/ClaudeTokenInterceptor.ts
import { TokenAnalyticsService } from '../services/TokenAnalyticsService';

export class ClaudeTokenInterceptor {
  constructor(private analyticsService: TokenAnalyticsService) {}

  async interceptRequest(request: Request): Promise<Request> {
    // Add tracking metadata to request
    const trackingId = this.generateTrackingId();
    
    // Store request start time
    this.storeRequestStart(trackingId, {
      timestamp: new Date().toISOString(),
      endpoint: request.url,
      method: request.method,
      model: this.extractModelFromRequest(request)
    });

    // Clone request with tracking headers
    const modifiedRequest = request.clone();
    modifiedRequest.headers.set('X-Tracking-ID', trackingId);
    
    return modifiedRequest;
  }

  async interceptResponse(response: Response): Promise<Response> {
    const trackingId = response.headers.get('X-Tracking-ID');
    
    if (!trackingId) {
      return response;
    }

    try {
      // Extract token usage from response headers
      const inputTokens = parseInt(response.headers.get('x-claude-input-tokens') || '0');
      const outputTokens = parseInt(response.headers.get('x-claude-output-tokens') || '0');
      const model = response.headers.get('x-claude-model') || 'claude-3-haiku';

      // Get request metadata
      const requestData = this.getRequestStart(trackingId);
      
      if (inputTokens > 0 || outputTokens > 0) {
        // Track the token usage
        await this.analyticsService.trackTokenUsage({
          timestamp: new Date().toISOString(),
          service: 'claude',
          model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens,
          estimated_cost: 0, // Will be calculated by service
          session_id: this.getSessionId(response),
          task_id: response.headers.get('x-task-id') || undefined,
          agent_id: response.headers.get('x-agent-id') || undefined
        });
      }

      // Clean up tracking data
      this.cleanupRequestData(trackingId);
      
    } catch (error) {
      console.error('Error tracking Claude API tokens:', error);
    }

    return response;
  }

  private extractModelFromRequest(request: Request): string {
    try {
      const body = request.body ? JSON.parse(request.body.toString()) : {};
      return body.model || 'claude-3-haiku';
    } catch {
      return 'claude-3-haiku';
    }
  }

  private generateTrackingId(): string {
    return `claude_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionId(response: Response): string {
    return response.headers.get('x-session-id') || 'default';
  }

  // Request tracking storage methods
  private storeRequestStart(trackingId: string, data: any): void {
    // Store in memory cache or Redis for quick lookup
    this.requestCache.set(trackingId, data);
  }

  private getRequestStart(trackingId: string): any {
    return this.requestCache.get(trackingId);
  }

  private cleanupRequestData(trackingId: string): void {
    this.requestCache.delete(trackingId);
  }
}
```

##### MCP Protocol Interceptor
```typescript
// interceptors/MCPTokenInterceptor.ts
export class MCPTokenInterceptor {
  constructor(private analyticsService: TokenAnalyticsService) {}

  async interceptMCPMessage(message: any, direction: 'inbound' | 'outbound'): Promise<void> {
    try {
      const estimatedTokens = this.estimateTokensFromMessage(message);
      
      if (estimatedTokens > 0) {
        await this.analyticsService.trackTokenUsage({
          timestamp: new Date().toISOString(),
          service: 'mcp',
          model: 'mcp-protocol',
          input_tokens: direction === 'outbound' ? estimatedTokens : 0,
          output_tokens: direction === 'inbound' ? estimatedTokens : 0,
          total_tokens: estimatedTokens,
          estimated_cost: 0, // Will be calculated by service
          session_id: this.extractSessionId(message),
          task_id: message.id || undefined
        });
      }
    } catch (error) {
      console.error('Error tracking MCP tokens:', error);
    }
  }

  private estimateTokensFromMessage(message: any): number {
    // Convert message to string and estimate tokens
    const messageString = JSON.stringify(message);
    
    // Rough estimation: 4 characters per token
    const estimatedTokens = Math.ceil(messageString.length / 4);
    
    // Cap at reasonable limits
    return Math.min(estimatedTokens, 10000);
  }

  private extractSessionId(message: any): string {
    return message.sessionId || message.headers?.sessionId || 'mcp-session';
  }
}
```

### Data Storage Layer

#### Database Schema
```sql
-- Token usage events table
CREATE TABLE token_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL,
  service VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL,
  estimated_cost DECIMAL(12,8) NOT NULL,
  actual_cost DECIMAL(12,8),
  agent_id VARCHAR(100),
  task_id VARCHAR(100),
  session_id VARCHAR(100) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_token_events_timestamp ON token_usage_events(timestamp);
CREATE INDEX idx_token_events_service ON token_usage_events(service);
CREATE INDEX idx_token_events_agent ON token_usage_events(agent_id);
CREATE INDEX idx_token_events_session ON token_usage_events(session_id);

-- Cost aggregates table for faster querying
CREATE TABLE cost_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  granularity VARCHAR(20) NOT NULL, -- 'hour', 'day', 'week', 'month'
  service VARCHAR(50) NOT NULL,
  model VARCHAR(100),
  agent_id VARCHAR(100),
  total_tokens BIGINT NOT NULL,
  total_cost DECIMAL(12,8) NOT NULL,
  request_count INTEGER NOT NULL,
  avg_tokens_per_request DECIMAL(10,2),
  avg_cost_per_request DECIMAL(10,8),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget configuration table
CREATE TABLE budget_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  monthly_limit DECIMAL(10,2) NOT NULL,
  weekly_limit DECIMAL(10,2),
  daily_limit DECIMAL(10,2),
  alert_thresholds JSONB, -- [50, 80, 90, 100]
  notification_emails TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget alerts table
CREATE TABLE budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES budget_configurations(id),
  alert_type VARCHAR(50) NOT NULL, -- 'warning', 'critical', 'exceeded'
  threshold_percentage INTEGER NOT NULL,
  current_usage DECIMAL(10,2) NOT NULL,
  budget_limit DECIMAL(10,2) NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by VARCHAR(100),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pricing models table
CREATE TABLE pricing_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  input_price_per_1k DECIMAL(10,8) NOT NULL,
  output_price_per_1k DECIMAL(10,8) NOT NULL,
  request_price DECIMAL(10,8) DEFAULT 0,
  effective_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pricing models
INSERT INTO pricing_models (service, model, input_price_per_1k, output_price_per_1k, effective_date) VALUES
('claude', 'claude-3-haiku', 0.00025, 0.00125, NOW()),
('claude', 'claude-3-sonnet', 0.003, 0.015, NOW()),
('claude', 'claude-3-opus', 0.015, 0.075, NOW()),
('openai', 'gpt-3.5-turbo', 0.0015, 0.002, NOW()),
('openai', 'gpt-4', 0.03, 0.06, NOW()),
('mcp', 'mcp-protocol', 0.0001, 0.0001, NOW());
```

## Real-Time System Design

### WebSocket Architecture
```typescript
// websocket/TokenAnalyticsWebSocket.ts
import { WebSocketServer } from 'ws';
import { TokenAnalyticsService } from '../services/TokenAnalyticsService';

export class TokenAnalyticsWebSocketServer {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(
    private analyticsService: TokenAnalyticsService,
    private port: number = 8080
  ) {
    this.wss = new WebSocketServer({ port });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      
      // Send initial data to new client
      this.sendInitialData(ws);
      
      // Handle incoming messages
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });
      
      // Remove client on disconnect
      ws.on('close', () => {
        this.clients.delete(ws);
      });
    });
  }

  private async sendInitialData(ws: WebSocket): Promise<void> {
    try {
      // Send current metrics
      const currentMetrics = await this.analyticsService.getCurrentMetrics();
      ws.send(JSON.stringify({
        type: 'initial_data',
        data: currentMetrics
      }));
      
      // Send budget status
      const budgetStatus = await this.analyticsService.getBudgetStatus();
      ws.send(JSON.stringify({
        type: 'budget_status',
        data: budgetStatus
      }));
    } catch (error) {
      console.error('Error sending initial data:', error);
    }
  }

  private async handleMessage(ws: WebSocket, message: any): Promise<void> {
    switch (message.type) {
      case 'subscribe_realtime':
        // Client wants real-time updates
        ws.send(JSON.stringify({
          type: 'subscription_confirmed',
          data: { realtime: true }
        }));
        break;
        
      case 'track_token_usage':
        // Manual token usage tracking
        await this.analyticsService.trackTokenUsage(message.data);
        break;
        
      case 'get_agent_metrics':
        const agentMetrics = await this.analyticsService.getAgentMetrics(message.data.agentId);
        ws.send(JSON.stringify({
          type: 'agent_metrics',
          data: agentMetrics
        }));
        break;
        
      default:
        ws.send(JSON.stringify({
          error: `Unknown message type: ${message.type}`
        }));
    }
  }

  // Broadcast real-time updates to all connected clients
  broadcast(type: string, data: any): void {
    const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
    
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Send targeted updates to specific clients
  sendToClients(clientFilter: (ws: WebSocket) => boolean, type: string, data: any): void {
    const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
    
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && clientFilter(client)) {
        client.send(message);
      }
    });
  }
}
```

## Performance Optimization

### Caching Strategy
```typescript
// cache/TokenAnalyticsCache.ts
import Redis from 'ioredis';

export class TokenAnalyticsCache {
  private redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }

  // Cache aggregated data for faster queries
  async cacheAggregatedData(key: string, data: any, ttl: number = 300): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(data));
  }

  async getCachedAggregatedData(key: string): Promise<any | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  // Cache current session data
  async cacheSessionData(sessionId: string, data: any): Promise<void> {
    await this.redis.hset(`session:${sessionId}`, data);
    await this.redis.expire(`session:${sessionId}`, 3600); // 1 hour TTL
  }

  async getSessionData(sessionId: string): Promise<any> {
    return await this.redis.hgetall(`session:${sessionId}`);
  }

  // Cache pricing models
  async cachePricingModel(model: any): Promise<void> {
    await this.redis.setex('pricing:model', 3600, JSON.stringify(model)); // 1 hour TTL
  }

  async getCachedPricingModel(): Promise<any | null> {
    const data = await this.redis.get('pricing:model');
    return data ? JSON.parse(data) : null;
  }

  // Cache real-time metrics
  async cacheRealtimeMetrics(metrics: any): Promise<void> {
    await this.redis.setex('realtime:metrics', 30, JSON.stringify(metrics)); // 30 second TTL
  }

  async getCachedRealtimeMetrics(): Promise<any | null> {
    const data = await this.redis.get('realtime:metrics');
    return data ? JSON.parse(data) : null;
  }
}
```

### Database Optimization
```sql
-- Partitioning for large datasets
CREATE TABLE token_usage_events_y2025m01 PARTITION OF token_usage_events
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE token_usage_events_y2025m02 PARTITION OF token_usage_events
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Materialized views for common aggregations
CREATE MATERIALIZED VIEW daily_cost_summary AS
SELECT 
  DATE_TRUNC('day', timestamp) as day,
  service,
  model,
  SUM(total_tokens) as total_tokens,
  SUM(estimated_cost) as total_cost,
  COUNT(*) as request_count,
  AVG(total_tokens) as avg_tokens,
  AVG(estimated_cost) as avg_cost
FROM token_usage_events
WHERE timestamp >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', timestamp), service, model
ORDER BY day DESC;

-- Refresh materialized view regularly
CREATE OR REPLACE FUNCTION refresh_daily_cost_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_cost_summary;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh every hour
SELECT cron.schedule('refresh-daily-summary', '0 * * * *', 'SELECT refresh_daily_cost_summary();');
```

## Security Considerations

### Data Protection
```typescript
// security/DataProtection.ts
import crypto from 'crypto';

export class TokenDataProtection {
  private encryptionKey: string;

  constructor(encryptionKey: string) {
    this.encryptionKey = encryptionKey;
  }

  // Encrypt sensitive token data
  encryptTokenData(data: any): string {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  // Decrypt token data
  decryptTokenData(encryptedData: string): any {
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }

  // Hash sensitive identifiers
  hashIdentifier(identifier: string): string {
    return crypto.createHash('sha256').update(identifier + this.encryptionKey).digest('hex');
  }

  // Anonymize usage data for analytics
  anonymizeUsageData(data: any): any {
    return {
      ...data,
      session_id: this.hashIdentifier(data.session_id),
      agent_id: data.agent_id ? this.hashIdentifier(data.agent_id) : undefined,
      task_id: data.task_id ? this.hashIdentifier(data.task_id) : undefined
    };
  }
}
```

This technical design provides a comprehensive foundation for implementing token cost analytics with real-time capabilities, performance optimization, and security considerations specifically tailored for integration with the NLD system.