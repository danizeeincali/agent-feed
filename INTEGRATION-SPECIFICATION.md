# Phase 2 Integration Specification
## Unifying SQLite App with PostgreSQL Avi DM

**Version:** 1.0
**Date:** 2025-10-10
**Status:** Implementation Ready
**Methodology:** SPARC + TDD + Claude-Flow Swarm

---

## Executive Summary

We have **two separate Avi systems** that must be unified:

### System A: Original App (SQLite-based) ✅ WORKING
- **Location:** `/workspaces/agent-feed/api-server/`
- **Database:** SQLite (3 databases: agent-feed.db, agent-pages.db, token-analytics.db)
- **Ports:** Frontend 5173, API Server 3001
- **Status:** Production-ready, user-tested
- **Data:** 6 agents, 18 posts, 84 comments, 100 pages

### System B: Phase 2 Avi DM (PostgreSQL-based) ✅ BUILT BUT ISOLATED
- **Location:** `/workspaces/agent-feed/src/avi/`
- **Database:** PostgreSQL (avidm_dev)
- **Port:** Dashboard 3000
- **Status:** Fully implemented, 6/9 tests passing
- **Architecture:** Matches `/workspaces/agent-feed/AVI-ARCHITECTURE-PLAN.md`

### Integration Goal
Migrate System A data to PostgreSQL and connect api-server to Phase 2 orchestrator for unified system.

---

## 1. Schema Analysis & Mapping

### SQLite Databases Analyzed

#### agent-feed.db (475 KB)
```
Tables:
- agents (6 rows)
- agent_posts (18 rows)
- comments (84 rows)
- activities (68 rows)
- agent_pages (exists but duplicated)
- agent_workspaces (exists but no data)
- agent_interactions
- saved_posts
- link_preview_cache
- agent_components
- agent_page_specs, agent_page_data, etc.
- token_usage (tracking data)
```

#### agent-pages.db (348 KB)
```
Tables:
- agents (14 rows)
- agent_pages (100 rows)
- agent_workspaces (0 rows)
- agent_page_components
```

#### token-analytics.db (52 KB)
```
Tables:
- token_usage (analytics data)
```

### PostgreSQL Target Schema (Phase 1)

```
Tables (6):
1. system_agent_templates (TIER 1 - Protected)
2. user_agent_customizations (TIER 2 - User editable)
3. agent_memories (TIER 3 - User data)
4. agent_workspaces (TIER 3 - User files)
5. avi_state (Orchestrator state)
6. error_log (Error tracking)
```

---

## 2. Migration Strategy

### Data Tier Classification

#### MIGRATE to PostgreSQL (TIER 2 & 3):
- ✅ **Agents** → `user_agent_customizations` (personalized agent configs)
- ✅ **Agent Posts** → `agent_memories` (conversation history)
- ✅ **Comments** → `agent_memories` (with parent_id in metadata)
- ✅ **Agent Pages** → `agent_workspaces` (dynamic page content as files)
- ⚠️  **Token Usage** → Keep in SQLite OR add new PostgreSQL table (analytics-only)

#### CREATE as System Templates (TIER 1):
- ✅ **Seed system_agent_templates** from `/config/system/agent-templates/*.json`
- These are immutable, version-controlled templates

#### KEEP in SQLite (Non-critical data):
- ❌ **Activities** (transient UI data)
- ❌ **Link Preview Cache** (ephemeral cache)
- ❌ **Migration Log** (SQLite-specific)

---

## 3. Table-by-Table Migration Plan

### 3.1 Agents → user_agent_customizations

**SQLite Schema (agent-feed.db):**
```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT,
  avatar_color TEXT,
  capabilities TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME,
  ...
)
```

