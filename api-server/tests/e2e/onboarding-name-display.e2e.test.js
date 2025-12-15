/**
 * End-to-End Tests for Onboarding Name Display
 * Tests complete user journey from onboarding through UI display
 *
 * These tests validate:
 * 1. Database persistence of display_name
 * 2. UI rendering in all locations
 * 3. No "Integration Test User" appears after name is set
 * 4. Screenshot verification points
 */

const puppeteer = require('puppeteer');
const { expect } = require('@jest/globals');
const fixtures = require('../fixtures/onboarding-data');
const db = require('../../src/db');
const { createTestUser, cleanupTestData } = require('../helpers/test-utils');

describe('E2E: Onboarding Name Display Flow', () => {
  let browser;
  let page;
  let testUser;
  const screenshotDir = '/workspaces/agent-feed/api-server/tests/screenshots';
  const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Create test user
    testUser = await createTestUser();

    // Setup authentication
    await page.goto(`${baseURL}/login`);
    await page.type('#email', testUser.email);
    await page.type('#password', testUser.password);
    await page.click('#login-button');
    await page.waitForNavigation();
  });

  afterEach(async () => {
    await page.screenshot({
      path: `${screenshotDir}/teardown-${Date.now()}.png`,
      fullPage: true
    });
    await page.close();
    await cleanupTestData(testUser.id);
  });

  describe('Complete Onboarding Flow', () => {
    test('should complete onboarding and persist name to database', async () => {
      // Navigate to onboarding
      await page.goto(`${baseURL}/onboarding`);
      await page.waitForSelector(fixtures.uiSelectors.onboarding.nameInput);

      // Screenshot: Initial onboarding screen
      await page.screenshot({
        path: `${screenshotDir}/01-onboarding-start.png`,
        fullPage: true
      });

      // Enter name
      await page.type(fixtures.uiSelectors.onboarding.nameInput, 'Orko');

      // Screenshot: Name entered
      await page.screenshot({
        path: `${screenshotDir}/02-name-entered.png`,
        fullPage: true
      });

      // Submit name
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      // Enter interests
      await page.waitForSelector(fixtures.uiSelectors.onboarding.interestsInput);
      await page.type(
        fixtures.uiSelectors.onboarding.interestsInput,
        'AI, software development, music'
      );
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      // Screenshot: Interests entered
      await page.screenshot({
        path: `${screenshotDir}/03-interests-entered.png`,
        fullPage: true
      });

      // Enter goals
      await page.waitForSelector(fixtures.uiSelectors.onboarding.goalsInput);
      await page.type(
        fixtures.uiSelectors.onboarding.goalsInput,
        'Learn about agent systems'
      );
      await page.click(fixtures.uiSelectors.onboarding.submitButton);

      // Wait for completion
      await page.waitForNavigation();

      // Screenshot: Onboarding complete
      await page.screenshot({
        path: `${screenshotDir}/04-onboarding-complete.png`,
        fullPage: true
      });

      // Verify database state
      const userSettings = await db.query(
        `SELECT display_name, onboarding_completed, onboarding_completed_at
         FROM user_settings
         WHERE user_id = $1`,
        [testUser.id]
      );

      expect(userSettings.rows.length).toBe(1);
      expect(userSettings.rows[0].display_name).toBe('Orko');
      expect(userSettings.rows[0].onboarding_completed).toBe(true);
      expect(userSettings.rows[0].onboarding_completed_at).toBeTruthy();

      // Verify onboarding data saved
      const userData = await db.query(
        `SELECT interests, goals FROM user_metadata WHERE user_id = $1`,
        [testUser.id]
      );

      expect(userData.rows[0].interests).toContain('AI');
      expect(userData.rows[0].goals).toContain('agent systems');
    });

    test('should display name in header after onboarding', async () => {
      // Complete onboarding first
      await completeOnboarding(page, 'Orko');

      // Navigate to main feed
      await page.goto(`${baseURL}/feed`);
      await page.waitForSelector(fixtures.uiSelectors.displayName.header);

      // Screenshot: Header with name
      await page.screenshot({
        path: `${screenshotDir}/05-header-with-name.png`,
        fullPage: true
      });

      // Verify header displays correct name
      const headerName = await page.$eval(
        fixtures.uiSelectors.displayName.header,
        el => el.textContent
      );

      expect(headerName).toBe('Orko');
      expect(headerName).not.toBe('Integration Test User');
    });

    test('should display name in all UI locations', async () => {
      await completeOnboarding(page, 'Orko');
      await page.goto(`${baseURL}/feed`);

      // Create a post to verify author name display
      await page.click('[data-testid="new-post-button"]');
      await page.type('[data-testid="post-input"]', 'Test post content');
      await page.click('[data-testid="submit-post"]');
      await page.waitForTimeout(2000);

      // Screenshot: Feed with post
      await page.screenshot({
        path: `${screenshotDir}/06-feed-with-post.png`,
        fullPage: true
      });

      // Verify name in multiple locations
      const locations = [
        { selector: fixtures.uiSelectors.displayName.header, location: 'header' },
        { selector: fixtures.uiSelectors.displayName.postAuthor, location: 'post author' },
        { selector: fixtures.uiSelectors.displayName.profileDropdown, location: 'profile dropdown' }
      ];

      for (const { selector, location } of locations) {
        await page.waitForSelector(selector);
        const displayName = await page.$eval(selector, el => el.textContent);

        expect(displayName).toBe('Orko');
        expect(displayName).not.toBe('Integration Test User');

        // Screenshot each location
        const element = await page.$(selector);
        await element.screenshot({
          path: `${screenshotDir}/07-name-in-${location.replace(' ', '-')}.png`
        });
      }
    });

    test('should verify onboarding creates posts, not comments', async () => {
      await page.goto(`${baseURL}/onboarding`);
      await page.waitForSelector(fixtures.uiSelectors.onboarding.nameInput);

      // Complete first step
      await page.type(fixtures.uiSelectors.onboarding.nameInput, 'Orko');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      // Screenshot: After first question
      await page.screenshot({
        path: `${screenshotDir}/08-after-first-question.png`,
        fullPage: true
      });

      // Verify posts are created, not nested comments
      const posts = await page.$$(fixtures.uiSelectors.onboarding.questionPost);
      expect(posts.length).toBeGreaterThanOrEqual(1);

      // Check database to ensure they're posts, not comments
      const dbPosts = await db.query(
        `SELECT id, parent_post_id, post_type
         FROM posts
         WHERE user_id = $1 AND post_type = 'onboarding'
         ORDER BY created_at ASC`,
        [testUser.id]
      );

      // All should be root-level posts
      dbPosts.rows.forEach(post => {
        expect(post.parent_post_id).toBeNull();
        expect(post.post_type).toBe('onboarding');
      });

      // Continue with remaining questions
      await page.waitForSelector(fixtures.uiSelectors.onboarding.interestsInput);
      await page.type(fixtures.uiSelectors.onboarding.interestsInput, 'AI');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      await page.waitForSelector(fixtures.uiSelectors.onboarding.goalsInput);
      await page.type(fixtures.uiSelectors.onboarding.goalsInput, 'Learning');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);

      // Screenshot: All questions completed
      await page.screenshot({
        path: `${screenshotDir}/09-all-questions-completed.png`,
        fullPage: true
      });

      // Final verification
      const finalPosts = await db.query(
        `SELECT id, parent_post_id FROM posts
         WHERE user_id = $1 AND post_type = 'onboarding'`,
        [testUser.id]
      );

      expect(finalPosts.rows.length).toBeGreaterThanOrEqual(3);
      finalPosts.rows.forEach(post => {
        expect(post.parent_post_id).toBeNull();
      });
    });
  });

  describe('Name Display Verification', () => {
    test('should never show "Integration Test User" after name is set', async () => {
      await completeOnboarding(page, 'Orko');
      await page.goto(`${baseURL}/feed`);

      // Search entire page for "Integration Test User"
      const pageContent = await page.content();
      expect(pageContent).not.toContain('Integration Test User');

      // Verify via screenshot
      await page.screenshot({
        path: `${screenshotDir}/10-no-integration-test-user.png`,
        fullPage: true
      });

      // Check specific UI elements
      const nameElements = await page.$$('[data-testid*="name"], [data-testid*="author"]');

      for (const element of nameElements) {
        const text = await element.evaluate(el => el.textContent);
        expect(text).not.toBe('Integration Test User');
      }
    });

    test('should display name consistently across page navigation', async () => {
      await completeOnboarding(page, 'Orko');

      const pages = ['/feed', '/profile', '/settings'];

      for (const pagePath of pages) {
        await page.goto(`${baseURL}${pagePath}`);
        await page.waitForSelector(fixtures.uiSelectors.displayName.header);

        const headerName = await page.$eval(
          fixtures.uiSelectors.displayName.header,
          el => el.textContent
        );

        expect(headerName).toBe('Orko');

        // Screenshot each page
        await page.screenshot({
          path: `${screenshotDir}/11-name-on-${pagePath.replace('/', '')}.png`,
          fullPage: true
        });
      }
    });

    test('should update UI when name is changed in settings', async () => {
      await completeOnboarding(page, 'Orko');

      // Navigate to settings
      await page.goto(`${baseURL}/settings`);
      await page.waitForSelector('[data-testid="display-name-input"]');

      // Screenshot: Settings before change
      await page.screenshot({
        path: `${screenshotDir}/12-settings-before-change.png`,
        fullPage: true
      });

      // Change name
      await page.click('[data-testid="display-name-input"]', { clickCount: 3 });
      await page.type('[data-testid="display-name-input"]', 'Orko Updated');
      await page.click('[data-testid="save-settings"]');
      await page.waitForTimeout(1000);

      // Screenshot: Settings after change
      await page.screenshot({
        path: `${screenshotDir}/13-settings-after-change.png`,
        fullPage: true
      });

      // Verify database update
      const userSettings = await db.query(
        `SELECT display_name FROM user_settings WHERE user_id = $1`,
        [testUser.id]
      );

      expect(userSettings.rows[0].display_name).toBe('Orko Updated');

      // Verify UI update
      await page.goto(`${baseURL}/feed`);
      const headerName = await page.$eval(
        fixtures.uiSelectors.displayName.header,
        el => el.textContent
      );

      expect(headerName).toBe('Orko Updated');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle onboarding without name (skipped)', async () => {
      await page.goto(`${baseURL}/onboarding`);
      await page.waitForSelector(fixtures.uiSelectors.onboarding.nameInput);

      // Skip name entry
      await page.click('[data-testid="skip-name"]');
      await page.waitForTimeout(1000);

      // Complete rest of onboarding
      await page.waitForSelector(fixtures.uiSelectors.onboarding.interestsInput);
      await page.type(fixtures.uiSelectors.onboarding.interestsInput, 'AI');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);

      await page.waitForSelector(fixtures.uiSelectors.onboarding.goalsInput);
      await page.type(fixtures.uiSelectors.onboarding.goalsInput, 'Learning');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);

      await page.waitForNavigation();

      // Verify database
      const userSettings = await db.query(
        `SELECT display_name FROM user_settings WHERE user_id = $1`,
        [testUser.id]
      );

      expect(userSettings.rows[0].display_name).toBeNull();

      // Screenshot: No name set
      await page.screenshot({
        path: `${screenshotDir}/14-no-name-set.png`,
        fullPage: true
      });
    });

    test('should handle special characters in names', async () => {
      const specialName = "O'Reilly-Smith 👋";

      await page.goto(`${baseURL}/onboarding`);
      await page.waitForSelector(fixtures.uiSelectors.onboarding.nameInput);
      await page.type(fixtures.uiSelectors.onboarding.nameInput, specialName);
      await page.click(fixtures.uiSelectors.onboarding.submitButton);

      // Complete onboarding
      await completeRemainingSteps(page);

      // Verify database
      const userSettings = await db.query(
        `SELECT display_name FROM user_settings WHERE user_id = $1`,
        [testUser.id]
      );

      expect(userSettings.rows[0].display_name).toBe(specialName);

      // Verify UI display
      await page.goto(`${baseURL}/feed`);
      const headerName = await page.$eval(
        fixtures.uiSelectors.displayName.header,
        el => el.textContent
      );

      expect(headerName).toBe(specialName);

      // Screenshot
      await page.screenshot({
        path: `${screenshotDir}/15-special-chars-name.png`,
        fullPage: true
      });
    });

    test('should handle network errors during onboarding', async () => {
      // Simulate network error
      await page.setOfflineMode(true);

      await page.goto(`${baseURL}/onboarding`);
      await page.waitForSelector(fixtures.uiSelectors.onboarding.nameInput);
      await page.type(fixtures.uiSelectors.onboarding.nameInput, 'Orko');
      await page.click(fixtures.uiSelectors.onboarding.submitButton);

      // Should show error
      await page.waitForSelector('[data-testid="error-message"]');
      const errorMessage = await page.$eval(
        '[data-testid="error-message"]',
        el => el.textContent
      );

      expect(errorMessage).toMatch(/network|connection|error/i);

      // Screenshot: Error state
      await page.screenshot({
        path: `${screenshotDir}/16-network-error.png`,
        fullPage: true
      });

      // Restore connection and retry
      await page.setOfflineMode(false);
      await page.click(fixtures.uiSelectors.onboarding.submitButton);
      await page.waitForTimeout(1000);

      // Should succeed now
      const userSettings = await db.query(
        `SELECT display_name FROM user_settings WHERE user_id = $1`,
        [testUser.id]
      );

      expect(userSettings.rows[0].display_name).toBe('Orko');
    });
  });
});

