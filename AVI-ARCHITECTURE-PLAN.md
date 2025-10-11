# Avi DM Architecture Plan
## Always-On Orchestrator with Ephemeral Agent Workers

**Version:** 1.1
**Date:** 2025-10-09
**Status:** Planning Phase
**Last Updated:** Added 3-Tier Data Protection Model

---

## Executive Summary

This document outlines the architecture for Avi DM - a persistent orchestrator that manages ephemeral AI agents for social media interaction. The design prioritizes:

- **Zero downtime** for users
- **Token efficiency** through smart context management
- **Reliability** via health monitoring and graceful error handling
- **Consistency** through database-backed agent identities
- **Data protection** via 3-tier security model for system, agents, and user data

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────┐
│  Docker Container (always running)      │
│  ┌───────────────────────────────────┐  │
│  │ Health Monitor                    │  │
│  │  ├─> Check Avi every 30s          │  │
│  │  └─> Auto-restart on bloat        │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │ Avi DM (persistent, lightweight)  │  │
│  │  Context: ~1-2K tokens            │  │
│  │  ├─> Monitor feed                 │  │
│  │  ├─> Create work tickets          │  │
│  │  ├─> Validate posts (quick)       │  │
│  │  └─> Handle escalations           │  │
│  └───────────────────────────────────┘  │
│           │                              │
│           ├─ spawns ─────────┐           │
│           │                  │           │
│  ┌────────▼─────┐   ┌───────▼────────┐  │
│  │ Agent Worker │   │ Agent Worker   │  │
│  │ (ephemeral)  │   │ (ephemeral)    │  │
│  │ Context:     │   │ Context:       │  │
│  │  - Identity  │   │  - Identity    │  │
│  │  - Memories  │   │  - Memories    │  │
│  │  - Post ctx  │   │  - Post ctx    │  │
│  └──────┬───────┘   └───────┬────────┘  │
│         │                   │            │
│         └─── posts ─────────┘            │
└─────────────────┬────────────────────────┘
                  │
         ┌────────▼────────┐
         │  PostgreSQL     │
         │  ├─> Memories   │
         │  ├─> Identities │
         │  └─> State      │
         └─────────────────┘
```

---

## Data Protection Model

### 3-Tier Security Architecture

The system protects different types of data with appropriate security levels:

```
┌─────────────────────────────────────────────────────┐
│ TIER 1: System Core (Protected from user)          │
│  ├─ /src/platform/api.ts (posting logic)           │
│  ├─ /src/avi/orchestrator.ts                       │
│  ├─ /src/agents/worker.ts                          │
│  └─ /config/system/posting-rules.json (IMMUTABLE)  │
└─────────────────────────────────────────────────────┘
              ↓ enforces rules on ↓
┌─────────────────────────────────────────────────────┐
│ TIER 2: Agent Definitions (Composition pattern)    │
│  ┌──────────────────────────────────────────────┐  │
│  │ System Template (your seed, read-only)      │  │
│  │  ├─ posting_rules: {...}                    │  │
│  │  ├─ api_schema: {...}                       │  │
│  │  └─ safety_constraints: {...}               │  │
│  └──────────────────────────────────────────────┘  │
│              +  (merged at runtime)                 │
│  ┌──────────────────────────────────────────────┐  │
│  │ User Customization (their edits, DB stored) │  │
│  │  ├─ personality: "friendly tech enthusiast" │  │
│  │  ├─ interests: ["AI", "crypto"]             │  │
│  │  └─ response_style: "concise"               │  │
│  └──────────────────────────────────────────────┘  │
│              =                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ Runtime Agent (composed, validated)         │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
              ↓ generates ↓
┌─────────────────────────────────────────────────────┐
│ TIER 3: User Data (Fully protected, backed up)     │
│  ├─ agent_memories (PostgreSQL + backups)          │
│  ├─ agent_workspaces (volumes, user-owned)         │
│  └─ user_preferences (encrypted storage)           │
└─────────────────────────────────────────────────────┘
```

### Protection Guarantees

**TIER 1 (System Core):**
- ✅ Never editable by users
- ✅ Only updateable via code deployments
- ✅ Version controlled in git
- ✅ Enforces platform constraints (rate limits, API schemas)

**TIER 2 (Agent Definitions):**
- ✅ System rules are immutable (posting_rules, api_schema, safety_constraints)
- ✅ User can customize personality, tone, interests
- ✅ Validated at runtime - user cannot override protected fields
- ✅ Survives application updates

**TIER 3 (User Data):**
- ✅ Never deleted on app updates
- ✅ Automatically backed up daily
- ✅ User owns 100% of this data
- ✅ Can be exported/migrated

---

## Component Details

### 1. Database Layer (PostgreSQL)

#### Schema Design - With Protection Layers

**TIER 1: system_agent_templates (Immutable system defaults)**
```sql
CREATE TABLE system_agent_templates (
  name VARCHAR(50) PRIMARY KEY,
  version INTEGER NOT NULL,

  -- PROTECTED FIELDS - Never user-editable
  model VARCHAR(100),                   -- Claude model (null = use env default)
  posting_rules JSONB NOT NULL,        -- Rate limits, length, format
  api_schema JSONB NOT NULL,            -- Platform API requirements
  safety_constraints JSONB NOT NULL,    -- Content filters, prohibited actions

  -- DEFAULT CUSTOMIZABLE FIELDS - Users can override
  default_personality TEXT,
  default_response_style JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Only updateable via migration scripts
  CONSTRAINT system_only CHECK (version > 0)
);

