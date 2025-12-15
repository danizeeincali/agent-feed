/**
 * Claude Code SDK Cost Tracking Analytics - API Endpoints
 * RESTful API design for analytics dashboard and real-time monitoring
 */

import { Express, Request, Response, NextFunction } from 'express';
import { SDKUsageEvent, UsageAnalytics, LiveMetrics, Alert } from './01-data-models';

// =============================================
// API ROUTE DEFINITIONS
// =============================================

export interface AnalyticsApiRoutes {
  // Usage Analytics
  'GET /api/analytics/usage': GetUsageAnalyticsRoute;
  'GET /api/analytics/usage/summary': GetUsageSummaryRoute;
  'GET /api/analytics/usage/trends': GetUsageTrendsRoute;
  'GET /api/analytics/usage/export': ExportUsageDataRoute;

  // Cost Analytics
  'GET /api/analytics/costs': GetCostAnalyticsRoute;
  'GET /api/analytics/costs/breakdown': GetCostBreakdownRoute;
  'GET /api/analytics/costs/projections': GetCostProjectionsRoute;
  'GET /api/analytics/costs/optimization': GetCostOptimizationRoute;

  // Performance Analytics
  'GET /api/analytics/performance': GetPerformanceMetricsRoute;
  'GET /api/analytics/performance/bottlenecks': GetBottlenecksRoute;
  'GET /api/analytics/performance/trends': GetPerformanceTrendsRoute;

  // Real-time Monitoring
  'GET /api/analytics/live': GetLiveMetricsRoute;
  'GET /api/analytics/live/stream': StreamLiveMetricsRoute; // Server-Sent Events
  'GET /api/analytics/live/status': GetSystemStatusRoute;

  // User Analytics
  'GET /api/analytics/users': GetUserAnalyticsRoute;
  'GET /api/analytics/users/:userId': GetUserDetailsRoute;
  'GET /api/analytics/users/:userId/usage': GetUserUsageRoute;
  'GET /api/analytics/users/:userId/costs': GetUserCostsRoute;

  // Alerting
  'GET /api/analytics/alerts': GetAlertsRoute;
  'POST /api/analytics/alerts': CreateAlertRoute;
  'PUT /api/analytics/alerts/:alertId': UpdateAlertRoute;
  'DELETE /api/analytics/alerts/:alertId': DeleteAlertRoute;
  'POST /api/analytics/alerts/:alertId/acknowledge': AcknowledgeAlertRoute;

  // Configuration
  'GET /api/analytics/config': GetConfigurationRoute;
  'PUT /api/analytics/config': UpdateConfigurationRoute;
  'GET /api/analytics/thresholds': GetThresholdsRoute;
  'POST /api/analytics/thresholds': CreateThresholdRoute;

  // Reports
  'GET /api/analytics/reports': GetReportsRoute;
  'POST /api/analytics/reports/generate': GenerateReportRoute;
  'GET /api/analytics/reports/:reportId': GetReportRoute;
  'GET /api/analytics/reports/:reportId/download': DownloadReportRoute;
}

// =============================================
// REQUEST/RESPONSE INTERFACES
// =============================================

// Usage Analytics Endpoints
export interface GetUsageAnalyticsRoute {
  query: {
    startDate: string;
    endDate: string;
    granularity?: 'hour' | 'day' | 'week' | 'month';
    groupBy?: string[];
    filters?: {
      userId?: string;
      model?: string;
      feature?: string;
      region?: string;
    };
    metrics?: string[];
  };
  response: {
    success: boolean;
    data: UsageAnalytics;
    metadata: {
      totalRecords: number;
      processingTime: number;
      cacheHit: boolean;
    };
  };
}

export interface GetUsageSummaryRoute {
  query: {
    period: 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year';
    compare?: boolean;
  };
  response: {
    success: boolean;
    data: {
      current: UsageSummary;
      previous?: UsageSummary;
      change?: UsageChange;
    };
  };
}

export interface GetUsageTrendsRoute {
  query: {
    metric: string;
    period: string;
    interval: 'hour' | 'day' | 'week';
    forecast?: boolean;
  };
  response: {
    success: boolean;
    data: {
      historical: TrendPoint[];
      forecast?: TrendPoint[];
      seasonality?: SeasonalityInfo;
    };
  };
}

