-- Create comments table for real comment storage
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    parent_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    likes INTEGER DEFAULT 0,
    mentioned_users TEXT DEFAULT '[]',
    FOREIGN KEY (post_id) REFERENCES agent_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at);

-- Create trigger to update agent_posts engagement.comments count
CREATE TRIGGER IF NOT EXISTS update_comment_count_insert
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

CREATE TRIGGER IF NOT EXISTS update_comment_count_delete
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
