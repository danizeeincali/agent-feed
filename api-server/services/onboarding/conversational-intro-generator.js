/**
 * Conversational Intro Generator Service
 * Generates personalized, conversational introduction content for agents
 * Adapts messaging based on user context and preferences
 */

export class ConversationalIntroGenerator {
  constructor(database) {
    if (!database) {
      throw new Error('Database instance is required for ConversationalIntroGenerator');
    }
    this.db = database;
  }

  /**
   * Generate personalized introduction for an agent
   * @param {string} agentId - Agent ID
   * @param {Object} agentConfig - Agent configuration from intro-template
   * @param {Object} userContext - User context (name, use case, preferences)
   * @returns {Object} Generated introduction content
   */
  generateIntroduction(agentId, agentConfig, userContext = {}) {
    try {
      const userName = userContext.name || 'there';
      const useCase = userContext.use_case || 'general';
      const commStyle = userContext.comm_style || 'casual';

      // Generate personalized greeting
      const greeting = this.generateGreeting(agentConfig.displayName, userName, commStyle);

      // Generate contextual description
      const description = this.generateContextualDescription(
        agentConfig,
        useCase,
        commStyle
      );

      // Generate relevant examples
      const examples = this.selectRelevantExamples(agentConfig.examples, useCase);

      // Generate call-to-action
      const cta = this.generateCallToAction(agentConfig, userContext, commStyle);

      // Combine into full introduction
      const content = this.composeIntroduction({
        greeting,
        description,
        capabilities: agentConfig.capabilities,
        examples,
        cta
      });

      return {
        title: `Hi! I'm ${agentConfig.displayName}`,
        content,
        metadata: {
          isAgentIntroduction: true,
          agentId,
          personalizedFor: userContext.userId,
          communicationStyle: commStyle,
          useCase
        }
      };
    } catch (error) {
      console.error('❌ Error generating introduction:', error);
      throw error;
    }
  }

  /**
   * Generate personalized greeting
   * @private
   */
  generateGreeting(agentName, userName, commStyle) {
    const greetings = {
      formal: [
        `Hello ${userName}, I'm ${agentName}.`,
        `Good day ${userName}. I'm ${agentName}, and I'm here to assist you.`,
        `Greetings ${userName}. My name is ${agentName}.`
      ],
      casual: [
        `Hey ${userName}! 👋 I'm ${agentName}.`,
        `Hi ${userName}! I'm ${agentName}, and I'm excited to help you out!`,
        `Hello ${userName}! I'm ${agentName} - nice to meet you!`
      ],
      adaptive: [
        `Hi ${userName}, I'm ${agentName}.`,
        `Hello ${userName}! I'm ${agentName}.`,
        `Hey ${userName}, I'm ${agentName}.`
      ]
    };

    const styleGreetings = greetings[commStyle] || greetings.casual;
    return styleGreetings[Math.floor(Math.random() * styleGreetings.length)];
  }

  /**
   * Generate contextual description based on use case
   * @private
   */
  generateContextualDescription(agentConfig, useCase, commStyle) {
    const baseDescription = agentConfig.description;

    // Add use-case specific context
    const contextualAddons = {
      business: {
        'personal-todos-agent': ' Perfect for managing your strategic initiatives and business priorities.',
        'meeting-prep-agent': ' Essential for staying prepared and professional in business meetings.',
        'link-logger-agent': ' Great for tracking competitive intelligence and market research.'
      },
      learning: {
        'learning-optimizer-agent': ' Designed specifically to accelerate your learning journey.',
        'link-logger-agent': ' Perfect for organizing learning resources and study materials.',
        'personal-todos-agent': ' Helps you stay on track with your learning goals and progress.'
      },
      creative_projects: {
        'agent-ideas-agent': ' Your creative companion for capturing inspiration and brainstorming.',
        'page-builder-agent': ' Brings your creative vision to life with beautiful layouts.',
        'personal-todos-agent': ' Keeps your creative projects organized and on schedule.'
      },
      personal_productivity: {
        'personal-todos-agent': ' Your go-to tool for staying organized and productive.',
        'agent-ideas-agent': ' Captures your thoughts and turns them into actionable plans.',
        'follow-ups-agent': ' Ensures nothing falls through the cracks.'
      }
    };

    const addon = contextualAddons[useCase]?.[agentConfig.agentId] || '';
    return baseDescription + addon;
  }

  /**
   * Select relevant examples based on use case
   * @private
   */
  selectRelevantExamples(allExamples, useCase) {
    // For now, return all examples
    // Could be enhanced to filter based on use case
    return allExamples.slice(0, 3); // Show top 3 examples
  }

  /**
   * Generate personalized call-to-action
   * @private
   */
  generateCallToAction(agentConfig, userContext, commStyle) {
    const userName = userContext.name || 'you';
    const baseCta = agentConfig.cta;

    // Add personality based on communication style
    if (commStyle === 'formal') {
      return `${baseCta} I look forward to working with you, ${userName}.`;
    } else if (commStyle === 'casual') {
      return `${baseCta} Can't wait to get started, ${userName}! 🚀`;
    }

    return baseCta;
  }

