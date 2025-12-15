/**
 * Token Analytics API Routes
 * RESTful endpoints for token usage tracking and analytics
 */

import { Router } from 'express';
import { tokenAnalyticsDB } from '../../database/token-analytics-db.js';
// import { logger } from '../utils/logger.js';
const logger = { info: console.log, error: console.error };
// import { broadcastTokenUsageUpdate } from '../websockets/token-analytics.js';
const broadcastTokenUsageUpdate = (record) => { /* WebSocket broadcast disabled for now */ };
import { z } from 'zod';

const router = Router();

// Validation schemas
const TokenUsageSchema = z.object({
  session_id: z.string(),
  user_id: z.string().optional(),
  request_id: z.string(),
  message_id: z.string().optional(), // Unique identifier to prevent double-charging
  provider: z.enum(['anthropic', 'claude-flow', 'mcp', 'openai']),
  model: z.string(),
  input_tokens: z.number().min(0),
  output_tokens: z.number().min(0),
  cached_tokens: z.number().min(0).optional(),
  cost_input: z.number().min(0).optional(),
  cost_output: z.number().min(0).optional(),
  request_type: z.string(),
  component: z.string().optional(),
  processing_time_ms: z.number().min(0).optional(),
  first_token_latency_ms: z.number().min(0).optional(),
  tokens_per_second: z.number().min(0).optional(),
  message_content: z.string().optional(),
  response_content: z.string().optional(),
  tools_used: z.array(z.string()).optional().transform(arr => arr ? JSON.stringify(arr) : undefined),
  metadata: z.record(z.any()).optional().transform(obj => obj ? JSON.stringify(obj) : undefined)
});

const QueryParamsSchema = z.object({
  limit: z.string().transform(val => parseInt(val, 10)).optional(),
  offset: z.string().transform(val => parseInt(val, 10)).optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  days: z.string().transform(val => parseInt(val, 10)).optional(),
  search: z.string().optional()
});

/**
 * Helper function to handle async route errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Helper function for cost calculations based on Anthropic pricing
 */
const calculateCost = (provider, model, inputTokens, outputTokens) => {
  // Anthropic Claude 3.5 Sonnet pricing (as of 2024)
  // Input: $3.00 / 1M tokens, Output: $15.00 / 1M tokens

  const pricingMap = {
    'anthropic': {
      'claude-3-5-sonnet-20241022': { input: 0.3, output: 1.5 },
      'claude-3-5-haiku-20241022': { input: 0.08, output: 0.4 },
      'claude-3-opus-20240229': { input: 1.5, output: 7.5 },
      'claude-4-sonnet-20250514': { input: 0.3, output: 1.5 }
    },
    'openai': {
      'gpt-4': { input: 3.0, output: 6.0 },
      'gpt-4o': { input: 0.25, output: 1.0 },
      'gpt-3.5-turbo': { input: 0.05, output: 0.15 }
    },
    'claude-flow': { input: 0.2, output: 0.4 },
    'mcp': { input: 0.1, output: 0.2 }
  };

  const pricing = pricingMap[provider]?.[model] || pricingMap[provider] || { input: 0.3, output: 1.5 };

  return {
    cost_input: Math.round((inputTokens / 1000) * pricing.input * 100),
    cost_output: Math.round((outputTokens / 1000) * pricing.output * 100)
  };
};

// =============================================
// ROUTES
// =============================================

/**
 * POST /api/token-analytics/batch
 * Record multiple token usage events in batch
 */
