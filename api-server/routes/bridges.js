/**
 * Hemingway Bridges API Routes
 * Endpoints for managing engagement bridges
 *
 * SPARC Implementation: Task Group 5 - Hemingway Bridge Logic
 * - GET /api/bridges/active/:userId - Get active bridges
 * - POST /api/bridges/complete/:bridgeId - Mark bridge completed
 * - POST /api/bridges/create - Create new bridge
 * - GET /api/bridges/waterfall/:userId - Get priority waterfall
 * - POST /api/bridges/recalculate/:userId - Recalculate bridge for user
 */

import express from 'express';
import { createHemingwayBridgeService } from '../services/engagement/hemingway-bridge-service.js';
import { createBridgePriorityService } from '../services/engagement/bridge-priority-service.js';
import { createBridgeUpdateService } from '../services/engagement/bridge-update-service.js';

const router = express.Router();
let hemingwayBridgeService;
let bridgePriorityService;
let bridgeUpdateService;

/**
 * Initialize services
 * @param {Database} db - better-sqlite3 database instance
 */
export function initializeBridgeRoutes(db) {
  if (!db) {
    throw new Error('Database instance is required to initialize bridge routes');
  }

  hemingwayBridgeService = createHemingwayBridgeService(db);
  bridgePriorityService = createBridgePriorityService(db, hemingwayBridgeService);
  bridgeUpdateService = createBridgeUpdateService(db, hemingwayBridgeService, bridgePriorityService);

  console.log('✅ Bridge routes initialized');
}

/**
 * GET /api/bridges/active/:userId
 * Get active bridges for a user
 *
 * Response:
 * {
 *   success: true,
 *   bridge: { ... },
 *   allBridges: [ ... ],
 *   count: 1
 * }
 */
router.get('/active/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Get the highest priority active bridge
    const activeBridge = hemingwayBridgeService.getActiveBridge(userId);

    // Get all active bridges
    const allBridges = hemingwayBridgeService.getAllActiveBridges(userId);

    // Ensure at least one bridge exists
    const bridge = activeBridge || await hemingwayBridgeService.ensureBridgeExists(userId);

    return res.json({
      success: true,
      bridge,
      allBridges,
      count: allBridges.length
    });
  } catch (error) {
    console.error('Error getting active bridges:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/bridges/complete/:bridgeId
 * Mark a bridge as completed
 *
 * Request body: (none)
 *
 * Response:
 * {
 *   success: true,
 *   bridge: { ... },
 *   newBridge: { ... }
 * }
 */
router.post('/complete/:bridgeId', async (req, res) => {
  try {
    const { bridgeId } = req.params;

    if (!bridgeId) {
      return res.status(400).json({
        success: false,
        error: 'bridgeId is required'
      });
    }

    // Get the bridge to find user_id
    const bridge = hemingwayBridgeService.getBridgeById(bridgeId);

    if (!bridge) {
      return res.status(404).json({
        success: false,
        error: 'Bridge not found'
      });
    }

    // Complete the bridge
    const completedBridge = hemingwayBridgeService.completeBridge(bridgeId);

    // Recalculate and create a new bridge for the user
    const newBridge = await bridgeUpdateService.recalculateBridge(bridge.user_id);

    return res.json({
      success: true,
      bridge: completedBridge,
      newBridge
    });
  } catch (error) {
    console.error('Error completing bridge:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/bridges/create
 * Create a new bridge
 *
 * Request body:
 * {
 *   userId: string,
 *   type: string ('continue_thread' | 'next_step' | 'new_feature' | 'question' | 'insight'),
 *   content: string,
 *   priority: number (1-5),
 *   postId?: string,
 *   agentId?: string,
 *   action?: string,
 *   createPost?: boolean
 * }
 *
 * Response:
 * {
 *   success: true,
 *   bridge: { ... }
 * }
 */
router.post('/create', async (req, res) => {
  try {
    const {
      userId,
      type,
      content,
      priority,
      postId,
      agentId,
      action,
      createPost
    } = req.body;

    // Validate required fields
    if (!userId || !type || !content || !priority) {
      return res.status(400).json({
        success: false,
        error: 'userId, type, content, and priority are required'
      });
    }

    // Create the bridge
    const bridge = await hemingwayBridgeService.createBridge({
      userId,
      type,
      content,
      priority,
      postId,
      agentId,
      action,
      createPost
    });

    return res.status(201).json({
      success: true,
      bridge
    });
  } catch (error) {
    console.error('Error creating bridge:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bridges/waterfall/:userId
 * Get complete priority waterfall for a user
 *
 * Response:
 * {
 *   success: true,
 *   waterfall: [ ... ],
 *   currentBridge: { ... }
 * }
 */
router.get('/waterfall/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Get the complete waterfall
    const waterfall = bridgePriorityService.getPriorityWaterfall(userId);

    // Get current active bridge
    const currentBridge = hemingwayBridgeService.getActiveBridge(userId);

    return res.json({
      success: true,
      waterfall,
      currentBridge
    });
  } catch (error) {
    console.error('Error getting priority waterfall:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/bridges/recalculate/:userId
 * Recalculate bridge for a user based on current state
 *
 * Response:
 * {
 *   success: true,
 *   bridge: { ... }
 * }
 */
router.post('/recalculate/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Recalculate bridge
    const bridge = await bridgeUpdateService.recalculateBridge(userId);

    return res.json({
      success: true,
      bridge
    });
  } catch (error) {
    console.error('Error recalculating bridge:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/bridges/action/:userId
 * Update bridge based on user action
 *
 * Request body:
 * {
 *   actionType: string ('post_created' | 'comment_created' | 'onboarding_response' | 'agent_mentioned'),
 *   actionData: object
 * }
 *
 * Response:
 * {
 *   success: true,
 *   bridge: { ... }
 * }
 */
router.post('/action/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { actionType, actionData } = req.body;

    if (!userId || !actionType) {
      return res.status(400).json({
        success: false,
        error: 'userId and actionType are required'
      });
    }

    // Update bridge based on action
    const bridge = await bridgeUpdateService.updateBridgeOnUserAction(
      userId,
      actionType,
      actionData || {}
    );

    return res.json({
      success: true,
      bridge
    });
  } catch (error) {
    console.error('Error updating bridge on action:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/bridges/:userId/all
 * Clear all bridges for a user (for testing)
 */
router.delete('/:userId/all', (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    hemingwayBridgeService.clearAllBridges(userId);

    return res.json({
      success: true,
      message: `All bridges cleared for user ${userId}`
    });
  } catch (error) {
    console.error('Error clearing bridges:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
