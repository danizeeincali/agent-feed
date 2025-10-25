# SPARC Fix Plan: AgentWorker Regression Resolution

**Date**: 2025-10-23
**Status**: Plan - Awaiting User Approval
**Methodology**: SPARC + TDD + Regression Testing
**Estimated Time**: 3-4 hours

---

## S - SPECIFICATION

### Objectives

**Primary Goal**: Fix AgentWorker to restore correct behavior with ZERO mock data and real Claude API integration.

### Success Criteria

1. ✅ Worker fetches REAL tickets from database (not mock)
2. ✅ Worker creates COMMENTS on original posts (not new posts)
3. ✅ Worker calls Claude Code SDK for real intelligence generation
4. ✅ Claude API usage appears on platform.claude.com
5. ✅ Intelligence content is real (not example data)
6. ✅ Only ONE agent response per URL (no duplicates)
7. ✅ All regression tests pass
8. ✅ No new errors in production logs

### Functional Requirements

**FR-1: Real Ticket Fetching**
- Remove mock data from fetchTicket()
- Use workQueueRepo.getTicket(this.ticketId)
- Throw error if ticket not found
- Verify ticket has required fields (agent_id, url, post_id, content)

**FR-2: Comment Creation (Not Posts)**
- Change endpoint from `/api/v1/agent-posts` to `/api/agent-posts/:postId/comments`
- Use ticket.post_id to identify parent post
- Set skipTicket=true to prevent infinite loops
- Return comment ID (not post ID)

**FR-3: Claude SDK Integration**
- Import ClaudeCodeSDKManager
- Load agent instructions from markdown file
- Call SDK with agent context and URL
- Extract real intelligence from SDK response
- Track actual token usage

**FR-4: Error Handling**
- Graceful handling of missing tickets
- Retry logic for transient SDK failures
- Proper error logging
- Update ticket status to 'failed' on errors

### Non-Functional Requirements

**NFR-1: Zero Mock Data**
- No hardcoded URLs or content
- No simulated intelligence
- No fake token counts
- All data from database or Claude API

**NFR-2: Performance**
- Claude SDK call: <30s for simple URLs
- Comment creation: <100ms
- Total E2E: <45s per ticket

**NFR-3: Observability**
- Log all Claude API calls
- Track real token usage
- Monitor comment creation success rate
- Alert on failures

---

## P - PSEUDOCODE

### Phase 1: Fix fetchTicket() - Real Data

```javascript
/**
 * Fetch ticket from work queue database
 * NO MOCK DATA - only real tickets
 */
async fetchTicket() {
  // Step 1: Validate repository is injected
  if (!this.workQueueRepo) {
    throw new Error('WorkQueueRepository not provided to AgentWorker constructor');
  }

  // Step 2: Fetch real ticket from database
  const ticket = await this.workQueueRepo.getTicket(this.ticketId);

  // Step 3: Validate ticket exists
  if (!ticket) {
    throw new Error(`Ticket ${this.ticketId} not found in work queue`);
  }

  // Step 4: Validate required fields
  const requiredFields = ['id', 'agent_id', 'url', 'post_id', 'content'];
  for (const field of requiredFields) {
    if (!ticket[field]) {
      throw new Error(`Ticket ${this.ticketId} missing required field: ${field}`);
    }
  }

  // Step 5: Log ticket fetch
  console.log(`✅ Fetched ticket ${ticket.id} for agent ${ticket.agent_id}`);
  console.log(`   URL: ${ticket.url}`);
  console.log(`   Post: ${ticket.post_id}`);

  return ticket;
}
```

### Phase 2: Fix processURL() - Claude SDK Integration

```javascript
/**
 * Process URL using Claude Code SDK
 * NO MOCK - real agent invocation with Claude API
 */
async processURL(ticket) {
  try {
    // Step 1: Import and initialize SDK
    const { getClaudeCodeSDKManager } = await import('/workspaces/agent-feed/prod/src/services/ClaudeCodeSDKManager.ts');
    const sdkManager = getClaudeCodeSDKManager();

    // Step 2: Load agent instructions from markdown file
    const agentInstructions = await this.loadAgentInstructions(ticket.agent_id);

    // Step 3: Prepare prompt for Claude
    const prompt = `${agentInstructions}

**TASK**: Process this URL and generate strategic intelligence summary.

**URL**: ${ticket.url}

**Context**: ${ticket.content}

**Metadata**: ${JSON.stringify(ticket.metadata || {}, null, 2)}

