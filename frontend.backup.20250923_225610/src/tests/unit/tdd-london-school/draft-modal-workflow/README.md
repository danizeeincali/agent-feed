# London School TDD - Draft Modal Workflow Tests

This test suite implements comprehensive London School TDD testing for the draft editing modal workflow in the Agent Feed application.

## London School TDD Principles Applied

### 1. Outside-In Development
- Tests start with user behavior and drive down to implementation details
- Focus on the conversation between objects rather than their internal state
- Mock external dependencies to isolate the unit under test

### 2. Mock-Driven Development
- Extensive use of mocks to define contracts between collaborating objects
- Behavior verification through interaction testing
- Mock coordination to ensure consistent collaboration patterns

### 3. Contract Definition
- Clear interfaces established through mock expectations
- Contract verification to ensure component compatibility
- Evolution of contracts based on collaboration needs

## Test Structure

```
draft-modal-workflow/
├── test-utils.ts              # Shared utilities and mock factories
├── draft-loading.test.tsx     # Modal initialization and draft loading
├── draft-update-create-behavior.test.tsx  # Update vs create workflows
├── draft-service-interactions.test.tsx    # Service layer collaboration
├── duplicate-prevention.test.tsx          # Draft deduplication logic
├── modal-state-management.test.tsx        # State coordination testing
├── component-collaboration.test.tsx       # Cross-component interactions
├── jest.config.js            # Jest configuration for London School TDD
├── setup.ts                  # Test environment setup
└── README.md                 # This documentation
```

## Key Test Scenarios

### 1. Draft Loading (`draft-loading.test.tsx`)
- **Outside-In Focus**: User opens modal → system loads draft → form populates
- **Mock Interactions**: PostCreatorModal ↔ DraftManager collaboration
- **Behavior Verification**: Form initialization, modal state transitions

### 2. Update vs Create Behavior (`draft-update-create-behavior.test.tsx`)
- **Critical Business Logic**: Ensures updates don't create duplicates
- **Service Interactions**: `updateDraft()` vs `createDraft()` method calls
- **Contract Testing**: Consistent parameter passing between components

### 3. Service Interactions (`draft-service-interactions.test.tsx`)
- **Mock-Driven Testing**: DraftService completely mocked
- **Conversation Focus**: How components talk to the service layer
- **Error Handling**: Service failure scenarios and recovery

### 4. Duplicate Prevention (`duplicate-prevention.test.tsx`)
- **Race Condition Testing**: Rapid user interactions
- **State Consistency**: ID preservation during edit cycles
- **Concurrency Handling**: Multiple edit attempts coordination

### 5. Modal State Management (`modal-state-management.test.tsx`)
- **State Transitions**: Opening, editing, saving, closing workflows
- **Cleanup Testing**: Background scroll, form reset, memory leaks
- **Cross-Component State**: Modal ↔ Form ↔ DraftManager coordination

### 6. Component Collaboration (`component-collaboration.test.tsx`)
- **Integration Focus**: How DraftManager and PostCreatorModal work together
- **Contract Compliance**: Interface verification between components
- **Workflow Testing**: Complete user journeys with full interaction chains

## Mock Strategy

### Service Layer Mocks
```typescript
const mockDraftService = createMockDraftService();
mockDraftService.updateDraft.mockResolvedValue(updatedDraft);
mockDraftService.createDraft.mockResolvedValue(newDraft);
```

### Component Interaction Mocks
```typescript
const mockCallbacks = createUserInteractionMocks();
// Verify the conversation happened
verifyMockInteractions.userCallbacks.wasCloseCalled(mockCallbacks);
```

### State Management Mocks
```typescript
const mockStateManagers = createMockStateManagers();
// Test coordination between state layers
verifyMockInteractions.stateManagers.wasModalStateUpdated(mockStateManagers);
```

## Running the Tests

### Full Suite
```bash
cd frontend
npm test -- --config tests/tdd-london-school/draft-modal-workflow/jest.config.js
```

### Individual Test Files
```bash
# Draft loading tests
npm test draft-loading.test.tsx

# Service interaction tests  
npm test draft-service-interactions.test.tsx

# Component collaboration tests
npm test component-collaboration.test.tsx
```

### With Coverage
```bash
npm test -- --coverage --config tests/tdd-london-school/draft-modal-workflow/jest.config.js
```

## Test Utilities

### Mock Factories
- `createMockDraft()` - Consistent test data
- `createMockDraftService()` - Service layer mocking
- `createUserInteractionMocks()` - User callback mocking
- `createMockStateManagers()` - State coordination mocking

### Verification Helpers
- `verifyMockInteractions.draftService.*` - Service call verification
- `verifyMockInteractions.userCallbacks.*` - Callback verification
- `verifyMockInteractions.stateManagers.*` - State change verification

### Test Scenarios
- `createTestScenarios.newDraft()` - New draft creation scenarios
- `createTestScenarios.existingDraft()` - Draft editing scenarios
- `createTestScenarios.modalStates.*` - Modal state scenarios

## London School Benefits Demonstrated

### 1. Fast Feedback
- Tests run quickly due to extensive mocking
- No database or network dependencies
- Immediate feedback on interaction patterns

### 2. Design Improvement
- Mock-driven development reveals coupling issues
- Contract definition improves component interfaces
- Outside-in approach ensures user-focused design

### 3. Regression Protection
- Behavior verification catches breaking changes
- Mock contract evolution tracks API changes
- Interaction patterns document expected behavior

### 4. Collaboration Documentation
- Tests serve as living documentation of object conversations
- Mock expectations define component contracts
- Interaction verification shows system behavior

## Best Practices Implemented

### 1. Mock Management
- Keep mocks simple and focused on behavior
- Use mock factories for consistency
- Clear mocks between tests to avoid pollution

### 2. Interaction Verification
- Test the conversation between objects
- Verify method calls with expected parameters
- Check interaction sequences and timing

### 3. Contract Testing
- Define clear interfaces through mock expectations
- Verify contract compliance across components
- Evolve contracts based on collaboration needs

### 4. Outside-In Flow
- Start with user behavior scenarios
- Drive implementation through failing tests
- Focus on what objects do, not how they do it

## Integration with Swarm Testing

These London School tests are designed to work within a larger swarm testing environment:

- **Contract Sharing**: Mock contracts shared with integration tests
- **Behavior Documentation**: Interaction patterns inform system tests
- **Collaboration Verification**: Component conversations validated across test types
- **Regression Coordination**: Mock evolution tracked across test suites

This test suite demonstrates how London School TDD can provide fast, reliable feedback while ensuring robust component collaboration in a complex React application.