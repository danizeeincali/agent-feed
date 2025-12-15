# Post Creation Fix - TDD Quick Reference

**One-page reference for running and understanding the test suite**

---

## 🚀 Quick Start (30 seconds)

```bash
cd /workspaces/agent-feed/api-server

# Run all tests
npm test tests/integration/create-post-fix.test.js

# Expected: 33 tests pass in ~5 seconds
```

---

## 📊 Test Suite Overview

| Category | Tests | Purpose |
|----------|-------|---------|
| Schema Validation | 3 | Verify database schema correctness |
| Post Creation | 6 | Test core functionality |
| Data Transformation | 3 | Validate snake_case → camelCase |
| Default Values | 3 | Check default initialization |
| Edge Cases | 7 | Test boundaries and limits |
| Regression | 6 | Prevent breaking changes |
| Error Handling | 5 | Validate error responses |
| **TOTAL** | **33** | **Comprehensive coverage** |

---

## 💻 Common Commands

```bash
# Full test suite
npm test tests/integration/create-post-fix.test.js

# With coverage
npm run test:coverage tests/integration/create-post-fix.test.js

# Watch mode (TDD workflow)
npm run test:watch tests/integration/create-post-fix.test.js

# Specific category
npm test -- --testNamePattern="Schema Validation"

# Single test
npm test -- --testNamePattern="should create post with all fields"
```

---

## 🎯 Using the Test Runner

```bash
cd tests/integration

# All tests
./run-tests.sh

# Watch mode
./run-tests.sh --watch

# Coverage
./run-tests.sh --coverage

# Specific suite
./run-tests.sh --specific "Edge Cases"
```

---

## 🔍 What Gets Tested

### ✅ Happy Path
- Create post with all fields
- Save to database with camelCase columns
- Initialize defaults
- Return proper response

### ⚠️ Edge Cases
- Long content (>1000 chars)
- Special characters (unicode, emojis)
- Concurrent requests (5 simultaneous)
- Missing optional fields

### ❌ Error Cases
- Missing required fields
- Non-existent author
- Malformed JSON
- Database errors

### 🔄 Regression
- Existing posts readable
- Search still works
- Feed still loads
- No data corruption

---

## 📁 Test Data

### Test Agents
```javascript
'test-agent-1'  // System agent, @testagent, 🤖
'test-agent-2'  // User agent, @anotheragent, 🦾
```

### Sample Post Request
```javascript
POST /api/posts
{
  "title": "Test Post",
  "content": "Post content here",
  "author_agent": "test-agent-1",  // snake_case from frontend
  "metadata": {
    "tags": ["test"],
    "category": "testing"
  }
}
```

### Expected Database Record
```javascript
{
  id: "uuid-here",
  title: "Test Post",
  content: "Post content here",
  authorAgent: "test-agent-1",     // camelCase in database
  publishedAt: "2025-10-21T14:30:00.000Z",
  metadata: '{"tags":["test"],"category":"testing"}',
  engagement: '{"comments":0,"likes":0,"shares":0,"views":0}'
}
```

---

## 🎨 Test Output

### Success ✓
```
Post Creation Fix - TDD Suite
  1. Schema Validation
    ✓ should have correct column names (45ms)
    ✓ should include all required columns (12ms)
    ✓ should have proper foreign key constraint (8ms)
  ...

Test Files  1 passed (1)
     Tests  33 passed (33)
  Duration  4.56s
```

### Failure ✗
```
✗ should save post to database with correct column names
  AssertionError: expected undefined to be 'test-agent-1'

  ❯ tests/integration/create-post-fix.test.js:226:35
    224|   `).get(postId);
    225|
    226|   expect(savedPost.authorAgent).toBe('test-agent-1');
       |                                  ^
