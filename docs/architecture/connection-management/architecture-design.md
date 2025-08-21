# Connection Management Architecture Design

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Connection      │  │ Status          │  │ Manual          │ │
│  │ Status          │  │ Indicator       │  │ Controls        │ │
│  │ Dashboard       │  │ Component       │  │ Panel           │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │            Connection Management Hook Layer                 │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │ │
│  │  │ useConnection   │  │ useHealth       │  │ useMetrics  │ │ │
│  │  │ Manager         │  │ Monitor         │  │ Collector   │ │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │               Core Connection Service                       │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │ │
│  │  │ Connection      │  │ State           │  │ Event       │ │ │
│  │  │ Manager         │  │ Machine         │  │ Emitter     │ │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────┘ │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │ │
│  │  │ Reconnection    │  │ Health          │  │ Metrics     │ │ │
│  │  │ Strategy        │  │ Monitor         │  │ Tracker     │ │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                      Backend Layer                              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │               Socket.IO Server                              │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │ │
│  │  │ Claude          │  │ Dual Instance   │  │ Health      │ │ │
│  │  │ Namespace       │  │ Namespace       │  │ Check       │ │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Connection State Machine

```typescript
enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting', 
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
  MANUAL_DISCONNECT = 'manual_disconnect'
}

interface StateTransitions {
  [ConnectionState.DISCONNECTED]: [ConnectionState.CONNECTING, ConnectionState.ERROR]
  [ConnectionState.CONNECTING]: [ConnectionState.CONNECTED, ConnectionState.ERROR, ConnectionState.DISCONNECTED]
  [ConnectionState.CONNECTED]: [ConnectionState.DISCONNECTED, ConnectionState.RECONNECTING, ConnectionState.ERROR, ConnectionState.MANUAL_DISCONNECT]
  [ConnectionState.RECONNECTING]: [ConnectionState.CONNECTED, ConnectionState.ERROR, ConnectionState.DISCONNECTED]
  [ConnectionState.ERROR]: [ConnectionState.CONNECTING, ConnectionState.DISCONNECTED]
  [ConnectionState.MANUAL_DISCONNECT]: [ConnectionState.CONNECTING]
}
```

### 2. Core Service Interfaces

```typescript
interface ConnectionManager {
  // Core connection methods
  connect(options?: ConnectionOptions): Promise<void>
  disconnect(manual?: boolean): Promise<void>
  reconnect(): Promise<void>
  
  // State management
  getState(): ConnectionState
  getMetrics(): ConnectionMetrics
  getHealth(): HealthStatus
  
  // Event management
  on(event: string, handler: Function): void
  off(event: string, handler: Function): void
  emit(event: string, data: any): void
}

interface ReconnectionStrategy {
  shouldReconnect(attempt: number, error: Error): boolean
  getDelay(attempt: number): number
  getMaxAttempts(): number
  reset(): void
}

interface HealthMonitor {
  startMonitoring(): void
  stopMonitoring(): void
  ping(): Promise<number>
  getLatency(): number
  getLastPing(): Date | null
}

interface MetricsTracker {
  recordConnection(): void
  recordDisconnection(reason: string): void
  recordReconnection(attempt: number): void
  recordError(error: Error): void
  getMetrics(): ConnectionMetrics
}
```

### 3. Data Models

```typescript
interface ConnectionOptions {
  url?: string
  namespace?: string
  autoConnect?: boolean
  reconnection?: boolean
  maxReconnectAttempts?: number
  reconnectionDelay?: number
  timeout?: number
  auth?: any
}

interface ConnectionMetrics {
  connectionAttempts: number
  successfulConnections: number
  failedConnections: number
  reconnectionAttempts: number
  totalDowntime: number
  averageLatency: number
  lastConnectionTime: Date | null
  lastDisconnectionTime: Date | null
  lastDisconnectionReason: string | null
}

interface HealthStatus {
  isHealthy: boolean
  latency: number | null
  lastPing: Date | null
  consecutiveFailures: number
  uptime: number
}

interface ConnectionEvent {
  type: 'state_change' | 'error' | 'metrics_update' | 'health_update'
  timestamp: Date
  data: any
  source: 'connection_manager' | 'health_monitor' | 'metrics_tracker'
}
```

