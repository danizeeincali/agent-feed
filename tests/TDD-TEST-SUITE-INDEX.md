# TDD Test Suite - 4 Fixes

## Overview

This test suite provides comprehensive TDD coverage for 4 critical fixes in the agent-feed application. All tests are written in the RED phase and will FAIL until implementation is complete.

**Total Tests**: 40+
**Test Files**: 4
**Coverage Areas**: Frontend UI, Real-time updates, Backend integration, Processing indicators

## Test Files

### 1. Comment Author Display Tests
**File**: `/workspaces/agent-feed/frontend/src/components/__tests__/CommentThread.author.test.tsx`

**Issue**: Agent comments show "Avi" instead of agent display name

**Test Count**: 11 tests

**Test Coverage**:
- Agent comment displays agent.display_name
- User comment displays user name
- Fallback to "User" when no author
- Correct prioritization: author_agent > author_user_id
- Multiple agents show different names
- Edge cases: missing data, malformed data

**Key Test Scenarios**:
```typescript
✗ should display agent display name instead of "Avi"
✗ should display different names for different agents
✗ should handle agent without display_name gracefully
✗ should display user name for user comments
✗ should fallback to "User" when no author data
✗ should prioritize author_agent over author_user_id
✗ should correctly display mixed agent and user comments
✗ should handle empty agent object
✗ should handle malformed display_name
```

---

### 2. Real-Time Comment Updates Tests
**File**: `/workspaces/agent-feed/frontend/src/components/__tests__/RealSocialMediaFeed.realtime.test.tsx`

**Issue**: Comment counter doesn't update in real-time

**Test Count**: 14 tests

**Test Coverage**:
- WebSocket event registration/cleanup
- Comment counter real-time updates
- Visible comments reload on event
- Collapsed comments don't reload (performance)
- Multiple posts handle events independently
- No duplicate reloads
- Error handling

**Key Test Scenarios**:
```typescript
✗ should register comment:created event listener on mount
✗ should unregister event listener on unmount
✗ should increment comment counter when comment:created event fires
✗ should update from 0 to 1 comment
✗ should handle multiple rapid events correctly
✗ should reload visible comments when event fires
✗ should NOT reload collapsed comments (performance optimization)
✗ should only update the specific post that received a comment
✗ should handle events for non-existent posts gracefully
✗ should not duplicate reload requests
✗ should handle malformed WebSocket events gracefully
✗ should handle failed comment reload gracefully
```

---

### 3. Next Step Post WebSocket Emission Tests
**File**: `/workspaces/agent-feed/tests/integration/onboarding-next-step.test.js`

**Issue**: Name submission doesn't emit WebSocket event for use case post

**Test Count**: 12 tests

**Test Coverage**:
- Name submission creates use case post
- WebSocket emits post:created event
- Post has correct onboarding metadata
- Frontend receives and displays post
- No duplicate posts created
- Event contains complete post data
- Error handling

**Key Test Scenarios**:
```javascript
✗ should create use case post after name submission
✗ should emit post:created WebSocket event after name submission
✗ should include complete post data in WebSocket event
✗ should allow frontend to receive and display new post
✗ should emit event to all connected clients
✗ should not create duplicate posts on repeated name submissions
✗ should not emit duplicate WebSocket events
✗ should include correct onboarding step in post
✗ should associate post with correct user
✗ should mark post as system-generated
✗ should handle missing name gracefully
✗ should not emit WebSocket event on error
✗ should emit WebSocket event immediately after post creation
```

---

### 4. Comment Processing Indicator Tests
**File**: `/workspaces/agent-feed/frontend/src/components/__tests__/CommentThread.processing.test.tsx`

**Issue**: No visual feedback while waiting for agent reply

**Test Count**: 13 tests

**Test Coverage**:
- Processing indicator shows after comment submission
- Indicator hides when agent reply arrives
- Multiple comments can process simultaneously
- Timeout clears stale processing states (30s)
- Visual consistency with post processing pill
- Indicator only shows for user's own comments

