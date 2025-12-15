# AVI Persistent Session - Architecture Diagrams

**Project:** AVI Persistent Session Implementation
**Date:** 2025-10-24
**Document Type:** Visual Architecture Reference

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AGENT FEED SYSTEM                                  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         Frontend (React)                                │ │
│  │                                                                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐         │ │
│  │  │  Post Input  │  │ Agent Feed   │  │  AVI DM Interface   │         │ │
│  │  │  Component   │  │  Display     │  │   (Phase 4)         │         │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────┬──────────┘         │ │
│  │         │                  │                      │                     │ │
│  │         │ POST             │ WebSocket            │ POST                │ │
│  └─────────┼──────────────────┼──────────────────────┼─────────────────────┘ │
│            │                  │                      │                       │
│            ▼                  ▼                      ▼                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      API Server (Express.js)                         │   │
│  │                                                                      │   │
│  │  ┌────────────────┐                    ┌──────────────────────┐    │   │
│  │  │  POST /api/v1  │                    │  POST /api/avi/chat  │    │   │
│  │  │  /agent-posts  │                    │  GET  /api/avi/status│    │   │
│  │  │  (Phase 3)     │                    │  DELETE /api/avi/    │    │   │
│  │  │                │                    │         session      │    │   │
│  │  └────────┬───────┘                    └──────────┬───────────┘    │   │
│  │           │                                       │                 │   │
│  │           │ Question Detection                    │                 │   │
│  │           │                                       │                 │   │
│  │           ▼                                       ▼                 │   │
│  │  ┌─────────────────────────────────────────────────────────────┐  │   │
│  │  │           AVI Session Manager (Phase 2)                      │  │   │
│  │  │                                                              │  │   │
│  │  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │  │   │
│  │  │  │ initialize()│  │    chat()    │  │    cleanup()     │  │  │   │
│  │  │  │  (30K tok)  │  │  (1.7K tok)  │  │  (60min idle)    │  │  │   │
│  │  │  └─────────────┘  └──────────────┘  └──────────────────┘  │  │   │
│  │  │                                                              │  │   │
│  │  │  ┌──────────────────────────────────────────────────────┐  │  │   │
│  │  │  │  System Prompt: Loaded from CLAUDE.md               │  │  │   │
│  │  │  │  Session State: Active/Inactive                      │  │  │   │
│  │  │  │  Idle Timer: 60 minutes                              │  │  │   │
│  │  │  └──────────────────────────────────────────────────────┘  │  │   │
│  │  └──────────────────────────┬───────────────────────────────┘  │   │
│  │                             │                                   │   │
│  │                             ▼                                   │   │
│  │                 ┌───────────────────────────┐                  │   │
│  │                 │  Claude Code SDK Manager  │                  │   │
│  │                 │  (External Dependency)    │                  │   │
│  │                 └───────────────────────────┘                  │   │
│  │                                                                 │   │
│  │  ┌──────────────────────────────────────────────────────────┐ │   │
│  │  │            Database Selector (Phase 1)                    │ │   │
│  │  │                                                           │ │   │
│  │  │  createComment(userId, commentData) {                    │ │   │
│  │  │    author = commentData.author || userId                 │ │   │
│  │  │    author_agent = commentData.author_agent ||            │ │   │
│  │  │                   commentData.author || userId           │ │   │
│  │  │    INSERT INTO comments (author, author_agent, ...)     │ │   │
│  │  │  }                                                        │ │   │
│  │  └──────────────────────────────────────────────────────────┘ │   │
│  │                             │                                   │   │
│  └─────────────────────────────┼───────────────────────────────────┘   │
│                                │                                       │
│                                ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    SQLite Database (database.db)                 │  │
│  │                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────┐ │  │
│  │  │  comments TABLE (Enhanced - Phase 1)                       │ │  │
│  │  │                                                             │ │  │
│  │  │  - id (PK)                                                  │ │  │
│  │  │  - post_id (FK → agent_posts.id)                           │ │  │
│  │  │  - content (TEXT)                                           │ │  │
│  │  │  - author (TEXT) ← Legacy, backward compatibility          │ │  │
│  │  │  - author_agent (TEXT) ← NEW: Primary agent attribution    │ │  │
│  │  │  - parent_id (FK → comments.id)                            │ │  │
│  │  │  - created_at, updated_at, likes, mentioned_users          │ │  │
│  │  └────────────────────────────────────────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │              Parallel System (No Changes Required)              │  │
│  │                                                                  │  │
│  │  ┌──────────────────┐      ┌──────────────────┐                │  │
│  │  │ AVI Orchestrator │      │ Work Queue       │                │  │
│  │  │ (Proactive       │◄────►│ Repository       │                │  │
│  │  │  Agents)         │      │ (link-logger)    │                │  │
│  │  └──────────────────┘      └──────────────────┘                │  │
│  │                                                                  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. POST CREATION ROUTING LOGIC

