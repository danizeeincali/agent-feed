# Dedicated Claude Instances System Architecture

## Executive Summary

This document outlines a comprehensive system architecture for managing dedicated Claude processes with clean separation of concerns, replacing the current terminal-based approach with a dedicated Claude instance management system.

## Current System Analysis

### Existing Components
- **Frontend**: React-based web interface with terminal components
- **Backend**: Node.js WebSocket server for terminal communication
- **Terminal Integration**: Complex xterm.js implementation with Claude CLI integration
- **Process Management**: Basic PTY-based process spawning

### Current Issues
1. **Mixed Concerns**: Terminal and Claude management are tightly coupled
2. **Complex Terminal Logic**: Heavy focus on terminal rendering and cascade prevention
3. **Limited Scalability**: Single instance management approach
4. **Maintenance Overhead**: Complex terminal-specific code that doesn't directly serve Claude functionality

## Proposed Architecture: Dedicated Claude Instances

### System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Claude Manager │    │ Claude Instance │
│   (React UI)    │◄──►│   (HTTP/WS)     │◄──►│    Process      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  System Term    │    │  Process Pool   │    │ Instance Store  │
│  (Commands)     │    │   Management    │    │   (State/Data)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 1. Core Components Architecture

### 1.1 Claude Instance Manager

**Purpose**: Central service for managing Claude process lifecycle

```typescript
interface ClaudeInstance {
  id: string;
  pid: number;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  command: string[];
  workingDirectory: string;
  createdAt: Date;
  lastActivity: Date;
  metadata: {
    version?: string;
    features?: string[];
    configuration?: Record<string, any>;
  };
  communication: {
    stdin: NodeJS.WritableStream;
    stdout: NodeJS.ReadableStream;
    stderr: NodeJS.ReadableStream;
  };
}

interface ClaudeManager {
  // Lifecycle Management
  spawn(config: ClaudeSpawnConfig): Promise<ClaudeInstance>;
  terminate(instanceId: string): Promise<void>;
  restart(instanceId: string): Promise<ClaudeInstance>;
  
  // Communication
  sendMessage(instanceId: string, message: ClaudeMessage): Promise<void>;
  getResponse(instanceId: string): Promise<ClaudeResponse>;
  
  // State Management
  getInstanceStatus(instanceId: string): Promise<InstanceStatus>;
  listInstances(): Promise<ClaudeInstance[]>;
  getInstanceLogs(instanceId: string): Promise<LogEntry[]>;
}
```

### 1.2 Web Interface Layer

**Purpose**: Clean React UI for Claude interaction without terminal complexity

```typescript
interface ClaudeUIProps {
  // Instance Management
  instances: ClaudeInstance[];
  activeInstance?: string;
  
  // Communication
  onSendMessage: (instanceId: string, message: string) => void;
  onCreateInstance: (config: ClaudeSpawnConfig) => void;
  onTerminateInstance: (instanceId: string) => void;
  
  // UI State
  messages: ClaudeConversation[];
  isLoading: boolean;
  error?: string;
}

// Clean separation: No terminal-specific code
interface ClaudeConversation {
  id: string;
  instanceId: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;
}
```

### 1.3 System Terminal (Separate Component)

**Purpose**: Traditional terminal for system commands, completely separate from Claude

```typescript
interface SystemTerminalProps {
  isVisible: boolean;
  workingDirectory: string;
  // NO Claude-specific logic
}

// Simplified terminal focused only on system commands
// No cascade prevention, width calculations, or Claude CLI handling
```

## 2. API Layer Design

### 2.1 HTTP REST API

```typescript
// Instance Management Endpoints
POST   /api/claude/instances              // Create new instance
GET    /api/claude/instances              // List all instances  
GET    /api/claude/instances/:id          // Get instance details
DELETE /api/claude/instances/:id          // Terminate instance
POST   /api/claude/instances/:id/restart  // Restart instance

// Communication Endpoints  
POST   /api/claude/instances/:id/messages // Send message
GET    /api/claude/instances/:id/messages // Get conversation
GET    /api/claude/instances/:id/logs     // Get instance logs

// Status & Health
GET    /api/claude/status                 // System status
GET    /api/claude/health                 // Health check
```

### 2.2 WebSocket Real-time API

