/**
 * Express middleware for monitoring API requests
 */
function createMonitoringMiddleware(monitoringService) {
  return (req, res, next) => {
    const startTime = Date.now();

    // Store original end function
    const originalEnd = res.end;

    // Override end function to capture metrics
    res.end = function(...args) {
      const duration = Date.now() - startTime;

      // Record request metrics
      monitoringService.recordRequest(
        req.path,
        req.method,
        res.statusCode,
        duration
      );

      // Call original end
      originalEnd.apply(res, args);
    };

    next();
  };
}

/**
 * Initialize monitoring and alerting services
 */
function initializeMonitoring(app, db, config = {}) {
  const MonitoringService = require('./monitoring-service.js');
  const AlertingService = require('./alerting-service.js');

  // Create monitoring service
  const monitoringService = new MonitoringService({
    db,
    collectInterval: config.monitoring?.collectInterval || 10000,
    maxHistoryPoints: config.monitoring?.maxHistoryPoints || 100
  });

  // Create alerting service
  const alertingService = new AlertingService({
    rules: config.alerting?.rules || [],
    channels: config.alerting?.channels || { console: { enabled: true } },
    deduplicationWindow: config.alerting?.deduplicationWindow || 300000,
    maxAlertsPerMinute: config.alerting?.maxAlertsPerMinute || 100
  });

  // Start services if enabled
  if (config.monitoring?.enabled !== false) {
    monitoringService.start();
    console.log('✅ Monitoring service started');
  }

  // Set up periodic alert evaluation
  if (config.alerting?.enabled !== false) {
    const evaluateAlerts = () => {
      const metrics = monitoringService.getMetrics();
      alertingService.evaluateMetrics(metrics);
    };

    // Evaluate alerts after each metrics collection
    const alertInterval = setInterval(evaluateAlerts, config.monitoring?.collectInterval || 10000);

    // Store interval for cleanup
    alertingService.evaluationInterval = alertInterval;

    console.log('✅ Alerting service started');
  }

  // Add monitoring middleware to track API requests
  app.use(createMonitoringMiddleware(monitoringService));

  // Mount monitoring routes
  const monitoringRoutes = require('../../api-server/routes/monitoring.js');
  monitoringRoutes.initialize(monitoringService, alertingService);
  app.use('/api/monitoring', monitoringRoutes);

  console.log('✅ Monitoring routes mounted at /api/monitoring');

  // Graceful shutdown
  const shutdown = () => {
    console.log('Stopping monitoring services...');
    monitoringService.stop();
    alertingService.stop();
    if (alertingService.evaluationInterval) {
      clearInterval(alertingService.evaluationInterval);
    }
    console.log('✅ Monitoring services stopped');
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return {
    monitoringService,
    alertingService,
    shutdown
  };
}

module.exports = {
  createMonitoringMiddleware,
  initializeMonitoring
};
