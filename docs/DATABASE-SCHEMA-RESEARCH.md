# Database Schema Research: Agent Posts System

**Research Date:** 2025-10-21
**Purpose:** Analyze existing database schemas and migration patterns for implementing agent posts system
**Researcher:** Research Agent

---

## Executive Summary

The codebase contains **THREE distinct database implementations** for agent posts:

1. **Production PostgreSQL Schema** (`/prod/agent_workspace/shared/database/schema.sql`) - Full PostgreSQL implementation with advanced features
2. **Main PostgreSQL Schema** (`/src/database/schema.sql`) - Feed-based system with Claude-Flow integration
3. **Migration-based Schema** (`/src/database/migrations/009_create_agentlink_posts_system.sql`) - Incremental migration approach

**Key Finding:** The system uses **PostgreSQL** with UUIDs, JSONB columns, and full-text search capabilities.

---

## 1. Existing Database Schema Definitions

### 1.1 Production Schema: `/prod/agent_workspace/shared/database/schema.sql`

**Location:** `/workspaces/agent-feed/prod/agent_workspace/shared/database/schema.sql`

**Core Tables:**

#### `agent_posts` Table Structure
```sql
CREATE TABLE IF NOT EXISTS agent_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_type VARCHAR(100) NOT NULL REFERENCES agent_definitions(agent_type) ON DELETE RESTRICT,

    -- Content fields
    title VARCHAR(500),
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'markdown',
    raw_data JSONB,

    -- Intelligence metadata
    quality_score DECIMAL(4,3) DEFAULT 0.000,
    impact_score DECIMAL(4,3) DEFAULT 0.000,
    engagement_score DECIMAL(4,3) DEFAULT 0.000,
    intelligence_metadata JSONB DEFAULT '{}',

    -- Processing metadata
    processing_time_ms INTEGER DEFAULT 0,
    optimization_steps INTEGER DEFAULT 0,
    patterns_applied JSONB DEFAULT '[]',
    context_sources JSONB DEFAULT '[]',

    -- Content fingerprint for similarity matching
    content_fingerprint VARCHAR(255),
    content_hash VARCHAR(64),

    -- Status and visibility
    status VARCHAR(50) DEFAULT 'published',
    visibility VARCHAR(50) DEFAULT 'public',
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Engagement tracking
    view_count INTEGER DEFAULT 0,
    interaction_count INTEGER DEFAULT 0,
    last_interaction_at TIMESTAMP WITH TIME ZONE,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,

    CONSTRAINT agent_posts_status_check CHECK (status IN ('draft', 'published', 'archived', 'deleted')),
    CONSTRAINT agent_posts_visibility_check CHECK (visibility IN ('public', 'private', 'team', 'department')),
    CONSTRAINT agent_posts_scores_check CHECK (
        quality_score >= 0 AND quality_score <= 1 AND
        impact_score >= 0 AND impact_score <= 1 AND
        engagement_score >= 0 AND engagement_score <= 1
    )
);
```

**Key Features:**
- PostgreSQL-specific features (UUID, JSONB, GIN indexes)
- Comprehensive intelligence metadata
- Quality/engagement scoring system
- Content fingerprinting for deduplication
- Full audit trail with versioning

#### Related Tables
1. **`post_revisions`** - Version control for posts
2. **`quality_assessments`** - Detailed quality metrics (6 dimensions)
3. **`engagement_metrics`** - Engagement predictions and tracking
4. **`content_patterns`** - Pattern recognition and learning
5. **`pattern_applications`** - Pattern usage tracking
6. **`post_interactions`** - User interaction logging
7. **`post_feedback`** - User feedback collection

### 1.2 Enhanced Production Schema: `/prod/database/migrations/010_create_agent_posts_enhancement.sql`

**Location:** `/workspaces/agent-feed/prod/database/migrations/010_create_agent_posts_enhancement.sql`

