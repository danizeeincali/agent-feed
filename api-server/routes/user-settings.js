/**
 * User Settings API Routes
 * Endpoints for managing user preferences, display name, and profile
 */

import express from 'express';
import { createUserSettingsService } from '../services/user-settings-service.js';

const router = express.Router();
let userSettingsService;

/**
 * Initialize routes with database
 * @param {Database} db - better-sqlite3 database instance
 */
export function initializeUserSettingsRoutes(db) {
  if (!db) {
    console.error('❌ Database not provided to user-settings routes');
    return;
  }

  try {
    userSettingsService = createUserSettingsService(db);
    console.log('✅ User settings routes initialized with database');
  } catch (error) {
    console.error('❌ Error initializing user settings routes:', error);
  }
}

/**
 * GET /api/user-settings
 * Get current user settings
 */
router.get('/', (req, res) => {
  try {
    // For single-user system, always use demo-user-123
    // In multi-user system, this would come from auth middleware
    const userId = req.query.userId || 'demo-user-123';

    if (!userSettingsService) {
      return res.status(503).json({
        success: false,
        error: 'User settings service not initialized'
      });
    }

    const settings = userSettingsService.getUserSettings(userId);

    if (!settings) {
      return res.status(404).json({
        success: false,
        error: 'User settings not found'
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting user settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user settings',
      message: error.message
    });
  }
});

/**
 * PUT /api/user-settings
 * Update user settings
 */
router.put('/', (req, res) => {
  try {
    // For single-user system, always use demo-user-123
    const userId = req.body.userId || 'demo-user-123';
    const updates = req.body;

    if (!userSettingsService) {
      return res.status(503).json({
        success: false,
        error: 'User settings service not initialized'
      });
    }

    // Remove userId from updates object to prevent overwriting
    delete updates.userId;

    const updatedSettings = userSettingsService.updateUserSettings(userId, updates);

    res.json({
      success: true,
      data: updatedSettings,
      message: 'User settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user settings',
      message: error.message
    });
  }
});

/**
 * GET /api/user-settings/display-name
 * Get user's display name only
 */
router.get('/display-name', (req, res) => {
  try {
    const userId = req.query.userId || 'demo-user-123';

    if (!userSettingsService) {
      return res.status(503).json({
        success: false,
        error: 'User settings service not initialized'
      });
    }

    const displayName = userSettingsService.getDisplayName(userId);

    res.json({
      success: true,
      data: {
        display_name: displayName
      }
    });
  } catch (error) {
    console.error('Error getting display name:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get display name',
      message: error.message
    });
  }
});

/**
 * PUT /api/user-settings/display-name
 * Update user's display name
 */
router.put('/display-name', (req, res) => {
  try {
    const userId = req.body.userId || 'demo-user-123';
    const { display_name } = req.body;

    if (!userSettingsService) {
      return res.status(503).json({
        success: false,
        error: 'User settings service not initialized'
      });
    }

    if (!display_name) {
      return res.status(400).json({
        success: false,
        error: 'display_name is required'
      });
    }

    const updatedSettings = userSettingsService.setDisplayName(userId, display_name);

    res.json({
      success: true,
      data: updatedSettings,
      message: 'Display name updated successfully'
    });
  } catch (error) {
    console.error('Error updating display name:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update display name',
      message: error.message
    });
  }
});

/**
 * PUT /api/user-settings/profile
 * Update complete user profile (used by get-to-know-you-agent)
 */
router.put('/profile', (req, res) => {
  try {
    const userId = req.body.userId || 'demo-user-123';
    const profileData = req.body.profile_data || req.body;

    if (!userSettingsService) {
      return res.status(503).json({
        success: false,
        error: 'User settings service not initialized'
      });
    }

    // Remove userId from profile data
    delete profileData.userId;

    const updatedSettings = userSettingsService.updateProfile(userId, profileData);

    res.json({
      success: true,
      data: updatedSettings,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      message: error.message
    });
  }
});

export default router;
