/**
 * Analytics API Routes - Real Token Data Endpoints
 *
 * SPARC Implementation:
 * - Real-time token usage data from CostTracker
 * - Hourly aggregations for last 24 hours
 * - Daily aggregations for last 30 days
 * - Recent messages with actual costs
 * - No fake data patterns
 */

import { Router, Request, Response } from 'express';
import { CostTracker } from '../../../backend/services/CostTracker';
import { logger } from '@/utils/logger';

const router = Router();

// Initialize cost tracker
const costTracker = new CostTracker('./data/cost-tracking.db');

interface AnalyticsQuery {
  userId?: string;
  sessionId?: string;
  startDate?: string;
  endDate?: string;
  limit?: string;
  hours?: string;
  days?: string;
}

/**
 * GET /api/analytics/hourly
 * Returns hourly token usage data for specified time range
 */
router.get('/hourly', async (req: Request<{}, {}, {}, AnalyticsQuery>, res: Response) => {
  try {
    const { userId, hours = '24' } = req.query;
    const hoursNum = parseInt(hours, 10);

    if (hoursNum > 168) { // Max 1 week
      return res.status(400).json({
        error: 'Hours parameter cannot exceed 168 (1 week)',
        code: 'INVALID_TIME_RANGE'
      });
    }

    const startDate = new Date(Date.now() - (hoursNum * 60 * 60 * 1000));
    const endDate = new Date();

    const analyticsData = costTracker.getUsageAnalytics({
      userId,
      startDate,
      endDate,
      granularity: 'hour'
    });

    // Fill in missing hours with zero values
    const filledData = fillMissingHours(analyticsData, hoursNum);

    res.json({
      data: filledData,
      meta: {
        userId,
        timeRange: `${hoursNum}h`,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        granularity: 'hour',
        totalRecords: filledData.length
      }
    });

  } catch (error) {
    logger.error('Error fetching hourly analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch hourly analytics data',
      code: 'ANALYTICS_FETCH_ERROR'
    });
  }
});

/**
 * GET /api/analytics/daily
 * Returns daily token usage data for specified time range
 */
router.get('/daily', async (req: Request<{}, {}, {}, AnalyticsQuery>, res: Response) => {
  try {
    const { userId, days = '30' } = req.query;
    const daysNum = parseInt(days, 10);

    if (daysNum > 365) { // Max 1 year
      return res.status(400).json({
        error: 'Days parameter cannot exceed 365 (1 year)',
        code: 'INVALID_TIME_RANGE'
      });
    }

    const startDate = new Date(Date.now() - (daysNum * 24 * 60 * 60 * 1000));
    const endDate = new Date();

    const analyticsData = costTracker.getUsageAnalytics({
      userId,
      startDate,
      endDate,
      granularity: 'day'
    });

    // Fill in missing days with zero values
    const filledData = fillMissingDays(analyticsData, daysNum);

    res.json({
      data: filledData,
      meta: {
        userId,
        timeRange: `${daysNum}d`,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        granularity: 'day',
        totalRecords: filledData.length
      }
    });

  } catch (error) {
    logger.error('Error fetching daily analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch daily analytics data',
      code: 'ANALYTICS_FETCH_ERROR'
    });
  }
});

/**
 * GET /api/analytics/messages
 * Returns recent message history with token costs
 */