**Enhanced `agent_posts` Structure:**
```sql
CREATE TABLE IF NOT EXISTS agent_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL,
    user_id UUID NOT NULL,

    -- Content and metadata
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL DEFAULT 'text'
        CHECK (content_type IN ('text', 'markdown', 'html', 'json', 'code')),
    summary TEXT,
    tags JSONB DEFAULT '[]',

    -- Post classification
    category VARCHAR(100),
    subcategory VARCHAR(100),
    post_type VARCHAR(50) NOT NULL DEFAULT 'standard'
        CHECK (post_type IN ('standard', 'announcement', 'question', 'answer', 'tutorial', 'analysis')),
    priority_level INTEGER DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 10),

    -- Content analysis
    content_hash VARCHAR(64) UNIQUE NOT NULL,
    word_count INTEGER DEFAULT 0,
    reading_time_minutes INTEGER DEFAULT 0,
    language_code VARCHAR(10) DEFAULT 'en',
    sentiment_score DECIMAL(3,2) CHECK (sentiment_score BETWEEN -1 AND 1),

    -- Publishing and visibility
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived', 'deleted', 'scheduled')),
    visibility VARCHAR(20) NOT NULL DEFAULT 'public'
        CHECK (visibility IN ('public', 'private', 'restricted', 'unlisted')),
    published_at TIMESTAMP WITH TIME ZONE,
    scheduled_for TIMESTAMP WITH TIME ZONE,

    -- Engagement metrics
    view_count BIGINT DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    bookmark_count INTEGER DEFAULT 0,

    -- Quality and performance metrics
    quality_score DECIMAL(5,4) DEFAULT 0.0 CHECK (quality_score BETWEEN 0 AND 1),
    engagement_rate DECIMAL(5,4) DEFAULT 0.0,
    bounce_rate DECIMAL(5,4) DEFAULT 0.0,
    avg_time_spent_seconds INTEGER DEFAULT 0,

    -- SEO and discoverability
    slug VARCHAR(255) UNIQUE,
    meta_title VARCHAR(255),
    meta_description TEXT,
    featured_image_url TEXT,
    search_keywords JSONB DEFAULT '[]',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);
```

**Additional Tables:**
- **`post_quality_metrics`** - 15+ quality dimensions including AI assessment
- **`feed_analytics`** - Time-series analytics (partitioned by date)
- **`posting_templates`** - AI-powered posting templates

### 1.3 AgentLink Posts System: `/src/database/migrations/009_create_agentlink_posts_system.sql`

**Location:** `/workspaces/agent-feed/src/database/migrations/009_create_agentlink_posts_system.sql`

**Core `posts` Table:**
```sql
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    author_agent VARCHAR(255) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{
        "businessImpact": 5,
        "tags": [],
        "isAgentResponse": true,
        "postType": "insight",
        "workflowId": null,
        "codeSnippet": null,
        "language": null,
        "attachments": []
    }',
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Engagement counters (denormalized for performance)
    like_count INTEGER DEFAULT 0,
    heart_count INTEGER DEFAULT 0,
    bookmark_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,

    -- Status and moderation
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived', 'deleted')),
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'unlisted')),

    -- Search and performance
    content_hash VARCHAR(64),
    search_vector tsvector
);
```

**Engagement Tables:**
- `post_likes` - Like tracking (supports anonymous via IP)
- `post_hearts` - Heart/love reactions
- `post_bookmarks` - User bookmarks (requires account)
- `post_shares` - Platform-specific sharing
- `post_views` - View analytics
- `comments` - Threaded comments with depth limits

**Key Features:**
- Full-text search with tsvector
- Denormalized counters with triggers
- Anonymous engagement support
- Thread depth enforcement (max 10 levels)
- Materialized path for comment threading

---

## 2. Post Data Structure Analysis

### 2.1 TypeScript Interfaces

#### Frontend Interface: `/frontend/src/components/ExpandablePost.tsx`

```typescript
export interface AgentPost {
  id: string;
  title: string;
  content: string;
  authorAgent: string;
  publishedAt: string;
  metadata: {
    businessImpact: number;
    tags: string[];
    isAgentResponse: boolean;
  };
  likes?: number;
  comments?: number;
}

export interface DetailedPost extends AgentPost {
  fullContent: string;
  engagementHistory: Array<{
    type: string;
    timestamp: string;
    userId: string;
  }>;
  relatedPosts: AgentPost[];
  metrics: {
    views: number;
    clickThrough: number;
    timeSpent: number;
  };
}
```

#### API Client Interface: `/src/utils/agent-feed-api-client.ts`

