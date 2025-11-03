/**
 * User Settings Service
 * Manages user preferences, display name, and profile settings
 * Uses better-sqlite3 for synchronous database operations
 */

/**
 * User Settings Service Class
 */
class UserSettingsService {
  constructor(database) {
    if (!database) {
      throw new Error('Database instance is required for UserSettingsService');
    }
    this.db = database;
    this.initializeStatements();
  }

  /**
   * Initialize prepared statements for performance
   */
  initializeStatements() {
    try {
      // Get user settings
      this.getSettingsStmt = this.db.prepare(`
        SELECT
          user_id,
          display_name,
          display_name_style,
          onboarding_completed,
          onboarding_completed_at,
          profile_json,
          created_at,
          updated_at
        FROM user_settings
        WHERE user_id = ?
      `);

      // Update user settings
      this.updateSettingsStmt = this.db.prepare(`
        UPDATE user_settings
        SET
          display_name = COALESCE(?, display_name),
          display_name_style = COALESCE(?, display_name_style),
          profile_json = COALESCE(?, profile_json),
          onboarding_completed = COALESCE(?, onboarding_completed),
          onboarding_completed_at = COALESCE(?, onboarding_completed_at)
        WHERE user_id = ?
      `);

      // Insert user settings (for new users)
      this.insertSettingsStmt = this.db.prepare(`
        INSERT INTO user_settings (user_id, display_name, display_name_style, profile_json, onboarding_completed, onboarding_completed_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      console.log('✅ UserSettingsService prepared statements initialized');
    } catch (error) {
      console.error('❌ Error initializing UserSettingsService statements:', error);
      throw error;
    }
  }

  /**
   * Get user settings by user ID
   * @param {string} userId - User ID (default: 'demo-user-123')
   * @returns {Object|null} User settings object or null if not found
   */
  getUserSettings(userId = 'demo-user-123') {
    try {
      const settings = this.getSettingsStmt.get(userId);

      if (!settings) {
        return null;
      }

      // Parse JSON fields
      return {
        ...settings,
        profile_json: settings.profile_json ? JSON.parse(settings.profile_json) : {}
      };
    } catch (error) {
      console.error('Error getting user settings:', error);
      throw error;
    }
  }

  /**
   * Update user settings
   * @param {string} userId - User ID
   * @param {Object} updates - Settings to update
   * @param {string} updates.display_name - Display name
   * @param {string} updates.display_name_style - Display name style
   * @param {Object} updates.profile_json - Profile data
   * @returns {Object} Updated settings
   */
  updateUserSettings(userId = 'demo-user-123', updates = {}) {
    try {
      const {
        display_name,
        display_name_style,
        profile_json,
        onboarding_completed,
        onboarding_completed_at
      } = updates;

      // Stringify JSON fields if provided
      const profileJsonStr = profile_json ? JSON.stringify(profile_json) : null;

      // Update settings
      const result = this.updateSettingsStmt.run(
        display_name || null,
        display_name_style || null,
        profileJsonStr,
        onboarding_completed !== undefined ? onboarding_completed : null,
        onboarding_completed_at || null,
        userId
      );

      // If no rows were updated, user doesn't exist - create new record
      if (result.changes === 0) {
        this.insertSettingsStmt.run(
          userId,
          display_name || 'User',
          display_name_style || null,
          profileJsonStr || '{}',
          onboarding_completed !== undefined ? onboarding_completed : 0,
          onboarding_completed_at || null
        );
      }

      // Return updated settings
      return this.getUserSettings(userId);
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  }

  /**
   * Get display name for a user
   * @param {string} userId - User ID
   * @returns {string|null} Display name or null
   */
  getDisplayName(userId = 'demo-user-123') {
    try {
      const settings = this.getUserSettings(userId);
      return settings?.display_name || null;
    } catch (error) {
      console.error('Error getting display name:', error);
      return null;
    }
  }

  /**
   * Set display name for a user
   * @param {string} userId - User ID
   * @param {string} displayName - Display name to set
   * @returns {Object} Updated settings
   */
  setDisplayName(userId = 'demo-user-123', displayName) {
    return this.updateUserSettings(userId, { display_name: displayName });
  }

  /**
   * Update profile data from get-to-know-you-agent
   * @param {string} userId - User ID
   * @param {Object} profileData - Complete profile data
   * @returns {Object} Updated settings
   */
  updateProfile(userId = 'demo-user-123', profileData) {
    // Extract display_name if present in profile
    const display_name = profileData.display_name ||
                         profileData.preferred_name ||
                         profileData.name ||
                         null;

    return this.updateUserSettings(userId, {
      display_name,
      profile_json: profileData
    });
  }

  /**
   * Clear user settings (for testing)
   * @param {string} userId - User ID
   */
  clearUserSettings(userId = 'demo-user-123') {
    try {
      const stmt = this.db.prepare('DELETE FROM user_settings WHERE user_id = ?');
      stmt.run(userId);
      console.log(`User settings cleared for ${userId}`);
    } catch (error) {
      console.error('Error clearing user settings:', error);
      throw error;
    }
  }
}

/**
 * Create and export service instance factory
 * @param {Database} db - better-sqlite3 database instance
 * @returns {UserSettingsService} Service instance
 */
export function createUserSettingsService(db) {
  return new UserSettingsService(db);
}

export default UserSettingsService;
