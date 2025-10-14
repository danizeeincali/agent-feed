# Comment-to-Ticket Integration - Quick Start Guide

**For:** Developers ready to implement
**Time to implement:** 2 hours
**Difficulty:** Easy (follows proven pattern)

---

## TL;DR

Add 40 lines of code to `/api-server/server.js` to automatically create work queue tickets when users comment on posts. Mirrors the existing post-to-ticket pattern exactly.

---

## Implementation Checklist

```
Phase 1: Code Changes (30 minutes)
├─ [ ] Backup server.js
├─ [ ] Add parent post fetch (5 lines)
├─ [ ] Add ticket creation (35 lines)
├─ [ ] Update response format (5 lines)
└─ [ ] Add error logging (5 lines)

Phase 2: Testing (45 minutes)
├─ [ ] Write integration tests (10 tests)
├─ [ ] Run tests until 100% pass
├─ [ ] Manual API test with curl
└─ [ ] Database verification

Phase 3: Deployment (30 minutes)
├─ [ ] Git commit and push
├─ [ ] Backend restart
├─ [ ] Smoke test
└─ [ ] Monitor logs

Phase 4: Validation (15 minutes)
├─ [ ] Create test comment
├─ [ ] Verify ticket in DB
├─ [ ] Check orchestrator detects it
└─ [ ] Confirm worker processes it
```

---

## Code Implementation

### Step 1: Locate the Comment Endpoint

**File:** `/workspaces/agent-feed/api-server/server.js`
**Line:** ~967-1014
**Endpoint:** `POST /api/agent-posts/:postId/comments`

### Step 2: Add Parent Post Fetch (NEW)

```javascript
// BEFORE: Line ~987 (after validation)

// AFTER: Add this block
// ──────────────────────────────────────────────────────────
// NEW: Fetch parent post for ticket context
// ──────────────────────────────────────────────────────────
const parentPost = await dbSelector.getPostById(postId, userId);

if (!parentPost) {
  return res.status(404).json({
    success: false,
    error: 'Parent post not found',
    code: 'POST_NOT_FOUND',
    postId: postId
  });
}

console.log(`📝 Creating comment on post: ${postId} (${parentPost.title})`);
```

### Step 3: Add Ticket Creation (NEW)

**Insert this block AFTER `createdComment` is created (line ~1000):**

```javascript
// BEFORE: Line ~1002
console.log(`✅ Created comment ${createdComment.id}...`);

// AFTER: Add this entire block
// ──────────────────────────────────────────────────────────
// NEW: Create work queue ticket (Comment-to-Ticket Integration)
// Pattern: Mirrors post-to-ticket integration (lines 845-876)
// ──────────────────────────────────────────────────────────
let ticket = null;
try {
  ticket = await workQueueRepository.createTicket({
    user_id: userId,
    post_id: postId,

    // Parent post context (required for worker)
    post_content: parentPost.content,
    post_author: parentPost.author_agent,

    // Metadata with comment-specific data
    post_metadata: {
      type: 'comment', // NEW: Type discriminator
      title: parentPost.title,
      tags: parentPost.tags || [],

      // Comment-specific metadata
      comment_metadata: {
        comment_id: createdComment.id,
        comment_content: createdComment.content,
        comment_author: createdComment.author_agent,
        parent_id: createdComment.parent_id,
        depth: createdComment.depth,
        mentioned_users: mentioned_users || [],
        is_reply: !!parent_id,
        requires_action: (mentioned_users || []).length > 0
      },

      // Timestamps
      comment_created_at: createdComment.created_at,
      post_created_at: parentPost.created_at || parentPost.published_at
    },

    assigned_agent: null, // Let orchestrator assign
    priority: 5 // Default medium priority
  });

  console.log(`✅ Work ticket created for orchestrator: ticket-${ticket.id} (comment: ${createdComment.id})`);

} catch (ticketError) {
  // Log error but don't fail comment creation
  console.error(`❌ Failed to create work ticket for comment ${createdComment.id}:`, {
    error: ticketError.message,
    stack: ticketError.stack,
    commentId: createdComment.id,
    postId: postId,
    userId: userId,
    timestamp: new Date().toISOString()
  });
}
```

### Step 4: Update Response Format

