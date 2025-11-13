import { decryptApiKey } from './ApiKeyEncryption.cjs';

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
 */
class ClaudeAuthManager {
  constructor(db) {
    this.db = db;
    this.originalApiKey = null;
  }

  /**
   * Get authentication configuration for a user
   * @param {string} userId - User identifier
   * @returns {Promise<{method: string, apiKey: string|null, trackUsage: boolean}>}
   */
  async getAuthConfig(userId) {
    const settings = this.db.prepare(`
      SELECT auth_method, encrypted_api_key, oauth_token, oauth_expires_at
      FROM user_claude_auth
      WHERE user_id = ?
    `).get(userId);

    if (!settings) {
      // Default to platform pay-as-you-go for new users
      return {
        method: 'platform_payg',
        apiKey: process.env.ANTHROPIC_API_KEY,
        trackUsage: true
      };
    }

    const method = settings.auth_method || 'platform_payg';

    if (method === 'oauth') {
      // Check OAuth token expiration
      if (settings.oauth_expires_at && settings.oauth_expires_at < Date.now()) {
        throw new Error('OAuth token expired. Please re-authenticate.');
      }
      return {
        method: 'oauth',
        apiKey: null,
        oauthToken: settings.oauth_token,
        trackUsage: false
      };
    } else if (method === 'user_api_key') {
      const decryptedKey = decryptApiKey(settings.encrypted_api_key);
      return {
        method: 'user_api_key',
        apiKey: decryptedKey,
        trackUsage: false
      };
    } else {
      // platform_payg
      return {
        method: 'platform_payg',
        apiKey: process.env.ANTHROPIC_API_KEY,
        trackUsage: true
      };
    }
  }

  /**
   * Prepare SDK authentication by manipulating environment variables
   * CRITICAL: For OAuth, we DELETE process.env.ANTHROPIC_API_KEY
   *
   * @param {{method: string, apiKey: string|null, trackUsage: boolean}} authConfig
   * @returns {{permissionMode: string, authConfig: object}}
   */
  prepareSDKAuth(authConfig) {
    // Save original platform key for restoration
    this.originalApiKey = process.env.ANTHROPIC_API_KEY;

    if (authConfig.method === 'oauth') {
      // CRITICAL: DELETE API key so SDK uses OAuth instead
      // Without this, the SDK will default to API key authentication
      delete process.env.ANTHROPIC_API_KEY;
      return {
        permissionMode: 'ask', // User approves actions via UI
        authConfig
      };
    } else if (authConfig.method === 'user_api_key') {
      // Set user's API key temporarily
      process.env.ANTHROPIC_API_KEY = authConfig.apiKey;
      return {
        permissionMode: 'bypassPermissions', // No approval needed, user's key
        authConfig
      };
    } else {
      // Use platform key (already set in environment)
      return {
        permissionMode: 'bypassPermissions', // No approval needed, platform pays
        authConfig
      };
    }
  }

  /**
   * Restore SDK authentication to original platform state
   * Call this after SDK operations complete to reset environment
   *
   * @param {{method: string}} authConfig
   */
  restoreSDKAuth(authConfig) {
    if (this.originalApiKey) {
      process.env.ANTHROPIC_API_KEY = this.originalApiKey;
      this.originalApiKey = null;
    }
  }

  /**
   * Track usage for platform pay-as-you-go billing
   *
   * @param {string} userId - User identifier
   * @param {{input: number, output: number}} tokens - Token counts
   * @param {number} cost - Cost in USD
   * @param {{sessionId?: string, model?: string}} metadata - Additional metadata
   */
  async trackUsage(userId, tokens, cost, metadata = {}) {
    if (!userId) return;

    const id = `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.db.prepare(`
      INSERT INTO usage_billing (
        id, user_id, input_tokens, output_tokens,
        cost_usd, session_id, model, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      tokens.input,
      tokens.output,
      cost,
      metadata.sessionId || null,
      metadata.model || null,
      Date.now()
    );
  }

  /**
   * Set authentication method for a user
   * @param {string} userId - User identifier
   * @param {string} method - Auth method (oauth, user_api_key, platform_payg)
   * @param {string|null} encryptedKey - Encrypted API key (for user_api_key method)
   */
  async setAuthMethod(userId, method, options = {}) {
    const validMethods = ['oauth', 'user_api_key', 'platform_payg'];
    if (!validMethods.includes(method)) {
      throw new Error(`Invalid auth method: ${method}. Must be one of: ${validMethods.join(', ')}`);
    }

    const now = Date.now();

    // Check if user auth record exists
    const existing = this.db.prepare(`
      SELECT user_id FROM user_claude_auth WHERE user_id = ?
    `).get(userId);

    if (existing) {
      // Update existing auth record
      if (method === 'user_api_key') {
        this.db.prepare(`
          UPDATE user_claude_auth
          SET auth_method = ?, encrypted_api_key = ?, updated_at = ?
          WHERE user_id = ?
        `).run(method, options.encryptedKey || null, now, userId);
      } else if (method === 'oauth') {
        this.db.prepare(`
          UPDATE user_claude_auth
          SET auth_method = ?, oauth_token = ?, oauth_refresh_token = ?,
              oauth_expires_at = ?, oauth_tokens = ?, updated_at = ?
          WHERE user_id = ?
        `).run(
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
        this.db.prepare(`
          UPDATE user_claude_auth
          SET auth_method = ?, updated_at = ?
          WHERE user_id = ?
        `).run(method, now, userId);
      }
    } else {
      // Insert new auth record
      if (method === 'user_api_key') {
        this.db.prepare(`
          INSERT INTO user_claude_auth
          (user_id, auth_method, encrypted_api_key, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(userId, method, options.encryptedKey || null, now, now);
      } else if (method === 'oauth') {
        this.db.prepare(`
          INSERT INTO user_claude_auth
          (user_id, auth_method, oauth_token, oauth_refresh_token, oauth_expires_at, oauth_tokens, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
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
        this.db.prepare(`
          INSERT INTO user_claude_auth
          (user_id, auth_method, created_at, updated_at)
          VALUES (?, ?, ?, ?)
        `).run(userId, method, now, now);
      }
    }

    console.log(`✅ Auth method updated: ${userId} -> ${method}`);
  }

  /**
   * Get billing summary for a user
   * @param {string} userId - User identifier
   * @returns {Object} Billing summary
   */
  getBillingSummary(userId) {
    const result = this.db.prepare(`
      SELECT
        SUM(input_tokens) as totalInput,
        SUM(output_tokens) as totalOutput,
        SUM(cost_usd) as totalCost,
        COUNT(*) as requestCount
      FROM usage_billing
      WHERE user_id = ?
    `).get(userId);

    return result || {
      totalInput: 0,
      totalOutput: 0,
      totalCost: 0,
      requestCount: 0
    };
  }
}

// Singleton instance
let authManagerInstance = null;

/**
 * Get or create ClaudeAuthManager singleton
 * @param {object} db - Database instance
 * @returns {ClaudeAuthManager}
 */
export function getClaudeAuthManager(db) {
  if (!authManagerInstance && db) {
    authManagerInstance = new ClaudeAuthManager(db);
  }
  return authManagerInstance;
}

export { ClaudeAuthManager };