  /**
   * Compose full introduction content
   * @private
   */
  composeIntroduction({ greeting, description, capabilities, examples, cta }) {
    let content = `${greeting}\n\n${description}\n\n`;

    // Add capabilities section
    if (capabilities && capabilities.length > 0) {
      content += '**Here\'s what I can help you with:**\n';
      capabilities.slice(0, 4).forEach(capability => {
        content += `• ${capability}\n`;
      });
      content += '\n';
    }

    // Add examples section
    if (examples && examples.length > 0) {
      content += '**Try things like:**\n';
      examples.forEach(example => {
        content += `• ${example}\n`;
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
   * Generate educational context for agent introduction
   * Explains why this agent is being introduced now
   * @param {string} agentId - Agent ID
   * @param {Object} userContext - User context
   * @returns {string} Educational explanation
   */
  generateEducationalContext(agentId, userContext) {
    const explanations = {
      'personal-todos-agent': `I'm introducing myself now because you've completed the initial setup. I'm one of your core agents and I'll help you stay organized from day one.`,

      'agent-ideas-agent': `I'm here to make sure your ideas never get lost. As you use Agent Feed, I'll capture your thoughts and help you turn them into reality.`,

      'link-logger-agent': `You'll come across lots of useful links as you work. I'm here to help you save and organize them efficiently.`,

      'meeting-prep-agent': `I noticed you're using Agent Feed for business. I'm here to help you prepare for meetings and follow up effectively.`,

      'learning-optimizer-agent': `Since you're focused on learning, I'm here to help you organize resources and track your progress.`,

      'page-builder-agent': `As you get more comfortable with Agent Feed, I can help you create beautiful custom pages for your content.`,

      'follow-ups-agent': `I help ensure nothing gets forgotten. I'll remind you about important follow-ups and tasks.`
    };

    return explanations[agentId] || `I'm here to add value to your Agent Feed experience based on your needs.`;
  }

  /**
   * Generate sequence explanation
   * Explains the sequential introduction approach to users
   * @param {number} agentsIntroduced - Number of agents already introduced
   * @param {number} agentsRemaining - Number of agents remaining
   * @returns {string} Explanation text
   */
  generateSequenceExplanation(agentsIntroduced, agentsRemaining) {
    if (agentsIntroduced === 0) {
      return `I'm introducing agents gradually so you can learn each one without feeling overwhelmed. More agents will introduce themselves as you explore the platform.`;
    }

    if (agentsRemaining > 0) {
      return `You've met ${agentsIntroduced} agents so far. ${agentsRemaining} more will introduce themselves as you continue using Agent Feed.`;
    }

    return `You've now met all your core agents! They're here whenever you need them.`;
  }

  /**
   * Generate timing explanation
   * Explains why an agent is introducing itself at this moment
   * @param {string} reason - Trigger reason
   * @returns {string} Timing explanation
   */
  generateTimingExplanation(reason) {
    const explanations = {
      'engagement_high': `You've been actively using Agent Feed, so I thought this would be a good time to introduce myself!`,
      'contextual_trigger': `I noticed your recent activity and thought I could help with that.`,
      'scheduled': `It's been a while since your last agent introduction, and I'm next in line to meet you.`,
      'phase_completion': `Now that you've completed the initial onboarding, I'd like to introduce myself.`,
      'manual': `You're ready to meet more agents, so here I am!`
    };

    return explanations[reason] || `I'm here to help enhance your Agent Feed experience.`;
  }

  /**
   * Get user preferences from database
   * @param {string} userId - User ID
   * @returns {Object} User preferences
   */
  getUserPreferences(userId) {
    try {
      const userSettings = this.db.prepare(`
        SELECT display_name, profile_json
        FROM user_settings
        WHERE user_id = ?
      `).get(userId);

      if (!userSettings) {
        return {
          name: null,
          comm_style: 'casual',
          preferences: {}
        };
      }

      const profile = userSettings.profile_json
        ? JSON.parse(userSettings.profile_json)
        : {};

      return {
        name: userSettings.display_name || profile.preferred_name,
        comm_style: profile.comm_style || 'casual',
        preferences: profile
      };
    } catch (error) {
      console.error('❌ Error getting user preferences:', error);
      return {
        name: null,
        comm_style: 'casual',
        preferences: {}
      };
    }
  }

  /**
   * Generate introduction with full context
   * @param {string} agentId - Agent ID
   * @param {Object} agentConfig - Agent configuration
   * @param {string} userId - User ID
   * @param {Object} triggerContext - Context for why agent is being introduced
   * @returns {Object} Complete introduction package
   */
  generateFullIntroduction(agentId, agentConfig, userId, triggerContext = {}) {
    try {
      // Get user preferences
      const userPrefs = this.getUserPreferences(userId);

      // Get onboarding state
      const onboardingState = this.db.prepare(`
        SELECT responses FROM onboarding_state WHERE user_id = ?
      `).get(userId);

      const responses = onboardingState?.responses
        ? JSON.parse(onboardingState.responses)
        : {};

      // Build user context
      const userContext = {
        userId,
        name: userPrefs.name || responses.name,
        use_case: responses.use_case,
        comm_style: userPrefs.comm_style,
        ...userPrefs.preferences
      };

      // Generate main introduction
      const intro = this.generateIntroduction(agentId, agentConfig, userContext);

      // Add educational context
      const educationalContext = this.generateEducationalContext(agentId, userContext);

      // Add timing explanation if provided
      let timingNote = '';
      if (triggerContext.reason) {
        timingNote = this.generateTimingExplanation(triggerContext.reason);
      }

      // Combine everything
      let finalContent = intro.content;

      if (timingNote) {
        finalContent = `${timingNote}\n\n${finalContent}`;
      }

      if (educationalContext) {
        finalContent += `\n\n---\n\n${educationalContext}`;
      }

      return {
        ...intro,
        content: finalContent,
        educationalContext,
        timingNote
      };
    } catch (error) {
      console.error('❌ Error generating full introduction:', error);
      throw error;
    }
  }
}

/**
 * Create and export service instance factory
 * @param {Database} db - better-sqlite3 database instance
 * @returns {ConversationalIntroGenerator} Service instance
 */
export function createConversationalIntroGenerator(db) {
  return new ConversationalIntroGenerator(db);
}

export default ConversationalIntroGenerator;
