/**
 * WebSocket Hub Core - Main entry point and exports
 * Provides complete WebSocket Hub functionality with protocol translation
 */

export { WebSocketHub, type WebSocketHubConfig, type ConnectedClient, type HubMetrics } from './WebSocketHub';
export { ClientRegistry, type ClientRegistryConfig, type RegisteredClient, type ClaudeInstance } from './ClientRegistry';
export { ProtocolTranslator, type ProtocolTranslatorConfig, type WebhookEndpoint, type TranslationResult } from './ProtocolTranslator';

// Re-export routing and security components
export { MessageRouter, type MessageRouterConfig, type RoutingTarget } from '../routing/MessageRouter';
export { SecurityManager, type SecurityManagerConfig, type ClientSecurityContext } from '../security/SecurityManager';

// Hub factory for easy initialization
import { WebSocketHub, WebSocketHubConfig } from './WebSocketHub';
import { Server as HTTPServer } from 'http';
import { logger } from '@/utils/logger';
// NLD integration removed

export interface WebSocketHubFactoryConfig extends Partial<WebSocketHubConfig> {
  enableNLD?: boolean;
  enableSecurity?: boolean;
  enableMetrics?: boolean;
}

/**
 * Factory function to create and configure WebSocket Hub
 */
export async function createWebSocketHub(
  httpServer: HTTPServer,
  config: WebSocketHubFactoryConfig = {}
): Promise<WebSocketHub> {
  const defaultConfig: WebSocketHubConfig = {
    port: 3001,
    cors: {
      origin: ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3001"],
      credentials: true
    },
    transports: ['polling', 'websocket'],
    pingTimeout: 20000,
    pingInterval: 8000,
    maxConnections: 1000,
    enableNLD: false,
    enableSecurity: true,
    enableMetrics: true,
    routingStrategy: 'round-robin',
    ...config
  };

  const hub = new WebSocketHub(httpServer, defaultConfig);

  logger.info('WebSocket Hub created', {
    config: defaultConfig,
    enabledFeatures: {
      nld: defaultConfig.enableNLD,
      security: defaultConfig.enableSecurity,
      metrics: defaultConfig.enableMetrics
    }
  });

  return hub;
}

/**
 * Integration helper for existing WebSocket services
 */
export async function integrateWithExistingWebSocket(
  existingIO: any,
  config: WebSocketHubFactoryConfig = {}
): Promise<{
  hub: WebSocketHub;
}> {
  // Extract HTTP server from existing Socket.IO instance
  const httpServer = existingIO.httpServer || existingIO.engine.httpServer;

  if (!httpServer) {
    throw new Error('Cannot extract HTTP server from existing Socket.IO instance');
  }

  const hub = await createWebSocketHub(httpServer, config);

  return { hub };
}