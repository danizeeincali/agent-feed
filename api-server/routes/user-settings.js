/**
 * User Settings API Routes
 * Endpoints for managing user preferences, display name, and profile
 *
 * SPARC Implementation: FR-3 - API Endpoints for Username Management
 * - GET /api/user-settings/:userId - Retrieve user settings
 * - POST /api/user-settings - Create/update user settings
 * - PATCH /api/user-settings/:userId - Update specific fields
 *
 * SPARC Implementation: FR-5 - Onboarding State Management
 * - GET /api/user-settings/onboarding/status - Check onboarding status
 * - POST /api/user-settings/onboarding/complete - Mark onboarding complete
 * - POST /api/user-settings/onboarding/reset - Reset onboarding (testing)
 */

import express from 'express';
import { createUserSettingsService } from '../services/user-settings-service.js';
import { createOnboardingService } from '../services/onboarding-service.js';
import DOMPurify from 'isomorphic-dompurify';

const router = express.Router();
let userSettingsService;
let onboardingService;

/**
 * Validation & Sanitization Functions
 */

/**
 * Validate display_name according to SPARC NFR-1
 * @param {string} displayName - Display name to validate
 * @returns {Object} { valid: boolean, error: string }
 */
function validateDisplayName(displayName) {
  if (!displayName || typeof displayName !== 'string') {
    return { valid: false, error: 'display_name is required and must be a string' };
  }

  const trimmed = displayName.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'display_name cannot be empty' };
  }

  if (trimmed.length > 50) {
    return { valid: false, error: 'display_name must be 1-50 characters' };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Sanitize display_name to remove HTML/script tags
 * @param {string} displayName - Display name to sanitize
 * @returns {string} Sanitized display name
 */
function sanitizeDisplayName(displayName) {
  // Remove all HTML tags and script content
  const sanitized = DOMPurify.sanitize(displayName, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [] // No attributes allowed
  });

  return sanitized.trim();
}

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
    onboardingService = createOnboardingService(db);
    console.log('✅ User settings routes initialized with database');
    console.log('✅ Onboarding service initialized with database');
  } catch (error) {
    console.error('❌ Error initializing user settings routes:', error);
  }
}

/**
 * ============================================================================
 * SPARC-COMPLIANT ENDPOINTS (FR-3)
 * ============================================================================
 */

/**
 * GET /api/user-settings/:userId
 * Retrieve user settings by user ID
 *
 * SPARC Spec: FR-3, API Specification line 337-358
 */
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;

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

    // Return in SPARC-specified format
    res.json({
      success: true,
      data: {
        user_id: settings.user_id,
        display_name: settings.display_name,
        display_name_style: settings.display_name_style || null,
        onboarding_completed: settings.onboarding_completed || 0,
        onboarding_completed_at: settings.onboarding_completed_at || null,
        created_at: settings.created_at,
        updated_at: settings.updated_at
      }
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
 * POST /api/user-settings
 * Create or update user settings
 *
 * SPARC Spec: FR-3, API Specification line 360-387
 */
router.post('/', (req, res) => {
  try {
    const { user_id, display_name, display_name_style } = req.body;

    if (!userSettingsService) {
      return res.status(503).json({
        success: false,
        error: 'User settings service not initialized'
      });
    }

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required'
      });
    }

    if (!display_name) {
      return res.status(400).json({
        success: false,
        error: 'display_name is required'
      });
    }

    // Validate display_name
    const validation = validateDisplayName(display_name);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: `Invalid display_name: ${validation.error}`
      });
    }

    // Sanitize display_name
    const sanitizedDisplayName = sanitizeDisplayName(validation.sanitized);

    // Create/update user settings
    const updatedSettings = userSettingsService.updateUserSettings(user_id, {
      display_name: sanitizedDisplayName,
      display_name_style: display_name_style || null
    });

    // Return 201 for new creation (check if existed before)
    res.status(201).json({
      success: true,
      data: {
        user_id: updatedSettings.user_id,
        display_name: updatedSettings.display_name,
        display_name_style: updatedSettings.display_name_style || null,
        onboarding_completed: updatedSettings.onboarding_completed || 0,
        created_at: updatedSettings.created_at,
        updated_at: updatedSettings.updated_at
      }
    });
  } catch (error) {
    console.error('Error creating user settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user settings',
      message: error.message
    });
  }
});

