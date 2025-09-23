# TDD London School Test Suite - WebSocket to HTTP+SSE Migration

## Overview

This comprehensive test suite implements the **London School (Mockist) TDD approach** for testing the WebSocket to HTTP+SSE migration with extensive use of mocks, stubs, and behavior verification. The London School emphasizes testing the interactions between objects rather than their internal state.

## Architecture

```
tests/tdd-london-school/
├── mocks/                           # Comprehensive mock implementations
│   ├── EventSourceMock.ts          # SSE connection mocking
│   └── FetchMock.ts                 # HTTP request mocking
├── contracts/                       # Contract definitions and mock managers
│   └── ConnectionStateContracts.ts # Connection state management contracts
├── scenarios/                       # Error and edge case scenarios
│   └── ErrorRecoveryScenarios.test.ts
├── message-handling/                # Message processing and buffering
│   └── MessageBufferingTests.test.ts
├── integration/                     # Component lifecycle integration
│   └── ComponentLifecycleTests.test.ts
├── terminal/                        # Terminal output formatting
│   └── TerminalFormattingTests.test.ts
├── user-interaction/                # User interaction flows
│   └── UserInteractionFlowTests.test.ts
├── swarm/                          # Distributed testing coordination
│   └── SwarmCoordinationContracts.test.ts
└── README.md                       # This file
```

## London School TDD Principles Applied

### 1. Outside-In Development

Tests start from the user's perspective and work inward to implementation details:

```typescript
// Start with acceptance test (outside)
describe('WebSocket to SSE Migration', () => {
  it('should seamlessly switch from WebSocket to SSE when connection fails', async () => {
    // Setup mock collaborators
    const mockWebSocket = createWebSocketMock();
    const mockEventSource = createEventSourceMock();
    const mockConnectionManager = createConnectionManagerMock();
    
    // Test the behavior, not the implementation
    mockWebSocket.mockDisconnect(true); // Simulate failure
    
    // Verify the conversation between objects
    expect(mockConnectionManager.switchToSSE).toHaveBeenCalled();
    expect(mockEventSource.connect).toHaveBeenCalledWith(expectedConfig);
  });
});
```

### 2. Mock-Driven Development

All dependencies are mocked to isolate the unit under test and define clear contracts:

```typescript
// Define collaborator contracts through mocks
const mockRepository = {
  save: jest.fn().mockResolvedValue({ id: '123' }),
  findByEmail: jest.fn().mockResolvedValue(null)
};

const mockNotifier = {
  sendWelcome: jest.fn().mockResolvedValue(true)
};
```

### 3. Behavior Verification Over State Testing

Focus on **HOW** objects collaborate rather than **WHAT** they contain:

```typescript
// Verify the conversation between objects
expect(mockEventSource.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
expect(mockFetch.fetch).toHaveBeenCalledWith('/api/terminal/command', {
  method: 'POST',
  body: JSON.stringify(expectedCommand)
});
```

## Key Mock Components

### 1. EventSource Mock (`mocks/EventSourceMock.ts`)

Comprehensive SSE connection mocking with controllable events:

- **Connection lifecycle**: connect, disconnect, reconnect
- **Message simulation**: data events, error events, custom events
- **State management**: readyState, connection health
- **Behavior verification**: interaction tracking, contract validation

```typescript
const mockEventSource = EventSourceMockFactory.createConnectedMock('ws://localhost:3000');
mockEventSource.mockMessage({ type: 'output', data: 'command result' });
expect(mockEventSource.onMessageMock).toHaveBeenCalledWith(expect.objectContaining({
  data: JSON.stringify({ type: 'output', data: 'command result' })
}));
```

### 2. Fetch Mock (`mocks/FetchMock.ts`)

HTTP request mocking with response control:

- **Request capture**: URL patterns, headers, body content
- **Response simulation**: success, error, timeout scenarios
- **Network conditions**: slow connections, intermittent failures
- **Behavior verification**: request ordering, retry logic

```typescript
const mockFetch = FetchMockFactory.createTerminalMock();
mockFetch.mockSuccessResponse('/api/terminal/command', { output: 'success' });

await connectionManager.sendCommand('ls -la');

expect(mockFetch.getRequestsTo('/api/terminal/command')).toHaveLength(1);
```

### 3. Connection State Contracts (`contracts/ConnectionStateContracts.ts`)

Defines contracts for connection management with comprehensive mocking:

- **State transitions**: disconnected → connecting → connected → error
- **Error handling**: timeout, network failure, authentication
- **Recovery mechanisms**: reconnection, fallback strategies
- **Health monitoring**: latency, uptime, error rates

```typescript
const mockConnectionManager = ConnectionContractFactory.createHybridContract();
await mockConnectionManager.connect({ url: 'ws://localhost:3000' });

expect(mockConnectionManager.connectMock).toHaveBeenCalledWith({
  url: 'ws://localhost:3000'
});
```

## Test Categories

### 1. Error Recovery Scenarios

Tests comprehensive error handling with recovery mechanisms:

- **Network failures**: connection timeouts, disconnections
- **Server errors**: 500 errors, authentication failures
- **Resource exhaustion**: memory pressure, connection pool limits
- **Concurrent errors**: multiple simultaneous failures

### 2. Message Handling and Buffering

Tests message processing, ordering, and buffering:

- **Message buffering**: when terminal not ready, overflow handling
- **Stream processing**: ANSI code processing, content filtering
- **Message ordering**: sequence detection, gap recovery
- **Performance**: large messages, chunking, streaming

### 3. Component Lifecycle Integration

Tests component mounting, unmounting, and interaction flows:

