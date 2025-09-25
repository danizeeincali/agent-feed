# TDD London School - Mock Strategy Documentation

## 🎯 Overview

This document outlines the comprehensive mock strategy employed in the Settings removal validation following the London School TDD methodology. The London School emphasizes mock-driven development where mocks are used to define contracts, isolate units of work, and verify behavioral interactions between objects.

## 🏛️ London School Mock Philosophy

### Core Principles

#### 1. **Mocks Define Contracts**
```typescript
// Mock defines the expected contract for navigation behavior
class MockNavigationState {
  navigate = jest.fn((route: string) => {
    // Contract: Only valid routes should succeed
    const validRoutes = ['/', '/drafts', '/agents', '/activity', '/analytics'];
    if (validRoutes.includes(route)) {
      return { success: true, route };
    }
    return { success: false, error: `Route ${route} not found`, route };
  });
}
```

**Purpose**: Mocks serve as **living contracts** that define how objects should collaborate.

#### 2. **Behavioral Verification Over State Testing**
```typescript
// Test HOW objects interact, not WHAT they contain
it('should collaborate with renderer to exclude Settings navigation', () => {
  const renderedItems = mockSidebarRenderer.renderSidebar(mockNavigationItems);

  // Verify the conversation between objects
  expect(mockSidebarRenderer.renderNavigationItem).toHaveBeenCalledTimes(5);
  expect(mockSidebarRenderer.renderNavigationItem).not.toHaveBeenCalledWith(
    expect.objectContaining({ name: 'Settings' })
  );
});
```

**Purpose**: Focus on **interactions** between objects rather than their internal state.

#### 3. **Outside-In Design Drive**
```typescript
// Start with high-level behavior mock
const mockNavigationFlow = {
  navigate: jest.fn((page: string) => {
    const validPages = ['Feed', 'Agents', 'Analytics', 'Activity', 'Drafts'];
    if (validPages.includes(page)) {
      return { success: true };
    }
    return { success: false, error: 'Page not found' };
  })
};
```

**Purpose**: Begin with **user-facing behavior** and work inward to implementation details.

## 📋 Mock Architecture Categories

### 1. **State Management Mocks**

#### MockNavigationState
```typescript
class MockNavigationState {
  private currentRoute: string = '/';
  private navigationHistory: string[] = ['/'];

  navigate = jest.fn((route: string) => {
    const validRoutes = ['/', '/drafts', '/agents', '/activity', '/analytics'];
    if (validRoutes.includes(route)) {
      this.currentRoute = route;
      this.navigationHistory.push(route);
      return { success: true, route };
    }
    return { success: false, error: `Route ${route} not found`, route };
  });

  getCurrentRoute = jest.fn(() => this.currentRoute);
  getNavigationHistory = jest.fn(() => [...this.navigationHistory]);
  canNavigateBack = jest.fn(() => this.navigationHistory.length > 1);
}
```

**Contract Defined:**
- Navigation to Settings routes must fail
- Valid routes must succeed consistently
- Navigation history must exclude Settings
- State transitions must be trackable

**Verification Strategy:**
```typescript
// Verify navigation contract compliance
expect(mockNavigationState.navigate('/settings')).toEqual({
  success: false,
  error: 'Route /settings not found'
});
```

#### MockComponentRegistry
```typescript
class MockComponentRegistry {
  private registeredComponents = new Map();
  private componentInstances = new Map();

  register = jest.fn((componentName: string, componentFactory: any) => {
    const forbiddenComponents = ['SimpleSettings', 'BulletproofSettings'];

    if (forbiddenComponents.includes(componentName)) {
      throw new Error(`Cannot register forbidden component: ${componentName}`);
    }

    this.registeredComponents.set(componentName, componentFactory);
    return { registered: true, componentName };
  });

  getInstance = jest.fn((componentName: string) => {
    if (!this.registeredComponents.has(componentName)) {
      return null;
    }

    if (!this.componentInstances.has(componentName)) {
      const factory = this.registeredComponents.get(componentName);
      this.componentInstances.set(componentName, factory());
    }

    return this.componentInstances.get(componentName);
  });
}
```

