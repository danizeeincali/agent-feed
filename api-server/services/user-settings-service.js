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
          id,
          user_id,
          display_name,
          username,
          profile_data,
          preferences,
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
          username = COALESCE(?, username),
          profile_data = COALESCE(?, profile_data),
          preferences = COALESCE(?, preferences),
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `);

      // Insert user settings (for new users)
      this.insertSettingsStmt = this.db.prepare(`
        INSERT INTO user_settings (user_id, display_name, username, profile_data, preferences)
        VALUES (?, ?, ?, ?, ?)
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
        profile_data: settings.profile_data ? JSON.parse(settings.profile_data) : {},
        preferences: settings.preferences ? JSON.parse(settings.preferences) : {}
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
   * @param {string} updates.username - Username
   * @param {Object} updates.profile_data - Profile data
   * @param {Object} updates.preferences - User preferences
   * @returns {Object} Updated settings
   */
  updateUserSettings(userId = 'demo-user-123', updates = {}) {
    try {
      const {
        display_name,
        username,
        profile_data,
        preferences
      } = updates;

      // Stringify JSON fields if provided
      const profileDataJson = profile_data ? JSON.stringify(profile_data) : null;
      const preferencesJson = preferences ? JSON.stringify(preferences) : null;

      // Update settings
      const result = this.updateSettingsStmt.run(
        display_name || null,
        username || null,
        profileDataJson,
        preferencesJson,
        userId
      );

      // If no rows were updated, user doesn't exist - create new record
      if (result.changes === 0) {
        this.insertSettingsStmt.run(
          userId,
          display_name || null,
          username || null,
          profileDataJson || '{}',
          preferencesJson || '{}'
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
      profile_data: profileData
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