**Instructions**:
1. Analyze the URL and its content
2. Generate strategic intelligence insights
3. Format as markdown summary
4. Include key findings and recommendations

Return your analysis as a structured markdown document.`;

    // Step 4: Execute via Claude Code SDK
    console.log(`🤖 Invoking Claude Code SDK for ${ticket.agent_id}...`);
    console.log(`   URL: ${ticket.url}`);

    const result = await sdkManager.executeHeadlessTask(prompt);

    if (!result.success) {
      throw new Error(`Claude SDK execution failed: ${result.error}`);
    }

    // Step 5: Extract intelligence from SDK response
    const intelligence = this.extractIntelligenceFromSDK(result);

    // Step 6: Calculate real token usage
    const tokensUsed = this.calculateTokenUsage(result);

    console.log(`✅ Claude SDK execution complete`);
    console.log(`   Tokens used: ${tokensUsed}`);
    console.log(`   Intelligence generated: ${intelligence.summary.substring(0, 100)}...`);

    return {
      title: intelligence.title || `Intelligence: ${new URL(ticket.url).hostname}`,
      summary: intelligence.summary,
      tokensUsed: tokensUsed,
      completedAt: Date.now()
    };

  } catch (error) {
    console.error(`❌ processURL failed for ticket ${ticket.id}:`, error);
    throw error;
  }
}

/**
 * Load agent instructions from markdown file
 */
async loadAgentInstructions(agentId) {
  const fs = await import('fs/promises');
  const path = `/workspaces/agent-feed/prod/.claude/agents/${agentId}.md`;

  try {
    const content = await fs.readFile(path, 'utf-8');

    // Extract instructions section (after frontmatter)
    const parts = content.split('---');
    if (parts.length >= 3) {
      // Return everything after second ---
      return parts.slice(2).join('---').trim();
    }

    return content.trim();
  } catch (error) {
    console.error(`❌ Failed to load agent instructions: ${agentId}`, error);
    throw new Error(`Agent instructions not found: ${agentId}`);
  }
}

/**
 * Extract intelligence from Claude SDK result
 */
extractIntelligenceFromSDK(result) {
  // Find assistant message with final response
  const assistantMessages = result.messages.filter(m => m.type === 'assistant');

  if (assistantMessages.length === 0) {
    throw new Error('No assistant response in SDK result');
  }

  // Get last assistant message (final response)
  const lastMessage = assistantMessages[assistantMessages.length - 1];
  const summary = lastMessage.content || lastMessage.text || '';

  // Extract title from first heading or use default
  const titleMatch = summary.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : 'Strategic Intelligence';

  return {
    title,
    summary
  };
}

/**
 * Calculate real token usage from SDK result
 */
calculateTokenUsage(result) {
  // Check for token usage in result metadata
  if (result.tokensUsed) {
    return result.tokensUsed;
  }

  // Calculate from messages
  let totalTokens = 0;
  for (const message of result.messages) {
    if (message.usage) {
      totalTokens += message.usage.input_tokens || 0;
      totalTokens += message.usage.output_tokens || 0;
    }
  }

  return totalTokens;
}
```

### Phase 3: Fix postToAgentFeed() - Comment Creation

```javascript
/**
 * Post intelligence as COMMENT on original post (not new post)
 * CRITICAL FIX: Create comment, not standalone post
 */
async postToAgentFeed(intelligence, ticket) {
  try {
    // Step 1: Validate we have post_id
    if (!ticket.post_id) {
      throw new Error(`Ticket ${ticket.id} missing post_id - cannot create comment`);
    }

    // Step 2: Prepare comment data
    const commentData = {
      content: intelligence.summary,
      author: ticket.agent_id,
      parent_id: null,  // Top-level comment on post
      skipTicket: true  // CRITICAL: Prevent infinite loop
    };

    // Step 3: POST to comment endpoint (NOT post endpoint)
    const commentEndpoint = `${this.apiBaseUrl}/api/agent-posts/${ticket.post_id}/comments`;

    console.log(`💬 Creating comment for ${ticket.agent_id} on post ${ticket.post_id}...`);

    const response = await fetch(commentEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commentData)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Failed to create comment: ${response.status} ${errorText}`);
    }

    const createdComment = await response.json();

    console.log(`✅ Comment created: ${createdComment.id}`);
    console.log(`   On post: ${ticket.post_id}`);
    console.log(`   By agent: ${ticket.agent_id}`);

    return {
      id: createdComment.id,
      post_id: ticket.post_id,
      comment_id: createdComment.id
    };

  } catch (error) {
    console.error(`❌ postToAgentFeed failed for ticket ${ticket.id}:`, error);
    throw error;
  }
}
```

### Phase 4: Update Ticket Creation - Add post_id

```javascript
// In ticket-creation-service.cjs

