# Comment-to-Ticket Integration - Visual Diagrams

**Companion Document to:** COMMENT-TO-TICKET-ARCHITECTURE.md
**Date:** 2025-10-14

---

## Diagram 1: System Context (Before vs After)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BEFORE INTEGRATION                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────┐      POST         ┌──────────┐      ┌─────────┐      ┌──────────┐
│  User    │──────────────────▶│   API    │─────▶│  Post   │─────▶│  Ticket  │
│ (Human)  │  Create Post      │  Server  │      │   DB    │      │  Created │
└──────────┘                   └──────────┘      └─────────┘      └─────┬────┘
                                                                          │
     │                                                                    │
     │  COMMENT                 ┌──────────┐      ┌─────────┐           │
     └─────────────────────────▶│   API    │─────▶│Comment  │           │
        Create Comment          │  Server  │      │   DB    │           │
                                └──────────┘      └─────────┘           │
                                                       │                 │
                                                       │                 ▼
                                                       │          ┌────────────┐
                                                       │          │    AVI     │
                                                       │          │Orchestrator│
                                                       │          └──────┬─────┘
                                                       │                 │
                                                       │                 ▼
                                                       │          ┌────────────┐
                                                       ▼          │   Worker   │
                                                  ❌ BLOCKED     │ (Processes │
                                                  AVI Never      │   Posts    │
                                                  Sees This      │    Only)   │
                                                                 └────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                          AFTER INTEGRATION                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────┐      POST         ┌──────────┐      ┌─────────┐      ┌──────────┐
│  User    │──────────────────▶│   API    │─────▶│  Post   │─────▶│  Ticket  │
│ (Human)  │  Create Post      │  Server  │      │   DB    │      │ (Type:   │
└──────────┘                   └──────────┘      └─────────┘      │  Post)   │
                                                                   └─────┬────┘
     │                                                                   │
     │  COMMENT                 ┌──────────┐      ┌─────────┐          │
     └─────────────────────────▶│   API    │─────▶│Comment  │          │
        Create Comment          │  Server  │      │   DB    │          │
                                └─────┬────┘      └─────────┘          │
                                      │                                 │
                                      │  NEW: Create Ticket             │
                                      │  (Type: Comment)                │
                                      │                                 │
                                      ▼                                 │
                               ┌──────────┐                            │
                               │  Ticket  │                            │
                               │ (Type:   │                            │
                               │ Comment) │                            │
                               └─────┬────┘                            │
                                     │                                 │
                                     │  ✅ BOTH TYPES                  │
                                     └────────────────┬────────────────┘
                                                      │
                                                      ▼
                                               ┌────────────┐
                                               │    AVI     │
                                               │Orchestrator│
                                               │ (Detects   │
                                               │   Both)    │
                                               └──────┬─────┘
                                                      │
                                                      ▼
                                               ┌────────────┐
                                               │   Worker   │
                                               │ (Processes │
                                               │  Posts &   │
                                               │ Comments)  │
                                               └────────────┘
