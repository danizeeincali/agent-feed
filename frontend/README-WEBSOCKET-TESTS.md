# WebSocket Terminal TDD Test Suite - London School Methodology

## Overview

This comprehensive test suite implements London School TDD methodology for single-connection WebSocket architecture. It focuses on behavior verification through mock-driven development and interaction testing.

## Test Architecture

### 🏗️ Test Structure

```
src/tests/
├── unit/websocket/
│   ├── ConnectionManager.test.ts          # Connection lifecycle management
│   ├── SingleConnectionEnforcer.test.ts   # Connection isolation enforcement  
│   └── ConnectionStateMachine.test.ts     # State transition management
├── integration/
│   └── WebSocketTerminalIntegration.test.ts # End-to-end functionality
├── mocks/
│   └── MockWebSocket.ts                   # Comprehensive WebSocket mock
└── setup/
    └── testSetup.ts                       # Enhanced test configuration
```

## 🎯 London School TDD Methodology

### Core Principles Implemented

1. **Outside-In Development**: Tests drive behavior from user interactions down to implementation
2. **Mock-Driven Development**: All collaborators are mocked to isolate units under test
3. **Behavior Verification**: Focus on HOW objects collaborate, not WHAT they contain
4. **Interaction Testing**: Verify the conversations between objects

### Test Categories

#### Unit Tests (Mock-Driven)

**ConnectionManager.test.ts**
- ✅ Single connection enforcement
- ✅ Connection lock management  
- ✅ Timeout protection for hung connections
- ✅ UI state update coordination
- ✅ Error handling and recovery

**SingleConnectionEnforcer.test.ts**
- ✅ Connection isolation rules
- ✅ Race condition prevention
- ✅ Lock acquisition patterns
- ✅ State validation workflows
- ✅ Cleanup and recovery mechanisms

**ConnectionStateMachine.test.ts**
- ✅ State transition validation
- ✅ Workflow orchestration
- ✅ Guard condition enforcement
- ✅ History tracking and analytics
- ✅ Error recovery patterns

#### Integration Tests (Real Interactions)

**WebSocketTerminalIntegration.test.ts**
- ✅ End-to-end connection workflows
- ✅ Real-time message flow validation
- ✅ Concurrent connection handling
- ✅ Health monitoring accuracy
- ✅ Resource cleanup verification

## 🚀 Running Tests

### Quick Start

```bash
# Run specific test suite
npm test -- --testPathPattern=ConnectionManager.test.ts

# Run all WebSocket tests  
npm test -- --testPathPattern="websocket|WebSocket"

# Run with coverage
npm test -- --testPathPattern="websocket|WebSocket" --coverage

# Use test runner script
node run-websocket-tests.js --all
```

### Test Runner Options

```bash
# Interactive test selection
node run-websocket-tests.js

# Run specific test by number
node run-websocket-tests.js 1  # ConnectionManager tests
node run-websocket-tests.js 2  # SingleConnectionEnforcer tests  
node run-websocket-tests.js 3  # ConnectionStateMachine tests
node run-websocket-tests.js 4  # Integration tests

# Run all tests
node run-websocket-tests.js --all

# Run with coverage report
node run-websocket-tests.js --coverage
```

## 🔧 Test Features

### Mock Infrastructure

**MockWebSocket.ts**
- Comprehensive WebSocket behavior simulation
- Interaction history tracking
- Event listener management
- Fluent API for test setup
- Automatic cleanup between tests

### Custom Test Utilities

**Enhanced Matchers**
```typescript
expect(mockFunction).toHaveBeenCalledAfter(otherMock);
expect(subject).toHaveInteractedWith(mockObject);
```

**Test Utilities**
```typescript
await TestUtils.waitFor(() => condition);
await TestUtils.flushPromises();
```

### Behavior Verification Patterns

