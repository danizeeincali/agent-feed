-- Agent Feed Database Schema with Claude-Flow Integration
-- PostgreSQL 14+ with JSON support

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostgreSQL JSON functions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    claude_user_id VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255), -- For local auth if needed
    preferences JSONB NOT NULL DEFAULT '{
        "theme": "auto",
        "notifications": {
            "email": true,
            "push": true,
            "feed_updates": true,
            "agent_completion": true,
            "error_alerts": true
        },
        "feed_settings": {
            "auto_refresh": true,
            "items_per_page": 50,
            "default_view": "list",
            "show_preview": true
        },
        "automation_enabled": true
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Feeds table
CREATE TABLE feeds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    feed_type VARCHAR(20) NOT NULL CHECK (feed_type IN ('rss', 'atom', 'json', 'api', 'webhook')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'paused', 'error', 'pending')),
    last_fetched TIMESTAMP WITH TIME ZONE,
    fetch_interval INTEGER NOT NULL DEFAULT 60, -- minutes
    automation_config JSONB NOT NULL DEFAULT '{
        "enabled": false,
        "triggers": [],
        "actions": [],
        "claude_flow_config": {
            "swarm_topology": "mesh",
            "max_agents": 5,
            "agent_types": ["researcher", "analyzer"],
            "neural_training": true,
            "memory_persistence": true
        }
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, url)
);

-- Feed items table
CREATE TABLE feed_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feed_id UUID NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    url TEXT NOT NULL,
    author VARCHAR(255),
    published_at TIMESTAMP WITH TIME ZONE,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    processed BOOLEAN DEFAULT FALSE,
    content_hash VARCHAR(64), -- For deduplication
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(feed_id, content_hash)
);

-- Automation results table
CREATE TABLE automation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feed_item_id UUID NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
    trigger_id VARCHAR(255) NOT NULL,
    action_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    result_data JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Claude Flow sessions table
CREATE TABLE claude_flow_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    swarm_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'initializing' CHECK (status IN ('initializing', 'active', 'paused', 'completed', 'failed')),
    configuration JSONB NOT NULL,
    metrics JSONB DEFAULT '{
        "agents_spawned": 0,
        "tasks_completed": 0,
        "total_tokens_used": 0,
        "performance_score": 0.0,
        "neural_patterns_learned": 0
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Neural patterns table
CREATE TABLE neural_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feed_id UUID REFERENCES feeds(id) ON DELETE CASCADE,
    session_id UUID REFERENCES claude_flow_sessions(id) ON DELETE SET NULL,
    pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN ('coordination', 'optimization', 'prediction')),
    pattern_data JSONB NOT NULL,
    confidence_score DECIMAL(5,4) DEFAULT 0.0,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions for JWT management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET
);

-- Feed fetch logs for monitoring
CREATE TABLE feed_fetch_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feed_id UUID NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
    items_found INTEGER DEFAULT 0,
    items_new INTEGER DEFAULT 0,
    error_message TEXT,
    fetch_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automation trigger definitions
CREATE TABLE automation_triggers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feed_id UUID NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('new_item', 'keyword_match', 'schedule', 'custom')),
    conditions JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automation action definitions
CREATE TABLE automation_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feed_id UUID NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('claude_flow_spawn', 'notification', 'webhook', 'email', 'custom')),
    config JSONB NOT NULL DEFAULT '{}',
    priority INTEGER DEFAULT 1,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_feeds_user_id ON feeds(user_id);
CREATE INDEX idx_feeds_status ON feeds(status);
CREATE INDEX idx_feeds_next_fetch ON feeds(last_fetched, fetch_interval) WHERE status = 'active';

CREATE INDEX idx_feed_items_feed_id ON feed_items(feed_id);
CREATE INDEX idx_feed_items_published_at ON feed_items(published_at);
CREATE INDEX idx_feed_items_processed ON feed_items(processed);
CREATE INDEX idx_feed_items_content_hash ON feed_items(content_hash);

CREATE INDEX idx_automation_results_feed_item_id ON automation_results(feed_item_id);
CREATE INDEX idx_automation_results_status ON automation_results(status);
CREATE INDEX idx_automation_results_created_at ON automation_results(created_at);

CREATE INDEX idx_claude_flow_sessions_user_id ON claude_flow_sessions(user_id);
CREATE INDEX idx_claude_flow_sessions_status ON claude_flow_sessions(status);
CREATE INDEX idx_claude_flow_sessions_swarm_id ON claude_flow_sessions(swarm_id);

