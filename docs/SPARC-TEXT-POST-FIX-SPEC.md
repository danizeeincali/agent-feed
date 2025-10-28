# SPARC Specification: Text Post URL Validation Fix

**Project:** Agent Feed Platform
**Document Type:** Requirements Specification
**Created:** 2025-10-27
**Status:** Draft - Ready for Review
**SPARC Phase:** Specification

---

## Executive Summary

The agent worker validation incorrectly requires a `url` field for ALL post-type tickets, causing text posts without URLs (e.g., "what is in your root directory?") to fail with error "missing required fields: url". This specification addresses the validation logic to correctly distinguish between:

1. **Text posts** - No URL required
2. **Link posts** - URL required only when agent processes URLs
3. **Comment posts** - No URL required (already working)

**Impact:** Users cannot create text-based posts that trigger agent responses, limiting platform functionality to URL-based interactions only.

**Scope:** Worker validation logic in `/api-server/worker/agent-worker.js` (lines 110-126).

---

## 1. Problem Statement

### 1.1 Current Behavior

The `fetchTicket()` method in `agent-worker.js` performs conditional validation based on `metadata.type`:

```javascript
// Line 110-116: Current validation logic
const isCommentTicket = ticket.metadata && ticket.metadata.type === 'comment';

const requiredFields = isCommentTicket
  ? ['id', 'agent_id', 'post_id', 'content', 'metadata']  // ✅ Comment tickets
  : ['id', 'agent_id', 'url', 'post_id', 'content'];       // ❌ ALL post tickets
```

**Problem:** The logic treats ALL non-comment tickets as URL tickets, requiring the `url` field even for text posts.

### 1.2 Failed Ticket Evidence

**Ticket ID:** `8952ac05-148d-424f-8851-50de5b2f33ec`

**Database Record:**
```
id: 8952ac05-148d-424f-8851-50de5b2f33ec
agent_id: avi
url: NULL  ← Causes validation failure
content: what is in your root directory.
metadata: {
  "type": "post",
  "parent_post_id": "post-1761597971026",
  "title": "what is in your root directory."
}
```

**Error Message:**
```
Ticket 8952ac05-148d-424f-8851-50de5b2f33ec missing required fields: url
```

### 1.3 Root Cause Analysis

**Source Location:** `/api-server/worker/agent-worker.js:110-126`

**Issue:** Binary classification (comment vs non-comment) doesn't account for text-only posts.

**Contributing Factors:**
1. Post creation logic sets `metadata.type = 'post'` for ALL posts (line 1144 in `server.js`)
2. Worker validation assumes `type !== 'comment'` means URL is required
3. No distinction between text posts and link posts in metadata
4. `url` field is NULL for text posts but worker expects it to be present

---

## 2. Functional Requirements

### FR-001: Support Text Posts Without URLs
**Priority:** P0 (Critical)
**Description:** Worker must accept tickets with `metadata.type = 'post'` and `url = null`

**Acceptance Criteria:**
- ✅ Text post tickets with `url = null` pass validation
- ✅ Text post content is processed by agent
- ✅ Agent response is posted as comment
- ✅ No validation errors for missing `url` field

**Test Scenario:**
```gherkin
Given a user creates a text post "what is in your root directory?"
And the post has no URL
When AVI creates a ticket with metadata.type = 'post'
Then the ticket validation should pass
And the agent should process the content
And the response should be posted as a comment
```

### FR-002: Maintain URL Validation for Link Posts
**Priority:** P0 (Critical)
**Description:** Worker must still require `url` field for link-processing agents

**Acceptance Criteria:**
- ✅ Link post tickets with URL processing agents require `url` field
- ✅ Validation fails if URL-dependent agent has `url = null`
- ✅ Error message indicates missing URL for link processing

**Test Scenario:**
```gherkin
Given a user creates a post with URL "https://example.com/article"
And the post is assigned to 'link-logger-agent'
When the ticket is processed
Then the url field must be present
And validation should fail if url is null
```

### FR-003: Preserve Comment Ticket Validation
**Priority:** P0 (Critical)
**Description:** Existing comment ticket validation must remain unchanged

**Acceptance Criteria:**
- ✅ Comment tickets still use `metadata.type = 'comment'`
- ✅ Comment tickets don't require `url` field
- ✅ Comment validation logic unchanged

