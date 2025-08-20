# Token Cost Analytics System Architecture

## Executive Summary

This document outlines a comprehensive system architecture for integrating token cost analytics into the existing agent-feed system. The architecture extends the proven SystemAnalytics pattern and leverages the robust WebSocket singleton infrastructure to provide real-time token consumption tracking, cost calculation, and budget management.

## 1. Frontend Architecture

### 1.1 Component Hierarchy

```
TokenCostAnalytics (Container)
├── TokenCostDashboard
│   ├── CostOverviewCards
│   ├── TokenUsageChart
│   ├── BudgetAlertPanel
│   └── CostTrendsVisualization
├── TokenTrackerWidget
│   ├── RealTimeTokenCounter
│   ├── CostEstimator
│   └── ServiceBreakdown
├── BudgetManagement
│   ├── BudgetSettingsPanel
│   ├── SpendingLimitsConfig
│   └── AlertConfiguration
└── TokenAnalyticsReports
    ├── DetailedUsageReport
    ├── CostProjectionReport
    └── EfficiencyAnalysis
```

### 1.2 TypeScript Interfaces

```typescript
// Core Token Cost Interfaces
interface TokenUsage {
  id: string;
  timestamp: string;
  service: 'claude' | 'openai' | 'mcp' | 'claude-flow';
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
  metadata?: Record<string, any>;
}

interface CostCalculation {
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

interface BudgetConfiguration {
  id: string;
  name: string;
  totalBudget: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  services: string[];
  alertThresholds: {
    warning: number; // percentage
    critical: number; // percentage
  };
  autoShutoff: boolean;
  autoShutoffThreshold: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TokenCostMetrics {
  timestamp: string;
  totalCost: number;
  totalTokens: number;
  serviceBreakdown: {
    [service: string]: {
      cost: number;
      tokens: number;
      operations: number;
    };
  };
  modelBreakdown: {
    [model: string]: {
      cost: number;
      inputTokens: number;
      outputTokens: number;
      operations: number;
    };
  };
  hourlySpend: number;
  dailySpend: number;
  monthlySpend: number;
  efficiency: {
    costPerOperation: number;
    tokensPerOperation: number;
    avgResponseTime: number;
  };
}

interface BudgetAlert {
  id: string;
  budgetId: string;
  type: 'warning' | 'critical' | 'limit_exceeded';
  currentSpend: number;
  budgetLimit: number;
  percentageUsed: number;
  timestamp: string;
  acknowledged: boolean;
  message: string;
}
```

### 1.3 Custom Hooks

```typescript
// useTokenCostTracking.ts
interface UseTokenCostTrackingOptions {
  autoTrack?: boolean;
  bufferSize?: number;
  flushInterval?: number;
  enableRealTimeUpdates?: boolean;
}

interface UseTokenCostTrackingReturn {
  trackTokenUsage: (usage: Omit<TokenUsage, 'id' | 'timestamp'>) => void;
  currentSession: TokenUsage[];
  totalCost: number;
  totalTokens: number;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  clearSession: () => void;
  exportSession: () => void;
}

// useBudgetManagement.ts
interface UseBudgetManagementReturn {
  budgets: BudgetConfiguration[];
  activeBudget: BudgetConfiguration | null;
  currentSpend: number;
  remainingBudget: number;
  isOverBudget: boolean;
  alerts: BudgetAlert[];
  createBudget: (budget: Omit<BudgetConfiguration, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBudget: (id: string, updates: Partial<BudgetConfiguration>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  acknowledgeAlert: (alertId: string) => void;
  checkBudgetStatus: () => void;
}

// useTokenCostMetrics.ts
interface UseTokenCostMetricsReturn {
  metrics: TokenCostMetrics | null;
  historicalData: TokenCostMetrics[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  exportMetrics: (timeRange: string) => void;
}
```

## 2. Backend Services Architecture

### 2.1 Service Layer