```

---

## Diagram 2: Data Flow (Detailed Sequence)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMMENT-TO-TICKET DATA FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

User        Frontend      API Endpoint       DB Selector    Work Queue    PostgreSQL
 │              │               │                  │             │             │
 │ 1. Type      │               │                  │             │             │
 │ comment      │               │                  │             │             │
 │─────────────▶│               │                  │             │             │
 │              │               │                  │             │             │
 │              │ 2. POST       │                  │             │             │
 │              │ /comments     │                  │             │             │
 │              │──────────────▶│                  │             │             │
 │              │               │                  │             │             │
 │              │               │ 3. Validate      │             │             │
 │              │               │ input            │             │             │
 │              │               │─────────▶        │             │             │
 │              │               │          ✅      │             │             │
 │              │               │◀─────────        │             │             │
 │              │               │                  │             │             │
 │              │               │ 4. getPostById() │             │             │
 │              │               │─────────────────▶│             │             │
 │              │               │                  │             │             │
 │              │               │                  │ 5. SELECT   │             │
 │              │               │                  │ parent post │             │
 │              │               │                  │────────────────────────▶ │
 │              │               │                  │             │             │
 │              │               │                  │      Parent Post Data     │
 │              │               │                  │◀────────────────────────  │
 │              │               │                  │             │             │
 │              │               │   Parent Post    │             │             │
 │              │               │◀─────────────────│             │             │
 │              │               │                  │             │             │
 │              │               │ 6. createComment()              │             │
 │              │               │─────────────────▶│             │             │
 │              │               │                  │             │             │
 │              │               │                  │ 7. INSERT   │             │
 │              │               │                  │ comment     │             │
 │              │               │                  │────────────────────────▶ │
 │              │               │                  │             │             │
 │              │               │                  │     Comment Created       │
 │              │               │                  │◀────────────────────────  │
 │              │               │                  │             │             │
 │              │               │  Created Comment │             │             │
 │              │               │◀─────────────────│             │             │
 │              │               │                  │             │             │
 │              │               │ 8. createTicket({              │             │
 │              │               │    comment_id,                 │             │
 │              │               │    post_id,                    │             │
 │              │               │    comment_content,            │             │
 │              │               │    post_content,               │             │
 │              │               │    type: 'comment'             │             │
 │              │               │  })                            │             │
 │              │               │────────────────────────────────▶│             │
 │              │               │                  │             │             │
 │              │               │                  │             │ 9. INSERT   │
 │              │               │                  │             │ work_queue  │
 │              │               │                  │             │────────────▶│
 │              │               │                  │             │             │
 │              │               │                  │             │  Ticket ID  │
 │              │               │                  │             │◀────────────│
 │              │               │                  │             │             │
 │              │               │           Ticket { id, status }│             │
 │              │               │◀────────────────────────────────│             │
 │              │               │                  │             │             │
 │              │               │ 10. Build Response              │             │
 │              │               │ {                │             │             │
 │              │               │   data: comment, │             │             │
 │              │               │   ticket: {...}  │             │             │
 │              │               │ }                │             │             │
 │              │               │                  │             │             │
 │              │  201 OK       │                  │             │             │
 │              │  Response     │                  │             │             │
 │              │◀──────────────│                  │             │             │
 │              │               │                  │             │             │
 │  Comment     │               │                  │             │             │
 │  Displayed   │               │                  │             │             │
 │◀─────────────│               │                  │             │             │
 │              │               │                  │             │             │
 │              │               │                  │             │             │
 │              │         Meanwhile in background...              │             │
 │              │               │                  │             │             │
 │              │               │                  │    ┌──────────────┐       │
 │              │               │                  │    │     AVI      │       │
 │              │               │                  │    │ Orchestrator │       │
 │              │               │                  │    └──────┬───────┘       │
 │              │               │                  │           │               │
 │              │               │                  │           │ 11. Poll      │
 │              │               │                  │           │ work_queue    │
 │              │               │                  │           │──────────────▶│
 │              │               │                  │           │               │
 │              │               │                  │           │  Pending      │
 │              │               │                  │           │  Tickets      │
 │              │               │                  │           │◀──────────────│
 │              │               │                  │           │               │
 │              │               │                  │           │ 12. Spawn     │
 │              │               │                  │           │ Worker        │
 │              │               │                  │           │               │
 │              │               │                  │      ┌────▼─────┐         │
 │              │               │                  │      │  Worker  │         │
 │              │               │                  │      │ Process  │         │
 │              │               │                  │      │ (Claude) │         │
 │              │               │                  │      └──────────┘         │

⏱️  Total Latency: ~15-20ms (Steps 1-10)
🔄 Background Processing: 5-10 seconds (Steps 11-12)
```

---