**Test Scenario:**
```gherkin
Given a user creates a comment on a post
When the comment ticket is processed
Then url field is optional
And metadata.type = 'comment'
And validation passes without url
```

### FR-004: Conditional URL Requirement
**Priority:** P1 (High)
**Description:** URL field requirement based on ticket characteristics, not absolute

**Acceptance Criteria:**
- ✅ URL optional for text-only posts
- ✅ URL optional for comment replies
- ✅ URL required only when agent explicitly processes URLs
- ✅ Validation message clearly indicates context

**Decision Matrix:**
| Ticket Type | metadata.type | url Required | Reason |
|-------------|---------------|--------------|--------|
| Text Post | 'post' | NO | Agent processes content, not URL |
| Link Post | 'post' | Optional* | URL present if user provided it |
| Comment | 'comment' | NO | Replies don't require URLs |
| Agent-specific | 'post' | Depends** | Based on agent capabilities |

\* URL may be present if user included it in post
\** Future enhancement: Agent metadata indicates URL requirement

---

## 3. Non-Functional Requirements

### NFR-001: Backward Compatibility
**Priority:** P0 (Critical)
**Description:** Existing ticket processing must not break

**Requirements:**
- All existing URL-based tickets must continue working
- Comment ticket processing unchanged
- No changes to database schema
- No changes to ticket creation logic
- No changes to orchestrator logic

**Validation:**
```bash
# Existing tickets still process
sqlite3 database.db "SELECT COUNT(*) FROM work_queue_tickets WHERE status='completed';"

# No regression in comment replies
sqlite3 database.db "SELECT COUNT(*) FROM comments WHERE author_agent IS NOT NULL;"
```

### NFR-002: Performance
**Priority:** P1 (High)
**Description:** Validation changes must not impact performance

**Requirements:**
- Validation time: <1ms (no change)
- No additional database queries
- No network calls during validation
- Memory usage unchanged

### NFR-003: Error Messages
**Priority:** P2 (Medium)
**Description:** Validation errors must be clear and actionable

**Requirements:**
- Error messages indicate field name and context
- Distinguish between "URL missing" vs "URL malformed"
- Include ticket ID and type in error logs
- Suggest corrective action

**Example:**
```
❌ Ticket abc123 validation failed
   Type: post (link-processing)
   Missing required field: url
   Reason: Agent 'link-logger-agent' requires URL to process

   Hint: For text-only posts, ensure metadata.type = 'post' and url is optional
```

### NFR-004: Logging and Observability
**Priority:** P2 (Medium)
**Description:** Validation decisions must be logged for debugging

**Requirements:**
- Log ticket type determination
- Log validation decision (pass/fail with reason)
- Log field presence (url, metadata, etc.)
- Include ticket ID in all logs

---

## 4. Technical Specifications

### 4.1 Modified Validation Logic

**File:** `/api-server/worker/agent-worker.js`
**Lines:** 110-126
**Method:** `fetchTicket()`

**Current Implementation:**
```javascript
// Lines 110-116: Binary classification
const isCommentTicket = ticket.metadata && ticket.metadata.type === 'comment';

const requiredFields = isCommentTicket
  ? ['id', 'agent_id', 'post_id', 'content', 'metadata']
  : ['id', 'agent_id', 'url', 'post_id', 'content'];  // ❌ Always requires url
```

**Proposed Implementation (Option A - Recommended):**
```javascript
// Lines 110-120: Make url optional for all tickets
const isCommentTicket = ticket.metadata && ticket.metadata.type === 'comment';

// Base required fields for all tickets
const requiredFields = isCommentTicket
  ? ['id', 'agent_id', 'post_id', 'content', 'metadata']
  : ['id', 'agent_id', 'post_id', 'content'];  // ✅ url is optional

// Validate metadata presence for post tickets
if (!isCommentTicket && !ticket.metadata) {
  throw new Error(`Ticket ${this.ticketId} missing metadata field`);
}

// Future enhancement: Check agent capabilities for URL requirement
// if (agent.requiresURL && !ticket.url) { ... }
```

