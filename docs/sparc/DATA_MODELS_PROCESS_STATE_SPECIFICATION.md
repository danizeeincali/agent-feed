# Data Models for Process State Tracking Specification

## 1. CORE DATA MODELS

### 1.1 Process Instance Model
```typescript
interface ProcessInstance {
  // Primary Identity
  instanceId: string;           // Unique identifier (e.g., "claude-real-abc123")
  groupId: string;             // Process group identifier for batch operations
  parentInstanceId?: string;   // Parent process if spawned from another

  // Process Reference
  process: ChildProcess;       // Node.js ChildProcess object
  pid: number;                // Real system PID from process.pid
  
  // State Management
  status: ProcessStatus;       // Current lifecycle state
  previousStatus?: ProcessStatus; // Previous state for transitions
  statusHistory: ProcessStatusTransition[]; // Complete status history
  
  // Timing Information  
  createdAt: Date;            // Instance creation timestamp
  startTime: Date;            // Process spawn timestamp
  readyTime?: Date;           // When process became responsive
  endTime?: Date;             // Process termination timestamp
  
  // Process Configuration
  command: string[];          // Executed command with arguments
  workingDirectory: string;   // Process working directory
  environment: ProcessEnvironment; // Environment variables
  resourceLimits: ResourceLimits; // Applied resource constraints
  
  // I/O Stream Management
  streams: {
    stdin: StreamState;       // Input stream state
    stdout: StreamState;      // Output stream state  
    stderr: StreamState;      // Error stream state
  };
  
  // Activity Tracking
  lastActivity: Date;         // Last I/O or state change
  activityMetrics: ActivityMetrics; // Comprehensive activity data
  
  // Resource Usage
  resourceUsage: ResourceUsage; // Current resource consumption
  resourceHistory: ResourceSnapshot[]; // Historical usage data
  
  // Process Health
  healthStatus: HealthStatus; // Current health assessment
  healthHistory: HealthCheck[]; // Historical health checks
  
  // Metadata
  metadata: ProcessMetadata;  // Creation context and tags
  
  // Relationships
  children: string[];         // Child process instance IDs
  connections: ConnectionInfo[]; // SSE and other connections
}

enum ProcessStatus {
  CREATING = 'creating',      // Instance being created
  SPAWNING = 'spawning',      // Process spawn initiated
  STARTING = 'starting',      // Process spawned, waiting for ready
  RUNNING = 'running',        // Process active and responsive
  STOPPING = 'stopping',     // Graceful shutdown initiated
  TERMINATED = 'terminated', // Process ended normally
  ERROR = 'error',           // Process failed or crashed
  ZOMBIE = 'zombie',         // Process ended but not cleaned up
  UNKNOWN = 'unknown'        // Status cannot be determined
}

interface ProcessStatusTransition {
  from: ProcessStatus;
  to: ProcessStatus;
  timestamp: Date;
  reason: string;
  details?: any;
  triggeredBy: 'system' | 'user' | 'process' | 'error';
}
```

