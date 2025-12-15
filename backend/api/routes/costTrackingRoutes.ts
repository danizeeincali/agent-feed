/**
 * Cost Tracking API Routes
 *
 * RESTful endpoints for Claude Code SDK cost tracking and analytics
 *
 * Features:
 * - Real-time cost monitoring
 * - Usage analytics and reporting
 * - Alert management
 * - Session cost tracking
 * - Historical data retrieval
 * - Billing insights
 */

import { Router, Request, Response, NextFunction } from 'express';
import { CostTracker } from '../../services/CostTracker';
import { CostMonitoringService } from '../../services/CostMonitoringService';
import { validateInput } from '../../middleware/validation';
import { authenticate, authorize } from '../../middleware/auth';
import { createRateLimiter } from '../../middleware/security';
import WebSocket from 'ws';

const router = Router();

// Rate limiting for cost tracking operations
const costTrackingRateLimit = createRateLimiter(60 * 1000, 100); // 100 requests per minute

// Initialize services (these would be injected via dependency injection)
let costTracker: CostTracker;
let monitoringService: CostMonitoringService;

export const setCostTrackingServices = (tracker: CostTracker, monitoring: CostMonitoringService) => {
  costTracker = tracker;
  monitoringService = monitoring;
};

// Middleware
router.use(costTrackingRateLimit);
router.use(authenticate);

// Validation schemas
const trackStepUsageSchema = {
  body: {
    stepId: { type: 'string', required: true },
    messageId: { type: 'string', required: true },
    sessionId: { type: 'string', required: true },
    tool: { type: 'string', required: false },
    stepType: { type: 'string', enum: ['request', 'response', 'tool_use', 'tool_result'], required: true },
    tokens: {
      type: 'object',
      required: true,
      properties: {
        inputTokens: { type: 'number', min: 0, required: true },
        outputTokens: { type: 'number', min: 0, required: true },
        cacheCreationTokens: { type: 'number', min: 0, required: false },
        cacheReadTokens: { type: 'number', min: 0, required: false }
      }
    },
    model: { type: 'string', required: true },
    duration: { type: 'number', min: 0, required: true }
  }
};

const sessionQuerySchema = {
  query: {
    userId: { type: 'string', required: false },
    status: { type: 'string', enum: ['active', 'completed', 'failed', 'cancelled'], required: false },
    startDate: { type: 'string', required: false },
    endDate: { type: 'string', required: false },
    limit: { type: 'number', min: 1, max: 1000, required: false },
    offset: { type: 'number', min: 0, required: false }
  }
};

const analyticsQuerySchema = {
  query: {
    userId: { type: 'string', required: false },
    startDate: { type: 'string', required: true },
    endDate: { type: 'string', required: true },
    granularity: { type: 'string', enum: ['hour', 'day', 'week', 'month'], required: false },
    groupBy: { type: 'string', enum: ['user', 'session', 'tool'], required: false }
  }
};

// ========================================
// SESSION MANAGEMENT ENDPOINTS
// ========================================

/**
 * POST /api/cost-tracking/sessions
 * Start a new cost tracking session
 */
