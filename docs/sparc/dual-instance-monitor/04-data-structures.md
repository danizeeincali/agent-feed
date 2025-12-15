# SPARC Phase 4: Dual Instance Monitor - Data Structures & Interfaces

## Core Data Structures

### 1. Instance Management Types

#### InstanceDescriptor
```typescript
interface InstanceDescriptor {
  readonly id: string;                    // Unique identifier (UUID)
  readonly url: string;                   // WebSocket endpoint URL
  readonly type: InstanceType;            // Instance classification
  readonly priority: number;              // Connection priority (1-10)
  readonly metadata: InstanceMetadata;    // Additional instance info
  readonly discovered: Date;              // Discovery timestamp
  readonly capabilities: string[];        // Supported features
}

enum InstanceType {
  DEVELOPMENT = 'development',
  STAGING = 'staging', 
  PRODUCTION = 'production',
  TESTING = 'testing',
  UNKNOWN = 'unknown'
}

interface InstanceMetadata {
  name?: string;                          // Human-readable name
  version?: string;                       // Instance version
  region?: string;                        // Geographic region
  environment?: string;                   // Environment identifier
  cluster?: string;                       // Cluster name
  nodeId?: string;                        // Node identifier
  startTime?: Date;                       // Instance start time
  processId?: number;                     // Process ID
  customTags?: Record<string, string>;    // Custom metadata
}
```

#### InstanceState
```typescript
interface InstanceState {
  readonly descriptor: InstanceDescriptor;
  connectionState: ConnectionState;
  healthStatus: HealthStatus;
  metrics: InstanceMetrics;
  lastUpdate: Date;
  lastConnected?: Date;
  lastDisconnected?: Date;
  lastError?: InstanceError;
  reconnectionAttempts: number;
  isManuallyDisconnected: boolean;
}

enum ConnectionState {
  INITIALIZING = 'initializing',
  DISCOVERING = 'discovering',
  CONNECTING = 'connecting',
  AUTHENTICATING = 'authenticating',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  DISCONNECTING = 'disconnecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  CIRCUIT_BREAKER_OPEN = 'circuit_breaker_open',
  MANUAL_DISCONNECT = 'manual_disconnect'
}
```

### 2. Connection Management Types

#### ConnectionConfiguration
```typescript
interface ConnectionConfiguration {
  // Basic connection settings
  timeout: number;                        // Connection timeout (ms)
  autoConnect: boolean;                   // Auto-connect on initialization
  maxConcurrentConnections: number;       // Max parallel connections
  
  // Authentication settings
  authentication: AuthenticationConfig;
  
  // Reconnection settings
  reconnection: ReconnectionConfig;
  
  // Health monitoring settings
  healthCheck: HealthCheckConfig;
  
  // Performance settings
  performance: PerformanceConfig;
  
  // Security settings
  security: SecurityConfig;
}

interface AuthenticationConfig {
  enabled: boolean;
  strategy: 'token' | 'oauth' | 'none';
  tokenProvider?: () => Promise<string>;
  refreshThreshold?: number;              // Token refresh threshold (ms)
  credentials?: Record<string, any>;
}

interface ReconnectionConfig {
  enabled: boolean;
  maxAttempts: number;                    // Maximum reconnection attempts
  baseDelay: number;                      // Initial delay (ms)
  maxDelay: number;                       // Maximum delay (ms)
  backoffMultiplier: number;              // Exponential backoff multiplier
  jitter: boolean;                        // Add random jitter
  jitterRange: number;                    // Jitter range (0-1)
  resetOnSuccess: boolean;                // Reset attempts on success
}

interface HealthCheckConfig {
  enabled: boolean;
  interval: number;                       // Check interval (ms)
  timeout: number;                        // Ping timeout (ms)
  maxConsecutiveFailures: number;         // Circuit breaker threshold
  recoveryThreshold: number;              // Recovery attempts needed
  pingPayload?: any;                      // Custom ping payload
}

interface PerformanceConfig {
  messageBufferSize: number;              // Message buffer size
  maxMessageRate: number;                 // Max messages per second
  compressionEnabled: boolean;            // Enable message compression
  batchingEnabled: boolean;               // Enable message batching
  batchSize: number;                      // Batch size for messages
  batchTimeout: number;                   // Batch timeout (ms)
}

interface SecurityConfig {
  validateCertificates: boolean;          // SSL certificate validation
  allowedOrigins?: string[];              // CORS allowed origins
  messageValidation: boolean;             // Validate incoming messages
  rateLimiting: RateLimitConfig;
  encryption?: EncryptionConfig;
}

interface RateLimitConfig {
  enabled: boolean;
  requestsPerSecond: number;
  burstSize: number;
  windowSize: number;                     // Rate limit window (ms)
}
```

