# Post Creation Fix - TDD Test Suite

Comprehensive integration test suite for validating the post creation fix using real database testing and London School TDD principles.

## 📋 Test Coverage

### 1. Schema Validation (3 tests)
- ✅ Verify column names match database schema
- ✅ Verify all required columns included
- ✅ Verify proper foreign key constraints

### 2. Post Creation Success (6 tests)
- ✅ Create post with all fields
- ✅ Verify post saved to database
- ✅ Verify authorAgent (camelCase) populated
- ✅ Verify publishedAt (camelCase) populated
- ✅ Verify metadata JSON created
- ✅ Verify engagement JSON initialized

### 3. Data Transformation (3 tests)
- ✅ Transform author_agent (snake_case) → authorAgent (camelCase)
- ✅ Handle both snake_case and camelCase input
- ✅ Maintain data integrity during transformation

### 4. Default Values (3 tests)
- ✅ Metadata defaults to {} if not provided
- ✅ Engagement defaults to {comments:0, likes:0, shares:0, views:0}
- ✅ Use provided metadata over defaults

### 5. Edge Cases (7 tests)
- ✅ Long content with URL
- ✅ Special characters in title/content
- ✅ Empty metadata object
- ✅ Missing optional fields
- ✅ Reject non-existent author
- ✅ Handle concurrent post creation

### 6. Regression Tests (6 tests)
- ✅ Read existing posts correctly
- ✅ Retrieve specific existing post
- ✅ Search existing posts
- ✅ Load feed with existing posts
- ✅ Maintain existing post data when creating new posts
- ✅ Handle mixed old and new posts in feed

### 7. Error Handling (5 tests)
- ✅ Reject post without title
- ✅ Reject post without content
- ✅ Reject post without author_agent
- ✅ Handle malformed JSON gracefully
- ✅ Handle database errors gracefully

**Total Tests: 33**

## 🚀 Quick Start

### Prerequisites

```bash
# Install dependencies
cd /workspaces/agent-feed/api-server
npm install --save-dev jest supertest better-sqlite3
```

### Run All Tests

```bash
# Run all integration tests
npm test -- tests/integration/create-post-fix.test.js

# Run with coverage
npm test -- --coverage tests/integration/create-post-fix.test.js

# Run in watch mode (for TDD)
npm test -- --watch tests/integration/create-post-fix.test.js

# Run specific test suite
npm test -- --testNamePattern="Schema Validation" tests/integration/create-post-fix.test.js
```

### Run Individual Test Categories

```bash
# Schema validation only
npm test -- --testNamePattern="1. Schema Validation"

# Post creation success only
npm test -- --testNamePattern="2. Post Creation Success"

# Data transformation only
npm test -- --testNamePattern="3. Data Transformation"

# Default values only
npm test -- --testNamePattern="4. Default Values"

# Edge cases only
npm test -- --testNamePattern="5. Edge Cases"

# Regression tests only
npm test -- --testNamePattern="6. Regression Tests"

# Error handling only
npm test -- --testNamePattern="7. Error Handling"
```

## 📊 Coverage Requirements

Following TDD best practices, we maintain strict coverage thresholds:

| Metric      | Threshold |
|-------------|-----------|
| Statements  | 80%       |
| Branches    | 75%       |
| Functions   | 80%       |
| Lines       | 80%       |

## 🔬 Test Principles

This test suite follows **London School TDD** principles:

1. **Test Behavior, Not Implementation**
   - Focus on what the system does, not how it does it
   - Tests verify interactions between components

2. **Real Database Integration**
   - No mocks for database interactions
   - Tests use actual SQLite database
   - Ensures real-world behavior validation

3. **Isolated Test Cases**
   - Each test is independent
   - Database cleared before each test
   - No shared state between tests

4. **Comprehensive Coverage**
   - Happy path scenarios
   - Edge cases and boundaries
   - Error conditions
   - Regression protection

5. **Clear Test Structure**
   ```javascript
   test('should do something specific', () => {
     // Arrange - Set up test data
     // Act - Perform the operation
     // Assert - Verify the result
   });
   ```

## 🛠️ Debugging Tests

### Run Single Test

```bash
npm test -- --testNamePattern="should create post with all fields"
```

### Verbose Output

```bash
npm test -- --verbose tests/integration/create-post-fix.test.js
```

### Debug Mode

```bash
node --inspect-brk node_modules/.bin/jest tests/integration/create-post-fix.test.js
```

### View Test Database

After a test run, the test database remains at:
```
/workspaces/agent-feed/api-server/test-database.db
```

You can inspect it using:
```bash
sqlite3 test-database.db
.schema posts
SELECT * FROM posts;
```

## 📝 Test Output Example

```
PASS tests/integration/create-post-fix.test.js
  Post Creation Fix - TDD Suite
    1. Schema Validation
      ✓ should have correct column names in database schema (45ms)
      ✓ should include all required columns (12ms)
      ✓ should have proper foreign key constraint (8ms)
    2. Post Creation Success
      ✓ should create post with all fields (123ms)
      ✓ should save post to database with correct column names (98ms)
      ✓ should populate authorAgent with camelCase (87ms)
      ✓ should populate publishedAt with ISO timestamp (92ms)
      ✓ should create metadata JSON correctly (101ms)
      ✓ should initialize engagement JSON with zeros (89ms)
    ...

Test Suites: 1 passed, 1 total
Tests:       33 passed, 33 total
Snapshots:   0 total
Time:        4.567s
```

## 🔍 Custom Matchers

The test suite includes custom Jest matchers:

```javascript
// Validate ISO 8601 timestamps
expect(timestamp).toBeValidISO8601();

// Validate UUIDs
expect(id).toBeValidUUID();

// Validate engagement object structure
expect(engagement).toHaveValidEngagement();
```

## 🎯 TDD Workflow

1. **Red** - Write failing test
   ```bash
   npm test -- --watch tests/integration/create-post-fix.test.js
   ```

2. **Green** - Make test pass with minimal code
   - Implement only what's needed to pass the test

3. **Refactor** - Improve code quality
   - Tests ensure refactoring doesn't break functionality

4. **Repeat** - Continue with next test

## 📦 Dependencies

```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "better-sqlite3": "^9.2.2"
  }
}
```

## 🐛 Common Issues

### Issue: Tests timeout
**Solution**: Increase timeout in jest.config.js or individual tests
```javascript
test('long running test', async () => {
  jest.setTimeout(60000); // 60 seconds
  // test code
}, 60000);
```

### Issue: Database locked
**Solution**: Ensure previous test run cleaned up properly
```bash
rm test-database.db*
npm test
```

### Issue: Port already in use
**Solution**: Kill existing process or use different port
```bash
lsof -ti:3001 | xargs kill -9
npm test
```

## 📖 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [London School TDD](https://softwareengineering.stackexchange.com/questions/123627/what-are-the-london-and-chicago-schools-of-tdd)
- [Better SQLite3 API](https://github.com/WiseLibs/better-sqlite3/wiki/API)

## 🎓 Test Organization

```
api-server/tests/integration/
├── create-post-fix.test.js   # Main test suite (33 tests)
├── jest.config.js             # Jest configuration
├── setup.js                   # Test setup & custom matchers
└── README.md                  # This file
```

## ✅ Success Criteria

All tests pass ✓
- [ ] 33/33 tests passing
- [ ] Coverage > 80%
- [ ] No regression in existing functionality
- [ ] All edge cases handled
- [ ] Error handling validated
- [ ] Performance acceptable (<5s total)

---

**Last Updated**: 2025-10-21
**Maintainer**: QA Team
**Version**: 1.0.0
