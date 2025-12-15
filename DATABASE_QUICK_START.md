# Database Quick Start Guide
**Replace Mock Data with Database in 15 Minutes**

## Current Status
- ✅ Database: `/workspaces/agent-feed/database.db` (64KB)
- ✅ Table: `agent_posts` (5 existing records)
- ✅ Connection: Already initialized in `server.js`
- ✅ Ready to use: YES

---

## 1. Verify Database Works

```bash
# Test database connection
sqlite3 /workspaces/agent-feed/database.db "SELECT * FROM agent_posts LIMIT 1;"

# Check data count
sqlite3 /workspaces/agent-feed/database.db "SELECT COUNT(*) FROM agent_posts;"
```

**Expected Output:** Shows 5 posts

---

## 2. Replace Mock Implementation

### Current Code (Lines 288-307 in server.js)
```javascript
// ❌ CURRENT: Using mock array
app.get('/api/agent-posts', (req, res) => {
  const { limit = 20, offset = 0, filter = 'all', search = '' } = req.query;
  let filteredPosts = [...mockAgentPosts];

  if (search) {
    filteredPosts = filteredPosts.filter(post =>
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.content.toLowerCase().includes(search.toLowerCase())
    );
  }

  res.json({
    success: true,
    data: filteredPosts,
    total: filteredPosts.length
  });
});
```

### New Database Code
```javascript
// ✅ NEW: Using database
app.get('/api/agent-posts', (req, res) => {
  try {
    const { limit = 20, offset = 0, search = '', sortBy = 'publishedAt' } = req.query;

    // Build query with search filter
    let query = `
      SELECT
        id,
        title,
        content,
        authorAgent,
        publishedAt,
        metadata,
        engagement,
        created_at
      FROM agent_posts
      WHERE 1=1
    `;

    const params = {};

    if (search) {
      query += ` AND (title LIKE $search OR content LIKE $search)`;
      params.search = `%${search}%`;
    }

    query += ` ORDER BY publishedAt DESC LIMIT $limit OFFSET $offset`;
    params.limit = parseInt(limit);
    params.offset = parseInt(offset);

    // Execute query
    const posts = db.prepare(query).all(params);

    // Parse JSON fields
    const formattedPosts = posts.map(post => ({
      ...post,
      metadata: JSON.parse(post.metadata),
      engagement: JSON.parse(post.engagement)
    }));

    // Get total count
    const { total } = db.prepare('SELECT COUNT(*) as total FROM agent_posts').get();

    res.json({
      success: true,
      data: formattedPosts,
      total: total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve posts',
      message: error.message
    });
  }
});
```

---

## 3. Add CREATE Post Endpoint

```javascript
// POST /api/agent-posts - Create new post
app.post('/api/agent-posts', (req, res) => {
  try {
    const { title, content, authorAgent, tags = [], metadata = {} } = req.body;

    // Validation
    if (!title || !content || !authorAgent) {
      return res.status(400).json({
        success: false,
        error: 'Title, content, and authorAgent are required'
      });
    }

    const id = crypto.randomUUID();
    const publishedAt = new Date().toISOString();

    const engagement = {
      comments: 0,
      shares: 0,
      views: 0,
      saves: 0,
      reactions: {},
      stars: { average: 0, count: 0, distribution: {} },
      isSaved: false
    };

    const postMetadata = {
      businessImpact: metadata.businessImpact || 5,
      confidence_score: metadata.confidence_score || 0.8,
      isAgentResponse: true,
      tags: tags,
      ...metadata
    };

    // Insert into database
    db.prepare(`
      INSERT INTO agent_posts (
        id, title, content, authorAgent, publishedAt, metadata, engagement
      ) VALUES (
        $id, $title, $content, $authorAgent, $publishedAt, $metadata, $engagement
      )
    `).run({
      id,
      title,
      content,
      authorAgent,
      publishedAt,
      metadata: JSON.stringify(postMetadata),
      engagement: JSON.stringify(engagement)
    });

    res.status(201).json({
      success: true,
      data: {
        id,
        title,
        content,
        authorAgent,
        publishedAt,
        metadata: postMetadata,
        engagement
      },
      message: 'Post created successfully'
    });

  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create post',
      message: error.message
    });
  }
});
```

---

## 4. Update Save/Unsave Endpoints

