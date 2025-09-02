# TDD London School: Claude Instance Lifecycle Testing

## Overview

This test suite implements **Test-Driven Development using the London School (mockist) approach** to comprehensively test Claude instance lifecycle management and prevent the identified resource leak bugs.

## London School Methodology

The London School of TDD emphasizes:

1. **Outside-In Development**: Start with user behavior, work down to implementation
2. **Mock-Driven Development**: Use mocks to isolate units and define contracts
3. **Behavior Verification**: Focus on **HOW** objects collaborate, not **WHAT** they contain
4. **Interaction Testing**: Test the conversations between objects
5. **Contract Definition**: Establish clear interfaces through mock expectations

## Problem Statement

The current Claude instance lifecycle has several critical bugs:

- ❌ **Auto-creation on mount**: Components create instances automatically
- ❌ **Resource leaks**: Instances accumulate across mount/unmount cycles
- ❌ **Poor cleanup**: Resources not properly cleaned up on unmount
- ❌ **Navigation bugs**: Duplicate instances created during navigation
- ❌ **Memory leaks**: Event listeners and connections not cleaned up

## Test Suite Structure

```
tests/tdd-london-school/instance-lifecycle/
├── claude-instance-lifecycle.test.ts          # Main lifecycle behavior tests
├── component-behavior-contracts.test.ts       # Component contract enforcement
├── resource-leak-prevention.test.ts           # Resource leak prevention tests
├── interaction-verification.test.ts           # Mock-driven interaction tests
├── mock-contracts.ts                          # Contract definitions and mocks
└── setup/                                     # Test configuration
    ├── jest.config.js                        # Jest configuration for London School
    ├── jest.setup.ts                         # Global setup and utilities
    └── custom-matchers.ts                    # Custom matchers for behavior testing
```

## Key Test Contracts

### 1. Mount Behavior Contract
```typescript
// ❌ WRONG: Auto-creation on mount
componentDidMount() {
  this.createInstance(); // BUG: Automatic creation
}

// ✅ CORRECT: Only fetch existing instances
componentDidMount() {
  this.fetchExistingInstances(); // OK: Read-only operation
}
```

### 2. User-Initiated Creation Contract
```typescript
// Test verifies this interaction pattern:
it('should create instance ONLY when user explicitly clicks create', () => {
  // GIVEN: Component mounted (no auto-creation)
  // WHEN: User clicks create button
  // THEN: Exactly one API call to create instance
});
```

### 3. Cleanup Contract
```typescript
// Test verifies this cleanup sequence:
it('should cleanup all resources on unmount', () => {
  // THEN: disconnect() called before terminate() called before close()
  verifyProperCleanupSequence(apiMock, sseMock);
});
```

## Running the Tests

### Prerequisites
```bash
cd /workspaces/agent-feed
npm install --save-dev jest @jest/globals @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### Run Tests
```bash
# Run all London School tests
npm run test:london-school

# Run specific test file
npx jest tests/tdd-london-school/instance-lifecycle/claude-instance-lifecycle.test.ts

# Run with coverage
npx jest tests/tdd-london-school --coverage

# Run in watch mode for TDD
npx jest tests/tdd-london-school --watch
```

## Test Categories

### 1. **Component Mount Behavior Tests** 
*Prevent automatic instance creation*

```typescript
describe('Component Mount Behavior (No Auto-Creation)', () => {
  it('should NOT automatically create instances on component mount', async () => {
    // Verify: fetchInstances() called, createInstance() NOT called
  });
});
```

### 2. **User-Initiated Creation Tests**
*Ensure instances only created on explicit user action*

```typescript
describe('User-Initiated Creation Only', () => {
  it('should create instance ONLY when user explicitly clicks create', async () => {
    // Verify: createInstance() called exactly once after user click
  });
});
```

### 3. **Unmount Cleanup Tests**
*Verify proper resource cleanup*

```typescript
describe('Component Unmount Cleanup', () => {
  it('should terminate all instances when component unmounts', async () => {
    // Verify: proper cleanup sequence followed
  });
});
```

### 4. **Navigation Event Tests**
*Prevent navigation-induced bugs*

```typescript
describe('Navigation Event Handling', () => {
  it('should not create duplicate instances when navigating away and back', async () => {
    // Verify: no instance accumulation during navigation
  });
});
```

### 5. **Resource Leak Prevention Tests**
*Prevent memory and resource leaks*

```typescript
describe('Resource Leak Prevention', () => {
  it('should prevent accumulating instances across multiple mount/unmount cycles', async () => {
    // Verify: no accumulation after N cycles
  });
});
```

### 6. **Interaction Verification Tests**
*Test how objects collaborate*

```typescript
describe('Mock-Driven Interaction Verification', () => {
  it('should follow GET-before-POST pattern when creating instances', async () => {
    // Verify: API call sequence is correct
  });
});
```

## Mock Contracts

### API Contract
```typescript
interface ClaudeInstanceAPIContract {
  fetchInstances(): Promise<{success: boolean, instances: ClaudeInstance[]}>;
  createInstance(config: InstanceConfig): Promise<{success: boolean, instance: ClaudeInstance}>;
  terminateInstance(instanceId: string): Promise<{success: boolean}>;
  connectToInstance(instanceId: string): Promise<{success: boolean}>;
  disconnectFromInstance(instanceId: string): Promise<{success: boolean}>;
}
```

### Component Lifecycle Contract
```typescript
interface ComponentLifecycleContract {
  onMount: {
    shouldFetchExistingInstances: true;
    shouldCreateNewInstances: false;
  };
  onUnmount: {
    shouldCloseConnections: true;
    shouldTerminateInstances: true;
    shouldRemoveEventListeners: true;
  };
}
```

## Custom Matchers

London School TDD provides custom Jest matchers for behavior testing:

```typescript
// Verify interaction sequencing
expect(mockA).toHaveBeenCalledBefore(mockB);
expect(mockB).toHaveBeenCalledAfter(mockA);