router.post('/batch', asyncHandler(async (req, res) => {
  try {
    const { batch } = req.body;

    if (!Array.isArray(batch) || batch.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Batch must be a non-empty array of token usage records'
      });
    }

    if (batch.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Batch size cannot exceed 100 records'
      });
    }

    const results = [];
    const errors = [];

    for (const [index, item] of batch.entries()) {
      try {
        const validatedData = TokenUsageSchema.parse(item);

        // Auto-calculate costs if not provided
        if (validatedData.cost_input === undefined || validatedData.cost_output === undefined) {
          const costs = calculateCost(
            validatedData.provider,
            validatedData.model,
            validatedData.input_tokens,
            validatedData.output_tokens
          );
          validatedData.cost_input = costs.cost_input;
          validatedData.cost_output = costs.cost_output;
        }

        // Generate message_id if not provided for deduplication
        if (!validatedData.message_id) {
          validatedData.message_id = `${validatedData.session_id}-${validatedData.request_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        const record = tokenAnalyticsDB.insertTokenUsage(validatedData);
        results.push(record);

        // Broadcast to WebSocket clients
        broadcastTokenUsageUpdate(record);
      } catch (error) {
        errors.push({
          index,
          error: error instanceof z.ZodError ? error.errors : 'Invalid record data'
        });
      }
    }

    logger.info('Token usage batch processed', {
      total: batch.length,
      successful: results.length,
      errors: errors.length,
      duplicates_prevented: batch.length - results.length - errors.length
    });

    res.status(201).json({
      success: true,
      data: {
        processed: results.length,
        total: batch.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    logger.error('Failed to process token usage batch', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to process batch'
    });
  }
}));

/**
 * POST /api/token-analytics/usage
 * Record a new token usage event
 */
router.post('/usage', asyncHandler(async (req, res) => {
  try {
    const validatedData = TokenUsageSchema.parse(req.body);

    // Auto-calculate costs if not provided
    if (validatedData.cost_input === undefined || validatedData.cost_output === undefined) {
      const costs = calculateCost(
        validatedData.provider,
        validatedData.model,
        validatedData.input_tokens,
        validatedData.output_tokens
      );
      validatedData.cost_input = costs.cost_input;
      validatedData.cost_output = costs.cost_output;
    }

    // Generate message_id if not provided for deduplication
    if (!validatedData.message_id) {
      validatedData.message_id = `${validatedData.session_id}-${validatedData.request_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    const record = tokenAnalyticsDB.insertTokenUsage(validatedData);
    const isNewRecord = record.id !== undefined;

    // Broadcast to WebSocket clients only for new records
    if (isNewRecord) {
      broadcastTokenUsageUpdate(record);
    }

    logger.info('Token usage processed', {
      request_id: record.request_id,
      message_id: record.message_id,
      provider: record.provider,
      model: record.model,
      total_tokens: record.input_tokens + record.output_tokens,
      duplicate_detected: !isNewRecord
    });

    res.status(isNewRecord ? 201 : 200).json({
      success: true,
      data: record,
      duplicate: !isNewRecord
    });
  } catch (error) {
    logger.error('Failed to record token usage', { error, body: req.body });
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : 'Invalid request data'
    });
  }
}));

/**
 * GET /api/token-analytics/hourly
 * Get hourly token usage for the last 24 hours
 */
router.get('/hourly', asyncHandler(async (req, res) => {
  try {
    const data = tokenAnalyticsDB.getHourlyUsage24h();

    // Transform data for Chart.js bar chart format
    const chartData = {
      labels: data.map(d => {
        // Format hour bucket for display (e.g., "14:00")
        const date = new Date(d.hour_bucket);
        return date.getHours().toString().padStart(2, '0') + ':00';
      }),
      datasets: [
        {
          label: 'Total Tokens',
          data: data.map(d => d.total_tokens),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          type: 'bar'
        },
        {
          label: 'Total Cost (cents)',
          data: data.map(d => d.total_cost),
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1,
          type: 'bar',
          yAxisID: 'y1'
        }
      ]
    };

    res.json({
      success: true,
      data: chartData,
      raw: data
    });
  } catch (error) {
    logger.error('Failed to get hourly usage data', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve hourly usage data'
    });
  }
}));

/**
 * GET /api/token-analytics/daily
 * Get daily token usage for the last 30 days
 */
router.get('/daily', asyncHandler(async (req, res) => {
  try {
    const data = tokenAnalyticsDB.getDailyUsage30d();

    // Transform data for Chart.js bar chart format
    const chartData = {
      labels: data.map(d => {
        // Format date for display (e.g., "Dec 25")
        const date = new Date(d.date_bucket + 'T00:00:00');
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [
        {
          label: 'Total Tokens',
          data: data.map(d => d.total_tokens),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1,
          type: 'bar'
        },
        {
          label: 'Total Cost (cents)',
          data: data.map(d => d.total_cost),
          backgroundColor: 'rgba(168, 85, 247, 0.8)',
          borderColor: 'rgba(168, 85, 247, 1)',
          borderWidth: 1,
          type: 'bar',
          yAxisID: 'y1'
        },
        {
          label: 'Requests',
          data: data.map(d => d.total_requests),
          backgroundColor: 'rgba(251, 146, 60, 0.8)',
          borderColor: 'rgba(251, 146, 60, 1)',
          borderWidth: 1,
          type: 'bar',
          yAxisID: 'y2'
        }
      ]
    };

    res.json({
      success: true,
      data: chartData,
      raw: data
    });
  } catch (error) {
    logger.error('Failed to get daily usage data', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve daily usage data'
    });
  }
}));

/**
 * GET /api/token-analytics/messages
 * Get recent messages with pagination and filtering
 */
router.get('/messages', asyncHandler(async (req, res) => {
  try {
    const { limit = 50, search } = QueryParamsSchema.parse(req.query);

    let data;
    if (search) {
      data = tokenAnalyticsDB.searchMessages(search, limit);
    } else {
      data = tokenAnalyticsDB.getRecentMessages(limit);
    }

    res.json({
      success: true,
      data,
      meta: {
        count: data.length,
        limit,
        search: search || null
      }
    });
  } catch (error) {
    logger.error('Failed to get recent messages', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve recent messages'
    });
  }
}));

