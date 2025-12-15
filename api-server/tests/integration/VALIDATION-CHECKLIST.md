# Post Creation Fix - TDD Validation Checklist

Use this checklist to validate the test suite before running against production code.

---

## Pre-Test Validation

### Environment Setup
- [ ] Node.js version >= 16.0.0
- [ ] Dependencies installed (`npm install`)
- [ ] Vitest installed (`npm list vitest`)
- [ ] Supertest installed (`npm list supertest`)
- [ ] Better-SQLite3 installed (`npm list better-sqlite3`)

### File Structure
- [ ] Test file exists: `/workspaces/agent-feed/api-server/tests/integration/create-post-fix.test.js`
- [ ] Config file exists: `/workspaces/agent-feed/api-server/vitest.config.js`
- [ ] README exists: `/workspaces/agent-feed/api-server/tests/integration/README.md`
- [ ] Test runner exists: `/workspaces/agent-feed/api-server/tests/integration/run-tests.sh`
- [ ] Test runner is executable: `chmod +x run-tests.sh`

### Test File Validation
- [ ] Syntax valid: `node -c tests/integration/create-post-fix.test.js`
- [ ] No lint errors
- [ ] All imports resolve
- [ ] ES module syntax used (import/export)

---

## Test Categories Validation

### 1. Schema Validation (3 tests)
- [ ] Tests verify camelCase columns exist
- [ ] Tests verify snake_case columns do NOT exist
- [ ] Tests verify all required columns present
- [ ] Tests verify foreign key constraints

### 2. Post Creation Success (6 tests)
- [ ] Tests create posts via API
- [ ] Tests verify database persistence
- [ ] Tests verify authorAgent (camelCase)
- [ ] Tests verify publishedAt timestamp
- [ ] Tests verify metadata JSON
- [ ] Tests verify engagement JSON

### 3. Data Transformation (3 tests)
- [ ] Tests transform author_agent → authorAgent
- [ ] Tests handle both snake_case and camelCase
- [ ] Tests maintain data integrity
- [ ] Tests handle unicode and special chars

### 4. Default Values (3 tests)
- [ ] Tests default metadata = {}
- [ ] Tests default engagement = {comments:0, likes:0, shares:0, views:0}
- [ ] Tests custom values override defaults

### 5. Edge Cases (7 tests)
- [ ] Tests long content with URLs
- [ ] Tests special characters
- [ ] Tests empty metadata
- [ ] Tests missing optional fields
- [ ] Tests reject non-existent author
- [ ] Tests concurrent creation (5 posts)

### 6. Regression Tests (6 tests)
- [ ] Tests read existing posts
- [ ] Tests retrieve specific post
- [ ] Tests search functionality
- [ ] Tests feed loading
- [ ] Tests maintain existing data
- [ ] Tests mixed old/new posts

### 7. Error Handling (5 tests)
- [ ] Tests reject missing title
- [ ] Tests reject missing content
- [ ] Tests reject missing author_agent
- [ ] Tests handle malformed JSON
- [ ] Tests handle DB errors

---

## Test Quality Checks

### Test Independence
- [ ] Each test can run independently
- [ ] Tests don't depend on execution order
- [ ] Database cleared before each test
- [ ] No shared state between tests

### Test Clarity
- [ ] Test names describe what they test
- [ ] Test names follow pattern: "should [action] [expected result]"
- [ ] Tests use Arrange-Act-Assert structure
- [ ] Assertion messages are clear

### Test Coverage
- [ ] Tests cover happy path scenarios
- [ ] Tests cover error scenarios
- [ ] Tests cover edge cases
- [ ] Tests cover regression scenarios

### Test Performance
- [ ] Individual tests complete < 1 second
- [ ] Full suite completes < 10 seconds
- [ ] No unnecessary delays/sleeps
- [ ] Database operations optimized

---

## London School TDD Validation

