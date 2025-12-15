# SPARC Phase 5: Dual Instance Monitor - Implementation Plan

## Implementation Strategy Overview

Based on our current environment with a WebSocket Hub (port 3002) and Production Claude Instance, we'll implement a comprehensive monitoring solution that can detect, connect to, and monitor multiple Claude instances seamlessly.

## Phase 5.1: Connection State Management Implementation

### Core Connection Manager

```typescript
// /frontend/src/services/dual-instance/DualInstanceConnectionManager.ts
export class DualInstanceConnectionManager extends EventEmitter {
  private instances = new Map<string, InstanceConnection>();
  private discoveryService: InstanceDiscoveryService;
  private healthMonitor: HealthMonitorService;
  private stateManager: ConnectionStateManager;
  private retryStrategies = new Map<string, RetryStrategy>();
  
  constructor(config: DualInstanceConfig) {
    super();
    this.discoveryService = new InstanceDiscoveryService(config.discovery);
    this.healthMonitor = new HealthMonitorService(config.health);
    this.stateManager = new ConnectionStateManager(config.state);
    this.setupEventHandlers();
  }

  async initialize(): Promise<void> {
    // Start instance discovery
    const discovered = await this.discoveryService.discoverInstances();
    
    // Initialize connections for discovered instances
    for (const instance of discovered) {
      await this.createConnection(instance);
    }
    
    // Start continuous monitoring
    this.startMonitoring();
  }

  private async createConnection(descriptor: InstanceDescriptor): Promise<void> {
    const connection: InstanceConnection = {
      id: descriptor.id,
      descriptor,
      socket: null,
      state: ConnectionState.INITIALIZING,
      healthChecker: this.healthMonitor.createChecker(descriptor),
      metrics: this.createMetricsTracker(descriptor),
      retryStrategy: new ExponentialBackoffRetryStrategy(),
      lastActivity: new Date(),
      errorHistory: []
    };

    this.instances.set(descriptor.id, connection);
    this.emit('instance_added', { instance: descriptor });
    
    // Attempt initial connection
    await this.connect(descriptor.id);
  }

  async connect(instanceId: string): Promise<void> {
    const connection = this.instances.get(instanceId);
    if (!connection) throw new Error(`Instance ${instanceId} not found`);

    try {
      connection.state = ConnectionState.CONNECTING;
      this.emitStateChange(instanceId, ConnectionState.CONNECTING);

      // Create WebSocket connection
      const socket = new WebSocketConnectionManager({
        url: connection.descriptor.url,
        autoConnect: false,
        reconnection: false, // We handle reconnection ourselves
        timeout: 10000
      });

      // Setup event handlers
      this.setupSocketHandlers(socket, connection);
      
      // Establish connection
      await socket.connect();
      
      connection.socket = socket;
      connection.state = ConnectionState.CONNECTED;
      connection.lastActivity = new Date();
      
      // Start health monitoring
      connection.healthChecker.startMonitoring();
      
      this.emitStateChange(instanceId, ConnectionState.CONNECTED);
      this.emit('instance_connected', { instanceId, timestamp: new Date() });
      
    } catch (error) {
      connection.state = ConnectionState.ERROR;
      connection.errorHistory.push({
        timestamp: new Date(),
        error: error as Error,
        context: 'connection_attempt'
      });
      
      this.emitStateChange(instanceId, ConnectionState.ERROR);
      this.scheduleReconnection(instanceId);
      
      throw error;
    }
  }

  private setupSocketHandlers(socket: WebSocketConnectionManager, connection: InstanceConnection): void {
    socket.on('connected', () => {
      connection.lastActivity = new Date();
      connection.metrics.recordConnection();
    });

    socket.on('disconnected', ({ reason, manual }) => {
      connection.state = manual ? ConnectionState.MANUAL_DISCONNECT : ConnectionState.DISCONNECTED;
      connection.healthChecker.stopMonitoring();
      
      if (!manual) {
        this.scheduleReconnection(connection.id);
      }
      
      this.emitStateChange(connection.id, connection.state);
    });

    socket.on('error', ({ error }) => {
      connection.errorHistory.push({
        timestamp: new Date(),
        error,
        context: 'socket_error'
      });
      
      connection.metrics.recordError(error);
      this.emit('instance_error', { instanceId: connection.id, error });
    });

    // Handle incoming messages
    socket.on('message', (data) => {
      connection.lastActivity = new Date();
      connection.metrics.recordMessage('received', JSON.stringify(data).length);
      this.handleInstanceMessage(connection.id, data);
    });
  }

  private async scheduleReconnection(instanceId: string): Promise<void> {
    const connection = this.instances.get(instanceId);
    if (!connection) return;

    const delay = connection.retryStrategy.getDelay();
    
    connection.state = ConnectionState.RECONNECTING;
    this.emitStateChange(instanceId, ConnectionState.RECONNECTING);
    
    setTimeout(async () => {
      try {
        await this.connect(instanceId);
        connection.retryStrategy.reset();
      } catch (error) {
        // Reconnection failed, schedule next attempt
        if (connection.retryStrategy.shouldRetry()) {
          this.scheduleReconnection(instanceId);
        } else {
          connection.state = ConnectionState.CIRCUIT_BREAKER_OPEN;
          this.emitStateChange(instanceId, ConnectionState.CIRCUIT_BREAKER_OPEN);
        }
      }
    }, delay);
  }

  getSystemStatus(): SystemStatus {
    const instances = Array.from(this.instances.values());
    const connected = instances.filter(i => i.state === ConnectionState.CONNECTED);
    
    return {
      overall: this.calculateOverallStatus(instances),
      totalInstances: instances.length,
      connectedInstances: connected.length,
      healthyInstances: connected.filter(i => i.healthChecker.isHealthy()).length,
      lastUpdate: new Date()
    };
  }

  private calculateOverallStatus(instances: InstanceConnection[]): OverallStatus {
    const connected = instances.filter(i => i.state === ConnectionState.CONNECTED);
    
    if (instances.length === 0) return OverallStatus.INITIALIZING;
    if (connected.length === 0) return OverallStatus.ALL_DISCONNECTED;
    if (connected.length === instances.length) {
      return instances.length === 2 ? OverallStatus.DUAL_INSTANCE_ACTIVE : OverallStatus.ALL_CONNECTED;
    }
    return OverallStatus.PARTIALLY_CONNECTED;
  }
}
```