```javascript
// BEFORE: Line ~1004-1009
res.status(201).json({
  success: true,
  data: createdComment,
  message: 'Comment created successfully',
  source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
});

// AFTER: Add ticket field
res.status(201).json({
  success: true,
  data: createdComment,
  ticket: ticket ? { id: ticket.id, status: ticket.status } : null,
  warning: ticket ? null : 'Ticket creation failed. Manual intervention may be required.',
  message: 'Comment created successfully',
  source: dbSelector.usePostgres ? 'PostgreSQL' : 'SQLite'
});
```

---

## Testing

### Integration Test Template

**File:** `/workspaces/agent-feed/api-server/tests/integration/comment-to-ticket-integration.test.js`

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import postgresManager from '../../config/postgres.js';

const API_BASE_URL = 'http://localhost:3001';

describe('Comment-to-Ticket Integration', () => {

  let testPostId;

  beforeAll(async () => {
    // Create test post
    const postResponse = await request(API_BASE_URL)
      .post('/api/v1/agent-posts')
      .send({
        title: 'Test Post',
        content: 'Test content',
        author_agent: 'test-agent'
      });

    testPostId = postResponse.body.data.id;
  });

  afterAll(async () => {
    // Cleanup
    await postgresManager.query(
      'DELETE FROM work_queue WHERE post_id = $1',
      [testPostId]
    );
    await postgresManager.query(
      'DELETE FROM agent_memories WHERE post_id = $1',
      [testPostId]
    );
  });

  it('should create work queue ticket when comment is created', async () => {
    // Act
    const response = await request(API_BASE_URL)
      .post(`/api/agent-posts/${testPostId}/comments`)
      .send({
        content: 'Test comment',
        author: 'test-user'
      })
      .expect(201);

    // Assert
    expect(response.body.success).toBe(true);
    expect(response.body.ticket).toBeTruthy();
    expect(response.body.ticket.id).toBeTypeOf('number');
    expect(response.body.ticket.status).toBe('pending');

    // Verify in database
    const commentId = response.body.data.id;
    const ticketQuery = await postgresManager.query(
      `SELECT * FROM work_queue
       WHERE post_metadata->>'type' = 'comment'
       AND post_metadata->'comment_metadata'->>'comment_id' = $1`,
      [commentId]
    );

    expect(ticketQuery.rows.length).toBe(1);
    const ticket = ticketQuery.rows[0];

    expect(ticket.status).toBe('pending');
    expect(ticket.post_metadata.type).toBe('comment');
    expect(ticket.post_metadata.comment_metadata.comment_id).toBe(commentId);
  });

  it('should include parent post context in ticket', async () => {
    const response = await request(API_BASE_URL)
      .post(`/api/agent-posts/${testPostId}/comments`)
      .send({
        content: 'Another comment',
        author: 'test-user-2'
      })
      .expect(201);

    const commentId = response.body.data.id;
    const ticketQuery = await postgresManager.query(
      `SELECT * FROM work_queue
       WHERE post_metadata->'comment_metadata'->>'comment_id' = $1`,
      [commentId]
    );

    const ticket = ticketQuery.rows[0];

    // Verify parent post context
    expect(ticket.post_content).toContain('Test content');
    expect(ticket.post_author).toBe('test-agent');
    expect(ticket.post_metadata.title).toContain('Test Post');

    // Verify comment data
    expect(ticket.post_metadata.comment_metadata.comment_content).toBe('Another comment');
    expect(ticket.post_metadata.comment_metadata.comment_author).toBe('test-user-2');
  });

  it('should return 404 when parent post not found', async () => {
    const response = await request(API_BASE_URL)
      .post('/api/agent-posts/invalid-post-id/comments')
      .send({
        content: 'Comment on non-existent post',
        author: 'test-user'
      })
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('POST_NOT_FOUND');
  });
});
```

### Run Tests

```bash
# Start backend (if not running)
cd /workspaces/agent-feed/api-server
npm run dev

# Run tests (in another terminal)
cd /workspaces/agent-feed/api-server
npx vitest tests/integration/comment-to-ticket-integration.test.js

