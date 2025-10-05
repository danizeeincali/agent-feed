#!/usr/bin/env node

/**
 * API Server Process Monitor
 * Monitors server health and automatically restarts on crashes or high memory usage
 * Prevents exit code 137 (OOM kills) by proactive restart
 */

import { spawn } from 'child_process';
import fetch from 'node-fetch';
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  // Server configuration
  serverScript: join(__dirname, '../api-server/server.js'),
  serverPort: process.env.PORT || 3001,
  healthEndpoint: `http://localhost:${process.env.PORT || 3001}/health`,

  // Memory thresholds
  memoryWarningThreshold: 80, // Percentage
  memoryCriticalThreshold: 90, // Percentage - trigger restart
  maxMemoryMB: 500, // Absolute limit in MB

  // Monitoring configuration
  healthCheckInterval: 30000, // 30 seconds
  restartDelay: 5000, // Wait 5s before restarting
  maxConsecutiveFailures: 3, // Max failures before alerting

  // Logging
  logDir: join(__dirname, '../logs'),
  logFile: join(__dirname, '../logs/process-monitor.log'),
  errorLogFile: join(__dirname, '../logs/process-monitor-errors.log'),

  // Restart limits
  maxRestartsPerHour: 10,
  restartCooldown: 60000, // 1 minute between restarts
};

// State
const state = {
  serverProcess: null,
  isRunning: false,
  consecutiveFailures: 0,
  restarts: [],
  lastHealthCheck: null,
  startTime: Date.now(),
};

/**
 * Initialize logging directory
 */
function initLogging() {
  if (!existsSync(CONFIG.logDir)) {
    mkdirSync(CONFIG.logDir, { recursive: true });
  }
  log('Process Monitor Started', 'INFO');
  log(`Monitoring server at ${CONFIG.healthEndpoint}`, 'INFO');
}

/**
 * Log message to file and console
 */
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;

  console.log(logMessage.trim());

  try {
    appendFileSync(CONFIG.logFile, logMessage);
    if (level === 'ERROR' || level === 'CRITICAL') {
      appendFileSync(CONFIG.errorLogFile, logMessage);
    }
  } catch (error) {
    console.error('Failed to write log:', error.message);
  }
}

/**
 * Start the API server process
 */
function startServer() {
  if (state.serverProcess) {
    log('Server already running, skipping start', 'WARN');
    return;
  }

  log('Starting API server...', 'INFO');

  // Spawn server process
  state.serverProcess = spawn('node', [CONFIG.serverScript], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PORT: CONFIG.serverPort },
  });

  state.isRunning = true;
  state.consecutiveFailures = 0;

  // Handle server output
  state.serverProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    console.log(`[SERVER] ${output}`);
  });

  state.serverProcess.stderr.on('data', (data) => {
    const output = data.toString().trim();
    console.error(`[SERVER ERROR] ${output}`);
    log(`Server stderr: ${output}`, 'ERROR');
  });

  // Handle server exit
  state.serverProcess.on('exit', (code, signal) => {
    state.isRunning = false;
    state.serverProcess = null;

    if (code === 137) {
      log(`Server killed with exit code 137 (OOM)! Memory exhaustion detected.`, 'CRITICAL');
    } else if (code !== 0 && code !== null) {
      log(`Server exited with code ${code}, signal ${signal}`, 'ERROR');
    } else if (signal) {
      log(`Server terminated by signal ${signal}`, 'WARN');
    } else {
      log('Server exited normally', 'INFO');
    }

    // Auto-restart on crash (unless shutting down)
    if (code !== 0 || signal) {
      scheduleRestart('Server crashed');
    }
  });

  // Handle server errors
  state.serverProcess.on('error', (error) => {
    log(`Server process error: ${error.message}`, 'ERROR');
    state.isRunning = false;
    scheduleRestart('Server process error');
  });

  log('Server process started', 'INFO');
}

/**
 * Stop the server gracefully
 */
async function stopServer(signal = 'SIGTERM') {
  if (!state.serverProcess) {
    log('No server process to stop', 'WARN');
    return;
  }

  log(`Stopping server with ${signal}...`, 'INFO');

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (state.serverProcess) {
        log('Server did not stop gracefully, forcing kill', 'WARN');
        state.serverProcess.kill('SIGKILL');
      }
      resolve();
    }, 10000); // 10 second timeout

    state.serverProcess.once('exit', () => {
      clearTimeout(timeout);
      state.serverProcess = null;
      state.isRunning = false;
      log('Server stopped', 'INFO');
      resolve();
    });

    state.serverProcess.kill(signal);
  });
}

/**
 * Schedule a server restart
 */
async function scheduleRestart(reason) {
  // Check restart rate limits
  const now = Date.now();
  const recentRestarts = state.restarts.filter(
    (time) => now - time < 3600000 // Last hour
  );

  if (recentRestarts.length >= CONFIG.maxRestartsPerHour) {
    log(
      `Restart rate limit exceeded (${recentRestarts.length} restarts in last hour). Not restarting.`,
      'CRITICAL'
    );
    log('Manual intervention required!', 'CRITICAL');
    return;
  }

  log(`Scheduling restart: ${reason}`, 'INFO');
  state.restarts.push(now);

  // Wait for cooldown
  await new Promise((resolve) => setTimeout(resolve, CONFIG.restartDelay));

  // Stop server if running
  if (state.serverProcess) {
    await stopServer();
  }

  // Wait for cooldown
  await new Promise((resolve) => setTimeout(resolve, CONFIG.restartCooldown));

  // Start server
  startServer();
}

