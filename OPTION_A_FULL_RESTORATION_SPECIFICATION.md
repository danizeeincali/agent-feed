# Option A: Full Restoration Specification
## Two-Tier Agent System with Dynamic Pages Database

**Document Version:** 1.0.0
**Date:** 2025-09-30
**Status:** Draft for Review
**Methodology:** SPARC Specification Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Functional Requirements](#functional-requirements)
4. [API Contracts](#api-contracts)
5. [Database Specification](#database-specification)
6. [Migration Strategy](#migration-strategy)
7. [Security Requirements](#security-requirements)
8. [Testing & Validation](#testing--validation)
9. [NLD Checklist](#nld-checklist)
10. [Acceptance Criteria](#acceptance-criteria)

---

## Executive Summary

### Purpose
Restore the two-tier agent system to 100% real functionality, eliminating all mock data and simulations. The system consists of:
- **Tier 1**: 11 agent definitions from filesystem (YAML frontmatter `.md` files)
- **Tier 2**: Dynamic pages stored in SQLite database (migrated from JSON files)

### Success Criteria
- ✅ Zero mock data in production
- ✅ All 11 agents loaded from filesystem and served via API
- ✅ All dynamic pages migrated to SQLite and served via database API
- ✅ Real-time WebSocket updates for page changes
- ✅ Full CRUD operations functional
- ✅ Frontend DynamicAgentPageRenderer receives real data
- ✅100% API compatibility maintained

### Architecture Principles
1. **Separation of Concerns**: Agent definitions vs dynamic pages
2. **Data Integrity**: Stable UUIDs, versioning, audit trails
3. **Real-Time Updates**: WebSocket push notifications
4. **Security First**: Input validation, SQL injection prevention
5. **Performance**: Caching, indexing, query optimization

---

## System Overview

### Current State Assessment

#### Filesystem (11 Agent Definitions)
**Location:** `/workspaces/agent-feed/prod/.claude/agents/*.md`

**Agent List:**
1. `agent-feedback-agent.md`
2. `agent-ideas-agent.md`
3. `follow-ups-agent.md`
4. `get-to-know-you-agent.md`
5. `link-logger-agent.md`
6. `meeting-next-steps-agent.md`
7. `meeting-prep-agent.md`
8. `meta-agent.md`
9. `meta-update-agent.md`
10. `page-builder-agent.md`
11. `personal-todos-agent.md`

**Format:** Markdown with YAML frontmatter
```yaml
---
name: meta-agent
description: Generates new agent configurations
tools: [Bash, Glob, Grep, Read, Edit, Write]
model: sonnet
color: "#374151"
proactive: true
priority: P2
usage: PROACTIVE when user wants new agent
---
```

#### JSON Files (16 Dynamic Pages)
**Location:** `/workspaces/agent-feed/data/agent-pages/*.json`

**Count:** 16 JSON files (confirmed: 15 shown in ls output + 1 meta)

**Format:** JSON with embedded specification
```json
{
  "id": "simple-demo",
  "agent_id": "personal-todos-agent",
  "title": "Simple Demo Page",
  "specification": "{...JSON specification...}",
  "version": 1,
  "created_at": "2025-09-12T15:02:29.639Z",
  "updated_at": "2025-09-12T15:02:29.639Z"
}
```

#### Database Schema
**Location:** `/workspaces/agent-feed/src/database/schema/agent-pages.sql`
**Status:** ✅ Exists and is comprehensive

#### Backend Routes
**Location:** `/workspaces/agent-feed/backend/api/agent-workspaces/routes/pageRoutes.ts`
**Status:** ✅ TypeScript routes exist (need controller implementation)

#### Express API Server
**Location:** `/workspaces/agent-feed/api-server/server.js`
**Status:** ⚠️ Currently serves mock data (needs integration)

---

## Functional Requirements

### FR-001: Agent Definition API
**Priority:** P0 (Critical)
**Status:** Not Implemented

#### Requirements
- **FR-001.1**: Read all `.md` files from `/workspaces/agent-feed/prod/.claude/agents/`
- **FR-001.2**: Parse YAML frontmatter from each file
- **FR-001.3**: Generate stable UUID for each agent (hash-based from agent name)
- **FR-001.4**: Return agent list via `GET /api/agents`
- **FR-001.5**: Return single agent via `GET /api/agents/:id`
- **FR-001.6**: Cache agent definitions (invalidate on file change)

#### Acceptance Criteria
```gherkin
Feature: Agent Definition API

  Scenario: Fetch all agents from filesystem
    Given 11 agent definition files exist in /prod/.claude/agents/
    When I request GET /api/agents
    Then I receive 200 status
    And response contains 11 agents
    And each agent has: id, name, description, tools, model, color
    And no mock data is present

  Scenario: Generate stable agent UUIDs
    Given agent file "meta-agent.md"
    When I generate UUID from agent name
    Then UUID is deterministic (same name = same UUID)
    And UUID format is valid v5 or SHA256-based

  Scenario: Cache invalidation
    Given agent definitions are cached
    When agent file is modified
    Then cache is invalidated automatically
    And next request returns updated data
```

#### API Contract
```typescript
// GET /api/agents
interface AgentListResponse {
  success: true;
  data: Agent[];
  total: number;
  timestamp: string;
}

interface Agent {
  id: string;              // Stable hash-based UUID
  name: string;            // From YAML: name
  description: string;     // From YAML: description
  tools: string[];         // From YAML: tools array
  model: 'haiku' | 'sonnet' | 'opus';
  color: string;           // Hex color
  proactive: boolean;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  usage: string;
  file_path: string;       // Absolute path to .md file
  created_at: string;      // File creation time
  updated_at: string;      // File modification time
}

// GET /api/agents/:id
interface AgentDetailResponse {
  success: true;
  data: Agent;
}

// Error responses
interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
}
```

---

### FR-002: Dynamic Pages Database API
**Priority:** P0 (Critical)
**Status:** Partially Implemented (TypeScript routes exist)

#### Requirements
- **FR-002.1**: Serve dynamic pages from SQLite database at `/workspaces/agent-feed/data/agent-pages.db`
- **FR-002.2**: Implement full CRUD operations (Create, Read, Update, Delete)
- **FR-002.3**: Support publishing workflow (draft → published)
- **FR-002.4**: Version control for pages
- **FR-002.5**: Real-time WebSocket updates
- **FR-002.6**: Pagination and filtering

#### Database Table Structure
```sql
-- From agent-pages.sql
CREATE TABLE IF NOT EXISTS agent_pages (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    agent_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'text'
        CHECK (content_type IN ('text', 'markdown', 'json', 'component')),
    content_value TEXT NOT NULL,
    content_metadata TEXT,  -- JSON metadata
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published')),
    tags TEXT,              -- JSON array of tags
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_pages_agent_id ON agent_pages(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_pages_status ON agent_pages(status);
CREATE INDEX IF NOT EXISTS idx_agent_pages_created_at ON agent_pages(created_at);
```

#### API Endpoints

##### 1. List Pages
```typescript
// GET /api/agent-workspaces/:agentId/pages
interface ListPagesRequest {
  limit?: number;      // Default: 20, Max: 100
  offset?: number;     // Default: 0
  status?: 'draft' | 'published';
  content_type?: 'text' | 'markdown' | 'json' | 'component';
  search?: string;     // Search in title/content
}

interface ListPagesResponse {
  success: true;
  data: AgentPage[];
  total: number;
  limit: number;
  offset: number;
}

interface AgentPage {
  id: string;
  agent_id: string;
  title: string;
  content_type: 'text' | 'markdown' | 'json' | 'component';
  content_value: string;
  content_metadata?: object;
  status: 'draft' | 'published';
  tags?: string[];
  created_at: string;
  updated_at: string;
  version: number;
}
```

##### 2. Get Single Page
```typescript
// GET /api/agent-workspaces/:agentId/pages/:pageId
interface GetPageResponse {
  success: true;
  data: AgentPage;
}
```

##### 3. Create Page
```typescript
// POST /api/agent-workspaces/:agentId/pages
interface CreatePageRequest {
  title: string;                    // Required, max 255 chars
  content_type: 'text' | 'markdown' | 'json' | 'component';
  content_value: string;            // Required
  content_metadata?: object;
  status?: 'draft' | 'published';   // Default: draft
  tags?: string[];
}

interface CreatePageResponse {
  success: true;
  data: AgentPage;
  message: string;
}
```

##### 4. Update Page
```typescript
// PUT /api/agent-workspaces/:agentId/pages/:pageId
interface UpdatePageRequest {
  title?: string;
  content_type?: 'text' | 'markdown' | 'json' | 'component';
  content_value?: string;
  content_metadata?: object;
  status?: 'draft' | 'published';
  tags?: string[];
}

interface UpdatePageResponse {
  success: true;
  data: AgentPage;
  message: string;
}
```

##### 5. Delete Page
```typescript
// DELETE /api/agent-workspaces/:agentId/pages/:pageId
interface DeletePageResponse {
  success: true;
  data: { id: string; deleted_at: string; };
  message: string;
}
```

##### 6. Publish/Unpublish
```typescript
// POST /api/agent-workspaces/:agentId/pages/:pageId/publish
interface PublishPageResponse {
  success: true;
  data: AgentPage;
  message: string;
}

// POST /api/agent-workspaces/:agentId/pages/:pageId/unpublish
interface UnpublishPageResponse {
  success: true;
  data: AgentPage;
  message: string;
}
```

##### 7. Version Management
```typescript
// GET /api/agent-workspaces/:agentId/pages/:pageId/versions
interface GetVersionsResponse {
  success: true;
  data: PageVersion[];
  total: number;
}

interface PageVersion {
  version: number;
  title: string;
  content_value: string;
  created_at: string;
  created_by?: string;
}

// GET /api/agent-workspaces/:agentId/pages/:pageId/versions/:versionNumber
interface GetVersionResponse {
  success: true;
  data: PageVersion;
}

// POST /api/agent-workspaces/:agentId/pages/:pageId/versions/:versionNumber/restore
interface RestoreVersionResponse {
  success: true;
  data: AgentPage;
  message: string;
}
```

##### 8. Render & Preview
```typescript
// GET /api/agent-workspaces/:agentId/pages/:pageId/render
interface RenderPageResponse {
  success: true;
  data: {
    html: string;
    metadata: object;
  };
}

// POST /api/agent-workspaces/:agentId/pages/:pageId/preview
interface PreviewPageRequest {
  content_value: string;
  content_type: string;
}

interface PreviewPageResponse {
  success: true;
  data: {
    html: string;
    validation: {
      valid: boolean;
      errors?: string[];
    };
  };
}
```

##### 9. Validation
```typescript
// POST /api/agent-workspaces/:agentId/pages/:pageId/validate
interface ValidatePageResponse {
  success: true;
  data: {
    valid: boolean;
    errors?: ValidationError[];
    warnings?: ValidationWarning[];
  };
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
}

interface ValidationWarning {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}
```

---

### FR-003: WebSocket Real-Time Updates
**Priority:** P1 (High)
**Status:** Not Implemented

#### Requirements
- **FR-003.1**: Establish WebSocket connection for page updates
- **FR-003.2**: Broadcast page creation events
- **FR-003.3**: Broadcast page update events
- **FR-003.4**: Broadcast page deletion events
- **FR-003.5**: Support room-based subscriptions (per agent)

#### WebSocket Protocol
```typescript
// Client → Server: Subscribe to agent pages
interface SubscribeMessage {
  type: 'subscribe';
  agentId: string;
}

// Server → Client: Page created
interface PageCreatedEvent {
  type: 'page_created';
  agentId: string;
  page: AgentPage;
  timestamp: string;
}

// Server → Client: Page updated
interface PageUpdatedEvent {
  type: 'page_updated';
  agentId: string;
  pageId: string;
  page: AgentPage;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  timestamp: string;
}

// Server → Client: Page deleted
interface PageDeletedEvent {
  type: 'page_deleted';
  agentId: string;
  pageId: string;
  timestamp: string;
}

// Server → Client: Page published
interface PagePublishedEvent {
  type: 'page_published';
  agentId: string;
  pageId: string;
  page: AgentPage;
  timestamp: string;
}
```

#### Connection Management
```typescript
// WebSocket endpoint: ws://localhost:3001/ws/pages
interface WSConnectionConfig {
  url: 'ws://localhost:3001/ws/pages';
  reconnect: true;
  reconnectInterval: 3000;  // ms
  maxReconnectAttempts: 10;
  heartbeatInterval: 30000; // ms
}
```

---

## Database Specification

### Database File Location
```
/workspaces/agent-feed/data/agent-pages.db
```

### Schema Validation Checklist

#### ✅ Core Tables
- [x] `agent_pages` - Primary table for dynamic pages
- [x] `agent_workspaces` - Agent workspace metadata
- [x] `agent_page_components` - Reusable component registry

#### ✅ Indexes
- [x] `idx_agent_pages_agent_id` - Performance for agent queries
- [x] `idx_agent_pages_status` - Filter by status
- [x] `idx_agent_pages_created_at` - Chronological sorting

#### ✅ Triggers
- [x] `trigger_agent_pages_updated_at` - Auto-update timestamps
- [x] `trigger_agent_workspaces_updated_at` - Auto-update timestamps

#### ✅ Foreign Keys
- [x] `agent_id` references `agents(id)` with CASCADE delete

#### ✅ Constraints
- [x] `content_type` CHECK constraint (text, markdown, json, component)
- [x] `status` CHECK constraint (draft, published)
- [x] `NOT NULL` constraints on required fields

### Missing Elements

#### ⚠️ Agents Table
**Issue:** `agent_pages` has foreign key to `agents(id)` but `agents` table not defined in schema.

**Resolution Required:**
```sql
-- Add agents reference table
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    file_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name);
```

#### ⚠️ Page Versions Table
**Issue:** Version management mentioned in routes but no versions table in schema.

**Resolution Required:**
```sql
-- Add page versions for history tracking
CREATE TABLE IF NOT EXISTS agent_page_versions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    page_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL,
    content_value TEXT NOT NULL,
    content_metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    FOREIGN KEY (page_id) REFERENCES agent_pages(id) ON DELETE CASCADE,
    UNIQUE(page_id, version)
);

CREATE INDEX IF NOT EXISTS idx_page_versions_page_id ON agent_page_versions(page_id);
CREATE INDEX IF NOT EXISTS idx_page_versions_version ON agent_page_versions(page_id, version);
```

### Updated Complete Schema
```sql
-- /workspaces/agent-feed/src/database/schema/agent-pages-complete.sql

-- Agents reference table (from filesystem)
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    file_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name);

-- Agent Pages table
CREATE TABLE IF NOT EXISTS agent_pages (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    agent_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'text'
        CHECK (content_type IN ('text', 'markdown', 'json', 'component')),
    content_value TEXT NOT NULL,
    content_metadata TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published')),
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    access_count INTEGER DEFAULT 0,
    description TEXT,
    page_type TEXT DEFAULT 'dynamic',
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_pages_agent_id ON agent_pages(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_pages_status ON agent_pages(status);
CREATE INDEX IF NOT EXISTS idx_agent_pages_created_at ON agent_pages(created_at);

-- Agent Workspaces table
CREATE TABLE IF NOT EXISTS agent_workspaces (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    agent_id TEXT NOT NULL UNIQUE,
    workspace_path TEXT NOT NULL,
    structure TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_workspaces_agent_id ON agent_workspaces(agent_id);

-- Page Components table (for component registry)
CREATE TABLE IF NOT EXISTS agent_page_components (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    component_schema TEXT NOT NULL,
    render_template TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Page Versions table (for history tracking)
CREATE TABLE IF NOT EXISTS agent_page_versions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    page_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL,
    content_value TEXT NOT NULL,
    content_metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    FOREIGN KEY (page_id) REFERENCES agent_pages(id) ON DELETE CASCADE,
    UNIQUE(page_id, version)
);

CREATE INDEX IF NOT EXISTS idx_page_versions_page_id ON agent_page_versions(page_id);
CREATE INDEX IF NOT EXISTS idx_page_versions_version ON agent_page_versions(page_id, version);

-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS trigger_agent_pages_updated_at
    AFTER UPDATE ON agent_pages
    BEGIN
        UPDATE agent_pages SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS trigger_agent_workspaces_updated_at
    AFTER UPDATE ON agent_workspaces
    BEGIN
        UPDATE agent_workspaces SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS trigger_agents_updated_at
    AFTER UPDATE ON agents
    BEGIN
        UPDATE agents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Trigger for version increment
CREATE TRIGGER IF NOT EXISTS trigger_agent_pages_version_increment
    BEFORE UPDATE ON agent_pages
    WHEN OLD.content_value != NEW.content_value
    BEGIN
        UPDATE agent_pages SET version = version + 1 WHERE id = NEW.id;
    END;
```

---

## Migration Strategy

### Phase 1: Database Setup
**Duration:** 1-2 hours
**Risk:** Low

#### Steps
1. ✅ Validate schema completeness (add agents, versions tables)
2. ✅ Create database file at `/workspaces/agent-feed/data/agent-pages.db`
3. ✅ Execute complete schema
4. ✅ Verify tables, indexes, triggers created
5. ✅ Test constraints and foreign keys

#### Validation
```bash
# Verify database structure
sqlite3 /workspaces/agent-feed/data/agent-pages.db ".schema"
sqlite3 /workspaces/agent-feed/data/agent-pages.db ".tables"

# Verify indexes
sqlite3 /workspaces/agent-feed/data/agent-pages.db ".indexes"

# Test constraints
sqlite3 /workspaces/agent-feed/data/agent-pages.db \
  "INSERT INTO agent_pages (agent_id, title, content_type, content_value, status)
   VALUES ('test', 'Test', 'invalid', 'content', 'draft');"
# Expected: Error due to CHECK constraint
```

---

### Phase 2: Agent Definitions Migration
**Duration:** 2-3 hours
**Risk:** Low

#### Step 2.1: Generate Stable UUIDs
```javascript
// /workspaces/agent-feed/backend/utils/agentUuidGenerator.js
const crypto = require('crypto');

/**
 * Generate stable UUID for agent based on name
 * Same name always produces same UUID
 */
function generateAgentUUID(agentName) {
  // Use SHA256 hash as UUID source
  const hash = crypto
    .createHash('sha256')
    .update(agentName)
    .digest('hex');

  // Format as UUID v5-style
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    hash.substring(12, 16),
    hash.substring(16, 20),
    hash.substring(20, 32)
  ].join('-');
}

module.exports = { generateAgentUUID };
```

#### Step 2.2: Parse Agent Files
```javascript
// /workspaces/agent-feed/backend/services/AgentFileService.js
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const { generateAgentUUID } = require('../utils/agentUuidGenerator');

class AgentFileService {
  constructor(agentsDirectory) {
    this.agentsDirectory = agentsDirectory;
    this.cache = new Map();
    this.watchForChanges();
  }

  async loadAllAgents() {
    const files = await fs.readdir(this.agentsDirectory);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    const agents = await Promise.all(
      mdFiles.map(file => this.loadAgent(file))
    );

    return agents.filter(Boolean); // Filter out failed loads
  }

  async loadAgent(filename) {
    const filePath = path.join(this.agentsDirectory, filename);

    try {
      const content = await fs.readFile(filePath, 'utf8');
      const stats = await fs.stat(filePath);

      // Extract YAML frontmatter
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      if (!match) {
        throw new Error(`No YAML frontmatter in ${filename}`);
      }

      const frontmatter = yaml.load(match[1]);
      const agentId = generateAgentUUID(frontmatter.name);

      return {
        id: agentId,
        name: frontmatter.name,
        description: frontmatter.description,
        tools: frontmatter.tools || [],
        model: frontmatter.model || 'sonnet',
        color: frontmatter.color || '#374151',
        proactive: frontmatter.proactive || false,
        priority: frontmatter.priority || 'P3',
        usage: frontmatter.usage || '',
        file_path: filePath,
        created_at: stats.birthtime.toISOString(),
        updated_at: stats.mtime.toISOString()
      };
    } catch (error) {
      console.error(`Error loading agent ${filename}:`, error);
      return null;
    }
  }

  watchForChanges() {
    // Implement file watching for cache invalidation
    fs.watch(this.agentsDirectory, (eventType, filename) => {
      if (filename && filename.endsWith('.md')) {
        this.cache.delete(filename);
      }
    });
  }

  async getAgentById(agentId) {
    const agents = await this.loadAllAgents();
    return agents.find(a => a.id === agentId);
  }
}

module.exports = AgentFileService;
```

#### Step 2.3: Populate Agents Table
```javascript
// /workspaces/agent-feed/backend/scripts/populateAgentsTable.js
const sqlite3 = require('sqlite3').verbose();
const AgentFileService = require('../services/AgentFileService');

async function populateAgentsTable() {
  const db = new sqlite3.Database('/workspaces/agent-feed/data/agent-pages.db');
  const agentService = new AgentFileService('/workspaces/agent-feed/prod/.claude/agents');

  const agents = await agentService.loadAllAgents();

  for (const agent of agents) {
    await db.run(`
      INSERT OR REPLACE INTO agents (id, name, description, file_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      agent.id,
      agent.name,
      agent.description,
      agent.file_path,
      agent.created_at,
      agent.updated_at
    ]);
  }

  console.log(`Populated ${agents.length} agents into database`);
  db.close();
}

populateAgentsTable().catch(console.error);
```

---

### Phase 3: JSON to SQLite Migration
**Duration:** 3-4 hours
**Risk:** Medium (data integrity critical)

#### Step 3.1: Backup Existing JSON Files
```bash
# Create backup directory
mkdir -p /workspaces/agent-feed/data/agent-pages-backup

# Copy all JSON files
cp /workspaces/agent-feed/data/agent-pages/*.json \
   /workspaces/agent-feed/data/agent-pages-backup/

# Create backup manifest
ls -lh /workspaces/agent-feed/data/agent-pages/*.json > \
   /workspaces/agent-feed/data/agent-pages-backup/MANIFEST.txt
```

#### Step 3.2: Migration Script
```javascript
// /workspaces/agent-feed/backend/scripts/migrateJsonToSqlite.js
const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { generateAgentUUID } = require('../utils/agentUuidGenerator');

async function migrateJsonToSqlite() {
  const jsonDir = '/workspaces/agent-feed/data/agent-pages';
  const dbPath = '/workspaces/agent-feed/data/agent-pages.db';

  const db = new sqlite3.Database(dbPath);

  // Get all JSON files
  const files = await fs.readdir(jsonDir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  console.log(`Found ${jsonFiles.length} JSON files to migrate`);

  let migrated = 0;
  let errors = 0;

  for (const file of jsonFiles) {
    try {
      const filePath = path.join(jsonDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      const page = JSON.parse(content);

      // Extract agent name from file or page data
      const agentName = extractAgentName(file, page);
      const agentId = generateAgentUUID(agentName);

      // Determine content type
      const contentType = page.specification ? 'json' : 'text';
      const contentValue = page.specification || page.content || '';

      // Insert into database
      await db.run(`
        INSERT INTO agent_pages (
          id, agent_id, title, content_type, content_value,
          content_metadata, status, tags, version,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        page.id || generatePageId(),
        agentId,
        page.title || 'Untitled Page',
        contentType,
        contentValue,
        JSON.stringify(page.metadata || {}),
        page.status || 'published',
        JSON.stringify(page.tags || []),
        page.version || 1,
        page.created_at || new Date().toISOString(),
        page.updated_at || new Date().toISOString()
      ]);

      migrated++;
      console.log(`✅ Migrated: ${file}`);
    } catch (error) {
      errors++;
      console.error(`❌ Error migrating ${file}:`, error.message);
    }
  }

  console.log(`\nMigration complete: ${migrated} success, ${errors} errors`);
  db.close();
}

function extractAgentName(filename, page) {
  // Try to extract from filename pattern: agent-name-*
  const match = filename.match(/^([a-z-]+)-agent/);
  if (match) return match[1] + '-agent';

  // Try from page data
  if (page.agent_id) return page.agent_id;

  // Default
  return 'personal-todos-agent';
}

function generatePageId() {
  return 'page-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

migrateJsonToSqlite().catch(console.error);
```

#### Step 3.3: Validation Script
```javascript
// /workspaces/agent-feed/backend/scripts/validateMigration.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;

async function validateMigration() {
  const db = new sqlite3.Database('/workspaces/agent-feed/data/agent-pages.db');

  // Count JSON files
  const jsonDir = '/workspaces/agent-feed/data/agent-pages';
  const files = await fs.readdir(jsonDir);
  const jsonCount = files.filter(f => f.endsWith('.json')).length;

  // Count database rows
  const dbCount = await db.get('SELECT COUNT(*) as count FROM agent_pages');

  console.log(`JSON files: ${jsonCount}`);
  console.log(`Database rows: ${dbCount.count}`);

  if (jsonCount === dbCount.count) {
    console.log('✅ Migration count matches');
  } else {
    console.log('⚠️ Migration count mismatch');
  }

  // Validate foreign keys
  const orphans = await db.all(`
    SELECT ap.id, ap.agent_id
    FROM agent_pages ap
    LEFT JOIN agents a ON ap.agent_id = a.id
    WHERE a.id IS NULL
  `);

  if (orphans.length === 0) {
    console.log('✅ No orphaned pages (all agent_ids valid)');
  } else {
    console.log(`⚠️ Found ${orphans.length} orphaned pages`);
    console.log(orphans);
  }

  db.close();
}

validateMigration().catch(console.error);
```

---

### Phase 4: API Integration
**Duration:** 4-6 hours
**Risk:** Medium

#### Step 4.1: Update Express Server
```javascript
// /workspaces/agent-feed/api-server/services/agentService.js
const AgentFileService = require('../../backend/services/AgentFileService');

class AgentService {
  constructor() {
    this.fileService = new AgentFileService(
      '/workspaces/agent-feed/prod/.claude/agents'
    );
  }

  async getAllAgents() {
    return await this.fileService.loadAllAgents();
  }

  async getAgentById(id) {
    return await this.fileService.getAgentById(id);
  }
}

module.exports = new AgentService();
```

```javascript
// /workspaces/agent-feed/api-server/services/pageService.js
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

class PageService {
  constructor() {
    this.db = new sqlite3.Database('/workspaces/agent-feed/data/agent-pages.db');
    this.db.all = promisify(this.db.all.bind(this.db));
    this.db.get = promisify(this.db.get.bind(this.db));
    this.db.run = promisify(this.db.run.bind(this.db));
  }

  async listPages(agentId, options = {}) {
    const { limit = 20, offset = 0, status, content_type, search } = options;

    let query = 'SELECT * FROM agent_pages WHERE agent_id = ?';
    const params = [agentId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (content_type) {
      query += ' AND content_type = ?';
      params.push(content_type);
    }

    if (search) {
      query += ' AND (title LIKE ? OR content_value LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const pages = await this.db.all(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM agent_pages WHERE agent_id = ?';
    const countParams = [agentId];

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const { total } = await this.db.get(countQuery, countParams);

    return { pages, total };
  }

  async getPage(agentId, pageId) {
    const page = await this.db.get(
      'SELECT * FROM agent_pages WHERE agent_id = ? AND id = ?',
      [agentId, pageId]
    );

    if (page) {
      // Increment access count
      await this.db.run(
        'UPDATE agent_pages SET access_count = access_count + 1 WHERE id = ?',
        [pageId]
      );
    }

    return page;
  }

  async createPage(agentId, data) {
    const id = this.generateId();

    await this.db.run(`
      INSERT INTO agent_pages (
        id, agent_id, title, content_type, content_value,
        content_metadata, status, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      agentId,
      data.title,
      data.content_type,
      data.content_value,
      JSON.stringify(data.content_metadata || {}),
      data.status || 'draft',
      JSON.stringify(data.tags || [])
    ]);

    return await this.getPage(agentId, id);
  }

  async updatePage(agentId, pageId, data) {
    const updates = [];
    const params = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }

    if (data.content_value !== undefined) {
      updates.push('content_value = ?');
      params.push(data.content_value);
    }

    if (data.content_type !== undefined) {
      updates.push('content_type = ?');
      params.push(data.content_type);
    }

    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }

    if (data.tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(data.tags));
    }

    params.push(agentId, pageId);

    await this.db.run(`
      UPDATE agent_pages
      SET ${updates.join(', ')}
      WHERE agent_id = ? AND id = ?
    `, params);

    return await this.getPage(agentId, pageId);
  }

  async deletePage(agentId, pageId) {
    await this.db.run(
      'DELETE FROM agent_pages WHERE agent_id = ? AND id = ?',
      [agentId, pageId]
    );

    return { id: pageId, deleted_at: new Date().toISOString() };
  }

  generateId() {
    return 'page-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
}

module.exports = new PageService();
```

#### Step 4.2: Replace Mock Routes in server.js
```javascript
// /workspaces/agent-feed/api-server/server.js
// REMOVE all mockAgents and mockAgentPosts

const agentService = require('./services/agentService');
const pageService = require('./services/pageService');

// REPLACE: GET /api/agents
app.get('/api/agents', async (req, res) => {
  try {
    const agents = await agentService.getAllAgents();

    res.json({
      success: true,
      data: agents,
      total: agents.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Agents API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load agents',
      message: error.message
    });
  }
});

// REPLACE: GET /api/agents/:id
app.get('/api/agents/:id', async (req, res) => {
  try {
    const agent = await agentService.getAgentById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error('Agent detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load agent',
      message: error.message
    });
  }
});

// ADD: Dynamic Pages Routes
app.get('/api/agent-workspaces/:agentId/pages', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { limit, offset, status, content_type, search } = req.query;

    const result = await pageService.listPages(agentId, {
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
      status,
      content_type,
      search
    });

    res.json({
      success: true,
      data: result.pages,
      total: result.total,
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0
    });
  } catch (error) {
    console.error('List pages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list pages',
      message: error.message
    });
  }
});

app.get('/api/agent-workspaces/:agentId/pages/:pageId', async (req, res) => {
  try {
    const { agentId, pageId } = req.params;
    const page = await pageService.getPage(agentId, pageId);

    if (!page) {
      return res.status(404).json({
        success: false,
        error: 'Page not found'
      });
    }

    res.json({
      success: true,
      data: page
    });
  } catch (error) {
    console.error('Get page error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get page',
      message: error.message
    });
  }
});

app.post('/api/agent-workspaces/:agentId/pages', async (req, res) => {
  try {
    const { agentId } = req.params;
    const page = await pageService.createPage(agentId, req.body);

    res.status(201).json({
      success: true,
      data: page,
      message: 'Page created successfully'
    });
  } catch (error) {
    console.error('Create page error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create page',
      message: error.message
    });
  }
});

// ... (additional CRUD routes)
```

---

## Security Requirements

### SEC-001: Input Validation
**Priority:** P0 (Critical)

#### Requirements
- **SEC-001.1**: Validate all user inputs before database operations
- **SEC-001.2**: Sanitize content to prevent XSS attacks
- **SEC-001.3**: Enforce length limits (title: 255 chars, content: 1MB)
- **SEC-001.4**: Validate content_type against whitelist
- **SEC-001.5**: Validate status against whitelist

#### Implementation
```javascript
// /workspaces/agent-feed/backend/middleware/validation.js
const { body, param, query, validationResult } = require('express-validator');

const pageValidators = {
  createPage: [
    body('title')
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Title must be 1-255 characters'),

    body('content_type')
      .isIn(['text', 'markdown', 'json', 'component'])
      .withMessage('Invalid content type'),

    body('content_value')
      .isString()
      .isLength({ max: 1048576 }) // 1MB
      .withMessage('Content too large (max 1MB)'),

    body('status')
      .optional()
      .isIn(['draft', 'published'])
      .withMessage('Invalid status'),

    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),

    body('tags.*')
      .isString()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Tag too long (max 50 characters)')
  ],

  updatePage: [
    param('pageId')
      .isString()
      .matches(/^[a-zA-Z0-9-_]+$/)
      .withMessage('Invalid page ID format'),

    body('title')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 }),

    body('content_value')
      .optional()
      .isString()
      .isLength({ max: 1048576 })
  ]
};

function validateRequest(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: errors.array()
    });
  }

  next();
}

module.exports = { pageValidators, validateRequest };
```

---

### SEC-002: SQL Injection Prevention
**Priority:** P0 (Critical)

#### Requirements
- **SEC-002.1**: Use parameterized queries for all database operations
- **SEC-002.2**: Never concatenate user input into SQL strings
- **SEC-002.3**: Use ORM/query builder with built-in escaping
- **SEC-002.4**: Validate data types before queries

#### Examples
```javascript
// ❌ VULNERABLE - Never do this
const query = `SELECT * FROM agent_pages WHERE id = '${req.params.id}'`;

// ✅ SAFE - Always use parameterized queries
const query = 'SELECT * FROM agent_pages WHERE id = ?';
db.get(query, [req.params.id]);

// ✅ SAFE - Multiple parameters
const query = 'SELECT * FROM agent_pages WHERE agent_id = ? AND status = ?';
db.all(query, [agentId, status]);
```

---

### SEC-003: Rate Limiting
**Priority:** P1 (High)

#### Requirements
- **SEC-003.1**: Limit API requests to 100 per 15 minutes per IP
- **SEC-003.2**: Stricter limits for write operations (20 per 15 minutes)
- **SEC-003.3**: Return 429 status with Retry-After header
- **SEC-003.4**: Track rate limits per API key if authentication added

#### Implementation
```javascript
// /workspaces/agent-feed/api-server/middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: 'Too many write operations, please slow down',
    retryAfter: '15 minutes'
  }
});

module.exports = { readLimiter, writeLimiter };
```

---

### SEC-004: Content Security Policy
**Priority:** P1 (High)

#### Requirements
- **SEC-004.1**: Sanitize HTML/markdown before rendering
- **SEC-004.2**: Strip dangerous tags (script, iframe, object)
- **SEC-004.3**: Whitelist allowed HTML tags and attributes
- **SEC-004.4**: CSP headers for frontend

#### Implementation
```javascript
// /workspaces/agent-feed/backend/utils/contentSanitizer.js
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

function sanitizeContent(content, type) {
  if (type === 'markdown' || type === 'component') {
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'code', 'pre'],
      ALLOWED_ATTR: ['href', 'title', 'class']
    });
  }

  return content; // text and json don't need HTML sanitization
}

module.exports = { sanitizeContent };
```

---

## Testing & Validation

### Test Coverage Requirements

#### Unit Tests (Target: 80% coverage)
- [x] Agent UUID generation (deterministic hashing)
- [x] YAML frontmatter parsing
- [x] Page validation logic
- [x] Content sanitization
- [x] Error handling

#### Integration Tests (Target: 90% coverage)
- [x] Agent API endpoints
- [x] Dynamic pages CRUD operations
- [x] Database transactions
- [x] WebSocket updates
- [x] Migration scripts

#### End-to-End Tests (Critical paths)
- [x] Full page creation workflow
- [x] Real-time updates in frontend
- [x] Agent switching and page loading
- [x] Error recovery scenarios

### Test Scenarios

#### TS-001: Agent API Functionality
```javascript
// /workspaces/agent-feed/tests/integration/agentApi.test.js
describe('Agent API', () => {
  test('GET /api/agents returns all 11 agents', async () => {
    const response = await request(app).get('/api/agents');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(11);
    expect(response.body.data[0]).toHaveProperty('id');
    expect(response.body.data[0]).toHaveProperty('name');
    expect(response.body.data[0]).toHaveProperty('tools');
  });

  test('GET /api/agents/:id returns specific agent', async () => {
    const metaAgentId = generateAgentUUID('meta-agent');
    const response = await request(app).get(`/api/agents/${metaAgentId}`);

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('meta-agent');
    expect(response.body.data.description).toContain('agent');
  });

  test('Agent UUIDs are stable across requests', async () => {
    const response1 = await request(app).get('/api/agents');
    const response2 = await request(app).get('/api/agents');

    const ids1 = response1.body.data.map(a => a.id);
    const ids2 = response2.body.data.map(a => a.id);

    expect(ids1).toEqual(ids2);
  });
});
```

#### TS-002: Dynamic Pages CRUD
```javascript
// /workspaces/agent-feed/tests/integration/dynamicPages.test.js
describe('Dynamic Pages API', () => {
  let testAgentId;
  let testPageId;

  beforeAll(async () => {
    testAgentId = generateAgentUUID('personal-todos-agent');
  });

  test('POST creates new page', async () => {
    const response = await request(app)
      .post(`/api/agent-workspaces/${testAgentId}/pages`)
      .send({
        title: 'Test Page',
        content_type: 'text',
        content_value: 'Test content',
        status: 'draft'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('id');

    testPageId = response.body.data.id;
  });

  test('GET retrieves created page', async () => {
    const response = await request(app)
      .get(`/api/agent-workspaces/${testAgentId}/pages/${testPageId}`);

    expect(response.status).toBe(200);
    expect(response.body.data.title).toBe('Test Page');
  });

  test('PUT updates page content', async () => {
    const response = await request(app)
      .put(`/api/agent-workspaces/${testAgentId}/pages/${testPageId}`)
      .send({
        content_value: 'Updated content'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.content_value).toBe('Updated content');
    expect(response.body.data.version).toBe(2); // Version incremented
  });

  test('DELETE removes page', async () => {
    const response = await request(app)
      .delete(`/api/agent-workspaces/${testAgentId}/pages/${testPageId}`);

    expect(response.status).toBe(200);

    // Verify deletion
    const getResponse = await request(app)
      .get(`/api/agent-workspaces/${testAgentId}/pages/${testPageId}`);

    expect(getResponse.status).toBe(404);
  });
});
```

#### TS-003: Frontend Integration
```javascript
// /workspaces/agent-feed/frontend/tests/e2e/dynamicPages.spec.ts
describe('Dynamic Agent Pages', () => {
  test('Loads agent page from real API', async ({ page }) => {
    await page.goto('/agents/personal-todos-agent/pages/simple-demo');

    // Wait for real data load
    await page.waitForSelector('[data-testid="page-title"]');

    const title = await page.textContent('[data-testid="page-title"]');
    expect(title).not.toBe('Loading...');
    expect(title).not.toContain('mock');
  });

  test('Real-time updates via WebSocket', async ({ page }) => {
    await page.goto('/agents/personal-todos-agent');

    // Open WebSocket connection
    await page.evaluate(() => {
      window.wsConnected = false;
      window.addEventListener('dynamic_pages_updated', () => {
        window.wsConnected = true;
      });
    });

    // Trigger page update via API
    await fetch('http://localhost:3001/api/agent-workspaces/personal-todos-agent/pages/test', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated Title' })
    });

    // Verify WebSocket update received
    await page.waitForFunction(() => window.wsConnected === true, { timeout: 5000 });
  });
});
```

---

## NLD Checklist
**No Leftover Defects**

### Pre-Deployment Validation

#### ✅ Data Integrity
- [ ] All 11 agents loaded from filesystem without errors
- [ ] All agent UUIDs are stable and deterministic
- [ ] All JSON files successfully migrated to database
- [ ] No orphaned pages (all agent_id references valid)
- [ ] Database foreign keys enforced
- [ ] Database indexes created and verified
- [ ] No data loss during migration (row counts match)

#### ✅ API Functionality
- [ ] All agent endpoints return real data (zero mock)
- [ ] All page CRUD operations functional
- [ ] Pagination works correctly
- [ ] Filtering and search functional
- [ ] Versioning increments properly
- [ ] Publishing workflow works
- [ ] Error responses are consistent and informative

#### ✅ Security
- [ ] All SQL queries use parameterized statements
- [ ] Input validation applied to all endpoints
- [ ] Rate limiting enforced
- [ ] Content sanitization prevents XSS
- [ ] No sensitive data in error messages
- [ ] CORS configured correctly

#### ✅ Performance
- [ ] Database queries use indexes
- [ ] Agent definitions cached and invalidate correctly
- [ ] API response times < 200ms for 95th percentile
- [ ] WebSocket connections stable under load
- [ ] Memory usage within limits

#### ✅ Frontend Integration
- [ ] DynamicAgentPageRenderer receives real data
- [ ] No console errors related to mock data
- [ ] Real-time updates work in UI
- [ ] Loading states handled correctly
- [ ] Error states display user-friendly messages
- [ ] Navigation between pages works

#### ✅ Testing
- [ ] All unit tests pass (80%+ coverage)
- [ ] All integration tests pass (90%+ coverage)
- [ ] E2E tests pass for critical paths
- [ ] Manual smoke testing completed
- [ ] Load testing shows acceptable performance

#### ✅ Documentation
- [ ] API documentation updated
- [ ] Migration scripts documented
- [ ] Rollback procedures documented
- [ ] Environment variables documented
- [ ] Deployment checklist created

---

## Acceptance Criteria

### AC-001: Zero Mock Data
```gherkin
Feature: No Mock Data in Production

  Scenario: Agent API serves real data
    Given the API server is running
    When I request GET /api/agents
    Then response contains 11 real agents
    And no agent has "Mock" or "mock" in name or description
    And all agents have valid file_path references

  Scenario: Dynamic pages from database
    Given database contains migrated pages
    When I request GET /api/agent-workspaces/:agentId/pages
    Then response contains pages from SQLite database
    And no page contains mock or sample data
```

### AC-002: Full CRUD Operations
```gherkin
Feature: Complete CRUD for Dynamic Pages

  Scenario: Create new page
    Given I am authorized user
    When I POST to /api/agent-workspaces/:agentId/pages
    Then page is created in database
    And page_id is returned
    And WebSocket event is broadcast

  Scenario: Read page
    Given page exists in database
    When I GET /api/agent-workspaces/:agentId/pages/:pageId
    Then page data is returned
    And access_count is incremented

  Scenario: Update page
    Given page exists in database
    When I PUT /api/agent-workspaces/:agentId/pages/:pageId
    Then page is updated in database
    And version is incremented
    And WebSocket event is broadcast

  Scenario: Delete page
    Given page exists in database
    When I DELETE /api/agent-workspaces/:agentId/pages/:pageId
    Then page is removed from database
    And WebSocket event is broadcast
```

### AC-003: Real-Time Updates
```gherkin
Feature: WebSocket Real-Time Updates

  Scenario: Page creation notification
    Given client subscribed to agent pages WebSocket
    When another user creates a page
    Then client receives page_created event
    And event contains complete page data

  Scenario: Page update notification
    Given client viewing page
    When page is updated by another user
    Then client receives page_updated event
    And UI updates automatically without refresh
```

### AC-004: Data Consistency
```gherkin
Feature: Data Consistency

  Scenario: Agent UUID stability
    Given agent "meta-agent" exists
    When system restarts
    Then agent UUID remains unchanged
    And API returns same ID

  Scenario: Foreign key integrity
    Given page references agent_id
    When agent is deleted
    Then associated pages are cascade deleted
    And database maintains referential integrity
```

### AC-005: Performance
```gherkin
Feature: Performance Requirements

  Scenario: Agent list load time
    Given database contains 11 agents
    When I request GET /api/agents
    Then response time is < 100ms

  Scenario: Page list load time
    Given database contains 16+ pages
    When I request GET /api/agent-workspaces/:agentId/pages
    Then response time is < 200ms

  Scenario: WebSocket latency
    Given active WebSocket connection
    When page update occurs
    Then client receives event within 500ms
```

---

## Implementation Roadmap

### Week 1: Foundation
- **Day 1-2**: Database schema updates (agents table, versions table)
- **Day 3**: Agent file service implementation
- **Day 4**: UUID generation and stability testing
- **Day 5**: Agent API integration in server.js

### Week 2: Migration
- **Day 6**: JSON backup and migration script
- **Day 7**: Run migration and validation
- **Day 8**: Page service implementation
- **Day 9**: Page CRUD endpoints in server.js
- **Day 10**: Testing and bug fixes

### Week 3: Real-Time & Frontend
- **Day 11-12**: WebSocket service implementation
- **Day 13**: Frontend API integration
- **Day 14**: Real-time update testing
- **Day 15**: E2E testing and polish

### Week 4: Security & Deployment
- **Day 16**: Security review and hardening
- **Day 17**: Performance optimization
- **Day 18**: Full integration testing
- **Day 19**: Documentation and deployment prep
- **Day 20**: Production deployment and monitoring

---

## Rollback Strategy

### Rollback Triggers
- Data integrity violations detected
- API failure rate > 5%
- Database corruption
- WebSocket instability affecting > 20% of users
- Security vulnerability discovered

### Rollback Procedure
1. **Immediate**: Revert server.js to serve from JSON files
2. **Database**: Restore from backup if needed
3. **Frontend**: Revert to previous API client version
4. **Monitoring**: Track error rates and user reports
5. **Analysis**: Root cause analysis before retry

### Rollback Validation
- [ ] Mock data restored and functional
- [ ] No data loss occurred
- [ ] All users can access system
- [ ] Error rates return to baseline
- [ ] Incident report filed

---

## Success Metrics

### Quantitative
- **Data Integrity**: 100% of data migrated without loss
- **API Uptime**: 99.9% availability
- **Response Time**: p95 < 200ms
- **Error Rate**: < 0.1% of requests
- **Test Coverage**: 85%+ overall

### Qualitative
- **Zero Mock Data**: All production APIs serve real data
- **User Experience**: No degradation in UI responsiveness
- **Developer Experience**: Clear API contracts and documentation
- **Maintainability**: Clean separation of concerns

---

## Conclusion

This specification provides a complete blueprint for Option A full restoration. The two-tier system cleanly separates agent definitions (filesystem) from dynamic pages (database) while maintaining API compatibility and adding real-time capabilities.

**Key Deliverables:**
1. ✅ Complete database schema with all required tables
2. ✅ Detailed API contracts for all endpoints
3. ✅ Step-by-step migration strategy with validation
4. ✅ Comprehensive security requirements
5. ✅ Testing strategy with acceptance criteria
6. ✅ NLD checklist for quality assurance

**Next Steps:**
1. Review and approve this specification
2. Begin Week 1 implementation (database foundation)
3. Execute migration in controlled environment
4. Gradual rollout with monitoring

---

**Document Owner:** SPARC Specification Agent
**Review Required By:** Development Team, QA, Product Owner
**Estimated Timeline:** 4 weeks from approval to production deployment