#!/usr/bin/env node

/**
 * PostgreSQL Migration: Add slug column to system_agent_templates table
 *
 * This migration adds a slug column to the system_agent_templates table
 * and generates unique slugs for all existing agent templates.
 *
 * Run with: node migrations/add-slugs-to-agents.js
 *
 * Features:
 * - Adds slug column (VARCHAR) to system_agent_templates table
 * - Generates slugs from agent names (lowercase, hyphenated)
 * - Handles duplicate slugs by appending -2, -3, etc.
 * - Adds unique constraint on slug column
 * - Idempotent (safe to run multiple times)
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const { Client } = pg;

/**
 * Generate slug from agent name
 * @param {string} name - Agent name
 * @returns {string} - Generated slug
 */
function generateSlug(name) {
  if (!name) return 'untitled';

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-')           // Remove consecutive hyphens
    .replace(/^-|-$/g, '');        // Trim hyphens from edges

  // Return 'untitled' if slug is empty after processing
  return slug || 'untitled';
}

/**
 * Find unique slug by appending number suffix if needed
 * @param {Client} client - PostgreSQL client
 * @param {string} baseSlug - Base slug to check
 * @param {string} excludeName - Agent name to exclude from duplicate check
 * @returns {Promise<string>} - Unique slug
 */
