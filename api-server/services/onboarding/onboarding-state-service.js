/**
 * Onboarding State Service
 * Tracks user progress through onboarding phases
 * Manages onboarding_state table
 */

/**
 * Onboarding State Service Class
 */
class OnboardingStateService {
  constructor(database) {
    if (!database) {
      throw new Error('Database instance is required for OnboardingStateService');
    }
    this.db = database;
    this.initializeStatements();
  }

  /**
   * Initialize prepared statements
   */
  initializeStatements() {
    try {
      // Get state
      this.getStateStmt = this.db.prepare(`
        SELECT * FROM onboarding_state WHERE user_id = ?
      `);

      // Get detailed state with user settings
      this.getDetailedStateStmt = this.db.prepare(`
        SELECT
          os.*,
          us.display_name,
          us.profile_json,
          us.onboarding_completed
        FROM onboarding_state os
        LEFT JOIN user_settings us ON os.user_id = us.user_id
        WHERE os.user_id = ?
      `);

      // Update responses
      this.updateResponsesStmt = this.db.prepare(`
        UPDATE onboarding_state
        SET
          responses = ?,
          updated_at = unixepoch()
        WHERE user_id = ?
      `);

      console.log('✅ OnboardingStateService prepared statements initialized');
    } catch (error) {
      console.error('❌ Error initializing OnboardingStateService statements:', error);
      throw error;
    }
  }

  /**
   * Get onboarding state
   * @param {string} userId - User ID
   * @returns {Object|null} Onboarding state
   */
  getState(userId = 'demo-user-123') {
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
   * Get detailed state with user settings
   * @param {string} userId - User ID
   * @returns {Object|null} Detailed state
   */
  getDetailedState(userId = 'demo-user-123') {
    try {
      const state = this.getDetailedStateStmt.get(userId);

      if (!state) {
        return null;
      }

      return {
        ...state,
        responses: state.responses ? JSON.parse(state.responses) : {},
        profile_json: state.profile_json ? JSON.parse(state.profile_json) : {}
      };
    } catch (error) {
      console.error('Error getting detailed state:', error);
      throw error;
    }
  }

  /**
   * Add response to state
   * @param {string} userId - User ID
   * @param {string} key - Response key (e.g., 'name', 'use_case')
   * @param {any} value - Response value
   * @returns {Object} Updated state
   */
  addResponse(userId, key, value) {
    try {
      const state = this.getState(userId);

      if (!state) {
        throw new Error('Onboarding state not found');
      }

      const responses = state.responses || {};
      responses[key] = value;

      this.updateResponsesStmt.run(JSON.stringify(responses), userId);

      return this.getState(userId);
    } catch (error) {
      console.error('Error adding response:', error);
      throw error;
    }
  }

  /**
   * Get current phase and step
   * @param {string} userId - User ID
   * @returns {Object} Phase and step information
   */
  getCurrentPhaseStep(userId = 'demo-user-123') {
    try {
      const state = this.getState(userId);

      if (!state) {
        return {
          phase: null,
          step: null,
          phase1_completed: false,
          phase2_completed: false
        };
      }

      return {
        phase: state.phase,
        step: state.step,
        phase1_completed: state.phase1_completed === 1,
        phase2_completed: state.phase2_completed === 1,
        responses: state.responses
      };
    } catch (error) {
      console.error('Error getting current phase/step:', error);
      throw error;
    }
  }

  /**
   * Check if Phase 1 is completed
   * @param {string} userId - User ID
   * @returns {boolean} True if Phase 1 completed
   */
  isPhase1Complete(userId = 'demo-user-123') {
    try {
      const state = this.getState(userId);
      return state && state.phase1_completed === 1;
    } catch (error) {
      console.error('Error checking Phase 1 completion:', error);
      return false;
    }
  }

  /**
   * Check if Phase 2 is completed
   * @param {string} userId - User ID
   * @returns {boolean} True if Phase 2 completed
   */
  isPhase2Complete(userId = 'demo-user-123') {
    try {
      const state = this.getState(userId);
      return state && state.phase2_completed === 1;
    } catch (error) {
      console.error('Error checking Phase 2 completion:', error);
      return false;
    }
  }

  /**
   * Get all responses collected so far
   * @param {string} userId - User ID
   * @returns {Object} All responses
   */
  getAllResponses(userId = 'demo-user-123') {
    try {
      const state = this.getState(userId);
      return state?.responses || {};
    } catch (error) {
      console.error('Error getting all responses:', error);
      return {};
    }
  }

  /**
   * Get progress summary
   * @param {string} userId - User ID
   * @returns {Object} Progress summary
   */
  getProgressSummary(userId = 'demo-user-123') {
    try {
      const state = this.getDetailedState(userId);

      if (!state) {
        return {
          exists: false,
          phase1_complete: false,
          phase2_complete: false,
          current_step: null,
          responses_collected: []
        };
      }

      return {
        exists: true,
        phase: state.phase,
        current_step: state.step,
        phase1_complete: state.phase1_completed === 1,
        phase1_completed_at: state.phase1_completed_at,
        phase2_complete: state.phase2_completed === 1,
        phase2_completed_at: state.phase2_completed_at,
        responses_collected: Object.keys(state.responses || {}),
        display_name: state.display_name,
        onboarding_completed: state.onboarding_completed === 1
      };
    } catch (error) {
      console.error('Error getting progress summary:', error);
      throw error;
    }
  }
}

/**
 * Create and export service instance factory
 * @param {Database} db - better-sqlite3 database instance
 * @returns {OnboardingStateService} Service instance
 */
export function createOnboardingStateService(db) {
  return new OnboardingStateService(db);
}

export default OnboardingStateService;
