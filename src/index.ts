/**
 * Avi DM - Main Entry Point
 *
 * Starts the Avi DM orchestrator with:
 * - PostgreSQL connection
 * - Health monitoring
 * - Work queue processing
 * - Agent worker spawning
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { AviOrchestrator } from './avi/orchestrator';
import { StateManager } from './avi/state-manager';
import { HealthMonitor } from './avi/health-monitor';
import { WorkTicketQueue } from './queue/work-ticket';
import { WorkerSpawner } from './workers/worker-spawner';
import { WorkerPool } from './workers/worker-pool';
import { DatabaseManager } from './types/database-manager';

// Load environment variables
dotenv.config();

console.log('🚀 Starting Avi DM Orchestrator...\n');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'avidm_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'dev_password_change_in_production',
});

// Create database manager
const database: DatabaseManager = {
  query: async (text, params) => pool.query(text, params),
  connect: async () => pool.connect(),
  end: async () => pool.end(),
} as unknown as DatabaseManager;

// Initialize components
const stateManager = new StateManager(database);
const workQueue = new WorkTicketQueue();
const workerPool = new WorkerPool({ maxWorkers: 5 });

const workerSpawner = new WorkerSpawner({
  maxWorkers: 5,
  workerTimeout: 60000,
  database,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
});

// Create orchestrator
const orchestrator = new AviOrchestrator(
  database,
  workQueue,
  workerSpawner,
  stateManager
);

// Set up signal handlers for graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await orchestrator.gracefulShutdown();
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await orchestrator.gracefulShutdown();
  await pool.end();
  process.exit(0);
});

// Start orchestrator
async function start() {
  try {
    console.log('📊 Connecting to PostgreSQL...');
    await pool.query('SELECT 1');
    console.log('✅ Database connection established\n');

    console.log('🎯 Initializing Avi DM Orchestrator...');
    await orchestrator.initialize();
    console.log('✅ Orchestrator initialized\n');

    console.log('▶️  Starting orchestration loop...');
    await orchestrator.start();

  } catch (error) {
    console.error('❌ Failed to start Avi DM:', error);
    await pool.end();
    process.exit(1);
  }
}

// Start the application
start();
