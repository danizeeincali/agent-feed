/**
 * WebSocket Hub Core - Main entry point and exports
 * Provides complete WebSocket Hub functionality with protocol translation
 */
export { WebSocketHub, type WebSocketHubConfig, type ConnectedClient, type HubMetrics } from './WebSocketHub';
export { ClientRegistry, type ClientRegistryConfig, type RegisteredClient, type ClaudeInstance } from './ClientRegistry';
export { ProtocolTranslator, type ProtocolTranslatorConfig, type WebhookEndpoint, type TranslationResult } from './ProtocolTranslator';
export { MessageRouter, type MessageRouterConfig, type RoutingTarget } from '../routing/MessageRouter';
export { SecurityManager, type SecurityManagerConfig, type ClientSecurityContext } from '../security/SecurityManager';
import { WebSocketHub, WebSocketHubConfig } from './WebSocketHub';
import { Server as HTTPServer } from 'http';
export interface WebSocketHubFactoryConfig extends Partial<WebSocketHubConfig> {
    enableNLD?: boolean;
    enableSecurity?: boolean;
    enableMetrics?: boolean;
}
/**
 * Factory function to create and configure WebSocket Hub
 */
export declare function createWebSocketHub(httpServer: HTTPServer, config?: WebSocketHubFactoryConfig): Promise<WebSocketHub>;
/**
 * Integration helper for existing WebSocket services
 */
export declare function integrateWithExistingWebSocket(existingIO: any, config?: WebSocketHubFactoryConfig): Promise<{
    hub: WebSocketHub;
    nldIntegration?: any;
}>;
//# sourceMappingURL=index.d.ts.map