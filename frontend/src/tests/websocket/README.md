# TDD London School WebSocket Test Suite

## Overview

This comprehensive test suite implements **Test-Driven Development using the London School (mockist) approach** for WebSocket connections in the frontend application. The tests focus on **interaction patterns and behavior verification** rather than state testing, emphasizing how components collaborate with their dependencies.

## London School TDD Principles Applied

### 1. Outside-In Development
- Start with user behavior (connection establishment, terminal usage)
- Drive down to implementation details through mock expectations
- Focus on **what** the system should do, not **how** it does it

### 2. Mock-First Approach
- All external collaborators are mocked (Socket.IO, BroadcastChannel, browser APIs)
- Mocks define contracts between components
- Behavior is verified through mock interactions

### 3. Behavior Verification Over State Testing
- Tests verify **interactions** between objects
- Focus on **collaboration patterns** rather than internal state
- Validate **message flows** and **timing sequences**

### 4. Contract-Driven Design
- Mocks establish clear interfaces between components
- Tests verify contract compliance
- Changes to contracts drive implementation decisions

## Test Structure

### Core Test Files

#### 1. Mock Infrastructure (`__mocks__/`)
- **`socket-io-client.ts`**: Complete Socket.IO client behavior simulation
- **`broadcast-channel.ts`**: Cross-tab synchronization mock with message tracking

#### 2. Unit Tests
- **`useTerminalSocket.test.ts`**: Terminal socket hook interaction patterns
- **`WebSocketSingletonContext.test.tsx`**: Context provider collaboration testing
- **`connection-manager.test.ts`**: Connection manager coordination verification

#### 3. Integration Tests
- **`cross-tab-synchronization.test.ts`**: Multi-tab coordination patterns
- **`browser-vs-backend-patterns.test.ts`**: Frontend/backend contract validation

#### 4. Test Fixtures
- **`fixtures/browser-environment.ts`**: Browser API simulation and scenarios

## Key Testing Patterns

### Interaction Verification
```typescript
// Verify collaborator interactions
expect(mockSocket.emit).toHaveBeenCalledWith('connect_terminal', { instanceId });
expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith({
  type: 'connection_status',
  data: expect.objectContaining({ connected: true })
});
```

### Sequence Testing
```typescript
// Verify interaction order
expect(mockSocket.connect).toHaveBeenCalledBefore(mockSocket.emit);
expect(healthMonitor.startMonitoring).toHaveBeenCalledAfter(socket.connect);
```

### Contract Validation
```typescript
// Verify contract compliance
expect(authenticationData).toSatisfyContract({
  token: expect.any(String),
  userId: expect.any(String),
  username: expect.any(String)
});
```

### Cross-Tab Coordination
```typescript
// Verify cross-tab message flows
const messageHistory = broadcastChannelManager.getChannelMessageHistory('terminal-instance');
const dataMessage = messageHistory.find(msg => 
  msg.message.type === 'terminal_data' && 
  msg.message.data.senderId !== currentSocketId
);
expect(dataMessage).toBeTruthy();
```

## Test Categories

### 1. Connection Management
- **Establishment Workflow**: Authentication → Socket creation → Terminal connection
- **Error Handling**: Connection failures, timeouts, recovery patterns
- **State Transitions**: Connecting → Connected → Disconnected flows

### 2. Terminal Data Flow
- **Input Handling**: Command input delegation to socket
- **Output Processing**: Terminal data reception and formatting
- **History Management**: Data accumulation and size limits

### 3. Cross-Tab Synchronization
- **BroadcastChannel Coordination**: Message passing between tabs
- **State Synchronization**: Connection status sharing
- **Event Deduplication**: Preventing message loops

### 4. Health Monitoring
- **Heartbeat Protocol**: Ping/pong interaction patterns
- **Connection Quality**: Reconnection attempt tracking
- **Activity Monitoring**: Last activity timestamp updates

### 5. Error Recovery
- **Reconnection Logic**: Exponential backoff patterns
- **Network Changes**: Online/offline handling
- **Browser Events**: Visibility change responses

## Browser Environment Simulation

### Simulated APIs
- **Document API**: Visibility state, event listeners
- **Window API**: Location, navigator, storage events
- **LocalStorage**: Authentication token management
- **BroadcastChannel**: Cross-tab communication
- **Network State**: Online/offline transitions

