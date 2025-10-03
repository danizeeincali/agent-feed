import { test, expect, Page } from '@playwright/test';

test.describe('Posting Interface Validation - Production Readiness', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    // Wait for posting interface to be ready
    await page.waitForSelector('[role="tab"]', { timeout: 10000 });
  });

  test.describe('Tab Visibility and Default State', () => {
    test('should only show Quick Post and Avi DM tabs (no Post tab)', async () => {
      const tabs = await page.locator('[role="tab"]').all();

      // Should have exactly 2 tabs
      expect(tabs.length).toBe(2);

      // Verify tab labels
      const tabTexts = await Promise.all(tabs.map(tab => tab.textContent()));
      expect(tabTexts).toContain('Quick Post');
      expect(tabTexts).toContain('Avi DM');
      expect(tabTexts).not.toContain('Post');

      // Take screenshot
      await page.screenshot({
        path: 'tests/e2e/screenshots/validation-tabs-visible.png',
        fullPage: true
      });
    });

    test('should have Quick Post tab active by default on load', async () => {
      const quickPostTab = page.locator('[role="tab"]', { hasText: 'Quick Post' });

      // Verify Quick Post tab is selected
      await expect(quickPostTab).toHaveAttribute('aria-selected', 'true');

      // Verify Quick Post panel is visible
      const quickPostPanel = page.locator('[role="tabpanel"]').filter({
        has: page.locator('textarea[placeholder*="Write"]')
      });
      await expect(quickPostPanel).toBeVisible();

      // Verify Avi DM panel is not active
      const aviDmTab = page.locator('[role="tab"]', { hasText: 'Avi DM' });
      await expect(aviDmTab).toHaveAttribute('aria-selected', 'false');
    });
  });

  test.describe('Character Limit Validation', () => {
    test('should accept 10,000 characters without rejection', async () => {
      // Generate exactly 10,000 characters
      const content = 'A'.repeat(10000);

      const textarea = page.locator('textarea[placeholder*="Write"]').first();
      await textarea.waitFor({ state: 'visible' });

      // Fill in chunks to avoid timeout
      await textarea.click();
      await textarea.fill(content);

      // Wait for UI to process
      await page.waitForTimeout(1000);

      // Verify content length
      const textareaValue = await textarea.inputValue();
      expect(textareaValue.length).toBe(10000);

      // Verify no error message
      const errorMessage = page.locator('text=/character limit|too long|maximum/i');
      await expect(errorMessage).not.toBeVisible();

      await page.screenshot({
        path: 'tests/e2e/screenshots/validation-10k-characters.png',
        fullPage: true
      });
    });
  });

  test.describe('Character Counter Display Logic', () => {
    test('should hide character counter below 9500 characters', async () => {
      const textarea = page.locator('textarea[placeholder*="Write"]').first();
      await textarea.waitFor({ state: 'visible' });

      // Type 9000 characters
      await textarea.fill('C'.repeat(9000));
      await page.waitForTimeout(500);

      // Character counter should not be visible
      const counter = page.locator('text=/\\d+\\/10,?000|\\d+,?\\d* characters/i');
      const isVisible = await counter.isVisible().catch(() => false);
      expect(isVisible).toBe(false);

      await page.screenshot({
        path: 'tests/e2e/screenshots/validation-counter-hidden.png',
        fullPage: true
      });
    });

    test('should show character counter at exactly 9500 characters', async () => {
      const textarea = page.locator('textarea[placeholder*="Write"]').first();
      await textarea.waitFor({ state: 'visible' });

      // Type exactly 9500 characters
      await textarea.fill('D'.repeat(9500));
      await page.waitForTimeout(1000);

      // Character counter should be visible
      const counter = page.locator('text=/9,?500/');
      await expect(counter).toBeVisible({ timeout: 5000 });

      await page.screenshot({
        path: 'tests/e2e/screenshots/validation-counter-9500.png',
        fullPage: true
      });
    });

    test('should show counter in warning color at 9700+ characters', async () => {
      const textarea = page.locator('textarea[placeholder*="Write"]').first();
      await textarea.waitFor({ state: 'visible' });

      // Type 9750 characters
      await textarea.fill('F'.repeat(9750));
      await page.waitForTimeout(1000);

      // Find counter element
      const counter = page.locator('text=/9,?750/').first();
      await expect(counter).toBeVisible({ timeout: 5000 });

      // Verify warning color (yellow/orange)
      const classList = await counter.evaluate(el => el.className);
      expect(classList).toMatch(/yellow|warning|orange/i);

      await page.screenshot({
        path: 'tests/e2e/screenshots/validation-counter-warning-color.png',
        fullPage: true
      });
    });

    test('should show counter in danger color at 9900+ characters', async () => {
      const textarea = page.locator('textarea[placeholder*="Write"]').first();
      await textarea.waitFor({ state: 'visible' });

      // Type 9950 characters
      await textarea.fill('G'.repeat(9950));
      await page.waitForTimeout(1000);

      // Find counter element
      const counter = page.locator('text=/9,?950/').first();
      await expect(counter).toBeVisible({ timeout: 5000 });

      // Verify danger color (red)
      const classList = await counter.evaluate(el => el.className);
      expect(classList).toMatch(/red|danger|error/i);

      await page.screenshot({
        path: 'tests/e2e/screenshots/validation-counter-danger-color.png',
        fullPage: true
      });
    });
  });

  test.describe('Textarea UI Configuration', () => {
    test('should display textarea with 6 rows visible', async () => {
      const textarea = page.locator('textarea[placeholder*="Write"]').first();
      await textarea.waitFor({ state: 'visible' });

      // Get rows attribute
      const rows = await textarea.getAttribute('rows');
      expect(rows).toBe('6');

      // Verify visual height (approximate check)
      const boundingBox = await textarea.boundingBox();
      expect(boundingBox).not.toBeNull();

      // 6 rows should be roughly 120-150px tall (depends on line-height)
      if (boundingBox) {
        expect(boundingBox.height).toBeGreaterThan(100);
        expect(boundingBox.height).toBeLessThan(200);
      }
    });

    test('should show new placeholder text "Write as much as you need!"', async () => {
      const textarea = page.locator('textarea[placeholder*="Write"]').first();
      await textarea.waitFor({ state: 'visible' });

      const placeholder = await textarea.getAttribute('placeholder');
      expect(placeholder).toContain('Write as much as you need!');

      await page.screenshot({
        path: 'tests/e2e/screenshots/validation-placeholder.png',
        fullPage: true
      });
    });
  });

  test.describe('Section Description Text', () => {
    test('should show new description text', async () => {
      // Look for the description text near the Quick Post section
      const description = page.locator('text=/Share your thoughts|quick update|simple message/i').first();

      await expect(description).toBeVisible({ timeout: 5000 });

      const descriptionText = await description.textContent();
      expect(descriptionText).toBeTruthy();

      await page.screenshot({
        path: 'tests/e2e/screenshots/validation-description.png',
        fullPage: true
      });
    });
  });

  test.describe('Mentions Functionality', () => {
    test('should support @agent mentions', async () => {
      const textarea = page.locator('textarea[placeholder*="Write"]').first();
      await textarea.waitFor({ state: 'visible' });

      // Type @agent mention
      await textarea.fill('Hello @agent1 how are you?');
      await page.waitForTimeout(500);

      // Verify content includes mention
      const textareaValue = await textarea.inputValue();
      expect(textareaValue).toContain('@agent1');

      await page.screenshot({
        path: 'tests/e2e/screenshots/validation-mentions.png',
        fullPage: true
      });
    });

    test('should allow multiple @agent mentions in single post', async () => {
      const textarea = page.locator('textarea[placeholder*="Write"]').first();
      await textarea.waitFor({ state: 'visible' });

      await textarea.fill('Tagging @agent1, @agent2, and @agent3 in this post!');

      const textareaValue = await textarea.inputValue();
      expect(textareaValue).toContain('@agent1');
      expect(textareaValue).toContain('@agent2');
      expect(textareaValue).toContain('@agent3');
    });
  });

  test.describe('Mobile Responsive Design', () => {
    test('should display correctly on mobile viewport (375x667)', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Verify tabs are still visible
      const tabs = await page.locator('[role="tab"]').all();
      expect(tabs.length).toBe(2);

      for (const tab of tabs) {
        await expect(tab).toBeVisible();
      }

      // Verify textarea is visible and usable
      const textarea = page.locator('textarea[placeholder*="Write"]').first();
      await expect(textarea).toBeVisible();

      // Verify textarea fills mobile width appropriately
      const boundingBox = await textarea.boundingBox();
      expect(boundingBox).not.toBeNull();

      if (boundingBox) {
        // Should be most of the viewport width (accounting for padding)
        expect(boundingBox.width).toBeGreaterThan(300);
        expect(boundingBox.width).toBeLessThan(375);
      }

      // Test typing on mobile
      await textarea.fill('Mobile test content');
      const textareaValue = await textarea.inputValue();
      expect(textareaValue).toBe('Mobile test content');

      await page.screenshot({
        path: 'tests/e2e/screenshots/validation-mobile-375x667.png',
        fullPage: true
      });
    });

    test('should show character counter on mobile at 9500+ characters', async () => {
      await page.setViewportSize({ width: 375, height: 667 });

      const textarea = page.locator('textarea[placeholder*="Write"]').first();
      await textarea.waitFor({ state: 'visible' });

      await textarea.fill('M'.repeat(9600));
      await page.waitForTimeout(1000);

      const counter = page.locator('text=/9,?600/').first();
      await expect(counter).toBeVisible({ timeout: 5000 });

      await page.screenshot({
        path: 'tests/e2e/screenshots/validation-mobile-counter.png',
        fullPage: true
      });
    });
  });

  test.describe('Edge Cases and State Management', () => {
    test('should handle rapid character count changes smoothly', async () => {
      const textarea = page.locator('textarea[placeholder*="Write"]').first();
      await textarea.waitFor({ state: 'visible' });

      // Rapidly change content around counter threshold
      await textarea.fill('A'.repeat(9400));
      await page.waitForTimeout(200);

      await textarea.fill('B'.repeat(9500));
      await page.waitForTimeout(200);

      await textarea.fill('C'.repeat(9700));
      await page.waitForTimeout(200);

      await textarea.fill('D'.repeat(9900));
      await page.waitForTimeout(500);

      // Verify final state
      const counter = page.locator('text=/9,?900/').first();
      await expect(counter).toBeVisible({ timeout: 5000 });
    });

    test('should maintain state when switching tabs', async () => {
      const textarea = page.locator('textarea[placeholder*="Write"]').first();
      await textarea.waitFor({ state: 'visible' });

      const testContent = 'This content should persist when switching tabs';

      // Type content in Quick Post
      await textarea.fill(testContent);

      // Switch to Avi DM tab
      const aviDmTab = page.locator('[role="tab"]', { hasText: 'Avi DM' });
      await aviDmTab.click();
      await page.waitForTimeout(500);

      // Switch back to Quick Post
      const quickPostTab = page.locator('[role="tab"]', { hasText: 'Quick Post' });
      await quickPostTab.click();
      await page.waitForTimeout(500);

      // Verify content persisted
      const textareaValue = await textarea.inputValue();
      expect(textareaValue).toBe(testContent);
    });
  });

  test.describe('Performance and Load Time', () => {
    test('should load posting interface within 3 seconds', async ({ page: freshPage }) => {
      const startTime = Date.now();

      await freshPage.goto('http://localhost:5173');

      // Wait for Quick Post tab to be visible
      const quickPostTab = freshPage.locator('[role="tab"]', { hasText: 'Quick Post' });
      await expect(quickPostTab).toBeVisible({ timeout: 10000 });

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle typing 10,000 characters without significant lag', async () => {
      const textarea = page.locator('textarea[placeholder*="Write"]').first();
      await textarea.waitFor({ state: 'visible' });

      const startTime = Date.now();
      await textarea.fill('Z'.repeat(10000));
      const fillTime = Date.now() - startTime;

      // Should fill within 2 seconds
      expect(fillTime).toBeLessThan(2000);

      // Verify content is correct
      const textareaValue = await textarea.inputValue();
      expect(textareaValue.length).toBe(10000);
    });
  });

  test.describe('UI Element Visibility', () => {
    test('should show Post button in enabled state when content exists', async () => {
      const textarea = page.locator('textarea[placeholder*="Write"]').first();
      await textarea.waitFor({ state: 'visible' });

      await textarea.fill('Test content for post button');

      const postButton = page.locator('button', { hasText: /^Post$|Submit/i }).first();
      await expect(postButton).toBeVisible();

      // Check if button is enabled (it should be with content)
      const isEnabled = await postButton.isEnabled();
      expect(isEnabled).toBe(true);
    });

    test('should display posting interface components in correct order', async () => {
      // Verify layout order: tabs -> textarea -> button area
      const quickPostTab = page.locator('[role="tab"]', { hasText: 'Quick Post' });
      const textarea = page.locator('textarea[placeholder*="Write"]').first();
      const postButton = page.locator('button', { hasText: /^Post$|Submit/i }).first();

      await expect(quickPostTab).toBeVisible();
      await expect(textarea).toBeVisible();
      await expect(postButton).toBeVisible();

      // Verify vertical positioning
      const tabBox = await quickPostTab.boundingBox();
      const textareaBox = await textarea.boundingBox();
      const buttonBox = await postButton.boundingBox();

      expect(tabBox).not.toBeNull();
      expect(textareaBox).not.toBeNull();
      expect(buttonBox).not.toBeNull();

      if (tabBox && textareaBox && buttonBox) {
        // Tabs should be above textarea
        expect(tabBox.y).toBeLessThan(textareaBox.y);
        // Textarea should be above button
        expect(textareaBox.y).toBeLessThan(buttonBox.y);
      }
    });
  });
});