- **Mounting lifecycle**: dependency initialization, event binding
- **Unmounting cleanup**: resource deallocation, memory leak prevention
- **User interactions**: keyboard shortcuts, mouse events, focus management
- **Error boundaries**: graceful error handling, fallback UI

### 4. Terminal Output Formatting

Tests terminal rendering and output processing:

- **ANSI processing**: color codes, text formatting, cursor control
- **Output formatting**: command output, error messages, loading animations
- **Theme integration**: color schemes, accessibility features
- **Performance**: large outputs, responsive rendering

### 5. User Interaction Flows

Tests user input handling and event processing:

- **Keyboard interactions**: shortcuts, special keys, text input
- **Mouse interactions**: clicks, selection, context menus
- **Clipboard operations**: paste, copy, data sanitization
- **Accessibility**: screen reader support, keyboard navigation

### 6. Swarm Coordination Contracts

Tests distributed testing coordination:

- **Agent management**: registration, capability matching, load balancing
- **Task distribution**: assignment, execution monitoring, result collection
- **Health monitoring**: swarm status, failure detection, recovery
- **Result aggregation**: metrics collection, report generation

## Mock Verification Patterns

### Contract Verification

Every test verifies that all mock contracts are fulfilled:

```typescript
describe('London School - Contract Verification', () => {
  it('should verify all connection handling contracts are fulfilled', () => {
    // Verify mock interactions follow expected patterns
    expect(mockEventSource.addEventListener).toHaveBeenCalled();
    expect(mockFetch.fetch).toHaveBeenCalled();
    expect(mockConnectionManager.connect).toHaveBeenCalled();
    
    // Verify behavior verification was performed
    expect(jest.isMockFunction(mockEventSource.mockMessage)).toBe(true);
  });
});
```

### Interaction History Verification

Mocks track interaction history for comprehensive verification:

```typescript
const interactions = mockConnectionManager.getInteractionHistory();
expect(interactions.connect).toHaveBeenCalledBefore(interactions.sendMessage);
expect(interactions.disconnect).toHaveBeenCalledAfter(interactions.sendMessage);
```

### Collaborator Cleanup Verification

Tests verify proper resource cleanup:

```typescript
it('should verify proper cleanup and resource management', () => {
  mockConnectionManager.disconnect();
  
  expect(mockEventSource.close).toHaveBeenCalled();
  expect(mockMemoryManager.cleanupResources).toHaveBeenCalled();
  expect(mockErrorHandler.resetState).toHaveBeenCalled();
});
```

## Running the Tests

### Prerequisites

```bash
npm install
```

### Run London School TDD Tests

```bash
# Run all London School tests
npm test -- --testPathPattern="tdd-london-school"

# Run specific test categories
npm test -- ErrorRecoveryScenarios.test.ts
npm test -- MessageBufferingTests.test.ts
npm test -- ComponentLifecycleTests.test.ts
npm test -- TerminalFormattingTests.test.ts
npm test -- UserInteractionFlowTests.test.ts
npm test -- SwarmCoordinationContracts.test.ts
```

### Generate Coverage Reports

```bash
npm run test:coverage -- --testPathPattern="tdd-london-school"
```

### Run with Debugging

```bash
npm test -- --testPathPattern="tdd-london-school" --verbose --detectOpenHandles
```

## Best Practices Demonstrated

### 1. Mock Design

- **Single responsibility**: Each mock has a clear, focused purpose
- **Contract-driven**: Mocks define clear interfaces and expectations
- **Behavior verification**: Focus on interactions, not implementation
- **State isolation**: Each test starts with fresh mock state

### 2. Test Structure

- **Arrange-Act-Assert**: Clear test structure with setup, execution, verification
- **Outside-in**: Start with user scenarios, work toward implementation
- **Collaboration testing**: Verify how objects work together
- **Error scenarios**: Comprehensive edge case and failure testing

### 3. Mock Management

- **Factory patterns**: Consistent mock creation with sensible defaults
- **Interaction tracking**: Complete history of mock interactions
- **Contract verification**: Ensure all expected collaborations occurred
- **Resource cleanup**: Prevent test pollution and memory leaks

## Integration with Existing Codebase

This test suite integrates with the existing WebSocket terminal implementation by:

1. **Mocking existing dependencies**: WebSocket, EventSource, fetch APIs
2. **Testing migration scenarios**: Gradual transition from WebSocket to HTTP+SSE
3. **Verifying behavioral contracts**: Ensuring new implementation maintains existing behavior
4. **Performance validation**: Ensuring migration doesn't degrade performance

## Benefits of London School Approach

### 1. Design Improvement

- **Loose coupling**: Mocks reveal tight coupling and suggest better designs
- **Clear contracts**: Explicit interfaces between components
- **Testable code**: Forces code to be written in a testable manner

### 2. Fast Feedback

- **Isolated testing**: No external dependencies slow down tests
- **Precise failures**: Failures pinpoint exact interaction problems
- **Regression detection**: Changes break tests immediately

### 3. Documentation

- **Living specification**: Tests document how components should interact
- **API contracts**: Mock expectations define component interfaces
- **Behavior examples**: Tests show expected usage patterns

## Future Enhancements

1. **Property-based testing**: Generate random test cases for edge conditions
2. **Mutation testing**: Verify test suite quality by introducing bugs
3. **Performance benchmarking**: Automated performance regression testing
4. **Contract testing**: Verify mock contracts against real implementations
5. **Visual testing**: Screenshot comparisons for UI components

## Conclusion

This London School TDD test suite provides comprehensive coverage of the WebSocket to HTTP+SSE migration with a focus on behavior verification and interaction testing. The extensive use of mocks ensures fast, reliable tests that clearly document expected component collaborations and provide excellent feedback for design improvements.