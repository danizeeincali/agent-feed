/**
 * Sequential Introduction Orchestrator
 *
 * Purpose: Manages sequential agent introductions based on user engagement
 * Features:
 * - Calculate user engagement scores
 * - Determine next agent to introduce
 * - Check trigger conditions for contextual introductions
 * - Handle special workflows (PageBuilder showcase, Agent Builder tutorial)
 * - Track skipped and delayed introductions
 *
 * Integration: Called by AVI Orchestrator every 30 seconds to check for new introductions
 */

import { nanoid } from 'nanoid';
import { promises as fs } from 'fs';
import path from 'path';

export class SequentialIntroductionOrchestrator {
  constructor(database) {
    if (!database) {
      throw new Error('Database instance is required for SequentialIntroductionOrchestrator');
    }
    this.db = database;
    console.log('✅ SequentialIntroductionOrchestrator initialized');
  }

  /**
   * Calculate user engagement score based on activity
   * Scoring formula:
   * - Posts created: 5 points each
   * - Comments created: 2 points each
   * - Likes given: 1 point each
   * - Phase 1 completed: 15 points
   * - Phase 2 completed: 20 points
   * - Agent interactions: 3 points each
   * Maximum score: 100
   *
   * @param {string} userId - User ID
   * @returns {number} Engagement score (0-100)
   */
  calculateEngagementScore(userId) {
    try {
      if (!userId) {
        return 0;
      }

      // Check if user exists
      const userExists = this.db.prepare(`
        SELECT COUNT(*) as count FROM user_settings WHERE user_id = ?
      `).get(userId);

      if (!userExists || userExists.count === 0) {
        return 0;
      }

      // Get post count
      const postCount = this.db.prepare(`
        SELECT COUNT(*) as count FROM agent_posts WHERE author_agent = ?
      `).get(userId)?.count || 0;

      // Get comment count
      const commentCount = this.db.prepare(`
        SELECT COUNT(*) as count FROM comments WHERE author_user_id = ?
      `).get(userId)?.count || 0;

      // Get onboarding phase completion
      const onboardingState = this.db.prepare(`
        SELECT phase1_completed, phase2_completed FROM onboarding_state WHERE user_id = ?
      `).get(userId);

      const phase1Completed = onboardingState?.phase1_completed || 0;
      const phase2Completed = onboardingState?.phase2_completed || 0;

      // Get agent interactions
      const agentInteractions = this.db.prepare(`
        SELECT SUM(interaction_count) as total FROM agent_introductions WHERE user_id = ?
      `).get(userId)?.total || 0;

      // Calculate score
      let score = 0;
      score += postCount * 5;
      score += commentCount * 2;
      score += phase1Completed ? 15 : 0;
      score += phase2Completed ? 20 : 0;
      score += Math.min(agentInteractions * 3, 30); // Cap at 30 points from interactions

      // Cap at 100
      score = Math.min(score, 100);

      return score;
    } catch (error) {
      console.error('Error calculating engagement score:', error);
      throw error;
    }
  }

  /**
   * Get next agent to introduce based on engagement and priority
   * @param {string} userId - User ID
   * @returns {Object|null} Next agent config or null
   */
  getNextAgentToIntroduce(userId) {
    try {
      if (!userId) {
        return null;
      }

      const engagementScore = this.calculateEngagementScore(userId);

      // Get next agent from introduction_queue that meets threshold
      // CRITICAL: Filter by visibility='public' to exclude system agents
      const nextAgent = this.db.prepare(`
        SELECT
          iq.id,
          iq.agent_id,
          iq.priority,
          iq.unlock_threshold,
          iq.intro_method
        FROM introduction_queue iq
        INNER JOIN agent_metadata am ON am.agent_id = iq.agent_id
        WHERE iq.user_id = ?
          AND iq.introduced = 0
          AND iq.unlock_threshold <= ?
          AND am.visibility = 'public'
        ORDER BY iq.priority ASC
        LIMIT 1
      `).get(userId, engagementScore);

      if (nextAgent) {
        console.log(`📋 Next agent to introduce: ${nextAgent.agent_id} (threshold: ${nextAgent.unlock_threshold}, user score: ${engagementScore})`);
      } else {
        console.log(`ℹ️ No agents ready to introduce (user score: ${engagementScore})`);
      }

      return nextAgent || null;
    } catch (error) {
      console.error('Error getting next agent to introduce:', error);
      return null;
    }
  }

