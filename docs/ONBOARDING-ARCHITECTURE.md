# Onboarding Flow Architecture

**Document Version:** 1.0
**Last Updated:** 2025-11-13
**Status:** Design Document

---

## Executive Summary

This document describes the architecture for the multi-step onboarding flow system, focusing on how user comments trigger agent responses during the Get-to-Know-You (GTKY) onboarding process. The system coordinates between the orchestrator, worker, onboarding service, and various agents to provide a seamless personalized onboarding experience.

**Key Design Principles:**
- Comment-driven interaction model
- Phase-based progressive disclosure
- Contextual agent routing
- Real-time WebSocket updates
- Atomic ticket claiming to prevent race conditions

---

## 1. System Overview

### 1.1 Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Agent Feed System                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────────┐   │
│  │ Orchestrator │───▶│ Work Queue   │◀───│  API Endpoints  │   │
│  │   (AVI)      │    │ Repository   │    │   (Express)     │   │
│  └──────┬───────┘    └──────────────┘    └─────────────────┘   │
│         │                                                         │
│         │ spawns                                                 │
│         ▼                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────────┐   │
│  │ Agent Worker │───▶│  Onboarding  │◀───│  User Settings  │   │
│  │  (Ephemeral) │    │Flow Service  │    │    Service      │   │
│  └──────┬───────┘    └──────────────┘    └─────────────────┘   │
│         │                                                         │
│         │ invokes                                                │
│         ▼                                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Claude Code SDK / Agents                     │   │
│  │  (avi, get-to-know-you-agent, personal-todos-agent, etc) │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
         │                                  │
         │                                  │
         ▼                                  ▼
  ┌─────────────┐                    ┌──────────────┐
  │  WebSocket  │                    │   Database   │
  │   Service   │                    │   (SQLite)   │
  └─────────────┘                    └──────────────┘
```

### 1.2 Data Flow Layers

**Layer 1: Request Ingestion**
- User creates comment on Avi welcome post
- API endpoint validates and stores comment
- Work queue ticket created with metadata

**Layer 2: Ticket Processing**
- Orchestrator polls work queue (atomic claiming)
- Ticket routed based on type and parent post
- Worker spawned with appropriate context

**Layer 3: Agent Execution**
- Worker invokes appropriate agent (GTKY, Avi, etc.)
- Agent processes comment using onboarding context
- Response generated based on phase/step

**Layer 4: Response Delivery**
- Comment reply posted to database
- WebSocket event broadcast
- Ticket marked completed
- Onboarding state updated

---

## 2. Component Architecture

### 2.1 AVI Orchestrator

**File:** `/api-server/avi/orchestrator.js`

**Responsibilities:**
- Monitor work queue for pending tickets
- Spawn ephemeral agent workers
- Handle comment routing based on parent post
- Track worker lifecycle
- Coordinate agent introductions

**Key Methods:**

```javascript
class AviOrchestrator {
  // Main loop - polls every 5 seconds
  async processWorkQueue() {
    // 1. Atomic ticket claiming (prevents race conditions)
    const tickets = await this.workQueueRepo.claimPendingTickets({
      limit: availableSlots,
      workerId: `orchestrator-${Date.now()}`
    });

    // 2. Spawn workers for each ticket
    for (const ticket of tickets) {
      if (ticket.metadata?.type === 'comment') {
        await this.processCommentTicket(ticket, workerId);
      } else {
        await this.spawnWorker(ticket);
      }
    }
  }

  // Comment ticket processing
  async processCommentTicket(ticket, workerId) {
    // 1. Load parent post context
    const parentPost = await dbSelector.getPostById(parentPostId);

    // 2. Route to appropriate agent
    const agent = this.routeCommentToAgent(content, metadata);

    // 3. Spawn worker in comment mode
    const worker = new AgentWorker({
      mode: 'comment',
      context: { comment, parentPost, ticket },
      agentId: agent
    });

    // 4. Process comment asynchronously
    worker.processComment()
      .then(result => postCommentReply(...))
      .catch(error => handleError(...));
  }

  // Agent routing logic
  routeCommentToAgent(content, metadata) {
    // Check for explicit mentions
    if (content.includes('@get-to-know-you')) {
      return 'get-to-know-you-agent';
    }

    // Check for onboarding context
    if (metadata.isOnboardingPost) {
      return 'get-to-know-you-agent';
    }

    // Default to Avi
    return 'avi';
  }
}
```

**Critical Features:**
- **Atomic Claiming:** Uses SQLite transactions to prevent duplicate processing
- **Duplicate Prevention:** In-memory tracking with `processingTickets` Set
- **Comment Routing:** Routes based on parent post's metadata and content
- **Agent Introduction:** Checks engagement scores every 30 seconds

---

### 2.2 Agent Worker

**File:** `/api-server/worker/agent-worker.js`

**Responsibilities:**
- Execute agent tasks (post or comment mode)
- Build prompts with conversation context
- Invoke Claude Code SDK
- Post responses back to feed
- Emit WebSocket status updates

**Execution Modes:**

```javascript
class AgentWorker {
  constructor(config) {
    this.mode = config.mode || 'post'; // 'post' or 'comment'
    this.commentContext = config.context || null;
  }

  // Main execution for posts
  async execute() {
    const ticket = await this.fetchTicket();
    this.emitStatusUpdate('processing');

    const intelligence = await this.processURL(ticket);
    const commentResult = await this.postToAgentFeed(intelligence, ticket);

    this.emitStatusUpdate('completed');
    return result;
  }