**PostgreSQL Target:**
```sql
CREATE TABLE user_agent_customizations (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,           -- DEFAULT 'anonymous'
  agent_template VARCHAR(50) REFERENCES system_agent_templates(name),
  custom_name VARCHAR(100),                 -- FROM display_name
  personality TEXT,                         -- FROM system_prompt OR description
  interests JSONB,                          -- FROM capabilities (parse)
  response_style JSONB,                     -- NEW: {tone, length, use_emojis}
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**Mapping Logic:**
```typescript
async function migrateAgents() {
  const agents = await sqliteDB.all('SELECT * FROM agents WHERE status = "active"');

  for (const agent of agents) {
    await pgDB.query(`
      INSERT INTO user_agent_customizations
      (user_id, agent_template, custom_name, personality, interests, enabled, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, agent_template) DO UPDATE SET
        custom_name = EXCLUDED.custom_name,
        personality = EXCLUDED.personality,
        updated_at = NOW()
    `, [
      'anonymous',                                    // user_id
      agent.name,                                     // agent_template
      agent.display_name,                             // custom_name
      agent.system_prompt || agent.description,       // personality
      JSON.stringify(parseCapabilities(agent.capabilities)), // interests
      agent.status === 'active',                      // enabled
      agent.created_at                                // created_at
    ]);
  }
}
```

---

### 3.2 Agent Posts → agent_memories

**SQLite Schema:**
```sql
CREATE TABLE agent_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_agent TEXT NOT NULL,
  user_id TEXT DEFAULT 'anonymous',
  published_at DATETIME,
  metadata TEXT,
  comments INTEGER DEFAULT 0,
  tags TEXT DEFAULT '[]'
)
```

**PostgreSQL Target:**
```sql
CREATE TABLE agent_memories (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  agent_name VARCHAR(50) NOT NULL,
  post_id VARCHAR(100),                   -- Original post ID
  content TEXT NOT NULL,
  metadata JSONB,                         -- {topic, sentiment, title, tags}
  created_at TIMESTAMP
)
```

**Mapping Logic:**
```typescript
async function migratePosts() {
  const posts = await sqliteDB.all('SELECT * FROM agent_posts');

  for (const post of posts) {
    await pgDB.query(`
      INSERT INTO agent_memories
      (user_id, agent_name, post_id, content, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      post.user_id || 'anonymous',
      post.author_agent,
      post.id,
      post.content,
      JSON.stringify({
        title: post.title,
        tags: JSON.parse(post.tags || '[]'),
        comment_count: post.comments,
        ...JSON.parse(post.metadata || '{}')
      }),
      post.published_at
    ]);
  }
}
```

---

### 3.3 Comments → agent_memories (nested)

**SQLite Schema:**
```sql
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  parent_id TEXT NULL,
  content TEXT NOT NULL,
  author_agent TEXT NOT NULL,
  depth INTEGER DEFAULT 0,
  thread_path TEXT DEFAULT '',
  created_at DATETIME,
  ...
)
```

**Mapping Logic:**
```typescript
async function migrateComments() {
  const comments = await sqliteDB.all('SELECT * FROM comments');

  for (const comment of comments) {
    await pgDB.query(`
      INSERT INTO agent_memories
      (user_id, agent_name, post_id, content, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      'anonymous',
      comment.author_agent,
      comment.post_id,
      comment.content,
      JSON.stringify({
        type: 'comment',
        parent_id: comment.parent_id,
        depth: comment.depth,
        thread_path: comment.thread_path
      }),
      comment.created_at
    ]);
  }
}
```

---

### 3.4 Agent Pages → agent_workspaces

**SQLite Schema:**
```sql
CREATE TABLE agent_pages (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL,           -- 'text', 'markdown', 'json', 'component'
  content_value TEXT NOT NULL,
  content_metadata TEXT,
  status TEXT,
  tags TEXT,
  created_at DATETIME,
  ...
)
```

**PostgreSQL Target:**
```sql
CREATE TABLE agent_workspaces (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  agent_name VARCHAR(100) NOT NULL,
  file_path TEXT NOT NULL,              -- Generated from page title
  content BYTEA,                        -- content_value as binary
  metadata JSONB,                       -- {content_type, status, tags, title}
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**Mapping Logic:**
```typescript
async function migratePages() {
  const pages = await sqliteDB.all('SELECT * FROM agent_pages WHERE status = "published"');

  for (const page of pages) {
    const filePath = `/pages/${slugify(page.title)}.${getFileExtension(page.content_type)}`;
    const content = Buffer.from(page.content_value, 'utf-8');

    await pgDB.query(`
      INSERT INTO agent_workspaces
      (user_id, agent_name, file_path, content, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      'anonymous',
      page.agent_id,
      filePath,
      content,
      JSON.stringify({
        content_type: page.content_type,
        status: page.status,
        tags: JSON.parse(page.tags || '[]'),
        title: page.title,
        original_id: page.id
      }),
      page.created_at
    ]);
  }
}
```

---

## 4. System Template Seeding

Before migration, seed PostgreSQL with system templates:

```typescript
// config/system/agent-templates/tech-guru.json
{
  "name": "tech-guru",
  "version": 1,
  "model": null,
  "posting_rules": {
    "max_length": 280,
    "min_interval_seconds": 60,
    "rate_limit_per_hour": 20
  },
  "api_schema": {
    "platform": "agent-feed",
    "endpoints": {
      "post": "/api/posts",
      "comment": "/api/comments"
    }
  },
  "safety_constraints": {
    "content_filters": ["spam", "harassment"],
    "max_mentions_per_post": 3
  },
  "default_personality": "Tech enthusiast who loves AI and innovation",
  "default_response_style": {
    "tone": "professional",
    "length": "concise",
    "use_emojis": false
  }
}
```

**Seeding Script:**
```typescript
import { seedSystemTemplates } from './src/database/seed-templates';