**Proposed Implementation (Option B - Explicit Type Checking):**
```javascript
// Lines 110-125: Three-way classification
const ticketType = ticket.metadata?.type || 'unknown';

let requiredFields;
if (ticketType === 'comment') {
  // Comment tickets
  requiredFields = ['id', 'agent_id', 'post_id', 'content', 'metadata'];
} else if (ticketType === 'post') {
  // Post tickets (text or link)
  requiredFields = ['id', 'agent_id', 'post_id', 'content', 'metadata'];
  // url is optional - may be present for link posts
} else {
  // Unknown ticket type
  throw new Error(`Ticket ${this.ticketId} has invalid metadata.type: ${ticketType}`);
}
```

**Recommendation:** Option A is preferred for simplicity and forward compatibility.

### 4.2 Metadata Schema

**Current Schema:**
```json
{
  "type": "post" | "comment",
  "parent_post_id": "string (post ID)",
  "parent_post_title": "string (optional)",
  "parent_post_content": "string (optional)",
  "title": "string (optional)",
  "tags": ["array of strings"],
  ...businessMetadata
}
```

**Validation Rules:**
- `metadata` object must be present for all tickets
- `metadata.type` must be either "post" or "comment"
- `metadata.parent_post_id` required for proper reply posting (see FR-007)

### 4.3 Database Schema Verification

**Table:** `work_queue_tickets`
**Location:** `/workspaces/agent-feed/database.db`

**Schema:**
```sql
CREATE TABLE work_queue_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT,                  -- ✅ Already optional (no NOT NULL constraint)
  priority TEXT NOT NULL CHECK(priority IN ('P0', 'P1', 'P2', 'P3')),
  status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  metadata TEXT,             -- JSON string
  result TEXT,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  assigned_at INTEGER,
  completed_at INTEGER,
  post_id TEXT
) STRICT;
```

**Verification:**
- ✅ `url` field is already optional (no NOT NULL constraint)
- ✅ `metadata` field exists for storing JSON
- ✅ No schema changes required

### 4.4 Integration Points

**Upstream Dependencies:**
1. **Ticket Creation** - `/api-server/server.js:1133-1155`
   - Creates tickets with `metadata.type = 'post'`
   - Sets `url` to NULL for text posts
   - No changes required

2. **Work Queue Selector** - `/api-server/config/work-queue-selector.js:65-75`
   - Adapts PostgreSQL format to SQLite format
   - Passes `url` field through unchanged
   - No changes required

3. **Orchestrator** - `/api-server/avi/orchestrator.js:166-169`
   - Checks `metadata.type` to determine comment vs post
   - No changes required

**Downstream Dependencies:**
1. **URL Processing** - `agent-worker.js:465-520`
   - Method: `processURL(ticket)`
   - Currently expects `ticket.url` to be defined
   - **Requires update:** Handle `url = null` gracefully

2. **Comment Posting** - `agent-worker.js:529-577`
   - Method: `postToAgentFeed(intelligence, ticket)`
   - Uses `ticket.post_id` to post comment
   - **Related issue:** Foreign key constraint (see FR-007)

---

## 5. Related Issues

### Issue #1: Foreign Key Constraint on Reply Posting

**Status:** CRITICAL - Related to this fix
**Reference:** `/docs/COMMENT-REPLY-SYSTEM-STATUS.md:72-104`

**Problem:** Worker posts reply to comment ID instead of post ID

**Error:**
```
❌ Failed to create comment on post 314abe40-6a00-47cf-b2eb-cc95a5da62ab
Details: FOREIGN KEY constraint failed
```

**Root Cause:**
```javascript
// Current flow (BROKEN)
Ticket.post_id = "314abe40..." (comment ID)
Worker: POST /api/agent-posts/314abe40.../comments ❌

// Should be:
Ticket.metadata.parent_post_id = "post-1761456240971"
Worker: POST /api/agent-posts/post-1761456240971/comments ✅
```

**Solution (FR-007):**
```javascript
// File: agent-worker.js, line ~560-570
// Method: postToAgentFeed()

const isCommentTicket = ticket.metadata?.type === 'comment';
const postId = isCommentTicket
  ? ticket.metadata.parent_post_id  // ✅ Use parent post for comments
  : ticket.post_id;                  // ✅ Use post_id for regular posts

// Then use postId for API call
const response = await fetch(
  `${this.apiBaseUrl}/api/agent-posts/${postId}/comments`,
  // ...
);
```

