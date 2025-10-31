/**
 * Streaming Loop Protection Monitoring Routes
 * API endpoints for monitoring worker health, circuit breaker, and streaming statistics
 */

import express from 'express';
import { getEmergencyMonitor } from '../services/emergency-monitor.js';
import { getHealthMonitor } from '../services/worker-health-monitor.js';
import { getCircuitBreaker } from '../services/circuit-breaker.js';

const router = express.Router();

// Get singleton instances
const emergencyMonitor = getEmergencyMonitor();
const healthMonitor = getHealthMonitor();
const circuitBreaker = getCircuitBreaker();

/**
 * GET /api/streaming-monitoring/workers
 * Returns active workers health status
 */
router.get('/workers', async (req, res) => {
  try {
    const stats = healthMonitor.getStats();
    const unhealthyWorkers = healthMonitor.getUnhealthyWorkers();

    res.json({
      success: true,
      data: {
        activeWorkers: stats.workers || [],
        totalActive: stats.totalWorkers || 0,
        unhealthy: stats.unhealthyWorkers || 0,
        avgRuntime: stats.avgRuntime || 0,
        unhealthyDetails: unhealthyWorkers
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting workers:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/streaming-monitoring/circuit-breaker
 * Returns circuit breaker state
 */
router.get('/circuit-breaker', async (req, res) => {
  try {
    const stats = circuitBreaker.getStats();

    // Convert failureReasons object to failures array for test compatibility
    const failures = [];
    if (stats.failureReasons) {
      for (const [reason, count] of Object.entries(stats.failureReasons)) {
        for (let i = 0; i < count; i++) {
          failures.push({ reason, timestamp: Date.now() });
        }
      }
    }

    res.json({
      success: true,
      data: {
        state: stats.state,
        failures: failures,
        recentFailures: stats.recentFailures || 0,
        threshold: stats.config?.failureThreshold || 3,
        nextResetTime: stats.resetTime,
        isHealthy: stats.isHealthy
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting circuit breaker state:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/streaming-monitoring/streaming-stats
 * Returns real-time streaming statistics
 */
router.get('/streaming-stats', async (req, res) => {
  try {
    const stats = emergencyMonitor.getStreamingStats();

    res.json({
      success: true,
      data: {
        totalQueries: stats.totalQueries,
        activeStreams: stats.activeStreams,
        autoKills: stats.autoKills,
        avgChunksPerQuery: stats.avgChunksPerQuery,
        avgResponseTime: stats.avgResponseTime,
        loopDetections: stats.loopDetections,
        lastCheck: stats.lastCheck
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting streaming stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/streaming-monitoring/cost-estimate
 * Returns current cost tracking
 */
router.get('/cost-estimate', async (req, res) => {
  try {
    const costData = emergencyMonitor.getCostEstimate();

    res.json({
      success: true,
      data: {
        estimatedCost: costData.estimatedCost,
        tokensUsed: costData.tokensUsed,
        inputTokens: costData.inputTokens,
        outputTokens: costData.outputTokens,
        queriesProcessed: costData.queriesProcessed,
        costPerQuery: costData.costPerQuery
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting cost estimate:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/streaming-monitoring/kill-worker/:workerId
 * Manual kill switch for a worker
 */
router.post('/kill-worker/:workerId', async (req, res) => {
  try {
    const { workerId } = req.params;
    const { reason } = req.body;

    if (!workerId) {
      return res.status(400).json({
        success: false,
        error: 'Worker ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const result = await emergencyMonitor.manualKill(workerId, reason || 'Manual kill');

    res.json({
      success: true,
      data: {
        workerId: result.workerId,
        killed: result.killed,
        reason: result.reason
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error killing worker:', error);

    // Worker not found
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Other errors
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/streaming-monitoring/health
 * Overall system health check
 */
router.get('/health', async (req, res) => {
  try {
    const monitorStatus = emergencyMonitor.getStatus();
    const circuitStats = circuitBreaker.getStats();
    const healthStats = healthMonitor.getStats();

    // Determine overall health status
    let status = 'healthy';
    if (circuitStats.state === 'OPEN') {
      status = 'critical';
    } else if (healthStats.unhealthyWorkers > 0) {
      status = 'degraded';
    }

    res.json({
      success: true,
      data: {
        status,
        components: {
          emergencyMonitor: {
            running: monitorStatus.running,
            interval: monitorStatus.interval,
            checksPerformed: monitorStatus.stats.checksPerformed,
            workersKilled: monitorStatus.stats.workersKilled,
            lastCheck: monitorStatus.stats.lastCheck
          },
          circuitBreaker: {
            state: circuitStats.state,
            recentFailures: circuitStats.recentFailures,
            threshold: circuitStats.config?.failureThreshold || 3,
            isHealthy: circuitStats.isHealthy
          },
          healthMonitor: {
            totalActive: healthStats.totalWorkers || 0,
            unhealthy: healthStats.unhealthyWorkers || 0,
            avgRuntime: healthStats.avgRuntime || 0
          }
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting health:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      status: 'critical',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/streaming-monitoring/circuit-breaker/reset
 * Manually reset circuit breaker
 */
router.post('/circuit-breaker/reset', async (req, res) => {
  try {
    circuitBreaker.reset();

    res.json({
      success: true,
      data: {
        message: 'Circuit breaker reset successfully',
        state: circuitBreaker.getState()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error resetting circuit breaker:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
