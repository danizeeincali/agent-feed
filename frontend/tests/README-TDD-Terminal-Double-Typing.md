# TDD Terminal Double Typing Prevention

## Overview

This test suite demonstrates **London School Test-Driven Development (TDD)** methodology to prevent terminal double typing issues. The approach uses **mock-driven development** and **behavior verification** to ensure single character input produces single output.

## Problem Statement

**Issue**: Terminal showing duplicate output
- Each keypress appears twice
- Terminal prompt displayed multiple times  
- Multiple write operations per event
- Duplicate WebSocket connections
- Event handlers registered multiple times

## London School TDD Approach

### Core Principles

1. **Outside-In Development**: Start from user behavior (keyboard input) and work down to implementation
2. **Mock-Driven Development**: Use mocks to define contracts and collaborations
3. **Behavior Verification**: Focus on HOW objects interact, not just what they contain
4. **Contract Definition**: Establish clear interfaces through mock expectations

### Red-Green-Refactor Cycle

```
🔴 RED    → Write failing tests that reveal bugs
🟢 GREEN  → Write minimal code to make tests pass  
🔵 REFACTOR → Improve code while keeping tests green
```

## Test Suite Structure

```
tests/
├── terminal-double-typing.test.js              # Original Jest-based tests
├── terminal-double-typing-comprehensive.test.js # Complete TDD example
├── terminal-tdd-runner.js                      # Simple test runner
├── run-tdd-phases.js                          # RED/GREEN phase demo
├── jest.terminal.config.js                     # Jest configuration
└── __mocks__/                                 # Mock implementations
    ├── xterm.js                               # Terminal mock
    ├── socket.io-client.js                    # WebSocket mock
    ├── xterm-addon-fit.js                     # Fit addon mock
    ├── xterm-addon-search.js                  # Search addon mock
    └── xterm-addon-web-links.js               # Web links mock
```

## Running the Tests

### Option 1: Full TDD Demonstration

```bash
# Run complete RED-GREEN cycle demonstration
node tests/run-tdd-phases.js
```

This shows:
- 🔴 RED phase with failing tests revealing bugs
- 🟢 GREEN phase with passing tests after fixes
- Implementation guidance and methodology explanation

### Option 2: Individual Phase Testing

```bash
# RED phase - tests should fail
TEST_PHASE=RED SIMULATE_DOUBLE_TYPING=true node tests/terminal-tdd-runner.js

# GREEN phase - tests should pass  
TEST_PHASE=GREEN node tests/terminal-tdd-runner.js
```

### Option 3: Jest-based Testing

```bash
# Run with Jest (if dependencies available)
npx jest --config tests/jest.terminal.config.js
```

## Mock-Driven Development Examples

### 1. Terminal Write Contract

```javascript
it('should write single character input exactly once', () => {
  // ARRANGE: Define expected behavior through mock
  const inputData = 'a';
  
  // ACT: Simulate the operation
  mockTerminal.write(inputData);
  
  // ASSERT: Verify contract compliance
  expect(mockTerminal.write).toHaveBeenCalledTimes(1);
  expect(mockTerminal.write).toHaveBeenCalledWith(inputData);
});
```

### 2. Event Handler Registration Contract

```javascript
it('should register onData handler exactly once', () => {
  // ARRANGE: Mock collaborator
  const handler = jest.fn();
  
  // ACT: Register handler multiple times (simulate bug)
  mockTerminal.onData(handler);
  mockTerminal.onData(handler);
  
  // ASSERT: Verify single registration (RED phase fails, GREEN passes)
  expect(mockTerminal.getHandlerCount()).toBe(1);
});
```

### 3. WebSocket Interaction Contract

```javascript
it('should prevent duplicate socket message emissions', () => {
  // ARRANGE: Define message contract
  const message = { type: 'input', data: 'test' };
  
  // ACT: Emit message (potential duplication)
  mockSocket.emit('message', message);
  
  // ASSERT: Verify single emission contract
  expect(mockSocket.getEmittedCount()).toBe(1);
});
```

