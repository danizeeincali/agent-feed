/**
 * Playwright E2E Test: Minimal Security Implementation
 *
 * Tests the complete security flow with real browser interactions and screenshots
 */

import { test, expect } from '@playwright/test';

test.describe('Minimal Security Implementation E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the feed page
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
  });

  test('Normal post creation succeeds with success toast', async ({ page }) => {
    // Screenshot: Initial state
    await page.screenshot({ path: 'test-results/01-initial-state.png', fullPage: true });

    // Type a normal post with no risky content
    const postInput = page.locator('textarea[placeholder*="What\'s on your mind"]');
    await postInput.fill('This is a normal post about software development');

    // Screenshot: Post typed
    await page.screenshot({ path: 'test-results/02-normal-post-typed.png', fullPage: true });

    // Click Quick Post button
    await page.click('button:has-text("Quick Post")');

    // Wait for success toast to appear
    const successToast = page.locator('div[role="alert"]:has-text("Post created successfully")');
    await expect(successToast).toBeVisible({ timeout: 5000 });

    // Screenshot: Success toast visible
    await page.screenshot({ path: 'test-results/03-success-toast.png', fullPage: true });

    // Verify post appears in feed
    await page.waitForTimeout(1000);
    await expect(page.locator('text=software development')).toBeVisible();

    // Screenshot: Post in feed
    await page.screenshot({ path: 'test-results/04-post-in-feed.png', fullPage: true });
  });

  test('Post with "create" keyword succeeds (no false positive)', async ({ page }) => {
    const postInput = page.locator('textarea[placeholder*="What\'s on your mind"]');
    await postInput.fill('I want to create a new feature for the application');

    // Screenshot before submitting
    await page.screenshot({ path: 'test-results/05-create-keyword-post.png', fullPage: true });

    await page.click('button:has-text("Quick Post")');

    // Should succeed without warning dialog
    const successToast = page.locator('div[role="alert"]:has-text("Post created successfully")');
    await expect(successToast).toBeVisible({ timeout: 5000 });

    // Screenshot: Success
    await page.screenshot({ path: 'test-results/06-create-keyword-success.png', fullPage: true });
  });

  test('Post with filesystem path shows warning dialog', async ({ page }) => {
    const postInput = page.locator('textarea[placeholder*="What\'s on your mind"]');
    await postInput.fill('Create a file at /workspaces/agent-feed/frontend/test.txt');

    // Screenshot: Post with filesystem path
    await page.screenshot({ path: 'test-results/07-filesystem-path-post.png', fullPage: true });

    await page.click('button:has-text("Quick Post")');

    // Wait for warning dialog to appear
    const warningDialog = page.locator('div[role="dialog"]:has-text("System Operation Detected")');
    await expect(warningDialog).toBeVisible({ timeout: 3000 });

    // Screenshot: Warning dialog visible
    await page.screenshot({ path: 'test-results/08-warning-dialog-visible.png', fullPage: true });

    // Verify dialog content
    await expect(page.locator('text=/workspaces/')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Continue Anyway")')).toBeVisible();

    // Screenshot: Dialog details
    await page.screenshot({ path: 'test-results/09-dialog-details.png', fullPage: true });
  });

  test('Warning dialog cancel prevents post submission', async ({ page }) => {
    const postInput = page.locator('textarea[placeholder*="What\'s on your mind"]');
    await postInput.fill('Run rm -rf /tmp/old-files to cleanup');

    await page.click('button:has-text("Quick Post")');

    // Wait for warning dialog
    const warningDialog = page.locator('div[role="dialog"]:has-text("System Operation Detected")');
    await expect(warningDialog).toBeVisible();

    // Screenshot: Dialog before cancel
    await page.screenshot({ path: 'test-results/10-dialog-before-cancel.png', fullPage: true });

    // Click Cancel button
    await page.click('button:has-text("Cancel")');

    // Wait for dialog to disappear
    await expect(warningDialog).not.toBeVisible();

    // Verify "Post cancelled" info toast appears
    const infoToast = page.locator('div[role="alert"]:has-text("Post cancelled")');
    await expect(infoToast).toBeVisible({ timeout: 3000 });

    // Screenshot: Post cancelled toast
    await page.screenshot({ path: 'test-results/11-post-cancelled.png', fullPage: true });

    // Verify post was not created
    await page.waitForTimeout(1000);
    await expect(page.locator('text=rm -rf')).not.toBeVisible();
  });

  test('Warning dialog continue allows post but backend blocks /prod/', async ({ page }) => {
    const postInput = page.locator('textarea[placeholder*="What\'s on your mind"]');
    await postInput.fill('Write to /workspaces/agent-feed/prod/test.txt');

    await page.click('button:has-text("Quick Post")');

    // Wait for warning dialog
    const warningDialog = page.locator('div[role="dialog"]:has-text("System Operation Detected")');
    await expect(warningDialog).toBeVisible();

    // Screenshot: Dialog before continue
    await page.screenshot({ path: 'test-results/12-dialog-before-continue.png', fullPage: true });

    // Click Continue Anyway button
    await page.click('button:has-text("Continue Anyway")');

    // Wait for dialog to disappear
    await expect(warningDialog).not.toBeVisible();

    // Backend should block with error toast
    const errorToast = page.locator('div[role="alert"]:has-text("Access to protected system directories")');
    await expect(errorToast).toBeVisible({ timeout: 5000 });

    // Screenshot: Backend error toast
    await page.screenshot({ path: 'test-results/13-backend-blocked.png', fullPage: true });

    // Verify post was not created
    await page.waitForTimeout(1000);
    await expect(page.locator('text=/workspaces/agent-feed/prod/')).not.toBeVisible();

    // Screenshot: Final state
    await page.screenshot({ path: 'test-results/14-final-state.png', fullPage: true });
  });

  test('Warning dialog continue allows non-protected path post', async ({ page }) => {
    const postInput = page.locator('textarea[placeholder*="What\'s on your mind"]');
    await postInput.fill('Create /workspaces/agent-feed/frontend/new-component.tsx');

    await page.click('button:has-text("Quick Post")');

    // Wait for warning dialog
    const warningDialog = page.locator('div[role="dialog"]:has-text("System Operation Detected")');
    await expect(warningDialog).toBeVisible();

    // Click Continue Anyway
    await page.click('button:has-text("Continue Anyway")');

    // Should succeed with success toast
    const successToast = page.locator('div[role="alert"]:has-text("Post created successfully")');
    await expect(successToast).toBeVisible({ timeout: 5000 });

    // Screenshot: Success after continue
    await page.screenshot({ path: 'test-results/15-continue-success.png', fullPage: true });

    // Verify post appears in feed
    await page.waitForTimeout(1000);
    await expect(page.locator('text=new-component.tsx')).toBeVisible();
  });

  test('Toast notifications auto-dismiss after 5 seconds', async ({ page }) => {
    // Create normal post
    const postInput = page.locator('textarea[placeholder*="What\'s on your mind"]');
    await postInput.fill('Testing toast auto-dismiss');

    await page.click('button:has-text("Quick Post")');

    // Wait for success toast
    const successToast = page.locator('div[role="alert"]:has-text("Post created successfully")');
    await expect(successToast).toBeVisible();

    // Screenshot: Toast visible
    await page.screenshot({ path: 'test-results/16-toast-before-dismiss.png', fullPage: true });

    // Wait 6 seconds for auto-dismiss
    await page.waitForTimeout(6000);

    // Toast should be gone
    await expect(successToast).not.toBeVisible();

    // Screenshot: Toast auto-dismissed
    await page.screenshot({ path: 'test-results/17-toast-auto-dismissed.png', fullPage: true });
  });

  test('Multiple toasts stack correctly', async ({ page }) => {
    // Trigger multiple toasts rapidly by attempting protected path post 3 times
    const postInput = page.locator('textarea[placeholder*="What\'s on your mind"]');

    // First attempt
    await postInput.fill('Test 1: /workspaces/agent-feed/prod/test1.txt');
    await page.click('button:has-text("Quick Post")');
    await page.click('button:has-text("Continue Anyway")'); // Continue past warning

    // Wait briefly
    await page.waitForTimeout(500);

    // Second attempt
    await postInput.fill('Test 2: /workspaces/agent-feed/prod/test2.txt');
    await page.click('button:has-text("Quick Post")');
    await page.click('button:has-text("Continue Anyway")');

    // Wait for toasts to stack
    await page.waitForTimeout(1000);

    // Screenshot: Multiple toasts stacked
    await page.screenshot({ path: 'test-results/18-multiple-toasts.png', fullPage: true });

    // Verify multiple error toasts are visible
    const errorToasts = page.locator('div[role="alert"]:has-text("protected")');
    await expect(errorToasts).toHaveCount(2, { timeout: 3000 });
  });

  test('Keyboard navigation works in warning dialog', async ({ page }) => {
    const postInput = page.locator('textarea[placeholder*="What\'s on your mind"]');
    await postInput.fill('sudo chmod 777 /etc/passwd');

    await page.click('button:has-text("Quick Post")');

    // Wait for dialog
    const warningDialog = page.locator('div[role="dialog"]');
    await expect(warningDialog).toBeVisible();

    // Cancel button should have auto-focus
    const cancelButton = page.locator('button:has-text("Cancel")');
    await expect(cancelButton).toBeFocused();

    // Screenshot: Keyboard focus on cancel
    await page.screenshot({ path: 'test-results/19-keyboard-focus.png', fullPage: true });

    // Press Escape to close
    await page.keyboard.press('Escape');

    // Dialog should close
    await expect(warningDialog).not.toBeVisible();

    // Screenshot: Dialog closed via keyboard
    await page.screenshot({ path: 'test-results/20-keyboard-escape.png', fullPage: true });
  });

  test('Dark mode renders correctly', async ({ page }) => {
    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    await page.waitForTimeout(500);

    // Screenshot: Dark mode initial
    await page.screenshot({ path: 'test-results/21-dark-mode-initial.png', fullPage: true });

    // Create post with risky content to show dialog
    const postInput = page.locator('textarea[placeholder*="What\'s on your mind"]');
    await postInput.fill('Delete /workspaces/agent-feed/.git/ directory');

    await page.click('button:has-text("Quick Post")');

    // Wait for dialog
    const warningDialog = page.locator('div[role="dialog"]');
    await expect(warningDialog).toBeVisible();

    // Screenshot: Dark mode dialog
    await page.screenshot({ path: 'test-results/22-dark-mode-dialog.png', fullPage: true });

    // Cancel and trigger error toast
    await page.click('button:has-text("Continue Anyway")');

    // Wait for error toast
    await page.waitForTimeout(2000);

    // Screenshot: Dark mode toast
    await page.screenshot({ path: 'test-results/23-dark-mode-toast.png', fullPage: true });
  });
});

test.describe('Regression Tests - Existing Features', () => {
  test('Existing feed functionality still works', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');

    // Verify feed loads
    await expect(page.locator('text=Agent Feed').or(page.locator('text=Feed'))).toBeVisible();

    // Screenshot: Feed loaded
    await page.screenshot({ path: 'test-results/24-regression-feed.png', fullPage: true });
  });

  test('Analytics tab still works', async ({ page }) => {
    await page.goto('http://localhost:5173/analytics');
    await page.waitForLoadState('networkidle');

    // Verify analytics loads
    await expect(page.locator('text=Analytics').or(page.locator('text=Monitoring'))).toBeVisible();

    // Screenshot: Analytics loaded
    await page.screenshot({ path: 'test-results/25-regression-analytics.png', fullPage: true });
  });

  test('Monitoring tab still works', async ({ page }) => {
    await page.goto('http://localhost:5173/analytics?tab=monitoring');
    await page.waitForLoadState('networkidle');

    // Verify monitoring tab loads
    await expect(page.locator('text=Monitoring').or(page.locator('text=Health'))).toBeVisible();

    // Screenshot: Monitoring tab
    await page.screenshot({ path: 'test-results/26-regression-monitoring.png', fullPage: true });
  });
});
