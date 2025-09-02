# WebSocket to HTTP+SSE Migration Architecture

## Executive Summary

This document outlines the architectural design for migrating the Interactive Control tab from WebSocket-based communication to HTTP+SSE (Server-Sent Events) architecture. The design follows SPARC methodology principles with emphasis on maintainability, reliability, and performance.

## Current Architecture Analysis

### Existing Components
1. **ClaudeInstanceManager.tsx** - React component with WebSocket integration
2. **ClaudeInstanceManagerModern.tsx** - Enhanced modern interface
3. **ClaudeInstanceManager.ts** - Service class for WebSocket management
4. **useHTTPSSE.ts** - Partial HTTP/SSE hook implementation
5. **SingleConnectionManager** - WebSocket connection management

### Current WebSocket Flow
```
Client → WebSocket Connection → Real-time bidirectional communication
```

### Current Issues
- WebSocket connection instability in certain network conditions
- Complex reconnection logic
- State synchronization challenges
- Resource leaks in connection management

## Target HTTP+SSE Architecture

### High-Level Design
```
Client → HTTP POST (input) + SSE (output) → Unidirectional reliable streaming
```

## Component Hierarchy Design

### 1. SSE Claude Instance Manager (Core Service)

```typescript
interface SSEClaudeInstanceManagerConfig {
  apiBaseUrl: string;
  sseEndpoint: string;
  inputEndpoint: string;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  bufferSize: number;
  heartbeatInterval: number;
}

class SSEClaudeInstanceManager {
  // Connection Management
  private eventSource: EventSource | null;
  private connectionState: ConnectionState;
  private reconnectManager: ExponentialBackoffManager;
  
  // Buffer Management  
  private messageBuffer: CircularBuffer<TerminalMessage>;
  private outputHistory: Map<string, TerminalMessage[]>;
  
  // Event System
  private eventEmitter: TypedEventEmitter;
  
  // Core Methods
  async connect(instanceId: string): Promise<void>
  async disconnect(): Promise<void>
  async sendInput(input: string): Promise<void>
  getConnectionState(): ConnectionStateInfo
}
```

### 2. HTTP Command Service

```typescript
interface HTTPCommandServiceConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

class HTTPCommandService {
  async sendCommand(instanceId: string, command: string): Promise<CommandResponse>
  async createInstance(config: InstanceConfig): Promise<InstanceInfo>
  async terminateInstance(instanceId: string): Promise<void>
  async getInstanceStatus(instanceId: string): Promise<InstanceStatus>
  
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T>
}
```

### 3. Connection State Machine

```typescript
enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
  TERMINATED = 'terminated'
}

interface ConnectionTransition {
  from: ConnectionState;
  to: ConnectionState;
  trigger: string;
  guard?: () => boolean;
  action?: () => void;
}

class ConnectionStateMachine {
  private state: ConnectionState;
  private transitions: Map<string, ConnectionTransition>;
  
  transition(trigger: string): boolean
  getCurrentState(): ConnectionState
  canTransition(trigger: string): boolean
}
```

### 4. Buffer Management System

```typescript
interface TerminalMessage {
  id: string;
  instanceId: string;
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
  timestamp: Date;
  sequenceId: number;
}

class CircularBuffer<T> {
  private buffer: T[];
  private head: number;
  private size: number;
  private maxSize: number;
  
  push(item: T): void
  getAll(): T[]
  getLast(count: number): T[]
  clear(): void
}

class MessageHistoryManager {
  private histories: Map<string, CircularBuffer<TerminalMessage>>;
  
  addMessage(instanceId: string, message: TerminalMessage): void
  getHistory(instanceId: string, limit?: number): TerminalMessage[]
  clearHistory(instanceId: string): void
}
```

### 5. Error Recovery System

```typescript
interface RetryStrategy {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

class ExponentialBackoffManager {
  private strategy: RetryStrategy;
  private currentAttempt: number;
  
  getNextDelay(): number
  shouldRetry(): boolean
  reset(): void
}

class ErrorRecoveryManager {
  private strategies: Map<string, RetryStrategy>;
  
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    errorType: string
  ): Promise<T>
}
```

## Data Flow Architecture

### 1. Input Flow (HTTP POST)
```
User Input → React Component → HTTP Command Service → Backend API
         ↓
   Optimistic UI Update → Buffer Management → State Update
```

### 2. Output Flow (SSE Stream)
```
Backend Process → SSE Endpoint → EventSource → Message Parser
                                              ↓
                Buffer Management → State Update → React Component
```

### 3. Connection Management Flow
```
Component Mount → SSE Manager → Connection State Machine → EventSource
                             ↓
                Error Detection → Recovery Manager → Reconnection Logic
```

## Interface Contracts

### 1. SSE Manager Interface
```typescript
interface ISSEClaudeInstanceManager {
  // Connection Management
  connect(instanceId: string): Promise<ConnectionResult>;
  disconnect(): Promise<void>;
  getConnectionState(): ConnectionStateInfo;
  
  // Communication
  sendInput(input: string): Promise<InputResult>;
  
  // Event Management
  on(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;
  
  // Buffer Management
  getMessageHistory(limit?: number): TerminalMessage[];
  clearHistory(): void;
}
```

