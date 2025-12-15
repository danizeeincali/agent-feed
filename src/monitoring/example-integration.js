/**
 * Example: Integrating Monitoring and Alerting into an Express Application
 *
 * This example shows how to add comprehensive monitoring to your Express app.
 */

const express = require('express');
const Database = require('better-sqlite3');
const { initializeMonitoring } = require('./monitoring-middleware.js');
const fs = require('fs');
const path = require('path');

// Load configuration
const configPath = path.join(__dirname, '../../config/monitoring-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Create Express app
const app = express();
app.use(express.json());

// Connect to database
const db = new Database('./database.db');

// Initialize monitoring and alerting
const { monitoringService, alertingService, shutdown } = initializeMonitoring(app, db, config);

// Example routes
app.get('/api/test', (req, res) => {
  res.json({ message: 'Hello World' });
});

app.post('/api/data', (req, res) => {
  try {
    // Simulate some work
    const result = { id: Date.now(), data: req.body };
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Custom business metrics example
app.post('/api/user/signup', (req, res) => {
  // Record custom business metric
  monitoringService.recordCustomMetric('user_signups', 1);

  res.json({ success: true });
});

// Start server
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Monitoring endpoints:`);
  console.log(`  - Metrics: http://localhost:${PORT}/api/monitoring/metrics`);
  console.log(`  - Health: http://localhost:${PORT}/api/monitoring/health`);
  console.log(`  - Alerts: http://localhost:${PORT}/api/monitoring/alerts`);
  console.log(`  - Stats: http://localhost:${PORT}/api/monitoring/stats`);
  console.log(`  - Prometheus: http://localhost:${PORT}/api/monitoring/metrics?format=prometheus`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    shutdown();
    db.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  server.close(() => {
    shutdown();
    db.close();
    process.exit(0);
  });
});

// Example: Programmatic access to metrics
setInterval(() => {
  const metrics = monitoringService.getMetrics();
  console.log(`\n📊 Current System Status:`);
  console.log(`  CPU: ${metrics.system.cpu?.usage?.toFixed(2)}%`);
  console.log(`  Memory: ${metrics.system.memory?.usedPercentage?.toFixed(2)}%`);
  console.log(`  API Requests: ${metrics.api.totalRequests}`);
  console.log(`  Error Rate: ${metrics.api.errorRate?.toFixed(2)}%`);

  const activeAlerts = alertingService.getActiveAlerts();
  if (activeAlerts.length > 0) {
    console.log(`  🚨 Active Alerts: ${activeAlerts.length}`);
  }
}, 30000); // Every 30 seconds
