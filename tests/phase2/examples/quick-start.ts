/**
 * Health Monitor Quick Start Guide
 * Copy-paste examples to get started quickly
 */

import { HealthMonitor } from '../../../src/avi/health-monitor';
import { HealthConfig, HealthStatus } from '../../../src/types/health';

// ============================================================================
// EXAMPLE 1: Minimal Setup (2 lines)
// ============================================================================

const monitor = new HealthMonitor();
monitor.on('restart-needed', (status) => console.log('Restart!', status));
monitor.start();

// ============================================================================
// EXAMPLE 2: Production Setup with Logging
// ============================================================================

function setupProductionMonitor() {
  const config: HealthConfig = {
    maxContextTokens: 100000,
    checkInterval: 30000,
    restartThreshold: 0.85,
  };

  const monitor = new HealthMonitor(config);

  monitor.on('restart-needed', async (status: HealthStatus) => {
    console.error('🚨 RESTART NEEDED', {
      tokens: status.contextTokens,
      warnings: status.warnings,
      uptime: `${(status.uptime / 1000 / 60).toFixed(1)} minutes`,
    });

    // Your restart logic here
    await handleRestart(status);
  });

  monitor.start();

  return monitor;
}

// ============================================================================
// EXAMPLE 3: Manual Health Checks
// ============================================================================

function checkHealthBeforeOperation(monitor: HealthMonitor): boolean {
  const status = monitor.checkHealth();

  if (!status.healthy) {
    console.warn('⚠️ System unhealthy, aborting operation');
    return false;
  }

  console.log('✅ System healthy, proceeding');
  return true;
}

// ============================================================================
// EXAMPLE 4: Metrics Dashboard
// ============================================================================

function startMetricsDashboard(monitor: HealthMonitor) {
  setInterval(() => {
    const metrics = monitor.getMetrics();

    console.log({
      timestamp: new Date().toISOString(),
      healthy: metrics.healthy ? '✅' : '❌',
      tokens: metrics.contextTokens,
      uptime: `${(metrics.uptime / 1000).toFixed(0)}s`,
      warnings: metrics.warnings.length,
    });
  }, 10000);
}

// ============================================================================
// EXAMPLE 5: Graceful Shutdown
// ============================================================================

function setupGracefulShutdown(monitor: HealthMonitor) {
  process.on('SIGTERM', () => {
    console.log('Shutting down health monitor...');
    monitor.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('Shutting down health monitor...');
    monitor.stop();
    process.exit(0);
  });
}

// ============================================================================
// EXAMPLE 6: Custom Token Counter
// ============================================================================

function setupWithTokenCounter() {
  // Mock token counter (replace with real implementation)
  let currentTokens = 0;

  const tokenCounter = () => {
    // In production: return Anthropic.countTokens(context);
    return currentTokens;
  };

  const monitor = new HealthMonitor(undefined, tokenCounter);

  // Simulate token growth
  setInterval(() => {
    currentTokens += 1000;
  }, 1000);

  monitor.start();
  return monitor;
}

// ============================================================================
// EXAMPLE 7: Complete Application Setup
// ============================================================================

class Application {
  private healthMonitor: HealthMonitor;

  constructor() {
    this.healthMonitor = new HealthMonitor({
      maxContextTokens: 50000,
      checkInterval: 30000,
      restartThreshold: 0.9,
    });

    this.setupHealthMonitoring();
  }

  private setupHealthMonitoring() {
    this.healthMonitor.on('restart-needed', this.handleRestart.bind(this));
    this.healthMonitor.start();

    // Setup graceful shutdown
    setupGracefulShutdown(this.healthMonitor);
  }

  private async handleRestart(status: HealthStatus) {
    console.log('Starting graceful restart...');

    // 1. Save state
    await this.saveState();

    // 2. Clear context
    this.clearContext();

    // 3. Reload
    await this.reload();

    console.log('Restart complete');
  }

  private async saveState() {
    // Your state saving logic
  }

  private clearContext() {
    // Your context clearing logic
  }

  private async reload() {
    // Your reload logic
  }

  public getHealth(): HealthStatus {
    return this.healthMonitor.getMetrics();
  }

  public shutdown() {
    this.healthMonitor.stop();
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function handleRestart(status: HealthStatus): Promise<void> {
  // Implement your restart logic here
  console.log('Performing restart with status:', status);
}

// ============================================================================
// Export Examples
// ============================================================================

export {
  setupProductionMonitor,
  checkHealthBeforeOperation,
  startMetricsDashboard,
  setupGracefulShutdown,
  setupWithTokenCounter,
  Application,
};

// ============================================================================
// Usage
// ============================================================================

/*

// Copy this to your application:

import { HealthMonitor } from './src/avi/health-monitor';

const monitor = new HealthMonitor();

monitor.on('restart-needed', async (status) => {
  console.log('Restart needed:', status);
  // Your restart logic here
});

monitor.start();

// Later, to stop:
monitor.stop();

*/
