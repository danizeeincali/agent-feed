import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load safety limits configuration
const configPath = path.join(__dirname, '..', 'config', 'safety-limits.json');
let safetyLimits = {
  costTracking: {
    costPerMinute: 0.05,
    costPerChunk: 0.001,
    alertThreshold: 0.50
  }
};

try {
  const configData = fs.readFileSync(configPath, 'utf8');
  safetyLimits = JSON.parse(configData);
} catch (error) {
  console.warn('Failed to load safety-limits.json, using defaults:', error.message);
}

/**
 * CostMonitor - Tracks and monitors API costs for worker operations
 *
 * Cost calculation:
 * - $0.05 per minute of runtime
 * - $0.001 per streaming chunk
 * - Alerts when cost exceeds $0.50 threshold
 */
export class CostMonitor {
  constructor(customConfig = {}) {
    this.workerCosts = new Map();
    this.totalCost = 0;

    // Merge configuration
    this.config = {
      costPerMinute: safetyLimits.costTracking.costPerMinute,
      costPerChunk: safetyLimits.costTracking.costPerChunk,
      alertThreshold: safetyLimits.costTracking.alertThreshold,
      ...customConfig
    };
  }

  /**
   * Track cost for a worker
   * @param {string} workerId - Worker identifier
   * @param {number} duration - Duration in milliseconds
   * @param {number} chunks - Number of chunks processed
   */
  trackWorkerCost(workerId, duration, chunks) {
    // Calculate cost components
    const durationMinutes = duration / 60000;
    const durationCost = durationMinutes * this.config.costPerMinute;
    const chunkCost = chunks * this.config.costPerChunk;
    const cost = durationCost + chunkCost;

    // Get or create worker cost entry
    if (!this.workerCosts.has(workerId)) {
      this.workerCosts.set(workerId, {
        workerId,
        totalCost: 0,
        totalDuration: 0,
        totalChunks: 0,
        entries: []
      });
    }

    const workerCost = this.workerCosts.get(workerId);

    // Add entry
    workerCost.entries.push({
      timestamp: Date.now(),
      duration,
      chunks,
      cost
    });

    // Update totals
    workerCost.totalCost += cost;
    workerCost.totalDuration += duration;
    workerCost.totalChunks += chunks;

    // Update global total
    this.totalCost += cost;

    console.log(
      `[CostMonitor] Tracked cost for worker ${workerId}: $${cost.toFixed(3)} ` +
      `(${durationMinutes.toFixed(1)} min, ${chunks} chunks)`
    );
  }

  /**
   * Check if worker cost exceeds alert threshold
   * @param {string} workerId - Worker identifier
   * @returns {Object|null} Alert object if threshold exceeded, null otherwise
   */
  alertHighCost(workerId) {
    const workerCost = this.workerCosts.get(workerId);
    if (!workerCost) {
      return null;
    }

    const shouldAlert = workerCost.totalCost > this.config.alertThreshold;

    return {
      shouldAlert,
      workerId,
      cost: workerCost.totalCost,
      threshold: this.config.alertThreshold,
      duration: workerCost.totalDuration,
      chunks: workerCost.totalChunks,
      message: shouldAlert
        ? `Worker ${workerId} cost ($${workerCost.totalCost.toFixed(2)}) exceeds threshold ($${this.config.alertThreshold})`
        : `Worker ${workerId} cost is within threshold`
    };
  }

  /**
   * Get total cost across all workers
   * @returns {number} Total cost
   */
  getTotalCost() {
    return this.totalCost;
  }

  /**
   * Get cost for specific worker
   * @param {string} workerId - Worker identifier
   * @returns {number} Worker cost
   */
  getWorkerCost(workerId) {
    const workerCost = this.workerCosts.get(workerId);
    return workerCost ? workerCost.totalCost : 0;
  }

  /**
   * Get comprehensive cost statistics
   * @returns {Object} Cost statistics
   */
  getStats() {
    const stats = {
      totalWorkers: this.workerCosts.size,
      totalCost: this.totalCost,
      averageCostPerWorker: this.workerCosts.size > 0 ? this.totalCost / this.workerCosts.size : 0,
      workersAboveThreshold: 0,
      highCostWorkers: [],
      config: this.config
    };

    // Identify workers above threshold
    for (const [workerId, workerCost] of this.workerCosts.entries()) {
      if (workerCost.totalCost > this.config.alertThreshold) {
        stats.workersAboveThreshold++;
        stats.highCostWorkers.push({
          workerId,
          cost: workerCost.totalCost,
          duration: workerCost.totalDuration,
          chunks: workerCost.totalChunks
        });
      }
    }

    return stats;
  }

  /**
   * Reset all cost tracking
   */
  reset() {
    this.workerCosts.clear();
    this.totalCost = 0;
    console.log('[CostMonitor] Reset all cost tracking');
  }
}
