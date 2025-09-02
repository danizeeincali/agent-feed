# TDD London School Test Specifications - Message Handling Enhancement

## Overview

This document outlines the comprehensive Test-Driven Development (TDD) test suite created using the London School (mockist) approach for message handling enhancement. The tests focus on outside-in development with mock-driven contracts and behavior verification.

## Test Architecture

### London School TDD Principles Applied

1. **Outside-In Development**: Tests start from user behavior and work inward to implementation
2. **Mock-Driven Development**: Heavy use of mocks to isolate units and define contracts
3. **Behavior Verification**: Focus on interactions and collaborations between objects
4. **Contract Definition**: Clear interfaces established through mock expectations
5. **Swarm Coordination**: Integration with swarm agents for comprehensive coverage

## Test Suite Structure

```
tests/
├── unit/
│   ├── message/
│   │   └── message-sequencing.test.js
│   ├── tool/
│   │   └── tool-usage-capture.test.js
│   └── websocket/
│       └── websocket-message-handling.test.js
├── integration/
│   └── swarm/
│       └── message-handling-integration.test.js
├── unit/
│   └── mock-contracts.js
└── setup/
    └── jest.setup.js
```

## Test Categories

### 1. Message Sequencing Tests (`/tests/unit/message/message-sequencing.test.js`)

**Purpose**: Verify message ordering, ID assignment, and concurrent processing

**Key Test Scenarios**:

#### Unique ID Assignment
- ✅ Should assign unique IDs to all messages
- ✅ Should handle ID generation failures gracefully  
- ✅ Should prevent duplicate IDs through validation

#### Message Order Maintenance
- ✅ Should maintain message order in chat
- ✅ Should handle out-of-order message insertion

#### API Response Handling
- ✅ Should not drop any API responses
- ✅ Should handle duplicate API response detection

#### Concurrent Message Processing
- ✅ Should handle concurrent message processing
- ✅ Should handle race condition in concurrent processing

**Mock Contracts**:
- `MessageStore`: Persistence operations
- `IdGenerator`: Unique ID creation and validation
- `OrderManager`: Message sequencing and reordering
- `ConcurrencyHandler`: Concurrent processing and locks

### 2. Tool Usage Capture Tests (`/tests/unit/tool/tool-usage-capture.test.js`)

**Purpose**: Verify tool usage separation and terminal-only display

**Key Test Scenarios**:

#### Claude Tool Usage Capture
- ✅ Should capture Claude tool usage
- ✅ Should monitor Claude tool lifecycle
- ✅ Should handle tool usage errors gracefully

#### Terminal-Only Tool Usage Display
- ✅ Should send tool usage to terminal only
- ✅ Should format tool usage display properly
- ✅ Should prevent tool usage from appearing in chat

#### Chat vs Terminal Separation
- ✅ Should not mix tool usage with chat responses
- ✅ Should handle tool-only messages correctly
- ✅ Should maintain conversation flow in chat

**Mock Contracts**:
- `ToolCapture`: Tool usage recording and formatting
- `TerminalDisplay`: Terminal-specific output handling
- `ChatFilter`: Content separation and filtering
- `ClaudeToolMonitor`: Tool lifecycle monitoring
- `ChannelRouter`: Message routing decisions

### 3. WebSocket Message Handling Tests (`/tests/unit/websocket/websocket-message-handling.test.js`)

**Purpose**: Verify WebSocket message queueing, processing, and connection management

**Key Test Scenarios**:

#### Message Queueing
- ✅ Should queue all incoming messages
- ✅ Should handle queue overflow gracefully
- ✅ Should maintain message priority in queue

#### Sequential Message Processing
- ✅ Should process messages in sequence
- ✅ Should handle processing errors without stopping queue
- ✅ Should track processing statistics

#### Message Type Filtering
- ✅ Should handle message type filtering
- ✅ Should extract and validate message types

#### Channel Broadcasting
- ✅ Should broadcast to correct channels
- ✅ Should handle channel-specific message formatting

#### WebSocket Connection Management
- ✅ Should handle WebSocket reconnection
- ✅ Should retry failed connections
- ✅ Should handle connection state changes

**Mock Contracts**:
- `MessageQueue`: Queue operations and priority handling
- `SequentialProcessor`: Sequential message processing
- `MessageFilter`: Type filtering and validation
- `ChannelBroadcaster`: Multi-channel broadcasting
- `WebSocketManager`: WebSocket communication
- `ConnectionHandler`: Connection lifecycle management

### 4. Integration Tests (`/tests/integration/swarm/message-handling-integration.test.js`)

**Purpose**: Verify end-to-end workflows and component collaboration

**Key Test Scenarios**:

#### Chat vs Terminal Separation Integration
- ✅ Should maintain chat vs terminal separation across all components
- ✅ Should show all responses in terminal while filtering chat content
- ✅ Should show only conversation in chat channel

#### WebSocket Reconnection Integration
- ✅ Should handle WebSocket reconnection with message recovery
- ✅ Should maintain message order during reconnection

#### End-to-End Message Flow Integration
- ✅ Should handle complete message lifecycle from WebSocket to display

**Integration Orchestrator**: Coordinates all components for complex workflows

## Mock Contract Specifications (`/tests/unit/mock-contracts.js`)

### Contract Categories

1. **Message Sequencing Contracts**
   - MessageStore, IdGenerator, OrderManager, ConcurrencyHandler

2. **Tool Usage Capture Contracts**
   - ToolCapture, TerminalDisplay, ChatFilter, ClaudeToolMonitor, ChannelRouter

