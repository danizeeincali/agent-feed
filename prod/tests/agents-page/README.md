# Agents Page Test Suite

## London School TDD Implementation

This comprehensive test suite implements the London School (mockist) approach to Test-Driven Development for the agents page functionality, providing complete test coverage with behavior-driven verification.

## Test Architecture

### 🧪 Testing Philosophy

- **Outside-In Development**: Start with user behavior and work inward to implementation
- **Mock-Driven Development**: Use mocks to define contracts and verify object collaborations  
- **Behavior Verification**: Focus on HOW objects interact, not just WHAT they contain
- **Contract Testing**: Establish clear interfaces through mock expectations

### 📁 Directory Structure

```
tests/agents-page/
├── unit/                     # Mock-driven unit tests
│   ├── agent-discovery.service.test.js
│   ├── agents-page.component.test.js
│   └── agent-card.component.test.js
├── integration/              # Service integration tests
│   ├── agent-discovery.integration.test.js
│   └── websocket.integration.test.js
├── e2e/                      # End-to-end user journeys
│   └── agent-discovery.e2e.test.js
├── performance/              # Load and performance tests
│   └── agent-discovery.performance.test.js
├── accessibility/            # WCAG 2.1 AA compliance
│   └── wcag-compliance.test.js
├── mocks/                    # Mock factories and utilities
│   ├── agent-discovery.mock.js
│   └── react-components.mock.js
└── utils/                    # Test utilities and setup
    ├── test-factories.js
    ├── test-setup.js
    └── global-setup.js
```

## Test Categories

### 🔧 Unit Tests (`/unit/`)

**London School Approach**: Mock all dependencies and verify object collaborations

- **Agent Discovery Service**: Mock file system, metadata parser, WebSocket
- **React Components**: Mock hooks, props, and child components
- **Agent Card Component**: Mock user interactions and parent callbacks

```javascript
// Example: Mock-first behavior verification
it('should notify parent component when agent is selected', () => {
  const mockOnSelect = jest.fn();
  const component = new AgentCard({ agent: testAgent, onSelect: mockOnSelect });
  
  component.handleClick();
  
  expect(mockOnSelect).toHaveBeenCalledWith(testAgent.id);
});
```

### 🔗 Integration Tests (`/integration/`)

**Service Collaboration**: Test how multiple services work together

- **Agent Discovery Integration**: File system → Metadata → WebSocket flow
- **WebSocket Integration**: Real-time communication patterns
- **Cache Integration**: Performance optimization verification

```javascript
// Example: Service collaboration verification
it('should execute complete discovery workflow', async () => {
  await integration.performFullDiscovery();

  // Verify collaboration sequence
  expect(mockFileSystem.scanAgentDirectory).toHaveBeenCalledBefore(
    mockMetadata.extractMetadata
  );
  expect(mockMetadata.extractMetadata).toHaveBeenCalledBefore(
    mockWebSocket.getAgentStatus
  );
});
```

### 🌐 E2E Tests (`/e2e/`)

**User Journey Testing**: Complete workflows from user perspective

- **Agent Discovery**: Load page, discover agents, display results
- **Search & Filter**: User interactions with filtering system
- **Real-time Updates**: WebSocket status change handling
- **Accessibility**: Keyboard navigation, screen reader support

### ⚡ Performance Tests (`/performance/`)

**Load and Scalability Testing**: Ensure system performs under load

- **Discovery Performance**: Time to discover and process agents
- **WebSocket Performance**: High-frequency event handling
- **Cache Performance**: Read/write operation benchmarks
- **Concurrent Load**: Multiple user simulation

### ♿ Accessibility Tests (`/accessibility/`)

**WCAG 2.1 AA Compliance**: Ensure universal access

- **Color Contrast**: Verify AA contrast ratios (4.5:1 normal, 3:1 large)
- **Keyboard Navigation**: Tab order, Enter/Space activation, Escape handling
- **ARIA Labels**: Descriptive labels for all interactive elements
- **Focus Management**: Proper focus trapping and restoration
- **Semantic Markup**: Appropriate HTML element usage

## Mock Factories

### 🏭 Agent Discovery Mocks (`/mocks/agent-discovery.mock.js`)

```javascript
// Behavior-driven mock creation
const mockDiscovery = AgentDiscoveryServiceMock.createWithDefaults();

// Verify collaboration patterns
mockDiscovery.verifyDiscoveryWorkflow();
mockDiscovery.verifyErrorHandling();
```

### ⚛️ React Component Mocks (`/mocks/react-components.mock.js`)

```javascript
// Component behavior verification
const mockAgentsPage = AgentsPageMock.createWithDefaults();
mockAgentsPage.verifyUserInteractions();
mockAgentsPage.verifySearchBehavior('personal');
```

### 🏗️ Test Data Factories (`/utils/test-factories.js`)

