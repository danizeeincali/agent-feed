#!/usr/bin/env node

/**
 * Production Claude Instance Startup Script
 * Initializes and starts the production Claude WebSocket client
 */

import { prodClaudeService } from '@/services/prod-claude-service';
import { hubServer } from '@/websockets/hub-server';
import { logger } from '@/utils/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Stop production Claude service
    await prodClaudeService.stop();
    logger.info('Production Claude service stopped');
    
    // Stop hub server if running
    await hubServer.stop();
    logger.info('Hub server stopped');
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

/**
 * Main startup function
 */
async function main(): Promise<void> {
  try {
    logger.info('Starting Production Claude Instance...');
    
    // Check if we should start the hub server
    const startHub = process.argv.includes('--with-hub') || process.env.START_HUB === 'true';
    
    if (startHub) {
      logger.info('Starting WebSocket Hub Server...');
      await hubServer.start();
      logger.info('WebSocket Hub Server started on port 3001');
    }
    
    // Start production Claude service
    logger.info('Starting Production Claude Service...');
    await prodClaudeService.start();
    
    // Log status
    const status = prodClaudeService.getStatus();
    logger.info('Production Claude Instance started successfully', {
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
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
    
    logger.info('Production Claude Instance is ready and running');
    logger.info('Press Ctrl+C to shutdown gracefully');
    
  } catch (error) {
    logger.error('Failed to start Production Claude Instance:', error);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch((error) => {
    logger.error('Startup failed:', error);
    process.exit(1);
  });
}

export { main as startProdClaude };