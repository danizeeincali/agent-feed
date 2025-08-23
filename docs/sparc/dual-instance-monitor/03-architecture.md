# SPARC Phase 3: Dual Instance Monitor - System Architecture

## High-Level Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Dual Instance Monitor                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │   UI Layer      │    │  Service Layer  │    │ Data Layer   │ │
│  │                 │    │                 │    │              │ │
│  │ • Status Panel  │◄──►│ • Discovery Svc │◄──►│ • State Store│ │
│  │ • Log Viewer    │    │ • Connection Mgr│    │ • Log Buffer │ │
│  │ • Error Display │    │ • Health Monitor│    │ • Metrics DB │ │
│  │ • Config Panel  │    │ • Log Aggregator│    │ • Config     │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
         ┌─────────────────────────────────────────┐
         │           External Systems              │
         │  ┌─────────────┐    ┌─────────────┐     │
         │  │ Claude       │    │ Claude      │     │
         │  │ Instance 1   │    │ Instance 2  │     │
         │  │ (Port 3001)  │    │ (Port 3002) │     │
         │  └─────────────┘    └─────────────┘     │
         └─────────────────────────────────────────┘
```

## Component Architecture

### 1. UI Layer Components

#### 1.1 DualInstanceMonitor (Root Component)
```typescript
interface DualInstanceMonitorProps {
  config?: InstanceMonitorConfig;
  onStateChange?: (state: SystemState) => void;
  children?: React.ReactNode;
}

interface SystemState {
  overallStatus: 'initializing' | 'all_connected' | 'partially_connected' | 'all_disconnected';
  instances: InstanceState[];
  metrics: SystemMetrics;
  lastUpdate: Date;
}
```

**Responsibilities:**
- Orchestrate all child components
- Manage global state and context
- Handle error boundaries
- Coordinate service initialization

**Dependencies:**
- InstanceDiscoveryService
- ConnectionManager
- StateManager

#### 1.2 InstanceStatusPanel
```typescript
interface InstanceStatusPanelProps {
  instances: InstanceState[];
  onManualReconnect: (instanceId: string) => void;
  onConfigChange: (config: InstanceConfig) => void;
}

interface InstanceState {
  id: string;
  url: string;
  status: ConnectionStatus;
  metadata: InstanceMetadata;
  healthMetrics: HealthMetrics;
  lastConnected?: Date;
  lastError?: Error;
}
```

**Features:**
- Real-time status indicators
- Connection health visualization
- Manual reconnection controls
- Instance configuration editor

#### 1.3 LogStreamViewer
```typescript
interface LogStreamViewerProps {
  logEntries: LogEntry[];
  filterCriteria: LogFilter;
  onFilterChange: (filter: LogFilter) => void;
  maxEntries?: number;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  instanceId: string;
  source: string;
  metadata?: Record<string, any>;
}
```

**Features:**
- Real-time log streaming
- Multi-instance log aggregation
- Advanced filtering and search
- Export functionality

#### 1.4 ErrorBoundary
```typescript
interface ErrorBoundaryProps {
  fallback: React.ComponentType<ErrorFallbackProps>;
  onError: (error: Error, errorInfo: ErrorInfo) => void;
  children: React.ReactNode;
}
```

**Features:**
- Graceful error handling
- Error recovery mechanisms
- Fallback UI components
- Error reporting integration

### 2. Service Layer Components

#### 2.1 InstanceDiscoveryService
```typescript
class InstanceDiscoveryService {
  private discoveryStrategies: DiscoveryStrategy[];
  private discoveryInterval: number;
  private cache: InstanceCache;
  
  async discoverInstances(): Promise<DetectedInstance[]>;
  startContinuousDiscovery(): void;
  stopDiscovery(): void;
  addDiscoveryStrategy(strategy: DiscoveryStrategy): void;
}

interface DiscoveryStrategy {
  name: string;
  priority: number;
  discover(): Promise<DetectedInstance[]>;
}
```

**Discovery Strategies:**
- **PortScanStrategy**: Scan predefined port ranges
- **EnvironmentStrategy**: Check environment variables
- **ConfigFileStrategy**: Read from configuration files
- **ServiceRegistryStrategy**: Query service discovery systems

#### 2.2 DualConnectionManager
```typescript
class DualConnectionManager extends EventEmitter {
  private connections: Map<string, InstanceConnection>;
  private reconnectionStrategies: Map<string, ReconnectionStrategy>;
  private circuitBreakers: Map<string, CircuitBreaker>;
  
