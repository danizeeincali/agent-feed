# SPARC WebSocket Single-Connection Architecture Specification

## Project Overview
**Project**: Agent Feed WebSocket Connection Management
**Date**: September 2, 2025
**SPARC Phase**: Specification
**Version**: 1.0.0

---

## 1. SPECIFICATION PHASE

### 1.1 Problem Statement

**Current Issue**: Frontend WebSocket connections are stuck in loops between multiple Claude instances, causing:
- Multiple simultaneous connections competing for the same terminal
- Connection state conflicts between different UI components
- No single-source-of-truth for connection management
- Race conditions when multiple instances attempt to connect/disconnect

**Root Cause Analysis**:
1. `WebSocketTerminalManager` allows multiple connections per terminal ID
2. No global connection mutex/lock mechanism
3. UI components can independently initiate connections
4. No disconnect-first enforcement before establishing new connections

### 1.2 Requirements Specification

#### 1.2.1 Functional Requirements

**FR-001: Single Connection Enforcement**
- **Description**: System shall maintain only ONE active WebSocket connection per terminal ID at any time
- **Priority**: Critical (P0)
- **Acceptance Criteria**:
  - Attempting to create a second connection to existing terminal ID should reuse the existing connection
  - Connection state is globally synchronized across all UI components
  - Connection establishment follows disconnect-first pattern

**FR-002: Connection State Machine**
- **Description**: System shall implement a deterministic connection state machine
- **Priority**: Critical (P0)
- **States**: `disconnected` → `connecting` → `connected` → `disconnecting` → `disconnected`
- **Acceptance Criteria**:
  - All state transitions are atomic and logged
  - Invalid state transitions are prevented
  - State is observable by all components
  - Recovery mechanisms for stuck states

**FR-003: Mutex Lock Mechanism**
- **Description**: System shall implement connection operation locking
- **Priority**: Critical (P0)
- **Acceptance Criteria**:
  - Only one connection operation (connect/disconnect) can execute at a time per terminal
  - Operations are queued if lock is held
  - Lock automatically releases on operation completion or timeout
  - Deadlock prevention mechanisms

**FR-004: Disconnect-First Connection Flow**
- **Description**: System shall always disconnect existing connection before creating new one
- **Priority**: High (P1)
- **Acceptance Criteria**:
  - `connect()` operation first calls `disconnect()` if connection exists
  - Disconnection completion is awaited before connection attempt
  - Graceful fallback if disconnection fails

**FR-005: Individual Instance Connection Controls**
- **Description**: System shall provide separate connect/disconnect buttons for each Claude instance
- **Priority**: High (P1)
- **Acceptance Criteria**:
  - Each instance has dedicated "Connect" and "Disconnect" buttons
  - Button states reflect actual connection status
  - Visual feedback for connection state changes
  - Disabled state during transitions

#### 1.2.2 Non-Functional Requirements

**NFR-001: Connection Reliability**
- **Description**: System shall maintain connection stability under concurrent operations
- **Measurement**: 99.9% successful connection operations without race conditions
- **Validation Method**: Concurrent connection stress testing

**NFR-002: Response Time**
- **Description**: Connection state changes shall propagate to UI within 100ms
- **Measurement**: P95 latency for state synchronization
- **Validation Method**: Performance monitoring with timestamps

**NFR-003: Error Recovery**
- **Description**: System shall recover from connection failures within 3 seconds
- **Measurement**: Mean time to recovery (MTTR) < 3s
- **Validation Method**: Fault injection testing

### 1.3 Connection State Machine Design

```yaml
states:
  disconnected:
    description: "No active WebSocket connection"
    allowed_transitions: [connecting]
    ui_state: "Connect button enabled, Disconnect button disabled"
    
  connecting:
    description: "Connection establishment in progress"
    allowed_transitions: [connected, disconnected]
    timeout: 10000ms
    ui_state: "Connect button disabled with spinner, Disconnect button disabled"
    
  connected:
    description: "Active WebSocket connection established"
    allowed_transitions: [disconnecting]
    ui_state: "Connect button disabled, Disconnect button enabled"
    
  disconnecting:
    description: "Connection termination in progress"
    allowed_transitions: [disconnected]
    timeout: 5000ms
    ui_state: "Connect button disabled, Disconnect button disabled with spinner"

transitions:
  connect:
    from: [disconnected]
    to: connecting
    precondition: "acquire_connection_lock()"
    action: "establish_websocket_connection()"
    
  connection_established:
    from: [connecting]
    to: connected
    action: "setup_event_handlers(), release_connection_lock()"
    
  disconnect:
    from: [connected, connecting]
    to: disconnecting
    precondition: "acquire_connection_lock()"
    action: "close_websocket_connection()"
    
  connection_closed:
    from: [disconnecting, connecting]
    to: disconnected
    action: "cleanup_resources(), release_connection_lock()"
    
  connection_failed:
    from: [connecting]
    to: disconnected
    action: "log_error(), cleanup_resources(), release_connection_lock()"
```