// Cost Analytics Endpoints
export interface GetCostAnalyticsRoute {
  query: {
    startDate: string;
    endDate: string;
    breakdown: 'model' | 'user' | 'feature' | 'time' | 'region';
    currency?: 'USD' | 'EUR' | 'GBP';
  };
  response: {
    success: boolean;
    data: {
      totalCost: number;
      breakdown: CostBreakdownItem[];
      trends: CostTrend[];
      topSpenders: CostSpender[];
    };
  };
}

export interface GetCostProjectionsRoute {
  query: {
    horizon: '1week' | '1month' | '3months' | '1year';
    confidence?: number;
    includeScenarios?: boolean;
  };
  response: {
    success: boolean;
    data: {
      baselineProjection: CostProjection;
      scenarios?: {
        optimistic: CostProjection;
        pessimistic: CostProjection;
        conservative: CostProjection;
      };
      recommendations: OptimizationRecommendation[];
    };
  };
}

// Real-time Monitoring Endpoints
export interface GetLiveMetricsRoute {
  response: {
    success: boolean;
    data: LiveMetrics;
    lastUpdated: string;
  };
}

export interface StreamLiveMetricsRoute {
  response: {
    // Server-Sent Events stream
    contentType: 'text/event-stream';
    events: Array<{
      event: 'metrics' | 'alert' | 'heartbeat';
      data: LiveMetrics | Alert | { timestamp: string };
    }>;
  };
}

// User Analytics Endpoints
export interface GetUserAnalyticsRoute {
  query: {
    page?: number;
    limit?: number;
    sortBy?: 'usage' | 'cost' | 'lastSeen' | 'errorRate';
    sortOrder?: 'asc' | 'desc';
    filters?: {
      costTier?: string;
      usageLevel?: 'low' | 'medium' | 'high';
      lastSeenDays?: number;
    };
  };
  response: {
    success: boolean;
    data: {
      users: UserAnalyticsSummary[];
      pagination: PaginationInfo;
      aggregates: UserAggregates;
    };
  };
}

export interface GetUserDetailsRoute {
  params: {
    userId: string;
  };
  query: {
    includeHistory?: boolean;
    historyDays?: number;
  };
  response: {
    success: boolean;
    data: {
      user: UserProfile;
      usage: UserUsageStats;
      costs: UserCostStats;
      performance: UserPerformanceStats;
      recommendations?: OptimizationRecommendation[];
    };
  };
}

// =============================================
// API IMPLEMENTATION STRUCTURE
// =============================================

export class AnalyticsApiController {
  private analyticsService: IAnalyticsService;
  private costService: ICostService;
  private alertService: IAlertService;
  private userService: IUserService;

  constructor(
    analyticsService: IAnalyticsService,
    costService: ICostService,
    alertService: IAlertService,
    userService: IUserService
  ) {
    this.analyticsService = analyticsService;
    this.costService = costService;
    this.alertService = alertService;
    this.userService = userService;
  }

  // ==========================================
  // USAGE ANALYTICS ENDPOINTS
  // ==========================================

