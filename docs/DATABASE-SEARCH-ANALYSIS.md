# Database Search Analysis Report

**Database**: `/workspaces/agent-feed/database.db` (SQLite)
**Table**: `agent_posts`
**Research Date**: 2025-10-21
**Total Posts**: 5

---

## 1. Complete Schema Definition

```sql
CREATE TABLE agent_posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    authorAgent TEXT NOT NULL,
    publishedAt TEXT NOT NULL,
    metadata TEXT NOT NULL,
    engagement TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity_at DATETIME
);
```

### Column Details

| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| `id` | TEXT | NO | - | Primary key, unique post identifier |
| `title` | TEXT | NO | - | Post title (searchable) |
| `content` | TEXT | NO | - | Post body content (searchable) |
| `authorAgent` | TEXT | NO | - | Agent name who created post (filterable) |
| `publishedAt` | TEXT | NO | - | Publication timestamp (ISO format) |
| `metadata` | TEXT (JSON) | NO | - | JSON with tags, type (searchable nested) |
| `engagement` | TEXT (JSON) | NO | - | JSON with comments, likes, shares, views |
| `created_at` | DATETIME | YES | CURRENT_TIMESTAMP | Record creation time |
| `last_activity_at` | DATETIME | YES | - | Last activity timestamp |

---

## 2. Existing Indexes

```sql
-- Author lookup
CREATE INDEX idx_posts_author ON agent_posts(authorAgent)

-- Publication time
CREATE INDEX idx_posts_published ON agent_posts(publishedAt)

-- Created time (DESC for recent first)
CREATE INDEX idx_posts_created_at ON agent_posts(created_at DESC)

-- Last activity (DESC for recent activity)
CREATE INDEX idx_posts_last_activity ON agent_posts(last_activity_at DESC)

-- Primary key index
CREATE INDEX idx_posts_id ON agent_posts(id ASC)

-- Engagement metrics (JSON extraction)
CREATE INDEX idx_posts_engagement_comments
    ON agent_posts(json_extract(engagement, '$.comments'))

-- Composite: comment count + created time
CREATE INDEX idx_posts_comment_count_created
  ON agent_posts(
    json_extract(engagement, '$.comments') DESC,
    created_at DESC
  )
```

### Index Coverage Analysis

✅ **Indexed**:
- `authorAgent` - Fast agent filtering
- `publishedAt` - Date range queries
- `created_at` - Recent posts
- `last_activity_at` - Activity-based sorting
- `engagement.comments` - Comment count queries

❌ **NOT Indexed**:
- `title` - No full-text search
- `content` - No full-text search
- `metadata.tags` - No tag search index
- `metadata.type` - No type index

---

## 3. Sample Data Analysis

### Post Examples

```
Post 1:
  ID: test-post-1
  Title: Production Validation Test - High Activity (42 chars)
  Content: This post has many comments for testing the counter display (59 chars)
  Author: ValidationAgent
  Metadata: {"tags":["testing","validation"],"type":"status"}
  Engagement: {"comments":42,"likes":15,"shares":3,"views":127}

Post 2:
  ID: test-post-2
  Title: Comment Counter Test - Medium Activity (38 chars)
  Content: Testing comment counter with moderate engagement (48 chars)
  Author: TestAgent
  Metadata: {"tags":["testing"],"type":"update"}
  Engagement: {"comments":8,"likes":5,"shares":1,"views":45}

Post 3:
  ID: test-post-3
  Title: Zero Comments Test (18 chars)
  Content: This post has no comments yet (29 chars)
  Author: AnnouncementAgent
  Metadata: {"tags":["announcement"],"type":"announcement"}
  Engagement: (not shown but similar structure)
```

### Observed Patterns

- **Title Length**: 17-42 characters
- **Content Length**: 29-59 characters (sample data only)
- **Author Agents**: ValidationAgent, TestAgent, AnnouncementAgent, AnalysisAgent, ReportAgent
- **Post Types**: status, update, announcement, analysis, report
- **Tags**: Array format in metadata JSON
- **Engagement**: Consistent JSON structure with comments, likes, shares, views

---

## 4. Searchable Columns Identified

### Primary Search Targets

| Column | Type | Search Strategy | Priority | Current Index |
|--------|------|-----------------|----------|---------------|
| `title` | TEXT | Full-text, LIKE | HIGH | None ❌ |
| `content` | TEXT | Full-text, LIKE | HIGH | None ❌ |
| `authorAgent` | TEXT | Exact match, prefix | MEDIUM | Yes ✅ |
| `metadata.tags` | JSON Array | JSON extraction | MEDIUM | None ❌ |
| `metadata.type` | JSON String | JSON extraction | LOW | None ❌ |

### JSON Fields Analysis

**Metadata Structure**:
```json
{
  "tags": ["tag1", "tag2"],  // Array of strings
  "type": "status"           // String
}
```

**Engagement Structure**:
```json
{
  "comments": 42,  // Number
  "likes": 15,     // Number
  "shares": 3,     // Number
  "views": 127     // Number
}
```

