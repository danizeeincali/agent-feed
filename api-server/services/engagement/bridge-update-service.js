/**
 * Bridge Update Service
 * Automatically updates Hemingway bridges based on user actions
 * Implements Section 2.3 from SPARC-SYSTEM-INITIALIZATION.md
 *
 * Event Listeners:
 * - post_created: User creates a new post
 * - comment_created: User creates a comment
 * - onboarding_response: User responds to onboarding
 * - agent_mentioned: User mentions an agent
 */

import { randomUUID } from 'crypto';

/**
 * Bridge Update Service Class
 * Listens to user actions and updates engagement bridges accordingly
 */
class BridgeUpdateService {
  constructor(database, hemingwayBridgeService, bridgePriorityService) {
    if (!database) {
      throw new Error('Database instance is required for BridgeUpdateService');
    }
    if (!hemingwayBridgeService) {
      throw new Error('HemingwayBridgeService is required for BridgeUpdateService');
    }
    if (!bridgePriorityService) {
      throw new Error('BridgePriorityService is required for BridgeUpdateService');
    }

    this.db = database;
    this.bridgeService = hemingwayBridgeService;
    this.priorityService = bridgePriorityService;
    this.initializeStatements();
  }

  /**
   * Initialize prepared statements for performance
   */
  initializeStatements() {
    try {
      // Record agent introduction
      this.recordAgentIntroStmt = this.db.prepare(`
        INSERT OR IGNORE INTO agent_introductions (
          id,
          user_id,
          agent_id,
          introduced_at,
          post_id,
          interaction_count
        ) VALUES (?, ?, ?, unixepoch(), ?, 0)
      `);

      // Increment agent interaction count
      this.incrementInteractionStmt = this.db.prepare(`
        UPDATE agent_introductions
        SET interaction_count = interaction_count + 1
        WHERE user_id = ? AND agent_id = ?
      `);

      // Update onboarding state
      this.updateOnboardingStateStmt = this.db.prepare(`
        UPDATE onboarding_state
        SET
          phase = COALESCE(?, phase),
          step = COALESCE(?, step),
          phase1_completed = COALESCE(?, phase1_completed),
          phase1_completed_at = COALESCE(?, phase1_completed_at),
          phase2_completed = COALESCE(?, phase2_completed),
          phase2_completed_at = COALESCE(?, phase2_completed_at),
          responses = COALESCE(?, responses)
        WHERE user_id = ?
      `);

      console.log('✅ BridgeUpdateService prepared statements initialized');
    } catch (error) {
      console.error('❌ Error initializing BridgeUpdateService statements:', error);
      throw error;
    }
  }

  /**
   * Update bridge based on user action
   * @param {string} userId - User ID
   * @param {string} actionType - Type of action
   * @param {Object} actionData - Action data
   * @returns {Promise<Object>} Updated or created bridge
   */
  async updateBridgeOnUserAction(userId, actionType, actionData = {}) {
    try {
      console.log(`🔄 Updating bridge for user ${userId} on action: ${actionType}`);

      switch (actionType) {
        case 'post_created':
          return await this.handlePostCreated(userId, actionData);

        case 'comment_created':
          return await this.handleCommentCreated(userId, actionData);

        case 'onboarding_response':
          return await this.handleOnboardingResponse(userId, actionData);

        case 'agent_mentioned':
          return await this.handleAgentMentioned(userId, actionData);

        default:
          console.warn(`⚠️  Unknown action type: ${actionType}`);
          return await this.ensureBridgeExists(userId);
      }
    } catch (error) {
      console.error('Error updating bridge on user action:', error);
      throw error;
    }
  }

