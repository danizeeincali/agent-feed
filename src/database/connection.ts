import { Pool, PoolClient, QueryResult } from 'pg';
import { createClient, RedisClientType } from 'redis';
import { DatabaseConfig, RedisConfig } from '@/types';
import { logger } from '@/utils/logger';

class DatabaseManager {
  private pool: Pool | null = null;
  private redisClient: RedisClientType | null = null;
  private isConnected = false;

  constructor() {
    this.initializeDatabase();
    // Initialize Redis asynchronously without blocking
    this.initializeRedis().catch(err => logger.error('Redis initialization failed:', err));
  }

  private initializeDatabase(): void {
    const config: DatabaseConfig = {
      host: process.env['DB_HOST'] || 'localhost',
      port: parseInt(process.env['DB_PORT'] || '5432'),
      database: process.env['DB_NAME'] || 'agent_feed',
      username: process.env['DB_USER'] || 'postgres',
      password: process.env['DB_PASSWORD'] || 'postgres',
      ssl: process.env['DB_SSL'] === 'true',
      pool: {
        min: parseInt(process.env['DB_POOL_MIN'] || '2'),
        max: parseInt(process.env['DB_POOL_MAX'] || '20'),
        idle: parseInt(process.env['DB_POOL_IDLE'] || '10000')
      }
    };

    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl,
      min: config.pool.min,
      max: config.pool.max,
      idleTimeoutMillis: config.pool.idle,
      connectionTimeoutMillis: 5000,
      statement_timeout: 30000,
      query_timeout: 30000
    });

    this.pool.on('connect', () => {
      logger.info('Database connection established');
      this.isConnected = true;
    });

    this.pool.on('error', (err) => {
      logger.error('Database pool error:', err);
      this.isConnected = false;
    });

    // Test connection (disabled for demo)
    // this.testConnection();
  }

  private async initializeRedis(): Promise<void> {
    const config: RedisConfig = {
      host: process.env['REDIS_HOST'] || 'localhost',
      port: parseInt(process.env['REDIS_PORT'] || '6379'),
      password: process.env['REDIS_PASSWORD'],
      db: parseInt(process.env['REDIS_DB'] || '0')
    };

    this.redisClient = createClient({
      socket: {
        host: config.host,
        port: config.port
      },
      password: config.password,
      database: config.db
    });

    this.redisClient.on('error', (err) => {
      logger.error('Redis client error:', err);
    });

    this.redisClient.on('connect', () => {
      logger.info('Redis connection established');
    });

    try {
      await this.redisClient.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
    }
  }

  private async testConnection(): Promise<void> {
    try {
      const client = await this.pool!.connect();
      await client.query('SELECT NOW()');
      client.release();
      logger.info('Database connection test successful');
    } catch (error) {
      logger.error('Database connection test failed:', error);
      throw error;
    }
  }

  public async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Query executed', {
        query: text,
        duration: `${duration}ms`,
        rows: result.rowCount
      });

      return result;
    } catch (error) {
      logger.error('Query error:', {
        query: text,
        params,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const client = await this.pool.connect();
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

  public async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }
    return this.pool.connect();
  }

  // Redis methods
  public async setCache(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.redisClient) {
      logger.warn('Redis not available, skipping cache set');
      return;
    }

    try {
      if (ttl) {
        await this.redisClient.setEx(key, ttl, value);
      } else {
        await this.redisClient.set(key, value);
      }
    } catch (error) {
      logger.error('Redis set error:', error);
    }
  }

  public async getCache(key: string): Promise<string | null> {
    if (!this.redisClient) {
      logger.warn('Redis not available, cache miss');
      return null;
    }

    try {
      return await this.redisClient.get(key);
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  public async deleteCache(key: string): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    try {
      await this.redisClient.del(key);
    } catch (error) {
      logger.error('Redis delete error:', error);
    }
  }

  public async setCacheObject(key: string, obj: any, ttl?: number): Promise<void> {
    await this.setCache(key, JSON.stringify(obj), ttl);
  }

  public async getCacheObject<T>(key: string): Promise<T | null> {
    const data = await this.getCache(key);
    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error('Failed to parse cached object:', error);
      return null;
    }
  }

  public async healthCheck(): Promise<{ database: boolean; redis: boolean }> {
    const health = {
      database: false,
      redis: false
    };

    // Test database
    try {
      await this.query('SELECT 1');
      health.database = true;
    } catch (error) {
      logger.error('Database health check failed:', error);
    }

    // Test Redis
    try {
      if (this.redisClient) {
        await this.redisClient.ping();
        health.redis = true;
      }
    } catch (error) {
      logger.error('Redis health check failed:', error);
    }

    return health;
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      logger.info('Database pool closed');
    }

    if (this.redisClient) {
      await this.redisClient.quit();
      logger.info('Redis connection closed');
    }
  }

  public get isHealthy(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
export const db = new DatabaseManager();
export default db;