  async getUsageAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, granularity, groupBy, filters, metrics } = req.query;

      // Validate input
      const validationResult = this.validateTimeRange(startDate as string, endDate as string);
      if (!validationResult.valid) {
        res.status(400).json({
          success: false,
          error: validationResult.error
        });
        return;
      }

      // Build query object
      const query: AnalyticsQuery = {
        timeRange: {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string)
        },
        granularity: granularity as any || 'day',
        groupBy: groupBy ? (groupBy as string).split(',') : [],
        filters: filters ? JSON.parse(filters as string) : {},
        metrics: metrics ? (metrics as string).split(',') : []
      };

      const startTime = Date.now();
      const analytics = await this.analyticsService.getUsageAnalytics(query);
      const processingTime = Date.now() - startTime;

      res.json({
        success: true,
        data: analytics,
        metadata: {
          totalRecords: analytics.volume.totalRequests,
          processingTime,
          cacheHit: processingTime < 100 // Simple cache detection
        }
      });

    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve usage analytics');
    }
  }

  async getUsageSummary(req: Request, res: Response): Promise<void> {
    try {
      const { period, compare } = req.query;

      const currentPeriod = this.calculatePeriodRange(period as string);
      const currentSummary = await this.analyticsService.getUsageSummary(currentPeriod);

      let previousSummary = null;
      let change = null;

      if (compare === 'true') {
        const previousPeriod = this.calculatePreviousPeriod(period as string);
        previousSummary = await this.analyticsService.getUsageSummary(previousPeriod);
        change = this.calculateUsageChange(currentSummary, previousSummary);
      }

      res.json({
        success: true,
        data: {
          current: currentSummary,
          previous: previousSummary,
          change
        }
      });

    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve usage summary');
    }
  }

  async getUsageTrends(req: Request, res: Response): Promise<void> {
    try {
      const { metric, period, interval, forecast } = req.query;

      const timeRange = this.parsePeriod(period as string);
      const historical = await this.analyticsService.getTrends(
        metric as string,
        timeRange,
        interval as any
      );

      let forecastData = null;
      let seasonality = null;

      if (forecast === 'true') {
        const forecastResult = await this.analyticsService.generateForecast(
          metric as string,
          historical,
          7 // 7 periods ahead
        );
        forecastData = forecastResult.forecast;
        seasonality = forecastResult.seasonality;
      }

      res.json({
        success: true,
        data: {
          historical,
          forecast: forecastData,
          seasonality
        }
      });

    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve usage trends');
    }
  }

  // ==========================================
  // COST ANALYTICS ENDPOINTS
  // ==========================================

  async getCostAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, breakdown, currency } = req.query;

      const timeRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      };

      const costAnalytics = await this.costService.getCostAnalytics({
        timeRange,
        breakdown: breakdown as any,
        currency: currency as any || 'USD'
      });

      res.json({
        success: true,
        data: costAnalytics
      });

    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve cost analytics');
    }
  }

  async getCostProjections(req: Request, res: Response): Promise<void> {
    try {
      const { horizon, confidence, includeScenarios } = req.query;

      const projectionResult = await this.costService.generateProjections({
        horizon: horizon as any,
        confidence: confidence ? parseFloat(confidence as string) : 0.95,
        includeScenarios: includeScenarios === 'true'
      });

      res.json({
        success: true,
        data: projectionResult
      });

    } catch (error) {
      this.handleError(res, error, 'Failed to generate cost projections');
    }
  }

  // ==========================================
  // REAL-TIME MONITORING ENDPOINTS
  // ==========================================

  async getLiveMetrics(req: Request, res: Response): Promise<void> {
    try {
      const liveMetrics = await this.analyticsService.getLiveMetrics();

      res.json({
        success: true,
        data: liveMetrics,
        lastUpdated: new Date().toISOString()
      });

    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve live metrics');
    }
  }

  streamLiveMetrics(req: Request, res: Response): void {
    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send initial connection event
    res.write(`data: ${JSON.stringify({
      event: 'connected',
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Set up live metrics streaming
    const streamInterval = setInterval(async () => {
      try {
        const liveMetrics = await this.analyticsService.getLiveMetrics();
        res.write(`event: metrics\n`);
        res.write(`data: ${JSON.stringify(liveMetrics)}\n\n`);
      } catch (error) {
        console.error('Error streaming live metrics:', error);
      }
    }, 5000); // Update every 5 seconds

    // Set up alert streaming
    const alertSubscription = this.alertService.subscribe((alert: Alert) => {
      res.write(`event: alert\n`);
      res.write(`data: ${JSON.stringify(alert)}\n\n`);
    });

    // Heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      res.write(`event: heartbeat\n`);
      res.write(`data: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
    }, 30000);

    // Cleanup on client disconnect
    req.on('close', () => {
      clearInterval(streamInterval);
      clearInterval(heartbeatInterval);
      alertSubscription.unsubscribe();
    });
  }

  // ==========================================
  // USER ANALYTICS ENDPOINTS
  // ==========================================

  async getUserAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = 'usage',
        sortOrder = 'desc',
        filters = '{}'
      } = req.query;

      const query = {
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        },
        sorting: {
          field: sortBy as string,
          order: sortOrder as 'asc' | 'desc'
        },
        filters: JSON.parse(filters as string)
      };

      const result = await this.userService.getUserAnalytics(query);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve user analytics');
    }
  }

  async getUserDetails(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { includeHistory, historyDays } = req.query;

      const userDetails = await this.userService.getUserDetails(userId, {
        includeHistory: includeHistory === 'true',
        historyDays: historyDays ? parseInt(historyDays as string) : 30
      });

      res.json({
        success: true,
        data: userDetails
      });

    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve user details');
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  private validateTimeRange(startDate: string, endDate: string): { valid: boolean; error?: string } {
    if (!startDate || !endDate) {
      return { valid: false, error: 'Start date and end date are required' };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { valid: false, error: 'Invalid date format' };
    }

    if (start >= end) {
      return { valid: false, error: 'Start date must be before end date' };
    }

    const maxRange = 90 * 24 * 60 * 60 * 1000; // 90 days
    if (end.getTime() - start.getTime() > maxRange) {
      return { valid: false, error: 'Date range cannot exceed 90 days' };
    }

    return { valid: true };
  }

  private handleError(res: Response, error: any, message: string): void {
    console.error(message, error);

    res.status(500).json({
      success: false,
      error: message,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  private calculatePeriodRange(period: string): TimeRange {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (period) {
      case 'today':
        return {
          startDate: startOfDay,
          endDate: now
        };
      case 'yesterday':
        const yesterday = new Date(startOfDay);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          startDate: yesterday,
          endDate: startOfDay
        };
      case 'week':
        const weekStart = new Date(startOfDay);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return {
          startDate: weekStart,
          endDate: now
        };
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          startDate: monthStart,
          endDate: now
        };
      default:
        return {
          startDate: startOfDay,
          endDate: now
        };
    }
  }
}

// =============================================
// MIDDLEWARE AND ROUTE SETUP
// =============================================

export function setupAnalyticsRoutes(
  app: Express,
  controller: AnalyticsApiController,
  authMiddleware: any,
  rateLimitMiddleware: any
): void {

  // Apply middleware
  app.use('/api/analytics', authMiddleware);
  app.use('/api/analytics', rateLimitMiddleware);

  // Usage Analytics Routes
  app.get('/api/analytics/usage', controller.getUsageAnalytics.bind(controller));
  app.get('/api/analytics/usage/summary', controller.getUsageSummary.bind(controller));
  app.get('/api/analytics/usage/trends', controller.getUsageTrends.bind(controller));

  // Cost Analytics Routes
  app.get('/api/analytics/costs', controller.getCostAnalytics.bind(controller));
  app.get('/api/analytics/costs/projections', controller.getCostProjections.bind(controller));

  // Real-time Monitoring Routes
  app.get('/api/analytics/live', controller.getLiveMetrics.bind(controller));
  app.get('/api/analytics/live/stream', controller.streamLiveMetrics.bind(controller));

  // User Analytics Routes
  app.get('/api/analytics/users', controller.getUserAnalytics.bind(controller));
  app.get('/api/analytics/users/:userId', controller.getUserDetails.bind(controller));
}

// =============================================
// SUPPORTING TYPES
// =============================================

export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

export interface AnalyticsQuery {
  timeRange: TimeRange;
  granularity: 'hour' | 'day' | 'week' | 'month';
  groupBy: string[];
  filters: Record<string, any>;
  metrics: string[];
}

export interface UsageSummary {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  uniqueUsers: number;
  avgResponseTime: number;
  errorRate: number;
}

export interface UsageChange {
  requests: { value: number; percentage: number };
  tokens: { value: number; percentage: number };
  cost: { value: number; percentage: number };
  users: { value: number; percentage: number };
}

export interface TrendPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface SeasonalityInfo {
  pattern: 'daily' | 'weekly' | 'monthly';
  strength: number;
  peaks: string[];
  valleys: string[];
}

export interface CostBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface CostTrend {
  period: string;
  amount: number;
  change: number;
}

export interface CostSpender {
  id: string;
  name: string;
  amount: number;
  percentage: number;
}

export interface CostProjection {
  period: string;
  amount: number;
  confidence: number;
  factors: string[];
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface UserAnalyticsSummary {
  userId: string;
  username?: string;
  totalUsage: number;
  totalCost: number;
  lastSeen: string;
  status: 'active' | 'inactive';
}

export interface UserAggregates {
  totalUsers: number;
  activeUsers: number;
  totalCost: number;
  avgCostPerUser: number;
}