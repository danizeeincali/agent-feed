# Agent Profile TDD Test Suite - London School Approach

Comprehensive Test-Driven Development suite for the dynamic agent pages feature using London School (mockist) methodology.

## 🎯 London School TDD Philosophy

This test suite follows the London School approach, which emphasizes:

- **Outside-In Development**: Start with acceptance tests and work inward
- **Mock-Driven Development**: Use mocks to define contracts between objects
- **Behavior Verification**: Focus on how objects collaborate rather than their state
- **Interaction Testing**: Verify the conversations between components
- **Contract-First Design**: Define interfaces through mock expectations

## 📁 Test Structure

```
tests/agent-profile-tdd/
├── unit/                           # Component-level mock-driven tests
│   ├── AgentProfile.test.tsx      # AgentProfile component behavior
│   └── AgentManager.test.tsx      # AgentManager CRUD operations
├── integration/                    # Component interaction tests
│   └── agent-navigation.test.tsx  # Navigation flow testing
├── e2e/                           # End-to-end workflow tests
│   └── agent-customization-workflow.spec.ts
├── contracts/                     # Contract verification tests
│   └── agent-behavior.test.ts    # Behavioral contract testing
├── mocks/                         # Mock implementations
│   ├── agent-api.mock.ts         # Agent API mock with controlled behavior
│   └── websocket.mock.ts         # WebSocket mock for real-time features
├── helpers/                       # Test utilities and coordination
│   ├── test-setup.ts             # Jest setup with London School config
│   ├── swarm-coordinator.ts      # Swarm test coordination
│   └── london-school-sequencer.js # Test execution sequencing
├── fixtures/                      # Test data and scenarios
└── jest.config.js                # London School Jest configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- Jest 29+
- React Testing Library
- Playwright (for E2E tests)

### Installation

```bash
# Install dependencies
npm install

# Run the complete TDD suite
npm run test:london-school

# Run specific test categories
npm run test:contracts
npm run test:unit
npm run test:integration
npm run test:e2e
```

## 🧪 Test Categories

### 1. Contract Tests (`/contracts/`)

**Purpose**: Define and verify behavioral contracts between components.

**Key Features**:
- Interaction sequence verification
- Contract compliance checking  
- Cross-component behavior validation
- Swarm coordination patterns

**Example**:
```typescript
const AGENT_LIFECYCLE_CONTRACT = {
  componentName: 'AgentLifecycle',
  dependencies: ['AgentAPI', 'StateManager', 'EventEmitter'],
  interactions: [
    { dependency: 'AgentAPI', method: 'createAgent', callOrder: 1 },
    { dependency: 'StateManager', method: 'updateState', callOrder: 2 },
    { dependency: 'EventEmitter', method: 'emit', callOrder: 3 }
  ]
};
```

### 2. Unit Tests (`/unit/`)

**Purpose**: Test individual components in isolation using comprehensive mocking.

**Key Features**:
- Component behavior verification
- Mock interaction testing
- State management validation
- Error handling scenarios
- WebSocket integration mocking

**Focus Areas**:
- AgentProfile component interactions
- AgentManager CRUD workflows
- Real-time update handling
- Navigation behavior
- Form validation and submission

### 3. Integration Tests (`/integration/`)

**Purpose**: Test interactions between multiple components.

**Key Features**:
- Navigation flow testing
- Cross-component communication
- State synchronization
- API coordination
- Error propagation

### 4. End-to-End Tests (`/e2e/`)

**Purpose**: Complete user journey testing with Playwright.

**Key Features**:
- Full agent customization workflows
- Multi-step user interactions
- Real browser environment testing
- Accessibility verification
- Performance validation

### 5. Mocks (`/mocks/`)

**Purpose**: Provide controlled, predictable behavior for dependencies.

**Key Features**:
- Agent API mock with CRUD operations
- WebSocket mock with real-time simulation
- Controllable failure scenarios
- Latency simulation
- Interaction tracking

## 🔧 London School TDD Workflow

### 1. Write the Acceptance Test

Start with the outside behavior you want:

```typescript
it('should create agent with template and show success', async () => {
  // Arrange: Setup mocks with expected interactions
  mockAgentApi.expectCreate(templateData);
  mockNotification.expectSuccess();
  
  // Act: Perform user action
  await user.createAgentFromTemplate('Research Agent');
  
  // Assert: Verify collaborations occurred
  expect(mockAgentApi).toHaveBeenCalledWith(expectedData);
  expect(mockNotification.showSuccess).toHaveBeenCalled();
});
```

### 2. Define Component Contracts

Define how objects should collaborate:

```typescript
const componentContract = {
  dependencies: ['ApiService', 'NotificationService'],
  interactions: [
    { service: 'ApiService', method: 'post', expectation: 'creates agent' },
    { service: 'NotificationService', method: 'success', expectation: 'shows confirmation' }
  ]
};
```

### 3. Implement with Mocks

Use mocks to drive the design:

```typescript
class AgentCreator {
  constructor(private api: ApiService, private notifier: NotificationService) {}
  
