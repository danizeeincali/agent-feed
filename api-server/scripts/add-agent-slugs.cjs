#!/usr/bin/env node

/**
 * Standalone Migration Script: Add Slugs to Agents
 *
 * This script adds a slug column to the agents table and populates it
 * with generated slugs from agent names.
 *
 * Usage:
 *   node scripts/add-agent-slugs.cjs [--dry-run]
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/agent-pages.db');
const isDryRun = process.argv.includes('--dry-run');

/**
 * Generate slug from agent name
 * @param {string} name - Agent name
 * @returns {string} - Generated slug
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-')           // Remove consecutive hyphens
    .replace(/^-|-$/g, '');        // Trim hyphens from edges
}

/**
 * Find unique slug by appending number suffix if needed
 * @param {Object} db - Database connection
 * @param {string} baseSlug - Base slug to check
 * @param {string} excludeId - Agent ID to exclude from duplicate check
 * @returns {string} - Unique slug
 */
function findUniqueSlug(db, baseSlug, excludeId = null) {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const checkStmt = db.prepare(
      excludeId
        ? 'SELECT COUNT(*) as count FROM agents WHERE slug = ? AND id != ?'
        : 'SELECT COUNT(*) as count FROM agents WHERE slug = ?'
    );

    const result = excludeId
      ? checkStmt.get(slug, excludeId)
      : checkStmt.get(slug);

    if (result.count === 0) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

/**
 * Check if slug column already exists
 */
function checkSlugColumn(db) {
  const result = db.prepare(`
    SELECT COUNT(*) as count
    FROM pragma_table_info('agents')
    WHERE name = 'slug'
  `).get();

  return result.count > 0;
}

/**
 * Main migration function
 */
function runMigration() {
  console.log('='.repeat(70));
  console.log('Add Agent Slugs Migration');
  console.log('='.repeat(70));
  console.log('');
  console.log(`Database: ${DB_PATH}`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  console.log('');

  // Connect to database
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');

  try {
    // Check if slug column already exists
    if (checkSlugColumn(db)) {
      console.log('✓ Slug column already exists!');
      console.log('');

      // Show existing slugs
      const agents = db.prepare('SELECT id, name, slug FROM agents LIMIT 10').all();
      console.log('First 10 agents with slugs:');
      console.log('-'.repeat(70));
      agents.forEach(agent => {
        console.log(`  ${agent.name} → ${agent.slug}`);
      });

      console.log('');
      console.log('Migration already applied. Nothing to do.');
      return;
    }

    console.log('Step 1: Backing up database...');
    const backupPath = DB_PATH.replace('.db', `.backup-${Date.now()}.db`);
    if (!isDryRun) {
      const backupDb = new Database(backupPath);
      db.backup(backupDb);
      backupDb.close();
      console.log(`✓ Backup created: ${backupPath}`);
    } else {
      console.log(`  Would create backup at: ${backupPath}`);
    }
    console.log('');

    console.log('Step 2: Adding slug column...');
    if (!isDryRun) {
      db.exec('ALTER TABLE agents ADD COLUMN slug TEXT');
      console.log('✓ Slug column added');
    } else {
      console.log('  Would execute: ALTER TABLE agents ADD COLUMN slug TEXT');
    }
    console.log('');

    console.log('Step 3: Generating slugs for all agents...');
    const agents = db.prepare('SELECT id, name FROM agents').all();
    console.log(`Found ${agents.length} agents to process`);
    console.log('-'.repeat(70));

    const slugMap = new Map();
    for (const agent of agents) {
      const baseSlug = generateSlug(agent.name);
      const uniqueSlug = isDryRun ? baseSlug : findUniqueSlug(db, baseSlug, agent.id);

      if (!isDryRun) {
        db.prepare('UPDATE agents SET slug = ? WHERE id = ?').run(uniqueSlug, agent.id);
      }

      slugMap.set(agent.id, uniqueSlug);
      console.log(`  ${agent.name} → ${uniqueSlug}`);
    }
    console.log('');

    if (!isDryRun) {
      console.log('Step 4: Recreating table with NOT NULL constraint...');

      const transaction = db.transaction(() => {
        // Create new table
        db.exec(`
          CREATE TABLE agents_new (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            slug TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Copy data
        db.exec(`
          INSERT INTO agents_new (id, name, description, slug, created_at, updated_at)
          SELECT id, name, description, slug, created_at, updated_at
          FROM agents
        `);

        // Drop old table
        db.exec('DROP TABLE agents');

        // Rename new table
        db.exec('ALTER TABLE agents_new RENAME TO agents');

        // Recreate trigger
        db.exec(`
          CREATE TRIGGER trigger_agents_updated_at
            AFTER UPDATE ON agents
            BEGIN
              UPDATE agents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        `);

        // Add unique index
        db.exec('CREATE UNIQUE INDEX idx_agents_slug ON agents(slug)');
      });

      transaction();
      console.log('✓ Table recreated with NOT NULL constraint');
      console.log('✓ Unique index created on slug column');
      console.log('');

      // Verify migration
      console.log('Step 5: Verifying migration...');
      const verification = db.prepare(`
        SELECT
          COUNT(*) as total,
          COUNT(DISTINCT slug) as unique_slugs,
          COUNT(*) FILTER (WHERE slug IS NULL OR slug = '') as invalid_slugs
        FROM agents
      `).get();

      console.log(`  Total agents: ${verification.total}`);
      console.log(`  Unique slugs: ${verification.unique_slugs}`);
      console.log(`  Invalid slugs: ${verification.invalid_slugs}`);
      console.log('');

      if (verification.total !== verification.unique_slugs) {
        throw new Error('❌ Slug uniqueness verification failed!');
      }

      if (verification.invalid_slugs > 0) {
        throw new Error('❌ Found agents with invalid slugs!');
      }

      console.log('✓ Verification passed!');
    } else {
      console.log('Step 4: Would recreate table with NOT NULL constraint');
      console.log('Step 5: Would verify migration');
    }

    console.log('');
    console.log('='.repeat(70));
    console.log(`✓ Migration ${isDryRun ? 'preview' : 'completed'} successfully!`);
    console.log('='.repeat(70));

    if (isDryRun) {
      console.log('');
      console.log('This was a dry run. To apply these changes, run:');
      console.log('  node scripts/add-agent-slugs.cjs');
    }

  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:', error.message);
    console.error('');
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run migration
runMigration();