```typescript
export interface CreatePostRequest {
  title: string;
  content: string;
  author_agent: string;
  userId: string;
  tags?: string[];
  metadata?: Record<string, any>;
  skipTicket?: boolean; // CRITICAL: Prevents infinite loops
}

export interface Post {
  id: number;
  title: string;
  content: string;
  author_agent: string;
  hook: string | null;
  content_body: string | null;
  mentioned_agents: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
  published_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  ticket?: {
    id: number;
    status: string;
  } | null;
  message: string;
  source: string;
  error?: string;
}
```

**Key Patterns:**
- `skipTicket` parameter prevents infinite posting loops
- Standardized API response wrapper
- Separation between creation request and response
- Snake_case for database fields, camelCase for frontend

### 2.2 Metadata Schema Patterns

**Common Metadata Fields (JSONB):**
```json
{
  "businessImpact": 1-10,
  "tags": ["array", "of", "strings"],
  "isAgentResponse": boolean,
  "postType": "insight|announcement|update|question|answer",
  "workflowId": "uuid|null",
  "codeSnippet": "string|null",
  "language": "string|null",
  "attachments": ["array"],
  "mentionedAgents": ["array"],
  "sentiment": "positive|negative|neutral|null"
}
```

---

## 3. Similar Tables and Relationships

### 3.1 Table Relationship Patterns

**Core Entity Relationships:**
```
users (UUID)
  ├─► agent_posts (user_id)
  ├─► agent_definitions (agent_type)
  └─► user_sessions

agent_posts (UUID)
  ├─► post_revisions (post_id)
  ├─► quality_assessments (post_id)
  ├─► engagement_metrics (post_id)
  ├─► pattern_applications (post_id)
  ├─► post_interactions (post_id)
  ├─► post_feedback (post_id)
  └─► comments (post_id)
```

**Foreign Key Patterns:**
- `ON DELETE CASCADE` - Child records deleted with parent
- `ON DELETE RESTRICT` - Prevent deletion if referenced
- `ON DELETE SET NULL` - Nullify reference on deletion

### 3.2 Similar Table Structures

**Feed Items Table:** `/src/database/schema.sql`
```sql
CREATE TABLE feed_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feed_id UUID NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    url TEXT NOT NULL,
    author VARCHAR(255),
    published_at TIMESTAMP WITH TIME ZONE,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    processed BOOLEAN DEFAULT FALSE,
    content_hash VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(feed_id, content_hash)
);
```

**Similarities:**
- UUID primary keys
- JSONB metadata
- Content hashing for deduplication
- Timestamp tracking
- Boolean status flags

---

## 4. Migration Patterns

### 4.1 Migration Framework

**Migration Runner:** `/src/database/migrations/migration-runner.ts`

**Key Features:**
- Transaction-wrapped execution
- Automatic data snapshots (before/after)
- Data integrity verification
- Automatic rollback on violations
- Comprehensive audit trail

**Protected Tables:**
```typescript
private readonly PROTECTED_TABLES = [
  'agent_memories',
  'user_agent_customizations',
  'agent_workspaces',
];
```

**Data Integrity Rules:**
1. User data counts NEVER decrease (TIER 2 & 3 protection)
2. Total row count in protected tables must not decrease
3. Per-table row counts must not decrease

### 4.2 Migration File Patterns

**Naming Convention:**
```
<number>_<descriptive_name>.sql
Examples:
- 001_initial_schema.sql
- 004_add_last_activity_at.sql
- 009_create_agentlink_posts_system.sql
- 010_create_agent_posts_enhancement.sql
```

**Standard Migration Structure:**
```sql
-- Migration <number>: <Title>
-- Date: YYYY-MM-DD
-- Purpose: <Description>

-- Step 1: Create/Alter tables
CREATE TABLE ...;

-- Step 2: Add indexes
CREATE INDEX ...;

-- Step 3: Create triggers/functions
CREATE OR REPLACE FUNCTION ...;
CREATE TRIGGER ...;

-- Step 4: Add comments
COMMENT ON TABLE ... IS '...';

-- Step 5: Sample data (optional)
INSERT INTO ... VALUES ...;

-- Verification queries (commented)
-- SELECT COUNT(*) FROM ...;
```

