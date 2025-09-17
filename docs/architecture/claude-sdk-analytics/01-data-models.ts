/**
 * Claude Code SDK Cost Tracking Analytics - Data Models
 * Comprehensive data models for usage tracking, cost analytics, and performance monitoring
 */

// =============================================
// CORE TRACKING MODELS
// =============================================

export interface SDKUsageEvent {
  id: string;
  timestamp: string;
  sessionId: string;
  userId: string;
  requestId: string;

  // SDK Context
  workingDirectory: string;
  permissionMode: 'bypassPermissions' | 'standard';
  modelUsed: string;

  // Request Details
  promptLength: number;
  responseLength: number;
  toolsUsed: string[];
  executionDuration: number;

  // Token Analytics
  tokenUsage: {
    input: number;
    output: number;
    total: number;
    cached?: number;
  };

  // Cost Calculation
  costBreakdown: {
    inputCost: number;
    outputCost: number;
    toolUsageCost: number;
    totalCost: number;
    currency: 'USD';
  };

  // Performance Metrics
  performance: {
    firstTokenLatency: number;
    tokensPerSecond: number;
    memoryUsage: number;
    cpuUsage: number;
    networkLatency: number;
  };

  // Error Tracking
  errors?: SDKError[];
  warnings?: SDKWarning[];

  // Metadata
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    geographic?: GeographicInfo;
    experiment?: string;
    feature?: string;
  };
}

export interface SDKError {
  type: 'authentication' | 'permission' | 'timeout' | 'rate_limit' | 'tool_execution' | 'system';
  code: string;
  message: string;
  stack?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  retryCount?: number;
  contextData?: Record<string, any>;
}

export interface SDKWarning {
  type: 'performance' | 'usage' | 'deprecation' | 'quota';
  message: string;
  timestamp: string;
  threshold?: number;
  actualValue?: number;
  recommendation?: string;
}

export interface GeographicInfo {
  country: string;
  region: string;
  city: string;
  timezone: string;
  coordinates?: [number, number]; // [lat, lon]
}

// =============================================
// AGGREGATED ANALYTICS MODELS
// =============================================

export interface UsageAnalytics {
  timeframe: TimeFrame;
  period: AnalyticsPeriod;

  // Volume Metrics
  volume: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    uniqueUsers: number;
    uniqueSessions: number;
  };

  // Performance Metrics
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    avgTokensPerSecond: number;
    avgFirstTokenLatency: number;
    errorRate: number;
    successRate: number;
  };

  // Cost Analysis
  costs: {
    byModel: Record<string, number>;
    byUser: Record<string, number>;
    byFeature: Record<string, number>;
    byTimeOfDay: Record<string, number>;
    trend: TrendData[];
  };

  // Usage Patterns
  patterns: {
    peakHours: number[];
    mostUsedTools: ToolUsageStats[];
    userSegments: UserSegmentStats[];
    sessionLengths: number[];
  };

  // Resource Utilization
  resources: {
    avgMemoryUsage: number;
    avgCpuUsage: number;
    networkBandwidth: number;
    concurrentSessions: number;
  };
}

export interface TimeFrame {
  startTime: string;
  endTime: string;
  duration: number; // milliseconds
}

export type AnalyticsPeriod = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface TrendData {
  timestamp: string;
  value: number;
  label?: string;
}

export interface ToolUsageStats {
  toolName: string;
  usageCount: number;
  totalCost: number;
  avgExecutionTime: number;
  successRate: number;
  errorCount: number;
}

export interface UserSegmentStats {
  segment: string;
  userCount: number;
  totalUsage: number;
  avgCostPerUser: number;
  retentionRate: number;
}

// =============================================
// REAL-TIME STREAMING MODELS
// =============================================

export interface LiveMetrics {
  timestamp: string;
  activeRequests: number;
  requestsPerSecond: number;
  tokensPerSecond: number;
  costPerSecond: number;
  avgResponseTime: number;
  errorRate: number;
  queueLength: number;

