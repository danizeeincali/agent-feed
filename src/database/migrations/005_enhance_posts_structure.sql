-- Migration 005: Enhance Posts Structure for AgentLink Parity
-- Transform feed_items to advanced posts structure with threading and agent support

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Step 1: Create new posts table with AgentLink structure
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Legacy content field for backward compatibility
    content TEXT,
    
    -- New structured content fields
    title TEXT,
    hook TEXT,
    content_body TEXT,
    
    -- Author and agent fields
    author_id UUID NOT NULL,
    is_agent_response BOOLEAN DEFAULT FALSE,
    agent_id UUID,
    
    -- Threading support
    parent_post_id UUID,
    
    -- Advanced features
    mentioned_agents TEXT[],
    link_previews JSONB,
    obsidian_uri VARCHAR(255),
    removed_from_feed BOOLEAN DEFAULT FALSE,
    processed BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    last_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_agent_id ON posts(agent_id);
CREATE INDEX IF NOT EXISTS idx_posts_parent_id ON posts(parent_post_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_last_interaction ON posts(last_interaction_at);
CREATE INDEX IF NOT EXISTS idx_posts_processed ON posts(processed);
CREATE INDEX IF NOT EXISTS idx_posts_removed ON posts(removed_from_feed);
CREATE INDEX IF NOT EXISTS idx_posts_is_agent_response ON posts(is_agent_response);

-- GIN indexes for arrays and JSONB
CREATE INDEX IF NOT EXISTS idx_posts_mentioned_agents ON posts USING GIN (mentioned_agents);
CREATE INDEX IF NOT EXISTS idx_posts_link_previews ON posts USING GIN (link_previews);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_posts_title_search ON posts USING GIN (to_tsvector('english', COALESCE(title, '')));
CREATE INDEX IF NOT EXISTS idx_posts_content_search ON posts USING GIN (to_tsvector('english', COALESCE(content, '') || ' ' || COALESCE(content_body, '')));

-- Step 3: Migrate existing feed_items data to posts
INSERT INTO posts (
    id,
    content,
    title,
    content_body,
    author_id,
    created_at,
    updated_at,
    last_interaction_at
)
SELECT 
    fi.id,
    fi.content,
    CASE 
        WHEN fi.title IS NOT NULL AND fi.title != '' THEN fi.title
        ELSE SUBSTRING(COALESCE(fi.content, 'Untitled Post'), 1, 100)
    END as title,
    fi.content as content_body,
    COALESCE(
        (SELECT u.id FROM users u WHERE u.email = COALESCE(fi.author, 'system@agentfeed.com') LIMIT 1),
        (SELECT u.id FROM users u ORDER BY u.created_at LIMIT 1)
    ) as author_id,
    fi.created_at,
    fi.fetched_at as updated_at,
    fi.fetched_at as last_interaction_at
FROM feed_items fi
WHERE fi.id IS NOT NULL;

-- Step 4: Update comments table to reference posts instead of feed_items
-- First, ensure all comments have valid post references
UPDATE comments 
SET post_id = (
    SELECT p.id 
    FROM posts p 
    WHERE p.id = comments.post_id
    LIMIT 1
)
WHERE post_id IN (SELECT id FROM posts);

-- Step 5: Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_posts_updated_at 
    BEFORE UPDATE ON posts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_posts_updated_at();

-- Step 6: Add function to calculate post thread depth
CREATE OR REPLACE FUNCTION get_post_thread_depth(post_id UUID)
RETURNS INTEGER AS $$
DECLARE
    depth INTEGER := 0;
    current_parent_id UUID;
BEGIN
    current_parent_id := (SELECT parent_post_id FROM posts WHERE id = post_id);
    
    WHILE current_parent_id IS NOT NULL LOOP
        depth := depth + 1;
        -- Prevent infinite loops
        IF depth > 10 THEN
            EXIT;
        END IF;
        current_parent_id := (SELECT parent_post_id FROM posts WHERE id = current_parent_id);
    END LOOP;
    
    RETURN depth;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Add function to get thread hierarchy
CREATE OR REPLACE FUNCTION get_thread_posts(root_post_id UUID)
RETURNS TABLE(
    post_id UUID,
    parent_id UUID,
    depth INTEGER,
    title TEXT,
    content TEXT,
    author_id UUID,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE post_tree AS (
        -- Base case: root post
        SELECT 
            p.id as post_id,
            p.parent_post_id as parent_id,
            0 as depth,
            p.title,
            COALESCE(p.content, p.content_body) as content,
            p.author_id,
            p.created_at
        FROM posts p
        WHERE p.id = root_post_id
        
        UNION ALL
        
        -- Recursive case: child posts
        SELECT 
            p.id as post_id,
            p.parent_post_id as parent_id,
            pt.depth + 1 as depth,
            p.title,
            COALESCE(p.content, p.content_body) as content,
            p.author_id,
            p.created_at
        FROM posts p
        INNER JOIN post_tree pt ON p.parent_post_id = pt.post_id
        WHERE pt.depth < 10 -- Prevent infinite recursion
    )
    SELECT * FROM post_tree
    ORDER BY depth, created_at;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Add constraints and validation
ALTER TABLE posts ADD CONSTRAINT check_posts_content_exists 
    CHECK (content IS NOT NULL OR (title IS NOT NULL AND content_body IS NOT NULL));

ALTER TABLE posts ADD CONSTRAINT check_posts_agent_response 
    CHECK (NOT is_agent_response OR agent_id IS NOT NULL);

-- Step 9: Create view for backward compatibility with feed_items
CREATE OR REPLACE VIEW feed_items_compat AS
SELECT 
    p.id,
    (SELECT f.id FROM feeds f JOIN users u ON f.user_id = u.id WHERE u.id = p.author_id LIMIT 1) as feed_id,
    p.title,
    COALESCE(p.content, p.content_body) as content,
    '' as url, -- Not applicable for social posts
    (SELECT u.name FROM users u WHERE u.id = p.author_id) as author,
    p.created_at as published_at,
    p.created_at as fetched_at,
    '{}' as metadata,
    p.processed,
    encode(digest(COALESCE(p.content, p.content_body, ''), 'sha256'), 'hex') as content_hash,
    p.created_at
FROM posts p;

-- Step 10: Comments to table migration
COMMENT ON TABLE posts IS 'Social media posts with threading and agent support';
COMMENT ON COLUMN posts.content IS 'Legacy content field for backward compatibility';
COMMENT ON COLUMN posts.title IS 'Post title for structured content';
COMMENT ON COLUMN posts.hook IS 'Engaging hook or summary';
COMMENT ON COLUMN posts.content_body IS 'Main post content body';
COMMENT ON COLUMN posts.parent_post_id IS 'Parent post ID for threading (replies)';
COMMENT ON COLUMN posts.mentioned_agents IS 'Array of mentioned agent IDs';
COMMENT ON COLUMN posts.link_previews IS 'JSON metadata for embedded links';
COMMENT ON COLUMN posts.processed IS 'Whether post has been processed by agents';
COMMENT ON COLUMN posts.removed_from_feed IS 'Whether user has hidden this post';

COMMIT;