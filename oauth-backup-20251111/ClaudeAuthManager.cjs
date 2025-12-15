/**
 * CommonJS wrapper for ClaudeAuthManager
 * Used by Jest tests which don't support ESM well
 */

/**
 * Claude Authentication Manager
 * Handles multiple authentication methods for Claude API access:
 * - oauth: OAuth 2.0 authentication with Anthropic
 * - user_api_key: User provides their own API key
 * - platform_payg (Platform Pay-As-You-Go): Uses platform's API key with billing
 */

class ClaudeAuthManager {
  constructor(db) {
    this.db = db;
    this.originalEnv = {};
  }

  /**
   * Get user's authentication configuration
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Auth config with method, apiKey, and tracking settings
   */
  async getAuthConfig(userId) {
    try {
      // Query user_claude_auth table (migration 018)
      const userAuth = this.db.prepare(
        `SELECT auth_method, encrypted_api_key, oauth_token, oauth_refresh_token,
                oauth_expires_at, oauth_tokens
         FROM user_claude_auth
         WHERE user_id = ?`
      ).get(userId);

      if (!userAuth) {
        // Default to platform PAYG for new users
        return {
          method: 'platform_payg',
          apiKey: process.env.ANTHROPIC_API_KEY,
          trackUsage: true,
          permissionMode: 'bypassPermissions'
        };
      }

      // Determine auth method and configuration
      const authMethod = userAuth.auth_method;

      let config = {
        method: authMethod,
        trackUsage: false,
        permissionMode: 'bypassPermissions'
      };

      switch (authMethod) {
        case 'oauth':
          // OAuth authentication with fallback
          // ⚠️ IMPORTANT: OAuth tokens (sk-ant-oat01-...) cannot be used with Claude Code SDK
          // The SDK requires regular API keys (sk-ant-api03-...)
          // SOLUTION: Fall back to platform API key for SDK calls
          console.log(`🔐 OAuth user detected: ${userId}`);
          console.warn(`⚠️ OAuth tokens cannot be used with Claude Code SDK - falling back to platform API key`);

          config.oauthToken = userAuth.oauth_token;
          config.oauthRefreshToken = userAuth.oauth_refresh_token;
          config.oauthExpiresAt = userAuth.oauth_expires_at;
          config.oauthTokens = userAuth.oauth_tokens ? JSON.parse(userAuth.oauth_tokens) : null;
          config.apiKey = process.env.ANTHROPIC_API_KEY; // Use platform key for SDK compatibility
          config.trackUsage = true; // Track usage since using platform key
          config.oauthFallback = true; // Flag that this is an OAuth user using platform key
          break;

        case 'user_api_key':
          // User brings their own Claude API key
          config.apiKey = userAuth.encrypted_api_key;
          config.trackUsage = false; // No billing tracking needed
          config.permissionMode = 'bypassPermissions';
          break;

        case 'platform_payg':
          // Platform provides API key and bills user
          config.apiKey = process.env.ANTHROPIC_API_KEY;
          config.trackUsage = true;
          config.permissionMode = 'bypassPermissions';
          break;

        default:
          throw new Error(`Unknown auth method: ${authMethod}`);
      }

      return config;
    } catch (error) {
      console.error('Error getting auth config:', error);
      throw error;
    }
  }

  /**
   * Prepare SDK authentication environment
   * @param {Object} authConfig - Auth configuration from getAuthConfig
   * @returns {Object} SDK options with permission mode
   */
  prepareSDKAuth(authConfig) {
    // Save original environment
    this.originalEnv.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    // Set the API key for this request
    if (authConfig.apiKey) {
      process.env.ANTHROPIC_API_KEY = authConfig.apiKey;
    } else {
      // No API key - delete env var to prevent SDK from using wrong key
      delete process.env.ANTHROPIC_API_KEY;
    }

    console.log(`🔐 Auth prepared: ${authConfig.method} (tracking: ${authConfig.trackUsage})`);

    return {
      permissionMode: authConfig.permissionMode,
      method: authConfig.method
    };
  }

  /**
   * Restore original SDK authentication environment
   * @param {Object} authConfig - Auth configuration used
   */
  restoreSDKAuth(authConfig) {
    // Restore original environment
    if (this.originalEnv.ANTHROPIC_API_KEY !== undefined) {
      process.env.ANTHROPIC_API_KEY = this.originalEnv.ANTHROPIC_API_KEY;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }

    console.log(`🔓 Auth restored from ${authConfig.method || 'unknown'}`);
  }

  /**
   * Track API usage for billing
   * @param {string} userId - User ID
   * @param {Object} tokens - Token metrics {input, output, total}
   * @param {number} cost - Calculated cost in USD
   * @param {string} sessionId - Optional session ID
   * @param {string} model - Optional model name
   */
  async trackUsage(userId, tokens, cost, sessionId = null, model = null) {
    try {
      // Get auth method for tracking
      const authInfo = this.db.prepare(
        'SELECT auth_method FROM user_claude_auth WHERE user_id = ?'
      ).get(userId);

      // Generate unique ID for usage record
      const usageId = `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Insert usage record into billing table
      this.db.prepare(
        `INSERT INTO usage_billing
         (id, user_id, auth_method, input_tokens, output_tokens, cost_usd, session_id, model, created_at, billed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
      ).run(
        usageId,
        userId,
        authInfo?.auth_method || 'platform_payg',
        tokens.input,
        tokens.output,
        cost,
        sessionId,
        model,
        Date.now()
      );

      console.log(`💰 Usage tracked: ${userId} - $${cost.toFixed(4)} (${tokens.input + tokens.output} tokens)`);
    } catch (error) {
      console.error('Error tracking usage:', error);
      // Don't throw - usage tracking failure shouldn't break the request
    }
  }