/**
 * Process post for proactive agents
 * ENSURE post_id is stored in ticket
 */
export async function processPostForProactiveAgents(post, workQueueRepo) {
  const urls = extractURLs(post.content);

  if (urls.length === 0) {
    return [];
  }

  const agents = matchProactiveAgents(urls);
  const tickets = [];

  for (const { agent, url } of agents) {
    const priority = determinePriority(post.content, url);

    const ticket = await workQueueRepo.createTicket({
      agent_id: agent.id,
      content: post.content,
      url: url,
      priority: priority,
      post_id: post.id,  // ✅ CRITICAL: Include post_id for comment creation
      metadata: {
        author: post.authorAgent || post.author || 'user',
        timestamp: post.publishedAt || post.created_at,
        title: post.title
      }
    });

    tickets.push(ticket);
  }

  return tickets;
}
```

---

## A - ARCHITECTURE

### Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER POSTS URL                          │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  POST /api/v1/agent-posts                                       │
│  - Creates post in database                                     │
│  - Returns post with post.id                                    │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  URL Detection Hook (server.js line 1029)                       │
│  - Extracts URLs from post.content                              │
│  - Matches proactive agents (link-logger-agent)                 │
│  - Creates ticket with post_id ✅ FIXED                         │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  Work Queue Ticket Created                                      │
│  {                                                               │
│    id: "uuid",                                                   │
│    agent_id: "link-logger-agent",                               │
│    url: "https://linkedin.com/...",  // ✅ REAL URL             │
│    post_id: "post-1234",             // ✅ ADDED                │
│    content: "User's post content",   // ✅ REAL CONTENT         │
│    status: "pending"                                             │
│  }                                                               │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  AVI Orchestrator (polls every 5s)                              │
│  - Finds pending tickets                                        │
│  - Spawns AgentWorker                                           │
│  - Passes workQueueRepo to worker ✅                            │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  AgentWorker.execute()                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. fetchTicket()                                         │  │
│  │    - workQueueRepo.getTicket(ticketId) ✅ FIXED         │  │
│  │    - Returns REAL ticket from database                   │  │
│  │    - Validates required fields                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. processURL(ticket)                                    │  │
│  │    - Load agent instructions from .md file               │  │
│  │    - Call ClaudeCodeSDKManager ✅ ADDED                 │  │
│  │    - Real Claude API invocation                          │  │
│  │    - Extract real intelligence                           │  │
│  │    - Track actual token usage                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3. postToAgentFeed(intelligence, ticket)                 │  │
│  │    - POST to /api/agent-posts/{post_id}/comments         │  │
│  │      ✅ FIXED (was: /api/v1/agent-posts)                │  │
│  │    - Creates COMMENT not POST                            │  │
│  │    - Sets skipTicket=true                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  Comment Created in Database                                    │
│  {                                                               │
│    id: "comment-uuid",                                           │
│    post_id: "post-1234",      // Links to original post         │
│    author: "link-logger-agent",                                 │
│    content: "Real intelligence from Claude API" ✅              │
│  }                                                               │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  USER SEES COMMENT AS REPLY TO THEIR POST ✅                   │
│  - Intelligence is real (not mock)                              │
│  - Appears as comment (not duplicate post)                      │
│  - Token usage tracked on platform.claude.com                   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: Before vs After

**BEFORE (Broken)**:
```
User Post → Ticket Created (with real data) → Worker Spawned
  → fetchTicket() returns MOCK data ❌
  → processURL() generates MOCK intelligence ❌
  → postToAgentFeed() creates NEW POST ❌
  → Result: Duplicate posts with example data ❌
```

**AFTER (Fixed)**:
```
User Post → Ticket Created (with post_id) → Worker Spawned
  → fetchTicket() returns REAL ticket ✅
  → processURL() calls Claude SDK ✅
  → postToAgentFeed() creates COMMENT ✅
  → Result: Single comment reply with real intelligence ✅
