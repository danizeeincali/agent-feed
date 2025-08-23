"use strict";
/**
 * WebSocket Hub Core - Main entry point and exports
 * Provides complete WebSocket Hub functionality with protocol translation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityManager = exports.MessageRouter = exports.ProtocolTranslator = exports.ClientRegistry = exports.WebSocketHub = void 0;
exports.createWebSocketHub = createWebSocketHub;
exports.integrateWithExistingWebSocket = integrateWithExistingWebSocket;
var WebSocketHub_1 = require("./WebSocketHub");
Object.defineProperty(exports, "WebSocketHub", { enumerable: true, get: function () { return WebSocketHub_1.WebSocketHub; } });
var ClientRegistry_1 = require("./ClientRegistry");
Object.defineProperty(exports, "ClientRegistry", { enumerable: true, get: function () { return ClientRegistry_1.ClientRegistry; } });
var ProtocolTranslator_1 = require("./ProtocolTranslator");
Object.defineProperty(exports, "ProtocolTranslator", { enumerable: true, get: function () { return ProtocolTranslator_1.ProtocolTranslator; } });
// Re-export routing and security components
var MessageRouter_1 = require("../routing/MessageRouter");
Object.defineProperty(exports, "MessageRouter", { enumerable: true, get: function () { return MessageRouter_1.MessageRouter; } });
var SecurityManager_1 = require("../security/SecurityManager");
Object.defineProperty(exports, "SecurityManager", { enumerable: true, get: function () { return SecurityManager_1.SecurityManager; } });
// Hub factory for easy initialization
const WebSocketHub_2 = require("./WebSocketHub");
const logger_1 = require("@/utils/logger");
/**
 * Factory function to create and configure WebSocket Hub
 */
async function createWebSocketHub(httpServer, config = {}) {
    const defaultConfig = {
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
    const hub = new WebSocketHub_2.WebSocketHub(httpServer, defaultConfig);
    logger_1.logger.info('WebSocket Hub created', {
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
async function integrateWithExistingWebSocket(existingIO, config = {}) {
    // Extract HTTP server from existing Socket.IO instance
    const httpServer = existingIO.httpServer || existingIO.engine.httpServer;
    if (!httpServer) {
        throw new Error('Cannot extract HTTP server from existing Socket.IO instance');
    }
    const hub = await createWebSocketHub(httpServer, config);
    let nldIntegration;
    if (config.enableNLD) {
        try {
            // Note: This would need to be adapted based on the actual WebSocket service structure
            logger_1.logger.info('Integrating NLD with WebSocket Hub');
            // nldIntegration = await integrateNLDWithWebSocket(webSocketService);
        }
        catch (error) {
            logger_1.logger.warn('Failed to integrate NLD', { error: error.message });
        }
    }
    return { hub, nldIntegration };
}
//# sourceMappingURL=index.js.map