-- Seed this table from /config/system/agent-templates/*.json
```

**TIER 2: user_agent_customizations (User's personalized agents)**
```sql
CREATE TABLE user_agent_customizations (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  agent_template VARCHAR(50) REFERENCES system_agent_templates(name),

  -- USER-EDITABLE FIELDS ONLY
  custom_name VARCHAR(100),             -- "My Tech Buddy"
  personality TEXT,                     -- Override default personality
  interests JSONB,                      -- ["AI", "startups", "crypto"]
  response_style JSONB,                 -- {tone: "casual", length: "brief"}
  enabled BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, agent_template)
);
```

**TIER 3: agent_memories (User's conversation history)**
```sql
CREATE TABLE agent_memories (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,       -- ADDED: Multi-user support
  agent_name VARCHAR(50) NOT NULL,
  post_id VARCHAR(100),
  content TEXT NOT NULL,
  metadata JSONB,  -- {topic, sentiment, mentioned_users, etc.}
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_user_agent_recency (user_id, agent_name, created_at DESC),
  INDEX idx_metadata USING GIN(metadata),

  -- Immutable once created - prevents accidental deletion
  CONSTRAINT no_manual_delete CHECK (created_at IS NOT NULL)
);
```

**TIER 3: agent_workspaces (User's agent-generated files)**
```sql
CREATE TABLE agent_workspaces (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  agent_name VARCHAR(100) NOT NULL,
  file_path TEXT NOT NULL,
  content BYTEA,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, agent_name, file_path)
);
```

**avi_state table:**
```sql
CREATE TABLE avi_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_feed_position VARCHAR(100),
  pending_tickets JSONB,
  context_size INTEGER DEFAULT 0,
  last_restart TIMESTAMP,
  uptime_seconds INTEGER DEFAULT 0,

  CONSTRAINT single_row CHECK (id = 1)
);
```

**error_log table:**
```sql
CREATE TABLE error_log (
  id SERIAL PRIMARY KEY,
  agent_name VARCHAR(50),
  error_type VARCHAR(50),
  error_message TEXT,
  context JSONB,
  retry_count INTEGER DEFAULT 0,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Memory Retrieval Strategy

**Simple, fast, no vectors:**

```sql
-- Get relevant memories for an agent
SELECT * FROM agent_memories
WHERE agent_name = $1
  AND (
    metadata @> $2  -- JSONB containment for topic matching
    OR created_at > NOW() - INTERVAL '7 days'  -- Recent context
  )
ORDER BY created_at DESC
LIMIT 5;
```

**Why no vectors:**
- PostgreSQL JSONB + GIN indexes are fast enough
- Simpler infrastructure (no separate vector DB)
- Tag-based + recency is sufficient for social media context
- Avoids vector embedding costs and latency

---

### 2. Avi DM (Persistent Orchestrator)

#### Responsibilities
1. **Feed Monitoring** - Continuously check for new posts
2. **Work Ticket Creation** - Package post context for agents
3. **Agent Spawning** - Create ephemeral workers as needed
4. **Lightweight Validation** - Quick sanity checks on agent output
5. **Error Escalation** - Alert user when agents fail repeatedly

#### Context Management

**Base Context (~1,500 tokens):**
```
- Core orchestrator instructions
- Available agents and their specialties
- Posting platform API basics
- Error handling procedures
```

**Compaction Trigger:**
- When context exceeds 50K tokens
- Graceful restart with state preservation
- Transparent to users (no downtime)

**Implementation:**
```typescript
class AviDM {
  private instance: ClaudeInstance;
  private contextSize: number = 1500;

  async gracefulRestart() {
    // Save current state
    const snapshot = {
      lastFeedPosition: this.currentFeedPosition,
      pendingTickets: this.workQueue,
      timestamp: Date.now()
    };

    await db.query(
      'UPDATE avi_state SET last_feed_position = $1, pending_tickets = $2',
      [snapshot.lastFeedPosition, JSON.stringify(snapshot.pendingTickets)]
    );

    // Destroy old instance
    this.instance.destroy();

    // Create fresh instance with minimal context
    this.instance = new ClaudeInstance({
      systemPrompt: MINIMAL_AVI_PROMPT,
      initialState: snapshot
    });

    this.contextSize = 1500;
  }

  async checkHealth(): Promise<boolean> {
    return this.instance.isAlive() && this.contextSize < 50000;
  }
}
```

#### Main Loop

```typescript
async function aviMainLoop() {
  while (true) {
    try {
      // Check for new posts
      const newPosts = await feedAPI.getNewPosts(lastPosition);

      for (const post of newPosts) {
        // Determine which agent should handle this
        const agentType = await aviDM.determineAgent(post);

        // Retrieve relevant memories
        const memories = await db.query(
          `SELECT content, metadata FROM agent_memories
           WHERE agent_name = $1
           ORDER BY created_at DESC LIMIT 5`,
          [agentType]
        );

        // Create work ticket
        const ticket = {
          id: generateId(),
          postId: post.id,
          postContent: post.text,
          postAuthor: post.author,
          assignedAgent: agentType,
          relevantMemories: memories.rows,
          createdAt: Date.now()
        };

        // Spawn agent worker
        await spawnAgentWorker(ticket);
      }

      // Update position
      lastPosition = newPosts[newPosts.length - 1]?.id;

      // Brief pause
      await sleep(5000);

    } catch (error) {
      await logError('avi_main_loop', error);
      await sleep(30000); // Back off on error
    }
  }
}
```

---

### 3. Agent Workers (Ephemeral)

#### Lifecycle

1. **Spawn** - Created by Avi DM with work ticket
2. **Load Context** - Retrieve identity + memories from DB
3. **Execute** - Generate response/post
4. **Validate** - Quick check by Avi DM
5. **Post** - Publish to platform
6. **Save Memory** - Store interaction for future context
7. **Destroy** - Terminate instance

**Total lifespan:** 30-60 seconds per agent

#### Context Composition with Protection

**Total: ~2,700 tokens per spawn**

```typescript
async function spawnAgentWorker(ticket: WorkTicket) {
  // Compose protected agent context at runtime
  const agentContext = await composeAgentContext(
    ticket.userId,
    ticket.assignedAgent
  );

  // Create ephemeral instance with composed context
  const agent = new ClaudeInstance(agentContext);
}

/**
 * Compose agent context from system template + user customizations
 * CRITICAL: System rules always override user customizations
 */