```

---

## R - REFINEMENT (TDD Test Plan)

### Test Suite Structure

```
tests/unit/agent-worker-fixed.test.js
├── fetchTicket() tests
│   ├── ✅ Should fetch real ticket from repository
│   ├── ✅ Should throw error if repository not provided
│   ├── ✅ Should throw error if ticket not found
│   └── ✅ Should validate required fields
├── processURL() tests
│   ├── ✅ Should call Claude Code SDK
│   ├── ✅ Should load agent instructions from file
│   ├── ✅ Should extract intelligence from SDK response
│   ├── ✅ Should calculate real token usage
│   └── ✅ Should handle SDK errors gracefully
├── postToAgentFeed() tests
│   ├── ✅ Should POST to comment endpoint (not post endpoint)
│   ├── ✅ Should use ticket.post_id
│   ├── ✅ Should set skipTicket=true
│   └── ✅ Should return comment ID
└── Integration tests
    ├── ✅ E2E: Post URL → Comment created with real intelligence
    ├── ✅ E2E: Verify Claude API usage on platform
    └── ✅ E2E: Verify only one comment per URL

tests/integration/agent-worker-regression.test.js
├── ✅ Regression: Comment creation (not posts)
├── ✅ Regression: Real data (not mock)
└── ✅ Regression: Claude API usage (not zero)

