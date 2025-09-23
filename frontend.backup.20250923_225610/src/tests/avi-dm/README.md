# Avi DM Phase 1 Test Suite - London School TDD

## Overview

This comprehensive test suite follows the **London School TDD** methodology to ensure robust testing of the Avi DM (Direct Messaging) Phase 1 transformation. The suite emphasizes behavior verification, interaction testing, and mock-driven development.

## 🏗️ Test Architecture

### London School TDD Principles Applied

1. **Outside-In Development**: Tests start from user behavior and work inward to implementation details
2. **Mock-Driven Development**: Heavy use of mocks to isolate units and define contracts
3. **Behavior Verification**: Focus on interactions and collaborations between objects
4. **Contract Definition**: Clear interfaces established through mock expectations

## 📂 Test Structure

```
src/tests/avi-dm/
├── AviDirectChat.test.tsx              # Component behavior tests
├── AviChatInterface.integration.test.tsx  # Integration tests
├── AviPersonality.test.tsx             # Personality module tests
├── WebSocketCommunication.test.tsx     # Real-time communication tests
├── ErrorHandling.test.tsx              # Error scenarios & edge cases
├── StateManagement.test.tsx            # Component lifecycle & state
├── UserWorkflowIntegration.test.tsx    # End-to-end user journeys
└── README.md                           # This documentation

Supporting Infrastructure:
../setup/
├── jest-setup.ts                       # Global test setup
├── global-setup.js                     # Suite initialization
├── global-teardown.js                  # Suite cleanup & reporting
└── test-sequencer.js                   # Test execution ordering

../mocks/
├── avi-dm-service.mock.ts              # AviDMService mock
├── server.ts                           # MSW API mocking
└── fileMock.js                         # Static file mocks

../scripts/
└── run-tests.sh                        # Test execution script
```

## 🧪 Test Categories

### 1. Component Behavior Tests (`AviDirectChat.test.tsx`)
- **Focus**: UI component interactions and behavior
- **London School**: Tests how components collaborate with services
- **Coverage**: Agent selection, message composition, user interactions
- **Mocking**: Heavy use of service mocks to isolate component behavior

**Key Test Scenarios:**
```typescript
describe('Agent Selection Behavior', () => {
  it('should display available agents for selection initially')
  it('should filter agents based on search query')
  it('should handle agent selection and show conversation interface')
});

describe('Message Composition and Sending Behavior', () => {
  it('should handle message input and auto-resize textarea')
  it('should send message via API when send button is clicked')
  it('should prevent sending empty messages')
});
```

### 2. Integration Tests (`AviChatInterface.integration.test.tsx`)
- **Focus**: Service integration and Claude Code communication
- **London School**: Tests contracts between components and services
- **Coverage**: Service initialization, WebSocket connections, context management
- **Mocking**: Mock external dependencies while testing integration points

**Key Test Scenarios:**
```typescript
describe('Claude Code Service Integration', () => {
  it('should initialize service and establish connection when component mounts')
  it('should create session when starting conversation with agent')
  it('should inject project context when available')
});
```

### 3. Personality Module Tests (`AviPersonality.test.tsx`)
- **Focus**: Agent personality consistency and behavioral responses
- **London School**: Tests personality engine interactions and adaptations
- **Coverage**: Trait consistency, contextual adaptation, emotional intelligence
- **Mocking**: Mock personality engine with behavior verification

**Key Test Scenarios:**
```typescript
describe('Agent Personality Consistency', () => {
  it('should maintain consistent personality traits across interactions')
  it('should demonstrate different personality traits between agents')
  it('should adapt response style based on agent specialization')
});
```

### 4. WebSocket Communication Tests (`WebSocketCommunication.test.tsx`)
- **Focus**: Real-time communication patterns and reliability
- **London School**: Tests message serialization and connection management
- **Coverage**: Connection lifecycle, streaming responses, error handling
- **Mocking**: Comprehensive WebSocket mocking with event simulation

