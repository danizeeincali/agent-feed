# SPARC Phase 3: SSE Connection Architecture Design

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser Frontend                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │ ClaudeInstance  │  │ ConnectionHealth │  │ SessionState    │ │
│  │ Manager         │  │ Monitor          │  │ Manager         │ │
│  │ (React UI)      │  │                  │  │                 │ │
│  └─────────────────┘  └──────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │            Enhanced useHTTPSSE Hook                        │ │
│  │  ┌────────────────┐ ┌──────────────┐ ┌─────────────────┐  │ │
│  │  │ SSE Connection │ │ Error        │ │ Fallback        │  │ │
│  │  │ Manager        │ │ Recovery     │ │ Polling         │  │ │
│  │  │                │ │ Engine       │ │ Manager         │  │ │
│  │  └────────────────┘ └──────────────┘ └─────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   HTTP/SSE API    │
                    │   Layer           │
                    └─────────┬─────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      Node.js Backend                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │ SSE Endpoint    │  │ Connection       │  │ Process         │ │
│  │ Manager         │  │ Registry         │  │ Lifecycle       │ │
│  │                 │  │                  │  │ Manager         │ │
│  └─────────────────┘  └──────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │            Real Claude Process Integration                  │ │
│  │  ┌────────────────┐ ┌──────────────┐ ┌─────────────────┐  │ │
│  │  │ Process        │ │ I/O Stream   │ │ Status          │  │ │
│  │  │ Spawning       │ │ Management   │ │ Broadcasting    │  │ │
│  │  │                │ │              │ │                 │  │ │
│  │  └────────────────┘ └──────────────┘ └─────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Frontend Layer Components

#### 1.1 Enhanced useHTTPSSE Hook
```typescript
interface EnhancedSSEHook {
  // Core connection management
  connectionManager: SSEConnectionManager;
  errorRecoveryEngine: ErrorRecoveryEngine;
  fallbackPollingManager: FallbackPollingManager;
  sessionStateManager: SessionStateManager;
  healthMonitor: ConnectionHealthMonitor;
  
  // Public API
  connect(instanceId: string): Promise<boolean>;
  disconnect(): void;
  sendInput(data: TerminalInput): Promise<boolean>;
  
  // State
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  lastError: Error | null;
  metrics: ConnectionMetrics;
}
```

#### 1.2 SSE Connection Manager
```typescript
class SSEConnectionManager {
  private eventSource: EventSource | null = null;
  private connectionState: ConnectionState;
  private messageHandlers: Map<string, MessageHandler>;
  
  async establishConnection(instanceId: string): Promise<boolean>;
  setupEventHandlers(): void;
  handleMessage(event: MessageEvent): void;
  closeConnection(): void;
}

interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error' | 'polling';
  instanceId: string | null;
  retryCount: number;
  lastError: Error | null;
  startTime: number;
  lastMessageTime: number;
}
```

#### 1.3 Error Recovery Engine
```typescript
class ErrorRecoveryEngine {
  private maxRetries = 5;
  private backoffStrategy: BackoffStrategy;
  
  handleError(error: Error, instanceId: string): RecoveryAction;
  attemptReconnection(strategy: RetryStrategy): Promise<boolean>;
  calculateBackoffDelay(attempt: number): number;
  shouldFallbackToPolling(error: Error): boolean;
}

enum RecoveryAction {
  IMMEDIATE_RETRY = 'immediate_retry',
  EXPONENTIAL_BACKOFF = 'exponential_backoff',
  FALLBACK_TO_POLLING = 'fallback_to_polling',
  ABORT_CONNECTION = 'abort_connection'
}
```

#### 1.4 Session State Manager
```typescript
class SessionStateManager {
  private sessionStore: Map<string, SessionState>;
  
  preserveState(instanceId: string, data: any): void;
  restoreState(instanceId: string): SessionState | null;
  clearExpiredSessions(): void;
}

interface SessionState {
  outputBuffer: string;
  inputHistory: string[];
  connectionMetadata: any;
  lastActiveTime: number;
  isActive: boolean;
}
```

#### 1.5 Connection Health Monitor
```typescript
class ConnectionHealthMonitor {
  private healthCheckInterval: NodeJS.Timer | null = null;
  private metrics: ConnectionMetrics;
  
  startMonitoring(instanceId: string): void;
  performHealthCheck(): void;
  updateMetrics(data: any): void;
  getConnectionMetrics(): ConnectionMetrics;
}

interface ConnectionMetrics {
  uptime: number;
  messageCount: number;
  errorCount: number;
  reconnectionCount: number;
  avgResponseTime: number;
  lastHeartbeat: number;
}
```

### 2. Backend Layer Components

#### 2.1 Enhanced SSE Endpoint Manager
```typescript
class SSEEndpointManager {
  private connectionRegistry: ConnectionRegistry;
  private processManager: ProcessLifecycleManager;
  
  handleSSEConnection(req: Request, res: Response, instanceId: string): void;
  broadcastMessage(instanceId: string, message: any): void;
  cleanupConnection(instanceId: string, connectionId: string): void;
}
```

#### 2.2 Connection Registry
```typescript
class ConnectionRegistry {
  private connections: Map<string, SSEConnection[]>;
  private connectionMetadata: Map<string, ConnectionMetadata>;
  
  registerConnection(instanceId: string, connection: SSEConnection): string;
  removeConnection(instanceId: string, connectionId: string): void;
  getConnections(instanceId: string): SSEConnection[];
  broadcastToAll(instanceId: string, message: any): void;
}

interface SSEConnection {
  id: string;
  response: Response;
  instanceId: string;
  startTime: number;
  lastPing: number;
  isActive: boolean;
}
```