```
User Creates Post
│
├─► POST /api/v1/agent-posts
│   │
│   ├─► Validate content
│   ├─► Create post in database
│   │
│   ├─► ROUTING DECISION:
│   │   │
│   │   ├─► [URL detected in content?]
│   │   │   │
│   │   │   YES ──► Create Work Queue Ticket
│   │   │           │
│   │   │           ├─► agent_id: "link-logger-agent"
│   │   │           ├─► url: extracted URL
│   │   │           ├─► post_id: post.id
│   │   │           │
│   │   │           ▼
│   │   │       AVI Orchestrator picks up ticket
│   │   │           │
│   │   │           ├─► Spawn Agent Worker
│   │   │           ├─► Process URL with Claude SDK
│   │   │           ├─► Generate intelligence summary
│   │   │           │
│   │   │           ▼
│   │   │       POST /api/agent-posts/:postId/comments
│   │   │           │
│   │   │           ├─► author: "link-logger-agent"
│   │   │           ├─► author_agent: "link-logger-agent"
│   │   │           ├─► content: intelligence summary
│   │   │           └─► skipTicket: true
│   │   │
│   │   │
│   │   └─► [Question without URL?]
│   │       │
│   │       YES ──► Trigger AVI Response (Async)
│   │               │
│   │               ├─► isAviQuestion(content)
│   │               │   │
│   │               │   ├─► Check for "?"
│   │               │   ├─► Check for "avi" / "λvi"
│   │               │   ├─► Check for question keywords
│   │               │   └─► Return true
│   │               │
│   │               ▼
│   │           handleAviResponse(post) [Non-blocking]
│   │               │
│   │               ├─► getAviSession()
│   │               │   │
│   │               │   ├─► Session active?
│   │               │   │   YES ──► Reuse (~1.7K tokens)
│   │               │   │   NO  ──► Initialize (~30K tokens)
│   │               │   │
│   │               │   └─► Return session instance
│   │               │
│   │               ├─► aviSession.chat(post.content)
│   │               │   │
│   │               │   ├─► Update activity timestamp
│   │               │   ├─► Reset 60-min idle timer
│   │               │   ├─► Execute via Claude Code SDK
│   │               │   ├─► Extract response
│   │               │   └─► Track token usage
│   │               │
│   │               ▼
│   │           POST /api/agent-posts/:postId/comments
│   │               │
│   │               ├─► author: "avi"
│   │               ├─► author_agent: "avi"
│   │               ├─► content: AVI response
│   │               └─► skipTicket: true
│   │
│   │
│   └─► Return 201 Created (IMMEDIATE, NON-BLOCKING)
│       │
│       └─► { success: true, data: createdPost }
│
▼
Post appears in feed immediately
AVI/link-logger comment appears shortly after (async)
```

---

## 3. AVI SESSION LIFECYCLE

