# Error Handling & Resource Management Specification

## 1. ERROR CLASSIFICATION & TAXONOMY

### 1.1 Error Categories
```typescript
enum ErrorCategory {
  PROCESS_MANAGEMENT = 'process_management',
  RESOURCE_EXHAUSTION = 'resource_exhaustion', 
  IO_COMMUNICATION = 'io_communication',
  SYSTEM_INTEGRATION = 'system_integration',
  USER_INPUT = 'user_input',
  CONFIGURATION = 'configuration'
}

enum ErrorSeverity {
  CRITICAL = 'critical',    // System failure, requires immediate action
  HIGH = 'high',           // Major functionality impacted
  MEDIUM = 'medium',       // Partial functionality loss
  LOW = 'low',             // Minor issues, degraded performance
  INFO = 'info'            // Informational, no impact
}

interface ProcessError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  instanceId?: string;
  message: string;
  details: any;
  timestamp: Date;
  stackTrace?: string;
  context: {
    pid?: number;
    command?: string[];
    workingDirectory?: string;
    resourceUsage?: ResourceUsage;
  };
  recoverable: boolean;
  retryCount: number;
  maxRetries: number;
}
```

### 1.2 Specific Error Types
```typescript
// Process Management Errors
class ProcessSpawnError extends Error {
  constructor(
    public command: string[],
    public workingDirectory: string,
    public cause: Error
  ) {
    super(`Failed to spawn process: ${command.join(' ')} in ${workingDirectory}`);
  }
}

class ProcessCrashError extends Error {
  constructor(
    public instanceId: string,
    public pid: number,
    public exitCode: number,
    public signal?: string
  ) {
    super(`Process ${instanceId} (PID: ${pid}) crashed with exit code ${exitCode}${signal ? ` (signal: ${signal})` : ''}`);
  }
}

class ProcessTimeoutError extends Error {
  constructor(
    public instanceId: string,
    public operation: string,
    public timeoutMs: number
  ) {
    super(`Process ${instanceId} ${operation} timed out after ${timeoutMs}ms`);
  }
}

// Resource Management Errors
class ResourceExhaustionError extends Error {
  constructor(
    public resourceType: string,
    public currentUsage: number,
    public limit: number
  ) {
    super(`Resource exhaustion: ${resourceType} usage ${currentUsage} exceeds limit ${limit}`);
  }
}

class MemoryLimitExceededError extends ResourceExhaustionError {
  constructor(currentUsage: number, limit: number) {
    super('memory', currentUsage, limit);
  }
}

// I/O Communication Errors
class StreamBrokenError extends Error {
  constructor(
    public instanceId: string,
    public streamType: 'stdin' | 'stdout' | 'stderr'
  ) {
    super(`${streamType} stream broken for process ${instanceId}`);
  }
}

class SSEConnectionError extends Error {
  constructor(
    public instanceId: string,
    public connectionCount: number,
    public cause: Error
  ) {
    super(`SSE connection error for ${instanceId} (${connectionCount} connections)`);
  }
}
```

## 2. ERROR DETECTION & MONITORING

