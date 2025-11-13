import express from 'express';
import { getClaudeAuthManager } from '../../services/auth/ClaudeAuthManager.js';
import { encryptApiKey, isValidApiKey } from '../../services/auth/ApiKeyEncryption.cjs';
import { checkOAuthAvailability } from '../../services/auth/OAuthTokenExtractor.js';

const router = express.Router();

/**
 * GET /api/claude-code/auth-settings
 * Get current authentication configuration for a user
 */
router.get('/auth-settings', async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId || 'demo-user-123';
    const authManager = getClaudeAuthManager(req.app.locals.db);
    const config = await authManager.getAuthConfig(userId);

    res.json({
      method: config.method,
      hasApiKey: config.method === 'user_api_key' && !!config.apiKey
    });
  } catch (error) {
    console.error('Error getting auth config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/claude-code/auth-settings
 * Update authentication configuration
 */
router.post('/auth-settings', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId || 'demo-user-123';
    const { method, apiKey } = req.body;

    // Validate method
    if (!['oauth', 'user_api_key', 'platform_payg'].includes(method)) {
      return res.status(400).json({ error: 'Invalid auth method' });
    }

    // Validate API key if method is user_api_key
    if (method === 'user_api_key') {
      if (!apiKey || !isValidApiKey(apiKey)) {
        return res.status(400).json({
          error: 'Invalid API key format. Expected format: sk-ant-api03-[95 chars]AA'
        });
      }
    }

    // Encrypt API key if provided
    const encryptedKey = method === 'user_api_key' ? encryptApiKey(apiKey) : null;

    // Update database
    const authManager = getClaudeAuthManager(req.app.locals.db);
    await authManager.setAuthMethod(userId, method, encryptedKey);

    res.json({
      success: true,
      method,
      message: `Authentication method updated to ${method}`
    });
  } catch (error) {
    console.error('Error updating auth config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/claude-code/oauth-check
 * Check if OAuth tokens are available in the environment
 */
router.get('/oauth-check', async (req, res) => {
  try {
    const status = await checkOAuthAvailability();
    res.json(status);
  } catch (error) {
    console.error('Error checking OAuth availability:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/claude-code/billing
 * Get billing summary for a user
 */
router.get('/billing', async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId || 'demo-user-123';
    const authManager = getClaudeAuthManager(req.app.locals.db);

    const summary = await authManager.getBillingSummary(userId);

    res.json(summary);
  } catch (error) {
    console.error('Error getting billing summary:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/claude-code/auth-settings
 * Remove user's custom API key and reset to platform_payg
 */
router.delete('/auth-settings', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId || req.query.userId || 'demo-user-123';
    const authManager = getClaudeAuthManager(req.app.locals.db);

    // Reset to platform_payg with no API key
    await authManager.setAuthMethod(userId, 'platform_payg', null);

    res.json({
      success: true,
      method: 'platform_payg',
      message: 'Authentication reset to platform pay-as-you-go'
    });
  } catch (error) {
    console.error('Error deleting auth config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/claude-code/oauth/authorize
 * Initiate OAuth-style authorization flow
 *
 * NOTE: Anthropic doesn't currently offer public OAuth.
 * This implements a consent-based flow that stores API keys as "tokens"
 * in a format compatible with future real OAuth implementation.
 */
router.get('/oauth/authorize', (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId || 'demo-user-123';

    // In a real OAuth flow, we would redirect to Anthropic's authorization server
    // Since that doesn't exist yet, we redirect to our consent page
    const consentUrl = new URL('/oauth-consent', process.env.APP_URL || 'http://localhost:3000');
    consentUrl.searchParams.set('client_id', 'agent-feed-platform');
    consentUrl.searchParams.set('redirect_uri', `${process.env.APP_URL || 'http://localhost:3000'}/api/claude-code/oauth/callback`);
    consentUrl.searchParams.set('response_type', 'code');
    consentUrl.searchParams.set('scope', 'inference');
    consentUrl.searchParams.set('state', userId);

    res.redirect(consentUrl.toString());
  } catch (error) {
    console.error('OAuth authorize error:', error);
    res.redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * GET /api/claude-code/oauth/callback
 * Handle OAuth callback with authorization code
 *
 * This accepts either:
 * 1. A real OAuth code (future-ready)
 * 2. An API key directly (current implementation)
 */
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state: userId, error, api_key } = req.query;

    if (error) {
      return res.redirect(`/settings?error=${encodeURIComponent(error)}`);
    }

    if (!userId) {
      return res.redirect('/settings?error=Missing+user+state');
    }

    const authManager = getClaudeAuthManager(req.app.locals.db);

    // Option 1: Real OAuth code exchange (future implementation)
    if (code && !api_key) {
      // When Anthropic releases OAuth, this will exchange the code for tokens
      // For now, treat the code as a session identifier
      return res.redirect('/settings?oauth=pending&message=OAuth+not+yet+supported+by+Anthropic');
    }

    // Option 2: Direct API key (current implementation)
    if (api_key) {
      // Validate API key format
      if (!isValidApiKey(api_key)) {
        return res.redirect('/settings?error=Invalid+API+key+format');
      }

      // Encrypt and store as OAuth token
      const encryptedKey = encryptApiKey(api_key);
      await authManager.setAuthMethod(userId, 'oauth', encryptedKey, {
        token_type: 'api_key',
        scope: 'inference',
        created_at: new Date().toISOString()
      });

      return res.redirect('/settings?oauth=success&message=API+key+connected');
    }

    // No valid authorization data
    res.redirect('/settings?error=Missing+authorization+data');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * POST /api/claude-code/oauth/token
 * Token endpoint for OAuth flow
 *
 * Future-ready endpoint for when Anthropic implements OAuth
 * Currently accepts API keys as bearer tokens
 */
router.post('/oauth/token', async (req, res) => {
  try {
    const { grant_type, code, api_key, user_id } = req.body;

    if (grant_type !== 'authorization_code' && grant_type !== 'api_key') {
      return res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code and api_key grant types are supported'
      });
    }

    // Future: Exchange authorization code for access token
    if (grant_type === 'authorization_code' && code) {
      return res.status(501).json({
        error: 'not_implemented',
        error_description: 'OAuth code exchange not yet supported by Anthropic',
        documentation_url: '/docs/oauth-implementation-analysis.md'
      });
    }

    // Current: Accept API key directly
    if (grant_type === 'api_key' && api_key) {
      if (!isValidApiKey(api_key)) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'Invalid API key format'
        });
      }

      const userId = user_id || 'demo-user-123';
      const encryptedKey = encryptApiKey(api_key);
      const authManager = getClaudeAuthManager(req.app.locals.db);

      await authManager.setAuthMethod(userId, 'oauth', encryptedKey, {
        token_type: 'Bearer',
        scope: 'inference',
        created_at: new Date().toISOString()
      });

      return res.json({
        access_token: api_key,
        token_type: 'Bearer',
        scope: 'inference',
        note: 'API key stored as OAuth token for future compatibility'
      });
    }

    res.status(400).json({
      error: 'invalid_request',
      error_description: 'Missing required parameters'
    });
  } catch (error) {
    console.error('Token endpoint error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: error.message
    });
  }
});

/**
 * DELETE /api/claude-code/oauth/revoke
 * Revoke OAuth tokens (disconnect OAuth)
 */
router.delete('/oauth/revoke', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId || req.query.userId || 'demo-user-123';
    const authManager = getClaudeAuthManager(req.app.locals.db);

    // Reset to platform_payg
    await authManager.setAuthMethod(userId, 'platform_payg', null);

    res.json({
      success: true,
      message: 'OAuth tokens revoked, reset to platform pay-as-you-go'
    });
  } catch (error) {
    console.error('Token revocation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/claude-code/oauth/detect-cli
 * Detect Claude CLI login and return encrypted API key
 *
 * This endpoint checks if the user is logged into Claude CLI
 * and returns the encrypted API key for automatic authentication.
 */
router.get('/oauth/detect-cli', async (req, res) => {
  try {
    // Import OAuthTokenExtractor functions
    const { checkOAuthAvailability, extractApiKeyFromCLI } = await import('../../services/auth/OAuthTokenExtractor.js');

    // Check for OAuth tokens first
    const oauthStatus = await checkOAuthAvailability();

    if (oauthStatus.available && oauthStatus.method === 'cli_credentials') {
      // OAuth tokens found - return detection result WITHOUT exposing actual token
      return res.json({
        detected: true,
        method: 'oauth',
        email: oauthStatus.subscriptionType || 'Unknown',
        message: 'Claude CLI OAuth login detected'
      });
    }

    // Fallback: Check for API key in config.json
    const apiKeyResult = await extractApiKeyFromCLI();

    if (apiKeyResult.available && apiKeyResult.apiKey) {
      // Encrypt the API key before sending to frontend
      const encryptedKey = encryptApiKey(apiKeyResult.apiKey);

      return res.json({
        detected: true,
        method: 'api_key',
        encryptedKey: encryptedKey,
        email: apiKeyResult.email || 'Unknown',
        message: 'Claude CLI API key detected and encrypted'
      });
    }

    // No CLI authentication found
    res.json({
      detected: false,
      message: 'No Claude CLI authentication found'
    });

  } catch (error) {
    console.error('CLI detection error:', error);
    res.status(500).json({
      detected: false,
      error: error.message
    });
  }
});

/**
 * POST /api/claude-code/oauth/auto-connect
 * Auto-connect OAuth using CLI credentials
 *
 * This endpoint extracts the OAuth token from Claude CLI credentials
 * and stores it in the database for the user.
 */
router.post('/oauth/auto-connect', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId || 'demo-user-123';

    console.log(`🔗 [OAUTH AUTO-CONNECT] Starting for user: ${userId}`);

    // Import OAuthTokenExtractor functions
    const { checkOAuthAvailability, extractOAuthToken } = await import('../../services/auth/OAuthTokenExtractor.js');

    // First, check for OAuth tokens in CLI credentials
    const oauthStatus = await checkOAuthAvailability();
    console.log(`🔍 [OAUTH AUTO-CONNECT] CLI OAuth status:`, {
      available: oauthStatus.available,
      method: oauthStatus.method,
      subscription: oauthStatus.subscriptionType
    });

    if (oauthStatus.available && oauthStatus.method === 'cli_credentials') {
      // Extract the actual OAuth token
      const tokenData = await extractOAuthToken();

      if (!tokenData || !tokenData.accessToken) {
        return res.status(400).json({
          success: false,
          error: 'OAuth token extraction failed',
          message: 'Could not extract access token from CLI credentials'
        });
      }

      console.log(`✅ [OAUTH AUTO-CONNECT] Token extracted, length: ${tokenData.accessToken.length}`);

      // Get auth manager
      const authManager = getClaudeAuthManager(req.app.locals.db);

      // Store OAuth token and metadata in database
      await authManager.setAuthMethod(userId, 'oauth', {
        oauthToken: tokenData.accessToken,
        oauthRefreshToken: tokenData.refreshToken || null,
        oauthExpiresAt: tokenData.expiresAt || null,
        oauthTokens: {
          token_type: 'cli_oauth',
          scope: 'inference',
          subscription: oauthStatus.subscriptionType || 'unknown',
          created_at: new Date().toISOString(),
          source: 'claude_cli_auto_connect'
        }
      });

      console.log(`💾 [OAUTH AUTO-CONNECT] Token stored in database for user: ${userId}`);

      return res.json({
        success: true,
        method: 'oauth',
        subscription: oauthStatus.subscriptionType,
        message: `Connected via Claude CLI OAuth successfully (${oauthStatus.subscriptionType} subscription)`
      });
    }

    // Fallback: Check for API key in config.json
    const { extractApiKeyFromCLI } = await import('../../services/auth/OAuthTokenExtractor.js');
    const apiKeyResult = await extractApiKeyFromCLI();

    if (apiKeyResult.available && apiKeyResult.apiKey) {
      console.log(`🔑 [OAUTH AUTO-CONNECT] Using API key from CLI config`);

      const encryptedKey = encryptApiKey(apiKeyResult.apiKey);
      const authManager = getClaudeAuthManager(req.app.locals.db);

      await authManager.setAuthMethod(userId, 'oauth', {
        oauthToken: encryptedKey,
        oauthTokens: {
          token_type: 'api_key',
          scope: 'inference',
          email: apiKeyResult.email || 'unknown',
          created_at: new Date().toISOString(),
          source: 'claude_cli_api_key'
        }
      });

      console.log(`💾 [OAUTH AUTO-CONNECT] API key stored as OAuth for user: ${userId}`);

      return res.json({
        success: true,
        method: 'oauth',
        email: apiKeyResult.email,
        message: 'Connected via Claude CLI API key successfully'
      });
    }

    // No CLI credentials found
    console.error(`❌ [OAUTH AUTO-CONNECT] No CLI credentials found for user: ${userId}`);
    return res.status(400).json({
      success: false,
      error: 'Claude CLI not detected or not logged in',
      message: 'Please login to Claude CLI first: claude login'
    });

  } catch (error) {
    console.error('❌ [OAUTH AUTO-CONNECT] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to auto-connect OAuth'
    });
  }
});

/**
 * GET /api/claude-code/test
 * Test endpoint to verify routes are working
 */
router.get('/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Claude Auth API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      oauth_authorize: '/api/claude-code/oauth/authorize',
      oauth_callback: '/api/claude-code/oauth/callback',
      oauth_token: '/api/claude-code/oauth/token',
      oauth_revoke: '/api/claude-code/oauth/revoke',
      oauth_detect_cli: '/api/claude-code/oauth/detect-cli',
      oauth_auto_connect: '/api/claude-code/oauth/auto-connect'
    }
  });
});

export default router;
