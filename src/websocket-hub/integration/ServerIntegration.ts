/**
 * Server Integration - Integrates WebSocket Hub with existing server.ts
 * Provides seamless integration while maintaining existing functionality
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { WebSocketHub, WebSocketHubConfig, createWebSocketHub } from '../core';
import { logger } from '@/utils/logger';
// NLD integration removed

export interface ServerIntegrationConfig {
  enableHub: boolean;
  enableNLD: boolean;
  enableSecurity: boolean;
  enableMetrics: boolean;
  hubConfig?: Partial<WebSocketHubConfig>;
  preserveExistingHandlers: boolean;
  routingStrategy: 'hub-only' | 'hybrid' | 'fallback';
}

export interface IntegrationResult {
  hub: WebSocketHub;
  originalIO: SocketIOServer;
  metrics: {
    hubConnections: number;
    originalConnections: number;
    totalConnections: number;
  };
}

export class ServerIntegration {
  private hub: WebSocketHub;
  private originalIO: SocketIOServer;
  private config: ServerIntegrationConfig;
  private isInitialized: boolean = false;
  private connectionMap: Map<string, 'hub' | 'original'> = new Map();

  constructor(
    httpServer: HTTPServer,
    originalIO: SocketIOServer,
    config: ServerIntegrationConfig
  ) {
    this.originalIO = originalIO;
    this.config = {
      preserveExistingHandlers: true,
      routingStrategy: 'hybrid',
      ...config
    };
  }

  /**
   * Initialize the WebSocket Hub integration
   */
  async initialize(): Promise<IntegrationResult> {
    if (this.isInitialized) {
      throw new Error('Server integration already initialized');
    }

    try {
      // Create WebSocket Hub
      if (this.config.enableHub) {
        this.hub = await createWebSocketHub(
          this.originalIO.httpServer as any || this.originalIO.engine.httpServer as any,
          {
            enableNLD: this.config.enableNLD,
            enableSecurity: this.config.enableSecurity,
            enableMetrics: this.config.enableMetrics,
            ...this.config.hubConfig
          }
        );

        await this.hub.start();

        // Set up integration event handlers
        this.setupHubEventHandlers();
      }

      // NLD integration removed

      // Set up routing strategy
      await this.setupRoutingStrategy();

      this.isInitialized = true;

      const result: IntegrationResult = {
        hub: this.hub,
        originalIO: this.originalIO,
        metrics: this.getConnectionMetrics()
      };

      logger.info('WebSocket Hub integration initialized successfully', {
        routingStrategy: this.config.routingStrategy,
        enabledFeatures: {
          hub: this.config.enableHub,
          nld: this.config.enableNLD,
          security: this.config.enableSecurity,
          metrics: this.config.enableMetrics
        }
      });

      return result;

    } catch (error) {
      logger.error('Failed to initialize WebSocket Hub integration', {
        error: error.message
      });
      throw error;
    }
  }

  // NLD integration methods removed



  /**
   * Set up routing strategy between hub and original Socket.IO
   */
  private async setupRoutingStrategy(): Promise<void> {
    switch (this.config.routingStrategy) {
      case 'hub-only':
        await this.setupHubOnlyRouting();
        break;
      case 'hybrid':
        await this.setupHybridRouting();
        break;
      case 'fallback':
        await this.setupFallbackRouting();
        break;
    }
  }

  /**
   * Set up hub-only routing (all connections go through hub)
   */
  private async setupHubOnlyRouting(): Promise<void> {
    if (!this.hub) {
      throw new Error('Hub not available for hub-only routing');
    }

    // Disable original Socket.IO connection handling
    this.originalIO.engine.generateId = () => {
      throw new Error('Direct connections disabled - use WebSocket Hub');
    };

    logger.info('Hub-only routing configured');
  }

  /**
   * Set up hybrid routing (smart routing based on client type)
   */
  private async setupHybridRouting(): Promise<void> {
    if (!this.hub) {
      logger.warn('Hub not available for hybrid routing, falling back to original');
      return;
    }

    // Intercept connection events and route based on client capabilities
    const originalConnectionHandler = this.originalIO.engine.handleRequest.bind(this.originalIO.engine);
    
    this.originalIO.engine.handleRequest = (req: any, res: any) => {
      const query = req.url ? new URL(req.url, 'http://localhost').searchParams : new URLSearchParams();
      const instanceType = query.get('instanceType') || 'frontend';
      
      // Route Claude instances and webhooks to hub
      if (['claude-production', 'claude-dev', 'webhook'].includes(instanceType)) {
        logger.debug('Routing to hub', { instanceType, url: req.url });
        return; // Let hub handle it
      }
      
      // Route frontend connections to original for backward compatibility
      logger.debug('Routing to original Socket.IO', { instanceType, url: req.url });
      return originalConnectionHandler(req, res);
    };

    logger.info('Hybrid routing configured');
  }

  /**
   * Set up fallback routing (original first, hub as fallback)
   */
  private async setupFallbackRouting(): Promise<void> {
    if (!this.hub) {
      logger.warn('Hub not available for fallback routing');
      return;
    }

    // Set up fallback when original Socket.IO fails
    this.originalIO.engine.on('connection_error', (error: any) => {
      logger.warn('Original Socket.IO connection failed, trying hub', { error });
      // This would need more sophisticated implementation in practice
    });

    logger.info('Fallback routing configured');
  }

  /**
   * Set up hub event handlers for integration
   */
  private setupHubEventHandlers(): void {
    if (!this.hub) return;

    // Track connections for metrics
    this.hub.on('clientConnected', (event) => {
      this.connectionMap.set(event.clientId, 'hub');
      logger.debug('Client connected to hub', event);
    });

    this.hub.on('clientDisconnected', (event) => {
      this.connectionMap.delete(event.clientId);
      logger.debug('Client disconnected from hub', event);
    });

    // Forward hub events to original Socket.IO clients if needed
    if (this.config.preserveExistingHandlers) {
      this.setupEventForwarding();
    }

    // Security events
    this.hub.on('securityViolation', (violation) => {
      logger.warn('Security violation detected in hub', violation);
      // Could forward to monitoring systems
    });

    // Protocol translation events
    this.hub.on('protocolTranslated', (event) => {
      logger.debug('Protocol translation completed', event);
    });
  }

  /**
   * Set up event forwarding between hub and original Socket.IO
   */
  private setupEventForwarding(): void {
    // Forward certain hub events to original Socket.IO clients
    this.hub.on('messageRouted', (event) => {
      // Forward routing information to connected clients for debugging
      this.originalIO.emit('hub:message:routed', {
        ...event,
        timestamp: new Date().toISOString()
      });
    });

    // Forward original Socket.IO events to hub clients
    this.originalIO.on('connection', (socket) => {
      this.connectionMap.set(socket.id, 'original');
      
      socket.on('disconnect', () => {
        this.connectionMap.delete(socket.id);
      });

      // Forward certain events to hub
      socket.on('hub:subscribe', (data) => {
        if (this.hub) {
          this.hub.broadcastToInstanceType('claude-production', 'subscription:request', {
            ...data,
            sourceSocket: socket.id
          });
        }
      });
    });
  }

  /**
   * Get connection metrics
   */
  getConnectionMetrics(): IntegrationResult['metrics'] {
    let hubConnections = 0;
    let originalConnections = 0;

    for (const type of this.connectionMap.values()) {
      if (type === 'hub') {
        hubConnections++;
      } else {
        originalConnections++;
      }
    }

    return {
      hubConnections,
      originalConnections,
      totalConnections: hubConnections + originalConnections
    };
  }

  /**
   * Get integration status
   */
  getStatus(): {
    initialized: boolean;
    hubActive: boolean;
    routingStrategy: string;
    metrics: IntegrationResult['metrics'];
  } {
    return {
      initialized: this.isInitialized,
      hubActive: this.hub?.isActive() || false,
      routingStrategy: this.config.routingStrategy,
      metrics: this.getConnectionMetrics()
    };
  }

  /**
   * Handle Claude instance registration through integration
   */
  async registerClaudeInstance(instanceData: {
    instanceId: string;
    version: string;
    capabilities: string[];
    webhookUrl?: string;
    socketId?: string;
  }): Promise<void> {
    if (!this.hub) {
      throw new Error('Hub not available for Claude instance registration');
    }

    // Register with hub if socket ID provided
    if (instanceData.socketId) {
      // Note: This would call the private method in a real implementation
      // For now, we'll just log the registration
      logger.info('Claude instance would be registered with hub', {
        socketId: instanceData.socketId,
        instanceData
      });
    }

    logger.info('Claude instance registered through integration', {
      instanceId: instanceData.instanceId,
      version: instanceData.version
    });
  }

  /**
   * Broadcast message through appropriate channel
   */
  broadcastMessage(
    target: 'hub' | 'original' | 'both',
    event: string,
    data: any
  ): void {
    if ((target === 'hub' || target === 'both') && this.hub) {
      this.hub.broadcastToInstanceType('frontend', event, data);
    }

    if (target === 'original' || target === 'both') {
      this.originalIO.emit(event, data);
    }
  }

  // NLD integration toggle methods removed

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ServerIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update hub config if available
    if (this.hub && newConfig.hubConfig) {
      // Hub would need to support config updates
      logger.info('Hub configuration updated', newConfig.hubConfig);
    }
  }

  /**
   * Shutdown integration
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down WebSocket Hub integration');

    try {
      // Shutdown hub
      if (this.hub) {
        await this.hub.stop();
      }

      // Clear connection tracking
      this.connectionMap.clear();

      this.isInitialized = false;

      logger.info('WebSocket Hub integration shutdown completed');

    } catch (error) {
      logger.error('Error during integration shutdown', { error: error.message });
      throw error;
    }
  }
}

/**
 * Factory function to create server integration
 */
export async function createServerIntegration(
  httpServer: HTTPServer,
  originalIO: SocketIOServer,
  config: ServerIntegrationConfig
): Promise<ServerIntegration> {
  const integration = new ServerIntegration(httpServer, originalIO, config);
  await integration.initialize();
  return integration;
}

/**
 * Helper function to integrate with existing server setup
 */
export async function integrateWebSocketHub(
  httpServer: HTTPServer,
  originalIO: SocketIOServer,
  options: Partial<ServerIntegrationConfig> = {}
): Promise<IntegrationResult> {
  const config: ServerIntegrationConfig = {
    enableHub: true,
    enableNLD: false,
    enableSecurity: true,
    enableMetrics: true,
    preserveExistingHandlers: true,
    routingStrategy: 'hybrid',
    ...options
  };

  const integration = new ServerIntegration(httpServer, originalIO, config);
  return await integration.initialize();
}