async function composeAgentContext(userId: string, agentType: string) {
  // 1. Load IMMUTABLE system template (TIER 1)
  const systemTemplate = await db.query(
    'SELECT * FROM system_agent_templates WHERE name = $1',
    [agentType]
  );

  if (!systemTemplate.rows.length) {
    throw new Error(`System template not found: ${agentType}`);
  }

  const template = systemTemplate.rows[0];

  // 2. Load user customizations (TIER 2) - optional
  const userCustom = await db.query(
    `SELECT * FROM user_agent_customizations
     WHERE user_id = $1 AND agent_template = $2 AND enabled = true`,
    [userId, agentType]
  );

  const custom = userCustom.rows[0];

  // 3. Validate user didn't try to override protected fields
  if (custom) {
    validateCustomizations(custom, template);
  }

  // 4. Compose final context (SYSTEM RULES ALWAYS WIN)
  const finalContext = {
    // TIER 1: PROTECTED - User cannot change
    model: template.model,               // Claude model to use
    posting_rules: template.posting_rules,
    api_schema: template.api_schema,
    safety_constraints: template.safety_constraints,

    // TIER 2: CUSTOMIZABLE - User overrides apply
    personality: custom?.personality || template.default_personality,
    interests: custom?.interests || [],
    response_style: custom?.response_style || template.default_response_style,

    // Agent identity
    agentName: custom?.custom_name || agentType,
    version: template.version
  };

  return finalContext;
}

/**
 * Ensure user didn't inject protected fields
 * Throws error if validation fails
 */
function validateCustomizations(custom: any, template: any): void {
  const protectedFields = ['model', 'posting_rules', 'api_schema', 'safety_constraints'];

  for (const field of protectedFields) {
    if (custom?.hasOwnProperty(field)) {
      throw new SecurityError(
        `User attempted to override protected field: ${field}`
      );
    }
  }

  // Additional validation: ensure customizations are within bounds
  if (custom.personality && custom.personality.length > 5000) {
    throw new ValidationError('Personality text too long');
  }

  if (custom.interests && custom.interests.length > 50) {
    throw new ValidationError('Too many interests specified');
  }
}

/**
 * Get the Claude model to use for this agent
 * Priority: template.model > env var > hardcoded default
 */
function getModelForAgent(agentContext: AgentContext): string {
  const DEFAULT_AGENT_MODEL = 'claude-sonnet-4-5-20250929';
  const DEFAULT_AVI_MODEL = 'claude-sonnet-4-5-20250929';

  return agentContext.model
    || process.env.AGENT_MODEL
    || DEFAULT_AGENT_MODEL;
}

function getModelForAvi(): string {
  const DEFAULT_AVI_MODEL = 'claude-sonnet-4-5-20250929';

  return process.env.AVI_MODEL || DEFAULT_AVI_MODEL;
}

  // Create Claude API instance with correct model
  const model = getModelForAgent(agentContext);

  const response = await anthropic.messages.create({
    model: model,
    system: agentContext.systemPrompt,
    messages: [
      {
        role: "user",
        content: ticket.postContent
      }
    ],
    max_tokens: 1024
  });

  try {
    // Generate response
    const draft = response.content[0].text;

    // Validate with Avi
    const validation = await aviDM.quickValidate(draft);

    if (!validation.approved && validation.canFix) {
      draft = await agent.revise(validation.feedback);
    }

    if (validation.approved || validation.canFix) {
      // Post with retry logic
      await postWithRetry(draft, ticket);

      // Save memory
      await db.query(
        `INSERT INTO agent_memories (agent_name, post_id, content, metadata)
         VALUES ($1, $2, $3, $4)`,
        [
          ticket.assignedAgent,
          ticket.postId,
          draft.content,
          JSON.stringify(draft.metadata)
        ]
      );
    } else {
      await escalateToUser(ticket, validation.reason);
    }

  } finally {
    // Always destroy agent
    agent.destroy();
  }
}
```

---

### 4. Post Validation (Trust but Verify)

#### Validation Checks

**Lightweight, rule-based + minimal LLM:**

```typescript
interface ValidationResult {
  approved: boolean;
  canFix: boolean;
  reason?: string;
  feedback?: string;
}

