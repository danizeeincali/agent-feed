-- Migration 003: Comment Threading System
-- Adds comprehensive support for nested comments with unlimited depth

-- Enable LTREE extension for hierarchical data
CREATE EXTENSION IF NOT EXISTS "ltree";

-- ============================================================================
-- THREADED COMMENTS SYSTEM
-- ============================================================================

-- Main comments table with full threading support
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES agent_posts(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
    
    -- Comment content
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text', -- 'text', 'markdown', 'code'
    raw_content TEXT, -- Original unprocessed content
    
    -- Author information
    author_type VARCHAR(50) NOT NULL DEFAULT 'user', -- 'user', 'agent'
    author_id VARCHAR(255) NOT NULL, -- user_id or agent_name
    author_name VARCHAR(255) NOT NULL,
    author_avatar VARCHAR(255),
    
    -- Threading metadata
    thread_depth INTEGER DEFAULT 0,
    thread_path LTREE, -- For efficient tree queries (e.g., '1.2.3.4')
    reply_to_comment_id UUID REFERENCES post_comments(id), -- Direct reply target
    root_comment_id UUID, -- Root of this thread
    
    -- Agent interaction data
    agent_context JSONB DEFAULT '{}',
    response_to_agent VARCHAR(255), -- Which agent this is responding to
    conversation_thread_id UUID, -- Groups related agent conversations
    
    -- Engagement metrics
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    reaction_count INTEGER DEFAULT 0,
    
    -- Status and moderation
    status VARCHAR(50) DEFAULT 'published', -- 'published', 'hidden', 'deleted', 'pending'
    is_pinned BOOLEAN DEFAULT false,
    is_edited BOOLEAN DEFAULT false,
    
    -- Processing metadata
    processing_time_ms INTEGER DEFAULT 0,
    quality_score DECIMAL(4,3) DEFAULT 0.000,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT comment_depth_limit CHECK (thread_depth <= 50),
    CONSTRAINT author_type_check CHECK (author_type IN ('user', 'agent')),
    CONSTRAINT status_check CHECK (status IN ('published', 'hidden', 'deleted', 'pending')),
    CONSTRAINT quality_score_check CHECK (quality_score >= 0 AND quality_score <= 1)
);

-- Performance indexes for comment queries
CREATE INDEX idx_comments_post_id ON post_comments (post_id, created_at DESC);
CREATE INDEX idx_comments_parent_id ON post_comments (parent_comment_id);
CREATE INDEX idx_comments_thread_path ON post_comments USING GIST (thread_path);
CREATE INDEX idx_comments_root_id ON post_comments (root_comment_id, created_at);
CREATE INDEX idx_comments_author ON post_comments (author_type, author_id);
CREATE INDEX idx_comments_conversation ON post_comments (conversation_thread_id);
CREATE INDEX idx_comments_status ON post_comments (status, created_at DESC);
CREATE INDEX idx_comments_agent_context ON post_comments USING GIN (agent_context);
CREATE INDEX idx_comments_depth ON post_comments (thread_depth, created_at);

-- Full-text search index for comment content
CREATE INDEX idx_comments_content_search ON post_comments USING GIN (
    to_tsvector('english', content)
);

-- ============================================================================
-- COMMENT REACTIONS AND ENGAGEMENT
-- ============================================================================

-- Comment reactions (likes, helpful, etc.)
CREATE TABLE IF NOT EXISTS comment_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL, -- user_id or agent_name
    user_type VARCHAR(50) DEFAULT 'user', -- 'user', 'agent'
    reaction_type VARCHAR(50) NOT NULL DEFAULT 'like', -- 'like', 'helpful', 'agree', 'disagree', 'insightful'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(comment_id, user_id, reaction_type),
    CONSTRAINT reaction_type_check CHECK (reaction_type IN ('like', 'helpful', 'agree', 'disagree', 'insightful', 'spam'))
);

CREATE INDEX idx_comment_reactions_comment ON comment_reactions (comment_id, reaction_type);
CREATE INDEX idx_comment_reactions_user ON comment_reactions (user_id, user_type);

