#!/usr/bin/env node
"use strict";
/**
 * Production Claude Instance Startup Script
 * Initializes and starts the production Claude WebSocket client
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startProdClaude = main;
const prod_claude_service_1 = require("@/services/prod-claude-service");
const hub_server_1 = require("@/websockets/hub-server");
const logger_1 = require("@/utils/logger");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal) {
    logger_1.logger.info(`Received ${signal}, starting graceful shutdown...`);
    try {
        // Stop production Claude service
        await prod_claude_service_1.prodClaudeService.stop();
        logger_1.logger.info('Production Claude service stopped');
        // Stop hub server if running
        await hub_server_1.hubServer.stop();
        logger_1.logger.info('Hub server stopped');
        logger_1.logger.info('Graceful shutdown completed');
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
}
/**
 * Main startup function
 */
async function main() {
    try {
        logger_1.logger.info('Starting Production Claude Instance...');
        // Check if we should start the hub server
        const startHub = process.argv.includes('--with-hub') || process.env.START_HUB === 'true';
        if (startHub) {
            logger_1.logger.info('Starting WebSocket Hub Server...');
            await hub_server_1.hubServer.start();
            logger_1.logger.info('WebSocket Hub Server started on port 3001');
        }
        // Start production Claude service
        logger_1.logger.info('Starting Production Claude Service...');
        await prod_claude_service_1.prodClaudeService.start();
        // Log status
        const status = prod_claude_service_1.prodClaudeService.getStatus();
        logger_1.logger.info('Production Claude Instance started successfully', {
            serviceRunning: status.running,
            clientConnected: status.clientStatus.connected,
            instanceId: status.clientStatus.instanceId,
            devMode: status.clientStatus.devMode,
            sandboxMode: status.clientStatus.sandboxMode
        });
        // Setup graceful shutdown handlers
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('Uncaught Exception:', error);
            gracefulShutdown('uncaughtException');
        });
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            gracefulShutdown('unhandledRejection');
        });
        logger_1.logger.info('Production Claude Instance is ready and running');
        logger_1.logger.info('Press Ctrl+C to shutdown gracefully');
    }
    catch (error) {
        logger_1.logger.error('Failed to start Production Claude Instance:', error);
        process.exit(1);
    }
}
// Run if this script is executed directly
if (require.main === module) {
    main().catch((error) => {
        logger_1.logger.error('Startup failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=start-prod-claude.js.map