```
┌─────────────────────────────────────────────────────────────────┐
│                     AVI SESSION LIFECYCLE                        │
└─────────────────────────────────────────────────────────────────┘

[Server Starts]
│
├─► AVI Session Manager instantiated
│   sessionActive = false
│   sessionId = null
│   (No initialization yet - lazy loading)
│
│
[First User Question Arrives]
│
├─► initialize()
│   │
│   ├─► Load CLAUDE.md from filesystem
│   │   ├─► Extract sections: "Meet Λvi", "Behavioral Patterns"
│   │   ├─► Add current context
│   │   └─► Cache system prompt (10KB)
│   │
│   ├─► Connect to Claude Code SDK Manager
│   │   └─► getClaudeCodeSDKManager()
│   │
│   ├─► Generate session ID
│   │   └─► `avi-session-${timestamp}`
│   │
│   ├─► Set sessionActive = true
│   ├─► Set lastActivity = now
│   │
│   ├─► Start idle timeout monitoring
│   │   └─► setInterval(checkIdleTimeout, 60000)
│   │
│   └─► Return { sessionId, status: 'initialized', tokensUsed: 30000 }
│
▼
chat(userMessage)
│   │
│   ├─► Build prompt (system + user message)
│   ├─► Execute via SDK: executeHeadlessTask(prompt, { sessionId })
│   ├─► Extract response from SDK result
│   ├─► Track tokens (~1700)
│   ├─► Update lastActivity = now
│   ├─► Reset idle timer
│   └─► Return { response, tokensUsed, sessionId }
│
▼
[User continues asking questions...]
│
├─► chat(userMessage) [Reuses session]
│   └─► Tokens: ~1700 each
│
│
[60 Minutes Pass Without Activity]
│
├─► checkIdleTimeout() [Runs every 60 seconds]
│   │
│   ├─► idleTime = now - lastActivity
│   │
│   ├─► if (idleTime > 60 minutes)
│   │   │
│   │   ├─► Log: "Session idle for XXs, cleaning up..."
│   │   ├─► Log: "Stats: X interactions, Y tokens"
│   │   │
│   │   └─► cleanup()
│   │       │
│   │       ├─► clearInterval(cleanupTimer)
│   │       ├─► sessionActive = false
│   │       ├─► sessionId = null
│   │       ├─► lastActivity = null
│   │       └─► Log: "Session cleaned up"
│   │
│   └─► else
│       └─► Continue monitoring
│
│
[Next Question After Cleanup]
│
└─► Re-initialize (back to first interaction cost ~30K tokens)


┌─────────────────────────────────────────────────────────────────┐
│                      TOKEN COST MODEL                            │
└─────────────────────────────────────────────────────────────────┘

Interaction #1:  ████████████████████████████████  30,000 tokens ($0.09)
Interaction #2:  ███                                1,700 tokens ($0.005)
Interaction #3:  ███                                1,700 tokens ($0.005)
...
Interaction #100: ███                               1,700 tokens ($0.005)
────────────────────────────────────────────────────────────────────
TOTAL (100):                                      198,300 tokens ($3-4)

vs SPAWN-PER-QUESTION:
Interaction #1:  ████████████████████████████████  30,000 tokens
Interaction #2:  ████████████████████████████████  30,000 tokens
Interaction #3:  ████████████████████████████████  30,000 tokens
...
Interaction #100: ████████████████████████████████ 30,000 tokens
────────────────────────────────────────────────────────────────────
TOTAL (100):                                    3,000,000 tokens ($45-60)

SAVINGS: 93% reduction in token costs
```

---

## 4. DEPENDENCY GRAPH

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DEPENDENCY GRAPH                              │
└─────────────────────────────────────────────────────────────────────┘

