# TDD London School - Terminal I/O Tests

## Problem Statement

Character-by-character echo + commands not executing properly in terminal interface.

**Symptoms:**
- Typing "hello" shows individual characters: "h", "e", "l", "l", "o"
- Commands don't execute when Send is pressed
- Terminal output mixes input echo with command responses
- WebSocket messages cause visual noise

## TDD London School Approach

### Phase 1: RED - Write Failing Tests

Define the desired behavior through failing tests that specify:

1. **No Character Echo**: Individual keystrokes should NOT appear in terminal output
2. **Input Buffering**: Characters should be buffered until Enter/Send is pressed
3. **Command Execution**: Complete commands should execute only after Enter
4. **Clean Output**: Only actual command responses should be displayed

### Phase 2: GREEN - Mock-Driven Implementation

Use mocks to define contracts between components:

- **PTY Mock**: Spawn with `echo: false`, proper write() behavior
- **WebSocket Mock**: Separate input/output message types
- **Input Buffer Mock**: Accumulate characters, flush on Enter
- **Output Filter Mock**: Distinguish echo from real output

### Phase 3: REFACTOR - Clean Implementation

Optimize the working solution:

- Clean separation of concerns
- Proper error handling
- Performance optimizations
- Maintainable architecture

## Test Files

### `echo-filtering.test.js`
Tests the core echo prevention and input buffering mechanism.

**Key Contracts:**
- PTY spawned with echo disabled
- Characters buffered, not echoed
- WebSocket sends only terminal output, not input

### `command-execution.test.js`
Tests proper command execution lifecycle.

**Key Contracts:**
- Commands execute only after Enter
- Proper command queueing
- Output handling coordination

### `websocket-protocol.test.js`
Tests WebSocket message protocol and handling.

**Key Contracts:**
- Message type differentiation
- Clean input/output separation
- Connection management

### `mock-contracts.js`
Defines all mock contracts and verification helpers.

**Mock Factories:**
- PTY, WebSocket, InputBuffer, CommandExecutor
- Contract verifiers
- Behavior builders

## Running Tests

```bash
# Run all terminal I/O tests
npm test -- --testPathPattern=terminal-io

# Run specific test file
npm test echo-filtering.test.js

# Run with coverage
npm test -- --coverage --testPathPattern=terminal-io

# Watch mode for development
npm test -- --watch --testPathPattern=terminal-io
```

## Mock Strategy

### London School Principles Applied

1. **Mock All Collaborators**: Every external dependency is mocked
2. **Focus on Interactions**: Test HOW objects collaborate, not internal state
3. **Define Contracts**: Use mocks to specify expected behavior
4. **Behavior Verification**: Verify the conversation between objects

### Contract Examples

```javascript
// PTY Contract: No echo, proper spawning
expect(mockPty.spawn).toHaveBeenCalledWith(shell, args, {
  echo: false,
  ptyOptions: { echo: false }
});

// WebSocket Contract: No input echo
expect(mockWebSocket.send).not.toHaveBeenCalledWith(
  expect.stringContaining('"type":"output","data":"h"')
);

// Command Execution Contract: Execute on Enter only
mockTerminalManager.handleInput('l');
mockTerminalManager.handleInput('s');
expect(mockPty.write).not.toHaveBeenCalled();

mockTerminalManager.handleInput('\n');
expect(mockPty.write).toHaveBeenCalledWith('ls\n');
```

## Expected Outcomes

After implementing the solutions driven by these tests:

1. **✅ No Character Echo**: Typing appears smoothly without individual character display
2. **✅ Clean Command Execution**: Commands execute only when complete
3. **✅ Proper Output Display**: Only actual command responses appear in terminal
4. **✅ Responsive UI**: No visual noise or duplicate output

## Integration with Swarm Architecture

These tests are designed to work with the broader agent swarm:

- **Coordinate with Integration Tests**: Share contracts with e2e tests
- **Provide Mock Specifications**: Other agents can use these mock contracts
- **Enable Regression Testing**: Prevent echo/input issues from recurring
- **Support Continuous Verification**: Monitor for interaction pattern changes

## Coverage Goals

- **Branches**: 80%+
- **Functions**: 80%+
- **Lines**: 80%+
- **Statements**: 80%+

Focus on behavior coverage rather than just code coverage.