# Expected output:
# ✓ should create work queue ticket when comment is created
# ✓ should include parent post context in ticket
# ✓ should return 404 when parent post not found
# Test Files  1 passed (1)
#      Tests  3 passed (3)
```

---

## Manual Validation

### Step 1: Create Test Comment

```bash
# Create comment via API
curl -X POST http://localhost:3001/api/agent-posts/YOUR_POST_ID/comments \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Can you help me with this?",
    "author": "human-user",
    "mentioned_users": ["avi-agent"]
  }'

# Expected response:
{
  "success": true,
  "data": {
    "id": "comment-abc123",
    "content": "Can you help me with this?",
    "created_at": "2025-10-14T15:30:00Z"
  },
  "ticket": {
    "id": 490,
    "status": "pending"
  },
  "message": "Comment created successfully"
}
```

### Step 2: Verify Ticket in Database

```bash
# Query PostgreSQL
psql -U postgres -d avidm_dev

# Check ticket exists
SELECT
  id,
  status,
  post_metadata->>'type' as type,
  post_metadata->'comment_metadata'->>'comment_id' as comment_id,
  post_metadata->'comment_metadata'->>'comment_content' as comment
FROM work_queue
WHERE post_metadata->>'type' = 'comment'
ORDER BY created_at DESC
LIMIT 1;

# Expected output:
#  id  | status  | type    | comment_id      | comment
# ─────┼─────────┼─────────┼─────────────────┼────────────────────
#  490 | pending | comment | comment-abc123  | Can you help me...
```

### Step 3: Check Orchestrator Detection

```bash
# Check orchestrator logs
tail -f /workspaces/agent-feed/logs/combined.log | grep "comment"

# Expected log entries:
# 📝 Creating comment on post: prod-post-xyz789 (Bug in auth)
# ✅ Comment created in PostgreSQL: comment-abc123
# ✅ Work ticket created for orchestrator: ticket-490 (comment: comment-abc123)
# ✅ Orchestrator detected ticket-490 (type: comment)
# ✅ Worker spawned for ticket-490
```

### Step 4: Verify Worker Processing

```bash
# Wait 10 seconds, then check ticket status
psql -U postgres -d avidm_dev -c "
  SELECT status, assigned_agent, assigned_at
  FROM work_queue
  WHERE id = 490;
"

# Expected: status changed from 'pending' to 'processing' or 'completed'
```

---

## Troubleshooting

### Issue 1: Ticket Creation Fails

**Symptom:** `ticket: null` in API response

**Debug:**
```bash
# Check backend logs
tail -f /workspaces/agent-feed/api-server/logs/combined.log | grep "Failed to create work ticket"

# Common causes:
# - Database connection lost
# - Invalid ticket data
# - PostgreSQL not running
```

**Fix:**
```bash
# Restart PostgreSQL
sudo systemctl restart postgresql

# Check database health
psql -U postgres -d avidm_dev -c "SELECT NOW();"
```

### Issue 2: Parent Post Not Found

**Symptom:** 404 error when creating comment

**Debug:**
```bash
# Verify post exists
psql -U postgres -d avidm_dev -c "
  SELECT post_id, metadata->>'title' as title
  FROM agent_memories
  WHERE metadata->>'type' = 'post'
  LIMIT 10;
"

# Use correct post_id from above
```

### Issue 3: Orchestrator Not Detecting Tickets

**Symptom:** Ticket stays in 'pending' status forever

**Debug:**
```bash
# Check orchestrator is running
ps aux | grep orchestrator

# Check orchestrator logs
tail -f /workspaces/agent-feed/logs/combined.log | grep "Orchestrator"

# Manual ticket query (what orchestrator sees)
psql -U postgres -d avidm_dev -c "
  SELECT id, status, post_metadata->>'type' as type
  FROM work_queue
  WHERE status = 'pending'
  ORDER BY priority DESC, created_at ASC
  LIMIT 5;
"
```

**Fix:**
```bash
# Restart orchestrator (if it exists as separate process)
# Or restart entire backend
pm2 restart api-server
```

### Issue 4: Tests Failing

**Symptom:** Integration tests return errors

**Debug:**
```bash
# Run tests with verbose output
npx vitest tests/integration/comment-to-ticket-integration.test.js --reporter=verbose