### Instance Discovery Service

```typescript
// /frontend/src/services/dual-instance/InstanceDiscoveryService.ts
export class InstanceDiscoveryService {
  private strategies: DiscoveryStrategy[];
  private cache = new Map<string, InstanceDescriptor>();
  private discoveryInterval?: NodeJS.Timeout;

  constructor(private config: DiscoveryConfig) {
    this.strategies = [
      new PortScanStrategy(config.ports || [3001, 3002, 3003]),
      new EnvironmentStrategy(),
      new ConfigFileStrategy(),
      new WebSocketHubStrategy() // Discover via hub status
    ];
  }

  async discoverInstances(): Promise<InstanceDescriptor[]> {
    const discoveries = await Promise.allSettled(
      this.strategies.map(strategy => strategy.discover())
    );

    const instances = new Map<string, InstanceDescriptor>();
    
    discoveries.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        result.value.forEach(instance => {
          instances.set(instance.id, instance);
        });
      } else {
        console.warn(`Discovery strategy ${index} failed:`, result.reason);
      }
    });

    // Update cache
    this.cache = instances;
    
    return Array.from(instances.values());
  }

  startContinuousDiscovery(interval = 30000): void {
    this.discoveryInterval = setInterval(() => {
      this.discoverInstances().catch(console.error);
    }, interval);
  }

  stopDiscovery(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = undefined;
    }
  }
}

// Port scanning strategy
class PortScanStrategy implements DiscoveryStrategy {
  constructor(private ports: number[]) {}

  async discover(): Promise<InstanceDescriptor[]> {
    const probes = this.ports.map(port => this.probePort(port));
    const results = await Promise.allSettled(probes);
    
    return results
      .filter((result): result is PromiseFulfilledResult<InstanceDescriptor> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
  }

  private async probePort(port: number): Promise<InstanceDescriptor | null> {
    try {
      const url = `http://localhost:${port}`;
      const healthUrl = `${url}/health`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(healthUrl, {
        signal: controller.signal,
        method: 'GET'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const metadata = await response.json();
        
        return {
          id: `instance-${port}`,
          url: url.replace('http:', 'ws:'), // Convert to WebSocket URL
          type: this.determineInstanceType(metadata),
          priority: port === 3002 ? 10 : 5, // Hub gets higher priority
          metadata: {
            name: metadata.name || `Instance ${port}`,
            version: metadata.version,
            port: port,
            ...metadata
          },
          discovered: new Date(),
          capabilities: metadata.capabilities || []
        };
      }
    } catch (error) {
      // Port not accessible or no service
    }
    
    return null;
  }

  private determineInstanceType(metadata: any): InstanceType {
    if (metadata.type === 'websocket-hub') return InstanceType.PRODUCTION;
    if (metadata.environment === 'development') return InstanceType.DEVELOPMENT;
    if (metadata.environment === 'production') return InstanceType.PRODUCTION;
    return InstanceType.UNKNOWN;
  }
}

