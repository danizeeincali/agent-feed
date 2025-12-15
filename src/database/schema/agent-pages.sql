-- Agent Pages Database Schema
-- TDD London School approach: Define contracts first

-- Agent Pages table
CREATE TABLE IF NOT EXISTS agent_pages (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    agent_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'markdown', 'json', 'component')),
    content_value TEXT NOT NULL,
    content_metadata TEXT, -- JSON metadata
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    tags TEXT, -- JSON array of tags
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Agent Workspaces table
CREATE TABLE IF NOT EXISTS agent_workspaces (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    agent_id TEXT NOT NULL UNIQUE,
    workspace_path TEXT NOT NULL,
    structure TEXT, -- JSON workspace structure
    metadata TEXT, -- JSON metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Page Components table (for component registry)
CREATE TABLE IF NOT EXISTS agent_page_components (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    component_schema TEXT NOT NULL, -- JSON schema
    render_template TEXT NOT NULL, -- React component template
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_pages_agent_id ON agent_pages(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_pages_status ON agent_pages(status);
CREATE INDEX IF NOT EXISTS idx_agent_pages_created_at ON agent_pages(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_workspaces_agent_id ON agent_workspaces(agent_id);

-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS trigger_agent_pages_updated_at
    AFTER UPDATE ON agent_pages
    BEGIN
        UPDATE agent_pages SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS trigger_agent_workspaces_updated_at
    AFTER UPDATE ON agent_workspaces
    BEGIN
        UPDATE agent_workspaces SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;