### Environment Scenarios
```typescript
// Desktop Chrome
setupBrowserScenario('desktopChrome');

// Mobile Safari
setupBrowserScenario('mobileSafari');

// Offline environment
setupBrowserScenario('offlineEnvironment');
```

## Running the Tests

### All WebSocket Tests
```bash
cd frontend
npm test -- --config=src/tests/websocket/jest.config.websocket.js
```

### Specific Test Categories
```bash
# Unit tests only
npm test -- --testPathPattern="useTerminalSocket|WebSocketSingletonContext|connection-manager"

# Integration tests only  
npm test -- --testPathPattern="integration/"

# Cross-tab synchronization
npm test -- --testPathPattern="cross-tab-synchronization"

# Backend pattern validation
npm test -- --testPathPattern="browser-vs-backend-patterns"
```

### Coverage Reports
```bash
npm test -- --coverage --config=src/tests/websocket/jest.config.websocket.js
```

## Mock Behavior Verification

### Socket.IO Mock Features
- **Connection Lifecycle**: Connect, disconnect, error simulation
- **Event System**: Message sending/receiving with proper timing
- **State Management**: Connected/disconnected state tracking
- **Interaction Recording**: All method calls captured for verification

### BroadcastChannel Mock Features
- **Multi-Channel Support**: Multiple channels with name isolation
- **Message History**: Complete audit trail of cross-tab messages
- **Event Simulation**: External message injection for testing
- **Cleanup Tracking**: Proper resource disposal verification

## Contract Testing

### Authentication Contract
```typescript
const expectedAuthContract = {
  token: expect.any(String),
  userId: expect.any(String), 
  username: expect.any(String)
};
```

### Terminal Data Contract
```typescript
const terminalDataContract = {
  data: expect.any(String),
  timestamp: expect.any(String),
  isHistory: expect.any(Boolean)
};
```

### Cross-Tab Message Contract
```typescript
const crossTabMessageContract = {
  type: expect.stringMatching(/^(terminal_data|connection_status)$/),
  data: expect.objectContaining({
    senderId: expect.any(String),
    timestamp: expect.any(String)
  })
};
```

## Performance Testing

### High-Frequency Data Handling
- Tests verify system can handle 100+ messages/second
- Memory usage remains within bounds
- History size limits are enforced

### Reconnection Performance
- Exponential backoff timing verification
- Maximum attempt limits respected
- Resource cleanup during rapid reconnections

## Integration with Backend Patterns

The test suite validates that frontend WebSocket behavior matches successful backend test patterns:

1. **Connection Handshake**: Frontend auth → Backend validation → Terminal assignment
2. **Data Flow**: Terminal output → Multiple client distribution → Cross-tab sync
3. **Error Recovery**: Network issues → Reconnection attempts → Service restoration
4. **Resource Management**: Client disconnect → Backend cleanup → Memory reclamation

## Best Practices

### 1. Mock Isolation
- Each test creates fresh mocks
- No shared state between tests
- Complete cleanup after each test

### 2. Interaction Focus
- Verify **how** components communicate
- Test **collaboration patterns**
- Validate **timing sequences**

### 3. Contract Compliance
- Define clear interfaces through mocks
- Verify all contract requirements
- Test edge cases and error conditions

### 4. Realistic Simulation
- Browser environment matches real conditions
- Network timing simulates actual latency
- Error scenarios reflect real-world issues

## Coverage Goals

- **Branches**: 85%
- **Functions**: 90%
- **Lines**: 90%
- **Statements**: 90%

Focus on interaction coverage rather than just code coverage - every significant collaboration should be tested.

## Debugging Tips

### Mock Call Inspection
```typescript
console.log(mockSocket.emit.mock.calls);
console.log(mockBroadcastChannel.postMessage.mock.calls);
```

### Interaction Timing
```typescript
console.log(mockSocket.connect.mock.invocationCallOrder);
console.log(mockSocket.emit.mock.invocationCallOrder);
```

### Cross-Tab Message Flow
```typescript
const messageHistory = broadcastChannelManager.getChannelMessageHistory('channel-name');
console.log(messageHistory);
```

This test suite ensures robust, reliable WebSocket functionality through comprehensive interaction testing following London School TDD principles.