### 3. Health Monitoring Types

#### HealthStatus
```typescript
interface HealthStatus {
  readonly isHealthy: boolean;
  readonly status: HealthLevel;
  readonly latency: number | null;        // Current latency (ms)
  readonly averageLatency: number;        // Average latency (ms)
  readonly uptime: number;                // Uptime percentage
  readonly lastPing: Date | null;
  readonly lastSuccessfulPing: Date | null;
  readonly consecutiveFailures: number;
  readonly totalPings: number;
  readonly successfulPings: number;
  readonly networkQuality: NetworkQuality;
  readonly serverMetrics?: ServerMetrics;
  readonly alerts: HealthAlert[];
}

enum HealthLevel {
  EXCELLENT = 'excellent',               // < 50ms latency, 100% uptime
  GOOD = 'good',                        // < 100ms latency, > 99% uptime
  FAIR = 'fair',                        // < 500ms latency, > 95% uptime
  POOR = 'poor',                        // < 1000ms latency, > 90% uptime
  CRITICAL = 'critical',                // > 1000ms latency, < 90% uptime
  UNKNOWN = 'unknown'                   // Insufficient data
}

enum NetworkQuality {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  OFFLINE = 'offline',
  UNKNOWN = 'unknown'
}

interface ServerMetrics {
  cpuUsage?: number;                      // CPU usage percentage
  memoryUsage?: number;                   // Memory usage percentage
  connectionCount?: number;               // Active connections
  requestRate?: number;                   // Requests per second
  errorRate?: number;                     // Error rate percentage
  timestamp: Date;
}

interface HealthAlert {
  readonly id: string;
  readonly severity: AlertSeverity;
  readonly message: string;
  readonly timestamp: Date;
  readonly metric: string;
  readonly threshold: number;
  readonly actualValue: number;
  readonly acknowledged: boolean;
}

enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}
```

### 4. Metrics and Analytics Types

