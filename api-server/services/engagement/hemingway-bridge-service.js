/**
 * Hemingway Bridge Service
 * Manages engagement bridges to always keep users engaged
 * Implements Decision 10 from SPARC-SYSTEM-INITIALIZATION.md
 *
 * Core Principle: "Always maintain at least 1 active engagement point"
 * Priority Waterfall:
 * 1. User's last interaction → continue that thread
 * 2. Next step in current flow → guide progression
 * 3. New feature introduction → expand their world
 * 4. Engaging question → start new conversation
 * 5. Valuable insight/fact → maintain connection
 */

import { randomUUID } from 'crypto';

/**
 * Hemingway Bridge Service Class
 * Ensures users always have an engagement point to return to
 */
class HemingwayBridgeService {
  constructor(database) {
    if (!database) {
      throw new Error('Database instance is required for HemingwayBridgeService');
    }
    this.db = database;
    this.initializeStatements();
  }

  /**
   * Initialize prepared statements for performance
   */
  initializeStatements() {
    try {
      // Get active bridges for a user (ordered by priority)
      this.getActiveBridgesStmt = this.db.prepare(`
        SELECT
          id,
          user_id,
          bridge_type,
          content,
          priority,
          post_id,
          agent_id,
          action,
          active,
          created_at,
          completed_at
        FROM hemingway_bridges
        WHERE user_id = ? AND active = 1
        ORDER BY priority ASC, created_at DESC
      `);

      // Get the highest priority active bridge
      this.getTopBridgeStmt = this.db.prepare(`
        SELECT
          id,
          user_id,
          bridge_type,
          content,
          priority,
          post_id,
          agent_id,
          action,
          active,
          created_at,
          completed_at
        FROM hemingway_bridges
        WHERE user_id = ? AND active = 1
        ORDER BY priority ASC, created_at DESC
        LIMIT 1
      `);

      // Create a new bridge
      this.createBridgeStmt = this.db.prepare(`
        INSERT INTO hemingway_bridges (
          id,
          user_id,
          bridge_type,
          content,
          priority,
          post_id,
          agent_id,
          action,
          active,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, unixepoch())
      `);

      // Update a bridge
      this.updateBridgeStmt = this.db.prepare(`
        UPDATE hemingway_bridges
        SET
          bridge_type = COALESCE(?, bridge_type),
          content = COALESCE(?, content),
          priority = COALESCE(?, priority),
          post_id = COALESCE(?, post_id),
          agent_id = COALESCE(?, agent_id),
          action = COALESCE(?, action),
          active = COALESCE(?, active)
        WHERE id = ?
      `);

      // Complete a bridge (mark as inactive and set completed_at)
      this.completeBridgeStmt = this.db.prepare(`
        UPDATE hemingway_bridges
        SET
          active = 0,
          completed_at = unixepoch()
        WHERE id = ?
      `);

      // Deactivate all bridges of a specific type for a user
      this.deactivateBridgesByTypeStmt = this.db.prepare(`
        UPDATE hemingway_bridges
        SET
          active = 0,
          completed_at = unixepoch()
        WHERE user_id = ? AND bridge_type = ? AND active = 1
      `);

      // Count active bridges for a user
      this.countActiveBridgesStmt = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM hemingway_bridges
        WHERE user_id = ? AND active = 1
      `);

      console.log('✅ HemingwayBridgeService prepared statements initialized');
    } catch (error) {
      console.error('❌ Error initializing HemingwayBridgeService statements:', error);
      throw error;
    }
  }

  /**
   * Get active bridge for a user (highest priority)
   * @param {string} userId - User ID
   * @returns {Object|null} Active bridge or null
   */
  getActiveBridge(userId = 'demo-user-123') {
    try {
      const bridge = this.getTopBridgeStmt.get(userId);
      return bridge || null;
    } catch (error) {
      console.error('Error getting active bridge:', error);
      throw error;
    }
  }

  /**
   * Get all active bridges for a user
   * @param {string} userId - User ID
   * @returns {Array} Array of active bridges
   */
  getAllActiveBridges(userId = 'demo-user-123') {
    try {
      const bridges = this.getActiveBridgesStmt.all(userId);
      return bridges;
    } catch (error) {
      console.error('Error getting all active bridges:', error);
      throw error;
    }
  }

  /**
   * Create a new engagement bridge
   * @param {Object} bridgeData - Bridge data
   * @param {string} bridgeData.userId - User ID
   * @param {string} bridgeData.type - Bridge type
   * @param {string} bridgeData.content - Bridge content
   * @param {number} bridgeData.priority - Priority (1-5)
   * @param {string} [bridgeData.postId] - Optional post ID
   * @param {string} [bridgeData.agentId] - Optional agent ID
   * @param {string} [bridgeData.action] - Optional action
   * @param {boolean} [bridgeData.createPost] - Whether to automatically create post (default: true)
   * @returns {Object} Created bridge with optional post
   */
  async createBridge(bridgeData) {
    try {
      const {
        userId = 'demo-user-123',
        type,
        content,
        priority,
        postId = null,
        agentId = null,
        action = null,
        createPost = true
      } = bridgeData;

      // Validate required fields
      if (!type || !content || !priority) {
        throw new Error('type, content, and priority are required');
      }

      // Validate bridge type
      const validTypes = ['continue_thread', 'next_step', 'new_feature', 'question', 'insight'];
      if (!validTypes.includes(type)) {
        throw new Error(`Invalid bridge type: ${type}. Must be one of: ${validTypes.join(', ')}`);
      }

      // Validate priority
      if (priority < 1 || priority > 5) {
        throw new Error('Priority must be between 1 and 5');
      }

      const bridgeId = randomUUID();

      this.createBridgeStmt.run(
        bridgeId,
        userId,
        type,
        content,
        priority,
        postId,
        agentId,
        action
      );

      console.log(`✅ Created bridge for user ${userId}: ${type} (priority ${priority})`);

      // Get the created bridge
      const bridge = this.getBridgeById(bridgeId);

      // Automatically create post if bridge is active and no post_id exists
      if (createPost && bridge.active === 1 && !bridge.post_id) {
        try {
          const post = await this.createBridgePost(bridge);
          // Refresh bridge data with updated post_id
          return this.getBridgeById(bridgeId);
        } catch (postError) {
          console.error(`⚠️  Failed to create post for bridge ${bridgeId}:`, postError);
          // Return bridge even if post creation fails
          return bridge;
        }
      }

      // Return the created bridge
      return bridge;
    } catch (error) {
      console.error('Error creating bridge:', error);
      throw error;
    }
  }

  /**
   * Update an existing bridge
   * @param {string} bridgeId - Bridge ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated bridge
   */
  updateBridge(bridgeId, updates = {}) {
    try {
      const {
        type = null,
        content = null,
        priority = null,
        postId = null,
        agentId = null,
        action = null,
        active = null
      } = updates;

      this.updateBridgeStmt.run(
        type,
        content,
        priority,
        postId,
        agentId,
        action,
        active,
        bridgeId
      );

      console.log(`✅ Updated bridge ${bridgeId}`);

      return this.getBridgeById(bridgeId);
    } catch (error) {
      console.error('Error updating bridge:', error);
      throw error;
    }
  }

  /**
   * Mark a bridge as completed
   * @param {string} bridgeId - Bridge ID
   * @returns {Object} Completed bridge
   */
  completeBridge(bridgeId) {
    try {
      this.completeBridgeStmt.run(bridgeId);
      console.log(`✅ Completed bridge ${bridgeId}`);

      return this.getBridgeById(bridgeId);
    } catch (error) {
      console.error('Error completing bridge:', error);
      throw error;
    }
  }

  /**
   * Deactivate all bridges of a specific type for a user
   * @param {string} userId - User ID
   * @param {string} bridgeType - Bridge type to deactivate
   * @returns {number} Number of bridges deactivated
   */
  deactivateBridgesByType(userId, bridgeType) {
    try {
      const result = this.deactivateBridgesByTypeStmt.run(userId, bridgeType);
      console.log(`✅ Deactivated ${result.changes} ${bridgeType} bridges for user ${userId}`);
      return result.changes;
    } catch (error) {
      console.error('Error deactivating bridges:', error);
      throw error;
    }
  }

  /**
   * Get bridge by ID
   * @param {string} bridgeId - Bridge ID
   * @returns {Object|null} Bridge or null
   */
  getBridgeById(bridgeId) {
    try {
      const stmt = this.db.prepare(`
        SELECT
          id,
          user_id,
          bridge_type,
          content,
          priority,
          post_id,
          agent_id,
          action,
          active,
          created_at,
          completed_at
        FROM hemingway_bridges
        WHERE id = ?
      `);
      return stmt.get(bridgeId);
    } catch (error) {
      console.error('Error getting bridge by ID:', error);
      throw error;
    }
  }

  /**
   * Count active bridges for a user
   * @param {string} userId - User ID
   * @returns {number} Count of active bridges
   */
  countActiveBridges(userId = 'demo-user-123') {
    try {
      const result = this.countActiveBridgesStmt.get(userId);
      return result.count;
    } catch (error) {
      console.error('Error counting active bridges:', error);
      throw error;
    }
  }

  /**
   * Ensure at least one bridge exists for a user
   * If no bridges exist, creates a default engaging question
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Active bridge (existing or newly created)
   */
  async ensureBridgeExists(userId = 'demo-user-123') {
    try {
      const activeBridge = this.getActiveBridge(userId);

      if (activeBridge) {
        // If bridge exists but has no post, create one
        if (activeBridge.active === 1 && !activeBridge.post_id) {
          try {
            await this.createBridgePost(activeBridge);
            return this.getBridgeById(activeBridge.id);
          } catch (postError) {
            console.error(`⚠️  Failed to create post for existing bridge ${activeBridge.id}:`, postError);
            return activeBridge;
          }
        }
        return activeBridge;
      }

      // No active bridge - create a default one
      console.log(`⚠️  No active bridge for user ${userId}, creating default bridge`);

      return await this.createBridge({
        userId,
        type: 'question',
        content: "What's on your mind today? Create a post and your agents will respond!",
        priority: 4,
        agentId: 'system'
      });
    } catch (error) {
      console.error('Error ensuring bridge exists:', error);
      throw error;
    }
  }

  /**
   * Clear all bridges for a user (for testing)
   * @param {string} userId - User ID
   */
  clearAllBridges(userId = 'demo-user-123') {
    try {
      const stmt = this.db.prepare('DELETE FROM hemingway_bridges WHERE user_id = ?');
      const result = stmt.run(userId);
      console.log(`✅ Cleared ${result.changes} bridges for user ${userId}`);
    } catch (error) {
      console.error('Error clearing bridges:', error);
      throw error;
    }
  }

  /**
   * Create an agent post from a bridge
   * @param {Object} bridge - Bridge object from database
   * @returns {Promise<Object>} Created post
   */
  async createBridgePost(bridge) {
    try {
      if (!bridge) {
        throw new Error('Bridge object is required');
      }

      if (bridge.post_id) {
        console.log(`⚠️  Bridge ${bridge.id} already has a post (${bridge.post_id}), skipping creation`);
        return { id: bridge.post_id, alreadyExists: true };
      }

      const { randomUUID } = await import('crypto');
      const postId = randomUUID();

      // Determine agent author - prefer agent_id from bridge, fallback to 'system'
      const authorAgent = bridge.agent_id || 'system';

      // Create post metadata
      const metadata = JSON.stringify({
        isBridge: true,
        bridgeId: bridge.id,
        bridgeType: bridge.bridge_type,
        bridgePriority: bridge.priority,
        bridgeAction: bridge.action
      });

      // Create engagement data
      const engagement = JSON.stringify({
        comments: 0,
        likes: 0,
        shares: 0
      });

      // Create post with bridge content
      const createPostStmt = this.db.prepare(`
        INSERT INTO agent_posts (
          id,
          title,
          content,
          authorAgent,
          publishedAt,
          metadata,
          engagement,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      // Extract title from content (first line or truncated content)
      const contentLines = bridge.content.split('\n');
      const title = contentLines[0].substring(0, 100) || 'Bridge Post';

      createPostStmt.run(
        postId,
        title,
        bridge.content,
        authorAgent,
        new Date().toISOString(),
        metadata,
        engagement
      );

      // Update bridge with post_id
      const updateBridgeStmt = this.db.prepare(`
        UPDATE hemingway_bridges SET post_id = ? WHERE id = ?
      `);
      updateBridgeStmt.run(postId, bridge.id);

      console.log(`✅ Created bridge post: ${postId} for bridge ${bridge.id} (agent: ${authorAgent})`);

      return {
        id: postId,
        title,
        content: bridge.content,
        authorAgent,
        metadata,
        engagement,
        bridgeId: bridge.id
      };
    } catch (error) {
      console.error('Error creating bridge post:', error);
      throw error;
    }
  }
}

/**
 * Create and export service instance factory
 * @param {Database} db - better-sqlite3 database instance
 * @returns {HemingwayBridgeService} Service instance
 */
export function createHemingwayBridgeService(db) {
  return new HemingwayBridgeService(db);
}

export default HemingwayBridgeService;