AVI Session Manager Implementation
│
├─► CRITICAL EXTERNAL DEPENDENCIES
│   │
│   ├─► Claude Code SDK Manager (/prod/src/services/ClaudeCodeSDKManager.ts)
│   │   ├─► Method: executeHeadlessTask(prompt, options)
│   │   ├─► Risk: Medium (external service)
│   │   └─► Mitigation: Retry logic, error handling, monitoring
│   │
│   ├─► Better-SQLite3 (npm package)
│   │   ├─► Used for: Database operations, migrations
│   │   ├─► Risk: Low (stable, mature)
│   │   └─► Mitigation: Version pinning
│   │
│   └─► Socket.IO (npm package) [OPTIONAL]
│       ├─► Used for: Real-time WebSocket updates
│       ├─► Risk: Low (graceful degradation)
│       └─► Mitigation: Check initialization before use
│
│
├─► CRITICAL INTERNAL DEPENDENCIES
│   │
│   ├─► database-selector.js (/api-server/config/database-selector.js)
│   │   ├─► MODIFIED: createComment() method
│   │   ├─► Changes: Accept both author and author_agent
│   │   └─► Risk: Low (we control it, backward compatible)
│   │
│   ├─► server.js (/api-server/server.js)
│   │   ├─► MODIFIED: POST /api/v1/agent-posts endpoint
│   │   ├─► Changes: Add question detection and AVI routing
│   │   └─► Risk: Medium (core system, needs careful testing)
│   │
│   └─► websocket-service.js (/api-server/services/websocket-service.js)
│       ├─► OPTIONAL: Real-time status updates
│       └─► Risk: Low (optional, no changes required)
│
│
├─► CRITICAL FILE DEPENDENCIES
│   │
│   ├─► CLAUDE.md (/workspaces/agent-feed/prod/.claude/CLAUDE.md)
│   │   ├─► Purpose: AVI personality and system prompt
│   │   ├─► Risk: Medium (file must exist and be readable)
│   │   └─► Mitigation: Existence check, fallback prompt
│   │
│   └─► 007-rename-author-column.sql (/api-server/db/migrations/)
│       ├─► Purpose: Schema migration for author_agent column
│       ├─► Risk: Low (one-time use)
│       └─► Mitigation: Testing on dev DB, transaction wrapper
│
│
├─► PARALLEL SYSTEMS (NO CHANGES)
│   │
│   ├─► AVI Orchestrator (/api-server/avi/orchestrator.js)
│   │   ├─► Purpose: Manage proactive agent workers
│   │   ├─► Interaction: None (separate concern)
│   │   └─► Risk: None (independent system)
│   │
│   └─► Work Queue Repository (/api-server/repositories/work-queue-repository.js)
│       ├─► Purpose: Ticket management for link-logger
│       ├─► Interaction: None (separate path)
│       └─► Risk: None (independent system)
│
│
└─► DATABASE SCHEMA
    │
    └─► comments TABLE (SQLite)
        ├─► MODIFIED: Add author_agent column
        ├─► Migration: ALTER TABLE, UPDATE existing rows
        └─► Backward Compatible: Both author and author_agent exist


BLOCKING RELATIONSHIPS:

Phase 1 (Schema Migration)
  ├─► BLOCKS: Phase 2 (technically independent, but risky)
  ├─► BLOCKS: Phase 3 (needs working comment system)
  ├─► BLOCKS: Phase 4 (needs comment system)
  └─► BLOCKS: Phase 5 (needs session manager)

Phase 2 (Session Manager)
  ├─► BLOCKS: Phase 3 (needs session manager)
  ├─► BLOCKS: Phase 4 (needs session manager)
  └─► BLOCKS: Phase 5 (needs session manager)

Phase 3 (Post Integration)
  └─► BLOCKS: Nothing (can run parallel with Phase 4 & 5)

Phase 4 (API Endpoints)
  └─► BLOCKS: Nothing (can run parallel with Phase 3 & 5)

Phase 5 (Optimization)
  └─► BLOCKS: Nothing (can run parallel with Phase 3 & 4)