  async connect(instance: InstanceDescriptor): Promise<void>;
  async disconnect(instanceId: string): Promise<void>;
  getConnectionState(instanceId: string): ConnectionState;
  getAllConnections(): InstanceConnection[];
}

interface InstanceConnection {
  id: string;
  socket: Socket;
  state: ConnectionState;
  metrics: ConnectionMetrics;
  healthChecker: HealthChecker;
  lastActivity: Date;
}
```

**Connection Features:**
- Concurrent connection management
- Individual reconnection strategies
- Circuit breaker pattern
- Connection pooling and reuse

#### 2.3 HealthMonitorService
```typescript
class HealthMonitorService {
  private monitors: Map<string, InstanceHealthMonitor>;
  private alerting: AlertingService;
  
  startMonitoring(instanceId: string): void;
  stopMonitoring(instanceId: string): void;
  getHealth(instanceId: string): HealthStatus;
  getSystemHealth(): SystemHealthStatus;
}

interface HealthStatus {
  isHealthy: boolean;
  latency: number | null;
  uptime: number;
  lastPing: Date | null;
  consecutiveFailures: number;
  networkQuality: NetworkQuality;
}
```

**Health Monitoring Features:**
- Continuous ping monitoring
- Latency measurement
- Network quality assessment
- Automated alerting

#### 2.4 LogAggregationService
```typescript
class LogAggregationService extends EventEmitter {
  private logStreams: Map<string, LogStream>;
  private buffer: LogBuffer;
  private filters: FilterChain;
  
  subscribeToInstance(instanceId: string): void;
  unsubscribeFromInstance(instanceId: string): void;
  getFilteredLogs(filter: LogFilter): LogEntry[];
  exportLogs(format: ExportFormat): string;
}

interface LogStream {
  instanceId: string;
  subscription: EventSubscription;
  isActive: boolean;
  messageCount: number;
  lastMessage: Date;
}
```

**Log Features:**
- Multi-stream aggregation
- Real-time filtering
- Buffering for offline instances
- Export capabilities

### 3. Data Layer Components

#### 3.1 StateManager
```typescript
class StateManager extends EventEmitter {
  private state: ApplicationState;
  private persistence: PersistenceAdapter;
  private subscribers: Set<StateSubscriber>;
  
  getState(): ApplicationState;
  updateState(update: StateUpdate): void;
  subscribe(subscriber: StateSubscriber): void;
  persist(): Promise<void>;
  restore(): Promise<void>;
}

interface ApplicationState {
  instances: Map<string, InstanceState>;
  systemStatus: SystemStatus;
  configuration: SystemConfiguration;
  metrics: SystemMetrics;
  errors: ErrorRecord[];
}
```

**State Management Features:**
- Immutable state updates
- Event-driven architecture
- Persistence to localStorage
- State recovery mechanisms

#### 3.2 MetricsCollector
```typescript
class MetricsCollector {
  private metrics: Map<string, MetricSeries>;
  private aggregators: MetricAggregator[];
  
  recordMetric(name: string, value: number, tags?: Tags): void;
  getMetric(name: string, timeRange?: TimeRange): MetricSeries;
  getSystemMetrics(): SystemMetrics;
  exportMetrics(format: MetricsFormat): string;
}

interface SystemMetrics {
  connectionMetrics: ConnectionMetrics[];
  performanceMetrics: PerformanceMetrics;
  errorRates: ErrorRateMetrics;
  resourceUsage: ResourceMetrics;
}
```

**Metrics Features:**
- Real-time metric collection
- Time-series data storage
- Aggregation and analysis
- Performance monitoring

## Integration Patterns

### 1. WebSocket Integration Pattern

```typescript
class WebSocketIntegrator {
  private socketFactory: SocketFactory;
  private messageRouter: MessageRouter;
  private eventBridge: EventBridge;
  
  createConnection(instance: InstanceDescriptor): Promise<Socket>;
  setupMessageHandling(socket: Socket, instanceId: string): void;
  bridgeEvents(socket: Socket, eventTarget: EventTarget): void;
}

// Message routing pattern
interface MessageRouter {
  route(message: WebSocketMessage): void;
  addHandler(messageType: string, handler: MessageHandler): void;
  removeHandler(messageType: string, handler: MessageHandler): void;
}
```

### 2. Error Handling Pattern

```typescript
// Centralized error handling
class ErrorHandler {
  private strategies: Map<ErrorType, ErrorStrategy>;
  private logger: Logger;
  private alerting: AlertingService;
  