-- ============================================================================
-- AGENT CONVERSATION MANAGEMENT
-- ============================================================================

-- Agent conversation threads for grouping related agent interactions
CREATE TABLE IF NOT EXISTS agent_conversation_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES agent_posts(id) ON DELETE CASCADE,
    root_comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
    
    -- Thread metadata
    thread_topic VARCHAR(500),
    thread_summary TEXT,
    participating_agents JSONB DEFAULT '[]',
    thread_status VARCHAR(50) DEFAULT 'active', -- 'active', 'resolved', 'archived'
    
    -- Analytics
    total_comments INTEGER DEFAULT 0,
    max_depth_reached INTEGER DEFAULT 0,
    avg_response_time_minutes INTEGER DEFAULT 0,
    
    -- Engagement metrics
    total_reactions INTEGER DEFAULT 0,
    user_participants JSONB DEFAULT '[]',
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT thread_status_check CHECK (thread_status IN ('active', 'resolved', 'archived', 'paused'))
);

CREATE INDEX idx_agent_threads_post ON agent_conversation_threads (post_id, thread_status);
CREATE INDEX idx_agent_threads_root_comment ON agent_conversation_threads (root_comment_id);
CREATE INDEX idx_agent_threads_status ON agent_conversation_threads (thread_status, last_activity_at DESC);
CREATE INDEX idx_agent_threads_agents ON agent_conversation_threads USING GIN (participating_agents);

-- ============================================================================
-- COMMENT THREADING CACHE FOR PERFORMANCE
-- ============================================================================

-- Comment thread metadata for caching complex tree structures
CREATE TABLE IF NOT EXISTS comment_thread_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES agent_posts(id) ON DELETE CASCADE,
    root_comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
    
    -- Cached thread structure (JSON tree for quick rendering)
    thread_structure JSONB NOT NULL, -- Full tree structure for quick access
    flattened_structure JSONB, -- Flattened list for virtual scrolling
    
    -- Thread statistics
    total_comments INTEGER DEFAULT 0,
    max_depth INTEGER DEFAULT 0,
    avg_depth DECIMAL(4,2) DEFAULT 0,
    
    -- Agent participation stats
    agent_participation JSONB DEFAULT '{}', -- agent_name -> comment_count
    conversation_threads INTEGER DEFAULT 0,
    
    -- Performance optimization flags
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    needs_rebuild BOOLEAN DEFAULT false,
    rebuild_priority INTEGER DEFAULT 1, -- 1=low, 5=high
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(post_id, root_comment_id)
);

CREATE INDEX idx_thread_metadata_post ON comment_thread_metadata (post_id, needs_rebuild);
CREATE INDEX idx_thread_metadata_rebuild ON comment_thread_metadata (needs_rebuild, rebuild_priority DESC);
CREATE INDEX idx_thread_metadata_updated ON comment_thread_metadata (last_updated);

-- ============================================================================
-- COMMENT MODERATION AND QUALITY
-- ============================================================================

-- Comment moderation actions
CREATE TABLE IF NOT EXISTS comment_moderation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
    
    -- Moderation details
    action VARCHAR(50) NOT NULL, -- 'hide', 'delete', 'flag', 'approve', 'pin'
    reason VARCHAR(255),
    moderator_id VARCHAR(255),
    moderator_type VARCHAR(50) DEFAULT 'user', -- 'user', 'agent', 'system'
    
    -- Automatic vs manual moderation
    is_automated BOOLEAN DEFAULT false,
    confidence_score DECIMAL(4,3), -- For automated actions
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT moderation_action_check CHECK (action IN ('hide', 'delete', 'flag', 'approve', 'pin', 'unpin'))
);

CREATE INDEX idx_comment_moderation_comment ON comment_moderation (comment_id, created_at DESC);
CREATE INDEX idx_comment_moderation_action ON comment_moderation (action, is_automated);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC MAINTENANCE
-- ============================================================================

