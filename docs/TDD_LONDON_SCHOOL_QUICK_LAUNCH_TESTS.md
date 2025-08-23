# TDD London School Quick Launch Test Implementation

## Overview

This document details the comprehensive Test-Driven Development (TDD) test suite created using the London School methodology to validate the Quick Launch functionality. The tests focus on verifying interactions and collaborations between objects rather than implementation details.

## Test File Location

- **File**: `/workspaces/agent-feed/tests/quick-launch-fix.test.ts`
- **Testing Framework**: Jest with ts-jest
- **Methodology**: London School TDD (Mockist approach)

## Test Architecture

### Mock Strategy

The tests use extensive mocking to isolate the System Under Test (SUT) and verify interactions:

```typescript
// Core mocks
jest.mock('child_process');
jest.mock('fs');
jest.mock('path');
jest.mock('socket.io');
jest.mock('node-pty');
jest.useFakeTimers();
```

### Key Components Tested

1. **ProcessManager**: Core service for Claude instance lifecycle management
2. **WebSocket Integration**: Event handling and real-time communication
3. **Child Process Interactions**: Spawn operations and stream handling
4. **Error Handling**: Various failure scenarios and recovery mechanisms

## Test Categories

### 1. ProcessManager Launch Process Verification

Tests that verify the core launching functionality:

- **spawn() invocation**: Verifies correct command arguments and options
- **Stream connection**: Tests stdout/stderr pipe setup
- **Error handling**: Tests spawn failures and process errors
- **Working directory**: Validates process working directory configuration
- **Process validation**: Tests immediate exit detection

### 2. WebSocket Event Handling

Tests the WebSocket communication layer:

- **process:launch events**: Tests event triggering and ProcessManager integration
- **Error propagation**: Tests error event emission
- **Output forwarding**: Tests process output routing to WebSocket clients
- **Status requests**: Tests process info retrieval
- **Kill operations**: Tests process termination handling

### 3. Status Updates and UI Synchronization

Tests real-time status communication:

- **Launch events**: Tests successful launch event emission
- **Terminal output**: Tests output event structure and timing
- **State changes**: Tests process state synchronization

### 4. Error Handling and Recovery

Tests comprehensive error scenarios:

- **ENOENT errors**: Tests missing Claude binary handling
- **Permission errors**: Tests access denied scenarios
- **Process crashes**: Tests auto-restart functionality
- **Connection handling**: Tests WebSocket disconnection gracefully

### 5. Contract Verification - Mock Interactions

London School focus on verifying object collaborations:

- **Spawn contract**: Verifies spawn() called with correct parameters
- **Environment variables**: Tests environment setup
- **Stream configuration**: Tests stdio pipe configuration
- **Event listeners**: Tests proper event handler attachment
- **Cleanup contracts**: Tests resource cleanup on termination

### 6. Integration Contract Tests

Tests between ProcessManager and WebSocket system:

- **Method contracts**: Tests required method availability
- **Event flow**: Tests event propagation patterns
- **Data transformation**: Tests data format consistency

### 7. Performance and Resource Management

Tests system behavior under load:

- **Concurrent launches**: Tests multiple launch attempt handling
- **Resource cleanup**: Tests proper resource deallocation
- **Memory management**: Tests leak prevention

## Key Testing Patterns

### 1. Outside-In Development

```typescript
// Start with acceptance-level test
it('should handle process:launch event and trigger ProcessManager', async () => {
  // Arrange - Setup mocks and expectations
  const launchConfig = { autoRestartHours: 4 };
  
  // Act - Exercise the behavior
  const result = await processManager.launchInstance(launchConfig);
  
  // Assert - Verify interactions occurred
  expect(result).toMatchObject({
    pid: 12345,
    status: 'running'
  });
});
```

### 2. Mock-Driven Design