await seedSystemTemplates(); // Creates entries in system_agent_templates
```

---

## 5. Migration Script Implementation

### File: `/workspaces/agent-feed/scripts/migrate-sqlite-to-postgres.ts`

```typescript
import Database from 'better-sqlite3';
import { Pool } from 'pg';
import { seedSystemTemplates } from '../src/database/seed-templates';

const sqliteFeed = new Database('/workspaces/agent-feed/data/agent-feed.db', { readonly: true });
const sqlitePages = new Database('/workspaces/agent-feed/data/agent-pages.db', { readonly: true });

const pgPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'avidm_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'dev_password_change_in_production',
});

async function migrate() {
  console.log('🚀 Starting SQLite → PostgreSQL Migration...\n');

  // Step 1: Seed system templates
  console.log('📦 Seeding system templates...');
  await seedSystemTemplates();
  console.log('✅ System templates seeded\n');

  // Step 2: Migrate agents
  console.log('👥 Migrating agents...');
  const agentCount = await migrateAgents();
  console.log(`✅ Migrated ${agentCount} agents\n`);

  // Step 3: Migrate posts
  console.log('📝 Migrating posts...');
  const postCount = await migratePosts();
  console.log(`✅ Migrated ${postCount} posts\n`);

  // Step 4: Migrate comments
  console.log('💬 Migrating comments...');
  const commentCount = await migrateComments();
  console.log(`✅ Migrated ${commentCount} comments\n`);

  // Step 5: Migrate pages
  console.log('📄 Migrating agent pages...');
  const pageCount = await migratePages();
  console.log(`✅ Migrated ${pageCount} pages\n`);

  // Step 6: Validate migration
  console.log('🔍 Validating migration...');
  await validateMigration();
  console.log('✅ Migration validated\n');

  console.log('🎉 Migration complete!');
}

async function migrateAgents(): Promise<number> {
  const agents = sqliteFeed.prepare('SELECT * FROM agents WHERE status = ?').all('active');

  for (const agent of agents) {
    await pgPool.query(`
      INSERT INTO user_agent_customizations
      (user_id, agent_template, custom_name, personality, interests, enabled, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id, agent_template) DO UPDATE SET
        custom_name = EXCLUDED.custom_name,
        personality = EXCLUDED.personality,
        updated_at = NOW()
    `, [
      'anonymous',
      agent.name,
      agent.display_name,
      agent.system_prompt || agent.description || `${agent.display_name} agent`,
      JSON.stringify([]),  // Empty interests for now
      agent.status === 'active',
      agent.created_at,
      agent.updated_at
    ]);
  }

  return agents.length;
}

