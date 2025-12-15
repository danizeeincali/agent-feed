/**
 * System Initialization Service
 * Comprehensive database reset and system initialization service
 *
 * Part of SPARC System Initialization specification
 * Agent 3: Implementation - System Reset and Initialization
 *
 * Responsibilities:
 * - Reset all database tables to clean state
 * - Clear user engagement and agent exposure data
 * - Reset introduction queue to default state
 * - Clean workspace directories
 * - Create welcome posts for new initialization
 * - Provide detailed operation tracking
 *
 * Tables affected:
 * - agent_posts (CLEAR)
 * - comments (CLEAR)
 * - hemingway_bridges (CLEAR)
 * - work_queue_tickets (CLEAR)
 * - onboarding_state (CLEAR)
 * - user_engagement (RESET to 0)
 * - user_agent_exposure (CLEAR exposures, keep user)
 * - introduction_queue (RESET to default: only 'avi')
 *
 * File system:
 * - /prod/agent_workspace/agents/* (CLEAR directories)
 */

import { existsSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import welcomeContentService from './welcome-content-service.js';

/**
 * System Initialization Service Class
 * Handles complete system reset and initialization
 */
class SystemInitializationService {
  constructor(database) {
    if (!database) {
      throw new Error('Database instance is required for SystemInitializationService');
    }
    this.db = database;
    this.workspacePath = '/prod/agent_workspace/agents';
    console.log('✅ SystemInitializationService initialized');
  }

  /**
   * Initialize complete system with database reset and welcome posts
   * Uses Better-SQLite3 transactions for atomicity
   *
   * @param {string} userId - User ID to initialize (default: demo-user-123)
   * @param {boolean} confirmReset - Must be true to proceed (safety check)
   * @returns {Object} Initialization result with detailed status
   */
  initializeSystem(userId = 'demo-user-123', confirmReset = false) {
    if (!confirmReset) {
      return {
        success: false,
        error: 'Reset confirmation required',
        message: 'Set confirmReset = true to proceed with system reset'
      };
    }

    console.log(`🔄 Starting system initialization for user: ${userId}`);

    // Track all operations for detailed response
    const operations = {
      databaseReset: { status: 'pending', details: {} },
      userEngagementReset: { status: 'pending', details: {} },
      userAgentExposureReset: { status: 'pending', details: {} },
      introductionQueueReset: { status: 'pending', details: {} },
      workspaceCleanup: { status: 'pending', details: {} },
      welcomePostsCreated: { status: 'pending', details: {} }
    };

    const errors = [];

    try {
      // Use transaction for atomicity
      const resetTransaction = this.db.transaction(() => {
        // Step 1: Clear all main tables
        console.log('📊 Step 1: Clearing database tables...');
        try {
          const dbResetResult = this.clearDatabaseTables();
          operations.databaseReset = {
            status: 'completed',
            details: dbResetResult
          };
          console.log('✅ Database tables cleared');
        } catch (error) {
          console.error('❌ Database reset error:', error);
          operations.databaseReset = {
            status: 'failed',
            error: error.message
          };
          errors.push(`Database reset: ${error.message}`);
        }

        // Step 2: Reset user engagement to 0
        console.log('📊 Step 2: Resetting user engagement...');
        try {
          const engagementResult = this.resetUserEngagement(userId);
          operations.userEngagementReset = {
            status: 'completed',
            details: engagementResult
          };
          console.log('✅ User engagement reset');
        } catch (error) {
          console.error('❌ User engagement reset error:', error);
          operations.userEngagementReset = {
            status: 'failed',
            error: error.message
          };
          errors.push(`User engagement reset: ${error.message}`);
        }

        // Step 3: Clear user agent exposures
        console.log('📊 Step 3: Clearing user agent exposures...');
        try {
          const exposureResult = this.clearUserAgentExposures(userId);
          operations.userAgentExposureReset = {
            status: 'completed',
            details: exposureResult
          };
          console.log('✅ User agent exposures cleared');
        } catch (error) {
          console.error('❌ User agent exposure reset error:', error);
          operations.userAgentExposureReset = {
            status: 'failed',
            error: error.message
          };
          errors.push(`User agent exposure reset: ${error.message}`);
        }

        // Step 4: Reset introduction queue to default
        console.log('📊 Step 4: Resetting introduction queue...');
        try {
          const queueResult = this.resetIntroductionQueue(userId);
          operations.introductionQueueReset = {
            status: 'completed',
            details: queueResult
          };
          console.log('✅ Introduction queue reset');
        } catch (error) {
          console.error('❌ Introduction queue reset error:', error);
          operations.introductionQueueReset = {
            status: 'failed',
            error: error.message
          };
          errors.push(`Introduction queue reset: ${error.message}`);
        }

        // Step 5: Create welcome posts
        console.log('📊 Step 5: Creating welcome posts...');
        try {
          const postsResult = this.createWelcomePosts(userId, null);
          operations.welcomePostsCreated = {
            status: 'completed',
            details: postsResult
          };
          console.log(`✅ Created ${postsResult.postsCreated} welcome posts`);
        } catch (error) {
          console.error('❌ Welcome posts creation error:', error);
          operations.welcomePostsCreated = {
            status: 'failed',
            error: error.message
          };
          errors.push(`Welcome posts creation: ${error.message}`);
        }
      });

      // Execute transaction
      resetTransaction();

      // Step 6: Clean workspace (outside transaction as it's filesystem)
      console.log('📊 Step 6: Cleaning workspace directories...');
      try {
        const workspaceResult = this.cleanWorkspace();
        operations.workspaceCleanup = {
          status: 'completed',
          details: workspaceResult
        };
        console.log('✅ Workspace cleaned');
      } catch (error) {
        console.error('❌ Workspace cleanup error:', error);
        operations.workspaceCleanup = {
          status: 'failed',
          error: error.message
        };
        errors.push(`Workspace cleanup: ${error.message}`);
      }

      // Determine overall success
      const successfulOps = Object.values(operations).filter(op => op.status === 'completed').length;
      const totalOps = Object.keys(operations).length;
      const success = errors.length === 0;

      console.log(`\n✅ System initialization ${success ? 'completed successfully' : 'completed with errors'}`);
      console.log(`   Operations: ${successfulOps}/${totalOps} successful`);

      return {
        success,
        userId,
        operations,
        successfulOperations: successfulOps,
        totalOperations: totalOps,
        postsCreated: operations.welcomePostsCreated.details?.postsCreated || 0,
        postIds: operations.welcomePostsCreated.details?.postIds || [],
        errors: errors.length > 0 ? errors : undefined,
        message: success
          ? 'System initialized successfully'
          : `System initialized with ${errors.length} errors`,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Critical error during system initialization:', error);
      return {
        success: false,
        userId,
        operations,
        error: 'Critical error during initialization',
        details: error.message,
        errors: [...errors, error.message],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Clear all main database tables
   * Preserves schema, only deletes data
   *
   * @returns {Object} Tables cleared with row counts
   */
  clearDatabaseTables() {
    const tables = [
      'agent_posts',
      'comments',
      'hemingway_bridges',
      'work_queue_tickets',
      'onboarding_state'
    ];

    const results = {};

    for (const table of tables) {
      try {
        const stmt = this.db.prepare(`DELETE FROM ${table}`);
        const result = stmt.run();
        results[table] = {
          cleared: true,
          rowsDeleted: result.changes
        };
        console.log(`   Cleared ${table}: ${result.changes} rows deleted`);
      } catch (error) {
        console.warn(`   Warning: Could not clear table ${table}: ${error.message}`);
        results[table] = {
          cleared: false,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Reset user engagement to 0 for specified user
   * Creates record if it doesn't exist
   *
   * @param {string} userId - User ID to reset
   * @returns {Object} Reset result
   */
  resetUserEngagement(userId) {
    try {
      // First, ensure user exists in user_engagement table
      const existingEngagement = this.db.prepare(`
        SELECT * FROM user_engagement WHERE user_id = ?
      `).get(userId);

      if (existingEngagement) {
        // Update existing record
        const updateStmt = this.db.prepare(`
          UPDATE user_engagement
          SET
            total_interactions = 0,
            posts_created = 0,
            comments_created = 0,
            likes_given = 0,
            posts_read = 0,
            engagement_score = 0,
            last_activity_at = NULL,
            updated_at = unixepoch()
          WHERE user_id = ?
        `);
        const result = updateStmt.run(userId);

        return {
          action: 'updated',
          userId,
          rowsAffected: result.changes,
          engagementScore: 0
        };
      } else {
        // Create new record
        const insertStmt = this.db.prepare(`
          INSERT INTO user_engagement (
            user_id,
            total_interactions,
            posts_created,
            comments_created,
            likes_given,
            posts_read,
            engagement_score,
            last_activity_at
          ) VALUES (?, 0, 0, 0, 0, 0, 0, NULL)
        `);
        const result = insertStmt.run(userId);

        return {
          action: 'created',
          userId,
          rowsAffected: result.changes,
          engagementScore: 0
        };
      }
    } catch (error) {
      console.error('Error resetting user engagement:', error);
      throw error;
    }
  }

  /**
   * Clear user agent exposures but keep user record
   * Removes all exposure records for user
   *
   * @param {string} userId - User ID to clear exposures for
   * @returns {Object} Clear result
   */
  clearUserAgentExposures(userId) {
    try {
      const deleteStmt = this.db.prepare(`
        DELETE FROM user_agent_exposure
        WHERE user_id = ?
      `);
      const result = deleteStmt.run(userId);

      return {
        userId,
        exposuresCleared: result.changes,
        userRecordKept: true
      };
    } catch (error) {
      console.error('Error clearing user agent exposures:', error);
      throw error;
    }
  }

  /**
   * Reset introduction queue to default state (only 'avi')
   * Removes all queue entries and recreates default
   *
   * @param {string} userId - User ID to reset queue for
   * @returns {Object} Reset result
   */
  resetIntroductionQueue(userId) {
    try {
      // Delete all existing queue entries for user
      const deleteStmt = this.db.prepare(`
        DELETE FROM introduction_queue
        WHERE user_id = ?
      `);
      const deleteResult = deleteStmt.run(userId);

      // Create default queue entry for Avi
      const insertStmt = this.db.prepare(`
        INSERT INTO introduction_queue (
          id,
          user_id,
          agent_id,
          priority,
          unlock_threshold,
          introduced,
          introduced_at,
          intro_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const aviQueueId = `intro-${userId}-avi`;
      const insertResult = insertStmt.run(
        aviQueueId,
        userId,
        'avi',
        1,           // Priority 1 (first)
        0,           // No threshold (available immediately)
        1,           // Already introduced
        Math.floor(Date.now() / 1000),  // Current timestamp
        'post'       // Introduction method
      );

      return {
        userId,
        entriesRemoved: deleteResult.changes,
        defaultQueueCreated: insertResult.changes > 0,
        defaultAgent: 'avi'
      };
    } catch (error) {
      console.error('Error resetting introduction queue:', error);
      throw error;
    }
  }

  /**
   * Clean workspace directories
   * Removes all agent workspace directories
   *
   * @returns {Object} Cleanup result
   */
  cleanWorkspace() {
    try {
      if (!existsSync(this.workspacePath)) {
        return {
          workspacePath: this.workspacePath,
          exists: false,
          directoriesRemoved: 0,
          message: 'Workspace path does not exist (nothing to clean)'
        };
      }

      const directories = readdirSync(this.workspacePath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      let removedCount = 0;
      const removedDirs = [];

      for (const dir of directories) {
        try {
          const dirPath = join(this.workspacePath, dir);
          rmSync(dirPath, { recursive: true, force: true });
          removedCount++;
          removedDirs.push(dir);
          console.log(`   Removed workspace directory: ${dir}`);
        } catch (error) {
          console.warn(`   Warning: Could not remove directory ${dir}: ${error.message}`);
        }
      }

      return {
        workspacePath: this.workspacePath,
        exists: true,
        directoriesFound: directories.length,
        directoriesRemoved: removedCount,
        removedDirectories: removedDirs,
        message: `Cleaned ${removedCount} workspace directories`
      };
    } catch (error) {
      console.error('Error cleaning workspace:', error);
      throw error;
    }
  }

  /**
   * Create welcome posts using welcomeContentService
   * Creates 3 posts: Λvi welcome, onboarding, reference guide
   *
   * @param {string} userId - User ID to create posts for
   * @param {string} displayName - User's display name (optional)
   * @returns {Object} Post creation result
   */
  createWelcomePosts(userId, displayName = null) {
    try {
      // Generate welcome post data
      const welcomePosts = welcomeContentService.createAllWelcomePosts(userId, displayName);
      console.log(`   Generated ${welcomePosts.length} welcome posts`);

      const createdPostIds = [];
      const baseTimestamp = Date.now();

      // Create each post in database
      const createPostStmt = this.db.prepare(`
        INSERT INTO agent_posts (
          id,
          author_id,
          author_agent,
          content,
          title,
          created_at,
          metadata,
          engagement
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < welcomePosts.length; i++) {
        const postData = welcomePosts[i];

        // Calculate timestamp with 3-second intervals for proper ordering
        const postTimestamp = baseTimestamp + (i * 3000);
        const postId = `post-${postTimestamp}-${Math.random().toString(36).substr(2, 9)}`;

        // Merge metadata
        const metadata = {
          ...postData.metadata,
          agentId: postData.agentId,
          isAgentResponse: true,
          userId: userId,
          tags: []
        };

        // Create post
        createPostStmt.run(
          postId,
          userId,
          postData.agent.name,
          postData.content,
          postData.title || '',
          postTimestamp,
          JSON.stringify(metadata),
          JSON.stringify({
            comments: 0,
            likes: 0,
            shares: 0,
            views: 0
          })
        );

        createdPostIds.push(postId);
        console.log(`   Created ${postData.metadata.welcomePostType} post: ${postId}`);
      }

      return {
        postsCreated: createdPostIds.length,
        postIds: createdPostIds,
        postTypes: welcomePosts.map(p => p.metadata.welcomePostType)
      };
    } catch (error) {
      console.error('Error creating welcome posts:', error);
      throw error;
    }
  }

  /**
   * Get current system state
   * Returns counts and status of all tables
   *
   * @param {string} userId - User ID to check state for
   * @returns {Object} System state summary
   */
  getSystemState(userId = 'demo-user-123') {
    try {
      const state = {
        userId,
        tableCounts: {},
        userEngagement: null,
        userExposures: null,
        introductionQueue: null,
        timestamp: new Date().toISOString()
      };

      // Get table counts
      const tables = [
        'agent_posts',
        'comments',
        'hemingway_bridges',
        'work_queue_tickets',
        'onboarding_state'
      ];

      for (const table of tables) {
        try {
          const count = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
          state.tableCounts[table] = count.count;
        } catch (error) {
          state.tableCounts[table] = null;
        }
      }

      // Get user engagement
      try {
        const engagement = this.db.prepare(`
          SELECT * FROM user_engagement WHERE user_id = ?
        `).get(userId);
        state.userEngagement = engagement || { exists: false };
      } catch (error) {
        state.userEngagement = { error: error.message };
      }

      // Get user exposures count
      try {
        const exposures = this.db.prepare(`
          SELECT COUNT(*) as count FROM user_agent_exposure WHERE user_id = ?
        `).get(userId);
        state.userExposures = exposures.count;
      } catch (error) {
        state.userExposures = null;
      }

      // Get introduction queue
      try {
        const queue = this.db.prepare(`
          SELECT agent_id, priority, introduced FROM introduction_queue
          WHERE user_id = ?
          ORDER BY priority
        `).all(userId);
        state.introductionQueue = queue;
      } catch (error) {
        state.introductionQueue = [];
      }

      return state;
    } catch (error) {
      console.error('Error getting system state:', error);
      throw error;
    }
  }
}

/**
 * Create and export service instance factory
 * @param {Database} db - better-sqlite3 database instance
 * @returns {SystemInitializationService} Service instance
 */
export function createSystemInitializationService(db) {
  return new SystemInitializationService(db);
}

export default SystemInitializationService;
