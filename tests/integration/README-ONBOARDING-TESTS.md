# Onboarding Name Persistence Integration Tests

Comprehensive integration tests for the complete onboarding flow after schema fix.

## Test Coverage

### 1. Happy Path - New User Name Submission
- ✅ Process name submission and persist to both `onboarding_state.responses` and `user_settings.display_name`
- ✅ Create work queue ticket and process with agent worker
- ✅ Complete full onboarding flow: name → use_case → phase1_complete

### 2. Database Verification
- ✅ Verify `responses` column contains correct JSON structure
- ✅ Verify `created_at` and `updated_at` are valid Unix timestamps
- ✅ Verify `display_name` persists across service instances (server restart)
- ✅ Handle multiple users with different names

### 3. Error Handling
- ✅ Reject empty name and not update database
- ✅ Reject whitespace-only name
- ✅ Reject names over 50 characters
- ✅ Sanitize SQL injection attempts
- ✅ Sanitize XSS attempts (HTML/script tags)
- ✅ Handle missing user_id gracefully
- ✅ Handle database write errors gracefully

### 4. Regression Tests
- ✅ Verify no duplicate agent responses
- ✅ Verify worker completes successfully without errors
- ✅ Verify toasts emit correctly (stub for WebSocket test)
- ✅ Verify comment counter updates correctly

## Running Tests

### Run All Onboarding Integration Tests
```bash
npm run test:integration -- onboarding-name-persistence
```

### Run Specific Test Suite
```bash
npm run test:integration -- onboarding-name-persistence -t "Happy Path"
```

### Run with Coverage
```bash
npm run test:integration -- onboarding-name-persistence --coverage
```

### Run in Watch Mode
```bash
npm run test:integration -- onboarding-name-persistence --watch
```

## Test Database

- **Location**: `/tmp/onboarding-name-persistence-test.db`
- **Type**: Real SQLite database (not mocked)
- **Cleanup**: Automatically deleted after tests complete
- **Schema**: Matches production schema exactly

## Success Criteria

All tests must pass:
- ✅ Name saved to `onboarding_state.responses` as JSON
- ✅ Display name saved to `user_settings.display_name`
- ✅ Timestamps (`created_at`, `updated_at`) are valid Unix timestamps
- ✅ No SQL errors during execution
- ✅ Name persists across server restarts (service instance changes)
- ✅ XSS and SQL injection attempts are sanitized
- ✅ Empty/invalid names are rejected with proper error messages
- ✅ Worker completes successfully with no duplicates

## Test Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Integration Test                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Real Database (SQLite)                                │  │
│  │ - onboarding_state table                              │  │
│  │ - user_settings table                                 │  │
│  │ - work_queue_tickets table                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ↕                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Real Services                                         │  │
│  │ - OnboardingFlowService                               │  │
│  │ - UserSettingsService                                 │  │
│  │ - WorkQueueRepository                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ↕                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Real Agent Workers                                    │  │
│  │ - Orchestrator                                        │  │
│  │ - AgentWorker                                         │  │
│  │ - Get-to-Know-You Agent                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Test Scenarios

### Scenario 1: Happy Path
```javascript
User: "Nasty Nate"
  ↓
OnboardingFlowService.processNameResponse()
  ↓
Save to onboarding_state.responses = {"name": "Nasty Nate"}
Save to user_settings.display_name = "Nasty Nate"
  ↓
Return { success: true, nextStep: 'use_case' }
```

### Scenario 2: Error Handling
```javascript
User: "" (empty)
  ↓
OnboardingFlowService.processNameResponse()
  ↓
Validation fails
  ↓
Return { success: false, error: "Name is required" }
Database NOT updated
```

### Scenario 3: Worker Integration
```javascript
User comments "Nasty Nate" on Get-to-Know-You post
  ↓
System creates work_queue_ticket
  ↓
Orchestrator spawns AgentWorker
  ↓
AgentWorker calls OnboardingFlowService.processNameResponse()
  ↓
Database updated
  ↓
AgentWorker creates confirmation comment
  ↓
Ticket marked as 'completed'
```

## Debugging Failed Tests

### Check Test Database
```bash
sqlite3 /tmp/onboarding-name-persistence-test.db

# Inspect onboarding_state
SELECT * FROM onboarding_state;

# Inspect user_settings
SELECT * FROM user_settings;

# Check responses JSON
SELECT user_id, json_extract(responses, '$.name') as name FROM onboarding_state;
```

### Enable Verbose Logging
```bash
DEBUG=* npm run test:integration -- onboarding-name-persistence
```

### Run Single Test
```bash
npm run test:integration -- onboarding-name-persistence -t "should process name submission and persist to both tables"
```

## Maintenance

### Updating Test Data
Edit helper functions in test file:
- `createTestPost()` - Create test posts
- `createTestComment()` - Create test comments
- `waitForTicketCompletion()` - Wait for async operations

### Adding New Test Cases
1. Add new `it()` block in appropriate `describe()` section
2. Follow AAA pattern: Arrange → Act → Assert
3. Use real database queries to verify state
4. Clean up test data in `beforeEach()`

### Schema Changes
If schema changes, update `createTestDatabaseSchema()` to match production.

## Related Documentation

- [Onboarding Flow Spec](../../docs/ONBOARDING-FLOW-SPEC.md)
- [Onboarding Architecture](../../docs/ONBOARDING-ARCHITECTURE.md)
- [Database Schema](../../src/database/schema.sql)
- [TDD Quick Reference](../../docs/TDD-ONBOARDING-QUICK-REFERENCE.md)
