/**
 * Anthropic SDK API Routes - Secure endpoints for Claude interaction
 * SECURITY: Implements API key protection for Docker/VPS deployment
 */

import express from 'express';
import { getSDKManager } from '../../services/AnthropicSDKManager.js';
const router = express.Router();

// Debug: Log all routes as they're registered
console.log('🔧 DEBUG: Creating Anthropic SDK router...');

/**
 * POST /api/avi/streaming-chat
 * Secure streaming chat endpoint for Avi DM
 */
console.log('🔧 DEBUG: Registering POST /streaming-chat route...');
router.post('/streaming-chat', async (req, res) => {
  try {
    const { message, options = {} } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a string'
      });
    }

    const sdkManager = getSDKManager();
    const responses = await sdkManager.createStreamingChat(message, options);

    res.json({
      success: true,
      responses: responses,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Streaming chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Chat processing failed'
    });
  }
});

/**
 * POST /api/avi/background-task
 * Secure headless execution for background tasks
 */
console.log('🔧 DEBUG: Registering POST /background-task route...');
router.post('/background-task', async (req, res) => {
  try {
    const { prompt, options = {} } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required and must be a string'
      });
    }

    const sdkManager = getSDKManager();
    const result = await sdkManager.executeHeadlessTask(prompt, options);

    res.json({
      success: true,
      result: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Background task error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Background task failed'
    });
  }
});

/**
 * GET /api/avi/health
 * SDK health check endpoint
 */
console.log('🔧 DEBUG: Registering GET /health route...');
router.get('/health', async (req, res) => {
  try {
    const sdkManager = getSDKManager();
    const isHealthy = await sdkManager.healthCheck();
    const status = sdkManager.getStatus();

    res.json({
      success: true,
      healthy: isHealthy,
      status: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/avi/status
 * Get SDK status without exposing credentials
 */
console.log('🔧 DEBUG: Registering GET /status route...');
router.get('/status', (req, res) => {
  try {
    const sdkManager = getSDKManager();
    const status = sdkManager.getStatus();

    res.json({
      success: true,
      status: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Status check failed'
    });
  }
});

export default router;