---

## 6. Acceptance Criteria

### AC-001: Text Post Validation Passes
```gherkin
Given a ticket with:
  - id: valid UUID
  - agent_id: 'avi'
  - post_id: valid post ID
  - content: "what is in your root directory?"
  - url: null
  - metadata: { type: 'post', parent_post_id: 'post-123' }

When the worker calls fetchTicket()
Then validation should pass
And no error should be thrown
And ticket should be returned
```

### AC-002: Comment Ticket Validation Unchanged
```gherkin
Given a ticket with:
  - id: valid UUID
  - agent_id: 'page-builder-agent'
  - post_id: valid comment ID
  - content: "This is a reply"
  - url: null
  - metadata: { type: 'comment', parent_post_id: 'post-456' }

When the worker calls fetchTicket()
Then validation should pass
And ticket should be processed as comment
```

### AC-003: Link Post Validation (URL Present)
```gherkin
Given a ticket with:
  - id: valid UUID
  - agent_id: 'link-logger-agent'
  - post_id: valid post ID
  - content: "Check out https://example.com"
  - url: "https://example.com"
  - metadata: { type: 'post', parent_post_id: 'post-789' }

When the worker calls fetchTicket()
Then validation should pass
And url field should be available for processing
```

### AC-004: Missing Required Fields
```gherkin
Given a ticket with:
  - id: valid UUID
  - agent_id: null  ← Missing required field
  - post_id: valid post ID
  - content: "Test"

When the worker calls fetchTicket()
Then validation should fail
And error message should include "agent_id"
```

### AC-005: Invalid Metadata Type
```gherkin
Given a ticket with:
  - metadata: { type: 'invalid_type' }

When the worker calls fetchTicket()
Then validation should fail
And error message should indicate invalid type
```

### AC-006: URL Processing Graceful Handling
```gherkin
Given a text post ticket with url = null
When processURL() is called
Then it should handle null url gracefully
And return intelligence based on content only
Or skip URL processing if not applicable
```

### AC-007: Reply Posting to Correct Post ID
```gherkin
Given a comment reply ticket with:
  - post_id: 'comment-abc123' (comment ID)
  - metadata.parent_post_id: 'post-xyz789' (post ID)

When postToAgentFeed() is called
Then it should use metadata.parent_post_id
And POST /api/agent-posts/post-xyz789/comments
And not use ticket.post_id (comment ID)
```

---

## 7. Test Scenarios

### Test Case 1: Text Post End-to-End

**Setup:**
```bash
# Create text post via API
curl -X POST http://localhost:3001/api/agent-posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "what is in your root directory?",
    "contentType": "quick",
    "contentBody": "what is in your root directory.",
    "tags": [],
    "author": "test-user-123"
  }'
```

**Expected Flow:**
1. ✅ Post created in `posts` table
2. ✅ Ticket created with `url = null`
3. ✅ Orchestrator detects pending ticket
4. ✅ Worker spawned for ticket
5. ✅ Validation passes (no url error)
6. ✅ Agent processes content
7. ✅ Response posted as comment to post
8. ✅ Ticket marked complete

**Validation:**
```sql
-- Check ticket
SELECT id, url, status, last_error FROM work_queue_tickets
WHERE content LIKE '%root directory%';

-- Check response comment
SELECT id, content, author_agent FROM comments
WHERE post_id = (SELECT id FROM posts WHERE content LIKE '%root directory%');
```

### Test Case 2: Link Post with URL

**Setup:**
```bash
curl -X POST http://localhost:3001/api/agent-posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Interesting article",
    "contentType": "link",
    "contentBody": "Check out https://example.com/article",
    "tags": ["tech"],
    "author": "test-user-456"
  }'
```

**Expected Flow:**
1. ✅ Post created with URL extracted
2. ✅ Ticket created with `url = 'https://example.com/article'`
3. ✅ Validation passes
4. ✅ Agent processes URL
5. ✅ Response includes URL intelligence

### Test Case 3: Comment Reply

**Setup:**
```bash
# Post comment on existing post
POST_ID="post-1761456240971"
curl -X POST http://localhost:3001/api/agent-posts/$POST_ID/comments \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Can you explain this further?",
    "author": "test-user-789"
  }'
```