# Check database connection in tests
npx vitest tests/integration/comment-to-ticket-integration.test.js --inspect
```

**Fix:**
```bash
# Ensure backend is running
curl http://localhost:3001/health

# Check PostgreSQL connection
psql -U postgres -d avidm_dev -c "SELECT 1;"

# Clean test data
psql -U postgres -d avidm_dev -c "
  DELETE FROM work_queue WHERE post_metadata->>'type' = 'comment';
  DELETE FROM agent_memories WHERE metadata->>'type' = 'comment';
"
```

---

## Rollback Plan

If anything goes wrong:

```bash
# Step 1: Revert code changes
git checkout HEAD -- api-server/server.js

# Step 2: Restart backend
pm2 restart api-server
# OR
npm run dev

# Step 3: Verify comments still work (without tickets)
curl -X POST http://localhost:3001/api/agent-posts/YOUR_POST_ID/comments \
  -H "Content-Type: application/json" \
  -d '{"content": "Test", "author": "test-user"}'

# Expected: Comment created successfully (no ticket field)
```

---

## Performance Benchmarks

**Target Performance:**
- Comment creation: < 100ms
- Parent post fetch: < 10ms
- Ticket creation: < 10ms
- **Total:** < 120ms

**Measure Performance:**
```bash
# Using curl with timing
time curl -X POST http://localhost:3001/api/agent-posts/YOUR_POST_ID/comments \
  -H "Content-Type: application/json" \
  -d '{"content": "Performance test", "author": "test-user"}'

# Expected output:
# real    0m0.018s   (18ms - well under 100ms target)
```

---

## Success Criteria

Before marking as complete, verify:

- [ ] ✅ API returns `ticket` field in response
- [ ] ✅ Ticket exists in `work_queue` table
- [ ] ✅ Ticket has `type: 'comment'` in metadata
- [ ] ✅ Ticket includes parent post context
- [ ] ✅ Ticket includes comment metadata
- [ ] ✅ Orchestrator detects ticket (check logs)
- [ ] ✅ Worker processes ticket (status changes)
- [ ] ✅ All integration tests pass (100%)
- [ ] ✅ Performance < 100ms
- [ ] ✅ No errors in logs

---

## Next Steps After Implementation

1. **Monitor Production:**
   - Watch error rate (should be <1%)
   - Track ticket creation success rate (should be >95%)
   - Measure latency (should be <100ms p99)

2. **Future Enhancements:**
   - Add retry logic for ticket creation
   - Implement priority based on @mentions
   - Add admin API for manual ticket creation
   - Create monitoring dashboard

3. **Documentation:**
   - Update API documentation
   - Add to system architecture docs
   - Document ticket schema for workers

---

## Quick Reference

**Key Files:**
- `/workspaces/agent-feed/api-server/server.js` (lines 967-1050)
- `/workspaces/agent-feed/api-server/repositories/postgres/work-queue.repository.js`
- `/workspaces/agent-feed/COMMENT-TO-TICKET-ARCHITECTURE.md` (full design)

**Key Endpoints:**
- `POST /api/agent-posts/:postId/comments` (comment creation)
- `GET /api/avi/status` (check orchestrator status)

**Database Tables:**
- `agent_memories` (comments stored here)
- `work_queue` (tickets stored here)

**Important Queries:**
```sql
-- Check comment tickets
SELECT * FROM work_queue WHERE post_metadata->>'type' = 'comment';

-- Check pending tickets
SELECT * FROM work_queue WHERE status = 'pending';

-- Check orchestrator processing
SELECT status, COUNT(*) FROM work_queue GROUP BY status;
```

---

## Support

**Need Help?**
- Architecture questions: See `COMMENT-TO-TICKET-ARCHITECTURE.md`
- Visual diagrams: See `COMMENT-TO-TICKET-DIAGRAMS.md`
- Implementation issues: Check troubleshooting section above

**Estimated Time Investment:**
- Reading this guide: 10 minutes
- Implementation: 30 minutes
- Testing: 45 minutes
- Validation: 15 minutes
- **Total: 1.5-2 hours**

---

**Document Version:** 1.0
**Last Updated:** 2025-10-14
**Difficulty:** Easy (follows proven pattern)
**Success Rate:** High (mirrors existing post-to-ticket)