### 2.1 Process Health Monitoring
```typescript
interface HealthCheckResult {
  instanceId: string;
  healthy: boolean;
  issues: HealthIssue[];
  metrics: {
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
    lastActivity: Date;
  };
}

interface HealthIssue {
  type: 'warning' | 'error' | 'critical';
  message: string;
  details: any;
  timestamp: Date;
}

class ProcessHealthMonitor {
  private healthChecks = new Map<string, NodeJS.Timer>();
  private healthHistory = new Map<string, HealthCheckResult[]>();
  private alertThresholds = {
    memoryWarning: 512 * 1024 * 1024, // 512MB
    memoryCritical: 1024 * 1024 * 1024, // 1GB
    cpuWarning: 70, // 70%
    cpuCritical: 90, // 90%
    inactivityWarning: 300000, // 5 minutes
    inactivityCritical: 600000, // 10 minutes
    responseTimeWarning: 5000, // 5 seconds
    responseTimeCritical: 15000 // 15 seconds
  };

  startMonitoring(instance: ProcessInstance): void {
    const checkInterval = setInterval(async () => {
      try {
        const healthResult = await this.performHealthCheck(instance);
        this.recordHealthCheck(instance.instanceId, healthResult);
        await this.processHealthIssues(healthResult);
      } catch (error) {
        await this.handleMonitoringError(instance.instanceId, error as Error);
      }
    }, 10000); // Check every 10 seconds

    this.healthChecks.set(instance.instanceId, checkInterval);
  }

  private async performHealthCheck(instance: ProcessInstance): Promise<HealthCheckResult> {
    const issues: HealthIssue[] = [];
    const startTime = Date.now();

    // 1. Process existence check
    const processExists = this.checkProcessExists(instance.pid);
    if (!processExists) {
      issues.push({
        type: 'critical',
        message: 'Process no longer exists',
        details: { pid: instance.pid },
        timestamp: new Date()
      });
    }

    // 2. Memory usage check
    const memoryUsage = await this.getProcessMemoryUsage(instance.pid);
    if (memoryUsage > this.alertThresholds.memoryCritical) {
      issues.push({
        type: 'critical',
        message: 'Critical memory usage',
        details: { usage: memoryUsage, limit: this.alertThresholds.memoryCritical },
        timestamp: new Date()
      });
    } else if (memoryUsage > this.alertThresholds.memoryWarning) {
      issues.push({
        type: 'warning',
        message: 'High memory usage',
        details: { usage: memoryUsage, threshold: this.alertThresholds.memoryWarning },
        timestamp: new Date()
      });
    }

    // 3. CPU usage check
    const cpuUsage = await this.getProcessCPUUsage(instance.pid);
    if (cpuUsage > this.alertThresholds.cpuCritical) {
      issues.push({
        type: 'critical',
        message: 'Critical CPU usage',
        details: { usage: cpuUsage, limit: this.alertThresholds.cpuCritical },
        timestamp: new Date()
      });
    }

    // 4. Activity check
    const timeSinceActivity = Date.now() - instance.lastActivity.getTime();
    if (timeSinceActivity > this.alertThresholds.inactivityCritical) {
      issues.push({
        type: 'critical',
        message: 'Process appears inactive',
        details: { 
          lastActivity: instance.lastActivity,
          inactiveDuration: timeSinceActivity 
        },
        timestamp: new Date()
      });
    }

    // 5. Stream health check
    if (!instance.process.stdin?.writable) {
      issues.push({
        type: 'error',
        message: 'Stdin stream not writable',
        details: { streamState: 'closed' },
        timestamp: new Date()
      });
    }

    const responseTime = Date.now() - startTime;

    return {
      instanceId: instance.instanceId,
      healthy: issues.filter(i => i.type === 'critical').length === 0,
      issues,
      metrics: {
        responseTime,
        memoryUsage,
        cpuUsage,
        lastActivity: instance.lastActivity
      }
    };
  }

  private async processHealthIssues(healthResult: HealthCheckResult): Promise<void> {
    const criticalIssues = healthResult.issues.filter(i => i.type === 'critical');
    
    if (criticalIssues.length > 0) {
      await this.handleCriticalHealthIssues(healthResult.instanceId, criticalIssues);
    }

    const errorIssues = healthResult.issues.filter(i => i.type === 'error');
    if (errorIssues.length > 0) {
      await this.handleErrorHealthIssues(healthResult.instanceId, errorIssues);
    }
  }
}
```