#### InstanceMetrics
```typescript
interface InstanceMetrics {
  // Connection metrics
  connectionMetrics: ConnectionMetrics;
  
  // Performance metrics
  performanceMetrics: PerformanceMetrics;
  
  // Error metrics
  errorMetrics: ErrorMetrics;
  
  // Usage metrics
  usageMetrics: UsageMetrics;
  
  // Network metrics
  networkMetrics: NetworkMetrics;
  
  // Resource metrics
  resourceMetrics?: ResourceMetrics;
  
  // Last update timestamp
  lastUpdate: Date;
}

interface ConnectionMetrics {
  totalConnections: number;               // Total connection attempts
  successfulConnections: number;          // Successful connections
  failedConnections: number;              // Failed connections
  reconnectionAttempts: number;           // Reconnection attempts
  averageConnectionTime: number;          // Average connection time (ms)
  longestConnection: number;              // Longest connection duration (ms)
  totalUptime: number;                    // Total uptime (ms)
  totalDowntime: number;                  // Total downtime (ms)
  uptimePercentage: number;               // Uptime percentage
  lastConnectionDuration: number;         // Last connection duration (ms)
}

interface PerformanceMetrics {
  averageLatency: number;                 // Average latency (ms)
  medianLatency: number;                  // Median latency (ms)
  p95Latency: number;                     // 95th percentile latency (ms)
  p99Latency: number;                     // 99th percentile latency (ms)
  minLatency: number;                     // Minimum latency (ms)
  maxLatency: number;                     // Maximum latency (ms)
  throughput: number;                     // Messages per second
  cpuUsage?: number;                      // CPU usage percentage
  memoryUsage?: number;                   // Memory usage percentage
}

interface ErrorMetrics {
  totalErrors: number;                    // Total error count
  errorRate: number;                      // Error rate percentage
  errorsByType: Record<string, number>;   // Errors by error type
  lastError?: InstanceError;              // Last error details
  errorFrequency: number;                 // Errors per hour
  mtbf: number;                          // Mean time between failures (ms)
  mttr: number;                          // Mean time to recovery (ms)
}

interface UsageMetrics {
  messagesSent: number;                   // Total messages sent
  messagesReceived: number;               // Total messages received
  bytesSent: number;                      // Total bytes sent
  bytesReceived: number;                  // Total bytes received
  sessionDuration: number;                // Current session duration (ms)
  totalSessions: number;                  // Total sessions
  averageSessionDuration: number;         // Average session duration (ms)
}

interface NetworkMetrics {
  bandwidth: number;                      // Available bandwidth (bps)
  packetLoss: number;                     // Packet loss percentage
  jitter: number;                         // Network jitter (ms)
  rtt: number;                           // Round trip time (ms)
  quality: NetworkQuality;                // Overall network quality
  stability: number;                      // Connection stability score (0-1)
}

interface ResourceMetrics {
  memoryUsage: number;                    // Memory usage (bytes)
  cpuUsage: number;                       // CPU usage percentage
  diskUsage?: number;                     // Disk usage percentage
  networkIO: number;                      // Network I/O (bytes/s)
  openConnections: number;                // Open connections count
  threadCount?: number;                   // Thread count
}
```

### 5. Logging Types

#### LogEntry
```typescript
interface LogEntry {
  readonly id: string;                    // Unique log entry ID
  readonly instanceId: string;            // Source instance ID
  readonly timestamp: Date;               // Log timestamp
  readonly level: LogLevel;               // Log level
  readonly message: string;               // Log message
  readonly source: string;                // Log source/component
  readonly category?: string;             // Log category
  readonly correlationId?: string;        // Request correlation ID
  readonly sessionId?: string;            // Session identifier
  readonly userId?: string;               // User identifier
  readonly metadata?: LogMetadata;        // Additional metadata
  readonly stackTrace?: string;           // Stack trace (for errors)
  readonly context?: LogContext;          // Execution context
}

enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

interface LogMetadata {
  component?: string;                     // Component name
  operation?: string;                     // Operation name
  duration?: number;                      // Operation duration (ms)
  requestId?: string;                     // Request identifier
  tags?: string[];                        // Log tags
  custom?: Record<string, any>;           // Custom metadata
}

interface LogContext {
  userAgent?: string;                     // User agent string
  ipAddress?: string;                     // Client IP address
  url?: string;                          // Request URL
  method?: string;                       // HTTP method
  statusCode?: number;                   // HTTP status code
  referer?: string;                      // HTTP referer
}

interface LogFilter {
  levels?: LogLevel[];                    // Filter by log levels
  instances?: string[];                   // Filter by instance IDs
  sources?: string[];                     // Filter by sources
  categories?: string[];                  // Filter by categories
  timeRange?: TimeRange;                  // Filter by time range
  searchQuery?: string;                   // Text search query
  correlationId?: string;                 // Filter by correlation ID
  userId?: string;                        // Filter by user ID
  tags?: string[];                        // Filter by tags
}

interface TimeRange {
  start: Date;                           // Start time
  end: Date;                             // End time
}
```

### 6. Event System Types