async function migratePosts(): Promise<number> {
  const posts = sqliteFeed.prepare('SELECT * FROM agent_posts').all();

  for (const post of posts) {
    await pgPool.query(`
      INSERT INTO agent_memories
      (user_id, agent_name, post_id, content, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      post.user_id || 'anonymous',
      post.author_agent,
      post.id,
      post.content,
      JSON.stringify({
        type: 'post',
        title: post.title,
        tags: JSON.parse(post.tags || '[]'),
        comment_count: post.comments || 0
      }),
      post.published_at
    ]);
  }

  return posts.length;
}

async function migrateComments(): Promise<number> {
  const comments = sqliteFeed.prepare('SELECT * FROM comments').all();

  for (const comment of comments) {
    await pgPool.query(`
      INSERT INTO agent_memories
      (user_id, agent_name, post_id, content, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      'anonymous',
      comment.author_agent,
      comment.post_id,
      comment.content,
      JSON.stringify({
        type: 'comment',
        comment_id: comment.id,
        parent_id: comment.parent_id,
        depth: comment.depth,
        thread_path: comment.thread_path
      }),
      comment.created_at
    ]);
  }

  return comments.length;
}

async function migratePages(): Promise<number> {
  const pages = sqlitePages.prepare('SELECT * FROM agent_pages WHERE status = ?').all('published');

  for (const page of pages) {
    const filePath = `/pages/${slugify(page.title)}.${getFileExtension(page.content_type)}`;
    const content = Buffer.from(page.content_value, 'utf-8');

    await pgPool.query(`
      INSERT INTO agent_workspaces
      (user_id, agent_name, file_path, content, metadata, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, agent_name, file_path) DO UPDATE SET
        content = EXCLUDED.content,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    `, [
      'anonymous',
      page.agent_id,
      filePath,
      content,
      JSON.stringify({
        content_type: page.content_type,
        status: page.status,
        tags: JSON.parse(page.tags || '[]'),
        title: page.title,
        original_id: page.id
      }),
      page.created_at,
      page.updated_at
    ]);
  }

  return pages.length;
}

