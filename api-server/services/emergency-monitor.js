/**
 * Emergency Monitor
 * Background monitor that checks for unhealthy workers and auto-kills them
 */

import { getHealthMonitor } from './worker-health-monitor.js';
import { getCircuitBreaker } from './circuit-breaker.js';

class EmergencyMonitor {
  constructor(options = {}) {
    this.interval = options.interval || 15000; // 15 seconds
    this.timer = null;
    this.running = false;
    this.healthMonitor = getHealthMonitor();
    this.circuitBreaker = getCircuitBreaker();
    this.killCallback = null; // Callback to kill workers
    this.stats = {
      checksPerformed: 0,
      workersKilled: 0,
      lastCheck: null
    };
  }

  /**
   * Start monitoring
   */
  start(killCallback) {
    if (this.running) {
      console.log('⚠️ Emergency monitor already running');
      return;
    }

    this.killCallback = killCallback;
    this.running = true;

    console.log(`🚨 Emergency monitor started (interval: ${this.interval}ms)`);

    this.timer = setInterval(() => {
      this.checkWorkers();
    }, this.interval);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.running) {
      console.log('⚠️ Emergency monitor not running');
      return;
    }

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.running = false;
    console.log('🛑 Emergency monitor stopped');
  }

  /**
   * Check for unhealthy workers and auto-kill
   */
  async checkWorkers() {
    this.stats.checksPerformed++;
    this.stats.lastCheck = Date.now();

    try {
      const unhealthyWorkers = this.healthMonitor.getUnhealthyWorkers();

      if (unhealthyWorkers.length === 0) {
        return; // All workers healthy
      }

      console.log(`🚨 Found ${unhealthyWorkers.length} unhealthy workers`);

      for (const worker of unhealthyWorkers) {
        await this.killWorker(worker);
      }
    } catch (error) {
      console.error('❌ Error in emergency monitor:', error);
    }
  }

  /**
   * Kill an unhealthy worker
   */
  async killWorker(worker) {
    console.log(`💀 Auto-killing worker ${worker.workerId}:`, worker.reason);

    try {
      // Record failure in circuit breaker
      this.circuitBreaker.recordFailure(worker.workerId, worker.reason);

      // Execute kill callback if provided
      if (this.killCallback) {
        await this.killCallback(worker);
      }

      // Update stats
      this.stats.workersKilled++;

      // Unregister from health monitor
      this.healthMonitor.unregister(worker.workerId);

      console.log(`✅ Worker ${worker.workerId} killed successfully`);
    } catch (error) {
      console.error(`❌ Failed to kill worker ${worker.workerId}:`, error);
    }
  }

  /**
   * Get monitor status
   */
  getStatus() {
    const healthStats = this.healthMonitor.getStats ? this.healthMonitor.getStats() : {};
    const circuitStats = this.circuitBreaker.getStats ? this.circuitBreaker.getStats() : {};

    return {
      running: this.running,
      interval: this.interval,
      stats: this.stats,
      healthSummary: healthStats,
      circuitBreakerState: circuitStats
    };
  }

  /**
   * Get streaming statistics
   */
  getStreamingStats() {
    const healthStats = this.healthMonitor.getStats ? this.healthMonitor.getStats() : {};
    const workers = healthStats.workers || [];
    const totalChunks = healthStats.totalChunks || 0;
    const avgChunks = workers.length > 0 ? totalChunks / workers.length : 0;
    const avgRuntime = healthStats.avgRuntime || 0;

    return {
      totalQueries: this.stats.checksPerformed,
      activeStreams: workers.length,
      autoKills: this.stats.workersKilled,
      avgChunksPerQuery: Math.round(avgChunks * 10) / 10,
      avgResponseTime: avgRuntime,
      loopDetections: this.stats.workersKilled,
      lastCheck: this.stats.lastCheck
    };
  }

  /**
   * Get cost estimate
   */
  getCostEstimate() {
    const healthStats = this.healthMonitor.getStats ? this.healthMonitor.getStats() : {};
    const totalChunks = healthStats.totalChunks || 0;

    // Rough estimates (actual costs depend on Claude API pricing)
    const avgInputTokensPerQuery = 1000;
    const avgOutputTokensPerChunk = 100;
    const totalInputTokens = this.stats.checksPerformed * avgInputTokensPerQuery;
    const totalOutputTokens = totalChunks * avgOutputTokensPerChunk;
    const totalTokens = totalInputTokens + totalOutputTokens;

    // Estimated cost (Claude API: ~$0.015 per 1K tokens input, ~$0.075 per 1K tokens output)
    const inputCost = (totalInputTokens / 1000) * 0.015;
    const outputCost = (totalOutputTokens / 1000) * 0.075;
    const estimatedCost = inputCost + outputCost;

    return {
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      tokensUsed: totalTokens,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      queriesProcessed: this.stats.checksPerformed,
      costPerQuery: this.stats.checksPerformed > 0
        ? Math.round((estimatedCost / this.stats.checksPerformed) * 100) / 100
        : 0
    };
  }

  /**
   * Manual worker kill
   */
  async manualKill(workerId, reason = 'Manual kill') {
    // Check if worker exists by getting stats
    const stats = this.healthMonitor.getStats ? this.healthMonitor.getStats() : {};
    const workers = stats.workers || [];
    const worker = workers.find(w => w.workerId === workerId);

    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    await this.killWorker({
      ...worker,
      reason
    });

    return {
      workerId,
      killed: true,
      reason
    };
  }
}

// Singleton instance
let emergencyMonitorInstance = null;

// Factory function (existing API)
export function getEmergencyMonitor() {
  if (!emergencyMonitorInstance) {
    emergencyMonitorInstance = new EmergencyMonitor();
  }
  return emergencyMonitorInstance;
}

// Add static getInstance method for compatibility
EmergencyMonitor.getInstance = function() {
  return getEmergencyMonitor();
};

// Add isRunning method for test compatibility
EmergencyMonitor.prototype.isRunning = function() {
  return this.running;
};

// Add onKill method for test compatibility
EmergencyMonitor.prototype.onKill = function(callback) {
  this.killCallback = callback;
};

export { EmergencyMonitor };
export default EmergencyMonitor;