  async create(data: AgentData) {
    const result = await this.api.createAgent(data);
    this.notifier.showSuccess('Agent created!');
    return result;
  }
}
```

### 4. Verify Interactions

Test the conversations, not the implementation:

```typescript
expect(mockApi.createAgent).toHaveBeenCalledWith(expectedData);
expect(mockApi.createAgent).toHaveBeenCalledBefore(mockNotifier.showSuccess);
```

## 🤝 Swarm Test Coordination

This test suite includes swarm coordination patterns for collaborative testing:

### Contract Sharing
```typescript
// Register contracts for other agents
swarmCoordinator.registerContract(AGENT_PROFILE_CONTRACT);

// Verify contract compliance
const violations = swarmCoordinator.verifyContract('AgentProfile');
```

### Result Sharing
```typescript
// Share test results with swarm
swarmCoordinator.shareResultsWithSwarm();

// Get insights from other agents
const insights = swarmCoordinator.getSwarmInsights();
```

## 📊 Coverage and Reporting

### Coverage Focus

London School prioritizes **behavior coverage** over line coverage:

- **Interaction Coverage**: Are all collaborations tested?
- **Contract Coverage**: Are all defined contracts verified?
- **Scenario Coverage**: Are all user scenarios covered?
- **Error Path Coverage**: Are all failure modes tested?

### Reporting

```bash
# Generate comprehensive reports
npm run test:coverage

# View HTML coverage report
open coverage/london-school/index.html

# View contract compliance report
open coverage/contracts/contracts-report.html
```

## 🎨 Custom Matchers

The suite includes London School-specific Jest matchers:

```typescript
// Verify call order
expect(mockService.method1).toHaveBeenCalledBefore(mockService.method2);

// Verify interaction contracts
expect(mockObject).toHaveInteractionContract(expectedContract);

// Verify collaboration patterns
expect(componentInstance).toCollaborateWith([mockA, mockB, mockC]);
```

## 🔍 Debugging Tests

### Mock Inspection
```typescript
// View all mock interactions
console.log(mockAgentApi.getCallHistory());

// Inspect WebSocket subscriptions
console.log(mockWebSocket.getSubscriptions());

// Check contract violations
console.log(swarmCoordinator.verifyContract('ComponentName'));
```

### Test Sequencing

Tests run in London School order:
1. Contracts (define expected behavior)
2. Unit (mock-driven component tests)
3. Integration (component interactions)
4. E2E (complete user journeys)

## 🚦 CI/CD Integration

```yaml
# .github/workflows/london-school-tdd.yml
name: London School TDD
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:contracts
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e
      - run: npm run test:coverage
```

## 🎯 Best Practices

### Mock Strategy
- **Mock at boundaries**: Mock external services, not internal logic
- **Verify interactions**: Focus on how objects communicate
- **Keep mocks simple**: Avoid complex mock logic
- **Use real objects when possible**: Only mock what you need to isolate

### Test Organization
- **One concept per test**: Each test should verify one behavior
- **Descriptive names**: Test names should describe the behavior being verified
- **Arrange-Act-Assert**: Clear test structure
- **Fast feedback**: Tests should run quickly and provide immediate feedback

### Contract Design
- **Minimal interfaces**: Keep contracts as simple as possible
- **Stable contracts**: Avoid changing contracts frequently
- **Clear expectations**: Each interaction should have a clear purpose
- **Fail fast**: Detect contract violations early

## 📚 Resources

- [Growing Object-Oriented Software, Guided by Tests](http://www.growing-object-oriented-software.com/) - The definitive London School TDD book
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Testing](https://playwright.dev/docs/intro)

## 🤝 Contributing

When contributing to this test suite:

1. **Follow London School principles**: Mock external dependencies, verify interactions
2. **Update contracts**: If you change component interfaces, update the contracts
3. **Add swarm coordination**: New tests should integrate with swarm patterns
4. **Maintain test order**: Ensure new tests fit the London School sequencing
5. **Document behaviors**: Clearly describe what behavior is being tested

## 📈 Metrics and Analytics

The test suite tracks:

- Contract compliance rates
- Mock interaction patterns  
- Test execution performance
- Behavior coverage metrics
- Swarm coordination effectiveness

View analytics with:
```bash
npm run test:analytics
```