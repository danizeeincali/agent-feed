import express from 'express';
import feedbackLoop from '../services/feedback-loop.js';

const router = express.Router();

// Database access helper (will be set during initialization)
let dbHelper = null;

export function initializeFeedbackRoutes(db) {
  dbHelper = {
    get: (query, params = []) => db.prepare(query).get(...params),
    all: (query, params = []) => db.prepare(query).all(...params),
    run: (query, params = []) => db.prepare(query).run(...params)
  };
}

// Note: feedbackLoop service has db injected via setDatabase()

/**
 * GET /api/feedback/agents/:agentId/metrics
 * Get comprehensive metrics for an agent
 */
router.get('/agents/:agentId/metrics', async (req, res) => {
  try {
    const { agentId } = req.params;
    const metrics = await feedbackLoop.getAgentMetrics(agentId);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('[Feedback] Error fetching agent metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/feedback/agents/:agentId/patterns
 * Get failure patterns for an agent
 */
router.get('/agents/:agentId/patterns', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status = 'active' } = req.query;

    let patterns = await feedbackLoop.getFailurePatterns(agentId);

    // Filter by status if provided
    if (status !== 'all') {
      patterns = patterns.filter(p => p.status === status);
    }

    res.json({
      success: true,
      data: patterns
    });
  } catch (error) {
    console.error('[Feedback] Error fetching patterns:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/feedback/agents/:agentId/history
 * Get failure history for an agent
 */
router.get('/agents/:agentId/history', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { limit = 50, offset = 0, errorType } = req.query;

    let query = `
      SELECT * FROM validation_failures
      WHERE agent_id = ?
    `;
    const params = [agentId];

    if (errorType) {
      query += ` AND error_type = ?`;
      params.push(errorType);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const failures = dbHelper.all(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total FROM validation_failures
      WHERE agent_id = ?
    `;
    const countParams = [agentId];
    if (errorType) {
      countQuery += ` AND error_type = ?`;
      countParams.push(errorType);
    }

    const { total } = dbHelper.get(countQuery, countParams);

    res.json({
      success: true,
      data: {
        failures,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + failures.length < total
        }
      }
    });
  } catch (error) {
    console.error('[Feedback] Error fetching history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/feedback/agents/:agentId/reset
 * Reset learning for an agent
 */
router.post('/agents/:agentId/reset', async (req, res) => {
  try {
    const { agentId } = req.params;
    const result = await feedbackLoop.resetAgent(agentId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Feedback] Error resetting agent:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/feedback/report
 * Generate comprehensive feedback report
 */
router.get('/report', async (req, res) => {
  try {
    const { agentId, days = 7 } = req.query;
    const report = await feedbackLoop.generateReport(
      agentId || null,
      parseInt(days)
    );

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('[Feedback] Error generating report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/feedback/dashboard
 * Get dashboard overview of all agents
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Get all agents with recent activity
    const agents = dbHelper.all(`
      SELECT DISTINCT agent_id
      FROM validation_failures
      WHERE created_at >= datetime('now', '-30 days')
    `);

    const dashboard = await Promise.all(
      agents.map(async ({ agent_id }) => {
        const metrics = await feedbackLoop.getAgentMetrics(agent_id);
        return {
          agent_id,
          health_score: metrics.health_score,
          success_rate: metrics.success_rate,
          active_patterns: metrics.active_patterns,
          recent_failures: metrics.recent_failures.length
        };
      })
    );

    // Sort by health score
    dashboard.sort((a, b) => a.health_score - b.health_score);

    res.json({
      success: true,
      data: {
        agents: dashboard,
        summary: {
          total_agents: dashboard.length,
          healthy_agents: dashboard.filter(a => a.health_score >= 80).length,
          warning_agents: dashboard.filter(a => a.health_score >= 50 && a.health_score < 80).length,
          critical_agents: dashboard.filter(a => a.health_score < 50).length
        }
      }
    });
  } catch (error) {
    console.error('[Feedback] Error fetching dashboard:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/feedback/patterns/:patternId
 * Get detailed information about a specific pattern
 */
router.get('/patterns/:patternId', async (req, res) => {
  try {
    const { patternId } = req.params;

    const pattern = dbHelper.get(
      `SELECT * FROM failure_patterns WHERE id = ?`,
      [patternId]
    );

    if (!pattern) {
      return res.status(404).json({
        success: false,
        error: 'Pattern not found'
      });
    }

    // Get related failures
    const failures = dbHelper.all(
      `SELECT * FROM validation_failures
       WHERE agent_id = ? AND error_type = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [pattern.agent_id, pattern.pattern_type]
    );

    // Get feedback for this pattern
    const feedback = dbHelper.all(
      `SELECT * FROM agent_feedback
       WHERE pattern_id = ?
       ORDER BY created_at DESC`,
      [patternId]
    );

    res.json({
      success: true,
      data: {
        pattern,
        recent_failures: failures,
        feedback
      }
    });
  } catch (error) {
    console.error('[Feedback] Error fetching pattern details:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /api/feedback/patterns/:patternId
 * Update pattern status
 */
router.patch('/patterns/:patternId', async (req, res) => {
  try {
    const { patternId } = req.params;
    const { status } = req.body;

    if (!['active', 'resolved', 'ignored'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: active, resolved, or ignored'
      });
    }

    dbHelper.run(
      `UPDATE failure_patterns SET status = ? WHERE id = ?`,
      [status, patternId]
    );

    const updated = dbHelper.get(
      `SELECT * FROM failure_patterns WHERE id = ?`,
      [patternId]
    );

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('[Feedback] Error updating pattern:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/feedback/stats
 * Get overall system statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      totalFailures: dbHelper.get(
        `SELECT COUNT(*) as count FROM validation_failures`
      ),
      totalPatterns: dbHelper.get(
        `SELECT COUNT(*) as count FROM failure_patterns`
      ),
      activePatterns: dbHelper.get(
        `SELECT COUNT(*) as count FROM failure_patterns WHERE status = 'active'`
      ),
      autoFixesApplied: dbHelper.get(
        `SELECT COUNT(*) as count FROM failure_patterns WHERE auto_fix_applied = 1`
      ),
      recentActivity: dbHelper.all(
        `SELECT
          date,
          SUM(total_attempts) as attempts,
          SUM(successful_attempts) as successes,
          SUM(failed_attempts) as failures,
          AVG(success_rate) as avg_success_rate
         FROM agent_performance_metrics
         WHERE date >= date('now', '-7 days')
         GROUP BY date
         ORDER BY date DESC`
      )
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[Feedback] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