3. **WebSocket Message Handling Contracts**
   - MessageQueue, SequentialProcessor, MessageFilter, ChannelBroadcaster, WebSocketManager, ConnectionHandler

4. **Integration Orchestration Contracts**
   - SystemOrchestrator, IntegrationLogger

5. **Swarm Coordination Contracts**
   - SwarmCoordinator

### Contract Validation Utilities

- `validateMockContract()`: Ensures mocks implement required interfaces
- `createContractMock()`: Factory for contract-compliant mocks
- `verifyBehavior()`: Validates mock interactions match expected behavior

## Test Infrastructure

### Jest Configuration (`/tests/jest.config.js`)

- **Environment**: Node.js testing environment
- **Coverage**: 90%+ thresholds for message handling components
- **Mocking**: Automatic mock clearing and restoration
- **Custom Matchers**: London School-specific assertions

### Jest Setup (`/tests/setup/jest.setup.js`)

**Global Utilities**:
- `mockSwarmCoordination`: Swarm notification utilities
- `createContractMock()`: Mock factory with interaction tracking
- `expectBehavior`: Behavior verification helpers
- `testDataFactory`: Consistent test data generation

**Custom Matchers**:
- `toSatisfyContract()`: Contract compliance verification
- `toHaveBeenCalledBefore()`: Interaction order verification
- `toFollowBehaviorPattern()`: London School pattern verification

## Failing Test Validation

The test suite is designed to fail initially (TDD approach) with implementations throwing "Not implemented yet - TDD approach" errors. This ensures:

1. **Test-First Development**: Tests define the expected behavior before implementation
2. **Clear Requirements**: Failing tests serve as specifications
3. **Incremental Implementation**: Each test can be made to pass individually
4. **Behavior-Driven Design**: Mock interactions drive the API design

## Swarm Coordination Integration

### Pre/Post Task Hooks

- **Pre-task**: Initializes swarm session and notifies agents
- **During**: Tracks interactions and coordinates execution
- **Post-task**: Shares results and updates swarm memory

### Swarm Communication Patterns

```javascript
// Notify swarm of test execution
await mockSwarmCoordinator.notifyTestStart('test-suite-name');

// Share test patterns with other agents
await mockSwarmCoordinator.shareResults({
  testSuite: 'suite-name',
  mockInteractions: jest.getAllMockCalls()
});

// Coordinate multi-component workflows
await mockSwarmCoordinator.coordinateExecution({
  testContext: 'integration-test',
  componentInteractions: allMockCalls
});
```

## Implementation Roadmap

### Phase 1: Message Sequencing
1. Implement `MessageSequencer.assignUniqueId()`
2. Implement `MessageSequencer.maintainOrder()`
3. Implement `MessageSequencer.handleApiResponse()`
4. Implement `MessageSequencer.processConcurrent()`

### Phase 2: Tool Usage Capture
1. Implement `ToolUsageHandler.captureToolUsage()`
2. Implement `ToolUsageHandler.displayToolUsage()`
3. Implement `ToolUsageHandler.separateAndRoute()`
4. Implement `ToolUsageHandler.processMessage()`

### Phase 3: WebSocket Message Handling
1. Implement `WebSocketMessageHandler.queueMessage()`
2. Implement `WebSocketMessageHandler.processQueue()`
3. Implement `WebSocketMessageHandler.filterAndProcess()`
4. Implement `WebSocketMessageHandler.broadcastMessage()`
5. Implement `WebSocketMessageHandler.handleReconnection()`

### Phase 4: Integration
1. Implement `IntegrationOrchestrator.processComplexMessage()`
2. Implement `IntegrationOrchestrator.handleReconnectionWithRecovery()`
3. Implement `IntegrationOrchestrator.handleCompleteMessageLifecycle()`

## Success Criteria

### Test Quality Metrics
- **Coverage**: >90% for message handling components
- **Mock Interaction Verification**: All collaborator interactions verified
- **Contract Compliance**: All mocks satisfy their contracts
- **Behavior Patterns**: London School patterns correctly implemented

### Functional Requirements
- **Message Sequencing**: All messages have unique IDs and maintain order
- **Tool Usage Separation**: Tool usage appears only in terminal, not chat
- **WebSocket Reliability**: Messages queued, processed sequentially, handle reconnection
- **Integration**: End-to-end workflows work across all components

### Performance Requirements
- **Test Execution**: <10 seconds for full test suite
- **Mock Performance**: Minimal overhead from mock interactions
- **Memory Usage**: Proper cleanup between tests

## Mock Requirements Summary

### Core Mock Behaviors Required

1. **Message Store Mocks**
   - Async persistence with metadata
   - Query filtering capabilities
   - Order update mechanisms

2. **Tool Capture Mocks**
   - Usage recording with timestamps
   - Formatting for different contexts
   - Metrics tracking

3. **WebSocket Mocks**
   - Connection state management
   - Queue operations with priority
   - Broadcasting to multiple channels

4. **Integration Mocks**
   - Multi-component coordination
   - Error handling and recovery
   - Performance metrics collection

### Mock Interaction Patterns

- **London School Verification**: Focus on mock calls and order
- **Contract Adherence**: All mocks follow defined interfaces
- **Swarm Integration**: Mock results shared across agent swarm
- **Behavior Testing**: Verify object conversations, not just state

This comprehensive test suite ensures robust message handling enhancement through rigorous TDD practices, extensive mock-driven testing, and swarm coordination patterns.