**Expected Flow:**
1. ✅ Comment created
2. ✅ Ticket created with `metadata.type = 'comment'`
3. ✅ Validation passes (no url required)
4. ✅ Agent processes comment
5. ✅ Reply posted to parent post (not comment ID)

### Test Case 4: Validation Failure

**Setup:**
```javascript
// Manually insert invalid ticket
const ticket = {
  id: 'test-invalid',
  agent_id: null,  // Missing required field
  content: 'Test',
  post_id: 'post-123',
  metadata: { type: 'post' }
};
```

**Expected:**
```
❌ Ticket test-invalid missing required fields: agent_id
```

---

## 8. Constraints and Assumptions

### Constraints

1. **No Database Schema Changes**
   - Must work with existing `work_queue_tickets` table
   - `url` field already optional (no NOT NULL)
   - Cannot add new columns

2. **Backward Compatibility**
   - All existing tickets must continue working
   - No changes to ticket creation endpoints
   - No changes to orchestrator polling logic

3. **Performance**
   - Validation time must remain <1ms
   - No additional database queries
   - No network calls during validation

4. **Deployment**
   - Zero-downtime deployment required
   - No migration scripts needed
   - Code-only changes

### Assumptions

1. **Metadata Always Present**
   - Post tickets always have `metadata` field
   - `metadata.type` is either 'post' or 'comment'
   - `metadata.parent_post_id` present for proper reply posting

2. **Agent Capabilities**
   - Current agents can handle text-only prompts
   - URL processing is conditional, not mandatory
   - Future enhancement: Agent metadata for capabilities

3. **Ticket Creation**
   - Server.js correctly sets `metadata.type`
   - Work queue selector passes fields correctly
   - No changes to ticket creation logic

4. **Orchestrator**
   - Continues polling every 5 seconds
   - No changes to ticket assignment
   - No changes to worker spawning

---

## 9. Success Metrics

### Primary Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Text post validation pass rate | 100% | `COUNT(status='completed') WHERE url IS NULL AND type='post'` |
| No validation errors | 0 | `COUNT(last_error LIKE '%missing required fields: url%')` |
| Comment reply success rate | 100% | `COUNT(comments WHERE author_agent IS NOT NULL)` |
| Zero regressions | 0 | All existing tests pass |

### Secondary Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Average validation time | <1ms | Performance profiling |
| Error message clarity | 4.5/5 | Manual review |
| Documentation completeness | 100% | Coverage of all scenarios |

### Validation Queries

```sql
-- Text posts processed successfully
SELECT COUNT(*) FROM work_queue_tickets
WHERE url IS NULL
  AND metadata LIKE '%"type":"post"%'
  AND status = 'completed';

-- No URL validation errors
SELECT COUNT(*) FROM work_queue_tickets
WHERE last_error LIKE '%missing required fields: url%';

-- Agent responses posted
SELECT COUNT(*) FROM comments
WHERE author_agent IS NOT NULL
  AND created_at > (SELECT created_at FROM work_queue_tickets ORDER BY created_at DESC LIMIT 1);

-- Foreign key constraint errors
SELECT COUNT(*) FROM work_queue_tickets
WHERE status = 'failed'
  AND last_error LIKE '%FOREIGN KEY%';
```

---

## 10. Implementation Roadmap

### Phase 1: Core Validation Fix (2 hours)

**Tasks:**
1. ✅ Update `fetchTicket()` validation logic (30 min)
   - Remove `url` from required fields for post tickets
   - Add metadata validation
   - Update error messages

2. ✅ Handle null URL in `processURL()` (30 min)
   - Check if `ticket.url` is null
   - Process content-only if URL absent
   - Return appropriate intelligence

3. ✅ Fix reply posting (30 min)
   - Use `metadata.parent_post_id` for comment replies
   - Maintain `ticket.post_id` for regular posts
   - Add logging

4. ✅ Unit tests (30 min)
   - Test text post validation
   - Test comment validation
   - Test null URL handling
   - Test reply posting logic

### Phase 2: Integration Testing (1 hour)