#### SystemEvent
```typescript
interface SystemEvent {
  readonly id: string;                    // Unique event ID
  readonly type: EventType;               // Event type
  readonly source: string;                // Event source
  readonly target?: string;               // Event target
  readonly timestamp: Date;               // Event timestamp
  readonly data: any;                     // Event data
  readonly correlationId?: string;        // Event correlation ID
  readonly causedBy?: string;             // Causing event ID
  readonly priority: EventPriority;       // Event priority
}

enum EventType {
  // Instance events
  INSTANCE_DISCOVERED = 'instance_discovered',
  INSTANCE_LOST = 'instance_lost',
  INSTANCE_UPDATED = 'instance_updated',
  
  // Connection events
  CONNECTION_ATTEMPT = 'connection_attempt',
  CONNECTION_ESTABLISHED = 'connection_established',
  CONNECTION_FAILED = 'connection_failed',
  CONNECTION_LOST = 'connection_lost',
  CONNECTION_RESTORED = 'connection_restored',
  
  // Health events
  HEALTH_CHECK_PASSED = 'health_check_passed',
  HEALTH_CHECK_FAILED = 'health_check_failed',
  HEALTH_DEGRADED = 'health_degraded',
  HEALTH_RECOVERED = 'health_recovered',
  
  // Log events
  LOG_RECEIVED = 'log_received',
  LOG_BUFFER_FULL = 'log_buffer_full',
  LOG_EXPORT_COMPLETED = 'log_export_completed',
  
  // Error events
  ERROR_OCCURRED = 'error_occurred',
  ERROR_RESOLVED = 'error_resolved',
  CIRCUIT_BREAKER_OPENED = 'circuit_breaker_opened',
  CIRCUIT_BREAKER_CLOSED = 'circuit_breaker_closed',
  
  // System events
  SYSTEM_STARTED = 'system_started',
  SYSTEM_STOPPED = 'system_stopped',
  CONFIGURATION_CHANGED = 'configuration_changed',
  METRICS_UPDATED = 'metrics_updated'
}

enum EventPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}
```

### 7. Error Handling Types

#### InstanceError
```typescript
interface InstanceError {
  readonly id: string;                    // Unique error ID
  readonly instanceId: string;            // Instance ID
  readonly timestamp: Date;               // Error timestamp
  readonly type: ErrorType;               // Error classification
  readonly severity: ErrorSeverity;       // Error severity
  readonly message: string;               // Error message
  readonly code?: string;                 // Error code
  readonly details?: string;              // Detailed description
  readonly stackTrace?: string;           // Stack trace
  readonly context: ErrorContext;         // Error context
  readonly recoverable: boolean;          // Is error recoverable
  readonly retryable: boolean;           // Can operation be retried
  readonly resolution?: ErrorResolution;  // Error resolution
}

enum ErrorType {
  CONNECTION_ERROR = 'connection_error',
  NETWORK_ERROR = 'network_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  AUTHORIZATION_ERROR = 'authorization_error',
  TIMEOUT_ERROR = 'timeout_error',
  PROTOCOL_ERROR = 'protocol_error',
  VALIDATION_ERROR = 'validation_error',
  CONFIGURATION_ERROR = 'configuration_error',
  RESOURCE_ERROR = 'resource_error',
  SYSTEM_ERROR = 'system_error',
  UNKNOWN_ERROR = 'unknown_error'
}

enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

interface ErrorContext {
  operation?: string;                     // Operation being performed
  component?: string;                     // Component where error occurred
  correlationId?: string;                 // Request correlation ID
  sessionId?: string;                     // Session identifier
  userId?: string;                        // User identifier
  additionalData?: Record<string, any>;   // Additional context data
}

interface ErrorResolution {
  resolved: boolean;                      // Is error resolved
  resolvedAt?: Date;                      // Resolution timestamp
  strategy: ResolutionStrategy;           // Resolution strategy used
  description?: string;                   // Resolution description
  preventiveActions?: string[];           // Preventive actions taken
}

enum ResolutionStrategy {
  AUTOMATIC_RETRY = 'automatic_retry',
  MANUAL_INTERVENTION = 'manual_intervention',
  CIRCUIT_BREAKER = 'circuit_breaker',
  FALLBACK = 'fallback',
  IGNORE = 'ignore',
  ESCALATE = 'escalate'
}
```