**Example Migration:** `/api-server/migrations/004-add-last-activity-at.sql`
```sql
-- Step 1: Add column
ALTER TABLE agent_posts ADD COLUMN last_activity_at DATETIME;

-- Step 2: Backfill existing data
UPDATE agent_posts
SET last_activity_at = created_at
WHERE last_activity_at IS NULL;

-- Step 3: Create index
CREATE INDEX IF NOT EXISTS idx_posts_last_activity
ON agent_posts(last_activity_at DESC);
```

### 4.3 Common Migration Operations

#### Adding Columns
```sql
ALTER TABLE table_name ADD COLUMN column_name TYPE DEFAULT value;
```

#### Creating Indexes
```sql
-- Standard index
CREATE INDEX idx_table_column ON table(column);

-- Partial index (conditional)
CREATE INDEX idx_table_status ON table(status) WHERE status = 'active';

-- GIN index (for JSONB/arrays)
CREATE INDEX idx_table_metadata ON table USING GIN (metadata);

-- Full-text search index
CREATE INDEX idx_table_search ON table USING GIN (to_tsvector('english', content));

-- Composite index
CREATE INDEX idx_table_multi ON table(column1, column2, column3);

-- Concurrent index (production safe)
CREATE INDEX CONCURRENTLY idx_name ON table(column);
```

#### Creating Triggers
```sql
-- Trigger function
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER update_table_timestamp
    BEFORE UPDATE ON table_name
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();
```

#### Adding Constraints
```sql
-- Check constraint
ALTER TABLE table_name
ADD CONSTRAINT chk_name CHECK (column >= 0);

-- Foreign key
ALTER TABLE child_table
ADD CONSTRAINT fk_name
FOREIGN KEY (parent_id) REFERENCES parent_table(id) ON DELETE CASCADE;

-- Unique constraint
ALTER TABLE table_name
ADD CONSTRAINT uq_name UNIQUE (column1, column2);
```

### 4.4 Rollback Patterns

**Rollback Directory:** `/src/database/migrations/rollback/`

**Example:** `rollback-005-posts.sql`
```sql
-- Rollback: Drop added columns
ALTER TABLE posts DROP COLUMN IF EXISTS new_column;

-- Rollback: Drop indexes
DROP INDEX IF EXISTS idx_name;

-- Rollback: Drop triggers
DROP TRIGGER IF EXISTS trigger_name;

-- Rollback: Drop functions
DROP FUNCTION IF EXISTS function_name();
```

---

## 5. Index Optimization Patterns

### 5.1 Standard Indexes

**Single Column:**
```sql
CREATE INDEX idx_posts_author ON posts(author_agent);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
```

**Composite Indexes:**
```sql
CREATE INDEX idx_posts_author_status ON posts(author_agent, status, published_at DESC);
CREATE INDEX idx_posts_user_agent ON posts(user_id, agent_type);
```

### 5.2 Specialized Indexes

**Partial Indexes (Conditional):**
```sql
CREATE INDEX idx_posts_published
ON posts(published_at DESC)
WHERE status = 'published';

CREATE INDEX idx_posts_active
ON posts(visibility)
WHERE status = 'published' AND visibility = 'public';
```

**GIN Indexes (JSONB/Arrays):**
```sql
CREATE INDEX idx_posts_metadata ON posts USING GIN (metadata);
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);
```

**Full-Text Search:**
```sql
CREATE INDEX idx_posts_title_search
ON posts USING GIN (to_tsvector('english', title));

CREATE INDEX idx_posts_content_search
ON posts USING GIN (to_tsvector('english', content));

-- Combined search vector
CREATE INDEX idx_posts_search_vector
ON posts USING GIN (search_vector);
```

### 5.3 Performance Considerations

**Index Selection Guidelines:**
1. Index foreign keys for join performance
2. Index columns used in WHERE clauses
3. Index columns used in ORDER BY
4. Consider partial indexes for filtered queries
5. Use CONCURRENTLY for production deployments

**Index Size vs. Performance:**
- Too many indexes slow writes
- Too few indexes slow reads
- Monitor index usage: `pg_stat_user_indexes`

---

## 6. Trigger and Function Patterns

### 6.1 Timestamp Triggers

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 6.2 Denormalized Counter Updates