### 1.4 Mutex/Lock Mechanism Specification

```typescript
interface ConnectionLock {
  terminalId: string;
  operation: 'connect' | 'disconnect';
  timestamp: number;
  timeout: number;
  holder: string; // Component identifier
}

interface ConnectionMutex {
  // Acquire lock for connection operation
  acquire(terminalId: string, operation: string, holder: string): Promise<boolean>;
  
  // Release lock after operation completion
  release(terminalId: string, holder: string): void;
  
  // Check if lock is held
  isLocked(terminalId: string): boolean;
  
  // Force release stuck locks (timeout mechanism)
  forceRelease(terminalId: string): void;
  
  // Queue operation if lock is held
  enqueue(terminalId: string, operation: () => Promise<void>): Promise<void>;
}
```

**Lock Timeout Strategy**:
- Connection operations: 30 seconds maximum
- Automatic release on timeout with error logging
- Warning after 15 seconds without completion
- Force cleanup of resources on timeout

### 1.5 UI Flow Specification

#### 1.5.1 Launch & Connect Button Flow

```yaml
instance_ui_controls:
  launch_button:
    label: "🚀 Launch Claude [Instance-ID]"
    states:
      - idle: "Available for launch"
      - launching: "Creating process..."
      - launched: "Process created, ready to connect"
      - error: "Launch failed - retry available"
    
  connect_button:
    label: "🔌 Connect"
    visibility: "Only shown after successful launch"
    states:
      - disconnected: "Connect button enabled"
      - connecting: "Connecting... (spinner)"
      - connected: "Button hidden (replaced by disconnect)"
      - error: "Connect Failed - Retry"
    
  disconnect_button:
    label: "🔌 Disconnect"
    visibility: "Only shown when connected"
    states:
      - connected: "Disconnect button enabled"
      - disconnecting: "Disconnecting... (spinner)"
      - disconnected: "Button hidden (replaced by connect)"

connection_flow:
  user_action: "Click Connect button"
  step_1: "Acquire connection lock"
  step_2: "Check for existing connection"
  step_3: "If existing connection: disconnect first"
  step_4: "Wait for disconnection completion"
  step_5: "Establish new WebSocket connection"
  step_6: "Setup event handlers"
  step_7: "Update UI state to connected"
  step_8: "Release connection lock"
  
  error_handling:
    - "Lock acquisition timeout: Show error message"
    - "Disconnection failure: Force cleanup and retry"
    - "Connection failure: Revert to disconnected state"
    - "Any timeout: Force release lock and cleanup"
```

#### 1.5.2 Visual Connection State Indicators

```yaml
connection_status_indicator:
  location: "Next to Connect/Disconnect buttons"
  states:
    disconnected:
      icon: "⚫"
      color: "#6B7280" # Gray
      text: "Disconnected"
      
    connecting:
      icon: "🔄" # Animated spinner
      color: "#F59E0B" # Yellow
      text: "Connecting..."
      
    connected:
      icon: "✅"
      color: "#10B981" # Green
      text: "Connected"
      
    disconnecting:
      icon: "🔄" # Animated spinner
      color: "#F59E0B" # Yellow
      text: "Disconnecting..."
      
    error:
      icon: "❌"
      color: "#EF4444" # Red
      text: "Connection Error"

instance_connection_summary:
  location: "Top of instance manager panel"
  format: "Connections: {active_count} / {total_instances}"
  active_connections_list:
    - "Instance-1: Connected (2m 30s)"
    - "Instance-2: Connecting..."
    - "Instance-3: Disconnected"
```

