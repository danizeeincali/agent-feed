/**
 * Onboarding Flow Service
 * Manages phase transitions and onboarding flow logic
 * Implements Section 2.2 - Onboarding Flow from SPARC spec
 */

import { nanoid } from 'nanoid';
import { createUserSettingsService } from '../user-settings-service.js';

/**
 * Onboarding Flow Service Class
 * Manages transitions between Phase 1 (name + use case) and Phase 2 (deeper personalization)
 */
class OnboardingFlowService {
  constructor(database, userSettingsService = null) {
    if (!database) {
      throw new Error('Database instance is required for OnboardingFlowService');
    }
    this.db = database;
    this.userSettingsService = userSettingsService || createUserSettingsService(database);
    this.initializeStatements();
  }

  /**
   * Initialize prepared statements
   */
  initializeStatements() {
    try {
      // Get onboarding state
      this.getStateStmt = this.db.prepare(`
        SELECT
          user_id,
          phase,
          step,
          phase1_completed,
          phase1_completed_at,
          phase2_completed,
          phase2_completed_at,
          responses,
          created_at,
          updated_at
        FROM onboarding_state
        WHERE user_id = ?
      `);

      // Create onboarding state
      this.createStateStmt = this.db.prepare(`
        INSERT INTO onboarding_state (
          user_id,
          phase,
          step,
          phase1_completed,
          phase2_completed,
          responses,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
      `);

      // Update onboarding state
      this.updateStateStmt = this.db.prepare(`
        UPDATE onboarding_state
        SET
          phase = COALESCE(?, phase),
          step = COALESCE(?, step),
          phase1_completed = COALESCE(?, phase1_completed),
          phase1_completed_at = COALESCE(?, phase1_completed_at),
          phase2_completed = COALESCE(?, phase2_completed),
          phase2_completed_at = COALESCE(?, phase2_completed_at),
          responses = COALESCE(?, responses),
          updated_at = unixepoch()
        WHERE user_id = ?
      `);

      console.log('✅ OnboardingFlowService prepared statements initialized');
    } catch (error) {
      console.error('❌ Error initializing OnboardingFlowService statements:', error);
      throw error;
    }
  }

  /**
   * Get current onboarding state for user
   * @param {string} userId - User ID
   * @returns {Object|null} Onboarding state or null
   */
  getOnboardingState(userId = 'demo-user-123') {
    try {
      const state = this.getStateStmt.get(userId);

      if (!state) {
        return null;
      }

      return {
        ...state,
        responses: state.responses ? JSON.parse(state.responses) : {}
      };
    } catch (error) {
      console.error('Error getting onboarding state:', error);
      throw error;
    }
  }

  /**
   * Get responses from onboarding state
   * Helper method for accessing user responses
   * @param {string} userId - User ID
   * @returns {Object} Responses object (may be empty)
   */
  getResponses(userId) {
    try {
      const state = this.getOnboardingState(userId);
      return state ? state.responses : {};
    } catch (error) {
      console.error('Error getting responses:', error);
      return {};
    }
  }

  /**
   * Update responses in onboarding state
   * Helper method for updating user responses
   * @param {string} userId - User ID
   * @param {Object} responses - Updated responses object
   */
  updateResponses(userId, responses) {
    try {
      this.updateStateStmt.run(
        null, // phase (keep existing)
        null, // step (keep existing)
        null, // phase1_completed
        null, // phase1_completed_at
        null, // phase2_completed
        null, // phase2_completed_at
        JSON.stringify(responses),
        userId
      );
    } catch (error) {
      console.error('Error updating responses:', error);
      throw error;
    }
  }

  /**
   * Update onboarding state fields
   * Helper method for updating state transitions
   * @param {string} userId - User ID
   * @param {Object} updates - Fields to update
   */
  updateState(userId, updates) {
    try {
      this.updateStateStmt.run(
        updates.phase || null,
        updates.step || null,
        updates.phase1_completed !== undefined ? updates.phase1_completed : null,
        updates.phase1_completed_at || null,
        updates.phase2_completed !== undefined ? updates.phase2_completed : null,
        updates.phase2_completed_at || null,
        updates.responses ? JSON.stringify(updates.responses) : null,
        userId
      );
    } catch (error) {
      console.error('Error updating state:', error);
      throw error;
    }
  }

