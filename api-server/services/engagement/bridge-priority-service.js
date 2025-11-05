/**
 * Bridge Priority Service
 * Calculates priority waterfall for Hemingway bridges
 * Implements Decision 10 from SPARC-SYSTEM-INITIALIZATION.md
 *
 * Priority Waterfall (Section 2.3):
 * 1. User's last interaction → continue that thread
 * 2. Next step in current flow → guide progression
 * 3. New feature introduction → expand their world
 * 4. Engaging question → start new conversation
 * 5. Valuable insight/fact → maintain connection
 */

/**
 * Bridge Priority Service Class
 * Calculates which bridge should be active based on user state
 */
class BridgePriorityService {
  constructor(database, hemingwayBridgeService) {
    if (!database) {
      throw new Error('Database instance is required for BridgePriorityService');
    }
    if (!hemingwayBridgeService) {
      throw new Error('HemingwayBridgeService is required for BridgePriorityService');
    }
    this.db = database;
    this.bridgeService = hemingwayBridgeService;
    this.initializeStatements();
  }

  /**
   * Initialize prepared statements for performance
   */
  initializeStatements() {
    try {
      // Get user's last interaction (from comments or posts)
      this.getLastInteractionStmt = this.db.prepare(`
        SELECT
          'comment' as type,
          c.id,
          c.post_id,
          c.content,
          CAST(strftime('%s', c.created_at) AS INTEGER) as created_at
        FROM comments c
        WHERE c.author = ?
        ORDER BY c.created_at DESC
        LIMIT 1
      `);

      // Get onboarding state
      this.getOnboardingStateStmt = this.db.prepare(`
        SELECT
          user_id,
          phase,
          step,
          phase1_completed,
          phase1_completed_at,
          phase2_completed,
          phase2_completed_at,
          responses
        FROM onboarding_state
        WHERE user_id = ?
      `);

      // Get pending agent introductions (agents not yet introduced)
      this.getPendingAgentIntrosStmt = this.db.prepare(`
        SELECT
          agent_id,
          introduced_at,
          post_id
        FROM agent_introductions
        WHERE user_id = ?
        ORDER BY introduced_at DESC
      `);

      // Check if specific agent has been introduced
      this.checkAgentIntroducedStmt = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM agent_introductions
        WHERE user_id = ? AND agent_id = ?
      `);

      console.log('✅ BridgePriorityService prepared statements initialized');
    } catch (error) {
      console.error('❌ Error initializing BridgePriorityService statements:', error);
      throw error;
    }
  }

  /**
   * Calculate priority and return the best bridge for a user
   * Implements the full priority waterfall logic
   * @param {string} userId - User ID
   * @returns {Object} Calculated bridge recommendation
   */
  calculatePriority(userId = 'demo-user-123') {
    try {
      // Priority 1: User's last interaction
      const lastInteractionBridge = this.checkLastInteraction(userId);
      if (lastInteractionBridge) {
        return lastInteractionBridge;
      }

      // Priority 2: Next step in current flow
      const nextStepBridge = this.checkNextStep(userId);
      if (nextStepBridge) {
        return nextStepBridge;
      }

      // Priority 3: New feature introduction
      const newFeatureBridge = this.checkNewFeature(userId);
      if (newFeatureBridge) {
        return newFeatureBridge;
      }

      // Priority 4: Engaging question
      const questionBridge = this.getEngagingQuestion(userId);
      if (questionBridge) {
        return questionBridge;
      }

      // Priority 5: Valuable insight (always available fallback)
      return this.getValuableInsight(userId);
    } catch (error) {
      console.error('Error calculating priority:', error);
      throw error;
    }
  }

  /**
   * Get complete priority waterfall (all potential bridges ranked)
   * @param {string} userId - User ID
   * @returns {Array} Array of all potential bridges in priority order
   */
  getPriorityWaterfall(userId = 'demo-user-123') {
    try {
      const waterfall = [];

      // Priority 1
      const p1 = this.checkLastInteraction(userId);
      if (p1) waterfall.push(p1);

      // Priority 2
      const p2 = this.checkNextStep(userId);
      if (p2) waterfall.push(p2);

      // Priority 3
      const p3 = this.checkNewFeature(userId);
      if (p3) waterfall.push(p3);

      // Priority 4
      const p4 = this.getEngagingQuestion(userId);
      if (p4) waterfall.push(p4);

      // Priority 5 (always available)
      const p5 = this.getValuableInsight(userId);
      waterfall.push(p5);

      return waterfall;
    } catch (error) {
      console.error('Error getting priority waterfall:', error);
      throw error;
    }
  }

  /**
   * Priority 1: Check for unanswered questions from last interaction
   * @param {string} userId - User ID
   * @returns {Object|null} Bridge or null
   */
  checkLastInteraction(userId) {
    try {
      const lastInteraction = this.getLastInteractionStmt.get(userId);

      if (!lastInteraction) {
        return null;
      }

      // Check if this interaction has an unanswered question
      // For now, we'll check if the interaction was less than 1 hour ago
      const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;

      if (lastInteraction.created_at > oneHourAgo) {
        return {
          type: 'continue_thread',
          content: `Your recent ${lastInteraction.type} is waiting for responses. Check back!`,
          priority: 1,
          postId: lastInteraction.post_id || lastInteraction.id,
          agentId: null,
          action: null
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking last interaction:', error);
      return null;
    }
  }

  /**
   * Priority 2: Check for next step in onboarding flow
   * @param {string} userId - User ID
   * @returns {Object|null} Bridge or null
   */
  checkNextStep(userId) {
    try {
      const onboardingState = this.getOnboardingStateStmt.get(userId);

      if (!onboardingState) {
        return null;
      }

      // Check if Phase 1 is complete but Phase 2 not started
      if (onboardingState.phase1_completed && !onboardingState.phase2_completed) {
        // Check if Phase 1 was completed more than 1 day ago
        const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;

        if (onboardingState.phase1_completed_at < oneDayAgo) {
          return {
            type: 'next_step',
            content: 'Ready to complete your setup? Tell me more about your goals and preferences!',
            priority: 2,
            postId: null,
            agentId: 'get-to-know-you-agent',
            action: 'trigger_phase2'
          };
        }
      }

      // Check if still in Phase 1
      if (!onboardingState.phase1_completed) {
        return {
          type: 'next_step',
          content: 'Let\'s finish getting to know you! Answer the onboarding questions above.',
          priority: 2,
          postId: null,
          agentId: 'get-to-know-you-agent',
          action: null
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking next step:', error);
      return null;
    }
  }

  /**
   * Priority 3: Check for new feature/agent introductions
   * @param {string} userId - User ID
   * @returns {Object|null} Bridge or null
   */
  checkNewFeature(userId) {
    try {
      // Get core agents that should be introduced
      const coreAgents = [
        { id: 'personal-todos-agent', name: 'Personal Todos Agent' },
        { id: 'agent-ideas-agent', name: 'Agent Ideas Agent' },
        { id: 'link-logger-agent', name: 'Link Logger Agent' }
      ];

      // Check which core agents haven't been introduced yet
      for (const agent of coreAgents) {
        const result = this.checkAgentIntroducedStmt.get(userId, agent.id);

        if (result.count === 0) {
          return {
            type: 'new_feature',
            content: `Meet ${agent.name}! A new agent is ready to help you.`,
            priority: 3,
            postId: null,
            agentId: agent.id,
            action: 'introduce_agent'
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error checking new feature:', error);
      return null;
    }
  }

  /**
   * Priority 4: Get an engaging question
   * @param {string} userId - User ID
   * @returns {Object} Bridge with engaging question
   */
  getEngagingQuestion(userId) {
    const questions = [
      "What's on your mind today? Create a post and your agents will respond!",
      "What would you like to accomplish today? Your agents are here to help!",
      "Have any questions for your agent team? Create a post and mention them!",
      "What are you working on? Share a post and get insights from your agents!",
      "Need help with something? Post it and your agents will jump in!"
    ];

    // Rotate questions based on time
    const questionIndex = Math.floor(Date.now() / 86400000) % questions.length;

    return {
      type: 'question',
      content: questions[questionIndex],
      priority: 4,
      postId: null,
      agentId: null,
      action: null
    };
  }

  /**
   * Priority 5: Get a valuable insight (always available fallback)
   * @param {string} userId - User ID
   * @returns {Object} Bridge with valuable insight
   */
  getValuableInsight(userId) {
    const insights = [
      'Tip: You can mention @agent-name to get a specific agent\'s attention',
      'Did you know? Your agents monitor your feed 24/7 and respond proactively',
      'Pro tip: Use clear, specific questions to get the best responses from your agents',
      'Insight: The more you interact with agents, the better they understand your needs',
      'Remember: Agents can collaborate! Mention multiple agents for diverse perspectives'
    ];

    // Rotate insights based on time
    const insightIndex = Math.floor(Date.now() / 172800000) % insights.length; // Every 2 days

    return {
      type: 'insight',
      content: insights[insightIndex],
      priority: 5,
      postId: null,
      agentId: null,
      action: null
    };
  }

  /**
   * Check if an agent has been introduced to a user
   * @param {string} userId - User ID
   * @param {string} agentId - Agent ID
   * @returns {boolean} True if introduced
   */
  isAgentIntroduced(userId, agentId) {
    try {
      const result = this.checkAgentIntroducedStmt.get(userId, agentId);
      return result.count > 0;
    } catch (error) {
      console.error('Error checking if agent introduced:', error);
      return false;
    }
  }

  /**
   * Get onboarding state for a user
   * @param {string} userId - User ID
   * @returns {Object|null} Onboarding state or null
   */
  getOnboardingState(userId) {
    try {
      const state = this.getOnboardingStateStmt.get(userId);
      if (state && state.responses) {
        state.responses = JSON.parse(state.responses);
      }
      return state;
    } catch (error) {
      console.error('Error getting onboarding state:', error);
      return null;
    }
  }
}

/**
 * Create and export service instance factory
 * @param {Database} db - better-sqlite3 database instance
 * @param {HemingwayBridgeService} bridgeService - Bridge service instance
 * @returns {BridgePriorityService} Service instance
 */
export function createBridgePriorityService(db, bridgeService) {
  return new BridgePriorityService(db, bridgeService);
}

export default BridgePriorityService;
