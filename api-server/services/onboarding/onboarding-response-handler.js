/**
 * Onboarding Response Handler
 * Processes user responses and coordinates with flow and state services
 * Implements conversational education approach (Decision 4)
 */

import { createOnboardingFlowService } from './onboarding-flow-service.js';
import { createOnboardingStateService } from './onboarding-state-service.js';
import { createUserSettingsService } from '../user-settings-service.js';

/**
 * Onboarding Response Handler Class
 */
class OnboardingResponseHandler {
  constructor(database) {
    if (!database) {
      throw new Error('Database instance is required for OnboardingResponseHandler');
    }
    this.db = database;
    this.flowService = createOnboardingFlowService(database);
    this.stateService = createOnboardingStateService(database);
    this.userSettingsService = createUserSettingsService(database);
  }

  /**
   * Process user response based on current onboarding step
   * @param {string} userId - User ID
   * @param {string} responseText - User's response
   * @param {string} responseType - Type of response (auto-detected if not provided)
   * @returns {Object} Response handling result with next steps
   */
  async processResponse(userId = 'demo-user-123', responseText, responseType = null) {
    try {
      // Get current state
      const currentState = this.stateService.getCurrentPhaseStep(userId);

      if (!currentState.phase) {
        // First-time user - initialize onboarding
        this.flowService.initializeOnboarding(userId);
        return {
          success: true,
          action: 'initialized',
          message: "Hi! Welcome to Agent Feed. What should I call you?",
          examples: ['Your first name (e.g., "Alex")', 'Your full name (e.g., "Alex Chen")', 'A nickname (e.g., "AC")', 'A professional title (e.g., "Dr. Chen")']
        };
      }

      // Route based on current step
      switch (currentState.step) {
        case 'name':
          return this.handleNameResponse(userId, responseText);

        case 'use_case':
          return this.handleUseCaseResponse(userId, responseText);

        case 'comm_style':
          return this.handleCommStyleResponse(userId, responseText);

        case 'goals':
          return this.handleGoalsResponse(userId, responseText);

        case 'agent_prefs':
          return this.handleAgentPrefsResponse(userId, responseText);

        default:
          return {
            success: false,
            error: 'Unknown onboarding step',
            currentStep: currentState.step
          };
      }
    } catch (error) {
      console.error('Error processing response:', error);
      throw error;
    }
  }

  /**
   * Handle name response (Phase 1, Step 1)
   * @private
   */
  handleNameResponse(userId, name) {
    try {
      // Validate name
      const validation = this.validateName(name);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          retry: true
        };
      }

      // Save to user_settings
      this.userSettingsService.setDisplayName(userId, name);

      // Process in flow service
      const result = this.flowService.processNameResponse(userId, name);

