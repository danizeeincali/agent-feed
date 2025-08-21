"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const pg_1 = require("pg");
const logger_1 = require("@/utils/logger");
const redis_fallback_1 = require("@/config/redis-fallback");
class DatabaseManager {
    pool = null;
    redisClient = null;
    fallbackManager;
    isConnected = false;
    constructor() {
        this.fallbackManager = redis_fallback_1.redisFallbackManager;
        this.initializeDatabase();
        // Initialize Redis with fallback management
        this.initializeRedisWithFallback().catch(err => logger_1.logger.error('Redis initialization failed:', err));
    }
    initializeDatabase() {
        const config = {
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
        this.pool = new pg_1.Pool({
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
            logger_1.logger.info('Database connection established');
            this.isConnected = true;
        });
        this.pool.on('error', (err) => {
            logger_1.logger.error('Database pool error:', err);
            this.isConnected = false;
        });
        // Test connection (disabled for demo)
        // this.testConnection();
    }
    async initializeRedisWithFallback() {
        const config = {
            host: process.env['REDIS_HOST'] || 'localhost',
            port: parseInt(process.env['REDIS_PORT'] || '6379'),
            password: process.env['REDIS_PASSWORD'],
            db: parseInt(process.env['REDIS_DB'] || '0')
        };
        try {
            // Initialize fallback manager with Redis config
            await this.fallbackManager.initialize(config);
            logger_1.logger.info('Redis fallback manager initialized successfully');
        }
        catch (error) {
            logger_1.logger.warn('Redis fallback initialization failed, using memory-only mode:', error.message);
        }
    }
    async initializeRedis() {
        // Legacy method kept for compatibility
        await this.initializeRedisWithFallback();
    }
    async testConnection() {
        try {
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            logger_1.logger.info('Database connection test successful');
        }
        catch (error) {
            logger_1.logger.error('Database connection test failed:', error);
            throw error;
        }
    }
    async query(text, params) {
        if (!this.pool) {
            throw new Error('Database not initialized');
        }
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            logger_1.logger.debug('Query executed', {
                query: text,
                duration: `${duration}ms`,
                rows: result.rowCount
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Query error:', {
                query: text,
                params,
                error: error instanceof Error ? error.message : error
            });
            throw error;
        }
    }
    async transaction(callback) {
        if (!this.pool) {
            throw new Error('Database not initialized');
        }
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async getClient() {
        if (!this.pool) {
            throw new Error('Database not initialized');
        }
        return this.pool.connect();
    }
    // Redis methods with fallback
    async setCache(key, value, ttl) {
        try {
            await this.fallbackManager.set(key, value, ttl);
        }
        catch (error) {
            logger_1.logger.error('Cache set error:', error);
        }
    }
    async getCache(key) {
        try {
            return await this.fallbackManager.get(key);
        }
        catch (error) {
            logger_1.logger.error('Cache get error:', error);
            return null;
        }
    }
    async deleteCache(key) {
        try {
            await this.fallbackManager.del(key);
        }
        catch (error) {
            logger_1.logger.error('Cache delete error:', error);
        }
    }
    async setCacheObject(key, obj, ttl) {
        await this.setCache(key, JSON.stringify(obj), ttl);
    }
    async getCacheObject(key) {
        const data = await this.getCache(key);
        if (!data)
            return null;
        try {
            return JSON.parse(data);
        }
        catch (error) {
            logger_1.logger.error('Failed to parse cached object:', error);
            return null;
        }
    }
    async healthCheck() {
        const health = {
            database: false,
            redis: false,
            fallback: false
        };
        // Test database
        try {
            await this.query('SELECT 1');
            health.database = true;
        }
        catch (error) {
            logger_1.logger.error('Database health check failed:', error);
        }
        // Test Redis and fallback
        try {
            const fallbackHealth = await this.fallbackManager.healthCheck();
            health.redis = fallbackHealth.redis;
            health.fallback = fallbackHealth.fallback;
        }
        catch (error) {
            logger_1.logger.error('Cache health check failed:', error);
        }
        return health;
    }
    async close() {
        if (this.pool) {
            await this.pool.end();
            logger_1.logger.info('Database pool closed');
        }
        try {
            await this.fallbackManager.shutdown();
            logger_1.logger.info('Redis fallback manager shutdown complete');
        }
        catch (error) {
            logger_1.logger.error('Error shutting down Redis fallback manager:', error);
        }
    }
    get isHealthy() {
        return this.isConnected;
    }
}
// Singleton instance
exports.db = new DatabaseManager();
exports.default = exports.db;
//# sourceMappingURL=connection.js.map