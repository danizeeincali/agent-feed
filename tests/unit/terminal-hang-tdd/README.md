# Terminal Hang Prevention - London School TDD Test Suite

## 🚨 CRITICAL: These Tests Are Designed to FAIL

This test suite implements **London School TDD** principles to create comprehensive failing tests that capture the current terminal hanging behavior in the codebase.

## 🎯 Testing Goal

**Create failing tests FIRST**, then implement fixes to make them pass. This follows the London School TDD approach:

1. ✅ **Red Phase**: Create failing tests (this suite)
2. 🔧 **Green Phase**: Implement minimal fixes to make tests pass  
3. 🔄 **Refactor Phase**: Improve the implementation while keeping tests green

## 📋 Test Suites

### 1. Terminal Responsiveness Test (`terminal-responsiveness.test.ts`)
- **Focus**: Terminal response timeouts and hanging detection
- **Expected Failures**: 6 tests
- **Key Areas**: Command response times, WebSocket acknowledgments, PTY health monitoring

### 2. WebSocket Message Flow Test (`websocket-message-flow.test.ts`)
- **Focus**: Bidirectional message flow and queue blocking
- **Expected Failures**: 6 tests  
- **Key Areas**: Frontend→Backend flow, Backend→Frontend responses, message timeouts

### 3. PTY Process State Test (`pty-process-state.test.ts`)
- **Focus**: PTY process blocking and state management
- **Expected Failures**: 6 tests
- **Key Areas**: Process blocking detection, recovery mechanisms, lifecycle management

### 4. Command Execution Flow Test (`command-execution-flow.test.ts`)
- **Focus**: "cd prod && claude --help" execution flow
- **Expected Failures**: 6 tests
- **Key Areas**: Chained commands, Claude CLI hanging, command interruption

### 5. Terminal Contracts Test (`terminal-contracts.test.ts`)
- **Focus**: Complete system integration contracts
- **Expected Failures**: 6 tests
- **Key Areas**: WebSocket-PTY contracts, error handling, state consistency

## 🎓 London School TDD Principles Applied

### 1. Mock All External Dependencies
```typescript
const mockWebSocket = {
  send: jest.fn(),
  onMessage: jest.fn(),
  // ... complete interface mocking
};
```

### 2. Test Interactions, Not Implementation
```typescript
expect(mockPtyProcess.write).toHaveBeenCalledWith(command);
expect(mockWebSocket.send).toHaveBeenCalledWith(response);
// Focus on HOW objects collaborate
```

### 3. Behavior Verification Through Mock Expectations
```typescript
// Verify the conversation between objects
expect(mockRepository.findByEmail).toHaveBeenCalledBefore(mockRepository.save);
expect(mockNotifier.sendWelcome).toHaveBeenCalledAfter(mockRepository.save);
```

### 4. Contract-Based Testing
```typescript
const expectedFlow = [
  { from: 'WebSocket', to: 'PTY', action: 'write' },
  { from: 'PTY', to: 'WebSocket', action: 'respond' }
];
// Verify complete interaction contracts
```

## 🚀 Running the Tests

### Run All Failing Tests
```bash
npm run run-failing-tests
```

### Run Individual Test Suites
```bash
npm test terminal-responsiveness.test.ts
npm test websocket-message-flow.test.ts  
npm test pty-process-state.test.ts
npm test command-execution-flow.test.ts
npm test terminal-contracts.test.ts
```

### Watch Mode for Development
```bash
npm run test:watch
```

### Generate Coverage Report
```bash
npm run test:coverage
```

## 📊 Expected Results

### Success Criteria (for failing tests)
- **Failure Rate**: 90-100% (tests should fail)
- **Timeout Detection**: Tests should capture hanging behavior
- **Mock Interactions**: Verify incomplete interaction chains
- **Contract Violations**: Detect broken collaboration patterns

### Test Output Analysis
The test runner (`run-failing-tests.ts`) provides detailed analysis:

```
🚨 TERMINAL HANG TDD - TEST RESULTS PROCESSOR
Total Tests: 30
Expected Failures: 30  
Actual Failures: 28
Hanging Detection Rate: 93.3%
✅ SUCCESS: Tests properly detect hanging behavior
```

## 🔧 Implementation Strategy

### Phase 1: Timeout Detection
Based on failing tests, implement:
- Command execution timeouts (5-second limit)
- PTY process health monitoring  
- WebSocket message acknowledgments
- Response timeout detection

### Phase 2: Recovery Mechanisms
- Process termination on timeout
- Session cleanup procedures
- WebSocket reconnection logic
- Error propagation and handling

### Phase 3: Flow Control
- Message queue management
- Backpressure mechanisms  
- Concurrent command prevention
- Deadlock detection

## 📄 Generated Reports

### Test Results
- `terminal-hang-test-report.json` - Detailed test results
- `terminal-hang-detailed-report.json` - Analysis and recommendations
- `test-report/` - HTML coverage reports

### Key Metrics
- Hang detection accuracy
- Mock interaction coverage
- Contract compliance rate
- Recovery mechanism effectiveness

## 🎯 Next Steps After Tests Fail

1. **Analyze Failing Tests**: Review which specific interactions fail
2. **Implement Minimal Fixes**: Add just enough code to make tests pass
3. **Re-run Tests**: Validate that fixes work correctly  
4. **Refactor**: Improve implementation while maintaining green tests
5. **Integration Testing**: Test with real terminal sessions

## 🤝 London School vs Detroit School

This suite follows **London School** TDD:
- ✅ Mock all collaborators
- ✅ Test interactions between objects
- ✅ Outside-in development approach
- ✅ Focus on behavior verification

**Detroit School** would:
- ❌ Test real objects where possible
- ❌ Focus on state verification
- ❌ Inside-out development approach

## 🛡️ Test Isolation

Each test is completely isolated:
- Fresh mocks for each test
- No shared state between tests
- Independent execution order
- Proper cleanup after each test

## 📋 Test Structure

```typescript
describe('Component Under Test', () => {
  // London School setup
  let mockDependency: MockType;
  
  beforeEach(() => {
    // Fresh mocks for each test
    mockDependency = createMock();
  });
  
  it('should collaborate with dependency - EXPECTED TO FAIL', () => {
    // Given: Setup mock expectations
    // When: Execute behavior
    // Then: Verify interactions (should fail)
  });
});
```

This test suite provides a solid foundation for implementing terminal hang fixes using proven London School TDD principles.