      return {
        success: true,
        step: 'name',
        nextStep: 'use_case',
        phase: 1,
        agentResponse: {
          message: result.message,
          educationalContext: result.educationalContext,
          options: [
            'Personal productivity',
            'Business management',
            'Creative projects',
            'Learning & development',
            'Other'
          ]
        }
      };
    } catch (error) {
      console.error('Error handling name response:', error);
      throw error;
    }
  }

  /**
   * Handle use case response (Phase 1, Step 2)
   * @private
   */
  handleUseCaseResponse(userId, useCaseRaw) {
    try {
      // Normalize use case
      const useCase = this.normalizeUseCase(useCaseRaw);

      // Save to user_settings profile
      const state = this.stateService.getState(userId);
      const profileData = {
        name: state.responses.name,
        use_case: useCase,
        primary_focus: useCase
      };

      this.userSettingsService.updateProfile(userId, profileData);

      // Process in flow service
      const result = this.flowService.processUseCaseResponse(userId, useCase);

      return {
        success: true,
        step: 'use_case',
        phase1Complete: true,
        agentResponse: {
          message: result.message,
          nextSteps: result.nextSteps
        },
        triggers: {
          coreAgentIntros: result.triggerCoreAgentIntros,
          agents: ['personal-todos-agent', 'agent-ideas-agent', 'link-logger-agent']
        }
      };
    } catch (error) {
      console.error('Error handling use case response:', error);
      throw error;
    }
  }

  /**
   * Handle communication style response (Phase 2, Step 1)
   * @private
   */
  handleCommStyleResponse(userId, commStyle) {
    try {
      // Normalize comm style
      const normalized = this.normalizeCommStyle(commStyle);

      // Save response
      this.stateService.addResponse(userId, 'comm_style', normalized);

      return {
        success: true,
        step: 'comm_style',
        nextStep: 'goals',
        phase: 2,
        agentResponse: {
          message: `Perfect! I'll make sure your agents communicate in a ${normalized} way. Now, what are your top 3 goals right now?`,
          educationalContext: 'This helps me configure how all agents interact with you.'
        }
      };
    } catch (error) {
      console.error('Error handling comm style response:', error);
      throw error;
    }
  }

  /**
   * Handle goals response (Phase 2, Step 2)
   * @private
   */
  handleGoalsResponse(userId, goals) {
    try {
      // Parse goals (comma-separated or list)
      const goalsList = this.parseGoalsList(goals);

      // Save response
      this.stateService.addResponse(userId, 'goals', goalsList);

      return {
        success: true,
        step: 'goals',
        nextStep: 'agent_prefs',
        phase: 2,
        agentResponse: {
          message: `Great goals! Finally, which types of assistance would be most valuable to you?`,
          options: [
            'Strategic planning & prioritization',
            'Task management & execution',
            'Content organization & knowledge management',
            'Meeting preparation & follow-ups',
            'Creative brainstorming & ideation'
          ]
        }
      };
    } catch (error) {
      console.error('Error handling goals response:', error);
      throw error;
    }
  }

  /**
   * Handle agent preferences response (Phase 2, Step 3 - Final)
   * @private
   */
  handleAgentPrefsResponse(userId, agentPrefs) {
    try {
      // Parse preferences
      const prefs = this.parseAgentPreferences(agentPrefs);

      // Save response
      this.stateService.addResponse(userId, 'agent_prefs', prefs);

      // Complete Phase 2
      const timestamp = Math.floor(Date.now() / 1000);
      const updateStmt = this.db.prepare(`
        UPDATE onboarding_state
        SET
          phase2_completed = 1,
          phase2_completed_at = ?,
          step = 'complete',
          updated_at = unixepoch()
        WHERE user_id = ?
      `);
      updateStmt.run(timestamp, userId);

      // Get all responses for summary
      const allResponses = this.stateService.getAllResponses(userId);

      return {
        success: true,
        step: 'agent_prefs',
        phase2Complete: true,
        allOnboardingComplete: true,
        agentResponse: {
          message: this.generateCompletionMessage(allResponses),
          summary: allResponses
        }
      };
    } catch (error) {
      console.error('Error handling agent prefs response:', error);
      throw error;
    }
  }

  /**
   * Validate name input
   * @private
   */
  validateName(name) {
    if (!name || typeof name !== 'string') {
      return {
        valid: false,
        error: "I didn't catch that. Please provide a name I can call you by."
      };
    }

    const trimmed = name.trim();

    if (trimmed.length === 0) {
      return {
        valid: false,
        error: "I didn't catch that. Please provide a name I can call you by."
      };
    }

    if (trimmed.length > 50) {
      return {
        valid: false,
        error: "That's a bit long! Please use a shorter version (maximum 50 characters)."
      };
    }

    return { valid: true };
  }

  /**
   * Normalize use case to standard values
   * @private
   */
  normalizeUseCase(useCaseRaw) {
    const normalized = useCaseRaw.toLowerCase().trim();

    if (normalized.includes('personal') || normalized.includes('productivity')) {
      return 'personal_productivity';
    }
    if (normalized.includes('business')) {
      return 'business';
    }
    if (normalized.includes('creative') || normalized.includes('project')) {
      return 'creative_projects';
    }
    if (normalized.includes('learn')) {
      return 'learning';
    }

    return 'other';
  }

  /**
   * Normalize communication style
   * @private
   */
  normalizeCommStyle(style) {
    const normalized = style.toLowerCase().trim();

    if (normalized.includes('formal') || normalized.includes('professional')) {
      return 'formal';
    }
    if (normalized.includes('casual') || normalized.includes('friendly')) {
      return 'casual';
    }
    if (normalized.includes('adaptive') || normalized.includes('context')) {
      return 'adaptive';
    }

    return 'adaptive'; // default
  }

  /**
   * Parse goals list from text
   * @private
   */
  parseGoalsList(goalsText) {
    // Split by common delimiters
    const goals = goalsText
      .split(/[,\n]/)
      .map(g => g.trim())
      .filter(g => g.length > 0)
      .slice(0, 5); // Max 5 goals

    return goals;
  }

  /**
   * Parse agent preferences
   * @private
   */
  parseAgentPreferences(prefsText) {
    const prefs = prefsText
      .split(/[,\n]/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    return prefs;
  }

  /**
   * Generate completion message
   * @private
   */
  generateCompletionMessage(responses) {
    const name = responses.name || 'there';

    return `Perfect, ${name}! Your personalized Agent Feed is now fully configured.

**Your Profile:**
- Name: ${responses.name}
- Focus: ${responses.use_case}
- Communication Style: ${responses.comm_style}
- Top Goals: ${responses.goals?.join(', ')}
- Preferred Assistance: ${responses.agent_prefs?.join(', ')}

All your agents are now tuned to work exactly how you prefer. Welcome to your personalized AI team!`;
  }
}

/**
 * Create and export handler instance factory
 * @param {Database} db - better-sqlite3 database instance
 * @returns {OnboardingResponseHandler} Handler instance
 */
export function createOnboardingResponseHandler(db) {
  return new OnboardingResponseHandler(db);
}

export default OnboardingResponseHandler;
