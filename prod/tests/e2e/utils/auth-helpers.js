/**
 * Authentication Helpers for E2E Testing
 * Handles login, logout, and session management for tests
 */

import { expect } from '@playwright/test';

export class AuthHelpers {
  constructor(page) {
    this.page = page;
    this.authStorage = null;
  }

  /**
   * Login with credentials
   * @param {Object} credentials - Login credentials
   */
  async login(credentials = {}) {
    const defaultCredentials = {
      email: 'admin@test.com',
      password: 'TestPassword123!',
      remember: false
    };

    const loginData = { ...defaultCredentials, ...credentials };

    // Navigate to login page
    await this.page.goto('/login');
    
    // Fill login form
    await this.page.fill('[data-testid="email-input"]', loginData.email);
    await this.page.fill('[data-testid="password-input"]', loginData.password);
    
    if (loginData.remember) {
      await this.page.check('[data-testid="remember-checkbox"]');
    }
    
    // Submit login form
    await this.page.click('[data-testid="login-button"]');
    
    // Wait for successful login
    await this.waitForLogin();
    
    // Store authentication state
    await this.storeAuthState();
  }

  /**
   * Login as admin user
   */
  async loginAsAdmin() {
    await this.login({
      email: 'admin@test.com',
      password: 'AdminPassword123!',
      role: 'admin'
    });
  }

  /**
   * Login as regular user
   */
  async loginAsUser() {
    await this.login({
      email: 'user@test.com',
      password: 'UserPassword123!',
      role: 'user'
    });
  }

  /**
   * Login as power user (with multiple agents)
   */
  async loginAsPowerUser() {
    await this.login({
      email: 'poweruser@test.com',
      password: 'PowerPassword123!',
      role: 'user'
    });
  }

  /**
   * OAuth login simulation
   * @param {string} provider - OAuth provider (google, facebook, twitter)
   */
  async loginWithOAuth(provider) {
    await this.page.goto('/login');
    
    // Click OAuth provider button
    await this.page.click(`[data-testid="oauth-${provider}-button"]`);
    
    // Handle OAuth redirect (mock)
    await this.page.waitForURL('**/oauth/callback**');
    
    // Simulate OAuth success
    await this.page.evaluate((prov) => {
      window.postMessage({
        type: 'oauth-success',
        provider: prov,
        user: {
          id: `oauth-user-${prov}`,
          email: `user@${prov}.com`,
          name: `Test User from ${prov}`
        }
      }, '*');
    }, provider);
    
    await this.waitForLogin();
  }