// WebSocket Hub discovery strategy
class WebSocketHubStrategy implements DiscoveryStrategy {
  async discover(): Promise<InstanceDescriptor[]> {
    try {
      // Connect to hub and get instance list
      const hubUrl = 'ws://localhost:3002';
      const socket = io(hubUrl);
      
      return new Promise((resolve) => {
        socket.on('connect', () => {
          socket.emit('getClaudeInstances');
        });
        
        socket.on('claudeInstancesList', (instances: any[]) => {
          const descriptors = instances.map(instance => ({
            id: instance.id,
            url: instance.endpoint || hubUrl,
            type: instance.instanceType === 'production' ? InstanceType.PRODUCTION : InstanceType.DEVELOPMENT,
            priority: 8,
            metadata: {
              name: `Claude Instance ${instance.instanceType}`,
              hubManaged: true,
              devMode: instance.devMode,
              capabilities: instance.capabilities
            },
            discovered: new Date(),
            capabilities: instance.capabilities || []
          }));
          
          socket.disconnect();
          resolve(descriptors);
        });
        
        // Timeout after 5 seconds
        setTimeout(() => {
          socket.disconnect();
          resolve([]);
        }, 5000);
      });
    } catch (error) {
      return [];
    }
  }
}
```

## Phase 5.2: Health Monitoring Implementation

### Health Monitor Service

```typescript
// /frontend/src/services/dual-instance/HealthMonitorService.ts
export class HealthMonitorService {
  private monitors = new Map<string, InstanceHealthMonitor>();
  
  createChecker(descriptor: InstanceDescriptor): InstanceHealthMonitor {
    const monitor = new InstanceHealthMonitor(descriptor, {
      pingInterval: 30000,
      timeout: 5000,
      maxFailures: 3
    });
    
    this.monitors.set(descriptor.id, monitor);
    return monitor;
  }

  getSystemHealth(): SystemHealthReport {
    const monitors = Array.from(this.monitors.values());
    
    return {
      overallHealth: this.calculateOverallHealth(monitors),
      instanceHealth: monitors.map(m => m.getHealthStatus()),
      networkQuality: this.assessNetworkQuality(monitors),
      timestamp: new Date()
    };
  }

  private calculateOverallHealth(monitors: InstanceHealthMonitor[]): HealthLevel {
    const healths = monitors.map(m => m.getHealthStatus().status);
    
    if (healths.every(h => h === HealthLevel.EXCELLENT)) return HealthLevel.EXCELLENT;
    if (healths.every(h => [HealthLevel.EXCELLENT, HealthLevel.GOOD].includes(h))) return HealthLevel.GOOD;
    if (healths.some(h => h === HealthLevel.CRITICAL)) return HealthLevel.CRITICAL;
    if (healths.some(h => h === HealthLevel.POOR)) return HealthLevel.POOR;
    return HealthLevel.FAIR;
  }
}

