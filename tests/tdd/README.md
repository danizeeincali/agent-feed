# TDD London School: No-Mock Data Rule Test Suite

This comprehensive test suite implements **London School TDD methodology** to ensure strict adherence to the **no-mock data rule** in the page-builder system.

## 🎯 Test Philosophy

### London School TDD Principles
- **Outside-In Development**: Test user behavior down to implementation details
- **Mock-Driven Development**: Use mocks to isolate units and define contracts
- **Behavior Verification**: Focus on interactions between objects, not state
- **Contract Definition**: Establish clear interfaces through mock expectations

### No-Mock Data Rule Requirements
1. Page-builder must query agent data first
2. Page-builder must use real data if available
3. Page-builder must create empty states if no data
4. Page-builder must NEVER generate mock data
5. Agents must provide data readiness status

## 📁 Test Structure

```
tests/tdd/
├── no-mock-data-rule.test.js      # Main test suite
├── jest.config.js                 # Jest configuration for London School testing
├── test-setup.js                  # Global test setup and custom matchers
├── london-school-processor.js     # Custom test results processor
├── run-no-mock-tests.sh          # Comprehensive test runner script
├── README.md                      # This documentation
└── reports/                       # Generated test reports
    ├── london-school-metrics.json
    ├── behavior-metrics.json
    ├── coverage/
    └── html/
```

## 🧪 Test Categories

### 1. Data Query Behavior Verification
Tests that verify page-builder queries agent data services before any page creation:
- Query order verification using mock interaction tracking
- Contract establishment before data retrieval
- Data readiness status verification

### 2. Real Data Usage Verification
Tests that ensure real agent data is used when available:
- Real data detection and usage patterns
- Multi-agent data coordination
- Data authenticity verification through agent contracts

### 3. Empty State Handling Verification
Tests for proper empty state creation when no agent data exists:
- Empty state initialization when no data available
- Agent-guided empty state setup
- Data availability monitoring during empty state

### 4. Mock Data Prevention Enforcement
Tests that strictly prevent any mock data generation:
- Mock data detection and rejection
- Contract enforcement for no-mock rule
- Circuit breaker for repeated mock data attempts

### 5. Agent Data Readiness Status API
Tests for proper integration with agent readiness systems:
- Data readiness status querying and respect
- Multi-agent readiness optimization
- Readiness authenticity validation

### 6. Service Contract Definitions and Interactions
Tests for clear contracts between page-builder and agents:
- Service contract establishment
- Contract compliance monitoring during operations

## 🚀 Running Tests

### Quick Start
```bash
# Run all no-mock data rule tests
./run-no-mock-tests.sh

# Or using npm if configured
npm run test:no-mock-rule
```

### Category-Specific Testing
```bash
# Data query behavior tests
./run-no-mock-tests.sh data-query

# Real data usage tests
./run-no-mock-tests.sh real-data

# Empty state handling tests
./run-no-mock-tests.sh empty-state

# Mock data prevention tests
./run-no-mock-tests.sh mock-prevention

# Agent data readiness tests
./run-no-mock-tests.sh readiness

# Service contract tests
./run-no-mock-tests.sh contracts
```

### Direct Jest Execution
```bash
# Run with Jest directly
jest --config=jest.config.js

# Run specific test patterns
jest --testNamePattern="Data Query Behavior"
jest --testNamePattern="Mock Data Prevention"
```

## 📊 Test Reports

### London School Metrics Report
- **Behavior verification coverage**: Percentage of tests focusing on object behavior
- **Interaction testing coverage**: Percentage of tests verifying object interactions  
- **Contract testing coverage**: Percentage of tests defining and verifying contracts
- **Mock data prevention coverage**: Percentage of tests enforcing no-mock rule

### Behavior Metrics
- **Mock interaction tracking**: Total mocks used and their verification status
- **Contract compliance**: Number of contract-compliant mock interactions
- **Collaboration patterns**: Verification of expected object collaboration sequences

### Coverage Reports
- **Standard code coverage**: Lines, functions, branches, statements
- **Behavior coverage**: Custom metrics for London School methodology
- **Interaction coverage**: Coverage of inter-object communications

## 🔧 Custom Matchers

### London School TDD Matchers
```javascript
// Verify call order (interaction testing)
expect(mockA).toHaveBeenCalledBefore(mockB);

// Verify contract compliance
expect(mockService).toHaveBeenCalledWithContract({
  realDataOnly: true,
  mockDataProhibited: true
});

// Verify collaboration patterns
expect([mockA, mockB, mockC]).toFollowCollaborationPattern({
  order: 'sequential'
});

// Verify no mock data patterns
expect(testData).toNotContainMockDataPatterns();
```

### Utility Functions
```javascript
// Create London School compliant mocks
const mock = createLondonSchoolMock('ServiceName', {
  method1: jest.fn(),
  method2: jest.fn()
});

// Verify mock interactions
verifyMockInteractions([mockA, mockB], { order: 'sequential' });

// Expect contract compliance
expectContractCompliance(mock, { dataQuality: 'real_only' });
```

## 📈 Success Criteria

### Test Coverage Targets
- **100% line coverage** for no-mock data rule enforcement code
- **≥80% behavior verification tests** of total test suite
- **≥60% interaction testing coverage** for object collaborations
- **≥40% contract testing coverage** for service boundaries

### London School Compliance
- **All tests must use mocks** for external dependencies
- **All tests must verify behavior**, not just state
- **All tests must define contracts** through mock expectations
- **Zero tolerance for mock data** in any test scenario

### No-Mock Data Rule Compliance
- **100% real data usage** when agent data is available
- **100% empty state creation** when no agent data exists
- **0% mock data generation** under any circumstances
- **100% agent data readiness respect** before page creation

## 🛠️ Development Workflow

### Adding New Tests
1. Follow London School TDD principles
2. Use provided mock utilities and custom matchers
3. Focus on behavior verification over state testing
4. Ensure all new tests contribute to no-mock rule enforcement

### Test Categories
When adding tests, categorize them appropriately:
- **Data Query Behavior**: Tests verifying data querying patterns
- **Real Data Usage**: Tests ensuring real data utilization
- **Empty State Handling**: Tests for no-data scenarios
- **Mock Data Prevention**: Tests blocking mock data generation
- **Data Readiness**: Tests for agent readiness integration
- **Service Contracts**: Tests defining service boundaries

### Mock Guidelines
- **Always use mocks** for external dependencies
- **Verify interactions** rather than return values
- **Define clear contracts** through mock expectations
- **Track call order** for interaction testing
- **Never mock the system under test**

## 🐛 Debugging

### Common Issues
1. **Mock call order failures**: Use custom `toHaveBeenCalledBefore` matcher
2. **Contract compliance failures**: Check mock arguments with `toHaveBeenCalledWithContract`
3. **Mock data detection**: Ensure test data doesn't contain mock patterns
4. **Coverage gaps**: Review London School metrics report for missing behavior tests

### Debug Tools
- **Verbose Jest output**: See detailed mock interaction logs
- **Custom test processor**: Review London School specific metrics
- **Mock interaction tracking**: Analyze call order and arguments
- **Contract validation**: Verify mock expectations match contracts

## 📚 References

### London School TDD
- Focus on object interactions and collaborations
- Use mocks to define contracts between objects
- Test behavior, not implementation details
- Drive design through test-first development

### No-Mock Data Rule
- Never generate synthetic or example data
- Always query real agent data sources first
- Create appropriate empty states when no data exists
- Maintain strict separation between real and mock data

---

**Generated with TDD London School methodology for comprehensive no-mock data rule compliance.**