  /**
   * Check if user meets trigger conditions for an agent
   * @param {string} userId - User ID
   * @param {Object} agentConfig - Agent configuration with trigger rules
   * @returns {boolean} True if conditions met
   */
  checkTriggerConditions(userId, agentConfig) {
    try {
      if (!userId || !agentConfig) {
        return false;
      }

      const triggerRules = agentConfig.triggerRules || {};

      // Check minimum engagement score
      if (triggerRules.minEngagementScore) {
        const score = this.calculateEngagementScore(userId);
        if (score < triggerRules.minEngagementScore) {
          return false;
        }
      }

      // Check phase requirements
      if (triggerRules.requiresPhase1 || triggerRules.requiresPhase2) {
        const onboardingState = this.db.prepare(`
          SELECT phase1_completed, phase2_completed FROM onboarding_state WHERE user_id = ?
        `).get(userId);

        if (triggerRules.requiresPhase1 && !onboardingState?.phase1_completed) {
          return false;
        }
        if (triggerRules.requiresPhase2 && !onboardingState?.phase2_completed) {
          return false;
        }
      }

      // Check contextual triggers (keywords in recent posts)
      if (triggerRules.contextual && triggerRules.keywords) {
        const recentPosts = this.db.prepare(`
          SELECT content, title FROM agent_posts
          WHERE author_agent = ?
          ORDER BY created_at DESC
          LIMIT 5
        `).all(userId);

        const hasKeyword = recentPosts.some(post => {
          const text = `${post.title || ''} ${post.content}`.toLowerCase();
          return triggerRules.keywords.some(keyword => text.includes(keyword.toLowerCase()));
        });

        if (!hasKeyword) {
          return false;
        }
      }

      // Check if agent is skipped (unless override flag is set)
      if (!triggerRules.overrideSkip) {
        const skipped = this.db.prepare(`
          SELECT id FROM introduction_queue
          WHERE user_id = ? AND agent_id = ? AND introduced = -1
        `).get(userId, agentConfig.agentId);

        if (skipped) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking trigger conditions:', error);
      return false;
    }
  }

  /**
   * Get introduction queue ordered by priority
   * @param {string} userId - User ID
   * @returns {Array} Ordered array of agent configs
   */
  getIntroductionQueue(userId) {
    try {
      if (!userId) {
        return [];
      }

      const engagementScore = this.calculateEngagementScore(userId);

      // Get all eligible agents from queue
      // CRITICAL: Filter by visibility='public' to exclude system agents
      const eligibleAgents = this.db.prepare(`
        SELECT
          iq.id,
          iq.agent_id,
          iq.priority,
          iq.unlock_threshold,
          iq.intro_method
        FROM introduction_queue iq
        INNER JOIN agent_metadata am ON am.agent_id = iq.agent_id
        WHERE iq.user_id = ?
          AND iq.introduced = 0
          AND iq.unlock_threshold <= ?
          AND am.visibility = 'public'
        ORDER BY iq.priority ASC
      `).all(userId, engagementScore);

      console.log(`📊 Found ${eligibleAgents.length} eligible agents for introduction (engagement score: ${engagementScore})`);

      return eligibleAgents.map(agent => ({
        agentId: agent.agent_id,
        priority: agent.priority,
        threshold: agent.unlock_threshold,
        method: agent.intro_method
      }));
    } catch (error) {
      console.error('Error getting introduction queue:', error);
      return [];
    }
  }

  /**
   * Check for special workflow triggers (PageBuilder, Agent Builder)
   * @param {string} userId - User ID
   * @param {string} context - Context string to check
   * @returns {Object|null} Workflow trigger info or null
   */
  checkSpecialWorkflowTriggers(userId, context) {
    try {
      if (!context || typeof context !== 'string') {
        return null;
      }

      const lowerContext = context.toLowerCase();

      // PageBuilder showcase keywords
      const pageBuilderKeywords = [
        'create a page', 'build a page', 'make a page',
        'landing page', 'webpage', 'website',
        'create a website', 'build a website'
      ];

      const hasPageBuilderKeyword = pageBuilderKeywords.some(keyword =>
        lowerContext.includes(keyword)
      );

      if (hasPageBuilderKeyword) {
        return {
          workflow: 'pagebuilder-showcase',
          agentId: 'pagebuilder-agent',
          priority: 1
        };
      }

      // Agent Builder tutorial keywords
      const agentBuilderKeywords = [
        'create agent', 'build agent', 'make agent',
        'create my own agent', 'build my own agent',
        'custom agent', 'how to create agent'
      ];

      const hasAgentBuilderKeyword = agentBuilderKeywords.some(keyword =>
        lowerContext.includes(keyword)
      );

      if (hasAgentBuilderKeyword) {
        return {
          workflow: 'agent-builder-tutorial',
          agentId: 'agent-builder',
          priority: 2
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking special workflow triggers:', error);
      return null;
    }
  }

  /**
   * Mark agent introduction as skipped by user
   * @param {string} userId - User ID
   * @param {string} agentId - Agent ID
   * @returns {Object} Result
   */
  markIntroductionSkipped(userId, agentId) {
    try {
      // Mark as skipped by setting introduced = -1
      const result = this.db.prepare(`
        UPDATE introduction_queue
        SET introduced = -1
        WHERE user_id = ? AND agent_id = ?
      `).run(userId, agentId);

      // Track skip count in metadata
      const currentQueue = this.db.prepare(`
        SELECT id FROM introduction_queue WHERE user_id = ? AND agent_id = ?
      `).get(userId, agentId);

      return {
        success: result.changes > 0,
        skipped: true,
        agentId,
        skipCount: 1 // TODO: Track in separate table for multiple skips
      };
    } catch (error) {
      console.error('Error marking introduction skipped:', error);
      throw error;
    }
  }

  /**
   * Delay agent introduction to later time
   * @param {string} userId - User ID
   * @param {string} agentId - Agent ID
   * @param {number} delaySeconds - Delay in seconds
   * @returns {Object} Result
   */
  delayIntroduction(userId, agentId, delaySeconds) {
    try {
      const delayedUntil = Math.floor(Date.now() / 1000) + delaySeconds;

      // Store delay information (would need a separate table for full implementation)
      // For now, we'll just return the calculation
      return {
        success: true,
        agentId,
        delayedUntil,
        delaySeconds
      };
    } catch (error) {
      console.error('Error delaying introduction:', error);
      throw error;
    }
  }

  /**
   * Update user engagement metrics after activity
   * @param {string} userId - User ID
   * @param {Object} activity - Activity data
   */
  updateEngagementMetrics(userId, activity) {
    try {
      // Ensure user_engagement record exists
      this.db.prepare(`
        INSERT OR IGNORE INTO user_engagement (
          user_id, total_interactions, engagement_score, last_activity_at
        ) VALUES (?, 0, 0, unixepoch())
      `).run(userId);

      // Update activity counters
      const updates = {
        total_interactions: 1,
        posts_created: activity.type === 'post' ? 1 : 0,
        comments_created: activity.type === 'comment' ? 1 : 0,
        likes_given: activity.type === 'like' ? 1 : 0,
        posts_read: activity.type === 'read' ? 1 : 0
      };

      this.db.prepare(`
        UPDATE user_engagement
        SET
          total_interactions = total_interactions + ?,
          posts_created = posts_created + ?,
          comments_created = comments_created + ?,
          likes_given = likes_given + ?,
          posts_read = posts_read + ?,
          engagement_score = ?,
          last_activity_at = unixepoch()
        WHERE user_id = ?
      `).run(
        updates.total_interactions,
        updates.posts_created,
        updates.comments_created,
        updates.likes_given,
        updates.posts_read,
        this.calculateEngagementScore(userId),
        userId
      );

      console.log(`✅ Updated engagement for user ${userId}: ${activity.type}`);
    } catch (error) {
      console.error('Error updating engagement metrics:', error);
    }
  }

  /**
   * Mark agent as introduced in the queue
   * @param {string} userId - User ID
   * @param {string} agentId - Agent ID
   * @param {string} postId - Introduction post ID
   * @returns {Object} Result
   */
  markAgentIntroduced(userId, agentId, postId) {
    try {
      const now = Math.floor(Date.now() / 1000);

      const result = this.db.prepare(`
        UPDATE introduction_queue
        SET
          introduced = 1,
          introduced_at = ?,
          intro_post_id = ?
        WHERE user_id = ? AND agent_id = ?
      `).run(now, postId, userId, agentId);

      if (result.changes === 0) {
        console.warn(`No queue entry found for ${agentId} and user ${userId}`);
      }

      return {
        success: result.changes > 0,
        userId,
        agentId,
        postId,
        introducedAt: now
      };
    } catch (error) {
      console.error('Error marking agent introduced:', error);
      throw error;
    }
  }
}

/**
 * Create and export service instance factory
 * @param {Database} db - better-sqlite3 database instance
 * @returns {SequentialIntroductionOrchestrator} Service instance
 */
export function createSequentialIntroductionOrchestrator(db) {
  return new SequentialIntroductionOrchestrator(db);
}

export default SequentialIntroductionOrchestrator;
