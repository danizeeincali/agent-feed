/**
 * First-Time Setup Middleware
 * Detects new users and triggers onboarding automatically
 * Implements FR-5 from SPARC-USERNAME-COLLECTION.md
 *
 * This middleware:
 * 1. Checks if user has completed onboarding (user_settings.onboarding_completed = 1)
 * 2. Auto-triggers get-to-know-you-agent for new users
 * 3. Skips onboarding for returning users
 */

import { createOnboardingService } from '../services/onboarding-service.js';

let onboardingService;

/**
 * Initialize middleware with database
 * @param {Database} db - better-sqlite3 database instance
 */
export function initializeFirstTimeSetup(db) {
  if (!db) {
    console.error('❌ Database not provided to first-time-setup middleware');
    return;
  }

  try {
    onboardingService = createOnboardingService(db);
    console.log('✅ First-time setup middleware initialized');
  } catch (error) {
    console.error('❌ Error initializing first-time setup middleware:', error);
  }
}

/**
 * Middleware to check onboarding status and add to request object
 * This doesn't block requests - it just adds onboarding info to req.onboarding
 *
 * Usage: Add this middleware to routes that need onboarding status
 */
export function checkOnboardingStatus(req, res, next) {
  try {
    // For single-user system, use demo-user-123
    // In multi-user system, this would come from auth middleware
    const userId = req.query.userId || req.body.userId || 'demo-user-123';

    if (!onboardingService) {
      console.warn('⚠️ OnboardingService not initialized in middleware');
      req.onboarding = { available: false };
      return next();
    }

    // Check onboarding status
    const status = onboardingService.checkOnboardingStatus(userId);

    // Add onboarding status to request object
    req.onboarding = {
      available: true,
      userId,
      status,
      needsOnboarding: !status.completed,
      isFirstTimeUser: status.isFirstTimeUser
    };

    next();
  } catch (error) {
    console.error('Error in checkOnboardingStatus middleware:', error);
    // Don't block the request - just set onboarding as unavailable
    req.onboarding = { available: false, error: error.message };
    next();
  }
}

/**
 * Middleware to enforce onboarding completion
 * Returns 403 if user hasn't completed onboarding
 *
 * Usage: Add this middleware to routes that require onboarding to be completed
 */
export function requireOnboardingComplete(req, res, next) {
  try {
    const userId = req.query.userId || req.body.userId || 'demo-user-123';

    if (!onboardingService) {
      console.warn('⚠️ OnboardingService not initialized - allowing request');
      return next();
    }

    const status = onboardingService.checkOnboardingStatus(userId);

    if (!status.completed) {
      return res.status(403).json({
        success: false,
        error: 'Onboarding not completed',
        message: 'Please complete the onboarding process before accessing this resource',
        onboarding_required: true,
        redirect_to: '/onboarding'
      });
    }

    next();
  } catch (error) {
    console.error('Error in requireOnboardingComplete middleware:', error);
    // Fail open - allow request to proceed
    next();
  }
}

/**
 * API endpoint to get onboarding status
 * This is used by frontend to check if user needs onboarding
 */
export function getOnboardingStatusHandler(req, res) {
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
    console.error('Error getting onboarding status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get onboarding status',
      message: error.message
    });
  }
}

/**
 * API endpoint to mark onboarding as complete
 * This is called by get-to-know-you-agent when user completes onboarding
 */
export function markOnboardingCompleteHandler(req, res) {
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
}

/**
 * API endpoint to reset onboarding status (for testing)
 */
export function resetOnboardingHandler(req, res) {
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
}

export default {
  initializeFirstTimeSetup,
  checkOnboardingStatus,
  requireOnboardingComplete,
  getOnboardingStatusHandler,
  markOnboardingCompleteHandler,
  resetOnboardingHandler
};