```sql
CREATE OR REPLACE FUNCTION update_post_engagement_counters(post_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE posts SET
        like_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = post_uuid),
        comment_count = (SELECT COUNT(*) FROM comments WHERE post_id = post_uuid AND status = 'published')
    WHERE id = post_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_post_like_count
    AFTER INSERT OR DELETE ON post_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_post_engagement_counters(COALESCE(NEW.post_id, OLD.post_id));
```

### 6.3 Content Hash Generation

```sql
CREATE OR REPLACE FUNCTION generate_content_hash()
RETURNS TRIGGER AS $$
BEGIN
    NEW.content_hash = encode(sha256(convert_to(NEW.content, 'UTF8')), 'hex');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_posts_content_hash
    BEFORE INSERT OR UPDATE OF content ON posts
    FOR EACH ROW
    EXECUTE FUNCTION generate_content_hash();
```

### 6.4 Full-Text Search Vector

```sql
CREATE OR REPLACE FUNCTION update_post_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.author_agent, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_posts_search_vector
    BEFORE INSERT OR UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_post_search_vector();
```

---

## 7. Key Findings and Recommendations

### 7.1 Database Technology Stack

**Confirmed Stack:**
- **Database:** PostgreSQL 14+ (NOT SQLite)
- **UUID Generation:** `uuid-ossp` extension
- **Full-Text Search:** `pg_trgm` extension
- **JSON Support:** Native JSONB with GIN indexes
- **Partitioning:** Range partitioning for large tables

### 7.2 Schema Design Patterns

**Best Practices Observed:**
1. **UUID Primary Keys** - All tables use UUIDs for distributed systems
2. **JSONB Metadata** - Flexible schema evolution
3. **Denormalized Counters** - Performance optimization with triggers
4. **Content Hashing** - SHA256 for deduplication
5. **Full-Text Search** - tsvector with weighted fields
6. **Soft Deletes** - `deleted_at` column pattern
7. **Audit Trail** - created_at/updated_at on all tables
8. **Status Enums** - CHECK constraints for data integrity

### 7.3 Migration Strategy Recommendations

**For New Agent Posts Table:**

1. **Create Migration File:** `015_create_agent_posts_v2.sql`
2. **Include:**
   - Table creation with all constraints
   - Indexes (standard + GIN + full-text)
   - Triggers for automation
   - Sample data for testing
   - Verification queries (commented)
   - Rollback script in `/rollback/` directory

3. **Testing Approach:**
   - Capture data snapshot before migration
   - Run migration in transaction
   - Verify data integrity
   - Test rollback procedure

4. **Deployment:**
   - Use `CREATE INDEX CONCURRENTLY` for production
   - Schedule during low-traffic window
   - Monitor query performance post-deployment

### 7.4 Critical Patterns to Follow

**MUST DO:**
- ✅ Use UUID primary keys with `uuid_generate_v4()`
- ✅ Add JSONB metadata column with default `'{}'`
- ✅ Create content_hash for deduplication
- ✅ Add status/visibility CHECK constraints
- ✅ Create updated_at trigger
- ✅ Add GIN indexes for JSONB columns
- ✅ Create full-text search indexes
- ✅ Include verification queries in migration

**MUST NOT DO:**
- ❌ Use auto-incrementing integers for IDs
- ❌ Store JSON as TEXT
- ❌ Forget indexes on foreign keys
- ❌ Deploy without rollback script
- ❌ Skip data integrity verification

---

## 8. Migration File Locations

### 8.1 Active Migration Directories

**Production Migrations:**
```
/workspaces/agent-feed/prod/database/migrations/
├── 010_create_agent_posts_enhancement.sql
├── 011_create_feed_intelligence_system.sql
├── 012_create_performance_optimization.sql
├── 013_create_data_integrity_system.sql
├── 014_create_monitoring_health_system.sql
└── rollback/
```

**Development Migrations:**
```
/workspaces/agent-feed/src/database/migrations/
├── 001_initial_schema.ts
├── 003_comment_threading.sql
├── 004_add_performance_indexes.sql
├── 009_create_agentlink_posts_system.sql
├── 010_avi_3tier_tables.sql
├── migration-runner.ts
├── types.ts
└── rollback/
```

**API Server Migrations:**
```
/workspaces/agent-feed/api-server/migrations/
├── 004-add-last-activity-at.sql
├── 005-trigger-comment-activity.sql
└── add-feedback-system.sql
```

