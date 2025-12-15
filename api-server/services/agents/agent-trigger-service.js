/**
 * Agent Trigger Service
 * Detects contextual triggers in user content to introduce relevant agents
 * Implements contextual agent introduction strategy (Decision 9)
 */

import { promises as fs } from 'fs';
import path from 'path';

export class AgentTriggerService {
  constructor() {
    this.configCache = new Map();
  }

  /**
   * Load agent configuration from intro templates
   * @param {string} agentId - Agent identifier
   * @returns {Promise<Object>} Agent configuration
   */
  async loadAgentConfig(agentId) {
    if (this.configCache.has(agentId)) {
      return this.configCache.get(agentId);
    }

    const configPath = path.join(
      process.cwd(),
      'api-server/agents/configs/intro-templates',
      `${agentId}-intro.json`
    );

    try {
      const configData = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);
      this.configCache.set(agentId, config);
      return config;
    } catch (error) {
      console.error(`Error loading agent config for ${agentId}:`, error);
      return null;
    }
  }

  /**
   * Load all agent configurations
   * @returns {Promise<Array>} Array of agent configurations
   */
  async loadAllAgentConfigs() {
    const configDir = path.join(
      process.cwd(),
      'api-server/agents/configs/intro-templates'
    );

    try {
      const files = await fs.readdir(configDir);
      const jsonFiles = files.filter(f => f.endsWith('-intro.json'));

      const configs = await Promise.all(
        jsonFiles.map(async (file) => {
          const agentId = file.replace('-intro.json', '');
          return await this.loadAgentConfig(agentId);
        })
      );

      return configs.filter(c => c !== null);
    } catch (error) {
      console.error('Error loading agent configs:', error);
      return [];
    }
  }

  /**
   * Detect contextual triggers in content
   * @param {string} content - User post content
   * @param {Object} options - Additional context
   * @returns {Array<string>} Array of triggered agent IDs
   */
  detectTriggers(content, options = {}) {
    if (!content || typeof content !== 'string') {
      return [];
    }

    const triggers = [];
    const lowerContent = content.toLowerCase();

    // URL detection - Link Logger
    if (this.containsUrl(content)) {
      triggers.push('link-logger-agent');
    }

    // Meeting keywords - Meeting Prep
    const meetingKeywords = ['meeting', 'agenda', '1-on-1', 'call', 'sync', 'standup', 'retrospective'];
    if (meetingKeywords.some(keyword => lowerContent.includes(keyword))) {
      triggers.push('meeting-prep-agent');
    }

    // Task/Todo keywords - Personal Todos
    const todoKeywords = ['task', 'todo', 'priority', 'deadline', 'complete', 'finish'];
    if (todoKeywords.some(keyword => lowerContent.includes(keyword))) {
      triggers.push('personal-todos-agent');
    }

    // Learning keywords - Learning Optimizer
    const learningKeywords = ['learn', 'study', 'course', 'tutorial', 'skill', 'knowledge', 'training'];
    if (learningKeywords.some(keyword => lowerContent.includes(keyword))) {
      triggers.push('learning-optimizer-agent');
    }

    // Completion keywords - Follow-ups
    const completionKeywords = ['finished', 'completed', 'done', 'accomplished'];
    if (completionKeywords.some(keyword => lowerContent.includes(keyword))) {
      triggers.push('follow-ups-agent');
    }

    // Page/Layout keywords - Page Builder
    const pageKeywords = ['page', 'dashboard', 'layout', 'template', 'design', 'create post'];
    if (pageKeywords.some(keyword => lowerContent.includes(keyword))) {
      triggers.push('page-builder-agent');
    }

    // Feedback keywords - Agent Feedback
    const feedbackKeywords = ['feedback', 'suggestion', 'improve', 'issue', 'problem', 'bug', 'feature request'];
    if (feedbackKeywords.some(keyword => lowerContent.includes(keyword))) {
      triggers.push('agent-feedback-agent');
    }

    // Remove duplicates
    return [...new Set(triggers)];
  }

  /**
   * Check if content contains URLs
   * @param {string} content - Text content to check
   * @returns {boolean} True if URLs are present
   */
  containsUrl(content) {
    const urlPattern = /https?:\/\/[^\s]+/gi;
    return urlPattern.test(content);
  }

  /**
   * Get agents that should be introduced immediately after Phase 1
   * @returns {Array<string>} Array of core agent IDs
   */
  getCoreAgents() {
    return [
      'personal-todos-agent',
      'agent-ideas-agent',
      'link-logger-agent'
    ];
  }

  /**
   * Determine if an agent should be introduced based on user phase
   * @param {string} agentId - Agent identifier
   * @param {boolean} phase1Completed - Whether Phase 1 is complete
   * @returns {boolean} True if agent should be introduced
   */
  shouldIntroduceAgent(agentId, phase1Completed) {
    const coreAgents = this.getCoreAgents();

    // Core agents introduce after Phase 1
    if (coreAgents.includes(agentId)) {
      return phase1Completed;
    }

    // Other agents introduce contextually (always eligible)
    return true;
  }

  /**
   * Filter triggers based on already introduced agents
   * @param {Array<string>} triggers - Detected triggers
   * @param {Array<string>} introducedAgentIds - Already introduced agent IDs
   * @returns {Array<string>} Filtered triggers
   */
  filterIntroducedAgents(triggers, introducedAgentIds) {
    return triggers.filter(agentId => !introducedAgentIds.includes(agentId));
  }
}

/**
 * Create singleton instance
 */
let instance = null;

export function createAgentTriggerService() {
  if (!instance) {
    instance = new AgentTriggerService();
  }
  return instance;
}

export default AgentTriggerService;
