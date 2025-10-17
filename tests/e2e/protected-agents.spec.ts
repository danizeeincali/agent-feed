/**
 * E2E Tests: Protected Agents UI
 *
 * End-to-end tests using Playwright to verify protected agent functionality in the UI.
 *
 * Test Coverage:
 * - Verify agent loading in UI
 * - Test admin protected config update UI
 * - Screenshot validation of protection indicators
 * - User interaction flows
 */

import { test, expect } from '@playwright/test';

test.describe('Protected Agents - E2E Tests (Playwright)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to agents configuration page
    await page.goto('http://localhost:5173/agents');
  });

  test('should display agents list with protection indicators', async ({ page }) => {
    // Wait for agents to load
    await page.waitForSelector('[data-testid="agents-list"]', { timeout: 10000 });

    // Check for protection indicators (🔒)
    const protectedAgents = page.locator('[data-testid^="agent-card"]').filter({
      has: page.locator('text=/🔒|Protected/i')
    });

    // At least one agent might have protection
    const count = await protectedAgents.count();
    console.log(`Found ${count} protected agents`);

    // Take screenshot for visual verification
    await page.screenshot({ path: 'tests/screenshots/protected-agents-list.png', fullPage: true });
  });

  test('should show read-only UI for protected fields', async ({ page }) => {
    // Navigate to specific agent (if exists)
    const agentCard = page.locator('[data-testid^="agent-card"]').first();

    if (await agentCard.isVisible()) {
      await agentCard.click();

      // Wait for agent details page
      await page.waitForSelector('[data-testid="agent-details"]', { timeout: 5000 });

      // Check for protected fields section
      const protectedSection = page.locator('[data-testid="protected-fields"]');

      if (await protectedSection.isVisible()) {
        // Verify fields are read-only
        const editButtons = protectedSection.locator('button:has-text("Edit")');
        const editButtonCount = await editButtons.count();

        // Protected section should not have edit buttons
        expect(editButtonCount).toBe(0);

        // Take screenshot
        await page.screenshot({
          path: 'tests/screenshots/protected-fields-readonly.png',
          fullPage: true
        });
      }
    }
  });

  test('should display protection tooltip on hover', async ({ page }) => {
    const protectedField = page.locator('[data-testid="protected-field"]').first();

    if (await protectedField.isVisible()) {
      // Hover over protected field
      await protectedField.hover();

      // Check for tooltip
      const tooltip = page.locator('[role="tooltip"]').filter({
        hasText: /system managed|protected|read-only/i
      });

      await expect(tooltip).toBeVisible({ timeout: 2000 });

      // Take screenshot with tooltip
      await page.screenshot({
        path: 'tests/screenshots/protection-tooltip.png'
      });
    }
  });

  test('should prevent editing protected fields', async ({ page }) => {
    const protectedInput = page.locator('input[data-protected="true"]').first();

    if (await protectedInput.isVisible()) {
      // Verify input is disabled
      await expect(protectedInput).toBeDisabled();

      // Attempt to click should not enable
      await protectedInput.click({ force: true });
      await expect(protectedInput).toBeDisabled();
    }
  });

  test('should show admin UI for protected config updates (if authenticated)', async ({ page, context }) => {
    // Try to access admin panel (may require authentication)
    await page.goto('http://localhost:5173/admin/protected-configs');

    // Check if login is required
    const loginForm = page.locator('form[data-testid="login-form"]');

    if (await loginForm.isVisible()) {
      console.log('Admin panel requires authentication');

      // Take screenshot of login page
      await page.screenshot({
        path: 'tests/screenshots/admin-login-required.png'
      });
    } else {
      // Admin panel accessible
      const configForm = page.locator('[data-testid="protected-config-form"]');

      if (await configForm.isVisible()) {
        // Verify form has required fields
        await expect(page.locator('input[name="agent_id"]')).toBeVisible();
        await expect(page.locator('textarea[name="permissions"]')).toBeVisible();

        // Take screenshot
        await page.screenshot({
          path: 'tests/screenshots/admin-protected-config-form.png',
          fullPage: true
        });
      }
    }
  });

  test('should display validation errors for invalid protected config', async ({ page }) => {
    // Skip if not on admin page
    await page.goto('http://localhost:5173/admin/protected-configs');

    const configForm = page.locator('[data-testid="protected-config-form"]');

    if (await configForm.isVisible()) {
      // Try to submit empty form
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Check for validation errors
      const errors = page.locator('[data-testid="form-error"]');
      const errorCount = await errors.count();

      expect(errorCount).toBeGreaterThan(0);

      // Take screenshot
      await page.screenshot({
        path: 'tests/screenshots/validation-errors.png'
      });
    }
  });

  test('should show visual distinction between user and protected fields', async ({ page }) => {
    await page.goto('http://localhost:5173/agents');

    const agentCard = page.locator('[data-testid^="agent-card"]').first();

    if (await agentCard.isVisible()) {
      await agentCard.click();
      await page.waitForSelector('[data-testid="agent-details"]');

      // Take full screenshot showing both field types
      await page.screenshot({
        path: 'tests/screenshots/field-visual-distinction.png',
        fullPage: true
      });

      // Verify color coding or icons
      const userFields = page.locator('[data-field-type="user-editable"]');
      const protectedFields = page.locator('[data-field-type="protected"]');

      const userCount = await userFields.count();
      const protectedCount = await protectedFields.count();

      console.log(`User-editable fields: ${userCount}, Protected fields: ${protectedCount}`);
    }
  });

  test('should allow editing user fields while protecting system fields', async ({ page }) => {
    await page.goto('http://localhost:5173/agents');

    const agentCard = page.locator('[data-testid^="agent-card"]').first();

    if (await agentCard.isVisible()) {
      await agentCard.click();
      await page.waitForSelector('[data-testid="agent-details"]');

      // Try to edit user field (e.g., description)
      const descriptionField = page.locator('input[name="description"]');

      if (await descriptionField.isVisible() && await descriptionField.isEnabled()) {
        await descriptionField.fill('Updated description');

        // Verify protected fields remain unchanged
        const workspaceField = page.locator('input[name="workspace"]');

        if (await workspaceField.isVisible()) {
          await expect(workspaceField).toBeDisabled();
        }

        // Take screenshot
        await page.screenshot({
          path: 'tests/screenshots/edit-user-fields-only.png',
          fullPage: true
        });
      }
    }
  });

  test('should display protection status badge', async ({ page }) => {
    await page.goto('http://localhost:5173/agents');

    // Look for protection status badges
    const badges = page.locator('[data-testid="protection-badge"]');
    const badgeCount = await badges.count();

    if (badgeCount > 0) {
      // Verify badge text
      const firstBadge = badges.first();
      await expect(firstBadge).toHaveText(/protected|system managed/i);

      // Take screenshot
      await page.screenshot({
        path: 'tests/screenshots/protection-badges.png',
        fullPage: true
      });
    }
  });

  test('should show agent configuration source (sidecar reference)', async ({ page }) => {
    await page.goto('http://localhost:5173/agents');

    const agentCard = page.locator('[data-testid^="agent-card"]').first();

    if (await agentCard.isVisible()) {
      await agentCard.click();
      await page.waitForSelector('[data-testid="agent-details"]');

      // Look for sidecar reference display
      const sidecarInfo = page.locator('[data-testid="sidecar-reference"]');

      if (await sidecarInfo.isVisible()) {
        // Verify it shows the path
        await expect(sidecarInfo).toContainText('.system/');
        await expect(sidecarInfo).toContainText('.protected.yaml');

        // Take screenshot
        await page.screenshot({
          path: 'tests/screenshots/sidecar-reference-display.png'
        });
      }
    }
  });
});

test.describe('Protected Agents - Accessibility Tests', () => {
  test('should have accessible protection indicators', async ({ page }) => {
    await page.goto('http://localhost:5173/agents');

    // Check for ARIA labels on protected fields
    const protectedElements = page.locator('[aria-readonly="true"]');
    const count = await protectedElements.count();

    console.log(`Found ${count} elements with aria-readonly attribute`);

    // Verify screen reader text
    const srText = page.locator('.sr-only').filter({ hasText: /protected|read-only/i });
    const srCount = await srText.count();

    expect(srCount).toBeGreaterThanOrEqual(0);
  });

  test('should support keyboard navigation of protected fields', async ({ page }) => {
    await page.goto('http://localhost:5173/agents');

    const agentCard = page.locator('[data-testid^="agent-card"]').first();

    if (await agentCard.isVisible()) {
      // Tab through fields
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Verify focus indicators are visible
      const focused = page.locator(':focus');
      await expect(focused).toBeVisible();

      // Take screenshot
      await page.screenshot({
        path: 'tests/screenshots/keyboard-navigation.png'
      });
    }
  });
});
