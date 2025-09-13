/**
 * Avi Page Request Routes
 * API endpoints for agent page request submission and management
 * Handles the complete request lifecycle from submission to approval
 */

import express from 'express';
import aviStrategicOversight from '../services/avi-strategic-oversight.js';
import { nldPreRequestMiddleware, nldErrorHandler } from '../middleware/nld-integration.js';
import nldPatternDetectionService from '../nld-patterns/pattern-detection-service.js';

const router = express.Router();

// Apply NLD middleware to all routes
router.use(nldPreRequestMiddleware);

/**
 * Submit a page request for Avi's strategic evaluation
 * POST /api/avi/page-requests
 */
router.post('/page-requests', async (req, res) => {
  try {
    console.log('📋 Avi: Received page request submission', {
      agentId: req.body.agentId,
      pageType: req.body.pageType,
      title: req.body.title
    });
    
    const request = {
      agentId: req.body.agentId,
      pageType: req.body.pageType,
      title: req.body.title,
      justification: req.body.justification || {},
      dataRequirements: req.body.dataRequirements || {},
      priority: req.body.priority || 5,
      estimatedImpact: req.body.estimatedImpact || 0,
      resourceEstimate: req.body.resourceEstimate || {},
      requiresData: req.body.requiresData !== false, // Default true
      securityRequirements: req.body.securityRequirements || {}
    };
    
    // Submit request to Avi for evaluation
    const result = await aviStrategicOversight.submitPageRequest(request);
    
    if (result.success) {
      // If approved, coordinate with page-builder
      if (result.evaluation.decision === 'APPROVED') {
        const coordination = await aviStrategicOversight.coordinateWithPageBuilder(
          result.requestId, 
          result.evaluation
        );
        
        result.pageBuilderCoordination = coordination;
      }
      
      res.json({
        success: true,
        message: 'Page request submitted successfully',
        requestId: result.requestId,
        decision: result.evaluation.decision,
        score: result.evaluation.finalScore,
        feedback: result.evaluation.feedback,
        nextSteps: result.nextSteps,
        processingTime: result.processingTime,
        pageBuilderCoordination: result.pageBuilderCoordination
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        details: result.details,
        requestId: result.requestId,
        suggestion: result.suggestion || 'Please review request format and try again'
      });
    }
    
  } catch (error) {
    console.error('❌ Avi: Page request submission failed:', error);
    
    // Record failure pattern
    await nldPatternDetectionService.detectPattern({
      type: 'avi_request_submission_error',
      agentId: req.body.agentId,
      error: {
        message: error.message,
        stack: error.stack
      },
      description: 'Page request submission endpoint failed',
      db: aviStrategicOversight.db
    });
    
    res.status(500).json({
      success: false,
      error: 'Request submission failed',
      details: error.message
    });
  }
});

/**
 * Get request status and details
 * GET /api/avi/page-requests/:requestId
 */
router.get('/page-requests/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const db = aviStrategicOversight.db;
    const requests = await db.all(
      'SELECT * FROM avi_page_requests WHERE id = ?',
      [requestId]
    );
    
    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Request not found',
        requestId
      });
    }
    
    const request = requests[0];
    
    // Get evaluation history
    const history = await db.all(`
      SELECT * FROM avi_evaluation_history 
      WHERE request_id = ? 
      ORDER BY created_at DESC
    `, [requestId]);
    
    // Get decision log
    const decisions = await db.all(`
      SELECT * FROM avi_decision_log 
      WHERE request_id = ? 
      ORDER BY created_at DESC
    `, [requestId]);
    
    res.json({
      success: true,
      request: {
        ...request,
        justification: JSON.parse(request.justification),
        data_requirements: JSON.parse(request.data_requirements || '{}'),
        resource_estimate: JSON.parse(request.resource_estimate || '{}')
      },
      evaluationHistory: history.map(h => ({
        ...h,
        evaluation_criteria: JSON.parse(h.evaluation_criteria || '{}'),
        auto_fixes_attempted: JSON.parse(h.auto_fixes_attempted || '[]'),
        patterns_detected: JSON.parse(h.patterns_detected || '[]')
      })),
      decisionLog: decisions.map(d => ({
        ...d,
        conditions: JSON.parse(d.conditions || '{}'),
        follow_up_actions: JSON.parse(d.follow_up_actions || '[]'),
        nld_patterns: JSON.parse(d.nld_patterns || '[]')
      }))
    });
    
  } catch (error) {
    console.error('❌ Avi: Failed to get request details:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve request details',
      details: error.message
    });
  }
});

/**
 * Get agent's request history
 * GET /api/avi/agents/:agentId/requests
 */
