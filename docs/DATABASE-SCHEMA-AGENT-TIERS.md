# Database Schema Design: Agent Tier System

**Document Version**: 1.0.0
**Date**: 2025-10-19
**Author**: System Architect Agent
**Status**: Proposed

## Executive Summary

This document defines the database schema changes required to implement a 2-tier agent visibility system with enhanced metadata for agent presentation and behavior control.

### Key Requirements

- **Tier System**: 2-tier architecture (Tier 1: Core, Tier 2: Extended)
- **Visibility Control**: Public vs Protected agent access
- **Icon System**: SVG and emoji icon support
- **Posting Control**: Self-posting vs system-posting behavior
- **Feed Control**: Default feed visibility management
- **Dual Storage**: Filesystem (source of truth) + PostgreSQL (query optimization)

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Frontmatter Schema Definition](#frontmatter-schema-definition)
3. [PostgreSQL Schema Extensions](#postgresql-schema-extensions)
4. [Migration Strategy](#migration-strategy)
5. [Indexing Strategy](#indexing-strategy)
6. [Validation Rules](#validation-rules)
7. [Query Patterns](#query-patterns)
8. [Implementation Phases](#implementation-phases)

---

## 1. Schema Overview

### 1.1 Data Model Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT DATA MODEL                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐      ┌─────────────────────────┐ │
│  │  Filesystem (.md)    │      │  PostgreSQL (cache)     │ │
│  │  Source of Truth     │─────▶│  Query Optimization     │ │
│  │                      │ sync │                         │ │
│  │  - Agent config      │      │  - Indexed metadata     │ │
│  │  - Frontmatter       │      │  - Fast filtering       │ │
│  │  - Content           │      │  - Performance          │ │
│  └──────────────────────┘      └─────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Storage Strategy

| Aspect | Filesystem | PostgreSQL |
|--------|-----------|------------|
| **Purpose** | Source of truth, version control | Fast queries, filtering |
| **Format** | Markdown with YAML frontmatter | Relational tables |
| **Editing** | Direct file modification | Sync from filesystem |
| **Querying** | Slow (file I/O, parsing) | Fast (indexed queries) |
| **Backup** | Git version control | Database backups |
| **Performance** | O(n) full scan | O(log n) indexed lookup |

### 1.3 Sync Strategy

```javascript
// Filesystem → PostgreSQL sync flow
File Change → Parse Frontmatter → Extract Metadata → Upsert DB Record → Cache Invalidation
```

---

## 2. Frontmatter Schema Definition

### 2.1 Core Frontmatter Fields (Existing)

```yaml
---
name: agent-name
description: Agent description text
tools: [Read, Write, Edit, Glob, Grep]
model: sonnet
color: "#374151"
proactive: true
priority: P2
usage: PROACTIVE when user wants X
_protected_config_source: .system/agent-name.protected.yaml
---
```

### 2.2 New Frontmatter Fields (Tier System)

```yaml
---
# ... existing fields ...

# Tier System (NEW)
tier: 1                          # Integer: 1 (Core) or 2 (Extended)
visibility: public               # Enum: public | protected

# Icon System (NEW)
icon_type: svg                   # Enum: svg | emoji
icon: /assets/icons/agent.svg    # String: path to SVG file
icon_emoji: "🤖"                 # String: emoji character (alternative to SVG)

# Posting Behavior (NEW)
posts_as_self: true              # Boolean: true = post as agent, false = post as Avi
show_in_default_feed: true       # Boolean: true = visible in default feed

# Metadata
created_at: 2025-10-19T00:00:00Z # ISO-8601 timestamp
updated_at: 2025-10-19T00:00:00Z # ISO-8601 timestamp
---
```

### 2.3 Field Definitions

#### `tier` (Integer: 1 or 2)
- **Type**: Integer (1 or 2)
- **Required**: Yes
- **Default**: 2
- **Purpose**: Agent categorization for UI organization
- **Values**:
  - `1`: Core agent (essential, always visible, high priority)
  - `2`: Extended agent (specialized, conditional visibility)

#### `visibility` (Enum)
- **Type**: String enum
- **Required**: Yes
- **Default**: `public`
- **Purpose**: Access control for agent discovery
- **Values**:
  - `public`: Visible to all users in agent lists
  - `protected`: Hidden from general lists, accessible via direct reference

#### `icon_type` (Enum)
- **Type**: String enum
- **Required**: Yes
- **Default**: `emoji`
- **Purpose**: Specify icon rendering method
- **Values**:
  - `svg`: Use SVG file from `icon` field
  - `emoji`: Use emoji character from `icon_emoji` field

#### `icon` (String)
- **Type**: String (file path)
- **Required**: Conditional (required if `icon_type: svg`)
- **Default**: `null`
- **Format**: Relative path from `/assets/icons/` directory
- **Example**: `/assets/icons/meta-agent.svg`
- **Validation**: Must be valid SVG file path when `icon_type: svg`

#### `icon_emoji` (String)
- **Type**: String (single emoji character)
- **Required**: Conditional (required if `icon_type: emoji`)
- **Default**: `"🤖"`
- **Format**: Single Unicode emoji character
- **Example**: `"📝"`, `"🔧"`, `"🎯"`
- **Validation**: Must be valid emoji when `icon_type: emoji`

#### `posts_as_self` (Boolean)
- **Type**: Boolean
- **Required**: Yes
- **Default**: `true`
- **Purpose**: Control posting attribution
- **Values**:
  - `true`: Agent posts outcomes under its own identity
  - `false`: Avi posts outcomes on behalf of agent

#### `show_in_default_feed` (Boolean)
- **Type**: Boolean
- **Required**: Yes
- **Default**: `true`
- **Purpose**: Control default feed visibility
- **Values**:
  - `true`: Agent's posts appear in default feed view
  - `false`: Agent's posts require filter selection to view

### 2.4 Example Frontmatter Configurations

#### Example 1: Tier 1 Core Agent (User-Facing)

```yaml
---
name: personal-todos-agent
description: Manages personal tasks with IMPACT priorities
tools: [Read, Write, Edit, TodoWrite]
model: sonnet
color: "#10b981"
proactive: true
priority: P1
usage: PROACTIVE for task management

# Tier System
tier: 1
visibility: public

# Icon System
icon_type: emoji
icon_emoji: "📋"

# Posting Behavior
posts_as_self: true
show_in_default_feed: true

# Metadata
created_at: 2025-10-19T00:00:00Z
updated_at: 2025-10-19T00:00:00Z
_protected_config_source: .system/personal-todos-agent.protected.yaml
---
```

#### Example 2: Tier 2 Extended Agent (Specialized)

```yaml
---
name: learning-optimizer-agent
description: Autonomous learning performance optimizer
tools: [Read, Write, Grep, Glob]
model: sonnet
color: "#8b5cf6"
proactive: false
priority: P3
usage: Optimizes skill learning performance

# Tier System
tier: 2
visibility: public

# Icon System
icon_type: svg
icon: /assets/icons/learning-optimizer.svg

# Posting Behavior
posts_as_self: true
show_in_default_feed: true

# Metadata
created_at: 2025-10-19T00:00:00Z
updated_at: 2025-10-19T00:00:00Z
_protected_config_source: .system/learning-optimizer-agent.protected.yaml
---
```

#### Example 3: Protected System Agent

```yaml
---
name: meta-agent
description: Generates new agent configuration files
tools: [Bash, Glob, Grep, Read, Edit, Write, WebFetch]
model: sonnet
color: "#374151"
proactive: true
priority: P2
usage: PROACTIVE when user wants new agent

# Tier System
tier: 1
visibility: protected

# Icon System
icon_type: emoji
icon_emoji: "🔧"

# Posting Behavior
posts_as_self: false              # Avi posts meta-agent's work
show_in_default_feed: false       # System operations not in feed

# Metadata
created_at: 2025-10-19T00:00:00Z
updated_at: 2025-10-19T00:00:00Z
_protected_config_source: .system/meta-agent.protected.yaml
---
```

---

## 3. PostgreSQL Schema Extensions

### 3.1 Current Schema (system_agent_templates)

```sql
CREATE TABLE system_agent_templates (
  name VARCHAR(50) PRIMARY KEY,
  version INTEGER NOT NULL,
  model VARCHAR(100),
  posting_rules JSONB NOT NULL,
  api_schema JSONB NOT NULL,
  safety_constraints JSONB NOT NULL,
  default_personality TEXT,
  default_response_style JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  CONSTRAINT system_only CHECK (version > 0)
);
```

### 3.2 Proposed Schema Extensions

```sql
-- Add new columns to system_agent_templates
ALTER TABLE system_agent_templates
  -- Tier system
  ADD COLUMN tier INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN visibility VARCHAR(20) NOT NULL DEFAULT 'public',

  -- Icon system
  ADD COLUMN icon_type VARCHAR(10) NOT NULL DEFAULT 'emoji',
  ADD COLUMN icon VARCHAR(255),
  ADD COLUMN icon_emoji VARCHAR(10) DEFAULT '🤖',

  -- Posting behavior
  ADD COLUMN posts_as_self BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN show_in_default_feed BOOLEAN NOT NULL DEFAULT true,

  -- Additional metadata
  ADD COLUMN slug VARCHAR(100) UNIQUE,
  ADD COLUMN tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN priority VARCHAR(10) DEFAULT 'P3',

  -- Constraints
  ADD CONSTRAINT tier_valid CHECK (tier IN (1, 2)),
  ADD CONSTRAINT visibility_valid CHECK (visibility IN ('public', 'protected')),
  ADD CONSTRAINT icon_type_valid CHECK (icon_type IN ('svg', 'emoji')),
  ADD CONSTRAINT icon_svg_path CHECK (
    icon_type != 'svg' OR (icon IS NOT NULL AND icon LIKE '/assets/icons/%')
  ),
  ADD CONSTRAINT icon_emoji_exists CHECK (
    icon_type != 'emoji' OR (icon_emoji IS NOT NULL AND LENGTH(icon_emoji) <= 10)
  ),
  ADD CONSTRAINT priority_format CHECK (priority ~ '^P[0-7]$');
```

### 3.3 Complete Table Schema (After Migration)

```sql
CREATE TABLE IF NOT EXISTS system_agent_templates (
  -- Primary Key
  name VARCHAR(50) PRIMARY KEY,
  slug VARCHAR(100) UNIQUE,

  -- Version control
  version INTEGER NOT NULL,

  -- Tier System
  tier INTEGER NOT NULL DEFAULT 2,
  visibility VARCHAR(20) NOT NULL DEFAULT 'public',

  -- Icon System
  icon_type VARCHAR(10) NOT NULL DEFAULT 'emoji',
  icon VARCHAR(255),
  icon_emoji VARCHAR(10) DEFAULT '🤖',

  -- Posting Behavior
  posts_as_self BOOLEAN NOT NULL DEFAULT true,
  show_in_default_feed BOOLEAN NOT NULL DEFAULT true,

  -- PROTECTED FIELDS
  model VARCHAR(100),
  posting_rules JSONB NOT NULL,
  api_schema JSONB NOT NULL,
  safety_constraints JSONB NOT NULL,

  -- DEFAULT CUSTOMIZABLE FIELDS
  default_personality TEXT,
  default_response_style JSONB,

  -- Additional Metadata
  tags JSONB DEFAULT '[]'::jsonb,
  priority VARCHAR(10) DEFAULT 'P3',

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT system_only CHECK (version > 0),
  CONSTRAINT tier_valid CHECK (tier IN (1, 2)),
  CONSTRAINT visibility_valid CHECK (visibility IN ('public', 'protected')),
  CONSTRAINT icon_type_valid CHECK (icon_type IN ('svg', 'emoji')),
  CONSTRAINT icon_svg_path CHECK (
    icon_type != 'svg' OR (icon IS NOT NULL AND icon LIKE '/assets/icons/%')
  ),
  CONSTRAINT icon_emoji_exists CHECK (
    icon_type != 'emoji' OR (icon_emoji IS NOT NULL AND LENGTH(icon_emoji) <= 10)
  ),
  CONSTRAINT priority_format CHECK (priority ~ '^P[0-7]$')
);

-- Table comments
COMMENT ON TABLE system_agent_templates IS
  'TIER 1: Immutable system agent templates with tier classification and visibility control';

-- Column comments
COMMENT ON COLUMN system_agent_templates.tier IS
  'Agent tier: 1 (Core - essential agents) or 2 (Extended - specialized agents)';
COMMENT ON COLUMN system_agent_templates.visibility IS
  'Access control: public (visible in lists) or protected (hidden from general discovery)';
COMMENT ON COLUMN system_agent_templates.icon_type IS
  'Icon rendering method: svg (file-based) or emoji (character-based)';
COMMENT ON COLUMN system_agent_templates.icon IS
  'Path to SVG icon file (required if icon_type=svg), relative to /assets/icons/';
COMMENT ON COLUMN system_agent_templates.icon_emoji IS
  'Emoji character for icon (required if icon_type=emoji), single Unicode character';
COMMENT ON COLUMN system_agent_templates.posts_as_self IS
  'Posting attribution: true (agent posts as self) or false (Avi posts on behalf)';
COMMENT ON COLUMN system_agent_templates.show_in_default_feed IS
  'Feed visibility: true (visible in default feed) or false (requires filter)';
COMMENT ON COLUMN system_agent_templates.slug IS
  'URL-friendly agent identifier (kebab-case), unique across all agents';
COMMENT ON COLUMN system_agent_templates.tags IS
  'JSONB array of searchable tags for agent categorization and filtering';
COMMENT ON COLUMN system_agent_templates.priority IS
  'Agent execution priority: P0 (critical) through P7 (lowest), Fibonacci-based';
```

---

## 4. Migration Strategy

### 4.1 Migration Overview

**Goal**: Add new columns to existing `system_agent_templates` table without data loss or downtime.

**Approach**:
1. Add columns with sensible defaults
2. Backfill existing agents with appropriate values
3. Update filesystem-to-database sync logic
4. Deploy new validation rules

### 4.2 Migration SQL Script

```sql
-- ==============================================================================
-- Migration: Add Agent Tier System Columns
-- Version: 1.0.0
-- Date: 2025-10-19
-- Description: Extends system_agent_templates with tier classification,
--              visibility control, icon system, and posting behavior fields
-- ==============================================================================

BEGIN;

-- Step 1: Add new columns with defaults
ALTER TABLE system_agent_templates
  -- Tier system
  ADD COLUMN tier INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN visibility VARCHAR(20) NOT NULL DEFAULT 'public',

  -- Icon system
  ADD COLUMN icon_type VARCHAR(10) NOT NULL DEFAULT 'emoji',
  ADD COLUMN icon VARCHAR(255),
  ADD COLUMN icon_emoji VARCHAR(10) DEFAULT '🤖',

  -- Posting behavior
  ADD COLUMN posts_as_self BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN show_in_default_feed BOOLEAN NOT NULL DEFAULT true,

  -- Additional metadata
  ADD COLUMN slug VARCHAR(100),
  ADD COLUMN tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN priority VARCHAR(10) DEFAULT 'P3';

-- Step 2: Backfill slug from name (kebab-case conversion)
UPDATE system_agent_templates
SET slug = LOWER(REPLACE(name, '_', '-'))
WHERE slug IS NULL;

-- Step 3: Add unique constraint on slug
ALTER TABLE system_agent_templates
  ADD CONSTRAINT system_agent_templates_slug_unique UNIQUE (slug);

-- Step 4: Add validation constraints
ALTER TABLE system_agent_templates
  ADD CONSTRAINT tier_valid CHECK (tier IN (1, 2)),
  ADD CONSTRAINT visibility_valid CHECK (visibility IN ('public', 'protected')),
  ADD CONSTRAINT icon_type_valid CHECK (icon_type IN ('svg', 'emoji')),
  ADD CONSTRAINT icon_svg_path CHECK (
    icon_type != 'svg' OR (icon IS NOT NULL AND icon LIKE '/assets/icons/%')
  ),
  ADD CONSTRAINT icon_emoji_exists CHECK (
    icon_type != 'emoji' OR (icon_emoji IS NOT NULL AND LENGTH(icon_emoji) <= 10)
  ),
  ADD CONSTRAINT priority_format CHECK (priority ~ '^P[0-7]$');

-- Step 5: Backfill tier based on agent name patterns
-- Core agents (Tier 1): Essential user-facing agents
UPDATE system_agent_templates
SET tier = 1
WHERE name IN (
  'meta-agent',
  'personal-todos-agent',
  'get-to-know-you-agent',
  'follow-ups-agent',
  'meeting-prep-agent',
  'meeting-next-steps-agent'
);

-- Step 6: Set visibility for system agents
-- Protected visibility: Internal/system agents
UPDATE system_agent_templates
SET visibility = 'protected'
WHERE name IN (
  'meta-agent',
  'meta-update-agent',
  'page-builder-agent',
  'page-verification-agent',
  'dynamic-page-testing-agent'
);

-- Step 7: Configure posting behavior for system agents
-- System agents: Avi posts on their behalf, not in default feed
UPDATE system_agent_templates
SET
  posts_as_self = false,
  show_in_default_feed = false
WHERE visibility = 'protected';

-- Step 8: Add column comments
COMMENT ON COLUMN system_agent_templates.tier IS
  'Agent tier: 1 (Core - essential agents) or 2 (Extended - specialized agents)';
COMMENT ON COLUMN system_agent_templates.visibility IS
  'Access control: public (visible in lists) or protected (hidden from general discovery)';
COMMENT ON COLUMN system_agent_templates.icon_type IS
  'Icon rendering method: svg (file-based) or emoji (character-based)';
COMMENT ON COLUMN system_agent_templates.icon IS
  'Path to SVG icon file (required if icon_type=svg), relative to /assets/icons/';
COMMENT ON COLUMN system_agent_templates.icon_emoji IS
  'Emoji character for icon (required if icon_type=emoji), single Unicode character';
COMMENT ON COLUMN system_agent_templates.posts_as_self IS
  'Posting attribution: true (agent posts as self) or false (Avi posts on behalf)';
COMMENT ON COLUMN system_agent_templates.show_in_default_feed IS
  'Feed visibility: true (visible in default feed) or false (requires filter)';
COMMENT ON COLUMN system_agent_templates.slug IS
  'URL-friendly agent identifier (kebab-case), unique across all agents';
COMMENT ON COLUMN system_agent_templates.tags IS
  'JSONB array of searchable tags for agent categorization and filtering';
COMMENT ON COLUMN system_agent_templates.priority IS
  'Agent execution priority: P0 (critical) through P7 (lowest), Fibonacci-based';

COMMIT;

-- ==============================================================================
-- Validation Queries
-- ==============================================================================

-- Verify all agents have tier assigned
SELECT name, tier, visibility FROM system_agent_templates;

-- Verify icon configurations
SELECT name, icon_type, icon, icon_emoji FROM system_agent_templates;

-- Verify posting configurations
SELECT name, posts_as_self, show_in_default_feed FROM system_agent_templates;

-- Check for any constraint violations
SELECT name
FROM system_agent_templates
WHERE tier NOT IN (1, 2)
   OR visibility NOT IN ('public', 'protected')
   OR icon_type NOT IN ('svg', 'emoji');
```

### 4.3 Rollback Script

```sql
-- ==============================================================================
-- Rollback: Remove Agent Tier System Columns
-- ==============================================================================

BEGIN;

-- Remove constraints first
ALTER TABLE system_agent_templates
  DROP CONSTRAINT IF EXISTS tier_valid,
  DROP CONSTRAINT IF EXISTS visibility_valid,
  DROP CONSTRAINT IF EXISTS icon_type_valid,
  DROP CONSTRAINT IF EXISTS icon_svg_path,
  DROP CONSTRAINT IF EXISTS icon_emoji_exists,
  DROP CONSTRAINT IF EXISTS priority_format,
  DROP CONSTRAINT IF EXISTS system_agent_templates_slug_unique;

-- Remove columns
ALTER TABLE system_agent_templates
  DROP COLUMN IF EXISTS tier,
  DROP COLUMN IF EXISTS visibility,
  DROP COLUMN IF EXISTS icon_type,
  DROP COLUMN IF EXISTS icon,
  DROP COLUMN IF EXISTS icon_emoji,
  DROP COLUMN IF EXISTS posts_as_self,
  DROP COLUMN IF EXISTS show_in_default_feed,
  DROP COLUMN IF EXISTS slug,
  DROP COLUMN IF EXISTS tags,
  DROP COLUMN IF EXISTS priority;

COMMIT;
```

---

## 5. Indexing Strategy

### 5.1 Index Rationale

**Query Patterns**:
1. **Filter by tier**: `WHERE tier = 1` (Core agents list)
2. **Filter by visibility**: `WHERE visibility = 'public'` (Public agents only)
3. **Filter by tier + visibility**: `WHERE tier = 1 AND visibility = 'public'`
4. **Lookup by slug**: `WHERE slug = 'agent-name'` (Agent detail page)
5. **Search by tags**: `WHERE tags @> '["tag-name"]'` (Tag-based filtering)
6. **Feed filtering**: `WHERE show_in_default_feed = true` (Default feed)

### 5.2 Proposed Indexes

```sql
-- ==============================================================================
-- Indexes for Agent Tier System
-- ==============================================================================

-- Index 1: Tier filtering (most common query)
CREATE INDEX idx_system_agent_templates_tier
  ON system_agent_templates(tier);

-- Index 2: Visibility filtering
CREATE INDEX idx_system_agent_templates_visibility
  ON system_agent_templates(visibility);

-- Index 3: Composite index for tier + visibility (optimized filtering)
CREATE INDEX idx_system_agent_templates_tier_visibility
  ON system_agent_templates(tier, visibility)
  WHERE visibility = 'public';  -- Partial index for most common case

-- Index 4: Slug lookup (already unique constraint, automatically indexed)
-- CREATE UNIQUE INDEX idx_system_agent_templates_slug
--   ON system_agent_templates(slug);

-- Index 5: Tags search (GIN index for JSONB array queries)
CREATE INDEX idx_system_agent_templates_tags
  ON system_agent_templates USING GIN(tags);

-- Index 6: Feed visibility (partial index for feed queries)
CREATE INDEX idx_system_agent_templates_feed_visible
  ON system_agent_templates(show_in_default_feed, tier)
  WHERE show_in_default_feed = true;

-- Index 7: Priority filtering (for agent execution order)
CREATE INDEX idx_system_agent_templates_priority
  ON system_agent_templates(priority);

-- Index comments
COMMENT ON INDEX idx_system_agent_templates_tier IS
  'Optimizes tier-based filtering queries (e.g., core vs extended agents)';
COMMENT ON INDEX idx_system_agent_templates_visibility IS
  'Optimizes visibility filtering queries (e.g., public vs protected agents)';
COMMENT ON INDEX idx_system_agent_templates_tier_visibility IS
  'Composite index for combined tier+visibility queries, partial for public agents';
COMMENT ON INDEX idx_system_agent_templates_tags IS
  'GIN index for efficient JSONB array tag searches';
COMMENT ON INDEX idx_system_agent_templates_feed_visible IS
  'Partial index for feed visibility queries, optimized for default feed';
COMMENT ON INDEX idx_system_agent_templates_priority IS
  'Optimizes priority-based agent execution ordering';
```

### 5.3 Index Performance Analysis

| Query Pattern | Index Used | Complexity | Notes |
|--------------|------------|------------|-------|
| `tier = 1` | `idx_system_agent_templates_tier` | O(log n) | Fast tier lookup |
| `visibility = 'public'` | `idx_system_agent_templates_visibility` | O(log n) | Fast visibility check |
| `tier = 1 AND visibility = 'public'` | `idx_system_agent_templates_tier_visibility` | O(log n) | Composite index optimized |
| `slug = 'agent-name'` | Unique constraint index | O(log n) | Direct lookup |
| `tags @> '["tag"]'` | `idx_system_agent_templates_tags` | O(log n) | GIN index for JSONB |
| `show_in_default_feed = true` | `idx_system_agent_templates_feed_visible` | O(log n) | Partial index for feed |
| Full table scan | Sequential scan | O(n) | Avoided with indexes |

---

## 6. Validation Rules

### 6.1 Database-Level Validation (Constraints)

```sql
-- Tier validation: Only 1 or 2
ALTER TABLE system_agent_templates
  ADD CONSTRAINT tier_valid CHECK (tier IN (1, 2));

-- Visibility validation: Only 'public' or 'protected'
ALTER TABLE system_agent_templates
  ADD CONSTRAINT visibility_valid CHECK (visibility IN ('public', 'protected'));

-- Icon type validation: Only 'svg' or 'emoji'
ALTER TABLE system_agent_templates
  ADD CONSTRAINT icon_type_valid CHECK (icon_type IN ('svg', 'emoji'));

-- Icon path validation: SVG path required when icon_type='svg'
ALTER TABLE system_agent_templates
  ADD CONSTRAINT icon_svg_path CHECK (
    icon_type != 'svg' OR (icon IS NOT NULL AND icon LIKE '/assets/icons/%')
  );

-- Icon emoji validation: Emoji required when icon_type='emoji'
ALTER TABLE system_agent_templates
  ADD CONSTRAINT icon_emoji_exists CHECK (
    icon_type != 'emoji' OR (icon_emoji IS NOT NULL AND LENGTH(icon_emoji) <= 10)
  );

-- Priority validation: Fibonacci format P0-P7
ALTER TABLE system_agent_templates
  ADD CONSTRAINT priority_format CHECK (priority ~ '^P[0-7]$');
```

### 6.2 Application-Level Validation (JavaScript/TypeScript)

```typescript
/**
 * Agent Tier System Validation Schema
 */
interface AgentTierSchema {
  tier: 1 | 2;
  visibility: 'public' | 'protected';
  icon_type: 'svg' | 'emoji';
  icon?: string;
  icon_emoji?: string;
  posts_as_self: boolean;
  show_in_default_feed: boolean;
  slug: string;
  tags: string[];
  priority: string;
}

/**
 * Validation rules
 */
const validationRules = {
  tier: {
    required: true,
    type: 'integer',
    enum: [1, 2],
    message: 'Tier must be 1 (Core) or 2 (Extended)'
  },

  visibility: {
    required: true,
    type: 'string',
    enum: ['public', 'protected'],
    message: 'Visibility must be "public" or "protected"'
  },

  icon_type: {
    required: true,
    type: 'string',
    enum: ['svg', 'emoji'],
    message: 'Icon type must be "svg" or "emoji"'
  },

  icon: {
    required: (data) => data.icon_type === 'svg',
    type: 'string',
    pattern: /^\/assets\/icons\/[\w-]+\.svg$/,
    message: 'Icon must be a valid SVG path when icon_type is "svg"'
  },

  icon_emoji: {
    required: (data) => data.icon_type === 'emoji',
    type: 'string',
    maxLength: 10,
    pattern: /^[\p{Emoji}]+$/u,
    message: 'Icon emoji must be a valid emoji character when icon_type is "emoji"'
  },

  posts_as_self: {
    required: true,
    type: 'boolean',
    message: 'posts_as_self must be true or false'
  },

  show_in_default_feed: {
    required: true,
    type: 'boolean',
    message: 'show_in_default_feed must be true or false'
  },

  slug: {
    required: true,
    type: 'string',
    pattern: /^[a-z0-9-]+$/,
    message: 'Slug must be lowercase kebab-case (e.g., agent-name)'
  },

  tags: {
    required: false,
    type: 'array',
    itemType: 'string',
    message: 'Tags must be an array of strings'
  },

  priority: {
    required: true,
    type: 'string',
    pattern: /^P[0-7]$/,
    message: 'Priority must be in Fibonacci format P0-P7'
  }
};

/**
 * Validation function
 */
function validateAgentTierData(data: Partial<AgentTierSchema>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Tier validation
  if (data.tier !== undefined && ![1, 2].includes(data.tier)) {
    errors.push('Tier must be 1 or 2');
  }

  // Visibility validation
  if (data.visibility && !['public', 'protected'].includes(data.visibility)) {
    errors.push('Visibility must be "public" or "protected"');
  }

  // Icon type validation
  if (data.icon_type && !['svg', 'emoji'].includes(data.icon_type)) {
    errors.push('Icon type must be "svg" or "emoji"');
  }

  // Icon path validation (SVG)
  if (data.icon_type === 'svg') {
    if (!data.icon) {
      errors.push('Icon path is required when icon_type is "svg"');
    } else if (!data.icon.match(/^\/assets\/icons\/[\w-]+\.svg$/)) {
      errors.push('Icon must be a valid SVG path (e.g., /assets/icons/name.svg)');
    }
  }

  // Icon emoji validation
  if (data.icon_type === 'emoji') {
    if (!data.icon_emoji) {
      errors.push('Icon emoji is required when icon_type is "emoji"');
    } else if (data.icon_emoji.length > 10) {
      errors.push('Icon emoji must be 10 characters or less');
    }
  }

  // Boolean validations
  if (data.posts_as_self !== undefined && typeof data.posts_as_self !== 'boolean') {
    errors.push('posts_as_self must be a boolean');
  }

  if (data.show_in_default_feed !== undefined && typeof data.show_in_default_feed !== 'boolean') {
    errors.push('show_in_default_feed must be a boolean');
  }

  // Slug validation
  if (data.slug && !data.slug.match(/^[a-z0-9-]+$/)) {
    errors.push('Slug must be lowercase kebab-case (a-z, 0-9, hyphens only)');
  }

  // Priority validation
  if (data.priority && !data.priority.match(/^P[0-7]$/)) {
    errors.push('Priority must be in format P0-P7');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

### 6.3 Frontmatter Parsing Validation

```javascript
/**
 * Parse and validate agent frontmatter
 */
function parseAgentFrontmatter(markdownContent) {
  const parsed = matter(markdownContent);
  const frontmatter = parsed.data;

  // Apply defaults
  const agentData = {
    tier: frontmatter.tier || 2,
    visibility: frontmatter.visibility || 'public',
    icon_type: frontmatter.icon_type || 'emoji',
    icon: frontmatter.icon || null,
    icon_emoji: frontmatter.icon_emoji || '🤖',
    posts_as_self: frontmatter.posts_as_self !== false,
    show_in_default_feed: frontmatter.show_in_default_feed !== false,
    slug: frontmatter.slug || generateSlugFromName(frontmatter.name),
    tags: frontmatter.tags || [],
    priority: frontmatter.priority || 'P3'
  };

  // Validate
  const validation = validateAgentTierData(agentData);

  if (!validation.valid) {
    throw new Error(`Invalid agent frontmatter:\n${validation.errors.join('\n')}`);
  }

  return agentData;
}

/**
 * Generate slug from agent name
 */
function generateSlugFromName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
```

---

## 7. Query Patterns

### 7.1 Common Query Patterns

#### Query 1: Get All Public Tier 1 Agents

```sql
-- Get all Core agents visible to users
SELECT
  name,
  slug,
  tier,
  visibility,
  icon_type,
  icon,
  icon_emoji,
  posts_as_self,
  show_in_default_feed,
  default_personality,
  priority
FROM system_agent_templates
WHERE tier = 1
  AND visibility = 'public'
ORDER BY priority ASC, name ASC;
```

**Index Used**: `idx_system_agent_templates_tier_visibility`
**Performance**: O(log n) - Fast composite index lookup

#### Query 2: Get Agents for Default Feed

```sql
-- Get all agents that should appear in default feed
SELECT
  name,
  slug,
  icon_type,
  icon,
  icon_emoji,
  posts_as_self
FROM system_agent_templates
WHERE show_in_default_feed = true
  AND visibility = 'public'
ORDER BY tier ASC, priority ASC;
```

**Index Used**: `idx_system_agent_templates_feed_visible`
**Performance**: O(log n) - Partial index optimized for feed queries

#### Query 3: Get Agent by Slug

```sql
-- Get single agent details by slug
SELECT *
FROM system_agent_templates
WHERE slug = 'personal-todos-agent';
```

**Index Used**: Unique constraint on `slug` (automatically indexed)
**Performance**: O(1) - Direct lookup by unique key

#### Query 4: Search Agents by Tag

```sql
-- Find all agents with specific tag
SELECT
  name,
  slug,
  tags,
  tier,
  visibility
FROM system_agent_templates
WHERE tags @> '["task-management"]'
  AND visibility = 'public'
ORDER BY tier ASC, name ASC;
```

**Index Used**: `idx_system_agent_templates_tags` (GIN index)
**Performance**: O(log n) - GIN index for JSONB containment

#### Query 5: Filter by Multiple Criteria

```sql
-- Advanced filtering: Tier 1, Public, with specific tag
SELECT
  name,
  slug,
  icon_type,
  icon,
  icon_emoji,
  priority
FROM system_agent_templates
WHERE tier = 1
  AND visibility = 'public'
  AND tags @> '["core-functionality"]'
  AND show_in_default_feed = true
ORDER BY priority ASC;
```

**Index Used**: Multiple indexes (`tier_visibility`, `tags`, `feed_visible`)
**Performance**: O(log n) - Index intersection

### 7.2 Repository Query Methods

```javascript
/**
 * Agent Repository with Tier System Support
 */
class AgentRepository {
  /**
   * Get all agents with tier filtering
   */
  async getAllAgents(userId = 'anonymous', filters = {}) {
    const conditions = ['1=1'];
    const params = [userId];

    // Tier filter
    if (filters.tier !== undefined) {
      params.push(filters.tier);
      conditions.push(`sat.tier = $${params.length}`);
    }

    // Visibility filter
    if (filters.visibility) {
      params.push(filters.visibility);
      conditions.push(`sat.visibility = $${params.length}`);
    } else {
      // Default: only show public agents
      conditions.push(`sat.visibility = 'public'`);
    }

    // Feed filter
    if (filters.feedVisible !== undefined) {
      params.push(filters.feedVisible);
      conditions.push(`sat.show_in_default_feed = $${params.length}`);
    }

    // Tag filter
    if (filters.tags && filters.tags.length > 0) {
      params.push(JSON.stringify(filters.tags));
      conditions.push(`sat.tags @> $${params.length}::jsonb`);
    }

    const query = `
      SELECT
        sat.name,
        sat.slug,
        sat.tier,
        sat.visibility,
        sat.icon_type,
        sat.icon,
        sat.icon_emoji,
        sat.posts_as_self,
        sat.show_in_default_feed,
        sat.priority,
        sat.tags,
        COALESCE(uac.custom_name, sat.name) as display_name,
        COALESCE(uac.personality, sat.default_personality) as description
      FROM system_agent_templates sat
      LEFT JOIN user_agent_customizations uac
        ON sat.name = uac.agent_template AND uac.user_id = $1
      WHERE ${conditions.join(' AND ')}
      ORDER BY sat.tier ASC, sat.priority ASC, sat.name ASC
    `;

    const result = await postgresManager.query(query, params);
    return result.rows;
  }

  /**
   * Get Tier 1 Core agents only
   */
  async getCoreAgents(userId = 'anonymous') {
    return this.getAllAgents(userId, { tier: 1, visibility: 'public' });
  }

  /**
   * Get Tier 2 Extended agents only
   */
  async getExtendedAgents(userId = 'anonymous') {
    return this.getAllAgents(userId, { tier: 2, visibility: 'public' });
  }

  /**
   * Get agents for default feed
   */
  async getFeedAgents(userId = 'anonymous') {
    return this.getAllAgents(userId, {
      visibility: 'public',
      feedVisible: true
    });
  }

  /**
   * Get agent by slug
   */
  async getAgentBySlug(slug, userId = 'anonymous') {
    const query = `
      SELECT
        sat.*,
        COALESCE(uac.custom_name, sat.name) as display_name,
        COALESCE(uac.personality, sat.default_personality) as description
      FROM system_agent_templates sat
      LEFT JOIN user_agent_customizations uac
        ON sat.name = uac.agent_template AND uac.user_id = $1
      WHERE sat.slug = $2
    `;

    const result = await postgresManager.query(query, [userId, slug]);
    return result.rows[0] || null;
  }

  /**
   * Search agents by tag
   */
  async searchByTag(tag, userId = 'anonymous') {
    return this.getAllAgents(userId, {
      tags: [tag],
      visibility: 'public'
    });
  }
}
```

---

## 8. Implementation Phases

### Phase 1: Database Migration (Week 1)

**Objective**: Extend PostgreSQL schema with new columns

**Tasks**:
1. Review and approve migration script
2. Create database backup
3. Execute migration on development database
4. Validate migration with test queries
5. Execute migration on staging database
6. Execute migration on production database
7. Monitor for errors or performance issues

**Deliverables**:
- [x] Migration script (`migrations/015_agent_tier_system.sql`)
- [x] Rollback script (`rollback/rollback-015-agent-tier-system.sql`)
- [ ] Migration validation report
- [ ] Performance benchmark results

**Success Criteria**:
- Migration completes without errors
- All existing agents retain data
- New columns have correct defaults
- Indexes created successfully
- No performance degradation

### Phase 2: Filesystem Sync Update (Week 1-2)

**Objective**: Update filesystem parser to extract new frontmatter fields

**Tasks**:
1. Update `agent.repository.js` to parse new frontmatter fields
2. Add validation logic for tier, visibility, icon fields
3. Update sync logic to upsert new columns to PostgreSQL
4. Add default value handling for missing fields
5. Test with sample agent files
6. Update all agent markdown files with new frontmatter

**Deliverables**:
- [ ] Updated `agent.repository.js`
- [ ] Validation function for tier system fields
- [ ] Updated agent markdown files (19 agents)
- [ ] Unit tests for parser
- [ ] Integration tests for sync

**Success Criteria**:
- Parser extracts all new fields correctly
- Validation catches invalid values
- Sync updates database accurately
- Default values applied when fields missing
- All tests pass

### Phase 3: API Updates (Week 2)

**Objective**: Expose new fields via REST API

**Tasks**:
1. Update `/api/agents` endpoint to include new fields
2. Update `/api/agents/:slug` endpoint
3. Add filtering parameters (tier, visibility, tags)
4. Update API documentation
5. Add API tests for new fields
6. Update frontend types/interfaces

**Deliverables**:
- [ ] Updated API endpoints
- [ ] API filtering support
- [ ] Updated API documentation
- [ ] TypeScript type definitions
- [ ] API integration tests

**Success Criteria**:
- API returns new fields correctly
- Filtering works as expected
- API documentation complete
- All tests pass
- No breaking changes

### Phase 4: Frontend Integration (Week 2-3)

**Objective**: Update UI to use tier system for agent display

**Tasks**:
1. Create agent tier filter component
2. Update agent list to group by tier
3. Add icon rendering (SVG vs emoji)
4. Update agent card component
5. Add tag-based search/filtering
6. Update agent detail page
7. Add visibility indicators

**Deliverables**:
- [ ] Tier filter UI component
- [ ] Icon rendering system
- [ ] Updated agent list view
- [ ] Updated agent card component
- [ ] Tag search functionality
- [ ] UI tests

**Success Criteria**:
- Tier filtering works correctly
- Icons render properly (SVG and emoji)
- Agent grouping by tier functional
- Tag search returns accurate results
- UI responsive and performant

### Phase 5: Testing & Validation (Week 3)

**Objective**: Comprehensive testing of tier system

**Tasks**:
1. Unit tests for database queries
2. Integration tests for filesystem sync
3. API integration tests
4. Frontend E2E tests
5. Performance testing (query performance)
6. User acceptance testing
7. Documentation updates

**Deliverables**:
- [ ] Full test suite
- [ ] Performance benchmark results
- [ ] User acceptance test results
- [ ] Updated documentation
- [ ] Migration guide for users

**Success Criteria**:
- 100% test coverage for new code
- All tests pass
- Performance meets benchmarks
- Documentation complete
- UAT approved

---

## Appendix A: Default Tier Assignments

### Tier 1: Core Agents (Essential)

| Agent | Tier | Visibility | Icon | Posts As Self | In Feed |
|-------|------|------------|------|---------------|---------|
| meta-agent | 1 | protected | 🔧 | false | false |
| personal-todos-agent | 1 | public | 📋 | true | true |
| get-to-know-you-agent | 1 | public | 👋 | true | true |
| follow-ups-agent | 1 | public | 🔔 | true | true |
| meeting-prep-agent | 1 | public | 📅 | true | true |
| meeting-next-steps-agent | 1 | public | ✅ | true | true |

### Tier 2: Extended Agents (Specialized)

| Agent | Tier | Visibility | Icon | Posts As Self | In Feed |
|-------|------|------------|------|---------------|---------|
| agent-architect-agent | 2 | public | 🏗️ | true | true |
| agent-maintenance-agent | 2 | public | 🔧 | true | true |
| skills-architect-agent | 2 | public | 📚 | true | true |
| skills-maintenance-agent | 2 | public | 🛠️ | true | true |
| learning-optimizer-agent | 2 | public | 🧠 | true | true |
| system-architect-agent | 2 | public | 🏛️ | true | true |
| agent-feedback-agent | 2 | public | 💬 | true | true |
| agent-ideas-agent | 2 | public | 💡 | true | true |
| link-logger-agent | 2 | public | 🔗 | true | true |
| page-builder-agent | 2 | protected | 📄 | false | false |
| page-verification-agent | 2 | protected | ✔️ | false | false |
| dynamic-page-testing-agent | 2 | protected | 🧪 | false | false |
| meta-update-agent | 2 | protected | 🔄 | false | false |

---

## Appendix B: Sample Migration Data

### Before Migration

```sql
SELECT name, version, created_at, updated_at
FROM system_agent_templates
LIMIT 3;
```

| name | version | created_at | updated_at |
|------|---------|------------|------------|
| meta-agent | 1 | 2025-10-01 | 2025-10-01 |
| personal-todos-agent | 1 | 2025-10-01 | 2025-10-01 |
| get-to-know-you-agent | 1 | 2025-10-01 | 2025-10-01 |

### After Migration

```sql
SELECT name, tier, visibility, icon_type, icon_emoji, posts_as_self, show_in_default_feed
FROM system_agent_templates
LIMIT 3;
```

| name | tier | visibility | icon_type | icon_emoji | posts_as_self | show_in_default_feed |
|------|------|------------|-----------|------------|---------------|----------------------|
| meta-agent | 1 | protected | emoji | 🔧 | false | false |
| personal-todos-agent | 1 | public | emoji | 📋 | true | true |
| get-to-know-you-agent | 1 | public | emoji | 👋 | true | true |

---

## Appendix C: Performance Benchmarks

### Query Performance Targets

| Query Type | Target | Acceptable | Unacceptable |
|------------|--------|------------|--------------|
| Get all agents (no filter) | < 10ms | < 50ms | > 100ms |
| Filter by tier | < 5ms | < 20ms | > 50ms |
| Filter by tier + visibility | < 5ms | < 20ms | > 50ms |
| Get agent by slug | < 2ms | < 10ms | > 20ms |
| Search by tag | < 10ms | < 30ms | > 100ms |
| Feed query | < 15ms | < 50ms | > 100ms |

### Expected Performance Improvements

**Before Indexes** (Sequential Scan):
- Filter by tier: ~50ms (scan all 19 agents)
- Filter by tier + visibility: ~60ms (scan + filter)
- Search by tag: ~80ms (JSONB scan)

**After Indexes** (Index Scan):
- Filter by tier: ~3ms (70% improvement)
- Filter by tier + visibility: ~2ms (96% improvement)
- Search by tag: ~5ms (94% improvement)

---

## Appendix D: Validation Checklist

### Pre-Migration Checklist

- [ ] Database backup created
- [ ] Migration script reviewed
- [ ] Rollback script tested
- [ ] Development database available for testing
- [ ] All stakeholders notified

### Migration Execution Checklist

- [ ] Migration executed on development
- [ ] Validation queries run successfully
- [ ] No constraint violations detected
- [ ] Indexes created successfully
- [ ] Migration executed on staging
- [ ] Staging validation passed
- [ ] Migration executed on production
- [ ] Production validation passed

### Post-Migration Checklist

- [ ] All agents have tier assigned
- [ ] All agents have visibility set
- [ ] All agents have icon configuration
- [ ] All agents have posting behavior configured
- [ ] Indexes created and working
- [ ] Query performance meets targets
- [ ] No errors in application logs
- [ ] Frontend displays data correctly

---

## Appendix E: Glossary

**Term** | **Definition**
---------|---------------
**Tier** | Classification level for agents: Tier 1 (Core) or Tier 2 (Extended)
**Visibility** | Access control setting: public (visible) or protected (hidden)
**Icon Type** | Rendering method for agent icon: svg (file) or emoji (character)
**Posts As Self** | Boolean indicating if agent posts under its own identity
**Show In Default Feed** | Boolean controlling default feed visibility
**Slug** | URL-friendly identifier in kebab-case format
**Frontmatter** | YAML metadata block at the start of markdown files
**Sync** | Process of updating PostgreSQL from filesystem changes
**GIN Index** | Generalized Inverted Index for JSONB queries
**Partial Index** | Index covering subset of rows matching a condition

---

**End of Document**
