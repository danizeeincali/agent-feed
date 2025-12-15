-- Migration 006: Agent Management System
-- Create comprehensive agent infrastructure with profiles, pages, and coordination

BEGIN;

-- Step 1: Create agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    system_prompt TEXT,
    avatar_color VARCHAR(7) NOT NULL DEFAULT '#4A90E2',
    icon_class VARCHAR(100) NOT NULL DEFAULT 'fas fa-robot',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    capabilities TEXT[] DEFAULT ARRAY[]::TEXT[],
    performance_metrics JSONB DEFAULT '{
        "total_posts_processed": 0,
        "average_response_time": 0,
        "success_rate": 1.0,
        "last_active": null
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create agent_pages table for dynamic pages
CREATE TABLE IF NOT EXISTS agent_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    html_content TEXT NOT NULL,
    css_content TEXT,
    js_content TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    -- Data-driven page support
    data_schema JSONB,
    page_data JSONB DEFAULT '{}',
    template_type VARCHAR(20) DEFAULT 'static' CHECK (template_type IN ('static', 'dynamic')),
    last_data_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create agent_processing_queue for coordination
CREATE TABLE IF NOT EXISTS agent_processing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
    priority INTEGER DEFAULT 1,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    result_data JSONB DEFAULT '{}',
    processing_metadata JSONB DEFAULT '{}'
);

-- Step 4: Create agent_mentions table for tracking mentions
CREATE TABLE IF NOT EXISTS agent_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    mentioned_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mention_text TEXT NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    response_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT check_mention_target CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR 
        (post_id IS NULL AND comment_id IS NOT NULL)
    )
);

-- Step 5: Create agent_responses table for tracking generated responses
CREATE TABLE IF NOT EXISTS agent_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    parent_mention_id UUID REFERENCES agent_mentions(id) ON DELETE SET NULL,
    response_type VARCHAR(20) DEFAULT 'comment' CHECK (response_type IN ('comment', 'post', 'reply')),
    content TEXT NOT NULL,
    generation_metadata JSONB DEFAULT '{}',
    quality_score DECIMAL(3,2) DEFAULT 0.00,
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT check_response_target CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR 
        (post_id IS NULL AND comment_id IS NOT NULL)
    )
);

-- Step 6: Create indexes for performance
CREATE INDEX idx_agents_name ON agents(name);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_created_at ON agents(created_at);

CREATE INDEX idx_agent_pages_agent_id ON agent_pages(agent_id);
CREATE INDEX idx_agent_pages_slug ON agent_pages(slug);
CREATE INDEX idx_agent_pages_active ON agent_pages(is_active);
CREATE INDEX idx_agent_pages_template_type ON agent_pages(template_type);

CREATE INDEX idx_agent_processing_queue_post_id ON agent_processing_queue(post_id);
CREATE INDEX idx_agent_processing_queue_agent_id ON agent_processing_queue(agent_id);
CREATE INDEX idx_agent_processing_queue_status ON agent_processing_queue(status);
CREATE INDEX idx_agent_processing_queue_priority ON agent_processing_queue(priority, assigned_at);

CREATE INDEX idx_agent_mentions_post_id ON agent_mentions(post_id);
CREATE INDEX idx_agent_mentions_comment_id ON agent_mentions(comment_id);
CREATE INDEX idx_agent_mentions_agent_id ON agent_mentions(agent_id);
CREATE INDEX idx_agent_mentions_processed ON agent_mentions(processed);

CREATE INDEX idx_agent_responses_agent_id ON agent_responses(agent_id);
CREATE INDEX idx_agent_responses_post_id ON agent_responses(post_id);
CREATE INDEX idx_agent_responses_comment_id ON agent_responses(comment_id);
CREATE INDEX idx_agent_responses_approved ON agent_responses(approved);

-- GIN indexes for JSONB and arrays
CREATE INDEX idx_agents_performance_metrics ON agents USING GIN (performance_metrics);
CREATE INDEX idx_agents_capabilities ON agents USING GIN (capabilities);
CREATE INDEX idx_agent_pages_metadata ON agent_pages USING GIN (metadata);
CREATE INDEX idx_agent_pages_data_schema ON agent_pages USING GIN (data_schema);
CREATE INDEX idx_agent_pages_page_data ON agent_pages USING GIN (page_data);

-- Step 7: Add triggers for updated_at
CREATE TRIGGER trigger_agents_updated_at 
    BEFORE UPDATE ON agents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_agent_pages_updated_at 
    BEFORE UPDATE ON agent_pages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Create functions for agent management

-- Function to assign post to agent processing queue
CREATE OR REPLACE FUNCTION assign_post_to_agents(p_post_id UUID, p_priority INTEGER DEFAULT 1)
RETURNS INTEGER AS $$
DECLARE
    assigned_count INTEGER := 0;
BEGIN
    -- Assign to all active agents
    INSERT INTO agent_processing_queue (post_id, agent_id, priority)
    SELECT p_post_id, a.id, p_priority
    FROM agents a
    WHERE a.status = 'active'
    ON CONFLICT DO NOTHING;
    
    GET DIAGNOSTICS assigned_count = ROW_COUNT;
    
    -- Update post as requiring processing
    UPDATE posts SET processed = FALSE WHERE id = p_post_id;
    
    RETURN assigned_count;
END;
$$ LANGUAGE plpgsql;