```
Token Cost Services
├── TokenTrackingService
│   ├── TokenInterceptor
│   ├── UsageCalculator
│   └── BatchProcessor
├── CostCalculationService
│   ├── PricingEngine
│   ├── RateCardManager
│   └── CostProjector
├── BudgetManagementService
│   ├── BudgetMonitor
│   ├── AlertManager
│   └── LimitEnforcer
├── AnalyticsService
│   ├── MetricsAggregator
│   ├── TrendAnalyzer
│   └── ReportGenerator
└── WebSocketStreamingService
    ├── RealTimeUpdater
    ├── BatchNotifier
    └── ConnectionManager
```

### 2.2 API Interceptors

```typescript
// API Interceptor for Claude/OpenAI calls
class TokenUsageInterceptor {
  private trackingService: TokenTrackingService;
  private costCalculator: CostCalculationService;

  async interceptRequest(config: any): Promise<any> {
    // Add request timestamp and session info
    config.metadata = {
      requestId: generateUUID(),
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
      estimatedTokens: this.estimateInputTokens(config.data)
    };
    return config;
  }

  async interceptResponse(response: any, config: any): Promise<any> {
    const usage: Omit<TokenUsage, 'id' | 'timestamp'> = {
      service: this.detectService(config.url),
      operation: this.detectOperation(config),
      model: response.data.model || 'unknown',
      inputTokens: response.data.usage?.prompt_tokens || 0,
      outputTokens: response.data.usage?.completion_tokens || 0,
      totalTokens: response.data.usage?.total_tokens || 0,
      estimatedCost: await this.costCalculator.calculateCost(response.data.usage),
      userId: config.metadata.userId,
      agentId: config.metadata.agentId,
      sessionId: config.metadata.sessionId,
      metadata: {
        requestId: config.metadata.requestId,
        responseTime: Date.now() - new Date(config.metadata.timestamp).getTime(),
        endpoint: config.url
      }
    };

    await this.trackingService.recordUsage(usage);
    return response;
  }
}

// MCP Protocol Token Estimator
class MCPTokenEstimator {
  estimateTokensFromMessage(message: any): number {
    // Estimate tokens based on message size and type
    const textContent = JSON.stringify(message);
    return Math.ceil(textContent.length / 4); // Rough estimation
  }

  async trackMCPOperation(
    operation: string, 
    request: any, 
    response: any,
    metadata: any
  ): Promise<void> {
    const usage: Omit<TokenUsage, 'id' | 'timestamp'> = {
      service: 'mcp',
      operation,
      model: 'mcp-protocol',
      inputTokens: this.estimateTokensFromMessage(request),
      outputTokens: this.estimateTokensFromMessage(response),
      totalTokens: this.estimateTokensFromMessage(request) + this.estimateTokensFromMessage(response),
      estimatedCost: 0, // MCP operations typically don't have direct costs
      sessionId: metadata.sessionId,
      metadata: {
        messageType: request.type,
        toolsUsed: request.params?.tools?.length || 0
      }
    };

    await this.trackingService.recordUsage(usage);
  }
}
```

## 3. Real-Time Data Flow Architecture

### 3.1 WebSocket Integration

```typescript
// Extending existing WebSocket context for token cost updates
interface TokenCostWebSocketEvents {
  'token_usage_update': TokenUsage;
  'cost_metrics_update': TokenCostMetrics;
  'budget_alert': BudgetAlert;
  'cost_threshold_reached': { budgetId: string; currentSpend: number; limit: number };
  'daily_cost_summary': { date: string; totalCost: number; breakdown: any };
}

// WebSocket streaming service
class TokenCostStreamingService {
  private wsContext: WebSocketSingletonContext;
  private bufferSize = 100;
  private flushInterval = 5000;
  private usageBuffer: TokenUsage[] = [];
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(wsContext: WebSocketSingletonContext) {
    this.wsContext = wsContext;
    this.initializeStreaming();
  }

  private initializeStreaming(): void {
    // Subscribe to token cost events
    this.wsContext.subscribe('token_usage_update', this.handleTokenUsageUpdate.bind(this));
    this.wsContext.subscribe('cost_metrics_update', this.handleCostMetricsUpdate.bind(this));
    this.wsContext.subscribe('budget_alert', this.handleBudgetAlert.bind(this));
  }

  streamTokenUsage(usage: TokenUsage): void {
    this.usageBuffer.push(usage);
    
    if (this.usageBuffer.length >= this.bufferSize) {
      this.flushBuffer();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.flushBuffer(), this.flushInterval);
    }
  }

  private flushBuffer(): void {
    if (this.usageBuffer.length > 0) {
      this.wsContext.emit('token_usage_batch', {
        usage: [...this.usageBuffer],
        timestamp: new Date().toISOString()
      });
      this.usageBuffer = [];
    }
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }
}
```