  /**
   * Get user's current usage and limits
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Usage statistics
   */
  async getUserUsage(userId) {
    try {
      // Get auth method
      const authInfo = this.db.prepare(
        'SELECT auth_method FROM user_claude_auth WHERE user_id = ?'
      ).get(userId);

      // Get usage statistics from billing table
      const stats = this.db.prepare(
        `SELECT
           COUNT(*) as total_requests,
           SUM(input_tokens) as total_input_tokens,
           SUM(output_tokens) as total_output_tokens,
           SUM(cost_usd) as total_cost,
           SUM(CASE WHEN billed = 0 THEN cost_usd ELSE 0 END) as unbilled_cost
         FROM usage_billing
         WHERE user_id = ?`
      ).get(userId);

      return {
        method: authInfo?.auth_method || 'platform_payg',
        totalRequests: stats?.total_requests || 0,
        totalInputTokens: stats?.total_input_tokens || 0,
        totalOutputTokens: stats?.total_output_tokens || 0,
        totalTokens: (stats?.total_input_tokens || 0) + (stats?.total_output_tokens || 0),
        totalCost: stats?.total_cost || 0,
        unbilledCost: stats?.unbilled_cost || 0
      };
    } catch (error) {
      console.error('Error getting user usage:', error);
      throw error;
    }
  }

  /**
   * Update user's authentication method
   * @param {string} userId - User ID
   * @param {string} method - Auth method (oauth, user_api_key, platform_payg)
   * @param {Object} options - Additional options like apiKey, oauthToken, etc.
   */
  async updateAuthMethod(userId, method, options = {}) {
    try {
      const validMethods = ['oauth', 'user_api_key', 'platform_payg'];
      if (!validMethods.includes(method)) {
        throw new Error(`Invalid auth method: ${method}. Must be one of: ${validMethods.join(', ')}`);
      }

      const now = Date.now();

      // Check if user auth record exists
      const existing = this.db.prepare(
        'SELECT user_id FROM user_claude_auth WHERE user_id = ?'
      ).get(userId);

      if (existing) {
        // Update existing auth record
        if (method === 'user_api_key') {
          this.db.prepare(
            `UPDATE user_claude_auth
             SET auth_method = ?,
                 encrypted_api_key = ?,
                 updated_at = ?
             WHERE user_id = ?`
          ).run(method, options.apiKey || null, now, userId);
        } else if (method === 'oauth') {
          this.db.prepare(
            `UPDATE user_claude_auth
             SET auth_method = ?,
                 oauth_token = ?,
                 oauth_refresh_token = ?,
                 oauth_expires_at = ?,
                 oauth_tokens = ?,
                 updated_at = ?
             WHERE user_id = ?`
          ).run(
            method,
            options.oauthToken || null,
            options.oauthRefreshToken || null,
            options.oauthExpiresAt || null,
            options.oauthTokens ? JSON.stringify(options.oauthTokens) : null,
            now,
            userId
          );
        } else {
          // platform_payg
          this.db.prepare(
            `UPDATE user_claude_auth
             SET auth_method = ?,
                 updated_at = ?
             WHERE user_id = ?`
          ).run(method, now, userId);
        }
      } else {
        // Insert new auth record
        if (method === 'user_api_key') {
          this.db.prepare(
            `INSERT INTO user_claude_auth
             (user_id, auth_method, encrypted_api_key, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)`
          ).run(userId, method, options.apiKey || null, now, now);
        } else if (method === 'oauth') {
          this.db.prepare(
            `INSERT INTO user_claude_auth
             (user_id, auth_method, oauth_token, oauth_refresh_token, oauth_expires_at, oauth_tokens, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            userId,
            method,
            options.oauthToken || null,
            options.oauthRefreshToken || null,
            options.oauthExpiresAt || null,
            options.oauthTokens ? JSON.stringify(options.oauthTokens) : null,
            now,
            now
          );
        } else {
          // platform_payg
          this.db.prepare(
            `INSERT INTO user_claude_auth
             (user_id, auth_method, created_at, updated_at)
             VALUES (?, ?, ?, ?)`
          ).run(userId, method, now, now);
        }
      }

      console.log(`✅ Auth method updated: ${userId} -> ${method}`);
    } catch (error) {
      console.error('Error updating auth method:', error);
      throw error;
    }
  }

  /**
   * Validate API key format
   * @param {string} apiKey - API key to validate
   * @returns {boolean} True if valid format
   */
  validateApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    // Anthropic API keys start with 'sk-ant-'
    return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
  }
}

module.exports = { ClaudeAuthManager };
