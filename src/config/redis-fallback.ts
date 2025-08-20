/**
 * Redis Fallback Configuration
 * Provides graceful degradation when Redis is unavailable
 */

import { logger } from '@/utils/logger';

export interface FallbackStore {
  set(key: string, value: string, ttl?: number): Promise<void>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<void>;
  clear(): Promise<void>;
  isAvailable(): boolean;
}

/**
 * In-memory store for Redis fallback
 */
class MemoryStore implements FallbackStore {
  private store: Map<string, { value: string; expires?: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const expires = ttl ? Date.now() + (ttl * 1000) : undefined;
    this.store.set(key, { value, expires });
  }

  async get(key: string): Promise<string | null> {
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

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  isAvailable(): boolean {
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (item.expires && now > item.expires) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
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
export class RedisFallbackManager {
  private redisClient: any = null;
  private fallbackStore: MemoryStore;
  private isRedisAvailable: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 5000;

  constructor() {
    this.fallbackStore = new MemoryStore();
    logger.info('Redis fallback manager initialized with in-memory store');
  }

  /**
   * Initialize Redis connection with fallback
   */
  async initialize(redisConfig: any): Promise<void> {
    try {
      // Attempt Redis connection only if config is provided
      if (redisConfig && redisConfig.host && redisConfig.port) {
        await this.connectToRedis(redisConfig);
      } else {
        logger.warn('Redis configuration not provided, using in-memory fallback');
        this.isRedisAvailable = false;
      }
    } catch (error) {
      logger.warn('Redis initialization failed, using in-memory fallback:', error.message);
      this.isRedisAvailable = false;
    }
  }

  private async connectToRedis(config: any): Promise<void> {
    try {
      const { createClient } = await import('redis');
      
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

      this.redisClient.on('error', (err: Error) => {
        logger.error('Redis client error:', err.message);
        this.handleRedisError();
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis connection established');
        this.isRedisAvailable = true;
        this.reconnectAttempts = 0;
      });

      this.redisClient.on('end', () => {
        logger.warn('Redis connection ended');
        this.handleRedisError();
      });

      await this.redisClient.connect();
      
    } catch (error) {
      logger.error('Failed to create Redis client:', error.message);
      throw error;
    }
  }

  private handleRedisError(): void {
    this.isRedisAvailable = false;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      logger.info(`Attempting Redis reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
      
      setTimeout(async () => {
        try {
          await this.redisClient?.connect();
        } catch (error) {
          logger.error('Redis reconnection failed:', error.message);
          this.handleRedisError();
        }
      }, delay);
    } else {
      logger.warn('Max Redis reconnection attempts reached, using fallback store only');
    }
  }

  /**
   * Set value with automatic fallback
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        if (ttl) {
          await this.redisClient.setEx(key, ttl, value);
        } else {
          await this.redisClient.set(key, value);
        }
        return;
      }
    } catch (error) {
      logger.warn(`Redis set failed for key ${key}, using fallback:`, error.message);
      this.handleRedisError();
    }

    // Fallback to memory store
    await this.fallbackStore.set(key, value, ttl);
  }

  /**
   * Get value with automatic fallback
   */
  async get(key: string): Promise<string | null> {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        return await this.redisClient.get(key);
      }
    } catch (error) {
      logger.warn(`Redis get failed for key ${key}, using fallback:`, error.message);
      this.handleRedisError();
    }

    // Fallback to memory store
    return await this.fallbackStore.get(key);
  }

  /**
   * Delete value with automatic fallback
   */
  async del(key: string): Promise<void> {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        await this.redisClient.del(key);
        return;
      }
    } catch (error) {
      logger.warn(`Redis delete failed for key ${key}, using fallback:`, error.message);
      this.handleRedisError();
    }

    // Fallback to memory store
    await this.fallbackStore.del(key);
  }

  /**
   * Check if Redis is available
   */
  isRedisConnected(): boolean {
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
  async healthCheck(): Promise<{ redis: boolean; fallback: boolean }> {
    const result = { redis: false, fallback: false };

    // Test Redis
    try {
      if (this.isRedisAvailable && this.redisClient) {
        await this.redisClient.ping();
        result.redis = true;
      }
    } catch (error) {
      logger.warn('Redis health check failed:', error.message);
    }

    // Test fallback store
    try {
      await this.fallbackStore.set('health-check', 'ok', 1);
      const value = await this.fallbackStore.get('health-check');
      result.fallback = value === 'ok';
      await this.fallbackStore.del('health-check');
    } catch (error) {
      logger.error('Fallback store health check failed:', error);
    }

    return result;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      if (this.redisClient) {
        await this.redisClient.quit();
        logger.info('Redis connection closed');
      }
    } catch (error) {
      logger.warn('Error closing Redis connection:', error.message);
    }

    this.fallbackStore.destroy();
    logger.info('Redis fallback manager shutdown complete');
  }
}

// Singleton instance
export const redisFallbackManager = new RedisFallbackManager();