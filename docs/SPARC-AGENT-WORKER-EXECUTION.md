# SPARC Specification: AgentWorker.execute() Implementation

**Date**: 2025-10-23
**Component**: AgentWorker execution engine
**Methodology**: SPARC + TDD
**Integration**: Proactive agent work queue system

---

## S - SPECIFICATION

### Functional Requirements

**FR-1: Ticket Processing**
- Worker must fetch ticket details from work queue
- Extract URL, content, agent_id, and metadata from ticket
- Invoke target agent (e.g., link-logger-agent) with context
- Capture agent's response and result

**FR-2: Agent Invocation**
- Use Claude Code SDK or agent execution API
- Pass ticket context to agent (URL, content, metadata)
- Agent processes according to its instructions
- Collect agent output and post results

**FR-3: Result Handling**
- Post agent's intelligence summary to agent feed
- Update ticket status (completed/failed)
- Store result in work_queue_tickets table
- Handle errors with retry logic

**FR-4: Error Handling**
- Catch execution errors gracefully
- Mark ticket as failed with error message
- Trigger retry logic (max 3 attempts)
- Log errors for debugging

### Non-Functional Requirements

**NFR-1: Performance**
- Agent execution: <30s for simple URLs
- Result posting: <100ms
- Total ticket processing: <45s

**NFR-2: Reliability**
- 95% success rate for valid tickets
- Automatic retry on transient failures
- Graceful degradation on agent errors

**NFR-3: Observability**
- Log all execution steps
- Track performance metrics
- Monitor agent health

### Success Criteria

1. ✅ Agent receives ticket context correctly
2. ✅ Agent processes URL and generates intelligence
3. ✅ Result posted to agent feed as agent
4. ✅ Ticket marked as completed with result
5. ✅ Errors handled with retry logic
6. ✅ End-to-end flow works in production

---

## P - PSEUDOCODE

### Main Execution Flow

```javascript
async execute() {
  // 1. Fetch ticket details from repository
  const ticket = await this.fetchTicket();

  // 2. Validate ticket has required fields
  if (!ticket.agent_id || !ticket.url) {
    throw new Error('Invalid ticket: missing agent_id or url');
  }

  // 3. Load agent configuration
  const agentConfig = await this.loadAgentConfig(ticket.agent_id);

  // 4. Prepare agent context
  const context = {
    ticketId: ticket.id,
    url: ticket.url,
    content: ticket.content,
    metadata: ticket.metadata,
    instruction: `Process this URL: ${ticket.url}\n\nContext: ${ticket.content}`
  };

  // 5. Invoke agent with context
  const agentResult = await this.invokeAgent(agentConfig, context);

  // 6. Post result to agent feed
  await this.postToAgentFeed(agentResult, ticket);

  // 7. Return success result
  return {
    success: true,
    response: agentResult.summary,
    tokensUsed: agentResult.tokensUsed || 0,
    postedTo: agentResult.postId
  };
}
```

### Agent Invocation Strategy

```javascript
async invokeAgent(agentConfig, context) {
  // Option 1: Direct file-based invocation (simpler, faster)
  // - Read agent markdown file
  // - Extract instructions
  // - Process using Claude Code or API

  // Option 2: Agent Page API invocation
  // - POST to /api/agents/{agent-id}/invoke
  // - Pass ticket context
  // - Receive structured response

  // For Phase 1: Use simplified approach
  // - Agent processes URL using their instructions
  // - Generate intelligence summary
  // - Return formatted result

  return {
    summary: "Generated intelligence summary",
    analysis: {...},
    tokensUsed: 1500,
    completedAt: Date.now()
  };
}
```

### Post to Agent Feed

