import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load safety limits configuration
const configPath = path.join(__dirname, '..', 'config', 'safety-limits.json');
let safetyLimits = {
  workerHealth: {
    maxRuntime: 600000,
    heartbeatTimeout: 60000,
    maxChunks: 100
  }
};

try {
  const configData = fs.readFileSync(configPath, 'utf8');
  safetyLimits = JSON.parse(configData);
} catch (error) {
  console.warn('Failed to load safety-limits.json, using defaults:', error.message);
}

/**
 * WorkerHealthMonitor - Singleton that tracks worker health and identifies unhealthy workers
 *
 * Monitors:
 * - Worker runtime (max 10 minutes)
 * - Heartbeat status (must update every 60 seconds)
 * - Chunk count (max 100 chunks)
 */
class WorkerHealthMonitorSingleton {
  constructor(customConfig = {}) {
    if (WorkerHealthMonitorSingleton.instance) {
      return WorkerHealthMonitorSingleton.instance;
    }

    this.workers = new Map();

    // Merge configuration
    this.config = {
      maxRuntime: safetyLimits.workerHealth.maxRuntime,
      heartbeatTimeout: safetyLimits.workerHealth.heartbeatTimeout,
      maxChunks: safetyLimits.workerHealth.maxChunks,
      ...customConfig
    };

    WorkerHealthMonitorSingleton.instance = this;
  }

  /**
   * Register a new worker for monitoring
   * @param {string} workerId - Unique worker identifier
   * @param {string} ticketId - Associated ticket ID
   */
  registerWorker(workerId, ticketId) {
    const now = Date.now();

    this.workers.set(workerId, {
      workerId,
      ticketId,
      startTime: now,
      lastHeartbeat: now,
      chunkCount: 0
    });

    console.log(`[WorkerHealthMonitor] Registered worker: ${workerId} for ticket: ${ticketId}`);
  }

  /**
   * Update worker heartbeat
   * @param {string} workerId - Worker identifier
   * @param {number} chunkCount - Current chunk count (optional)
   */
  updateHeartbeat(workerId, chunkCount = null) {
    const worker = this.workers.get(workerId);
    if (!worker) {
      console.warn(`[WorkerHealthMonitor] Attempted to update non-existent worker: ${workerId}`);
      return;
    }

    worker.lastHeartbeat = Date.now();

    if (chunkCount !== null) {
      worker.chunkCount = chunkCount;
    } else {
      worker.chunkCount++;
    }
  }

  /**
   * Unregister a worker from monitoring
   * @param {string} workerId - Worker identifier
   */
  unregisterWorker(workerId) {
    const deleted = this.workers.delete(workerId);
    if (deleted) {
      console.log(`[WorkerHealthMonitor] Unregistered worker: ${workerId}`);
    }
  }

  /**
   * Get list of unhealthy workers
   * @returns {Array} Array of unhealthy worker objects with details
   */
  getUnhealthyWorkers() {
    const now = Date.now();
    const unhealthy = [];

    for (const [workerId, worker] of this.workers.entries()) {
      const runtime = now - worker.startTime;
      const timeSinceHeartbeat = now - worker.lastHeartbeat;
      const issues = [];

      // Check runtime
      if (runtime > this.config.maxRuntime) {
        issues.push(`Runtime exceeds ${this.config.maxRuntime / 60000} minutes`);
      }

      // Check heartbeat
      if (timeSinceHeartbeat > this.config.heartbeatTimeout) {
        issues.push(`No heartbeat for ${timeSinceHeartbeat / 1000} seconds`);
      }

      // Check chunk count
      if (worker.chunkCount > this.config.maxChunks) {
        issues.push(`Excessive chunks: ${worker.chunkCount}`);
      }

      if (issues.length > 0) {
        unhealthy.push({
          workerId: worker.workerId,
          ticketId: worker.ticketId,
          reason: issues.join('; '),
          runtime,
          chunkCount: worker.chunkCount,
          timeSinceHeartbeat,
          startTime: worker.startTime,
          lastHeartbeat: worker.lastHeartbeat
        });
      }
    }

    return unhealthy;
  }

  /**
   * Get health status for specific worker
   * @param {string} workerId - Worker identifier
   * @returns {Object|null} Worker health status or null if not found
   */
  getWorkerHealth(workerId) {
    const worker = this.workers.get(workerId);
    if (!worker) {
      return null;
    }

    const now = Date.now();
    const runtime = now - worker.startTime;
    const timeSinceLastHeartbeat = now - worker.lastHeartbeat;
    const issues = [];

    // Check health criteria
    if (runtime > this.config.maxRuntime) {
      issues.push(`Runtime exceeds ${this.config.maxRuntime / 60000} minutes`);
    }

    if (timeSinceLastHeartbeat > this.config.heartbeatTimeout) {
      issues.push(`No heartbeat for ${timeSinceLastHeartbeat / 1000} seconds`);
    }

    if (worker.chunkCount > this.config.maxChunks) {
      issues.push(`Excessive chunks: ${worker.chunkCount}`);
    }

    return {
      workerId: worker.workerId,
      ticketId: worker.ticketId,
      runtime,
      chunkCount: worker.chunkCount,
      timeSinceLastHeartbeat,
      isHealthy: issues.length === 0,
      issues,
      startTime: worker.startTime,
      lastHeartbeat: worker.lastHeartbeat
    };
  }

  /**
   * Get overall monitor statistics
   * @returns {Object} Statistics about all workers
   */
  getStats() {
    const unhealthyWorkers = this.getUnhealthyWorkers();
    let totalChunks = 0;

    for (const worker of this.workers.values()) {
      totalChunks += worker.chunkCount;
    }

    return {
      totalWorkers: this.workers.size,
      healthyWorkers: this.workers.size - unhealthyWorkers.length,
      unhealthyWorkers: unhealthyWorkers.length,
      totalChunks,
      config: this.config
    };
  }
}

// Export singleton instance
export const WorkerHealthMonitor = WorkerHealthMonitorSingleton;
export default WorkerHealthMonitorSingleton;

// Factory function for backward compatibility
export function getHealthMonitor() {
  return new WorkerHealthMonitorSingleton();
}