  // Comment processing
  async processComment() {
    const { comment, parentPost } = this.commentContext;

    // 1. Get conversation chain if threaded reply
    let conversationChain = [];
    if (comment.parentCommentId) {
      conversationChain = await this.getConversationChain(comment.id);
    }

    // 2. Build prompt with context
    const prompt = this.buildCommentPrompt(comment, parentPost, conversationChain);

    // 3. Invoke agent
    const response = await this.invokeAgent(prompt);

    return { success: true, reply: response, agent: this.agentId };
  }

  // Prompt building with conversation awareness
  buildCommentPrompt(comment, parentPost, conversationChain) {
    let prompt = `You are ${this.agentId} responding to a user comment.\n\n`;

    // Add original post context
    if (parentPost) {
      prompt += `ORIGINAL POST\n${parentPost.title}\n${parentPost.contentBody}\n\n`;
    }

    // Add conversation thread
    if (conversationChain.length > 0) {
      prompt += `CONVERSATION THREAD (${conversationChain.length} messages):\n`;
      conversationChain.forEach((msg, i) => {
        prompt += `${i + 1}. ${msg.author}: ${msg.content}\n\n`;
      });
    }

    // Add current message
    prompt += `CURRENT MESSAGE\n${comment.content}\n\n`;

    // Add instruction
    prompt += `Please provide a helpful, concise response.`;
    if (conversationChain.length > 0) {
      prompt += `\nIMPORTANT: You have the FULL conversation history above.`;
    }

    return prompt;
  }
}
```

**Key Features:**
- **Conversation Chain:** Walks parent_id chain to build full context
- **Thread Awareness:** Distinguishes between root comments and replies
- **Context Building:** Includes parent post, conversation history, current message
- **WebSocket Events:** Emits processing, completed, failed events
- **Protection System:** Auto-stops infinite loops and runaway responses

---

### 2.3 Onboarding Flow Service

**File:** `/api-server/services/onboarding/onboarding-flow-service.js`

**Responsibilities:**
- Manage onboarding phase transitions
- Store user responses
- Track completion state
- Trigger core agent introductions
- Persist display name to user settings

**Phase Flow:**

```javascript
class OnboardingFlowService {
  // Phase 1, Step 1: Name Collection
  processNameResponse(userId, name) {
    // 1. Store name in responses
    responses.name = name;

    // 2. CRITICAL: Persist to user_settings
    this.userSettingsService.setDisplayName(userId, name);

    // 3. Transition to use_case step
    this.updateStateStmt.run(
      1, // phase (still Phase 1)
      'use_case', // step
      JSON.stringify(responses),
      userId
    );

    return {
      success: true,
      nextStep: 'use_case',
      message: `Great to meet you, ${name}! What brings you to Agent Feed?`
    };
  }

  // Phase 1, Step 2: Use Case Collection
  processUseCaseResponse(userId, useCase) {
    responses.use_case = useCase;

    // 1. Complete Phase 1
    this.updateStateStmt.run(
      1, // phase
      'phase1_complete', // step
      1, // phase1_completed
      timestamp,
      JSON.stringify(responses),
      userId
    );

    // 2. Generate personalized explanation
    const explanation = this.generateUseCaseExplanation(useCase, name);

    return {
      success: true,
      phase1Complete: true,
      message: explanation,
      triggerCoreAgentIntros: true // Signal to introduce core agents
    };
  }

  // Phase 2 Trigger Check
  shouldTriggerPhase2(userId) {
    const state = this.getOnboardingState(userId);

    // Check time elapsed (24 hours)
    const hoursSincePhase1 = (currentTime - state.phase1_completed_at) / 3600;
    if (hoursSincePhase1 >= 24) return true;

    // Check post count (2-3 posts)
    // Implementation would query posts table

    return false;
  }
}
```

**Database State Transitions:**

```
┌──────────────┐
│ Not Started  │
│ (no record)  │
└──────┬───────┘
       │ User arrives
       ▼
┌──────────────────┐
│  Phase 1: name   │
│  step='name'     │
└──────┬───────────┘
       │ Name submitted
       ▼
┌──────────────────────┐
│ Phase 1: use_case    │
│ step='use_case'      │
└──────┬───────────────┘
       │ Use case submitted
       ▼
┌──────────────────────────┐
│ Phase 1 Complete         │
│ phase1_completed=1       │
│ step='phase1_complete'   │
└──────┬───────────────────┘
       │ 24 hours OR 2-3 posts
       ▼
