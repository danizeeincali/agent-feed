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

const router = express.Router();
let db;
let setupService;

/**
 * Initialize system initialization routes with database
 * @param {Object} database - Better-sqlite3 database instance
 */
export function initializeSystemRoutes(database) {
  if (!database) {
    console.error('❌ Database not provided to system-initialization routes');
    return;
  }

  db = database;
  setupService = new FirstTimeSetupService(database);
  console.log('✅ System initialization routes initialized with database');
}

/**
 * POST /api/system/initialize
 * Trigger system initialization for a new user - Creates REAL POSTS in database
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
router.post('/initialize', async (req, res) => {
  try {
    const { userId = 'demo-user-123', displayName = null } = req.body;

    if (!setupService) {
      return res.status(500).json({
        success: false,
        error: 'Setup service not initialized'
      });
    }

    // Initialize system with post creation
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
    console.error('❌ System initialization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize system',
      details: error.message
    });
  }
});

/**
 * GET /api/system/state
 * Get current system state
 *
 * Query params:
 * - userId (optional) - User ID to check, defaults to 'demo-user-123'
 *
 * Returns:
 * - initialized: boolean indicating if system is initialized
 * - userExists: boolean indicating if user settings exist
 * - onboardingCompleted: boolean indicating if onboarding is complete
 */
router.get('/state', async (req, res) => {
  try {
    const { userId = 'demo-user-123' } = req.query;

    if (!db) {
      return res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

    // Check if user settings exist
    const userSettings = db.prepare(`
      SELECT
        user_id,
        display_name,
        onboarding_completed,
        onboarding_completed_at,
        created_at
      FROM user_settings
      WHERE user_id = ?
    `).get(userId);

    // Check if welcome posts exist
    const welcomePostsCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM agent_posts
      WHERE json_extract(metadata, '$.userId') = ?
        AND json_extract(metadata, '$.isSystemInitialization') = 1
    `).get(userId)?.count || 0;

    const state = {
      initialized: !!userSettings,
      userExists: !!userSettings,
      onboardingCompleted: userSettings?.onboarding_completed === 1,
      hasWelcomePosts: welcomePostsCount >= 3,
      userSettings: userSettings ? {
        userId: userSettings.user_id,
        displayName: userSettings.display_name,
        onboardingCompleted: userSettings.onboarding_completed === 1,
        onboardingCompletedAt: userSettings.onboarding_completed_at,
        createdAt: userSettings.created_at
      } : null,
      welcomePostsCount
    };

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
