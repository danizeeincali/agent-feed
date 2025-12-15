# Comment Counter Test Suite - TDD Documentation

## Overview

This comprehensive test suite validates the comment counter functionality using a Test-Driven Development (TDD) approach. All tests use **REAL** backend integration (no mocks or simulations).

## Test Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Test Pyramid                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              /\                                         │
│             /E2E\         <- 15 tests                   │
│            /------\                                     │
│           /Integr. \     <- 10 tests                    │
│          /----------\                                   │
│         /   Unit     \   <- 16 tests                    │
│        /--------------\                                 │
│                                                         │
│   Total: 41 Comprehensive Tests                        │
└─────────────────────────────────────────────────────────┘
```

## Test Files

### 1. Unit Tests
**File:** `/workspaces/agent-feed/frontend/src/tests/unit/comment-counter.test.tsx`

**Purpose:** Test display logic and edge cases in isolation

**Test Categories:**
- Display Logic (6 tests)
  - ✓ Display 0 when comments undefined
  - ✓ Display 0 when comments is 0
  - ✓ Display 1 when comments is 1
  - ✓ Display 5 when comments is 5
  - ✓ Display 999 for values under 1000
  - ✓ Display 1000 for exactly 1000

- Edge Cases (4 tests)
  - ✓ Handle null comments field
  - ✓ Handle negative numbers
  - ✓ Handle very large numbers
  - ✓ Handle undefined gracefully

- TypeScript Type Safety (2 tests)
  - ✓ Enforce AgentPost type correctly
  - ✓ Allow optional comments field

- Fallback Behavior (4 tests)
  - ✓ Display 0 as fallback
  - ✓ NOT use engagement.comments

**Run Command:**
```bash
cd frontend
npm run test:unit -- comment-counter
```

### 2. Integration Tests
**File:** `/workspaces/agent-feed/frontend/src/tests/integration/comment-counter-integration.test.tsx`

**Purpose:** Test API integration with real backend at localhost:3001

**Requirements:** Backend server must be running

**Test Categories:**
- API Response Structure (3 tests)
  - ✓ Posts have comments field at root level
  - ✓ Comments is a number
  - ✓ New posts have comments=0

- Component Data Flow (2 tests)
  - ✓ Render counts from API data
  - ✓ Update counter when data changes

- State Management (2 tests)
  - ✓ Maintain consistent counts
  - ✓ Reflect API data accurately

- Real-world Scenarios (3 tests)
  - ✓ Handle posts with zero comments
  - ✓ Handle posts with multiple comments
  - ✓ Handle API errors gracefully

- Performance (1 test)
  - ✓ Handle large datasets efficiently (<1000ms)

**Run Command:**
```bash
cd frontend
npm run test:integration -- comment-counter
```

### 3. E2E Tests
**File:** `/workspaces/agent-feed/frontend/tests/e2e/comment-counter.spec.ts`

**Purpose:** Test user interactions in real browser

**Requirements:**
- Frontend running at localhost:5173
- Backend running at localhost:3001

**Test Categories:**
- Visibility and Display (4 tests)
  - ✓ Counter visible on page load
  - ✓ Show count as number
  - ✓ Display 0 for no comments
  - ✓ Display actual count for posts with comments

- User Interactions (3 tests)
  - ✓ Open comments on click
  - ✓ Toggle comments section
  - ✓ Show hover effect

- Dark Mode Compatibility (2 tests)
  - ✓ Display correctly in dark mode
  - ✓ Toggle between modes smoothly

- Responsive Design (4 tests)
  - ✓ Desktop (1920x1080)
  - ✓ Tablet (768x1024)
  - ✓ Mobile (375x667)
  - ✓ Touch-friendly (44x44 minimum)

- Accessibility (3 tests)
  - ✓ Accessible button role
  - ✓ Accessible name/label
  - ✓ Keyboard navigable

- Data Accuracy (2 tests)
  - ✓ Match API data exactly
  - ✓ Update when data changes

- Edge Cases (2 tests)
  - ✓ Handle long numbers
  - ✓ Consistent across refreshes

**Run Command:**
```bash
cd frontend
npx playwright test comment-counter
```

## Test Coverage

### Code Coverage Targets
- **Statements:** >80%
- **Branches:** >75%
- **Functions:** >80%
- **Lines:** >80%

### Feature Coverage
| Feature | Unit | Integration | E2E | Total |
|---------|------|-------------|-----|-------|
| Display Logic | 6 | 2 | 4 | 12 |
| Edge Cases | 4 | 3 | 2 | 9 |
| API Integration | 0 | 3 | 2 | 5 |
| User Interaction | 0 | 0 | 3 | 3 |
| Accessibility | 0 | 0 | 3 | 3 |
| Responsive Design | 0 | 0 | 4 | 4 |
| Dark Mode | 0 | 0 | 2 | 2 |
| Performance | 0 | 1 | 0 | 1 |
| Type Safety | 2 | 0 | 0 | 2 |
| **Total** | **16** | **10** | **15** | **41** |

## Running Tests

### Prerequisites
```bash
# 1. Start backend server
cd api-server
npm start  # Should run on http://localhost:3001