┌──────────────────────────┐
│ Phase 2: comm_style      │
│ phase=2                  │
│ step='comm_style'        │
└──────────────────────────┘
```

---

### 2.4 Work Queue Repository

**File:** `/api-server/repositories/work-queue-repository.js`

**Responsibilities:**
- Create work queue tickets
- Atomic ticket claiming (race condition prevention)
- Status updates (pending → in_progress → completed/failed)
- Retry logic (max 3 attempts)

**Atomic Claiming Pattern:**

```javascript
class WorkQueueRepository {
  claimPendingTickets({ limit, workerId }) {
    // Use SQLite transaction for atomicity
    const transaction = this.db.transaction(() => {
      // 1. SELECT: Find pending tickets
      const ticketIds = this.db.prepare(`
        SELECT id FROM work_queue_tickets
        WHERE status = 'pending'
        ORDER BY priority ASC, created_at ASC
        LIMIT ?
      `).all(limit);

      // 2. UPDATE: Atomically mark as 'in_progress'
      const updateStmt = this.db.prepare(`
        UPDATE work_queue_tickets
        SET status = 'in_progress', assigned_at = ?
        WHERE id = ?
      `);
      ticketIds.forEach(({ id }) => updateStmt.run(now, id));

      // 3. SELECT: Fetch full ticket data
      return ticketIds.map(({ id }) => this.getTicket(id));
    });

    return transaction(); // Execute all-or-nothing
  }
}
```

**Key Features:**
- **Transaction Safety:** All-or-nothing execution prevents partial claims
- **Priority Ordering:** P0 > P1 > P2 > P3, then FIFO within priority
- **Retry Logic:** Auto-retry failed tickets up to 3 times
- **Error Patterns:** Query tickets by error message for debugging

---

### 2.5 WebSocket Service

**File:** `/api-server/services/websocket-service.js`

**Responsibilities:**
- Real-time event broadcasting
- Client subscription management
- Status update delivery
- Comment creation notifications

**Event Flow:**

```javascript
class WebSocketService {
  // Ticket status updates
  emitTicketStatusUpdate(payload) {
    const event = {
      post_id: payload.post_id,
      ticket_id: payload.ticket_id,
      status: payload.status, // 'pending', 'processing', 'completed', 'failed'
      agent_id: payload.agent_id,
      timestamp: payload.timestamp
    };

    // Broadcast to all clients
    this.io.emit('ticket:status:update', event);

    // Broadcast to post-specific subscribers
    this.io.to(`post:${event.post_id}`).emit('ticket:status:update', event);
  }

  // Comment creation events
  broadcastCommentAdded(payload) {
    const { postId, comment } = payload;

    // Send full comment object with all fields
    this.io.to(`post:${postId}`).emit('comment:created', {
      postId,
      comment: comment // Full DB record
    });
  }
}
```

**Event Types:**
1. `ticket:status:update` - Worker status changes
2. `comment:created` - New comment added (agent or user)
3. `comment:updated` - Comment edited
4. `worker:lifecycle` - Worker spawn/terminate events

---

## 3. Sequence Diagrams

### 3.1 Onboarding Comment Flow (Phase 1: Name)

```
┌────────┐      ┌──────────┐      ┌─────────────┐      ┌────────────┐      ┌──────────────┐      ┌──────────┐
│  User  │      │ Frontend │      │ API Server  │      │Orchestrator│      │ Agent Worker │      │  GTKY    │
│        │      │          │      │             │      │    (AVI)   │      │              │      │  Agent   │
└───┬────┘      └────┬─────┘      └──────┬──────┘      └─────┬──────┘      └──────┬───────┘      └────┬─────┘
    │                │                    │                    │                     │                   │
    │ Submit comment │                    │                    │                     │                   │
    │ "My name is    │                    │                    │                     │                   │
    │  Sarah"        │                    │                    │                     │                   │
    ├───────────────▶│                    │                    │                     │                   │
    │                │                    │                    │                     │                   │
    │                │ POST /comments     │                    │                     │                   │
    │                ├───────────────────▶│                    │                     │                   │
    │                │                    │                    │                     │                   │
    │                │                    │ 1. Store comment  │                     │                   │
    │                │                    │    in database     │                     │                   │
    │                │                    ├─────┐              │                     │                   │
    │                │                    │     │              │                     │                   │
    │                │                    │◀────┘              │                     │                   │
    │                │                    │                    │                     │                   │
    │                │                    │ 2. Create ticket   │                     │                   │
    │                │                    │    (type:comment)  │                     │                   │
    │                │                    ├─────┐              │                     │                   │
    │                │                    │     │              │                     │                   │
    │                │                    │◀────┘              │                     │                   │
    │                │                    │                    │                     │                   │
    │                │ 200 OK             │                    │                     │                   │
    │                │◀───────────────────┤                    │                     │                   │
    │                │                    │                    │                     │                   │
    │                │                    │                    │ 3. Poll queue       │                   │
    │                │                    │                    │    (every 5s)       │                   │
    │                │                    │                    ├──────┐              │                   │
    │                │                    │                    │      │              │                   │
    │                │                    │                    │◀─────┘              │                   │
    │                │                    │                    │                     │                   │
    │                │                    │ claimPendingTickets│                     │                   │
    │                │                    │◀───────────────────┤                     │                   │
    │                │                    │                    │                     │                   │
    │                │                    │ ticket (claimed)   │                     │                   │
    │                │                    ├───────────────────▶│                     │                   │
    │                │                    │                    │                     │                   │
    │                │                    │                    │ 4. Spawn worker     │                   │
    │                │                    │                    │     (comment mode)  │                   │
    │                │                    │                    ├────────────────────▶│                   │
    │                │                    │                    │                     │                   │
    │                │                    │                    │                     │ 5. Build prompt   │
    │                │                    │                    │                     │    with context   │
    │                │                    │                    │                     ├──────┐            │
    │                │                    │                    │                     │      │            │
    │                │                    │                    │                     │◀─────┘            │
    │                │                    │                    │                     │                   │
    │                │                    │                    │                     │ invokeAgent()     │
    │                │                    │                    │                     ├──────────────────▶│
    │                │                    │                    │                     │                   │
    │                │                    │                    │                     │                   │ Check onboarding
    │                │                    │                    │                     │                   │ state (phase=1,
    │                │                    │                    │                     │                   │ step='name')
    │                │                    │                    │                     │                   ├──────┐
    │                │                    │                    │                     │                   │      │
    │                │                    │                    │                     │                   │◀─────┘
    │                │                    │                    │                     │                   │
    │                │                    │                    │                     │                   │ Process name
    │                │                    │                    │                     │                   │ "Sarah"
    │                │                    │                    │                     │                   ├──────┐
    │                │                    │                    │                     │                   │      │
    │                │                    │                    │                     │                   │◀─────┘
    │                │                    │                    │                     │                   │
    │                │                    │                    │                     │                   │ Update state:
    │                │                    │                    │                     │                   │ step='use_case'
    │                │                    │                    │                     │                   ├──────┐
    │                │                    │                    │                     │                   │      │
    │                │                    │                    │                     │                   │◀─────┘
    │                │                    │                    │                     │                   │
    │                │                    │                    │                     │ Agent response    │
    │                │                    │                    │                     │◀──────────────────┤
    │                │                    │                    │                     │                   │
    │                │                    │ postCommentReply() │                     │                   │
    │                │                    │◀───────────────────┴─────────────────────┤                   │
    │                │                    │                                          │                   │
    │                │                    │ 6. Store reply in DB                     │                   │
    │                │                    ├─────┐                                    │                   │
    │                │                    │     │                                    │                   │
    │                │                    │◀────┘                                    │                   │
    │                │                    │                                          │                   │
    │                │                    │ 7. Broadcast via WebSocket              │                   │
    │                │                    ├─────┐                                    │                   │
    │                │                    │     │                                    │                   │
    │                │                    │◀────┘                                    │                   │
    │                │                    │                                          │                   │
    │                │ WS: comment:created│                                          │                   │
    │                │◀───────────────────┤                                          │                   │
    │                │                    │                                          │                   │
    │ Display agent  │                    │                                          │                   │
    │ reply:         │                    │                                          │                   │
    │ "Great to meet │                    │                                          │                   │
    │  you, Sarah!"  │                    │                                          │                   │
    │◀───────────────┤                    │                                          │                   │
    │                │                    │                                          │                   │