## Implementation Fixes

Based on the failing tests, here are the required fixes:

### 1. Event Handler Deduplication

```typescript
// Terminal Component
const handlerRef = useRef<Disposable | null>(null);

useEffect(() => {
  if (terminal && !handlerRef.current) {
    handlerRef.current = terminal.onData(handleInput);
  }
  
  return () => {
    handlerRef.current?.dispose();
    handlerRef.current = null;
  };
}, [terminal, handleInput]);
```

### 2. WebSocket Connection Management

```typescript
// Hook for WebSocket
const socketRef = useRef<Socket | null>(null);

const ensureSingleConnection = useCallback(() => {
  if (!socketRef.current?.connected) {
    socketRef.current?.disconnect();
    socketRef.current = io(wsUrl);
  }
  return socketRef.current;
}, [wsUrl]);
```

### 3. Terminal Write Deduplication

```typescript
// Prevent duplicate writes
const lastWrite = useRef<{data: string, timestamp: number} | null>(null);

const deduplicatedWrite = useCallback((data: string) => {
  const now = Date.now();
  const isDuplicate = lastWrite.current?.data === data && 
                     (now - lastWrite.current.timestamp) < 50;
  
  if (!isDuplicate) {
    terminal.write(data);
    lastWrite.current = { data, timestamp: now };
  }
}, [terminal]);
```

### 4. Input Event Debouncing

```typescript
// Debounce rapid input events
const inputBuffer = useRef<string[]>([]);
const flushTimeout = useRef<NodeJS.Timeout | null>(null);

const handleDebouncedInput = useCallback((data: string) => {
  inputBuffer.current.push(data);
  
  if (flushTimeout.current) {
    clearTimeout(flushTimeout.current);
  }
  
  flushTimeout.current = setTimeout(() => {
    const bufferedData = inputBuffer.current.join('');
    if (bufferedData) {
      sendToServer(bufferedData);
      inputBuffer.current = [];
    }
  }, 10);
}, [sendToServer]);
```

## Test Categories

### 1. Contract Definition Tests
- Define expected behavior through mock expectations
- Establish collaborator interfaces
- Specify interaction patterns

### 2. Behavior Verification Tests  
- Test object conversations
- Verify interaction sequences
- Check collaboration patterns

### 3. Integration Tests
- End-to-end workflow testing
- Cross-component communication
- Resource lifecycle management

### 4. Performance Tests
- Measure impact of duplicate operations
- Verify optimization effectiveness
- Resource usage validation

## Benefits of This Approach

### 1. **Bug Prevention**
- Tests fail first, revealing issues
- Prevents regression of double typing
- Catches edge cases early

### 2. **Design Guidance**
- Mocks drive interface design
- Tests specify expected behavior
- Implementation follows naturally

### 3. **Documentation**
- Tests serve as living documentation
- Mock interactions show usage patterns
- Behavior expectations are explicit

### 4. **Refactoring Safety**
- Tests protect against breaking changes
- Mock contracts ensure compatibility
- Behavior preservation guaranteed

## Key Testing Patterns

### 1. Mock Collaboration
```javascript
// Define how objects should work together
mockTerminal.onData((data) => {
  mockSocket.emit('input', data);
});

mockSocket.on('output', (data) => {
  mockTerminal.write(data);
});
```

### 2. Disposable Pattern
```javascript
// Proper resource cleanup
const disposable = mockTerminal.onData(handler);
// ... use handler
disposable.dispose(); // Clean up
```

### 3. State Verification
```javascript
// Check state changes
expect(mockTerminal.isConnected()).toBe(true);
expect(mockSocket.getConnectionCount()).toBe(1);
```

## Conclusion

This TDD approach ensures robust terminal input handling by:
- **Revealing bugs** through failing tests (RED phase)
- **Guiding implementation** through mock contracts  
- **Preventing regressions** through continuous testing
- **Documenting behavior** through executable specifications

The London School methodology emphasizes collaboration over state, leading to more maintainable and testable code that prevents the double typing issues effectively.