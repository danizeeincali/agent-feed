/**
 * Monitoring and Alerting System Entry Point
 *
 * This module provides a comprehensive monitoring and alerting infrastructure
 * for the agent-feed application.
 */

const MonitoringService = require('./monitoring-service.js');
const AlertingService = require('./alerting-service.js');
const { createMonitoringMiddleware, initializeMonitoring } = require('./monitoring-middleware.js');

module.exports = {
  MonitoringService,
  AlertingService,
  createMonitoringMiddleware,
  initializeMonitoring
};
