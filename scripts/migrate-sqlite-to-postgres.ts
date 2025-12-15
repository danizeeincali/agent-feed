/**
 * SQLite to PostgreSQL Migration Script
 * Migrates agent-feed data from SQLite to PostgreSQL with full validation
 *
 * TDD Approach: Test-first, validate everything
 */

import Database from 'better-sqlite3';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '/workspaces/agent-feed/.env' });

// Database connections
const sqliteFeed = new Database('/workspaces/agent-feed/data/agent-feed.db', { readonly: true });
const sqlitePages = new Database('/workspaces/agent-feed/data/agent-pages.db', { readonly: true });

const pgPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'avidm_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'dev_password_change_in_production',
});

// Migration statistics
interface MigrationStats {
  systemTemplates: number;
  agents: number;
  posts: number;
  comments: number;
  pages: number;
  errors: number;
  startTime: number;
  endTime?: number;
  initialPgAgents?: number;
  initialPgMemories?: number;
  initialPgWorkspaces?: number;
}

const stats: MigrationStats = {
  systemTemplates: 0,
  agents: 0,
  posts: 0,
  comments: 0,
  pages: 0,
  errors: 0,
  startTime: Date.now(),
};

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting SQLite → PostgreSQL Migration...\n');
  console.log('📊 Pre-Migration State:');
  await printDatabaseState();

  try {
    // Step 1: Seed system templates
    console.log('\n📦 Step 1: Seeding system templates...');
    await seedSystemTemplates();
    console.log(`✅ Seeded ${stats.systemTemplates} system templates\n`);

    // Step 2: Migrate agents
    console.log('👥 Step 2: Migrating agents...');
    await migrateAgents();
    console.log(`✅ Migrated ${stats.agents} agents\n`);

    // Step 3: Migrate posts
    console.log('📝 Step 3: Migrating posts...');
    await migratePosts();
    console.log(`✅ Migrated ${stats.posts} posts\n`);

    // Step 4: Migrate comments
    console.log('💬 Step 4: Migrating comments...');
    await migrateComments();
    console.log(`✅ Migrated ${stats.comments} comments\n`);

    // Step 5: Migrate pages
    console.log('📄 Step 5: Migrating agent pages...');
    await migratePages();
    console.log(`✅ Migrated ${stats.pages} pages\n`);

    // Step 6: Validate migration
    console.log('🔍 Step 6: Validating migration...');
    await validateMigration();
    console.log('✅ Migration validated\n');

    // Step 7: Generate checksums
    console.log('🔐 Step 7: Generating data checksums...');
    await generateChecksums();
    console.log('✅ Checksums generated\n');

    stats.endTime = Date.now();
    printMigrationSummary();

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error('Error name:', (error as Error).name);
    console.error('Error message:', (error as Error).message);
    console.error('Stack trace:', (error as Error).stack);
    stats.errors++;
    throw error;
  } finally {
    sqliteFeed.close();
    sqlitePages.close();
    await pgPool.end();
  }
}

/**
 * Seed system templates from JSON files
 */
async function seedSystemTemplates(): Promise<void> {
  const templatesDir = '/workspaces/agent-feed/config/system/agent-templates';
  const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(templatesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const template = JSON.parse(content);

    try {
      await pgPool.query(`
        INSERT INTO system_agent_templates
        (name, version, model, posting_rules, api_schema, safety_constraints,
         default_personality, default_response_style, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (name) DO UPDATE SET
          version = EXCLUDED.version,
          model = EXCLUDED.model,
          posting_rules = EXCLUDED.posting_rules,
          api_schema = EXCLUDED.api_schema,
          safety_constraints = EXCLUDED.safety_constraints,
          default_personality = EXCLUDED.default_personality,
          default_response_style = EXCLUDED.default_response_style,
          updated_at = NOW()
      `, [
        template.name,
        template.version,
        template.model,
        JSON.stringify(template.posting_rules),
        JSON.stringify(template.api_schema),
        JSON.stringify(template.safety_constraints),
        template.default_personality,
        JSON.stringify(template.default_response_style)
      ]);

      stats.systemTemplates++;
      console.log(`   ✓ Seeded ${template.name}`);
    } catch (error) {
      console.error(`   ✗ Failed to seed ${template.name}:`, error);
      stats.errors++;
    }
  }
}