/**
 * GET /api/token-analytics/summary
 * Get usage summary statistics
 */
router.get('/summary', asyncHandler(async (req, res) => {
  try {
    const summary = tokenAnalyticsDB.getUsageSummary();
    const byProvider = tokenAnalyticsDB.getUsageByProvider();
    const byModel = tokenAnalyticsDB.getUsageByModel();

    res.json({
      success: true,
      data: {
        summary,
        by_provider: byProvider,
        by_model: byModel
      }
    });
  } catch (error) {
    logger.error('Failed to get usage summary', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve usage summary'
    });
  }
}));

/**
 * GET /api/token-analytics/cost-breakdown
 * Get cost breakdown by day
 */
router.get('/cost-breakdown', asyncHandler(async (req, res) => {
  try {
    const { days = 30 } = QueryParamsSchema.parse(req.query);
    const data = tokenAnalyticsDB.getCostBreakdown(days);

    res.json({
      success: true,
      data,
      meta: {
        days,
        total_cost: data.reduce((sum, day) => sum + (day.daily_cost || 0), 0),
        total_requests: data.reduce((sum, day) => sum + (day.daily_requests || 0), 0),
        total_tokens: data.reduce((sum, day) => sum + (day.daily_tokens || 0), 0)
      }
    });
  } catch (error) {
    logger.error('Failed to get cost breakdown', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cost breakdown'
    });
  }
}));

/**
 * GET /api/token-analytics/export
 * Export analytics data as CSV
 */
router.get('/export', asyncHandler(async (req, res) => {
  try {
    const { days = 30, format = 'csv' } = QueryParamsSchema.parse(req.query);

    if (format !== 'csv') {
      return res.status(400).json({
        success: false,
        error: 'Only CSV format is currently supported'
      });
    }

    const data = tokenAnalyticsDB.getCostBreakdown(days);

    // Generate CSV
    const headers = ['Date', 'Daily Cost (cents)', 'Daily Requests', 'Daily Tokens'];
    const csvContent = [
      headers.join(','),
      ...data.map(row => [
        row.date,
        row.daily_cost || 0,
        row.daily_requests || 0,
        row.daily_tokens || 0
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="token-analytics-${days}d.csv"`);
    res.send(csvContent);
  } catch (error) {
    logger.error('Failed to export analytics data', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics data'
    });
  }
}));

/**
 * GET /api/token-analytics/health
 * Database health check and info
 */
router.get('/health', asyncHandler(async (req, res) => {
  try {
    const info = tokenAnalyticsDB.getInfo();

    res.json({
      success: true,
      data: info,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get database health info', { error });
    res.status(500).json({
      success: false,
      error: 'Database health check failed'
    });
  }
}));

/**
 * POST /api/token-analytics/cleanup
 * Cleanup old records (admin only)
 */
router.post('/cleanup', asyncHandler(async (req, res) => {
  try {
    const { retention_days = 90 } = req.body;

    if (retention_days < 30) {
      return res.status(400).json({
        success: false,
        error: 'Retention period must be at least 30 days'
      });
    }

    const deletedCount = tokenAnalyticsDB.cleanup(retention_days);

    res.json({
      success: true,
      data: {
        deleted_records: deletedCount,
        retention_days
      }
    });
  } catch (error) {
    logger.error('Failed to cleanup database', { error });
    res.status(500).json({
      success: false,
      error: 'Database cleanup failed'
    });
  }
}));

export default router;