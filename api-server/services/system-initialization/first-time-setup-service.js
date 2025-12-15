/**
 * First-Time Setup Service
 * Detects and triggers system initialization for new users
 * Implements FR-6 from SPARC-SYSTEM-INITIALIZATION.md
 * Agent 1: Infrastructure & Database
 */

import welcomeContentService from './welcome-content-service.js';

/**
 * First-Time Setup Service Class
 * Detects if system needs initialization and triggers setup
 */
class FirstTimeSetupService {
  constructor(database) {
    if (!database) {
      throw new Error('Database instance is required for FirstTimeSetupService');
    }
    this.db = database;
    this.initializeStatements();
  }

  /**
   * Initialize prepared statements for performance
   */
  initializeStatements() {
    try {
      // Check if any user settings exist
      this.checkSystemInitializedStmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM user_settings
      `);

      // Check specific user exists
      this.checkUserExistsStmt = this.db.prepare(`
        SELECT user_id, display_name, onboarding_completed
        FROM user_settings
        WHERE user_id = ?
      `);

      // Create default user
      this.createDefaultUserStmt = this.db.prepare(`
        INSERT OR IGNORE INTO user_settings (user_id, display_name)
        VALUES (?, ?)
      `);

      // Create onboarding state
      this.createOnboardingStateStmt = this.db.prepare(`
        INSERT OR IGNORE INTO onboarding_state (user_id, phase, step)
        VALUES (?, 1, 'name')
      `);

      // Create initial bridge
      this.createInitialBridgeStmt = this.db.prepare(`
        INSERT OR IGNORE INTO hemingway_bridges (
          id, user_id, bridge_type, content, priority, active
        ) VALUES (?, ?, 'question', ?, 4, 1)
      `);

      console.log('✅ FirstTimeSetupService prepared statements initialized');
    } catch (error) {
      console.error('❌ Error initializing FirstTimeSetupService statements:', error);
      throw error;
    }
  }

  /**
   * Detect if system is initialized (has any users)
   * @returns {boolean} True if system is initialized
   */
  isSystemInitialized() {
    try {
      const result = this.checkSystemInitializedStmt.get();
      const hasUsers = result.count > 0;

      return {
        initialized: hasUsers,
        userCount: result.count,
        needsInitialization: !hasUsers
      };
    } catch (error) {
      console.error('Error checking system initialization:', error);
      throw error;
    }
  }

  /**
   * Check if specific user exists
   * @param {string} userId - User ID to check
   * @returns {Object} User existence status
   */
  checkUserExists(userId = 'demo-user-123') {
    try {
      const user = this.checkUserExistsStmt.get(userId);

      if (!user) {
        return {
          exists: false,
          userId,
          needsSetup: true,
          message: 'User does not exist'
        };
      }

      return {
        exists: true,
        userId: user.user_id,
        displayName: user.display_name,
        onboardingCompleted: user.onboarding_completed === 1,
        needsSetup: false,
        message: 'User exists'
      };
    } catch (error) {
      console.error('Error checking user existence:', error);
      throw error;
    }
  }

  /**
   * Initialize system with default user and onboarding
   * @param {string} userId - User ID to create (default: demo-user-123)
   * @param {string} displayName - Initial display name (default: 'User')
   * @returns {Object} Initialization result
   */
  initializeSystem(userId = 'demo-user-123', displayName = 'User') {
    try {
      // 1. Create default user
      this.createDefaultUserStmt.run(userId, displayName);
      console.log(`✅ Created default user: ${userId}`);

      // 2. Create onboarding state
      this.createOnboardingStateStmt.run(userId);
      console.log(`✅ Created onboarding state for: ${userId}`);

      // 3. Create initial Hemingway bridge
      const bridgeId = `initial-bridge-${userId}`;
      const bridgeContent = 'Welcome! What brings you to Agent Feed today?';
      this.createInitialBridgeStmt.run(bridgeId, userId, bridgeContent);
      console.log(`✅ Created initial Hemingway bridge for: ${userId}`);

      return {
        success: true,
        userId,
        displayName,
        message: 'System initialized successfully',
        details: {
          userCreated: true,
          onboardingStateCreated: true,
          initialBridgeCreated: true
        }
      };
    } catch (error) {
      console.error('Error initializing system:', error);
      throw error;
    }
  }

  /**
   * Detect and initialize if needed (idempotent)
   * @param {string} userId - User ID to check/create
   * @returns {Object} Detection and initialization result
   */
  detectAndInitialize(userId = 'demo-user-123') {
    try {
      // Check if user exists
      const userStatus = this.checkUserExists(userId);

      if (userStatus.exists) {
        return {
          success: true,
          alreadyInitialized: true,
          userId: userStatus.userId,
          message: 'System already initialized',
          userStatus
        };
      }

      // User doesn't exist - initialize
      const initResult = this.initializeSystem(userId);

      return {
        success: true,
        alreadyInitialized: false,
        userId,
        message: 'System initialized (was not initialized)',
        initResult
      };
    } catch (error) {
      console.error('Error in detectAndInitialize:', error);
      throw error;
    }
  }

  /**
   * Get system state summary
   * @returns {Object} System state information
   */
  getSystemState() {
    try {
      const initStatus = this.isSystemInitialized();

      // Get user count by onboarding status
      const stats = this.db.prepare(`
        SELECT
          COUNT(*) as total_users,
          SUM(CASE WHEN onboarding_completed = 1 THEN 1 ELSE 0 END) as completed_onboarding,
          SUM(CASE WHEN onboarding_completed = 0 THEN 1 ELSE 0 END) as pending_onboarding
        FROM user_settings
      `).get();

      // Get active bridges count
      const bridgeStats = this.db.prepare(`
        SELECT COUNT(*) as active_bridges
        FROM hemingway_bridges
        WHERE active = 1
      `).get();

      // Get agent introductions count
      const introStats = this.db.prepare(`
        SELECT COUNT(*) as total_introductions
        FROM agent_introductions
      `).get();

      return {
        initialized: initStatus.initialized,
        userCount: stats.total_users || 0,
        onboardingStats: {
          completed: stats.completed_onboarding || 0,
          pending: stats.pending_onboarding || 0
        },
        activeBridges: bridgeStats.active_bridges || 0,
        agentIntroductions: introStats.total_introductions || 0,
        timestamp: Math.floor(Date.now() / 1000)
      };
    } catch (error) {
      console.error('Error getting system state:', error);
      throw error;
    }
  }

  /**
   * Initialize system with real posts in database
   * Creates welcome posts using dbSelector.createPost()
   * @param {string} userId - User ID to initialize (default: demo-user-123)
   * @param {string} displayName - User's display name (optional)
   * @returns {Promise<Object>} Initialization result with post IDs
   */
  async initializeSystemWithPosts(userId = 'demo-user-123', displayName = null) {
    try {
      // 1. Check if user already has posts (idempotency)
      // Check if system initialization posts exist by looking for the metadata flag
      const existingPostsCount = this.db.prepare(`
        SELECT COUNT(*) as count FROM agent_posts
        WHERE metadata LIKE '%"isSystemInitialization":true%'
        AND metadata LIKE ?
      `).get(`%"userId":"${userId}"%`);

      if (existingPostsCount && existingPostsCount.count > 0) {
        console.log(`ℹ️  User ${userId} already has ${existingPostsCount.count} system initialization posts - skipping`);
        return {
          alreadyInitialized: true,
          userId,
          existingPostsCount: existingPostsCount.count,
          message: 'User already has system initialization posts'
        };
      }

      console.log(`🚀 Initializing system with posts for user: ${userId}`);

      // 2. Create user settings (if not exists)
      this.createDefaultUserStmt.run(userId, displayName || 'User');
      console.log(`✅ Created user settings for: ${userId}`);

      // 3. Create onboarding state
      this.createOnboardingStateStmt.run(userId);
      console.log(`✅ Created onboarding state for: ${userId}`);

      // 4. Generate welcome post data
      const welcomePosts = welcomeContentService.createAllWelcomePosts(userId, displayName);
      console.log(`📝 Generated ${welcomePosts.length} welcome posts`);

      // 5. Create each post in database directly
      const createdPostIds = [];
      const createPostStmt = this.db.prepare(`
        INSERT INTO agent_posts (id, authorAgent, content, title, publishedAt, metadata, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      // Base timestamp for first post
      const baseTimestamp = Date.now();

      for (let i = 0; i < welcomePosts.length; i++) {
        const postData = welcomePosts[i];
        try {
          // Calculate timestamp with 3-second intervals for proper chronological ordering
          // Post 0 (Λvi Welcome): baseTimestamp
          // Post 1 (Onboarding): baseTimestamp + 3000ms
          // Post 2 (Reference): baseTimestamp + 6000ms
          const postTimestamp = baseTimestamp + (i * 3000);
          const postId = `post-${postTimestamp}-${Math.random().toString(36).substr(2, 9)}`;
          const publishedAt = new Date(postTimestamp).toISOString();

          // Merge metadata with userId for tracking
          const metadata = {
            ...postData.metadata,
            agentId: postData.agentId,
            isAgentResponse: true,
            userId: userId,  // Store userId in metadata for tracking
            tags: []
          };

          // Create post directly in database with explicit timestamp
          createPostStmt.run(
            postId,
            postData.agent.name,
            postData.content,
            postData.title || '',
            publishedAt,
            JSON.stringify(metadata),
            JSON.stringify({
              comments: 0,
              likes: 0,
              shares: 0,
              views: 0
            })
          );

          createdPostIds.push(postId);
          console.log(`✅ Created ${postData.metadata.welcomePostType} post: ${postId} at ${publishedAt}`);
          console.log(`   Timestamp offset: +${i * 3}s from base (${postTimestamp})`);
        } catch (postError) {
          console.error(`❌ Error creating post for ${postData.agentId}:`, postError);
          throw postError;
        }
      }

      // 6. Create initial Hemingway bridge
      const bridgeId = `initial-bridge-${userId}`;
      const bridgeContent = 'Welcome! What brings you to Agent Feed today?';
      this.createInitialBridgeStmt.run(bridgeId, userId, bridgeContent);
      console.log(`✅ Created initial Hemingway bridge for: ${userId}`);

      // 7. Return success with post IDs
      return {
        success: true,
        alreadyInitialized: false,
        userId,
        postsCreated: createdPostIds.length,
        postIds: createdPostIds,
        message: `System initialized successfully with ${createdPostIds.length} welcome posts`,
        details: {
          userCreated: true,
          onboardingStateCreated: true,
          postsCreated: true,
          initialBridgeCreated: true
        }
      };
    } catch (error) {
      console.error('❌ Error initializing system with posts:', error);
      throw error;
    }
  }
}

/**
 * Create and export service instance factory
 * @param {Database} db - better-sqlite3 database instance
 * @returns {FirstTimeSetupService} Service instance
 */
export function createFirstTimeSetupService(db) {
  return new FirstTimeSetupService(db);
}

export default FirstTimeSetupService;
