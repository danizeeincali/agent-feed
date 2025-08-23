import { ProdClaudeClient } from '@/websockets/prod-claude-client';
/**
 * Production Claude Service
 * Manages the lifecycle and integration of the production Claude WebSocket client
 */
export declare class ProdClaudeService {
    private client;
    private isRunning;
    constructor();
    /**
     * Start the production Claude service
     */
    start(): Promise<void>;
    /**
     * Stop the production Claude service
     */
    stop(): Promise<void>;
    /**
     * Get service status
     */
    getStatus(): {
        running: boolean;
        clientStatus: ReturnType<ProdClaudeClient['getStatus']>;
    };
    /**
     * Setup event handlers
     */
    private setupEventHandlers;
    /**
     * Get the underlying client instance (for advanced usage)
     */
    getClient(): ProdClaudeClient;
}
export declare const prodClaudeService: ProdClaudeService;
//# sourceMappingURL=prod-claude-service.d.ts.map