```typescript
interface WebSocketEvents {
  // Client to Server
  'instance:create': ClaudeSpawnConfig;
  'instance:terminate': { instanceId: string };
  'message:send': { instanceId: string; content: string };
  'instance:subscribe': { instanceId: string };
  
  // Server to Client  
  'instance:created': ClaudeInstance;
  'instance:terminated': { instanceId: string };
  'instance:status': { instanceId: string; status: InstanceStatus };
  'message:received': { instanceId: string; message: ClaudeMessage };
  'error': { error: string; context?: any };
}
```

## 3. Process Management Architecture

### 3.1 Claude Process Pool

```typescript
class ClaudeProcessPool {
  private instances: Map<string, ClaudeProcess>;
  private config: PoolConfig;
  
  constructor(config: PoolConfig) {
    this.config = {
      maxInstances: config.maxInstances || 10,
      defaultTimeout: config.defaultTimeout || 30000,
      resourceLimits: config.resourceLimits || {},
      ...config
    };
  }
  
  async createInstance(config: ClaudeSpawnConfig): Promise<ClaudeProcess> {
    // Validate resource limits
    this.validateResourceLimits();
    
    // Spawn Claude process with proper isolation
    const process = await this.spawnClaudeProcess(config);
    
    // Setup communication channels
    this.setupCommunication(process);
    
    // Add to pool with monitoring
    this.instances.set(process.id, process);
    this.startMonitoring(process);
    
    return process;
  }
  
  private async spawnClaudeProcess(config: ClaudeSpawnConfig): Promise<ClaudeProcess> {
    const { spawn } = require('child_process');
    
    const process = spawn('claude', config.args, {
      cwd: config.workingDirectory,
      env: {
        ...process.env,
        ...config.environment
      },
      stdio: ['pipe', 'pipe', 'pipe'] // Full control over I/O
    });
    
    return new ClaudeProcess(process, config);
  }
}
```

### 3.2 Process Isolation & Resource Management

```typescript
interface ResourceLimits {
  maxMemoryMB: number;
  maxCpuPercent: number;
  maxProcesses: number;
  timeoutSeconds: number;
}

class ClaudeProcess {
  private process: ChildProcess;
  private resourceMonitor: ResourceMonitor;
  private messageQueue: MessageQueue;
  private state: ProcessState;
  
  constructor(process: ChildProcess, config: ClaudeSpawnConfig) {
    this.process = process;
    this.resourceMonitor = new ResourceMonitor(config.resourceLimits);
    this.messageQueue = new MessageQueue();
    this.state = new ProcessState();
    
    this.setupResourceMonitoring();
    this.setupCommunication();
  }
  
  private setupResourceMonitoring(): void {
    this.resourceMonitor.on('limit-exceeded', (metric) => {
      this.emit('resource-warning', { metric, pid: this.process.pid });
    });
    
    this.resourceMonitor.on('critical-limit', (metric) => {
      this.terminate('resource-limit-exceeded');
    });
  }
}
```

## 4. Communication Architecture

### 4.1 Message Protocol Design

```typescript
interface ClaudeMessage {
  id: string;
  type: 'user-input' | 'assistant-response' | 'system-info' | 'error';
  content: string;
  timestamp: Date;
  metadata: {
    instanceId: string;
    conversationId?: string;
    responseTime?: number;
    tokens?: {
      input: number;
      output: number;
    };
  };
}

interface MessageHandler {
  send(instanceId: string, message: ClaudeMessage): Promise<void>;
  receive(instanceId: string): Promise<ClaudeMessage>;
  subscribe(instanceId: string, callback: MessageCallback): void;
  unsubscribe(instanceId: string, callback: MessageCallback): void;
}
```

### 4.2 Bidirectional Communication

```typescript
class ClaudeCommunication {
  private instances: Map<string, ClaudeInstance>;
  private messageHandlers: Map<string, MessageHandler>;
  private wsServer: WebSocket.Server;
  
  async setupInstanceCommunication(instance: ClaudeInstance): Promise<void> {
    const messageHandler = new MessageHandler(instance);
    
    // Setup stdin/stdout handling
    instance.process.stdout.on('data', (data) => {
      this.handleClaudeOutput(instance.id, data);
    });
    
    instance.process.stderr.on('data', (data) => {
      this.handleClaudeError(instance.id, data);
    });
    
    // Setup message queue for async communication
    messageHandler.on('message-ready', (message) => {
      this.broadcastToClients(instance.id, message);
    });
    
    this.messageHandlers.set(instance.id, messageHandler);
  }
  
  private handleClaudeOutput(instanceId: string, data: Buffer): void {
    const message: ClaudeMessage = {
      id: generateId(),
      type: 'assistant-response',
      content: data.toString(),
      timestamp: new Date(),
      metadata: { instanceId }
    };
    
    this.processMessage(instanceId, message);
  }
}
```

