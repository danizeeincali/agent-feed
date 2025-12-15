/**
 * Global Teardown for Integration Tests
 *
 * Runs once after all tests complete
 */

export default async function globalTeardown() {
  console.log('\n✅ Integration tests completed\n');

  // Optional: Clean up test database
  // Note: We keep the database for inspection unless explicitly cleaning
  // Uncomment below to auto-clean after tests

  /*
  import { Pool } from 'pg';

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'avidm_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    console.log('🧹 Cleaning up test database...\n');
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
    console.log('✅ Cleanup complete\n');
  } finally {
    await pool.end();
  }
  */
}
