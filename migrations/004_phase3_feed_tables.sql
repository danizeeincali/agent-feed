-- AVI Phase 3: Feed Infrastructure Tables
-- Migration 004
-- Date: October 10, 2025

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: user_feeds
-- Purpose: RSS/Atom/JSON feeds that users want their agents to monitor
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_feeds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  agent_name VARCHAR(100) NOT NULL,
  feed_url TEXT NOT NULL,
  feed_type VARCHAR(20) NOT NULL DEFAULT 'rss', -- rss, atom, json
  feed_name VARCHAR(255),
  feed_description TEXT,
  fetch_interval_minutes INTEGER DEFAULT 15 CHECK (fetch_interval_minutes BETWEEN 5 AND 1440),
  last_fetched_at TIMESTAMPTZ,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error', 'deleted')),
  automation_enabled BOOLEAN DEFAULT TRUE,
  response_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_feed_url UNIQUE(user_id, feed_url),
  CONSTRAINT fk_agent_template FOREIGN KEY (agent_name)
    REFERENCES system_agent_templates(name)
    ON DELETE CASCADE
);

-- Indexes for user_feeds
CREATE INDEX idx_user_feeds_user_id ON user_feeds(user_id);
CREATE INDEX idx_user_feeds_agent_name ON user_feeds(agent_name);
CREATE INDEX idx_user_feeds_status ON user_feeds(status) WHERE status = 'active';
CREATE INDEX idx_user_feeds_next_fetch ON user_feeds(last_fetched_at)
  WHERE status = 'active';

COMMENT ON TABLE user_feeds IS 'RSS/Atom/JSON feeds monitored by agents';
COMMENT ON COLUMN user_feeds.fetch_interval_minutes IS 'How often to poll this feed (5-1440 minutes)';
COMMENT ON COLUMN user_feeds.automation_enabled IS 'Whether to automatically respond to new posts';
COMMENT ON COLUMN user_feeds.response_config IS 'Per-feed response configuration (priority, filters, etc.)';

-- ============================================================================
-- TABLE: feed_items
-- Purpose: Individual posts/items from feeds
-- ============================================================================

CREATE TABLE IF NOT EXISTS feed_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feed_id UUID NOT NULL,
  item_guid VARCHAR(500) NOT NULL,
  title TEXT,
  content TEXT,
  content_snippet TEXT, -- First 500 chars for preview
  author VARCHAR(255),
  link TEXT,
  published_at TIMESTAMPTZ,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'queued', 'processing', 'completed', 'failed', 'skipped')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_feed FOREIGN KEY (feed_id)
    REFERENCES user_feeds(id)
    ON DELETE CASCADE,
  CONSTRAINT unique_feed_item_guid UNIQUE(feed_id, item_guid)
);

-- Indexes for feed_items
CREATE INDEX idx_feed_items_feed_id ON feed_items(feed_id);
CREATE INDEX idx_feed_items_processed ON feed_items(processed) WHERE processed = FALSE;
CREATE INDEX idx_feed_items_processing_status ON feed_items(processing_status)
  WHERE processing_status IN ('pending', 'queued');
CREATE INDEX idx_feed_items_published_at ON feed_items(published_at DESC);
CREATE INDEX idx_feed_items_discovered_at ON feed_items(discovered_at DESC);

COMMENT ON TABLE feed_items IS 'Individual posts/articles from RSS/Atom/JSON feeds';
COMMENT ON COLUMN feed_items.item_guid IS 'Unique identifier from feed (usually URL or GUID)';
COMMENT ON COLUMN feed_items.content_snippet IS 'Preview of content for UI display';
COMMENT ON COLUMN feed_items.processing_status IS 'Current processing state in work queue';

-- ============================================================================
-- TABLE: feed_positions
-- Purpose: Track where we are in each feed (pagination/cursor)
-- ============================================================================

CREATE TABLE IF NOT EXISTS feed_positions (
  feed_id UUID PRIMARY KEY,
  last_item_guid VARCHAR(500),
  last_item_id UUID,
  last_published_at TIMESTAMPTZ,
  items_processed INTEGER DEFAULT 0,
  items_total INTEGER DEFAULT 0,
  cursor_data JSONB DEFAULT '{}', -- For APIs with pagination cursors
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_feed_position FOREIGN KEY (feed_id)
    REFERENCES user_feeds(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_last_item FOREIGN KEY (last_item_id)
    REFERENCES feed_items(id)
    ON DELETE SET NULL
);

COMMENT ON TABLE feed_positions IS 'Tracks last processed position in each feed';
COMMENT ON COLUMN feed_positions.cursor_data IS 'API-specific cursor/pagination data';

-- ============================================================================
-- TABLE: agent_responses
-- Purpose: Store agent-generated responses to feed items
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_ticket_id UUID,
  feed_item_id UUID,
  agent_name VARCHAR(100) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  response_content TEXT NOT NULL,
  response_metadata JSONB DEFAULT '{}',
  tokens_used INTEGER,
  generation_time_ms INTEGER,
  validation_results JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'posted', 'failed', 'rejected')),
  posted_at TIMESTAMPTZ,
  post_url TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_agent_response_template FOREIGN KEY (agent_name)
    REFERENCES system_agent_templates(name)
    ON DELETE CASCADE,
  CONSTRAINT fk_agent_response_feed_item FOREIGN KEY (feed_item_id)
    REFERENCES feed_items(id)
    ON DELETE CASCADE
);