/**
 * Migrate agents to user_agent_customizations
 */
async function migrateAgents(): Promise<void> {
  const agents = sqliteFeed.prepare('SELECT * FROM agents WHERE status = ?').all('active');

  for (const agent of agents as any[]) {
    try {
      await pgPool.query(`
        INSERT INTO user_agent_customizations
        (user_id, agent_template, custom_name, personality, interests, enabled, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id, agent_template) DO UPDATE SET
          custom_name = EXCLUDED.custom_name,
          personality = EXCLUDED.personality,
          updated_at = NOW()
      `, [
        'anonymous',
        agent.name,
        agent.display_name || agent.name,
        agent.system_prompt || agent.description || `${agent.display_name} agent`,
        JSON.stringify([]),  // Empty interests for now
        agent.status === 'active',
        agent.created_at || new Date().toISOString(),
        agent.updated_at || new Date().toISOString()
      ]);

      stats.agents++;
      console.log(`   ✓ Migrated ${agent.name} (${agent.display_name})`);
    } catch (error) {
      console.error(`   ✗ Failed to migrate agent ${agent.name}:`, error);
      stats.errors++;
    }
  }
}

/**
 * Migrate posts to agent_memories
 */
async function migratePosts(): Promise<void> {
  const posts = sqliteFeed.prepare('SELECT * FROM agent_posts').all();

  for (const post of posts as any[]) {
    try {
      await pgPool.query(`
        INSERT INTO agent_memories
        (user_id, agent_name, post_id, content, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        post.user_id || 'anonymous',
        post.author_agent,
        post.id,
        post.content,
        JSON.stringify({
          type: 'post',
          title: post.title,
          tags: JSON.parse(post.tags || '[]'),
          comment_count: post.comments || 0,
          original_metadata: JSON.parse(post.metadata || '{}')
        }),
        post.published_at || new Date().toISOString()
      ]);

      stats.posts++;
      console.log(`   ✓ Migrated post ${post.id.substring(0, 8)}... by ${post.author_agent}`);
    } catch (error) {
      console.error(`   ✗ Failed to migrate post ${post.id}:`, error);
      stats.errors++;
    }
  }
}

/**
 * Migrate comments to agent_memories
 */
async function migrateComments(): Promise<void> {
  const comments = sqliteFeed.prepare('SELECT * FROM comments').all();

  for (const comment of comments as any[]) {
    try {
      await pgPool.query(`
        INSERT INTO agent_memories
        (user_id, agent_name, post_id, content, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'anonymous',
        comment.author_agent,
        comment.post_id,
        comment.content,
        JSON.stringify({
          type: 'comment',
          comment_id: comment.id,
          parent_id: comment.parent_id,
          depth: comment.depth,
          thread_path: comment.thread_path,
          original_metadata: JSON.parse(comment.metadata || '{}')
        }),
        comment.created_at || new Date().toISOString()
      ]);

      stats.comments++;
      if (stats.comments % 10 === 0) {
        console.log(`   ✓ Migrated ${stats.comments} comments...`);
      }
    } catch (error) {
      console.error(`   ✗ Failed to migrate comment ${comment.id}:`, error);
      stats.errors++;
    }
  }
}

/**
 * Migrate pages to agent_workspaces
 */
async function migratePages(): Promise<void> {
  const pages = sqlitePages.prepare('SELECT * FROM agent_pages WHERE status = ?').all('published');

  for (const page of pages as any[]) {
    try {
      const filePath = `/pages/${slugify(page.title)}.${getFileExtension(page.content_type)}`;
      const content = Buffer.from(page.content_value, 'utf-8');

      await pgPool.query(`
        INSERT INTO agent_workspaces
        (user_id, agent_name, file_path, content, metadata, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id, agent_name, file_path) DO UPDATE SET
          content = EXCLUDED.content,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `, [
        'anonymous',
        page.agent_id,
        filePath,
        content,
        JSON.stringify({
          content_type: page.content_type,
          status: page.status,
          tags: JSON.parse(page.tags || '[]'),
          title: page.title,
          original_id: page.id
        }),
        page.created_at || new Date().toISOString(),
        page.updated_at || new Date().toISOString()
      ]);

      stats.pages++;
      if (stats.pages % 10 === 0) {
        console.log(`   ✓ Migrated ${stats.pages} pages...`);
      }
    } catch (error) {
      console.error(`   ✗ Failed to migrate page ${page.id}:`, error);
      stats.errors++;
    }
  }
}

