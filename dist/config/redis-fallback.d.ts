/**
 * Redis Fallback Configuration
 * Provides graceful degradation when Redis is unavailable
 */
export interface FallbackStore {
    set(key: string, value: string, ttl?: number): Promise<void>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<void>;
    clear(): Promise<void>;
    isAvailable(): boolean;
}
/**
 * Redis connection wrapper with fallback
 */
export declare class RedisFallbackManager {
    private redisClient;
    private fallbackStore;
    private isRedisAvailable;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    constructor();
    /**
     * Initialize Redis connection with fallback
     */
    initialize(redisConfig: any): Promise<void>;
    private connectToRedis;
    private handleRedisError;
    /**
     * Set value with automatic fallback
     */
    set(key: string, value: string, ttl?: number): Promise<void>;
    /**
     * Get value with automatic fallback
     */
    get(key: string): Promise<string | null>;
    /**
     * Delete value with automatic fallback
     */
    del(key: string): Promise<void>;
    /**
     * Check if Redis is available
     */
    isRedisConnected(): boolean;
    /**
     * Get store status
     */
    getStatus(): {
        redis: {
            available: boolean;
            reconnectAttempts: number;
            maxReconnectAttempts: number;
        };
        fallback: {
            available: boolean;
            stats: {
                size: number;
                keys: string[];
            };
        };
    };
    /**
     * Health check for both stores
     */
    healthCheck(): Promise<{
        redis: boolean;
        fallback: boolean;
    }>;
    /**
     * Graceful shutdown
     */
    shutdown(): Promise<void>;
}
export declare const redisFallbackManager: RedisFallbackManager;
//# sourceMappingURL=redis-fallback.d.ts.map