### Behavior Testing
- [ ] Tests verify behavior, not implementation
- [ ] Tests simulate real user interactions
- [ ] Tests verify observable outcomes
- [ ] Tests don't test private methods

### Integration Testing
- [ ] Tests use real database (no mocks)
- [ ] Tests use real HTTP requests
- [ ] Tests verify component interactions
- [ ] Tests verify data flow

### Outside-In Approach
- [ ] Tests start from API level
- [ ] Tests work through to database
- [ ] Tests verify complete flow
- [ ] Tests represent user stories

---

## Run Tests - Validation Steps

### Step 1: Syntax Check
```bash
cd /workspaces/agent-feed/api-server
node -c tests/integration/create-post-fix.test.js
```
- [ ] No syntax errors
- [ ] File loads successfully

### Step 2: Import Check
```bash
node --experimental-modules tests/integration/create-post-fix.test.js
```
- [ ] All imports resolve
- [ ] No module errors

### Step 3: Dry Run (First Test Only)
```bash
npm test -- --testNamePattern="should have correct column names" tests/integration/create-post-fix.test.js
```
- [ ] Test database created
- [ ] Test executes
- [ ] Test produces clear output

### Step 4: Category Run (Schema Validation)
```bash
npm test -- --testNamePattern="Schema Validation" tests/integration/create-post-fix.test.js
```
- [ ] All 3 tests run
- [ ] Tests complete successfully
- [ ] Clear pass/fail output

### Step 5: Full Suite Run
```bash
npm test tests/integration/create-post-fix.test.js
```
- [ ] All 33 tests run
- [ ] Test execution time < 10s
- [ ] All tests have clear output
- [ ] Summary shows test count

### Step 6: Coverage Run
```bash
npm run test:coverage tests/integration/create-post-fix.test.js
```
- [ ] Coverage report generated
- [ ] Statements > 80%
- [ ] Branches > 75%
- [ ] Functions > 80%
- [ ] Lines > 80%

### Step 7: Watch Mode Test
```bash
npm run test:watch tests/integration/create-post-fix.test.js
# Make a small change to test file
# Save file
```
- [ ] Tests auto-run on save
- [ ] Watch mode responsive
- [ ] Clear feedback on changes

---

## Expected Results Validation

### All Tests Pass Scenario
```
✓ Post Creation Fix - TDD Suite (33)
  ✓ 1. Schema Validation (3)
  ✓ 2. Post Creation Success (6)
  ✓ 3. Data Transformation (3)
  ✓ 4. Default Values (3)
  ✓ 5. Edge Cases (7)
  ✓ 6. Regression Tests (6)
  ✓ 7. Error Handling (5)

Test Files  1 passed (1)
     Tests  33 passed (33)
  Duration  4.56s
```
- [ ] 33/33 tests pass
- [ ] Execution time reasonable
- [ ] No warnings or errors
- [ ] Clean output

### Test Failure Scenario
```
✗ should save post to database with correct column names
  AssertionError: expected undefined to be 'test-agent-1'
  ❯ tests/integration/create-post-fix.test.js:226:35
```
- [ ] Error message clear
- [ ] Line number accurate
- [ ] Assertion expectation shown
- [ ] Easy to debug

---

## Database Validation

### Test Database Creation
- [ ] Test database created at: `test-database.db`
- [ ] Database has correct schema
- [ ] Tables created correctly
- [ ] Foreign keys enforced

### Test Database Cleanup
- [ ] Database cleared between tests
- [ ] Database removed after suite
- [ ] No data leakage between tests

### Schema Verification
```bash
sqlite3 test-database.db ".schema posts"
```
Expected output:
```sql
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  authorAgent TEXT NOT NULL,
  publishedAt TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  engagement TEXT DEFAULT '{"comments":0,"likes":0,"shares":0,"views":0}',
  FOREIGN KEY (authorAgent) REFERENCES agents(id)
);
```
- [ ] Schema matches expected
- [ ] Column names are camelCase
- [ ] Defaults are correct
- [ ] Foreign key exists

