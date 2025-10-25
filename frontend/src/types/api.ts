/**
 * Real API Types and Interfaces
 * Production-ready type definitions for all API responses
 */

// Core entity interfaces
export interface Agent {
  id: string;
  slug: string;
  name: string;
  display_name: string;
  description: string;
  system_prompt: string;
  avatar_color: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  created_at: string;
  updated_at: string;
  last_used: string | null;
  usage_count: number;
  version: string;
  configuration: Record<string, any>;
  performance_metrics: AgentPerformanceMetrics;
  health_status: AgentHealthStatus;
  error_log?: ErrorLogEntry[];

  // Tier system fields
  tier?: 1 | 2;
  visibility?: 'public' | 'protected';
  icon?: string;
  icon_type?: 'svg' | 'emoji';
  icon_emoji?: string;
  posts_as_self?: boolean;
  show_in_default_feed?: boolean;
  tools?: string[];
}

export interface AgentPerformanceMetrics {
  success_rate: number;
  average_response_time: number;
  total_tokens_used: number;
  error_count: number;
  uptime_percentage: number;
  last_performance_check: string;
  performance_trend: 'improving' | 'stable' | 'declining';
}

export interface AgentHealthStatus {
  cpu_usage: number;
  memory_usage: number;
  response_time: number;
  last_heartbeat: string;
  connection_status: 'connected' | 'disconnected' | 'unstable';
  error_count_24h: number;
}

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack_trace?: string;
  context?: Record<string, any>;
}

export interface AgentPost {
  id: string;
  title: string;
  content: string;
  summary?: string;
  authorAgent: string;
  authorAgentName: string;
  publishedAt: string;
  updatedAt: string;
  status: 'published' | 'draft' | 'archived' | 'scheduled';
  visibility: 'public' | 'internal' | 'private';
  metadata: PostMetadata;
  engagement: PostEngagement;
  tags: string[];
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  attachments?: Attachment[];
  // Top-level comment count (API returns this at root level, not in engagement)
  comments?: number;
  // Ticket status for proactive agent work (API returns as ticket_status with summary nested)
  ticket_status?: {
    summary: TicketStatusData;
    has_tickets: boolean;
  };
  // Legacy alias for compatibility
  ticketStatus?: TicketStatusData;
  // Alias for compatibility
  created_at?: string;
}

export interface PostMetadata {
  businessImpact: number;
  confidence_score: number;
  isAgentResponse: boolean;
  parent_post_id?: string;
  conversation_thread_id?: string;
  processing_time_ms: number;
  model_version: string;
  tokens_used: number;
  temperature: number;
}

export interface PostEngagement {
  comments: number;
  shares: number;
  views: number;
  saves: number;
  reactions: Record<string, number>;
  stars: {
    average: number;
    count: number;
    distribution: Record<string, number>; // "1": 5, "2": 10, etc.
  };
  userRating?: number; // Current user's rating
  isSaved?: boolean; // Whether current user has saved this post
  savedCount?: number; // Total number of saves across all users
}

export interface TicketStatusData {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  agents: string[];
}

export interface Attachment {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  url: string;
  thumbnail_url?: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
  agent_id: string;
  agent_name: string;
  status: ActivityStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata: ActivityMetadata;
  related_entities?: RelatedEntity[];
}

export type ActivityType = 
  | 'task_completed'
  | 'task_started'
  | 'task_failed'
  | 'agent_spawned'
  | 'agent_terminated'
  | 'error_resolved'
  | 'error_occurred'
  | 'performance_update'
  | 'system_maintenance'
  | 'configuration_updated'
  | 'health_check'
  | 'backup_completed';

export type ActivityStatus = 'completed' | 'failed' | 'in_progress' | 'cancelled' | 'scheduled';

export interface ActivityMetadata {
  duration_ms: number;
  tokens_used: number;
  error_message?: string;
  error_code?: string;
  retry_count?: number;
  resource_usage?: ResourceUsage;
  correlation_id?: string;
}

export interface ResourceUsage {
  cpu_time_ms: number;
  memory_peak_mb: number;
  disk_io_mb: number;
  network_bytes: number;
}

export interface RelatedEntity {
  type: 'agent' | 'post' | 'task' | 'workflow';
  id: string;
  name: string;
}

// System metrics and monitoring
export interface SystemMetrics {
  timestamp: string;
  server_id: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_io: NetworkIO;
  response_time: number;
  throughput: number;
  error_rate: number;
  active_connections: number;
  queue_depth: number;
  cache_hit_rate: number;
}

export interface NetworkIO {
  bytes_in: number;
  bytes_out: number;
  packets_in: number;
  packets_out: number;
}

export interface AnalyticsData {
  timeRange: string;
  agent_stats: AgentAnalytics[];
  system_overview: SystemOverview;
  performance_trends: PerformanceTrend[];
  error_analysis: ErrorAnalysis;
}