### 1.2 Resource Management Models
```typescript
interface ResourceLimits {
  memory: {
    max: number;              // Maximum memory in bytes
    warning: number;          // Warning threshold
    critical: number;         // Critical threshold
  };
  cpu: {
    max: number;              // Maximum CPU percentage
    warning: number;          // Warning threshold
    critical: number;         // Critical threshold  
  };
  fileDescriptors: {
    max: number;              // Maximum open files
    warning: number;          // Warning threshold
  };
  network: {
    maxConnections: number;   // Maximum network connections
    maxBandwidth: number;     // Maximum bandwidth in bytes/sec
  };
  execution: {
    timeout: number;          // Maximum execution time in ms
    idleTimeout: number;      // Idle timeout in ms
  };
}

interface ResourceUsage {
  timestamp: Date;
  memory: MemoryUsage;
  cpu: CPUUsage;
  io: IOUsage;
  network: NetworkUsage;
  fileDescriptors: FileDescriptorUsage;
  threads: ThreadUsage;
}

interface MemoryUsage {
  rss: number;                // Resident Set Size
  heapTotal: number;          // Total heap size
  heapUsed: number;           // Used heap size
  external: number;           // External memory
  arrayBuffers: number;       // ArrayBuffer memory
  sharedArrayBuffers: number; // SharedArrayBuffer memory
}

interface CPUUsage {
  user: number;               // User CPU time in microseconds
  system: number;             // System CPU time in microseconds
  percentage: number;         // Current CPU percentage
  averageLoad: number;        // Average load over time
}

interface IOUsage {
  readBytes: number;          // Total bytes read
  writeBytes: number;         // Total bytes written
  readOperations: number;     // Total read operations
  writeOperations: number;    // Total write operations
  readBytesPerSecond: number; // Current read rate
  writeBytesPerSecond: number; // Current write rate
}

interface NetworkUsage {
  bytesReceived: number;      // Total bytes received
  bytesSent: number;          // Total bytes sent
  packetsReceived: number;    // Total packets received
  packetsSent: number;        // Total packets sent
  activeConnections: number;  // Current active connections
  connectionErrors: number;   // Total connection errors
}

interface FileDescriptorUsage {
  open: number;               // Currently open file descriptors
  total: number;              // Total opened during lifetime
  limit: number;              // System limit
  types: {
    files: number;            // Regular files
    sockets: number;          // Network sockets
    pipes: number;            // Pipes
    other: number;            // Other types
  };
}

interface ThreadUsage {
  active: number;             // Currently active threads
  total: number;              // Total threads created
  blocked: number;            // Blocked threads
  waiting: number;            // Waiting threads
}
```

### 1.3 I/O Stream Models
```typescript
interface StreamState {
  readable: boolean;          // Stream is readable
  writable: boolean;          // Stream is writable  
  ended: boolean;             // Stream has ended
  destroyed: boolean;         // Stream has been destroyed
  
  // Buffer Information
  bufferSize: number;         // Current buffer size
  highWaterMark: number;      // Buffer high water mark
  
  // Activity Metrics
  bytesRead: number;          // Total bytes read
  bytesWritten: number;       // Total bytes written
  operationsRead: number;     // Total read operations
  operationsWritten: number;  // Total write operations
  
  // Error Information
  lastError?: StreamError;    // Most recent error
  errorCount: number;         // Total errors encountered
  
  // Timing
  lastActivity: Date;         // Last I/O activity
  createdAt: Date;           // Stream creation time
}

interface StreamError {
  code: string;              // Error code
  message: string;           // Error message  
  timestamp: Date;           // When error occurred
  recoverable: boolean;      // Whether error can be recovered
  stack?: string;            // Error stack trace
}

interface ActivityMetrics {
  // Input Activity
  inputEvents: number;        // Total input events
  inputBytes: number;         // Total input bytes
  lastInputTime: Date;       // Last input timestamp
  inputRate: number;         // Inputs per second (average)
  
  // Output Activity  
  outputEvents: number;       // Total output events
  outputBytes: number;        // Total output bytes
  lastOutputTime: Date;      // Last output timestamp
  outputRate: number;        // Outputs per second (average)
  
  // Command Activity
  commandsExecuted: number;   // Total commands processed
  commandErrors: number;     // Commands that resulted in errors
  averageResponseTime: number; // Average command response time
  
  // Session Activity
  sessionStartTime: Date;    // When activity tracking started
  activeTime: number;        // Total active time in ms
  idleTime: number;          // Total idle time in ms
  uptime: number;            // Total uptime in ms
}
```

