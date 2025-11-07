import dbManager from '../database.js';

/**
 * Cost Monitoring Service
 * Tracks cache token usage and calculates associated costs
 * Provides alerts when costs exceed thresholds
 */
class CostMonitoringService {
  constructor() {
    // Pricing for Claude Sonnet 4 (per 1K tokens)
    this.CACHE_WRITE_COST_PER_1K = 0.00375;  // $3.75 per million tokens
    this.CACHE_READ_COST_PER_1K = 0.000375;   // $0.375 per million tokens
    this.INPUT_COST_PER_1K = 0.003;           // $3.00 per million tokens (standard input)
    this.ALERT_THRESHOLD_USD = 5.0;           // Alert when daily cost exceeds $5
    this.lastAlert = null;
  }

  /**
   * Record cache usage metrics to database
   * @param {Object} params - Cache usage parameters
   * @param {number} params.cache_write_tokens - Number of cache write tokens
   * @param {number} params.cache_read_tokens - Number of cache read tokens
   * @param {number} params.timestamp - Unix timestamp in milliseconds
   * @returns {Promise<Object>} Cost breakdown
   */
  async recordCacheUsage({ cache_write_tokens, cache_read_tokens, timestamp }) {
    if (!cache_write_tokens && cache_write_tokens !== 0) {
      throw new Error('cache_write_tokens is required');
    }
    if (!cache_read_tokens && cache_read_tokens !== 0) {
      throw new Error('cache_read_tokens is required');
    }
    if (!timestamp) {
      throw new Error('timestamp is required');
    }

    const cost = this.calculateCost({ cache_write_tokens, cache_read_tokens });
    const date = new Date(timestamp).toISOString().split('T')[0];

    try {
      const db = dbManager.getDatabase();
      db.prepare(`
        INSERT INTO cache_cost_metrics (
          date, cache_write_tokens, cache_read_tokens,
          cache_write_cost_usd, cache_read_cost_usd, total_cost_usd,
          timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        date,
        cache_write_tokens,
        cache_read_tokens,
        cost.cache_write_cost_usd,
        cost.cache_read_cost_usd,
        cost.total_cost_usd,
        timestamp
      );

      // Check if daily cost threshold exceeded
      const aggregated = await this.getAggregatedDailyMetrics();
      await this.checkCostThreshold({ daily_cost_usd: aggregated.total_cost_usd });

      return cost;
    } catch (error) {
      console.error('Failed to record cache usage:', error);
      throw error;
    }
  }

  /**
   * Calculate cost breakdown from token usage
   * @param {Object} params - Token usage parameters
   * @param {number} params.cache_write_tokens - Number of cache write tokens
   * @param {number} params.cache_read_tokens - Number of cache read tokens
   * @returns {Object} Cost breakdown in USD
   */
  calculateCost({ cache_write_tokens = 0, cache_read_tokens = 0 }) {
    const cache_write_cost_usd = (cache_write_tokens / 1000) * this.CACHE_WRITE_COST_PER_1K;
    const cache_read_cost_usd = (cache_read_tokens / 1000) * this.CACHE_READ_COST_PER_1K;

    return {
      cache_write_cost_usd: Number(cache_write_cost_usd.toFixed(4)),
      cache_read_cost_usd: Number(cache_read_cost_usd.toFixed(4)),
      total_cost_usd: Number((cache_write_cost_usd + cache_read_cost_usd).toFixed(4))
    };
  }

  /**
   * Check if daily cost exceeds threshold and trigger alert
   * @param {Object} params - Cost parameters
   * @param {number} params.daily_cost_usd - Daily cost in USD
   * @returns {Promise<boolean>} True if threshold exceeded
   */
  async checkCostThreshold({ daily_cost_usd }) {
    if (daily_cost_usd > this.ALERT_THRESHOLD_USD) {
      this.lastAlert = `⚠️ Cost threshold exceeded: $${daily_cost_usd.toFixed(2)}/day (threshold: $${this.ALERT_THRESHOLD_USD})`;
      console.warn(this.lastAlert);

      // TODO: Send email/Slack notification
      // await this.sendAlertNotification(this.lastAlert);

      return true;
    }
    return false;
  }

  /**
   * Calculate cache hit ratio (percentage of reads vs total cache usage)
   * @param {Object} params - Token usage parameters
   * @param {number} params.cache_read_tokens - Number of cache read tokens
   * @param {number} params.cache_write_tokens - Number of cache write tokens
   * @returns {number} Cache hit ratio as percentage (0-100)
   */
  calculateCacheHitRatio({ cache_read_tokens, cache_write_tokens }) {
    if (cache_write_tokens === 0) return 0;
    const total = cache_read_tokens + cache_write_tokens;
    return Number(((cache_read_tokens / total) * 100).toFixed(2));
  }

  /**
   * Get daily metrics for today
   * @returns {Promise<Object>} Daily metrics
   */
  async getDailyMetrics() {
    const today = new Date().toISOString().split('T')[0];
    return await this.getMetricsByDate(today);
  }

  /**
   * Get metrics for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Object>} Metrics for the date
   */
  async getMetricsByDate(date) {
    const db = dbManager.getDatabase();
    const result = db.prepare(`
      SELECT * FROM cache_cost_metrics
      WHERE date = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `).get(date);
    return result;
  }

  /**
   * Get aggregated daily metrics for today
   * @returns {Promise<Object>} Aggregated daily metrics
   */
  async getAggregatedDailyMetrics() {
    const today = new Date().toISOString().split('T')[0];

    const db = dbManager.getDatabase();
    const result = db.prepare(`
      SELECT
        date,
        SUM(cache_write_tokens) as total_cache_write_tokens,
        SUM(cache_read_tokens) as total_cache_read_tokens,
        SUM(cache_write_cost_usd) as total_cache_write_cost_usd,
        SUM(cache_read_cost_usd) as total_cache_read_cost_usd,
        SUM(total_cost_usd) as total_cost_usd,
        COUNT(*) as record_count
      FROM cache_cost_metrics
      WHERE date = ?
      GROUP BY date
    `).get(today);

    return result || {
      date: today,
      total_cache_write_tokens: 0,
      total_cache_read_tokens: 0,
      total_cache_write_cost_usd: 0,
      total_cache_read_cost_usd: 0,
      total_cost_usd: 0,
      record_count: 0
    };
  }

  /**
   * Get cost trend over specified number of days
   * @param {number} days - Number of days to retrieve
   * @returns {Promise<Array>} Array of daily cost data
   */
  async getCostTrend(days) {
    const db = dbManager.getDatabase();
    const result = db.prepare(`
      SELECT
        date,
        SUM(total_cost_usd) as cost_usd,
        SUM(cache_write_tokens) as total_write_tokens,
        SUM(cache_read_tokens) as total_read_tokens
      FROM cache_cost_metrics
      GROUP BY date
      ORDER BY date DESC
      LIMIT ?
    `).all(days);

    return result;
  }

  /**
   * Calculate cost savings from using cache vs standard input
   * @param {Object} params - Token usage parameters
   * @param {number} params.cache_read_tokens - Number of cache read tokens
   * @param {number} params.cache_write_tokens - Number of cache write tokens
   * @param {number} params.input_tokens_without_cache - Total input tokens without cache
   * @returns {Object} Savings calculation
   */
  calculateCacheSavings({ cache_read_tokens, cache_write_tokens, input_tokens_without_cache }) {
    // Cost with cache
    const cache_cost = this.calculateCost({ cache_write_tokens, cache_read_tokens });
    const total_cache_cost = cache_cost.total_cost_usd;

    // Cost without cache (all tokens would be standard input)
    const cost_without_cache = (input_tokens_without_cache / 1000) * this.INPUT_COST_PER_1K;

    // Calculate savings
    const savings_usd = cost_without_cache - total_cache_cost;
    const savings_percentage = ((savings_usd / cost_without_cache) * 100).toFixed(2);

    return {
      cost_with_cache_usd: Number(total_cache_cost.toFixed(4)),
      cost_without_cache_usd: Number(cost_without_cache.toFixed(4)),
      savings_usd: Number(savings_usd.toFixed(4)),
      savings_percentage: Number(savings_percentage)
    };
  }

  /**
   * Get last alert message
   * @returns {string|null} Last alert message or null
   */
  getLastAlert() {
    return this.lastAlert;
  }

  /**
   * Get comprehensive cost summary
   * @returns {Promise<Object>} Cost summary with all metrics
   */
  async getCostSummary() {
    const daily = await this.getAggregatedDailyMetrics();
    const trend = await this.getCostTrend(7);

    const cache_hit_ratio = this.calculateCacheHitRatio({
      cache_read_tokens: daily.total_cache_read_tokens,
      cache_write_tokens: daily.total_cache_write_tokens
    });

    return {
      today: daily,
      cache_hit_ratio,
      seven_day_trend: trend,
      alert_threshold_usd: this.ALERT_THRESHOLD_USD,
      threshold_exceeded: daily.total_cost_usd > this.ALERT_THRESHOLD_USD
    };
  }
}

export default CostMonitoringService;