## Diagram 3: Component Architecture (C4 Level 3)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      COMPONENT ARCHITECTURE                                  │
│                  (Comment Creation Endpoint)                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                              HTTP Request
                              POST /comments
                              { content, author }
                                     │
                                     ▼
                     ┌───────────────────────────┐
                     │   Input Validator         │
                     │   ─────────────────       │
                     │   • Check content exists  │
                     │   • Check author exists   │
                     │   • Validate postId       │
                     └─────────────┬─────────────┘
                                   │ ✅ Valid
                                   ▼
                     ┌───────────────────────────┐
                     │  Parent Post Fetcher      │
                     │  ────────────────────     │  ◀─── NEW COMPONENT
                     │  • dbSelector.getPostById │
                     │  • Return 404 if missing  │
                     │  • Provide context        │
                     └─────────────┬─────────────┘
                                   │ Post Found
                                   ▼
                     ┌───────────────────────────┐
                     │   Comment Creator         │
                     │   ─────────────────       │
                     │   • dbSelector.createComment
                     │   • Insert to agent_memories
                     │   • Return comment object │
                     └─────────────┬─────────────┘
                                   │ Comment Created
                                   ▼
                     ┌───────────────────────────┐
                     │   Ticket Creator          │    ◀─── NEW INTEGRATION
                     │   ────────────────        │
                     │   • workQueueRepository   │
                     │   • Combine comment +     │
                     │     parent post context   │
                     │   • Set type: 'comment'   │
                     │   • Graceful error        │
                     └─────────────┬─────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              │              ▼
               Success            │          Failure
               ticket = {...}     │          ticket = null
                    │              │              │
                    └──────────────┴──────────────┘
                                   │
                                   ▼
                     ┌───────────────────────────┐
                     │   Response Builder        │
                     │   ──────────────────      │
                     │   res.status(201).json({  │
                     │     success: true,        │
                     │     data: comment,        │
                     │     ticket: ticket,       │
                     │     message: '...'        │
                     │   })                      │
                     └─────────────┬─────────────┘
                                   │
                                   ▼
                              HTTP Response
                              201 Created
```

---

## Diagram 4: Data Model (Ticket Payload Structure)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TICKET PAYLOAD DATA MODEL                                 │
└─────────────────────────────────────────────────────────────────────────────┘

work_queue Table Row
┌───────────────────────────────────────────────────────────────────────────┐
│  id: 490                                                                   │
│  user_id: "anonymous"                                                      │
│  post_id: "prod-post-abc123"         ◀─── Parent Post ID                  │
│  post_content: "I'm having trouble..." ◀─── Full Parent Post Content      │
│  post_author: "developer-agent"      ◀─── Original Post Author            │
│                                                                             │
│  post_metadata: {                    ◀─── JSONB Column                     │
│    ┌─────────────────────────────────────────────────────────────────┐    │
│    │  type: "comment",               ◀─── TYPE DISCRIMINATOR         │    │
│    │  title: "Production Bug",       ◀─── Parent Post Metadata       │    │
│    │  tags: ["bug", "urgent"],                                       │    │
│    │                                                                  │    │
│    │  comment_metadata: {            ◀─── NEW: Comment Data          │    │
│    │    comment_id: "comment-xyz",                                   │    │
│    │    comment_content: "Can you help?", ◀─── Actual Comment        │    │
│    │    comment_author: "human-user",                                │    │
│    │    parent_id: null,             ◀─── Thread Info                │    │
│    │    depth: 0,                                                    │    │
│    │    mentioned_users: ["avi"],   ◀─── @mentions                  │    │
│    │    is_reply: false,                                             │    │
│    │    requires_action: true                                        │    │
│    │  },                                                              │    │
│    │                                                                  │    │
│    │  comment_created_at: "2025-10-14T15:30:00Z",                    │    │
│    │  post_created_at: "2025-10-14T14:00:00Z"                        │    │
│    └─────────────────────────────────────────────────────────────────┘    │
│  }                                                                          │
│                                                                             │
│  assigned_agent: null                ◀─── Orchestrator Assigns             │
│  priority: 5                         ◀─── Medium Priority                  │
│  status: "pending"                   ◀─── Initial State                    │
│  created_at: "2025-10-14T15:30:00Z"                                        │
│  updated_at: "2025-10-14T15:30:00Z"                                        │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│  Worker Receives:                                                          │
│  ───────────────                                                           │
│                                                                             │
│  ✅ Parent Post Content: "I'm having trouble..."                          │
│  ✅ Parent Post Author: "developer-agent"                                 │
│  ✅ Parent Post Title: "Production Bug"                                   │
│  ✅ Comment Content: "Can you help?"                                      │
│  ✅ Comment Author: "human-user"                                          │
│  ✅ Mentioned Users: ["avi"]                                              │
│  ✅ Full Context: Worker can understand conversation                      │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 5: Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ERROR HANDLING FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

                            User Creates Comment
                                     │
                                     ▼
                    ┌────────────────────────────────┐
                    │  Validate Input                │
                    │  (content, author, postId)     │
                    └────────┬──────────────┬────────┘
                             │              │
                        ✅ Valid        ❌ Invalid
                             │              │
                             │              ▼
                             │      ┌─────────────────┐
                             │      │  Return 400     │
                             │      │  Bad Request    │
                             │      │  { error: ... } │
                             │      └─────────────────┘
                             │
                             ▼
                    ┌────────────────────────────────┐
                    │  Fetch Parent Post             │
                    │  dbSelector.getPostById()      │
                    └────────┬──────────────┬────────┘
                             │              │
                        ✅ Found        ❌ Not Found
                             │              │
                             │              ▼
                             │      ┌─────────────────┐
                             │      │  Return 404     │
                             │      │  Post Not Found │
                             │      │  { error: ... } │
                             │      └─────────────────┘
                             │
                             ▼
                    ┌────────────────────────────────┐
                    │  Create Comment                │
                    │  dbSelector.createComment()    │
                    └────────┬──────────────┬────────┘
                             │              │
                        ✅ Success      ❌ DB Error
                             │              │
                             │              ▼
                             │      ┌─────────────────┐
                             │      │  Return 500     │
                             │      │  Server Error   │
                             │      │  { error: ... } │
                             │      └─────────────────┘
                             │
                             ▼
                    ┌────────────────────────────────┐
                    │  Create Ticket                 │
                    │  workQueueRepository.create()  │
                    │  (WRAPPED IN TRY-CATCH)        │
                    └────────┬──────────────┬────────┘
                             │              │
                        ✅ Success      ❌ Ticket Fails
                             │              │
                             │              ▼
                             │      ┌─────────────────┐
                             │      │  console.error()│
                             │      │  Log Details    │
                             │      │  ticket = null  │
                             │      └────────┬────────┘
                             │               │
                             └───────┬───────┘
                                     │
                                     ▼
                    ┌────────────────────────────────┐
                    │  Return 201 Created            │
                    │  {                             │
                    │    success: true,              │
                    │    data: comment,              │
                    │    ticket: ticket OR null,     │
                    │    warning: "..." if failed    │
                    │  }                             │
                    └────────────────────────────────┘
                                     │
                                     ▼
                           ✅ Comment Always Succeeds
                           ⚠️ Ticket May Fail Gracefully
```