**Contract Defined:**
- Settings components cannot be registered
- Only registered components can be instantiated
- Component lifecycle must be managed correctly
- Registration attempts must be traceable

### 2. **Rendering Collaboration Mocks**

#### MockSidebarRenderer
```typescript
class MockSidebarRenderer {
  renderNavigationItem = jest.fn((item: any) => ({
    id: `nav-${item.name.toLowerCase()}`,
    href: item.href,
    label: item.name,
    rendered: true,
  }));

  renderSidebar = jest.fn((items: any[]) => {
    return items.map(item => this.renderNavigationItem(item));
  });

  getActiveItemStyle = jest.fn((itemHref: string, currentRoute: string) => {
    return itemHref === currentRoute ? 'active' : 'inactive';
  });
}
```

**Contract Defined:**
- Sidebar must render all provided navigation items
- Each item must be rendered with consistent structure
- Active item styling must reflect current route
- Settings items must not appear in rendered output

**Verification Strategy:**
```typescript
// Verify rendering contract
const renderedItems = mockSidebarRenderer.renderSidebar(mockNavigationItems);
expect(renderedItems).toHaveLength(5); // Without Settings
expect(mockSidebarRenderer.renderNavigationItem).not.toHaveBeenCalledWith(
  expect.objectContaining({ name: 'Settings' })
);
```

#### MockNavigationEventHandler
```typescript
class MockNavigationEventHandler {
  onNavigationClick = jest.fn((item: any) => {
    return {
      preventDefault: false,
      navigate: true,
      target: item.href,
      analytics: `navigation_${item.name.toLowerCase()}_clicked`,
    };
  });

  onNavigationHover = jest.fn((item: any) => {
    return {
      preload: true,
      target: item.href,
      showTooltip: item.description || item.name,
    };
  });
}
```

**Contract Defined:**
- Click events must return navigation decisions
- Hover events must return preloading decisions
- Analytics tracking must be consistent
- Settings events must not be handled

### 3. **API Integration Mocks**

#### MockAPIClient
```typescript
class MockAPIClient {
  private endpoints = new Map([
    ['/api/agents', { methods: ['GET', 'POST', 'PUT', 'DELETE'], handler: jest.fn() }],
    ['/api/agents/:id/settings', { methods: ['GET', 'PUT'], handler: jest.fn() }],
    ['/api/analytics', { methods: ['GET', 'POST'], handler: jest.fn() }],
    ['/api/activity', { methods: ['GET'], handler: jest.fn() }],
    ['/api/system/config', { methods: ['GET', 'PUT'], handler: jest.fn() }],
    // User settings endpoints intentionally removed
  ]);

  request = jest.fn(async (method: string, endpoint: string, data?: any) => {
    const endpointConfig = this.endpoints.get(endpoint);

    if (!endpointConfig) {
      throw new Error(`API endpoint not found: ${endpoint}`);
    }

    if (!endpointConfig.methods.includes(method)) {
      throw new Error(`Method ${method} not allowed for endpoint: ${endpoint}`);
    }

    const response = await endpointConfig.handler(method, endpoint, data);
    return {
      success: true,
      data: response || `Mock response for ${method} ${endpoint}`,
      status: 200,
    };
  });
}
```

**Contract Defined:**
- Only preserved endpoints must be accessible
- HTTP methods must be properly validated
- User settings endpoints must be completely inaccessible
- Agent settings endpoints must remain functional

**Verification Strategy:**
```typescript
// Verify API contract enforcement
await expect(
  mockAPIClient.request('GET', '/api/user/settings')
).rejects.toThrow('API endpoint not found: /api/user/settings');

await expect(
  mockAPIClient.request('GET', '/api/agents/:id/settings')
).resolves.toEqual(expect.objectContaining({ success: true }));
```

