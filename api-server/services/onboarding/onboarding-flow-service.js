/**
 * Onboarding Flow Service
 * Manages phase transitions and onboarding flow logic
 * Implements Section 2.2 - Onboarding Flow from SPARC spec
 */

import { nanoid } from 'nanoid';

/**
 * Onboarding Flow Service Class
 * Manages transitions between Phase 1 (name + use case) and Phase 2 (deeper personalization)
 */
class OnboardingFlowService {
  constructor(database) {
    if (!database) {
      throw new Error('Database instance is required for OnboardingFlowService');
    }
    this.db = database;
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
   * Process Phase 1 - Name collection
   * @param {string} userId - User ID
   * @param {string} name - User's preferred name
   * @returns {Object} Next step information
   */
  processNameResponse(userId, name) {
    try {
      const state = this.getOnboardingState(userId) || this.initializeOnboarding(userId);
      const responses = state.responses || {};

      // Store name in responses
      responses.name = name;

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
        message: `Great to meet you, ${name}! What brings you to Agent Feed?`,
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
  processUseCaseResponse(userId, useCase) {
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
        triggerCoreAgentIntros: true
      };
    } catch (error) {
      console.error('Error processing use case response:', error);
      throw error;
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