  /**
   * Handle post_created action
   * @param {string} userId - User ID
   * @param {Object} actionData - { postId, content }
   * @returns {Promise<Object>} Bridge
   */
  async handlePostCreated(userId, actionData) {
    const { postId, content } = actionData;

    // Deactivate old question/insight bridges (user is now active)
    this.bridgeService.deactivateBridgesByType(userId, 'question');
    this.bridgeService.deactivateBridgesByType(userId, 'insight');

    // Check if post contains a URL - trigger link-logger introduction
    if (content && /https?:\/\//.test(content)) {
      this.triggerContextualIntroduction(userId, 'url_in_post');
    }

    // Create bridge to encourage continuation
    return await this.bridgeService.createBridge({
      userId,
      type: 'continue_thread',
      content: 'Your post is live! Agents are reviewing it now. Check back for responses.',
      priority: 1,
      postId,
      agentId: 'system'
    });
  }

  /**
   * Handle comment_created action
   * @param {string} userId - User ID
   * @param {Object} actionData - { commentId, postId }
   * @returns {Promise<Object>} Bridge
   */
  async handleCommentCreated(userId, actionData) {
    const { postId } = actionData;

    // Deactivate old question/insight bridges
    this.bridgeService.deactivateBridgesByType(userId, 'question');
    this.bridgeService.deactivateBridgesByType(userId, 'insight');

    // Create bridge to original post
    return await this.bridgeService.createBridge({
      userId,
      type: 'continue_thread',
      content: 'Comment posted! Check back for responses from your agents.',
      priority: 1,
      postId,
      agentId: 'system'
    });
  }

  /**
   * Handle onboarding_response action
   * @param {string} userId - User ID
   * @param {Object} actionData - { phase, step, response }
   * @returns {Promise<Object>} Bridge
   */
  async handleOnboardingResponse(userId, actionData) {
    const { phase, step, response } = actionData;

    // This would be called by the onboarding agent after processing a response
    // For now, recalculate priority to get the next appropriate bridge
    const recommendation = this.priorityService.calculatePriority(userId);

    // Deactivate old onboarding bridges
    this.bridgeService.deactivateBridgesByType(userId, 'next_step');

    // Create new bridge based on recommendation
    return await this.bridgeService.createBridge({
      userId,
      type: recommendation.type,
      content: recommendation.content,
      priority: recommendation.priority,
      postId: recommendation.postId,
      agentId: recommendation.agentId,
      action: recommendation.action
    });
  }

  /**
   * Handle agent_mentioned action
   * @param {string} userId - User ID
   * @param {Object} actionData - { agentId, agentName, postId }
   * @returns {Promise<Object>} Bridge
   */
  async handleAgentMentioned(userId, actionData) {
    const { agentId, agentName, postId } = actionData;

    // Record interaction with this agent
    this.incrementInteractionCount(userId, agentId);

    // Create bridge to await agent response
    return await this.bridgeService.createBridge({
      userId,
      type: 'continue_thread',
      content: `@${agentName} will respond soon! Check back for their insights.`,
      priority: 1,
      postId,
      agentId
    });
  }

  /**
   * Trigger contextual agent introduction
   * @param {string} userId - User ID
   * @param {string} triggerType - Type of trigger
   * @param {Object} triggerData - Additional data
   */
  async triggerContextualIntroduction(userId, triggerType, triggerData = {}) {
    try {
      let agentId = null;

      switch (triggerType) {
        case 'url_in_post':
          if (!this.priorityService.isAgentIntroduced(userId, 'link-logger-agent')) {
            agentId = 'link-logger-agent';
          }
          break;

        case 'task_mentioned':
          if (!this.priorityService.isAgentIntroduced(userId, 'personal-todos-agent')) {
            agentId = 'personal-todos-agent';
          }
          break;

        case 'meeting_mentioned':
          if (!this.priorityService.isAgentIntroduced(userId, 'meeting-prep-agent')) {
            agentId = 'meeting-prep-agent';
          }
          break;

        case 'page_created':
          if (!this.priorityService.isAgentIntroduced(userId, 'page-builder-agent')) {
            agentId = 'page-builder-agent';
          }
          break;

        default:
          console.warn(`⚠️  Unknown trigger type: ${triggerType}`);
      }

      if (agentId) {
        console.log(`✅ Triggering contextual introduction for ${agentId}`);
        // This would trigger the agent introduction system
        // For now, we'll create a bridge to introduce the agent
        await this.bridgeService.createBridge({
          userId,
          type: 'new_feature',
          content: `A new agent is ready to help! Meet ${agentId}.`,
          priority: 3,
          agentId,
          action: 'introduce_agent'
        });
      }
    } catch (error) {
      console.error('Error triggering contextual introduction:', error);
    }
  }

