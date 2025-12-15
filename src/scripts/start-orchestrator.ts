#!/usr/bin/env node
/**
 * Standalone AVI Orchestrator Startup Script
 * Phase 2: Independent orchestrator for testing and development
 *
 * This script can be run independently to start the orchestrator
 * without running the full Express server.
 *
 * Usage:
 *   npm run start:orchestrator
 *   node --loader ts-node/esm src/scripts/start-orchestrator.ts
 *   ts-node src/scripts/start-orchestrator.ts
 */

import { startOrchestrator, stopOrchestrator, getOrchestratorStatus } from '../avi/orchestrator-factory';

/**
 * Initialize environment variables with defaults
 */
function initializeEnvironment() {
  // Set defaults if not already set
  process.env.AVI_ORCHESTRATOR_ENABLED = process.env.AVI_ORCHESTRATOR_ENABLED || 'true';
  process.env.AVI_MAX_WORKERS = process.env.AVI_MAX_WORKERS || '10';
  process.env.AVI_CHECK_INTERVAL = process.env.AVI_CHECK_INTERVAL || '5000';
  process.env.AVI_HEALTH_MONITOR = process.env.AVI_HEALTH_MONITOR || 'true';
  process.env.AVI_HEALTH_INTERVAL = process.env.AVI_HEALTH_INTERVAL || '30000';
  process.env.AVI_SHUTDOWN_TIMEOUT = process.env.AVI_SHUTDOWN_TIMEOUT || '30000';
  process.env.AVI_CONTEXT_LIMIT = process.env.AVI_CONTEXT_LIMIT || '50000';
  process.env.AVI_WORKER_TIMEOUT = process.env.AVI_WORKER_TIMEOUT || '120000';

  console.log('🌍 Environment Configuration:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   AVI_MAX_WORKERS: ${process.env.AVI_MAX_WORKERS}`);
  console.log(`   AVI_CHECK_INTERVAL: ${process.env.AVI_CHECK_INTERVAL}ms`);
  console.log(`   AVI_HEALTH_MONITOR: ${process.env.AVI_HEALTH_MONITOR}`);
}

/**
 * Setup graceful shutdown handlers
 */
function setupShutdownHandlers() {
  // Handle SIGTERM (Docker/Kubernetes)
  process.on('SIGTERM', async () => {
    console.log('\n🛑 SIGTERM received, shutting down gracefully...');
    await shutdown();
  });

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    console.log('\n🛑 SIGINT received, shutting down gracefully...');
    await shutdown();
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    await shutdown(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
    await shutdown(1);
  });
}

/**
 * Graceful shutdown handler
 */
async function shutdown(exitCode: number = 0) {
  try {
    console.log('🔄 Stopping orchestrator...');
    await stopOrchestrator();
    console.log('✅ Orchestrator stopped successfully');
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    exitCode = exitCode || 1;
  }

  console.log(`\n👋 Exiting with code ${exitCode}`);
  process.exit(exitCode);
}

/**
 * Status monitoring interval
 */
let statusInterval: NodeJS.Timeout | null = null;

/**
 * Start status monitoring
 */
function startStatusMonitoring() {
  // Log status every 30 seconds
  statusInterval = setInterval(() => {
    const status = getOrchestratorStatus();

    if (status) {
      console.log('\n📊 Orchestrator Status:');
      console.log(`   Status: ${status.status}`);
      console.log(`   Active Workers: ${status.activeWorkers}`);
      console.log(`   Tickets Processed: ${status.ticketsProcessed}`);
      console.log(`   Workers Spawned: ${status.workersSpawned}`);
      console.log(`   Uptime: ${getUptime(status.startTime)}`);

      if (status.lastError) {
        console.log(`   ⚠️  Last Error: ${status.lastError}`);
      }
    } else {
      console.log('⚠️  Orchestrator status unavailable');
    }
  }, 30000); // 30 seconds
}

/**
 * Calculate uptime from start time
 */
function getUptime(startTime: Date): string {
  const uptimeMs = Date.now() - startTime.getTime();
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Stop status monitoring
 */
function stopStatusMonitoring() {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
}

/**
 * Main entry point
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║    AVI Orchestrator - Standalone Startup Script       ║');
  console.log('║    Phase 2: Production Orchestrator                    ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Initialize environment
    initializeEnvironment();

    // Setup shutdown handlers
    setupShutdownHandlers();

    // Start orchestrator
    console.log('\n🚀 Starting orchestrator...\n');
    await startOrchestrator();

    console.log('\n✅ Orchestrator started successfully!');
    console.log('📊 Monitoring work queue for pending tickets...');
    console.log('💡 Press Ctrl+C to stop gracefully\n');

    // Start status monitoring
    startStatusMonitoring();

    // Log initial status
    const status = getOrchestratorStatus();
    if (status) {
      console.log('📈 Initial Status:');
      console.log(`   Status: ${status.status}`);
      console.log(`   Max Workers: ${process.env.AVI_MAX_WORKERS}`);
      console.log(`   Check Interval: ${process.env.AVI_CHECK_INTERVAL}ms`);
    }

    // Keep process alive
    console.log('\n⏳ Orchestrator running... (will log status every 30 seconds)\n');
  } catch (error) {
    console.error('\n❌ Failed to start orchestrator:', error);

    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }

    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check that PostgreSQL is running and accessible');
    console.error('   2. Verify database connection settings in environment variables');
    console.error('   3. Ensure all required tables exist (run migrations)');
    console.error('   4. Check adapter initialization logs above');

    // Stop status monitoring and exit
    stopStatusMonitoring();
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Fatal error in main():', error);
  stopStatusMonitoring();
  process.exit(1);
});