### 2.2 Resource Usage Monitoring
```typescript
interface ResourceUsage {
  memory: {
    rss: number;        // Resident set size
    heapTotal: number;  // Total heap size
    heapUsed: number;   // Used heap size
    external: number;   // External memory
  };
  cpu: {
    user: number;       // User CPU time
    system: number;     // System CPU time
    percentage: number; // CPU percentage
  };
  io: {
    readBytes: number;
    writeBytes: number;
    readOps: number;
    writeOps: number;
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    connectionsActive: number;
  };
  fileDescriptors: {
    open: number;
    limit: number;
  };
}

class ResourceMonitor {
  private resourceHistory = new Map<string, ResourceUsage[]>();
  private resourceLimits: ResourceLimits;

  constructor(limits: ResourceLimits) {
    this.resourceLimits = limits;
  }

  async collectResourceUsage(instance: ProcessInstance): Promise<ResourceUsage> {
    try {
      const usage: ResourceUsage = {
        memory: await this.getMemoryUsage(instance.pid),
        cpu: await this.getCPUUsage(instance.pid),
        io: await this.getIOUsage(instance.pid),
        network: await this.getNetworkUsage(instance.pid),
        fileDescriptors: await this.getFileDescriptorUsage(instance.pid)
      };

      // Store historical data
      this.recordResourceUsage(instance.instanceId, usage);

      // Check limits
      await this.checkResourceLimits(instance.instanceId, usage);

      return usage;
    } catch (error) {
      throw new Error(`Failed to collect resource usage for ${instance.instanceId}: ${error}`);
    }
  }

  private async checkResourceLimits(instanceId: string, usage: ResourceUsage): Promise<void> {
    const violations: string[] = [];

    // Memory limit check
    if (usage.memory.rss > this.resourceLimits.maxMemoryPerProcess) {
      violations.push(`Memory usage ${usage.memory.rss} exceeds limit ${this.resourceLimits.maxMemoryPerProcess}`);
    }

    // CPU limit check  
    if (usage.cpu.percentage > this.resourceLimits.maxCpuPerProcess) {
      violations.push(`CPU usage ${usage.cpu.percentage}% exceeds limit ${this.resourceLimits.maxCpuPerProcess}%`);
    }

    // File descriptor limit check
    if (usage.fileDescriptors.open > this.resourceLimits.maxFiles) {
      violations.push(`Open file descriptors ${usage.fileDescriptors.open} exceeds limit ${this.resourceLimits.maxFiles}`);
    }

    if (violations.length > 0) {
      throw new ResourceExhaustionError('multiple', 0, 0);
    }
  }
}
```

## 3. ERROR HANDLING STRATEGIES

### 3.1 Error Recovery Manager
```typescript
interface RecoveryStrategy {
  errorType: string;
  canRecover(error: ProcessError): boolean;
  recover(error: ProcessError): Promise<RecoveryResult>;
  priority: number; // Lower number = higher priority
}

interface RecoveryResult {
  success: boolean;
  message: string;
  actions: string[];
  newState?: any;
}

class ProcessErrorRecoveryManager {
  private strategies: RecoveryStrategy[] = [];
  private recoveryHistory = new Map<string, ProcessError[]>();

  registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => a.priority - b.priority);
  }

  async handleError(error: ProcessError): Promise<RecoveryResult> {
    // Record error in history
    this.recordError(error);

    // Find appropriate recovery strategy
    const strategy = this.findRecoveryStrategy(error);
    
    if (!strategy) {
      return this.handleUnrecoverableError(error);
    }

    // Attempt recovery
    try {
      const result = await strategy.recover(error);
      
      if (result.success) {
        console.log(`✅ Error recovery successful for ${error.instanceId}: ${result.message}`);
      } else {
        console.warn(`⚠️ Error recovery failed for ${error.instanceId}: ${result.message}`);
      }

      return result;
    } catch (recoveryError) {
      console.error(`❌ Recovery attempt failed:`, recoveryError);
      return this.handleUnrecoverableError(error);
    }
  }

  private findRecoveryStrategy(error: ProcessError): RecoveryStrategy | null {
    return this.strategies.find(strategy => strategy.canRecover(error)) || null;
  }

  private handleUnrecoverableError(error: ProcessError): RecoveryResult {
    console.error(`💀 Unrecoverable error for ${error.instanceId}:`, error);
    
    // Broadcast fatal error
    if (error.instanceId) {
      sseBroadcaster.broadcast(error.instanceId, {
        type: 'fatal_error',
        instanceId: error.instanceId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return {
      success: false,
      message: 'Error is not recoverable',
      actions: ['cleanup', 'notify_user', 'log_incident']
    };
  }
}

// Recovery Strategies
class ProcessRestartStrategy implements RecoveryStrategy {
  errorType = 'process_crash';
  priority = 1;

  canRecover(error: ProcessError): boolean {
    return error.category === ErrorCategory.PROCESS_MANAGEMENT &&
           error.retryCount < error.maxRetries &&
           error.instanceId !== undefined;
  }

  async recover(error: ProcessError): Promise<RecoveryResult> {
    const instanceId = error.instanceId!;
    
    try {
      // Get original spawn configuration
      const originalInstance = processRegistry.get(instanceId);
      if (!originalInstance) {
        throw new Error('Original instance configuration not found');
      }

      // Create new spawn configuration
      const spawnConfig: SpawnConfig = {
        command: originalInstance.command,
        workingDirectory: originalInstance.workingDirectory,
        environment: originalInstance.environment,
        metadata: {
          ...originalInstance.metadata,
          tags: [...originalInstance.metadata.tags, 'restarted']
        }
      };

      // Spawn new process
      const newInstance = await processSpawner.spawn(spawnConfig);
      
      // Update registry
      processRegistry.unregister(instanceId);
      processRegistry.register(newInstance);

      // Setup I/O handler
      const ioHandler = new ProcessIOHandler(newInstance, sseBroadcaster);
      ioHandlers.set(newInstance.instanceId, ioHandler);

      return {
        success: true,
        message: `Process restarted successfully with new PID ${newInstance.pid}`,
        actions: ['process_spawned', 'registry_updated', 'io_reconnected'],
        newState: { instanceId: newInstance.instanceId, pid: newInstance.pid }
      };

    } catch (restartError) {
      return {
        success: false,
        message: `Restart failed: ${restartError}`,
        actions: ['cleanup_failed_restart']
      };
    }
  }
}

class StreamRecoveryStrategy implements RecoveryStrategy {
  errorType = 'stream_broken';
  priority = 2;

  canRecover(error: ProcessError): boolean {
    return error.category === ErrorCategory.IO_COMMUNICATION &&
           error.retryCount < 3;
  }

  async recover(error: ProcessError): Promise<RecoveryResult> {
    const instanceId = error.instanceId!;
    
    try {
      const instance = processRegistry.get(instanceId);
      if (!instance || instance.status !== 'running') {
        throw new Error('Process is not running');
      }

      // Recreate I/O handler
      const newIOHandler = new ProcessIOHandler(instance, sseBroadcaster);
      ioHandlers.set(instanceId, newIOHandler);

      // Test stream connectivity
      const testInput = '\n'; // Simple newline test
      const success = newIOHandler.sendInput(testInput);
      
      if (!success) {
        throw new Error('Stream test failed');
      }

      return {
        success: true,
        message: 'Stream connectivity restored',
        actions: ['io_handler_recreated', 'stream_test_passed']
      };

    } catch (streamError) {
      return {
        success: false,
        message: `Stream recovery failed: ${streamError}`,
        actions: ['escalate_to_process_restart']
      };
    }
  }
}
```

