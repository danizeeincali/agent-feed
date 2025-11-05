/**
 * Agent Introduction Service
 * Manages agent introduction state and tracking
 * Implements Agent Self-Introduction System (FR-4)
 */

import { nanoid } from 'nanoid';
import { promises as fs } from 'fs';
import path from 'path';

export class AgentIntroductionService {
  constructor(database) {
    if (!database) {
      throw new Error('Database instance is required for AgentIntroductionService');
    }
    this.db = database;
    this.initializeStatements();
  }

  /**
   * Initialize prepared statements for performance
   */
  initializeStatements() {
    try {
      // Mark agent as introduced
      this.markIntroducedStmt = this.db.prepare(`
        INSERT OR IGNORE INTO agent_introductions (
          id,
          user_id,
          agent_id,
          introduced_at,
          post_id,
          interaction_count
        ) VALUES (?, ?, ?, ?, ?, 0)
      `);

      // Check if agent is introduced
      this.checkIntroducedStmt = this.db.prepare(`
        SELECT id, agent_id, introduced_at, post_id, interaction_count
        FROM agent_introductions
        WHERE user_id = ? AND agent_id = ?
      `);

      // Get all introduced agents for user
      this.getIntroducedStmt = this.db.prepare(`
        SELECT id, user_id, agent_id, introduced_at, post_id, interaction_count
        FROM agent_introductions
        WHERE user_id = ?
        ORDER BY introduced_at DESC
      `);

      // Increment interaction count
      this.incrementInteractionStmt = this.db.prepare(`
        UPDATE agent_introductions
        SET interaction_count = interaction_count + 1
        WHERE user_id = ? AND agent_id = ?
      `);

      console.log('✅ AgentIntroductionService prepared statements initialized');
    } catch (error) {
      console.error('❌ Error initializing AgentIntroductionService statements:', error);
      throw error;
    }
  }

  /**
   * Mark an agent as introduced to a user
   * @param {string} userId - User ID
   * @param {string} agentId - Agent ID
   * @param {string} postId - Introduction post ID
   * @returns {Object} Result object
   */
  markAgentIntroduced(userId, agentId, postId) {
    try {
      const id = nanoid();
      const timestamp = Math.floor(Date.now() / 1000);

      this.markIntroducedStmt.run(id, userId, agentId, timestamp, postId);

      console.log(`✅ Marked agent ${agentId} as introduced to user ${userId}`);

      return {
        success: true,
        id,
        userId,
        agentId,
        postId,
        introducedAt: timestamp
      };
    } catch (error) {
      console.error('Error marking agent as introduced:', error);
      throw error;
    }
  }

  /**
   * Check if an agent has been introduced to a user
   * @param {string} userId - User ID
   * @param {string} agentId - Agent ID
   * @returns {boolean} True if agent has been introduced
   */
  isAgentIntroduced(userId, agentId) {
    try {
      const result = this.checkIntroducedStmt.get(userId, agentId);
      return !!result;
    } catch (error) {
      console.error('Error checking if agent is introduced:', error);
      return false;
    }
  }

  /**
   * Get all agents introduced to a user
   * @param {string} userId - User ID
   * @returns {Array<Object>} Array of introduction records
   */
  getIntroducedAgents(userId) {
    try {
      return this.getIntroducedStmt.all(userId);
    } catch (error) {
      console.error('Error getting introduced agents:', error);
      return [];
    }
  }

  /**
   * Increment interaction count for an agent
   * @param {string} userId - User ID
   * @param {string} agentId - Agent ID
   * @returns {Object} Result object
   */
  incrementInteractionCount(userId, agentId) {
    try {
      const result = this.incrementInteractionStmt.run(userId, agentId);

      if (result.changes === 0) {
        console.warn(`No interaction count updated for ${agentId} and user ${userId}`);
      }

      return {
        success: result.changes > 0,
        userId,
        agentId
      };
    } catch (error) {
      console.error('Error incrementing interaction count:', error);
      throw error;
    }
  }