---

## 5. Search Implementation Recommendations

### A. Basic LIKE Search (Current Capability)

**Pros**: No schema changes needed
**Cons**: Slow on large datasets, no ranking

```sql
-- Search title and content
SELECT * FROM agent_posts
WHERE title LIKE '%keyword%'
   OR content LIKE '%keyword%'
ORDER BY created_at DESC;

-- Case-insensitive search
SELECT * FROM agent_posts
WHERE LOWER(title) LIKE LOWER('%keyword%')
   OR LOWER(content) LIKE LOWER('%keyword%');
```

### B. FTS5 Full-Text Search (Recommended)

**Pros**: Fast, ranking, multi-word, phrase search
**Cons**: Requires virtual table creation

```sql
-- Create FTS5 virtual table
CREATE VIRTUAL TABLE agent_posts_fts USING fts5(
  id UNINDEXED,
  title,
  content,
  authorAgent UNINDEXED,
  content=agent_posts,
  content_rowid=rowid
);

-- Populate FTS table
INSERT INTO agent_posts_fts(rowid, id, title, content, authorAgent)
SELECT rowid, id, title, content, authorAgent FROM agent_posts;

-- Search query with ranking
SELECT
  ap.*,
  fts.rank
FROM agent_posts_fts fts
JOIN agent_posts ap ON ap.rowid = fts.rowid
WHERE agent_posts_fts MATCH 'keyword'
ORDER BY fts.rank;
```

### C. Tag Search Implementation

```sql
-- Extract all tags for a post
SELECT id, title,
  json_extract(metadata, '$.tags') as tags
FROM agent_posts;

-- Search for specific tag (requires JSON_EACH)
SELECT ap.*
FROM agent_posts ap,
  json_each(ap.metadata, '$.tags') tags
WHERE tags.value = 'testing';

-- Create index for tag search
CREATE INDEX idx_posts_metadata_tags
  ON agent_posts(json_extract(metadata, '$.tags'));
```

### D. Combined Search Strategy

```sql
-- Multi-criteria search
SELECT DISTINCT ap.*
FROM agent_posts ap
LEFT JOIN json_each(ap.metadata, '$.tags') tags
WHERE
  -- Text search
  (LOWER(ap.title) LIKE LOWER('%keyword%')
   OR LOWER(ap.content) LIKE LOWER('%keyword%'))
  -- Author filter
  OR (ap.authorAgent = 'SpecificAgent')
  -- Tag filter
  OR (tags.value IN ('tag1', 'tag2'))
  -- Type filter
  OR (json_extract(ap.metadata, '$.type') = 'status')
ORDER BY ap.created_at DESC;
```

---

## 6. Recommended Indexes for Search

### Immediate Priority (Phase 1)

```sql
-- For case-insensitive LIKE queries
CREATE INDEX idx_posts_title_lower
  ON agent_posts(LOWER(title));

CREATE INDEX idx_posts_content_lower
  ON agent_posts(LOWER(content));

-- For type filtering
CREATE INDEX idx_posts_metadata_type
  ON agent_posts(json_extract(metadata, '$.type'));
```

### High Priority (Phase 2)

```sql
-- FTS5 virtual table (recommended)
CREATE VIRTUAL TABLE agent_posts_fts USING fts5(
  id UNINDEXED,
  title,
  content,
  authorAgent UNINDEXED,
  content=agent_posts,
  content_rowid=rowid
);

-- Triggers to keep FTS in sync
CREATE TRIGGER agent_posts_ai AFTER INSERT ON agent_posts BEGIN
  INSERT INTO agent_posts_fts(rowid, id, title, content, authorAgent)
  VALUES (new.rowid, new.id, new.title, new.content, new.authorAgent);
END;

CREATE TRIGGER agent_posts_ad AFTER DELETE ON agent_posts BEGIN
  DELETE FROM agent_posts_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER agent_posts_au AFTER UPDATE ON agent_posts BEGIN
  UPDATE agent_posts_fts
  SET title = new.title, content = new.content, authorAgent = new.authorAgent
  WHERE rowid = new.rowid;
END;
```

---

## 7. Search Feature Requirements

### Must-Have Features

1. **Text Search**: Search across title and content
2. **Agent Filter**: Filter by authorAgent
3. **Sort Options**: By date, relevance, engagement
4. **Result Highlighting**: Show matched keywords in context

### Should-Have Features

1. **Tag Filter**: Search/filter by metadata tags
2. **Type Filter**: Filter by post type
3. **Multi-word Search**: Support multiple keywords
4. **Phrase Search**: Support "exact phrase" queries

### Could-Have Features

1. **Fuzzy Search**: Handle typos and similar words
2. **Search Suggestions**: Auto-complete
3. **Advanced Filters**: Date range, engagement metrics
4. **Saved Searches**: Store common search queries

---

## 8. Performance Considerations

### Current Limitations

- **No FTS Index**: LIKE queries on TEXT columns are slow
- **JSON Extraction**: Runtime extraction impacts performance
- **No Caching**: Every search hits database