class InstanceHealthMonitor extends EventEmitter {
  private pingInterval?: NodeJS.Timeout;
  private currentStatus: HealthStatus;
  private consecutiveFailures = 0;
  private pingHistory: PingResult[] = [];

  constructor(
    private descriptor: InstanceDescriptor,
    private config: HealthCheckConfig
  ) {
    super();
    this.currentStatus = this.createInitialStatus();
  }

  startMonitoring(): void {
    this.pingInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.pingInterval);
    
    // Perform initial check
    this.performHealthCheck();
  }

  stopMonitoring(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }

  private async performHealthCheck(): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Implement different ping strategies based on instance type
      const result = await this.pingInstance();
      const latency = performance.now() - startTime;
      
      this.handlePingSuccess(latency, result);
      
    } catch (error) {
      this.handlePingFailure(error as Error);
    }
  }

  private async pingInstance(): Promise<PingResult> {
    // For WebSocket connections, use socket ping
    // For HTTP endpoints, use fetch
    if (this.descriptor.url.startsWith('ws')) {
      return this.pingWebSocket();
    } else {
      return this.pingHttp();
    }
  }

  private async pingWebSocket(): Promise<PingResult> {
    // Implementation for WebSocket ping
    // This would be coordinated with the connection manager
    return { success: true, responseTime: 0, serverMetrics: null };
  }

  private async pingHttp(): Promise<PingResult> {
    const url = this.descriptor.url.replace('ws:', 'http:') + '/ping';
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(this.config.timeout)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      responseTime: 0, // Will be calculated by caller
      serverMetrics: data.metrics || null
    };
  }

  private handlePingSuccess(latency: number, result: PingResult): void {
    this.consecutiveFailures = 0;
    
    const pingResult: PingResult = {
      ...result,
      responseTime: latency,
      timestamp: new Date()
    };
    
    this.pingHistory.push(pingResult);
    this.trimPingHistory();
    
    this.updateHealthStatus(true, latency, result.serverMetrics);
    this.emit('health_check_passed', { instanceId: this.descriptor.id, result: pingResult });
  }

  private handlePingFailure(error: Error): void {
    this.consecutiveFailures++;
    
    const isHealthy = this.consecutiveFailures < this.config.maxFailures;
    this.updateHealthStatus(isHealthy, null, null);
    
    this.emit('health_check_failed', {
      instanceId: this.descriptor.id,
      error,
      consecutiveFailures: this.consecutiveFailures
    });
    
    if (this.consecutiveFailures >= this.config.maxFailures) {
      this.emit('instance_unhealthy', {
        instanceId: this.descriptor.id,
        reason: 'consecutive_failures_exceeded'
      });
    }
  }

  private updateHealthStatus(isHealthy: boolean, latency: number | null, serverMetrics: any): void {
    const now = new Date();
    
    this.currentStatus = {
      ...this.currentStatus,
      isHealthy,
      latency,
      lastPing: now,
      consecutiveFailures: this.consecutiveFailures,
      serverMetrics,
      status: this.calculateHealthLevel(isHealthy, latency),
      networkQuality: this.assessNetworkQuality()
    };
    
    if (isHealthy) {
      this.currentStatus.lastSuccessfulPing = now;
    }
    
    this.emit('health_updated', {
      instanceId: this.descriptor.id,
      health: this.currentStatus
    });
  }

  getHealthStatus(): HealthStatus {
    return { ...this.currentStatus };
  }

  isHealthy(): boolean {
    return this.currentStatus.isHealthy;
  }
}
```

## Phase 5.3: Error Handling and Circuit Breaker

### Circuit Breaker Implementation

```typescript
// /frontend/src/services/dual-instance/CircuitBreaker.ts
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime?: Date;
  private nextAttemptTime?: Date;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new CircuitBreakerOpenError('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
    this.nextAttemptTime = undefined;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = new Date(Date.now() + this.config.resetTimeout);
    }
  }

  private shouldAttemptReset(): boolean {
    return this.nextAttemptTime ? new Date() >= this.nextAttemptTime : false;
  }

  getState(): CircuitState {
    return this.state;
  }
}

enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}
```

### Error Recovery Strategies

```typescript
// /frontend/src/services/dual-instance/ErrorRecoveryManager.ts
export class ErrorRecoveryManager {
  private strategies = new Map<ErrorType, ErrorRecoveryStrategy>();

  constructor() {
    this.registerDefaultStrategies();
  }

  private registerDefaultStrategies(): void {
    this.strategies.set(ErrorType.CONNECTION_ERROR, new ConnectionErrorStrategy());
    this.strategies.set(ErrorType.NETWORK_ERROR, new NetworkErrorStrategy());
    this.strategies.set(ErrorType.TIMEOUT_ERROR, new TimeoutErrorStrategy());
    this.strategies.set(ErrorType.AUTHENTICATION_ERROR, new AuthErrorStrategy());
  }

  async handleError(error: InstanceError, context: ErrorContext): Promise<ErrorResolution> {
    const strategy = this.strategies.get(error.type);
    
    if (!strategy) {
      return {
        resolved: false,
        strategy: ResolutionStrategy.ESCALATE,
        description: 'No recovery strategy available'
      };
    }

    try {
      return await strategy.recover(error, context);
    } catch (recoveryError) {
      return {
        resolved: false,
        strategy: ResolutionStrategy.ESCALATE,
        description: `Recovery failed: ${recoveryError.message}`
      };
    }
  }
}

class ConnectionErrorStrategy implements ErrorRecoveryStrategy {
  async recover(error: InstanceError, context: ErrorContext): Promise<ErrorResolution> {
    // Implement exponential backoff reconnection
    const delay = this.calculateBackoffDelay(context.retryAttempt || 0);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      // Attempt reconnection through context
      await context.reconnect?.();
      
      return {
        resolved: true,
        resolvedAt: new Date(),
        strategy: ResolutionStrategy.AUTOMATIC_RETRY,
        description: 'Successfully reconnected after network error'
      };
    } catch (retryError) {
      return {
        resolved: false,
        strategy: ResolutionStrategy.ESCALATE,
        description: 'Automatic reconnection failed'
      };
    }
  }

  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    
    // Add jitter
    return delay + Math.random() * 1000;
  }
}
```

## Phase 5.4: State Persistence and Recovery

### State Manager Implementation

```typescript
// /frontend/src/services/dual-instance/StateManager.ts
export class DualInstanceStateManager extends EventEmitter {
  private state: ApplicationState;
  private persistence: StateStorage;
  private subscribers = new Set<StateSubscriber>();

  constructor(initialState?: Partial<ApplicationState>) {
    super();
    this.persistence = new BrowserStateStorage('dual-instance-monitor');
    this.state = this.createInitialState(initialState);
    this.setupAutoSave();
  }

  async initialize(): Promise<void> {
    // Attempt to restore previous state
    try {
      const savedState = await this.persistence.load();
      if (savedState) {
        this.state = this.mergeStates(this.state, savedState);
        this.emit('state_restored', { timestamp: new Date() });
      }
    } catch (error) {
      console.warn('Failed to restore state:', error);
    }
  }

  updateInstanceState(instanceId: string, update: Partial<InstanceState>): void {
    const current = this.state.instances.get(instanceId);
    if (!current) {
      throw new Error(`Instance ${instanceId} not found in state`);
    }

    const updated = { ...current, ...update, lastUpdate: new Date() };
    this.state.instances.set(instanceId, updated);
    this.state.lastUpdate = new Date();

    this.emit('instance_state_changed', {
      instanceId,
      previousState: current,
      newState: updated
    });

    this.notifySubscribers();
  }