## 5. Session Management & State

### 5.1 Instance State Management

```typescript
interface InstanceState {
  id: string;
  status: InstanceStatus;
  conversation: ClaudeConversation;
  configuration: ClaudeConfiguration;
  statistics: {
    messagesExchanged: number;
    tokensUsed: number;
    uptime: number;
    averageResponseTime: number;
  };
  lastActivity: Date;
}

class StateManager {
  private states: Map<string, InstanceState>;
  private persistence: StatePersistence;
  
  async saveState(instanceId: string, state: InstanceState): Promise<void> {
    this.states.set(instanceId, state);
    await this.persistence.save(instanceId, state);
  }
  
  async loadState(instanceId: string): Promise<InstanceState | null> {
    const memoryState = this.states.get(instanceId);
    if (memoryState) return memoryState;
    
    return await this.persistence.load(instanceId);
  }
  
  async cleanupExpiredStates(): Promise<void> {
    const expiredThreshold = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    for (const [id, state] of this.states) {
      if (state.lastActivity.getTime() < expiredThreshold) {
        await this.removeState(id);
      }
    }
  }
}
```

### 5.2 Conversation Persistence

```typescript
interface ConversationStore {
  save(conversation: ClaudeConversation): Promise<void>;
  load(conversationId: string): Promise<ClaudeConversation>;
  list(instanceId: string): Promise<ConversationSummary[]>;
  delete(conversationId: string): Promise<void>;
  export(conversationId: string): Promise<ConversationExport>;
}

class FileBasedConversationStore implements ConversationStore {
  private basePath: string;
  
  constructor(basePath: string) {
    this.basePath = basePath;
  }
  
  async save(conversation: ClaudeConversation): Promise<void> {
    const filePath = path.join(
      this.basePath, 
      'conversations',
      `${conversation.instanceId}`,
      `${conversation.id}.json`
    );
    
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeJSON(filePath, conversation, { spaces: 2 });
  }
}
```

## 6. Error Handling & Recovery

### 6.1 Process Recovery Strategy

```typescript
class ProcessRecovery {
  private recoveryStrategies: Map<string, RecoveryStrategy>;
  
  constructor() {
    this.recoveryStrategies.set('process-crash', new RestartStrategy());
    this.recoveryStrategies.set('memory-leak', new RestartWithLimitsStrategy());
    this.recoveryStrategies.set('timeout', new ForceKillRestartStrategy());
    this.recoveryStrategies.set('communication-failure', new ReconnectStrategy());
  }
  
  async handleFailure(
    instanceId: string, 
    error: ProcessError
  ): Promise<RecoveryResult> {
    const strategy = this.recoveryStrategies.get(error.type);
    if (!strategy) {
      throw new Error(`No recovery strategy for error type: ${error.type}`);
    }
    
    return await strategy.recover(instanceId, error);
  }
}

interface RecoveryStrategy {
  recover(instanceId: string, error: ProcessError): Promise<RecoveryResult>;
}

class RestartStrategy implements RecoveryStrategy {
  async recover(instanceId: string, error: ProcessError): Promise<RecoveryResult> {
    // 1. Save current state
    const state = await stateManager.loadState(instanceId);
    
    // 2. Terminate failed process
    await processPool.terminate(instanceId);
    
    // 3. Create new instance with same configuration
    const newInstance = await processPool.createInstance(state.configuration);
    
    // 4. Restore state
    await stateManager.saveState(newInstance.id, {
      ...state,
      id: newInstance.id,
      status: 'running'
    });
    
    return { success: true, newInstanceId: newInstance.id };
  }
}
```

### 6.2 Circuit Breaker Pattern

```typescript
class ClaudeCircuitBreaker {
  private failures: Map<string, number>;
  private lastFailure: Map<string, Date>;
  private state: Map<string, 'closed' | 'open' | 'half-open'>;
  
  constructor(private config: CircuitBreakerConfig) {
    this.failures = new Map();
    this.lastFailure = new Map();
    this.state = new Map();
  }
  
  async execute<T>(
    instanceId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const currentState = this.getState(instanceId);
    
    if (currentState === 'open') {
      if (this.shouldAttemptReset(instanceId)) {
        this.setState(instanceId, 'half-open');
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess(instanceId);
      return result;
    } catch (error) {
      this.onFailure(instanceId);
      throw error;
    }
  }
  
  private onFailure(instanceId: string): void {
    const failures = this.failures.get(instanceId) || 0;
    this.failures.set(instanceId, failures + 1);
    this.lastFailure.set(instanceId, new Date());
    
    if (failures >= this.config.failureThreshold) {
      this.setState(instanceId, 'open');
    }
  }
}
```