CREATE INDEX idx_neural_patterns_feed_id ON neural_patterns(feed_id);
CREATE INDEX idx_neural_patterns_pattern_type ON neural_patterns(pattern_type);
CREATE INDEX idx_neural_patterns_confidence ON neural_patterns(confidence_score);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX idx_feed_fetch_logs_feed_id ON feed_fetch_logs(feed_id);
CREATE INDEX idx_feed_fetch_logs_created_at ON feed_fetch_logs(created_at);

CREATE INDEX idx_automation_triggers_feed_id ON automation_triggers(feed_id);
CREATE INDEX idx_automation_actions_feed_id ON automation_actions(feed_id);

-- GIN indexes for JSONB columns
CREATE INDEX idx_users_preferences_gin ON users USING GIN (preferences);
CREATE INDEX idx_feeds_automation_config_gin ON feeds USING GIN (automation_config);
CREATE INDEX idx_feed_items_metadata_gin ON feed_items USING GIN (metadata);
CREATE INDEX idx_neural_patterns_data_gin ON neural_patterns USING GIN (pattern_data);

-- Full text search indexes
CREATE INDEX idx_feed_items_title_search ON feed_items USING GIN (to_tsvector('english', title));
CREATE INDEX idx_feed_items_content_search ON feed_items USING GIN (to_tsvector('english', content));

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feeds_updated_at BEFORE UPDATE ON feeds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_claude_flow_sessions_updated_at BEFORE UPDATE ON claude_flow_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_neural_patterns_updated_at BEFORE UPDATE ON neural_patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automation_triggers_updated_at BEFORE UPDATE ON automation_triggers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automation_actions_updated_at BEFORE UPDATE ON automation_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate feed item content hash
CREATE OR REPLACE FUNCTION calculate_content_hash(content_text TEXT)
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN encode(digest(content_text, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to get next feeds to fetch
CREATE OR REPLACE FUNCTION get_feeds_to_fetch(batch_size INTEGER DEFAULT 100)
RETURNS TABLE(
    feed_id UUID,
    feed_url TEXT,
    last_fetched TIMESTAMP WITH TIME ZONE,
    fetch_interval INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.url,
        f.last_fetched,
        f.fetch_interval
    FROM feeds f
    WHERE f.status = 'active'
    AND (
        f.last_fetched IS NULL 
        OR f.last_fetched + INTERVAL '1 minute' * f.fetch_interval <= NOW()
    )
    ORDER BY 
        CASE WHEN f.last_fetched IS NULL THEN 0 ELSE 1 END,
        f.last_fetched ASC
    LIMIT batch_size;
END;
$$ LANGUAGE plpgsql;

-- Agents table for agent management
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    avatar_color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    capabilities JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error', 'testing')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,
    performance_metrics JSONB NOT NULL DEFAULT '{
        "success_rate": 0.0,
        "average_response_time": 0,
        "total_tokens_used": 0,
        "error_count": 0
    }',
    health_status JSONB NOT NULL DEFAULT '{
        "cpu_usage": 0,
        "memory_usage": 0,
        "response_time": 0,
        "last_heartbeat": null
    }',
    UNIQUE(user_id, name)
);

-- Agent execution logs
CREATE TABLE agent_execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    execution_type VARCHAR(50) NOT NULL CHECK (execution_type IN ('test', 'task', 'heartbeat')),
    input_data JSONB,
    output_data JSONB,
    execution_time_ms INTEGER,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for agents table
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_name ON agents(user_id, name);
CREATE INDEX idx_agents_capabilities_gin ON agents USING GIN (capabilities);
CREATE INDEX idx_agents_performance_gin ON agents USING GIN (performance_metrics);

CREATE INDEX idx_agent_execution_logs_agent_id ON agent_execution_logs(agent_id);
CREATE INDEX idx_agent_execution_logs_created_at ON agent_execution_logs(created_at);
CREATE INDEX idx_agent_execution_logs_status ON agent_execution_logs(status);

-- Triggers for agents updated_at
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts with Claude integration';
COMMENT ON TABLE feeds IS 'RSS/Atom/JSON feeds with automation configuration';
COMMENT ON TABLE feed_items IS 'Individual items from feeds';
COMMENT ON TABLE automation_results IS 'Results of automated actions on feed items';
COMMENT ON TABLE claude_flow_sessions IS 'Active Claude-Flow swarm sessions';
COMMENT ON TABLE neural_patterns IS 'Learned patterns from Claude-Flow neural training';
COMMENT ON TABLE user_sessions IS 'JWT refresh token management';
COMMENT ON TABLE feed_fetch_logs IS 'Feed fetching history and error tracking';
COMMENT ON TABLE automation_triggers IS 'Trigger definitions for automation';
COMMENT ON TABLE automation_actions IS 'Action definitions for automation';
COMMENT ON TABLE agents IS 'AI agents created and managed by users';
COMMENT ON TABLE agent_execution_logs IS 'Execution history and performance logs for agents';