  /**
   * Record an agent introduction
   * @param {string} userId - User ID
   * @param {string} agentId - Agent ID
   * @param {string} postId - Introduction post ID
   */
  recordAgentIntroduction(userId, agentId, postId) {
    try {
      const introId = randomUUID();
      this.recordAgentIntroStmt.run(introId, userId, agentId, postId);
      console.log(`✅ Recorded introduction of ${agentId} to user ${userId}`);
    } catch (error) {
      console.error('Error recording agent introduction:', error);
      throw error;
    }
  }

  /**
   * Increment interaction count for an agent
   * @param {string} userId - User ID
   * @param {string} agentId - Agent ID
   */
  incrementInteractionCount(userId, agentId) {
    try {
      this.incrementInteractionStmt.run(userId, agentId);
    } catch (error) {
      console.error('Error incrementing interaction count:', error);
    }
  }

  /**
   * Update onboarding state
   * @param {string} userId - User ID
   * @param {Object} updates - State updates
   */
  updateOnboardingState(userId, updates = {}) {
    try {
      const {
        phase = null,
        step = null,
        phase1_completed = null,
        phase1_completed_at = null,
        phase2_completed = null,
        phase2_completed_at = null,
        responses = null
      } = updates;

      const responsesJson = responses ? JSON.stringify(responses) : null;

      this.updateOnboardingStateStmt.run(
        phase,
        step,
        phase1_completed,
        phase1_completed_at,
        phase2_completed,
        phase2_completed_at,
        responsesJson,
        userId
      );

      console.log(`✅ Updated onboarding state for user ${userId}`);
    } catch (error) {
      console.error('Error updating onboarding state:', error);
      throw error;
    }
  }

  /**
   * Ensure at least one bridge exists for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Bridge
   */
  async ensureBridgeExists(userId) {
    return await this.bridgeService.ensureBridgeExists(userId);
  }

  /**
   * Recalculate and update bridge based on current user state
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated bridge
   */
  async recalculateBridge(userId) {
    try {
      // Get current recommendation from priority service
      const recommendation = this.priorityService.calculatePriority(userId);

      // Check if there's already an active bridge of this type
      const activeBridge = this.bridgeService.getActiveBridge(userId);

      if (activeBridge && activeBridge.bridge_type === recommendation.type) {
        // Bridge already exists with correct type, no update needed
        return activeBridge;
      }

      // Deactivate old bridges and create new one
      this.bridgeService.deactivateBridgesByType(userId, activeBridge?.bridge_type);

      return await this.bridgeService.createBridge({
        userId,
        type: recommendation.type,
        content: recommendation.content,
        priority: recommendation.priority,
        postId: recommendation.postId,
        agentId: recommendation.agentId,
        action: recommendation.action
      });
    } catch (error) {
      console.error('Error recalculating bridge:', error);
      throw error;
    }
  }
}

/**
 * Create and export service instance factory
 * @param {Database} db - better-sqlite3 database instance
 * @param {HemingwayBridgeService} bridgeService - Bridge service
 * @param {BridgePriorityService} priorityService - Priority service
 * @returns {BridgeUpdateService} Service instance
 */
export function createBridgeUpdateService(db, bridgeService, priorityService) {
  return new BridgeUpdateService(db, bridgeService, priorityService);
}

export default BridgeUpdateService;