#### 2.3 Process Lifecycle Manager
```typescript
class ProcessLifecycleManager {
  private activeProcesses: Map<string, ProcessInfo>;
  private processHandlers: Map<string, ProcessHandlers>;
  
  spawnProcess(instanceId: string, config: ProcessConfig): ProcessInfo;
  handleProcessOutput(instanceId: string, output: string): void;
  handleProcessError(instanceId: string, error: Error): void;
  terminateProcess(instanceId: string): void;
}

interface ProcessInfo {
  pid: number;
  process: ChildProcess;
  status: ProcessStatus;
  startTime: number;
  command: string;
  workingDirectory: string;
}
```

## Data Flow Architecture

### 1. Connection Establishment Flow
```
User Action → ClaudeInstanceManager → useHTTPSSE Hook → SSEConnectionManager
     │                                                         │
     │                                                         ▼
     │                                              Create EventSource
     │                                                         │
     │                                                         ▼
     │                                               Setup Event Handlers
     │                                                         │
     │                                                         ▼
     │                                              Start Health Monitoring
     │                                                         │
     │◄────────────────────────────────────────────────────────┴─────────
   Update UI State                                    Connection Established
```

### 2. Message Processing Flow  
```
Backend Process Output → SSE Endpoint → Connection Registry → Frontend EventSource
                                                │
                                                ▼
                                      Message Processor
                                                │
                                                ▼
                                      Session State Manager
                                                │
                                                ▼
                                      UI Component Update
```

### 3. Error Recovery Flow
```
Connection Error → Error Recovery Engine → Recovery Strategy Decision
                              │                        │
                              │                        ▼
                              │              ┌─ Immediate Retry
                              │              │
                              │              ├─ Exponential Backoff  
                              │              │
                              │              ├─ Fallback to Polling
                              │              │
                              │              └─ Abort Connection
                              │
                              ▼
                    Update Connection Status → Notify User
```

## Interface Contracts

### 1. Frontend-Backend API Contract
```typescript
// SSE Stream Endpoint
GET /api/claude/instances/{instanceId}/terminal/stream
Response: text/event-stream
Events: 
  - connected: Connection established
  - terminal_output: Process output data
  - status_update: Process status change  
  - error: Error occurred
  - heartbeat: Keep-alive signal

// Terminal Input Endpoint  
POST /api/claude/instances/{instanceId}/terminal/input
Body: { input: string }
Response: { success: boolean, processed: string }

// Health Check Endpoint
GET /api/claude/instances/{instanceId}/health  
Response: { healthy: boolean, status: ProcessStatus, metrics: any }
```

### 2. Component Interface Contracts
```typescript
// Hook Interface Contract
interface UseHTTPSSEReturn {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  lastMessage: HTTPSSEMessage | null;
  connectionError: string | null;
  
  connect(): void;
  disconnect(): void;
  connectSSE(instanceId: string): void;
  sendInput(event: string, data: any): void;
  
  subscribe(event: string, handler: Function): void;
  unsubscribe(event: string, handler?: Function): void;
}

// Manager Interface Contract
interface ClaudeInstanceManagerProps {
  onConnectionStatusChange?: (status: ConnectionStatus) => void;
  onInstanceCreated?: (instance: ClaudeInstance) => void;
  onInstanceTerminated?: (instanceId: string) => void;
  onError?: (error: Error) => void;
}
```

## Scalability Design

### 1. Connection Pooling Strategy
- Maximum 3 SSE connections per instance
- Connection reuse for multiple UI components
- Automatic cleanup of idle connections
- Memory-efficient connection tracking

### 2. Resource Management
```typescript
const RESOURCE_LIMITS = {
  MAX_CONNECTIONS_PER_INSTANCE: 3,
  MAX_INSTANCES_PER_USER: 10, 
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  MAX_MESSAGE_BUFFER_SIZE: 1000,
  HEALTH_CHECK_INTERVAL: 30 * 1000, // 30 seconds
  MAX_RETRY_ATTEMPTS: 5,
  MAX_BACKOFF_DELAY: 30 * 1000 // 30 seconds
};
```

### 3. Performance Optimization
- Message batching for high-frequency updates
- Debounced UI updates (16ms for 60fps)  
- Lazy loading of session history
- Efficient cleanup of expired sessions

## Security Architecture

### 1. Connection Security
- CORS validation for SSE endpoints
- Instance ID validation and sanitization
- Rate limiting for connection attempts
- Request origin verification

### 2. Data Security
- No sensitive data in SSE messages
- Secure session state storage
- Input sanitization for terminal commands
- Process isolation for Claude instances

## Monitoring & Observability

### 1. Connection Metrics
- Connection establishment success rate
- Average connection duration
- Error frequency by type
- Recovery success rate

### 2. Performance Metrics  
- Message processing latency
- UI update responsiveness
- Memory usage per session
- CPU overhead monitoring

### 3. Alerting Strategy
- Connection failure threshold alerts
- High error rate notifications
- Resource exhaustion warnings
- Performance degradation detection

---

*This architecture forms the foundation for SPARC Phase 4: Refinement Implementation*