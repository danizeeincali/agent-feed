/**
 * Database Setup Script
 * Creates SQLite database, applies schema, and migrates JSON pages
 * Pure ES Modules - works with package.json "type": "module"
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../data/agent-pages.db');
const PAGES_DIR = join(__dirname, '../data/agent-pages');
const SCHEMA_PATH = join(__dirname, '../src/database/schema/agent-pages.sql');

/**
 * Initialize database connection
 */
function connectDatabase() {
  console.log(`📂 Database path: ${DB_PATH}`);

  const db = new Database(DB_PATH);

  // Configure for optimal performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000'); // 64MB cache

  console.log('✅ Database connected');
  return db;
}

/**
 * Create database schema
 */
function createSchema(db) {
  console.log('\n📦 Creating database schema...');

  // Create agents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create agent_pages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_pages (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      agent_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'markdown', 'json', 'component')),
      content_value TEXT NOT NULL,
      content_metadata TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      version INTEGER DEFAULT 1,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );
  `);

  // Create agent_workspaces table
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_workspaces (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      agent_id TEXT NOT NULL UNIQUE,
      workspace_path TEXT NOT NULL,
      structure TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );
  `);

  // Create agent_page_components table
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_page_components (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL UNIQUE,
      component_schema TEXT NOT NULL,
      render_template TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_agent_pages_agent_id ON agent_pages(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_pages_status ON agent_pages(status);
    CREATE INDEX IF NOT EXISTS idx_agent_pages_created_at ON agent_pages(created_at);
    CREATE INDEX IF NOT EXISTS idx_agent_workspaces_agent_id ON agent_workspaces(agent_id);
  `);

  // Create triggers
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trigger_agent_pages_updated_at
      AFTER UPDATE ON agent_pages
      BEGIN
        UPDATE agent_pages SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trigger_agent_workspaces_updated_at
      AFTER UPDATE ON agent_workspaces
      BEGIN
        UPDATE agent_workspaces SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trigger_agents_updated_at
      AFTER UPDATE ON agents
      BEGIN
        UPDATE agents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
  `);

  console.log('✅ Schema created successfully');
}

/**
 * Insert default agent
 */
function insertDefaultAgent(db) {
  console.log('\n👤 Creating default agent...');

  const insertAgent = db.prepare(`
    INSERT OR IGNORE INTO agents (id, name, description)
    VALUES (?, ?, ?)
  `);

  insertAgent.run(
    'personal-todos-agent',
    'Personal Todos Agent',
    'Agent for managing personal todo lists and dynamic pages'
  );

  console.log('✅ Default agent created');
}

/**
 * Migrate JSON pages to database
 */
function migrateJsonPages(db) {
  console.log('\n📄 Migrating JSON pages...');

  if (!fs.existsSync(PAGES_DIR)) {
    console.warn(`⚠️  Pages directory not found: ${PAGES_DIR}`);
    return;
  }

  const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    console.log('No JSON files found to migrate');
    return;
  }

  console.log(`Found ${files.length} JSON files to migrate`);

  const insertPage = db.prepare(`
    INSERT OR REPLACE INTO agent_pages (
      id, agent_id, title, content_type, content_value,
      content_metadata, status, version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let successCount = 0;
  let errorCount = 0;

  // Use transaction for better performance
  const migrateAll = db.transaction(() => {
    for (const file of files) {
      try {
        const filePath = join(PAGES_DIR, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const pageData = JSON.parse(fileContent);

        // Extract fields with defaults
        const id = pageData.id || file.replace('.json', '');
        const agent_id = pageData.agent_id || 'personal-todos-agent';
        const title = pageData.title || 'Untitled Page';
        const content_type = 'json';
        const content_value = pageData.specification || JSON.stringify(pageData);
        const content_metadata = pageData.metadata ? JSON.stringify(pageData.metadata) : null;
        const status = pageData.status || 'published';
        const version = pageData.version || 1;
        const created_at = pageData.created_at || new Date().toISOString();
        const updated_at = pageData.updated_at || new Date().toISOString();

        // Insert page (parameterized - secure)
        insertPage.run(
          id,
          agent_id,
          title,
          content_type,
          content_value,
          content_metadata,
          status,
          version,
          created_at,
          updated_at
        );

        successCount++;
        console.log(`  ✅ ${file} → ${id}`);
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Failed to migrate ${file}:`, error.message);
      }
    }
  });

  // Execute transaction
  migrateAll();

  console.log(`\n📊 Migration complete: ${successCount} success, ${errorCount} errors`);
}

/**
 * Display database statistics
 */
function displayStatistics(db) {
  console.log('\n📊 Database Statistics:');

  const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get();
  console.log(`   Agents: ${agentCount.count}`);

  const pageCount = db.prepare('SELECT COUNT(*) as count FROM agent_pages').get();
  console.log(`   Total Pages: ${pageCount.count}`);

  const publishedCount = db.prepare(
    "SELECT COUNT(*) as count FROM agent_pages WHERE status='published'"
  ).get();
  console.log(`   Published: ${publishedCount.count}`);

  const draftCount = db.prepare(
    "SELECT COUNT(*) as count FROM agent_pages WHERE status='draft'"
  ).get();
  console.log(`   Draft: ${draftCount.count}`);

  // List sample pages
  const samplePages = db.prepare(
    'SELECT id, title, status FROM agent_pages LIMIT 5'
  ).all();

  if (samplePages.length > 0) {
    console.log('\n   Sample Pages:');
    samplePages.forEach(page => {
      console.log(`     - ${page.title} (${page.id}) [${page.status}]`);
    });
  }
}

/**
 * Main setup function
 */
function setupDatabase() {
  console.log('🚀 Agent Pages Database Setup\n');

  try {
    // Connect to database
    const db = connectDatabase();

    // Create schema
    createSchema(db);

    // Insert default agent
    insertDefaultAgent(db);

    // Migrate JSON pages
    migrateJsonPages(db);

    // Display statistics
    displayStatistics(db);

    console.log('\n✅ Database setup completed successfully!');
    console.log(`✅ Database location: ${DB_PATH}\n`);

    // Close connection
    db.close();
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run setup if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase();
}

export default setupDatabase;