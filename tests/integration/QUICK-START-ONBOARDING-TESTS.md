# Quick Start: Onboarding Name Persistence Tests

## Run Tests

```bash
# Run all onboarding tests
npm run test:integration -- onboarding-name-persistence

# Run specific test
npm run test:integration -- onboarding-name-persistence -t "Happy Path"

# Run with coverage
npm run test:integration -- onboarding-name-persistence --coverage
```

## Expected Results

### ✅ All Tests Pass
```
 ✓ Happy Path - New User Name Submission
   ✓ should process name submission and persist to both tables
   ✓ should create work queue ticket and process with agent worker
   ✓ should complete full onboarding flow: name → use_case → phase1_complete

 ✓ Database Verification
   ✓ should verify responses column contains correct JSON structure
   ✓ should verify created_at and updated_at are valid Unix timestamps
   ✓ should verify display_name persists across service instances
   ✓ should handle multiple users with different names

 ✓ Error Handling
   ✓ should reject empty name and not update database
   ✓ should reject whitespace-only name
   ✓ should reject names over 50 characters
   ✓ should sanitize SQL injection attempts
   ✓ should sanitize XSS attempts (HTML/script tags)
   ✓ should handle missing user_id gracefully
   ✓ should handle database write errors gracefully

 ✓ Regression Tests
   ✓ should not create duplicate agent responses
   ✓ should complete worker successfully without errors
   ✓ should verify toasts emit correctly
   ✓ should verify comment counter updates correctly

Test Suites: 1 passed, 1 total
Tests:       18 passed, 18 total
```

## What's Being Tested

### 1. Database Persistence
- ✅ Name saved to `onboarding_state.responses` (JSON)
- ✅ Display name saved to `user_settings.display_name`
- ✅ Timestamps are valid Unix timestamps
- ✅ Data persists across server restarts

### 2. Worker Integration
- ✅ Orchestrator spawns worker for comment ticket
- ✅ AgentWorker processes name submission
- ✅ OnboardingFlowService called correctly
- ✅ Confirmation comment created
- ✅ Ticket marked as 'completed'

### 3. Security
- ✅ SQL injection attempts sanitized
- ✅ XSS attempts (script tags) HTML-encoded
- ✅ Empty/whitespace names rejected
- ✅ Names over 50 chars rejected

### 4. Regression Prevention
- ✅ No duplicate agent responses
- ✅ Worker completes without errors
- ✅ Comment counter updates correctly

## Verify Database State

```bash
# Check test database
sqlite3 /tmp/onboarding-name-persistence-test.db

# Query onboarding_state
SELECT user_id, phase, step, responses, created_at, updated_at
FROM onboarding_state;

# Query user_settings
SELECT user_id, display_name, created_at, updated_at
FROM user_settings;

# Verify JSON structure
SELECT user_id, json_extract(responses, '$.name') as name
FROM onboarding_state;
```

## Common Issues

### Issue: Tests fail with "Database locked"
```bash
# Solution: Kill any processes holding the database
pkill -f onboarding-name-persistence-test.db
```

### Issue: Tests timeout
```bash
# Solution: Increase timeout in test file
await waitForTicketCompletion(testDb, ticket.id, 30000); // 30 seconds
```

### Issue: Import errors
```bash
# Solution: Ensure all dependencies installed
npm install
```

## Manual Verification

After tests pass, verify in production:

1. **User comments name:**
   - User: "Nasty Nate"

2. **Check onboarding_state:**
   ```sql
   SELECT responses FROM onboarding_state WHERE user_id = 'demo-user-123';
   -- Expected: {"name":"Nasty Nate"}
   ```

3. **Check user_settings:**
   ```sql
   SELECT display_name FROM user_settings WHERE user_id = 'demo-user-123';
   -- Expected: Nasty Nate
   ```

4. **Check UI:**
   - Header shows: "Nasty Nate"
   - Posts show: "Nasty Nate"
   - Comments show: "Nasty Nate"

## Next Steps

✅ All tests pass → **Ready for production deployment**

❌ Tests fail → Debug using:
```bash
# Verbose logging
DEBUG=* npm run test:integration -- onboarding-name-persistence

# Single test
npm run test:integration -- onboarding-name-persistence -t "should process name"

# Inspect test database
sqlite3 /tmp/onboarding-name-persistence-test.db
```

## Files

- **Test file:** `/tests/integration/onboarding-name-persistence.test.js`
- **Service:** `/api-server/services/onboarding/onboarding-flow-service.js`
- **Worker:** `/api-server/worker/agent-worker.js`
- **Orchestrator:** `/api-server/avi/orchestrator.js`