export interface AgentAnalytics {
  agent_id: string;
  name: string;
  tasks_completed: number;
  success_rate: number;
  avg_response_time: number;
  tokens_consumed: number;
  error_count: number;
  uptime_hours: number;
}

export interface SystemOverview {
  total_agents: number;
  active_agents: number;
  total_posts: number;
  total_activities: number;
  system_health_score: number;
  last_backup: string;
}

export interface PerformanceTrend {
  metric: string;
  values: number[];
  timestamps: string[];
  trend: 'up' | 'down' | 'stable';
  change_percentage: number;
}

export interface ErrorAnalysis {
  total_errors: number;
  error_rate: number;
  top_error_types: ErrorTypeCount[];
  resolution_times: number[];
  recurring_issues: RecurringIssue[];
}

export interface ErrorTypeCount {
  type: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RecurringIssue {
  pattern: string;
  occurrences: number;
  last_occurrence: string;
  suggested_fix: string;
}

// Claude instance management
export interface ClaudeInstance {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error' | 'starting' | 'stopping';
  created_at: string;
  last_activity: string;
  configuration: ClaudeInstanceConfig;
  performance: ClaudeInstancePerformance;
  terminal_session?: TerminalSession;
}

export interface ClaudeInstanceConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  timeout_ms: number;
  custom_instructions?: string;
  environment_variables: Record<string, string>;
}

export interface ClaudeInstancePerformance {
  requests_processed: number;
  avg_response_time: number;
  tokens_per_second: number;
  error_rate: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
}

export interface TerminalSession {
  session_id: string;
  status: 'active' | 'inactive' | 'error';
  created_at: string;
  last_command: string;
  working_directory: string;
  environment: Record<string, string>;
}

// API response wrappers
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  timestamp: string;
  request_id?: string;
  pagination?: PaginationInfo;
  meta?: ResponseMetadata;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ResponseMetadata {
  cached: boolean;
  cache_age_ms?: number;
  processing_time_ms: number;
  data_source: 'database' | 'cache' | 'external_api';
  api_version: string;
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  trace_id?: string;
  suggestions?: string[];
}

// WebSocket message types
export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
  timestamp: string;
  source: string;
}

export type WebSocketMessageType =
  | 'agents_updated'
  | 'agent_status_changed'
  | 'posts_updated'
  | 'post_created'
  | 'activity_logged'
  | 'metrics_updated'
  | 'system_alert'
  | 'instance_status_changed'
  | 'terminal_output'
  | 'error_occurred'
  | 'health_check';

// Search and filtering
export interface SearchFilters {
  query?: string;
  category?: string;
  status?: string;
  agent_id?: string;
  date_from?: string;
  date_to?: string;
  tags?: string[];
  priority?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  saved_only?: boolean; // Filter for saved posts
  my_posts_only?: boolean; // Filter for current user's posts
  user_id?: string; // User ID for filtering
}

// Enhanced filter interface for frontend components
export interface FilterStats {
  totalPosts: number;
  savedPosts: number;
  myPosts: number;
  agentCounts: Record<string, number>;
  hashtagCounts: Record<string, number>;
}

// Saved posts interface
export interface SavedPost {
  id: string;
  post_id: string;
  user_id: string;
  saved_at: string;
  post?: AgentPost; // Optional populated post data
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  query: string;
  filters: SearchFilters;
  took_ms: number;
  suggestions?: string[];
}

// Configuration and settings
export interface SystemConfiguration {
  api_rate_limits: RateLimits;
  cache_settings: CacheSettings;
  notification_settings: NotificationSettings;
  monitoring_settings: MonitoringSettings;
  security_settings: SecuritySettings;
}

export interface RateLimits {
  requests_per_minute: number;
  requests_per_hour: number;
  burst_limit: number;
  concurrent_requests: number;
}

export interface CacheSettings {
  default_ttl_ms: number;
  max_cache_size_mb: number;
  cache_strategy: 'lru' | 'fifo' | 'ttl';
  enable_compression: boolean;
}

export interface NotificationSettings {
  email_notifications: boolean;
  slack_notifications: boolean;
  webhook_url?: string;
  notification_levels: string[];
}

export interface MonitoringSettings {
  metrics_retention_days: number;
  alert_thresholds: AlertThresholds;
  health_check_interval_ms: number;
  performance_monitoring: boolean;
}

export interface AlertThresholds {
  cpu_usage_percent: number;
  memory_usage_percent: number;
  error_rate_percent: number;
  response_time_ms: number;
}

export interface SecuritySettings {
  api_key_rotation_days: number;
  session_timeout_ms: number;
  max_login_attempts: number;
  require_2fa: boolean;
}

// Utility types
export type Timestamp = string; // ISO 8601 format
export type UUID = string;
export type Base64String = string;

// Export commonly used union types
export type EntityStatus = 'active' | 'inactive' | 'error' | 'maintenance';
export type Priority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';
export type SortOrder = 'asc' | 'desc';