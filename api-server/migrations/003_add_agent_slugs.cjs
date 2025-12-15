/**
 * Migration 003: Add slug column to agents table and populate with generated slugs
 *
 * This migration:
 * 1. Adds a slug column to the agents table
 * 2. Generates slugs from agent names (lowercase, hyphenated)
 * 3. Handles duplicate slugs by appending number suffixes
 * 4. Adds unique constraint on slug column
 */

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

module.exports = {
  version: 3,
  description: 'Add slug column to agents table and populate with generated slugs',

  /**
   * Apply migration
   */
  up(db) {
    console.log('Starting migration 003: Add agent slugs...');

    // Step 1: Add slug column (nullable initially)
    console.log('Step 1: Adding slug column to agents table...');
    db.exec(`
      ALTER TABLE agents ADD COLUMN slug TEXT;
    `);

    // Step 2: Get all existing agents
    console.log('Step 2: Fetching existing agents...');
    const agents = db.prepare('SELECT id, name FROM agents').all();
    console.log(`Found ${agents.length} agents to process`);

    // Step 3: Generate and assign slugs
    console.log('Step 3: Generating slugs for all agents...');
    const updateStmt = db.prepare('UPDATE agents SET slug = ? WHERE id = ?');
    const slugMap = new Map(); // Track slugs to detect duplicates

    for (const agent of agents) {
      const baseSlug = generateSlug(agent.name);
      const uniqueSlug = findUniqueSlug(db, baseSlug, agent.id);

      updateStmt.run(uniqueSlug, agent.id);
      slugMap.set(agent.id, uniqueSlug);

      console.log(`  ✓ ${agent.name} → ${uniqueSlug}`);
    }

    // Step 4: Make slug column NOT NULL
    console.log('Step 4: Making slug column NOT NULL...');
    // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
    db.exec(`
      -- Create new table with slug as NOT NULL
      CREATE TABLE agents_new (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        slug TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Copy data from old table
      INSERT INTO agents_new (id, name, description, slug, created_at, updated_at)
      SELECT id, name, description, slug, created_at, updated_at
      FROM agents;

      -- Drop old table
      DROP TABLE agents;

      -- Rename new table
      ALTER TABLE agents_new RENAME TO agents;

      -- Recreate trigger
      CREATE TRIGGER trigger_agents_updated_at
        AFTER UPDATE ON agents
        BEGIN
          UPDATE agents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
    `);

    // Step 5: Add unique constraint on slug
    console.log('Step 5: Adding unique constraint on slug...');
    db.exec(`
      CREATE UNIQUE INDEX idx_agents_slug ON agents(slug);
    `);

    // Step 6: Verify migration
    console.log('Step 6: Verifying migration...');
    const verifyStmt = db.prepare(`
      SELECT COUNT(*) as total,
             COUNT(DISTINCT slug) as unique_slugs,
             COUNT(*) FILTER (WHERE slug IS NULL) as null_slugs
      FROM agents
    `);
    const verification = verifyStmt.get();

    console.log(`  Total agents: ${verification.total}`);
    console.log(`  Unique slugs: ${verification.unique_slugs}`);
    console.log(`  Null slugs: ${verification.null_slugs}`);

    if (verification.total !== verification.unique_slugs) {
      throw new Error('Slug uniqueness verification failed!');
    }

    if (verification.null_slugs > 0) {
      throw new Error('Found agents with null slugs!');
    }

    console.log('✓ Migration 003 completed successfully');
  },

  /**
   * Rollback migration
   */
  down(db) {
    console.log('Rolling back migration 003: Remove agent slugs...');

    // Recreate table without slug column
    db.exec(`
      -- Create table without slug
      CREATE TABLE agents_new (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Copy data (excluding slug)
      INSERT INTO agents_new (id, name, description, created_at, updated_at)
      SELECT id, name, description, created_at, updated_at
      FROM agents;

      -- Drop old table and index
      DROP INDEX IF EXISTS idx_agents_slug;
      DROP TABLE agents;

      -- Rename new table
      ALTER TABLE agents_new RENAME TO agents;

      -- Recreate trigger
      CREATE TRIGGER trigger_agents_updated_at
        AFTER UPDATE ON agents
        BEGIN
          UPDATE agents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
    `);

    console.log('✓ Migration 003 rolled back successfully');
  }
};
