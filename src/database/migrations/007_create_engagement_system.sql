-- Migration 007: User Engagement System
-- Create comprehensive user engagement tracking with likes, saves, and analytics

BEGIN;

-- Step 1: Create likes table for posts and comments
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a user can only like a specific post/comment once
    CONSTRAINT unique_post_like UNIQUE (user_id, post_id),
    CONSTRAINT unique_comment_like UNIQUE (user_id, comment_id),
    
    -- Ensure like is for either post or comment, not both
    CONSTRAINT check_like_target CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR 
        (post_id IS NULL AND comment_id IS NOT NULL)
    )
);

-- Step 2: Create saves table for bookmarking posts
CREATE TABLE IF NOT EXISTS saves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    category VARCHAR(100) DEFAULT 'general',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a user can only save a specific post once
    CONSTRAINT unique_post_save UNIQUE (user_id, post_id)
);

-- Step 3: Create user_engagements table for detailed analytics
CREATE TABLE IF NOT EXISTS user_engagements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    engagement_type VARCHAR(50) NOT NULL CHECK (engagement_type IN (
        'view', 'click', 'show_details', 'comment_view', 'scroll_depth', 
        'time_spent', 'share', 'bookmark', 'expand_thread'
    )),
    count INTEGER NOT NULL DEFAULT 1,
    last_engaged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    first_engaged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}', -- For additional context like scroll depth, time spent, etc.
    session_id VARCHAR(255), -- Track engagement sessions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure engagement is for either post or comment, not both
    CONSTRAINT check_engagement_target CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR 
        (post_id IS NULL AND comment_id IS NOT NULL)
    )
);

-- Step 4: Create engagement_analytics materialized view for performance
CREATE MATERIALIZED VIEW engagement_analytics AS
WITH post_stats AS (
    SELECT 
        p.id as post_id,
        p.title,
        p.author_id,
        p.created_at,
        COUNT(DISTINCT l.user_id) as total_likes,
        COUNT(DISTINCT s.user_id) as total_saves,
        COUNT(DISTINCT c.id) as total_comments,
        COUNT(DISTINCT ue.user_id) FILTER (WHERE ue.engagement_type = 'view') as unique_views,
        COALESCE(SUM(ue.count) FILTER (WHERE ue.engagement_type = 'view'), 0) as total_views,
        COALESCE(SUM(ue.count) FILTER (WHERE ue.engagement_type = 'click'), 0) as total_clicks,
        COALESCE(AVG((ue.metadata->>'scroll_depth')::NUMERIC) FILTER (WHERE ue.engagement_type = 'scroll_depth'), 0) as avg_scroll_depth,
        COALESCE(AVG((ue.metadata->>'duration')::NUMERIC) FILTER (WHERE ue.engagement_type = 'time_spent'), 0) as avg_time_spent
    FROM posts p
    LEFT JOIN likes l ON p.id = l.post_id
    LEFT JOIN saves s ON p.id = s.post_id
    LEFT JOIN comments c ON p.id = c.post_id
    LEFT JOIN user_engagements ue ON p.id = ue.post_id
    GROUP BY p.id, p.title, p.author_id, p.created_at
)
SELECT 
    post_id,
    title,
    author_id,
    created_at,
    total_likes,
    total_saves,
    total_comments,
    unique_views,
    total_views,
    total_clicks,
    CASE 
        WHEN total_views > 0 THEN ROUND((total_clicks::NUMERIC / total_views::NUMERIC) * 100, 2)
        ELSE 0 
    END as click_through_rate,
    avg_scroll_depth,
    avg_time_spent,
    -- Engagement score calculation
    ROUND(
        (
            (total_likes * 3) + 
            (total_saves * 5) + 
            (total_comments * 4) + 
            (unique_views * 1) + 
            CASE WHEN avg_scroll_depth > 0.5 THEN 2 ELSE 0 END +
            CASE WHEN avg_time_spent > 30000 THEN 3 ELSE 0 END
        )::NUMERIC / GREATEST(unique_views, 1)::NUMERIC, 2
    ) as engagement_score
FROM post_stats;

-- Create unique index on the materialized view
CREATE UNIQUE INDEX idx_engagement_analytics_post_id ON engagement_analytics(post_id);

-- Step 5: Create indexes for performance
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_comment_id ON likes(comment_id);
CREATE INDEX idx_likes_created_at ON likes(created_at);

CREATE INDEX idx_saves_user_id ON saves(user_id);
CREATE INDEX idx_saves_post_id ON saves(post_id);
CREATE INDEX idx_saves_category ON saves(category);
CREATE INDEX idx_saves_created_at ON saves(created_at);