## 7. Security & Access Control

### 7.1 Instance Isolation

```typescript
interface SecurityPolicy {
  allowedCommands: string[];
  resourceLimits: ResourceLimits;
  networkAccess: NetworkPolicy;
  fileSystemAccess: FileSystemPolicy;
}

class SecurityManager {
  private policies: Map<string, SecurityPolicy>;
  
  async validateCommand(
    instanceId: string, 
    command: string[]
  ): Promise<ValidationResult> {
    const policy = this.policies.get(instanceId);
    if (!policy) {
      return { valid: false, reason: 'No security policy found' };
    }
    
    // Validate command against allowed list
    const baseCommand = command[0];
    if (!policy.allowedCommands.includes(baseCommand)) {
      return { valid: false, reason: `Command not allowed: ${baseCommand}` };
    }
    
    // Additional argument validation
    return this.validateArguments(command, policy);
  }
  
  async enforceResourceLimits(
    instanceId: string,
    usage: ResourceUsage
  ): Promise<void> {
    const policy = this.policies.get(instanceId);
    if (!policy) return;
    
    if (usage.memoryMB > policy.resourceLimits.maxMemoryMB) {
      await this.terminateInstance(instanceId, 'memory-limit-exceeded');
    }
    
    if (usage.cpuPercent > policy.resourceLimits.maxCpuPercent) {
      await this.throttleInstance(instanceId);
    }
  }
}
```

### 7.2 Authentication & Authorization

```typescript
interface AccessControl {
  canCreateInstance(userId: string): Promise<boolean>;
  canAccessInstance(userId: string, instanceId: string): Promise<boolean>;
  canTerminateInstance(userId: string, instanceId: string): Promise<boolean>;
  getInstancePermissions(userId: string, instanceId: string): Promise<Permission[]>;
}

class RoleBasedAccessControl implements AccessControl {
  async canCreateInstance(userId: string): Promise<boolean> {
    const user = await this.userService.getUser(userId);
    return user.roles.includes('instance-creator') || user.roles.includes('admin');
  }
  
  async canAccessInstance(userId: string, instanceId: string): Promise<boolean> {
    const instance = await this.instanceService.getInstance(instanceId);
    return instance.ownerId === userId || 
           instance.sharedWith.includes(userId) ||
           await this.isAdmin(userId);
  }
}
```

## 8. Monitoring & Observability

### 8.1 Metrics Collection

```typescript
interface ClaudeMetrics {
  instanceCount: number;
  activeConnections: number;
  messagesPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  resourceUsage: {
    totalMemoryMB: number;
    totalCpuPercent: number;
    diskUsageMB: number;
  };
  instanceMetrics: Map<string, InstanceMetrics>;
}

class MetricsCollector {
  private metrics: ClaudeMetrics;
  private collectors: MetricCollector[];
  
  constructor() {
    this.collectors = [
      new ResourceUsageCollector(),
      new ResponseTimeCollector(),
      new ErrorRateCollector(),
      new ThroughputCollector()
    ];
  }
  
  async collectMetrics(): Promise<ClaudeMetrics> {
    const metrics: Partial<ClaudeMetrics> = {};
    
    for (const collector of this.collectors) {
      const collectorMetrics = await collector.collect();
      Object.assign(metrics, collectorMetrics);
    }
    
    return metrics as ClaudeMetrics;
  }
}
```

### 8.2 Health Monitoring

```typescript
interface HealthCheck {
  name: string;
  check(): Promise<HealthStatus>;
}

class InstanceHealthMonitor {
  private healthChecks: HealthCheck[];
  
  constructor() {
    this.healthChecks = [
      new ProcessHealthCheck(),
      new CommunicationHealthCheck(),
      new ResourceHealthCheck(),
      new ResponseTimeHealthCheck()
    ];
  }
  
  async checkInstanceHealth(instanceId: string): Promise<OverallHealth> {
    const results: HealthResult[] = [];
    
    for (const check of this.healthChecks) {
      try {
        const status = await check.check();
        results.push({ name: check.name, status });
      } catch (error) {
        results.push({ 
          name: check.name, 
          status: { healthy: false, message: error.message }
        });
      }
    }
    
    return this.aggregateHealth(results);
  }
}
```