## Detailed Component Design

### Connection Manager Core

```typescript
class WebSocketConnectionManager implements ConnectionManager {
  private socket: Socket | null = null
  private state: ConnectionState = ConnectionState.DISCONNECTED
  private options: ConnectionOptions
  private eventEmitter: EventEmitter
  private reconnectionStrategy: ReconnectionStrategy
  private healthMonitor: HealthMonitor
  private metricsTracker: MetricsTracker
  private reconnectionTimer: NodeJS.Timeout | null = null
  private currentReconnectAttempt = 0

  constructor(options: ConnectionOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.eventEmitter = new EventEmitter()
    this.reconnectionStrategy = new ExponentialBackoffStrategy(options)
    this.healthMonitor = new PingHealthMonitor(this)
    this.metricsTracker = new BasicMetricsTracker()
  }

  async connect(options?: ConnectionOptions): Promise<void> {
    if (this.state === ConnectionState.CONNECTED) return
    
    this.setState(ConnectionState.CONNECTING)
    this.metricsTracker.recordConnection()
    
    try {
      const socketOptions = { ...this.options, ...options }
      this.socket = io(socketOptions.url, socketOptions)
      
      await this.setupSocketHandlers()
      await this.waitForConnection(socketOptions.timeout)
      
      this.setState(ConnectionState.CONNECTED)
      this.currentReconnectAttempt = 0
      this.healthMonitor.startMonitoring()
      
    } catch (error) {
      this.setState(ConnectionState.ERROR)
      this.metricsTracker.recordError(error)
      throw error
    }
  }

  async disconnect(manual = false): Promise<void> {
    if (this.state === ConnectionState.DISCONNECTED) return
    
    this.clearReconnectionTimer()
    this.healthMonitor.stopMonitoring()
    
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    
    const newState = manual ? ConnectionState.MANUAL_DISCONNECT : ConnectionState.DISCONNECTED
    this.setState(newState)
    this.metricsTracker.recordDisconnection(manual ? 'manual' : 'programmatic')
  }

  async reconnect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTED) return
    
    this.currentReconnectAttempt++
    
    if (!this.reconnectionStrategy.shouldReconnect(this.currentReconnectAttempt, null)) {
      this.setState(ConnectionState.ERROR)
      throw new Error('Max reconnection attempts exceeded')
    }
    
    this.setState(ConnectionState.RECONNECTING)
    this.metricsTracker.recordReconnection(this.currentReconnectAttempt)
    
    const delay = this.reconnectionStrategy.getDelay(this.currentReconnectAttempt)
    
    this.reconnectionTimer = setTimeout(async () => {
      try {
        await this.connect()
      } catch (error) {
        // Schedule next reconnection attempt
        this.scheduleReconnection()
      }
    }, delay)
  }

  private async setupSocketHandlers(): Promise<void> {
    if (!this.socket) return

    this.socket.on('connect', () => {
      this.setState(ConnectionState.CONNECTED)
    })

    this.socket.on('disconnect', (reason) => {
      this.setState(ConnectionState.DISCONNECTED)
      this.metricsTracker.recordDisconnection(reason)
      
      if (this.options.reconnection && reason !== 'io client disconnect') {
        this.scheduleReconnection()
      }
    })

    this.socket.on('connect_error', (error) => {
      this.setState(ConnectionState.ERROR)
      this.metricsTracker.recordError(error)
    })
  }

  private scheduleReconnection(): void {
    if (this.state === ConnectionState.MANUAL_DISCONNECT) return
    
    setTimeout(() => {
      this.reconnect().catch(() => {
        // Error handled in reconnect method
      })
    }, 100) // Small delay to prevent tight loops
  }

  private setState(newState: ConnectionState): void {
    const oldState = this.state
    this.state = newState
    
    this.eventEmitter.emit('state_change', {
      from: oldState,
      to: newState,
      timestamp: new Date()
    })
  }
}
```