```typescript
// Define collaborator contracts through mocks
mockSpawn.mockReturnValue(mockChildProcess);

// Verify the conversation between objects
expect(mockSpawn).toHaveBeenCalledWith(
  'claude',
  ['--dangerously-skip-permissions'],
  expect.objectContaining({
    cwd: '/workspaces/agent-feed/prod',
    stdio: ['pipe', 'pipe', 'pipe']
  })
);
```

### 3. Behavior Verification

```typescript
// Focus on HOW objects collaborate
it('should properly connect stdout and stderr streams', async () => {
  const stdoutSpy = jest.fn();
  processManager.on('output', stdoutSpy);
  
  await launchProcessManagerWithTimers();
  mockChildProcess.stdout!.emit('data', Buffer.from('Hello from Claude!'));
  
  expect(stdoutSpy).toHaveBeenCalledWith('Hello from Claude!');
});
```

## Timer Management

The tests use Jest's fake timers to handle ProcessManager's internal timeouts:

```typescript
jest.useFakeTimers();

const launchProcessManagerWithTimers = async (config?: Partial<ProcessConfig>) => {
  const launchPromise = processManager.launchInstance(config);
  jest.advanceTimersByTime(2100); // Advance past the 2000ms timeout
  return launchPromise;
};
```

## Test Execution

```bash
# Run all Quick Launch tests
npm test -- tests/quick-launch-fix.test.ts

# Run specific test pattern
npm test -- tests/quick-launch-fix.test.ts --testNamePattern="should call spawn"

# Run with timeout
npm test -- tests/quick-launch-fix.test.ts --testTimeout=5000
```

## Coverage Areas

The test suite validates:

1. ✅ **Process Spawning**: Correct Claude CLI invocation
2. ✅ **Argument Passing**: Proper command line arguments
3. ✅ **Working Directory**: Correct working directory setup
4. ✅ **Environment Variables**: Required environment variable setup
5. ✅ **Stream Handling**: stdout/stderr pipe configuration
6. ✅ **Event Emission**: Process lifecycle event emission
7. ✅ **Error Handling**: Various failure scenarios
8. ✅ **WebSocket Integration**: Event-driven communication
9. ✅ **Resource Management**: Proper cleanup and disposal
10. ✅ **Auto-restart Logic**: Conditional restart behavior

## Quick Launch Issue Resolution

The tests specifically address the original Quick Launch issue where:

- **Problem**: Quick Launch showed "Launching..." but nothing happened
- **Root Cause**: ProcessManager.launchInstance() wasn't properly spawning processes
- **Validation**: Tests verify spawn() is called with correct arguments
- **Stream Verification**: Tests ensure stdout/stderr are properly connected
- **Error Detection**: Tests verify error events are properly emitted
- **Directory Verification**: Tests confirm process starts in /prod directory

## London School Benefits Demonstrated

1. **Fast Feedback**: Tests run quickly due to mocking
2. **Design Guidance**: Mock interactions drive interface design
3. **Contract Definition**: Clear collaborator responsibilities
4. **Isolation**: True unit testing with no external dependencies
5. **Behavior Focus**: Tests verify conversations, not state

## Integration with Existing System

The tests integrate with the existing Jest configuration and CI/CD pipeline:

- **Jest Config**: Uses existing `jest.config.js` setup
- **TypeScript**: Full TypeScript support with proper typing
- **Coverage**: Integrates with existing coverage reporting
- **CI/CD**: Compatible with existing test automation

## Future Enhancements

Potential test improvements:

1. **Property-based Testing**: Add QuickCheck-style property tests
2. **Mutation Testing**: Validate test effectiveness with mutation testing
3. **Performance Tests**: Add specific performance regression tests
4. **Contract Testing**: Implement Pact-style contract testing
5. **Snapshot Testing**: Add output format regression tests

This comprehensive test suite ensures the Quick Launch functionality is thoroughly validated using London School TDD principles, focusing on object collaborations and behavior verification rather than implementation details.