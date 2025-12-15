/**
 * PostgreSQL Connection Pool for AVI Architecture
 *
 * Provides a singleton connection pool for all repository layer operations.
 * Uses environment variables for configuration and handles connection errors gracefully.
 */

import { Pool, PoolClient, QueryResult } from 'pg';

// Environment-based configuration
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'avidm_dev',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'dev_password_change_in_production',

  // Connection pool settings
  min: parseInt(process.env.DB_POOL_MIN || '4', 10),
  max: parseInt(process.env.DB_POOL_MAX || '16', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '2000', 10),

  // Statement timeout
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '30000', 10),
};

// Create the pool
export const pool = new Pool(poolConfig);

// Error handling
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

/**
 * Execute a query with parameterized values
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    // Log slow queries (> 1 second)
    if (duration > 1000) {
      console.warn(`Slow query detected (${duration}ms):`, text);
    }

    return result;
  } catch (error) {
    console.error('Database query error:', {
      query: text,
      params,
      error: error instanceof Error ? error.message : error
    });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

/**
 * Execute operations in a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();

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
 * Health check - test database connectivity
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as time');
    return result.rows.length > 0;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Close all connections in the pool
 */
export async function close(): Promise<void> {
  await pool.end();
}

// Export pool for advanced use cases
export default pool;
