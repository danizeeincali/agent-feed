import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * OAuth Token Extractor
 * Detects and extracts OAuth tokens from Claude CLI configuration
 */

/**
 * Extract API key from Claude CLI config.json
 * @returns {Promise<Object>} API key extraction result
 */
export async function extractApiKeyFromCLI() {
  try {
    const configPath = path.join(os.homedir(), '.claude', 'config.json');

    // Check if config file exists
    if (!fs.existsSync(configPath)) {
      return {
        available: false,
        reason: 'Config file not found at ~/.claude/config.json'
      };
    }

    // Read and parse config file
    let config;
    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(configContent);
    } catch (parseError) {
      return {
        available: false,
        reason: 'Could not parse config file',
        error: parseError.message
      };
    }

    // Try to extract API key from various possible field names
    const apiKey = config.api_key || config.apiKey || config.API_KEY || config.key;

    if (!apiKey) {
      return {
        available: false,
        reason: 'No API key found in config file'
      };
    }

    // Validate API key format: sk-ant-api03-[95 characters]AA
    const apiKeyRegex = /^sk-ant-api03-[A-Za-z0-9_-]{95}AA$/;
    if (!apiKeyRegex.test(apiKey)) {
      return {
        available: false,
        reason: 'Invalid API key format. Expected: sk-ant-api03-[95 chars]AA',
        invalidKey: apiKey.substring(0, 20) + '...' // Show prefix for debugging
      };
    }

    // Successfully extracted valid API key
    return {
      available: true,
      apiKey: apiKey,
      email: config.email || config.user_email || 'Unknown',
      method: 'cli_config',
      configPath
    };

  } catch (error) {
    return {
      available: false,
      reason: 'Unexpected error extracting API key',
      error: error.message
    };
  }
}

/**
 * Check if OAuth authentication is available via Claude CLI
 * @returns {Promise<Object>} OAuth availability status
 */
export async function checkOAuthAvailability() {
  try {
    // Check if claude CLI is installed
    let cliVersion;
    try {
      cliVersion = execSync('claude --version', { encoding: 'utf8', stdio: 'pipe' }).trim();
    } catch (error) {
      return {
        available: false,
        reason: 'Claude CLI not installed or not in PATH',
        error: error.message
      };
    }

    // Check for credentials file with OAuth token (PRIORITY)
    const credentialsPath = path.join(os.homedir(), '.claude', '.credentials.json');
    if (fs.existsSync(credentialsPath)) {
      try {
        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

        // Check for claudeAiOauth structure (actual format used by Claude CLI)
        const hasOAuth = credentials.claudeAiOauth?.accessToken;

        if (hasOAuth) {
          const expiresAt = credentials.claudeAiOauth.expiresAt;
          const isExpired = expiresAt ? Date.now() > expiresAt : false;

          return {
            available: !isExpired,
            subscriptionType: credentials.claudeAiOauth.subscriptionType || 'unknown',
            scopes: credentials.claudeAiOauth.scopes || [],
            method: 'cli_credentials',
            credentialsPath,
            cliVersion,
            hasAccessToken: true,
            hasRefreshToken: !!credentials.claudeAiOauth.refreshToken,
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
            isExpired
          };
        }

        return {
          available: false,
          reason: 'No OAuth tokens found in credentials file',
          credentialsPath
        };
      } catch (parseError) {
        return {
          available: false,
          reason: 'Could not parse credentials file',
          error: parseError.message,
          credentialsPath
        };
      }
    }

    // Fallback: Try to extract API key from config.json
    const apiKeyResult = await extractApiKeyFromCLI();
    if (apiKeyResult.available) {
      return {
        ...apiKeyResult,
        cliVersion
      };
    }

    return {
      available: false,
      reason: 'Claude CLI installed but not logged in (no credentials or API key found)',
      cliVersion
    };

  } catch (error) {
    return {
      available: false,
      reason: 'Unexpected error checking OAuth availability',
      error: error.message
    };
  }
}

/**
 * Quick synchronous check of OAuth status
 * @returns {Object} OAuth installation status
 */
export function getOAuthStatus() {
  try {
    const cliVersion = execSync('claude --version', { encoding: 'utf8', stdio: 'pipe' }).trim();

    const credentialsPath = path.join(os.homedir(), '.claude', '.credentials.json');
    const credentialsExist = fs.existsSync(credentialsPath);

    const configPath = path.join(os.homedir(), '.claude', 'config.json');
    const configExists = fs.existsSync(configPath);

    return {
      installed: true,
      cliVersion,
      credentialsExist,
      configExists,
      likelyLoggedIn: credentialsExist || configExists
    };
  } catch (error) {
    return {
      installed: false,
      error: error.message
    };
  }
}

/**
 * Extract OAuth token from Claude CLI credentials
 * @returns {Promise<Object|null>} OAuth token object or null if not available
 */
export async function extractOAuthToken() {
  try {
    const credentialsPath = path.join(os.homedir(), '.claude', '.credentials.json');

    if (!fs.existsSync(credentialsPath)) {
      return null;
    }

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

    // Extract claudeAiOauth structure
    if (credentials.claudeAiOauth?.accessToken) {
      const oauth = credentials.claudeAiOauth;
      const isExpired = oauth.expiresAt ? Date.now() > oauth.expiresAt : false;

      if (isExpired) {
        console.warn('OAuth token is expired');
        return null;
      }

      return {
        accessToken: oauth.accessToken,
        refreshToken: oauth.refreshToken,
        expiresAt: oauth.expiresAt,
        scopes: oauth.scopes,
        subscriptionType: oauth.subscriptionType
      };
    }

    return null;

  } catch (error) {
    console.error('Error extracting OAuth token:', error.message);
    return null;
  }
}

/**
 * Get user info from Claude CLI credentials
 * @returns {Promise<Object|null>} User info or null
 */
export async function getUserInfo() {
  try {
    const credentialsPath = path.join(os.homedir(), '.claude', '.credentials.json');

    if (fs.existsSync(credentialsPath)) {
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

      if (credentials.claudeAiOauth) {
        return {
          subscriptionType: credentials.claudeAiOauth.subscriptionType,
          scopes: credentials.claudeAiOauth.scopes,
          hasAccess: true
        };
      }
    }

    const configPath = path.join(os.homedir(), '.claude', 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return {
        email: config.email || null,
        hasAccess: false
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting user info:', error.message);
    return null;
  }
}

// Export default object for convenience
export default {
  checkOAuthAvailability,
  extractApiKeyFromCLI,
  getOAuthStatus,
  extractOAuthToken,
  getUserInfo
};