```

---

## 🐛 Debugging

### Test Fails
1. Check error message for exact line
2. Run single test: `npm test -- --testNamePattern="failing test name"`
3. Inspect test database: `sqlite3 test-database.db`
4. Check server logs for errors

### Test Timeout
1. Increase timeout in vitest.config.js: `testTimeout: 60000`
2. Check for hanging database connections
3. Verify no infinite loops

### Database Locked
```bash
rm test-database.db*  # Delete test DB
npm test              # Re-run
```

### Import Errors
1. Check package.json has `"type": "module"`
2. Verify all imports use `.js` extension
3. Check file paths are correct

---

## 📈 Coverage Targets

| Metric | Target | Actual |
|--------|--------|--------|
| Statements | >80% | Run tests to see |
| Branches | >75% | Run tests to see |
| Functions | >80% | Run tests to see |
| Lines | >80% | Run tests to see |

View coverage: `npm run test:coverage && open coverage/index.html`

---

## 🔄 TDD Workflow

```
1. RED    Write failing test
          ↓
2. GREEN  Make it pass (minimal code)
          ↓
3. REFACTOR  Improve code quality
          ↓
4. REPEAT    Next test
```

### In Practice
```bash
# Terminal 1: Watch mode
npm run test:watch tests/integration/create-post-fix.test.js

# Terminal 2: Edit code
vim server.js

# Save → Tests auto-run → See results instantly
```

---

## 🗂️ File Structure

```
api-server/tests/integration/
├── create-post-fix.test.js          ⭐ Main test file (33 tests)
├── run-tests.sh                     🚀 Test runner script
├── README.md                        📖 Full documentation
├── TEST-SUITE-SUMMARY.md            📊 Detailed summary
├── VALIDATION-CHECKLIST.md          ✅ Pre-flight checks
└── QUICK-REFERENCE.md               ⚡ This file
```

---

## 🎓 London School TDD

**Key Principles:**
- Test behavior, not implementation
- Use real collaborators (no mocks)
- Focus on interactions between components
- Outside-in testing approach

**In This Suite:**
- Real SQLite database (not mocked)
- Real HTTP requests (via supertest)
- Tests verify complete data flow
- Frontend → API → Database

---

## 🚦 Success Criteria

- [ ] 33/33 tests passing
- [ ] Coverage >80% statements
- [ ] Coverage >75% branches
- [ ] Execution time <10 seconds
- [ ] Zero flaky tests
- [ ] All edge cases handled

---

## 🆘 Help & Resources

### Documentation
- Full README: `./README.md`
- Test Summary: `./TEST-SUITE-SUMMARY.md`
- Validation Checklist: `./VALIDATION-CHECKLIST.md`

### Commands
- Run tests: `npm test tests/integration/create-post-fix.test.js`
- View coverage: `npm run test:coverage`
- Watch mode: `npm run test:watch`

### Debugging
- Inspect DB: `sqlite3 test-database.db`
- Check logs: `tail -f logs/combined.log`
- Single test: `npm test -- --testNamePattern="test name"`

---

## 🎯 Key Test Assertions

### Schema
```javascript
expect(columns).toContain('authorAgent')
expect(columns).not.toContain('author_agent')
```

### Data Transformation
```javascript
// Input: author_agent (snake_case)
// DB: authorAgent (camelCase)
expect(savedPost.authorAgent).toBe('test-agent-1')
```

### Defaults
```javascript
expect(metadata).toEqual({})
expect(engagement).toEqual({comments:0, likes:0, shares:0, views:0})
```

### Timestamps
```javascript
expect(savedPost.publishedAt).toBeDefined()
expect(new Date(savedPost.publishedAt).getTime()).toBeGreaterThan(beforeTime)
```

---

## 📞 Quick Support

**Syntax Error?**
```bash
node -c tests/integration/create-post-fix.test.js
```

**Import Error?**
```bash
# Check package.json has "type": "module"
```

**Test Timeout?**
```bash
# Edit vitest.config.js
testTimeout: 60000
```

**Database Locked?**
```bash
rm test-database.db*
```

---

## 🎬 Example Session

```bash
# 1. Navigate to project
cd /workspaces/agent-feed/api-server

# 2. Run tests
npm test tests/integration/create-post-fix.test.js

# 3. View results
# ✓ 33 tests pass

# 4. Check coverage
npm run test:coverage tests/integration/create-post-fix.test.js

# 5. Open report
open coverage/index.html

# 6. All good? Deploy!
git add .
git commit -m "Fix: Post creation with correct column names"
git push
```

---

**Last Updated:** 2025-10-21
**Test Count:** 33
**Coverage Target:** >80%
**Execution Time:** ~5s
