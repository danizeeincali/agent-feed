// Analytics Types for Claude Code SDK Cost Tracking
// Comprehensive type definitions for analytics dashboard

export interface CostMetrics {
  totalCost: number;
  dailyCost: number;
  weeklyCost: number;
  monthlyCost: number;
  costTrend: 'increasing' | 'decreasing' | 'stable';
  averageCostPerRequest: number;
  lastUpdated: Date;
}

export interface TokenUsageMetrics {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  tokensPerHour: number;
  tokensPerDay: number;
  averageTokensPerRequest: number;
  tokenEfficiency: number;
}

export interface ServiceTierUsage {
  tier: 'basic' | 'premium' | 'enterprise';
  requestCount: number;
  tokenUsage: number;
  cost: number;
  percentage: number;
  responseTime: number;
}

export interface MessageAnalytics {
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  averageResponseTime: number;
  messageTypes: Record<string, number>;
  errorRate: number;
}

export interface StepAnalytics {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  averageStepDuration: number;
  stepTypes: Record<string, number>;
  stepSuccessRate: number;
}

export interface CostOptimization {
  id: string;
  title: string;
  description: string;
  potentialSavings: number;
  implementation: 'easy' | 'medium' | 'hard';
  priority: 'low' | 'medium' | 'high';
  category: 'tokens' | 'requests' | 'timing' | 'caching';
}

export interface BudgetAlert {
  id: string;
  type: 'warning' | 'critical' | 'exceeded';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
}

export interface AnalyticsTimeRange {
  start: Date;
  end: Date;
  granularity: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface CostBreakdown {
  provider: string;
  model: string;
  requests: number;
  tokens: number;
  cost: number;
  percentage: number;
}

export interface PerformanceMetrics {
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number;
  errorRate: number;
  uptime: number;
}

export interface ExportData {
  exportDate: string;
  timeRange: AnalyticsTimeRange;
  costMetrics: CostMetrics;
  tokenUsage: TokenUsageMetrics;
  messageAnalytics: MessageAnalytics;
  stepAnalytics: StepAnalytics;
  serviceTiers: ServiceTierUsage[];
  recommendations: CostOptimization[];
  rawData?: any[];
}

export interface AnalyticsDashboardState {
  timeRange: '1h' | '24h' | '7d' | '30d' | 'custom';
  selectedMetrics: string[];
  refreshInterval: number;
  autoRefresh: boolean;
  showOptimizations: boolean;
  budgetAlerts: BudgetAlert[];
}

// Chart configuration types
export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  title: string;
  xAxis: string;
  yAxis: string;
  colors: string[];
  showGrid: boolean;
  showLegend: boolean;
}

export interface DashboardCard {
  id: string;
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon: string;
  color: string;
  subtitle?: string;
}

// Real-time update types
export interface RealTimeUpdate {
  type: 'cost' | 'tokens' | 'message' | 'step' | 'alert';
  data: any;
  timestamp: Date;
}

export interface WebSocketMessage {
  event: string;
  data: RealTimeUpdate;
  id: string;
}

// Filter and grouping types
export interface AnalyticsFilter {
  providers?: string[];
  models?: string[];
  dateRange?: AnalyticsTimeRange;
  serviceTiers?: string[];
  messageTypes?: string[];
}

export interface GroupByOption {
  field: string;
  label: string;
  aggregation: 'sum' | 'average' | 'count' | 'max' | 'min';
}

// Component prop types
export interface AnalyticsComponentProps {
  className?: string;
  timeRange?: string;
  showHeader?: boolean;
  showExport?: boolean;
  refreshInterval?: number;
  filters?: AnalyticsFilter;
}

export interface ChartComponentProps extends AnalyticsComponentProps {
  data: ChartDataPoint[];
  config: ChartConfig;
  height?: number;
  interactive?: boolean;
}

export interface CardComponentProps extends AnalyticsComponentProps {
  card: DashboardCard;
  onClick?: () => void;
}