  /**
   * Initialize onboarding for new user
   * @param {string} userId - User ID
   * @returns {Object} Initial onboarding state
   */
  initializeOnboarding(userId = 'demo-user-123') {
    try {
      // Check if state already exists
      const existingState = this.getOnboardingState(userId);
      if (existingState) {
        return existingState;
      }

      // Create initial state - Phase 1, Step: name
      this.createStateStmt.run(
        userId,
        1, // phase
        'name', // step
        0, // phase1_completed
        0, // phase2_completed
        '{}' // responses
      );

      return this.getOnboardingState(userId);
    } catch (error) {
      console.error('Error initializing onboarding:', error);
      throw error;
    }
  }

  /**
   * Validate name input
   * @param {string} name - Name to validate
   * @returns {Object} Validation result { valid: boolean, error?: string, sanitized?: string }
   */
  validateName(name) {
    // Check for null/undefined
    if (!name) {
      return { valid: false, error: 'Name is required' };
    }

    // Trim and check length
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Name cannot be empty' };
    }

    if (trimmed.length > 50) {
      return { valid: false, error: 'Name must be 50 characters or less' };
    }

    // SECURITY FIX: Proper HTML entity escaping to prevent XSS attacks
    // This escapes all HTML entities including event handlers, JavaScript URLs,
    // SVG-based XSS, and Unicode obfuscation attempts
    const sanitized = trimmed
      .replace(/&/g, '&amp;')   // Escape ampersands first
      .replace(/</g, '&lt;')    // Escape less-than
      .replace(/>/g, '&gt;')    // Escape greater-than
      .replace(/"/g, '&quot;')  // Escape double quotes
      .replace(/'/g, '&#x27;')  // Escape single quotes
      .replace(/\//g, '&#x2F;'); // Escape forward slashes

    return { valid: true, sanitized };
  }

  /**
   * Process Phase 1 - Name collection
   * @param {string} userId - User ID
   * @param {string} name - User's preferred name
   * @returns {Object} Next step information
   */
  processNameResponse(userId, name) {
    try {
      // Validate name
      const validation = this.validateName(name);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          nextStep: 'name' // Stay on name step
        };
      }

      const validatedName = validation.sanitized;
      const state = this.getOnboardingState(userId) || this.initializeOnboarding(userId);
      const responses = state.responses || {};

      // Store name in responses
      responses.name = validatedName;

      // CRITICAL FIX: Persist display name to user_settings table
      // This ensures name appears system-wide (header, posts, comments)
      try {
        this.userSettingsService.setDisplayName(userId, validatedName);
        console.log(`✅ Display name persisted to user_settings: "${validatedName}" for user ${userId}`);
      } catch (displayNameError) {
        console.error('❌ Failed to persist display name to user_settings:', displayNameError);
        // Don't fail the entire onboarding if display name save fails
        // But log it prominently for debugging
        console.error('⚠️ Onboarding will continue but name may not display system-wide');
      }

      // Update state to next step: use_case
      this.updateStateStmt.run(
        1, // phase (still Phase 1)
        'use_case', // step
        null, // phase1_completed
        null, // phase1_completed_at
        null, // phase2_completed
        null, // phase2_completed_at
        JSON.stringify(responses),
        userId
      );

      return {
        success: true,
        nextStep: 'use_case',
        phase: 1,
        message: `Great to meet you, ${validatedName}! What brings you to Agent Feed?`,
        educationalContext: `I'm your Get-to-Know-You Agent, and I help Λvi personalize your experience.`
      };
    } catch (error) {
      console.error('Error processing name response:', error);
      throw error;
    }
  }

  /**
   * Process Phase 1 - Use case collection
   * @param {string} userId - User ID
   * @param {string} useCase - User's primary use case
   * @returns {Object} Phase 1 completion information
   */
  async processUseCaseResponse(userId, useCase) {
    try {
      const state = this.getOnboardingState(userId);
      if (!state) {
        throw new Error('Onboarding state not found. Please start with name collection.');
      }

      const responses = state.responses || {};
      responses.use_case = useCase;

      const timestamp = Math.floor(Date.now() / 1000);

      // Complete Phase 1
      this.updateStateStmt.run(
        1, // phase (still Phase 1, but completed)
        'phase1_complete', // step
        1, // phase1_completed
        timestamp, // phase1_completed_at
        null, // phase2_completed
        null, // phase2_completed_at
        JSON.stringify(responses),
        userId
      );

      // ✅ NEW: Trigger Avi welcome since Phase 1 is complete
      const aviTrigger = await this.triggerAviWelcome(userId);

      // Generate personalized explanation based on use case
      const explanation = this.generateUseCaseExplanation(useCase, responses.name);

      return {
        success: true,
        phase1Complete: true,
        message: explanation,
        nextSteps: [
          'Core agents (Personal Todos, Agent Ideas, Link Logger) will introduce themselves',
          'You can start creating posts and interacting with agents',
          `I'll check back later to learn more about your goals and preferences, ${responses.name}!`
        ],
        triggerCoreAgentIntros: true,
        aviWelcome: aviTrigger // Include Avi welcome trigger result
      };
    } catch (error) {
      console.error('Error processing use case response:', error);
      throw error;
    }
  }