**Key Test Scenarios:**
```typescript
describe('WebSocket Connection Lifecycle', () => {
  it('should establish WebSocket connection when initializing service')
  it('should handle WebSocket disconnection and trigger reconnection')
  it('should implement connection heartbeat mechanism')
});
```

### 5. Error Handling Tests (`ErrorHandling.test.tsx`)
- **Focus**: Comprehensive error scenarios and edge cases
- **London School**: Tests error propagation and recovery behaviors
- **Coverage**: Network failures, API errors, input validation, graceful degradation
- **Mocking**: Error condition simulation and recovery verification

**Key Test Scenarios:**
```typescript
describe('Network and API Error Handling', () => {
  it('should handle network failures gracefully')
  it('should handle API timeout errors')
  it('should handle 429 Rate Limit errors with retry-after')
});
```

### 6. State Management Tests (`StateManagement.test.tsx`)
- **Focus**: Component internal state and lifecycle management
- **London School**: Tests state transitions and side effects
- **Coverage**: React hooks, refs, effect cleanup, memory management
- **Mocking**: Service dependencies with focus on state behavior

**Key Test Scenarios:**
```typescript
describe('Component Initialization and Mount Behavior', () => {
  it('should initialize with proper default state')
  it('should initialize refs correctly on mount')
  it('should handle prop changes correctly')
});
```

### 7. User Workflow Integration Tests (`UserWorkflowIntegration.test.tsx`)
- **Focus**: Complete user journeys and experience flows
- **London School**: Tests user behavior patterns and system responses
- **Coverage**: First-time users, expert workflows, mobile experience, accessibility
- **Mocking**: End-to-end mocking while preserving user behavior authenticity

**Key Test Scenarios:**
```typescript
describe('New User First-Time Experience', () => {
  it('should guide new user through complete DM workflow')
  it('should handle user discovering agent capabilities')
});
```

## 🚀 Running Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Ensure test script is executable
chmod +x ../scripts/run-tests.sh
```

### Test Commands

```bash
# Run all Avi DM tests with coverage
../scripts/run-tests.sh all

# Run specific test categories
../scripts/run-tests.sh unit
../scripts/run-tests.sh integration
../scripts/run-tests.sh service

# Development workflow
../scripts/run-tests.sh watch

# CI/CD pipeline
../scripts/run-tests.sh ci

# Performance testing
../scripts/run-tests.sh performance

# Validation and cleanup
../scripts/run-tests.sh validate
../scripts/run-tests.sh clean
```

### NPM Scripts (Alternative)
```bash
npm test -- --testPathPattern="avi-dm"           # Run all Avi DM tests
npm run test:watch -- --testPathPattern="avi-dm" # Watch mode for Avi DM
```

## 📊 Coverage Requirements

### Minimum Coverage Thresholds
- **Global**: 85% (branches, functions, lines, statements)
- **AviDMSection Component**: 85% all metrics
- **AviDMService**: 95% all metrics (critical service)

### Coverage Reports
- **HTML Report**: `coverage/lcov-report/index.html`
- **LCOV Format**: `coverage/lcov.info`
- **JSON Summary**: `coverage/coverage-summary.json`
- **JUnit XML**: `test-results/junit.xml`

## 🎯 London School TDD Workflow

### Red-Green-Refactor Cycle

1. **Red**: Write a failing test that describes the desired behavior
```typescript
it('should send message via API when send button is clicked', async () => {
  // Test fails because functionality doesn't exist yet
  expect(mockApiCall).toHaveBeenCalledWith(expectedData);
});
```

2. **Green**: Write minimal code to make the test pass
```typescript
const handleSendMessage = async () => {
  await mockApiCall(expectedData);
};
```

3. **Refactor**: Improve the code while keeping tests green
```typescript
const handleSendMessage = useCallback(async () => {
  const response = await apiService.sendMessage(message, options);
  onMessageSent?.(response.data);
}, [message, options, onMessageSent]);
```

### Mock-First Development

1. **Define Contracts**: Start with mock interfaces
2. **Test Interactions**: Verify how objects collaborate
3. **Implement Behavior**: Build functionality to satisfy contracts
4. **Validate Integration**: Ensure real implementations match mocks

## 🔧 Mock Strategy

### Service Mocking (`avi-dm-service.mock.ts`)
- **Purpose**: Isolate component behavior from service implementation
- **Approach**: Comprehensive mock with behavior verification
- **Features**: Event simulation, state management, error injection

**Example Mock Usage:**
```typescript
const mockAviService = createMockAviDMService();

