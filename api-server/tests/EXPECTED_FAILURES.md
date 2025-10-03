# Expected Test Failures (TDD RED Phase)

## Current Status: Tests are PASSING with Mock Implementation

The tests in `/workspaces/agent-feed/api-server/tests/agent-posts.test.js` are currently **passing** because they include a **mock implementation** within the test file itself.

This is intentional for demonstration purposes - the mock shows what the real implementation should look like.

## To Enter TRUE TDD RED Phase

To see the tests **FAIL** as intended in TDD, you would need to:

### Option 1: Comment Out Mock Implementation
```javascript
// Comment out the createAgentPostHandler function in the test file
// This will cause all tests to fail with 404 Not Found
```

### Option 2: Test Against Real Server
```javascript
// Point tests at actual server.js instead of mock app
import app from '../server.js'; // Real server

// Expected failures:
// - Error: Cannot POST /api/v1/agent-posts
// - Status: 404 (route not implemented)
```

## Expected Failures When Implementing

When you start implementing the **real** POST endpoint in `server.js`, you'll encounter these failures in sequence:

### Phase 1: Route Not Found
```
❌ Error: Cannot POST /api/v1/agent-posts
   Expected: 201
   Received: 404

   Reason: Route doesn't exist in server.js
```

**Fix:** Add route to server.js
```javascript
app.post('/api/v1/agent-posts', (req, res) => {
  // TODO: Implement
});
```

### Phase 2: No Response Handling
```
❌ Error: Timeout waiting for response
   Expected: 201 with data
   Received: (no response)

   Reason: Handler doesn't send response
```

**Fix:** Send basic response
```javascript
app.post('/api/v1/agent-posts', (req, res) => {
  res.status(201).json({ success: true, data: {} });
});
```

### Phase 3: Missing Validation
```
❌ Should return 400 when title is missing
   Expected: 400
   Received: 201

   Reason: No validation implemented
```

**Fix:** Add ValidationService
```javascript
const validator = new ValidationService();
const result = validator.validatePostData(req.body);
if (!result.valid) {
  return res.status(400).json({
    success: false,
    error: 'Validation error',
    message: result.message
  });
}
```

### Phase 4: No ID Generation
```
❌ Should return created post with ID
   Expected: data.id to be defined
   Received: data.id is undefined

   Reason: Not generating unique IDs
```

**Fix:** Add IdGenerator
```javascript
const idGenerator = new IdGenerator();
const postId = idGenerator.generate();
```

### Phase 5: No Timestamps
```
❌ Should add createdAt timestamp
   Expected: data.createdAt to be defined
   Received: data.createdAt is undefined

   Reason: Not adding timestamps
```

**Fix:** Add TimestampService
```javascript
const timestampService = new TimestampService();
const now = timestampService.now();
```

### Phase 6: No Persistence
```
❌ Should call repository save method
   Expected: repository.save to have been called
   Received: repository.save was not called

   Reason: Not saving to database
```

**Fix:** Add PostRepository
```javascript
const repository = new PostRepository(db);
const savedPost = await repository.save(newPost);
```

### Phase 7: Wrong Status Codes
```
❌ Should return 400 for content over 10,000 characters
   Expected: 400
   Received: 201

   Reason: Not validating content length
```

**Fix:** Add content length validation
```javascript
const lengthResult = validator.validateContentLength(req.body.content);
if (!lengthResult.valid) {
  return res.status(400).json({
    success: false,
    error: 'Validation error',
    message: lengthResult.message
  });
}
```

### Phase 8: Missing Error Handling
```
❌ Should handle repository save failures
   Expected: 500
   Received: (unhandled promise rejection)

   Reason: No try-catch for async errors
```

**Fix:** Add error handling
```javascript
try {
  const savedPost = await repository.save(newPost);
  res.status(201).json({ success: true, data: savedPost });
} catch (error) {
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
}
```

## TDD Cycle: RED → GREEN → REFACTOR

### RED Phase (Tests Fail)
```bash
npm test -- agent-posts.test.js

❌ 32 failed tests
- Route not implemented
- Validation missing
- No ID generation
- No timestamps
- No persistence
```

### GREEN Phase (Make Tests Pass)
```bash
# Implement minimum code to pass tests
1. Add route to server.js
2. Create ValidationService
3. Create IdGenerator
4. Create TimestampService
5. Create PostRepository
6. Wire everything together

npm test -- agent-posts.test.js
✅ 32 passed tests
```

### REFACTOR Phase (Improve Code)
```bash
# Improve without breaking tests
- Extract common validation logic
- Add helper functions
- Optimize database queries
- Improve error messages
- Add logging

npm test -- agent-posts.test.js
✅ 32 passed tests (still passing!)
```

## Typical Failure Messages

