/**
 * Health Monitor Usage Examples
 * Demonstrates how to integrate the health monitoring system
 */

import { HealthMonitor } from '../../../src/avi/health-monitor';
import { HealthConfig } from '../../../src/types/health';

// Example 1: Basic usage with default configuration
function basicUsage() {
  const monitor = new HealthMonitor();

  // Listen for restart signals
  monitor.on('restart-needed', (status) => {
    console.log('⚠️  Restart needed!', {
      contextTokens: status.contextTokens,
      warnings: status.warnings,
    });

    // Handle restart logic here
    // - Save conversation state
    // - Clear context
    // - Reload from database
  });

  // Start monitoring
  monitor.start();

  // Later: Stop monitoring
  setTimeout(() => {
    monitor.stop();
  }, 60000);
}

// Example 2: Custom configuration for production
function productionUsage() {
  const config: HealthConfig = {
    maxContextTokens: 100000,  // Higher limit for production
    checkInterval: 15000,      // Check every 15 seconds
    restartThreshold: 0.85,    // Restart at 85% to be safe
  };

  const monitor = new HealthMonitor(config);

  monitor.on('restart-needed', async (status) => {
    console.error('Context bloat detected', {
      tokens: status.contextTokens,
      maxTokens: config.maxContextTokens,
      percentage: (status.contextTokens / config.maxContextTokens * 100).toFixed(2),
    });

    // Perform graceful restart
    await performGracefulRestart(status);
  });

  monitor.start();
}

// Example 3: Custom token counter integration
function customTokenCounter() {
  // Mock Anthropic token counter
  let currentTokens = 0;

  const tokenCounter = () => {
    // In production, this would use @anthropic-ai/sdk
    // return Anthropic.countTokens(conversationContext);
    return currentTokens;
  };

  const monitor = new HealthMonitor(undefined, tokenCounter);

  // Simulate token growth
  setInterval(() => {
    currentTokens += 1000;
    const status = monitor.checkHealth();

    console.log(`Current tokens: ${status.contextTokens}, Healthy: ${status.healthy}`);
  }, 5000);

  monitor.start();
}

// Example 4: Manual health checks
function manualChecks() {
  const monitor = new HealthMonitor();

  // Check health before critical operations
  function performCriticalOperation() {
    const status = monitor.checkHealth();

    if (!status.healthy) {
      console.warn('System health compromised, deferring operation');
      return false;
    }

    // Proceed with operation
    console.log('System healthy, proceeding');
    return true;
  }

  // Check health periodically
  setInterval(() => {
    const metrics = monitor.getMetrics();
    console.log('Health metrics:', {
      healthy: metrics.healthy,
      tokens: metrics.contextTokens,
      uptime: `${(metrics.uptime / 1000).toFixed(0)}s`,
      warnings: metrics.warnings.length,
    });
  }, 10000);
}

// Example 5: Metrics dashboard integration
function metricsExport() {
  const monitor = new HealthMonitor();
  monitor.start();

  // Export metrics for dashboard/monitoring
  function exportMetrics() {
    const metrics = monitor.getMetrics();

    return {
      timestamp: metrics.lastCheck.toISOString(),
      health: {
        status: metrics.healthy ? 'healthy' : 'unhealthy',
        contextUsage: {
          current: metrics.contextTokens,
          max: 50000,
          percentage: (metrics.contextTokens / 50000 * 100).toFixed(2),
        },
        uptime: metrics.uptime,
        warnings: metrics.warnings,
      },
      shouldRestart: monitor.shouldRestart(),
    };
  }

  // Send to monitoring service
  setInterval(() => {
    const data = exportMetrics();
    // sendToMonitoringService(data);
    console.log('Metrics:', JSON.stringify(data, null, 2));
  }, 30000);
}

// Helper function for graceful restart
async function performGracefulRestart(status: any): Promise<void> {
  console.log('Starting graceful restart...');

  // 1. Save current conversation state to database
  // await saveConversationState();

  // 2. Clear in-memory context
  // clearContext();

  // 3. Reload essential context from database
  // await loadEssentialContext();

  // 4. Reset health monitor
  // monitor.stop();
  // monitor.start();

  console.log('Graceful restart completed');
}

// Export examples
export {
  basicUsage,
  productionUsage,
  customTokenCounter,
  manualChecks,
  metricsExport,
};