### 8. Configuration Types

#### SystemConfiguration
```typescript
interface SystemConfiguration {
  // Discovery configuration
  discovery: DiscoveryConfiguration;
  
  // Connection configuration
  connection: ConnectionConfiguration;
  
  // UI configuration
  ui: UIConfiguration;
  
  // Logging configuration
  logging: LoggingConfiguration;
  
  // Monitoring configuration
  monitoring: MonitoringConfiguration;
  
  // Security configuration
  security: SecurityConfiguration;
  
  // Performance configuration
  performance: PerformanceConfiguration;
}

interface DiscoveryConfiguration {
  enabled: boolean;
  strategies: DiscoveryStrategy[];
  interval: number;                       // Discovery interval (ms)
  timeout: number;                        // Discovery timeout (ms)
  ports: number[];                        // Ports to scan
  hosts: string[];                        // Hosts to check
  maxConcurrentProbes: number;           // Max concurrent probes
}

interface DiscoveryStrategy {
  name: string;
  enabled: boolean;
  priority: number;
  configuration: Record<string, any>;
}

interface UIConfiguration {
  theme: 'light' | 'dark' | 'auto';
  refreshInterval: number;                // UI refresh interval (ms)
  maxLogEntries: number;                  // Max log entries to display
  autoScroll: boolean;                    // Auto-scroll logs
  notifications: NotificationConfig;
  charts: ChartConfig;
}

interface NotificationConfig {
  enabled: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  duration: number;                       // Notification duration (ms)
  maxNotifications: number;               // Max visible notifications
}

interface ChartConfig {
  enabled: boolean;
  updateInterval: number;                 // Chart update interval (ms)
  historySize: number;                    // Chart history size
  animationsEnabled: boolean;
}

interface LoggingConfiguration {
  level: LogLevel;                        // Minimum log level
  bufferSize: number;                     // Log buffer size
  maxFileSize: number;                    // Max log file size (bytes)
  retention: number;                      // Log retention period (ms)
  compression: boolean;                   // Enable log compression
  exportFormats: ExportFormat[];          // Supported export formats
}

enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  TEXT = 'text',
  XML = 'xml'
}

interface MonitoringConfiguration {
  metricsRetention: number;               // Metrics retention period (ms)
  aggregationInterval: number;            // Metrics aggregation interval (ms)
  alerting: AlertingConfiguration;
  reporting: ReportingConfiguration;
}

interface AlertingConfiguration {
  enabled: boolean;
  rules: AlertRule[];
  channels: AlertChannel[];
}

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte';
  threshold: number;
  duration: number;                       // Alert duration threshold (ms)
  severity: AlertSeverity;
  enabled: boolean;
}

interface AlertChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'console';
  configuration: Record<string, any>;
  enabled: boolean;
}

interface ReportingConfiguration {
  enabled: boolean;
  schedule: string;                       // Cron expression
  recipients: string[];
  formats: ExportFormat[];
  includeMetrics: boolean;
  includeLogs: boolean;
}
```

### 9. State Management Types