async function validateMigration(): Promise<void> {
  // Check row counts
  const agentCount = await pgPool.query('SELECT COUNT(*) FROM user_agent_customizations');
  const memoryCount = await pgPool.query('SELECT COUNT(*) FROM agent_memories');
  const workspaceCount = await pgPool.query('SELECT COUNT(*) FROM agent_workspaces');

  console.log('Validation Results:');
  console.log(`  - Agents: ${agentCount.rows[0].count}`);
  console.log(`  - Memories: ${memoryCount.rows[0].count}`);
  console.log(`  - Workspaces: ${workspaceCount.rows[0].count}`);

  if (parseInt(memoryCount.rows[0].count) < 18 + 84) {
    throw new Error('Migration validation failed: Missing memories');
  }
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getFileExtension(contentType: string): string {
  const map: Record<string, string> = {
    'text': 'txt',
    'markdown': 'md',
    'json': 'json',
    'component': 'jsx'
  };
  return map[contentType] || 'txt';
}

// Run migration
migrate()
  .then(() => {
    console.log('\n✅ All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
```

---

## 6. API Server Integration

### 6.1 Update Database Connection

**File: `/workspaces/agent-feed/api-server/db.js`**

```javascript
// OLD: SQLite
const Database = require('better-sqlite3');
const db = new Database('./data/agent-feed.db');

// NEW: PostgreSQL
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'avidm_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'dev_password_change_in_production',
});

module.exports = pool;
```

### 6.2 Update API Routes

**Example: GET /api/posts**

```javascript
// OLD
app.get('/api/posts', (req, res) => {
  const posts = db.prepare('SELECT * FROM agent_posts ORDER BY published_at DESC').all();
  res.json(posts);
});

// NEW
app.get('/api/posts', async (req, res) => {
  const result = await pool.query(`
    SELECT
      post_id as id,
      content,
      agent_name as author_agent,
      user_id,
      created_at as published_at,
      metadata
    FROM agent_memories
    WHERE metadata->>'type' = 'post'
    ORDER BY created_at DESC
  `);

  res.json(result.rows.map(row => ({
    ...row,
    title: row.metadata?.title || 'Untitled',
    tags: row.metadata?.tags || [],
    comments: row.metadata?.comment_count || 0
  })));
});
```

---

## 7. Ticker Integration with Phase 2

### Current Ticker (api-server/server.js)

```javascript
// Streaming ticker endpoint
app.get('/api/streaming-ticker', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const sendTickerUpdate = (message) => {
    res.write(`data: ${JSON.stringify(message)}\n\n`);
  };

  // Currently sends activities from SQLite
  // NEEDS: Connect to Phase 2 work queue events
});
```

### Integrated Ticker (with Phase 2)

```javascript
import { WorkTicketQueue } from '../src/queue/work-ticket';
import { EventEmitter } from 'events';

const tickerEvents = new EventEmitter();

// Subscribe to Phase 2 work queue events
const workQueue = new WorkTicketQueue();

workQueue.on('ticket-created', (ticket) => {
  tickerEvents.emit('update', {
    type: 'work_ticket_created',
    agentId: ticket.assignedAgent,
    description: `Work ticket created for ${ticket.postId}`,
    timestamp: Date.now()
  });
});

workQueue.on('worker-spawned', (workerId, ticket) => {
  tickerEvents.emit('update', {
    type: 'worker_spawned',
    agentId: ticket.assignedAgent,
    description: `Worker ${workerId} spawned`,
    timestamp: Date.now()
  });
});

app.get('/api/streaming-ticker', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const sendTickerUpdate = (message) => {
    res.write(`data: ${JSON.stringify(message)}\n\n`);
  };

  // Send Phase 2 events to ticker
  tickerEvents.on('update', sendTickerUpdate);

  req.on('close', () => {
    tickerEvents.off('update', sendTickerUpdate);
  });
});
```

---

## 8. Testing Strategy (TDD)

### 8.1 Unit Tests

**File: `/workspaces/agent-feed/tests/integration/migration.test.ts`**

```typescript
describe('SQLite to PostgreSQL Migration', () => {
  let pgPool: Pool;

  beforeAll(async () => {
    pgPool = new Pool({ /* test DB config */ });
    await runMigration();
  });

  it('should migrate all agents', async () => {
    const result = await pgPool.query('SELECT COUNT(*) FROM user_agent_customizations');
    expect(parseInt(result.rows[0].count)).toBeGreaterThan(0);
  });

  it('should migrate all posts to memories', async () => {
    const result = await pgPool.query(`
      SELECT COUNT(*) FROM agent_memories WHERE metadata->>'type' = 'post'
    `);
    expect(parseInt(result.rows[0].count)).toBe(18); // Expected count
  });

  it('should preserve data integrity', async () => {
    const result = await pgPool.query(`
      SELECT content FROM agent_memories WHERE post_id = 'specific-post-id'
    `);
    expect(result.rows[0].content).toContain('expected content');
  });
});
```

### 8.2 Integration Tests (Phase 2)

**File: `/workspaces/agent-feed/tests/phase2/integration/full-system.test.ts`**

```typescript
describe('Full System Integration', () => {
  it('should create work ticket from new post', async () => {
    // Post to API
    const response = await fetch('http://localhost:3001/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Test post about AI',
        agentId: 'tech-guru'
      })
    });

    expect(response.ok).toBe(true);

    // Check work queue
    await sleep(1000);
    const workQueue = await getWorkQueueStatus();
    expect(workQueue.pendingTickets).toBeGreaterThan(0);
  });

  it('should spawn worker for work ticket', async () => {
    // Trigger work ticket creation
    // Wait for worker spawn
    // Verify worker is active
  });

  it('should update ticker with real-time events', async () => {
    // Subscribe to ticker
    // Trigger event
    // Verify ticker receives update
  });
});
```

---

## 9. Acceptance Criteria

### Migration Success
- [ ] All 6 agents migrated to `user_agent_customizations`
- [ ] All 18 posts migrated to `agent_memories` (type='post')
- [ ] All 84 comments migrated to `agent_memories` (type='comment')
- [ ] All 100 published pages migrated to `agent_workspaces`
- [ ] Data integrity verified (checksums, row counts)
- [ ] Zero data loss confirmed

### API Server Integration
- [ ] All API routes updated to use PostgreSQL
- [ ] Frontend still works with PostgreSQL backend
- [ ] GET /api/posts returns correct data
- [ ] GET /api/agents returns correct data
- [ ] POST endpoints create data in PostgreSQL

### Phase 2 Orchestrator Integration
- [ ] api-server connected to Phase 2 work queue
- [ ] Ticker shows Phase 2 events (worker spawns, ticket creation)
- [ ] Dashboard (port 3000) shows real activity from api-server
- [ ] Work tickets created for new posts
- [ ] Workers spawn and execute

### Testing
- [ ] All unit tests passing
- [ ] All integration tests passing (9/9)
- [ ] Playwright UI tests passing with screenshots
- [ ] No mocks or simulations - 100% real functionality
- [ ] Regression tests passing

### Performance
- [ ] API response time < 200ms (same as SQLite)
- [ ] Frontend loads in < 2 seconds
- [ ] No errors in browser console
- [ ] No errors in server logs

---

## 10. Rollback Plan

### If Migration Fails

1. **Stop api-server**: `npm stop` in api-server/
2. **Restore SQLite config**: Revert `db.js` changes
3. **Restart api-server**: `npm start`
4. **Verify**: Test original functionality

### Backups

- [ ] Backup SQLite databases before migration
- [ ] Backup PostgreSQL before migration
- [ ] Keep backups for 7 days

```bash
# Backup SQLite
cp /workspaces/agent-feed/data/agent-feed.db /workspaces/agent-feed/backups/agent-feed-$(date +%Y%m%d).db
cp /workspaces/agent-feed/data/agent-pages.db /workspaces/agent-feed/backups/agent-pages-$(date +%Y%m%d).db

