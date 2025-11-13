/**
 * ClaudeAuthManager - Manages authentication for Claude API SDK
 *
 * Supports three authentication methods:
 * 1. OAuth (permissionMode: 'ask') - User approves each action via UI
 * 2. User API Key (permissionMode: 'bypassPermissions') - User provides their own Claude API key
 * 3. Platform Pay-as-you-go (permissionMode: 'bypassPermissions') - Platform's API key with usage tracking
 *
 * CRITICAL: For OAuth to work, we MUST delete process.env.ANTHROPIC_API_KEY
 * so the SDK doesn't default to API key auth.
 *
 * Matches TDD contract from ClaudeAuthManager.test.cjs
 */

const { decryptApiKey } = require('./ApiKeyEncryption.cjs');

class ClaudeAuthManager {
  constructor(db) {
    this.db = db;
    this.originalEnvKey = null;
  }

  /**
   * Get authentication configuration for a user
   * @param {number} userId - User identifier
   * @returns {Promise<Object|null>} Auth config or null if not found
   */
  async getAuthConfig(userId) {
    const row = this.db.prepare(`
      SELECT auth_method, encrypted_api_key, oauth_token, oauth_refresh_token, oauth_expires_at
      FROM user_claude_auth
      WHERE user_id = ?
    `).get(userId);

    if (!row) {
      return null;
    }

    return {
      authMethod: row.auth_method,
      encryptedApiKey: row.encrypted_api_key || undefined,
      oauthToken: row.oauth_token || undefined,
      oauthRefreshToken: row.oauth_refresh_token || undefined,
      oauthExpiresAt: row.oauth_expires_at || undefined
    };
  }

  /**
   * Prepare SDK authentication by manipulating environment variables
   * CRITICAL: For OAuth, we DELETE process.env.ANTHROPIC_API_KEY
   *
   * @param {number} userId - User identifier
   * @returns {Promise<Object>} SDK config with auth method and credentials
   */
  async prepareSDKAuth(userId) {
    const authConfig = await this.getAuthConfig(userId);

    if (!authConfig) {
      throw new Error('No authentication configuration found for user');
    }

    // Save original environment key for restoration
    this.originalEnvKey = process.env.ANTHROPIC_API_KEY;

    if (authConfig.authMethod === 'oauth') {
      // CRITICAL: DELETE API key so SDK uses OAuth instead
      delete process.env.ANTHROPIC_API_KEY;

      return {
        authMethod: 'oauth',
        oauthToken: authConfig.oauthToken,
        oauthRefreshToken: authConfig.oauthRefreshToken,
        oauthExpiresAt: authConfig.oauthExpiresAt,
        originalEnvKey: this.originalEnvKey
      };
    } else if (authConfig.authMethod === 'user_api_key') {
      // Decrypt and use user's API key
      const apiKey = decryptApiKey(authConfig.encryptedApiKey);

      return {
        authMethod: 'user_api_key',
        apiKey: apiKey,
        originalEnvKey: this.originalEnvKey
      };
    } else if (authConfig.authMethod === 'platform_payg') {
      // Use platform's API key
      return {
        authMethod: 'platform_payg',
        apiKey: process.env.CLAUDE_PLATFORM_KEY,
        platformBillingEnabled: true,
        originalEnvKey: this.originalEnvKey
      };
    }

    throw new Error(`Unknown auth method: ${authConfig.authMethod}`);
  }

  /**
   * Restore SDK authentication to original platform state
   * Call this after SDK operations complete to reset environment
   *
   * @param {Object} sdkConfig - Config object returned from prepareSDKAuth
   */
  restoreSDKAuth(sdkConfig) {
    if (sdkConfig && sdkConfig.originalEnvKey) {
      process.env.ANTHROPIC_API_KEY = sdkConfig.originalEnvKey;
    } else {
      // If there was no original key, keep it deleted
      delete process.env.ANTHROPIC_API_KEY;
    }
    this.originalEnvKey = null;
  }

  /**
   * Track usage for billing
   *
   * @param {number} userId - User identifier
   * @param {Object} usageData - Usage data {authMethod, inputTokens, outputTokens, costUsd}
   */
  async trackUsage(userId, usageData) {
    return new Promise((resolve, reject) => {
      try {
        this.db.prepare(`
          INSERT INTO usage_billing (user_id, auth_method, input_tokens, output_tokens, cost_usd)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          userId,
          usageData.authMethod,
          usageData.inputTokens,
          usageData.outputTokens,
          usageData.costUsd
        );
        resolve();
      } catch (error) {
        // Check if it's a FOREIGN KEY constraint error
        if (error.message && error.message.includes('FOREIGN KEY constraint failed')) {
          reject(new Error('FOREIGN KEY constraint failed'));
        } else {
          reject(error);
        }
      }
    });
  }

  /**
   * Get billing metrics for a user
   *
   * @param {number} userId - User identifier
   * @returns {Promise<Object>} Billing metrics
   */
  async getBillingMetrics(userId) {
    const row = this.db.prepare(`
      SELECT
        COALESCE(SUM(input_tokens), 0) as totalInputTokens,
        COALESCE(SUM(output_tokens), 0) as totalOutputTokens,
        COALESCE(SUM(cost_usd), 0) as totalCostUsd,
        COALESCE(COUNT(*), 0) as requestCount
      FROM usage_billing
      WHERE user_id = ?
    `).get(userId);

    return {
      totalInputTokens: row.totalInputTokens || 0,
      totalOutputTokens: row.totalOutputTokens || 0,
      totalCostUsd: row.totalCostUsd || 0,
      requestCount: row.requestCount || 0
    };
  }

  /**
   * Set authentication method for a user
   *
   * @param {string} userId - User identifier
   * @param {string} method - Auth method: 'oauth', 'user_api_key', or 'platform_payg'
   * @param {string|null} encryptedApiKey - Encrypted API key (for user_api_key method)
   * @param {Object|null} oauthTokens - OAuth tokens object (for oauth method)
   * @returns {Promise<Object>} Result with method and success status
   */
  async setAuthMethod(userId, method, encryptedApiKey = null, oauthTokens = null) {
    // Validate method
    if (!['oauth', 'user_api_key', 'platform_payg'].includes(method)) {
      throw new Error(`Invalid auth method: ${method}`);
    }

    // Check if user_claude_auth record exists
    const existing = this.db.prepare(`
      SELECT * FROM user_claude_auth WHERE user_id = ?
    `).get(userId);

    const now = Date.now();

    if (existing) {
      // Update existing
      this.db.prepare(`
        UPDATE user_claude_auth
        SET auth_method = ?,
            encrypted_api_key = ?,
            oauth_tokens = ?,
            updated_at = ?
        WHERE user_id = ?
      `).run(
        method,
        encryptedApiKey,
        oauthTokens ? JSON.stringify(oauthTokens) : null,
        now,
        userId
      );
    } else {
      // Insert new
      this.db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, encrypted_api_key, oauth_tokens, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        userId,
        method,
        encryptedApiKey,
        oauthTokens ? JSON.stringify(oauthTokens) : null,
        now
      );
    }

    return { method, success: true };
  }

  /**
   * Get billing summary for a user
   *
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} Billing summary with totals
   */
  async getBillingSummary(userId) {
    const summary = this.db.prepare(`
      SELECT * FROM usage_billing_summary WHERE user_id = ?
    `).get(userId);

    if (!summary) {
      return {
        user_id: userId,
        total_tokens_input: 0,
        total_tokens_output: 0,
        total_cost_usd: 0,
        request_count: 0
      };
    }

    return summary;
  }
}

module.exports = ClaudeAuthManager;
