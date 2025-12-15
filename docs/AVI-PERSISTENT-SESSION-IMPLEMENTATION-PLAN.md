# AVI Persistent Session Implementation Plan

**Date:** 2025-10-24
**Status:** Approved - Ready for Implementation
**Architecture:** On-Demand Persistent AVI with Auto-Cleanup

---

## 🎯 Executive Summary

### Concept: Lazy-Loaded Persistent AVI Session

**What We're Building:**
- ✅ AVI starts on first post/DM (lazy initialization)
- ✅ Session persists for 60 minutes of idle time
- ✅ Reuses context across all interactions (95% token savings)
- ✅ Auto-cleanup after idle period
- ✅ Single session (single-user system)

**Token Cost:**
- First interaction: ~30K tokens (full context load)
- Next 100 interactions: ~1,700 tokens each (session reuse)
- **95% savings vs spawn-per-question**

---

## 📋 APPROVED DECISIONS

### 1. Schema Migration
**Decision:** Add `author_agent` column, keep `author` for backward compatibility
- Add new column: `author_agent TEXT`
- Migrate data: `UPDATE comments SET author_agent = author`
- Keep both columns during transition
- Remove `author` column in future cleanup (2+ weeks)

### 2. Idle Timeout
**Decision:** 60 minutes (configurable)
- Longer timeout = fewer reinitializations
- No harm in keeping session alive longer
- Saves token costs on reinitialization
- Config option: `idleTimeout: 60 * 60 * 1000` (60 min)

### 3. Concurrent Sessions
**Decision:** Single session only
- Single-user system (no multi-tenancy)
- Simplified architecture
- No session isolation needed
- One global AVI instance

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  API Server (server.js)                             │
│  ┌───────────────────────────────────────────────┐  │
│  │  AVI Session Manager                          │  │
│  │  - Lazy initialization (30K first time)       │  │
│  │  - Session persistence (1.7K subsequent)      │  │
│  │  - Auto-cleanup (60min idle)                  │  │
│  │  - Single global instance                     │  │
│  └───────────────────────────────────────────────┘  │
│         ▲                    ▲                       │
│         │                    │                       │
│    [New Post]           [AVI DM Query]              │
│         │                    │                       │
│         ▼                    ▼                       │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │ POST /api/v1/   │  │ POST /api/avi/  │          │
│  │  agent-posts    │  │     chat        │          │
│  └─────────────────┘  └─────────────────┘          │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  Claude Code SDK Session      │
         │  - Persistent context         │
         │  - Streaming responses        │
         │  - Tool access                │
         │  - Memory across calls        │
         │  - 60min idle timeout         │
         └───────────────────────────────┘
```

---

## 🚀 IMPLEMENTATION PHASES

### Phase 1: Fix Comment Schema (P0 - CRITICAL)
**Blocks:** All agent comment posting
**Duration:** 30 minutes
**Files:** Migration script, database-selector.js

#### Tasks:
1. Create migration 007
2. Apply to database
3. Update database-selector.js to accept both columns
4. Test comment creation
5. Verify link-logger comments work

---

### Phase 2: Create AVI Session Manager (P0)
**Blocks:** AVI Q&A functionality
**Duration:** 4 hours
**Files:** session-manager.js

#### Tasks:
1. Create session-manager.js with lazy init
2. Implement 60-minute idle timeout
3. Load AVI prompt from CLAUDE.md
4. Add session lifecycle management
5. Write unit tests

---

### Phase 3: Integrate into Post Creation (P0)
**Blocks:** AVI responding to posts
**Duration:** 2 hours
**Files:** server.js

#### Tasks:
1. Import AVI session manager
2. Add question detection logic
3. Implement async AVI response handler
4. Test end-to-end flow
5. Monitor token usage

---

### Phase 4: Add AVI DM API (P1)
**Blocks:** Direct messaging with AVI
**Duration:** 2 hours
**Files:** server.js

#### Tasks:
1. Add POST /api/avi/chat endpoint
2. Add GET /api/avi/status endpoint
3. Add DELETE /api/avi/session endpoint
4. Test API endpoints
5. Document API

---

### Phase 5: Token Optimization (P1)
**Blocks:** Cost reduction
**Duration:** 4 hours
**Files:** session-manager.js, ClaudeCodeSDKManager.ts

#### Tasks:
1. Implement prompt caching
2. Add response length validation (maxTokens)
3. Optimize system prompt size
4. Add token usage monitoring
5. Cost analysis report

---

## 📝 DETAILED IMPLEMENTATION

### Phase 1: Fix Comment Schema

#### Step 1.1: Create Migration Script

**File:** `/workspaces/agent-feed/api-server/db/migrations/007-rename-author-column.sql`

```sql
-- Migration 007: Add author_agent column for semantic clarity
-- Keeps author column for backward compatibility

