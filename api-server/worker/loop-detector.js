import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load safety limits configuration
const configPath = path.join(__dirname, '..', 'config', 'safety-limits.json');
let safetyLimits = {
  detection: {
    loopThreshold: 10,
    loopWindow: 10000,
    stagnantThreshold: 30000
  }
};

try {
  const configData = fs.readFileSync(configPath, 'utf8');
  safetyLimits = JSON.parse(configData);
} catch (error) {
  console.warn('Failed to load safety-limits.json, using defaults:', error.message);
}

/**
 * StreamingLoopDetector - Detects infinite streaming loops in real-time
 *
 * Detects two types of issues:
 * 1. Repetitive chunks - More than 10 chunks in 10 seconds
 * 2. Stagnant stream - No progress for 30 seconds
 */
export class StreamingLoopDetector {
  constructor(workerId, customConfig = {}) {
    this.workerId = workerId;
    this.timestamps = [];
    this.lastProgress = Date.now();

    // Merge configuration
    this.config = {
      loopThreshold: safetyLimits.detection.loopThreshold,
      windowSize: safetyLimits.detection.loopWindow,
      stagnantThreshold: safetyLimits.detection.stagnantThreshold,
      ...customConfig
    };
  }

  /**
   * Check for streaming loop patterns
   * @param {Object} message - Streaming message chunk
   * @returns {Object} Detection result with detected flag and reason
   */
  check(message) {
    const now = Date.now();

    // Check for stagnation BEFORE updating lastProgress
    // (to detect if we were stagnant before this call)
    const stagnationResult = this.detectStagnation();
    if (stagnationResult.detected) {
      return stagnationResult;
    }

    // Track timestamp and update progress after stagnation check
    this.timestamps.push(now);
    this.lastProgress = now;

    // Check for repetitive chunks
    const loopResult = this.detectLoop(message);
    if (loopResult.detected) {
      return loopResult;
    }

    return { detected: false, reason: null };
  }

  /**
   * Detect repetitive chunks pattern
   * @param {Object} message - Streaming message chunk
   * @returns {Object} Detection result
   */
  detectLoop(message) {
    // Note: Timestamp tracking happens in check() method to avoid duplication
    // When called directly (like in tests), we need to track here too
    const now = Date.now();

    // Only track if not already tracked (check if last timestamp is current time)
    if (this.timestamps.length === 0 || this.timestamps[this.timestamps.length - 1] !== now) {
      this.timestamps.push(now);
      this.lastProgress = now;
    }

    // Count chunks in recent window
    const recentChunks = this.countChunksInWindow(now - this.config.windowSize, now);

    if (recentChunks > this.config.loopThreshold) {
      return {
        detected: true,
        reason: 'REPETITIVE_CHUNKS',
        details: `More than ${this.config.loopThreshold} chunks in ${this.config.windowSize / 1000} seconds`,
        chunkCount: recentChunks
      };
    }

    return { detected: false, reason: null };
  }

  /**
   * Detect stream stagnation
   * @returns {Object} Detection result
   */
  detectStagnation() {
    const now = Date.now();
    const timeSinceLastProgress = now - this.lastProgress;

    if (timeSinceLastProgress > this.config.stagnantThreshold) {
      return {
        detected: true,
        reason: 'STAGNANT_STREAM',
        details: `No progress for ${this.config.stagnantThreshold / 1000} seconds`,
        timeSinceLastProgress
      };
    }

    return { detected: false, reason: null };
  }

  /**
   * Count chunks within a time window
   * @param {number} startTime - Window start timestamp
   * @param {number} endTime - Window end timestamp
   * @returns {number} Count of chunks in window
   */
  countChunksInWindow(startTime, endTime) {
    return this.timestamps.filter(ts => ts >= startTime && ts <= endTime).length;
  }

  /**
   * Reset detector state
   */
  reset() {
    this.timestamps = [];
    this.lastProgress = Date.now();
  }

  /**
   * Get detector statistics
   * @returns {Object} Statistics about the detector state
   */
  getStats() {
    const now = Date.now();
    const recentChunks = this.countChunksInWindow(now - this.config.windowSize, now);
    const timeSinceLastChunk = now - this.lastProgress;

    const loopDetected = recentChunks > this.config.loopThreshold;
    const stagnant = timeSinceLastChunk > this.config.stagnantThreshold;

    return {
      workerId: this.workerId,
      totalChunks: this.timestamps.length,
      recentChunks,
      timeSinceLastChunk,
      isHealthy: !loopDetected && !stagnant,
      loopDetected,
      stagnant
    };
  }
}

export default StreamingLoopDetector;