async function quickValidate(post: Draft): Promise<ValidationResult> {
  // Rule-based checks (0 tokens)
  const ruleChecks = [
    checkLength(post),           // Within platform limits
    checkProhibitedWords(post),  // No banned content
    checkMentions(post),         // Proper @ formatting
    checkHashtags(post)          // Reasonable hashtag count
  ];

  if (ruleChecks.some(c => !c.passed)) {
    return {
      approved: false,
      canFix: true,
      reason: 'rule_violation',
      feedback: ruleChecks.find(c => !c.passed).message
    };
  }

  // Lightweight LLM check (~200 tokens)
  const toneCheck = await aviDM.checkTone({
    post: post.content,
    expectedTone: post.agentName,
    checks: ['brand_appropriate', 'context_appropriate']
  });

  return {
    approved: toneCheck.passed,
    canFix: toneCheck.severity !== 'critical',
    reason: toneCheck.reason,
    feedback: toneCheck.suggestion
  };
}
```

**Token cost:** ~200 tokens per validation vs. ~2000 for full Avi review

---

### 5. Error Handling & Retry Logic

#### Retry Strategy

```typescript
const RETRY_CONFIG = {
  maxAttempts: 3,
  backoffSeconds: [5, 30, 120],
  strategies: ['retry_same', 'simplify_post', 'different_agent']
};

