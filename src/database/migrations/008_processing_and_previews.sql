-- Migration 008: Processing Status & Link Previews
-- Add link preview extraction, processing coordination, and metadata management

BEGIN;

-- Step 1: Create link_previews table for cached link metadata
CREATE TABLE IF NOT EXISTS link_previews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL UNIQUE,
    title TEXT,
    description TEXT,
    image_url TEXT,
    site_name TEXT,
    favicon_url TEXT,
    content_type VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
    error_message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create post_processing_status table for coordination
CREATE TABLE IF NOT EXISTS post_processing_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    processing_stage VARCHAR(50) DEFAULT 'created' CHECK (processing_stage IN (
        'created', 'agent_assignment', 'content_analysis', 'link_extraction',
        'preview_generation', 'mention_processing', 'quality_review', 'completed'
    )),
    agents_assigned INTEGER DEFAULT 0,
    agents_completed INTEGER DEFAULT 0,
    links_found INTEGER DEFAULT 0,
    links_processed INTEGER DEFAULT 0,
    mentions_found INTEGER DEFAULT 0,
    mentions_processed INTEGER DEFAULT 0,
    quality_score DECIMAL(3,2) DEFAULT 0.00,
    chief_of_staff_approved BOOLEAN DEFAULT FALSE,
    processing_metadata JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_post_processing UNIQUE (post_id)
);

-- Step 3: Create processing_logs table for audit trail
CREATE TABLE IF NOT EXISTS processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    processing_stage VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'skipped')),
    details JSONB DEFAULT '{}',
    execution_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create post_links table for extracted links
CREATE TABLE IF NOT EXISTS post_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    link_preview_id UUID REFERENCES link_previews(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    link_text TEXT,
    position_in_content INTEGER,
    link_type VARCHAR(50) DEFAULT 'external' CHECK (link_type IN ('external', 'internal', 'mention', 'hashtag')),
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_post_url UNIQUE (post_id, url)
);

-- Step 5: Create indexes for performance
CREATE INDEX idx_link_previews_url ON link_previews(url);
CREATE INDEX idx_link_previews_status ON link_previews(status);
CREATE INDEX idx_link_previews_expires_at ON link_previews(expires_at);
CREATE INDEX idx_link_previews_last_accessed ON link_previews(last_accessed);

CREATE INDEX idx_post_processing_status_post_id ON post_processing_status(post_id);
CREATE INDEX idx_post_processing_status_stage ON post_processing_status(processing_stage);
CREATE INDEX idx_post_processing_status_completed ON post_processing_status(completed_at);
CREATE INDEX idx_post_processing_status_quality ON post_processing_status(quality_score);

CREATE INDEX idx_processing_logs_post_id ON processing_logs(post_id);
CREATE INDEX idx_processing_logs_agent_id ON processing_logs(agent_id);
CREATE INDEX idx_processing_logs_stage ON processing_logs(processing_stage);
CREATE INDEX idx_processing_logs_created_at ON processing_logs(created_at);

CREATE INDEX idx_post_links_post_id ON post_links(post_id);
CREATE INDEX idx_post_links_preview_id ON post_links(link_preview_id);
CREATE INDEX idx_post_links_url ON post_links(url);
CREATE INDEX idx_post_links_type ON post_links(link_type);

-- GIN indexes for JSONB
CREATE INDEX idx_link_previews_metadata ON link_previews USING GIN (metadata);
CREATE INDEX idx_post_processing_metadata ON post_processing_status USING GIN (processing_metadata);
CREATE INDEX idx_processing_logs_details ON processing_logs USING GIN (details);

-- Step 6: Add triggers for updated_at
CREATE TRIGGER trigger_link_previews_updated_at 
    BEFORE UPDATE ON link_previews 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_post_processing_status_updated_at 
    BEFORE UPDATE ON post_processing_status 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Create functions for link preview management

-- Function to extract links from post content
CREATE OR REPLACE FUNCTION extract_links_from_post(p_post_id UUID)
RETURNS INTEGER AS $$
DECLARE
    post_content TEXT;
    link_pattern TEXT := 'https?://[^\s<>"'']+';
    found_links TEXT[];
    link_url TEXT;
    link_count INTEGER := 0;
