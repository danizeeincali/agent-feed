# TDD London School: Claude Process Spawning Test Suite

Comprehensive mock-driven test suite for Claude process spawning with focus on contract verification and behavior testing.

## Overview

This test suite follows the **London School of TDD** methodology, emphasizing:
- **Mock-driven development**: Mock external dependencies first
- **Contract verification**: Test object interactions and behaviors
- **Outside-in approach**: Start from user behavior, work toward implementation
- **Interaction testing**: Focus on HOW objects collaborate

## Key Test Requirements Met

### ✅ Core Contract Validations
- **Claude spawned WITHOUT --print flag**: Ensures interactive mode, not one-shot print mode
- **PTY mode for terminal emulation**: Validates proper terminal integration
- **All 4 button configurations**: Tests prod, skip-permissions, -c, and --resume modes
- **Bidirectional I/O**: Verifies stdin/stdout communication works correctly
- **Authentication flow**: Tests environment and working directory setup
- **Error handling**: Validates graceful failure scenarios

### ✅ Mock Strategy
- `child_process.spawn()` completely mocked
- `node-pty.spawn()` completely mocked
- File system operations mocked
- All external dependencies isolated

## Test Files

### 1. `claude-process-spawning-contracts.test.js`
**Primary test suite** covering:
- Spawn command construction without --print flag
- PTY integration for interactive sessions
- Authentication flow validation
- Error handling scenarios
- Frontend-backend communication contracts
- Process lifecycle integration
- All 4 button configuration validation
- Performance and resource management

### 2. `interactive-mode-validation.test.js`
**Interactive session testing** covering:
- Interactive session creation (NO --print mode)
- Bidirectional communication contracts
- Terminal emulation features (PTY mode)
- Session management and state
- Error handling in interactive mode
- Performance in interactive scenarios

## Configuration Files

### `jest.config.claude-spawning.js`
- Optimized for process spawning tests
- Mock configurations for child_process and node-pty
- Coverage reporting
- Custom matchers for contract verification

### `jest.setup.claude-spawning.js`
- Global test environment setup
- Mock factory functions
- Contract verification helpers
- Custom Jest matchers
- Test utilities

## Mock Implementations

### `/mocks/child_process.js`
- Complete mock of Node.js child_process module
- MockChildProcess class with event emulation
- Controllable process behavior for testing

### `/mocks/node-pty.js`
- Complete mock of node-pty module
- MockPtyProcess class with terminal emulation
- PTY-specific method mocking

## Running the Tests

### Quick Run
```bash
# From project root
node tests/tdd-london-school/run-claude-spawning-tests.js
```

### Manual Jest Run
```bash
# From project root
npx jest --config=tests/tdd-london-school/jest.config.claude-spawning.js
```

### Development Mode (Watch)
```bash
npx jest --config=tests/tdd-london-school/jest.config.claude-spawning.js --watch
```

## Key Test Scenarios

### 1. Spawn Command Validation
```javascript
test('should spawn Claude without --print flag (CRITICAL CONTRACT)', async () => {
  // Verifies: Claude spawns in interactive mode, NOT print mode
  expect(spawn).toHaveBeenCalledWith('claude', [], expect.any(Object));
  expect(args).not.toContain('--print'); // CRITICAL CONTRACT
});
```

### 2. Button Configuration Testing
```javascript
test('should validate all 4 button configurations spawn correctly', async () => {
  // Tests all frontend button types:
  // - 🚀 prod/claude
  // - ⚡ skip-permissions  
  // - 💬 skip-permissions -c
  // - 🔄 skip-permissions --resume
});
```

### 3. Interactive I/O Validation
```javascript
test('should handle stdin/stdout properly in interactive mode', async () => {
  // Verifies bidirectional communication
  // Tests real terminal interaction patterns
});
```

### 4. PTY Integration
```javascript
test('should use PTY mode for interactive sessions', async () => {
  // Validates terminal emulation
  // Tests resize, ANSI sequences, etc.
});
```

## Contract Verification

### Critical Contracts Tested
1. **NO --print flag**: Interactive mode, not one-shot print mode
2. **Proper working directory**: `/workspaces/agent-feed/prod`
3. **Environment variables**: `CLAUDE_INTERACTIVE=1`, `TERM=xterm-256color`
4. **stdio configuration**: `['pipe', 'pipe', 'pipe']` for pipes, PTY for terminals
5. **Event handlers**: `spawn`, `exit`, `data`, `error` events properly registered

### Mock Interactions Verified
- `spawn()` called with correct arguments
- `process.stdin.write()` for input
- `process.stdout.on('data')` for output
- `process.kill()` for termination
- `pty.spawn()` for terminal mode
- `ptyProcess.write()` for PTY input
- `ptyProcess.resize()` for terminal resize

## Success Criteria

✅ All tests pass with 100% mock coverage
✅ No real processes spawned during testing
✅ All 4 button configurations validated
✅ Interactive mode confirmed (no --print flags)
✅ PTY integration contracts verified
✅ Error scenarios handled gracefully
✅ Performance requirements met

## Benefits of This Approach

### London School Advantages
- **Fast execution**: No real process spawning
- **Reliable**: Isolated from system dependencies
- **Focused**: Tests behavior contracts, not implementation
- **Maintainable**: Changes to internals don't break tests
- **Comprehensive**: Covers edge cases and error scenarios

### Contract-Driven Benefits
- **Clear expectations**: Defines exactly how components should interact
- **Regression prevention**: Catches breaking changes to spawn behavior
- **Documentation**: Tests serve as living documentation of requirements
- **Confidence**: Ensures real Claude processes will work correctly

## Integration with Real Code

These tests validate the contracts used by:
- `simple-backend.js` - Main backend server
- `integrated-real-claude-backend.js` - Enhanced backend
- `src/process-lifecycle-manager.js` - Process management
- `src/terminal-integration.js` - Terminal handling

When real implementation follows the tested contracts, actual Claude processes will spawn and work correctly.

## Troubleshooting

### Common Issues

**Tests failing with "--print flag detected"**
- Check spawn arguments in implementation
- Ensure interactive mode is used, not print mode

**Mock not working correctly**
- Verify mock imports are before real module imports
- Check jest.clearAllMocks() in beforeEach

**PTY tests failing**
- Ensure node-pty mock is properly configured
- Check PTY-specific method calls

**Process event tests timing out**
- Use waitForProcessEvent helper
- Check event handler registration

## Future Enhancements

- Add performance benchmarks
- Extend error scenario coverage
- Add integration tests with real processes
- Implement process resource monitoring tests
- Add more sophisticated PTY behavior simulation

---

**This test suite ensures Claude processes spawn correctly in interactive mode for all 4 button configurations, without the --print flag that would break terminal interaction.**