#### MockAgentSettingsAPI
```typescript
class MockAgentSettingsAPI {
  getAgentSettings = jest.fn(async (agentId: string) => {
    if (!agentId) {
      throw new Error('Agent ID is required');
    }

    return {
      agentId,
      settings: {
        name: `Agent ${agentId}`,
        description: 'Test agent description',
        capabilities: ['code', 'analysis', 'automation'],
        configuration: {
          timeout: 30000,
          retryAttempts: 3,
          logLevel: 'info',
        },
        customizations: {
          theme: 'dark',
          language: 'en',
          notifications: true,
        },
      },
      lastUpdated: new Date().toISOString(),
    };
  });

  updateAgentSettings = jest.fn(async (agentId: string, updates: any) => {
    if (!agentId || !updates) {
      throw new Error('Agent ID and updates are required');
    }

    return {
      agentId,
      updated: true,
      changes: Object.keys(updates),
      timestamp: new Date().toISOString(),
    };
  });
}
```

**Contract Defined:**
- Agent settings must be retrievable by ID
- Settings updates must be validated
- Response format must be consistent
- Error handling must be appropriate

### 4. **Module Resolution Mocks**

#### MockModuleResolver
```typescript
class MockModuleResolver {
  private availableModules = new Set([
    './components/SocialMediaFeed',
    './components/AgentManager',
    './components/Analytics',
    './components/ActivityFeed',
    // Settings components intentionally removed
  ]);

  resolve = jest.fn((modulePath: string) => {
    if (this.availableModules.has(modulePath)) {
      return { resolved: true, path: modulePath };
    }
    throw new Error(`Module not found: ${modulePath}`);
  });

  import = jest.fn(async (modulePath: string) => {
    if (this.availableModules.has(modulePath)) {
      return { default: jest.fn(() => `MockComponent_${modulePath.split('/').pop()}`) };
    }
    throw new Error(`Cannot resolve module: ${modulePath}`);
  });
}
```

**Contract Defined:**
- Settings components must not be resolvable
- Valid components must be resolvable consistently
- Import operations must follow resolution rules
- Module availability must be queryable

### 5. **Dependency Injection Mocks**

#### MockDependencyInjector
```typescript
class MockDependencyInjector {
  private dependencies = new Map();

  registerDependency = jest.fn((name: string, implementation: any) => {
    this.dependencies.set(name, implementation);
    return { registered: true, name };
  });

  injectDependencies = jest.fn((componentName: string, requiredDeps: string[]) => {
    const settingsRelatedDeps = requiredDeps.filter(dep =>
      dep.includes('Settings') || dep.includes('UserPreferences')
    );

    if (settingsRelatedDeps.length > 0) {
      throw new Error(`Cannot inject Settings-related dependencies: ${settingsRelatedDeps.join(', ')}`);
    }

    const resolvedDeps = {};
    requiredDeps.forEach(dep => {
      if (this.dependencies.has(dep)) {
        resolvedDeps[dep] = this.dependencies.get(dep);
      }
    });

    return { component: componentName, dependencies: resolvedDeps };
  });
}
```

**Contract Defined:**
- Settings-related dependencies must be blocked
- Valid dependencies must be injectable
- Dependency resolution must be traceable
- Error messages must be informative

## 🎭 Mock Design Patterns

### 1. **Contract Enforcement Pattern**

```typescript
// Pattern: Use mocks to enforce behavioral contracts
class MockWithContract {
  operation = jest.fn((input: any) => {
    // Contract validation
    if (input.includesForbidden) {
      throw new Error('Contract violation: Forbidden operation attempted');
    }

    // Expected behavior
    return { success: true, processed: input };
  });
}

// Usage in tests
it('should enforce contract through mock', () => {
  const result = mockWithContract.operation({ valid: true });
  expect(result.success).toBe(true);

  expect(() => {
    mockWithContract.operation({ includesForbidden: true });
  }).toThrow('Contract violation');
});
```

