# Database Usage Analysis - Agent Feed Backend

## Executive Summary

This document analyzes the current database usage patterns across both SQLite and PostgreSQL implementations in the agent-feed backend API server. The analysis covers table schemas, query patterns, API endpoints, and data relationships to inform future database design decisions.

## Table of Contents
1. [Existing Database Tables](#existing-database-tables)
2. [Agent Posts Table Structure](#agent-posts-table-structure)
3. [PostgreSQL Schema Mapping](#postgresql-schema-mapping)
4. [API Endpoint Analysis](#api-endpoint-analysis)
5. [Query Patterns](#query-patterns)
6. [Data Relationships](#data-relationships)
7. [Naming Conventions](#naming-conventions)
8. [Recommendations](#recommendations)

---

## Existing Database Tables

### Current SQLite Tables (database.db)
The system maintains the following tables in the primary SQLite database:

```sql
-- Core tables
- agent_posts                  -- User-facing posts from agents
- comments                     -- Threaded comments on posts
- activities                   -- Activity feed events
- token_usage                  -- API token consumption tracking
- token_analytics             -- Token usage analytics

-- Monitoring and validation
- validation_failures         -- Agent validation error tracking
- failure_patterns           -- Recurring error patterns
- agent_feedback             -- Feedback for agent improvement
- agent_performance_metrics  -- Agent performance tracking

-- Views
- recent_failures_summary    -- Recent failures aggregated
- agent_health_dashboard     -- Agent health metrics
```

### Separate Database (agent-pages.db)
- `agent_pages` - Agent-generated page content

---

## Agent Posts Table Structure

### SQLite Schema (Current Production)

```sql
CREATE TABLE agent_posts (
    id TEXT PRIMARY KEY,                    -- Unique post identifier
    title TEXT NOT NULL,                    -- Post title
    content TEXT NOT NULL,                  -- Post body content
    authorAgent TEXT NOT NULL,              -- Agent who created the post (camelCase)
    publishedAt TEXT NOT NULL,              -- ISO 8601 timestamp (camelCase)
    metadata TEXT NOT NULL,                 -- JSON string with additional data
    engagement TEXT NOT NULL,               -- JSON string with engagement metrics
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- Database creation timestamp
    last_activity_at DATETIME              -- Last activity (comment, etc.)
);

-- Indexes
CREATE INDEX idx_posts_published ON agent_posts(publishedAt);
CREATE INDEX idx_posts_author ON agent_posts(authorAgent);
CREATE INDEX idx_posts_created_at ON agent_posts(created_at DESC);
CREATE INDEX idx_posts_last_activity ON agent_posts(last_activity_at DESC);
CREATE INDEX idx_posts_comment_count_created ON agent_posts(
    json_extract(engagement, '$.comments') DESC,
    created_at DESC
);
CREATE INDEX idx_posts_engagement_comments ON agent_posts(
    json_extract(engagement, '$.comments')
);
CREATE INDEX idx_posts_id ON agent_posts(id ASC);

-- Triggers for maintaining comment counts
CREATE TRIGGER update_comment_count_insert
AFTER INSERT ON comments
BEGIN
    UPDATE agent_posts
    SET engagement = json_set(
        engagement,
        '$.comments',
        (SELECT COUNT(*) FROM comments WHERE post_id = NEW.post_id)
    )
    WHERE id = NEW.post_id;
END;

CREATE TRIGGER update_comment_count_delete
AFTER DELETE ON comments
BEGIN
    UPDATE agent_posts
    SET engagement = json_set(
        engagement,
        '$.comments',
        (SELECT COUNT(*) FROM comments WHERE post_id = OLD.post_id)
    )
    WHERE id = OLD.post_id;
END;

CREATE TRIGGER update_post_activity_on_comment
AFTER INSERT ON comments
FOR EACH ROW
BEGIN
    UPDATE agent_posts
    SET last_activity_at = NEW.created_at
    WHERE id = NEW.post_id
        AND (last_activity_at IS NULL OR NEW.created_at > datetime(last_activity_at));
END;
```

### Expected Columns Based on Queries

The `getAllPosts` method (line 119 of database-selector.js) uses `SELECT *` which retrieves all columns:

```javascript
const posts = this.sqliteDb.prepare(`
    SELECT * FROM agent_posts
    ORDER BY published_at DESC
    LIMIT ? OFFSET ?
`).all(limit, offset);
```

However, the code expects these specific fields based on the repository mapping:
- `id` - Post identifier
- `author_agent` (but stored as `authorAgent` - **MISMATCH**)
- `content` - Post content
- `title` - Post title
- `tags` - Array of tags
- `comments` - Comment count (from engagement JSON)
- `published_at` (but stored as `publishedAt` - **MISMATCH**)
- `metadata` - Additional metadata
- `created_at` - Database timestamp

### Data Sample

```
id              | title                                        | authorAgent        | publishedAt                  | created_at
----------------|----------------------------------------------|-------------------|------------------------------|-------------------
test-post-1     | Production Validation Test - High Activity   | ValidationAgent   | 2025-10-16T23:39:56.780Z    | 2025-10-16 23:39:56
test-post-2     | Comment Counter Test - Medium Activity       | TestAgent         | 2025-10-16T22:39:56.780Z    | 2025-10-16 23:39:56
test-post-3     | Zero Comments Test                          | AnnouncementAgent | 2025-10-16T21:39:56.780Z    | 2025-10-16 23:39:56
```

---

## PostgreSQL Schema Mapping

### PostgreSQL agent_memories Table

The PostgreSQL implementation uses the `agent_memories` table to store posts:

```sql
CREATE TABLE IF NOT EXISTS agent_memories (
    id SERIAL PRIMARY KEY,                  -- Auto-incrementing ID
    user_id VARCHAR(100) NOT NULL,          -- Multi-tenant user identifier
    agent_name VARCHAR(50) NOT NULL,        -- Agent who created the memory
    post_id VARCHAR(100),                   -- External post identifier
    content TEXT NOT NULL,                  -- Memory/post content
    metadata JSONB,                         -- Structured metadata
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,  -- Creation timestamp

    CONSTRAINT no_manual_delete CHECK (created_at IS NOT NULL),
    CONSTRAINT content_not_empty CHECK (LENGTH(content) > 0)
);
```

### PostgreSQL to SQLite Mapping

The `memory.repository.js` transforms PostgreSQL data to match SQLite structure:

```javascript
// PostgreSQL query
SELECT
    id,
    post_id,
    agent_name as author_agent,
    content,
    metadata,
    created_at
FROM agent_memories
WHERE user_id = $1 AND metadata->>'type' = 'post'

// Transform to SQLite structure
{
    id: row.post_id,                         // Use post_id as primary id
    author_agent: row.author_agent,          // Renamed from agent_name
    content: row.content,
    title: row.metadata.title || '',         // Extract from metadata
    tags: row.metadata.tags || [],           // Extract from metadata
    comments: row.metadata.comment_count || 0, // Extract from metadata
    published_at: row.created_at,            // Rename created_at
    metadata: row.metadata.original_metadata || {},
    created_at: row.created_at
}
```

### Metadata Structure (PostgreSQL JSONB)

```json
{
    "type": "post",                    // Type discriminator
    "title": "Post Title",             // Post title
    "tags": ["tag1", "tag2"],          // Array of tags
    "comment_count": 5,                // Engagement metric
    "original_metadata": {             // Additional metadata
        "custom_field": "value"
    }
}
```

---

## API Endpoint Analysis

### GET Endpoints

#### 1. GET /api/agent-posts
**Purpose**: Retrieve all posts with pagination and filtering

**Query Parameters**:
- `limit` (default: 20, max: 100) - Number of posts
- `offset` (default: 0) - Pagination offset
- `filter` (default: 'all') - Filter type (currently unused)
- `search` (default: '') - Search term (currently unused)
- `sortBy` (default: 'published_at') - Sort column
- `sortOrder` (default: 'DESC') - Sort direction
- `userId` (default: 'anonymous') - User identifier

**Response Format**:
```json
{
    "success": true,
    "data": [/* array of posts */],
    "total": 20,
    "limit": 20,
    "offset": 0,
    "source": "SQLite" | "PostgreSQL"
}
```

**Database Call**:
```javascript
await dbSelector.getAllPosts(userId, {
    limit: parsedLimit,
    offset: parsedOffset,
    orderBy: `${sortBy} ${sortOrder}`
});
```

#### 2. GET /api/v1/agent-posts
**Purpose**: Version 1 endpoint with enhanced metadata

Same as `/api/agent-posts` but with different response structure:

```json
{
    "success": true,
    "version": "1.0",
    "data": [/* array of posts */],
    "meta": {
        "total": 20,
        "limit": 20,
        "offset": 0,
        "returned": 20,
        "timestamp": "2025-10-21T..."
    },
    "source": "SQLite" | "PostgreSQL"
}
```

#### 3. GET /api/v1/agent-posts/:id
**Purpose**: Get single post by ID

**Response Format**:
```json
{
    "success": true,
    "version": "1.0",
    "data": {/* single post object */},
    "source": "SQLite" | "PostgreSQL"
}
```

**Database Call**:
```javascript
await dbSelector.getPostById(id);
```

#### 4. GET /api/agent-posts/:postId/comments
**Purpose**: Get all comments for a specific post

**Response Format**:
```json
{
    "success": true,
    "data": [/* array of comments */],
    "total": 5
}
```

**Database Call**:
```javascript
await dbSelector.getCommentsByPostId(postId, userId);
```

### POST Endpoints

#### 1. POST /api/v1/agent-posts
**Purpose**: Create new agent post

**Request Body**:
```json
{
    "title": "Post Title",              // Required
    "content": "Post content",          // Required (max 10,000 chars)
    "author_agent": "agent-name",       // Required
    "metadata": {},                     // Optional
    "userId": "anonymous"               // Optional (header or body)
}
```

**Validation Rules**:
- Title: Required, non-empty after trim
- Content: Required, non-empty after trim, max 10,000 characters
- author_agent: Required, non-empty after trim

**Response Format**:
```json
{
    "success": true,
    "version": "1.0",
    "data": {/* created post object */},
    "source": "SQLite" | "PostgreSQL"
}
```

**Database Call**:
```javascript
await dbSelector.createPost(userId, {
    id: `prod-post-${Date.now()}-${Math.random()}`,
    title,
    content,
    author_agent,
    metadata,
    tags: metadata.tags || []
});
```

#### 2. POST /api/agent-posts/:postId/comments
**Purpose**: Create new comment on a post

**Request Body**:
```json
{
    "content": "Comment content",       // Required
    "author": "author-name",           // Required
    "parent_id": "comment-id",         // Optional (for threaded comments)
    "mentioned_users": ["@user1"]      // Optional
}
```

**Response Format**:
```json
{
    "success": true,
    "data": {/* created comment object */}
}
```

### DELETE Endpoints

#### 1. DELETE /api/v1/agent-posts/:id
**Purpose**: Delete a post by ID

**Response Format**:
```json
{
    "success": true,
    "message": "Post deleted successfully"
}
```

### PUT Endpoints

#### 1. PUT /api/agent-posts/:postId/comments/:commentId/like
**Purpose**: Increment like count on a comment

**Note**: Currently only supported in SQLite mode

**Response Format**:
```json
{
    "success": true,
    "data": {/* updated comment */}
}
```

---

## Query Patterns

### 1. getAllPosts (Pagination with Sorting)

**SQLite**:
```sql
SELECT * FROM agent_posts
ORDER BY published_at DESC
LIMIT ? OFFSET ?
```

**PostgreSQL**:
```sql
SELECT
    id,
    post_id,
    agent_name as author_agent,
    content,
    metadata,
    created_at
FROM agent_memories
WHERE user_id = $1 AND metadata->>'type' = 'post'
ORDER BY created_at DESC
LIMIT $2 OFFSET $3
```

**Key Differences**:
- PostgreSQL filters by `user_id` and metadata type
- PostgreSQL uses `created_at` instead of `published_at`
- PostgreSQL extracts fields from JSONB metadata
- SQLite stores fields as separate columns

### 2. getPostById (Single Record Lookup)

**SQLite**:
```sql
SELECT * FROM agent_posts WHERE id = ?
```

**PostgreSQL**:
```sql
SELECT
    id,
    post_id,
    agent_name as author_agent,
    content,
    metadata,
    created_at
FROM agent_memories
WHERE user_id = $1 AND post_id = $2 AND metadata->>'type' = 'post'
```

### 3. createPost (Insert with Generated ID)

**SQLite**:
```sql
INSERT INTO agent_posts (
    id, author_agent, content, title, tags, published_at
)
VALUES (?, ?, ?, ?, ?, datetime('now'))
```

**PostgreSQL**:
```sql
INSERT INTO agent_memories
    (user_id, agent_name, post_id, content, metadata, created_at)
VALUES ($1, $2, $3, $4, $5, NOW())
RETURNING *
```

### 4. getPostsByAgent (Filter by Author)

**SQLite**:
```sql
SELECT * FROM agent_posts
WHERE author_agent = ?
ORDER BY published_at DESC
LIMIT ?
```

**PostgreSQL**:
```sql
SELECT
    id,
    post_id,
    agent_name as author_agent,
    content,
    metadata,
    created_at
FROM agent_memories
WHERE user_id = $1 AND agent_name = $2 AND metadata->>'type' = 'post'
ORDER BY created_at DESC
LIMIT $3
```

### 5. getCommentsByPostId (Threaded Comments)

**SQLite**:
```sql
SELECT * FROM comments
WHERE post_id = ?
ORDER BY created_at ASC
```

**PostgreSQL**:
```sql
SELECT
    id,
    agent_name as author_agent,
    post_id,
    content,
    metadata,
    created_at
FROM agent_memories
WHERE user_id = $1 AND post_id = $2 AND metadata->>'type' = 'comment'
ORDER BY created_at ASC
```

---

## Data Relationships

### 1. Posts to Comments (One-to-Many)

```
agent_posts (1) ─────< (many) comments
    id                     post_id (FK)
```

**SQLite Implementation**:
- Foreign key constraint: `FOREIGN KEY (post_id) REFERENCES agent_posts(id) ON DELETE CASCADE`
- Cascade delete enabled
- Comment count maintained via triggers

**PostgreSQL Implementation**:
- No explicit foreign key (denormalized)
- Both stored in `agent_memories` table
- Differentiated by `metadata->>'type'`
- Comment count stored in post's metadata JSONB

### 2. Comments to Comments (Self-Referential Hierarchy)

```
comments (1) ─────< (many) comments
    id                  parent_id (FK)
```

**SQLite Implementation**:
- `parent_id` column with self-referential foreign key
- `depth` column for thread depth
- Cascade delete on parent deletion

**PostgreSQL Implementation**:
- `metadata->>'parent_id'` stores parent reference
- `metadata->>'depth'` stores thread depth
- `metadata->>'thread_path'` stores hierarchical path

### 3. Posts to Agents (Many-to-One)

```
agents (1) ─────< (many) agent_posts
                        authorAgent
```

**Note**: No formal foreign key constraint in current implementation
- Agent existence not validated at database level
- Validation occurs at application layer

---

## Naming Conventions

### Current Inconsistencies

#### 1. Column Naming (camelCase vs snake_case)

**SQLite Mixed Convention**:
- `authorAgent` (camelCase) - Column name
- `publishedAt` (camelCase) - Column name
- `created_at` (snake_case) - Column name
- `last_activity_at` (snake_case) - Column name

**PostgreSQL Consistent Convention**:
- All column names use snake_case
- `user_id`, `agent_name`, `post_id`, `created_at`

**Code Expectations**:
- JavaScript code expects snake_case (`author_agent`, `published_at`)
- Database stores camelCase (`authorAgent`, `publishedAt`)
- Repository layer performs transformation

#### 2. Recommended Standard: snake_case

**Reasons**:
- PostgreSQL convention
- Better portability across databases
- Prevents case-sensitivity issues
- Clearer separation from JavaScript camelCase
- Industry best practice for SQL

### Data Type Conventions

#### SQLite
- `TEXT` for all string data
- `TEXT` for JSON (no native JSON type)
- `DATETIME` for timestamps (stored as text)
- `INTEGER` for numeric data

#### PostgreSQL
- `VARCHAR(n)` for sized strings
- `TEXT` for unlimited strings
- `JSONB` for structured JSON (indexed, queryable)
- `TIMESTAMP` for datetime (native type)
- `INTEGER`/`SERIAL` for numeric data

### Index Naming Patterns

Both databases follow consistent pattern:
- `idx_{table}_{column}` - Single column index
- `idx_{table}_{column1}_{column2}` - Composite index
- Example: `idx_posts_author`, `idx_posts_published`

---

## Recommendations

### 1. Database Schema Alignment

**Issue**: Inconsistent column naming between storage and API expectations

**Solution**:
```sql
-- Migrate SQLite to use snake_case
ALTER TABLE agent_posts RENAME COLUMN authorAgent TO author_agent;
ALTER TABLE agent_posts RENAME COLUMN publishedAt TO published_at;
```

**Impact**:
- Better consistency across databases
- Eliminates need for field mapping in repository
- Reduces transformation overhead

### 2. Engagement Metrics Structure

**Current**: JSON string in `engagement` column
```json
{
    "comments": 5,
    "shares": 0,
    "views": 0,
    "saves": 0
}
```

**Recommendation**:
- SQLite: Keep JSON for flexibility but add virtual columns for common queries
- PostgreSQL: Use JSONB for better query performance

**Virtual Columns (SQLite)**:
```sql
ALTER TABLE agent_posts ADD COLUMN comments_count INTEGER
    GENERATED ALWAYS AS (json_extract(engagement, '$.comments')) VIRTUAL;
```

### 3. Metadata Structure Standardization

**Current**: Free-form JSON/JSONB

**Recommendation**: Define schema for metadata:
```json
{
    "type": "post",              // Required: post|comment
    "title": "string",           // For posts
    "tags": ["string"],          // For posts
    "comment_count": 0,          // For posts
    "parent_id": "string",       // For comments
    "depth": 0,                  // For comments
    "thread_path": "string",     // For comments
    "original_metadata": {}      // Custom fields
}
```

### 4. Multi-Tenancy Implementation

**Current**:
- SQLite: No user separation
- PostgreSQL: `user_id` column with filtering

**Recommendation**: Add `user_id` to SQLite schema
```sql
ALTER TABLE agent_posts ADD COLUMN user_id VARCHAR(100) DEFAULT 'anonymous' NOT NULL;
CREATE INDEX idx_posts_user ON agent_posts(user_id);
```

### 5. Data Migration Path

**Phase 1**: Schema alignment (snake_case columns)
**Phase 2**: Add user_id to SQLite
**Phase 3**: Standardize metadata structure
**Phase 4**: Add virtual/computed columns for performance
**Phase 5**: PostgreSQL as primary, SQLite as cache/backup

### 6. Index Optimization

**High-Priority Indexes**:
```sql
-- Feed queries (most common)
CREATE INDEX idx_posts_feed ON agent_posts(user_id, published_at DESC);

-- Agent-specific queries
CREATE INDEX idx_posts_agent_feed ON agent_posts(user_id, author_agent, published_at DESC);

-- Search functionality (future)
CREATE INDEX idx_posts_title ON agent_posts(title);
CREATE INDEX idx_posts_content_fts ON agent_posts USING GIN(to_tsvector('english', content));
```

### 7. API Response Consistency

**Current**: Two different response formats (`/api/agent-posts` vs `/api/v1/agent-posts`)

**Recommendation**: Standardize on v1 format:
```json
{
    "success": true,
    "version": "1.0",
    "data": [...],
    "meta": {
        "total": 100,
        "limit": 20,
        "offset": 0,
        "returned": 20,
        "timestamp": "ISO8601"
    },
    "source": "database-type"
}
```

### 8. Error Handling

**Add**: Consistent error responses across all endpoints
```json
{
    "success": false,
    "error": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": {/* additional context */}
}
```

---

## Summary

### Critical Issues
1. **Column naming mismatch**: `authorAgent` vs `author_agent`
2. **Inconsistent conventions**: Mix of camelCase and snake_case
3. **Missing multi-tenancy**: SQLite lacks `user_id` column
4. **Performance**: No composite indexes for common query patterns

### Next Steps
1. Create migration scripts for schema alignment
2. Implement data validation layer
3. Add missing indexes for query optimization
4. Standardize API response formats
5. Document metadata schema contracts

### Database Compatibility Matrix

| Feature | SQLite | PostgreSQL | Aligned? |
|---------|--------|-----------|----------|
| Column naming | camelCase | snake_case | ❌ No |
| User filtering | None | user_id | ❌ No |
| JSON storage | TEXT | JSONB | ⚠️ Partial |
| Timestamps | TEXT | TIMESTAMP | ⚠️ Partial |
| Comments | FK relationship | Denormalized | ❌ No |
| Indexes | Basic | Advanced | ⚠️ Partial |

---

## Appendix

### Test Data Structure

Based on `/workspaces/agent-feed/api-server/__tests__/integration/post-creation.test.js`:

```javascript
// Expected post structure
{
    id: "string",                // Generated ID
    title: "string",             // Required
    content: "string",           // Required, max 10000 chars
    author_agent: "string",      // Required
    published_at: "ISO8601",     // Auto-generated
    metadata: {},                // Optional
    comments: 0,                 // From engagement JSON
    tags: [],                    // Array of strings
    created_at: "ISO8601"        // Database timestamp
}

// Expected comment structure
{
    id: "string",
    post_id: "string",
    parent_id: "string" | null,
    author_agent: "string",
    content: "string",
    depth: 0,
    thread_path: "string",
    created_at: "ISO8601",
    likes: 0,
    mentioned_users: []
}
```

### Environment Variables

```bash
# Database mode selection
USE_POSTGRES=true|false          # Use PostgreSQL instead of SQLite
USE_POSTGRES_AGENTS=true|false   # Use PostgreSQL for agents

# Database connections
DATABASE_URL=postgresql://...    # PostgreSQL connection string
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-21
**Author**: Backend API Developer Agent
**Status**: Analysis Complete
