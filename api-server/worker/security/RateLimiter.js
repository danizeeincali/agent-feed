/**
 * RateLimiter - Rate Limiting for File Operations
 *
 * Security Features:
 * - Per-user operation limits
 * - Sliding window algorithm
 * - Automatic cleanup of expired entries
 * - Configurable limits and windows
 * - Statistics tracking
 */

export class RateLimiter {
  constructor(config = {}) {
    // Maximum operations per window (default: 10 operations)
    this.maxOperations = config.maxOperations || 10;

    // Time window in milliseconds (default: 1 minute)
    this.windowMs = config.windowMs || 60 * 1000;

    // Storage for user operation timestamps
    // Map<userId, Array<timestamp>>
    this.userOperations = new Map();

    // Cleanup interval (default: 5 minutes)
    this.cleanupInterval = config.cleanupInterval || 5 * 60 * 1000;

    // Start cleanup timer
    this.startCleanup();

    // Statistics
    this.stats = {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      uniqueUsers: 0
    };
  }

  /**
   * Check if operation is allowed for user
   * @param {string} userId - User identifier
   * @returns {{allowed: boolean, retryAfter?: number, remaining?: number}}
   */
  checkLimit(userId) {
    this.stats.totalRequests++;

    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get user's operations
    let operations = this.userOperations.get(userId) || [];

    // Filter operations within current window
    operations = operations.filter(timestamp => timestamp > windowStart);

    // Update storage
    this.userOperations.set(userId, operations);

    // Check if limit exceeded
    if (operations.length >= this.maxOperations) {
      this.stats.blockedRequests++;

      // Calculate retry after time
      const oldestOperation = operations[0];
      const retryAfter = Math.ceil((oldestOperation + this.windowMs - now) / 1000);

      return {
        allowed: false,
        retryAfter,
        remaining: 0,
        limit: this.maxOperations,
        windowMs: this.windowMs
      };
    }

    // Operation allowed
    this.stats.allowedRequests++;
    operations.push(now);
    this.userOperations.set(userId, operations);

    // Update unique users count
    this.stats.uniqueUsers = this.userOperations.size;

    return {
      allowed: true,
      remaining: this.maxOperations - operations.length,
      limit: this.maxOperations,
      windowMs: this.windowMs
    };
  }

