#!/usr/bin/env node

/**
 * Force add slugs to agents - bypasses all checks
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

function generateSlug(name) {
  if (!name) return 'untitled';

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || 'untitled';
}

async function forceAddSlugs() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'avidm_dev',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'dev_password_change_in_production',
  });

  try {
    console.log('🔌 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected\n');

    await client.query('BEGIN');

    // Get all agents
    const result = await client.query('SELECT name, slug FROM system_agent_templates ORDER BY name');
    console.log(`📊 Found ${result.rows.length} agents\n`);

    if (result.rows.length === 0) {
      console.log('No agents found!');
      await client.query('COMMIT');
      return;
    }

    console.log('Current slugs:');
    result.rows.forEach(row => {
      console.log(`  ${row.name}: ${row.slug || 'NULL'}`);
    });
    console.log();

    // Update each agent with a slug
    console.log('🔧 Generating and setting slugs...');
    for (const agent of result.rows) {
      const baseSlug = generateSlug(agent.name);

      // Find unique slug
      let slug = baseSlug;
      let counter = 2;
      while (true) {
        const checkResult = await client.query(
          'SELECT COUNT(*) as count FROM system_agent_templates WHERE slug = $1 AND name != $2',
          [slug, agent.name]
        );

        if (parseInt(checkResult.rows[0].count) === 0) {
          break;
        }

        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Update the slug
      await client.query(
        'UPDATE system_agent_templates SET slug = $1 WHERE name = $2',
        [slug, agent.name]
      );

      console.log(`  ✅ ${agent.name} → ${slug}`);
    }

    await client.query('COMMIT');
    console.log('\n✅ All slugs generated and saved!');

    // Verify
    const verifyResult = await client.query('SELECT name, slug FROM system_agent_templates ORDER BY name LIMIT 5');
    console.log('\n📋 Verification (first 5):');
    verifyResult.rows.forEach(row => {
      console.log(`  ${row.name}: ${row.slug}`);
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('\n🔌 Disconnected');
  }
}

forceAddSlugs().catch(console.error);