```

**Key Steps:**
1. User submits comment on Avi welcome post
2. API creates ticket with `type: 'comment'` metadata
3. Orchestrator polls and atomically claims ticket
4. Worker spawned in comment mode with GTKY agent
5. Agent checks onboarding state, processes name
6. Response posted as comment reply
7. WebSocket broadcasts update to frontend

---

### 3.2 Phase Transition Flow (Phase 1 → Core Agent Intros)

```
┌────────────────┐      ┌─────────────────┐      ┌──────────────────────┐      ┌────────────────┐
│ GTKY Agent     │      │ Onboarding      │      │ Sequential Intro     │      │  Orchestrator  │
│                │      │ Flow Service    │      │   Orchestrator       │      │      (AVI)     │
└───────┬────────┘      └────────┬────────┘      └──────────┬───────────┘      └───────┬────────┘
        │                        │                           │                          │
        │ processUseCaseResponse │                           │                          │
        ├───────────────────────▶│                           │                          │
        │                        │                           │                          │
        │                        │ 1. Store use_case         │                          │
        │                        │    response               │                          │
        │                        ├─────┐                     │                          │
        │                        │     │                     │                          │
        │                        │◀────┘                     │                          │
        │                        │                           │                          │
        │                        │ 2. Mark phase1_completed  │                          │
        │                        ├─────┐                     │                          │
        │                        │     │                     │                          │
        │                        │◀────┘                     │                          │
        │                        │                           │                          │
        │ { phase1Complete: true,│                           │                          │
        │   triggerCoreAgentIntros }                         │                          │
        │◀───────────────────────┤                           │                          │
        │                        │                           │                          │
        │                        │                           │ 3. Introduction check    │
        │                        │                           │    (30s polling loop)    │
        │                        │                           ├──────────────────────────▶│
        │                        │                           │                          │
        │                        │                           │ getNextAgentToIntroduce()│
        │                        │                           │◀─────┐                   │
        │                        │                           │      │                   │
        │                        │                           │      │ Calculate         │
        │                        │                           │      │ engagement        │
        │                        │                           │      │ score             │
        │                        │                           │      │                   │
        │                        │                           │◀─────┘                   │
        │                        │                           │                          │
        │                        │                           │ 4. Core agents eligible: │
        │                        │                           │    - personal-todos-agent│
        │                        │                           │    - agent-ideas-agent   │
        │                        │                           │    - link-logger-agent   │
        │                        │                           │                          │
        │                        │                           │ createIntroductionTicket()
        │                        │                           ├─────────────────────────▶│
        │                        │                           │                          │
        │                        │                           │                          │ 5. Create tickets
        │                        │                           │                          │    for each core
        │                        │                           │                          │    agent
        │                        │                           │                          ├─────┐
        │                        │                           │                          │     │
        │                        │                           │                          │◀────┘
        │                        │                           │                          │
        │                        │                           │                          │ 6. Process tickets
        │                        │                           │                          │    (spawn workers)
        │                        │                           │                          ├─────┐
        │                        │                           │                          │     │
        │                        │                           │                          │◀────┘
        │                        │                           │                          │
        │                        │                           │                          │ 7. Agents post
        │                        │                           │                          │    introduction
        │                        │                           │                          │    messages
        │                        │                           │                          ├─────┐
        │                        │                           │                          │     │
        │                        │                           │                          │◀────┘
        │                        │                           │                          │