#### ApplicationState
```typescript
interface ApplicationState {
  // Core state
  instances: Map<string, InstanceState>;
  systemStatus: SystemStatus;
  configuration: SystemConfiguration;
  
  // Runtime state
  connections: Map<string, ConnectionInfo>;
  logs: LogBuffer;
  metrics: SystemMetrics;
  errors: ErrorRecord[];
  events: SystemEvent[];
  
  // UI state
  ui: UIState;
  
  // Metadata
  version: string;
  lastUpdate: Date;
  sessionId: string;
}

interface SystemStatus {
  overall: OverallStatus;
  instanceCount: number;
  connectedInstances: number;
  healthyInstances: number;
  lastUpdate: Date;
}

enum OverallStatus {
  INITIALIZING = 'initializing',
  ALL_CONNECTED = 'all_connected',
  PARTIALLY_CONNECTED = 'partially_connected',
  ALL_DISCONNECTED = 'all_disconnected',
  DUAL_INSTANCE_ACTIVE = 'dual_instance_active',
  ERROR = 'error'
}

interface ConnectionInfo {
  instanceId: string;
  socket: WebSocket | null;
  state: ConnectionState;
  lastActivity: Date;
  statistics: ConnectionStatistics;
}

interface ConnectionStatistics {
  connectTime: Date | null;
  disconnectTime: Date | null;
  bytesTransferred: number;
  messagesTransferred: number;
  errorCount: number;
  reconnectCount: number;
}

interface LogBuffer {
  entries: LogEntry[];
  maxSize: number;
  currentSize: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}

interface UIState {
  selectedInstance: string | null;
  logFilter: LogFilter;
  expandedSections: Set<string>;
  notifications: UINotification[];
  theme: string;
  layout: LayoutState;
}

interface UINotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  dismissed: boolean;
  actions?: NotificationAction[];
}

interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

interface LayoutState {
  sidebarCollapsed: boolean;
  panelSizes: Record<string, number>;
  activeTab: string;
  windowSize: { width: number; height: number };
}
```

## Data Validation Schemas

### 1. Runtime Validation
```typescript
// Zod schemas for runtime validation
import { z } from 'zod';

const InstanceDescriptorSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  type: z.nativeEnum(InstanceType),
  priority: z.number().min(1).max(10),
  metadata: z.object({
    name: z.string().optional(),
    version: z.string().optional(),
    region: z.string().optional(),
    environment: z.string().optional(),
    cluster: z.string().optional(),
    nodeId: z.string().optional(),
    startTime: z.date().optional(),
    processId: z.number().optional(),
    customTags: z.record(z.string()).optional()
  }),
  discovered: z.date(),
  capabilities: z.array(z.string())
});

const LogEntrySchema = z.object({
  id: z.string(),
  instanceId: z.string(),
  timestamp: z.date(),
  level: z.nativeEnum(LogLevel),
  message: z.string(),
  source: z.string(),
  category: z.string().optional(),
  correlationId: z.string().optional(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  metadata: z.object({
    component: z.string().optional(),
    operation: z.string().optional(),
    duration: z.number().optional(),
    requestId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    custom: z.record(z.any()).optional()
  }).optional(),
  stackTrace: z.string().optional(),
  context: z.object({
    userAgent: z.string().optional(),
    ipAddress: z.string().optional(),
    url: z.string().optional(),
    method: z.string().optional(),
    statusCode: z.number().optional(),
    referer: z.string().optional()
  }).optional()
});
```

### 2. Type Guards
```typescript
// Type guard functions
export function isInstanceDescriptor(obj: any): obj is InstanceDescriptor {
  return InstanceDescriptorSchema.safeParse(obj).success;
}

export function isLogEntry(obj: any): obj is LogEntry {
  return LogEntrySchema.safeParse(obj).success;
}

export function isConnectionState(state: string): state is ConnectionState {
  return Object.values(ConnectionState).includes(state as ConnectionState);
}

export function isHealthLevel(level: string): level is HealthLevel {
  return Object.values(HealthLevel).includes(level as HealthLevel);
}
```

## Serialization and Persistence

