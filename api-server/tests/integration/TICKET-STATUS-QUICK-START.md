# Ticket Status E2E Tests - Quick Start Guide

## Run Tests

```bash
# Run all ticket status integration tests
cd /workspaces/agent-feed/api-server
npx vitest run tests/integration/ticket-status-e2e.test.js

# Run with verbose output
npx vitest run tests/integration/ticket-status-e2e.test.js --reporter=verbose

# Watch mode for development
npx vitest watch tests/integration/ticket-status-e2e.test.js
```

## Test Coverage Summary

**Total Tests:** 18
**Test Categories:**
- API Endpoint Tests: 5 tests
- WebSocket Event Tests: 5 tests
- Complete Lifecycle Tests: 3 tests
- Multiple Tickets Tests: 2 tests
- No Emoji Verification: 2 tests
- Edge Cases & Error Handling: 3 tests

## What's Tested

### API Endpoints
1. `GET /api/tickets/stats` - Global ticket statistics
2. `GET /api/v1/agent-posts?includeTickets=true` - Posts with ticket status
3. `GET /api/v1/agent-posts` - Posts without tickets (default)
4. `GET /api/agent-posts/:postId/tickets` - Single post ticket status
5. `POST /api/v1/agent-posts` - Automatic ticket creation on URL detection

### WebSocket Events
1. `ticket:created` - Emitted when ticket is created
2. `ticket:status_update` - Emitted on status changes (pending, processing, failed)
3. `ticket:completed` - Emitted when ticket completes
4. Event structure validation
5. No emoji verification in events

### Complete Flows
1. Full lifecycle: pending → processing → completed
2. Failure handling with retry logic
3. End-to-end: post creation → ticket generation → status tracking

### Special Cases
1. Multiple URLs creating multiple tickets
2. Mixed statuses across tickets
3. Posts with no URLs
4. Invalid ticket IDs
5. Input validation

## Expected Results

```
Test Files  1 passed (1)
Tests      18 passed (18)
Duration   ~2-4 seconds
```

## Test Database

- **Type:** SQLite (isolated test database)
- **Location:** `/tmp/test-ticket-e2e.db`
- **Cleanup:** Automatic (deleted after tests)
- **Schema:** Full work_queue_tickets and agent_posts tables

## Real Integration

These tests use:
- ✓ Real SQLite database
- ✓ Real Socket.IO WebSocket server
- ✓ Real ticket-creation-service
- ✓ Real URL detection
- ✓ Real status transitions
- ✗ NO mocks (except Claude SDK)

## Troubleshooting

### Port Already in Use
The test server uses a random port (port 0), so this should not happen.

### Database Locked
If tests hang, ensure no other process is using `/tmp/test-ticket-e2e.db`

### WebSocket Connection Errors
Check that no firewall is blocking localhost connections.

## Adding New Tests

Add tests to the appropriate `describe` block:

```javascript
describe('API Endpoint Tests', () => {
  it('should test new endpoint', async () => {
    const response = await request(httpServer)
      .get('/api/new-endpoint')
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

## Emoji Verification

All tests verify NO emojis in responses:
- ✅ ❌ - Not allowed
- 🔴 🟡 🟢 ❌ - Not allowed
- Status values: `pending`, `in_progress`, `completed`, `failed` ✓

## Quick Reference

**Test File:** `/workspaces/agent-feed/api-server/tests/integration/ticket-status-e2e.test.js`
**Report:** `/workspaces/agent-feed/api-server/tests/integration/TICKET-STATUS-E2E-TEST-REPORT.md`

**Status:** ALL TESTS PASSING ✓