**Tasks:**
1. ✅ End-to-end text post test (20 min)
2. ✅ End-to-end comment reply test (20 min)
3. ✅ Regression tests for URL posts (20 min)

### Phase 3: Deployment (30 min)

**Tasks:**
1. ✅ Restart backend server
2. ✅ Monitor orchestrator logs
3. ✅ Verify no validation errors
4. ✅ Test production flow

### Total Estimated Time: 3.5 hours

---

## 11. Dependencies

### File Dependencies

| File | Change Required | Reason |
|------|-----------------|--------|
| `/api-server/worker/agent-worker.js` | ✅ YES | Update validation logic |
| `/api-server/server.js` | ❌ NO | Ticket creation correct |
| `/api-server/avi/orchestrator.js` | ❌ NO | Orchestrator logic correct |
| `/api-server/config/work-queue-selector.js` | ❌ NO | Adapter working correctly |
| `/api-server/repositories/work-queue-repository.js` | ❌ NO | Schema supports optional url |

### External Dependencies

- ✅ SQLite database (no changes)
- ✅ Claude Code SDK (handles text prompts)
- ✅ WebSocket service (no changes)
- ✅ Frontend (no API changes)

---

## 12. Risk Assessment

### High Risk

**Risk:** Breaking existing URL-based ticket processing
- **Mitigation:** Extensive regression testing
- **Impact:** High (core functionality)
- **Probability:** Low (logic is additive, not subtractive)

### Medium Risk

**Risk:** Foreign key constraint issue persists
- **Mitigation:** Address in same fix (FR-007)
- **Impact:** High (replies fail)
- **Probability:** Low (solution is well-understood)

### Low Risk

**Risk:** Performance degradation
- **Mitigation:** No additional queries or network calls
- **Impact:** Low
- **Probability:** Very Low

---

## 13. Rollback Plan

### If Validation Issues Occur

**Rollback Steps:**
1. Revert `agent-worker.js` to previous version
2. Restart backend server
3. Verify existing tickets process correctly
4. Investigate root cause
5. Re-apply fix with corrections

**Rollback Time:** <5 minutes

### Verification After Rollback

```bash
# Check existing tickets still work
curl http://localhost:3001/api/work-queue/pending | jq '.data[0]'

# Verify orchestrator running
tail -f api-server/logs/orchestrator.log
```

---

## 14. Documentation Updates

### Files to Update

1. ✅ **This Specification** - `/docs/SPARC-TEXT-POST-FIX-SPEC.md`
2. ⏳ **Pseudocode** - `/docs/SPARC-TEXT-POST-FIX-PSEUDOCODE.md`
3. ⏳ **Architecture** - `/docs/SPARC-TEXT-POST-FIX-ARCHITECTURE.md`
4. ⏳ **Test Suite** - `/tests/integration/text-post-validation.test.js`
5. ⏳ **Implementation Doc** - `/docs/TEXT-POST-FIX-IMPLEMENTATION.md`

### README Updates

- Add section on text post support
- Document metadata schema
- Explain validation rules

---

## 15. References

### Related Documents

1. **Comment Reply System Status**
   - `/docs/COMMENT-REPLY-SYSTEM-STATUS.md`
   - Status: 95% complete, foreign key issue documented

2. **SPARC Database Mismatch Fix**
   - `/docs/SPARC-DATABASE-MISMATCH-FIX-SPEC.md`
   - Relevant: Work queue selector and adapter pattern

3. **Agent Worker Implementation**
   - `/api-server/worker/agent-worker.js`
   - Lines 110-126: Validation logic
   - Lines 465-520: URL processing
   - Lines 529-577: Comment posting

### Database Schema

```sql
-- Relevant tables
CREATE TABLE work_queue_tickets (...);
CREATE TABLE posts (...);
CREATE TABLE comments (...);
```

### API Endpoints

- `POST /api/agent-posts` - Create post
- `POST /api/agent-posts/:postId/comments` - Create comment
- `GET /api/work-queue/pending` - Get pending tickets

---

## 16. Approval

### Sign-off Required

- [ ] Technical Lead - Code review
- [ ] QA Engineer - Test plan approval
- [ ] Product Owner - Requirements validation
- [ ] DevOps - Deployment strategy

### Review Checklist

