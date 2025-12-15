# TDD London School Test Suite for Claude Code Integration

This comprehensive test suite implements the **London School TDD approach** for testing Claude Code integration with extensive mocking and behavior verification.

## 🎯 London School TDD Principles

The London School (Mockist) approach focuses on:

- **Outside-In Development**: Start with acceptance tests and work inward
- **Behavior Verification**: Test interactions between objects, not state
- **Extensive Mocking**: Mock all collaborators to isolate the system under test
- **Contract Definition**: Use mocks to define clear interfaces
- **Interaction Testing**: Verify HOW objects collaborate

## 📂 Test Structure

```
tests/tdd-london-school/
├── contracts/           # Interface contracts for mocks
│   └── ClaudeProcessManagerContract.ts
├── mocks/              # Mock implementations with behavior verification
│   ├── ClaudeProcessManagerMock.ts
│   └── WebSocketMock.ts
├── unit/               # Unit tests with extensive mocking
│   ├── ClaudeInstanceManager.test.ts
│   ├── APIEndpointRouter.test.ts
│   ├── WebSocketEventStreaming.test.ts
│   ├── MessageHandlingService.test.ts
│   └── ErrorHandlingScenarios.test.ts
├── integration/        # Integration tests for workflows
│   └── ClaudeInstanceWorkflow.test.ts
├── acceptance/         # User-focused acceptance tests
│   └── UserWorkflowAcceptance.test.ts
└── config/             # Test configuration and utilities
    ├── jest.config.ts
    ├── jest.setup.ts
    ├── jest.globals.ts
    └── custom-serializers.ts
```

## 🚀 Running Tests

### Prerequisites

```bash
# Install dependencies
npm install --save-dev jest @jest/globals @types/jest ts-jest
npm install --save-dev jest-html-reporters jest-junit
```

### Test Commands

```bash
# Run all tests
npm run test:london-school

# Run specific test types
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:acceptance  # Acceptance tests only

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npx jest ClaudeInstanceManager.test.ts

# Run with debug output
TEST_DEBUG=true npm run test:london-school
```

## 📋 Test Coverage

### Unit Tests (5 test files)

1. **ClaudeInstanceManager.test.ts**:
   - Instance creation and lifecycle management
   - Message sending and response handling
   - Event subscription and cleanup
   - Error handling and recovery

2. **APIEndpointRouter.test.ts**:
   - HTTP endpoint routing and validation
   - Request/response handling
   - Security and permission checks
   - Error responses and status codes

3. **WebSocketEventStreaming.test.ts**:
   - WebSocket connection management
   - Event broadcasting and subscription
   - Server-Sent Events integration
   - Multi-user coordination

4. **MessageHandlingService.test.ts**:
   - Message validation and sanitization
   - Output stream processing
   - File operation requests
   - Asynchronous message handling

5. **ErrorHandlingScenarios.test.ts**:
   - Error classification and handling
   - Circuit breaker patterns
   - Retry mechanisms
   - Alert system integration

### Integration Tests

- **ClaudeInstanceWorkflow.test.ts**: End-to-end workflows combining multiple components

### Acceptance Tests

- **UserWorkflowAcceptance.test.ts**: User-story focused scenarios validating complete functionality

## 🔧 Key Features

### Mock Contracts

All mocks implement strict contracts defined in the `contracts/` directory:

```typescript
export interface ClaudeProcessManagerContract {
  createInstance(workspaceDir: string, config?: ClaudeInstanceConfig): Promise<ClaudeInstanceInfo>;
  sendInput(instanceId: string, input: string): Promise<MessageResponse>;
  // ... other methods
}
```

### Behavior Verification

Tests focus on verifying interactions rather than state:

```typescript
// London School approach
expect(mockClaudeManager.createInstance).toHaveBeenCalledWith(workspaceDir, config);
expect(mockWebSocket.subscribeToInstance).toHaveBeenCalledWith(instanceId, userId);
expect(mockClaudeManager.createInstance).toHaveBeenCalledBefore(mockClaudeManager.sendInput);
```

### Custom Jest Matchers

Extended Jest with London School-specific matchers:

- `toHaveBeenCalledBefore()` - Verify call ordering
- `toSatisfyContract()` - Contract compliance
- `toFollowCallSequence()` - Interaction sequences
- `toHaveInteracted()` - Interaction counting

### Mock Factories

Scenario-specific mock factories for different test cases:

