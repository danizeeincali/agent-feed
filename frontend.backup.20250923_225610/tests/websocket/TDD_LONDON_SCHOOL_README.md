# TDD London School WebSocket Test Suite

Comprehensive mock-driven test suite for WebSocket state management chain, following London School TDD principles with focus on interaction verification and behavior testing.

## 🎯 Testing Strategy

### London School TDD Approach
- **Outside-In Development**: Start with acceptance tests and work inward
- **Mock-Driven**: Use mocks to isolate units and define contracts
- **Behavior Verification**: Focus on interactions between objects
- **Contract Definition**: Establish clear interfaces through mock expectations

### Critical Issues Addressed
- React state propagation broken between Socket.IO events and UI components
- Race conditions during connection establishment
- Disconnect between backend success and frontend UI reality
- State synchronization across the entire chain

## 📁 Test Structure

```
tests/websocket/
├── mocks/                          # Mock implementations at lowest level
│   ├── socket-io-mock.ts          # Socket.IO client mock
│   └── connection-manager-mock.ts # Connection manager mock
├── hooks/                         # Hook-level interaction tests
│   ├── useWebSocketSingleton.test.ts
│   └── useConnectionManager.test.ts
├── context/                       # Context provider tests
│   └── WebSocketSingletonContext.test.tsx
├── components/                    # UI component tests
│   └── ConnectionStatus.test.tsx
├── integration/                   # End-to-end chain tests
│   └── state-propagation-chain.test.tsx
├── race-conditions/               # Race condition specific tests
│   └── connection-state-races.test.ts
├── contract-verification/         # Mock contract validation
│   └── mock-contracts.test.ts
├── setup/                         # Test configuration
│   └── test-setup.ts
└── utils/                         # Test utilities
    └── tdd-results-processor.js
```

## 🔗 State Propagation Chain

Tests verify the complete flow:

```
Socket.IO Event → Manager State → Hook State → Context State → UI Component
```

### Chain Components
1. **Socket.IO Level**: Connection events (`connect`, `disconnect`, `connect_error`)
2. **Manager Level**: `WebSocketConnectionManager` state transitions
3. **Hook Level**: `useConnectionManager` and `useWebSocketSingleton` 
4. **Context Level**: `WebSocketSingletonContext` state propagation
5. **UI Level**: `ConnectionStatus` component display

## ⚡ Race Condition Testing

### Critical Race Conditions
1. **Manager vs Socket State**: 
   ```typescript
   // Manager says CONNECTED but socket.connected is false
   isConnected = state === CONNECTED && socket?.connected === true
   ```

2. **Connection Establishment**: 
   ```typescript
   // Context isConnecting logic race condition
   isConnecting = Boolean(socket && socket.connecting && !socket.connected)
   ```

3. **State Transition Timing**: Manager state updates before socket events

## 🧪 Test Scenarios

### Mock Interaction Tests
- Socket.IO event delegation verification
- Connection manager method calls
- Hook dependency injection
- Context provider prop passing

### Contract Verification Tests
- Mock interfaces match real implementations
- Event signatures and timing
- State object structures
- Method call sequences

### Race Condition Tests
- Connection establishment timing
- Rapid connect/disconnect cycles
- State synchronization delays
- Event ordering issues

### Integration Chain Tests
- Complete state propagation
- Event flow through all layers
- Error recovery chains
- Cleanup and memory management

## 🎭 Mock Strategy

### Socket.IO Mock (`socket-io-mock.ts`)
```typescript
// Mock at lowest level for complete isolation
const mockSocket = mockScenarios.raceConditionSocket();
mockSocket.forceState({ connected: false, connecting: false });
```

### Connection Manager Mock (`connection-manager-mock.ts`)
```typescript
// Mock manager with state tracking
const manager = createMockConnectionManager.raceCondition();
expect(manager.isConnected()).toBe(false); // Race detected
```

### Mock Verification
```typescript
// Verify interactions, not implementations
expect(mockManager.connect).toHaveBeenCalledWith();
expect(mockSocket.emit).toHaveBeenCalledBefore(mockSocket.on);
```

## 🚀 Running Tests

```bash
# Run all WebSocket TDD tests
npm run test:websocket

# Run specific test categories
npm run test:websocket:mocks      # Mock interaction tests
npm run test:websocket:race       # Race condition tests  
npm run test:websocket:integration # End-to-end chain tests

# Watch mode for TDD development
npm run test:websocket:watch

# Coverage report
npm run test:websocket:coverage
```

## 📊 Test Coverage Goals

- **Branches**: 90%+ (especially race condition paths)
- **Functions**: 90%+ (all interaction points)
- **Lines**: 90%+ (critical state logic)
- **Mock Coverage**: 60%+ of tests should be mock-driven
- **Contract Coverage**: 20%+ should verify contracts

## 🎯 TDD Workflow

### Red-Green-Refactor with Mocks

1. **Red**: Write failing mock interaction test
   ```typescript
   it('should call connect on manager when hook connect is called', () => {
     // This will fail initially
     expect(mockManager.connect).toHaveBeenCalledWith();
   });
   ```

2. **Green**: Make test pass with minimal implementation
   ```typescript
   const connect = useCallback(async () => {
     await managerConnect(); // Delegate to manager
   }, [managerConnect]);
   ```

3. **Refactor**: Improve while maintaining mock contracts
   ```typescript
   // Add error handling, logging, etc.
   const connect = useCallback(async () => {
     try {
       await managerConnect();
     } catch (error) {
       // Handle gracefully
     }
   }, [managerConnect]);
   ```

### Outside-In Development

1. Start with UI component test (outside)
2. Mock context dependencies
3. Work down through context → hooks → manager
4. End with Socket.IO integration (inside)

## 🔍 Debugging Race Conditions

### Debug Logging
Tests include comprehensive debug logging:
```typescript
console.log('🔧 useConnectionManager: Computing isConnected', {
  currentState,
  socketConnected: socket?.connected,
  result
});
```

### State History Tracking
```typescript
const stateHistory = mockManager.getStateHistory();
expect(stateHistory).toContain({
  from: ConnectionState.CONNECTING,
  to: ConnectionState.CONNECTED
});
```

## 📈 London School Benefits

1. **Faster Feedback**: Tests run quickly with mocks
2. **Better Design**: Forces good separation of concerns
3. **Clear Contracts**: Mocks define interfaces explicitly
4. **Isolated Testing**: Each layer tested independently
5. **Race Detection**: Can simulate timing issues reliably

## 🎪 Custom Test Matchers

```typescript
// Verify call ordering for race conditions
expect(mockConnect).toHaveBeenCalledBefore(mockEmit);

// Verify mock contracts
expect(mockSocket).toSatisfyContract({
  connect: 'function',
  disconnect: 'function',
  emit: 'function',
  on: 'function'
});
```

## 🚨 Common Pitfalls

1. **Over-mocking**: Don't mock what you own
2. **Implementation Testing**: Test behavior, not internals
3. **Mock Leakage**: Ensure mocks are isolated per test
4. **Contract Drift**: Keep mocks in sync with real implementations
5. **Race Simulation**: Use forced state changes, not timing

## 📚 Further Reading

- [Growing Object-Oriented Software, Guided by Tests](http://www.growing-object-oriented-software.com/)
- [The Art of Unit Testing](https://artofunittesting.com/)
- [Test-Driven Development: By Example](https://www.goodreads.com/book/show/387190.Test_Driven_Development)
- [London School vs Chicago School TDD](https://medium.com/@adrianbooth/test-driven-development-wars-detroit-vs-london-classicist-vs-mockist-9956c78ae95f)