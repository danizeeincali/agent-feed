"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const pg_1 = require("pg");
const redis_1 = require("redis");
const logger_1 = require("@/utils/logger");
class DatabaseManager {
    pool = null;
    redisClient = null;
    isConnected = false;
    constructor() {
        this.initializeDatabase();
        // Initialize Redis asynchronously without blocking
        this.initializeRedis().catch(err => logger_1.logger.error('Redis initialization failed:', err));
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
    async initializeRedis() {
        const config = {
            host: process.env['REDIS_HOST'] || 'localhost',
            port: parseInt(process.env['REDIS_PORT'] || '6379'),
            password: process.env['REDIS_PASSWORD'],
            db: parseInt(process.env['REDIS_DB'] || '0')
        };
        this.redisClient = (0, redis_1.createClient)({
            socket: {
                host: config.host,
                port: config.port
            },
            password: config.password,
            database: config.db
        });
        this.redisClient.on('error', (err) => {
            logger_1.logger.error('Redis client error:', err);
        });
        this.redisClient.on('connect', () => {
            logger_1.logger.info('Redis connection established');
        });
        try {
            await this.redisClient.connect();
        }
        catch (error) {
            logger_1.logger.error('Failed to connect to Redis:', error);
        }
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
    // Redis methods
    async setCache(key, value, ttl) {
        if (!this.redisClient) {
            logger_1.logger.warn('Redis not available, skipping cache set');
            return;
        }
        try {
            if (ttl) {
                await this.redisClient.setEx(key, ttl, value);
            }
            else {
                await this.redisClient.set(key, value);
            }
        }
        catch (error) {
            logger_1.logger.error('Redis set error:', error);
        }
    }
    async getCache(key) {
        if (!this.redisClient) {
            logger_1.logger.warn('Redis not available, cache miss');
            return null;
        }
        try {
            return await this.redisClient.get(key);
        }
        catch (error) {
            logger_1.logger.error('Redis get error:', error);
            return null;
        }
    }
    async deleteCache(key) {
        if (!this.redisClient) {
            return;
        }
        try {
            await this.redisClient.del(key);
        }
        catch (error) {
            logger_1.logger.error('Redis delete error:', error);
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
            redis: false
        };
        // Test database
        try {
            await this.query('SELECT 1');
            health.database = true;
        }
        catch (error) {
            logger_1.logger.error('Database health check failed:', error);
        }
        // Test Redis
        try {
            if (this.redisClient) {
                await this.redisClient.ping();
                health.redis = true;
            }
        }
        catch (error) {
            logger_1.logger.error('Redis health check failed:', error);
        }
        return health;
    }
    async close() {
        if (this.pool) {
            await this.pool.end();
            logger_1.logger.info('Database pool closed');
        }
        if (this.redisClient) {
            await this.redisClient.quit();
            logger_1.logger.info('Redis connection closed');
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