### 1. State Serialization
```typescript
interface SerializableState {
  instances: SerializableInstanceState[];
  configuration: SystemConfiguration;
  metrics: SerializableMetrics;
  timestamp: string;
  version: string;
}

interface SerializableInstanceState {
  descriptor: InstanceDescriptor;
  connectionState: ConnectionState;
  healthStatus: Omit<HealthStatus, 'alerts'>;
  metrics: Omit<InstanceMetrics, 'resourceMetrics'>;
  lastUpdate: string;
  lastConnected?: string;
  lastDisconnected?: string;
  reconnectionAttempts: number;
  isManuallyDisconnected: boolean;
}

// Serialization utilities
export const StateSerializer = {
  serialize(state: ApplicationState): string {
    const serializable: SerializableState = {
      instances: Array.from(state.instances.entries()).map(([_, instance]) => ({
        descriptor: instance.descriptor,
        connectionState: instance.connectionState,
        healthStatus: {
          isHealthy: instance.healthStatus.isHealthy,
          status: instance.healthStatus.status,
          latency: instance.healthStatus.latency,
          averageLatency: instance.healthStatus.averageLatency,
          uptime: instance.healthStatus.uptime,
          lastPing: instance.healthStatus.lastPing,
          lastSuccessfulPing: instance.healthStatus.lastSuccessfulPing,
          consecutiveFailures: instance.healthStatus.consecutiveFailures,
          totalPings: instance.healthStatus.totalPings,
          successfulPings: instance.healthStatus.successfulPings,
          networkQuality: instance.healthStatus.networkQuality,
          serverMetrics: instance.healthStatus.serverMetrics
        },
        metrics: {
          connectionMetrics: instance.metrics.connectionMetrics,
          performanceMetrics: instance.metrics.performanceMetrics,
          errorMetrics: instance.metrics.errorMetrics,
          usageMetrics: instance.metrics.usageMetrics,
          networkMetrics: instance.metrics.networkMetrics,
          lastUpdate: instance.metrics.lastUpdate
        },
        lastUpdate: instance.lastUpdate.toISOString(),
        lastConnected: instance.lastConnected?.toISOString(),
        lastDisconnected: instance.lastDisconnected?.toISOString(),
        reconnectionAttempts: instance.reconnectionAttempts,
        isManuallyDisconnected: instance.isManuallyDisconnected
      })),
      configuration: state.configuration,
      metrics: state.metrics,
      timestamp: state.lastUpdate.toISOString(),
      version: state.version
    };
    
    return JSON.stringify(serializable);
  },
  
  deserialize(data: string): Partial<ApplicationState> {
    const parsed: SerializableState = JSON.parse(data);
    
    const instances = new Map<string, InstanceState>();
    parsed.instances.forEach(instance => {
      instances.set(instance.descriptor.id, {
        descriptor: instance.descriptor,
        connectionState: instance.connectionState,
        healthStatus: {
          ...instance.healthStatus,
          alerts: []
        },
        metrics: instance.metrics,
        lastUpdate: new Date(instance.lastUpdate),
        lastConnected: instance.lastConnected ? new Date(instance.lastConnected) : undefined,
        lastDisconnected: instance.lastDisconnected ? new Date(instance.lastDisconnected) : undefined,
        reconnectionAttempts: instance.reconnectionAttempts,
        isManuallyDisconnected: instance.isManuallyDisconnected
      });
    });
    
    return {
      instances,
      configuration: parsed.configuration,
      metrics: parsed.metrics,
      lastUpdate: new Date(parsed.timestamp),
      version: parsed.version
    };
  }
};
```

This comprehensive data structure specification provides:

1. **Type Safety**: Full TypeScript interface definitions
2. **Runtime Validation**: Zod schemas for data validation
3. **Serialization**: State persistence and recovery
4. **Error Handling**: Comprehensive error type system
5. **Metrics**: Detailed performance and health monitoring
6. **Configuration**: Flexible system configuration
7. **Events**: Event-driven architecture support
8. **Logging**: Structured logging with metadata
9. **State Management**: Complete application state model

These data structures serve as the foundation for the Dual Instance Monitor system, ensuring type safety, data integrity, and comprehensive monitoring capabilities.