---

## Coverage Report Validation

### Open Coverage Report
```bash
open coverage/index.html
```

### Verify Coverage
- [ ] Server.js covered
- [ ] Routes covered
- [ ] Post creation endpoint covered
- [ ] Database operations covered
- [ ] Error handling covered

### Coverage Thresholds
- [ ] Overall: Statements > 80%
- [ ] Overall: Branches > 75%
- [ ] Overall: Functions > 80%
- [ ] Overall: Lines > 80%
- [ ] No untested critical paths

---

## Integration with Existing System

### API Server Compatibility
- [ ] Tests work with existing server.js
- [ ] Tests use correct API endpoints
- [ ] Tests compatible with middleware
- [ ] Tests respect authentication (if any)

### Database Compatibility
- [ ] Tests use same database driver
- [ ] Tests use same schema
- [ ] Tests compatible with migrations
- [ ] Tests don't affect production DB

### Environment Variables
- [ ] NODE_ENV=test set correctly
- [ ] DB_PATH points to test database
- [ ] No production env vars used

---

## CI/CD Readiness

### GitHub Actions Compatibility
- [ ] Tests run in CI environment
- [ ] No interactive prompts
- [ ] Exit codes correct (0=pass, 1=fail)
- [ ] Output parseable by CI tools

### Artifacts
- [ ] Coverage report generated
- [ ] Test results exportable
- [ ] Screenshots available (if any)
- [ ] Logs captured

---

## Documentation Validation

### README.md
- [ ] Quick start instructions clear
- [ ] All commands tested
- [ ] Examples accurate
- [ ] Troubleshooting helpful

### TEST-SUITE-SUMMARY.md
- [ ] Test count accurate (33)
- [ ] Categories described
- [ ] Examples current
- [ ] Links work

### VALIDATION-CHECKLIST.md
- [ ] All checkboxes relevant
- [ ] Instructions clear
- [ ] Commands accurate
- [ ] Complete coverage

---

## Final Pre-Production Checklist

Before running against production code:

### Code Review
- [ ] Tests reviewed by team
- [ ] Test strategy approved
- [ ] Coverage thresholds agreed
- [ ] Edge cases identified

### Risk Assessment
- [ ] Tests don't modify production DB
- [ ] Tests isolated from production
- [ ] Rollback plan in place
- [ ] Monitoring in place

### Success Criteria
- [ ] 33/33 tests must pass
- [ ] Coverage > 80% achieved
- [ ] No flaky tests
- [ ] Execution time acceptable

### Deployment Plan
- [ ] Tests run before deploy
- [ ] Tests run in staging
- [ ] Tests run in CI/CD
- [ ] Team notified of results

---

## Post-Test Validation

After running tests against production code:

### Results Analysis
- [ ] All tests passed/failed as expected
- [ ] Coverage meets thresholds
- [ ] No unexpected behaviors
- [ ] Performance acceptable

### Issue Tracking
- [ ] Failed tests documented
- [ ] Root causes identified
- [ ] Fixes planned
- [ ] Tickets created

### Next Steps
- [ ] Code changes merged
- [ ] Documentation updated
- [ ] Team notified
- [ ] Production deployment scheduled

---

## Sign-Off

### QA Engineer
- [ ] All validations complete
- [ ] Tests meet quality standards
- [ ] Documentation complete
- [ ] Ready for production

**Name:** _________________
**Date:** _________________
**Signature:** _________________

### Tech Lead
- [ ] Test strategy approved
- [ ] Coverage acceptable
- [ ] Risks assessed
- [ ] Deployment approved

**Name:** _________________
**Date:** _________________
**Signature:** _________________

---

**Validation Completed:** ____/____/____
**Test Suite Version:** 1.0.0
**Last Updated:** 2025-10-21
