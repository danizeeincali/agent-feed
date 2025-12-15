/**
 * System Initialization Routes
 * API endpoints for system initialization and state management
 *
 * Part of SPARC System Initialization specification
 * Agent 2: Welcome Content System
 *
 * Endpoints:
 * - POST /api/system/initialize - Trigger system initialization
 * - GET /api/system/state - Get system state
 */

import express from 'express';
import welcomeContentService from '../services/system-initialization/welcome-content-service.js';
import FirstTimeSetupService from '../services/system-initialization/first-time-setup-service.js';
import SystemInitializationService from '../services/system-initialization/system-initialization.service.js';
import dbSelector from '../config/database-selector.js';

const router = express.Router();
let db;
let setupService;
let systemInitService;

/**
 * Initialize system initialization routes with database
 * @param {Object} database - Better-sqlite3 database instance (DEPRECATED - uses dbSelector instead)
 */
export function initializeSystemRoutes(database) {
  // Use dbSelector's database instance instead of passed parameter
  // This ensures we use the same instance that has migrations applied
  const connections = dbSelector.getRawConnections();

  if (!connections || !connections.db) {
    console.error('❌ dbSelector database not available');
    return;
  }

  db = connections.db;
  setupService = new FirstTimeSetupService(connections.db);
  systemInitService = new SystemInitializationService(connections.db);
  console.log('✅ System initialization routes initialized with dbSelector database');
}

/**
 * POST /api/system/initialize
 * Comprehensive system reset and initialization
 *
 * Body:
 * - userId (optional) - User ID, defaults to 'demo-user-123'
 * - confirmReset (required) - Must be true to proceed with reset
 *
 * Returns:
 * - success: boolean
 * - operations: detailed status of all reset operations
 * - postsCreated: number of welcome posts created
 * - postIds: array of created post IDs
 * - errors: array of errors (if any)
 */
router.post('/initialize', async (req, res) => {
  try {
    const { userId = 'demo-user-123', confirmReset = false } = req.body;

    if (!systemInitService) {
      return res.status(500).json({
        success: false,
        error: 'System initialization service not initialized'
      });
    }

    // Execute comprehensive system initialization
    const result = systemInitService.initializeSystem(userId, confirmReset);

    // Return appropriate status code based on result
    if (!result.success) {
      return res.status(result.error === 'Reset confirmation required' ? 400 : 500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('❌ System initialization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize system',
      details: error.message
    });
  }
});

/**
 * POST /api/system/initialize-first-time
 * Legacy endpoint - Initialize system for new user (idempotent, no reset)
 *
 * Body:
 * - userId (optional) - User ID, defaults to 'demo-user-123'
 * - displayName (optional) - User's display name
 *
 * Returns:
 * - success: boolean
 * - postsCreated: number of posts created
 * - postIds: array of created post IDs
 * - alreadyInitialized: boolean (if user already has posts)
 */
router.post('/initialize-first-time', async (req, res) => {
  try {
    const { userId = 'demo-user-123', displayName = null } = req.body;

    if (!setupService) {
      return res.status(500).json({
        success: false,
        error: 'Setup service not initialized'
      });
    }

    // Initialize system with post creation (idempotent)
    const result = await setupService.initializeSystemWithPosts(userId, displayName);

    if (result.alreadyInitialized) {
      return res.json({
        success: true,
        alreadyInitialized: true,
        existingPostsCount: result.existingPostsCount,
        message: result.message
      });
    }

    // Return success with post IDs
    res.json({
      success: true,
      alreadyInitialized: false,
      postsCreated: result.postsCreated,
      postIds: result.postIds,
      message: result.message,
      details: result.details
    });
  } catch (error) {
    console.error('❌ First-time initialization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize system',
      details: error.message
    });
  }
});

/**
 * GET /api/system/state
 * Get comprehensive system state with all table counts
 *
 * Query params:
 * - userId (optional) - User ID to check, defaults to 'demo-user-123'
 *
 * Returns:
 * - tableCounts: counts of all relevant tables
 * - userEngagement: user engagement data
 * - userExposures: count of agent exposures
 * - introductionQueue: introduction queue entries
 */
router.get('/state', async (req, res) => {
  try {
    const { userId = 'demo-user-123' } = req.query;

    if (!systemInitService) {
      return res.status(500).json({
        success: false,
        error: 'System initialization service not initialized'
      });
    }

    // Get comprehensive system state
    const state = systemInitService.getSystemState(userId);

    res.json({
      success: true,
      state
    });
  } catch (error) {
    console.error('System state check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check system state',
      details: error.message
    });
  }
});

/**
 * GET /api/system/welcome-posts/preview
 * Preview welcome posts without creating them
 *
 * Query params:
 * - userId (optional) - User ID, defaults to 'demo-user-123'
 * - displayName (optional) - User's display name
 *
 * Returns:
 * - welcomePosts: Array of generated welcome posts (not saved)
 * - stats: Statistics about the welcome posts
 */
router.get('/welcome-posts/preview', async (req, res) => {
  try {
    const { userId = 'demo-user-123', displayName = null } = req.query;

    // Generate all welcome posts
    const welcomePosts = welcomeContentService.createAllWelcomePosts(userId, displayName);

    // Get statistics
    const stats = welcomeContentService.getWelcomePostStats(welcomePosts);

    res.json({
      success: true,
      welcomePosts,
      stats
    });
  } catch (error) {
    console.error('Welcome posts preview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview welcome posts',
      details: error.message
    });
  }
});

/**
 * POST /api/system/validate-content
 * Validate welcome post content
 *
 * Body:
 * - postData: Post data object to validate
 *
 * Returns:
 * - valid: boolean
 * - errors: Array of validation errors (if any)
 */
router.post('/validate-content', async (req, res) => {
  try {
    const { postData } = req.body;

    if (!postData) {
      return res.status(400).json({
        success: false,
        error: 'Missing postData in request body'
      });
    }

    const validation = welcomeContentService.validateWelcomeContent(postData);

    res.json({
      success: true,
      validation
    });
  } catch (error) {
    console.error('Content validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate content',
      details: error.message
    });
  }
});

export default router;