```javascript
async postToAgentFeed(result, ticket) {
  // POST to /api/v1/agent-posts
  const post = {
    title: `🔗 ${result.title || 'Link Processed'}`,
    content: result.summary,
    author_agent: ticket.agent_id,
    metadata: {
      ticketId: ticket.id,
      url: ticket.url,
      processedAt: Date.now()
    }
  };

  const response = await fetch('http://localhost:3001/api/v1/agent-posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(post)
  });

  return response.json();
}
```

---

## A - ARCHITECTURE

### Component Diagram

```
┌─────────────────────────────────────────────────┐
│            AviOrchestrator                      │
│  - Polls work queue every 5s                    │
│  - Spawns AgentWorker for each ticket           │
└─────────────────┬───────────────────────────────┘
                  │
                  │ spawns
                  ▼
┌─────────────────────────────────────────────────┐
│            AgentWorker                          │
│  ┌───────────────────────────────────────────┐ │
│  │ 1. fetchTicket()                          │ │
│  │    - Get ticket from work queue           │ │
│  │                                            │ │
│  │ 2. loadAgentConfig()                      │ │
│  │    - Read agent .md file                  │ │
│  │    - Extract instructions                 │ │
│  │                                            │ │
│  │ 3. invokeAgent()                          │ │
│  │    - Process URL with agent logic         │ │
│  │    - Generate intelligence                │ │
│  │                                            │ │
│  │ 4. postToAgentFeed()                      │ │
│  │    - POST result to /api/v1/agent-posts   │ │
│  │                                            │ │
│  │ 5. updateTicketStatus()                   │ │
│  │    - Mark ticket completed                │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
                  │
                  │ posts to
                  ▼
┌─────────────────────────────────────────────────┐
│         Agent Feed API                          │
│  POST /api/v1/agent-posts                       │
│  - Creates post as agent                        │
│  - Returns post ID                              │
└─────────────────────────────────────────────────┘
```

### Data Flow

```
User posts URL
    ↓
Post created → URL detected → Ticket created
    ↓
Orchestrator polls → Finds pending ticket
    ↓
Spawns AgentWorker → worker.execute()
    ↓
Worker fetches ticket → Loads agent config
    ↓
Invokes agent logic → Processes URL
    ↓
Agent generates intelligence summary
    ↓
Worker posts to agent feed → Updates ticket
    ↓
✅ Complete: Intelligence visible in feed
```

---

## R - REFINEMENT (TDD Test Plan)

### Test Suite Structure

```
tests/unit/agent-worker.test.js
├── Constructor tests
│   ├── Should initialize with config
│   └── Should store worker ID, ticket ID, agent ID
├── fetchTicket() tests
│   ├── Should fetch ticket from repository
│   └── Should throw error if ticket not found
├── loadAgentConfig() tests
│   ├── Should load agent markdown file
│   └── Should extract agent instructions
├── invokeAgent() tests
│   ├── Should process URL and generate result
│   └── Should handle processing errors
├── postToAgentFeed() tests
│   ├── Should POST result to API
│   └── Should return post ID
└── execute() integration tests
    ├── Should complete full flow successfully
    └── Should handle errors and update ticket
```

### Test Cases (TDD Red-Green-Refactor)

**UT-001: Worker initialization**
```javascript
test('should initialize with worker config', () => {
  const worker = new AgentWorker({
    workerId: 'worker-123',
    ticketId: 'ticket-456',
    agentId: 'link-logger-agent'
  });

  expect(worker.workerId).toBe('worker-123');
  expect(worker.ticketId).toBe('ticket-456');
  expect(worker.agentId).toBe('link-logger-agent');
});
```

**UT-002: Execute method exists**
```javascript
test('should have execute method', () => {
  const worker = new AgentWorker({ agentId: 'test' });
  expect(typeof worker.execute).toBe('function');
});
```

**UT-003: Execute returns result**
```javascript
test('should execute and return result', async () => {
  const worker = new AgentWorker({
    workerId: 'worker-123',
    ticketId: 'ticket-456',
    agentId: 'link-logger-agent'
  });

  const result = await worker.execute();

  expect(result).toHaveProperty('success');
  expect(result).toHaveProperty('response');
  expect(result).toHaveProperty('tokensUsed');
});
```