  handleError(error: Error, context: ErrorContext): void;
  registerStrategy(errorType: ErrorType, strategy: ErrorStrategy): void;
}

interface ErrorStrategy {
  canHandle(error: Error): boolean;
  handle(error: Error, context: ErrorContext): ErrorResolution;
}
```

### 3. Event-Driven Architecture

```typescript
// Event bus for component communication
class EventBus extends EventEmitter {
  private middleware: EventMiddleware[];
  
  publish(event: SystemEvent): void;
  subscribe(eventType: string, handler: EventHandler): void;
  addMiddleware(middleware: EventMiddleware): void;
}

interface SystemEvent {
  type: string;
  source: string;
  timestamp: Date;
  data: any;
  correlation?: string;
}
```

## Security Architecture

### 1. Connection Security
```typescript
interface SecurityLayer {
  validateConnection(instance: InstanceDescriptor): Promise<boolean>;
  authenticateSocket(socket: Socket): Promise<AuthResult>;
  encryptCommunication(message: Message): EncryptedMessage;
  validateMessage(message: Message): ValidationResult;
}
```

### 2. Data Protection
```typescript
interface DataProtection {
  sanitizeLogs(logEntry: LogEntry): SanitizedLogEntry;
  redactSensitiveData(data: any): any;
  validateDataIntegrity(data: any): boolean;
}
```

## Performance Architecture

### 1. Optimization Strategies

#### Connection Optimization
- Connection pooling and reuse
- Lazy connection establishment
- Efficient reconnection algorithms
- Circuit breaker patterns

#### Memory Optimization
- Ring buffer for log storage
- Lazy loading of historical data
- Efficient state serialization
- Garbage collection optimization

#### Network Optimization
- Message batching and compression
- Efficient serialization protocols
- Network quality adaptation
- Bandwidth throttling

### 2. Monitoring Architecture

```typescript
interface PerformanceMonitor {
  measureConnectionLatency(): number;
  trackMemoryUsage(): MemoryMetrics;
  monitorNetworkQuality(): NetworkMetrics;
  generatePerformanceReport(): PerformanceReport;
}
```

## Deployment Architecture

### 1. Build Configuration
```typescript
// Webpack configuration for optimization
const webpackConfig = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        common: {
          name: 'common',
          chunks: 'all',
          minChunks: 2,
        }
      }
    }
  }
};
```

### 2. Environment Configuration
```typescript
interface EnvironmentConfig {
  development: DevelopmentConfig;
  staging: StagingConfig;
  production: ProductionConfig;
}

interface ProductionConfig {
  instanceEndpoints: string[];
  reconnectionConfig: ReconnectionConfig;
  healthCheckConfig: HealthCheckConfig;
  securityConfig: SecurityConfig;
  performanceConfig: PerformanceConfig;
}
```

## Scalability Considerations

### 1. Horizontal Scaling
- Multi-tab synchronization
- Shared state management
- Event coordination
- Resource sharing

### 2. Vertical Scaling
- Efficient memory usage
- CPU optimization
- Network efficiency
- Storage optimization

## Testing Architecture

### 1. Unit Testing Strategy
```typescript
// Component testing patterns
describe('DualConnectionManager', () => {
  test('should handle concurrent connections', async () => {
    const manager = new DualConnectionManager();
    const results = await Promise.all([
      manager.connect(instance1),
      manager.connect(instance2)
    ]);
    expect(results).toHaveLength(2);
  });
});
```

### 2. Integration Testing
```typescript
// End-to-end testing scenarios
describe('Dual Instance Integration', () => {
  test('should recover from instance failures', async () => {
    await simulateInstanceFailure(instance1);
    await waitForReconnection();
    expect(monitor.getSystemStatus()).toBe('partially_connected');
  });
});
```

### 3. Performance Testing
```typescript
// Load testing scenarios
describe('Performance Under Load', () => {
  test('should handle high log volume', async () => {
    await generateHighLogVolume(1000); // logs per second
    expect(monitor.getPerformanceMetrics().latency).toBeLessThan(100);
  });
});
```

## Documentation Architecture

### 1. API Documentation
- TypeScript interfaces and types
- Component prop documentation
- Service method documentation
- Error handling guidelines

### 2. Architectural Documentation
- Component interaction diagrams
- Data flow documentation
- Error handling patterns
- Performance guidelines

### 3. Operational Documentation
- Deployment procedures
- Configuration guidelines
- Monitoring setup
- Troubleshooting guides