CREATE INDEX idx_user_engagements_user_id ON user_engagements(user_id);
CREATE INDEX idx_user_engagements_post_id ON user_engagements(post_id);
CREATE INDEX idx_user_engagements_comment_id ON user_engagements(comment_id);
CREATE INDEX idx_user_engagements_type ON user_engagements(engagement_type);
CREATE INDEX idx_user_engagements_last_engaged ON user_engagements(last_engaged_at);
CREATE INDEX idx_user_engagements_session ON user_engagements(session_id);

-- Composite indexes for common queries
CREATE INDEX idx_user_post_engagement ON user_engagements(user_id, post_id, engagement_type);
CREATE INDEX idx_user_comment_engagement ON user_engagements(user_id, comment_id, engagement_type);
CREATE INDEX idx_engagement_recency ON user_engagements(last_engaged_at DESC);

-- GIN index for metadata
CREATE INDEX idx_user_engagements_metadata ON user_engagements USING GIN (metadata);

-- Step 6: Add triggers for updated_at
CREATE TRIGGER trigger_user_engagements_updated_at 
    BEFORE UPDATE ON user_engagements 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Create functions for engagement management

-- Function to track user engagement
CREATE OR REPLACE FUNCTION track_engagement(
    p_user_id UUID,
    p_engagement_type VARCHAR(50),
    p_post_id UUID DEFAULT NULL,
    p_comment_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_session_id VARCHAR(255) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    engagement_id UUID;
    existing_engagement user_engagements%ROWTYPE;
BEGIN
    -- Validate input
    IF p_post_id IS NULL AND p_comment_id IS NULL THEN
        RAISE EXCEPTION 'Either post_id or comment_id must be provided';
    END IF;
    
    IF p_post_id IS NOT NULL AND p_comment_id IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot provide both post_id and comment_id';
    END IF;
    
    -- Check if engagement already exists
    SELECT * INTO existing_engagement
    FROM user_engagements
    WHERE user_id = p_user_id
    AND COALESCE(post_id, uuid_nil()) = COALESCE(p_post_id, uuid_nil())
    AND COALESCE(comment_id, uuid_nil()) = COALESCE(p_comment_id, uuid_nil())
    AND engagement_type = p_engagement_type;
    
    IF FOUND THEN
        -- Update existing engagement
        UPDATE user_engagements
        SET 
            count = count + 1,
            last_engaged_at = NOW(),
            metadata = CASE 
                WHEN p_metadata IS NOT NULL THEN p_metadata
                ELSE metadata
            END,
            session_id = COALESCE(p_session_id, session_id),
            updated_at = NOW()
        WHERE id = existing_engagement.id
        RETURNING id INTO engagement_id;
    ELSE
        -- Create new engagement record
        INSERT INTO user_engagements (
            user_id, post_id, comment_id, engagement_type, 
            metadata, session_id
        ) VALUES (
            p_user_id, p_post_id, p_comment_id, p_engagement_type,
            p_metadata, p_session_id
        ) RETURNING id INTO engagement_id;
    END IF;
    
    -- Update last_interaction_at for the post
    IF p_post_id IS NOT NULL THEN
        UPDATE posts SET last_interaction_at = NOW() WHERE id = p_post_id;
    ELSIF p_comment_id IS NOT NULL THEN
        UPDATE posts SET last_interaction_at = NOW() 
        WHERE id = (SELECT post_id FROM comments WHERE id = p_comment_id);
    END IF;
    
    RETURN engagement_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user engagement summary
CREATE OR REPLACE FUNCTION get_user_engagement_summary(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
    total_posts_viewed INTEGER,
    total_posts_liked INTEGER,
    total_posts_saved INTEGER,
    total_comments_made INTEGER,
    avg_time_per_post NUMERIC,
    avg_scroll_depth NUMERIC,
    engagement_streak_days INTEGER,
    most_active_hour INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH engagement_data AS (
        SELECT 
            COUNT(DISTINCT ue.post_id) FILTER (WHERE ue.engagement_type = 'view') as posts_viewed,
            COUNT(DISTINCT l.post_id) as posts_liked,
            COUNT(DISTINCT s.post_id) as posts_saved,
            COUNT(DISTINCT c.id) as comments_made,
            AVG((ue.metadata->>'duration')::NUMERIC) FILTER (WHERE ue.engagement_type = 'time_spent') as avg_time,
            AVG((ue.metadata->>'scroll_depth')::NUMERIC) FILTER (WHERE ue.engagement_type = 'scroll_depth') as avg_scroll,
            EXTRACT(hour FROM ue.created_at) as hour_of_day
        FROM user_engagements ue
        LEFT JOIN likes l ON l.user_id = ue.user_id AND l.created_at >= NOW() - INTERVAL '1 day' * p_days
        LEFT JOIN saves s ON s.user_id = ue.user_id AND s.created_at >= NOW() - INTERVAL '1 day' * p_days
        LEFT JOIN comments c ON c.author_id = ue.user_id AND c.created_at >= NOW() - INTERVAL '1 day' * p_days
        WHERE ue.user_id = p_user_id
        AND ue.created_at >= NOW() - INTERVAL '1 day' * p_days
        GROUP BY EXTRACT(hour FROM ue.created_at)
    ),
    streak_data AS (
        SELECT COUNT(*) as streak_days
        FROM (
            SELECT DATE(created_at) as engagement_date
            FROM user_engagements
            WHERE user_id = p_user_id
            AND created_at >= NOW() - INTERVAL '1 day' * p_days
            GROUP BY DATE(created_at)
            ORDER BY engagement_date DESC
        ) daily_engagement
    )
    SELECT 
        COALESCE(MAX(ed.posts_viewed), 0)::INTEGER,
        COALESCE(MAX(ed.posts_liked), 0)::INTEGER,
        COALESCE(MAX(ed.posts_saved), 0)::INTEGER,
        COALESCE(MAX(ed.comments_made), 0)::INTEGER,
        COALESCE(AVG(ed.avg_time), 0),
        COALESCE(AVG(ed.avg_scroll), 0),
        COALESCE(MAX(sd.streak_days), 0)::INTEGER,
        COALESCE(
            (SELECT hour_of_day FROM engagement_data GROUP BY hour_of_day ORDER BY COUNT(*) DESC LIMIT 1),
            12
        )::INTEGER
    FROM engagement_data ed
    CROSS JOIN streak_data sd;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh engagement analytics
CREATE OR REPLACE FUNCTION refresh_engagement_analytics()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW engagement_analytics;
END;
$$ LANGUAGE plpgsql;

-- Function to get trending posts based on engagement
CREATE OR REPLACE FUNCTION get_trending_posts(p_hours INTEGER DEFAULT 24, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
    post_id UUID,
    title TEXT,
    author_id UUID,
    engagement_score NUMERIC,
    total_likes BIGINT,
    total_views BIGINT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ea.post_id,
        ea.title,
        ea.author_id,
        ea.engagement_score,
        ea.total_likes,
        ea.total_views,
        ea.created_at
    FROM engagement_analytics ea
    WHERE ea.created_at >= NOW() - INTERVAL '1 hour' * p_hours
    ORDER BY ea.engagement_score DESC, ea.total_views DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create function to automatically refresh analytics
CREATE OR REPLACE FUNCTION auto_refresh_engagement_analytics()
RETURNS VOID AS $$
BEGIN
    -- Only refresh if the view is more than 5 minutes old
    IF NOT EXISTS (
        SELECT 1 FROM pg_stat_user_tables 
        WHERE relname = 'engagement_analytics' 
        AND last_analyze > NOW() - INTERVAL '5 minutes'
    ) THEN
        REFRESH MATERIALIZED VIEW engagement_analytics;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Add constraints and validation
ALTER TABLE user_engagements ADD CONSTRAINT check_engagement_count_positive 
    CHECK (count > 0);

ALTER TABLE user_engagements ADD CONSTRAINT check_engagement_timestamps 
    CHECK (last_engaged_at >= first_engaged_at);

-- Step 10: Comments for documentation
COMMENT ON TABLE likes IS 'User likes for posts and comments';
COMMENT ON TABLE saves IS 'User bookmarks/saves for posts with categorization';
COMMENT ON TABLE user_engagements IS 'Detailed user engagement tracking for analytics';
COMMENT ON MATERIALIZED VIEW engagement_analytics IS 'Pre-computed engagement metrics for performance';

COMMENT ON FUNCTION track_engagement IS 'Track user engagement events with metadata';
COMMENT ON FUNCTION get_user_engagement_summary IS 'Get comprehensive user engagement statistics';
COMMENT ON FUNCTION refresh_engagement_analytics IS 'Refresh engagement analytics materialized view';
COMMENT ON FUNCTION get_trending_posts IS 'Get trending posts based on engagement metrics';

COMMIT;