### 3.2 Data Flow Diagram

```
[API Calls] → [Token Interceptor] → [Usage Calculator] → [Cost Engine]
     ↓
[Batch Processor] → [WebSocket Stream] → [Real-time UI Updates]
     ↓
[Database Storage] → [Analytics Engine] → [Budget Monitor]
     ↓
[Alert System] → [Notification Service] → [User Alerts]
```

## 4. Database Architecture

### 4.1 Schema Design

```sql
-- Token Usage Table (Main tracking table)
CREATE TABLE token_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    service VARCHAR(50) NOT NULL, -- 'claude', 'openai', 'mcp', 'claude-flow'
    operation VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
    actual_cost DECIMAL(10, 6),
    user_id UUID REFERENCES users(id),
    agent_id VARCHAR(100),
    session_id UUID NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_token_usage_timestamp (timestamp),
    INDEX idx_token_usage_service (service),
    INDEX idx_token_usage_user_id (user_id),
    INDEX idx_token_usage_session_id (session_id),
    INDEX idx_token_usage_agent_id (agent_id),
    INDEX idx_token_usage_service_timestamp (service, timestamp),
    INDEX idx_token_usage_user_timestamp (user_id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Partitioning strategy for performance
CREATE TABLE token_usage_2024_01 PARTITION OF token_usage
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Cost calculation rates table
CREATE TABLE cost_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    input_cost_per_token DECIMAL(12, 10) NOT NULL,
    output_cost_per_token DECIMAL(12, 10) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    effective_date TIMESTAMP NOT NULL,
    expires_at TIMESTAMP,
    rate_limits JSONB, -- Store rate limit information
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(service, model, effective_date),
    INDEX idx_cost_rates_service_model (service, model),
    INDEX idx_cost_rates_effective_date (effective_date)
);

-- Budget configurations table
CREATE TABLE budget_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id),
    total_budget DECIMAL(10, 2) NOT NULL,
    period VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
    services TEXT[], -- Array of services to include
    alert_thresholds JSONB NOT NULL, -- {warning: 75, critical: 90}
    auto_shutoff BOOLEAN DEFAULT false,
    auto_shutoff_threshold DECIMAL(5, 2) DEFAULT 100.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_budget_user_id (user_id),
    INDEX idx_budget_active (is_active)
);

-- Budget alerts table
CREATE TABLE budget_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID REFERENCES budget_configurations(id),
    alert_type VARCHAR(20) NOT NULL, -- 'warning', 'critical', 'limit_exceeded'
    current_spend DECIMAL(10, 2) NOT NULL,
    budget_limit DECIMAL(10, 2) NOT NULL,
    percentage_used DECIMAL(5, 2) NOT NULL,
    message TEXT NOT NULL,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_budget_alerts_budget_id (budget_id),
    INDEX idx_budget_alerts_type (alert_type),
    INDEX idx_budget_alerts_created_at (created_at)
);

-- Aggregated metrics table for performance
CREATE TABLE token_cost_metrics_hourly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hour_timestamp TIMESTAMP NOT NULL,
    user_id UUID REFERENCES users(id),
    service VARCHAR(50),
    model VARCHAR(100),
    total_cost DECIMAL(10, 2) NOT NULL,
    total_tokens INTEGER NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    operation_count INTEGER NOT NULL,
    avg_cost_per_operation DECIMAL(10, 6),
    avg_tokens_per_operation DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(hour_timestamp, user_id, service, model),
    INDEX idx_metrics_hour_timestamp (hour_timestamp),
    INDEX idx_metrics_user_id (user_id),
    INDEX idx_metrics_service (service)
);

-- View for current budget status
CREATE VIEW current_budget_status AS
SELECT 
    bc.id,
    bc.name,
    bc.total_budget,
    bc.period,
    COALESCE(SUM(tu.estimated_cost), 0) as current_spend,
    (bc.total_budget - COALESCE(SUM(tu.estimated_cost), 0)) as remaining_budget,
    ROUND((COALESCE(SUM(tu.estimated_cost), 0) / bc.total_budget * 100), 2) as percentage_used,
    CASE 
        WHEN COALESCE(SUM(tu.estimated_cost), 0) > bc.total_budget THEN true 
        ELSE false 
    END as is_over_budget
FROM budget_configurations bc
LEFT JOIN token_usage tu ON (
    tu.user_id = bc.user_id 
    AND tu.service = ANY(bc.services)
    AND tu.timestamp >= 
        CASE bc.period
            WHEN 'daily' THEN CURRENT_DATE
            WHEN 'weekly' THEN date_trunc('week', CURRENT_DATE)
            WHEN 'monthly' THEN date_trunc('month', CURRENT_DATE)
            WHEN 'yearly' THEN date_trunc('year', CURRENT_DATE)
        END
)
WHERE bc.is_active = true
GROUP BY bc.id, bc.name, bc.total_budget, bc.period;
```