```

**Key Points:**
- Phase 1 completion triggers core agent introduction queue
- Orchestrator polls every 30 seconds for new introductions
- Engagement score determines which agents are eligible
- Core agents (personal-todos, agent-ideas, link-logger) introduced first
- Each introduction creates a work queue ticket

---

### 3.3 Comment Routing Decision Tree

```
                    ┌──────────────────────┐
                    │ Comment Received on  │
                    │   Parent Post        │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Is parent post from  │
                    │ Avi welcome series?  │
                    └──────────┬───────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
               YES                           NO
                │                             │
                ▼                             ▼
    ┌───────────────────────┐     ┌──────────────────────┐
    │ Check onboarding      │     │ Check for explicit   │
    │ metadata in post      │     │ agent mentions       │
    └───────────┬───────────┘     └──────────┬───────────┘
                │                             │
                │                             │
                ▼                             ▼
    ┌───────────────────────┐     ┌──────────────────────┐
    │ isOnboardingPost:true?│     │ Contains @agent-name?│
    └───────────┬───────────┘     └──────────┬───────────┘
                │                             │
               YES                           YES
                │                             │
                ▼                             ▼
    ┌───────────────────────┐     ┌──────────────────────┐
    │ Route to:             │     │ Route to mentioned   │
    │ get-to-know-you-agent │     │ agent                │
    └───────────────────────┘     └──────────────────────┘
                                              │
                                             NO
                                              │
                                              ▼
                                  ┌──────────────────────┐
                                  │ Keyword-based routing│
                                  │ - "page", "ui"       │
                                  │   → page-builder     │
                                  │ - "skill", "template"│
                                  │   → skills-architect │
                                  │ - "agent", "create"  │
                                  │   → agent-architect  │
                                  └──────────┬───────────┘
                                             │
                                            NO MATCH
                                             │
                                             ▼
                                  ┌──────────────────────┐
                                  │ Default: Route to Avi│
                                  └──────────────────────┘
```

**Routing Priority:**
1. **Onboarding Posts:** Always route to `get-to-know-you-agent`
2. **Explicit Mentions:** Route to mentioned agent (@agent-name)
3. **Keyword Matching:** Route based on content keywords
4. **Default:** Route to `avi` for general queries

---

## 4. Data Models

### 4.1 Onboarding State Table

```sql
CREATE TABLE onboarding_state (
  user_id TEXT PRIMARY KEY,
  phase INTEGER DEFAULT 1,                  -- Current phase (1 or 2)
  step TEXT DEFAULT 'name',                 -- Current step within phase
  phase1_completed INTEGER DEFAULT 0,       -- Boolean: 0 or 1
  phase1_completed_at INTEGER,              -- Unix timestamp
  phase2_completed INTEGER DEFAULT 0,       -- Boolean: 0 or 1
  phase2_completed_at INTEGER,              -- Unix timestamp
  responses TEXT DEFAULT '{}',              -- JSON: { name, use_case, comm_style, ... }
  created_at INTEGER DEFAULT (unixepoch()), -- Unix timestamp
  updated_at INTEGER DEFAULT (unixepoch())  -- Unix timestamp
);
```

**State Transitions:**

| Phase | Step             | Collected Data    | Next Transition              |
|-------|------------------|-------------------|------------------------------|
| 1     | name             | name              | → step='use_case'            |
| 1     | use_case         | use_case          | → phase1_completed=1         |
| 1     | phase1_complete  | -                 | Wait for engagement trigger  |
| 2     | comm_style       | comm_style        | → step='work_style'          |
| 2     | work_style       | work_style        | → step='goals'               |
| 2     | goals            | goals             | → phase2_completed=1         |

---

### 4.2 Work Queue Ticket Schema

```sql
CREATE TABLE work_queue_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  agent_id TEXT NOT NULL,                   -- Agent to execute ticket
  post_id TEXT,                             -- Associated post (if any)
  url TEXT,                                 -- URL to process (if any)
  content TEXT NOT NULL,                    -- Instruction/content
  priority TEXT DEFAULT 'P2',               -- P0, P1, P2, P3
  status TEXT DEFAULT 'pending',            -- pending, in_progress, completed, failed
  retry_count INTEGER DEFAULT 0,            -- Retry attempts
  last_error TEXT,                          -- Last error message
  metadata TEXT,                            -- JSON metadata
  result TEXT,                              -- JSON result
  created_at INTEGER DEFAULT (unixepoch()),
  assigned_at INTEGER,                      -- When claimed by worker
  completed_at INTEGER                      -- When finished
);
```

**Metadata for Comment Tickets:**

```json
{
  "type": "comment",
  "parent_post_id": "post-abc123",
  "parent_comment_id": "comment-def456",
  "isOnboardingPost": true,
  "onboardingPhase": 1,
  "onboardingStep": "name"
}
```

---

### 4.3 Introduction Queue Table

```sql
CREATE TABLE introduction_queue (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  priority INTEGER DEFAULT 100,             -- Lower = higher priority
  unlock_threshold INTEGER DEFAULT 0,       -- Engagement score required
  intro_method TEXT DEFAULT 'post',         -- 'post', 'comment', 'showcase'
  introduced INTEGER DEFAULT 0,             -- 0=pending, 1=introduced, -1=skipped
  introduced_at INTEGER,                    -- Unix timestamp
  intro_post_id TEXT,                       -- Post ID of introduction
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(user_id, agent_id)
);
```

**Core Agents (Priority 1-3):**

| Agent ID               | Priority | Threshold | Intro Method |
|------------------------|----------|-----------|--------------|
| personal-todos-agent   | 1        | 15        | post         |
| agent-ideas-agent      | 2        | 15        | post         |
| link-logger-agent      | 3        | 15        | post         |

**Specialized Agents (Priority 10-20):**

| Agent ID               | Priority | Threshold | Intro Method |
|------------------------|----------|-----------|--------------|
| meeting-prep-agent     | 10       | 25        | contextual   |
| learning-optimizer     | 11       | 25        | contextual   |
| follow-ups-agent       | 12       | 30        | contextual   |

---

## 5. Integration Points

### 5.1 API Endpoints

**POST /api/agent-posts/:postId/comments**
- **Purpose:** Create new comment (user or agent)
- **Triggers:** Work queue ticket creation (if not skipTicket)
- **WebSocket:** Broadcasts `comment:created` event
- **Integration:** Onboarding service checks for phase transitions

**POST /api/onboarding/name**
- **Purpose:** Submit name during Phase 1
- **Flow:** → OnboardingFlowService.processNameResponse()
- **Side Effects:** Updates user_settings display_name

**POST /api/onboarding/use-case**
- **Purpose:** Submit use case during Phase 1
- **Flow:** → OnboardingFlowService.processUseCaseResponse()
- **Triggers:** Core agent introduction queue

---

### 5.2 WebSocket Events

**Client → Server:**
```javascript
// Subscribe to post updates
socket.emit('subscribe:post', postId);

