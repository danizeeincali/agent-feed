/**
 * Orchestrator Factory
 * Phase 2: Factory pattern for orchestrator initialization
 *
 * This factory handles:
 * - Initialization of all 4 adapters
 * - Dependency injection into orchestrator
 * - Error handling during initialization
 * - Singleton pattern for orchestrator instance
 */

import { AviOrchestrator } from './orchestrator';
import { WorkQueueAdapter } from '../adapters/work-queue.adapter';
import { HealthMonitorAdapter } from '../adapters/health-monitor.adapter';
import { WorkerSpawnerAdapter } from '../adapters/worker-spawner.adapter';
import { AviDatabaseAdapter } from '../adapters/avi-database.adapter';
import aviConfig from '../config/avi.config';

/**
 * Singleton orchestrator instance
 */
let orchestratorInstance: AviOrchestrator | null = null;

/**
 * Track initialization state
 */
let isInitializing = false;

/**
 * Initialize all adapters
 * Returns initialized adapter instances or throws on error
 */
async function initializeAdapters() {
  try {
    console.log('🔧 Initializing AVI adapters...');

    // 1. Work Queue Adapter (no dependencies)
    const workQueueAdapter = new WorkQueueAdapter();
    console.log('   ✅ Work Queue Adapter initialized');

    // 2. Health Monitor Adapter (depends on work queue for stats)
    const healthMonitorAdapter = new HealthMonitorAdapter(
      workQueueAdapter,
      aviConfig.healthCheckInterval
    );
    console.log('   ✅ Health Monitor Adapter initialized');

    // 3. Worker Spawner Adapter (requires database manager)
    // Note: Database manager will be passed when creating worker spawner
    const workerSpawnerAdapter = new WorkerSpawnerAdapter();
    console.log('   ✅ Worker Spawner Adapter initialized');

    // 4. AVI Database Adapter (no dependencies)
    const aviDatabaseAdapter = new AviDatabaseAdapter();
    console.log('   ✅ AVI Database Adapter initialized');

    return {
      workQueue: workQueueAdapter,
      healthMonitor: healthMonitorAdapter,
      workerSpawner: workerSpawnerAdapter,
      database: aviDatabaseAdapter,
    };
  } catch (error) {
    console.error('❌ Failed to initialize adapters:', error);
    throw new Error(`Adapter initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create orchestrator instance with dependency injection
 * Singleton pattern - returns existing instance if already created
 */
export async function createOrchestrator(): Promise<AviOrchestrator> {
  // Return existing instance if available
  if (orchestratorInstance) {
    console.log('♻️  Returning existing orchestrator instance');
    return orchestratorInstance;
  }

  // Prevent concurrent initialization
  if (isInitializing) {
    throw new Error('Orchestrator initialization already in progress');
  }

  try {
    isInitializing = true;
    console.log('🚀 Creating AVI Orchestrator instance...');

    // Initialize all adapters
    const adapters = await initializeAdapters();

    // Create orchestrator with dependency injection
    orchestratorInstance = new AviOrchestrator(
      aviConfig,
      adapters.workQueue,
      adapters.healthMonitor,
      adapters.workerSpawner,
      adapters.database
    );

    console.log('✅ Orchestrator instance created successfully');
    return orchestratorInstance;
  } catch (error) {
    console.error('❌ Failed to create orchestrator:', error);
    orchestratorInstance = null;
    throw error;
  } finally {
    isInitializing = false;
  }
}

/**
 * Get existing orchestrator instance
 * Returns null if not yet created
 */
export function getOrchestrator(): AviOrchestrator | null {
  return orchestratorInstance;
}

/**
 * Start orchestrator (creates if needed, then starts)
 */
export async function startOrchestrator(): Promise<void> {
  try {
    console.log('🎬 Starting AVI Orchestrator...');

    // Create orchestrator if it doesn't exist
    const orchestrator = await createOrchestrator();

    // Start the orchestrator
    await orchestrator.start();

    console.log('✅ AVI Orchestrator started successfully');
  } catch (error) {
    console.error('❌ Failed to start orchestrator:', error);
    throw error;
  }
}

/**
 * Stop orchestrator gracefully
 */
export async function stopOrchestrator(): Promise<void> {
  if (!orchestratorInstance) {
    console.log('ℹ️  No orchestrator instance to stop');
    return;
  }

  try {
    console.log('🛑 Stopping AVI Orchestrator...');
    await orchestratorInstance.stop();
    console.log('✅ AVI Orchestrator stopped successfully');

    // Clear instance after stopping
    orchestratorInstance = null;
  } catch (error) {
    console.error('❌ Error stopping orchestrator:', error);
    throw error;
  }
}

/**
 * Get orchestrator status
 * Returns null if orchestrator not created
 */
export function getOrchestratorStatus() {
  if (!orchestratorInstance) {
    return null;
  }

  return orchestratorInstance.getState();
}

/**
 * Health check for orchestrator
 * Returns true if orchestrator exists and is running
 */
export function isOrchestratorHealthy(): boolean {
  if (!orchestratorInstance) {
    return false;
  }

  const state = orchestratorInstance.getState();
  return state.status === 'running';
}