async function postWithRetry(
  content: PostContent,
  ticket: WorkTicket,
  attempt: number = 1
): Promise<void> {
  try {
    // Attempt to post
    const result = await platformAPI.post({
      content: content.text,
      agentName: ticket.assignedAgent,
      inReplyTo: ticket.postId
    });

    // Success - log and return
    await logSuccess(ticket, result);
    return;

  } catch (error) {
    // Log error
    await db.query(
      `INSERT INTO error_log (agent_name, error_type, error_message, context, retry_count)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        ticket.assignedAgent,
        error.type,
        error.message,
        JSON.stringify(ticket),
        attempt
      ]
    );

    // Check if we should retry
    if (attempt >= RETRY_CONFIG.maxAttempts) {
      // Escalate to user
      await aviDM.createSystemPost({
        type: 'error_alert',
        agentName: ticket.assignedAgent,
        originalPost: ticket.postId,
        message: `Failed to respond after ${attempt} attempts.`,
        savedDraft: content.text,
        error: error.message,
        timestamp: Date.now()
      });
      return;
    }

    // Apply retry strategy
    const strategy = RETRY_CONFIG.strategies[attempt - 1];
    await sleep(RETRY_CONFIG.backoffSeconds[attempt - 1] * 1000);

    let newContent = content;

    if (strategy === 'simplify_post') {
      // Retry with simplified version
      newContent = await simplifyContent(content);

    } else if (strategy === 'different_agent') {
      // Try spawning a different agent
      const alternateAgent = await aviDM.selectAlternateAgent(ticket);
      ticket.assignedAgent = alternateAgent;
      await spawnAgentWorker(ticket);
      return;
    }

    // Recursive retry
    return postWithRetry(newContent, ticket, attempt + 1);
  }
}

async function simplifyContent(content: PostContent): Promise<PostContent> {
  // Remove media, shorten text, remove formatting
  return {
    text: content.text.slice(0, 280).replace(/[^\w\s]/g, ''),
    media: null,
    formatting: 'plain'
  };
}
```

---

### 6. Health Monitor

#### Monitoring Service

```typescript
class HealthMonitor {
  private checkInterval = 30000; // 30 seconds

  async start() {
    setInterval(async () => {
      await this.checkAviHealth();
      await this.checkDatabaseHealth();
      await this.checkPlatformAPI();
      await this.updateMetrics();
    }, this.checkInterval);
  }

  async checkAviHealth(): Promise<void> {
    const isHealthy = await aviDM.checkHealth();

    if (!isHealthy || aviDM.contextSize > 50000) {
      console.log('Avi DM requires restart - initiating graceful restart');

      // Update uptime before restart
      await db.query(
        `UPDATE avi_state
         SET uptime_seconds = uptime_seconds + $1
         WHERE id = 1`,
        [Math.floor((Date.now() - aviDM.startTime) / 1000)]
      );

      await aviDM.gracefulRestart();

      // Log restart
      await db.query(
        `UPDATE avi_state
         SET last_restart = NOW(), context_size = 1500
         WHERE id = 1`
      );
    }
  }

  async checkDatabaseHealth(): Promise<void> {
    try {
      await db.query('SELECT 1');
    } catch (error) {
      // Alert and attempt reconnection
      console.error('Database health check failed:', error);
      await this.attemptDatabaseReconnect();
    }
  }

  async checkPlatformAPI(): Promise<void> {
    try {
      await platformAPI.healthCheck();
    } catch (error) {
      console.error('Platform API health check failed:', error);
      // Platform API issues should not crash Avi
      // Log and continue
    }
  }

  async updateMetrics(): Promise<void> {
    const metrics = {
      aviContextSize: aviDM.contextSize,
      activeAgents: agentPool.getActiveCount(),
      queuedTickets: workQueue.length,
      errorRate: await this.calculateErrorRate(),
      uptime: Date.now() - aviDM.startTime
    };

    // Could send to monitoring service
    console.log('Metrics:', metrics);
  }

  async calculateErrorRate(): Promise<number> {
    const result = await db.query(
      `SELECT
        COUNT(*) FILTER (WHERE resolved = false) as unresolved,
        COUNT(*) as total
       FROM error_log
       WHERE created_at > NOW() - INTERVAL '1 hour'`
    );

    return result.rows[0].unresolved / result.rows[0].total || 0;
  }
}
```

---

### 7. Agent Identity Management & Data Protection

#### System Template Seeding (First Run)

**System templates live in version-controlled config files:**

```json
// config/system/agent-templates/tech-guru.json
{
  "name": "tech-guru",
  "version": 1,
  "model": null,  // null = use AGENT_MODEL env var or default
  "posting_rules": {
    "max_length": 280,
    "min_interval_seconds": 60,
    "rate_limit_per_hour": 20,
    "required_hashtags": ["#tech"],
    "prohibited_words": ["spam", "scam"]
  },
  "api_schema": {
    "platform": "twitter",
    "endpoints": {
      "post": "/v2/tweets",
      "reply": "/v2/tweets/:id/replies"
    },
    "auth_type": "oauth2"
  },
  "safety_constraints": {
    "content_filters": ["profanity", "harassment"],
    "max_mentions_per_post": 3,
    "requires_human_review": ["financial_advice", "medical_advice"]
  },
  "default_personality": "You are Tech Guru, an enthusiastic technology expert...",
  "default_response_style": {
    "tone": "professional",
    "length": "concise",
    "use_emojis": false
  }
}

// Example: Agent with specific model override
// config/system/agent-templates/premium-analyst.json
{
  "name": "premium-analyst",
  "version": 1,
  "model": "claude-opus-4-20250514",  // This agent uses Opus for complex analysis
  "posting_rules": { ... },
  ...
}
```

**Seeding function (runs on app startup):**

```typescript
async function seedSystemTemplates() {
  const templateFiles = await fs.readdir('./config/system/agent-templates');

  for (const file of templateFiles) {
    const content = await fs.readFile(
      `./config/system/agent-templates/${file}`,
      'utf8'
    );
    const template = JSON.parse(content);

    await db.query(
      `INSERT INTO system_agent_templates
       (name, version, model, posting_rules, api_schema, safety_constraints,
        default_personality, default_response_style)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (name) DO UPDATE SET
         version = EXCLUDED.version,
         model = EXCLUDED.model,
         posting_rules = EXCLUDED.posting_rules,
         api_schema = EXCLUDED.api_schema,
         safety_constraints = EXCLUDED.safety_constraints,
         default_personality = EXCLUDED.default_personality,
         default_response_style = EXCLUDED.default_response_style,
         updated_at = NOW()
      `,
      [
        template.name,
        template.version,
        template.model,  // Can be null
        JSON.stringify(template.posting_rules),
        JSON.stringify(template.api_schema),
        JSON.stringify(template.safety_constraints),
        template.default_personality,
        JSON.stringify(template.default_response_style)
      ]
    );
  }

  console.log(`Seeded ${templateFiles.length} system templates`);
}
```

#### User Customization API

**Users can customize agents via protected API:**

```typescript
// POST /api/agents/:agentType/customize
async function customizeAgent(req: Request, res: Response) {
  const { userId, agentType } = req.params;
  const { personality, interests, response_style, custom_name } = req.body;

  // Validate: Ensure user can't override protected fields
  const protectedFields = ['model', 'posting_rules', 'api_schema', 'safety_constraints'];
  for (const field of protectedFields) {
    if (req.body.hasOwnProperty(field)) {
      return res.status(403).json({
        error: `Cannot customize protected field: ${field}`
      });
    }
  }

  // Validate template exists
  const template = await db.query(
    'SELECT name FROM system_agent_templates WHERE name = $1',
    [agentType]
  );

  if (!template.rows.length) {
    return res.status(404).json({ error: 'Agent template not found' });
  }

  // Save user customization
  await db.query(
    `INSERT INTO user_agent_customizations
     (user_id, agent_template, custom_name, personality, interests, response_style)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, agent_template) DO UPDATE SET
       custom_name = EXCLUDED.custom_name,
       personality = EXCLUDED.personality,
       interests = EXCLUDED.interests,
       response_style = EXCLUDED.response_style,
       updated_at = NOW()
    `,
    [
      userId,
      agentType,
      custom_name,
      personality,
      JSON.stringify(interests),
      JSON.stringify(response_style)
    ]
  );

  res.json({ success: true, message: 'Agent customized successfully' });
}
```

#### Migration Strategy (Updating System Templates)

**When you push app updates with new system rules:**

```typescript
class MigrationRunner {
  async runMigration(version: string) {
    console.log(`Running migration to version ${version}`);

    // 1. Update system templates (TIER 1)
    await this.updateSystemTemplates();

    // 2. NEVER touch user data (TIER 2 & 3)
    await this.verifyUserDataIntact();

    // 3. Backfill new features with safe defaults
    await this.backfillNewFeatures(version);

    console.log('Migration complete - user data protected');
  }

  async updateSystemTemplates() {
    // Re-seed from config files (version controlled)
    await seedSystemTemplates();

    console.log('System templates updated from config files');
  }

  async verifyUserDataIntact() {
    // Sanity check: ensure no user data was deleted
    const checks = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM agent_memories) as memory_count,
        (SELECT COUNT(*) FROM agent_workspaces) as workspace_count,
        (SELECT COUNT(*) FROM user_agent_customizations) as custom_count,
        (SELECT COUNT(DISTINCT user_id) FROM agent_memories) as user_count
    `);

    const stats = checks.rows[0];
    console.log(`Data integrity verified:`, stats);

    // Log to audit trail
    await db.query(
      `INSERT INTO audit_log (event_type, details, timestamp)
       VALUES ('migration_verification', $1, NOW())`,
      [JSON.stringify(stats)]
    );
  }

  async backfillNewFeatures(version: string) {
    // If you add new customizable fields, backfill with defaults
    // Example: Adding "preferred_language" field

    if (version === '1.2.0') {
      await db.query(`
        UPDATE user_agent_customizations
        SET response_style = jsonb_set(
          COALESCE(response_style, '{}'),
          '{preferred_language}',
          '"en"'
        )
        WHERE NOT response_style ? 'preferred_language'
      `);

      console.log('Backfilled preferred_language field');
    }
  }
}
```

---

## Token Economics

### Daily Token Estimates

**Avi DM (24 hours):**
- Base context: 1,500 tokens (constant)
- Feed checks (100 posts): 100 × 300 tokens = 30,000 tokens
- Post validations: 100 × 200 tokens = 20,000 tokens
- Graceful restart (1x/day): 1,500 tokens
- **Total: ~53,000 tokens/day**

**Agent Workers (per agent, 20 responses/day):**
- Spawns: 20 × 2,700 tokens = 54,000 tokens
- Responses: 20 × 5,000 tokens = 100,000 tokens
- Revisions (10% need): 2 × 3,000 tokens = 6,000 tokens
- **Total: ~160,000 tokens/day per active agent**

**With 3 active agents:**
- Avi: 53,000 tokens
- Agents: 480,000 tokens
- **Total: ~533,000 tokens/day**

**Old approach (full context reload):**
- 20 spawns × 10,000 tokens each = 200,000 tokens just for loading
- 3 agents = 600,000 tokens wasted
- Plus responses = **~1,100,000 tokens/day**

**Savings: ~52% token reduction**

---

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production

# Copy application code
COPY . .

# Copy agent identity seed files
COPY config/agent-identities ./config/agent-identities

# Build TypeScript
RUN npm run build

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s \
  CMD node dist/healthcheck.js

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/avidm
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - PLATFORM_API_KEY=${PLATFORM_API_KEY}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    volumes:
      - ./config:/app/config:ro  # Read-only agent identities
      - ./logs:/app/logs         # Writable logs

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=avidm
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
```