// Subscribe to agent updates
socket.emit('subscribe:agent', agentId);
```

**Server → Client:**
```javascript
// Ticket status update
socket.on('ticket:status:update', (event) => {
  // event: { post_id, ticket_id, status, agent_id, timestamp }
});

// Comment created
socket.on('comment:created', (event) => {
  // event: { postId, comment: { id, content, author_agent, ... } }
});

// Worker lifecycle
socket.on('worker:lifecycle', (event) => {
  // event: { worker_id, ticket_id, event_type, timestamp }
});
```

---

### 5.3 Service Dependencies

```
OnboardingFlowService
    ├── Depends on: UserSettingsService
    │   └── Purpose: Persist display name system-wide
    └── Depended by: AgentWorker
        └── Purpose: Check onboarding state during responses

SequentialIntroductionOrchestrator
    ├── Depends on: AgentVisibilityService
    │   └── Purpose: Block system agents from introduction
    └── Depended by: AVI Orchestrator
        └── Purpose: Determine next agent to introduce

WorkQueueRepository
    ├── Depends on: Database (SQLite)
    └── Depended by: Orchestrator, AgentWorker
        └── Purpose: Atomic ticket claiming and status updates

WebSocketService
    ├── Depends on: Socket.IO
    └── Depended by: Orchestrator, AgentWorker, API endpoints
        └── Purpose: Real-time event broadcasting
```

---

## 6. Critical Design Decisions

### 6.1 Atomic Ticket Claiming

**Problem:** Multiple orchestrator polls could claim the same ticket (race condition)

**Solution:** SQLite transactions for atomic SELECT + UPDATE
```javascript
const transaction = this.db.transaction(() => {
  const tickets = SELECT ... WHERE status = 'pending';
  UPDATE ... SET status = 'in_progress' WHERE id IN (...);
  return tickets;
});
```

**Benefits:**
- Prevents duplicate processing
- All-or-nothing execution
- No external locking mechanism needed

---

### 6.2 Comment Routing Strategy

**Problem:** How to determine which agent should respond to a comment?

**Solution:** Multi-tier routing logic:
1. Check parent post metadata (isOnboardingPost)
2. Check for explicit agent mentions (@agent-name)
3. Keyword-based routing (configurable patterns)
4. Default to Avi for general queries

**Benefits:**
- Flexible and extensible
- Supports contextual routing
- Handles edge cases (mentions, keywords)

---

### 6.3 Conversation Chain Building

**Problem:** Threaded replies need full conversation context

**Solution:** Recursive parent_id chain traversal
```javascript
async getConversationChain(commentId, maxDepth = 20) {
  const chain = [];
  let currentId = commentId;

  while (currentId && depth < maxDepth) {
    const comment = await dbSelector.getCommentById(currentId);
    chain.push(comment);
    currentId = comment.parent_id;
  }

  return chain.reverse(); // Chronological order
}
```

**Benefits:**
- Full conversation awareness
- Handles arbitrary nesting depth
- Prevents infinite loops (maxDepth)

---

### 6.4 Phase Transition Triggers

**Problem:** When to prompt user for Phase 2?

**Solution:** Time-based OR engagement-based triggers
- **Time:** 24 hours after Phase 1 completion
- **Engagement:** 2-3 posts created

**Benefits:**
- User controls pacing
- Avoids overwhelming new users
- Progressive disclosure pattern

---

### 6.5 Display Name Persistence

**Problem:** Display name not appearing system-wide after onboarding

**Solution:** Dual persistence strategy:
```javascript
processNameResponse(userId, name) {
  // 1. Store in onboarding_state.responses
  responses.name = name;

  // 2. CRITICAL: Persist to user_settings
  this.userSettingsService.setDisplayName(userId, name);
}
```

**Benefits:**
- Name appears immediately in UI
- Survives across sessions
- Single source of truth (user_settings)

---

## 7. Error Handling & Edge Cases

### 7.1 Duplicate Comment Tickets

**Scenario:** API creates duplicate tickets for same comment

**Prevention:**
1. Atomic claiming in WorkQueueRepository
2. In-memory tracking with `processingTickets` Set
3. Duplicate check before spawning worker

```javascript
if (this.processingTickets.has(ticket.id)) {
  console.warn(`Ticket ${ticket.id} already being processed, skipping...`);
  continue;
}
this.processingTickets.add(ticket.id);
```

---

### 7.2 Infinite Loop Protection

**Scenario:** Agent response creates new comment, triggering infinite loop

**Prevention:** `skipTicket` flag in comment creation
```javascript
await fetch('/api/agent-posts/:postId/comments', {
  body: JSON.stringify({
    content: agentResponse,
    author_agent: agentId,
    skipTicket: true  // CRITICAL: Prevent infinite loop
  })
});
```

---

### 7.3 Worker Kill Scenarios

**Scenarios:**
- Streaming response exceeds 1000 chunks
- Response size exceeds 500KB
- Execution timeout (30s)

**Handling:**
```javascript
const protectionResult = await executeProtectedQuery(prompt, {
  workerId: this.workerId,
  streamingResponse: false
});