```javascript
// Realistic test data generation
const agent = AgentDataFactory.createPersonalTodosAgent({
  status: 'active',
  metrics: { performance: 0.95 }
});

const event = WebSocketEventFactory.createAgentStatusChange(agent.id, 'inactive');
```

## Running Tests

### 🚀 All Tests
```bash
npm run test:agents-page
```

### 🔧 Unit Tests Only
```bash
npm run test:agents-page:unit
```

### 🔗 Integration Tests Only
```bash
npm run test:agents-page:integration
```

### 🌐 E2E Tests Only
```bash
npm run test:agents-page:e2e
```

### ⚡ Performance Tests
```bash
npm run test:agents-page:performance
```

### ♿ Accessibility Tests
```bash
npm run test:agents-page:accessibility
```

### 📊 Coverage Report
```bash
npm run test:agents-page:coverage
```

### 👀 Watch Mode
```bash
npm run test:agents-page:watch
```

## Test Configuration

### Jest Configuration (`jest.agents-page.config.js`)
- High coverage thresholds (95%+)
- Mock-first approach settings
- Custom matchers for accessibility
- Performance test timeouts

### Playwright Configuration (`playwright.config.js`)
- Cross-browser testing (Chrome, Firefox, Safari)
- Mobile device simulation
- Accessibility testing mode
- Performance profiling

## Coverage Requirements

### 📈 Coverage Thresholds
- **Overall**: 95% lines, 95% functions, 90% branches
- **Agent Services**: 98% lines, 98% functions, 95% branches
- **React Components**: 95% lines, 95% functions, 90% branches

### 🎯 Quality Gates
- All tests must pass
- No accessibility violations (WCAG 2.1 AA)
- Performance benchmarks must be met
- Cross-browser compatibility verified

## London School TDD Principles

### 🎭 Mock Everything
- Mock all external dependencies
- Mock React hooks and context
- Mock WebSocket connections
- Mock file system operations

### 🤝 Verify Collaborations
```javascript
// Not just: "Does it work?"
expect(result.status).toBe('active');

// But also: "How does it work?"
expect(mockWebSocket.requestStatus).toHaveBeenCalledWith(agentId);
expect(mockFileSystem.scanDirectory).toHaveBeenCalledBefore(
  mockMetadata.parseMetadata
);
```

### 📋 Contract Definition
```javascript
// Define clear interfaces through mock expectations
const agentServiceContract = {
  discoverAgents: {
    input: { directory: 'string' },
    output: { agents: 'array', timestamp: 'string' },
    collaborators: ['FileSystem', 'MetadataParser', 'WebSocket']
  }
};
```

### 🔄 Red-Green-Refactor
1. **Red**: Write failing test that defines behavior
2. **Green**: Write minimal code to pass test
3. **Refactor**: Improve design while keeping tests green

## Best Practices

### ✅ Do's
- Start with user behavior (outside-in)
- Mock all dependencies in unit tests
- Verify object interactions, not just outcomes
- Use descriptive test names that explain behavior
- Create realistic test data with factories
- Test error conditions and edge cases
- Maintain high test coverage (95%+)

### ❌ Don'ts
- Don't test implementation details
- Don't use real external services in unit tests
- Don't ignore accessibility requirements
- Don't skip performance testing
- Don't forget to test error scenarios
- Don't write tests without clear behavior specification

## Contributing

### 🔧 Adding New Tests
1. Follow London School TDD approach
2. Start with mock expectations
3. Write descriptive test names
4. Use provided mock factories
5. Verify both success and failure scenarios
6. Update coverage thresholds if needed

### 📝 Test Naming Convention
```javascript
describe('Component/Service Name', () => {
  describe('when specific condition occurs', () => {
    it('should perform expected behavior', () => {
      // Arrange: Setup mocks and test data
      // Act: Execute the behavior being tested
      // Assert: Verify collaborations and outcomes
    });
  });
});
```

### 🧪 Mock Creation Pattern
```javascript
// 1. Create mock with behavior expectations
const mockService = createMockService();
mockService.method.mockResolvedValue(expectedResult);

// 2. Execute system under test
await systemUnderTest.performAction();

// 3. Verify collaborations occurred
expect(mockService.method).toHaveBeenCalledWith(expectedInput);
expect(mockService.method).toHaveBeenCalledBefore(mockOtherService.method);
```

## Continuous Integration

This test suite is designed for CI/CD pipelines with:

- **Parallel Execution**: Tests run in parallel for speed
- **Browser Grid**: Cross-browser testing in CI
- **Coverage Reporting**: Automated coverage analysis
- **Performance Monitoring**: Performance regression detection
- **Accessibility Auditing**: Automated accessibility validation

## Support

For questions about testing patterns or London School TDD implementation:

1. Check existing test examples in this directory
2. Review mock factory documentation
3. Consult London School TDD principles above
4. Create issue for complex testing scenarios

---

**Remember**: In London School TDD, we focus on **how objects collaborate** rather than **what they contain**. Every test should verify the conversations between objects and ensure they work together correctly to deliver user value.