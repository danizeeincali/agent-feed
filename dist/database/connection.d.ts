import { PoolClient, QueryResult } from 'pg';
declare class DatabaseManager {
    private pool;
    private redisClient;
    private fallbackManager;
    private isConnected;
    constructor();
    private initializeDatabase;
    private initializeRedisWithFallback;
    private initializeRedis;
    private testConnection;
    query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
    transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
    getClient(): Promise<PoolClient>;
    setCache(key: string, value: string, ttl?: number): Promise<void>;
    getCache(key: string): Promise<string | null>;
    deleteCache(key: string): Promise<void>;
    setCacheObject(key: string, obj: any, ttl?: number): Promise<void>;
    getCacheObject<T>(key: string): Promise<T | null>;
    healthCheck(): Promise<{
        database: boolean;
        redis: boolean;
        fallback: boolean;
    }>;
    close(): Promise<void>;
    get isHealthy(): boolean;
}
export declare const db: DatabaseManager;
export default db;
//# sourceMappingURL=connection.d.ts.map