router.get('/messages', async (req: Request<{}, {}, {}, AnalyticsQuery>, res: Response) => {
  try {
    const { userId, limit = '50' } = req.query;
    const limitNum = parseInt(limit, 10);

    if (limitNum > 1000) { // Max 1000 messages
      return res.status(400).json({
        error: 'Limit parameter cannot exceed 1000',
        code: 'INVALID_LIMIT'
      });
    }

    // Get recent step usage from cost tracker
    const messages = await getRecentMessages(userId, limitNum);

    res.json({
      data: messages,
      meta: {
        userId,
        limit: limitNum,
        totalRecords: messages.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error fetching recent messages:', error);
    res.status(500).json({
      error: 'Failed to fetch recent messages',
      code: 'MESSAGES_FETCH_ERROR'
    });
  }
});

/**
 * GET /api/analytics/summary
 * Returns current session and overall summary statistics
 */
router.get('/summary', async (req: Request<{}, {}, {}, AnalyticsQuery>, res: Response) => {
  try {
    const { userId, sessionId } = req.query;

    // Get real-time metrics
    const realTimeMetrics = costTracker.getRealTimeMetrics();

    // Get session data if sessionId provided
    let sessionData = null;
    if (sessionId) {
      sessionData = costTracker.getSessionCost(sessionId);
    }

    // Get today's totals
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAnalytics = costTracker.getUsageAnalytics({
      userId,
      startDate: today,
      endDate: new Date(),
      granularity: 'day'
    });

    const todayTotal = todayAnalytics[0] || {
      total_cost: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      step_count: 0
    };

    res.json({
      realTimeMetrics,
      sessionData,
      todayTotal: {
        cost: todayTotal.total_cost,
        inputTokens: todayTotal.total_input_tokens,
        outputTokens: todayTotal.total_output_tokens,
        totalTokens: todayTotal.total_input_tokens + todayTotal.total_output_tokens,
        messageCount: todayTotal.step_count
      },
      meta: {
        userId,
        sessionId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error fetching analytics summary:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics summary',
      code: 'SUMMARY_FETCH_ERROR'
    });
  }
});

/**
 * GET /api/analytics/top-consumers
 * Returns top cost consumers by user, session, or tool
 */
router.get('/top-consumers', async (req: Request<{}, {}, {}, AnalyticsQuery & { groupBy?: string }>, res: Response) => {
  try {
    const { startDate, endDate, limit = '10', groupBy = 'user' } = req.query;

    const validGroupBy = ['user', 'session', 'tool'];
    if (!validGroupBy.includes(groupBy)) {
      return res.status(400).json({
        error: 'groupBy must be one of: user, session, tool',
        code: 'INVALID_GROUP_BY'
      });
    }

    const limitNum = parseInt(limit, 10);
    const start = startDate ? new Date(startDate) : new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
    const end = endDate ? new Date(endDate) : new Date();

    const topConsumers = costTracker.getTopCostConsumers({
      startDate: start,
      endDate: end,
      limit: limitNum,
      groupBy: groupBy as 'user' | 'session' | 'tool'
    });

    res.json({
      data: topConsumers,
      meta: {
        groupBy,
        limit: limitNum,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        totalRecords: topConsumers.length
      }
    });

  } catch (error) {
    logger.error('Error fetching top consumers:', error);
    res.status(500).json({
      error: 'Failed to fetch top consumers data',
      code: 'TOP_CONSUMERS_FETCH_ERROR'
    });
  }
});

/**
 * POST /api/analytics/track
 * Track a new token usage event (for testing/manual tracking)
 */
router.post('/track', async (req: Request, res: Response) => {
  try {
    const {
      stepId,
      messageId,
      sessionId,
      userId,
      tool,
      stepType,
      tokens,
      model,
      retryAttempt = 0,
      duration = 0
    } = req.body;

    // Validate required fields
    if (!stepId || !messageId || !sessionId || !userId || !stepType || !tokens || !model) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['stepId', 'messageId', 'sessionId', 'userId', 'stepType', 'tokens', 'model'],
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Track the usage
    const tracked = await costTracker.trackStepUsage({
      stepId,
      messageId,
      sessionId,
      userId,
      tool,
      stepType,
      tokens,
      timestamp: new Date(),
      model,
      retryAttempt,
      duration
    });

    if (tracked) {
      res.json({
        success: true,
        message: 'Token usage tracked successfully'
      });
    } else {
      res.status(409).json({
        error: 'Message already processed (deduplication)',
        code: 'DUPLICATE_MESSAGE'
      });
    }

  } catch (error) {
    logger.error('Error tracking token usage:', error);
    res.status(500).json({
      error: 'Failed to track token usage',
      code: 'TRACKING_ERROR'
    });
  }
});

// Helper functions

function fillMissingHours(data: any[], hours: number): any[] {
  const filled = [];
  const now = new Date();

  for (let i = hours - 1; i >= 0; i--) {
    const hour = new Date(now.getTime() - (i * 60 * 60 * 1000));
    const hourPeriod = hour.toISOString().substring(0, 14) + '00:00';

    const existing = data.find(d => d.period === hourPeriod);

    filled.push({
      period: hourPeriod,
      step_count: existing?.step_count || 0,
      total_cost: existing?.total_cost || 0,
      total_input_tokens: existing?.total_input_tokens || 0,
      total_output_tokens: existing?.total_output_tokens || 0,
      total_cache_creation_tokens: existing?.total_cache_creation_tokens || 0,
      total_cache_read_tokens: existing?.total_cache_read_tokens || 0,
      avg_cost_per_step: existing?.avg_cost_per_step || 0,
      min_cost: existing?.min_cost || 0,
      max_cost: existing?.max_cost || 0
    });
  }

  return filled;
}

function fillMissingDays(data: any[], days: number): any[] {
  const filled = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
    const dayPeriod = day.toISOString().substring(0, 10);

    const existing = data.find(d => d.period === dayPeriod);

    filled.push({
      period: dayPeriod,
      step_count: existing?.step_count || 0,
      total_cost: existing?.total_cost || 0,
      total_input_tokens: existing?.total_input_tokens || 0,
      total_output_tokens: existing?.total_output_tokens || 0,
      total_cache_creation_tokens: existing?.total_cache_creation_tokens || 0,
      total_cache_read_tokens: existing?.total_cache_read_tokens || 0,
      avg_cost_per_step: existing?.avg_cost_per_step || 0,
      min_cost: existing?.min_cost || 0,
      max_cost: existing?.max_cost || 0
    });
  }

  return filled;
}

async function getRecentMessages(userId?: string, limit: number = 50): Promise<any[]> {
  // Query the cost tracker database for recent step usage
  const db = (costTracker as any).db; // Access private db property

  let query = `
    SELECT
      id,
      step_id,
      message_id,
      session_id,
      user_id,
      tool,
      step_type as requestType,
      input_tokens as inputTokens,
      output_tokens as outputTokens,
      cache_creation_tokens as cacheTokens,
      (input_tokens + output_tokens) as tokensUsed,
      cost as estimatedCost,
      timestamp,
      model,
      retry_attempt,
      duration
    FROM step_usage
  `;

  const params: any[] = [];

  if (userId) {
    query += ' WHERE user_id = ?';
    params.push(userId);
  }

  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);

  const stmt = db.prepare(query);
  const results = stmt.all(params);

  return results.map((row: any) => ({
    id: row.id,
    timestamp: row.timestamp,
    provider: determineProviderFromModel(row.model),
    model: row.model,
    tokensUsed: row.tokensUsed,
    estimatedCost: row.estimatedCost,
    requestType: row.requestType,
    component: row.tool,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    cacheTokens: row.cacheTokens || 0,
    sessionId: row.session_id,
    messageId: row.message_id,
    retryAttempt: row.retry_attempt,
    duration: row.duration
  }));
}

function determineProviderFromModel(model: string): 'claude' | 'openai' | 'mcp' | 'claude-flow' {
  if (model.includes('claude')) return 'claude';
  if (model.includes('gpt') || model.includes('openai')) return 'openai';
  if (model.includes('mcp')) return 'mcp';
  return 'claude-flow';
}

export default router;