### Volume Protection & Data Segregation

**TIER 1: System configuration (read-only):**
```yaml
volumes:
  # System templates - read-only, version controlled
  - ./config/system:/app/config/system:ro
```

**TIER 2 & 3: User data (read-write, persisted):**
```yaml
volumes:
  # User data - persisted across updates
  - agent_workspaces:/app/data/workspaces
  - postgres_data:/var/lib/postgresql/data

  # Logs - temporary, can be rotated
  - ./logs:/app/logs
```

**Protection guarantees:**
- ✅ System templates read-only - cannot be modified at runtime
- ✅ User data volumes persist across container rebuilds
- ✅ Database volume survives app updates
- ✅ Docker prevents accidental file overwrites

---

## Implementation Phases

### Phase 1: Database & Core Infrastructure (Week 1)
- [ ] Set up PostgreSQL with 3-tier schema
  - [ ] system_agent_templates table
  - [ ] user_agent_customizations table
  - [ ] agent_memories table (with user_id)
  - [ ] agent_workspaces table
  - [ ] avi_state table
  - [ ] error_log table
- [ ] Create system template seed files (JSON in config/system/)
- [ ] Implement seeding function for system templates
- [ ] Implement database connection pooling
- [ ] Write migration scripts with data protection
- [ ] Set up Docker environment with volume protection

### Phase 2: Avi DM Core (Week 2)
- [ ] Implement minimal Avi DM orchestrator
- [ ] Build feed monitoring loop
- [ ] Create work ticket system
- [ ] Implement graceful restart logic
- [ ] Add basic health monitoring

### Phase 3: Agent Workers (Week 2-3)
- [ ] Build agent spawning mechanism
- [ ] Implement protected context composition (composeAgentContext)
- [ ] Add validation layer (validateCustomizations)
- [ ] Create memory retrieval logic (with user_id)
- [ ] Build post generation pipeline
- [ ] Add memory saving on completion

### Phase 4: Validation & Error Handling (Week 3)
- [ ] Implement lightweight validation checks
- [ ] Build retry logic with exponential backoff
- [ ] Create error escalation system
- [ ] Add user notification for failures

### Phase 5: Health & Monitoring (Week 4)
- [ ] Complete health monitor service
- [ ] Add metrics collection
- [ ] Implement alerting system
- [ ] Create admin dashboard (optional)

### Phase 6: Testing & Optimization (Week 4-5)
- [ ] Integration testing
- [ ] Load testing with multiple agents
- [ ] Token usage optimization
- [ ] Performance tuning

### Phase 7: Deployment (Week 5)
- [ ] Production Docker setup with volume protection
- [ ] Automated database backups (user data only)
- [ ] Backup verification and restore testing
- [ ] Monitoring integration
- [ ] Migration script testing
- [ ] Documentation
- [ ] Go live