/**
 * Perform health check
 */
async function performHealthCheck() {
  if (!state.isRunning) {
    log('Server not running, skipping health check', 'WARN');
    state.consecutiveFailures++;

    if (state.consecutiveFailures >= CONFIG.maxConsecutiveFailures) {
      log('Too many consecutive failures, attempting restart', 'ERROR');
      await scheduleRestart('Health check failures');
    }
    return;
  }

  try {
    const response = await fetch(CONFIG.healthEndpoint, {
      timeout: 5000,
    });

    if (!response.ok) {
      throw new Error(`Health check failed with status ${response.status}`);
    }

    const health = await response.json();
    state.lastHealthCheck = health.data;
    state.consecutiveFailures = 0;

    // Check memory usage
    const heapPercentage = health.data.memory.heapPercentage;
    const heapUsedMB = health.data.memory.heapUsed;

    if (heapPercentage >= CONFIG.memoryCriticalThreshold || heapUsedMB >= CONFIG.maxMemoryMB) {
      log(
        `CRITICAL: Memory usage at ${heapPercentage}% (${heapUsedMB}MB). Triggering preemptive restart to prevent OOM kill.`,
        'CRITICAL'
      );
      await scheduleRestart('High memory usage');
      return;
    }

    if (heapPercentage >= CONFIG.memoryWarningThreshold) {
      log(
        `WARNING: Memory usage at ${heapPercentage}% (${heapUsedMB}MB)`,
        'WARN'
      );
    }

    // Check SSE connections
    if (health.data.resources.sseConnections > 40) {
      log(
        `High SSE connection count: ${health.data.resources.sseConnections}`,
        'WARN'
      );
    }

    // Log status periodically (every 10 health checks)
    if (Math.floor(Date.now() / CONFIG.healthCheckInterval) % 10 === 0) {
      log(
        `Health OK - Memory: ${heapUsedMB}MB (${heapPercentage}%), SSE: ${health.data.resources.sseConnections}, Status: ${health.data.status}`,
        'INFO'
      );
    }
  } catch (error) {
    state.consecutiveFailures++;
    log(`Health check failed: ${error.message}`, 'ERROR');

    if (state.consecutiveFailures >= CONFIG.maxConsecutiveFailures) {
      log(
        `${state.consecutiveFailures} consecutive health check failures. Restarting server.`,
        'ERROR'
      );
      await scheduleRestart('Health check failures');
    }
  }
}

/**
 * Start monitoring
 */
function startMonitoring() {
  log('Starting health monitoring...', 'INFO');

  // Perform health checks at regular intervals
  setInterval(() => {
    performHealthCheck();
  }, CONFIG.healthCheckInterval);

  // Perform initial health check after server startup delay
  setTimeout(() => {
    performHealthCheck();
  }, 5000);
}

/**
 * Handle shutdown signals
 */
function setupShutdownHandlers() {
  const shutdown = async (signal) => {
    log(`Received ${signal}, shutting down...`, 'INFO');

    // Stop health checks
    clearInterval();

    // Stop server
    if (state.serverProcess) {
      await stopServer(signal);
    }

    log('Process monitor stopped', 'INFO');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

/**
 * Print status report
 */
function printStatusReport() {
  const uptime = Math.floor((Date.now() - state.startTime) / 1000);
  const uptimeFormatted = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`;

  console.log('\n========================================');
  console.log('API Server Process Monitor - Status');
  console.log('========================================');
  console.log(`Monitor Uptime: ${uptimeFormatted}`);
  console.log(`Server Running: ${state.isRunning ? 'YES' : 'NO'}`);
  console.log(`Consecutive Failures: ${state.consecutiveFailures}`);
  console.log(`Total Restarts: ${state.restarts.length}`);

  if (state.lastHealthCheck) {
    console.log('\nLast Health Check:');
    console.log(`  Status: ${state.lastHealthCheck.status}`);
    console.log(`  Memory: ${state.lastHealthCheck.memory.heapUsed}MB / ${state.lastHealthCheck.memory.heapTotal}MB (${state.lastHealthCheck.memory.heapPercentage}%)`);
    console.log(`  SSE Connections: ${state.lastHealthCheck.resources.sseConnections}`);
    console.log(`  Ticker Messages: ${state.lastHealthCheck.resources.tickerMessages}`);
  }

  console.log('========================================\n');
}

// Main execution
async function main() {
  console.log('🔍 API Server Process Monitor');
  console.log('==============================\n');

  initLogging();
  setupShutdownHandlers();
  startServer();
  startMonitoring();

  // Print status report every 5 minutes
  setInterval(() => {
    printStatusReport();
  }, 300000);

  // Print initial status after 10 seconds
  setTimeout(() => {
    printStatusReport();
  }, 10000);
}

main().catch((error) => {
  log(`Fatal error: ${error.message}`, 'CRITICAL');
  console.error(error);
  process.exit(1);
});