  /**
   * Record an operation for a user
   * @param {string} userId - User identifier
   * @returns {{success: boolean, error?: string}}
   */
  recordOperation(userId) {
    const check = this.checkLimit(userId);

    if (!check.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Retry after ${check.retryAfter} seconds`,
        retryAfter: check.retryAfter
      };
    }

    return {
      success: true,
      remaining: check.remaining,
      limit: check.limit
    };
  }

  /**
   * Get current rate limit status for user
   * @param {string} userId - User identifier
   * @returns {{count: number, remaining: number, resetAt: Date}}
   */
  getStatus(userId) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const operations = (this.userOperations.get(userId) || [])
      .filter(timestamp => timestamp > windowStart);

    const oldestOperation = operations[0] || now;
    const resetAt = new Date(oldestOperation + this.windowMs);

    return {
      count: operations.length,
      remaining: Math.max(0, this.maxOperations - operations.length),
      limit: this.maxOperations,
      resetAt,
      windowMs: this.windowMs
    };
  }

  /**
   * Reset rate limit for specific user
   * @param {string} userId - User identifier
   */
  resetUser(userId) {
    this.userOperations.delete(userId);
  }

  /**
   * Reset all rate limits
   */
  resetAll() {
    this.userOperations.clear();
    this.stats.uniqueUsers = 0;
  }

  /**
   * Start automatic cleanup of expired entries
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);

    // Prevent the timer from keeping the process alive
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    let cleaned = 0;

    for (const [userId, operations] of this.userOperations.entries()) {
      const validOperations = operations.filter(timestamp => timestamp > windowStart);

      if (validOperations.length === 0) {
        // No operations in current window, remove user
        this.userOperations.delete(userId);
        cleaned++;
      } else if (validOperations.length !== operations.length) {
        // Some operations expired, update
        this.userOperations.set(userId, validOperations);
      }
    }

    this.stats.uniqueUsers = this.userOperations.size;

    if (cleaned > 0) {
      console.log(`[RateLimiter] Cleaned ${cleaned} expired entries`);
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      blockRate: this.stats.totalRequests > 0
        ? (this.stats.blockedRequests / this.stats.totalRequests * 100).toFixed(2) + '%'
        : '0%',
      allowRate: this.stats.totalRequests > 0
        ? (this.stats.allowedRequests / this.stats.totalRequests * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Reset statistics (but keep rate limit data)
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      uniqueUsers: this.userOperations.size
    };
  }

  /**
   * Export current state (for persistence)
   */
  exportState() {
    const state = {};
    for (const [userId, operations] of this.userOperations.entries()) {
      state[userId] = operations;
    }
    return {
      userOperations: state,
      stats: this.stats,
      config: {
        maxOperations: this.maxOperations,
        windowMs: this.windowMs
      }
    };
  }

  /**
   * Import state (for restoration)
   */
  importState(state) {
    if (state.userOperations) {
      this.userOperations.clear();
      for (const [userId, operations] of Object.entries(state.userOperations)) {
        this.userOperations.set(userId, operations);
      }
    }

    if (state.stats) {
      this.stats = { ...this.stats, ...state.stats };
    }
  }

  /**
   * Destroy rate limiter (cleanup)
   */
  destroy() {
    this.stopCleanup();
    this.userOperations.clear();
  }
}

/**
 * Multi-tier rate limiter with different limits for different operations
 */
export class TieredRateLimiter {
  constructor(config = {}) {
    this.limiters = new Map();

    // Default tiers
    const defaultTiers = {
      read: { maxOperations: 20, windowMs: 60000 },    // 20 reads per minute
      write: { maxOperations: 10, windowMs: 60000 },   // 10 writes per minute
      delete: { maxOperations: 5, windowMs: 60000 }    // 5 deletes per minute
    };

    const tiers = config.tiers || defaultTiers;

    // Create limiter for each tier
    for (const [tier, tierConfig] of Object.entries(tiers)) {
      this.limiters.set(tier, new RateLimiter(tierConfig));
    }
  }

  /**
   * Check limit for specific operation tier
   */
  checkLimit(userId, tier = 'write') {
    const limiter = this.limiters.get(tier);
    if (!limiter) {
      throw new Error(`Unknown tier: ${tier}`);
    }
    return limiter.checkLimit(userId);
  }

  /**
   * Record operation for specific tier
   */
  recordOperation(userId, tier = 'write') {
    const limiter = this.limiters.get(tier);
    if (!limiter) {
      throw new Error(`Unknown tier: ${tier}`);
    }
    return limiter.recordOperation(userId);
  }

  /**
   * Get status for all tiers
   */
  getStatus(userId) {
    const status = {};
    for (const [tier, limiter] of this.limiters.entries()) {
      status[tier] = limiter.getStatus(userId);
    }
    return status;
  }

  /**
   * Get combined statistics
   */
  getStats() {
    const stats = {};
    for (const [tier, limiter] of this.limiters.entries()) {
      stats[tier] = limiter.getStats();
    }
    return stats;
  }

  /**
   * Reset user across all tiers
   */
  resetUser(userId) {
    for (const limiter of this.limiters.values()) {
      limiter.resetUser(userId);
    }
  }

  /**
   * Reset all tiers
   */
  resetAll() {
    for (const limiter of this.limiters.values()) {
      limiter.resetAll();
    }
  }

  /**
   * Destroy all limiters
   */
  destroy() {
    for (const limiter of this.limiters.values()) {
      limiter.destroy();
    }
    this.limiters.clear();
  }
}

export default RateLimiter;