BEGIN
    -- Get post content
    SELECT COALESCE(content, '') || ' ' || COALESCE(content_body, '') 
    INTO post_content
    FROM posts WHERE id = p_post_id;
    
    -- Extract URLs using regex
    SELECT regexp_split_to_array(post_content, '\s+') INTO found_links;
    
    -- Process each potential link
    FOR i IN 1..array_length(found_links, 1) LOOP
        IF found_links[i] ~ link_pattern THEN
            link_url := substring(found_links[i] FROM link_pattern);
            
            -- Insert link if not already exists
            INSERT INTO post_links (post_id, url, position_in_content)
            VALUES (p_post_id, link_url, i)
            ON CONFLICT (post_id, url) DO NOTHING;
            
            link_count := link_count + 1;
            
            -- Create link preview entry if not exists
            INSERT INTO link_previews (url)
            VALUES (link_url)
            ON CONFLICT (url) DO UPDATE SET 
                last_accessed = NOW(),
                expires_at = CASE 
                    WHEN link_previews.expires_at < NOW() THEN NOW() + INTERVAL '7 days'
                    ELSE link_previews.expires_at
                END;
        END IF;
    END LOOP;
    
    -- Update processing status
    UPDATE post_processing_status 
    SET 
        links_found = link_count,
        processing_stage = 'link_extraction',
        updated_at = NOW()
    WHERE post_id = p_post_id;
    
    RETURN link_count;
END;
$$ LANGUAGE plpgsql;

-- Function to generate link preview
CREATE OR REPLACE FUNCTION generate_link_preview(p_url TEXT)
RETURNS UUID AS $$
DECLARE
    preview_id UUID;
BEGIN
    -- Update link preview status to processing
    UPDATE link_previews 
    SET 
        status = 'processing',
        updated_at = NOW()
    WHERE url = p_url
    RETURNING id INTO preview_id;
    
    -- In a real implementation, this would trigger external service
    -- For now, we'll create a placeholder that can be updated by external process
    
    -- Log the link preview generation request
    INSERT INTO processing_logs (
        post_id, 
        processing_stage, 
        action, 
        status, 
        details
    ) 
    SELECT 
        pl.post_id,
        'preview_generation',
        'generate_preview',
        'started',
        jsonb_build_object('url', p_url, 'preview_id', preview_id)
    FROM post_links pl 
    WHERE pl.url = p_url
    LIMIT 1;
    
    RETURN preview_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update link preview data
