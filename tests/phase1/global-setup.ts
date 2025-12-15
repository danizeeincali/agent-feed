/**
 * Global Setup for Integration Tests
 *
 * Runs once before all tests
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment
dotenv.config({ path: path.join(__dirname, '../../.env.test') });

export default async function globalSetup() {
  console.log('\n🔧 Setting up integration tests...\n');

  // Verify database connection
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'avidm_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection verified\n');

    // Ensure database is clean
    console.log('🧹 Cleaning test database...\n');
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
    await pool.query('CREATE SCHEMA public');
    await pool.query('GRANT ALL ON SCHEMA public TO postgres');
    await pool.query('GRANT ALL ON SCHEMA public TO public');
    console.log('✅ Database cleaned\n');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}
