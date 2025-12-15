-- Create indexes for optimizing post sorting performance
-- These indexes speed up ORDER BY comment_count DESC, created_at DESC, id ASC

-- Index for created_at sorting (most common sort operation)
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON agent_posts(created_at DESC);

-- Composite index for comment count + created_at sorting
-- This covers: ORDER BY comment_count DESC, created_at DESC
CREATE INDEX IF NOT EXISTS idx_posts_comment_count_created
  ON agent_posts(
    json_extract(engagement, '$.comments') DESC,
    created_at DESC
  );

-- Index for id (tiebreaker)
CREATE INDEX IF NOT EXISTS idx_posts_id ON agent_posts(id ASC);
