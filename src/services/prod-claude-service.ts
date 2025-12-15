import { ProdClaudeClient } from '@/websockets/prod-claude-client';
import { logger } from '@/utils/logger';

/**
 * Production Claude Service
 * Manages the lifecycle and integration of the production Claude WebSocket client
 */
export class ProdClaudeService {
  private client: ProdClaudeClient;
  private isRunning = false;

  constructor() {
    this.client = new ProdClaudeClient();
    this.setupEventHandlers();
  }

  /**
   * Start the production Claude service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('ProdClaudeService already running');
      return;
    }

    try {
      logger.info('Starting ProdClaudeService');
      await this.client.initialize();
      this.isRunning = true;
      logger.info('ProdClaudeService started successfully');
    } catch (error) {
      logger.error('Failed to start ProdClaudeService:', error);
      throw error;
    }
  }

  /**
   * Stop the production Claude service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('ProdClaudeService not running');
      return;
    }

    try {
      logger.info('Stopping ProdClaudeService');
      await this.client.shutdown();
      this.isRunning = false;
      logger.info('ProdClaudeService stopped successfully');
    } catch (error) {
      logger.error('Failed to stop ProdClaudeService:', error);
      throw error;
    }
  }

  /**
   * Get service status
   */
  getStatus(): {
    running: boolean;
    clientStatus: ReturnType<ProdClaudeClient['getStatus']>;
  } {
    return {
      running: this.isRunning,
      clientStatus: this.client.getStatus()
    };
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.client.on('connected', () => {
      logger.info('Production Claude client connected to hub');
    });

    this.client.on('disconnected', (details) => {
      logger.warn('Production Claude client disconnected:', details);
    });

    this.client.on('error', (error) => {
      logger.error('Production Claude client error:', error);
    });

    this.client.on('maxReconnectAttemptsReached', () => {
      logger.error('Production Claude client failed to reconnect after max attempts');
      // Could implement notification or escalation here
    });

    this.client.on('shutdown', () => {
      logger.info('Production Claude client shut down');
      this.isRunning = false;
    });
  }

  /**
   * Get the underlying client instance (for advanced usage)
   */
  getClient(): ProdClaudeClient {
    return this.client;
  }
}

// Export singleton instance
export const prodClaudeService = new ProdClaudeService();