# 2. Start frontend server (for E2E only)
cd frontend
npm run dev  # Should run on http://localhost:5173
```

### Run All Tests
```bash
# From frontend directory
npm run test              # All unit tests
npm run test:integration  # Integration tests
npm run test:e2e          # E2E tests
```

### Run Specific Test Suites
```bash
# Unit tests only
npm run test -- comment-counter.test.tsx

# Integration tests only
npm run test:integration -- comment-counter-integration

# E2E tests only
npx playwright test comment-counter.spec.ts

# E2E with UI mode
npx playwright test --ui comment-counter.spec.ts

# E2E headed mode (see browser)
npx playwright test --headed comment-counter.spec.ts
```

### Generate Coverage Reports
```bash
# Unit test coverage
npm run test -- --coverage

# View coverage report
open frontend/src/tests/coverage/index.html
```

## Test Data Requirements

### Backend API Endpoints Used
- `GET /api/agent-posts?limit=X&offset=Y` - Fetch posts
- `GET /api/agent-posts/:id` - Fetch single post
- `POST /api/agent-posts` - Create test post
- `DELETE /api/agent-posts/:id` - Delete test post
- `POST /api/agent-posts/:id/comments` - Create comment

### Expected API Response Format
```typescript
{
  "success": true,
  "data": [
    {
      "id": "string",
      "title": "string",
      "content": "string",
      "authorAgent": "string",
      "comments": 0,  // ← MUST be at root level
      "engagement": {
        "comments": 0, // ← Not used
        "shares": 0,
        "views": 0
      }
      // ... other fields
    }
  ],
  "total": 100
}
```

## Bug Fix Verification

### Original Bug
- Counter read from: `post.engagement?.comments`
- Expected location: `post.comments`

### Fix Applied
```typescript
// BEFORE (Bug):
<span>{post.engagement?.comments || 0}</span>

// AFTER (Fixed):
<span>{post.comments || 0}</span>
```

### Tests Verifying Fix
1. **Unit Test:** "should NOT use engagement.comments as fallback"
2. **Integration Test:** "Posts have comments field at root level"
3. **E2E Test:** "should match API data exactly"

## Continuous Integration

### CI/CD Pipeline
```yaml
# Example GitHub Actions workflow
name: Comment Counter Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        # ... database config

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd api-server && npm install
          cd frontend && npm install

      - name: Start backend
        run: cd api-server && npm start &

      - name: Run unit tests
        run: cd frontend && npm run test -- comment-counter

      - name: Run integration tests
        run: cd frontend && npm run test:integration -- comment-counter

      - name: Run E2E tests
        run: cd frontend && npx playwright test comment-counter

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Debugging Failed Tests

### Common Issues

#### 1. Backend Not Running
```
Error: API not accessible at http://localhost:3001
Solution: Start backend with `cd api-server && npm start`
```

#### 2. Frontend Not Running (E2E)
```
Error: page.goto: net::ERR_CONNECTION_REFUSED
Solution: Start frontend with `cd frontend && npm run dev`
```

#### 3. Test Timeout
```
Error: Test timeout of 30000ms exceeded
Solution: Increase timeout in vitest.config.ts or playwright.config.ts
```

#### 4. Port Already in Use
```
Error: Port 3001 is already in use
Solution: Kill process using port or change port in config
```

### Debug Commands
```bash
# Run tests in debug mode
npm run test -- --reporter=verbose comment-counter

# Run E2E tests with debug
npx playwright test --debug comment-counter

# Run specific test
npm run test -- -t "should display 0 when comments undefined"

# Watch mode
npm run test -- --watch comment-counter
```

## Test Maintenance

### When to Update Tests

1. **API Schema Changes**
   - Update TypeScript interfaces
   - Update integration test expectations
   - Update API response examples

2. **UI Changes**
   - Update E2E selectors
   - Update accessibility tests
   - Update responsive design tests

3. **New Features**
   - Add new test cases
   - Update coverage requirements
   - Document new test scenarios

### Test Review Checklist
- [ ] All tests pass locally
- [ ] No flaky tests (run 3 times)
- [ ] Coverage meets thresholds
- [ ] Tests are well-documented
- [ ] No console errors
- [ ] Performance within limits
- [ ] Accessibility standards met
- [ ] Works in all browsers (E2E)
- [ ] Dark mode tested
- [ ] Mobile responsive

## Success Criteria

### All Tests Must:
1. ✓ Run without mocks (real backend)
2. ✓ Pass consistently (no flakes)
3. ✓ Complete within timeout
4. ✓ Meet coverage targets
5. ✓ Follow TDD principles
6. ✓ Be maintainable
7. ✓ Document edge cases
8. ✓ Verify the fix

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [WCAG Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## Author
Generated using TDD methodology with comprehensive coverage of all comment counter functionality.

## Last Updated
2025-10-16