// Verify service interaction
expect(mockAviService.sendMessage).toHaveBeenCalledWith(
  'Test message',
  expect.objectContaining({
    agentId: 'tech-reviewer'
  })
);
```

### API Mocking (`server.ts`)
- **Purpose**: Mock HTTP requests for integration testing
- **Approach**: MSW (Mock Service Worker) for realistic API responses
- **Features**: Success/error responses, rate limiting, realistic data

### WebSocket Mocking
- **Purpose**: Test real-time communication without actual connections
- **Approach**: Mock WebSocket with event simulation
- **Features**: Connection lifecycle, message streaming, error scenarios

## 📈 Performance Monitoring

### Test Performance Metrics
- **Execution Time**: Individual test timing and suite duration
- **Memory Usage**: Heap usage tracking and leak detection
- **Coverage Impact**: Performance cost of coverage collection
- **Parallel Execution**: Multi-worker test distribution

### Performance Thresholds
- **Individual Tests**: < 500ms average
- **Test Suite**: < 30s total execution
- **Memory Usage**: < 100MB peak during testing
- **Coverage Collection**: < 20% performance overhead

## 🌐 CI/CD Integration

### Continuous Integration
```yaml
# Example GitHub Actions workflow
- name: Run Avi DM Tests
  run: ./src/tests/scripts/run-tests.sh ci

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

### Quality Gates
- ✅ All tests must pass
- ✅ Coverage thresholds must be met
- ✅ No performance regressions
- ✅ Mock contracts must be validated

## 🛠️ Development Workflow

### Adding New Tests

1. **Identify Behavior**: What user/system behavior needs testing?
2. **Choose Test Type**: Unit, integration, or workflow test?
3. **Design Mocks**: What collaborators need to be mocked?
4. **Write Test**: Follow London School TDD principles
5. **Verify Coverage**: Ensure adequate test coverage

### Mock Development

1. **Analyze Dependencies**: What external dependencies exist?
2. **Define Contracts**: What interfaces need mocking?
3. **Create Mocks**: Implement mock with behavior verification
4. **Test Mocks**: Ensure mocks accurately represent real behavior

## 🎨 Best Practices

### London School TDD Guidelines

1. **Test Behavior, Not Implementation**: Focus on what the code does, not how
2. **Mock External Dependencies**: Isolate the unit under test
3. **Verify Interactions**: Check that objects collaborate correctly
4. **Start Outside-In**: Begin with user-facing behavior
5. **Keep Tests Fast**: Mock heavy operations and external calls

### Code Quality

1. **Descriptive Test Names**: Tests should read like specifications
2. **Single Responsibility**: Each test should verify one behavior
3. **Arrange-Act-Assert**: Clear test structure
4. **Mock Hygiene**: Clean up mocks between tests
5. **Error Scenarios**: Test both happy path and error conditions

## 🔍 Troubleshooting

### Common Issues

1. **Slow Tests**: Check for unmocked async operations
2. **Flaky Tests**: Look for timing issues and race conditions
3. **Low Coverage**: Identify untested branches and edge cases
4. **Mock Issues**: Ensure mocks accurately represent real behavior

### Debug Commands

```bash
# Run tests with detailed output
../scripts/run-tests.sh all --verbose

# Run single test file with debugging
npx jest AviDirectChat.test.tsx --verbose --no-coverage

# Check test performance
../scripts/run-tests.sh performance
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [London School TDD](https://github.com/testdouble/contributing-tests/wiki/London-school-TDD)
- [Mock Service Worker](https://mswjs.io/)

---

This test suite represents a comprehensive implementation of London School TDD principles for the Avi DM Phase 1 transformation, ensuring robust behavior verification and maintainable test code.