-- Function to mark agent processing as completed
CREATE OR REPLACE FUNCTION complete_agent_processing(p_queue_id UUID, p_result_data JSONB DEFAULT '{}')
RETURNS BOOLEAN AS $$
DECLARE
    p_post_id UUID;
BEGIN
    -- Update the processing queue entry
    UPDATE agent_processing_queue 
    SET 
        status = 'completed',
        completed_at = NOW(),
        result_data = p_result_data
    WHERE id = p_queue_id
    RETURNING post_id INTO p_post_id;
    
    IF p_post_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if all agents have processed this post
    IF NOT EXISTS (
        SELECT 1 FROM agent_processing_queue 
        WHERE post_id = p_post_id 
        AND status IN ('pending', 'processing')
    ) THEN
        -- All agents completed, mark post as processed
        UPDATE posts 
        SET 
            processed = TRUE,
            last_interaction_at = NOW()
        WHERE id = p_post_id;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get next post for agent processing
CREATE OR REPLACE FUNCTION get_next_post_for_agent(p_agent_id UUID)
RETURNS TABLE(
    queue_id UUID,
    post_id UUID,
    post_title TEXT,
    post_content TEXT,
    priority INTEGER,
    assigned_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        apq.id as queue_id,
        apq.post_id,
        p.title as post_title,
        COALESCE(p.content, p.content_body) as post_content,
        apq.priority,
        apq.assigned_at
    FROM agent_processing_queue apq
    JOIN posts p ON apq.post_id = p.id
    JOIN agents a ON apq.agent_id = a.id
    WHERE apq.agent_id = p_agent_id
    AND apq.status = 'pending'
    AND a.status = 'active'
    ORDER BY apq.priority DESC, apq.assigned_at ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to update agent performance metrics
CREATE OR REPLACE FUNCTION update_agent_performance(p_agent_id UUID, p_processing_time INTEGER, p_success BOOLEAN)
RETURNS VOID AS $$
DECLARE
    current_metrics JSONB;
    new_metrics JSONB;
BEGIN
    SELECT performance_metrics INTO current_metrics 
    FROM agents WHERE id = p_agent_id;
    
    -- Update metrics
    new_metrics := jsonb_set(
        jsonb_set(
            jsonb_set(
                current_metrics,
                '{total_posts_processed}',
                ((current_metrics->>'total_posts_processed')::INTEGER + 1)::TEXT::JSONB
            ),
            '{last_active}',
            to_jsonb(NOW())
        ),
        '{average_response_time}',
        (
            (
                (current_metrics->>'average_response_time')::NUMERIC * 
                (current_metrics->>'total_posts_processed')::NUMERIC + 
                p_processing_time
            ) / 
            ((current_metrics->>'total_posts_processed')::NUMERIC + 1)
        )::TEXT::JSONB
    );
    
    -- Update success rate if provided
    IF p_success IS NOT NULL THEN
        new_metrics := jsonb_set(
            new_metrics,
            '{success_rate}',
            (
                (
                    (current_metrics->>'success_rate')::NUMERIC * 
                    (current_metrics->>'total_posts_processed')::NUMERIC + 
                    CASE WHEN p_success THEN 1 ELSE 0 END
                ) / 
                ((current_metrics->>'total_posts_processed')::NUMERIC + 1)
            )::TEXT::JSONB
        );
    END IF;
    
    UPDATE agents 
    SET performance_metrics = new_metrics,
        updated_at = NOW()
    WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Insert default agents
INSERT INTO agents (name, display_name, description, system_prompt, avatar_color, icon_class, capabilities) VALUES
('content-curator', 'Content Curator', 'Analyzes and curates content from various sources', 'You are a content curator AI. Your job is to analyze posts and provide insightful commentary and categorization.', '#4A90E2', 'fas fa-newspaper', ARRAY['content-analysis', 'categorization', 'curation']),
('conversation-starter', 'Conversation Starter', 'Generates engaging discussion prompts and questions', 'You are a conversation starter AI. Generate thought-provoking questions and discussion prompts based on post content.', '#50C878', 'fas fa-comments', ARRAY['discussion', 'engagement', 'questions']),
('fact-checker', 'Fact Checker', 'Verifies information accuracy and provides corrections', 'You are a fact-checking AI. Analyze posts for factual accuracy and provide corrections or verification.', '#FF6B6B', 'fas fa-check-circle', ARRAY['fact-checking', 'verification', 'accuracy']),
('trend-analyzer', 'Trend Analyzer', 'Identifies patterns and trends in content and discussions', 'You are a trend analysis AI. Identify patterns, trends, and insights from post content and user interactions.', '#9B59B6', 'fas fa-chart-line', ARRAY['analysis', 'trends', 'insights']),
('chief-of-staff', 'Chief of Staff', 'Coordinates and oversees other agents processing', 'You are the Chief of Staff AI. Your role is to coordinate other agents, ensure quality control, and manage the processing workflow.', '#F39C12', 'fas fa-crown', ARRAY['coordination', 'quality-control', 'management'])
ON CONFLICT (name) DO NOTHING;

-- Step 10: Add comments for documentation
COMMENT ON TABLE agents IS 'AI agents with profiles and capabilities for content processing';
COMMENT ON TABLE agent_pages IS 'Dynamic pages generated and managed by AI agents';
COMMENT ON TABLE agent_processing_queue IS 'Queue system for coordinating agent processing of posts';
COMMENT ON TABLE agent_mentions IS 'Tracking of agent mentions in posts and comments';
COMMENT ON TABLE agent_responses IS 'AI-generated responses from agents to posts and comments';

COMMIT;