## 4. RESOURCE MANAGEMENT

### 4.1 Resource Pool Manager
```typescript
class ResourcePoolManager {
  private pools: Map<string, ResourcePool> = new Map();
  private globalLimits: GlobalResourceLimits;

  constructor(globalLimits: GlobalResourceLimits) {
    this.globalLimits = globalLimits;
    this.initializePools();
  }

  private initializePools(): void {
    // Memory pool
    this.pools.set('memory', new MemoryPool(this.globalLimits.totalMemory));
    
    // CPU pool
    this.pools.set('cpu', new CPUPool(this.globalLimits.totalCPU));
    
    // File descriptor pool
    this.pools.set('fileDescriptors', new FileDescriptorPool(this.globalLimits.totalFileDescriptors));
    
    // Network connection pool
    this.pools.set('networkConnections', new NetworkConnectionPool(this.globalLimits.maxConnections));
  }

  async allocateResources(instanceId: string, requirements: ResourceRequirements): Promise<ResourceAllocation> {
    const allocation: ResourceAllocation = {
      instanceId,
      memory: 0,
      cpu: 0,
      fileDescriptors: 0,
      networkConnections: 0,
      allocated: new Date()
    };

    try {
      // Allocate memory
      if (requirements.memory > 0) {
        const memoryPool = this.pools.get('memory') as MemoryPool;
        allocation.memory = await memoryPool.allocate(instanceId, requirements.memory);
      }

      // Allocate CPU
      if (requirements.cpu > 0) {
        const cpuPool = this.pools.get('cpu') as CPUPool;
        allocation.cpu = await cpuPool.allocate(instanceId, requirements.cpu);
      }

      // Allocate file descriptors
      if (requirements.fileDescriptors > 0) {
        const fdPool = this.pools.get('fileDescriptors') as FileDescriptorPool;
        allocation.fileDescriptors = await fdPool.allocate(instanceId, requirements.fileDescriptors);
      }

      return allocation;
    } catch (error) {
      // Rollback any partial allocations
      await this.deallocateResources(instanceId);
      throw new ResourceExhaustionError('allocation_failed', 0, 0);
    }
  }

  async deallocateResources(instanceId: string): Promise<void> {
    for (const [poolName, pool] of this.pools) {
      try {
        await pool.deallocate(instanceId);
      } catch (error) {
        console.error(`Failed to deallocate ${poolName} for ${instanceId}:`, error);
      }
    }
  }
}

abstract class ResourcePool {
  protected allocations = new Map<string, number>();
  protected totalCapacity: number;
  protected available: number;

  constructor(capacity: number) {
    this.totalCapacity = capacity;
    this.available = capacity;
  }

  async allocate(instanceId: string, amount: number): Promise<number> {
    if (amount > this.available) {
      throw new ResourceExhaustionError(
        this.constructor.name,
        this.totalCapacity - this.available + amount,
        this.totalCapacity
      );
    }

    this.allocations.set(instanceId, amount);
    this.available -= amount;
    
    return amount;
  }

  async deallocate(instanceId: string): Promise<void> {
    const allocated = this.allocations.get(instanceId);
    if (allocated) {
      this.available += allocated;
      this.allocations.delete(instanceId);
    }
  }

  getUtilization(): number {
    return (this.totalCapacity - this.available) / this.totalCapacity;
  }
}

class MemoryPool extends ResourcePool {
  constructor(totalMemoryBytes: number) {
    super(totalMemoryBytes);
  }
}

class CPUPool extends ResourcePool {
  constructor(totalCPUPercentage: number) {
    super(totalCPUPercentage);
  }
}
```