### Exponential Backoff Strategy

```typescript
class ExponentialBackoffStrategy implements ReconnectionStrategy {
  private baseDelay: number
  private maxDelay: number
  private maxAttempts: number
  private jitter: boolean

  constructor(options: {
    baseDelay?: number
    maxDelay?: number 
    maxAttempts?: number
    jitter?: boolean
  } = {}) {
    this.baseDelay = options.baseDelay || 1000
    this.maxDelay = options.maxDelay || 30000
    this.maxAttempts = options.maxAttempts || 10
    this.jitter = options.jitter !== false
  }

  shouldReconnect(attempt: number, error: Error | null): boolean {
    return attempt <= this.maxAttempts
  }

  getDelay(attempt: number): number {
    const exponentialDelay = Math.min(this.baseDelay * Math.pow(2, attempt - 1), this.maxDelay)
    
    if (this.jitter) {
      // Add random jitter to prevent thundering herd
      const jitterRange = exponentialDelay * 0.1
      const jitter = (Math.random() - 0.5) * 2 * jitterRange
      return Math.max(0, exponentialDelay + jitter)
    }
    
    return exponentialDelay
  }

  getMaxAttempts(): number {
    return this.maxAttempts
  }

  reset(): void {
    // No state to reset in this strategy
  }
}
```

### Health Monitor

```typescript
class PingHealthMonitor implements HealthMonitor {
  private connectionManager: ConnectionManager
  private pingInterval: NodeJS.Timeout | null = null
  private lastPing: Date | null = null
  private latency: number | null = null
  private consecutiveFailures = 0
  private maxFailures = 3
  private pingIntervalMs = 30000

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager
  }

  startMonitoring(): void {
    this.stopMonitoring()
    
    this.pingInterval = setInterval(async () => {
      try {
        await this.ping()
        this.consecutiveFailures = 0
      } catch (error) {
        this.consecutiveFailures++
        
        if (this.consecutiveFailures >= this.maxFailures) {
          this.connectionManager.emit('health_degraded', {
            consecutiveFailures: this.consecutiveFailures,
            error
          })
        }
      }
    }, this.pingIntervalMs)
  }

  stopMonitoring(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  async ping(): Promise<number> {
    const startTime = Date.now()
    
    return new Promise((resolve, reject) => {
      const socket = this.connectionManager.getSocket()
      if (!socket) {
        reject(new Error('No active connection'))
        return
      }

      const timeout = setTimeout(() => {
        reject(new Error('Ping timeout'))
      }, 5000)

      socket.emit('ping', startTime, (response: any) => {
        clearTimeout(timeout)
        const endTime = Date.now()
        this.latency = endTime - startTime
        this.lastPing = new Date()
        resolve(this.latency)
      })
    })
  }

  getLatency(): number {
    return this.latency || 0
  }

  getLastPing(): Date | null {
    return this.lastPing
  }
}
```

## Integration Architecture

### Hook Integration Layer

```typescript
function useConnectionManager(options?: ConnectionOptions) {
  const [connectionManager] = useState(() => new WebSocketConnectionManager(options))
  const [state, setState] = useState<ConnectionState>(connectionManager.getState())
  const [metrics, setMetrics] = useState<ConnectionMetrics>(connectionManager.getMetrics())
  const [health, setHealth] = useState<HealthStatus>(connectionManager.getHealth())

  useEffect(() => {
    const handleStateChange = (event: any) => setState(event.to)
    const handleMetricsUpdate = (newMetrics: ConnectionMetrics) => setMetrics(newMetrics)
    const handleHealthUpdate = (newHealth: HealthStatus) => setHealth(newHealth)

    connectionManager.on('state_change', handleStateChange)
    connectionManager.on('metrics_update', handleMetricsUpdate)
    connectionManager.on('health_update', handleHealthUpdate)

    // Auto-connect if enabled
    if (options?.autoConnect !== false) {
      connectionManager.connect()
    }

    return () => {
      connectionManager.off('state_change', handleStateChange)
      connectionManager.off('metrics_update', handleMetricsUpdate)
      connectionManager.off('health_update', handleHealthUpdate)
      connectionManager.disconnect()
    }
  }, [connectionManager, options?.autoConnect])

  return {
    state,
    metrics,
    health,
    connect: connectionManager.connect.bind(connectionManager),
    disconnect: connectionManager.disconnect.bind(connectionManager),
    reconnect: connectionManager.reconnect.bind(connectionManager),
    isConnected: state === ConnectionState.CONNECTED,
    isConnecting: state === ConnectionState.CONNECTING,
    isReconnecting: state === ConnectionState.RECONNECTING,
    hasError: state === ConnectionState.ERROR
  }
}
```