CREATE OR REPLACE FUNCTION update_link_preview(
    p_url TEXT,
    p_title TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL,
    p_site_name TEXT DEFAULT NULL,
    p_favicon_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
    preview_id UUID;
BEGIN
    UPDATE link_previews
    SET
        title = COALESCE(p_title, title),
        description = COALESCE(p_description, description),
        image_url = COALESCE(p_image_url, image_url),
        site_name = COALESCE(p_site_name, site_name),
        favicon_url = COALESCE(p_favicon_url, favicon_url),
        metadata = COALESCE(p_metadata, metadata),
        status = 'completed',
        updated_at = NOW()
    WHERE url = p_url
    RETURNING id INTO preview_id;
    
    IF FOUND THEN
        -- Update post_links with preview reference
        UPDATE post_links 
        SET link_preview_id = preview_id
        WHERE url = p_url AND link_preview_id IS NULL;
        
        -- Update processing status for affected posts
        UPDATE post_processing_status
        SET 
            links_processed = links_processed + 1,
            updated_at = NOW()
        WHERE post_id IN (
            SELECT DISTINCT post_id FROM post_links WHERE url = p_url
        );
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to initialize post processing
CREATE OR REPLACE FUNCTION initialize_post_processing(p_post_id UUID)
RETURNS UUID AS $$
DECLARE
    processing_id UUID;
    agent_count INTEGER;
BEGIN
    -- Get count of active agents
    SELECT COUNT(*) INTO agent_count FROM agents WHERE status = 'active';
    
    -- Create processing status record
    INSERT INTO post_processing_status (
        post_id, 
        agents_assigned,
        processing_stage
    ) VALUES (
        p_post_id,
        agent_count,
        'agent_assignment'
    ) RETURNING id INTO processing_id;
    
    -- Assign to agent processing queue
    PERFORM assign_post_to_agents(p_post_id);
    
    -- Extract links from content
    PERFORM extract_links_from_post(p_post_id);
    
    -- Log initialization
    INSERT INTO processing_logs (
        post_id, 
        processing_stage, 
        action, 
        status, 
        details
    ) VALUES (
        p_post_id,
        'created',
        'initialize_processing',
        'completed',
        jsonb_build_object('agents_assigned', agent_count)
    );
    
    RETURN processing_id;
END;
$$ LANGUAGE plpgsql;

-- Function for Chief of Staff approval
CREATE OR REPLACE FUNCTION chief_of_staff_approval(
    p_post_id UUID, 
    p_approved BOOLEAN, 
    p_quality_score DECIMAL DEFAULT NULL,
    p_feedback TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_stage VARCHAR(50);
BEGIN
    -- Get current processing stage
    SELECT processing_stage INTO current_stage
    FROM post_processing_status
    WHERE post_id = p_post_id;
    
    -- Update processing status
    UPDATE post_processing_status
    SET
        chief_of_staff_approved = p_approved,
        quality_score = COALESCE(p_quality_score, quality_score),
        processing_stage = CASE 
            WHEN p_approved THEN 'completed'
            ELSE 'quality_review'
        END,
        completed_at = CASE 
            WHEN p_approved THEN NOW()
            ELSE NULL
        END,
        processing_metadata = processing_metadata || jsonb_build_object(
            'chief_feedback', p_feedback,
            'approval_timestamp', NOW()
        ),
        updated_at = NOW()
    WHERE post_id = p_post_id;
    
    -- Update post processed status
    UPDATE posts 
    SET 
        processed = p_approved,
        last_interaction_at = NOW()
    WHERE id = p_post_id;
    
    -- Log the approval decision
    INSERT INTO processing_logs (
        post_id,
        agent_id,
        processing_stage,
        action,
        status,
        details
    ) VALUES (
        p_post_id,
        (SELECT id FROM agents WHERE name = 'chief-of-staff' LIMIT 1),
        'quality_review',
        'chief_approval',
        CASE WHEN p_approved THEN 'completed' ELSE 'failed' END,
        jsonb_build_object(
            'approved', p_approved,
            'quality_score', p_quality_score,
            'feedback', p_feedback
        )
    );
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get processing summary
CREATE OR REPLACE FUNCTION get_processing_summary(p_post_id UUID)
RETURNS TABLE(
    post_id UUID,
    processing_stage VARCHAR(50),
    agents_assigned INTEGER,
    agents_completed INTEGER,
    links_found INTEGER,
    links_processed INTEGER,
    mentions_found INTEGER,
    mentions_processed INTEGER,
    quality_score DECIMAL,
    chief_approved BOOLEAN,
    completion_percentage DECIMAL,
    processing_time_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pps.post_id,
        pps.processing_stage,
        pps.agents_assigned,
        pps.agents_completed,
        pps.links_found,
        pps.links_processed,
        pps.mentions_found,
        pps.mentions_processed,
        pps.quality_score,
        pps.chief_of_staff_approved,
        CASE 
            WHEN pps.agents_assigned + pps.links_found + pps.mentions_found = 0 THEN 0
            ELSE ROUND(
                ((pps.agents_completed + pps.links_processed + pps.mentions_processed)::NUMERIC / 
                 GREATEST(pps.agents_assigned + pps.links_found + pps.mentions_found, 1)::NUMERIC) * 100, 
                2
            )
        END as completion_percentage,
        CASE 
            WHEN pps.completed_at IS NOT NULL THEN 
                EXTRACT(EPOCH FROM (pps.completed_at - pps.started_at))::INTEGER / 60
            ELSE 
                EXTRACT(EPOCH FROM (NOW() - pps.started_at))::INTEGER / 60
        END as processing_time_minutes
    FROM post_processing_status pps
    WHERE pps.post_id = p_post_id;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger to auto-initialize processing for new posts
CREATE OR REPLACE FUNCTION trigger_initialize_post_processing()
RETURNS TRIGGER AS $$
BEGIN
    -- Initialize processing for new posts
    PERFORM initialize_post_processing(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_new_post_processing
    AFTER INSERT ON posts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_initialize_post_processing();

-- Step 9: Function to cleanup expired link previews
CREATE OR REPLACE FUNCTION cleanup_expired_link_previews()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Mark expired previews
    UPDATE link_previews 
    SET status = 'expired', updated_at = NOW()
    WHERE expires_at < NOW() AND status != 'expired';
    
    -- Delete very old expired previews (older than 30 days)
    DELETE FROM link_previews 
    WHERE status = 'expired' 
    AND updated_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Comments for documentation
COMMENT ON TABLE link_previews IS 'Cached link preview data with expiration management';
COMMENT ON TABLE post_processing_status IS 'Overall processing coordination status for posts';
COMMENT ON TABLE processing_logs IS 'Audit trail for all processing activities';
COMMENT ON TABLE post_links IS 'Extracted links from post content with preview references';

COMMENT ON FUNCTION extract_links_from_post IS 'Extract and catalog all links found in post content';
COMMENT ON FUNCTION generate_link_preview IS 'Trigger link preview generation for external processing';
COMMENT ON FUNCTION update_link_preview IS 'Update link preview with fetched metadata';
COMMENT ON FUNCTION initialize_post_processing IS 'Initialize complete processing pipeline for new posts';
COMMENT ON FUNCTION chief_of_staff_approval IS 'Chief of Staff quality approval workflow';
COMMENT ON FUNCTION get_processing_summary IS 'Get comprehensive processing status summary';

COMMIT;