# Backup PostgreSQL
pg_dump -h localhost -U postgres avidm_dev > /workspaces/agent-feed/backups/avidm_dev-$(date +%Y%m%d).sql
```

---

## 11. Implementation Timeline

### Phase 1: Preparation (2 hours)
- [ ] Create system template JSON files
- [ ] Write migration script
- [ ] Write validation tests

### Phase 2: Migration (1 hour)
- [ ] Seed system templates
- [ ] Run migration script
- [ ] Validate data integrity

### Phase 3: API Integration (3 hours)
- [ ] Update database connection
- [ ] Update all API routes
- [ ] Update ticker integration
- [ ] Test each endpoint

### Phase 4: Testing (2 hours)
- [ ] Run unit tests
- [ ] Run integration tests
- [ ] Playwright UI/UX tests
- [ ] Regression testing

### Phase 5: Cutover (1 hour)
- [ ] Stop api-server
- [ ] Switch to PostgreSQL
- [ ] Restart api-server
- [ ] Verify everything works
- [ ] Monitor for 1 hour

**Total Estimated Time: 9 hours**

---

## 12. Next Steps

1. ✅ Review this specification
2. ⏳ Create system template JSON files
3. ⏳ Implement migration script
4. ⏳ Run migration in dev environment
5. ⏳ Update api-server database connection
6. ⏳ Integrate with Phase 2 orchestrator
7. ⏳ Run full test suite
8. ⏳ User acceptance testing
9. ⏳ Cutover to unified system

---

**Document Status:** Ready for Implementation
**Last Updated:** 2025-10-10
**Next Review:** After migration completion