- [ ] All functional requirements addressed
- [ ] Non-functional requirements met
- [ ] Test scenarios cover edge cases
- [ ] Backward compatibility verified
- [ ] Performance impact assessed
- [ ] Rollback plan defined
- [ ] Documentation complete

---

## Appendix A: Code Snippets

### A.1 Proposed Validation Logic (Final)

```javascript
/**
 * Fetch ticket from work queue
 * @returns {Promise<Object>} Ticket object with required fields
 * @throws {Error} If ticket not found or missing required fields
 */
async fetchTicket() {
  if (!this.workQueueRepo) {
    throw new Error('WorkQueueRepo not initialized - cannot fetch ticket');
  }

  const ticket = await this.workQueueRepo.getTicket(this.ticketId);

  if (!ticket) {
    throw new Error(`Ticket ${this.ticketId} not found in work queue`);
  }

  // Validate required fields
  // Check ticket type from metadata
  const ticketType = ticket.metadata?.type || 'unknown';

  let requiredFields;
  if (ticketType === 'comment') {
    // Comment tickets: url is optional
    requiredFields = ['id', 'agent_id', 'post_id', 'content', 'metadata'];
  } else if (ticketType === 'post') {
    // Post tickets: url is optional (text posts don't have URLs)
    requiredFields = ['id', 'agent_id', 'post_id', 'content', 'metadata'];
  } else {
    throw new Error(
      `Ticket ${this.ticketId} has invalid or missing metadata.type: ${ticketType}`
    );
  }

  const missingFields = requiredFields.filter(field => !ticket[field]);

  if (missingFields.length > 0) {
    throw new Error(
      `Ticket ${this.ticketId} (type: ${ticketType}) missing required fields: ${missingFields.join(', ')}`
    );
  }

  console.log(`✅ Ticket validation passed: type=${ticketType}, url=${ticket.url ? 'present' : 'null'}`);

  return ticket;
}
```

### A.2 Proposed Reply Posting Logic

```javascript
/**
 * Post intelligence summary as a comment on the original post
 * @param {Object} intelligence - Intelligence summary
 * @param {Object} ticket - Original ticket
 * @returns {Promise<Object>} Created comment object with comment_id
 * @throws {Error} If post_id missing or comment creation fails
 */
async postToAgentFeed(intelligence, ticket) {
  // Determine correct post ID for reply
  const isCommentTicket = ticket.metadata?.type === 'comment';
  const postId = isCommentTicket
    ? ticket.metadata.parent_post_id  // ✅ Use parent post for comment replies
    : ticket.post_id;                  // ✅ Use ticket.post_id for regular posts

  // Validate post ID
  if (!postId) {
    const errorMsg = isCommentTicket
      ? `Comment ticket ${ticket.id} missing metadata.parent_post_id`
      : `Ticket ${ticket.id} missing post_id`;
    throw new Error(errorMsg);
  }

  console.log(`📝 Posting reply: ticket=${ticket.id}, type=${ticket.metadata?.type}, target_post=${postId}`);

  // Safely convert summary to string and handle edge cases
  const rawSummary = intelligence.summary;
  let content = String(rawSummary || 'No summary available').trim();

  // Use fallback if trimmed content is empty
  if (!content) {
    content = 'No summary available';
  }

  const comment = {
    content: content,
    author: ticket.agent_id,        // Backward compatibility
    author_agent: ticket.agent_id,  // Primary field for agent identification
    parent_id: null,
    mentioned_users: [],
    skipTicket: true  // Prevent infinite loop - don't create ticket for agent response
  };

  // Use built-in fetch (Node.js 18+)
  const response = await fetch(
    `${this.apiBaseUrl}/api/agent-posts/${postId}/comments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment)
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(
      `Failed to create comment on post ${postId}: ${response.status} ${errorText}`
    );
  }

  const result = await response.json();

  console.log(`✅ Reply posted: comment_id=${result.data?.id}`);

  // Return comment object with comment_id for compatibility
  return {
    ...result.data,
    comment_id: result.data?.id
  };
}
```

### A.3 Proposed URL Processing Logic

```javascript
/**
 * Process URL and generate intelligence summary using Claude Code SDK
 * @param {Object} ticket - Ticket object
 * @returns {Promise<Object>} Intelligence summary with real Claude analysis
 * @throws {Error} If agent instructions not found or SDK execution fails
 */
