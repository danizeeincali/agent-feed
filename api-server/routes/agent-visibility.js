/**
 * Agent Visibility API Routes
 * Endpoints for agent visibility, introduction tracking, and progressive revelation
 */

import express from 'express';
import { createAgentVisibilityService } from '../services/agent-visibility-service.js';

const router = express.Router();

/**
 * GET /api/agents/visible/:userId
 * Get visible agents for user (progressive revelation)
 */
router.get('/visible/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const service = createAgentVisibilityService(req.app.locals.db);

    const visibleAgents = service.getVisibleAgents(userId);

    res.json({
      success: true,
      userId,
      agents: visibleAgents,
      count: visibleAgents.length
    });
  } catch (error) {
    console.error('Error getting visible agents:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/agents/introduction-status/:userId
 * Get user's introduction status and progress
 */
router.get('/introduction-status/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const service = createAgentVisibilityService(req.app.locals.db);

    const status = service.getIntroductionStatus(userId);

    res.json({
      success: true,
      userId,
      status
    });
  } catch (error) {
    console.error('Error getting introduction status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agents/introduce
 * Record agent introduction
 * Body: { userId, agentId, introductionMethod, sessionNumber }
 */
router.post('/introduce', (req, res) => {
  try {
    const { userId, agentId, introductionMethod, sessionNumber } = req.body;

    if (!userId || !agentId || !introductionMethod) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, agentId, introductionMethod'
      });
    }

    const service = createAgentVisibilityService(req.app.locals.db);

    // Check if agent can be introduced
    const canIntroduce = service.canIntroduceAgent(userId, agentId);

    if (!canIntroduce) {
      return res.status(403).json({
        success: false,
        error: 'Agent cannot be introduced to this user (system agent, already exposed, or insufficient engagement)'
      });
    }

    // Record introduction
    const result = service.recordIntroduction(
      userId,
      agentId,
      introductionMethod,
      sessionNumber || 1
    );

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error recording introduction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/agents/exposed/:userId
 * Get agents user has been exposed to
 */
router.get('/exposed/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const service = createAgentVisibilityService(req.app.locals.db);

    const exposedAgents = service.getExposedAgents(userId);

    res.json({
      success: true,
      userId,
      agents: exposedAgents,
      count: exposedAgents.length
    });
  } catch (error) {
    console.error('Error getting exposed agents:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/agents/can-introduce/:userId/:agentId
 * Check if agent can be introduced to user
 */
router.get('/can-introduce/:userId/:agentId', (req, res) => {
  try {
    const { userId, agentId } = req.params;
    const service = createAgentVisibilityService(req.app.locals.db);

    const canIntroduce = service.canIntroduceAgent(userId, agentId);

    res.json({
      success: true,
      userId,
      agentId,
      canIntroduce
    });
  } catch (error) {
    console.error('Error checking if agent can be introduced:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/agents/all
 * Get all agents (optionally including system agents)
 * Query param: includeSystem=true
 */
router.get('/all', (req, res) => {
  try {
    const { includeSystem } = req.query;
    const service = createAgentVisibilityService(req.app.locals.db);

    const agents = service.getAllAgents({
      includeSystem: includeSystem === 'true'
    });

    res.json({
      success: true,
      agents,
      count: agents.length
    });
  } catch (error) {
    console.error('Error getting all agents:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
