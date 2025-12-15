import express from 'express';
import CostMonitoringService from '../services/cost-monitoring-service.js';

const router = express.Router();

const costService = new CostMonitoringService();

/**
 * GET /api/cost-metrics/summary
 * Get comprehensive cost summary including today's metrics and 7-day trend
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = await costService.getCostSummary();
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching cost summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cost summary'
    });
  }
});

/**
 * GET /api/cost-metrics/daily
 * Get today's aggregated metrics
 */
router.get('/daily', async (req, res) => {
  try {
    const metrics = await costService.getAggregatedDailyMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching daily metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch daily metrics'
    });
  }
});

/**
 * GET /api/cost-metrics/trend/:days
 * Get cost trend over specified number of days
 */
router.get('/trend/:days', async (req, res) => {
  try {
    const days = parseInt(req.params.days, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        error: 'Days must be between 1 and 365'
      });
    }

    const trend = await costService.getCostTrend(days);
    res.json({
      success: true,
      data: trend
    });
  } catch (error) {
    console.error('Error fetching cost trend:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cost trend'
    });
  }
});

/**
 * POST /api/cost-metrics/record
 * Record cache usage metrics (for internal use or webhooks)
 */
router.post('/record', async (req, res) => {
  try {
    const { cache_write_tokens, cache_read_tokens, timestamp } = req.body;

    if (!cache_write_tokens && cache_write_tokens !== 0) {
      return res.status(400).json({
        success: false,
        error: 'cache_write_tokens is required'
      });
    }

    if (!cache_read_tokens && cache_read_tokens !== 0) {
      return res.status(400).json({
        success: false,
        error: 'cache_read_tokens is required'
      });
    }

    const cost = await costService.recordCacheUsage({
      cache_write_tokens,
      cache_read_tokens,
      timestamp: timestamp || Date.now()
    });

    res.json({
      success: true,
      data: cost
    });
  } catch (error) {
    console.error('Error recording cache usage:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record cache usage'
    });
  }
});

/**
 * GET /api/cost-metrics/alerts
 * Get current alert status
 */
router.get('/alerts', async (req, res) => {
  try {
    const lastAlert = costService.getLastAlert();
    const daily = await costService.getAggregatedDailyMetrics();

    res.json({
      success: true,
      data: {
        has_alert: !!lastAlert,
        alert_message: lastAlert,
        current_daily_cost: daily.total_cost_usd,
        threshold: costService.ALERT_THRESHOLD_USD,
        threshold_exceeded: daily.total_cost_usd > costService.ALERT_THRESHOLD_USD
      }
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert status'
    });
  }
});

/**
 * GET /api/cost-metrics/savings
 * Calculate cost savings from cache usage
 */
router.get('/savings', async (req, res) => {
  try {
    const daily = await costService.getAggregatedDailyMetrics();

    // Estimate input tokens without cache (write + read tokens represent what would have been input)
    const estimated_input_tokens = daily.total_cache_write_tokens + daily.total_cache_read_tokens;

    const savings = costService.calculateCacheSavings({
      cache_write_tokens: daily.total_cache_write_tokens,
      cache_read_tokens: daily.total_cache_read_tokens,
      input_tokens_without_cache: estimated_input_tokens
    });

    res.json({
      success: true,
      data: savings
    });
  } catch (error) {
    console.error('Error calculating savings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate cost savings'
    });
  }
});

export default router;