### 1.6 Safety Guarantees

#### 1.6.1 Connection Safety Requirements

**SG-001: Race Condition Prevention**
- No two connection operations can execute simultaneously on the same terminal
- All state changes are atomic and logged with timestamps
- Connection state is the single source of truth

**SG-002: Resource Leak Prevention**
- All WebSocket connections are properly closed on component unmount
- Event listeners are cleaned up to prevent memory leaks  
- Connection locks are automatically released on timeout

**SG-003: Error Recovery Guarantees**
- System can recover from any connection state without manual intervention
- Failed connections automatically cleanup and return to disconnected state
- Stuck operations timeout and force cleanup after 30 seconds

**SG-004: Data Consistency**
- Connection state is synchronized across all UI components immediately
- State changes are immutable and predictable
- No partial state updates that could cause inconsistencies

#### 1.6.2 Validation Mechanisms

**Validation Rules**:
1. **Pre-connection**: Verify terminal ID exists and is valid
2. **During connection**: Monitor connection timeout and state transitions
3. **Post-connection**: Verify WebSocket is in OPEN state before declaring connected
4. **On disconnect**: Ensure complete cleanup of resources and event handlers

```typescript
interface ConnectionValidator {
  validateTerminalId(id: string): boolean;
  validateStateTransition(from: ConnectionState, to: ConnectionState): boolean;
  validateWebSocketState(ws: WebSocket): boolean;
  validateLockState(terminalId: string): boolean;
}
```

### 1.7 Architecture Components

#### 1.7.1 Core Components

```typescript
// Single connection manager with mutex
class SingleConnectionManager {
  private connections: Map<string, WebSocketConnection>;
  private locks: Map<string, ConnectionLock>;
  private stateStore: ConnectionStateStore;
  
  async connect(terminalId: string): Promise<WebSocketConnection>;
  async disconnect(terminalId: string): Promise<void>;
  getState(terminalId: string): ConnectionState;
  subscribe(terminalId: string, callback: StateChangeCallback): void;
}

// Connection state store with observers
class ConnectionStateStore {
  private states: Map<string, ConnectionState>;
  private observers: Set<StateObserver>;
  
  setState(terminalId: string, state: ConnectionState): void;
  getState(terminalId: string): ConnectionState;
  subscribe(observer: StateObserver): void;
}

// React hook for components
function useSingleConnection(terminalId: string): {
  state: ConnectionState;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
}
```

### 1.8 Testing Requirements

#### 1.8.1 Test Categories

**Unit Tests**:
- Connection state machine transitions
- Mutex lock/unlock operations  
- Error handling and recovery
- State synchronization

**Integration Tests**:
- Multi-component connection coordination
- WebSocket connection lifecycle
- UI state synchronization
- Error propagation

**E2E Tests**:
- Complete connection flow from UI interaction
- Multiple instance management
- Connection recovery scenarios
- Performance under load

**Edge Case Tests**:
- Rapid connect/disconnect cycles
- Multiple simultaneous connection attempts
- Network interruption during connection
- Component unmount during connection

#### 1.8.2 Test Scenarios

```yaml
test_scenarios:
  concurrent_connection_attempts:
    description: "Multiple components attempt connection to same terminal simultaneously"
    expected: "Only one connection established, others queue or reuse"
    
  connection_during_disconnection:
    description: "Connect requested while disconnect in progress"
    expected: "Connect waits for disconnect completion, then proceeds"
    
  rapid_toggle_operations:
    description: "User rapidly clicks connect/disconnect buttons"
    expected: "Operations are queued and execute sequentially"
    
  component_unmount_during_connection:
    description: "Component unmounts while connection is being established"
    expected: "Connection is cancelled and resources cleaned up"
    
  websocket_connection_failure:
    description: "WebSocket connection fails after multiple retries"
    expected: "State returns to disconnected, error is displayed to user"
```

### 1.9 Success Metrics

#### 1.9.1 Key Performance Indicators

**Connection Reliability**:
- Target: 99.9% successful connections without race conditions
- Measurement: (Successful connections / Total connection attempts) × 100

**State Synchronization Speed**:
- Target: State changes propagate to all components within 100ms
- Measurement: P95 latency from state change to UI update

**Error Recovery Time**:
- Target: System recovers from connection errors within 3 seconds
- Measurement: Time from error detection to return to operational state