  updateSystemStatus(status: Partial<SystemStatus>): void {
    this.state.systemStatus = {
      ...this.state.systemStatus,
      ...status,
      lastUpdate: new Date()
    };

    this.emit('system_status_changed', {
      status: this.state.systemStatus
    });

    this.notifySubscribers();
  }

  getState(): Readonly<ApplicationState> {
    return this.state;
  }

  subscribe(subscriber: StateSubscriber): () => void {
    this.subscribers.add(subscriber);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(subscriber => {
      try {
        subscriber(this.state);
      } catch (error) {
        console.error('Error in state subscriber:', error);
      }
    });
  }

  private setupAutoSave(): void {
    // Auto-save every 30 seconds
    setInterval(() => {
      this.persistence.save(this.state).catch(console.error);
    }, 30000);

    // Save on beforeunload
    window.addEventListener('beforeunload', () => {
      this.persistence.save(this.state);
    });
  }

  async exportState(): Promise<string> {
    return StateSerializer.serialize(this.state);
  }

  async importState(serializedState: string): Promise<void> {
    try {
      const importedState = StateSerializer.deserialize(serializedState);
      this.state = this.mergeStates(this.state, importedState);
      this.emit('state_imported', { timestamp: new Date() });
      this.notifySubscribers();
    } catch (error) {
      throw new Error(`Failed to import state: ${error.message}`);
    }
  }
}

class BrowserStateStorage implements StateStorage {
  constructor(private key: string) {}

  async save(state: ApplicationState): Promise<void> {
    try {
      const serialized = StateSerializer.serialize(state);
      localStorage.setItem(this.key, serialized);
    } catch (error) {
      throw new Error(`Failed to save state: ${error.message}`);
    }
  }

  async load(): Promise<Partial<ApplicationState> | null> {
    try {
      const serialized = localStorage.getItem(this.key);
      if (!serialized) return null;
      
      return StateSerializer.deserialize(serialized);
    } catch (error) {
      console.warn('Failed to load state:', error);
      return null;
    }
  }

  async clear(): Promise<void> {
    localStorage.removeItem(this.key);
  }
}
```

## Implementation Timeline

### Week 1: Core Infrastructure
- **Day 1-2**: Instance Discovery Service
- **Day 3-4**: Dual Connection Manager  
- **Day 5-7**: Basic Health Monitoring

### Week 2: Advanced Features
- **Day 1-3**: Error Handling & Circuit Breakers
- **Day 4-5**: State Management & Persistence
- **Day 6-7**: Performance Optimization

### Testing Strategy

#### Unit Tests
```typescript
describe('DualInstanceConnectionManager', () => {
  test('should discover instances on initialization', async () => {
    const manager = new DualInstanceConnectionManager(mockConfig);
    await manager.initialize();
    
    expect(manager.getSystemStatus().totalInstances).toBeGreaterThan(0);
  });

  test('should handle connection failures gracefully', async () => {
    const manager = new DualInstanceConnectionManager(mockConfig);
    const mockInstance = createMockInstance({ url: 'ws://invalid:9999' });
    
    await expect(manager.connect(mockInstance.id)).rejects.toThrow();
    expect(manager.getSystemStatus().overall).toBe(OverallStatus.PARTIALLY_CONNECTED);
  });
});
```

#### Integration Tests
```typescript
describe('Dual Instance Integration', () => {
  test('should maintain connection to hub and claude instance', async () => {
    const manager = new DualInstanceConnectionManager(realConfig);
    await manager.initialize();
    
    // Wait for connections to establish
    await waitFor(() => 
      manager.getSystemStatus().connectedInstances === 2
    );
    
    expect(manager.getSystemStatus().overall).toBe(OverallStatus.DUAL_INSTANCE_ACTIVE);
  });
});
```

This implementation plan provides a robust, production-ready foundation for the Dual Instance Monitor system with comprehensive error handling, state management, and monitoring capabilities.