tests/e2e/link-logger-real-url.spec.ts
├── ✅ Playwright: Post LinkedIn URL
├── ✅ Playwright: Wait for comment to appear
├── ✅ Playwright: Verify comment content is real
└── ✅ Playwright: Screenshot validation
```

### Critical Test Cases

**TC-001: Real Ticket Fetching**
```javascript
test('should fetch real ticket from database, not mock', async () => {
  // Create real ticket
  const ticket = await workQueueRepo.createTicket({
    agent_id: 'link-logger-agent',
    url: 'https://www.linkedin.com/pulse/real-article',
    post_id: 'post-12345',
    content: 'Real user post',
    priority: 'P2'
  });

  // Create worker with repository
  const worker = new AgentWorker({
    workerId: 'worker-test',
    ticketId: ticket.id,
    agentId: 'link-logger-agent',
    workQueueRepo: workQueueRepo
  });

  // Fetch ticket
  const fetchedTicket = await worker.fetchTicket();

  // Verify real data
  expect(fetchedTicket.url).toBe('https://www.linkedin.com/pulse/real-article');
  expect(fetchedTicket.post_id).toBe('post-12345');
  expect(fetchedTicket.content).toBe('Real user post');

  // Verify NO mock data
  expect(fetchedTicket.url).not.toContain('example');
  expect(fetchedTicket.content).not.toContain('Test content');
});
```

**TC-002: Claude SDK Integration**
```javascript
test('should call Claude Code SDK for real intelligence', async () => {
  // Mock SDK manager
  const mockSDK = {
    executeHeadlessTask: jest.fn().mockResolvedValue({
      success: true,
      messages: [{
        type: 'assistant',
        content: '# Real Intelligence\n\nThis is real analysis from Claude API'
      }],
      tokensUsed: 2500
    })
  };

  // Create worker
  const worker = new AgentWorker({
    workerId: 'worker-test',
    ticketId: 'ticket-123',
    agentId: 'link-logger-agent',
    sdkManager: mockSDK  // Inject mock for testing
  });

  // Process URL
  const result = await worker.processURL({
    agent_id: 'link-logger-agent',
    url: 'https://real-url.com',
    content: 'Real content'
  });

  // Verify SDK was called
  expect(mockSDK.executeHeadlessTask).toHaveBeenCalled();
  expect(mockSDK.executeHeadlessTask.mock.calls[0][0]).toContain('https://real-url.com');

  // Verify real intelligence returned
  expect(result.summary).toContain('Real Intelligence');
  expect(result.tokensUsed).toBe(2500);

  // Verify NO mock data
  expect(result.summary).not.toContain('Mock intelligence');
  expect(result.tokensUsed).not.toBe(1500);
});
```

**TC-003: Comment Creation (Not Posts)**
```javascript
test('should create comment on original post, not new post', async () => {
  // Mock fetch for comment endpoint
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      id: 'comment-123',
      post_id: 'post-456',
      author: 'link-logger-agent',
      content: 'Real intelligence'
    })
  });

  const worker = new AgentWorker({
    workerId: 'worker-test',
    apiBaseUrl: 'http://localhost:3001'
  });

  const result = await worker.postToAgentFeed(
    { summary: 'Real intelligence', title: 'Analysis' },
    { post_id: 'post-456', agent_id: 'link-logger-agent', id: 'ticket-789' }
  );

  // Verify comment endpoint called (not post endpoint)
  expect(fetch).toHaveBeenCalledWith(
    'http://localhost:3001/api/agent-posts/post-456/comments',
    expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('Real intelligence')
    })
  );

  // Verify skipTicket was set
  const requestBody = JSON.parse(fetch.mock.calls[0][1].body);
  expect(requestBody.skipTicket).toBe(true);

  // Verify comment ID returned (not post ID)
  expect(result.comment_id).toBe('comment-123');
});
```

---

## C - COMPLETION CHECKLIST

### Phase 1: Fix fetchTicket() - Real Data ✅
- [ ] Remove all mock data from fetchTicket()
- [ ] Implement workQueueRepo.getTicket() call
- [ ] Add ticket validation (required fields)
- [ ] Add error handling for missing tickets
- [ ] Write 4 unit tests for fetchTicket()
- [ ] All fetchTicket() tests passing

### Phase 2: Add Claude SDK Integration ✅
- [ ] Import ClaudeCodeSDKManager
- [ ] Implement loadAgentInstructions()
- [ ] Implement extractIntelligenceFromSDK()
- [ ] Implement calculateTokenUsage()
- [ ] Update processURL() to call SDK
- [ ] Remove all mock intelligence generation
- [ ] Write 5 unit tests for processURL()
- [ ] All processURL() tests passing

### Phase 3: Fix Comment Creation ✅
- [ ] Change endpoint to `/api/agent-posts/:postId/comments`
- [ ] Add skipTicket=true parameter
- [ ] Update response handling for comments
- [ ] Add validation for post_id
- [ ] Write 4 unit tests for postToAgentFeed()
- [ ] All postToAgentFeed() tests passing

### Phase 4: Update Ticket Creation ✅
- [ ] Verify ticket-creation-service includes post_id
- [ ] Update work-queue-repository schema if needed
- [ ] Test ticket creation with post_id
- [ ] Verify post_id stored in database

### Phase 5: Integration Testing ✅
- [ ] Write E2E test: Post URL → Comment created
- [ ] Test with real LinkedIn URL
- [ ] Verify comment appears as reply
- [ ] Verify only ONE comment (no duplicates)
- [ ] Check Claude API usage on platform.claude.com
- [ ] All integration tests passing

### Phase 6: Regression Testing ✅
- [ ] Test: No new posts created (only comments)
- [ ] Test: No example/mock data in comments
- [ ] Test: Token usage is real (not 1500)
- [ ] Test: Comment count increments correctly
- [ ] Test: No infinite loops (skipTicket works)
- [ ] All regression tests passing

### Phase 7: Production Validation ✅
- [ ] Clean database of mock posts (532 link-logger posts)
- [ ] Post real LinkedIn URL via UI
- [ ] Verify single comment created
- [ ] Verify comment content is real intelligence
- [ ] Verify Claude API usage shows on platform
- [ ] Screenshot for documentation
- [ ] Update completion report

---

## 🚨 CRITICAL REQUIREMENTS

### No Mock Data Policy
**ABSOLUTE RULE**: Zero mock, simulated, or example data anywhere
- ❌ No hardcoded URLs
- ❌ No "Test content" or "Mock intelligence"
- ❌ No fake token counts
- ✅ All data from database or Claude API
- ✅ All token usage from actual API calls

### Comment-Only Policy
**ABSOLUTE RULE**: Agents must create comments, never posts
- ❌ Never POST to `/api/v1/agent-posts`
- ✅ Always POST to `/api/agent-posts/:postId/comments`
- ✅ Always set skipTicket=true
- ✅ Always use ticket.post_id

### Real API Policy
**ABSOLUTE RULE**: All intelligence from Claude API
- ❌ No string templates or mock generation
- ✅ Call ClaudeCodeSDKManager.executeHeadlessTask()
- ✅ Verify usage appears on platform.claude.com
- ✅ Track real token consumption

---

## 📊 VALIDATION PLAN

### Pre-Fix Verification
1. Count current link-logger posts: 532 ✅
2. Verify zero Claude API usage today ✅
3. Document current broken behavior ✅

### Post-Fix Verification
1. **Database Check**:
   ```sql
   -- Should show zero new posts from link-logger
   SELECT COUNT(*) FROM agent_posts
   WHERE authorAgent = 'link-logger-agent'
   AND created_at > datetime('now', '-1 hour');
   -- Expected: 0

   -- Should show comments created
   SELECT COUNT(*) FROM comments
   WHERE author = 'link-logger-agent'
   AND created_at > datetime('now', '-1 hour');
   -- Expected: 1+
   ```

2. **API Usage Check**:
   - Visit platform.claude.com
   - Check API usage for today
   - Should show token consumption from link-logger processing

3. **UI Check**:
   - Post URL in agent feed
   - Wait 30 seconds
   - Verify comment appears under original post
   - Verify content is real (not example data)
   - Take screenshot

4. **Log Check**:
   ```bash
   # Should show Claude SDK calls
   grep "Claude Code SDK" logs/combined.log | tail -20

   # Should show comment creation
   grep "Comment created" logs/combined.log | tail -20

   # Should show NO post creation by link-logger
   grep "Post created.*link-logger" logs/combined.log | tail -20
   ```

---

## 🔧 IMPLEMENTATION ORDER

### Day 1: Core Fixes (2-3 hours)
1. Fix fetchTicket() - remove mock data (30 min)
2. Add Claude SDK integration (60 min)
3. Fix comment creation endpoint (30 min)
4. Unit tests for all three (60 min)

### Day 2: Testing & Validation (1-2 hours)
1. Integration tests (45 min)
2. Regression tests (30 min)
3. Production validation (30 min)
4. Documentation update (15 min)

---

## 🎯 SUCCESS METRICS

| Metric | Current (Broken) | Target (Fixed) |
|--------|-----------------|----------------|
| Mock data usage | 100% | 0% |
| Posts created by link-logger | 532+ | 0 new |
| Comments created | 0 | 1 per URL |
| Claude API calls | 0 | 1 per ticket |
| Token usage on platform | 0 | Real usage visible |
| Duplicate responses | 2+ per URL | 1 per URL |
| Intelligence quality | "Mock intelligence" | Real analysis |

---

## 📋 RISK ASSESSMENT

### High Risk
- **Claude SDK Integration**: May fail if SDK config incorrect
  - Mitigation: Test SDK health check first
  - Fallback: Detailed error logging and retry logic

### Medium Risk
- **Comment Endpoint**: May have validation we don't know about
  - Mitigation: Test comment creation manually first
  - Fallback: Check server logs for validation errors

### Low Risk
- **Ticket Schema**: May not have post_id field
  - Mitigation: Check migration 005-work-queue.sql
  - Fallback: Add migration to add post_id column

---

## 🚀 DEPLOYMENT PLAN

### Pre-Deployment
1. Kill all running background processes
2. Clean test data from database
3. Backup current database
4. Run all unit tests
5. Run all integration tests

### Deployment
1. Apply code changes
2. Restart server
3. Monitor logs for errors
4. Test with single URL manually

### Post-Deployment
1. Verify Claude API usage appears
2. Verify comment creation working
3. Run regression test suite
4. Monitor for 1 hour
5. Document results

### Rollback Plan
If any critical issue:
1. Revert agent-worker.js to stub version
2. Restart server
3. Investigate issue
4. Fix and redeploy

---

## 📁 FILES TO MODIFY

### Core Changes
1. `/api-server/worker/agent-worker.js` (Major rewrite - 139 → ~250 lines)
2. `/api-server/services/ticket-creation-service.cjs` (Add post_id - 1 line)

### Test Files (New)
3. `/api-server/tests/unit/agent-worker-fixed.test.js` (~200 lines)
4. `/api-server/tests/integration/agent-worker-regression.test.js` (~150 lines)
5. `/tests/e2e/link-logger-real-url.spec.ts` (~100 lines)

### Documentation
6. `/docs/PROACTIVE-AGENTS-PRODUCTION-VALIDATION-COMPLETE.md` (Update with real results)
7. `/docs/REGRESSION-FIX-COMPLETE.md` (New completion report)

---

## ✅ APPROVAL CHECKLIST

Before starting implementation, user must approve:

- [ ] **Approach**: Remove all mock data, integrate Claude SDK, fix comment creation
- [ ] **Timeline**: 3-4 hours estimated
- [ ] **Risk**: Medium risk due to Claude SDK integration
- [ ] **Testing**: TDD with unit, integration, and E2E tests
- [ ] **Validation**: Real LinkedIn URL, platform.claude.com check, screenshots
- [ ] **Deployment**: Backup database, monitor logs, rollback plan ready

---

**Status**: ⏸️ **AWAITING USER APPROVAL TO PROCEED**

If approved, I will:
1. Implement all fixes following SPARC plan
2. Write all tests (TDD approach)
3. Run complete validation suite
4. Verify on platform.claude.com
5. Document results with screenshots
6. Report completion with evidence

**Estimated Start-to-Finish**: 3-4 hours with full TDD and validation
