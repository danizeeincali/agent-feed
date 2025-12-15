/**
 * Onboarding Service
 * Manages user onboarding state and completion tracking
 * Implements FR-5 from SPARC-USERNAME-COLLECTION.md
 */

/**
 * Onboarding Service Class
 * Tracks onboarding completion status and prevents re-onboarding
 */
class OnboardingService {
  constructor(database) {
    if (!database) {
      throw new Error('Database instance is required for OnboardingService');
    }
    this.db = database;
    this.initializeStatements();
  }

  /**
   * Initialize prepared statements for performance
   */
  initializeStatements() {
    try {
      // Check if user has completed onboarding
      this.checkOnboardingStmt = this.db.prepare(`
        SELECT
          user_id,
          onboarding_completed,
          onboarding_completed_at,
          display_name,
          profile_json
        FROM user_settings
        WHERE user_id = ?
      `);

      // Mark onboarding as complete
      this.completeOnboardingStmt = this.db.prepare(`
        UPDATE user_settings
        SET
          onboarding_completed = 1,
          onboarding_completed_at = ?,
          display_name = COALESCE(?, display_name),
          profile_json = COALESCE(?, profile_json),
          updated_at = unixepoch()
        WHERE user_id = ?
      `);

      // Create new user settings record (first-time user)
      this.createUserSettingsStmt = this.db.prepare(`
        INSERT OR IGNORE INTO user_settings (
          user_id,
          display_name,
          profile_json,
          onboarding_completed,
          onboarding_completed_at
        ) VALUES (?, ?, ?, 0, NULL)
      `);

      // Get user profile data
      this.getProfileStmt = this.db.prepare(`
        SELECT
          user_id,
          display_name,
          display_name_style,
          profile_json,
          onboarding_completed,
          onboarding_completed_at
        FROM user_settings
        WHERE user_id = ?
      `);

      console.log('✅ OnboardingService prepared statements initialized');
    } catch (error) {
      console.error('❌ Error initializing OnboardingService statements:', error);
      throw error;
    }
  }

  /**
   * Check if user has completed onboarding
   * @param {string} userId - User ID (default: 'demo-user-123')
   * @returns {Object} Status object with onboarding information
   */
  checkOnboardingStatus(userId = 'demo-user-123') {
    try {
      const settings = this.checkOnboardingStmt.get(userId);

      // User doesn't exist in database - first-time user
      if (!settings) {
        return {
          exists: false,
          completed: false,
          isFirstTimeUser: true,
          message: 'New user - onboarding required'
        };
      }

      // User exists but hasn't completed onboarding
      if (settings.onboarding_completed === 0) {
        return {
          exists: true,
          completed: false,
          isFirstTimeUser: false,
          userId: settings.user_id,
          message: 'Onboarding not completed - show onboarding flow'
        };
      }

      // User has completed onboarding
      return {
        exists: true,
        completed: true,
        isFirstTimeUser: false,
        userId: settings.user_id,
        displayName: settings.display_name,
        completedAt: settings.onboarding_completed_at,
        message: 'Onboarding completed - skip onboarding flow'
      };
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      throw error;
    }
  }

  /**
   * Mark onboarding as complete and save profile data
   * @param {string} userId - User ID
   * @param {Object} profileData - Profile data collected during onboarding
   * @param {string} profileData.display_name - User's preferred display name
   * @param {Object} profileData - Additional profile information
   * @returns {Object} Updated user settings
   */
  markOnboardingComplete(userId = 'demo-user-123', profileData = {}) {
    try {
      const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
      const displayName = profileData.display_name ||
                         profileData.preferred_name ||
                         profileData.name ||
                         'User'; // Default fallback (NOT NULL constraint)

      const profileDataJson = JSON.stringify(profileData);

      // First, ensure user record exists
      this.createUserSettingsStmt.run(userId, displayName, '{}');

      // Then mark onboarding as complete
      const result = this.completeOnboardingStmt.run(
        timestamp,
        displayName,
        profileDataJson,
        userId
      );

      if (result.changes === 0) {
        throw new Error(`Failed to mark onboarding complete for user: ${userId}`);
      }

      console.log(`✅ Onboarding marked complete for user: ${userId}`);

      // Return updated settings
      return this.getUserProfile(userId);
    } catch (error) {
      console.error('Error marking onboarding complete:', error);
      throw error;
    }
  }

  /**
   * Get complete user profile
   * @param {string} userId - User ID
   * @returns {Object|null} User profile or null if not found
   */
  getUserProfile(userId = 'demo-user-123') {
    try {
      const profile = this.getProfileStmt.get(userId);

      if (!profile) {
        return null;
      }

      // Parse JSON fields
      return {
        ...profile,
        profile_json: profile.profile_json ? JSON.parse(profile.profile_json) : {}
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Reset onboarding status (for testing purposes)
   * @param {string} userId - User ID
   */
  resetOnboardingStatus(userId = 'demo-user-123') {
    try {
      const stmt = this.db.prepare(`
        UPDATE user_settings
        SET
          onboarding_completed = 0,
          onboarding_completed_at = NULL,
          updated_at = unixepoch()
        WHERE user_id = ?
      `);

      stmt.run(userId);
      console.log(`✅ Onboarding status reset for user: ${userId}`);
    } catch (error) {
      console.error('Error resetting onboarding status:', error);
      throw error;
    }
  }

  /**
   * Ensure user settings record exists for a new user
   * @param {string} userId - User ID
   * @returns {Object} Status object
   */
  ensureUserExists(userId = 'demo-user-123') {
    try {
      this.createUserSettingsStmt.run(userId, 'User', '{}'); // Default display_name

      return {
        success: true,
        userId,
        message: 'User settings record created'
      };
    } catch (error) {
      // Ignore UNIQUE constraint violations (user already exists)
      if (error.message.includes('UNIQUE constraint failed')) {
        return {
          success: true,
          userId,
          message: 'User settings record already exists'
        };
      }
      throw error;
    }
  }
}

/**
 * Create and export service instance factory
 * @param {Database} db - better-sqlite3 database instance
 * @returns {OnboardingService} Service instance
 */
export function createOnboardingService(db) {
  return new OnboardingService(db);
}

export default OnboardingService;