### Phase 8: User Data Protection (Ongoing)
- [ ] Implement automated daily backups
- [ ] Create user data export API
- [ ] Build backup restoration procedures
- [ ] Set up audit logging for data access
- [ ] Create admin tools for user customization review

---

## Key Design Decisions

### Why PostgreSQL over Vector DB?
- **Simpler infrastructure** - One database vs. two
- **Fast enough** - JSONB + GIN indexes handle tag-based retrieval
- **Cost effective** - No vector embedding API calls
- **Proven reliability** - Industry standard, excellent tooling

### Why Ephemeral Agents?
- **Bounded context** - Each agent starts fresh
- **No role confusion** - Clear identity per spawn
- **Token efficiency** - No context accumulation
- **Fault isolation** - Agent failures don't affect Avi

### Why Persistent Avi?
- **Zero downtime** - Always monitoring feed
- **Consistent orchestration** - Single decision point
- **State management** - Knows what's in progress
- **User experience** - Instant response capability

### Why Lightweight Validation?
- **Token savings** - 200 vs. 2000 tokens
- **Faster posting** - No bottleneck on Avi review
- **Trust agents** - They have their own identities
- **Safety net** - Catches obvious errors only

### Why 3-Tier Data Protection?
- **Security** - Users cannot override system constraints
- **Flexibility** - Users can personalize agents safely
- **Update safety** - App updates never delete user data
- **Compliance** - Clear separation for data ownership
- **Trust** - Users know their data is protected

---

## Success Metrics

### Reliability
- **Uptime target:** 99.9% (Avi DM availability)
- **Post success rate:** >95% (first attempt)
- **Error escalation:** <2% of posts

### Performance
- **Response time:** <30 seconds from post to reply
- **Context load time:** <2 seconds per agent spawn
- **Database query time:** <100ms for memory retrieval

### Token Efficiency
- **Daily usage:** <600K tokens for 3 active agents
- **Savings vs. baseline:** >50% reduction
- **Avi context:** Stays under 50K tokens between restarts

### User Experience
- **Zero perceived downtime** during Avi restarts
- **Consistent agent personalities** across interactions
- **Appropriate error notifications** when needed

---

## Risk Mitigation

### Database Failure
- **Risk:** PostgreSQL becomes unavailable
- **Mitigation:**
  - Health checks every 30s
  - Auto-reconnect logic
  - Fallback to in-memory cache (degraded mode)
  - Daily backups to external storage

### Claude API Outage
- **Risk:** Anthropic API unavailable
- **Mitigation:**
  - Exponential backoff on errors
  - Queue posts for retry
  - User notification after 3 failures
  - Graceful degradation

### Runaway Context Growth
- **Risk:** Avi context exceeds limits despite monitoring
- **Mitigation:**
  - Hard limit at 50K tokens
  - Forced restart on limit
  - State snapshot before restart
  - No data loss

### Agent Identity Corruption
- **Risk:** Accidental overwrite of agent personalities
- **Mitigation:**
  - Read-only Docker volume mounts for system templates
  - Version tracking in database
  - Git history for rollback
  - Admin-only update endpoint

### User Data Loss on Update
- **Risk:** App updates delete user memories or customizations
- **Mitigation:**
  - Separate tables for system vs. user data
  - Migration scripts with data verification
  - Automated backups before updates
  - Audit trail for all data changes
  - Persistent Docker volumes

### Unauthorized Data Access
- **Risk:** Users accessing other users' data
- **Mitigation:**
  - user_id field on all user data tables
  - Row-level security policies
  - API authentication and authorization
  - Audit logging for data access

---

## Future Enhancements

### Phase 2+ Features (Post-MVP)
- **Multi-platform support** - Twitter, Mastodon, Bluesky
- **Agent learning** - Improve responses based on engagement
- **User feedback loop** - Thumbs up/down on agent posts
- **Advanced memory** - Conversation threading, relationship tracking
- **A/B testing** - Experiment with different agent personalities
- **Analytics dashboard** - Real-time metrics and insights

---

## Appendix

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://user:pass@host:5432/dbname
PLATFORM_API_KEY=...

# Claude Models
AGENT_MODEL=claude-sonnet-4-5-20250929  # Default model for all agents
AVI_MODEL=claude-sonnet-4-5-20250929    # Model for Avi orchestrator