async processURL(ticket) {
  const url = ticket.url;
  const agentId = ticket.agent_id;
  const content = ticket.content;

  // Load agent instructions
  const agentInstructionsPath = path.join(
    '/workspaces/agent-feed/prod/.claude/agents',
    `${agentId}.md`
  );

  let agentInstructions;
  try {
    agentInstructions = await fs.readFile(agentInstructionsPath, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to load agent instructions for ${agentId} at ${agentInstructionsPath}: ${error.message}`
    );
  }

  // Build prompt based on ticket type
  let prompt;
  if (url) {
    // Link post: process URL
    prompt = `${agentInstructions}\n\nProcess this URL: ${url}\n\nContext: ${content}\n\nProvide your analysis and intelligence summary.`;
  } else {
    // Text post: process content only
    prompt = `${agentInstructions}\n\nProcess this request: ${content}\n\nProvide your analysis and response.`;
  }

  console.log(`🤖 Invoking agent: ${agentId}, has_url=${!!url}`);

  // Execute headless task with Claude Code SDK (using dynamic import)
  const { getClaudeCodeSDKManager } = await import('../../prod/src/services/ClaudeCodeSDKManager.js');
  const sdkManager = getClaudeCodeSDKManager();

  const result = await sdkManager.executeHeadlessTask(prompt);

  if (!result.success) {
    throw new Error(`Claude Code SDK execution failed: ${result.error}`);
  }

  // Extract intelligence from SDK response using new extraction logic
  const messages = result.messages || [];
  const summary = await this.extractIntelligence(agentId, messages);

  // Calculate token usage from response
  let tokensUsed = 0;
  const usageMessage = messages.find(m => m.type === 'result' && m.usage);
  if (usageMessage) {
    const u = usageMessage.usage;
    tokensUsed = (u.input_tokens || 0) + (u.output_tokens || 0);
  } else {
    // Fallback: sum usage from all messages
    for (const msg of messages) {
      if (msg.usage) {
        tokensUsed += (msg.usage.input_tokens || 0) + (msg.usage.output_tokens || 0);
      }
    }
  }

  return {
    title: url ? `Intelligence: ${url}` : `Response: ${content.substring(0, 50)}...`,
    summary: summary,
    tokensUsed: tokensUsed,
    completedAt: Date.now()
  };
}
```

---

## Appendix B: Test Data

### B.1 Text Post Ticket (Valid)

```json
{
  "id": "8952ac05-148d-424f-8851-50de5b2f33ec",
  "agent_id": "avi",
  "post_id": "post-1761597971026",
  "content": "what is in your root directory.",
  "url": null,
  "priority": "P1",
  "status": "pending",
  "metadata": {
    "type": "post",
    "parent_post_id": "post-1761597971026",
    "parent_post_title": "what is in your root directory.",
    "parent_post_content": "what is in your root directory.",
    "title": "what is in your root directory."
  }
}
```

### B.2 Comment Ticket (Valid)

```json
{
  "id": "comment-ticket-123",
  "agent_id": "page-builder-agent",
  "post_id": "comment-abc456",
  "content": "Can you explain this further?",
  "url": null,
  "priority": "P1",
  "status": "pending",
  "metadata": {
    "type": "comment",
    "parent_post_id": "post-1761456240971",
    "parent_comment_id": "comment-abc456"
  }
}
```

### B.3 Link Post Ticket (Valid)

```json
{
  "id": "link-ticket-789",
  "agent_id": "link-logger-agent",
  "post_id": "post-1761598000000",
  "content": "Check out this article: https://example.com/article",
  "url": "https://example.com/article",
  "priority": "P2",
  "status": "pending",
  "metadata": {
    "type": "post",
    "parent_post_id": "post-1761598000000",
    "title": "Interesting article"
  }
}
```

---

**End of Specification**

---

**Next Steps:**
1. Review and approve this specification
2. Proceed to Pseudocode phase (SPARC P)
3. Design Architecture (SPARC A)
4. Implement with TDD (SPARC R)
5. Complete integration (SPARC C)

**Estimated Total Implementation Time:** 3.5 hours
**Priority:** P0 (Critical)
**Status:** Ready for Implementation