### Integration with Existing Dual Instance Monitoring

```typescript
function useDualInstanceMonitoringEnhanced() {
  const { socket, state, connect, disconnect, reconnect, isConnected } = useConnectionManager({
    url: '/ws',
    namespace: '/',
    autoConnect: true
  })

  // Existing dual instance monitoring logic
  const { data: status, isLoading: statusLoading } = useQuery<DualInstanceStatus>({
    queryKey: ['dual-instance-status'],
    queryFn: async () => {
      const response = await fetch('/api/dual-instance/status')
      if (!response.ok) throw new Error('Failed to fetch status')
      return response.json()
    },
    refetchInterval: 5000,
    enabled: isConnected // Only fetch when connected
  })

  // Enhanced with connection management
  return {
    // Existing API
    status,
    messages,
    pendingConfirmations,
    isLoading: statusLoading,
    sendHandoff,
    handleConfirmation,
    
    // New connection management API
    connectionState: state,
    isConnected,
    connect,
    disconnect,
    reconnect
  }
}
```

## Architecture Decision Records

### ADR-001: Socket.IO vs Native WebSocket
**Decision**: Continue using Socket.IO for WebSocket communication
**Rationale**: 
- Existing infrastructure already uses Socket.IO
- Built-in fallback mechanisms and browser compatibility
- Namespace support for multiple connection types
- Automatic reconnection capabilities

### ADR-002: Singleton vs Multiple Manager Instances
**Decision**: Use singleton pattern for connection manager
**Rationale**:
- Prevents multiple WebSocket connections to same endpoint
- Centralized state management
- Easier debugging and monitoring
- Resource efficiency

### ADR-003: State Machine Implementation
**Decision**: Explicit state machine with defined transitions
**Rationale**:
- Clear connection state semantics
- Prevents invalid state transitions
- Easier testing and debugging
- Better error handling

### ADR-004: Hook-based Integration
**Decision**: React hooks for component integration
**Rationale**:
- Consistent with existing React patterns
- Automatic cleanup and lifecycle management
- Easy to test and mock
- Reusable across components

## Performance Considerations

### Memory Management
- Connection manager instances are singletons to prevent memory leaks
- Event listeners are properly cleaned up in useEffect cleanup
- Metrics data is bounded with automatic pruning of old entries
- Health monitoring data has configurable retention periods

### CPU Optimization
- Health checks are throttled and use efficient ping/pong mechanism
- Reconnection attempts use exponential backoff to reduce server load
- Event emission is debounced for high-frequency updates
- Background tasks are scheduled during idle time when possible

### Network Efficiency
- Ping payloads are minimal (timestamp only)
- Reconnection attempts include jitter to prevent thundering herd
- Connection pooling for multiple namespaces
- Graceful degradation during network issues

## Security Considerations

### Authentication Integration
- Supports existing Socket.IO authentication mechanisms
- Token refresh handling during long-lived connections
- Secure credential storage and transmission
- Session management integration

### Error Information Exposure
- Error messages are sanitized before display to users
- Detailed error information logged separately for debugging
- Rate limiting on connection attempts to prevent abuse
- Validation of all incoming connection events

## Next Steps
1. **Prototype Implementation**: Build core connection manager
2. **UI Component Development**: Create status indicators and controls
3. **Integration Testing**: Verify compatibility with existing features
4. **Performance Testing**: Benchmark connection management overhead