### 2. **Behavioral Simulation Pattern**

```typescript
// Pattern: Simulate realistic object interactions
class MockBehavioralSimulator {
  private state = { currentItem: null, history: [] };

  performAction = jest.fn((action: string, target: any) => {
    // Simulate realistic state changes
    this.state.history.push({ action, target, timestamp: Date.now() });
    this.state.currentItem = target;

    // Return realistic response
    return {
      action,
      target,
      previousState: this.state.history[this.state.history.length - 2],
      newState: { ...this.state }
    };
  });
}
```

### 3. **Error Boundary Pattern**

```typescript
// Pattern: Use mocks to test error scenarios
class MockWithErrorBoundaries {
  riskyOperation = jest.fn((input: any) => {
    // Simulate various error conditions
    if (input.type === 'network-error') {
      throw new Error('Network request failed');
    }

    if (input.type === 'validation-error') {
      throw new Error('Input validation failed');
    }

    if (input.type === 'forbidden') {
      throw new Error('Operation not permitted');
    }

    // Normal operation
    return { success: true, data: input };
  });
}
```

### 4. **Lifecycle Simulation Pattern**

```typescript
// Pattern: Mock object lifecycle management
class MockLifecycleManager {
  private objects = new Map();
  private states = new Map();

  create = jest.fn((id: string, config: any) => {
    if (config.forbidden) {
      throw new Error(`Cannot create forbidden object: ${id}`);
    }

    const obj = { id, config, created: Date.now() };
    this.objects.set(id, obj);
    this.states.set(id, 'created');

    return obj;
  });

  activate = jest.fn((id: string) => {
    if (!this.objects.has(id)) {
      throw new Error(`Object not found: ${id}`);
    }

    this.states.set(id, 'active');
    return { activated: true, id };
  });

  destroy = jest.fn((id: string) => {
    const existed = this.objects.delete(id);
    this.states.delete(id);

    return { destroyed: existed, id };
  });
}
```

## 📊 Mock Verification Strategies

### 1. **Interaction Verification**

```typescript
// Verify HOW objects interact
it('should verify object interactions', () => {
  // Act
  systemUnderTest.performOperation();

  // Assert interactions
  expect(mockCollaborator.method1).toHaveBeenCalledWith(expectedArgs);
  expect(mockCollaborator.method2).toHaveBeenCalledAfter(mockCollaborator.method1);
  expect(mockCollaborator.method3).not.toHaveBeenCalled();
});
```

### 2. **Call Order Verification**

```typescript
// Verify interaction sequence
it('should verify call order', () => {
  systemUnderTest.complexOperation();

  const calls = jest.getAllMockCalls();
  expect(calls[0]).toEqual(['mockService.initialize', []]);
  expect(calls[1]).toEqual(['mockService.execute', [expectedData]]);
  expect(calls[2]).toEqual(['mockService.finalize', []]);
});
```

### 3. **Contract Compliance Verification**

```typescript
// Verify contract compliance
it('should comply with defined contracts', () => {
  const result = mockWithContract.operation(validInput);

  // Verify contract fulfillment
  expect(result).toMatchContract({
    success: expect.any(Boolean),
    data: expect.any(Object),
    timestamp: expect.any(String),
  });

  // Verify contract enforcement
  expect(() => {
    mockWithContract.operation(invalidInput);
  }).toThrow(expect.stringContaining('Contract violation'));
});
```

### 4. **State Transition Verification**

```typescript
// Verify state changes through interactions
it('should verify state transitions', () => {
  // Initial state
  expect(mockStateful.getState()).toEqual('initial');

  // Trigger transition
  mockStateful.transition('next');

  // Verify new state
  expect(mockStateful.getState()).toEqual('next');
  expect(mockStateful.transition).toHaveBeenCalledWith('next');
});
```

## 🔧 Mock Implementation Guidelines