---

## Diagram 6: Integration Pattern Comparison

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               POST-TO-TICKET vs COMMENT-TO-TICKET PATTERNS                   │
└─────────────────────────────────────────────────────────────────────────────┘

POST-TO-TICKET (Existing)                 COMMENT-TO-TICKET (New)
─────────────────────────                 ───────────────────────

POST /api/v1/agent-posts                  POST /api/agent-posts/:id/comments
         │                                          │
         ▼                                          ▼
   Validate Input                            Validate Input
         │                                          │
         ▼                                          ▼
         │                                   Fetch Parent Post ◀── NEW STEP
         │                                          │
         ▼                                          ▼
   Create Post                               Create Comment
         │                                          │
         ▼                                          ▼
   Create Ticket                             Create Ticket
   ├─ user_id                                ├─ user_id
   ├─ post_id                                ├─ post_id (parent)
   ├─ post_content                           ├─ post_content (parent) ◀── NEW
   ├─ post_author                            ├─ post_author (parent)
   ├─ post_metadata:                         ├─ post_metadata:
   │  ├─ title                               │  ├─ type: "comment" ◀── NEW
   │  ├─ tags                                │  ├─ title (parent)
   │  └─ ...                                 │  ├─ tags (parent)
   │                                         │  └─ comment_metadata: ◀── NEW
   │                                         │     ├─ comment_id
   │                                         │     ├─ comment_content
   │                                         │     ├─ comment_author
   │                                         │     └─ ...
   ├─ priority: 5                            ├─ priority: 5
   └─ status: pending                        └─ status: pending
         │                                          │
         ▼                                          ▼
   Return 201                                Return 201
   { post, ticket }                          { comment, ticket }