  /**
   * Logout current user
   */
  async logout() {
    // Check if user is logged in
    const isLoggedIn = await this.isAuthenticated();
    if (!isLoggedIn) {
      return;
    }

    // Navigate to a page with logout functionality
    await this.page.goto('/dashboard');
    
    // Click user menu
    await this.page.click('[data-testid="user-menu-button"]');
    
    // Click logout
    await this.page.click('[data-testid="logout-button"]');
    
    // Wait for logout confirmation
    await this.page.waitForURL('**/login**');
    
    // Clear stored auth state
    this.authStorage = null;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    try {
      // Check for auth indicators on the page
      const authIndicators = [
        '[data-testid="user-menu"]',
        '[data-testid="dashboard-header"]',
        '.user-avatar'
      ];

      for (const indicator of authIndicators) {
        if (await this.page.locator(indicator).isVisible()) {
          return true;
        }
      }

      // Check for auth tokens in localStorage
      const hasAuth = await this.page.evaluate(() => {
        const token = localStorage.getItem('auth_token') || 
                     localStorage.getItem('access_token') ||
                     sessionStorage.getItem('auth_token');
        return !!token;
      });

      return hasAuth;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser() {
    if (!await this.isAuthenticated()) {
      return null;
    }

    try {
      // Try to get user info from the page
      const userInfo = await this.page.evaluate(() => {
        // Check common places for user info
        const userDataElement = document.querySelector('[data-user-info]');
        if (userDataElement) {
          return JSON.parse(userDataElement.dataset.userInfo);
        }

        // Check localStorage
        const userStorage = localStorage.getItem('user') || 
                           localStorage.getItem('currentUser');
        if (userStorage) {
          return JSON.parse(userStorage);
        }

        return null;
      });

      return userInfo;
    } catch (error) {
      console.warn('Could not retrieve current user info:', error);
      return null;
    }
  }

  /**
   * Wait for successful login
   */
  async waitForLogin() {
    // Wait for redirect to dashboard or success indicator
    await Promise.race([
      this.page.waitForURL('**/dashboard**'),
      this.page.waitForSelector('[data-testid="login-success"]'),
      this.page.waitForSelector('[data-testid="user-menu"]')
    ]);

    // Additional verification
    await expect(this.page.locator('[data-testid="login-error"]')).not.toBeVisible();
  }

  /**
   * Store authentication state
   */
  async storeAuthState() {
    this.authStorage = await this.page.context().storageState();
  }

  /**
   * Restore authentication state
   */
  async restoreAuthState() {
    if (this.authStorage) {
      await this.page.context().addInitScript((storage) => {
        if (storage.localStorage) {
          for (const item of storage.localStorage) {
            localStorage.setItem(item.name, item.value);
          }
        }
        if (storage.sessionStorage) {
          for (const item of storage.sessionStorage) {
            sessionStorage.setItem(item.name, item.value);
          }
        }
      }, this.authStorage);
    }
  }

  /**
   * Create test session
   * @param {Object} userData - User data for session
   */
  async createTestSession(userData) {
    const sessionData = {
      id: userData.id || 'test-user-id',
      email: userData.email || 'test@example.com',
      role: userData.role || 'user',
      permissions: userData.permissions || ['read', 'write'],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    // Set session in browser storage
    await this.page.evaluate((data) => {
      localStorage.setItem('auth_token', `test-token-${data.id}`);
      localStorage.setItem('user', JSON.stringify(data));
      sessionStorage.setItem('session_id', `session-${Date.now()}`);
    }, sessionData);

    return sessionData;
  }

  /**
   * Simulate session expiry
   */
  async expireSession() {
    await this.page.evaluate(() => {
      // Clear all auth-related storage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      sessionStorage.clear();
    });

    // Reload page to trigger auth check
    await this.page.reload();
  }

  /**
   * Set user permissions
   * @param {Array<string>} permissions - Array of permissions
   */
  async setUserPermissions(permissions) {
    await this.page.evaluate((perms) => {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.permissions = perms;
      localStorage.setItem('user', JSON.stringify(user));
    }, permissions);
  }

  /**
   * Check if user has permission
   * @param {string} permission - Permission to check
   */
  async hasPermission(permission) {
    return await this.page.evaluate((perm) => {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.permissions?.includes(perm) || false;
    }, permission);
  }

  /**
   * Simulate multi-factor authentication
   * @param {string} method - MFA method (sms, email, authenticator)
   */
  async completeMFA(method = 'authenticator') {
    // Wait for MFA prompt
    await this.page.waitForSelector('[data-testid="mfa-prompt"]');

    switch (method) {
      case 'sms':
        await this.page.fill('[data-testid="mfa-code-input"]', '123456');
        break;
      case 'email':
        await this.page.fill('[data-testid="mfa-code-input"]', '654321');
        break;
      case 'authenticator':
        await this.page.fill('[data-testid="mfa-code-input"]', '987654');
        break;
    }

    await this.page.click('[data-testid="verify-mfa-button"]');
    
    // Wait for MFA verification
    await this.page.waitForSelector('[data-testid="mfa-success"]');
  }

  /**
   * Test login with invalid credentials
   * @param {Object} credentials - Invalid credentials to test
   */
  async testInvalidLogin(credentials) {
    await this.page.goto('/login');
    
    if (credentials.email) {
      await this.page.fill('[data-testid="email-input"]', credentials.email);
    }
    if (credentials.password) {
      await this.page.fill('[data-testid="password-input"]', credentials.password);
    }
    
    await this.page.click('[data-testid="login-button"]');
    
    // Wait for error message
    await this.page.waitForSelector('[data-testid="login-error"]');
    
    const errorMessage = await this.page.textContent('[data-testid="login-error"]');
    return errorMessage;
  }

  /**
   * Clear all authentication data
   */
  async clearAuthData() {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    });
  }

  /**
   * Get authentication tokens
   */
  async getAuthTokens() {
    return await this.page.evaluate(() => {
      return {
        authToken: localStorage.getItem('auth_token'),
        accessToken: localStorage.getItem('access_token'),
        refreshToken: localStorage.getItem('refresh_token'),
        sessionId: sessionStorage.getItem('session_id')
      };
    });
  }

  /**
   * Verify login form validation
   */
  async verifyLoginFormValidation() {
    await this.page.goto('/login');
    
    // Test empty form
    await this.page.click('[data-testid="login-button"]');
    await expect(this.page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="password-error"]')).toBeVisible();
    
    // Test invalid email format
    await this.page.fill('[data-testid="email-input"]', 'invalid-email');
    await this.page.click('[data-testid="login-button"]');
    await expect(this.page.locator('[data-testid="email-error"]')).toContainText('Invalid email format');
    
    // Test password too short
    await this.page.fill('[data-testid="email-input"]', 'test@example.com');
    await this.page.fill('[data-testid="password-input"]', '123');
    await this.page.click('[data-testid="login-button"]');
    await expect(this.page.locator('[data-testid="password-error"]')).toContainText('Password too short');
  }
}