if (protectionResult.terminated) {
  const userMessage = buildUserFacingMessage(protectionResult.reason);
  return {
    summary: protectionResult.partialResponse || userMessage,
    terminated: true
  };
}
```

---

### 7.4 Onboarding State Not Found

**Scenario:** User comments on onboarding post but has no state

**Handling:**
```javascript
const state = this.getOnboardingState(userId);
if (!state) {
  // Initialize onboarding with default state
  return this.initializeOnboarding(userId);
}
```

---

## 8. Performance Considerations

### 8.1 Polling Intervals

| Component                     | Interval | Reason                          |
|-------------------------------|----------|---------------------------------|
| Work Queue Poll               | 5s       | Balance responsiveness/CPU      |
| Health Check                  | 30s      | Track context size, workers     |
| Introduction Check            | 30s      | Detect engagement milestones    |

---

### 8.2 Database Query Optimization

**Prepared Statements:** All high-frequency queries use prepared statements
```javascript
this.getStateStmt = this.db.prepare(`SELECT ... FROM onboarding_state WHERE user_id = ?`);
```

**Indexes:** Key indexes for performance
```sql
CREATE INDEX idx_work_queue_status ON work_queue_tickets(status, priority, created_at);
CREATE INDEX idx_intro_queue_user ON introduction_queue(user_id, introduced, unlock_threshold);
```

---

### 8.3 WebSocket Connection Scaling

**Room-based Broadcasting:** Only send updates to subscribed clients
```javascript
// Only subscribers to post:123 receive this event
this.io.to(`post:123`).emit('comment:created', event);
```

**Connection Limits:** Configure based on server capacity
```javascript
pingTimeout: 60000,  // 60 seconds
pingInterval: 25000  // 25 seconds
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

**Onboarding Flow Service:**
- `processNameResponse()` updates state correctly
- `processUseCaseResponse()` marks phase1_completed
- `shouldTriggerPhase2()` calculates time/engagement thresholds

**Agent Worker:**
- `getConversationChain()` builds correct chain
- `buildCommentPrompt()` includes full context
- `routeCommentToAgent()` routes correctly

**Work Queue Repository:**
- `claimPendingTickets()` is atomic (no duplicates)
- `failTicket()` implements retry logic correctly

---

### 9.2 Integration Tests

**Comment Flow E2E:**
1. User submits comment on onboarding post
2. Ticket created with correct metadata
3. Orchestrator claims ticket atomically
4. Worker spawned with correct agent
5. Response posted as comment reply
6. WebSocket event broadcast
7. Onboarding state updated

**Phase Transition Flow:**
1. User completes Phase 1 (name + use_case)
2. Core agents queued for introduction
3. Orchestrator detects eligible agents
4. Introduction tickets created
5. Agents post introduction messages

---

### 9.3 Load Tests

**Concurrent Comment Handling:**
- 10 users submit comments simultaneously
- Verify no duplicate ticket processing
- Verify all responses delivered

**Agent Introduction Scaling:**
- 100 users complete Phase 1
- Verify introduction queue processed correctly
- Verify no agent introduction duplicates

---

## 10. Deployment Considerations

### 10.1 Database Migrations

**Adding New Onboarding Steps:**
```sql
ALTER TABLE onboarding_state ADD COLUMN phase2_step2 TEXT;
```

**Adding New Agent Metadata:**
```sql
INSERT INTO agent_metadata (agent_id, visibility, category)
VALUES ('new-agent', 'public', 'productivity');
```

---

### 10.2 Configuration Management

**Environment Variables:**
```bash
CORS_ORIGIN=http://localhost:3000
POLL_INTERVAL=5000              # Orchestrator poll interval
HEALTH_CHECK_INTERVAL=30000     # Health check interval
INTRO_CHECK_INTERVAL=30000      # Introduction check interval
MAX_WORKERS=5                   # Max concurrent workers
```

---

### 10.3 Monitoring & Observability

**Key Metrics:**
- Active workers count
- Ticket processing latency (claim → complete)
- Onboarding completion rates (Phase 1, Phase 2)
- Agent introduction success rates
- WebSocket connection count

**Logging:**
- Ticket lifecycle events (created, claimed, completed, failed)
- Worker spawn/terminate events
- Onboarding state transitions
- Agent routing decisions

---

## 11. Future Enhancements

### 11.1 Smart Agent Routing

**Machine Learning Agent Selector:**
- Train model on historical comment→agent→satisfaction data
- Use embeddings for semantic similarity matching
- Confidence scoring for routing decisions

---

### 11.2 Adaptive Onboarding

**Dynamic Question Flow:**
- Skip questions if already answered implicitly
- Adjust Phase 2 timing based on engagement velocity
- Personalized question ordering based on use case

---

### 11.3 Multi-Agent Responses

**Collaborative Responses:**
- Multiple agents respond to complex queries
- Orchestrator coordinates agent sequence
- Synthesize responses into unified answer

---

## 12. References

### 12.1 Key Files

| File | Purpose |
|------|---------|
| `/api-server/avi/orchestrator.js` | Main orchestration loop |
| `/api-server/worker/agent-worker.js` | Agent task execution |
| `/api-server/services/onboarding/onboarding-flow-service.js` | Onboarding state management |
| `/api-server/repositories/work-queue-repository.js` | Ticket management |
| `/api-server/services/websocket-service.js` | Real-time events |
| `/api-server/services/agents/sequential-introduction-orchestrator.js` | Agent introduction logic |