### 4.2 Performance Optimization

```sql
-- Materialized view for fast dashboard queries
CREATE MATERIALIZED VIEW token_cost_dashboard_metrics AS
SELECT 
    date_trunc('hour', timestamp) as hour,
    service,
    model,
    SUM(estimated_cost) as total_cost,
    SUM(total_tokens) as total_tokens,
    COUNT(*) as operation_count,
    AVG(estimated_cost) as avg_cost_per_operation,
    AVG(total_tokens) as avg_tokens_per_operation
FROM token_usage
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY date_trunc('hour', timestamp), service, model
ORDER BY hour DESC;

-- Refresh schedule for materialized view
CREATE OR REPLACE FUNCTION refresh_token_cost_dashboard()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY token_cost_dashboard_metrics;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh every hour
SELECT cron.schedule('refresh-token-dashboard', '0 * * * *', 'SELECT refresh_token_cost_dashboard();');
```

## 5. Integration Architecture

### 5.1 Component Integration

```typescript
// TokenCostAnalytics.tsx - Main container component
import React, { useState, useEffect } from 'react';
import { useWebSocketSingletonContext } from '@/context/WebSocketSingletonContext';
import { useTokenCostTracking } from '@/hooks/useTokenCostTracking';
import { useBudgetManagement } from '@/hooks/useBudgetManagement';
import { useTokenCostMetrics } from '@/hooks/useTokenCostMetrics';
import { TokenCostDashboard } from './TokenCostDashboard';
import { BudgetManagement } from './BudgetManagement';
import { TokenAnalyticsReports } from './TokenAnalyticsReports';

interface TokenCostAnalyticsProps {
  className?: string;
  defaultView?: 'dashboard' | 'budget' | 'reports';
}

export const TokenCostAnalytics: React.FC<TokenCostAnalyticsProps> = ({
  className,
  defaultView = 'dashboard'
}) => {
  const [activeView, setActiveView] = useState(defaultView);
  const wsContext = useWebSocketSingletonContext();
  
  // Initialize hooks
  const tokenTracking = useTokenCostTracking({
    autoTrack: true,
    enableRealTimeUpdates: true
  });
  
  const budgetManagement = useBudgetManagement();
  const metrics = useTokenCostMetrics();

  // Subscribe to real-time updates
  useEffect(() => {
    const handleTokenUsageUpdate = (usage: TokenUsage) => {
      tokenTracking.trackTokenUsage(usage);
    };

    const handleBudgetAlert = (alert: BudgetAlert) => {
      budgetManagement.handleAlert(alert);
    };

    wsContext.subscribe('token_usage_update', handleTokenUsageUpdate);
    wsContext.subscribe('budget_alert', handleBudgetAlert);

    return () => {
      wsContext.unsubscribe('token_usage_update', handleTokenUsageUpdate);
      wsContext.unsubscribe('budget_alert', handleBudgetAlert);
    };
  }, [wsContext, tokenTracking, budgetManagement]);

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <TokenCostDashboard metrics={metrics} tracking={tokenTracking} />;
      case 'budget':
        return <BudgetManagement {...budgetManagement} />;
      case 'reports':
        return <TokenAnalyticsReports metrics={metrics} />;
      default:
        return <TokenCostDashboard metrics={metrics} tracking={tokenTracking} />;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { key: 'budget', label: 'Budget Management', icon: DollarSign },
            { key: 'reports', label: 'Reports', icon: FileText }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveView(key as any)}
              className={cn(
                'flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                activeView === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {renderActiveView()}
    </div>
  );
};
```

