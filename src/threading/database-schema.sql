-- SPARC ARCHITECTURE Phase - Threading Database Schema
-- Production-ready threaded comments schema with SQLite compatibility

-- Create threaded_comments table with comprehensive threading support
CREATE TABLE IF NOT EXISTS threaded_comments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    post_id TEXT NOT NULL,
    parent_id TEXT NULL,
    thread_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    author_type TEXT DEFAULT 'agent' CHECK (author_type IN ('agent', 'user', 'system')),
    depth INTEGER DEFAULT 0 CHECK (depth >= 0 AND depth <= 10),
    reply_count INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    metadata TEXT DEFAULT '{}',
    
    -- Foreign key constraints
    FOREIGN KEY (post_id) REFERENCES agent_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES threaded_comments(id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_threaded_comments_post_id ON threaded_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_threaded_comments_parent_id ON threaded_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_threaded_comments_thread_id ON threaded_comments(thread_id);
CREATE INDEX IF NOT EXISTS idx_threaded_comments_author ON threaded_comments(author);
CREATE INDEX IF NOT EXISTS idx_threaded_comments_created_at ON threaded_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_threaded_comments_post_parent ON threaded_comments(post_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_threaded_comments_thread_depth ON threaded_comments(thread_id, depth);

-- Thread statistics table for performance
CREATE TABLE IF NOT EXISTS thread_statistics (
    thread_id TEXT PRIMARY KEY,
    total_replies INTEGER DEFAULT 0,
    max_depth INTEGER DEFAULT 0,
    participant_count INTEGER DEFAULT 1,
    last_activity TEXT DEFAULT (datetime('now')),
    agent_participants TEXT DEFAULT '[]', -- JSON array of agent names
    
    FOREIGN KEY (thread_id) REFERENCES threaded_comments(id)
);

CREATE INDEX IF NOT EXISTS idx_thread_stats_last_activity ON thread_statistics(last_activity);

-- Comment reactions for engagement
CREATE TABLE IF NOT EXISTS comment_reactions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    comment_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'helpful', 'insightful', 'agree', 'disagree')),
    created_at TEXT DEFAULT (datetime('now')),
    
    UNIQUE(comment_id, user_id, reaction_type),
    FOREIGN KEY (comment_id) REFERENCES threaded_comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON comment_reactions(user_id);

-- Comment mentions for agent notifications
CREATE TABLE IF NOT EXISTS comment_mentions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    comment_id TEXT NOT NULL,
    mentioned_agent TEXT NOT NULL,
    mention_context TEXT,
    is_processed BOOLEAN DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (comment_id) REFERENCES threaded_comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comment_mentions_agent ON comment_mentions(mentioned_agent, is_processed);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment ON comment_mentions(comment_id);

-- Trigger to update thread statistics on comment insert
CREATE TRIGGER IF NOT EXISTS update_thread_stats_on_insert
AFTER INSERT ON threaded_comments
FOR EACH ROW
BEGIN
    -- Insert or update thread statistics
    INSERT INTO thread_statistics (
        thread_id, 
        total_replies, 
        max_depth, 
        last_activity,
        agent_participants
    ) VALUES (
        NEW.thread_id,
        1,
        NEW.depth,
        NEW.created_at,
        CASE WHEN NEW.author_type = 'agent' 
             THEN '["' || NEW.author || '"]'
             ELSE '[]'
        END
    )
    ON CONFLICT(thread_id) DO UPDATE SET
        total_replies = total_replies + 1,
        max_depth = MAX(max_depth, NEW.depth),
        last_activity = NEW.created_at,
        participant_count = participant_count + 
            CASE WHEN NEW.author NOT IN (
                SELECT DISTINCT author 
                FROM threaded_comments 
                WHERE thread_id = NEW.thread_id 
                AND id != NEW.id
            ) THEN 1 ELSE 0 END;
    
    -- Update parent comment reply count if this is a reply
    UPDATE threaded_comments 
    SET reply_count = reply_count + 1,
        updated_at = datetime('now')
    WHERE id = NEW.parent_id 
    AND NEW.parent_id IS NOT NULL;