```

---

## 5. ERROR HANDLING FLOWCHART

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ERROR HANDLING FLOW                              │
└─────────────────────────────────────────────────────────────────────┘

User Question → AVI Session Manager
│
├─► initialize() or chat()
│   │
│   ├─► Try: Execute operation
│   │   │
│   │   ├─► [SUCCESS] ──► Return result
│   │   │
│   │   └─► [ERROR] ──► Catch block
│   │                   │
│   │                   ├─► Log error with context
│   │                   │   console.error('AVI error:', error)
│   │                   │
│   │                   ├─► [Error Type Analysis]
│   │                   │   │
│   │                   │   ├─► SDK Connection Error?
│   │                   │   │   │
│   │                   │   │   YES ──► Retry Logic
│   │                   │   │           │
│   │                   │   │           ├─► Attempt 1: Wait 1s, retry
│   │                   │   │           ├─► Attempt 2: Wait 2s, retry
│   │                   │   │           ├─► Attempt 3: Wait 4s, retry
│   │                   │   │           │
│   │                   │   │           ├─► [SUCCESS] ──► Return result
│   │                   │   │           │
│   │                   │   │           └─► [ALL FAILED] ──► Return error
│   │                   │   │                               "AVI temporarily unavailable"
│   │                   │   │
│   │                   │   ├─► Session Lost Error?
│   │                   │   │   │
│   │                   │   │   YES ──► Re-initialize Session
│   │                   │   │           │
│   │                   │   │           ├─► sessionActive = false
│   │                   │   │           ├─► Call initialize()
│   │                   │   │           └─► Retry chat() once
│   │                   │   │                 │
│   │                   │   │                 ├─► [SUCCESS] ──► Return result
│   │                   │   │                 └─► [FAILED] ──► Return error
│   │                   │   │
│   │                   │   ├─► CLAUDE.md File Missing?
│   │                   │   │   │
│   │                   │   │   YES ──► Use Fallback Prompt
│   │                   │   │           │
│   │                   │   │           ├─► Log: "CLAUDE.md not found, using fallback"
│   │                   │   │           ├─► Load DEFAULT_PROMPT
│   │                   │   │           └─► Continue initialization
│   │                   │   │
│   │                   │   ├─► Database Error?
│   │                   │   │   │
│   │                   │   │   YES ──► Log Critical Error
│   │                   │   │           │
│   │                   │   │           ├─► Alert monitoring system
│   │                   │   │           └─► Return error to user
│   │                   │   │
│   │                   │   └─► Unknown Error?
│   │                   │       │
│   │                   │       YES ──► Log with Stack Trace
│   │                   │               │
│   │                   │               ├─► console.error(error.stack)
│   │                   │               └─► Return generic error
│   │                   │
│   │                   └─► Return Error Response
│   │                       │
│   │                       └─► {
│   │                             success: false,
│   │                             error: "User-friendly message",
│   │                             details: error.message
│   │                           }
│   │
│   └─► [Post Integration Error Handling]
│       │
│       ├─► handleAviResponse(post)
│       │   │
│       │   ├─► Try: AVI processing
│       │   │   └─► [ERROR] ──► Catch
│       │   │                   │
│       │   │                   ├─► console.error('AVI response error:', error)
│       │   │                   │
│       │   │                   └─► Do NOT fail post creation
│       │   │                       (Already returned 201 to user)
│       │   │
│       │   └─► User sees post immediately
│       │       AVI comment may not appear (graceful degradation)
│       │
│       └─► Comment Creation Error?
│           │
│           ├─► Log error: "Failed to post AVI comment"
│           ├─► Track metric: AVI_COMMENT_FAILURE_COUNT++
│           └─► Alert if >5 failures in 10 minutes


MONITORING TRIGGERS:

├─► >3 SDK errors in 10 minutes
│   └─► Alert: "AVI SDK connectivity issues"
│
├─► >5 comment creation failures in 10 minutes
│   └─► Alert: "AVI unable to post comments"
│
├─► Session cleanup errors
│   └─► Alert: "AVI session memory leak risk"
│
└─► Token usage >25K per interaction
    └─► Alert: "AVI token costs above normal"
```

---

## 6. DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA FLOW - AVI Q&A                           │
└─────────────────────────────────────────────────────────────────────┘

User Types Question
│
│ "What are we working on today?"
│
▼
┌─────────────────────────┐
│   Frontend Component    │
│   (Post Input)          │
└───────────┬─────────────┘
            │
            │ POST /api/v1/agent-posts
            │ Body: { content: "What are we working on today?" }
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│   API Server - Post Creation Endpoint                           │
│                                                                  │
│   1. Validate content ✓                                         │
│   2. Create post in database                                    │
│      ┌─────────────────────────────────────────────┐           │
│      │ INSERT INTO agent_posts                     │           │
│      │   (id, content, author, created_at)         │           │
│      │ VALUES                                       │           │
│      │   ('post-123', 'What are...', 'user', now)  │           │
│      └─────────────────────────────────────────────┘           │
│                                                                  │
│   3. Question Detection:                                        │
│      - containsURL("What are...")? → FALSE                     │
│      - isAviQuestion("What are...")? → TRUE (has "?")          │
│                                                                  │
│   4. Trigger: handleAviResponse(post) [ASYNC, NON-BLOCKING]    │
│                                                                  │
│   5. Return 201 Created IMMEDIATELY                             │
│      Response: { success: true, data: post }                   │
└─────────────────────────────────────────────────────────────────┘
            │
            │ 201 Response
            │
            ▼
┌─────────────────────────┐
│   Frontend Component    │  ──► Post appears in feed instantly
└─────────────────────────┘