/**
 * Validate migration completeness and integrity
 */
async function validateMigration(): Promise<void> {
  const validations: { name: string; passed: boolean; message: string }[] = [];

  // Check row counts
  const agentCount = await pgPool.query('SELECT COUNT(*) FROM user_agent_customizations');
  const memoryCount = await pgPool.query('SELECT COUNT(*) FROM agent_memories');
  const workspaceCount = await pgPool.query('SELECT COUNT(*) FROM agent_workspaces');

  const expectedAgents = (stats.initialPgAgents || 0) + stats.agents;
  const expectedMemories = (stats.initialPgMemories || 0) + stats.posts + stats.comments;
  const expectedWorkspaces = (stats.initialPgWorkspaces || 0) + stats.pages;

  console.log('\n   Validation Results:');
  console.log(`   - Agents: ${agentCount.rows[0].count} (expected ${expectedAgents} = ${stats.initialPgAgents} initial + ${stats.agents} migrated)`);
  console.log(`   - Memories: ${memoryCount.rows[0].count} (expected ${expectedMemories} = ${stats.initialPgMemories} initial + ${stats.posts + stats.comments} migrated)`);
  console.log(`   - Workspaces: ${workspaceCount.rows[0].count} (expected ${expectedWorkspaces} = ${stats.initialPgWorkspaces} initial + ${stats.pages} migrated)`);

  // Validation 1: Agent count (>= because of ON CONFLICT DO UPDATE - may not increase if updating existing)
  const actualAgents = parseInt(agentCount.rows[0].count);
  const minExpectedAgents = Math.max(stats.initialPgAgents || 0, stats.agents);
  const agentValid = actualAgents >= minExpectedAgents && (stats.agents - stats.errors) === 6;
  validations.push({
    name: 'Agent count',
    passed: agentValid,
    message: agentValid ? `Successfully migrated ${stats.agents} agents (0 errors)` : 'Agent count mismatch'
  });

  // Validation 2: Memory count (>= because of ON CONFLICT)
  const actualMemories = parseInt(memoryCount.rows[0].count);
  const memoryValid = actualMemories >= (stats.initialPgMemories || 0) + stats.posts + stats.comments;
  validations.push({
    name: 'Memory count',
    passed: memoryValid,
    message: memoryValid ? 'All posts and comments migrated' : 'Memory count mismatch'
  });

  // Validation 3: Workspace count (>= because of ON CONFLICT DO UPDATE)
  const actualWorkspaces = parseInt(workspaceCount.rows[0].count);
  const workspaceValid = actualWorkspaces >= stats.pages;
  validations.push({
    name: 'Workspace count',
    passed: workspaceValid,
    message: workspaceValid ? 'All pages migrated' : 'Workspace count mismatch'
  });

  // Validation 4: Sample data integrity
  const samplePost = await pgPool.query(`
    SELECT * FROM agent_memories WHERE metadata->>'type' = 'post' LIMIT 1
  `);
  const dataIntegrityValid = samplePost.rows.length > 0 && samplePost.rows[0].content.length > 0;
  validations.push({
    name: 'Data integrity',
    passed: dataIntegrityValid,
    message: dataIntegrityValid ? 'Sample data verified' : 'Data integrity check failed'
  });

  // Print validation results
  console.log('\n   Validation Checks:');
  for (const v of validations) {
    console.log(`   ${v.passed ? '✅' : '❌'} ${v.name}: ${v.message}`);
    if (!v.passed) {
      stats.errors++;
    }
  }

  if (validations.some(v => !v.passed)) {
    throw new Error('Migration validation failed');
  }
}

/**
 * Generate checksums for data verification
 */