-- Update comment thread paths and depths
CREATE OR REPLACE FUNCTION update_comment_thread_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Set thread depth and path
    IF NEW.parent_comment_id IS NULL THEN
        -- Root comment
        NEW.thread_depth := 0;
        NEW.thread_path := NEW.id::text::ltree;
        NEW.root_comment_id := NEW.id;
    ELSE
        -- Child comment
        SELECT 
            thread_depth + 1,
            thread_path || NEW.id::text,
            COALESCE(root_comment_id, id)
        INTO 
            NEW.thread_depth,
            NEW.thread_path,
            NEW.root_comment_id
        FROM post_comments 
        WHERE id = NEW.parent_comment_id;
    END IF;
    
    -- Set conversation thread ID if responding to agent
    IF NEW.response_to_agent IS NOT NULL AND NEW.conversation_thread_id IS NULL THEN
        -- Try to find existing conversation thread
        SELECT conversation_thread_id INTO NEW.conversation_thread_id
        FROM post_comments 
        WHERE post_id = NEW.post_id 
          AND (author_id = NEW.response_to_agent OR response_to_agent = NEW.response_to_agent)
          AND conversation_thread_id IS NOT NULL
        LIMIT 1;
        
        -- Create new conversation thread if none exists
        IF NEW.conversation_thread_id IS NULL THEN
            NEW.conversation_thread_id := uuid_generate_v4();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comment_thread_metadata_trigger
    BEFORE INSERT ON post_comments
    FOR EACH ROW EXECUTE FUNCTION update_comment_thread_metadata();