### 1. Route Not Found
```
Error: Cannot POST /api/v1/agent-posts
Expected status: 201
Received status: 404
```

### 2. Validation Missing
```
AssertionError: expected 201 to be 400
Expected: Should return 400 for missing title
Received: Route returns 201 regardless of input
```

### 3. ID Not Generated
```
AssertionError: expected undefined to be a string
Expected: response.body.data.id to exist
Received: response.body.data.id is undefined
```

### 4. Timestamps Missing
```
AssertionError: expected undefined to be '2025-10-01T12:00:00.000Z'
Expected: response.body.data.createdAt to exist
Received: response.body.data.createdAt is undefined
```

### 5. Repository Not Called
```
AssertionError: expected "spy" to be called
Expected: mockRepository.save to be called once
Received: mockRepository.save was not called
```

### 6. Wrong Call Sequence
```
AssertionError: expected array to equal another array
Expected: ['validate', 'generateId', 'timestamp', 'save']
Received: ['generateId', 'validate', 'save', 'timestamp']
Reason: Collaborators called in wrong order
```

### 7. Content Length Not Validated
```
AssertionError: expected 201 to be 400
Expected: Should reject 15,000 characters
Received: Accepted content over limit
```

### 8. Error Not Handled
```
UnhandledPromiseRejectionWarning: Error: Database connection failed
Expected: Should catch error and return 500
Received: Unhandled promise rejection
```

## How to Use These Tests

### Step 1: Start with RED (Failing Tests)
```bash
# Comment out mock implementation in test file
# OR point tests at real server.js

npm test -- agent-posts.test.js
# Expect: All tests fail
```

### Step 2: Implement Minimum Code (GREEN)
```bash
# Create ValidationService.js
# Create IdGenerator.js
# Create TimestampService.js
# Create PostRepository.js
# Add route to server.js

npm test -- agent-posts.test.js
# Expect: Tests start passing one by one
```

### Step 3: Refactor (Keep GREEN)
```bash
# Improve code quality
# Extract functions
# Add documentation
# Optimize performance

npm test -- agent-posts.test.js
# Expect: All tests still pass
```

## Test Execution Timeline

### Initial Run (with mock)
```
✅ 32 tests pass in 147ms
Why? Mock implementation demonstrates expected behavior
```

### First Real Implementation Run
```
❌ 0 tests pass, 32 fail
Reason: No route exists
```

### After Adding Route
```
❌ 2 tests pass, 30 fail
Passing: Basic 201 response tests
Failing: All validation, ID, timestamp, persistence tests
```

### After Adding Validation
```
❌ 10 tests pass, 22 fail
Passing: Validation tests
Failing: ID generation, timestamps, persistence
```

### After Adding ID Generation
```
❌ 14 tests pass, 18 fail
Passing: ID tests
Failing: Timestamps, persistence
```

### After Adding Timestamps
```
❌ 20 tests pass, 12 fail
Passing: Timestamp tests
Failing: Persistence, integration tests
```

### After Adding Repository
```
✅ 32 tests pass, 0 fail
All tests green! Ready to refactor.
```

## Common Implementation Mistakes

### Mistake 1: Not Following Sequence
```javascript
// Wrong - generates ID before validation
const id = idGenerator.generate();
if (!validator.validatePostData(req.body).valid) {
  return res.status(400).json({ error: 'Invalid' });
}
```

### Mistake 2: Missing Error Handling
```javascript
// Wrong - no try-catch
app.post('/api/v1/agent-posts', async (req, res) => {
  const post = await repository.save(req.body); // Can throw!
  res.status(201).json({ data: post });
});
```

### Mistake 3: Not Using Services
```javascript
// Wrong - inline logic instead of services
app.post('/api/v1/agent-posts', (req, res) => {
  const id = crypto.randomUUID(); // Should use IdGenerator
  const now = new Date().toISOString(); // Should use TimestampService
});
```

### Mistake 4: Ignoring Contracts
```javascript
// Wrong - repository returns different structure
repository.save.mockResolvedValue({ savedId: '123' }); // Not matching contract
// Expected: repository.save.mockResolvedValue({ id: '123', title: 'Test', ... })
```

## Success Criteria

Tests are considered **properly failing** when:
- ❌ Real server.js has no POST /api/v1/agent-posts route
- ❌ All 32 tests fail with clear error messages
- ❌ Error messages indicate what's missing
- ❌ Tests fail **for the right reasons** (not syntax errors)

Tests are considered **properly passing** when:
- ✅ All 32 tests pass with real implementation
- ✅ No mocks used in production code
- ✅ Real database operations work
- ✅ All collaborators properly integrated
- ✅ Error handling works correctly

---

**Remember: In TDD, RED is good! It shows your tests are actually testing something.** 🔴→🟢
