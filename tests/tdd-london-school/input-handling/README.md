# TDD London School: Input Handling Deduplication Tests

This test suite implements Test-Driven Development using the London School (mockist) approach for comprehensive input handling deduplication testing.

## Overview

These tests focus on **behavior verification** and **interaction testing** rather than state verification, using mocks and stubs to isolate units and define clear contracts between collaborating objects.

## Test Structure

### 🧪 Test Categories

#### 1. WebSocket Tests (`/websocket/`)
- **Singleton Pattern**: Mock-driven WebSocket instance management
- **Single Command Send**: Verify `WebSocket.send()` called exactly once
- **Connection State**: Mock connection lifecycle and error handling
- **Swarm Coordination**: WebSocket state sharing across agents

#### 2. Event Handling Tests (`/event-handling/`)  
- **Enter Key preventDefault**: Mock event handling and prevention behavior
- **Event Listener Cleanup**: Verify cleanup function calls and memory management
- **Modifier Keys**: Test key combination handling
- **Swarm Event Coordination**: Event coordination across swarm agents

#### 3. Deduplication Tests (`/deduplication/`)
- **Content Hash Generation**: Mock hash generation and comparison
- **Duplicate Detection**: Content filtering and storage interaction
- **Output Filtering**: Stream deduplication with hash verification
- **Performance**: Memory management and LRU eviction

#### 4. Swarm Coordination Tests (`/swarm-coordination/`)
- **Test Helper Utilities**: Mock swarm initialization and agent spawning
- **Contract Coordination**: Mock contract sharing and verification
- **Parallel Execution**: Test orchestration across multiple agents
- **State Synchronization**: Memory and data sharing coordination

## London School Methodology

### Outside-In Development
```javascript
// Start with acceptance test
describe('Input Deduplication Feature', () => {
  it('should prevent duplicate command sending', async () => {
    const commandSender = new CommandSender(mockWebSocket, mockBuffer);
    
    await commandSender.send('duplicate command');
    await commandSender.send('duplicate command'); // Second attempt
    
    expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
  });
});
```

### Mock-First Approach
```javascript
// Define collaborator contracts through mocks
const mockWebSocket = {
  send: jest.fn(),
  readyState: 1
};

const mockBuffer = {
  hasRecent: jest.fn().mockReturnValue(false),
  add: jest.fn()
};
```

### Behavior Verification
```javascript
// Focus on HOW objects collaborate
it('should coordinate buffer check before WebSocket send', async () => {
  await commandSender.send('test command');
  
  expect(mockBuffer.hasRecent).toHaveBeenCalledBefore(mockWebSocket.send);
  expect(mockBuffer.add).toHaveBeenCalledWith('test command');
});
```

## Key Testing Patterns

### 1. Interaction Verification
- Verify method call sequences and timing
- Test object collaboration patterns
- Ensure proper dependency coordination

### 2. Contract Testing
- Define clear interfaces through mock expectations
- Share contracts across swarm agents
- Verify contract compliance

### 3. Swarm Coordination
- Test agent communication patterns
- Verify distributed state management
- Coordinate parallel test execution

## Running Tests

```bash
# Run all input handling tests
npm test

# Run specific test categories
npm run test:websocket
npm run test:events
npm run test:deduplication
npm run test:swarm

# Watch mode for development
npm run test:watch

# Coverage analysis
npm run test:coverage
```

## Mock Utilities

### Global Mock Creators
```javascript
// WebSocket mocking
const mockWS = global.createMockWebSocket();

// Event mocking
const mockEvent = global.createMockEvent({ key: 'Enter' });

// Swarm coordination mocking
const mockSwarm = global.createMockSwarmCoordinator();
```

### Custom Matchers
```javascript
// Verify call order
expect(mockA).toHaveBeenCalledBefore(mockB);

// Contract satisfaction
expect(mockObject).toSatisfyContract(expectedContract);

// Interaction patterns
expect(mockFunction).toHaveInteractionPattern([[arg1], [arg2]]);
```

## Swarm Integration

### Agent Coordination
- **Memory Sharing**: Test data synchronization across agents  
- **Contract Verification**: Mock interface compliance
- **Parallel Execution**: Distributed test orchestration
- **Result Aggregation**: Cross-agent result collection

### Test Orchestration
```javascript
const swarmHelper = new SwarmTestHelper(mockCoordinator, mockRegistry);
await swarmHelper.initializeTestSwarm({
  maxAgents: 5,
  agentTypes: ['unit-tester', 'integration-tester']
});
```

## Best Practices

### 1. Mock Management
- Keep mocks simple and focused on behavior
- Verify interactions, not implementations
- Use `jest.fn()` for behavior verification
- Avoid over-mocking internal details

### 2. Contract Design
- Define clear interfaces through mock expectations
- Focus on object responsibilities and collaborations
- Use mocks to drive design decisions
- Keep contracts minimal and cohesive

### 3. Test Organization
- Group related behavior tests together
- Use descriptive test names that explain interactions
- Focus on one collaboration per test
- Maintain clear test boundaries

## Coverage Goals

- **Behavior Coverage**: All object interactions tested
- **Contract Coverage**: All mock interfaces verified  
- **Collaboration Coverage**: All component communications tested
- **Error Path Coverage**: All failure scenarios handled

This test suite ensures robust input handling with comprehensive deduplication, following London School TDD principles for maximum reliability and maintainability.