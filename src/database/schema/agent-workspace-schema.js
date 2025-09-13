/**
 * Agent Workspace Database Schema
 * Supports both PostgreSQL and SQLite with unified interface
 */

export const AGENT_WORKSPACE_SCHEMA = {
  // Agent Workspaces Table
  agent_workspaces: {
    postgresql: `
      CREATE TABLE IF NOT EXISTS agent_workspaces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id VARCHAR(255) NOT NULL UNIQUE,
        workspace_path VARCHAR(500) NOT NULL,
        structure JSONB DEFAULT '{}'::jsonb,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_agent_workspaces_agent_id ON agent_workspaces(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_workspaces_created_at ON agent_workspaces(created_at);
    `,
    
    sqlite: `
      CREATE TABLE IF NOT EXISTS agent_workspaces (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL UNIQUE,
        workspace_path TEXT NOT NULL,
        structure TEXT DEFAULT '{}',
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_agent_workspaces_agent_id ON agent_workspaces(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_workspaces_created_at ON agent_workspaces(created_at);
    `
  },

  // Agent Pages Table
  agent_pages: {
    postgresql: `
      CREATE TABLE IF NOT EXISTS agent_pages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id VARCHAR(255) NOT NULL,
        title VARCHAR(500) NOT NULL,
        page_type VARCHAR(50) NOT NULL DEFAULT 'dynamic' CHECK (page_type IN ('persistent', 'dynamic', 'template')),
        content_type VARCHAR(50) NOT NULL DEFAULT 'markdown' CHECK (content_type IN ('text', 'markdown', 'json', 'component')),
        content_value TEXT NOT NULL,
        content_metadata JSONB DEFAULT '{}'::jsonb,
        status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
        tags JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        version INTEGER DEFAULT 1,
        
        -- Foreign key constraint
        CONSTRAINT fk_agent_pages_workspace 
          FOREIGN KEY (agent_id) 
          REFERENCES agent_workspaces(agent_id) 
          ON DELETE CASCADE
      );
      
      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_agent_pages_agent_id ON agent_pages(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_pages_type ON agent_pages(page_type);
      CREATE INDEX IF NOT EXISTS idx_agent_pages_status ON agent_pages(status);
      CREATE INDEX IF NOT EXISTS idx_agent_pages_created_at ON agent_pages(created_at);
      
      -- GIN index for JSONB fields
      CREATE INDEX IF NOT EXISTS idx_agent_pages_tags ON agent_pages USING GIN (tags);
      CREATE INDEX IF NOT EXISTS idx_agent_pages_metadata ON agent_pages USING GIN (content_metadata);
    `,
    
    sqlite: `
      CREATE TABLE IF NOT EXISTS agent_pages (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        title TEXT NOT NULL,
        page_type TEXT NOT NULL DEFAULT 'dynamic' CHECK (page_type IN ('persistent', 'dynamic', 'template')),
        content_type TEXT NOT NULL DEFAULT 'markdown' CHECK (content_type IN ('text', 'markdown', 'json', 'component')),
        content_value TEXT NOT NULL,
        content_metadata TEXT DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
        tags TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        version INTEGER DEFAULT 1,
        
        -- Foreign key constraint
        FOREIGN KEY (agent_id) REFERENCES agent_workspaces(agent_id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_agent_pages_agent_id ON agent_pages(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_pages_type ON agent_pages(page_type);
      CREATE INDEX IF NOT EXISTS idx_agent_pages_status ON agent_pages(status);
      CREATE INDEX IF NOT EXISTS idx_agent_pages_created_at ON agent_pages(created_at);
    `
  },

  // Agent Components Table (for reusable UI components)
  agent_components: {
    postgresql: `
      CREATE TABLE IF NOT EXISTS agent_components (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id VARCHAR(255) NOT NULL,
        component_name VARCHAR(255) NOT NULL,
        component_type VARCHAR(50) NOT NULL DEFAULT 'react' CHECK (component_type IN ('react', 'vue', 'svelte', 'html')),
        component_code TEXT NOT NULL,
        props_schema JSONB DEFAULT '{}'::jsonb,
        style_config JSONB DEFAULT '{}'::jsonb,
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        version INTEGER DEFAULT 1,
        
        -- Unique constraint for component names per agent
        UNIQUE(agent_id, component_name),
        
        -- Foreign key constraint
        CONSTRAINT fk_agent_components_workspace 
          FOREIGN KEY (agent_id) 
          REFERENCES agent_workspaces(agent_id) 
          ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_agent_components_agent_id ON agent_components(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_components_type ON agent_components(component_type);
      CREATE INDEX IF NOT EXISTS idx_agent_components_public ON agent_components(is_public);
    `,
    
    sqlite: `
      CREATE TABLE IF NOT EXISTS agent_components (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        component_name TEXT NOT NULL,
        component_type TEXT NOT NULL DEFAULT 'react' CHECK (component_type IN ('react', 'vue', 'svelte', 'html')),
        component_code TEXT NOT NULL,
        props_schema TEXT DEFAULT '{}',
        style_config TEXT DEFAULT '{}',
        is_public BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        version INTEGER DEFAULT 1,
        
        UNIQUE(agent_id, component_name),
        FOREIGN KEY (agent_id) REFERENCES agent_workspaces(agent_id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_agent_components_agent_id ON agent_components(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_components_type ON agent_components(component_type);
      CREATE INDEX IF NOT EXISTS idx_agent_components_public ON agent_components(is_public);
    `
  }
};

/**
 * Apply schema migrations based on database type
 */
export class AgentWorkspaceSchemaManager {
  constructor(databaseService) {
    this.databaseService = databaseService;
  }

  async applySchema() {
    const dbType = this.databaseService.getDatabaseType();
    const isPostgreSQL = dbType === 'PostgreSQL';
    const schema = isPostgreSQL ? 'postgresql' : 'sqlite';
    
    try {
      console.log(`🔄 Applying agent workspace schema for ${dbType}...`);
      
      // Apply each table schema
      for (const [tableName, tableSchema] of Object.entries(AGENT_WORKSPACE_SCHEMA)) {
        console.log(`📊 Creating table: ${tableName}`);
        
        if (isPostgreSQL) {
          await this.databaseService.db.query(tableSchema[schema]);
        } else {
          // For SQLite, split multiple statements
          const statements = tableSchema[schema].split(';').filter(stmt => stmt.trim());
          for (const statement of statements) {
            if (statement.trim()) {
              this.databaseService.db.db.exec(statement);
            }
          }
        }
      }
      
      console.log('✅ Agent workspace schema applied successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to apply agent workspace schema:', error);
      throw error;
    }
  }

  async validateSchema() {
    try {
      const dbType = this.databaseService.getDatabaseType();
      const expectedTables = ['agent_workspaces', 'agent_pages', 'agent_components'];
      
      for (const tableName of expectedTables) {
        if (dbType === 'PostgreSQL') {
          const result = await this.databaseService.db.query(
            `SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' AND table_name = $1
            )`,
            [tableName]
          );
          
          if (!result.rows[0].exists) {
            throw new Error(`Table ${tableName} does not exist`);
          }
        } else {
          // SQLite validation
          const result = this.databaseService.db.db.prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
          ).get(tableName);
          
          if (!result) {
            throw new Error(`Table ${tableName} does not exist`);
          }
        }
      }
      
      console.log('✅ Agent workspace schema validation passed');
      return true;
    } catch (error) {
      console.error('❌ Schema validation failed:', error);
      throw error;
    }
  }
}

export default AgentWorkspaceSchemaManager;