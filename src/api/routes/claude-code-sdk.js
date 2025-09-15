/**
 * Claude Code SDK API Routes - Full Tool Access Implementation
 * Provides Claude with file system access, bash execution, and development tools
 * Security: API key protection with tool access capabilities
 */

import express from 'express';
import { getClaudeCodeSDKManager } from '../../services/ClaudeCodeSDKManager.js';
import StreamingTickerManager from '../../services/StreamingTickerManager.js';
const router = express.Router();

console.log('🔧 DEBUG: Creating Claude Code SDK router...');

/**
 * POST /api/claude-code/streaming-chat
 * Full Claude Code interface with tool access
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

    // Send initial processing message to ticker
    StreamingTickerManager.broadcast({
      type: 'tool_activity',
      data: {
        tool: 'thinking',
        action: 'processing your request',
        timestamp: Date.now(),
        priority: 'medium'
      }
    });

    const claudeCodeManager = getClaudeCodeSDKManager();

    // Send activity update
    StreamingTickerManager.broadcast({
      type: 'tool_activity',
      data: {
        tool: 'claude',
        action: 'initializing Claude Code SDK',
        timestamp: Date.now(),
        priority: 'high'
      }
    });

    const responses = await claudeCodeManager.createStreamingChat(message, options);

    console.log('🔍 Claude Code Responses:', JSON.stringify(responses, null, 2));

    // Extract the actual response content
    let responseContent = 'No response received';
    if (responses && responses.length > 0) {
      const lastResponse = responses[responses.length - 1];
      if (lastResponse.content) {
        responseContent = lastResponse.content;
      } else if (lastResponse.message) {
        responseContent = lastResponse.message;
      } else if (typeof lastResponse === 'string') {
        responseContent = lastResponse;
      }
    }

    // Send completion message
    StreamingTickerManager.broadcast({
      type: 'execution_complete',
      data: {
        message: 'Claude Code execution completed',
        timestamp: Date.now(),
        priority: 'high'
      }
    });

    res.json({
      success: true,
      message: responseContent,
      responses: responses,
      timestamp: new Date().toISOString(),
      claudeCode: true,
      toolsEnabled: true
    });

  } catch (error) {
    console.error('Claude Code streaming chat error:', error);

    // Send error message to ticker
    StreamingTickerManager.broadcast({
      type: 'tool_activity',
      data: {
        tool: 'error',
        action: `execution failed: ${error.message}`,
        timestamp: Date.now(),
        priority: 'critical'
      }
    });

    res.status(500).json({
      success: false,
      error: 'Claude Code processing failed. Please try again.',
      details: error.message
    });
  }
});

/**
 * POST /api/claude-code/background-task
 * Headless Claude Code execution
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

    const claudeCodeManager = getClaudeCodeSDKManager();
    const result = await claudeCodeManager.executeHeadlessTask(prompt, options);

    res.json({
      success: true,
      result: result,
      timestamp: new Date().toISOString(),
      mode: 'headless',
      claudeCode: true
    });

  } catch (error) {
    console.error('Claude Code background task error:', error);
    res.status(500).json({
      success: false,
      error: 'Background task failed',
      details: error.message
    });
  }
});

/**
 * POST /api/claude-code/session
 * Create new Claude Code session
 */
console.log('🔧 DEBUG: Registering POST /session route...');
router.post('/session', async (req, res) => {
  try {
    const { sessionId } = req.body;

    const claudeCodeManager = getClaudeCodeSDKManager();
    const session = claudeCodeManager.createSession(sessionId);

    res.json({
      success: true,
      session: session,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create session',
      details: error.message
    });
  }
});

/**
 * GET /api/claude-code/session/:sessionId
 * Get session information
 */
console.log('🔧 DEBUG: Registering GET /session/:sessionId route...');
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const claudeCodeManager = getClaudeCodeSDKManager();
    const session = claudeCodeManager.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      session: session,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Session retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session',
      details: error.message
    });
  }
});

/**
 * DELETE /api/claude-code/session/:sessionId
 * Close session
 */
console.log('🔧 DEBUG: Registering DELETE /session/:sessionId route...');
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const claudeCodeManager = getClaudeCodeSDKManager();
    const closed = claudeCodeManager.closeSession(sessionId);

    if (!closed) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      message: 'Session closed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Session closure error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to close session',
      details: error.message
    });
  }
});

/**
 * GET /api/claude-code/health
 * Health check with tool access verification
 */
console.log('🔧 DEBUG: Registering GET /health route...');
router.get('/health', async (req, res) => {
  try {
    const claudeCodeManager = getClaudeCodeSDKManager();
    const isHealthy = await claudeCodeManager.healthCheck();

    res.json({
      success: true,
      healthy: isHealthy,
      timestamp: new Date().toISOString(),
      toolsEnabled: isHealthy,
      claudeCode: true
    });

  } catch (error) {
    console.error('Claude Code health check error:', error);
    res.status(500).json({
      success: false,
      healthy: false,
      error: 'Health check failed',
      details: error.message
    });
  }
});

/**
 * GET /api/claude-code/status
 * Get comprehensive system status
 */
console.log('🔧 DEBUG: Registering GET /status route...');
router.get('/status', async (req, res) => {
  try {
    const claudeCodeManager = getClaudeCodeSDKManager();
    const status = claudeCodeManager.getStatus();

    res.json({
      success: true,
      status: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Status check failed',
      details: error.message
    });
  }
});

export default router;