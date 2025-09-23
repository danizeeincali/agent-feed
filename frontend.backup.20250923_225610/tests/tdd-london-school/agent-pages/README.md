# TDD London School - Agent Pages Test Suite

## Overview

Comprehensive Test-Driven Development suite following the **London School (mockist) methodology** for agent dynamic pages. This test suite emphasizes **outside-in development**, **mock-driven contracts**, and **behavior verification** through interaction testing.

## Architecture

```
frontend/tests/tdd-london-school/agent-pages/
├── unit/                     # Unit tests with mock-driven approach
│   ├── page-loading.test.js  # Page loading workflow tests
│   ├── api-endpoints.test.js # API behavior verification
│   └── component-validation.test.js # Component interaction tests
├── integration/              # Integration workflow tests
│   ├── frontend-backend-flow.test.js # End-to-end integration
│   ├── error-boundary.test.js        # Error handling workflows
│   └── component-registry.test.js    # Registry lifecycle tests
├── mocks/                    # Contract-driven mocks
│   └── index.js             # Swarm mock definitions
├── helpers/                  # Test utilities
│   ├── test-setup.js        # Jest configuration
│   └── mock-factories.js    # Advanced mock factories
├── jest.config.js           # Jest configuration for London School
├── run-tests.sh            # Test runner script
└── README.md               # This file
```

## London School TDD Principles

### 1. Mock-First Development
- **Define contracts through mock expectations**
- **Focus on object collaborations**
- **Verify interactions, not implementations**

### 2. Outside-In Approach
- **Start with acceptance criteria**
- **Drive implementation from user behavior**
- **Work from UI down to domain logic**

### 3. Behavior Verification
- **Test HOW objects collaborate**
- **Mock all external dependencies**
- **Verify conversation patterns**

## Test Categories

### Unit Tests (`/unit/`)

#### Page Loading Tests
- **Focus**: Page loading workflow coordination
- **Mocks**: File system, API client, component registry
- **Verifies**: 
  - Profile page loading contract
  - Dashboard page loading workflow  
  - Task manager page component registration
  - Error handling for missing pages

#### API Endpoint Tests
- **Focus**: API service behavior verification
- **Mocks**: HTTP client, error handlers
- **Verifies**:
  - GET `/api/agent-pages/:id` interactions
  - POST `/api/agent-pages` creation workflow
  - PUT/DELETE endpoint contracts
  - Error propagation patterns

#### Component Validation Tests
- **Focus**: Component lifecycle and validation
- **Mocks**: Component registry, lifecycle managers
- **Verifies**:
  - Component registration workflows
  - Prop validation contracts
  - Compatibility checking
  - Lifecycle event coordination

### Integration Tests (`/integration/`)

#### Frontend-Backend Flow Tests
- **Focus**: Complete integration workflows
- **Mocks**: All service layers with realistic behavior
- **Verifies**:
  - Authentication → Authorization → Data Fetch → Render
  - Data transformation between layers
  - Caching integration
  - Performance monitoring

#### Error Boundary Tests  
- **Focus**: Error handling coordination
- **Mocks**: Error services, recovery strategies
- **Verifies**:
  - Error boundary activation
  - Error categorization and logging
  - Recovery attempt workflows
  - User notification coordination

#### Component Registry Tests
- **Focus**: Registry lifecycle management
- **Mocks**: Registry services, dependency resolvers
- **Verifies**:
  - Component registration/unregistration
  - Dependency resolution
  - Hot reload workflows
  - Performance monitoring

## Mock Strategy

### Contract-Driven Mocks
All mocks are created with **explicit contracts** that define:
- **Expected methods** and their signatures
- **Default behaviors** for successful operations
- **Error scenarios** and failure modes
- **Interaction sequences** and dependencies

### Swarm Mock Coordination
Mocks are designed to work together as a **coordinated swarm**:
- **File System Mock** ↔ **API Client Mock**
- **Component Registry Mock** ↔ **Lifecycle Manager Mock**  
- **Network Service Mock** ↔ **Performance Monitor Mock**

### Mock Verification
Every test includes **contract verification**:
- Ensure all expected methods exist
- Verify method signatures match contracts
- Check interaction sequences
- Validate behavior consistency

## Running Tests

### Quick Start
```bash
# Run all tests
./run-tests.sh

# Run specific test suite
npm test -- --testPathPattern="unit/"
npm test -- --testPathPattern="integration/"
```

### Advanced Usage
```bash
# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Run specific test file
npm test page-loading.test.js

# Debug tests
npm test -- --detectOpenHandles --verbose
```

### CI/CD Integration
```bash
# Production test run
npm run test:tdd-london-school

# Generate reports
./run-tests.sh > test-output.log 2>&1
```

## Test Configuration

### Jest Configuration (`jest.config.js`)
- **Test Environment**: jsdom
- **Setup Files**: Custom test setup with mock utilities
- **Coverage Thresholds**: 85% for all metrics
- **Mock Strategy**: Clear mocks between tests
- **Timeout**: 10 seconds for integration tests