// Verify collaboration patterns
expect([mockA, mockB]).toHaveInteractionPattern(['fetch', 'create', 'connect']);

// Verify cleanup
expect(resourceMock).toHaveResourcesCleanedUp();

// Verify no resource leaks
expect({initial: 100, current: 102, threshold: 50}).toHaveNoResourceLeaks();
```

## Behavior Verification Examples

### ✅ Correct Interaction Pattern
```typescript
// User clicks create button
await user.click(screen.getByText('Default Claude'));

// Verify exact sequence
expect(apiMock.fetchInstances).toHaveBeenCalledTimes(2); // Before and after
expect(apiMock.createInstance).toHaveBeenCalledTimes(1);
expect(apiMock.createInstance).toHaveBeenCalledWith({
  command: 'claude',
  name: 'Default Claude',
  type: 'default'
});
```

### ❌ Detected Bug Pattern
```typescript
// Component mounts
render(<EnhancedSSEInterface />);

// Should NOT auto-create instances
expect(apiMock.createInstance).not.toHaveBeenCalled();
// Only fetch existing instances
expect(apiMock.fetchInstances).toHaveBeenCalledTimes(1);
```

## Swarm Integration

This TDD suite integrates with the agent swarm for comprehensive testing:

```typescript
// London School agent coordination
const tddAgent = await spawnAgent('tdd-london-swarm');
const behaviorAgent = await spawnAgent('behavior-validator');
const contractAgent = await spawnAgent('contract-enforcer');

// Coordinated testing workflow
await orchestrateTask('instance-lifecycle-testing', {
  strategy: 'parallel',
  agents: [tddAgent, behaviorAgent, contractAgent]
});
```

## Coverage and Reporting

The test suite provides specialized reporting for London School methodology:

- **Interaction Coverage**: Measures which object collaborations are tested
- **Contract Coverage**: Ensures all behavioral contracts are verified
- **Mock Usage**: Tracks mock effectiveness and coverage
- **Resource Leak Detection**: Monitors resource accumulation

## Expected Outcomes

After running these tests, you should see:

✅ **0 automatic instance creations on component mount**  
✅ **100% user-initiated instance creation coverage**  
✅ **0 resource leaks across mount/unmount cycles**  
✅ **Proper cleanup sequence verification**  
✅ **Navigation event handling without duplication**  
✅ **Complete interaction pattern coverage**

## Integration with CI/CD

```bash
# Add to package.json scripts
{
  "scripts": {
    "test:london-school": "jest --config tests/tdd-london-school/jest.config.js",
    "test:contracts": "jest tests/tdd-london-school/instance-lifecycle/component-behavior-contracts.test.ts",
    "test:leaks": "jest tests/tdd-london-school/instance-lifecycle/resource-leak-prevention.test.ts"
  }
}
```

## Debugging Failed Tests

When tests fail, focus on the **interaction patterns**:

1. **Check mock call sequences**: Use `mockFn.mock.calls` to see actual calls
2. **Verify timing**: Use `toHaveBeenCalledBefore/After` matchers
3. **Examine cleanup**: Check that cleanup mocks were called
4. **Review contracts**: Ensure components follow defined contracts

## Contributing

When adding new lifecycle tests:

1. **Start with the contract**: Define expected interactions first
2. **Mock all dependencies**: Isolate the unit under test
3. **Focus on behavior**: Test HOW objects collaborate
4. **Verify interactions**: Use custom matchers for verification
5. **Test failure scenarios**: Ensure proper error handling

---

**Remember**: London School TDD focuses on **conversations between objects**, not internal state. We test **HOW** components interact with their dependencies, ensuring proper lifecycle management and preventing resource leaks through behavioral contracts.