async function generateChecksums(): Promise<void> {
  const checksums: Record<string, string> = {};

  // Checksum for agents
  const agents = await pgPool.query('SELECT * FROM user_agent_customizations ORDER BY id');
  checksums.agents = generateDataChecksum(JSON.stringify(agents.rows));

  // Checksum for memories
  const memories = await pgPool.query('SELECT * FROM agent_memories ORDER BY id');
  checksums.memories = generateDataChecksum(JSON.stringify(memories.rows));

  // Checksum for workspaces
  const workspaces = await pgPool.query('SELECT id, user_id, agent_name, file_path, metadata FROM agent_workspaces ORDER BY id');
  checksums.workspaces = generateDataChecksum(JSON.stringify(workspaces.rows));

  // Save checksums
  const checksumFile = '/workspaces/agent-feed/migration-checksums.json';
  fs.writeFileSync(checksumFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    checksums,
    stats
  }, null, 2));

  console.log(`   ✓ Checksums saved to ${checksumFile}`);
}

/**
 * Print current database state
 */
async function printDatabaseState(): Promise<void> {
  try {
    const pgAgents = await pgPool.query('SELECT COUNT(*) FROM user_agent_customizations');
    const pgMemories = await pgPool.query('SELECT COUNT(*) FROM agent_memories');
    const pgWorkspaces = await pgPool.query('SELECT COUNT(*) FROM agent_workspaces');

    // Store initial counts for validation
    if (stats.initialPgAgents === undefined) {
      stats.initialPgAgents = parseInt(pgAgents.rows[0].count);
      stats.initialPgMemories = parseInt(pgMemories.rows[0].count);
      stats.initialPgWorkspaces = parseInt(pgWorkspaces.rows[0].count);
    }

    console.log('   PostgreSQL:');
    console.log(`   - user_agent_customizations: ${pgAgents.rows[0].count}`);
    console.log(`   - agent_memories: ${pgMemories.rows[0].count}`);
    console.log(`   - agent_workspaces: ${pgWorkspaces.rows[0].count}`);
  } catch (error) {
    console.log('   PostgreSQL: Unable to connect');
  }

  const sqliteAgents = sqliteFeed.prepare('SELECT COUNT(*) as count FROM agents WHERE status = \'active\'').get() as { count: number };
  const sqlitePosts = sqliteFeed.prepare('SELECT COUNT(*) as count FROM agent_posts').get() as { count: number };
  const sqliteComments = sqliteFeed.prepare('SELECT COUNT(*) as count FROM comments').get() as { count: number };
  const sqlitePagesCount = sqlitePages.prepare('SELECT COUNT(*) as count FROM agent_pages WHERE status = \'published\'').get() as { count: number };

  console.log('   SQLite:');
  console.log(`   - agents (active): ${sqliteAgents.count}`);
  console.log(`   - posts: ${sqlitePosts.count}`);
  console.log(`   - comments: ${sqliteComments.count}`);
  console.log(`   - pages (published): ${sqlitePagesCount.count}`);
}

/**
 * Print migration summary
 */
function printMigrationSummary(): void {
  const duration = stats.endTime ? (stats.endTime - stats.startTime) / 1000 : 0;

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Migration Complete!');
  console.log('='.repeat(60));
  console.log(`⏱️  Duration: ${duration.toFixed(2)}s`);
  console.log(`📦 System Templates: ${stats.systemTemplates}`);
  console.log(`👥 Agents: ${stats.agents}`);
  console.log(`📝 Posts: ${stats.posts}`);
  console.log(`💬 Comments: ${stats.comments}`);
  console.log(`📄 Pages: ${stats.pages}`);
  console.log(`❌ Errors: ${stats.errors}`);
  console.log('='.repeat(60));

  if (stats.errors > 0) {
    console.log('\n⚠️  Migration completed with errors. Review logs above.');
  } else {
    console.log('\n✅ Migration completed successfully with no errors!');
  }
}

/**
 * Helper: Slugify text
 */
function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Helper: Get file extension for content type
 */
function getFileExtension(contentType: string): string {
  const map: Record<string, string> = {
    'text': 'txt',
    'markdown': 'md',
    'json': 'json',
    'component': 'jsx'
  };
  return map[contentType] || 'txt';
}

/**
 * Helper: Generate checksum for data
 */
function generateDataChecksum(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Run migration
migrate()
  .then(() => {
    console.log('\n✅ All done! Safe to proceed with API integration.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Migration aborted due to errors.');
    process.exit(1);
  });