-- Update parent comment reply counts
CREATE OR REPLACE FUNCTION update_parent_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment reply count for parent
        IF NEW.parent_comment_id IS NOT NULL THEN
            UPDATE post_comments 
            SET reply_count = reply_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.parent_comment_id;
        END IF;
        
        -- Increment comment count on post
        UPDATE agent_posts 
        SET interaction_count = interaction_count + 1,
            last_interaction_at = CURRENT_TIMESTAMP
        WHERE id = NEW.post_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement reply count for parent
        IF OLD.parent_comment_id IS NOT NULL THEN
            UPDATE post_comments 
            SET reply_count = GREATEST(0, reply_count - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.parent_comment_id;
        END IF;
        
        -- Decrement comment count on post
        UPDATE agent_posts 
        SET interaction_count = GREATEST(0, interaction_count - 1)
        WHERE id = OLD.post_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_parent_reply_count_trigger
    AFTER INSERT OR DELETE ON post_comments
    FOR EACH ROW EXECUTE FUNCTION update_parent_reply_count();

-- Update reaction counts
CREATE OR REPLACE FUNCTION update_comment_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE post_comments 
        SET like_count = CASE 
            WHEN NEW.reaction_type = 'like' THEN like_count + 1 
            ELSE like_count 
        END,
        reaction_count = reaction_count + 1,
        updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE post_comments 
        SET like_count = CASE 
            WHEN OLD.reaction_type = 'like' THEN GREATEST(0, like_count - 1) 
            ELSE like_count 
        END,
        reaction_count = GREATEST(0, reaction_count - 1),
        updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comment_reaction_count_trigger
    AFTER INSERT OR DELETE ON comment_reactions
    FOR EACH ROW EXECUTE FUNCTION update_comment_reaction_count();

-- Mark thread metadata for rebuild when comments change
CREATE OR REPLACE FUNCTION mark_thread_metadata_stale()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark all thread metadata for this post as needing rebuild
    UPDATE comment_thread_metadata 
    SET needs_rebuild = true,
        rebuild_priority = CASE 
            WHEN TG_OP = 'DELETE' THEN 5 
            ELSE rebuild_priority 
        END
    WHERE post_id = COALESCE(NEW.post_id, OLD.post_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mark_thread_metadata_stale_trigger
    AFTER INSERT OR UPDATE OR DELETE ON post_comments
    FOR EACH ROW EXECUTE FUNCTION mark_thread_metadata_stale();

-- ============================================================================
-- VIEWS FOR COMMON COMMENT QUERIES
-- ============================================================================

-- Comments with full thread context
CREATE OR REPLACE VIEW comments_with_thread_context AS
SELECT 
    c.*,
    parent.author_name as parent_author_name,
    parent.content as parent_content_preview,
    root.author_name as root_author_name,
    root.content as root_content_preview,
    
    -- Thread statistics
    (SELECT COUNT(*) FROM post_comments cc WHERE cc.root_comment_id = c.root_comment_id) as thread_total_comments,
    (SELECT MAX(thread_depth) FROM post_comments cc WHERE cc.root_comment_id = c.root_comment_id) as thread_max_depth,
    
    -- Engagement metrics
    COALESCE(reactions.reaction_counts, '{}'::jsonb) as reaction_breakdown,
    COALESCE(reactions.total_reactions, 0) as total_reactions
    
FROM post_comments c
LEFT JOIN post_comments parent ON c.parent_comment_id = parent.id
LEFT JOIN post_comments root ON c.root_comment_id = root.id
LEFT JOIN (
    SELECT 
        comment_id,
        jsonb_object_agg(reaction_type, reaction_count) as reaction_counts,
        SUM(reaction_count) as total_reactions
    FROM (
        SELECT 
            comment_id, 
            reaction_type, 
            COUNT(*) as reaction_count
        FROM comment_reactions 
        GROUP BY comment_id, reaction_type
    ) reaction_stats
    GROUP BY comment_id
) reactions ON c.id = reactions.comment_id
WHERE c.status = 'published';

-- Agent conversation summary
CREATE OR REPLACE VIEW agent_conversation_summary AS
SELECT 
    act.*,
    p.title as post_title,
    p.author_agent as post_author,
    
    -- Conversation metrics
    (SELECT COUNT(DISTINCT author_id) 
     FROM post_comments 
     WHERE conversation_thread_id = act.id AND author_type = 'agent') as unique_agents,
     
    (SELECT COUNT(DISTINCT author_id) 
     FROM post_comments 
     WHERE conversation_thread_id = act.id AND author_type = 'user') as unique_users,
     
    -- Latest activity
    (SELECT content 
     FROM post_comments 
     WHERE conversation_thread_id = act.id 
     ORDER BY created_at DESC 
     LIMIT 1) as latest_comment
     
FROM agent_conversation_threads act
JOIN agent_posts p ON act.post_id = p.id
WHERE act.thread_status = 'active';

-- Comment thread performance metrics
CREATE OR REPLACE VIEW comment_thread_analytics AS
SELECT 
    post_id,
    COUNT(*) as total_comments,
    COUNT(DISTINCT root_comment_id) as root_threads,
    MAX(thread_depth) as max_depth_reached,
    AVG(thread_depth::float) as avg_depth,
    
    -- Agent participation
    COUNT(CASE WHEN author_type = 'agent' THEN 1 END) as agent_comments,
    COUNT(CASE WHEN author_type = 'user' THEN 1 END) as user_comments,
    COUNT(DISTINCT CASE WHEN author_type = 'agent' THEN author_id END) as unique_agents,
    
    -- Engagement metrics
    SUM(like_count) as total_likes,
    SUM(reaction_count) as total_reactions,
    AVG(quality_score) as avg_quality_score,
    
    -- Temporal metrics
    MIN(created_at) as first_comment_at,
    MAX(created_at) as latest_comment_at,
    
    -- Conversation threads
    COUNT(DISTINCT conversation_thread_id) FILTER (WHERE conversation_thread_id IS NOT NULL) as conversation_threads
    
FROM post_comments
WHERE status = 'published'
GROUP BY post_id;

-- ============================================================================
-- MAINTENANCE PROCEDURES
-- ============================================================================

-- Rebuild comment thread metadata cache
CREATE OR REPLACE FUNCTION rebuild_comment_thread_cache(target_post_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    rebuilt_count INTEGER := 0;
    thread_record RECORD;
BEGIN
    -- Process threads that need rebuilding
    FOR thread_record IN 
        SELECT DISTINCT ctm.post_id, ctm.root_comment_id
        FROM comment_thread_metadata ctm
        WHERE (target_post_id IS NULL OR ctm.post_id = target_post_id)
          AND ctm.needs_rebuild = true
        ORDER BY ctm.rebuild_priority DESC, ctm.last_updated ASC
        LIMIT 100
    LOOP
        -- Rebuild thread structure
        WITH RECURSIVE comment_tree AS (
            -- Root comments
            SELECT 
                id, parent_comment_id, content, author_name, author_type,
                thread_depth, created_at, like_count, reply_count,
                ARRAY[id] as path,
                json_build_object(
                    'id', id,
                    'content', LEFT(content, 200),
                    'author', json_build_object('name', author_name, 'type', author_type),
                    'depth', thread_depth,
                    'likes', like_count,
                    'replies', reply_count,
                    'created_at', created_at,
                    'children', '[]'::json
                ) as node_json
            FROM post_comments
            WHERE post_id = thread_record.post_id 
              AND root_comment_id = thread_record.root_comment_id
              AND parent_comment_id IS NULL
              AND status = 'published'
              
            UNION ALL
            
            -- Child comments
            SELECT 
                c.id, c.parent_comment_id, c.content, c.author_name, c.author_type,
                c.thread_depth, c.created_at, c.like_count, c.reply_count,
                ct.path || c.id,
                json_build_object(
                    'id', c.id,
                    'content', LEFT(c.content, 200),
                    'author', json_build_object('name', c.author_name, 'type', c.author_type),
                    'depth', c.thread_depth,
                    'likes', c.like_count,
                    'replies', c.reply_count,
                    'created_at', c.created_at,
                    'children', '[]'::json
                ) as node_json
            FROM post_comments c
            JOIN comment_tree ct ON c.parent_comment_id = ct.id
            WHERE c.status = 'published'
        )
        -- Update or insert thread metadata
        INSERT INTO comment_thread_metadata (
            post_id, root_comment_id, thread_structure, flattened_structure,
            total_comments, max_depth, avg_depth, needs_rebuild, last_updated
        )
        SELECT 
            thread_record.post_id,
            thread_record.root_comment_id,
            json_agg(node_json ORDER BY path) as thread_structure,
            json_agg(node_json ORDER BY thread_depth, created_at) as flattened_structure,
            COUNT(*) as total_comments,
            MAX(thread_depth) as max_depth,
            AVG(thread_depth::float) as avg_depth,
            false as needs_rebuild,
            CURRENT_TIMESTAMP as last_updated
        FROM comment_tree
        ON CONFLICT (post_id, root_comment_id) DO UPDATE SET
            thread_structure = EXCLUDED.thread_structure,
            flattened_structure = EXCLUDED.flattened_structure,
            total_comments = EXCLUDED.total_comments,
            max_depth = EXCLUDED.max_depth,
            avg_depth = EXCLUDED.avg_depth,
            needs_rebuild = false,
            last_updated = CURRENT_TIMESTAMP;
            
        rebuilt_count := rebuilt_count + 1;
    END LOOP;
    
    RETURN rebuilt_count;
END;
$$ LANGUAGE plpgsql;

-- Cleanup deleted comments and update thread structure
CREATE OR REPLACE FUNCTION cleanup_deleted_comments()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER := 0;
BEGIN
    -- Soft delete old hidden comments (30 days)
    UPDATE post_comments 
    SET status = 'deleted'
    WHERE status = 'hidden' 
      AND updated_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
      
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    
    -- Mark affected threads for rebuild
    UPDATE comment_thread_metadata 
    SET needs_rebuild = true,
        rebuild_priority = 3
    WHERE post_id IN (
        SELECT DISTINCT post_id 
        FROM post_comments 
        WHERE status = 'deleted' 
          AND updated_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'
    );
    
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

COMMIT;