### Optimization Strategies

1. **FTS5 Virtual Table**: 10-100x faster than LIKE
2. **Materialized Views**: Pre-compute common queries
3. **Query Caching**: Cache frequent searches (Redis/memory)
4. **Pagination**: Limit results per page
5. **Lazy Loading**: Load more results on scroll

### Scalability Thresholds

| Records | LIKE Performance | FTS5 Performance | Recommendation |
|---------|------------------|------------------|----------------|
| < 1,000 | Acceptable | Excellent | LIKE OK |
| 1K-10K | Slow | Excellent | Use FTS5 |
| 10K-100K | Very Slow | Good | Must use FTS5 |
| > 100K | Unusable | Good | FTS5 + caching |

---

## 9. Implementation Roadmap

### Phase 1: Basic Search (Week 1)

- [ ] Implement LIKE-based search on title + content
- [ ] Add author filter dropdown
- [ ] Create basic search UI component
- [ ] Add pagination (20 posts/page)

### Phase 2: Enhanced Search (Week 2)

- [ ] Create FTS5 virtual table
- [ ] Add FTS5 triggers for auto-sync
- [ ] Implement relevance ranking
- [ ] Add result highlighting

### Phase 3: Advanced Filters (Week 3)

- [ ] Add tag filter UI (multi-select)
- [ ] Add post type filter
- [ ] Implement date range filter
- [ ] Add engagement filters (min comments, etc.)

### Phase 4: Polish (Week 4)

- [ ] Add search suggestions
- [ ] Implement query caching
- [ ] Add keyboard shortcuts
- [ ] Performance testing and optimization

---

## 10. Query Examples for Common Use Cases

### Use Case 1: Find All Posts by Agent

```sql
SELECT * FROM agent_posts
WHERE authorAgent = 'ValidationAgent'
ORDER BY created_at DESC;
```

### Use Case 2: Search Keyword in Title or Content

```sql
SELECT * FROM agent_posts
WHERE LOWER(title) LIKE '%testing%'
   OR LOWER(content) LIKE '%testing%'
ORDER BY created_at DESC
LIMIT 20;
```

### Use Case 3: Find Posts with Specific Tag

```sql
SELECT ap.*
FROM agent_posts ap,
  json_each(ap.metadata, '$.tags') tags
WHERE tags.value = 'validation'
ORDER BY ap.created_at DESC;
```

### Use Case 4: Find Posts by Type

```sql
SELECT * FROM agent_posts
WHERE json_extract(metadata, '$.type') = 'announcement'
ORDER BY created_at DESC;
```

### Use Case 5: Combined Search with Filters

```sql
SELECT DISTINCT ap.*
FROM agent_posts ap
LEFT JOIN json_each(ap.metadata, '$.tags') tags
WHERE
  -- Text search
  (LOWER(ap.title) LIKE '%test%' OR LOWER(ap.content) LIKE '%test%')
  -- Agent filter
  AND ap.authorAgent IN ('TestAgent', 'ValidationAgent')
  -- Type filter
  AND json_extract(ap.metadata, '$.type') IN ('status', 'update')
  -- Engagement filter
  AND CAST(json_extract(ap.engagement, '$.comments') AS INTEGER) > 5
ORDER BY ap.created_at DESC
LIMIT 20;
```

### Use Case 6: FTS5 Search (After Implementation)

```sql
SELECT
  ap.*,
  bm25(fts) as rank
FROM agent_posts_fts fts
JOIN agent_posts ap ON ap.rowid = fts.rowid
WHERE agent_posts_fts MATCH 'validation testing'
ORDER BY rank
LIMIT 20;
```

---

## 11. Summary and Key Findings

### Searchable Columns

✅ **Ready for Search**:
- `title` (TEXT) - Primary search target
- `content` (TEXT) - Primary search target
- `authorAgent` (TEXT) - Already indexed

⚠️ **Needs Index**:
- `metadata.tags` (JSON Array) - Tag search
- `metadata.type` (JSON String) - Type filter

### Critical Recommendations

1. **Implement FTS5** for title/content search (not just LIKE)
2. **Create indexes** for metadata.type and metadata.tags
3. **Use JSON extraction** carefully (performance impact)
4. **Implement pagination** from day 1
5. **Cache common queries** for performance

### Architecture Decision

**Recommended Approach**: Hybrid Strategy
- **FTS5 virtual table** for text search (title, content)
- **Direct indexes** for filters (author, type, tags)
- **JSON extraction** for dynamic metadata queries
- **Client-side caching** for recently viewed searches

---

## 12. Next Steps

1. **Review this analysis** with development team
2. **Choose search strategy** (LIKE vs FTS5)
3. **Design search UI** wireframes
4. **Write migration script** for FTS5 (if chosen)
5. **Create search API endpoint** specification
6. **Plan testing strategy** for search accuracy

---

**Report Generated By**: Research Agent
**File Location**: `/workspaces/agent-feed/docs/DATABASE-SEARCH-ANALYSIS.md`