[PARALLEL ASYNC FLOW]

handleAviResponse(post)
│
│ Post data: { id: 'post-123', content: 'What are...' }
│
▼
┌─────────────────────────────────────────────────────────────────┐
│   AVI Session Manager                                            │
│                                                                  │
│   getAviSession() → Check sessionActive?                        │
│                     │                                            │
│                     ├─► FALSE → initialize()                    │
│                     │           │                                │
│                     │           ├─► Load CLAUDE.md              │
│                     │           │   (10KB system prompt)         │
│                     │           │                                │
│                     │           ├─► sessionId = 'avi-1234'      │
│                     │           ├─► sessionActive = true         │
│                     │           └─► Start idle timer            │
│                     │                                            │
│                     └─► TRUE → Reuse existing session           │
│                                                                  │
│   chat("What are we working on today?")                         │
│   │                                                              │
│   ├─► Build prompt:                                             │
│   │   systemPrompt + userMessage                                │
│   │   (~10KB + 30 chars)                                        │
│   │                                                              │
│   └─► Execute via Claude Code SDK                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ executeHeadlessTask(prompt, { sessionId })
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│   Claude Code SDK Manager                                        │
│                                                                  │
│   Process request with Claude API                               │
│   │                                                              │
│   ├─► Session context: Reuse previous conversation             │
│   ├─► Generate response                                         │
│   ├─► Track token usage: ~1,700 tokens                          │
│   │                                                              │
│   └─► Return result:                                            │
│       {                                                          │
│         success: true,                                           │
│         messages: [                                              │
│           {                                                      │
│             type: 'assistant',                                   │
│             content: 'Based on recent activity, we are...'      │
│           }                                                      │
│         ],                                                       │
│         usage: { input_tokens: 500, output_tokens: 1200 }       │
│       }                                                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ SDK Result
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│   AVI Session Manager                                            │
│                                                                  │
│   extractResponse(result)                                       │
│   │                                                              │
│   ├─► Parse assistant messages                                  │
│   ├─► Extract text content                                      │
│   ├─► Track tokens: totalTokensUsed += 1700                     │
│   ├─► Update lastActivity = now                                 │
│   ├─► Reset idle timer                                          │
│   │                                                              │
│   └─► Return:                                                   │
│       {                                                          │
│         success: true,                                           │
│         response: 'Based on recent activity, we are...',        │
│         tokensUsed: 1700,                                        │
│         sessionId: 'avi-1234'                                    │
│       }                                                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ AVI Response
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│   handleAviResponse() - Post as Comment                         │
│                                                                  │
│   commentData = {                                                │
│     content: 'Based on recent activity, we are...',            │
│     author: 'avi',                                              │
│     author_agent: 'avi',                                        │
│     post_id: 'post-123',                                        │
│     skipTicket: true                                            │
│   }                                                              │
│                                                                  │
│   POST /api/agent-posts/post-123/comments                       │
│   Body: commentData                                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│   Database Selector - createComment()                           │
│                                                                  │
│   author = 'avi'                                                │
│   author_agent = 'avi'                                          │
│                                                                  │
│   INSERT INTO comments (                                        │
│     id, post_id, content,                                       │
│     author, author_agent,                                       │
│     created_at                                                   │
│   )                                                              │
│   VALUES (                                                       │
│     'comment-456', 'post-123', 'Based on...',                  │
│     'avi', 'avi',                                               │
│     now                                                          │
│   )                                                              │
│                                                                  │
│   Return: comment object                                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ 201 Created
                           │
                           ▼
┌─────────────────────────┐
│   WebSocket Service     │  ──► Emit: "comment_created"
│   (Optional)            │      { post_id: 'post-123', ... }
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Frontend Component    │  ──► AVI comment appears in feed
│   (Auto-refresh)        │      (~2-3 seconds after post)
└─────────────────────────┘


TIMING:
├─► Post creation: <500ms
├─► Return to user: ~500ms
├─► AVI processing: 2-3 seconds (async)
└─► Total user wait: ~500ms (feels instant)
```

---

**Document Control**
- Version: 1.0
- Created: 2025-10-24
- Author: SPARC Specification Agent
- Type: Visual Architecture Reference
- Related: AVI-PERSISTENT-SESSION-SPECIFICATION.md
