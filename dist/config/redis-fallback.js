"use strict";
/**
 * Redis Fallback Configuration
 * Provides graceful degradation when Redis is unavailable
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisFallbackManager = exports.RedisFallbackManager = void 0;
const logger_1 = require("@/utils/logger");
/**
 * In-memory store for Redis fallback
 */
class MemoryStore {
    store = new Map();
    cleanupInterval;
    constructor() {
        // Cleanup expired entries every 60 seconds
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60000);
    }
    async set(key, value, ttl) {
        const expires = ttl ? Date.now() + (ttl * 1000) : undefined;
        this.store.set(key, { value, expires });
    }
    async get(key) {
        const item = this.store.get(key);
        if (!item) {
            return null;
        }
        // Check if expired
        if (item.expires && Date.now() > item.expires) {
            this.store.delete(key);
            return null;
        }
        return item.value;
    }
    async del(key) {
        this.store.delete(key);
    }
    async clear() {
        this.store.clear();
    }
    isAvailable() {
        return true;
    }
    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.store.entries()) {
            if (item.expires && now > item.expires) {
                this.store.delete(key);
            }
        }
    }
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.store.clear();
    }
    getStats() {
        return {
            size: this.store.size,
            keys: Array.from(this.store.keys())
        };
    }
}
/**
 * Redis connection wrapper with fallback
 */
class RedisFallbackManager {
    redisClient = null;
    fallbackStore;
    isRedisAvailable = false;
    reconnectAttempts = 0;
    maxReconnectAttempts = 5;
    reconnectDelay = 5000;
    constructor() {
        this.fallbackStore = new MemoryStore();
        logger_1.logger.info('Redis fallback manager initialized with in-memory store');
    }
    /**
     * Initialize Redis connection with fallback
     */
    async initialize(redisConfig) {
        try {
            // Attempt Redis connection only if config is provided
            if (redisConfig && redisConfig.host && redisConfig.port) {
                await this.connectToRedis(redisConfig);
            }
            else {
                logger_1.logger.warn('Redis configuration not provided, using in-memory fallback');
                this.isRedisAvailable = false;
            }
        }
        catch (error) {
            logger_1.logger.warn('Redis initialization failed, using in-memory fallback:', error.message);
            this.isRedisAvailable = false;
        }
    }
    async connectToRedis(config) {
        try {
            const { createClient } = await Promise.resolve().then(() => __importStar(require('redis')));
            this.redisClient = createClient({
                socket: {
                    host: config.host,
                    port: config.port
                },
                password: config.password,
                database: 0,
                retryDelayOnFailover: 100,
                enableReadyCheck: true,
                lazyConnect: true
            });
            this.redisClient.on('error', (err) => {
                logger_1.logger.error('Redis client error:', err.message);
                this.handleRedisError();
            });
            this.redisClient.on('connect', () => {
                logger_1.logger.info('Redis connection established');
                this.isRedisAvailable = true;
                this.reconnectAttempts = 0;
            });
            this.redisClient.on('end', () => {
                logger_1.logger.warn('Redis connection ended');
                this.handleRedisError();
            });
            await this.redisClient.connect();
        }
        catch (error) {
            logger_1.logger.error('Failed to create Redis client:', error.message);
            throw error;
        }
    }
    handleRedisError() {
        this.isRedisAvailable = false;
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            logger_1.logger.info(`Attempting Redis reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
            setTimeout(async () => {
                try {
                    await this.redisClient?.connect();
                }
                catch (error) {
                    logger_1.logger.error('Redis reconnection failed:', error.message);
                    this.handleRedisError();
                }
            }, delay);
        }
        else {
            logger_1.logger.warn('Max Redis reconnection attempts reached, using fallback store only');
        }
    }
    /**
     * Set value with automatic fallback
     */
    async set(key, value, ttl) {
        try {
            if (this.isRedisAvailable && this.redisClient) {
                if (ttl) {
                    await this.redisClient.setEx(key, ttl, value);
                }
                else {
                    await this.redisClient.set(key, value);
                }
                return;
            }
        }
        catch (error) {
            logger_1.logger.warn(`Redis set failed for key ${key}, using fallback:`, error.message);
            this.handleRedisError();
        }
        // Fallback to memory store
        await this.fallbackStore.set(key, value, ttl);
    }
    /**
     * Get value with automatic fallback
     */
    async get(key) {
        try {
            if (this.isRedisAvailable && this.redisClient) {
                return await this.redisClient.get(key);
            }
        }
        catch (error) {
            logger_1.logger.warn(`Redis get failed for key ${key}, using fallback:`, error.message);
            this.handleRedisError();
        }
        // Fallback to memory store
        return await this.fallbackStore.get(key);
    }
    /**
     * Delete value with automatic fallback
     */
    async del(key) {
        try {
            if (this.isRedisAvailable && this.redisClient) {
                await this.redisClient.del(key);
                return;
            }
        }
        catch (error) {
            logger_1.logger.warn(`Redis delete failed for key ${key}, using fallback:`, error.message);
            this.handleRedisError();
        }
        // Fallback to memory store
        await this.fallbackStore.del(key);
    }
    /**
     * Check if Redis is available
     */
    isRedisConnected() {
        return this.isRedisAvailable;
    }
    /**
     * Get store status
     */
    getStatus() {
        return {
            redis: {
                available: this.isRedisAvailable,
                reconnectAttempts: this.reconnectAttempts,
                maxReconnectAttempts: this.maxReconnectAttempts
            },
            fallback: {
                available: this.fallbackStore.isAvailable(),
                stats: this.fallbackStore.getStats()
            }
        };
    }
    /**
     * Health check for both stores
     */
    async healthCheck() {
        const result = { redis: false, fallback: false };
        // Test Redis
        try {
            if (this.isRedisAvailable && this.redisClient) {
                await this.redisClient.ping();
                result.redis = true;
            }
        }
        catch (error) {
            logger_1.logger.warn('Redis health check failed:', error.message);
        }
        // Test fallback store
        try {
            await this.fallbackStore.set('health-check', 'ok', 1);
            const value = await this.fallbackStore.get('health-check');
            result.fallback = value === 'ok';
            await this.fallbackStore.del('health-check');
        }
        catch (error) {
            logger_1.logger.error('Fallback store health check failed:', error);
        }
        return result;
    }
    /**
     * Graceful shutdown
     */
    async shutdown() {
        try {
            if (this.redisClient) {
                await this.redisClient.quit();
                logger_1.logger.info('Redis connection closed');
            }
        }
        catch (error) {
            logger_1.logger.warn('Error closing Redis connection:', error.message);
        }
        this.fallbackStore.destroy();
        logger_1.logger.info('Redis fallback manager shutdown complete');
    }
}
exports.RedisFallbackManager = RedisFallbackManager;
// Singleton instance
exports.redisFallbackManager = new RedisFallbackManager();
//# sourceMappingURL=redis-fallback.js.map