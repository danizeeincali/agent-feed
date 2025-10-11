/**
 * AVI Orchestrator Control API Routes
 * Phase 2: REST API for orchestrator management
 *
 * Endpoints:
 * - GET  /api/avi/status    - Get orchestrator status
 * - POST /api/avi/start     - Start orchestrator
 * - POST /api/avi/stop      - Stop orchestrator gracefully
 * - POST /api/avi/restart   - Restart with context reset
 * - GET  /api/avi/metrics   - Get performance metrics
 * - GET  /api/avi/health    - Health check endpoint
 */

import express from 'express';
import aviStateRepo from '../../api-server/repositories/postgres/avi-state.repository.js';
import workQueueRepo from '../../api-server/repositories/postgres/work-queue.repository.js';

const router = express.Router();

/**
 * GET /api/avi/status
 * Get current orchestrator status
 */
router.get('/status', async (req, res) => {
  try {
    const state = await aviStateRepo.getState();

    if (!state) {
      return res.status(404).json({
        success: false,
        error: 'Orchestrator state not found'
      });
    }

    const queueStats = await workQueueRepo.getQueueStats();

    res.json({
      success: true,
      data: {
        status: state.status,
        contextSize: state.context_size,
        activeWorkers: state.active_workers || 0,
        workersSpawned: state.workers_spawned || 0,
        ticketsProcessed: state.tickets_processed || 0,
        uptimeSeconds: state.uptime_seconds || 0,
        lastHealthCheck: state.last_health_check,
        lastError: state.last_error,
        queueStats: {
          pending: parseInt(queueStats.pending_count) || 0,
          processing: parseInt(queueStats.processing_count) || 0,
          completed: parseInt(queueStats.completed_count) || 0,
          failed: parseInt(queueStats.failed_count) || 0
        }
      }
    });
  } catch (error) {
    console.error('Error getting AVI status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/avi/start
 * Start the orchestrator
 */
router.post('/start', async (req, res) => {
  try {
    const state = await aviStateRepo.getState();

    if (state && state.status === 'running') {
      return res.status(400).json({
        success: false,
        error: 'Orchestrator is already running'
      });
    }

    // Mark as running
    await aviStateRepo.markRunning();

    res.json({
      success: true,
      message: 'Orchestrator started',
      data: await aviStateRepo.getState()
    });
  } catch (error) {
    console.error('Error starting AVI:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/avi/stop
 * Stop the orchestrator gracefully
 */
router.post('/stop', async (req, res) => {
  try {
    const state = await aviStateRepo.getState();

    if (!state || state.status !== 'running') {
      return res.status(400).json({
        success: false,
        error: 'Orchestrator is not running'
      });
    }

    // Get pending tickets to preserve
    const pendingCount = await workQueueRepo.getPendingCount();
    const pendingTickets = await workQueueRepo.getTicketsByUser(null, {
      status: 'pending',
      limit: 100
    });

    const ticketIds = pendingTickets.map(t => t.id.toString());

    // Record graceful stop
    await aviStateRepo.updateState({
      status: 'stopped',
      pending_tickets: ticketIds
    });

    res.json({
      success: true,
      message: 'Orchestrator stopped gracefully',
      data: {
        preservedTickets: ticketIds.length,
        pendingTickets: pendingCount
      }
    });
  } catch (error) {
    console.error('Error stopping AVI:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/avi/restart
 * Restart orchestrator with context reset
 */
router.post('/restart', async (req, res) => {
  try {
    // Get pending tickets
    const pendingTickets = await workQueueRepo.getTicketsByUser(null, {
      status: 'pending',
      limit: 100
    });
    const ticketIds = pendingTickets.map(t => t.id.toString());

    // Record restart
    await aviStateRepo.recordRestart(ticketIds);

    // Wait a moment for restart
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mark as running again
    await aviStateRepo.markRunning();

    res.json({
      success: true,
      message: 'Orchestrator restarted',
      data: await aviStateRepo.getState()
    });
  } catch (error) {
    console.error('Error restarting AVI:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/avi/metrics
 * Get orchestrator performance metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await aviStateRepo.getMetrics();
    const queueStats = await workQueueRepo.getQueueStats();
    const uptime = await aviStateRepo.getUptime();

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Metrics not available'
      });
    }

    res.json({
      success: true,
      data: {
        orchestrator: {
          status: metrics.status,
          contextSize: metrics.context_size,
          activeWorkers: metrics.active_workers,
          workersSpawned: metrics.workers_spawned,
          ticketsProcessed: metrics.tickets_processed,
          uptimeSeconds: uptime,
          lastHealthCheck: metrics.last_health_check,
          lastError: metrics.last_error
        },
        queue: {
          pending: parseInt(queueStats.pending_count) || 0,
          assigned: parseInt(queueStats.assigned_count) || 0,
          processing: parseInt(queueStats.processing_count) || 0,
          completed: parseInt(queueStats.completed_count) || 0,
          failed: parseInt(queueStats.failed_count) || 0,
          total: parseInt(queueStats.total_count) || 0,
          avgProcessingTime: queueStats.avg_processing_time_seconds
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting AVI metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/avi/health
 * Health check endpoint for monitoring
 */
router.get('/health', async (req, res) => {
  try {
    const state = await aviStateRepo.getState();
    const isOverLimit = await aviStateRepo.isContextOverLimit(50000);

    const healthy = state &&
                    state.status === 'running' &&
                    !isOverLimit &&
                    !state.last_error;

    res.json({
      success: true,
      healthy,
      data: {
        status: state?.status || 'unknown',
        contextSize: state?.context_size || 0,
        contextOverLimit: isOverLimit,
        activeWorkers: state?.active_workers || 0,
        lastHealthCheck: state?.last_health_check,
        lastError: state?.last_error,
        warnings: isOverLimit ? ['Context size over limit'] : []
      }
    });
  } catch (error) {
    console.error('Error checking AVI health:', error);
    res.status(500).json({
      success: false,
      healthy: false,
      error: error.message
    });
  }
});

export default router;