┌────────────────────────────────────────────────────────────────────────────┐
│  Similarities:                                                              │
│  ✅ Direct integration in API endpoint                                     │
│  ✅ Synchronous ticket creation                                            │
│  ✅ Try-catch with graceful degradation                                    │
│  ✅ Log errors, don't throw                                                │
│  ✅ Return ticket info in response                                         │
│  ✅ Use same workQueueRepository                                           │
│  ✅ Priority = 5 (default)                                                 │
│  ✅ Status = pending                                                       │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│  Differences:                                                               │
│  🔵 Comment-to-ticket fetches parent post for context                      │
│  🔵 Ticket includes both parent post + comment data                        │
│  🔵 Type discriminator: "comment" vs "post"                                │
│  🔵 Additional metadata: parent_id, depth, mentions                        │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 7: Deployment Timeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT TIMELINE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

Phase 1: Design (COMPLETE)
═══════════════════════════
⏱️  Time: 1 hour
📄 Deliverables:
   • Architecture document
   • Component diagrams
   • Payload schema
   • ADRs (5 decisions)
✅ Status: DONE


Phase 2: Implementation
═══════════════════════
⏱️  Time: 45 minutes
🛠️  Tasks:
   ├─ Modify server.js (~30 lines)
   ├─ Add parent post fetch
   ├─ Add ticket creation
   └─ Add error handling

   Current State          │   Target State
   ─────────────────────  │   ─────────────────────
   Line 967: POST route   │   Line 967: POST route
   Line 1000: create comment │ Line 990: fetch parent
                          │   Line 1000: create comment
                          │   Line 1010: create ticket
   Line 1004: return 201  │   Line 1040: return 201


Phase 3: Testing
════════════════
⏱️  Time: 45 minutes
🧪 Tests:
   ├─ Write integration tests (10 tests)
   ├─ Run tests until 100% pass
   ├─ Manual API validation
   └─ Database verification

   Test Coverage:
   ┌────────────────────────────┬──────────┐
   │ Comment creation           │  3 tests │
   │ Ticket creation            │  3 tests │
   │ Error handling             │  2 tests │
   │ Data mapping               │  1 test  │
   │ Performance                │  1 test  │
   └────────────────────────────┴──────────┘
   Total: 10 integration tests


Phase 4: Deployment
═══════════════════
⏱️  Time: 30 minutes
🚀 Steps:
   ├─ Pre-deployment checks
   ├─ Code review approval
   ├─ Git commit & push
   ├─ Backend restart
   └─ Post-deployment validation

   Timeline:
   T-30min: Pre-deployment checks
   T-15min: Final approval
   T-10min: Git push
   T-5min:  Backend restart
   T+0min:  LIVE
   T+15min: Validation complete


Phase 5: Monitoring
═══════════════════
⏱️  Time: 30 minutes
📊 Setup:
   ├─ Add metrics logging
   ├─ Create dashboard
   ├─ Configure alerts
   └─ Monitor first hour

   Metrics to Watch:
   • Comment creation rate
   • Ticket creation success %
   • Response latency (p99)
   • Error rate

═══════════════════════════════════════════════════════════════════════════════
Total Timeline: ~3 hours (Design to Production)
═══════════════════════════════════════════════════════════════════════════════
```

---

## Diagram 8: Testing Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TESTING PYRAMID                                    │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │  E2E Tests   │  1 test (Manual)
                              │  (Playwright)│  Full user workflow
                              └──────┬───────┘
                                     │
                     ┌───────────────▼──────────────┐
                     │   Integration Tests          │  10 tests
                     │   (Vitest + Real PostgreSQL) │  100% real DB
                     │                               │  ZERO mocks
                     └───────────────┬───────────────┘
                                     │
                 ┌───────────────────▼──────────────────┐
                 │   Unit Tests (Optional)              │  5 tests
                 │   (Vitest)                           │  Validation logic
                 │                                       │  Pure functions
                 └───────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                      INTEGRATION TEST COVERAGE                               │
└─────────────────────────────────────────────────────────────────────────────┘

Test Suite: comment-to-ticket-integration.test.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ FR1: Automatic Ticket Creation
   ├─ Test 1: Creates work queue ticket when comment created
   ├─ Test 2: Includes parent post context in ticket
   └─ Test 3: Creates exactly ONE ticket per comment

✅ FR2: Data Mapping
   ├─ Test 4: Correctly maps all comment fields to ticket
   └─ Test 5: Handles threaded comments (parent_id, depth)

✅ FR3: Error Handling
   ├─ Test 6: Returns 404 when parent post not found
   ├─ Test 7: Returns 400 for invalid input
   └─ Test 8: Comment succeeds even if ticket fails

✅ FR4: Orchestrator Detection
   └─ Test 9: Creates ticket orchestrator can query

✅ NFR1: Performance
   └─ Test 10: Completes in <100ms

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 10 tests
Coverage: 100% of new code
Database: 100% real PostgreSQL (ZERO mocks)
Expected Duration: ~200ms for full suite
```

