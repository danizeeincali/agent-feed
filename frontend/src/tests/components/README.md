# Component Unit Tests - TDD London School Approach

This directory contains comprehensive unit tests for React components following the **TDD London School (mockist)** methodology.

## 🎯 CRITICAL: Claude Code Integration Test Suite

### 🚨 MISSION: Validate Real Claude Code Integration
**NO mock responses exist - ALL functionality is real**

#### Key Test Files for Claude Integration:
- **`AviDirectChatReal.london-tdd.test.tsx`** ⭐ CRITICAL anti-mock validation
- **`AviDirectChatMock.anti-pattern.test.tsx`** 🔍 Control group (what we DON'T want)
- **`EnhancedPostingInterface.integration.test.tsx`** 🔗 Full integration tests
- **`Claude-Integration.contract.test.tsx`** 🤝 API contract validation

#### Success Criteria:
✅ Sending "hello" does NOT return "I received your message..." mock response
✅ All API calls target `/api/claude-instances`
✅ Claude instances created with proper Avi metadata
✅ Real responses from Claude Code instances
✅ Proper error handling and retry mechanisms

#### Quick Test Commands:
```bash
# Run all Claude integration tests
npm test -- --testPathPattern="components.*claude.*integration"

# Critical anti-mock test
npm test -- AviDirectChatReal.london-tdd.test.tsx
```

---

## Testing Philosophy

### London School TDD Principles

1. **Outside-In Development**: Drive implementation from user behavior down to implementation details
2. **Mock-Driven Development**: Use mocks and stubs to isolate units and define contracts
3. **Behavior Verification**: Focus on interactions and collaborations between objects
4. **Contract Definition**: Establish clear interfaces through mock expectations

### Key Characteristics

- **Isolation**: Each component is tested in complete isolation using mocks for all dependencies
- **Interaction Testing**: Verify HOW components collaborate with their dependencies
- **Contract Verification**: Test the conversations between objects, not their internal state
- **Fast Execution**: Tests run quickly due to complete isolation from external systems

## Test Files

### RealDynamicPagesTab.simplified.test.tsx
- **Component**: `RealDynamicPagesTab`
- **Tests**: 12 test cases covering:
  - Component interactions with fetch API and React Router
  - Page creation workflow coordination
  - Navigation interactions
  - Error handling contracts
  - State transitions and empty states
  - Component contract verification
  - Retry behavior patterns

### DynamicPageRenderer.simplified.test.tsx
- **Component**: `DynamicPageRenderer`
- **Tests**: 21 test cases covering:
  - Component collaboration with React Router hooks
  - Navigation interactions
  - Content rendering contracts for different component types
  - Error handling contracts
  - Page metadata display contracts
  - State transition contracts

## Mock Strategy

### Mocked Collaborators

All external dependencies are mocked to achieve complete isolation:

```typescript
// React Router hooks
const mockNavigate = vi.fn();
const mockUseParams = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
}));

// Fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;
```

### Contract Verification

Tests focus on verifying the **contracts** between components and their collaborators:

```typescript
// Verify correct API interaction
expect(mockFetch).toHaveBeenCalledWith(`/api/agents/${agentId}/pages`);

// Verify navigation coordination
expect(mockNavigate).toHaveBeenCalledWith(`/agents/${agentId}/pages/new-page`);
```

## Test Structure

### Organized by Behavior Contracts

Tests are grouped by the types of collaborations being verified:

- **Component Interactions**: How the component coordinates with external services
- **Navigation Interactions**: How the component collaborates with routing
- **Error Handling Contracts**: How the component handles failure scenarios
- **State Transition Contracts**: How the component manages state changes
- **Content Rendering Contracts**: How the component renders different data types

### Test Naming Convention

Test names describe the **collaboration pattern** being verified:

- ✅ `should coordinate with fetch API to load pages on mount`
- ✅ `should coordinate create page workflow with multiple collaborators`
- ✅ `should handle fetch collaboration failures gracefully`

## Running Tests

```bash
# Run all component tests
npm test -- components/ --run

# Run specific test file
npm test -- components/RealDynamicPagesTab.simplified.test.tsx --run
npm test -- components/DynamicPageRenderer.simplified.test.tsx --run

# Run with coverage
npm test -- components/ --run --coverage
```

## Benefits of This Approach

### 1. **Fast Feedback Loop**
- Tests execute quickly (average ~3-4 seconds for full suite)
- No external dependencies slow down execution
- Immediate feedback on component behavior

### 2. **Design Quality**
- Forces good separation of concerns
- Reveals tight coupling through difficult-to-mock dependencies
- Encourages testable component architecture

### 3. **Regression Protection**
- Tests break when component contracts change
- Verifies critical integration points
- Catches breaking changes in component collaborations

### 4. **Documentation**
- Tests serve as executable documentation of component behavior
- Shows how components should interact with their dependencies
- Captures expected error handling and edge cases

## Best Practices Demonstrated

1. **Complete Isolation**: Every external dependency is mocked
2. **Behavior Focus**: Tests verify interactions, not internal state
3. **Contract Testing**: Clear verification of component collaborations
4. **Edge Case Coverage**: Comprehensive error and boundary condition testing
5. **Maintainable Structure**: Well-organized, descriptive test names and groupings

This testing approach ensures reliable, fast, and maintainable component tests that provide confidence in the correctness of component behavior and their integration contracts.