router.post('/sessions',
  authorize(['user', 'admin']),
  validateInput({
    body: {
      sessionId: { type: 'string', required: true },
      metadata: { type: 'object', required: false }
    }
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, metadata } = req.body;
      const userId = req.user.id;

      const session = costTracker.startSession(sessionId, userId, metadata);

      res.status(201).json({
        success: true,
        session: {
          sessionId: session.sessionId,
          userId: session.userId,
          startTime: session.startTime,
          status: session.status,
          metadata: session.metadata
        },
        endpoints: {
          track: `/api/cost-tracking/sessions/${sessionId}/track`,
          cost: `/api/cost-tracking/sessions/${sessionId}/cost`,
          end: `/api/cost-tracking/sessions/${sessionId}/end`
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/cost-tracking/sessions/:sessionId
 * Get session cost details
 */
router.get('/sessions/:sessionId',
  authorize(['user', 'admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const session = costTracker.getSessionCost(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      // Check access permissions
      if (session.userId !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      res.json({
        success: true,
        session,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/cost-tracking/sessions/:sessionId/end
 * End a cost tracking session
 */
router.post('/sessions/:sessionId/end',
  authorize(['user', 'admin']),
  validateInput({
    body: {
      status: { type: 'string', enum: ['completed', 'failed', 'cancelled'], required: false }
    }
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const { status = 'completed' } = req.body;

      const session = costTracker.getSessionCost(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      // Check access permissions
      if (session.userId !== req.user.id && !['admin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const endedSession = costTracker.endSession(sessionId, status);

      res.json({
        success: true,
        session: endedSession,
        summary: {
          totalCost: endedSession?.totalCost || 0,
          totalTokens: endedSession?.totalTokens || { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          stepCount: endedSession?.stepCount || 0,
          duration: endedSession?.endTime && endedSession?.startTime
            ? endedSession.endTime.getTime() - endedSession.startTime.getTime()
            : 0
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/cost-tracking/sessions
 * List sessions with filtering
 */
router.get('/sessions',
  authorize(['admin', 'moderator']),
  validateInput(sessionQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, status, startDate, endDate, limit = 50, offset = 0 } = req.query;

      // For now, return a placeholder response
      // In a real implementation, this would query the database
      res.json({
        success: true,
        sessions: [],
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: 0
        },
        filters: { userId, status, startDate, endDate },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// COST TRACKING ENDPOINTS
// ========================================

/**
 * POST /api/cost-tracking/sessions/:sessionId/track
 * Track step usage for a session
 */
router.post('/sessions/:sessionId/track',
  authorize(['user', 'admin']),
  validateInput(trackStepUsageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const stepUsageData = req.body;

      // Verify session exists and user has access
      const session = costTracker.getSessionCost(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      if (session.userId !== req.user.id && !['admin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const stepUsage = {
        ...stepUsageData,
        sessionId,
        userId: session.userId,
        timestamp: new Date(),
        retryAttempt: 0
      };

      const tracked = await costTracker.trackStepUsage(stepUsage);

      if (!tracked) {
        return res.status(409).json({
          success: false,
          error: 'Step usage already tracked (duplicate message ID)',
          messageId: stepUsageData.messageId
        });
      }

      // Calculate cost for response
      const cost = (stepUsage.tokens.inputTokens / 1_000_000) * 3.00 +
                  (stepUsage.tokens.outputTokens / 1_000_000) * 15.00 +
                  ((stepUsage.tokens.cacheCreationTokens || 0) / 1_000_000) * 3.75 +
                  ((stepUsage.tokens.cacheReadTokens || 0) / 1_000_000) * 0.30;

      res.status(201).json({
        success: true,
        stepUsage: {
          stepId: stepUsage.stepId,
          messageId: stepUsage.messageId,
          cost,
          tokens: stepUsage.tokens,
          timestamp: stepUsage.timestamp
        },
        sessionSummary: {
          totalCost: session.totalCost + cost,
          stepCount: session.stepCount + 1
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// ANALYTICS ENDPOINTS
// ========================================

/**
 * GET /api/cost-tracking/analytics
 * Get usage analytics with filtering and aggregation
 */
router.get('/analytics',
  authorize(['user', 'admin']),
  validateInput(analyticsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, startDate, endDate, granularity = 'day', groupBy = 'user' } = req.query;

      const params = {
        userId: userId as string,
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
        granularity: granularity as 'hour' | 'day' | 'week' | 'month'
      };

      // Non-admin users can only see their own data
      if (!['admin', 'moderator'].includes(req.user.role)) {
        params.userId = req.user.id;
      }

      const analytics = costTracker.getUsageAnalytics(params);
      const topConsumers = costTracker.getTopCostConsumers({
        startDate: params.startDate,
        endDate: params.endDate,
        groupBy: groupBy as 'user' | 'session' | 'tool'
      });

      res.json({
        success: true,
        analytics: {
          data: analytics,
          topConsumers,
          summary: {
            totalPeriods: analytics.length,
            totalCost: analytics.reduce((sum, item) => sum + (item.total_cost || 0), 0),
            totalTokens: analytics.reduce((sum, item) => sum + (item.total_input_tokens || 0) + (item.total_output_tokens || 0), 0),
            totalSteps: analytics.reduce((sum, item) => sum + (item.step_count || 0), 0)
          }
        },
        params,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/cost-tracking/metrics
 * Get real-time metrics
 */
router.get('/metrics',
  authorize(['user', 'admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentMetrics = monitoringService.getCurrentMetrics();
      const realTimeMetrics = costTracker.getRealTimeMetrics();

      res.json({
        success: true,
        metrics: {
          current: currentMetrics,
          realTime: realTimeMetrics,
          lastUpdated: currentMetrics?.timestamp || new Date()
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/cost-tracking/metrics/history
 * Get metrics history
 */
router.get('/metrics/history',
  authorize(['admin', 'moderator']),
  validateInput({
    query: {
      startDate: { type: 'string', required: false },
      endDate: { type: 'string', required: false },
      limit: { type: 'number', min: 1, max: 1000, required: false }
    }
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate, limit = 100 } = req.query;

      let timeRange;
      if (startDate && endDate) {
        timeRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string)
        };
      }

      const history = monitoringService.getMetricsHistory(timeRange);
      const limitedHistory = history.slice(-parseInt(limit as string));

      res.json({
        success: true,
        history: limitedHistory,
        count: limitedHistory.length,
        timeRange,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// ALERT MANAGEMENT ENDPOINTS
// ========================================

/**
 * GET /api/cost-tracking/alerts
 * Get active alerts
 */
router.get('/alerts',
  authorize(['admin', 'moderator']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const activeAlerts = monitoringService.getActiveAlerts();

      res.json({
        success: true,
        alerts: activeAlerts,
        count: activeAlerts.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/cost-tracking/alerts/history
 * Get alert history
 */
router.get('/alerts/history',
  authorize(['admin', 'moderator']),
  validateInput({
    query: {
      limit: { type: 'number', min: 1, max: 1000, required: false }
    }
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit = 100 } = req.query;
      const alertHistory = monitoringService.getAlertHistory(parseInt(limit as string));

      res.json({
        success: true,
        alerts: alertHistory,
        count: alertHistory.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// REPORTING ENDPOINTS
// ========================================

/**
 * GET /api/cost-tracking/reports/summary
 * Generate cost summary report
 */
router.get('/reports/summary',
  authorize(['user', 'admin']),
  validateInput({
    query: {
      startDate: { type: 'string', required: true },
      endDate: { type: 'string', required: true },
      userId: { type: 'string', required: false }
    }
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate, userId } = req.query;

      const timeRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };

      // Non-admin users can only generate reports for themselves
      const targetUserId = ['admin', 'moderator'].includes(req.user.role)
        ? (userId as string || req.user.id)
        : req.user.id;

      const report = monitoringService.generateReport(timeRange);

      res.json({
        success: true,
        report: {
          ...report,
          userId: targetUserId,
          generatedAt: new Date(),
          generatedBy: req.user.id
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/cost-tracking/reports/billing
 * Generate billing report
 */
router.get('/reports/billing',
  authorize(['admin', 'billing']),
  validateInput({
    query: {
      startDate: { type: 'string', required: true },
      endDate: { type: 'string', required: true },
      userId: { type: 'string', required: false },
      format: { type: 'string', enum: ['json', 'csv'], required: false }
    }
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate, userId, format = 'json' } = req.query;

      const timeRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };

      const params = {
        userId: userId as string,
        startDate: timeRange.start,
        endDate: timeRange.end,
        granularity: 'day' as const
      };

      const analytics = costTracker.getUsageAnalytics(params);
      const topConsumers = costTracker.getTopCostConsumers({
        startDate: timeRange.start,
        endDate: timeRange.end,
        groupBy: 'user'
      });

      const billingData = {
        timeRange,
        totalCost: analytics.reduce((sum, item) => sum + (item.total_cost || 0), 0),
        totalTokens: analytics.reduce((sum, item) => sum + (item.total_input_tokens || 0) + (item.total_output_tokens || 0), 0),
        dailyBreakdown: analytics,
        topConsumers,
        generatedAt: new Date(),
        generatedBy: req.user.id
      };

      if (format === 'csv') {
        // Convert to CSV format
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="billing-report-${startDate}-${endDate}.csv"`);

        // Simple CSV conversion (in production, use a proper CSV library)
        const csvData = analytics.map(item =>
          `${item.period},${item.total_cost},${item.total_input_tokens},${item.total_output_tokens},${item.step_count}`
        ).join('\n');

        res.send(`Period,Total Cost,Input Tokens,Output Tokens,Step Count\n${csvData}`);
      } else {
        res.json({
          success: true,
          billing: billingData,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// HEALTH & STATUS ENDPOINTS
// ========================================

/**
 * GET /api/cost-tracking/health
 * Health check for cost tracking service
 */
router.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const realTimeMetrics = costTracker.getRealTimeMetrics();
    const activeAlerts = monitoringService.getActiveAlerts();

    const health = {
      status: 'healthy',
      services: {
        costTracker: 'healthy',
        monitoring: 'healthy',
        database: 'healthy' // Would check actual database connection
      },
      metrics: realTimeMetrics,
      activeAlertsCount: activeAlerts.length,
      criticalAlertsCount: activeAlerts.filter(a => a.severity === 'critical').length,
      timestamp: new Date().toISOString()
    };

    // Determine overall health
    if (activeAlerts.some(a => a.severity === 'emergency')) {
      health.status = 'critical';
    } else if (activeAlerts.some(a => a.severity === 'critical')) {
      health.status = 'degraded';
    }

    res.status(health.status === 'healthy' ? 200 : 503).json({
      success: health.status === 'healthy',
      health
    });

  } catch (error) {
    res.status(503).json({
      success: false,
      health: {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ========================================
// WEBSOCKET SETUP
// ========================================

/**
 * Setup WebSocket endpoint for real-time cost updates
 */
export function setupCostTrackingWebSocket(server: any): void {
  const wss = new WebSocket.Server({
    port: 8081,
    path: '/ws/cost-tracking'
  });

  wss.on('connection', (ws, req) => {
    console.log('Cost tracking WebSocket client connected');

    // Handle subscription to session updates
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'subscribe' && message.sessionId) {
          (ws as any).sessionId = message.sessionId;
          ws.send(JSON.stringify({
            type: 'subscribed',
            sessionId: message.sessionId,
            timestamp: new Date().toISOString()
          }));
        }
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        }));
      }
    });

    // Send periodic metrics updates
    const metricsInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const metrics = monitoringService.getCurrentMetrics();
        ws.send(JSON.stringify({
          type: 'metrics',
          data: metrics,
          timestamp: new Date().toISOString()
        }));
      }
    }, 10000); // Every 10 seconds

    ws.on('close', () => {
      clearInterval(metricsInterval);
      console.log('Cost tracking WebSocket client disconnected');
    });
  });

  // Listen for cost updates from the cost tracker
  costTracker.on('stepTracked', (stepUsage) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && (client as any).sessionId === stepUsage.sessionId) {
        client.send(JSON.stringify({
          type: 'stepTracked',
          data: stepUsage,
          timestamp: new Date().toISOString()
        }));
      }
    });
  });

  // Listen for alerts
  monitoringService.on('alert', (alert) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'alert',
          data: alert,
          timestamp: new Date().toISOString()
        }));
      }
    });
  });
}

export default router;