### 1.4 Health Monitoring Models
```typescript
interface HealthStatus {
  overall: HealthState;       // Overall health assessment
  lastCheck: Date;           // Last health check timestamp
  nextCheck: Date;           // Next scheduled check
  
  // Component Health
  components: {
    process: ComponentHealth;  // Process health
    memory: ComponentHealth;   // Memory health  
    cpu: ComponentHealth;      // CPU health
    io: ComponentHealth;       // I/O health
    network: ComponentHealth;  // Network health
  };
  
  // Issues and Recommendations
  issues: HealthIssue[];      // Current health issues
  recommendations: string[];  // Health recommendations
  
  // Alerting
  alerts: HealthAlert[];      // Active alerts
  alertHistory: HealthAlert[]; // Historical alerts
}

enum HealthState {
  HEALTHY = 'healthy',        // All systems operational
  WARNING = 'warning',        // Minor issues detected
  CRITICAL = 'critical',      // Major issues detected
  UNKNOWN = 'unknown',        // Health cannot be determined
  DEGRADED = 'degraded'       // Partially functional
}

interface ComponentHealth {
  state: HealthState;
  message: string;
  metrics: any;              // Component-specific metrics
  lastCheck: Date;
  trend: 'improving' | 'stable' | 'degrading';
}

interface HealthIssue {
  id: string;                // Unique issue identifier
  component: string;         // Affected component
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;             // Issue title
  description: string;       // Detailed description
  detectedAt: Date;         // When issue was detected
  resolvedAt?: Date;        // When issue was resolved
  
  // Context
  affectedMetrics: string[]; // Metrics affected by issue
  possibleCauses: string[];  // Possible root causes
  recommendedActions: string[]; // Recommended actions
  
  // Tracking
  occurrenceCount: number;   // How many times this issue occurred
  firstOccurrence: Date;     // When first seen
  lastOccurrence: Date;      // When last seen
}

interface HealthAlert {
  id: string;                // Unique alert identifier
  level: AlertLevel;         // Alert severity
  component: string;         // Component that triggered alert
  metric: string;            // Specific metric
  
  // Trigger Information
  threshold: number;         // Threshold that was exceeded
  actualValue: number;       // Actual metric value
  triggeredAt: Date;         // When alert triggered
  acknowledgedAt?: Date;     // When alert was acknowledged
  resolvedAt?: Date;         // When alert was resolved
  
  // Alert Content
  title: string;             // Alert title
  message: string;           // Alert message
  details: any;              // Additional alert details
  
  // Actions
  autoActions: string[];     // Automatic actions taken
  requiredActions: string[]; // Actions requiring intervention
}

enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning', 
  ERROR = 'error',
  CRITICAL = 'critical'
}
```

### 1.5 Connection and Communication Models
```typescript
interface ConnectionInfo {
  id: string;                // Unique connection identifier
  type: ConnectionType;      // Type of connection
  remoteAddress: string;     // Client IP address
  userAgent?: string;        // Client user agent
  
  // Connection State
  state: ConnectionState;    // Current connection state
  establishedAt: Date;       // Connection establishment time
  lastActivity: Date;        // Last activity on connection
  
  // Statistics
  bytesReceived: number;     // Bytes received from client
  bytesSent: number;         // Bytes sent to client
  messagesReceived: number;  // Messages received
  messagesSent: number;      // Messages sent
  errors: number;            // Connection errors
  
  // Configuration
  bufferSize: number;        // Connection buffer size
  timeout: number;           // Connection timeout
  keepAlive: boolean;        // Keep-alive enabled
}

enum ConnectionType {
  SSE = 'sse',              // Server-Sent Events
  WEBSOCKET = 'websocket',   // WebSocket connection
  HTTP = 'http',            // HTTP request/response
  STDIN = 'stdin',          // Process stdin
  STDOUT = 'stdout',        // Process stdout  
  STDERR = 'stderr'         // Process stderr
}

enum ConnectionState {
  CONNECTING = 'connecting', // Connection being established
  CONNECTED = 'connected',   // Connection active
  DISCONNECTING = 'disconnecting', // Connection being closed
  DISCONNECTED = 'disconnected', // Connection closed
  ERROR = 'error'           // Connection error
}

interface ProcessEnvironment {
  [key: string]: string;
  
  // Common Claude Environment Variables
  CLAUDE_API_KEY?: string;
  CLAUDE_WORKSPACE?: string;
  CLAUDE_CONFIG_PATH?: string;
  CLAUDE_LOG_LEVEL?: string;
  CLAUDE_TIMEOUT?: string;
  
  // System Environment
  PATH: string;
  HOME: string;
  USER: string;
  PWD: string;
  
  // Node.js Environment
  NODE_ENV?: string;
  NODE_PATH?: string;
}

interface ProcessMetadata {
  // Creation Context
  type: string;              // Instance type (prod, skip-permissions, etc.)
  label: string;             // Human-readable label
  description?: string;      // Detailed description
  
  // Classification
  tags: string[];            // Classification tags
  category: string;          // Process category
  priority: ProcessPriority; // Process priority
  
  // Ownership
  createdBy: string;         // Creator identifier
  createdVia: string;        // Creation method (web-ui, api, cli)
  creationContext: any;      // Additional creation context
  
  // Business Context
  purpose: string;           // Why process was created
  expectedLifetime: number;  // Expected lifetime in ms
  dependencies: string[];    // Dependent services/processes
  
  // Configuration
  configHash: string;        // Hash of configuration used
  version: string;           // Process/service version
  buildInfo?: BuildInfo;     // Build information
}

enum ProcessPriority {
  LOW = 'low',
  NORMAL = 'normal', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

interface BuildInfo {
  version: string;           // Application version
  buildNumber: string;       // Build number
  gitCommit: string;         // Git commit hash
  buildDate: Date;           // Build timestamp
  buildEnvironment: string;  // Build environment
}
```