### Coverage Requirements
- **Lines**: 85%
- **Functions**: 85%  
- **Branches**: 85%
- **Statements**: 85%

## Mock Factories

### Advanced Mock Factory (`mock-factories.js`)
Provides contract-driven mock creation:

```javascript
import { mockFactory } from './helpers/mock-factories';

// Create contract-enforced mock
const apiMock = mockFactory.createMock('ApiService', {
  getPage: { defaultResolve: mockPageData },
  createPage: { defaultResolve: { success: true } }
});

// Create realistic agent page mock
const pageData = mockFactory.createAgentPageMock('profile', {
  metadata: { version: '2.0.0' }
});

// Verify contracts are maintained
const verification = mockFactory.verifyMockContracts('ApiService');
expect(verification.valid).toBe(true);
```

## Test Examples

### Unit Test Example
```javascript
describe('Page Loading Contract', () => {
  it('should coordinate profile page loading workflow', async () => {
    // Arrange: Define expected interactions
    const pageId = 'profile';
    swarmMocks.fileSystem.existsSync.mockReturnValue(true);
    swarmMocks.apiClient.get.mockResolvedValue(profileData);
    
    // Act: Execute workflow
    await pageLoader.loadPage(pageId, swarmMocks.apiClient, swarmMocks.fileSystem);
    
    // Assert: Verify interaction sequence (London School focus)
    expect(swarmMocks.fileSystem.existsSync).toHaveBeenCalledBefore(
      swarmMocks.apiClient.get
    );
    expect(swarmMocks.apiClient.get).toHaveBeenCalledWith(`/api/agent-pages/${pageId}`);
  });
});
```

### Integration Test Example
```javascript
describe('Frontend-Backend Integration', () => {
  it('should coordinate complete loading workflow', async () => {
    // Arrange: Full integration setup
    mockPageOrchestrator.loadAgentPage.mockImplementation(async (id, user) => {
      await integrationMocks.middlewareService.authenticate(user);
      const data = await integrationMocks.backendService.fetchPageData(id);
      return await integrationMocks.frontendService.renderPage(data);
    });
    
    // Act: Execute integration
    await mockPageOrchestrator.loadAgentPage('profile', { id: 'user-123' });
    
    // Assert: Verify coordination sequence
    expect(integrationMocks.middlewareService.authenticate).toHaveBeenCalledBefore(
      integrationMocks.backendService.fetchPageData
    );
  });
});
```

## Best Practices

### 1. Mock Design
- **Keep mocks simple** and focused on behavior
- **Define explicit contracts** for all mock interactions
- **Avoid over-mocking** internal implementation details
- **Use realistic data** in mock responses

### 2. Test Structure
- **Arrange-Act-Assert** pattern consistently
- **Focus on interactions** between objects
- **Verify conversation patterns** not internal state
- **Use descriptive test names** that explain behavior

### 3. Contract Verification
- **Always verify** mock contracts are satisfied
- **Check interaction sequences** for proper coordination
- **Validate** that mocks represent realistic behavior
- **Maintain** contract consistency across tests

### 4. Swarm Coordination
- **Design mocks** to work together as a coordinated system
- **Share contracts** between related mock objects  
- **Verify** that mock interactions represent real-world coordination
- **Test** failure scenarios and error propagation

## Troubleshooting

### Common Issues

#### Mock Contract Violations
```bash
# Error: Mock method not defined
# Solution: Update mock contract definition
const apiMock = mockFactory.createMock('ApiService', {
  missingMethod: { defaultResolve: mockData }
});
```

#### Interaction Sequence Failures
```bash
# Error: Method called in wrong order
# Solution: Check mock setup and interaction expectations
expect(mockA.method).toHaveBeenCalledBefore(mockB.method);
```

#### Test Timeout Issues
```bash
# Error: Test exceeded 10 second timeout
# Solution: Check for unresolved promises or infinite loops
jest.setTimeout(15000); // Increase timeout if needed
```

### Debug Commands
```bash
# Run with detailed output
npm test -- --verbose --detectOpenHandles

# Run single test with debugging
npm test -- --testNamePattern="specific test name" --verbose

# Check coverage gaps
npm test -- --coverage --coverageReporters=text
```

## Contributing

### Adding New Tests
1. **Follow London School principles** - mock dependencies, verify interactions
2. **Use existing mock factories** for consistency
3. **Add contract verification** for all new mocks
4. **Update documentation** with new test patterns

### Mock Contract Updates
1. **Update contract definitions** in mock factories
2. **Run full test suite** to check for breaking changes
3. **Update integration tests** that depend on changed contracts
4. **Document contract changes** in commit messages

---

**Remember**: The London School emphasizes **behavior verification through interaction testing**. Focus on **how objects collaborate** rather than **what they contain**.