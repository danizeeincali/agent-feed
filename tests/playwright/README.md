# Claude Instance Frontend Playwright Test Suite

Comprehensive end-to-end testing for the Claude Instance Manager frontend interface.

## Overview

This test suite validates the complete frontend integration with real Claude processes:

- **Button Click Testing**: All 4 Claude instance creation buttons
- **SSE Terminal Streaming**: Real-time output from Claude processes  
- **Instance Status Management**: Status updates and visual indicators
- **Error Handling**: Connection failures and recovery scenarios
- **Bidirectional I/O**: Interactive command/response validation
- **Multi-instance Scenarios**: Concurrent instance management

## Test Structure

```
tests/playwright/
├── playwright.config.ts              # Main configuration
├── global-setup.ts                   # Pre-test environment setup
├── global-teardown.ts                # Post-test cleanup
├── test-helpers.ts                   # Reusable test utilities
├── claude-instance-button-validation.spec.ts    # Button functionality
├── sse-terminal-stream-validation.spec.ts       # SSE streaming
├── instance-status-updates.spec.ts              # Status management
├── error-handling-recovery.spec.ts              # Error scenarios
├── bidirectional-io-validation.spec.ts          # Interactive I/O
└── comprehensive-integration.spec.ts             # End-to-end workflows
```

## Prerequisites

### Backend Services
- Backend server running on `http://localhost:3000`
- Claude CLI available and properly configured
- All Claude instance endpoints functional

### Frontend Service  
- Frontend dev server on `http://localhost:3001`
- React app fully loaded and responsive
- Claude Instance Manager component available

## Running Tests

### Full Suite
```bash
cd /workspaces/agent-feed/tests/playwright
npx playwright test
```

### Specific Test Files
```bash
# Button validation only
npx playwright test claude-instance-button-validation.spec.ts

# SSE streaming tests
npx playwright test sse-terminal-stream-validation.spec.ts

# Error handling tests  
npx playwright test error-handling-recovery.spec.ts

# Complete integration tests
npx playwright test comprehensive-integration.spec.ts
```

### With UI Mode
```bash
npx playwright test --ui
```

### Debug Mode
```bash
npx playwright test --debug
```

### Headed Mode (Visible Browser)
```bash  
npx playwright test --headed
```

## Test Categories

### 1. Button Click Validation (`claude-instance-button-validation.spec.ts`)
- **prod/claude**: Basic production instance creation
- **skip-permissions**: Instance with permissions bypassed
- **skip-permissions -c**: Instance with -c flag
- **skip-permissions --resume**: Resume functionality
- Non-blocking UI behavior validation
- Instance configuration mapping verification

### 2. SSE Terminal Stream Validation (`sse-terminal-stream-validation.spec.ts`)
- SSE connection establishment
- Real Claude output streaming
- Connection recovery mechanisms
- Multiple instance streaming
- Fallback to HTTP polling
- Real-time status updates via SSE

### 3. Instance Status Updates (`instance-status-updates.spec.ts`)
- Status progression: starting → running → stopped
- Visual indicator updates
- Status persistence across page reloads
- Multiple instance independent tracking
- Connection status correlation
- Instance count display updates

### 4. Error Handling & Recovery (`error-handling-recovery.spec.ts`)
- Backend unreachable scenarios
- Instance creation failures
- Network interruption recovery
- Invalid operation handling
- Connection timeouts
- User-friendly error messaging
- Error state clearing

### 5. Bidirectional I/O Validation (`bidirectional-io-validation.spec.ts`)
- Basic input/output flow
- Interactive command/response cycles
- Enter key vs Send button
- Multi-line input handling
- Special characters and Unicode
- Output auto-scrolling
- Input validation
- Real-time streaming updates
- Session state maintenance

### 6. Comprehensive Integration (`comprehensive-integration.spec.ts`)
- Complete workflow: create → interact → terminate
- Multi-instance management
- Error recovery workflows
- Performance and stability testing
- Edge cases and boundary conditions
- Session persistence
- UI state validation