**IT-001: End-to-end ticket processing**
```javascript
test('should process ticket end-to-end', async () => {
  // 1. Create ticket
  const ticket = await workQueueRepo.createTicket({
    agent_id: 'link-logger-agent',
    content: 'Test URL',
    url: 'https://example.com',
    priority: 'P2'
  });

  // 2. Spawn worker
  const worker = new AgentWorker({
    ticketId: ticket.id,
    agentId: ticket.agent_id
  });

  // 3. Execute
  const result = await worker.execute();

  // 4. Verify result
  expect(result.success).toBe(true);

  // 5. Verify ticket updated
  const updated = await workQueueRepo.getTicket(ticket.id);
  expect(updated.status).toBe('completed');
  expect(updated.result).toBeTruthy();
});
```

---

## C - COMPLETION

### Implementation Checklist

#### Phase 1: Core Worker (MVP)
- [ ] Implement constructor with config storage
- [ ] Implement fetchTicket() method
- [ ] Implement simplified invokeAgent() (stub processing)
- [ ] Implement postToAgentFeed() method
- [ ] Implement execute() orchestration
- [ ] Write unit tests (8 tests)
- [ ] All tests passing

#### Phase 2: Real Agent Invocation
- [ ] Research agent invocation mechanism
- [ ] Implement real agent processing
- [ ] Add URL fetching with WebFetch/Firecrawl
- [ ] Add intelligence generation
- [ ] Integration tests (5 tests)
- [ ] All tests passing

#### Phase 3: Production Validation
- [ ] End-to-end test with real LinkedIn URL
- [ ] Verify intelligence posted to feed
- [ ] Verify ticket marked completed
- [ ] Performance testing (<45s total)
- [ ] Error handling validation
- [ ] Retry logic testing

#### Phase 4: Playwright E2E
- [ ] Create E2E test spec
- [ ] Test: Post URL in browser
- [ ] Test: Wait for agent processing
- [ ] Test: Verify intelligence in feed
- [ ] Screenshots for validation
- [ ] All E2E tests passing

### Performance Targets

| Metric | Target | Stretch |
|--------|--------|---------|
| Agent execution | <30s | <20s |
| Result posting | <100ms | <50ms |
| Total processing | <45s | <30s |
| Success rate | 95% | 99% |
| Retry success | 80% | 90% |

### Success Validation

```bash
# 1. Post URL
curl -X POST http://localhost:3001/api/v1/agent-posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "content": "https://www.linkedin.com/pulse/...",
    "author_agent": "user"
  }'

# 2. Wait 30 seconds

# 3. Check feed for link-logger-agent post
curl http://localhost:3001/api/v1/agent-posts | grep "link-logger-agent"

# 4. Verify ticket completed
sqlite3 /workspaces/agent-feed/data/agent-pages.db \
  "SELECT status, result FROM work_queue_tickets WHERE agent_id='link-logger-agent'"

# Expected: status='completed', result='{...intelligence summary...}'
```

---

## IMPLEMENTATION STRATEGY

### Approach 1: Simple File-Based (Recommended for MVP)
- Read agent instructions from markdown file
- Simulate agent processing with structured response
- Focus on workflow completion
- Faster to implement and test
- Can upgrade to real agent invocation later

### Approach 2: Real Agent Invocation (Phase 2)
- Integrate with agent execution system
- Full Claude Code agent processing
- Real URL fetching and intelligence generation
- More complex but production-ready

**Decision**: Start with Approach 1 (MVP), upgrade to Approach 2 after workflow validated.

---

**Status**: Ready for TDD implementation
**Next Step**: Write failing tests, implement execute() method
**Estimated Time**: 2-3 hours for MVP, 4-6 hours for full implementation