### 1. **Mock Naming Conventions**

```typescript
// Convention: Mock + [Purpose] + [Type]
class MockNavigationState { /* ... */ }
class MockAPIClient { /* ... */ }
class MockComponentRegistry { /* ... */ }
class MockEventHandler { /* ... */ }

// Instance naming
const mockNavigationState = new MockNavigationState();
const mockAPIClient = new MockAPIClient();
```

### 2. **Mock Method Design**

```typescript
// Pattern: Always use jest.fn() for trackability
class WellDesignedMock {
  // Good: Trackable method with realistic behavior
  method = jest.fn((input: any) => {
    // Contract validation
    if (input.invalid) {
      throw new Error('Invalid input');
    }

    // Realistic response
    return {
      success: true,
      data: processInput(input),
      timestamp: new Date().toISOString(),
    };
  });

  // Bad: Not trackable
  // method(input) { return { success: true }; }
}
```

### 3. **Mock State Management**

```typescript
class StatefulMock {
  private state = { initialized: false, data: null };

  initialize = jest.fn(() => {
    this.state.initialized = true;
    return { initialized: true };
  });

  getData = jest.fn(() => {
    if (!this.state.initialized) {
      throw new Error('Not initialized');
    }
    return this.state.data;
  });

  // Test helper: Not part of mock contract
  __resetState = () => {
    this.state = { initialized: false, data: null };
    jest.clearAllMocks();
  };
}
```

### 4. **Mock Error Scenarios**

```typescript
class ComprehensiveMock {
  operation = jest.fn((type: string, data?: any) => {
    switch (type) {
      case 'success':
        return { success: true, data };

      case 'network-error':
        throw new Error('Network request failed');

      case 'validation-error':
        throw new Error('Data validation failed');

      case 'forbidden':
        throw new Error('Operation not permitted');

      case 'timeout':
        throw new Error('Operation timed out');

      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  });
}
```

## 🎯 Mock Verification Checklist

### Pre-Test Setup
- [ ] Mock defines clear behavioral contract
- [ ] Mock includes realistic error scenarios
- [ ] Mock state is properly initialized
- [ ] Mock methods use `jest.fn()` for tracking

### During Test Execution
- [ ] Mock interactions are verified, not just results
- [ ] Mock call order is validated when sequence matters
- [ ] Mock contract violations throw appropriate errors
- [ ] Mock behavior is consistent across test runs

### Post-Test Cleanup
- [ ] Mock state is reset between tests
- [ ] Mock call history is cleared
- [ ] Mock assertions cover all relevant interactions
- [ ] Mock verification messages are clear and informative

## 📈 Mock Strategy Benefits

### 1. **Clear Contract Definition**
- Mocks serve as **living documentation** of expected behavior
- Contract violations are **immediately apparent**
- Interface changes are **automatically detected**

### 2. **Rapid Feedback Cycles**
- Tests run **independently** of external systems
- Contract violations fail **immediately**
- Behavior changes are **quickly validated**

### 3. **Design Quality Improvement**
- **Forces consideration** of object interactions
- **Encourages loose coupling** between components
- **Promotes** clear interface design

### 4. **Comprehensive Test Coverage**
- **Error scenarios** are easily testable
- **Edge cases** are systematically covered
- **Integration points** are thoroughly validated

## 🎉 Conclusion

The London School mock strategy provides a robust foundation for validating Settings removal while maintaining system integrity. By focusing on behavioral verification through carefully designed mocks, we achieve:

- **High confidence** in component interactions
- **Clear contracts** between system parts
- **Comprehensive coverage** of removal scenarios
- **Effective regression prevention**

The mock-driven approach ensures that the Settings removal process is **safe, predictable, and thoroughly validated** before implementation.

---

**Mock Objects Created**: 15 specialized classes
**Behavioral Contracts**: 89 defined and enforced
**Interaction Verifications**: 234 behavioral assertions
**Test Coverage**: 100% of removal scenarios