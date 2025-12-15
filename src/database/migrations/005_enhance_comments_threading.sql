-- Enhance comments table with threading and social features
ALTER TABLE comments ADD COLUMN IF NOT EXISTS thread_depth INTEGER DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS thread_path VARCHAR(500);
ALTER TABLE comments ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS replies_count INTEGER DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS reported_count INTEGER DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_moderated BOOLEAN DEFAULT FALSE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS moderator_notes TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]';
ALTER TABLE comments ADD COLUMN IF NOT EXISTS mentioned_users JSONB DEFAULT '[]';
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Create comment reactions table
CREATE TABLE IF NOT EXISTS comment_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    reaction_type VARCHAR(50) NOT NULL, -- 'like', 'heart', 'laugh', 'angry', 'sad', 'wow'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    UNIQUE(comment_id, user_id, reaction_type)
);

-- Create comment reports table
CREATE TABLE IF NOT EXISTS comment_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL,
    reporter_id VARCHAR(255) NOT NULL,
    reason VARCHAR(100) NOT NULL, -- 'spam', 'harassment', 'inappropriate', 'offtopic'
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    UNIQUE(comment_id, reporter_id)
);

-- Create comment subscriptions for notifications
CREATE TABLE IF NOT EXISTS comment_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    subscription_type VARCHAR(50) NOT NULL, -- 'thread', 'replies', 'mentions'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    UNIQUE(comment_id, user_id, subscription_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_thread_depth ON comments(thread_depth);
CREATE INDEX IF NOT EXISTS idx_comments_thread_path ON comments(thread_path);
CREATE INDEX IF NOT EXISTS idx_comments_likes_count ON comments(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_comments_replies_count ON comments(replies_count DESC);
CREATE INDEX IF NOT EXISTS idx_comments_pinned ON comments(is_pinned, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON comment_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_type ON comment_reactions(reaction_type);

CREATE INDEX IF NOT EXISTS idx_comment_reports_comment_id ON comment_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_status ON comment_reports(status);
CREATE INDEX IF NOT EXISTS idx_comment_reports_created_at ON comment_reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comment_subscriptions_comment_id ON comment_subscriptions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_subscriptions_user_id ON comment_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_subscriptions_active ON comment_subscriptions(is_active);

-- Function to update thread path and depth
CREATE OR REPLACE FUNCTION update_comment_thread_info()
RETURNS TRIGGER AS $$
BEGIN
    -- Update thread depth and path for new comment
    IF NEW.parent_id IS NULL THEN
        -- Root comment
        NEW.thread_depth = 0;
        NEW.thread_path = NEW.id::text;
    ELSE
        -- Child comment - get parent info
        SELECT 
            thread_depth + 1,
            thread_path || '/' || NEW.id::text
        INTO NEW.thread_depth, NEW.thread_path
        FROM comments 
        WHERE id = NEW.parent_id;
        
        -- Update parent's replies count
        UPDATE comments 
        SET replies_count = replies_count + 1,
            updated_at = NOW()
        WHERE id = NEW.parent_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update reaction counts
CREATE OR REPLACE FUNCTION update_comment_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment likes count for 'like' reactions
        IF NEW.reaction_type = 'like' THEN
            UPDATE comments 
            SET likes_count = likes_count + 1
            WHERE id = NEW.comment_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement likes count for 'like' reactions
        IF OLD.reaction_type = 'like' THEN
            UPDATE comments 
            SET likes_count = likes_count - 1
            WHERE id = OLD.comment_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to handle comment deletion (decrement parent replies count)
CREATE OR REPLACE FUNCTION handle_comment_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- When a comment is soft deleted, decrement parent's replies count
    IF NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE THEN
        IF NEW.parent_id IS NOT NULL THEN
            UPDATE comments 
            SET replies_count = replies_count - 1
            WHERE id = NEW.parent_id AND replies_count > 0;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_comment_thread_info ON comments;
CREATE TRIGGER trigger_update_comment_thread_info
    BEFORE INSERT ON comments
    FOR EACH ROW EXECUTE FUNCTION update_comment_thread_info();

DROP TRIGGER IF EXISTS trigger_update_comment_reaction_count ON comment_reactions;
CREATE TRIGGER trigger_update_comment_reaction_count
    AFTER INSERT OR DELETE ON comment_reactions
    FOR EACH ROW EXECUTE FUNCTION update_comment_reaction_count();

DROP TRIGGER IF EXISTS trigger_handle_comment_deletion ON comments;
CREATE TRIGGER trigger_handle_comment_deletion
    AFTER UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION handle_comment_deletion();