```typescript
// London School: Verify object conversations
expect(mockRepository.findByEmail).toHaveBeenCalledWith(userData.email);
expect(mockRepository.save).toHaveBeenCalledWith(
  expect.objectContaining({ email: userData.email })
);
expect(mockNotifier.sendWelcome).toHaveBeenCalledWith('123');
```

## 📋 Test Coverage Requirements

### Required Test Scenarios

1. **Disconnect Before New Connection**
   - Existing connection closed before establishing new one
   - Proper cleanup of resources
   - UI notification of connection replacement

2. **Single Instance Enforcement**
   - Only one connection active at any time
   - Automatic termination of previous connections
   - Lock-based race condition prevention

3. **Connection Lock Protection**
   - Atomic connection establishment
   - Timeout handling for hung locks
   - Proper lock release on errors

4. **Timeout Protection**
   - Connection establishment timeouts
   - Hung connection detection
   - Graceful timeout handling

5. **UI Update Coordination**
   - State change notifications
   - Connection health reporting
   - Real-time status updates

## 🧪 Mock Strategy

### Collaborator Mocking Pattern

```typescript
// Mock all collaborators to isolate unit under test
const mockEventEmitter = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  removeAllListeners: jest.fn(),
};

const mockConnectionStore = {
  getConnection: jest.fn(),
  setConnection: jest.fn(),
  removeConnection: jest.fn(),
  getAllConnections: jest.fn(),
  clear: jest.fn(),
};
```

### Behavior Verification Focus

```typescript
// London School: Test interactions, not state
it('should coordinate user creation workflow', async () => {
  await userService.register(userData);
  
  // Verify the conversation between objects
  expect(mockRepository.findByEmail).toHaveBeenCalledWith(userData.email);
  expect(mockRepository.save).toHaveBeenCalledWith(
    expect.objectContaining({ email: userData.email })
  );
  expect(mockNotifier.sendWelcome).toHaveBeenCalledWith('123');
});
```

## 📊 Test Execution Flow

1. **Setup Phase**: Mock collaborators with expected behaviors
2. **Exercise Phase**: Execute the behavior under test
3. **Verify Phase**: Assert on mock interactions and collaborations
4. **Teardown Phase**: Clean up mocks and state

## 🎨 Best Practices Implemented

### London School Principles
- **Mock First**: Define collaborator contracts through mocks
- **Behavior Focus**: Test object interactions, not implementation details
- **Outside-In**: Drive development from user scenarios
- **Contract Evolution**: Evolve interfaces based on mock usage

### Test Quality
- **Fast Execution**: All unit tests run in isolation with mocks
- **Deterministic**: No flaky tests due to timing or external dependencies  
- **Focused**: Each test verifies one specific behavior
- **Clear Intent**: Test names describe the expected behavior

## 🔍 Debugging Tests

### Common Issues

1. **Mock Not Called**: Check if the collaborator is properly injected
2. **Timing Issues**: Use `act()` for React hooks and `flushPromises()` for async operations
3. **State Contamination**: Ensure proper cleanup in `beforeEach`/`afterEach`
4. **Mock Configuration**: Verify mock return values match expected interface

### Debug Utilities

```typescript
// Inspect mock interactions
console.log('Mock call history:', mockFunction.mock.calls);
console.log('WebSocket instances:', MockWebSocket.getAllInstances());

// Verify test setup
expect(mockObject).toHaveInteractedWith(expectedMock);
```

## 🚦 Continuous Integration

These tests are designed to run in CI/CD environments with:
- ✅ No external dependencies
- ✅ Fast execution (< 30 seconds total)
- ✅ Detailed failure reporting
- ✅ Coverage metrics
- ✅ Parallel execution support

## 📈 Expected Outcomes

Running this test suite validates:
- ✅ Single connection enforcement works correctly
- ✅ Race conditions are prevented
- ✅ Timeout protection functions properly
- ✅ UI updates reflect connection state accurately
- ✅ Error handling and recovery work as expected

The London School TDD methodology ensures that the WebSocket architecture is robust, maintainable, and correctly handles all specified behaviors through comprehensive interaction testing.