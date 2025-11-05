/**
 * Agent Content Generator
 * Generates introduction post content for agents
 * Implements content generation for agent self-introductions
 */

import { nanoid } from 'nanoid';

export class AgentContentGenerator {
  /**
   * Generate introduction content from agent configuration
   * @param {Object} agentConfig - Agent configuration object
   * @returns {string} Markdown-formatted introduction content
   */
  generateIntroContent(agentConfig) {
    const {
      displayName,
      description,
      capabilities = [],
      examples = [],
      cta = ''
    } = agentConfig;

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

  /**
   * Generate complete introduction post data
   * @param {Object} agentConfig - Agent configuration object
   * @param {string} userId - User ID for post author
   * @returns {Object} Post data object ready for database insertion
   */
  generateIntroPost(agentConfig, userId) {
    const { agentId, displayName } = agentConfig;

    const title = `Hi! I'm ${displayName}`;
    const content = this.generateIntroContent(agentConfig);

    return {
      id: nanoid(),
      title,
      content,
      authorId: userId,
      isAgentResponse: true,
      agentId,
      agent: {
        name: agentId,
        displayName
      },
      metadata: {
        isIntroduction: true,
        introducedAt: Math.floor(Date.now() / 1000)
      },
      createdAt: Math.floor(Date.now() / 1000)
    };
  }

  /**
   * Generate welcome message for agent feed
   * @param {Array<Object>} introducedAgents - Array of agent configs
   * @returns {string} Welcome message content
   */
  generateWelcomeMessage(introducedAgents) {
    if (!introducedAgents || introducedAgents.length === 0) {
      return 'Welcome to Agent Feed! Your agents will introduce themselves soon.';
    }

    const agentNames = introducedAgents
      .map(a => a.displayName)
      .join(', ')
      .replace(/, ([^,]*)$/, ', and $1');

    return `Great! You've met ${agentNames}. They're ready to help you achieve your goals.`;
  }

  /**
   * Generate contextual introduction trigger message
   * @param {string} agentId - Agent identifier
   * @param {string} triggerContext - Context that triggered the introduction
   * @returns {string} Contextual message
   */
  generateContextualTrigger(agentId, triggerContext) {
    const messages = {
      'link-logger-agent': 'I noticed you shared a link! Let me help you organize your resources.',
      'meeting-prep-agent': 'I see you mentioned a meeting! I can help you prepare.',
      'personal-todos-agent': 'I noticed you mentioned tasks! Let me help you stay organized.',
      'follow-ups-agent': 'Great job completing that! Let me help track your follow-ups.',
      'learning-optimizer-agent': 'I see you\'re interested in learning! Let me optimize your learning path.',
      'page-builder-agent': 'I can help you create beautiful pages for your content!'
    };

    return messages[agentId] || 'I noticed your activity and wanted to introduce myself!';
  }

  /**
   * Format agent capabilities for display
   * @param {Array<string>} capabilities - Array of capability strings
   * @returns {string} Formatted capabilities text
   */
  formatCapabilities(capabilities) {
    if (!capabilities || capabilities.length === 0) {
      return 'Various capabilities to help you succeed';
    }

    return capabilities
      .map((cap, index) => `${index + 1}. ${cap}`)
      .join('\n');
  }

  /**
   * Generate short introduction for agent card/preview
   * @param {Object} agentConfig - Agent configuration object
   * @returns {string} Short introduction text
   */
  generateShortIntro(agentConfig) {
    const { displayName, description } = agentConfig;
    return `${displayName} - ${description}`;
  }
}

/**
 * Create singleton instance
 */
let instance = null;

export function createAgentContentGenerator() {
  if (!instance) {
    instance = new AgentContentGenerator();
  }
  return instance;
}

export default AgentContentGenerator;
