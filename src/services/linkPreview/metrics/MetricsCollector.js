/**
 * Metrics Collector for Link Preview System
 * Collects and aggregates performance and usage metrics
 */

import { Platform } from '../handlers/BaseHandler.js';

/**
 * Metrics collector class for monitoring link preview performance
 */
export class MetricsCollector {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.bufferSize = options.bufferSize || 1000;
    this.flushInterval = options.flushInterval || 60000; // 1 minute
    
    // In-memory metrics storage
    this.counters = new Map();
    this.histograms = new Map();
    this.gauges = new Map();
    this.metricsBuffer = [];
    
    // Start periodic flush if enabled
    if (this.enabled) {
      this.startPeriodicFlush();
    }
  }

  /**
   * Record a link preview fetch operation
   * @param {string} platform - Platform identifier
   * @param {number} responseTime - Response time in milliseconds
   * @param {boolean} success - Whether the operation succeeded
   * @param {Object} metadata - Additional metadata
   */
  recordPreviewFetch(platform, responseTime, success, metadata = {}) {
    if (!this.enabled) return;

    const timestamp = Date.now();
    const baseLabels = { platform, success: success.toString() };
    
    // Increment counters
    this.incrementCounter('preview_requests_total', baseLabels);
    this.incrementCounter(`preview_requests_${success ? 'success' : 'failure'}_total`, { platform });
    
    // Record response time histogram
    this.recordHistogram('preview_response_time_ms', responseTime, { platform });
    
    // Record in buffer for detailed analysis
    this.addToBuffer({
      timestamp,
      type: 'preview_fetch',
      platform,
      responseTime,
      success,
      metadata
    });

    // Record platform-specific success rate
    this.updateGauge(`preview_success_rate_${platform}`, 
      this.calculateSuccessRate(platform));
  }

  /**
   * Record a cache operation
   * @param {string} platform - Platform identifier
   * @param {string} cacheLayer - Cache layer (memory, redis, database)
   * @param {string} operation - Operation type (hit, miss, set, delete)
   * @param {number} responseTime - Response time in milliseconds
   */
  recordCacheOperation(platform, cacheLayer, operation, responseTime = 0) {
    if (!this.enabled) return;

    const labels = { platform, cache_layer: cacheLayer, operation };
    
    this.incrementCounter('cache_operations_total', labels);
    
    if (responseTime > 0) {
      this.recordHistogram('cache_response_time_ms', responseTime, labels);
    }
    
    // Update cache hit ratio
    if (operation === 'hit' || operation === 'miss') {
      this.updateCacheHitRatio(platform, cacheLayer);
    }
  }

  /**
   * Record cache hit for specific platform and layer
   * @param {string} platform - Platform identifier
   * @param {string} cacheLayer - Cache layer
   */
  recordCacheHit(platform, cacheLayer = 'memory') {
    this.recordCacheOperation(platform, cacheLayer, 'hit');
  }

  /**
   * Record cache miss for specific platform and layer
   * @param {string} platform - Platform identifier
   * @param {string} cacheLayer - Cache layer
   */
  recordCacheMiss(platform, cacheLayer = 'memory') {
    this.recordCacheOperation(platform, cacheLayer, 'miss');
  }

  /**
   * Record API call to external service
   * @param {string} platform - Platform identifier
   * @param {string} apiType - API type (oembed, rest, graphql)
   * @param {number} responseTime - Response time in milliseconds
   * @param {number} statusCode - HTTP status code
   * @param {boolean} success - Whether the call succeeded
   */
  recordAPICall(platform, apiType, responseTime, statusCode, success) {
    if (!this.enabled) return;

    const labels = { 
      platform, 
      api_type: apiType,
      status_code: statusCode.toString(),
      success: success.toString()
    };
    
    this.incrementCounter('api_calls_total', labels);
    this.recordHistogram('api_response_time_ms', responseTime, labels);
    
    // Record API error rates
    if (!success) {
      this.incrementCounter('api_errors_total', { platform, api_type: apiType });
    }
  }

  /**
   * Record rate limiting event
   * @param {string} platform - Platform identifier
   * @param {string} apiType - API type
   * @param {number} retryAfter - Retry after time in seconds
   */
  recordRateLimitHit(platform, apiType, retryAfter = 0) {
    if (!this.enabled) return;

    const labels = { platform, api_type: apiType };
    
    this.incrementCounter('rate_limit_hits_total', labels);
    
    if (retryAfter > 0) {
      this.recordHistogram('rate_limit_retry_after_seconds', retryAfter, labels);
    }
  }

  /**
   * Record fallback usage
   * @param {string} platform - Platform identifier
   * @param {string} fallbackType - Type of fallback used
   * @param {string} reason - Reason for fallback
   */
  recordFallbackUsage(platform, fallbackType, reason) {
    if (!this.enabled) return;

    const labels = { platform, fallback_type: fallbackType, reason };
    
    this.incrementCounter('fallback_usage_total', labels);
  }

  /**
   * Record error occurrence
   * @param {string} platform - Platform identifier
   * @param {string} errorType - Type of error
   * @param {string} errorCode - Error code
   * @param {Error} error - Error object
   */
  recordError(platform, errorType, errorCode, error) {
    if (!this.enabled) return;

    const labels = { 
      platform, 
      error_type: errorType,
      error_code: errorCode
    };
    
    this.incrementCounter('errors_total', labels);
    
    // Add to buffer with full error details
    this.addToBuffer({
      timestamp: Date.now(),
      type: 'error',
      platform,
      errorType,
      errorCode,
      errorMessage: error.message,
      errorStack: error.stack
    });
  }

  /**
   * Update system metrics
   * @param {Object} metrics - System metrics
   */
  updateSystemMetrics(metrics) {
    if (!this.enabled) return;

    Object.entries(metrics).forEach(([key, value]) => {
      this.updateGauge(`system_${key}`, value);
    });
  }

  /**
   * Get current metrics snapshot
   * @returns {Object} - Current metrics
   */
  getMetrics() {
    return {
      counters: Object.fromEntries(this.counters),
      histograms: this.getHistogramSummaries(),
      gauges: Object.fromEntries(this.gauges),
      timestamp: Date.now()
    };
  }

  /**
   * Get platform-specific metrics
   * @param {string} platform - Platform identifier
   * @returns {Object} - Platform metrics
   */
  getPlatformMetrics(platform) {
    const metrics = {
      requests: this.getCounter('preview_requests_total', { platform }) || 0,
      success: this.getCounter('preview_requests_success_total', { platform }) || 0,
      failures: this.getCounter('preview_requests_failure_total', { platform }) || 0,
      successRate: this.getGauge(`preview_success_rate_${platform}`) || 0,
      cacheHitRatio: this.calculateCacheHitRatio(platform),
      avgResponseTime: this.getHistogramAverage('preview_response_time_ms', { platform })
    };

    return metrics;
  }

  /**
   * Get performance summary
   * @returns {Object} - Performance metrics summary
   */
  getPerformanceSummary() {
    const allPlatforms = Object.values(Platform);
    const summary = {
      total: {
        requests: 0,
        success: 0,
        failures: 0,
        avgResponseTime: 0
      },
      byPlatform: {}
    };

    allPlatforms.forEach(platform => {
      const metrics = this.getPlatformMetrics(platform);
      summary.byPlatform[platform] = metrics;
      
      summary.total.requests += metrics.requests;
      summary.total.success += metrics.success;
      summary.total.failures += metrics.failures;
    });

    if (summary.total.requests > 0) {
      summary.total.successRate = summary.total.success / summary.total.requests;
      summary.total.avgResponseTime = this.getHistogramAverage('preview_response_time_ms');
    }

    return summary;
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
    this.metricsBuffer = [];
  }

  /**
   * Enable or disable metrics collection
   * @param {boolean} enabled - Whether to enable metrics
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    
    if (enabled && !this.flushTimer) {
      this.startPeriodicFlush();
    } else if (!enabled && this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Internal helper methods
   */

  incrementCounter(name, labels = {}) {
    const key = this.createMetricKey(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + 1);
  }

  getCounter(name, labels = {}) {
    const key = this.createMetricKey(name, labels);
    return this.counters.get(key) || 0;
  }

  recordHistogram(name, value, labels = {}) {
    const key = this.createMetricKey(name, labels);
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    
    const values = this.histograms.get(key);
    values.push(value);
    
    // Keep only recent values (last 1000)
    if (values.length > 1000) {
      values.shift();
    }
  }

  getHistogramAverage(name, labels = {}) {
    const key = this.createMetricKey(name, labels);
    const values = this.histograms.get(key);
    
    if (!values || values.length === 0) return 0;
    
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  getHistogramSummaries() {
    const summaries = {};
    
    this.histograms.forEach((values, key) => {
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        summaries[key] = {
          count: values.length,
          sum: values.reduce((sum, val) => sum + val, 0),
          min: sorted[0],
          max: sorted[sorted.length - 1],
          avg: values.reduce((sum, val) => sum + val, 0) / values.length,
          p50: sorted[Math.floor(sorted.length * 0.5)],
          p95: sorted[Math.floor(sorted.length * 0.95)],
          p99: sorted[Math.floor(sorted.length * 0.99)]
        };
      }
    });
    
    return summaries;
  }

  updateGauge(name, value, labels = {}) {
    const key = this.createMetricKey(name, labels);
    this.gauges.set(key, value);
  }

  getGauge(name, labels = {}) {
    const key = this.createMetricKey(name, labels);
    return this.gauges.get(key);
  }

  createMetricKey(name, labels = {}) {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    
    return labelStr ? `${name}{${labelStr}}` : name;
  }

  calculateSuccessRate(platform) {
    const success = this.getCounter('preview_requests_success_total', { platform });
    const total = this.getCounter('preview_requests_total', { platform });
    
    return total > 0 ? success / total : 0;
  }

  updateCacheHitRatio(platform, cacheLayer) {
    const hits = this.getCounter('cache_operations_total', { 
      platform, 
      cache_layer: cacheLayer, 
      operation: 'hit' 
    });
    const misses = this.getCounter('cache_operations_total', { 
      platform, 
      cache_layer: cacheLayer, 
      operation: 'miss' 
    });
    
    const total = hits + misses;
    const ratio = total > 0 ? hits / total : 0;
    
    this.updateGauge(`cache_hit_ratio_${platform}_${cacheLayer}`, ratio);
  }

  calculateCacheHitRatio(platform) {
    const cacheHitRatio = {};
    const layers = ['memory', 'redis', 'database'];
    
    layers.forEach(layer => {
      cacheHitRatio[layer] = this.getGauge(`cache_hit_ratio_${platform}_${layer}`) || 0;
    });
    
    return cacheHitRatio;
  }

  addToBuffer(entry) {
    this.metricsBuffer.push(entry);
    
    if (this.metricsBuffer.length > this.bufferSize) {
      this.metricsBuffer.shift();
    }
  }

  startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      this.flushMetrics();
    }, this.flushInterval);
  }

  flushMetrics() {
    // In a real implementation, this would send metrics to an external system
    // For now, we'll just log the current state
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Metrics flush:`, this.getPerformanceSummary());
    
    // Clear the buffer after flushing
    this.metricsBuffer = [];
  }
}

/**
 * Singleton metrics collector instance
 */
export const metricsCollector = new MetricsCollector();

export default MetricsCollector;