## Test Data & Fixtures

### Button Selectors
```typescript
const buttons = {
  prod: 'button:has-text("🚀 prod/claude")',
  skipPerms: 'button:has-text("⚡ skip-permissions")',
  skipPermsC: 'button:has-text("⚡ skip-permissions -c")', 
  skipPermsResume: 'button:has-text("↻ skip-permissions --resume")'
};
```

### Test Commands
```typescript
const testCommands = [
  'help',
  'hello',
  'what is 2 + 2?',
  'tell me about yourself'
];
```

## Helper Functions

The `test-helpers.ts` provides utilities:

### ClaudeTestHelper Class
- `waitForManagerReady()`: Ensure UI is loaded
- `createInstance(type)`: Create instance by button type
- `waitForRunningStatus()`: Wait for instance to be ready
- `selectInstance(id)`: Select instance for interaction
- `sendCommand(cmd)`: Send command and wait for response
- `terminateInstance(id)`: Clean termination
- `getInstances()`: Get current instance list
- `cleanupInstances()`: Clean up all instances
- `verifyNoErrors()`: Assert no error messages
- `mockApiResponse()`: Mock backend responses

### TestUtils Class  
- `generateTestCommand()`: Unique test commands
- `waitForCondition()`: Wait for custom conditions
- `retry()`: Retry operations with backoff

## Configuration

### Timeouts
- Instance creation: 30 seconds
- Status changes: 45 seconds
- Command responses: 25 seconds
- SSE connections: 15 seconds

### Browser Support
- Chromium (primary)
- Firefox
- WebKit/Safari
- Mobile Chrome (responsive testing)

## Debugging

### Screenshots
Auto-captured on test failures in `test-results/`

### Videos  
Recorded for failed tests when `--headed` mode used

### Debug Screenshots
```typescript
await helper.takeDebugScreenshot('test-state');
```

### Page State Logging
```typescript
await helper.logPageState();
```

## CI/CD Integration

### Environment Variables
- `CI=true`: Enables CI-specific settings
- `DEBUG=1`: Verbose debugging output

### Test Artifacts
- JUnit XML: `test-results/results.xml`
- JSON results: `test-results/results.json`  
- HTML report: `playwright-report/index.html`

## Common Issues & Solutions

### Backend Not Ready
```bash
# Ensure backend is running
cd /workspaces/agent-feed
node simple-backend.js
```

### Frontend Not Loading
```bash
# Start frontend dev server
cd /workspaces/agent-feed/frontend
npm run dev
```

### Instance Creation Timeouts
- Check Claude CLI is installed and accessible
- Verify working directory permissions
- Check system resources (CPU/Memory)

### SSE Connection Issues
- Verify firewall/proxy settings
- Check CORS configuration
- Test with HTTP polling fallback

### Test Flakiness
- Increase timeout values in `playwright.config.ts`
- Add more specific wait conditions
- Use `test.slow()` for resource-intensive tests

## Performance Benchmarks

Expected test execution times:
- Button validation: ~2-3 minutes per button
- SSE streaming: ~3-5 minutes per test
- Error handling: ~1-2 minutes per scenario
- Integration tests: ~5-10 minutes per workflow

Total suite runtime: ~30-45 minutes

## Maintenance

### Adding New Tests
1. Create `.spec.ts` file in appropriate category
2. Use `ClaudeTestHelper` for common operations
3. Follow existing naming conventions
4. Add cleanup in `afterEach` hooks
5. Update this README with new test descriptions

### Updating Configuration
- Modify `playwright.config.ts` for global settings
- Update `test-helpers.ts` for common utilities
- Adjust timeouts based on performance requirements

## Support

For issues with these tests:
1. Check backend and frontend are both running
2. Verify Claude CLI is properly installed
3. Review test logs and screenshots
4. Check network connectivity and permissions
5. Consult the main project documentation