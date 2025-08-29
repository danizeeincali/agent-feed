# TDD London School - SSE Connection Management Tests

## Overview

This test suite implements **Test-Driven Development** using the **London School (mockist) approach** for comprehensive SSE connection management testing. The focus is on **behavior verification through mocks** rather than state-based testing.

## Test Architecture

### London School TDD Principles Applied

1. **Outside-In Development**: Start with user behavior and work down to implementation details
2. **Mock-Driven Development**: Use mocks to isolate units and define contracts
3. **Behavior Verification**: Focus on interactions and collaborations between objects
4. **Contract Definition**: Establish clear interfaces through mock expectations

## Test Suites

### 1. SSE Connection Management (`sse-connection-management.test.ts`)

**Mock Objects:**
- `mockConnectionManager` - Connection lifecycle behavior
- `mockStateManager` - Connection state tracking
- `connectionInstances` - Instance deduplication tracking

**Key Tests:**
- Connection deduplication per instance ID
- Event handler duplication prevention
- State management across component updates
- Cleanup and reconnection behavior
- Concurrent instance isolation

### 2. Claude Output Parsing (`claude-output-parsing.test.ts`)

**Mock Objects:**
- `mockAnsiParser` - ANSI escape sequence handling
- `mockMessageExtractor` - Content isolation and extraction
- `mockOutputFormatter` - Display preparation and sanitization

**Key Tests:**
- ANSI color code stripping
- Box-drawing character extraction
- Message type detection (welcome, response, error)
- Multi-line response parsing
- Output sanitization and formatting

### 3. Message Bubble Integration (`message-bubble-integration.test.ts`)

**Mock Objects:**
- `mockMessageRenderer` - UI rendering behavior
- `mockChatStore` - Message state management
- `mockUIManager` - Display coordination
- `mockStreamProcessor` - Real-time processing

**Key Tests:**
- Message object creation from parsed output
- Real-time streaming integration
- Bubble styling and content display
- Message ordering and deduplication
- Chat interaction patterns

### 4. Connection Lifecycle (`connection-lifecycle.test.ts`)

**Mock Objects:**
- `mockLifecycleManager` - Component lifecycle coordination
- `mockResourceTracker` - Memory leak prevention
- `mockStateTransition` - State change management
- `mockCleanupHandler` - Resource cleanup coordination

**Key Tests:**
- Component mounting/unmounting scenarios
- Resource tracking and cleanup
- State transition validation
- Memory leak prevention
- Lifecycle error handling

### 5. Error Recovery (`error-recovery.test.ts`)

**Mock Objects:**
- `mockRecoveryManager` - Error recovery coordination
- `mockRetryStrategy` - Retry logic with exponential backoff
- `mockErrorReporter` - Error classification and tracking
- `mockFallbackHandler` - Graceful degradation
- `mockUIFeedback` - User communication

**Key Tests:**
- Network failure detection and classification
- Exponential backoff retry strategy
- Connection recovery workflow
- Graceful degradation to polling
- User feedback and status updates

## Mock Strategy

### EventSource Mocking

The enhanced `MockEventSource` class provides:

```typescript
// Instance tracking for deduplication tests
static instances: MockEventSource[] = [];
static getActiveConnections(): MockEventSource[];
static simulateMessageToAll(data: any): void;

// Advanced test scenarios
static createSlowConnection(url: string, delay: number): MockEventSource;
static createFailingConnection(url: string): MockEventSource;
```

### Mock Coordination

Each test suite follows the London School pattern:

```typescript
beforeEach(() => {
  // Mock collaborator objects
  mockService = {
    method: jest.fn(),
    // Mock returns and behavior verification
  };
});

it('should coordinate behavior between objects', () => {
  // Arrange: Set up mock expectations
  mockService.method.mockReturnValue(expectedResult);
  
  // Act: Execute the behavior under test
  const result = systemUnderTest.execute();
  
  // Assert: Verify interactions occurred as expected
  expect(mockService.method).toHaveBeenCalledWith(expectedParams);
  expect(result).toBe(expectedResult);
});
```

## Running Tests

### Basic Test Execution
```bash
npm test
```

### Watch Mode (TDD Workflow)
```bash
npm run test:watch
```

### Coverage Analysis
```bash
npm run test:coverage
```

### Debug Mode
```bash
npm run test:debug
```

## Coverage Requirements

- **Branches**: 95%+
- **Functions**: 95%+
- **Lines**: 95%+
- **Statements**: 95%+

## Mock Test Data

### Claude Output Examples

```typescript
// Box-drawing terminal output
const mockClaudeBox = `┌─────────────────────┐
│ Claude Response     │
└─────────────────────┘`;

// ANSI escape sequences
const mockAnsiOutput = '\x1b[32mGreen text\x1b[0m';

// SSE stream data
const mockSSEData = 'data: {"content": "Hello", "type": "response"}\n\n';
```

## Test Organization

```
/tests/tdd-sse/
├── jest.config.js              # Jest configuration
├── jest.setup.js               # Global test setup
├── package.json                # Test dependencies
├── mocks/
│   └── event-source.mock.ts    # Enhanced EventSource mock
├── sse-connection-management.test.ts
├── claude-output-parsing.test.ts
├── message-bubble-integration.test.ts
├── connection-lifecycle.test.ts
└── error-recovery.test.ts
```

## Key Benefits

1. **Behavior-Driven**: Tests focus on HOW objects collaborate
2. **Contract Definition**: Mocks establish clear interfaces
3. **Fast Execution**: No real network calls or DOM manipulation
4. **Isolation**: Each unit tested in complete isolation
5. **Design Feedback**: Mocks reveal design problems early

## London School vs Chicago School

This test suite uses **London School** approach:

- ✅ **Mock everything** external to the unit under test
- ✅ **Verify interactions** between objects
- ✅ **Define contracts** through mock expectations
- ✅ **Outside-in** development approach

Rather than Chicago School:
- ❌ Only mock external boundaries
- ❌ Assert on final state
- ❌ Test larger units together

The London School approach is particularly effective for SSE connection management because it allows us to:

1. **Isolate connection logic** from EventSource implementation
2. **Verify proper cleanup** without real resource management
3. **Test error scenarios** without triggering actual network failures
4. **Validate message flow** without parsing real Claude output
5. **Ensure deduplication** without managing actual connection state

This results in fast, reliable, and comprehensive test coverage that drives good design through mock-based contracts.