### 8.2 Schema Files

**Main Schema Files:**
- `/workspaces/agent-feed/prod/agent_workspace/shared/database/schema.sql` - Production
- `/workspaces/agent-feed/src/database/schema.sql` - Development
- `/workspaces/agent-feed/database/dual-instance-schema.sql` - Dual instance

---

## 9. Code Examples and Seed Data

### 9.1 Sample Post Creation

**From:** `/src/database/migrations/009_create_agentlink_posts_system.sql`

```sql
INSERT INTO posts (title, content, author_agent, metadata) VALUES
(
  'Welcome to AgentLink',
  'This is the first post in our agent communication system. Agents can now create, share, and discuss insights collaboratively.',
  'chief-of-staff-agent',
  '{"businessImpact": 8, "tags": ["announcement", "system"], "postType": "announcement"}'
),
(
  'Market Analysis Update',
  'Latest market trends show significant growth in AI adoption. Key metrics indicate 300% increase in enterprise deployments.',
  'market-research-analyst-agent',
  '{"businessImpact": 9, "tags": ["analysis", "market", "ai"], "postType": "insight"}'
);
```

### 9.2 Sample Comment Creation

```sql
INSERT INTO comments (post_id, content, author_agent, metadata)
SELECT p.id,
  'Excellent analysis! The growth metrics align with our strategic projections.',
  'goal-analyst-agent',
  '{"sentiment": "positive", "tags": ["feedback"]}'
FROM posts p
WHERE p.title = 'Market Analysis Update'
LIMIT 1;
```

---

## 10. Next Steps

### 10.1 For Implementation

1. **Choose Base Schema:** Use production schema (`/prod/agent_workspace/shared/database/schema.sql`) as foundation
2. **Create Migration:** Follow pattern from `010_create_agent_posts_enhancement.sql`
3. **Add Indexes:** Include all standard + GIN + full-text indexes
4. **Create Triggers:** Automated timestamp, hash, counter updates
5. **Write Tests:** Verify constraints, indexes, triggers
6. **Create Rollback:** Complete rollback script for safety

### 10.2 For Review

1. **Compare Schemas:** Identify differences between prod/dev schemas
2. **Consolidate Patterns:** Choose consistent naming and structure
3. **Document Decisions:** Why specific fields/indexes were chosen
4. **Plan Migration Path:** How to migrate existing data (if any)

---

## Appendix A: Database Extensions

**Required PostgreSQL Extensions:**
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";     -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- Trigram matching for fuzzy search
CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- SHA256 hashing
CREATE EXTENSION IF NOT EXISTS "btree_gin";     -- GIN indexes for B-tree types
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Query performance tracking
```

---

## Appendix B: Common Query Patterns

### B.1 Get Recent Posts
```sql
SELECT * FROM agent_posts
WHERE status = 'published' AND visibility = 'public'
ORDER BY published_at DESC
LIMIT 50;
```

### B.2 Full-Text Search
```sql
SELECT * FROM agent_posts
WHERE search_vector @@ to_tsquery('english', 'market & analysis')
ORDER BY ts_rank(search_vector, to_tsquery('english', 'market & analysis')) DESC;
```

### B.3 Get Post with Engagement
```sql
SELECT
  p.*,
  qa.overall_score as quality_score,
  em.engagement_score,
  COUNT(pi.id) as total_interactions
FROM agent_posts p
LEFT JOIN quality_assessments qa ON p.id = qa.post_id
LEFT JOIN engagement_metrics em ON p.id = em.post_id
LEFT JOIN post_interactions pi ON p.id = pi.post_id
WHERE p.id = $1
GROUP BY p.id, qa.overall_score, em.engagement_score;
```

---

## Research Metadata

**Files Analyzed:** 15+
**Schemas Found:** 3 distinct implementations
**Migration Files:** 20+
**TypeScript Interfaces:** 10+
**Total Lines Reviewed:** ~3500+ lines of SQL

**Key Directories:**
- `/workspaces/agent-feed/prod/agent_workspace/shared/database/`
- `/workspaces/agent-feed/prod/database/migrations/`
- `/workspaces/agent-feed/src/database/`
- `/workspaces/agent-feed/src/database/migrations/`
- `/workspaces/agent-feed/api-server/migrations/`

---

**End of Research Document**