  /**
   * Check if Phase 1 is complete for a user
   * Phase 1 requires both name AND use_case to be collected
   * @param {string} userId - User ID
   * @returns {boolean} True if Phase 1 is complete
   */
  isPhase1Complete(userId) {
    try {
      const state = this.getOnboardingState(userId);
      if (!state) {
        return false;
      }

      const responses = state.responses || {};

      // Phase 1 complete when both name AND use_case collected
      return (
        responses.name &&
        responses.use_case &&
        state.phase >= 1
      );
    } catch (error) {
      console.error('Error checking Phase 1 completion:', error);
      return false;
    }
  }

  /**
   * Generate personalized explanation based on use case
   * Decision 4: Educate along the way through conversational responses
   * @private
   */
  generateUseCaseExplanation(useCase, name) {
    const explanations = {
      'personal_productivity': `Perfect! Based on that, here's how your agents will help:

**Personal Todos Agent** will help you organize and prioritize your tasks with smart reminders.
**Agent Ideas** will capture your thoughts and turn them into actionable projects.
**Link Logger** will help you save and organize resources you discover.

You're all set to start, ${name}!`,

      'business': `Excellent! Based on that, here's how your agents will help:

**Personal Todos Agent** will manage your strategic initiatives and business priorities.
**Meeting Prep** and **Meeting Next Steps** agents will help you prepare for and follow up on important meetings.
**Link Logger** will track competitive intelligence and market research.

You're all set to start, ${name}!`,

      'creative_projects': `Wonderful! Based on that, here's how your agents will help:

**Agent Ideas** will be your creative companion, capturing inspiration and brainstorming.
**Personal Todos Agent** will help you manage project timelines and milestones.
**Link Logger** will organize reference materials and inspiration sources.

You're all set to start, ${name}!`,

      'learning': `Great choice! Based on that, here's how your agents will help:

**Link Logger** will help you organize learning resources and articles.
**Personal Todos Agent** will track your learning goals and progress.
**Agent Ideas** will help you reflect on what you're learning and apply insights.

You're all set to start, ${name}!`,

      'other': `Thanks for sharing! Based on your interests, here's how your agents will help:

**Personal Todos Agent** will help you stay organized and prioritize what matters.
**Agent Ideas** will capture your thoughts and turn them into action.
**Link Logger** will help you save and organize useful resources.

You're all set to start, ${name}!`
    };

    return explanations[useCase] || explanations['other'];
  }

  /**
   * Trigger Phase 2 onboarding
   * @param {string} userId - User ID
   * @returns {Object} Phase 2 initialization
   */
  triggerPhase2(userId) {
    try {
      const state = this.getOnboardingState(userId);

      if (!state) {
        throw new Error('User has not completed Phase 1');
      }

      if (state.phase1_completed !== 1) {
        throw new Error('Phase 1 must be completed before starting Phase 2');
      }

      if (state.phase2_completed === 1) {
        return {
          success: false,
          message: 'Phase 2 already completed',
          alreadyCompleted: true
        };
      }

      // Update to Phase 2
      this.updateStateStmt.run(
        2, // phase
        'comm_style', // step
        null, // phase1_completed (keep existing)
        null, // phase1_completed_at (keep existing)
        null, // phase2_completed
        null, // phase2_completed_at
        null, // responses (keep existing)
        userId
      );

      const name = state.responses?.name || 'there';

      return {
        success: true,
        phase: 2,
        step: 'comm_style',
        message: `Welcome back, ${name}! Let's personalize your experience even more. How do you prefer your agents to communicate?`,
        options: ['Formal & Professional', 'Casual & Friendly', 'Adaptive (context-based)']
      };
    } catch (error) {
      console.error('Error triggering Phase 2:', error);
      throw error;
    }
  }

