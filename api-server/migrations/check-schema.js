#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const { Client } = pg;

async function checkSchema() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'avidm_dev',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'dev_password_change_in_production',
  });

  try {
    await client.connect();
    console.log('✅ Connected\n');

    // Get table schema
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'system_agent_templates'
      ORDER BY ordinal_position
    `);

    console.log('📋 system_agent_templates schema:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)'}`);
    });

    // Get sample row
    const sampleResult = await client.query('SELECT * FROM system_agent_templates LIMIT 1');
    if (sampleResult.rows.length > 0) {
      console.log('\n📊 Sample row keys:', Object.keys(sampleResult.rows[0]));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkSchema().catch(console.error);