router.get('/agents/:agentId/requests', async (req, res) => {
  try {
    const { agentId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status; // Optional filter
    
    let query = `
      SELECT * FROM avi_page_requests 
      WHERE agent_id = ?
    `;
    const params = [agentId];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    
    const db = aviStrategicOversight.db;
    const requests = await db.all(query, params);
    
    const formattedRequests = requests.map(req => ({
      ...req,
      justification: JSON.parse(req.justification),
      data_requirements: JSON.parse(req.data_requirements || '{}'),
      resource_estimate: JSON.parse(req.resource_estimate || '{}')
    }));
    
    // Get summary statistics for this agent
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        AVG(evaluation_score) as avg_score
      FROM avi_page_requests 
      WHERE agent_id = ?
    `, [agentId]);
    
    res.json({
      success: true,
      agentId,
      requests: formattedRequests,
      statistics: {
        totalRequests: stats.total_requests,
        approved: stats.approved,
        rejected: stats.rejected,
        pending: stats.pending,
        averageScore: stats.avg_score ? parseFloat(stats.avg_score.toFixed(2)) : 0,
        approvalRate: stats.total_requests > 0 
          ? ((stats.approved / stats.total_requests) * 100).toFixed(1) + '%'
          : '0%'
      }
    });
    
  } catch (error) {
    console.error('❌ Avi: Failed to get agent request history:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve request history',
      details: error.message
    });
  }
});

/**
 * Manual review endpoint for borderline cases
 * POST /api/avi/page-requests/:requestId/review
 */
router.post('/page-requests/:requestId/review', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { decision, reviewer, notes } = req.body;
    
    if (!['APPROVED', 'REJECTED', 'DEFERRED'].includes(decision)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid decision. Must be APPROVED, REJECTED, or DEFERRED'
      });
    }
    
    const db = aviStrategicOversight.db;
    
    // Update request with manual review decision
    await db.run(`
      UPDATE avi_page_requests 
      SET status = ?, decision = ?, approved_by = ?, feedback = ?
      WHERE id = ?
    `, [decision.toLowerCase(), decision, reviewer || 'manual-review', notes, requestId]);
    
    // Log the decision
    const decisionId = `dec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    await db.run(`
      INSERT INTO avi_decision_log (
        id, request_id, decision_type, decision_reason, created_at
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [decisionId, requestId, 'MANUAL_REVIEW', notes]);
    
    // If approved, coordinate with page-builder
    let coordination = null;
    if (decision === 'APPROVED') {
      coordination = await aviStrategicOversight.coordinateWithPageBuilder(
        requestId, 
        { decision, feedback: notes }
      );
    }
    
    res.json({
      success: true,
      message: 'Manual review completed',
      requestId,
      decision,
      reviewer: reviewer || 'manual-review',
      coordination
    });
    
  } catch (error) {
    console.error('❌ Avi: Manual review failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Manual review failed',
      details: error.message
    });
  }
});

/**
 * Get Avi strategic oversight statistics
 * GET /api/avi/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = aviStrategicOversight.getStats();
    
    // Get recent activity
    const db = aviStrategicOversight.db;
    const recentRequests = await db.all(`
      SELECT agent_id, request_type, status, evaluation_score, created_at 
      FROM avi_page_requests 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    // Get patterns detected
    const patternStats = await nldPatternDetectionService.getStats();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      oversight: stats,
      recentActivity: recentRequests,
      nldPatterns: patternStats,
      systemHealth: {
        status: 'healthy',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    });
    
  } catch (error) {
    console.error('❌ Avi: Failed to get statistics:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
      details: error.message
    });
  }
});

/**
 * Create a simple page request (helper endpoint for agents)
 * POST /api/avi/simple-request
 */
router.post('/simple-request', async (req, res) => {
  try {
    const { agentId, pageType = 'profile', title, reason } = req.body;
    
    if (!agentId || !title || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: agentId, title, reason'
      });
    }
    
    // Create simplified request format
    const request = {
      agentId,
      pageType,
      title,
      justification: {
        problemStatement: reason,
        impactAnalysis: 'Agent self-assessment indicates page needed for improved functionality',
        businessObjectives: 'Enhance agent visibility and user interaction',
        platformGoals: true
      },
      dataRequirements: {
        primarySources: [`${agentId}-data`],
        updateFrequency: 'real-time'
      },
      priority: 3,
      estimatedImpact: 5,
      resourceEstimate: {
        developmentTime: 4,
        performanceImpact: 'low'
      },
      requiresData: true
    };
    
    // Submit to Avi
    const result = await aviStrategicOversight.submitPageRequest(request);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Simple page request submitted successfully',
        requestId: result.requestId,
        decision: result.evaluation.decision,
        score: result.evaluation.finalScore,
        nextSteps: result.nextSteps,
        isApproved: ['APPROVED', 'CONDITIONAL'].includes(result.evaluation.decision)
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        suggestion: result.suggestion,
        canRetry: true
      });
    }
    
  } catch (error) {
    console.error('❌ Avi: Simple request failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Simple request submission failed',
      details: error.message
    });
  }
});

/**
 * Health check endpoint
 * GET /api/avi/health
 */
router.get('/health', async (req, res) => {
  try {
    // Initialize if needed
    if (!aviStrategicOversight.db) {
      await aviStrategicOversight.initialize();
    }
    
    const stats = aviStrategicOversight.getStats();
    
    res.json({
      success: true,
      service: 'avi-strategic-oversight',
      status: 'healthy',
      version: '1.0.0',
      uptime: process.uptime(),
      statistics: stats,
      capabilities: [
        'strategic-evaluation',
        'data-readiness-validation', 
        'resource-efficiency-analysis',
        'risk-assessment',
        'page-builder-coordination',
        'nld-pattern-detection'
      ]
    });
    
  } catch (error) {
    console.error('❌ Avi: Health check failed:', error);
    
    res.status(503).json({
      success: false,
      service: 'avi-strategic-oversight',
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Apply error handler
router.use(nldErrorHandler);

export default router;