  /**
   * Check if user should be prompted for Phase 2
   * Based on: 2-3 posts created OR 24 hours elapsed
   * @param {string} userId - User ID
   * @returns {boolean} True if Phase 2 should be triggered
   */
  shouldTriggerPhase2(userId) {
    try {
      const state = this.getOnboardingState(userId);

      if (!state || state.phase1_completed !== 1 || state.phase2_completed === 1) {
        return false;
      }

      // Check time elapsed (24 hours)
      const currentTime = Math.floor(Date.now() / 1000);
      const hoursSincePhase1 = (currentTime - state.phase1_completed_at) / 3600;

      if (hoursSincePhase1 >= 24) {
        return true;
      }

      // Check post count (2-3 posts) - would need to query posts table
      // For now, return false - will be implemented when integrated with posts service
      return false;
    } catch (error) {
      console.error('Error checking Phase 2 trigger:', error);
      return false;
    }
  }

  /**
   * Trigger Avi welcome post after Phase 1 completion
   * Creates warm, conversational welcome post (NO technical jargon)
   * FR-3: Avi Welcome Post Generation from spec
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Result with success, userName, postCreated
   */
  async triggerAviWelcome(userId) {
    try {
      const state = this.getOnboardingState(userId);
      if (!state) {
        throw new Error('Onboarding state not found');
      }

      const responses = state.responses || {};
      const userName = responses.name || 'there';

      // Check if Phase 1 is complete
      if (state.phase1_completed !== 1) {
        return {
          success: false,
          error: 'Phase 1 not complete yet',
          userName
        };
      }

      // Check if Avi welcome already exists (prevent duplicates)
      const existingWelcome = this.db.prepare(`
        SELECT id FROM agent_posts
        WHERE author_agent = 'avi'
          AND author_id = ?
          AND json_extract(metadata, '$.isOnboardingPost') = 1
          AND json_extract(metadata, '$.aviWelcomePost') = 1
      `).get(userId);

      if (existingWelcome) {
        console.log(`✅ Avi welcome already exists for user ${userId}`);
        return {
          success: true,
          alreadyExists: true,
          userName
        };
      }

      // Create warm, conversational Avi welcome post
      const postId = `post-avi-welcome-${nanoid(10)}`;
      const timestamp = Math.floor(Date.now() / 1000);

      // ✅ WARM, CONVERSATIONAL CONTENT (NO TECHNICAL JARGON)
      const content = `# Welcome to Agent Feed, ${userName}! 🎉

Great to have you here! I'm **Λvi** (pronounced "Avi"), your AI partner who helps coordinate your agent team.

Now that you're all set up, I'm excited to help you stay organized and get things done!

## What would you like to work on first?

Whether you want to:
- 📝 Track tasks and stay organized
- 💡 Explore ideas and plan projects
- 🔗 Save important links and resources
- 🤝 Get help with meetings and follow-ups
- ✨ Or something else entirely!

Just let me know what's on your mind, and I'll help make it happen. Looking forward to working together! 🚀

**— Λvi**`;

      // Validate NO technical jargon
      const technicalTerms = ['code', 'debug', 'architecture', 'implementation', 'development', 'system', 'technical', 'API', 'database'];
      const lowerContent = content.toLowerCase();
      const foundJargon = technicalTerms.filter(term => lowerContent.includes(term));

      if (foundJargon.length > 0) {
        throw new Error(`Avi welcome contains technical jargon: ${foundJargon.join(', ')}`);
      }

      // Create post
      this.db.prepare(`
        INSERT INTO agent_posts (
          id, title, content, author_agent, author_id,
          published_at, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        postId,
        `Welcome to Agent Feed, ${userName}!`,
        content,
        'avi',
        userId,
        timestamp,
        JSON.stringify({
          isOnboardingPost: true,
          onboardingPhase: 'welcome',
          aviWelcomePost: true,
          userId: userId
        }),
        timestamp
      );

      console.log(`🎉 Avi welcome post created for ${userName} (user: ${userId})`);

      return {
        success: true,
        postCreated: true,
        postId,
        userName
      };
    } catch (error) {
      console.error('❌ Failed to create Avi welcome post:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * Create and export service instance factory
 * @param {Database} db - better-sqlite3 database instance
 * @returns {OnboardingFlowService} Service instance
 */
export function createOnboardingFlowService(db) {
  return new OnboardingFlowService(db);
}

export default OnboardingFlowService;