## 9. Configuration Management

### 9.1 Configuration Schema

```typescript
interface SystemConfiguration {
  server: {
    port: number;
    host: string;
    cors: CorsOptions;
    rateLimit: RateLimitOptions;
  };
  instances: {
    maxConcurrent: number;
    defaultTimeout: number;
    resourceLimits: ResourceLimits;
    allowedCommands: string[];
  };
  storage: {
    conversationsPath: string;
    logsPath: string;
    statePath: string;
    maxConversationAge: number;
  };
  security: {
    enableAuth: boolean;
    sessionTimeout: number;
    allowedOrigins: string[];
  };
  monitoring: {
    metricsInterval: number;
    healthCheckInterval: number;
    alertThresholds: AlertThresholds;
  };
}

class ConfigurationManager {
  private config: SystemConfiguration;
  private watchers: ConfigWatcher[];
  
  async loadConfiguration(configPath: string): Promise<void> {
    this.config = await this.loadFromFile(configPath);
    await this.validateConfiguration();
    this.setupConfigWatchers(configPath);
  }
  
  private async validateConfiguration(): Promise<void> {
    const validator = new ConfigValidator();
    const result = await validator.validate(this.config);
    
    if (!result.valid) {
      throw new Error(`Configuration validation failed: ${result.errors.join(', ')}`);
    }
  }
}
```

## 10. Implementation Roadmap

### Phase 1: Core Infrastructure (Weeks 1-2)
1. **Process Pool Implementation**
   - Basic Claude process spawning
   - Process lifecycle management
   - Resource monitoring setup

2. **Communication Layer**
   - HTTP API endpoints
   - WebSocket server setup  
   - Message protocol implementation

3. **State Management**
   - In-memory state management
   - Basic persistence layer
   - Configuration system

### Phase 2: Web Interface (Weeks 3-4)
1. **React UI Refactoring**
   - Remove terminal-specific components
   - Create Claude-focused UI components
   - Implement real-time communication

2. **Instance Management UI**
   - Instance creation/termination controls
   - Status monitoring dashboard
   - Conversation interface

3. **System Terminal Separation**
   - Extract system terminal to separate component
   - Remove Claude-specific terminal logic
   - Simplify terminal implementation

### Phase 3: Advanced Features (Weeks 5-6)
1. **Error Handling & Recovery**
   - Implement recovery strategies
   - Circuit breaker pattern
   - Graceful degradation

2. **Security & Access Control**
   - Authentication system
   - Resource limits enforcement
   - Command validation

3. **Monitoring & Observability**
   - Metrics collection
   - Health monitoring
   - Alerting system

### Phase 4: Production Readiness (Weeks 7-8)
1. **Performance Optimization**
   - Connection pooling
   - Message batching
   - Resource optimization

2. **Testing & Validation**
   - Integration tests
   - Load testing
   - Security testing

3. **Documentation & Deployment**
   - API documentation
   - Deployment guides
   - Operational runbooks

## Benefits of This Architecture

### 1. **Separation of Concerns**
- Claude management is independent of terminal complexity
- System commands use simple, dedicated terminal
- Clean API boundaries between components

### 2. **Scalability**
- Multiple concurrent Claude instances
- Resource pooling and management
- Horizontal scaling capabilities

### 3. **Maintainability**
- Focused, single-purpose components
- Clear architectural boundaries
- Simplified testing and debugging

### 4. **User Experience**
- Purpose-built Claude interaction interface
- Real-time communication
- Better error handling and recovery

### 5. **Operational Excellence**
- Comprehensive monitoring
- Automated recovery
- Resource management
- Security controls

## Migration Strategy

### 1. **Parallel Development**
- Build new system alongside existing one
- Gradually migrate features
- Maintain backward compatibility during transition

### 2. **Feature Flag Approach**
- Use feature flags to toggle between old/new systems
- Gradual rollout to users
- Quick rollback capability

### 3. **Data Migration**
- Export existing conversation data
- Import into new conversation store
- Validate data integrity

### 4. **User Training**
- Update documentation
- Provide migration guides
- Support during transition period

This architecture provides a robust, scalable foundation for dedicated Claude instance management while significantly simplifying the overall system complexity and improving maintainability.