/**
 * Agent Visibility Service
 * Purpose: Manage agent visibility, system agent hiding, and progressive revelation
 * Implements token optimization by preventing unnecessary agent exposure
 */

import { nanoid } from 'nanoid';

export class AgentVisibilityService {
  constructor(database) {
    if (!database) {
      throw new Error('Database instance is required for AgentVisibilityService');
    }
    this.db = database;
    this.initializeStatements();
  }

  /**
   * Initialize prepared statements for performance
   */
  initializeStatements() {
    try {
      // Get visible agents for user based on engagement and exposure
      this.getVisibleAgentsStmt = this.db.prepare(`
        SELECT
          am.agent_id,
          am.agent_name,
          am.visibility,
          am.introduction_phase,
          am.introduction_priority,
          am.min_engagement_score
        FROM agent_metadata am
        LEFT JOIN user_agent_exposure uae
          ON uae.user_id = ? AND uae.agent_id = am.agent_id
        LEFT JOIN user_engagement ue
          ON ue.user_id = ?
        WHERE
          -- Only public agents
          am.visibility = 'public'
          -- Not already exposed
          AND uae.id IS NULL
          -- User has enough engagement score
          AND COALESCE(ue.engagement_score, 0) >= am.min_engagement_score
        ORDER BY
          am.introduction_phase ASC,
          am.introduction_priority ASC
      `);

      // Check if agent can be introduced to user
      this.canIntroduceStmt = this.db.prepare(`
        SELECT
          am.agent_id,
          am.visibility,
          am.min_engagement_score,
          COALESCE(ue.engagement_score, 0) as user_score,
          CASE WHEN uae.id IS NOT NULL THEN 1 ELSE 0 END as already_exposed
        FROM agent_metadata am
        LEFT JOIN user_agent_exposure uae
          ON uae.user_id = ? AND uae.agent_id = am.agent_id
        LEFT JOIN user_engagement ue
          ON ue.user_id = ?
        WHERE am.agent_id = ?
      `);

      // Record agent introduction
      this.recordIntroductionStmt = this.db.prepare(`
        INSERT INTO user_agent_exposure (
          id,
          user_id,
          agent_id,
          introduction_method,
          session_number,
          introduction_phase
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      // Get exposed agents for user
      this.getExposedAgentsStmt = this.db.prepare(`
        SELECT
          uae.*,
          am.agent_name,
          am.visibility
        FROM user_agent_exposure uae
        LEFT JOIN agent_metadata am ON am.agent_id = uae.agent_id
        WHERE uae.user_id = ?
        ORDER BY uae.introduced_at DESC
      `);

      // Get all agents (including system if flagged)
      this.getAllAgentsStmt = this.db.prepare(`
        SELECT * FROM agent_metadata
        WHERE visibility IN (?, ?)
        ORDER BY
          visibility,
          introduction_phase,
          introduction_priority
      `);

      // Get introduction status
      this.getIntroductionStatusStmt = this.db.prepare(`
        SELECT
          COALESCE(ue.engagement_score, 0) as engagement_score,
          COUNT(DISTINCT uae.agent_id) as exposed_count
        FROM user_engagement ue
        LEFT JOIN user_agent_exposure uae ON uae.user_id = ue.user_id
        WHERE ue.user_id = ?
        GROUP BY ue.user_id
      `);

      console.log('✅ AgentVisibilityService prepared statements initialized');
    } catch (error) {
      console.error('❌ Error initializing AgentVisibilityService statements:', error);
      throw error;
    }
  }

  /**
   * Get visible agents for user (public only, not yet exposed, meets engagement requirements)
   * @param {string} userId - User ID
   * @returns {Array<Object>} Array of visible agents
   */
  getVisibleAgents(userId) {
    try {
      return this.getVisibleAgentsStmt.all(userId, userId);
    } catch (error) {
      console.error('Error getting visible agents:', error);
      return [];
    }
  }

  /**
   * Check if agent can be introduced to user
   * @param {string} userId - User ID
   * @param {string} agentId - Agent ID
   * @returns {boolean} True if agent can be introduced
   */
  canIntroduceAgent(userId, agentId) {
    try {
      const result = this.canIntroduceStmt.get(userId, userId, agentId);

      if (!result) {
        console.log(`❌ Agent not found: ${agentId}`);
        return false;
      }

      // Never introduce system agents to users
      if (result.visibility === 'system') {
        console.log(`🚫 Blocked system agent introduction: ${agentId}`);
        return false;
      }

      // Check if already exposed
      if (result.already_exposed) {
        console.log(`ℹ️ Agent already exposed: ${agentId}`);
        return false;
      }

      // Check engagement score
      if (result.user_score < result.min_engagement_score) {
        console.log(`⏳ Insufficient engagement for ${agentId}: ${result.user_score}/${result.min_engagement_score}`);
        return false;
      }

      console.log(`✅ Can introduce agent: ${agentId}`);
      return true;
    } catch (error) {
      console.error('Error checking if agent can be introduced:', error);
      return false;
    }
  }

  /**
   * Record agent introduction
   * @param {string} userId - User ID
   * @param {string} agentId - Agent ID
   * @param {string} introductionMethod - Method of introduction (welcome, milestone, manual, system)
   * @param {number} sessionNumber - Session number
   * @returns {Object} Result object
   */
  recordIntroduction(userId, agentId, introductionMethod, sessionNumber) {
    try {
      // Validate introduction_method
      const validMethods = ['welcome', 'milestone', 'manual', 'system'];
      if (!validMethods.includes(introductionMethod)) {
        throw new Error(`Invalid introduction_method: ${introductionMethod}. Must be one of: ${validMethods.join(', ')}`);
      }

      // Get agent's introduction phase
      const agentMetadata = this.db.prepare(`
        SELECT introduction_phase FROM agent_metadata WHERE agent_id = ?
      `).get(agentId);

      if (!agentMetadata) {
        throw new Error(`Agent not found: ${agentId}`);
      }

      const id = nanoid();
      this.recordIntroductionStmt.run(
        id,
        userId,
        agentId,
        introductionMethod,
        sessionNumber,
        agentMetadata.introduction_phase
      );

      console.log(`✅ Recorded introduction: ${agentId} to ${userId} (${introductionMethod}, session ${sessionNumber})`);

      return {
        success: true,
        id,
        userId,
        agentId,
        introductionMethod,
        sessionNumber
      };
    } catch (error) {
      console.error('Error recording introduction:', error);
      throw error;
    }
  }

  /**
   * Get agents user has been exposed to
   * @param {string} userId - User ID
   * @returns {Array<Object>} Array of exposure records
   */
  getExposedAgents(userId) {
    try {
      return this.getExposedAgentsStmt.all(userId);
    } catch (error) {
      console.error('Error getting exposed agents:', error);
      return [];
    }
  }

  /**
   * Get all agents, optionally including system agents
   * @param {Object} options - Options object
   * @param {boolean} options.includeSystem - Whether to include system agents
   * @returns {Array<Object>} Array of agents
   */
  getAllAgents(options = {}) {
    try {
      const { includeSystem = false } = options;

      const visibilities = includeSystem ? ['public', 'system'] : ['public', 'public'];
      return this.getAllAgentsStmt.all(...visibilities);
    } catch (error) {
      console.error('Error getting all agents:', error);
      return [];
    }
  }

  /**
   * Get introduction status for user
   * @param {string} userId - User ID
   * @returns {Object} Status object
   */
  getIntroductionStatus(userId) {
    try {
      const status = this.getIntroductionStatusStmt.get(userId);

      if (!status) {
        // New user with no engagement record
        return {
          currentPhase: 1,
          engagementScore: 0,
          exposedCount: 0,
          availableCount: 0,
          availableAgents: [],
          nextMilestone: {
            phase: 2,
            requiredScore: 10
          }
        };
      }

      const visibleAgents = this.getVisibleAgents(userId);

      // Determine current phase based on engagement score
      let currentPhase = 1;
      if (status.engagement_score >= 100) currentPhase = 5;
      else if (status.engagement_score >= 50) currentPhase = 4;
      else if (status.engagement_score >= 25) currentPhase = 3;
      else if (status.engagement_score >= 10) currentPhase = 2;

      // Calculate next milestone
      let nextMilestone = null;
      if (currentPhase < 5) {
        const thresholds = [0, 10, 25, 50, 100];
        nextMilestone = {
          phase: currentPhase + 1,
          requiredScore: thresholds[currentPhase]
        };
      }

      return {
        currentPhase,
        engagementScore: status.engagement_score,
        exposedCount: status.exposed_count,
        availableCount: visibleAgents.length,
        availableAgents: visibleAgents,
        nextMilestone
      };
    } catch (error) {
      console.error('Error getting introduction status:', error);
      return {
        currentPhase: 1,
        engagementScore: 0,
        exposedCount: 0,
        availableCount: 0,
        availableAgents: [],
        nextMilestone: null
      };
    }
  }

  /**
   * Update agent metadata from agent frontmatter
   * @param {Object} agentData - Parsed agent frontmatter
   * @returns {Object} Result object
   */
  updateAgentMetadata(agentData) {
    try {
      const {
        name, // agent slug
        displayName,
        description,
        visibility = 'public',
        introduction_phase = 1,
        introduction_priority = 'medium',
        min_engagement_score = 0,
        category,
        tags = []
      } = agentData;

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO agent_metadata (
          agent_id,
          agent_name,
          agent_description,
          visibility,
          introduction_phase,
          introduction_priority,
          min_engagement_score,
          category,
          tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        name,
        displayName || name,
        description || '',
        visibility,
        introduction_phase,
        introduction_priority,
        min_engagement_score,
        category || null,
        JSON.stringify(tags)
      );

      console.log(`✅ Updated agent metadata: ${name} (${visibility})`);

      return {
        success: true,
        agentId: name,
        visibility
      };
    } catch (error) {
      console.error('Error updating agent metadata:', error);
      throw error;
    }
  }
}

/**
 * Create and export service instance factory
 * @param {Database} db - better-sqlite3 database instance
 * @returns {AgentVisibilityService} Service instance
 */
export function createAgentVisibilityService(db) {
  return new AgentVisibilityService(db);
}

export default AgentVisibilityService;