## 2. PERSISTENCE MODELS

### 2.1 Database Schema
```typescript
interface ProcessInstanceRecord {
  // Primary Keys
  instance_id: string;       // Primary key
  group_id: string;          // Foreign key to process groups
  
  // Process Information
  pid: number;
  status: ProcessStatus;
  command: string;           // JSON serialized array
  working_directory: string;
  environment: string;       // JSON serialized object
  
  // Timestamps
  created_at: Date;
  started_at?: Date;
  ready_at?: Date;
  ended_at?: Date;
  updated_at: Date;
  
  // Exit Information
  exit_code?: number;
  exit_signal?: string;
  exit_reason?: string;
  
  // Resource Limits (JSON)
  resource_limits: string;
  
  // Metadata (JSON)
  metadata: string;
  
  // Indexes
  INDEX idx_status ON process_instances(status);
  INDEX idx_created_at ON process_instances(created_at);
  INDEX idx_pid ON process_instances(pid);
}

interface ResourceUsageRecord {
  id: string;                // Primary key
  instance_id: string;       // Foreign key
  timestamp: Date;
  
  // Memory Usage
  memory_rss: number;
  memory_heap_total: number;
  memory_heap_used: number;
  memory_external: number;
  
  // CPU Usage  
  cpu_user: number;
  cpu_system: number;
  cpu_percentage: number;
  
  // I/O Usage
  io_read_bytes: number;
  io_write_bytes: number;
  io_read_ops: number;
  io_write_ops: number;
  
  // Network Usage
  network_bytes_received: number;
  network_bytes_sent: number;
  network_connections: number;
  
  // File Descriptors
  file_descriptors_open: number;
  
  INDEX idx_instance_timestamp ON resource_usage(instance_id, timestamp);
}

interface HealthCheckRecord {
  id: string;                // Primary key
  instance_id: string;       // Foreign key
  timestamp: Date;
  
  overall_health: HealthState;
  check_duration_ms: number;
  
  // Component Health (JSON)
  component_health: string;
  
  // Issues (JSON)
  issues: string;
  
  // Metrics (JSON)
  metrics: string;
  
  INDEX idx_instance_timestamp ON health_checks(instance_id, timestamp);
}
```