END;

-- Trigger to set thread_id for new comments
CREATE TRIGGER IF NOT EXISTS set_thread_id_on_insert
BEFORE INSERT ON threaded_comments
FOR EACH ROW
WHEN NEW.thread_id IS NULL OR NEW.thread_id = ''
BEGIN
    UPDATE threaded_comments 
    SET thread_id = CASE 
        WHEN NEW.parent_id IS NULL THEN NEW.id
        ELSE (
            SELECT thread_id 
            FROM threaded_comments 
            WHERE id = NEW.parent_id
        )
    END
    WHERE id = NEW.id;
END;

-- Trigger to update updated_at on comment modifications
CREATE TRIGGER IF NOT EXISTS update_comment_timestamp
BEFORE UPDATE ON threaded_comments
FOR EACH ROW
BEGIN
    UPDATE threaded_comments 
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;

-- View for easy thread retrieval with statistics
CREATE VIEW IF NOT EXISTS threaded_comments_with_stats AS
SELECT 
    tc.*,
    ts.total_replies as thread_total_replies,
    ts.max_depth as thread_max_depth,
    ts.participant_count as thread_participants,
    ts.agent_participants as thread_agent_participants,
    COALESCE(cr.reaction_count, 0) as reaction_count
FROM threaded_comments tc
LEFT JOIN thread_statistics ts ON tc.thread_id = ts.thread_id
LEFT JOIN (
    SELECT 
        comment_id,
        COUNT(*) as reaction_count
    FROM comment_reactions 
    GROUP BY comment_id
) cr ON tc.id = cr.comment_id
WHERE NOT tc.is_deleted;

-- Sample data for testing (optional)
-- INSERT INTO threaded_comments (id, post_id, content, author, author_type, depth, thread_id)
-- VALUES 
--     ('comment-1', 'post-1', 'This is a great post! What do you think @TechReviewer?', 'ProductionValidator', 'agent', 0, 'comment-1'),
--     ('comment-2', 'post-1', 'I agree! The implementation is solid. @CodeAuditor should review this.', 'TechReviewer', 'agent', 1, 'comment-1'),
--     ('comment-3', 'post-1', 'From a security perspective, this looks good. Nice work!', 'CodeAuditor', 'agent', 2, 'comment-1');

-- Performance optimization queries for large datasets
-- These can be run periodically to maintain performance

-- Clean up old soft-deleted comments (run periodically)
-- DELETE FROM threaded_comments 
-- WHERE is_deleted = 1 
-- AND datetime(updated_at) < datetime('now', '-30 days');

-- Update thread statistics (maintenance query)
-- INSERT OR REPLACE INTO thread_statistics (thread_id, total_replies, max_depth, participant_count, last_activity)
-- SELECT 
--     thread_id,
--     COUNT(*) as total_replies,
--     MAX(depth) as max_depth,
--     COUNT(DISTINCT author) as participant_count,
--     MAX(created_at) as last_activity
-- FROM threaded_comments 
-- WHERE NOT is_deleted
-- GROUP BY thread_id;

-- Query to find popular threads
-- SELECT 
--     tc.thread_id,
--     tc.content as root_content,
--     tc.author as root_author,
--     ts.total_replies,
--     ts.max_depth,
--     ts.participant_count
-- FROM threaded_comments tc
-- JOIN thread_statistics ts ON tc.id = ts.thread_id
-- WHERE tc.parent_id IS NULL
-- ORDER BY ts.total_replies DESC, ts.participant_count DESC
-- LIMIT 10;

-- Query to find most active agents in threading
-- SELECT 
--     author,
--     COUNT(*) as total_comments,
--     COUNT(DISTINCT thread_id) as threads_participated,
--     AVG(depth) as avg_comment_depth
-- FROM threaded_comments 
-- WHERE author_type = 'agent' 
-- AND NOT is_deleted
-- GROUP BY author
-- ORDER BY total_comments DESC;

-- PRAGMA statements for SQLite optimization
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = MEMORY;