## 5. GRACEFUL DEGRADATION

### 5.1 Service Degradation Manager
```typescript
enum ServiceLevel {
  FULL = 'full',
  DEGRADED = 'degraded', 
  MINIMAL = 'minimal',
  EMERGENCY = 'emergency'
}

interface ServiceCapability {
  name: string;
  level: ServiceLevel;
  enabled: boolean;
  resourceRequirement: number;
}

class GracefulDegradationManager {
  private currentServiceLevel = ServiceLevel.FULL;
  private capabilities: Map<string, ServiceCapability> = new Map();
  private resourceThresholds = {
    [ServiceLevel.FULL]: { memory: 0.8, cpu: 0.8 },
    [ServiceLevel.DEGRADED]: { memory: 0.9, cpu: 0.9 },
    [ServiceLevel.MINIMAL]: { memory: 0.95, cpu: 0.95 },
    [ServiceLevel.EMERGENCY]: { memory: 1.0, cpu: 1.0 }
  };

  initializeCapabilities(): void {
    this.capabilities.set('realtime_output', {
      name: 'Real-time output streaming',
      level: ServiceLevel.FULL,
      enabled: true,
      resourceRequirement: 0.1
    });

    this.capabilities.set('output_buffering', {
      name: 'Output buffering',
      level: ServiceLevel.DEGRADED,
      enabled: false,
      resourceRequirement: 0.05
    });

    this.capabilities.set('polling_mode', {
      name: 'Polling-based updates',
      level: ServiceLevel.MINIMAL,
      enabled: false,
      resourceRequirement: 0.02
    });

    this.capabilities.set('basic_terminal', {
      name: 'Basic terminal functionality',
      level: ServiceLevel.EMERGENCY,
      enabled: false,
      resourceRequirement: 0.01
    });
  }

  async evaluateServiceLevel(resourceUsage: SystemResourceUsage): Promise<ServiceLevel> {
    const memoryUtilization = resourceUsage.memoryUsed / resourceUsage.memoryTotal;
    const cpuUtilization = resourceUsage.cpuUsed / 100;

    let requiredLevel = ServiceLevel.FULL;

    // Determine required service level based on resource usage
    if (memoryUtilization >= this.resourceThresholds[ServiceLevel.EMERGENCY].memory ||
        cpuUtilization >= this.resourceThresholds[ServiceLevel.EMERGENCY].cpu) {
      requiredLevel = ServiceLevel.EMERGENCY;
    } else if (memoryUtilization >= this.resourceThresholds[ServiceLevel.MINIMAL].memory ||
               cpuUtilization >= this.resourceThresholds[ServiceLevel.MINIMAL].cpu) {
      requiredLevel = ServiceLevel.MINIMAL;
    } else if (memoryUtilization >= this.resourceThresholds[ServiceLevel.DEGRADED].memory ||
               cpuUtilization >= this.resourceThresholds[ServiceLevel.DEGRADED].cpu) {
      requiredLevel = ServiceLevel.DEGRADED;
    }

    if (requiredLevel !== this.currentServiceLevel) {
      await this.transitionToServiceLevel(requiredLevel);
    }

    return this.currentServiceLevel;
  }

  private async transitionToServiceLevel(newLevel: ServiceLevel): Promise<void> {
    console.log(`🔄 Transitioning from ${this.currentServiceLevel} to ${newLevel} service level`);

    // Disable capabilities above the new level
    for (const [name, capability] of this.capabilities) {
      const shouldEnable = this.shouldEnableCapability(capability, newLevel);
      
      if (capability.enabled && !shouldEnable) {
        await this.disableCapability(name);
      } else if (!capability.enabled && shouldEnable) {
        await this.enableCapability(name);
      }
    }

    this.currentServiceLevel = newLevel;

    // Broadcast service level change
    this.broadcastServiceLevelChange(newLevel);
  }

  private shouldEnableCapability(capability: ServiceCapability, serviceLevel: ServiceLevel): boolean {
    const levelPriority = {
      [ServiceLevel.FULL]: 4,
      [ServiceLevel.DEGRADED]: 3,
      [ServiceLevel.MINIMAL]: 2,
      [ServiceLevel.EMERGENCY]: 1
    };

    return levelPriority[capability.level] <= levelPriority[serviceLevel];
  }

  private async disableCapability(name: string): Promise<void> {
    const capability = this.capabilities.get(name);
    if (!capability) return;

    switch (name) {
      case 'realtime_output':
        // Switch to buffered output
        await this.enableOutputBuffering();
        break;
      case 'output_buffering':
        // Switch to polling mode
        await this.enablePollingMode();
        break;
      case 'polling_mode':
        // Switch to basic terminal
        await this.enableBasicTerminal();
        break;
    }

    capability.enabled = false;
    console.log(`❌ Disabled capability: ${capability.name}`);
  }

  private async enableCapability(name: string): Promise<void> {
    const capability = this.capabilities.get(name);
    if (!capability) return;

    capability.enabled = true;
    console.log(`✅ Enabled capability: ${capability.name}`);
  }
}
```