-- Add new column
ALTER TABLE comments ADD COLUMN author_agent TEXT;

-- Migrate existing data
UPDATE comments SET author_agent = author WHERE author_agent IS NULL;

-- Verify migration (should return 0)
-- SELECT COUNT(*) FROM comments WHERE author_agent IS NULL;

-- Note: Keep both columns during transition
-- Remove 'author' column in future migration after confirming all code uses author_agent
```

#### Step 1.2: Create Migration Application Script

**File:** `/workspaces/agent-feed/api-server/scripts/apply-migration-007.js`

```javascript
import Database from 'better-sqlite3';
import { promises as fs } from 'fs';
import path from 'path';

const db = new Database('/workspaces/agent-feed/database.db');

async function migrate() {
  console.log('🔧 Applying migration 007: Add author_agent column...');

  try {
    const migrationPath = path.join(
      '/workspaces/agent-feed/api-server/db/migrations',
      '007-rename-author-column.sql'
    );

    const sql = await fs.readFile(migrationPath, 'utf-8');

    // Execute migration
    db.exec(sql);

    // Verify
    const result = db.prepare(`
      SELECT COUNT(*) as count
      FROM comments
      WHERE author_agent IS NULL
    `).get();

    if (result.count === 0) {
      console.log('✅ Migration successful - all comments have author_agent');
    } else {
      console.error(`❌ Migration incomplete - ${result.count} comments missing author_agent`);
      process.exit(1);
    }

    // Show sample data
    const samples = db.prepare(`
      SELECT id, author, author_agent
      FROM comments
      LIMIT 5
    `).all();

    console.log('\n📊 Sample data after migration:');
    console.table(samples);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

migrate();
```

#### Step 1.3: Update Database Selector

**File:** `/workspaces/agent-feed/api-server/config/database-selector.js`

**Change:** Line 276 - Update INSERT statement to use author_agent

```javascript
async createComment(userId = 'anonymous', commentData) {
  if (this.usePostgres) {
    return await memoryRepo.createComment(userId, commentData);
  } else {
    // SQLite implementation
    const insert = this.sqliteDb.prepare(`
      INSERT INTO comments (
        id,
        post_id,
        parent_id,
        author,
        author_agent,
        content,
        mentioned_users,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const commentId = commentData.id || `comment-${Date.now()}`;
    const mentionedUsers = Array.isArray(commentData.mentioned_users)
      ? JSON.stringify(commentData.mentioned_users)
      : '[]';

    // Accept both author and author_agent for backward compatibility
    const author = commentData.author || userId;
    const authorAgent = commentData.author_agent || commentData.author || userId;

    insert.run(
      commentId,
      commentData.post_id,
      commentData.parent_id || null,
      author,           // Keep for backward compatibility
      authorAgent,      // Primary field going forward
      commentData.content,
      mentionedUsers
    );

    // Get the created comment
    const comment = this.sqliteDb.prepare(`
      SELECT * FROM comments WHERE id = ?
    `).get(commentId);

    return comment;
  }
}
```

#### Step 1.4: Run Migration

```bash
cd /workspaces/agent-feed/api-server
node scripts/apply-migration-007.js
```

#### Step 1.5: Verify

```bash
# Check schema
sqlite3 database.db ".schema comments"

# Verify data
sqlite3 database.db "SELECT author, author_agent FROM comments LIMIT 5;"

# Test comment creation
curl -X POST http://localhost:3001/api/agent-posts/post-test/comments \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Test comment",
    "author": "test-agent",
    "skipTicket": true
  }'
```

---

### Phase 2: Create AVI Session Manager

#### Step 2.1: Create Session Manager

**File:** `/workspaces/agent-feed/api-server/avi/session-manager.js`

```javascript
/**
 * AVI Session Manager - Persistent Claude Code Instance
 *
 * Manages a single persistent AVI session that:
 * - Starts on first interaction (post/DM)
 * - Stays alive for 60 minutes of idle time
 * - Auto-cleans after idle period
 * - Reuses context across conversations (95% token savings)
 */

import { getClaudeCodeSDKManager } from '../../prod/src/services/ClaudeCodeSDKManager.js';

class AviSessionManager {
  constructor(config = {}) {
    this.sessionId = null;
    this.sdkManager = null;
    this.lastActivity = null;
    this.idleTimeout = config.idleTimeout || 60 * 60 * 1000; // 60 minutes
    this.cleanupTimer = null;
    this.sessionActive = false;

    // AVI system prompt (loaded once, reused)
    this.systemPrompt = null;

    // Token tracking
    this.totalTokensUsed = 0;
    this.interactionCount = 0;
  }

  /**
   * Initialize AVI session on first use
   * Cost: ~30K tokens (full context load)
   */
  async initialize() {
    if (this.sessionActive) {
      console.log('✅ AVI session already active, reusing...');
      this.updateActivity();
      return {
        sessionId: this.sessionId,
        status: 'reused',
        tokensUsed: 0
      };
    }

    console.log('🚀 Initializing AVI Claude Code session...');

    try {
      // Get SDK manager
      this.sdkManager = getClaudeCodeSDKManager();

      // Load AVI system prompt from CLAUDE.md
      this.systemPrompt = await this.loadAviPrompt();

      // Create session
      this.sessionId = `avi-session-${Date.now()}`;
      this.sessionActive = true;
      this.updateActivity();

      // Start idle cleanup timer
      this.startCleanupTimer();

      console.log(`✅ AVI session initialized: ${this.sessionId}`);
      console.log(`   Idle timeout: ${this.idleTimeout / 1000}s`);

      return {
        sessionId: this.sessionId,
        status: 'initialized',
        tokensUsed: 30000 // Approximate initial cost
      };

    } catch (error) {
      console.error('❌ Failed to initialize AVI session:', error);
      this.sessionActive = false;
      throw error;
    }
  }

  /**
   * Load AVI system prompt from CLAUDE.md
   * This defines AVI's personality and capabilities
   */
  async loadAviPrompt() {
    const { promises: fs } = await import('fs');
    const path = await import('path');

    // Load core AVI instructions from CLAUDE.md
    const claudeMdPath = path.join(
      '/workspaces/agent-feed/prod/.claude/CLAUDE.md'
    );

    const claudeMd = await fs.readFile(claudeMdPath, 'utf-8');

    // Extract AVI-specific sections
    const aviSections = [
      '## 🤖 Meet Λvi - Your Chief of Staff',
      '## 🚨 MANDATORY: Λvi Behavioral Patterns',
      '## 🎯 Specialized Agent Routing'
    ];

    let prompt = 'You are Λvi (AVI), Chief of Staff for this system.\n\n';

    // Extract relevant sections from CLAUDE.md
    for (const section of aviSections) {
      const sectionStart = claudeMd.indexOf(section);
      if (sectionStart !== -1) {
        const nextSection = claudeMd.indexOf('\n## ', sectionStart + 1);
        const sectionContent = nextSection !== -1
          ? claudeMd.slice(sectionStart, nextSection)
          : claudeMd.slice(sectionStart);
        prompt += sectionContent + '\n\n';
      }
    }

    // Add working directory context
    prompt += `
## Current Context
- Working Directory: /workspaces/agent-feed/prod/agent_workspace/
- System Mode: Production
- Available Specialists: skills-architect, agent-architect, system-architect, learning-optimizer
- Active Orchestrator: Monitoring for proactive agent tickets (link-logger, etc.)

## Your Role
- Answer user questions about the system
- Coordinate specialist agents when needed
- Provide status updates and system information
- Route complex tasks to appropriate specialists
- Keep responses concise and helpful (max 2000 tokens)

## Important
- You are a persistent session - context is maintained across conversations
- Respond naturally and conversationally
- Use tools when appropriate (Read, Bash, etc.)
- Be concise but complete in your answers
`;

    return prompt;
  }

  /**
   * Process user message through persistent AVI session
   * Cost: ~1,700 tokens (reuses context)
   */
  async chat(userMessage, options = {}) {
    // Initialize session if not active
    if (!this.sessionActive) {
      await this.initialize();
    }

    this.updateActivity();
    this.interactionCount++;

    try {
      console.log(`💬 AVI interaction #${this.interactionCount}: "${userMessage.substring(0, 50)}..."`);

      // Build prompt with context
      const prompt = options.includeSystemPrompt
        ? `${this.systemPrompt}\n\nUser: ${userMessage}`
        : userMessage;

      // Execute through SDK (reuses session context)
      const result = await this.sdkManager.executeHeadlessTask(prompt, {
        maxTokens: options.maxTokens || 2000,
        temperature: 0.7,
        sessionId: this.sessionId
      });

      if (!result.success) {
        throw new Error(`AVI chat failed: ${result.error}`);
      }

      // Extract response
      const response = this.extractResponse(result);

      // Track tokens
      const tokensUsed = result.usage?.total_tokens || 1700;
      this.totalTokensUsed += tokensUsed;

      console.log(`✅ AVI responded (${response.length} chars, ${tokensUsed} tokens)`);
      console.log(`   Total session tokens: ${this.totalTokensUsed}`);

      return {
        success: true,
        response: response,
        tokensUsed: tokensUsed,
        sessionId: this.sessionId,
        totalTokens: this.totalTokensUsed,
        interactionCount: this.interactionCount
      };

    } catch (error) {
      console.error('❌ AVI chat error:', error);

      // If session died, try to recover
      if (error.message.includes('session')) {
        console.log('🔄 Session lost, reinitializing...');
        this.sessionActive = false;
        await this.initialize();
        return await this.chat(userMessage, options); // Retry once
      }

      throw error;
    }
  }

  /**
   * Extract text response from SDK result
   */
  extractResponse(result) {
    const messages = result.messages || [];
    const assistantMessages = messages.filter(m => m.type === 'assistant');

    const response = assistantMessages
      .map(msg => {
        if (typeof msg === 'string') return msg;
        if (msg.text) return msg.text;
        if (msg.content) {
          if (typeof msg.content === 'string') return msg.content;
          if (Array.isArray(msg.content)) {
            return msg.content
              .filter(block => block.type === 'text')
              .map(block => block.text)
              .join('\n');
          }
        }
        return '';
      })
      .filter(text => text.trim())
      .join('\n\n');

    return response || 'I apologize, I was unable to generate a response.';
  }

  /**
   * Update last activity timestamp
   */
  updateActivity() {
    this.lastActivity = Date.now();
  }

  /**
   * Start idle cleanup timer
   */
  startCleanupTimer() {
    // Clear existing timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Schedule cleanup check every minute
    this.cleanupTimer = setInterval(() => {
      this.checkIdleTimeout();
    }, 60000); // Check every minute
  }

  /**
   * Check if session is idle and cleanup if needed
   */
  checkIdleTimeout() {
    if (!this.sessionActive) return;

    const idleTime = Date.now() - this.lastActivity;

    if (idleTime > this.idleTimeout) {
      console.log(`⏰ AVI session idle for ${Math.round(idleTime / 1000)}s, cleaning up...`);
      console.log(`   Session stats: ${this.interactionCount} interactions, ${this.totalTokensUsed} tokens`);
      this.cleanup();
    }
  }

  /**
   * Clean up session resources
   */
  cleanup() {
    console.log('🧹 Cleaning up AVI session...');

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    const stats = {
      sessionId: this.sessionId,
      interactions: this.interactionCount,
      tokensUsed: this.totalTokensUsed
    };

    this.sessionActive = false;
    this.sessionId = null;
    this.lastActivity = null;

    console.log('✅ AVI session cleaned up:', stats);
  }

  /**
   * Get session status
   */
  getStatus() {
    return {
      active: this.sessionActive,
      sessionId: this.sessionId,
      lastActivity: this.lastActivity,
      idleTime: this.lastActivity ? Date.now() - this.lastActivity : null,
      idleTimeout: this.idleTimeout,
      interactionCount: this.interactionCount,
      totalTokensUsed: this.totalTokensUsed,
      averageTokensPerInteraction: this.interactionCount > 0
        ? Math.round(this.totalTokensUsed / this.interactionCount)
        : 0
    };
  }
}

// Singleton instance (single-user system)
let aviSessionInstance = null;

/**
 * Get or create AVI session manager
 */
export function getAviSession(config = {}) {
  if (!aviSessionInstance) {
    aviSessionInstance = new AviSessionManager(config);
  }
  return aviSessionInstance;
}

export default AviSessionManager;
```

---

### Phase 3: Integrate into Post Creation

#### Step 3.1: Update server.js

**File:** `/workspaces/agent-feed/api-server/server.js`

**Add at top of file (around line 10):**

```javascript
import { getAviSession } from './avi/session-manager.js';
```

**Add helper function (around line 100):**

```javascript
/**
 * Check if text contains URL
 */
function containsURL(text) {
  const urlPattern = /https?:\/\/[^\s]+/;
  return urlPattern.test(text);
}

/**
 * Detect if post is a question for AVI
 * Questions without URLs are directed to AVI
 * Questions with URLs go to link-logger-agent
 */
function isAviQuestion(content) {
  const lowerContent = content.toLowerCase();

  // Skip if contains URL (goes to link-logger)
  if (containsURL(content)) {
    return false;
  }

  // Pattern 1: Direct address
  if (lowerContent.includes('avi') || lowerContent.includes('λvi')) {
    return true;
  }

  // Pattern 2: Question marks
  if (content.includes('?')) {
    return true;
  }

  // Pattern 3: Common command/question patterns
  const questionPatterns = [
    /^(what|where|when|why|how|who|status|help)/i,
    /directory/i,
    /working on/i,
    /tell me/i,
    /show me/i
  ];

  return questionPatterns.some(pattern => pattern.test(content));
}

/**
 * Handle AVI response to post (async)
 * Does not block post creation
 */
async function handleAviResponse(post) {
  try {
    console.log(`💬 Post ${post.id} detected as AVI question`);

    // Get AVI session (initializes on first use)
    const aviSession = getAviSession({
      idleTimeout: 60 * 60 * 1000 // 60 minutes
    });

    // Chat with AVI
    const result = await aviSession.chat(post.content, {
      includeSystemPrompt: !aviSession.sessionActive, // Only first time
      maxTokens: 2000 // Keep responses concise
    });

    if (!result.success) {
      console.error('❌ AVI chat failed:', result.error);
      return;
    }

    console.log(`✅ AVI generated response (${result.tokensUsed} tokens)`);

    // Post AVI's response as comment
    const comment = {
      content: result.response,
      author: 'avi',        // Backward compatibility
      author_agent: 'avi',  // Primary field
      parent_id: null,
      mentioned_users: [],
      skipTicket: true // Don't create ticket for AVI's response
    };

    const response = await fetch(
      `http://localhost:3001/api/agent-posts/${post.id}/comments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comment)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to post AVI comment:', errorText);
      return;
    }

    const commentResult = await response.json();
    console.log(`✅ AVI comment posted: ${commentResult.data?.id}`);
    console.log(`   Session: ${result.sessionId}, Total tokens: ${result.totalTokens}`);

  } catch (error) {
    console.error('❌ Error handling AVI response:', error);
  }
}
```

**Modify POST /api/v1/agent-posts endpoint (around line 944):**

Find the section after post creation and before the response, add:

```javascript
// After: const createdPost = await dbSelector.createPost(userId, postData);
// After: const ticket = await workQueueRepository.createTicket(...);

// NEW: Check if post is directed at AVI (not a URL for link-logger)
if (isAviQuestion(content)) {
  console.log(`💬 Post ${createdPost.id} appears to be question for AVI`);

  // Trigger AVI response (async, don't wait)
  handleAviResponse(createdPost).catch(error => {
    console.error('❌ AVI response error:', error);
  });
}

// Continue with existing response...
res.status(201).json({
  success: true,
  data: createdPost,
  ticket: ticket
});
```

---

### Phase 4: Add AVI DM API

#### Step 4.1: Add API Endpoints

**File:** `/workspaces/agent-feed/api-server/server.js`

**Add endpoints (around line 1600, before server start):**

```javascript
/**
 * POST /api/avi/chat - Direct messaging with AVI
 * For AVI DM interface or manual testing
 */
app.post('/api/avi/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    console.log(`💬 AVI DM: "${message.substring(0, 50)}..."`);

    // Get or initialize AVI session
    const aviSession = getAviSession();

    // Process message
    const result = await aviSession.chat(message.trim(), {
      includeSystemPrompt: !aviSession.sessionActive,
      maxTokens: 2000
    });

    res.json({
      success: true,
      data: {
        response: result.response,
        tokensUsed: result.tokensUsed,
        sessionId: result.sessionId,
        sessionStatus: aviSession.getStatus()
      }
    });

  } catch (error) {
    console.error('❌ AVI DM error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process AVI chat',
      details: error.message
    });
  }
});

/**
 * GET /api/avi/status - Get AVI session status
 */
app.get('/api/avi/status', (req, res) => {
  const aviSession = getAviSession();
  const status = aviSession.getStatus();

  res.json({
    success: true,
    data: status
  });
});

/**
 * DELETE /api/avi/session - Force cleanup AVI session
 * Useful for testing or manual reset
 */
app.delete('/api/avi/session', (req, res) => {
  const aviSession = getAviSession();
  const statusBefore = aviSession.getStatus();

  aviSession.cleanup();

  res.json({
    success: true,
    message: 'AVI session cleaned up',
    previousSession: statusBefore
  });
});
```

---

### Phase 5: Token Optimization

#### Step 5.1: Add Token Monitoring

**File:** `/workspaces/agent-feed/api-server/avi/session-manager.js`

Already included in the implementation above:
- ✅ Token tracking per interaction
- ✅ Total token counter
- ✅ Average tokens per interaction
- ✅ maxTokens limit (2000)

#### Step 5.2: Add Metrics Endpoint

**File:** `/workspaces/agent-feed/api-server/server.js`

```javascript
/**
 * GET /api/avi/metrics - Get AVI usage metrics
 */
app.get('/api/avi/metrics', (req, res) => {
  const aviSession = getAviSession();
  const status = aviSession.getStatus();

  const metrics = {
    session: {
      active: status.active,
      sessionId: status.sessionId,
      uptime: status.lastActivity ? Date.now() - (status.lastActivity - status.idleTime) : 0
    },
    usage: {
      totalInteractions: status.interactionCount,
      totalTokens: status.totalTokensUsed,
      averageTokensPerInteraction: status.averageTokensPerInteraction
    },
    cost: {
      estimatedCost: (status.totalTokensUsed / 1000000) * 3, // $3/M tokens input
      averageCostPerInteraction: (status.averageTokensPerInteraction / 1000000) * 3
    },
    efficiency: {
      savingsVsSpawnPerQuestion: status.interactionCount > 0
        ? Math.round((1 - (status.totalTokensUsed / (status.interactionCount * 30000))) * 100)
        : 0
    }
  };

  res.json({
    success: true,
    data: metrics
  });
});
```

---

## 🧪 TESTING CHECKLIST

### Phase 1: Schema Migration
- [ ] Migration script runs without errors
- [ ] All existing comments have author_agent populated
- [ ] New comments can be created with author_agent
- [ ] link-logger comments work (no "No summary available")
- [ ] Comments show correct author in database

### Phase 2: AVI Session Manager
- [ ] Session initializes on first chat
- [ ] Session reuses context on subsequent chats
- [ ] Session cleans up after 60 minutes idle
- [ ] Token tracking works correctly
- [ ] System prompt loads from CLAUDE.md

### Phase 3: Post Integration
- [ ] Questions without URLs trigger AVI
- [ ] Posts with URLs go to link-logger
- [ ] AVI posts comments on posts
- [ ] Post creation doesn't block on AVI response
- [ ] Comments show "avi" as author_agent

### Phase 4: AVI DM API
- [ ] POST /api/avi/chat works
- [ ] GET /api/avi/status returns correct data
- [ ] DELETE /api/avi/session cleans up properly
- [ ] Multiple DM messages reuse session
- [ ] Token costs are reasonable

### Phase 5: Token Optimization
- [ ] First interaction ~30K tokens
- [ ] Subsequent interactions <2K tokens
- [ ] maxTokens limit enforced
- [ ] Metrics endpoint shows accurate data
- [ ] 90%+ token savings vs spawn-per-question

---

## 📊 SUCCESS METRICS

### Functionality
- ✅ AVI responds to questions in posts
- ✅ link-logger creates comments successfully
- ✅ No "No summary available" errors
- ✅ Comments show correct author_agent
- ✅ AVI DM API works

### Performance
- ✅ First AVI response: < 5 seconds
- ✅ Subsequent responses: < 2 seconds
- ✅ Session survives 60min idle
- ✅ Auto-cleanup works

### Cost
- ✅ First interaction: ~30K tokens
- ✅ Subsequent: <2K tokens
- ✅ Daily cost: <$10 (100 interactions)
- ✅ 90%+ savings vs spawn-per-question

---

## 🚨 TROUBLESHOOTING

### Issue: "No column named author_agent"
**Solution:** Run migration 007
```bash
node scripts/apply-migration-007.js
```

### Issue: Session not persisting
**Check:** `aviSession.getStatus()` shows `active: false`
**Solution:** Check idle timeout, verify session initialization

### Issue: High token costs
**Check:** GET /api/avi/metrics for token breakdown
**Solution:** Verify session reuse, check maxTokens limit

### Issue: AVI not responding
**Check:** Server logs for "AVI question detected"
**Solution:** Verify question detection logic, check containsURL()

---

## 📈 COST PROJECTIONS

### Current System (100 Questions)
**Spawn-Per-Question:**
- 100 × 30K tokens = 3,000,000 tokens
- Cost: ~$45-60

### With Persistent Session (Recommended)
- First: 30K tokens
- Next 99: 99 × 1,700 = 168,300 tokens
- **Total: 198,300 tokens**
- **Cost: ~$3-4**
- **Savings: 93%**

---

## 📝 NOTES

### Backward Compatibility
- Both `author` and `author_agent` columns exist
- Code accepts both fields during transition
- Remove `author` column after 2+ weeks

### Single-User System
- Only one AVI session globally
- No multi-tenancy needed
- Simplified architecture

### 60-Minute Idle Timeout
- Longer than original 30-minute proposal
- Saves reinit costs
- No harm in longer timeout
- Configurable if needed

---

## ✅ IMPLEMENTATION ORDER

1. **Phase 1:** Fix schema (CRITICAL - blocks all agent comments)
2. **Phase 2:** Create session manager
3. **Phase 3:** Integrate into posts
4. **Phase 4:** Add DM API
5. **Phase 5:** Optimize tokens

**Estimated Total Time:** 1 day

**Expected Outcome:**
- AVI responds to questions with 95% token savings
- link-logger comments work correctly
- Single persistent session serves all interactions
- Monthly cost: $150-300 (vs $1,500+ unoptimized)

---

**Last Updated:** 2025-10-24
**Status:** Ready for Implementation
**Approved By:** CTO