### 5.2 API Integration Points

```typescript
// API service for token cost operations
class TokenCostApiService {
  private baseUrl = '/api/v1/token-cost';

  async getTokenUsage(params: {
    timeRange?: string;
    service?: string;
    userId?: string;
    agentId?: string;
  }): Promise<TokenUsage[]> {
    const response = await fetch(`${this.baseUrl}/usage?${new URLSearchParams(params)}`);
    return response.json();
  }

  async getCostMetrics(timeRange: string): Promise<TokenCostMetrics> {
    const response = await fetch(`${this.baseUrl}/metrics?timeRange=${timeRange}`);
    return response.json();
  }

  async createBudget(budget: Omit<BudgetConfiguration, 'id' | 'createdAt' | 'updatedAt'>): Promise<BudgetConfiguration> {
    const response = await fetch(`${this.baseUrl}/budgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(budget)
    });
    return response.json();
  }

  async updateBudget(id: string, updates: Partial<BudgetConfiguration>): Promise<BudgetConfiguration> {
    const response = await fetch(`${this.baseUrl}/budgets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return response.json();
  }

  async getBudgetAlerts(): Promise<BudgetAlert[]> {
    const response = await fetch(`${this.baseUrl}/alerts`);
    return response.json();
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    await fetch(`${this.baseUrl}/alerts/${alertId}/acknowledge`, {
      method: 'POST'
    });
  }
}
```

## 6. Performance Architecture

### 6.1 Caching Strategy

```typescript
// Multi-layer caching implementation
class TokenCostCacheManager {
  private memoryCache = new Map<string, any>();
  private redisClient: Redis;
  private cacheConfig = {
    realTimeMetrics: { ttl: 30 }, // 30 seconds
    hourlyMetrics: { ttl: 3600 }, // 1 hour
    dailyMetrics: { ttl: 86400 }, // 24 hours
    budgetStatus: { ttl: 300 }, // 5 minutes
    costRates: { ttl: 43200 } // 12 hours
  };

  async get(key: string, type: keyof typeof this.cacheConfig): Promise<any> {
    // Check memory cache first
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }

    // Check Redis cache
    const cached = await this.redisClient.get(key);
    if (cached) {
      const data = JSON.parse(cached);
      // Store in memory cache for faster access
      this.memoryCache.set(key, data);
      return data;
    }

    return null;
  }

  async set(key: string, value: any, type: keyof typeof this.cacheConfig): Promise<void> {
    const config = this.cacheConfig[type];
    
    // Store in memory cache
    this.memoryCache.set(key, value);
    
    // Store in Redis with TTL
    await this.redisClient.setex(key, config.ttl, JSON.stringify(value));
  }

  async invalidate(pattern: string): Promise<void> {
    // Clear memory cache entries matching pattern
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear Redis cache entries
    const keys = await this.redisClient.keys(`*${pattern}*`);
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }
  }
}
```

### 6.2 Data Streaming Optimization

```typescript
// Optimized streaming for high-frequency token updates
class TokenStreamOptimizer {
  private batchSize = 50;
  private maxBatchTime = 2000; // 2 seconds
  private compressionThreshold = 1000; // bytes
  
  private pendingUpdates: TokenUsage[] = [];
  private batchTimer: NodeJS.Timeout | null = null;

  queueUpdate(usage: TokenUsage): void {
    this.pendingUpdates.push(usage);
    
    if (this.pendingUpdates.length >= this.batchSize) {
      this.flushBatch();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.flushBatch(), this.maxBatchTime);
    }
  }

  private flushBatch(): void {
    if (this.pendingUpdates.length === 0) return;

    const batch = [...this.pendingUpdates];
    this.pendingUpdates = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Compress batch if it's large
    const serialized = JSON.stringify(batch);
    const shouldCompress = serialized.length > this.compressionThreshold;
    
    const payload = {
      updates: batch,
      compressed: shouldCompress,
      timestamp: new Date().toISOString()
    };

    this.sendBatch(payload);
  }

  private async sendBatch(payload: any): Promise<void> {
    // Send via WebSocket
    // Implementation depends on WebSocket context
  }
}
```

## 7. Security Architecture

### 7.1 Data Protection

```typescript
// Security measures for token cost data
class TokenCostSecurity {
  private encryptionKey: string;
  
  // Encrypt sensitive cost data
  encryptCostData(data: any): string {
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  // Decrypt cost data
  decryptCostData(encryptedData: string): any {
    const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }

  // Sanitize data for logging
  sanitizeForLogging(usage: TokenUsage): Partial<TokenUsage> {
    return {
      id: usage.id,
      timestamp: usage.timestamp,
      service: usage.service,
      operation: usage.operation,
      totalTokens: usage.totalTokens,
      estimatedCost: usage.estimatedCost
      // Exclude potentially sensitive metadata
    };
  }

  // Validate budget permissions
  async validateBudgetAccess(userId: string, budgetId: string): Promise<boolean> {
    // Check if user has access to budget
    // Implementation depends on authorization system
    return true;
  }
}
```

### 7.2 Rate Limiting

```typescript
// Rate limiting for API endpoints
class TokenCostRateLimiter {
  private limits = {
    '/api/v1/token-cost/usage': { rpm: 100, burst: 20 },
    '/api/v1/token-cost/metrics': { rpm: 60, burst: 10 },
    '/api/v1/token-cost/budgets': { rpm: 30, burst: 5 }
  };

  async checkRateLimit(userId: string, endpoint: string): Promise<boolean> {
    const key = `rate_limit:${userId}:${endpoint}`;
    const limit = this.limits[endpoint];
    
    if (!limit) return true;

    // Implementation using Redis sliding window
    // Return true if within limits, false otherwise
    return true;
  }
}
```

## 8. Monitoring & Alerting Architecture

### 8.1 Health Monitoring

```typescript
// Health check system for token cost services
class TokenCostHealthMonitor {
  private healthChecks = [
    () => this.checkDatabaseConnection(),
    () => this.checkRedisConnection(),
    () => this.checkWebSocketConnection(),
    () => this.checkApiEndpoints(),
    () => this.checkDataFreshness()
  ];

  async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Array<{ name: string; status: string; message: string; duration: number }>;
  }> {
    const results = await Promise.allSettled(
      this.healthChecks.map(async (check, index) => {
        const start = Date.now();
        try {
          await check();
          return {
            name: `Check ${index + 1}`,
            status: 'passed',
            message: 'OK',
            duration: Date.now() - start
          };
        } catch (error) {
          return {
            name: `Check ${index + 1}`,
            status: 'failed',
            message: error.message,
            duration: Date.now() - start
          };
        }
      })
    );

    const checks = results.map(result => 
      result.status === 'fulfilled' ? result.value : {
        name: 'Unknown',
        status: 'failed',
        message: 'Check failed',
        duration: 0
      }
    );

    const failedChecks = checks.filter(check => check.status === 'failed').length;
    const status = failedChecks === 0 ? 'healthy' : 
                  failedChecks <= 2 ? 'degraded' : 'unhealthy';

    return { status, checks };
  }
}
```

### 8.2 Alert Configuration

```typescript
// Alert system for cost thresholds and anomalies
class TokenCostAlertSystem {
  private alertRules = [
    {
      name: 'High Cost Spike',
      condition: (metrics: TokenCostMetrics) => 
        metrics.hourlySpend > (metrics.dailySpend / 24) * 2, // 2x daily average
      severity: 'warning',
      cooldown: 3600000 // 1 hour
    },
    {
      name: 'Budget Exceeded',
      condition: (budget: any) => budget.currentSpend > budget.totalBudget,
      severity: 'critical',
      cooldown: 0 // Immediate
    },
    {
      name: 'Unusual Token Pattern',
      condition: (usage: TokenUsage[]) => this.detectAnomalies(usage),
      severity: 'info',
      cooldown: 1800000 // 30 minutes
    }
  ];

  async evaluateAlerts(): Promise<void> {
    // Check each alert rule and trigger notifications
    for (const rule of this.alertRules) {
      // Implementation depends on specific conditions
    }
  }

  private detectAnomalies(usage: TokenUsage[]): boolean {
    // Simple anomaly detection based on statistical analysis
    if (usage.length < 10) return false;
    
    const costs = usage.map(u => u.estimatedCost);
    const mean = costs.reduce((a, b) => a + b, 0) / costs.length;
    const variance = costs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / costs.length;
    const stdDev = Math.sqrt(variance);
    
    const recent = costs.slice(-5);
    const outliers = recent.filter(cost => Math.abs(cost - mean) > stdDev * 2);
    
    return outliers.length > 2; // More than 2 outliers in recent data
  }
}
```

## 9. Deployment Architecture

### 9.1 Infrastructure Components

```yaml
# Docker Compose for token cost services
version: '3.8'
services:
  token-cost-api:
    build: ./token-cost-service
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - WEBSOCKET_URL=${WEBSOCKET_URL}
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis

  token-cost-worker:
    build: ./token-cost-service
    command: npm run worker
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=token_cost
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 9.2 Kubernetes Deployment

```yaml
# Kubernetes deployment for production
apiVersion: apps/v1
kind: Deployment
metadata:
  name: token-cost-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: token-cost-service
  template:
    metadata:
      labels:
        app: token-cost-service
    spec:
      containers:
      - name: token-cost-api
        image: token-cost-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 5
```

## 10. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
1. ✅ Database schema implementation
2. ✅ Basic token tracking service
3. ✅ API interceptors for Claude/OpenAI
4. ✅ WebSocket integration

### Phase 2: Core Features (Weeks 3-4)
1. Cost calculation engine
2. Budget management system
3. Basic dashboard components
4. Real-time updates via WebSocket

### Phase 3: Advanced Features (Weeks 5-6)
1. Advanced analytics and reporting
2. Alert system implementation
3. Performance optimizations
4. MCP protocol integration

### Phase 4: Production Ready (Weeks 7-8)
1. Security hardening
2. Comprehensive testing
3. Documentation completion
4. Deployment automation

## 11. Success Metrics

### Technical Metrics
- **Response Time**: < 200ms for dashboard queries
- **Throughput**: Handle 10,000+ token events/minute
- **Accuracy**: 99.9% token counting accuracy
- **Availability**: 99.5% uptime for cost tracking

### Business Metrics
- **Cost Visibility**: 100% of API calls tracked
- **Budget Compliance**: 95% budget adherence
- **Alert Effectiveness**: < 1 minute alert delivery
- **User Adoption**: 80% active usage within 30 days

## 12. Conclusion

This architecture provides a comprehensive, scalable, and maintainable solution for token cost analytics integration. By leveraging existing proven patterns from the SystemAnalytics component and WebSocket singleton infrastructure, while implementing new specialized services for token tracking and cost management, the system ensures reliable real-time monitoring and budget control.

The modular design allows for incremental implementation and future extensibility, while the performance optimizations ensure the system can handle high-frequency token tracking without impacting user experience.