### 2. Command Service Interface
```typescript
interface IHTTPCommandService {
  sendCommand(instanceId: string, command: string): Promise<CommandResponse>;
  createInstance(config: InstanceConfig): Promise<InstanceInfo>;
  terminateInstance(instanceId: string): Promise<TerminationResult>;
  getInstanceStatus(instanceId: string): Promise<InstanceStatus>;
}
```

### 3. React Hook Interface
```typescript
interface UseSSEClaudeManager {
  // State
  connectionState: ConnectionState;
  isConnected: boolean;
  error: string | null;
  messages: TerminalMessage[];
  
  // Actions
  connect: (instanceId: string) => void;
  disconnect: () => void;
  sendInput: (input: string) => void;
  
  // Instance Management
  createInstance: (config: InstanceConfig) => Promise<void>;
  terminateInstance: (instanceId: string) => Promise<void>;
  
  // History Management
  clearHistory: () => void;
  getHistory: (limit?: number) => TerminalMessage[];
}
```

## Integration Points

### 1. Backend SSE Endpoint
```
GET /api/claude/instances/{instanceId}/terminal/stream
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

### 2. Backend Input Endpoint
```
POST /api/claude/instances/{instanceId}/terminal/input
Content-Type: application/json
Body: { "input": "command\n" }
```

### 3. Frontend Component Props
```typescript
interface ClaudeInstanceManagerProps {
  apiUrl: string;
  instanceId?: string;
  autoConnect?: boolean;
  onError?: (error: Error) => void;
  onConnectionChange?: (state: ConnectionState) => void;
  onMessage?: (message: TerminalMessage) => void;
}
```

## Design Patterns Implementation

### 1. Observer Pattern (Event Management)
- SSE Manager emits events for connection state changes
- Components subscribe to relevant events
- Decoupled event handling for better maintainability

### 2. Command Pattern (Input Handling)
- Commands encapsulate user input operations
- Queuing support for offline scenarios
- Undo/redo capability for command history

### 3. State Machine Pattern (Connection Management)
- Well-defined state transitions
- Guard conditions for state changes
- Side effects handling during transitions

### 4. Strategy Pattern (Error Recovery)
- Different retry strategies for different error types
- Pluggable recovery mechanisms
- Adaptive behavior based on error patterns

## Performance Considerations

### 1. Message Buffering
- Circular buffer to prevent memory leaks
- Configurable buffer sizes per instance
- Efficient message querying and filtering

### 2. Connection Optimization
- Connection pooling for multiple instances
- Heartbeat mechanism for connection health
- Graceful degradation on connection issues

### 3. Memory Management
- Automatic cleanup of disconnected instances
- Message history pruning
- Event listener cleanup

## Error Handling Strategy

### 1. Connection Errors
- Exponential backoff for reconnections
- Fallback to polling if SSE fails
- User notification of connection status

### 2. Input Errors
- Retry mechanism for failed commands
- User feedback for command status
- Command queuing during disconnections

### 3. Parsing Errors
- Robust message parsing with fallbacks
- Error logging for debugging
- Continue operation despite parse failures

## Security Considerations

### 1. Input Validation
- Command sanitization before transmission
- Instance ID validation
- Rate limiting for input commands

### 2. SSE Security
- CORS configuration for cross-origin requests
- Authentication token in SSE headers
- Connection limits per user

### 3. Error Information
- Sanitized error messages to prevent information leakage
- Secure logging of sensitive operations
- User privacy in error reporting

## Migration Strategy

### Phase 1: Infrastructure Setup
1. Create SSE endpoints in backend
2. Implement SSE Manager class
3. Create HTTP Command Service
4. Set up connection state machine

### Phase 2: Component Migration
1. Update ClaudeInstanceManager to use SSE
2. Migrate useHTTPSSE hook
3. Update connection management logic
4. Implement buffer management

### Phase 3: Integration & Testing
1. Integration testing with backend
2. Performance testing under load
3. Error scenario testing
4. User acceptance testing

### Phase 4: Deployment & Monitoring
1. Feature flag rollout
2. Performance monitoring
3. Error tracking setup
4. User feedback collection

## Monitoring & Observability

### 1. Connection Metrics
- Connection success/failure rates
- Reconnection frequency
- Average connection duration

### 2. Performance Metrics
- Message latency
- Buffer utilization
- Memory usage patterns

### 3. Error Tracking
- Error frequency by type
- Recovery success rates
- User impact metrics

## Conclusion

This architecture provides a robust, scalable solution for migrating from WebSocket to HTTP+SSE. The design emphasizes:

- **Reliability**: Robust error handling and recovery mechanisms
- **Maintainability**: Clear separation of concerns and well-defined interfaces
- **Performance**: Efficient buffering and connection management
- **Extensibility**: Pluggable strategies and configurable behavior

The migration will be executed in phases to minimize risk and ensure smooth transition with comprehensive testing at each stage.