### 2.2 In-Memory Data Structures
```typescript
class ProcessRegistry {
  // Primary storage
  private instances = new Map<string, ProcessInstance>();
  
  // Indexes for fast lookups
  private statusIndex = new Map<ProcessStatus, Set<string>>();
  private pidIndex = new Map<number, string>();
  private groupIndex = new Map<string, Set<string>>();
  private typeIndex = new Map<string, Set<string>>();
  
  // Activity tracking
  private activityIndex = new Map<string, Date>(); // instanceId -> lastActivity
  
  // Resource tracking
  private resourceUsage = new Map<string, ResourceUsage>();
  
  register(instance: ProcessInstance): void {
    // Store instance
    this.instances.set(instance.instanceId, instance);
    
    // Update indexes
    this.updateStatusIndex(instance.instanceId, instance.status);
    this.pidIndex.set(instance.pid, instance.instanceId);
    this.updateGroupIndex(instance.instanceId, instance.groupId);
    this.updateTypeIndex(instance.instanceId, instance.metadata.type);
    this.activityIndex.set(instance.instanceId, instance.lastActivity);
  }
  
  unregister(instanceId: string): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;
    
    // Remove from primary storage
    this.instances.delete(instanceId);
    
    // Clean up indexes
    this.removeFromStatusIndex(instanceId, instance.status);
    this.pidIndex.delete(instance.pid);
    this.removeFromGroupIndex(instanceId, instance.groupId);
    this.removeFromTypeIndex(instanceId, instance.metadata.type);
    this.activityIndex.delete(instanceId);
    this.resourceUsage.delete(instanceId);
    
    return true;
  }
  
  // Fast lookup methods
  get(instanceId: string): ProcessInstance | undefined {
    return this.instances.get(instanceId);
  }
  
  getByPid(pid: number): ProcessInstance | undefined {
    const instanceId = this.pidIndex.get(pid);
    return instanceId ? this.instances.get(instanceId) : undefined;
  }
  
  getByStatus(status: ProcessStatus): ProcessInstance[] {
    const instanceIds = this.statusIndex.get(status) || new Set();
    return Array.from(instanceIds).map(id => this.instances.get(id)!);
  }
  
  getByGroup(groupId: string): ProcessInstance[] {
    const instanceIds = this.groupIndex.get(groupId) || new Set();
    return Array.from(instanceIds).map(id => this.instances.get(id)!);
  }
  
  getByType(type: string): ProcessInstance[] {
    const instanceIds = this.typeIndex.get(type) || new Set();
    return Array.from(instanceIds).map(id => this.instances.get(id)!);
  }
  
  getAll(): ProcessInstance[] {
    return Array.from(this.instances.values());
  }
  
  // Statistics methods
  getStatistics(): ProcessRegistryStats {
    const stats: ProcessRegistryStats = {
      totalInstances: this.instances.size,
      statusCounts: {},
      typeCounts: {},
      groupCounts: {},
      resourceUtilization: this.calculateResourceUtilization(),
      oldestInstance: this.findOldestInstance(),
      newestInstance: this.findNewestInstance()
    };
    
    // Calculate status distribution
    for (const [status, instanceIds] of this.statusIndex) {
      stats.statusCounts[status] = instanceIds.size;
    }
    
    // Calculate type distribution
    for (const [type, instanceIds] of this.typeIndex) {
      stats.typeCounts[type] = instanceIds.size;
    }
    
    // Calculate group distribution
    for (const [group, instanceIds] of this.groupIndex) {
      stats.groupCounts[group] = instanceIds.size;
    }
    
    return stats;
  }
}

interface ProcessRegistryStats {
  totalInstances: number;
  statusCounts: Record<ProcessStatus, number>;
  typeCounts: Record<string, number>;
  groupCounts: Record<string, number>;
  resourceUtilization: ResourceUtilizationStats;
  oldestInstance?: ProcessInstance;
  newestInstance?: ProcessInstance;
}

interface ResourceUtilizationStats {
  totalMemoryUsage: number;
  totalCPUUsage: number;
  totalFileDescriptors: number;
  averageMemoryPerInstance: number;
  averageCPUPerInstance: number;
  peakMemoryUsage: number;
  peakCPUUsage: number;
}
```

This comprehensive data model specification provides the foundation for robust process state tracking with proper relationships, indexing, and persistence support for the real Claude process execution system.