```typescript
// Happy path mock
const happyMock = ClaudeProcessManagerMockFactory.createHappyPathMock();

// Failure scenario mock
const failingMock = ClaudeProcessManagerMockFactory.createFailingInstanceCreationMock();

// Performance testing mock
const slowMock = ClaudeProcessManagerMockFactory.createSlowResponseMock();
```

## 🎭 Test Scenarios Covered

### User Stories

1. **User can create Claude instances in /workspaces/agent-feed/prod**
   - ✅ Valid workspace directory acceptance
   - ✅ Invalid directory rejection
   - ✅ Configuration parameter handling

2. **User messages get real Claude responses (not templates)**
   - ✅ Message processing and response generation
   - ✅ Contextual response verification
   - ✅ Complex technical question handling

3. **File creation requests work properly**
   - ✅ File creation with specified content
   - ✅ Multiple file creation sequences
   - ✅ Nested directory file creation

4. **Permission prompts handled correctly**
   - ✅ Restricted path access blocking
   - ✅ System file protection
   - ✅ Workspace-relative path validation

### Edge Cases and Error Handling

- Network connection failures
- Claude instance crashes
- Memory exhaustion scenarios
- Permission denied errors
- Malformed input handling
- Concurrent user operations
- Resource cleanup failures

### Performance and Reliability

- Slow response handling
- Circuit breaker activation
- Retry mechanism testing
- Resource leak prevention
- Connection recovery

## 📊 Test Metrics

The test suite provides comprehensive metrics:

- **Interaction Coverage**: Verifies all expected collaborator interactions
- **Behavior Compliance**: Ensures objects follow expected behavior patterns
- **Contract Adherence**: Validates implementations satisfy defined contracts
- **Error Resilience**: Tests system behavior under failure conditions

### Coverage Thresholds

- **Branches**: 85%
- **Functions**: 90%
- **Lines**: 85%
- **Statements**: 85%

## 🛠️ Development Workflow

### Adding New Tests

1. **Define Contract** (if new component):
   ```typescript
   // contracts/NewComponentContract.ts
   export interface NewComponentContract {
     method(): Promise<Result>;
   }
   ```

2. **Create Mock**:
   ```typescript
   // mocks/NewComponentMock.ts
   export class NewComponentMock implements NewComponentContract {
     method = jest.fn();
     // Behavior verification methods
   }
   ```

3. **Write Unit Tests**:
   ```typescript
   // unit/NewComponent.test.ts
   describe('NewComponent', () => {
     it('should collaborate correctly with dependencies', () => {
       // London School behavior verification
     });
   });
   ```

### Test Development Guidelines

1. **Start with Acceptance Tests**: Define user stories first
2. **Mock All Collaborators**: Isolate the system under test
3. **Verify Interactions**: Focus on behavior, not state
4. **Test Error Scenarios**: Ensure robust error handling
5. **Clean Up Resources**: Prevent test pollution

## 🐛 Debugging Tests

### Debug Mode

```bash
TEST_DEBUG=true npm run test:london-school
```

### Verbose Output

```bash
npx jest --verbose --no-coverage
```

### Specific Test Debugging

```bash
# Run single test with full output
npx jest ClaudeInstanceManager.test.ts --verbose --no-cache
```

### Mock Inspection

Use the custom serializers to inspect mock states:

```typescript
console.log('Mock calls:', JSON.stringify(mockFunction.mock.calls, null, 2));
```

## 🔍 Best Practices

1. **Mock External Dependencies**: Never rely on real external services
2. **Verify Behavior**: Test HOW objects interact, not WHAT they contain
3. **Use Descriptive Test Names**: Clearly express expected behavior
4. **Isolate Tests**: Each test should be independent
5. **Clean Up**: Always reset mocks and clear state between tests

## 📈 Continuous Integration

The test suite is designed for CI/CD integration:

- **Fast Execution**: Mocked dependencies enable quick test runs
- **Deterministic Results**: No external dependencies ensure consistency
- **Detailed Reporting**: HTML and JUnit reports for CI systems
- **Coverage Tracking**: Automated coverage reporting and thresholds

## 🤝 Contributing

When adding new tests:

1. Follow the London School TDD principles
2. Add comprehensive behavior verification
3. Include both happy path and error scenarios
4. Update documentation and contracts as needed
5. Ensure all tests are deterministic and fast

---

**Remember**: The London School emphasizes testing the **conversation between objects** rather than their internal state. Focus on verifying that components collaborate correctly to achieve the desired behavior.