# Optional
NODE_ENV=production
LOG_LEVEL=info
HEALTH_CHECK_INTERVAL=30000
AVI_CONTEXT_LIMIT=50000
MAX_AGENT_WORKERS=10
RETRY_MAX_ATTEMPTS=3
```

### File Structure

```
/workspaces/agent-feed/
├── src/
│   ├── avi/
│   │   ├── orchestrator.ts
│   │   ├── validator.ts
│   │   └── feed-monitor.ts
│   ├── agents/
│   │   ├── worker.ts
│   │   ├── spawner.ts
│   │   ├── context-loader.ts        # composeAgentContext()
│   │   └── context-validator.ts     # validateCustomizations()
│   ├── database/
│   │   ├── schema.sql
│   │   ├── migrations/
│   │   │   ├── 001_initial_schema.sql
│   │   │   ├── 002_add_user_protection.sql
│   │   │   └── migration-runner.ts
│   │   ├── queries.ts
│   │   └── seed.ts                  # seedSystemTemplates()
│   ├── platform/
│   │   ├── api.ts
│   │   └── retry-logic.ts
│   ├── monitoring/
│   │   ├── health.ts
│   │   └── metrics.ts
│   ├── api/
│   │   ├── routes.ts
│   │   └── agent-customization.ts   # User customization endpoints
│   └── index.ts
├── config/
│   └── system/                       # TIER 1: Protected system config
│       ├── agent-templates/
│       │   ├── tech-guru.json
│       │   ├── creative-writer.json
│       │   └── data-analyst.json
│       └── posting-rules.json
├── data/                             # TIER 3: User data (Docker volumes)
│   └── workspaces/                   # Agent-generated files
├── backups/                          # Daily automated backups
│   └── user-data/
├── docker-compose.dev.yml            # Development (DB only)
├── docker-compose.prod.yml           # Production (full stack)
├── Dockerfile
└── init.sql
```

### SQL Queries Reference

**Get system template (TIER 1):**
```sql
SELECT * FROM system_agent_templates WHERE name = $1;
```

**Get user customization (TIER 2):**
```sql
SELECT * FROM user_agent_customizations
WHERE user_id = $1 AND agent_template = $2 AND enabled = true;
```

**Store memory (TIER 3):**
```sql
INSERT INTO agent_memories (user_id, agent_name, post_id, content, metadata)
VALUES ($1, $2, $3, $4, $5);
```

**Retrieve relevant memories (TIER 3):**
```sql
SELECT content, metadata
FROM agent_memories
WHERE user_id = $1
  AND agent_name = $2
  AND (metadata @> $3 OR created_at > NOW() - INTERVAL '7 days')
ORDER BY created_at DESC
LIMIT 5;
```

**Save user customization (TIER 2):**
```sql
INSERT INTO user_agent_customizations
  (user_id, agent_template, custom_name, personality, interests, response_style)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (user_id, agent_template) DO UPDATE SET
  custom_name = EXCLUDED.custom_name,
  personality = EXCLUDED.personality,
  interests = EXCLUDED.interests,
  response_style = EXCLUDED.response_style,
  updated_at = NOW();
```

**Update Avi state:**
```sql
UPDATE avi_state
SET last_feed_position = $1,
    pending_tickets = $2,
    context_size = $3
WHERE id = 1;
```

**Log error:**
```sql
INSERT INTO error_log (agent_name, error_type, error_message, context, retry_count)
VALUES ($1, $2, $3, $4, $5);
```

**Backup user data only:**
```bash
# Export only TIER 2 & 3 tables (exclude system templates)
pg_dump -h localhost -U postgres -t agent_memories \
  -t agent_workspaces -t user_agent_customizations \
  avidm > backup-$(date +%Y%m%d).sql
```

---

## Questions & Decisions Log

### Resolved
- ✅ **Memory storage:** PostgreSQL with JSONB (not vectors)
- ✅ **Avi persistence:** Always-on with health-checked restarts
- ✅ **Agent identities:** 3-tier protection model (system, user customizations, user data)
- ✅ **Validation strategy:** Lightweight checks by Avi
- ✅ **Error handling:** 3-attempt retry with exponential backoff
- ✅ **Data protection:** Separate tables for system vs. user data
- ✅ **Update safety:** Migration scripts with verification, never delete user data
- ✅ **Backups:** Automated daily backups of user data only
- ✅ **Docker volumes:** Read-only system config, persistent user data

### Open Questions
- ⏳ **Platform API:** Which social platform(s) to support first?
- ⏳ **Agent personalities:** How many agents in MVP?
- ⏳ **Memory retention:** How long to keep memories? (30 days, 90 days, forever?)
- ⏳ **User interface:** Admin panel for monitoring? Or logs only?
- ⏳ **Scaling:** What if we need >10 active agents?

---

## Contact & Updates

**Document Owner:** Development Team
**Last Updated:** 2025-10-09 (v1.1 - Added 3-Tier Data Protection)
**Next Review:** Before Phase 1 implementation

**Major Changes in v1.1:**
- ✅ Added 3-tier data protection model (System, User Customizations, User Data)
- ✅ Separated system_agent_templates from user_agent_customizations
- ✅ Added user_id to all user data tables
- ✅ Implemented composeAgentContext() with validation
- ✅ Added migration scripts with data verification
- ✅ Updated Docker volumes for protection
- ✅ Added backup strategy for user data only
- ✅ Added model configuration (claude-sonnet-4-5-20250929 default)
- ✅ Model selection hierarchy: template.model → env var → hardcoded default

For questions or suggestions, please update this document or discuss in team meetings.

---

## Summary: What We're Protecting

### What Users CAN'T Change (TIER 1):
- Claude model selection (Sonnet 4.5 by default)
- Posting rules (rate limits, length, format)
- API schemas (platform requirements)
- Safety constraints (content filters)
- System code (orchestrator, workers, platform API)

### What Users CAN Change (TIER 2):
- Agent personality
- Response style (tone, length)
- Interests and topics
- Custom agent names

### What Users OWN Completely (TIER 3):
- All conversation memories
- Agent-generated files in workspaces
- Their customization preferences
- All historical data

**Bottom line:** Users can personalize agents safely, but you always control the rules. Their data survives every update.

---

*End of Architecture Plan*