// Helper functions
async function completeOnboarding(page, name) {
  await page.goto(`${process.env.TEST_BASE_URL || 'http://localhost:3000'}/onboarding`);
  await page.waitForSelector(fixtures.uiSelectors.onboarding.nameInput);

  await page.type(fixtures.uiSelectors.onboarding.nameInput, name);
  await page.click(fixtures.uiSelectors.onboarding.submitButton);
  await page.waitForTimeout(1000);

  await page.waitForSelector(fixtures.uiSelectors.onboarding.interestsInput);
  await page.type(fixtures.uiSelectors.onboarding.interestsInput, 'AI, software');
  await page.click(fixtures.uiSelectors.onboarding.submitButton);
  await page.waitForTimeout(1000);

  await page.waitForSelector(fixtures.uiSelectors.onboarding.goalsInput);
  await page.type(fixtures.uiSelectors.onboarding.goalsInput, 'Learning and building');
  await page.click(fixtures.uiSelectors.onboarding.submitButton);

  await page.waitForNavigation();
}

async function completeRemainingSteps(page) {
  await page.waitForSelector(fixtures.uiSelectors.onboarding.interestsInput);
  await page.type(fixtures.uiSelectors.onboarding.interestsInput, 'AI');
  await page.click(fixtures.uiSelectors.onboarding.submitButton);
  await page.waitForTimeout(1000);

  await page.waitForSelector(fixtures.uiSelectors.onboarding.goalsInput);
  await page.type(fixtures.uiSelectors.onboarding.goalsInput, 'Learning');
  await page.click(fixtures.uiSelectors.onboarding.submitButton);
  await page.waitForNavigation();
}