  /**
   * Get pending agent introductions based on phase completion and triggers
   * @param {string} userId - User ID
   * @param {boolean} phase1Completed - Whether Phase 1 is complete
   * @returns {Array<Object>} Array of agent configs that should be introduced
   */
  async getPendingIntroductions(userId, phase1Completed = false) {
    try {
      // Get already introduced agents
      const introduced = this.getIntroducedAgents(userId);
      const introducedIds = introduced.map(a => a.agent_id);

      // Load all agent configs
      const configDir = path.join(
        process.cwd(),
        'api-server/agents/configs/intro-templates'
      );

      const files = await fs.readdir(configDir);
      const jsonFiles = files.filter(f => f.endsWith('-intro.json'));

      const pending = [];

      for (const file of jsonFiles) {
        const configPath = path.join(configDir, file);
        const configData = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData);

        // Skip if already introduced
        if (introducedIds.includes(config.agentId)) {
          continue;
        }

        // Core agents should be introduced after Phase 1
        if (config.triggerRules?.immediate && phase1Completed) {
          pending.push(config);
        } else if (config.introducedAfterPhase === 1 && phase1Completed) {
          pending.push(config);
        }
      }

      return pending;
    } catch (error) {
      console.error('Error getting pending introductions:', error);
      return [];
    }
  }

  /**
   * Get agent introduction statistics
   * @param {string} userId - User ID
   * @returns {Object} Statistics object
   */
  getIntroductionStats(userId) {
    try {
      const introduced = this.getIntroducedAgents(userId);

      const totalInteractions = introduced.reduce(
        (sum, agent) => sum + agent.interaction_count,
        0
      );

      return {
        totalIntroduced: introduced.length,
        totalInteractions,
        mostInteractedAgent: introduced.sort(
          (a, b) => b.interaction_count - a.interaction_count
        )[0] || null
      };
    } catch (error) {
      console.error('Error getting introduction stats:', error);
      return {
        totalIntroduced: 0,
        totalInteractions: 0,
        mostInteractedAgent: null
      };
    }
  }

  /**
   * Introduce an agent by creating an introduction post
   * @param {string} userId - User ID
   * @param {string} agentId - Agent ID
   * @param {object} dbSelector - Database selector instance for post creation
   * @returns {Promise<Object>} Result with post ID
   */
  async introduceAgent(userId, agentId, dbSelector) {
    try {
      // 1. Check if agent already introduced
      if (this.isAgentIntroduced(userId, agentId)) {
        return {
          alreadyIntroduced: true,
          message: `Agent ${agentId} already introduced to user ${userId}`
        };
      }

      // 2. Load agent config from intro-templates
      // Remove '-agent' suffix if present for file lookup
      const agentNameForFile = agentId.replace(/-agent$/, '');
      const configPath = path.join(
        process.cwd(),
        'api-server/agents/configs/intro-templates',
        `${agentNameForFile}-intro.json`
      );

      let config;
      try {
        const configData = await fs.readFile(configPath, 'utf-8');
        config = JSON.parse(configData);
      } catch (error) {
        console.error(`❌ Error loading agent config for ${agentId}:`, error);
        throw new Error(`Agent configuration not found: ${agentId}`);
      }

      // 3. Generate introduction content
      const content = this._generateIntroContent(config);
      const title = `Hi! I'm ${config.displayName}`;

      // 4. Create introduction post in database
      const post = await dbSelector.createPost(userId, {
        author_agent: agentId,
        content: content,
        title: title,
        tags: ['AgentIntroduction', config.displayName],
        metadata: {
          isAgentIntroduction: true,
          agentId: agentId,
          isAgentResponse: true,
          introducedAt: Math.floor(Date.now() / 1000)
        }
      });

      // 5. Mark agent as introduced
      this.markAgentIntroduced(userId, agentId, post.id);

      console.log(`✅ Agent ${agentId} introduced successfully (post: ${post.id})`);

      return {
        success: true,
        postId: post.id,
        agentId: agentId,
        message: `Agent ${agentId} introduced successfully`
      };
    } catch (error) {
      console.error(`❌ Error introducing agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Check context and automatically introduce agents based on triggers
   * @param {string} userId - User ID
   * @param {object} context - Context object with trigger conditions
   * @param {object} dbSelector - Database selector instance
   * @returns {Promise<Array>} Array of introduction results
   */
  async checkAndIntroduceAgents(userId, context, dbSelector) {
    try {
      const agentsToIntroduce = [];

      // Check trigger conditions based on context
      if (context.containsURL || context.hasLink) {
        agentsToIntroduce.push('link-logger-agent');
      }

      if (context.mentionsMeeting || context.hasMeetingKeywords) {
        agentsToIntroduce.push('meeting-prep-agent');
      }

      if (context.mentionsTodos || context.hasTodoKeywords) {
        agentsToIntroduce.push('personal-todos-agent');
      }

      if (context.mentionsLearning || context.hasLearningKeywords) {
        agentsToIntroduce.push('learning-optimizer-agent');
      }

      if (context.mentionsFollowUp || context.hasFollowUpKeywords) {
        agentsToIntroduce.push('follow-ups-agent');
      }

      // Introduce triggered agents
      const results = [];
      for (const agentId of agentsToIntroduce) {
        try {
          const result = await this.introduceAgent(userId, agentId, dbSelector);
          results.push(result);
        } catch (error) {
          console.error(`Error introducing agent ${agentId}:`, error);
          results.push({
            success: false,
            agentId,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Error in checkAndIntroduceAgents:', error);
      throw error;
    }
  }

  /**
   * Generate introduction content from agent config
   * @private
   * @param {object} config - Agent configuration object
   * @returns {string} Formatted introduction content
   */
  _generateIntroContent(config) {
    const {
      displayName,
      description,
      capabilities = [],
      examples = [],
      cta = ''
    } = config;

    let content = `I'm ${displayName}. ${description}\n\n`;

    // Add capabilities section
    if (capabilities.length > 0) {
      content += '**I can help you with:**\n';
      capabilities.forEach(capability => {
        content += `- ${capability}\n`;
      });
      content += '\n';
    }

    // Add examples section
    if (examples.length > 0) {
      content += '**Examples:**\n';
      examples.forEach(example => {
        content += `- ${example}\n`;
      });
      content += '\n';
    }

    // Add call to action
    if (cta) {
      content += `${cta}`;
    }

    return content.trim();
  }
}

/**
 * Create and export service instance factory
 * @param {Database} db - better-sqlite3 database instance
 * @returns {AgentIntroductionService} Service instance
 */
export function createAgentIntroductionService(db) {
  return new AgentIntroductionService(db);
}

export default AgentIntroductionService;
