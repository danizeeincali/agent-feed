/**
 * Onboarding API Routes
 * Implements API endpoints for onboarding flow management
 * Section 3.4 - API Endpoints from SPARC spec
 */

import express from 'express';
import { createOnboardingResponseHandler } from '../../services/onboarding/onboarding-response-handler.js';
import { createOnboardingStateService } from '../../services/onboarding/onboarding-state-service.js';
import { createOnboardingFlowService } from '../../services/onboarding/onboarding-flow-service.js';

const router = express.Router();

/**
 * POST /api/onboarding/response
 * Submit onboarding response
 */
router.post('/response', async (req, res) => {
  try {
    const { userId = 'demo-user-123', responseText, responseType } = req.body;

    if (!responseText || typeof responseText !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'responseText is required and must be a string'
      });
    }

    const handler = createOnboardingResponseHandler(req.db);
    const result = await handler.processResponse(userId, responseText, responseType);

    res.json(result);
  } catch (error) {
    console.error('Error processing onboarding response:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/onboarding/state/:userId
 * Get onboarding state for user
 */
router.get('/state/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    const stateService = createOnboardingStateService(req.db);
    const progressSummary = stateService.getProgressSummary(userId);

    res.json({
      success: true,
      ...progressSummary
    });
  } catch (error) {
    console.error('Error getting onboarding state:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/onboarding/trigger-phase2
 * Manually trigger Phase 2 onboarding
 */
router.post('/trigger-phase2', (req, res) => {
  try {
    const { userId = 'demo-user-123' } = req.body;

    const flowService = createOnboardingFlowService(req.db);
    const result = flowService.triggerPhase2(userId);

    res.json(result);
  } catch (error) {
    console.error('Error triggering Phase 2:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/onboarding/should-trigger-phase2/:userId
 * Check if Phase 2 should be triggered for user
 */
router.get('/should-trigger-phase2/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    const flowService = createOnboardingFlowService(req.db);
    const shouldTrigger = flowService.shouldTriggerPhase2(userId);

    res.json({
      success: true,
      shouldTrigger,
      userId
    });
  } catch (error) {
    console.error('Error checking Phase 2 trigger:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/onboarding/initialize
 * Initialize onboarding for new user
 */
router.post('/initialize', (req, res) => {
  try {
    const { userId = 'demo-user-123' } = req.body;

    const flowService = createOnboardingFlowService(req.db);
    const state = flowService.initializeOnboarding(userId);

    res.json({
      success: true,
      state,
      message: "Hi! Welcome to Agent Feed. What should I call you?",
      examples: [
        'Your first name (e.g., "Alex")',
        'Your full name (e.g., "Alex Chen")',
        'A nickname (e.g., "AC")',
        'A professional title (e.g., "Dr. Chen")'
      ]
    });
  } catch (error) {
    console.error('Error initializing onboarding:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