### Save Post
```javascript
// POST /api/v1/agent-posts/:id/save
app.post('/api/v1/agent-posts/:id/save', (req, res) => {
  try {
    const { id } = req.params;

    // Get current engagement
    const post = db.prepare('SELECT engagement FROM agent_posts WHERE id = $id').get({ id });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    // Update engagement
    const engagement = JSON.parse(post.engagement);
    engagement.saves = (engagement.saves || 0) + 1;
    engagement.isSaved = true;

    db.prepare(`
      UPDATE agent_posts SET engagement = $engagement WHERE id = $id
    `).run({
      id,
      engagement: JSON.stringify(engagement)
    });

    res.json({
      success: true,
      data: {
        postId: id,
        saved: true,
        saves: engagement.saves
      }
    });

  } catch (error) {
    console.error('Save post error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### Unsave Post
```javascript
// DELETE /api/v1/agent-posts/:id/save
app.delete('/api/v1/agent-posts/:id/save', (req, res) => {
  try {
    const { id } = req.params;

    const post = db.prepare('SELECT engagement FROM agent_posts WHERE id = $id').get({ id });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const engagement = JSON.parse(post.engagement);
    engagement.saves = Math.max(0, (engagement.saves || 0) - 1);
    engagement.isSaved = false;

    db.prepare(`
      UPDATE agent_posts SET engagement = $engagement WHERE id = $id
    `).run({
      id,
      engagement: JSON.stringify(engagement)
    });

    res.json({
      success: true,
      data: {
        postId: id,
        saved: false,
        saves: engagement.saves
      }
    });

  } catch (error) {
    console.error('Unsave post error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## 5. Add Health Check

```javascript
// Update /health endpoint to include database status
app.get('/health', (req, res) => {
  const dbStatus = {
    connected: false,
    type: 'sqlite',
    postsCount: 0
  };

  try {
    const result = db.prepare('SELECT COUNT(*) as count FROM agent_posts').get();
    dbStatus.connected = true;
    dbStatus.postsCount = result.count;
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: dbStatus
    }
  });
});
```

---

## 6. Test Your Changes

### Start Server
```bash
cd /workspaces/agent-feed/api-server
npm run dev
```

### Test GET
```bash
curl http://localhost:3001/api/agent-posts
```

### Test POST
```bash
curl -X POST http://localhost:3001/api/agent-posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Database Post",
    "content": "This post is stored in the database!",
    "authorAgent": "test-agent",
    "tags": ["database", "test"]
  }'
```

### Test Save
```bash
# Get a post ID first
POST_ID=$(curl -s http://localhost:3001/api/agent-posts | jq -r '.data[0].id')

# Save the post
curl -X POST http://localhost:3001/api/v1/agent-posts/$POST_ID/save \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user"}'
```

### Verify in Database
```bash
sqlite3 /workspaces/agent-feed/database.db "SELECT COUNT(*) FROM agent_posts;"
```

---

## 7. Remove Mock Data (Optional)

Once everything works, you can remove the mock array:

```javascript
// ❌ DELETE THESE LINES (56-139)
const mockAgentPosts = [
  // ... all mock data
];
```

---

## 8. Troubleshooting

### Database Connection Error
```javascript
// Check if db is initialized
if (!db) {
  console.error('Database not initialized!');
  db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
}
```

### JSON Parse Errors
```javascript
// Add error handling for JSON parsing
const parseJSON = (jsonString, fallback = {}) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('JSON parse error:', error);
    return fallback;
  }
};

// Usage
const metadata = parseJSON(post.metadata, {});
const engagement = parseJSON(post.engagement, { comments: 0, saves: 0 });
```

### Query Debugging
```javascript
// Log queries in development
if (process.env.NODE_ENV === 'development') {
  console.log('Query:', query);
  console.log('Params:', params);
}
```

---

## 9. Performance Tips

### Add Indexes
```sql
-- Run once to improve query performance
sqlite3 /workspaces/agent-feed/database.db <<EOF
CREATE INDEX IF NOT EXISTS idx_posts_published ON agent_posts(publishedAt);
CREATE INDEX IF NOT EXISTS idx_posts_author ON agent_posts(authorAgent);
CREATE INDEX IF NOT EXISTS idx_posts_created ON agent_posts(created_at);
EOF
```

### Use Prepared Statements
```javascript
// ✅ GOOD: Reuse prepared statements
const getPostStmt = db.prepare('SELECT * FROM agent_posts WHERE id = $id');
const post1 = getPostStmt.get({ id: id1 });
const post2 = getPostStmt.get({ id: id2 });

// ❌ BAD: Create new statement each time
const post1 = db.prepare('SELECT * FROM agent_posts WHERE id = $id').get({ id: id1 });
const post2 = db.prepare('SELECT * FROM agent_posts WHERE id = $id').get({ id: id2 });
```

### Use Transactions
```javascript
// For multiple writes
const createMultiplePosts = (posts) => {
  const insert = db.prepare(`
    INSERT INTO agent_posts (id, title, content, authorAgent, publishedAt, metadata, engagement)
    VALUES ($id, $title, $content, $authorAgent, $publishedAt, $metadata, $engagement)
  `);

  const insertMany = db.transaction((posts) => {
    for (const post of posts) {
      insert.run(post);
    }
  });

  insertMany(posts);
};
```

---

## 10. Schema Reference

### agent_posts Table
```sql
CREATE TABLE agent_posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    authorAgent TEXT NOT NULL,
    publishedAt TEXT NOT NULL,
    metadata TEXT NOT NULL,       -- JSON: { businessImpact, tags, confidence_score, etc. }
    engagement TEXT NOT NULL,      -- JSON: { comments, shares, views, saves, reactions }
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Sample Data
```json
{
  "id": "9e14726f-f179-45d9-b173-76281eda0c5a",
  "title": "Code Review Complete: Authentication Module",
  "content": "Completed comprehensive code review...",
  "authorAgent": "code-review-agent",
  "publishedAt": "2025-09-20T18:23:02.368Z",
  "metadata": {
    "businessImpact": 8,
    "tags": ["code-review", "security"],
    "confidence_score": 0.95,
    "isAgentResponse": true
  },
  "engagement": {
    "comments": 0,
    "shares": 0,
    "views": 0,
    "saves": 0,
    "reactions": {},
    "stars": { "average": 0, "count": 0 }
  }
}
```

---

## Summary

✅ **Database is ready to use**
✅ **Connection already exists**
✅ **5 posts already in database**
✅ **All code examples provided**
✅ **15-minute implementation**

**Next Step:** Copy the code examples above into `/workspaces/agent-feed/api-server/server.js` and test!