  // Resource Monitoring
  systemLoad: {
    cpu: number;
    memory: number;
    network: number;
    disk: number;
  };

  // Geographic Distribution
  activeRegions: RegionActivity[];

  // Feature Usage
  activeFeatures: FeatureActivity[];
}

export interface RegionActivity {
  region: string;
  activeUsers: number;
  requestsPerSecond: number;
  avgLatency: number;
}

export interface FeatureActivity {
  feature: string;
  activeUsers: number;
  usageCount: number;
  cost: number;
}

// =============================================
// ALERTING AND MONITORING MODELS
// =============================================

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  timestamp: string;

  // Trigger Conditions
  metric: string;
  threshold: number;
  actualValue: number;
  operator: ThresholdOperator;

  // Context
  affectedUsers?: string[];
  affectedSessions?: string[];
  relatedMetrics?: Record<string, number>;

  // Response
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  actions?: AlertAction[];
}

export type AlertType =
  | 'cost_threshold'
  | 'performance_degradation'
  | 'error_rate_spike'
  | 'quota_exceeded'
  | 'security_anomaly'
  | 'system_overload';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'suppressed';

export type ThresholdOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';

export interface AlertAction {
  type: 'notification' | 'auto_scale' | 'circuit_breaker' | 'rate_limit';
  timestamp: string;
  result: 'success' | 'failure' | 'pending';
  details?: Record<string, any>;
}

// =============================================
// OPTIMIZATION AND RECOMMENDATIONS
// =============================================

export interface OptimizationRecommendation {
  id: string;
  category: OptimizationCategory;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;

  // Impact Analysis
  potentialSavings: {
    cost: number;
    performance: number;
    reliability: number;
  };

  // Implementation
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedEffort: string;
  prerequisites: string[];
  steps: string[];

  // Validation
  kpis: string[];
  successCriteria: SuccessCriteria[];

  // Metadata
  appliesTo: string[]; // user IDs, features, etc.
  validUntil?: string;
  source: 'ml_analysis' | 'rule_based' | 'manual';
}

export type OptimizationCategory =
  | 'cost_reduction'
  | 'performance_improvement'
  | 'reliability_enhancement'
  | 'user_experience'
  | 'resource_optimization';

export interface SuccessCriteria {
  metric: string;
  operator: ThresholdOperator;
  targetValue: number;
  timeframe: string;
}

// =============================================
// CONFIGURATION AND SETTINGS
// =============================================

export interface AnalyticsConfiguration {
  collection: {
    samplingRate: number; // 0-1
    enabledMetrics: string[];
    retentionPeriods: Record<string, number>; // in days
    aggregationIntervals: AnalyticsPeriod[];
  };

  alerts: {
    enabled: boolean;
    channels: AlertChannel[];
    thresholds: AlertThreshold[];
    suppressionRules: SuppressionRule[];
  };

  optimization: {
    enableRecommendations: boolean;
    mlModelsEnabled: boolean;
    updateFrequency: string;
    confidenceThreshold: number;
  };

  privacy: {
    anonymizeUserData: boolean;
    dataRetentionDays: number;
    allowedRegions: string[];
    encryptionEnabled: boolean;
  };
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: Record<string, any>;
  severityFilter: AlertSeverity[];
  typeFilter: AlertType[];
}

export interface AlertThreshold {
  metric: string;
  operator: ThresholdOperator;
  value: number;
  severity: AlertSeverity;
  timeWindow: string;
  minOccurrences?: number;
}

export interface SuppressionRule {
  pattern: string;
  duration: number; // minutes
  reason: string;
  active: boolean;
}

// =============================================
// EXPORT TYPES FOR EXTERNAL CONSUMPTION
// =============================================

export type {
  SDKUsageEvent as UsageEvent,
  UsageAnalytics as Analytics,
  LiveMetrics as RealTimeMetrics,
  Alert as SystemAlert,
  OptimizationRecommendation as Recommendation
};