/**
 * PATCH /api/user-settings/:userId
 * Update specific fields in user settings
 *
 * SPARC Spec: FR-3, API Specification line 389-405
 */
router.patch('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    if (!userSettingsService) {
      return res.status(503).json({
        success: false,
        error: 'User settings service not initialized'
      });
    }

    // Validate and sanitize display_name if provided
    if (updates.display_name) {
      const validation = validateDisplayName(updates.display_name);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: `Invalid display_name: ${validation.error}`
        });
      }
      updates.display_name = sanitizeDisplayName(validation.sanitized);
    }

    // Update user settings
    const updatedSettings = userSettingsService.updateUserSettings(userId, updates);

    if (!updatedSettings) {
      return res.status(404).json({
        success: false,
        error: 'User settings not found'
      });
    }

    res.json({
      success: true,
      data: {
        user_id: updatedSettings.user_id,
        display_name: updatedSettings.display_name,
        updated_at: updatedSettings.updated_at
      }
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
 * ============================================================================
 * LEGACY ENDPOINTS (Maintained for backward compatibility)
 * ============================================================================
 */

/**
 * GET /api/user-settings
 * Get current user settings (legacy endpoint)
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

/**
 * ============================================================================
 * ONBOARDING ENDPOINTS (FR-5)
 * ============================================================================
 */

/**
 * GET /api/user-settings/onboarding/status
 * Check if user has completed onboarding
 *
 * SPARC Spec: FR-5 - Onboarding State Management
 */
router.get('/onboarding/status', (req, res) => {
  try {
    const userId = req.query.userId || 'demo-user-123';

    if (!onboardingService) {
      return res.status(503).json({
        success: false,
        error: 'Onboarding service not initialized'
      });
    }

    const status = onboardingService.checkOnboardingStatus(userId);

    res.json({
      success: true,
      data: {
        userId,
        onboarding_completed: status.completed,
        is_first_time_user: status.isFirstTimeUser,
        display_name: status.displayName || null,
        completed_at: status.completedAt || null,
        needs_onboarding: !status.completed
      }
    });
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check onboarding status',
      message: error.message
    });
  }
});

/**
 * POST /api/user-settings/onboarding/complete
 * Mark onboarding as complete (called by get-to-know-you-agent)
 *
 * SPARC Spec: FR-5 - Onboarding State Management
 */
router.post('/onboarding/complete', (req, res) => {
  try {
    const { userId = 'demo-user-123', profileData } = req.body;

    if (!onboardingService) {
      return res.status(503).json({
        success: false,
        error: 'Onboarding service not initialized'
      });
    }

    if (!profileData) {
      return res.status(400).json({
        success: false,
        error: 'profileData is required'
      });
    }

    // Validate display_name if provided
    if (profileData.display_name) {
      const validation = validateDisplayName(profileData.display_name);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: `Invalid display_name: ${validation.error}`
        });
      }
      profileData.display_name = sanitizeDisplayName(validation.sanitized);
    }

    const result = onboardingService.markOnboardingComplete(userId, profileData);

    res.json({
      success: true,
      data: result,
      message: 'Onboarding completed successfully'
    });
  } catch (error) {
    console.error('Error marking onboarding complete:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark onboarding complete',
      message: error.message
    });
  }
});

/**
 * POST /api/user-settings/onboarding/reset
 * Reset onboarding status (for testing purposes)
 *
 * SPARC Spec: FR-5 - Onboarding State Management (Testing)
 */
router.post('/onboarding/reset', (req, res) => {
  try {
    const userId = req.query.userId || req.body.userId || 'demo-user-123';

    if (!onboardingService) {
      return res.status(503).json({
        success: false,
        error: 'Onboarding service not initialized'
      });
    }

    onboardingService.resetOnboardingStatus(userId);

    res.json({
      success: true,
      message: `Onboarding status reset for user: ${userId}`
    });
  } catch (error) {
    console.error('Error resetting onboarding status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset onboarding status',
      message: error.message
    });
  }
});

export default router;