**Resource Leak Prevention**:
- Target: Zero memory/connection leaks over 24-hour operation
- Measurement: Memory usage monitoring and connection count tracking

#### 1.9.2 Acceptance Criteria Summary

**Phase Complete When**:
- [ ] All functional requirements implemented and tested
- [ ] Connection state machine operates deterministically
- [ ] Mutex mechanism prevents all race conditions
- [ ] UI components properly reflect connection state
- [ ] All safety guarantees are validated
- [ ] Test suite achieves 95% code coverage
- [ ] Performance metrics meet targets
- [ ] End-to-end scenarios execute successfully

---

## 2. CONSTRAINTS AND ASSUMPTIONS

### 2.1 Technical Constraints

**TC-001: WebSocket Protocol Limitations**
- Single WebSocket connection per terminal ID
- Browser connection limits (typically 255 per domain)
- Network connectivity requirements for real-time communication

**TC-002: React Framework Constraints**
- State updates must follow React's immutability principles
- Component lifecycle management for connection cleanup
- Context provider performance with multiple consumers

**TC-003: Browser Environment**
- WebSocket API availability and consistency
- Browser tab/window focus handling
- Memory limitations for connection state storage

### 2.2 Business Constraints

**BC-001: User Experience Requirements**
- Connection operations must complete within 10 seconds
- UI must remain responsive during connection operations
- Clear feedback for all connection state changes

**BC-002: System Resources**
- Maximum 50 concurrent WebSocket connections per user session
- Connection state storage limited to 1MB per session
- Automatic cleanup of inactive connections after 1 hour

### 2.3 Assumptions

**A-001: Network Assumptions**
- WebSocket connections can be established to backend
- Network interruptions are temporary (< 30 seconds)
- Backend WebSocket server supports the required protocol

**A-002: Usage Patterns**
- Users typically manage 1-5 Claude instances simultaneously
- Connection operations are user-initiated, not automated
- Sessions typically last 1-4 hours

---

## 3. DEPENDENCIES AND INTEGRATION POINTS

### 3.1 Frontend Dependencies

- **React 18+**: Context providers and hooks
- **TypeScript**: Type safety for connection state
- **WebSocket API**: Browser native WebSocket support
- **Existing UI Components**: Terminal launcher, status indicators

### 3.2 Backend Integration

- **WebSocket Server**: Terminal connection endpoint
- **Message Protocol**: JSON-based communication format
- **Authentication**: Session-based connection authentication
- **Error Handling**: Standardized error response format

### 3.3 External Dependencies

- **Network Infrastructure**: Stable WebSocket connectivity
- **Browser Compatibility**: Modern browsers with WebSocket support
- **Development Tools**: Testing frameworks for E2E validation

---

## 4. RISKS AND MITIGATION STRATEGIES

### 4.1 Technical Risks

**R-001: WebSocket Connection Instability**
- **Probability**: Medium
- **Impact**: High
- **Mitigation**: Implement automatic reconnection with exponential backoff

**R-002: State Synchronization Race Conditions**
- **Probability**: High (current issue)
- **Impact**: Critical
- **Mitigation**: Implement mutex locking and atomic state updates

**R-003: Memory Leaks from Event Listeners**
- **Probability**: Medium
- **Impact**: Medium
- **Mitigation**: Comprehensive cleanup in useEffect dependencies

### 4.2 User Experience Risks

**R-004: Confusing Connection State UI**
- **Probability**: Medium
- **Impact**: Medium
- **Mitigation**: Clear visual indicators and consistent state representation

**R-005: Connection Operation Timeout**
- **Probability**: Low
- **Impact**: Medium
- **Mitigation**: Configurable timeouts with user feedback

---

## 5. NEXT STEPS - PSEUDOCODE PHASE

After specification approval, the next SPARC phase will focus on:

1. **Algorithm Design**: Detailed pseudocode for connection state machine
2. **Data Flow Specification**: Component interaction patterns
3. **Error Handling Logic**: Comprehensive error recovery algorithms
4. **Performance Optimization**: Connection pooling and state caching strategies

---

**Document Status**: Draft for Review
**Next Review Date**: September 3, 2025
**Stakeholders**: Frontend Development Team, QA Team, Product Owner