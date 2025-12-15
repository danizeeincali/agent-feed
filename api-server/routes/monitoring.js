import express from 'express';
const router = express.Router();

let monitoringService;
let alertingService;

// Rate limiting middleware
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

function rateLimit(req, res, next) {
  const clientId = req.ip || 'unknown';
  const now = Date.now();

  if (!rateLimitMap.has(clientId)) {
    rateLimitMap.set(clientId, []);
  }

  const requests = rateLimitMap.get(clientId);
  const recentRequests = requests.filter(t => t > now - RATE_LIMIT_WINDOW);

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: RATE_LIMIT_WINDOW / 1000
    });
  }

  recentRequests.push(now);
  rateLimitMap.set(clientId, recentRequests);

  next();
}

// Apply rate limiting to all routes
router.use(rateLimit);

// Initialize with services
router.initialize = (monitoring, alerting) => {
  monitoringService = monitoring;
  alertingService = alerting;
};

// GET /api/monitoring/metrics - Current metrics snapshot
router.get('/metrics', async (req, res) => {
  try {
    const { format, type } = req.query;

    if (format === 'prometheus') {
      const metrics = monitoringService.getPrometheusMetrics();
      res.set('Content-Type', 'text/plain; version=0.0.4');
      return res.send(metrics);
    }

    let metrics = monitoringService.getMetrics();

    // Filter by type if requested
    if (type) {
      const filteredMetrics = { timestamp: metrics.timestamp };
      if (metrics[type]) {
        filteredMetrics[type] = metrics[type];
      }
      metrics = filteredMetrics;
    }

    res.json(metrics);
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

// GET /api/monitoring/health - Detailed health check
router.get('/health', async (req, res) => {
  try {
    const health = monitoringService.getHealth();

    // Add version info
    health.version = process.env.npm_package_version || '1.0.0';

    // Add uptime
    health.uptime = process.uptime();

    // Determine HTTP status based on health
    const statusCode = health.status === 'healthy' ? 200 :
                       health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    console.error('Error getting health:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// GET /api/monitoring/alerts - Active alerts
router.get('/alerts', async (req, res) => {
  try {
    const {
      severity,
      acknowledged,
      page = 1,
      limit = 50
    } = req.query;

    let alerts = alertingService.getActiveAlerts();

    // Apply filters
    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }

    if (acknowledged !== undefined) {
      const isAcknowledged = acknowledged === 'true';
      alerts = alerts.filter(a => a.acknowledged === isAcknowledged);
    }

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedAlerts = alerts.slice(startIndex, endIndex);

    // Get statistics
    const stats = alertingService.getAlertStats();

    res.json({
      alerts: paginatedAlerts,
      total: alerts.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(alerts.length / parseInt(limit)),
      stats: {
        total: stats.totalAlerts,
        active: stats.activeAlerts,
        bySeverity: stats.alertsBySeverity
      }
    });
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({ error: 'Failed to retrieve alerts' });
  }
});

// GET /api/monitoring/alerts/history - Alert history
router.get('/alerts/history', async (req, res) => {
  try {
    const {
      severity,
      ruleId,
      startTime,
      endTime,
      page = 1,
      limit = 50
    } = req.query;

    const filters = {};
    if (severity) filters.severity = severity;
    if (ruleId) filters.ruleId = ruleId;
    if (startTime) filters.startTime = parseInt(startTime);
    if (endTime) filters.endTime = parseInt(endTime);

    let history = alertingService.getAlertHistory(filters);

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedHistory = history.slice(startIndex, endIndex);

    res.json({
      alerts: paginatedHistory,
      total: history.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(history.length / parseInt(limit))
    });
  } catch (error) {
    console.error('Error getting alert history:', error);
    res.status(500).json({ error: 'Failed to retrieve alert history' });
  }
});

// POST /api/monitoring/alerts/:id/acknowledge - Acknowledge alert
router.post('/alerts/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const { acknowledgedBy } = req.body;

    if (!acknowledgedBy) {
      return res.status(400).json({ error: 'acknowledgedBy is required' });
    }

    const success = alertingService.acknowledgeAlert(id, acknowledgedBy);

    if (!success) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const alert = alertingService.getAlertHistory().find(a => a.id === id);

    res.json({
      success: true,
      alert
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// GET /api/monitoring/stats - Historical statistics
router.get('/stats', async (req, res) => {
  try {
    const {
      startTime,
      endTime,
      metrics: requestedMetrics
    } = req.query;

    const stats = monitoringService.getHistoricalStats();

    // Filter by time range if requested
    if (startTime || endTime) {
      const start = startTime ? parseInt(startTime) : 0;
      const end = endTime ? parseInt(endTime) : Date.now();

      const filterByTime = (history) => history.filter(h =>
        h.timestamp >= start && h.timestamp <= end
      );

      stats.cpuHistory = filterByTime(stats.cpuHistory);
      stats.memoryHistory = filterByTime(stats.memoryHistory);
      stats.diskHistory = filterByTime(stats.diskHistory);
      stats.requestHistory = filterByTime(stats.requestHistory || []);
      stats.errorHistory = filterByTime(stats.errorHistory || []);
      stats.dataPoints = stats.cpuHistory.length;
    }

    // Filter by specific metrics if requested
    if (requestedMetrics) {
      const metricsArray = requestedMetrics.split(',');
      const filteredStats = {
        dataPoints: stats.dataPoints,
        timeRange: stats.timeRange,
        trends: stats.trends
      };

      if (metricsArray.includes('cpu')) filteredStats.cpuHistory = stats.cpuHistory;
      if (metricsArray.includes('memory')) filteredStats.memoryHistory = stats.memoryHistory;
      if (metricsArray.includes('disk')) filteredStats.diskHistory = stats.diskHistory;
      if (metricsArray.includes('requests')) filteredStats.requestHistory = stats.requestHistory;
      if (metricsArray.includes('errors')) filteredStats.errorHistory = stats.errorHistory;

      return res.json(filteredStats);
    }

    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
});

// POST /api/monitoring/rules - Add new alert rule
router.post('/rules', async (req, res) => {
  try {
    const rule = req.body;

    // Validate required fields
    if (!rule.id || !rule.name || !rule.metric || !rule.condition || rule.threshold === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: id, name, metric, condition, threshold'
      });
    }

    alertingService.addRule(rule);

    res.status(201).json({
      success: true,
      rule
    });
  } catch (error) {
    console.error('Error adding rule:', error);
    res.status(500).json({ error: 'Failed to add rule' });
  }
});

// DELETE /api/monitoring/rules/:id - Delete alert rule
router.delete('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if rule exists
    const rules = alertingService.rules;
    const ruleExists = rules.some(r => r.id === id);

    if (!ruleExists) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    alertingService.removeRule(id);

    res.json({
      success: true,
      message: `Rule ${id} deleted`
    });
  } catch (error) {
    console.error('Error deleting rule:', error);
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

// PUT /api/monitoring/rules/:id - Update alert rule
router.put('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if rule exists
    const rules = alertingService.rules;
    const rule = rules.find(r => r.id === id);

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    alertingService.updateRule(id, updates);

    const updatedRule = alertingService.rules.find(r => r.id === id);

    res.json({
      success: true,
      rule: updatedRule
    });
  } catch (error) {
    console.error('Error updating rule:', error);
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

// GET /api/monitoring/rules - Get all alert rules
router.get('/rules', async (req, res) => {
  try {
    const rules = alertingService.rules;

    res.json({
      rules,
      total: rules.length
    });
  } catch (error) {
    console.error('Error getting rules:', error);
    res.status(500).json({ error: 'Failed to retrieve rules' });
  }
});

export default router;
