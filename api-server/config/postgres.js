/**
 * PostgreSQL Database Connection Manager
 * Connects to Phase 2 Avi DM PostgreSQL database
 * Follows security best practices: parameterized queries, connection pooling
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: join(__dirname, '../../.env') });

const { Pool } = pg;

class PostgresManager {
  constructor() {
    this.pool = null;
  }

  /**
   * Initialize PostgreSQL connection pool
   * @returns {Pool} PostgreSQL connection pool
   */
  connect() {
    if (this.pool) {
      return this.pool;
    }

    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'avidm_dev',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'dev_password_change_in_production',

      // Connection pool settings
      min: parseInt(process.env.DB_POOL_MIN || '4'),
      max: parseInt(process.env.DB_POOL_MAX || '16'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '2000'),

      // Statement timeout
      statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '30000'),
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('❌ Unexpected PostgreSQL pool error:', err);
    });

    // Handle successful connections
    this.pool.on('connect', () => {
      console.log('✅ PostgreSQL client connected to pool');
    });

    // Test connection
    this.pool.query('SELECT NOW()')
      .then(() => {
        console.log(`✅ PostgreSQL connected: ${process.env.POSTGRES_DB || 'avidm_dev'}`);
      })
      .catch((err) => {
        console.error('❌ PostgreSQL connection test failed:', err);
      });

    return this.pool;
  }

  /**
   * Get connection pool (singleton pattern)
   * @returns {Pool}
   */
  getPool() {
    if (!this.pool) {
      return this.connect();
    }
    return this.pool;
  }

  /**
   * Execute a query with parameters
   * @param {string} text - SQL query text
   * @param {Array} params - Query parameters
   * @returns {Promise<object>} Query result
   */
  async query(text, params) {
    const pool = this.getPool();
    return pool.query(text, params);
  }

  /**
   * Get a client from the pool for transactions
   * @returns {Promise<PoolClient>}
   */
  async getClient() {
    const pool = this.getPool();
    return pool.connect();
  }

  /**
   * Execute a transaction
   * @param {Function} callback - Async function that receives a client
   * @returns {Promise<any>} Transaction result
   */
  async transaction(callback) {
    const client = await this.getClient();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close all connections in the pool
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('✅ PostgreSQL connection pool closed');
    }
  }

  /**
   * Health check - verify database connection
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      const result = await this.query('SELECT 1 as health');
      return result.rows[0].health === 1;
    } catch (error) {
      console.error('❌ PostgreSQL health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
const postgresManager = new PostgresManager();

export default postgresManager;
export { PostgresManager };