-- Indexes for agent_responses
CREATE INDEX idx_agent_responses_agent_name ON agent_responses(agent_name);
CREATE INDEX idx_agent_responses_user_id ON agent_responses(user_id);
CREATE INDEX idx_agent_responses_status ON agent_responses(status);
CREATE INDEX idx_agent_responses_feed_item_id ON agent_responses(feed_item_id);
CREATE INDEX idx_agent_responses_created_at ON agent_responses(created_at DESC);

COMMENT ON TABLE agent_responses IS 'AI-generated responses to feed items';
COMMENT ON COLUMN agent_responses.validation_results IS 'Quality/safety validation results';
COMMENT ON COLUMN agent_responses.response_metadata IS 'Model, temperature, prompt version, etc.';

-- ============================================================================
-- TABLE: feed_fetch_logs
-- Purpose: Track feed fetch attempts for debugging and monitoring
-- ============================================================================

CREATE TABLE IF NOT EXISTS feed_fetch_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feed_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'timeout', 'invalid')),
  http_status_code INTEGER,
  items_found INTEGER DEFAULT 0,
  items_new INTEGER DEFAULT 0,
  fetch_duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_feed_fetch_log FOREIGN KEY (feed_id)
    REFERENCES user_feeds(id)
    ON DELETE CASCADE
);

-- Indexes for feed_fetch_logs
CREATE INDEX idx_feed_fetch_logs_feed_id ON feed_fetch_logs(feed_id);
CREATE INDEX idx_feed_fetch_logs_status ON feed_fetch_logs(status);
CREATE INDEX idx_feed_fetch_logs_created_at ON feed_fetch_logs(created_at DESC);

COMMENT ON TABLE feed_fetch_logs IS 'Audit log of all feed fetch attempts';

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================================

-- user_feeds updated_at trigger
CREATE OR REPLACE FUNCTION update_user_feeds_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_feeds_updated_at
  BEFORE UPDATE ON user_feeds
  FOR EACH ROW
  EXECUTE FUNCTION update_user_feeds_timestamp();

-- agent_responses updated_at trigger
CREATE OR REPLACE FUNCTION update_agent_responses_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_agent_responses_updated_at
  BEFORE UPDATE ON agent_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_responses_timestamp();

-- ============================================================================
-- TRIGGERS: Auto-create feed_positions on feed creation
-- ============================================================================

CREATE OR REPLACE FUNCTION create_feed_position()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO feed_positions (feed_id)
  VALUES (NEW.id)
  ON CONFLICT (feed_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_feed_position
  AFTER INSERT ON user_feeds
  FOR EACH ROW
  EXECUTE FUNCTION create_feed_position();

-- ============================================================================
-- VIEWS: Convenient queries for common use cases
-- ============================================================================

-- View: Active feeds needing fetch
CREATE OR REPLACE VIEW feeds_due_for_fetch AS
SELECT
  f.id,
  f.user_id,
  f.agent_name,
  f.feed_url,
  f.feed_type,
  f.fetch_interval_minutes,
  f.last_fetched_at,
  COALESCE(f.last_fetched_at, f.created_at - INTERVAL '1 hour') +
    (f.fetch_interval_minutes || ' minutes')::INTERVAL AS next_fetch_at
FROM user_feeds f
WHERE f.status = 'active'
  AND f.automation_enabled = TRUE
  AND (
    f.last_fetched_at IS NULL
    OR f.last_fetched_at + (f.fetch_interval_minutes || ' minutes')::INTERVAL < NOW()
  )
ORDER BY next_fetch_at ASC;

COMMENT ON VIEW feeds_due_for_fetch IS 'Feeds that should be fetched now';

-- View: Feed statistics
CREATE OR REPLACE VIEW feed_stats AS
SELECT
  f.id AS feed_id,
  f.user_id,
  f.agent_name,
  f.feed_name,
  f.status,
  COUNT(fi.id) AS total_items,
  COUNT(fi.id) FILTER (WHERE fi.processed = FALSE) AS unprocessed_items,
  COUNT(ar.id) AS total_responses,
  COUNT(ar.id) FILTER (WHERE ar.status = 'posted') AS posted_responses,
  MAX(fi.published_at) AS latest_item_date,
  MAX(fi.discovered_at) AS latest_discovery_date
FROM user_feeds f
LEFT JOIN feed_items fi ON fi.feed_id = f.id
LEFT JOIN agent_responses ar ON ar.feed_item_id = fi.id
GROUP BY f.id, f.user_id, f.agent_name, f.feed_name, f.status;

COMMENT ON VIEW feed_stats IS 'Aggregated statistics per feed';

-- ============================================================================
-- SEED DATA: Example feed for testing
-- ============================================================================

-- Only insert if tech-guru template exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM system_agent_templates WHERE name = 'tech-guru') THEN
    INSERT INTO user_feeds (
      user_id,
      agent_name,
      feed_url,
      feed_type,
      feed_name,
      feed_description,
      fetch_interval_minutes
    ) VALUES (
      'test-user',
      'tech-guru',
      'https://hnrss.org/newest',
      'rss',
      'Hacker News - Newest',
      'Latest posts from Hacker News',
      15
    )
    ON CONFLICT (user_id, feed_url) DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- GRANTS: Ensure application has proper permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON user_feeds TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON feed_items TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON feed_positions TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_responses TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON feed_fetch_logs TO postgres;
GRANT SELECT ON feeds_due_for_fetch TO postgres;
GRANT SELECT ON feed_stats TO postgres;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES (4, 'phase3_feed_tables', NOW())
ON CONFLICT (version) DO NOTHING;

COMMENT ON SCHEMA public IS 'AVI Phase 3 feed tables migration applied';
