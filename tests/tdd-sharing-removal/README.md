# TDD London School - Sharing Removal Test Suite

This test suite implements the **London School (Mockist) TDD methodology** for systematically removing sharing functionality from the SocialMediaFeed component while ensuring no regressions in other features.

## 🎯 London School TDD Principles Applied

### 1. Outside-In Development
- Start with acceptance tests defining expected behavior
- Work from user interactions down to implementation details
- Mock all external dependencies from the beginning

### 2. Mock-Driven Development  
- Use mocks and stubs extensively to isolate units
- Focus on **interactions** between objects, not internal state
- Define contracts through mock expectations

### 3. Behavior Verification
- Verify **how objects collaborate** rather than what they contain
- Test the conversations between components
- Ensure proper isolation of units under test

## 📁 Test Structure

```
tests/tdd-sharing-removal/
├── mock-contracts.ts              # Mock definitions and contracts
├── sharing-removal.acceptance.test.ts   # Outside-in acceptance tests
├── sharing-ui-isolation.test.ts         # UI component isolation tests
├── api-interaction.test.ts             # API service interaction tests
├── regression-prevention.test.ts       # Regression prevention tests
├── integration-outside-in.test.ts      # End-to-end integration tests
├── test-setup.js                      # Global test configuration
├── test-runner.js                     # Specialized test runner
└── README.md                          # This documentation
```

## 🧪 Test Execution Order (London School)

### Phase 1: Failing Acceptance Tests
```bash
node test-runner.js --single acceptance
```
- **Purpose**: Define expected behavior without sharing
- **Status**: Should FAIL initially (sharing still present)
- **Focus**: User interactions and system behavior

### Phase 2: UI Isolation Tests
```bash
node test-runner.js --single ui-isolation
```
- **Purpose**: Mock all dependencies, test component in isolation
- **Status**: Should FAIL initially (share buttons still rendered)
- **Focus**: Component rendering and UI interactions

### Phase 3: API Interaction Tests
```bash
node test-runner.js --single api-interaction
```
- **Purpose**: Verify API calls and service layer interactions
- **Status**: Should FAIL initially (share API calls still made)
- **Focus**: Mock verification of service calls

### Phase 4: Regression Prevention Tests
```bash
node test-runner.js --single regression
```
- **Purpose**: Ensure like/comment features remain intact
- **Status**: Should PASS throughout (no regression allowed)
- **Focus**: Existing functionality preservation

### Phase 5: Integration Tests
```bash
node test-runner.js --single integration
```
- **Purpose**: End-to-end behavior verification
- **Status**: Should FAIL initially, PASS after implementation
- **Focus**: Complete user workflows

## 🔧 Running the Tests

### Full Test Suite
```bash
cd tests/tdd-sharing-removal
node test-runner.js
```

### Individual Test Categories
```bash
# Acceptance tests
node test-runner.js --single acceptance

# UI isolation
node test-runner.js --single ui-isolation  

# API interactions
node test-runner.js --single api-interaction

# Regression prevention
node test-runner.js --single regression

# Integration tests
node test-runner.js --single integration
```

### Coverage Report
```bash
node test-runner.js --coverage
```

### Watch Mode
```bash
node test-runner.js --watch
```

## 📋 Test Checklist

### Current State (WITH Sharing) - Tests Should FAIL
- [ ] Share buttons are rendered
- [ ] Share counts are displayed  
- [ ] Share API calls are made
- [ ] Share functionality works end-to-end

### Target State (WITHOUT Sharing) - Tests Should PASS
- [ ] No share buttons rendered
- [ ] No share counts displayed
- [ ] No share API calls made
- [ ] Like/comment functionality intact
- [ ] No regressions in other features

## 🎭 Mock Contracts

### API Service Contract
```typescript
interface MockApiService {
  getAgentPosts: jest.Mock;           // ✅ Should be called
  updatePostEngagement: jest.Mock;    // ⚠️ Should NOT be called with 'share'
  searchPosts: jest.Mock;             // ✅ Should work normally
  checkDatabaseConnection: jest.Mock; // ✅ Should work normally
}
```

### WebSocket Context Contract
```typescript
interface MockWebSocketContext {
  sendLike: jest.Mock;      // ✅ Should work for likes
  subscribePost: jest.Mock; // ✅ Should work for comments
  // ❌ No share-related methods should be called
}
```

