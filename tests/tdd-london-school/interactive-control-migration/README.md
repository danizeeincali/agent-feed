# TDD London School: Enhanced Interactive Control Migration Test Suite

## Overview

This test suite implements Test-Driven Development using the London School (mockist) approach for migrating the enhanced `/interactive-control` feature. The focus is on behavior verification through mocking external dependencies and testing component interactions.

## Test Architecture

### Core Principles
1. **Outside-In Testing**: Start with user behavior and work down to implementation
2. **Mock-Driven Development**: Mock all external dependencies (APIs, SSE, WebSocket)
3. **Behavior Verification**: Test HOW objects collaborate, not WHAT they contain
4. **Contract Definition**: Define clear interfaces through mock expectations

### Mock Strategy

#### External Dependencies to Mock
- **EventSource API**: For SSE connections
- **WebSocket API**: For real-time communication  
- **HTTP Client**: For REST API calls
- **DOM Elements**: For UI interaction testing
- **Browser APIs**: LocalStorage, sessionStorage, etc.

#### Service Layer Mocks
- **SSEConnectionService**: Mock connection management
- **ClaudeInstanceManager**: Mock instance operations
- **MessageProcessor**: Mock message handling
- **ErrorRecoveryManager**: Mock error recovery
- **UIStateManager**: Mock UI state coordination

## Test Categories

### 1. Unit Tests (`/unit/`)
- Component behavior verification
- Service contract testing
- Hook interaction testing
- State management verification

### 2. Integration Tests (`/integration/`)
- SSE connection integration
- Component collaboration
- Service orchestration
- Error propagation

### 3. Contract Tests (`/contracts/`)
- API interface definitions
- Service boundary testing
- Message format validation
- Error response handling

### 4. UI Interaction Tests (`/ui-interaction/`)
- User workflow testing
- Event handling verification
- State transition testing
- Component communication

### 5. E2E Behavioral Tests (`/e2e/`)
- Complete user journeys
- Cross-component integration
- Performance characteristics
- Error recovery flows

## File Structure

```
tests/tdd-london-school/interactive-control-migration/
├── README.md
├── contracts/
│   ├── sse-connection-contracts.test.ts
│   ├── claude-instance-contracts.test.ts
│   ├── message-processing-contracts.test.ts
│   └── ui-state-contracts.test.ts
├── unit/
│   ├── components/
│   │   ├── AdvancedSSETerminal.test.tsx
│   │   ├── ClaudeInstanceManagerSSE.test.tsx
│   │   └── ConnectionStatusIndicator.test.tsx
│   ├── hooks/
│   │   ├── useAdvancedSSEConnection.test.ts
│   │   ├── useSSEClaudeInstance.test.ts
│   │   └── useSSEConnectionSingleton.test.ts
│   └── services/
│       ├── SSEConnectionService.test.ts
│       ├── MessageProcessor.test.ts
│       └── ErrorRecoveryManager.test.ts
├── integration/
│   ├── sse-terminal-integration.test.tsx
│   ├── instance-synchronization.test.ts
│   ├── error-recovery-flow.test.ts
│   └── message-routing.test.ts
├── ui-interaction/
│   ├── terminal-user-interactions.test.tsx
│   ├── instance-switching-flow.test.tsx
│   ├── connection-state-ui.test.tsx
│   └── error-handling-ui.test.tsx
├── e2e/
│   ├── complete-migration-flow.playwright.test.ts
│   ├── cross-tab-synchronization.playwright.test.ts
│   └── performance-benchmarks.playwright.test.ts
├── mocks/
│   ├── EventSourceMock.ts
│   ├── SSEConnectionMock.ts
│   ├── ClaudeInstanceMock.ts
│   └── MessageProcessorMock.ts
└── utilities/
    ├── test-helpers.ts
    ├── mock-factories.ts
    └── assertion-helpers.ts
```

## Key Testing Patterns

### 1. Mock-First Development
```typescript
// Define behavior expectations first
const mockConnectionService = {
  connect: jest.fn().mockResolvedValue(mockEventSource),
  disconnect: jest.fn(),
  onMessage: jest.fn(),
  onError: jest.fn()
};
```

### 2. Behavioral Contracts
```typescript
// Test the conversation between objects
expect(mockConnectionService.connect).toHaveBeenCalledWith('instance-123');
expect(mockMessageProcessor.process).toHaveBeenCalledWith(expectedMessage);
expect(mockUIManager.updateState).toHaveBeenCalledWith(expectedState);
```

### 3. Outside-In Test Flow
```typescript
// Start with user behavior
it('should display real-time terminal output when connected', async () => {
  // Arrange - Mock the entire dependency chain
  // Act - Trigger user action
  // Assert - Verify end-to-end behavior
});
```

## Mock Coordination

### Swarm Test Agent Integration
```typescript
// Coordinate with other test agents
beforeAll(async () => {
  await swarmCoordinator.notifyTestStart('london-school-sse-migration');
});

afterAll(async () => {
  await swarmCoordinator.shareResults(testResults);
});
```

### Contract Sharing
```typescript
// Share mock contracts across test suites
export const sseConnectionContract = {
  connect: { input: 'string', output: 'EventSource' },
  disconnect: { input: 'void', output: 'void' },
  onMessage: { input: 'function', output: 'function' }
};
```

## Test Execution Strategy

### 1. Test Phases
1. **Contract Definition**: Define all mock interfaces
2. **Unit Testing**: Test individual component behavior
3. **Integration Testing**: Test component collaboration
4. **UI Testing**: Test user interaction flows
5. **E2E Testing**: Test complete user journeys

### 2. Mock Evolution
- Start with simple mocks
- Add complexity as tests evolve
- Refactor mocks based on real implementation
- Maintain mock contracts throughout development

### 3. Behavior Verification Focus
- Test object interactions
- Verify message passing
- Validate state transitions
- Check error propagation

## Success Criteria

### Test Coverage
- 100% behavioral coverage of SSE integration
- Complete mock coverage of external dependencies
- Comprehensive error scenario testing
- Full user workflow verification

### Quality Metrics
- All tests pass consistently
- Fast test execution (<5s per suite)
- Clear test failure messages
- Maintainable test code

### Deliverables
- Complete TDD test specifications
- Mock strategy documentation
- Behavioral contract definitions
- Test execution reports