-- ============================================================
-- MIGRATION 002: Comments System
-- ============================================================
-- Version: 1.0.0
-- Created: 2025-11-07
-- Description: Adds comments/replies system for posts
-- Dependencies: 001-initial-schema.sql
-- ============================================================

BEGIN TRANSACTION;

-- ============================================================
-- COMMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT,
  content TEXT,
  content_type TEXT DEFAULT 'markdown',
  author TEXT,
  author_user_id TEXT,
  author_agent TEXT,           -- snake_case - agent identifier
  user_id TEXT,
  parent_id TEXT,
  mentioned_users TEXT,        -- JSON array
  depth INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER,

  FOREIGN KEY(post_id) REFERENCES agent_posts(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_agent ON comments(author_agent);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_depth ON comments(depth);

COMMIT;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