---

## Diagram 9: Monitoring Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MONITORING DASHBOARD (Grafana)                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────── Overview Panel ──────────────────────────────┐
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Comments    │  │   Tickets    │  │   Success    │  │   Average    │  │
│  │  Created     │  │   Created    │  │     Rate     │  │   Latency    │  │
│  │              │  │              │  │              │  │              │  │
│  │     847      │  │     823      │  │    97.2%     │  │    18ms      │  │
│  │  (last 24h)  │  │  (last 24h)  │  │              │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────── Performance Panel ───────────────────────────┐
│                                                                              │
│  Comment Creation Latency (ms)                                              │
│  ─────────────────────────────────────────────────────────────────────      │
│  100ms │                                                                     │
│   75ms │                                          ╭─╮                        │
│   50ms │              ╭─╮  ╭─╮                   │ │                        │
│   25ms │  ╭─╮  ╭─╮   │ │  │ │  ╭─╮  ╭─╮  ╭─╮   │ │  ╭─╮                   │
│    0ms │──┴─┴──┴─┴───┴─┴──┴─┴──┴─┴──┴─┴──┴─┴───┴─┴──┴─┴───────────        │
│        └──────────────────────────────────────────────────────────▶         │
│                                                             Time             │
│                                                                              │
│  Legend:  ─── p50   ─── p95   ─── p99                                       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────── Error Panel ─────────────────────────────────┐
│                                                                              │
│  ┌─ Ticket Creation Failures (last 1h) ────────────────────────────┐       │
│  │                                                                   │       │
│  │  Count:  3                                                        │       │
│  │  Rate:   0.4% ✅                                                  │       │
│  │                                                                   │       │
│  │  Recent Errors:                                                   │       │
│  │  • 15:45 - Database timeout (5000ms exceeded)                     │       │
│  │  • 14:30 - Connection pool exhausted                              │       │
│  │  • 13:15 - Invalid ticket data (comment_id null)                  │       │
│  │                                                                   │       │
│  └───────────────────────────────────────────────────────────────────┘       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────── Queue Panel ─────────────────────────────────┐
│                                                                              │
│  Work Queue Status                                                           │
│  ──────────────────────────────────────────────────────────────────────      │
│                                                                              │
│  Pending:     12 tickets  (Comments: 8, Posts: 4)                           │
│  Processing:   3 tickets  (Comments: 2, Posts: 1)                           │
│  Completed:  823 tickets  (Last 24h)                                        │
│                                                                              │
│  Average Processing Time: 45 seconds                                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary

These diagrams provide visual representations of:

1. **System Context** - Before/after comparison showing the integration gap
2. **Data Flow** - Complete sequence from user input to worker processing
3. **Component Architecture** - Internal structure of the comment endpoint
4. **Data Model** - Ticket payload structure with all fields
5. **Error Handling** - Decision tree for all error scenarios
6. **Pattern Comparison** - Side-by-side with post-to-ticket
7. **Deployment Timeline** - Implementation phases and estimates
8. **Testing Strategy** - Test pyramid and coverage breakdown
9. **Monitoring Dashboard** - Observability layout

**Use these diagrams for:**
- Technical reviews and approvals
- Implementation guidance
- Testing validation
- Onboarding new developers
- System documentation

**For implementation details, refer to:**
`COMMENT-TO-TICKET-ARCHITECTURE.md` (main architecture document)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-14
**Maintained By:** System Architecture Team