### Component Interaction Contract
```typescript
// Expected interactions AFTER sharing removal:
expect(mockApiService.updatePostEngagement).toHaveBeenCalledWith(postId, 'like');
expect(mockApiService.updatePostEngagement).toHaveBeenCalledWith(postId, 'comment');
expect(mockApiService.updatePostEngagement).not.toHaveBeenCalledWith(postId, 'share');
```

## 🔍 Key Test Scenarios

### 1. Share Button Removal
- **Test**: UI should not render share buttons
- **Verification**: `screen.queryAllByRole('button', { name: /share/i })`
- **Expected**: Length should be 0

### 2. Share Count Removal
- **Test**: Share counts should not be displayed
- **Verification**: No share count elements in DOM
- **Expected**: Only like and comment counts visible

### 3. Share API Prevention
- **Test**: Share API endpoint should never be called
- **Verification**: Mock call verification
- **Expected**: No calls with 'share' action

### 4. Regression Prevention
- **Test**: Like and comment features work unchanged
- **Verification**: API calls and WebSocket interactions
- **Expected**: All non-sharing features functional

## 🛠️ Implementation Guide

### Step 1: Run Tests (Should Fail)
```bash
node test-runner.js
```
All tests expecting sharing removal should fail.

### Step 2: Remove Share Import
```typescript
// Remove from imports in SocialMediaFeed.tsx:
import { Share2 } from 'lucide-react';  // ❌ Remove this
```

### Step 3: Remove Share UI Elements
```typescript
// Remove share button JSX:
<button onClick={() => handleSharePost(post.id, post.shares || 0)}>
  <Share2 className="h-5 w-5" />
  <span>{post.shares || 0}</span>
</button>
```

### Step 4: Remove Share Handler
```typescript
// Remove handleSharePost function entirely
const handleSharePost = async (postId: string, currentShares: number) => {
  // ❌ Delete this entire function
};
```

### Step 5: Update Interface (Optional)
```typescript
// Remove shares from AgentPost interface if not used elsewhere:
interface AgentPost {
  // ... other properties
  likes?: number;
  comments?: number;
  // shares?: number;  // ❌ Remove if not used elsewhere
}
```

### Step 6: Run Tests Again (Should Pass)
```bash
node test-runner.js
```
All tests should now pass.

## 📊 Expected Test Results

### Before Implementation
```
❌ sharing-removal.acceptance.test.ts - FAILED (sharing still present)
❌ sharing-ui-isolation.test.ts - FAILED (share buttons rendered)
❌ api-interaction.test.ts - FAILED (share API calls made)
✅ regression-prevention.test.ts - PASSED (other features work)
❌ integration-outside-in.test.ts - FAILED (sharing in workflows)
```

### After Implementation
```
✅ sharing-removal.acceptance.test.ts - PASSED (no sharing functionality)
✅ sharing-ui-isolation.test.ts - PASSED (no share buttons)
✅ api-interaction.test.ts - PASSED (no share API calls)
✅ regression-prevention.test.ts - PASSED (other features work)
✅ integration-outside-in.test.ts - PASSED (workflows without sharing)
```

## 🎓 London School Learning Points

1. **Mock Everything**: All external dependencies are mocked
2. **Test Interactions**: Focus on how objects collaborate
3. **Outside-In**: Start with user behavior, work inward
4. **Red-Green-Refactor**: Tests fail first, then make them pass
5. **Contract Design**: Mocks define interfaces and expectations

## 🔧 Custom Test Matchers

### `toHaveBeenCalledWithoutShare()`
Verifies that a mock was never called with share-related arguments.

### `toHaveEngagementButtonsWithoutShare()`
Verifies that component has like/comment buttons but no share buttons.

### `toHaveInteractionContract()`
Verifies complete interaction contracts including expected and excluded calls.

## 📈 Coverage Goals

- **Line Coverage**: 100% of modified lines
- **Branch Coverage**: All conditional paths
- **Function Coverage**: All engagement-related functions
- **Interaction Coverage**: All API and WebSocket calls

## 🚀 Integration with CI/CD

```bash
# In package.json scripts:
{
  "test:sharing-removal": "cd tests/tdd-sharing-removal && node test-runner.js",
  "test:sharing-removal:coverage": "cd tests/tdd-sharing-removal && node test-runner.js --coverage"
}
```

## 📝 Notes

- Tests are designed to fail initially and pass after implementation
- Focus on **behavior verification** over **state testing**
- All external dependencies are mocked for isolation
- Regression prevention is prioritized throughout
- Coverage reports are generated in `coverage/tdd-sharing-removal/`

---

This test suite demonstrates **rigorous TDD London School methodology** for safe feature removal with comprehensive regression protection.