**Key Test Scenarios**:
```typescript
✗ should show processing indicator after comment submission
✗ should show processing pill similar to post processing indicator
✗ should include loading animation in processing indicator
✗ should hide indicator when agent reply arrives via WebSocket
✗ should hide indicator on timeout (30 seconds)
✗ should clear timeout when agent reply arrives before timeout
✗ should handle multiple processing comments simultaneously
✗ should remove only the specific processing indicator when reply arrives
✗ should match post processing pill styling
✗ should display in same location as post processing indicator
✗ should not show indicator for comments that already have replies
✗ should handle component unmount with active processing state
✗ should only show indicator for user's own comments
```

---

## Running Tests

### Frontend Tests (Vitest)

```bash
# Run all frontend tests
npm test

# Run specific test file
npm test -- CommentThread.author.test.tsx
npm test -- RealSocialMediaFeed.realtime.test.tsx
npm test -- CommentThread.processing.test.tsx

# Run in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

### Backend Tests (Jest)

```bash
# Run integration tests
npm run test:integration

# Run specific test file
npm run test:integration -- onboarding-next-step.test.js

# Run with coverage
npm run test:integration -- --coverage
```

## Expected Initial Results

**Current Status**: ALL TESTS FAILING (RED PHASE)

This is expected and correct for TDD:

```
FAIL  frontend/src/components/__tests__/CommentThread.author.test.tsx
FAIL  frontend/src/components/__tests__/RealSocialMediaFeed.realtime.test.tsx
FAIL  tests/integration/onboarding-next-step.test.js
FAIL  frontend/src/components/__tests__/CommentThread.processing.test.tsx

Test Suites: 4 failed, 4 total
Tests:       40+ failed, 40+ total
```

## TDD Implementation Workflow

### Phase 1: RED (Current)
- ✅ All tests written
- ✅ All tests failing
- ✅ Tests define expected behavior

### Phase 2: GREEN (Next)
Implement minimal code to make tests pass:

1. **Issue 1**: Update CommentThread to use agent.display_name
2. **Issue 2**: Add WebSocket listener for comment:created events
3. **Issue 3**: Emit WebSocket event after name submission
4. **Issue 4**: Add processing indicator state management

### Phase 3: REFACTOR
- Clean up code
- Remove duplication
- Improve readability
- Optimize performance

## Test Quality Metrics

### Coverage Goals
- **Statements**: >90%
- **Branches**: >85%
- **Functions**: >90%
- **Lines**: >90%

### Test Characteristics
- ✅ Fast (unit tests <100ms)
- ✅ Isolated (no dependencies between tests)
- ✅ Repeatable (same result every time)
- ✅ Self-validating (clear pass/fail)
- ✅ Comprehensive (edge cases covered)

## Key Testing Patterns Used

### 1. Arrange-Act-Assert (AAA)
```typescript
it('should do something', () => {
  // Arrange
  const mockData = { ... };

  // Act
  render(<Component {...mockData} />);

  // Assert
  expect(screen.getByText('expected')).toBeInTheDocument();
});
```

### 2. Mock WebSocket Events
```typescript
mockSocketOn.mockImplementation((event, handler) => {
  socketEventHandlers[event] = handler;
});

// Later trigger event
socketEventHandlers['comment:created']({ postId: 1, comment: {...} });
```

### 3. Async Testing
```typescript
await waitFor(() => {
  expect(screen.getByText('updated')).toBeInTheDocument();
});
```

### 4. User Interaction
```typescript
const user = userEvent.setup();
await user.type(textarea, 'text');
await user.click(button);
```

## Success Criteria

Tests will pass when:

1. **Issue 1**: Each agent shows unique display_name in comments
2. **Issue 2**: Comment counter updates immediately via WebSocket
3. **Issue 3**: post:created event emits after name submission
4. **Issue 4**: Processing indicator appears and clears correctly

## Next Steps

1. Run tests to confirm RED phase: `npm test`
2. Implement fixes one at a time
3. Watch tests turn GREEN
4. Refactor for quality
5. Verify all tests pass
6. Check coverage metrics

---

**Created**: 2025-11-14
**Status**: RED Phase Complete
**Tests Written**: 40+
**Tests Passing**: 0 (Expected)
**Ready For**: Implementation Phase
