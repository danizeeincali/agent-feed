/**
 * Agent Introduction API Routes
 * Handles agent introduction endpoints
 * Implements API requirements from SPARC specification
 */

import express from 'express';
import { createAgentIntroductionService } from '../services/agents/agent-introduction-service.js';
import { createAgentTriggerService } from '../services/agents/agent-trigger-service.js';
import { createAgentContentGenerator } from '../services/agents/agent-content-generator.js';

const router = express.Router();

/**
 * Middleware to ensure database is available
 */
function requireDatabase(req, res, next) {
  if (!req.app.locals.db) {
    return res.status(500).json({
      success: false,
      error: 'Database not initialized'
    });
  }
  next();
}

// Apply database check to all routes
router.use(requireDatabase);

/**
 * GET /api/agents/introductions/:userId
 * Get all agents that have been introduced to a user
 */
router.get('/introductions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const db = req.app.locals.db;

    const introService = createAgentIntroductionService(db);
    const introduced = introService.getIntroducedAgents(userId);

    // Load agent configs for detailed information
    const triggerService = createAgentTriggerService();
    const agentDetails = await Promise.all(
      introduced.map(async (intro) => {
        const config = await triggerService.loadAgentConfig(intro.agent_id);
        return {
          ...intro,
          displayName: config?.displayName || intro.agent_id,
          description: config?.description || ''
        };
      })
    );

    res.json({
      success: true,
      userId,
      introduced: agentDetails,
      stats: introService.getIntroductionStats(userId)
    });
  } catch (error) {
    console.error('Error getting agent introductions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/agents/pending/:userId
 * Get agents that are pending introduction for a user
 */
router.get('/pending/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { phase1Completed = false } = req.query;
    const db = req.app.locals.db;

    if (!db) {
      return res.status(500).json({
        success: false,
        error: 'Database not initialized'
      });
    }

    const introService = createAgentIntroductionService(db);
    const pending = await introService.getPendingIntroductions(
      userId,
      phase1Completed === 'true'
    );

    res.json({
      success: true,
      userId,
      pending,
      count: pending.length
    });
  } catch (error) {
    console.error('Error getting pending introductions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agents/introduce
 * Manually trigger an agent introduction (creates actual post in database)
 */
router.post('/introduce', async (req, res) => {
  try {
    const { userId, agentId } = req.body;
    const db = req.app.locals.db;
    const dbSelector = req.app.locals.dbSelector;

    if (!db || !dbSelector) {
      return res.status(500).json({
        success: false,
        error: 'Database not initialized'
      });
    }

    if (!userId || !agentId) {
      return res.status(400).json({
        success: false,
        error: 'userId and agentId are required'
      });
    }

    const introService = createAgentIntroductionService(db);

    // Introduce agent (creates post in database)
    const result = await introService.introduceAgent(userId, agentId, dbSelector);

    if (result.alreadyIntroduced) {
      return res.status(409).json({
        success: false,
        alreadyIntroduced: true,
        message: result.message
      });
    }

    res.json({
      success: true,
      postId: result.postId,
      agentId: result.agentId,
      message: result.message
    });
  } catch (error) {
    console.error('Error introducing agent:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agents/detect-triggers
 * Detect which agents should be triggered based on content
 */
router.post('/detect-triggers', async (req, res) => {
  try {
    const { content, userId } = req.body;
    const db = req.app.locals.db;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'content is required'
      });
    }

    const triggerService = createAgentTriggerService();
    const triggers = triggerService.detectTriggers(content);

    // Filter out already introduced agents if userId is provided
    let filteredTriggers = triggers;
    if (userId && db) {
      const introService = createAgentIntroductionService(db);
      const introduced = introService.getIntroducedAgents(userId);
      const introducedIds = introduced.map(a => a.agent_id);
      filteredTriggers = triggerService.filterIntroducedAgents(triggers, introducedIds);
    }

    // Load configs for triggered agents
    const triggerDetails = await Promise.all(
      filteredTriggers.map(async (agentId) => {
        const config = await triggerService.loadAgentConfig(agentId);
        return {
          agentId,
          displayName: config?.displayName || agentId,
          description: config?.description || ''
        };
      })
    );

    res.json({
      success: true,
      triggers: filteredTriggers,
      details: triggerDetails,
      count: filteredTriggers.length
    });
  } catch (error) {
    console.error('Error detecting triggers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agents/check-triggers
 * Check context and automatically introduce relevant agents (creates posts)
 */
router.post('/check-triggers', async (req, res) => {
  try {
    const { userId, context } = req.body;
    const db = req.app.locals.db;
    const dbSelector = req.app.locals.dbSelector;

    if (!db || !dbSelector) {
      return res.status(500).json({
        success: false,
        error: 'Database not initialized'
      });
    }

    if (!userId || !context) {
      return res.status(400).json({
        success: false,
        error: 'userId and context are required'
      });
    }

    const introService = createAgentIntroductionService(db);

    // Check context and introduce agents
    const results = await introService.checkAndIntroduceAgents(userId, context, dbSelector);

    // Filter to only successful introductions
    const successfulIntros = results.filter(r => r.success && !r.alreadyIntroduced);

    res.json({
      success: true,
      introductions: results,
      newIntroductions: successfulIntros.length,
      postIds: successfulIntros.map(r => r.postId)
    });
  } catch (error) {
    console.error('Error checking triggers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agents/interaction
 * Record an interaction with an agent
 */
router.post('/interaction', async (req, res) => {
  try {
    const { userId, agentId } = req.body;
    const db = req.app.locals.db;

    if (!db) {
      return res.status(500).json({
        success: false,
        error: 'Database not initialized'
      });
    }

    if (!userId || !agentId) {
      return res.status(400).json({
        success: false,
        error: 'userId and agentId are required'
      });
    }

    const introService = createAgentIntroductionService(db);

    // Ensure agent is introduced first
    if (!introService.isAgentIntroduced(userId, agentId)) {
      return res.status(404).json({
        success: false,
        error: 'Agent not yet introduced to this user'
      });
    }

    const result = introService.incrementInteractionCount(userId, agentId);

    res.json({
      success: true,
      interaction: result
    });
  } catch (error) {
    console.error('Error recording interaction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