async function findUniqueSlug(client, baseSlug, excludeName = null) {
  let slug = baseSlug;
  let counter = 2; // Start with -2 for duplicates

  while (true) {
    const checkQuery = excludeName
      ? 'SELECT COUNT(*) as count FROM system_agent_templates WHERE slug = $1 AND name != $2'
      : 'SELECT COUNT(*) as count FROM system_agent_templates WHERE slug = $1';

    const params = excludeName ? [slug, excludeName] : [slug];
    const result = await client.query(checkQuery, params);

    if (parseInt(result.rows[0].count) === 0) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'avidm_dev',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'dev_password_change_in_production',
  });

  try {
    console.log('🔌 Connecting to PostgreSQL database...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // Start transaction
    await client.query('BEGIN');

    // Step 1: Check if slug column already exists
    console.log('📋 Step 1: Checking if slug column exists...');
    const columnCheckQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'system_agent_templates'
      AND column_name = 'slug'
    `;
    const columnExists = await client.query(columnCheckQuery);

    if (columnExists.rows.length > 0) {
      console.log('ℹ️  Slug column already exists. Checking if migration needs to run...\n');

      // Check if there are any null slugs
      const nullCheckQuery = 'SELECT COUNT(*) as count FROM system_agent_templates WHERE slug IS NULL';
      const nullCheck = await client.query(nullCheckQuery);

      if (parseInt(nullCheck.rows[0].count) === 0) {
        console.log('✅ Migration already completed. All agents have slugs.');
        await client.query('COMMIT');
        return;
      }

      console.log(`⚠️  Found ${nullCheck.rows[0].count} agents without slugs. Continuing migration...\n`);
    } else {
      // Step 2: Add slug column (nullable initially)
      console.log('📝 Step 2: Adding slug column to system_agent_templates table...');
      await client.query(`
        ALTER TABLE system_agent_templates
        ADD COLUMN IF NOT EXISTS slug VARCHAR(255)
      `);
      console.log('✅ Slug column added\n');
    }

    // Step 3: Get all existing agent templates
    console.log('🔍 Step 3: Fetching existing agent templates...');
    const agentsResult = await client.query('SELECT name FROM system_agent_templates ORDER BY name');
    const agents = agentsResult.rows;
    console.log(`📊 Found ${agents.length} agent templates to process\n`);

    if (agents.length === 0) {
      console.log('ℹ️  No agents found. Migration complete.');
      await client.query('COMMIT');
      return;
    }

    // Step 4: Generate and assign slugs
    console.log('🔧 Step 4: Generating slugs for all agent templates...');
    const slugMap = new Map(); // Track slugs to detect duplicates
    let processedCount = 0;
    let skippedCount = 0;

    for (const agent of agents) {
      // Check if agent already has a slug
      const existingSlugQuery = 'SELECT slug FROM system_agent_templates WHERE name = $1';
      const existingSlugResult = await client.query(existingSlugQuery, [agent.name]);

      if (existingSlugResult.rows[0].slug) {
        skippedCount++;
        console.log(`  ⏭️  ${agent.name} → ${existingSlugResult.rows[0].slug} (already exists)`);
        continue;
      }

      const baseSlug = generateSlug(agent.name);
      const uniqueSlug = await findUniqueSlug(client, baseSlug, agent.name);

      await client.query(
        'UPDATE system_agent_templates SET slug = $1 WHERE name = $2',
        [uniqueSlug, agent.name]
      );

      slugMap.set(agent.name, uniqueSlug);
      processedCount++;

      console.log(`  ✅ ${agent.name} → ${uniqueSlug}`);
    }

    console.log(`\n📊 Processed ${processedCount} agents, skipped ${skippedCount} (already had slugs)\n`);

    // Step 5: Make slug column NOT NULL (only if all agents have slugs)
    console.log('🔒 Step 5: Making slug column NOT NULL...');
    await client.query(`
      ALTER TABLE system_agent_templates
      ALTER COLUMN slug SET NOT NULL
    `);
    console.log('✅ Slug column is now NOT NULL\n');

    // Step 6: Add unique constraint on slug
    console.log('🔑 Step 6: Adding unique constraint on slug...');

    // Check if constraint already exists
    const constraintCheckQuery = `
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'system_agent_templates'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'system_agent_templates_slug_key'
    `;
    const constraintExists = await client.query(constraintCheckQuery);

    if (constraintExists.rows.length > 0) {
      console.log('ℹ️  Unique constraint already exists on slug column\n');
    } else {
      await client.query(`
        ALTER TABLE system_agent_templates
        ADD CONSTRAINT system_agent_templates_slug_key UNIQUE (slug)
      `);
      console.log('✅ Unique constraint added on slug column\n');
    }

    // Step 7: Create index for better query performance
    console.log('📊 Step 7: Creating index on slug column...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_system_agent_templates_slug
      ON system_agent_templates(slug)
    `);
    console.log('✅ Index created on slug column\n');

    // Step 8: Verify migration
    console.log('🔍 Step 8: Verifying migration...');
    const verificationQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(DISTINCT slug) as unique_slugs,
        COUNT(*) FILTER (WHERE slug IS NULL) as null_slugs
      FROM system_agent_templates
    `;
    const verification = await client.query(verificationQuery);
    const stats = verification.rows[0];

    console.log(`  📊 Total agent templates: ${stats.total}`);
    console.log(`  🔑 Unique slugs: ${stats.unique_slugs}`);
    console.log(`  ⚠️  Null slugs: ${stats.null_slugs}`);

    if (parseInt(stats.total) !== parseInt(stats.unique_slugs)) {
      throw new Error('❌ Slug uniqueness verification failed!');
    }

    if (parseInt(stats.null_slugs) > 0) {
      throw new Error('❌ Found agent templates with null slugs!');
    }

    console.log('\n✅ All verifications passed!\n');

    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Migration completed successfully!\n');

    // Display sample slugs
    console.log('📋 Sample slugs generated:');
    const sampleQuery = 'SELECT name, slug FROM system_agent_templates ORDER BY name LIMIT 10';
    const samples = await client.query(sampleQuery);
    samples.rows.forEach(row => {
      console.log(`  • ${row.name.padEnd(30)} → ${row.slug}`);
    });

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);

    // Rollback transaction
    try {
      await client.query('ROLLBACK');
      console.log('🔄 Transaction rolled back');
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError.message);
    }

    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

/**
 * Rollback migration (optional - for manual use)
 */
async function rollbackMigration() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'avidm_dev',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'dev_password_change_in_production',
  });

  try {
    console.log('🔌 Connecting to PostgreSQL database...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    await client.query('BEGIN');

    console.log('🔄 Rolling back migration: Remove slug column...');

    // Drop constraint and index
    await client.query('DROP INDEX IF EXISTS idx_system_agent_templates_slug');
    await client.query('ALTER TABLE system_agent_templates DROP CONSTRAINT IF EXISTS system_agent_templates_slug_key');

    // Drop column
    await client.query('ALTER TABLE system_agent_templates DROP COLUMN IF EXISTS slug');

    await client.query('COMMIT');
    console.log('✅ Migration rolled back successfully!\n');

  } catch (error) {
    console.error('\n❌ Rollback failed:', error.message);
    await client.query('ROLLBACK');
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.includes('--rollback')) {
    console.log('🔄 Running rollback...\n');
    rollbackMigration();
  } else {
    console.log('🚀 Starting PostgreSQL migration: Add slugs to agent templates\n');
    runMigration();
  }
}

export { runMigration, rollbackMigration, generateSlug, findUniqueSlug };