## 6. LOGGING & OBSERVABILITY

### 6.1 Comprehensive Logging System
```typescript
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info', 
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  instanceId?: string;
  message: string;
  details?: any;
  stackTrace?: string;
  tags: string[];
}

class ProcessLogger {
  private logEntries: LogEntry[] = [];
  private maxLogEntries = 10000;
  private logLevel = LogLevel.INFO;

  log(level: LogLevel, category: string, message: string, details?: any, instanceId?: string): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      instanceId,
      message,
      details,
      stackTrace: level === LogLevel.ERROR || level === LogLevel.FATAL ? new Error().stack : undefined,
      tags: this.generateTags(level, category, instanceId)
    };

    this.addLogEntry(entry);
    this.outputLog(entry);
  }

  private addLogEntry(entry: LogEntry): void {
    this.logEntries.push(entry);
    
    // Maintain max log entries
    if (this.logEntries.length > this.maxLogEntries) {
      this.logEntries = this.logEntries.slice(-this.maxLogEntries);
    }
  }

  private outputLog(entry: LogEntry): void {
    const formattedMessage = this.formatLogMessage(entry);
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formattedMessage);
        break;
    }
  }

  private formatLogMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const category = entry.category.padEnd(20);
    const instanceInfo = entry.instanceId ? ` [${entry.instanceId.slice(0, 8)}]` : '';
    
    let message = `${timestamp} ${level} ${category}${instanceInfo} ${entry.message}`;
    
    if (entry.details) {
      message += `\n  Details: ${JSON.stringify(entry.details, null, 2)}`;
    }
    
    if (entry.stackTrace && (entry.level === LogLevel.ERROR || entry.level === LogLevel.FATAL)) {
      message += `\n  Stack: ${entry.stackTrace}`;
    }
    
    return message;
  }
}
```

This specification provides comprehensive error handling and resource management strategies to ensure robust and reliable Claude process execution with proper degradation and recovery mechanisms.