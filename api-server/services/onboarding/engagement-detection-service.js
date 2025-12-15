/**
 * Engagement Detection Service
 * Tracks user engagement signals to inform agent introduction timing
 * Implements smart timing based on user activity
 */

export class EngagementDetectionService {
  constructor(database) {
    if (!database) {
      throw new Error('Database instance is required for EngagementDetectionService');
    }
    this.db = database;
    this.initializeStatements();
  }

  /**
   * Initialize prepared statements for performance
   */
  initializeStatements() {
    try {
      // Get user's post count
      this.getPostCountStmt = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM posts
        WHERE user_id = ? AND created_at >= ?
      `);

      // Get user's comment count
      this.getCommentCountStmt = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM comments
        WHERE user_id = ? AND created_at >= ?
      `);

      // Get user's last activity timestamp
      this.getLastActivityStmt = this.db.prepare(`
        SELECT MAX(created_at) as last_activity
        FROM (
          SELECT created_at FROM posts WHERE user_id = ?
          UNION ALL
          SELECT created_at FROM comments WHERE user_id = ?
        )
      `);

      console.log('✅ EngagementDetectionService prepared statements initialized');
    } catch (error) {
      console.error('❌ Error initializing EngagementDetectionService statements:', error);
      throw error;
    }
  }

  /**
   * Check user's engagement level
   * @param {string} userId - User ID
   * @param {number} windowHours - Time window in hours (default: 24)
   * @returns {Promise<Object>} Engagement assessment
   */
  async checkEngagementLevel(userId, windowHours = 24) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const windowStart = now - (windowHours * 3600);

      // Get activity counts
      const postCount = this.getPostCountStmt.get(userId, windowStart)?.count || 0;
      const commentCount = this.getCommentCountStmt.get(userId, windowStart)?.count || 0;
      const lastActivity = this.getLastActivityStmt.get(userId, userId)?.last_activity || 0;

      // Calculate engagement metrics
      const totalActions = postCount + commentCount;
      const hoursSinceLastActivity = (now - lastActivity) / 3600;

      // Determine engagement level
      let level = 'inactive';
      let score = 0;

      if (totalActions >= 5 && hoursSinceLastActivity < 1) {
        level = 'high';
        score = 100;
      } else if (totalActions >= 3 || hoursSinceLastActivity < 2) {
        level = 'medium';
        score = 60;
      } else if (totalActions >= 1 || hoursSinceLastActivity < 6) {
        level = 'low';
        score = 30;
      }

      return {
        level,
        score,
        metrics: {
          postCount,
          commentCount,
          totalActions,
          hoursSinceLastActivity: Math.round(hoursSinceLastActivity * 10) / 10
        },
        isEngaged: level !== 'inactive',
        isHighlyEngaged: level === 'high'
      };
    } catch (error) {
      console.error('❌ Error checking engagement level:', error);
      return {
        level: 'unknown',
        score: 0,
        metrics: {},
        isEngaged: false,
        isHighlyEngaged: false,
        error: error.message
      };
    }
  }

  /**
   * Detect engagement signals from user activity
   * @param {string} userId - User ID
   * @param {Object} activity - Recent activity object
   * @returns {Object} Engagement signals
   */
  detectEngagementSignals(userId, activity = {}) {
    const signals = {
      hasRecentPost: false,
      hasRecentComment: false,
      hasInteractedWithAgent: false,
      hasCompletedOnboarding: false,
      timeOnPlatform: 0,
      momentum: 'none'
    };

    try {
      const now = Math.floor(Date.now() / 1000);

      // Check for recent posts (last 30 minutes)
      if (activity.lastPostAt && (now - activity.lastPostAt) < 1800) {
        signals.hasRecentPost = true;
      }

      // Check for recent comments (last 15 minutes)
      if (activity.lastCommentAt && (now - activity.lastCommentAt) < 900) {
        signals.hasRecentComment = true;
      }

      // Check for agent interactions
      if (activity.agentInteractionCount && activity.agentInteractionCount > 0) {
        signals.hasInteractedWithAgent = true;
      }

      // Check onboarding completion
      if (activity.onboardingCompleted) {
        signals.hasCompletedOnboarding = true;
      }

      // Calculate time on platform (in hours)
      if (activity.firstActivityAt) {
        signals.timeOnPlatform = Math.round(((now - activity.firstActivityAt) / 3600) * 10) / 10;
      }

      // Determine momentum
      if (signals.hasRecentPost && signals.hasRecentComment) {
        signals.momentum = 'high';
      } else if (signals.hasRecentPost || signals.hasRecentComment) {
        signals.momentum = 'medium';
      } else if (signals.hasInteractedWithAgent) {
        signals.momentum = 'low';
      }

      return signals;
    } catch (error) {
      console.error('❌ Error detecting engagement signals:', error);
      return signals;
    }
  }

  /**
   * Check if user is ready for next agent introduction
   * Based on engagement patterns and timing
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Readiness assessment
   */
  async checkIntroductionReadiness(userId) {
    try {
      // Get engagement level
      const engagement = await this.checkEngagementLevel(userId);

      // Get introduction history
      const recentIntros = this.getRecentIntroductionCount(userId, 24); // Last 24 hours

      // Decision logic
      const isReady =
        engagement.isEngaged &&
        recentIntros < 3 && // Max 3 introductions per day
        engagement.metrics.totalActions >= 1; // At least 1 action today

      return {
        ready: isReady,
        engagement: engagement.level,
        recentIntroductions: recentIntros,
        reasoning: this.getReadinessReasoning(engagement, recentIntros)
      };
    } catch (error) {
      console.error('❌ Error checking introduction readiness:', error);
      return {
        ready: false,
        engagement: 'unknown',
        recentIntroductions: 0,
        reasoning: 'Error checking readiness',
        error: error.message
      };
    }
  }

  /**
   * Get human-readable reasoning for readiness decision
   * @private
   */
  getReadinessReasoning(engagement, recentIntros) {
    if (!engagement.isEngaged) {
      return 'User not actively engaged';
    }

    if (recentIntros >= 3) {
      return 'Too many recent introductions (max 3 per day)';
    }

    if (engagement.metrics.totalActions < 1) {
      return 'User needs more activity before next introduction';
    }

    if (engagement.level === 'high') {
      return 'User highly engaged - good time to introduce';
    }

    return 'User moderately engaged - can introduce';
  }

  /**
   * Get count of recent agent introductions
   * @param {string} userId - User ID
   * @param {number} windowHours - Time window in hours
   * @returns {number} Count of introductions
   */
  getRecentIntroductionCount(userId, windowHours = 24) {
    try {
      const cutoff = Math.floor(Date.now() / 1000) - (windowHours * 3600);

      const result = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM agent_introductions
        WHERE user_id = ? AND introduced_at >= ?
      `).get(userId, cutoff);

      return result?.count || 0;
    } catch (error) {
      console.error('❌ Error getting recent introduction count:', error);
      return 0;
    }
  }

  /**
   * Track user engagement event
   * @param {string} userId - User ID
   * @param {string} eventType - Event type (post, comment, agent_interaction)
   * @param {Object} metadata - Event metadata
   * @returns {Object} Tracking result
   */
  trackEngagementEvent(userId, eventType, metadata = {}) {
    try {
      // This could be extended to store engagement events in a dedicated table
      // For now, we rely on posts and comments tables

      console.log(`📊 Tracked engagement: ${userId} - ${eventType}`, metadata);

      return {
        success: true,
        userId,
        eventType,
        timestamp: Math.floor(Date.now() / 1000)
      };
    } catch (error) {
      console.error('❌ Error tracking engagement event:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get engagement summary for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Engagement summary
   */
  async getEngagementSummary(userId) {
    try {
      // Get engagement over different time windows
      const last24h = await this.checkEngagementLevel(userId, 24);
      const last7d = await this.checkEngagementLevel(userId, 168); // 7 days

      // Get total activity
      const totalPosts = this.db.prepare(`
        SELECT COUNT(*) as count FROM posts WHERE user_id = ?
      `).get(userId)?.count || 0;

      const totalComments = this.db.prepare(`
        SELECT COUNT(*) as count FROM comments WHERE user_id = ?
      `).get(userId)?.count || 0;

      // Get agent introductions
      const agentIntros = this.db.prepare(`
        SELECT COUNT(*) as count FROM agent_introductions WHERE user_id = ?
      `).get(userId)?.count || 0;

      return {
        current: last24h,
        weekly: last7d,
        allTime: {
          totalPosts,
          totalComments,
          totalActions: totalPosts + totalComments,
          agentIntroductions: agentIntros
        },
        trend: this.calculateEngagementTrend(last24h, last7d)
      };
    } catch (error) {
      console.error('❌ Error getting engagement summary:', error);
      return {
        current: { level: 'unknown' },
        weekly: { level: 'unknown' },
        allTime: {},
        trend: 'unknown',
        error: error.message
      };
    }
  }

  /**
   * Calculate engagement trend
   * @private
   */
  calculateEngagementTrend(recent, weekly) {
    try {
      const recentScore = recent.score || 0;
      const weeklyScore = weekly.score || 0;

      if (recentScore > weeklyScore * 1.2) {
        return 'increasing';
      } else if (recentScore < weeklyScore * 0.8) {
        return 'decreasing';
      }
      return 'stable';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Detect contextual triggers for agent introductions
   * Analyzes post content for keywords/patterns that should trigger specific agents
   * @param {string} content - Post or comment content
   * @returns {Array<string>} Array of agent IDs to potentially introduce
   */
  detectContextualTriggers(content) {
    const triggers = [];
    const normalizedContent = content.toLowerCase();

    // URL detection for Link Logger
    if (normalizedContent.match(/https?:\/\/|www\./)) {
      triggers.push('link-logger-agent');
    }

    // Meeting keywords for Meeting Prep
    const meetingKeywords = ['meeting', 'call', 'conference', 'zoom', 'standup', 'sync'];
    if (meetingKeywords.some(kw => normalizedContent.includes(kw))) {
      triggers.push('meeting-prep-agent');
    }

    // Todo/task keywords for Personal Todos
    const todoKeywords = ['todo', 'task', 'need to', 'remember to', 'deadline', 'priority'];
    if (todoKeywords.some(kw => normalizedContent.includes(kw))) {
      triggers.push('personal-todos-agent');
    }

    // Learning keywords for Learning Optimizer
    const learningKeywords = ['learn', 'study', 'course', 'tutorial', 'practice', 'skill'];
    if (learningKeywords.some(kw => normalizedContent.includes(kw))) {
      triggers.push('learning-optimizer-agent');
    }

    // Follow-up keywords
    const followupKeywords = ['follow up', 'follow-up', 'remind me', 'check back'];
    if (followupKeywords.some(kw => normalizedContent.includes(kw))) {
      triggers.push('follow-ups-agent');
    }

    // Page/dashboard keywords for Page Builder
    const pageKeywords = ['dashboard', 'page', 'template', 'layout', 'design'];
    if (pageKeywords.some(kw => normalizedContent.includes(kw))) {
      triggers.push('page-builder-agent');
    }

    return triggers;
  }
}

/**
 * Create and export service instance factory
 * @param {Database} db - better-sqlite3 database instance
 * @returns {EngagementDetectionService} Service instance
 */
export function createEngagementDetectionService(db) {
  return new EngagementDetectionService(db);
}

export default EngagementDetectionService;