---

### 12.2 Related Documentation

- **SPARC Specification:** `/docs/SPARC-ONBOARDING-SPEC.md`
- **Agent Routing:** `/docs/COMMENT-ROUTING-SPEC.md`
- **Database Schema:** `/docs/DATABASE-SCHEMA.md`
- **WebSocket Protocol:** `/docs/WEBSOCKET-EVENTS.md`

---

## Appendix A: ASCII Component Map

```
┌───────────────────────────────────────────────────────────────────┐
│                       AGENT FEED SYSTEM                            │
├───────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐    │
│  │  Frontend   │  │  API Server  │  │  AVI Orchestrator     │    │
│  │   (React)   │  │  (Express)   │  │  (Always-On Loop)     │    │
│  └──────┬──────┘  └──────┬───────┘  └───────────┬───────────┘    │
│         │                 │                      │                 │
│         │ HTTP/WS         │ DB                   │ Poll            │
│         │                 │                      │                 │
│         ▼                 ▼                      ▼                 │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │                    SQLite Database                        │     │
│  ├───────────────────────────────────────────────────────────┤     │
│  │ • onboarding_state         • comments                     │     │
│  │ • work_queue_tickets       • agent_posts                  │     │
│  │ • introduction_queue       • agent_introductions          │     │
│  │ • user_settings            • agent_metadata               │     │
│  └──────────────────────────────────────────────────────────┘     │
│         ▲                                      ▲                   │
│         │                                      │                   │
│  ┌──────┴──────┐                        ┌─────┴────────┐          │
│  │ Onboarding  │                        │  Work Queue  │          │
│  │   Service   │                        │  Repository  │          │
│  └─────────────┘                        └──────────────┘          │
│         ▲                                      │                   │
│         │                                      │ Create Ticket     │
│         │ Check State                          ▼                   │
│  ┌──────┴──────────────────────────────────────────────┐          │
│  │              Agent Worker (Ephemeral)                │          │
│  ├──────────────────────────────────────────────────────┤          │
│  │ • Fetch ticket from queue                            │          │
│  │ • Build prompt with conversation context             │          │
│  │ • Invoke agent via Claude Code SDK                   │          │
│  │ • Post response as comment                           │          │
│  │ • Emit WebSocket events                              │          │
│  │ • Update onboarding state                            │          │
│  └──────────────────────────────────────────────────────┘          │
│         │                                      │                   │
│         │ Invoke                               │ Broadcast         │
│         ▼                                      ▼                   │
│  ┌─────────────┐                        ┌──────────────┐          │
│  │   Agents    │                        │  WebSocket   │          │
│  │  (Claude)   │                        │   Service    │          │
│  ├─────────────┤                        └──────┬───────┘          │
│  │ • avi       │                               │                  │
│  │ • gtky      │                               │ Events           │
│  │ • todos     │                               ▼                  │
│  │ • ideas     │                        ┌──────────────┐          │
│  │ • logger    │                        │   Frontend   │          │
│  └─────────────┘                        │   Clients    │          │
│                                         └──────────────┘          │
└───────────────────────────────────────────────────────────────────┘
```

---

## Appendix B: State Transition Diagram

```
                    ┌─────────────────────┐
                    │  User Arrives       │
                    │  (No Onboarding)    │
                    └──────────┬──────────┘
                               │
                               │ Welcome post shown
                               ▼
                    ┌─────────────────────┐
                    │  Phase 1: Name      │
                    │  step = 'name'      │
                    └──────────┬──────────┘
                               │
                               │ User comments: "My name is Sarah"
                               │ → GTKY Agent processes name
                               │ → Updates user_settings display_name
                               ▼
                    ┌─────────────────────┐
                    │ Phase 1: Use Case   │
                    │ step = 'use_case'   │
                    └──────────┬──────────┘
                               │
                               │ User comments: "Personal productivity"
                               │ → GTKY Agent processes use case
                               ▼
                    ┌─────────────────────────────┐
                    │ Phase 1 Complete            │
                    │ phase1_completed = 1        │
                    │ step = 'phase1_complete'    │
                    └──────────┬──────────────────┘
                               │
                               │ Triggers:
                               │ • Core agent introductions (todos, ideas, logger)
                               │ • User can start creating posts
                               │
                               │ Wait for Phase 2 trigger:
                               │ • 24 hours elapsed OR
                               │ • 2-3 posts created
                               ▼
                    ┌─────────────────────────────┐
                    │ Phase 2: Comm Style         │
                    │ phase = 2                   │
                    │ step = 'comm_style'         │
                    └──────────┬──────────────────┘
                               │
                               │ User selects communication preference
                               │ → GTKY Agent stores preference
                               ▼
                    ┌─────────────────────────────┐
                    │ Phase 2: Work Style         │
                    │ step = 'work_style'         │
                    └──────────┬──────────────────┘
                               │
                               │ User selects work style
                               ▼
                    ┌─────────────────────────────┐
                    │ Phase 2: Goals              │
                    │ step = 'goals'              │
                    └──────────┬──────────────────┘
                               │
                               │ User describes goals
                               │ → GTKY Agent stores goals
                               ▼
                    ┌─────────────────────────────┐
                    │ Phase 2 Complete            │
                    │ phase2_completed = 1        │
                    │ Onboarding finished ✓       │
                    └─────────────────────────────┘
```

---

**End of Document**
