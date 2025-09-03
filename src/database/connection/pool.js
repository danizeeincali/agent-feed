/**
 * PostgreSQL Connection Pool Management
 * Following 2025 best practices for Node.js database connections
 * 
 * Features:
 * - Connection pooling with optimal configuration
 * - Environment-based configuration
 * - Health monitoring and error recovery
 * - Resource cleanup
 */

import pkg from 'pg';
const { Pool } = pkg;
import winston from 'winston';

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/database.log' })
  ]
});

class DatabaseConnectionPool {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
    
    // Configuration based on best practices for 2025
    this.config = {
      user: process.env.DATABASE_USER || 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      database: process.env.DATABASE_NAME || 'agent_feed',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      port: process.env.DATABASE_PORT || 5432,
      
      // Connection pool configuration - optimized for performance
      max: parseInt(process.env.DATABASE_POOL_MAX) || 20, // maximum number of clients in the pool
      min: parseInt(process.env.DATABASE_POOL_MIN) || 4,  // minimum number of clients in the pool
      idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT) || 30000, // close idle clients after 30 seconds
      connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT) || 2000, // return an error after 2 seconds if connection could not be established
      maxUses: parseInt(process.env.DATABASE_MAX_USES) || 7500, // close (and replace) a connection after it has been used 7500 times
      
      // SSL configuration
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false,
      
      // Query timeout
      query_timeout: parseInt(process.env.DATABASE_QUERY_TIMEOUT) || 60000,
      
      // Keep connections alive
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    };
  }

  async initialize() {
    try {
      this.pool = new Pool(this.config);
      
      // Set up event handlers for pool monitoring
      this.setupEventHandlers();
      
      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      this.isConnected = true;
      this.connectionAttempts = 0;
      
      logger.info('Database connection pool initialized successfully', {
        config: {
          host: this.config.host,
          database: this.config.database,
          max_connections: this.config.max,
          min_connections: this.config.min
        }
      });
      
      return true;
    } catch (error) {
      this.connectionAttempts++;
      this.isConnected = false;
      
      logger.error('Failed to initialize database connection pool', {
        error: error.message,
        attempt: this.connectionAttempts,
        config: {
          host: this.config.host,
          database: this.config.database,
          port: this.config.port
        }
      });
      
      if (this.connectionAttempts < this.maxRetries) {
        logger.info(`Retrying connection in ${this.connectionAttempts * 2} seconds...`);
        await new Promise(resolve => setTimeout(resolve, this.connectionAttempts * 2000));
        return this.initialize();
      }
      
      throw error;
    }
  }

  setupEventHandlers() {
    this.pool.on('connect', (client) => {
      logger.debug('New client connected to database', {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      });
    });

    this.pool.on('remove', (client) => {
      logger.debug('Client removed from pool', {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount
      });
    });

    this.pool.on('error', (err, client) => {
      logger.error('Unexpected error on idle client', {
        error: err.message,
        stack: err.stack
      });
    });

    // Pool acquisition errors
    this.pool.on('acquire', (client) => {
      logger.debug('Client acquired from pool');
    });

    this.pool.on('release', (client) => {
      logger.debug('Client released back to pool');
    });
  }

  async query(text, params = []) {
    const start = Date.now();
    
    try {
      if (!this.isConnected) {
        await this.initialize();
      }
      
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Query executed successfully', {
        query: text.substring(0, 100),
        duration,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      logger.error('Query execution failed', {
        error: error.message,
        query: text.substring(0, 100),
        params: params,
        duration
      });
      
      throw error;
    }
  }

  async getClient() {
    try {
      if (!this.isConnected) {
        await this.initialize();
      }
      
      return await this.pool.connect();
    } catch (error) {
      logger.error('Failed to get client from pool', {
        error: error.message
      });
      throw error;
    }
  }

  async transaction(callback) {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      
      logger.error('Transaction rolled back', {
        error: error.message
      });
      
      throw error;
    } finally {
      client.release();
    }
  }

  getPoolStats() {
    if (!this.pool) {
      return null;
    }
    
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      isConnected: this.isConnected,
      maxConnections: this.config.max,
      minConnections: this.config.min
    };
  }

  async healthCheck() {
    try {
      const result = await this.query('SELECT 1 as healthy');
      const stats = this.getPoolStats();
      
      return {
        healthy: true,
        timestamp: new Date().toISOString(),
        pool: stats,
        latency: result.duration || 0
      };
    } catch (error) {
      return {
        healthy: false,
        timestamp: new Date().toISOString(),
        error: error.message,
        pool: this.getPoolStats()
      };
    }
  }

  async close() {
    if (this.pool) {
      logger.info('Closing database connection pool');
      await this.pool.end();
      this.isConnected = false;
      this.pool = null;
    }
  }
}

// Singleton instance
export const dbPool = new DatabaseConnectionPool();

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing database connections');
  await dbPool.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing database connections');
  await dbPool.close();
  process.exit(0);
});

export default dbPool;