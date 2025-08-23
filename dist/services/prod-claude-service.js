"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prodClaudeService = exports.ProdClaudeService = void 0;
const prod_claude_client_1 = require("@/websockets/prod-claude-client");
const logger_1 = require("@/utils/logger");
/**
 * Production Claude Service
 * Manages the lifecycle and integration of the production Claude WebSocket client
 */
class ProdClaudeService {
    client;
    isRunning = false;
    constructor() {
        this.client = new prod_claude_client_1.ProdClaudeClient();
        this.setupEventHandlers();
    }
    /**
     * Start the production Claude service
     */
    async start() {
        if (this.isRunning) {
            logger_1.logger.warn('ProdClaudeService already running');
            return;
        }
        try {
            logger_1.logger.info('Starting ProdClaudeService');
            await this.client.initialize();
            this.isRunning = true;
            logger_1.logger.info('ProdClaudeService started successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to start ProdClaudeService:', error);
            throw error;
        }
    }
    /**
     * Stop the production Claude service
     */
    async stop() {
        if (!this.isRunning) {
            logger_1.logger.warn('ProdClaudeService not running');
            return;
        }
        try {
            logger_1.logger.info('Stopping ProdClaudeService');
            await this.client.shutdown();
            this.isRunning = false;
            logger_1.logger.info('ProdClaudeService stopped successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to stop ProdClaudeService:', error);
            throw error;
        }
    }
    /**
     * Get service status
     */
    getStatus() {
        return {
            running: this.isRunning,
            clientStatus: this.client.getStatus()
        };
    }
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        this.client.on('connected', () => {
            logger_1.logger.info('Production Claude client connected to hub');
        });
        this.client.on('disconnected', (details) => {
            logger_1.logger.warn('Production Claude client disconnected:', details);
        });
        this.client.on('error', (error) => {
            logger_1.logger.error('Production Claude client error:', error);
        });
        this.client.on('maxReconnectAttemptsReached', () => {
            logger_1.logger.error('Production Claude client failed to reconnect after max attempts');
            // Could implement notification or escalation here
        });
        this.client.on('shutdown', () => {
            logger_1.logger.info('Production Claude client shut down');
            this.isRunning = false;
        });
    }
    /**
     * Get the underlying client instance (for advanced usage)
     */
    getClient() {
        return this.client;
    }
}
exports.ProdClaudeService = ProdClaudeService;
// Export singleton instance
exports.prodClaudeService = new ProdClaudeService();
//# sourceMappingURL=prod-claude-service.js.map