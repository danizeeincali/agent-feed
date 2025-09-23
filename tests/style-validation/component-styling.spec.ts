import { test, expect, Page } from '@playwright/test';

// Component styling validation test suite
test.describe('Component Styling Validation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Disable animations for consistent testing
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
  });

  test('Button component styling validation', async ({ page }) => {
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      // Test different button states
      for (let i = 0; i < Math.min(5, buttonCount); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          // Default state
          await expect(button).toHaveScreenshot(`button-${i}-default.png`);

          // Hover state
          await button.hover();
          await page.waitForTimeout(100);
          await expect(button).toHaveScreenshot(`button-${i}-hover.png`);

          // Focus state
          await button.focus();
          await page.waitForTimeout(100);
          await expect(button).toHaveScreenshot(`button-${i}-focus.png`);

          // Active state (mouse down)
          await page.mouse.move(0, 0); // Move mouse away first
          const buttonBox = await button.boundingBox();
          if (buttonBox) {
            await page.mouse.move(buttonBox.x + buttonBox.width / 2, buttonBox.y + buttonBox.height / 2);
            await page.mouse.down();
            await expect(button).toHaveScreenshot(`button-${i}-active.png`);
            await page.mouse.up();
          }

          // Validate button styles
          const styles = await button.evaluate((btn) => {
            const computed = window.getComputedStyle(btn);
            return {
              backgroundColor: computed.backgroundColor,
              color: computed.color,
              border: computed.border,
              borderRadius: computed.borderRadius,
              padding: computed.padding,
              fontSize: computed.fontSize,
              cursor: computed.cursor,
              display: computed.display
            };
          });

          // Basic style validations
          expect(styles.cursor).toBe('pointer');
          expect(styles.display).toMatch(/inline-block|inline-flex|flex|block/);
          expect(parseFloat(styles.fontSize)).toBeGreaterThan(10);
        }
      }

      // Test button variants if they exist
      const primaryButtons = page.locator('.btn-primary, .bg-primary-500, [class*="primary"]');
      if (await primaryButtons.count() > 0) {
        await expect(primaryButtons.first()).toHaveScreenshot('button-primary.png');
      }

      const secondaryButtons = page.locator('.btn-secondary, .bg-secondary-500, [class*="secondary"]');
      if (await secondaryButtons.count() > 0) {
        await expect(secondaryButtons.first()).toHaveScreenshot('button-secondary.png');
      }

      const dangerButtons = page.locator('.btn-danger, .bg-red-500, [class*="danger"]');
      if (await dangerButtons.count() > 0) {
        await expect(dangerButtons.first()).toHaveScreenshot('button-danger.png');
      }
    }
  });

  test('Card component styling validation', async ({ page }) => {
    const cards = page.locator('.card, .panel, .widget, [class*="card"], [class*="panel"]');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      for (let i = 0; i < Math.min(3, cardCount); i++) {
        const card = cards.nth(i);
        if (await card.isVisible()) {
          await expect(card).toHaveScreenshot(`card-${i}.png`);

          // Validate card styles
          const styles = await card.evaluate((cardEl) => {
            const computed = window.getComputedStyle(cardEl);
            return {
              backgroundColor: computed.backgroundColor,
              border: computed.border,
              borderRadius: computed.borderRadius,
              boxShadow: computed.boxShadow,
              padding: computed.padding,
              margin: computed.margin,
              display: computed.display
            };
          });

          // Card should have some styling
          expect(
            styles.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
            styles.border !== 'none' ||
            styles.boxShadow !== 'none'
          ).toBeTruthy();

          // Check for hover effects on interactive cards
          await card.hover();
          await page.waitForTimeout(100);
          await expect(card).toHaveScreenshot(`card-${i}-hover.png`);
        }
      }

      // Test card content areas
      const cardHeaders = page.locator('.card-header, .card-title, [class*="card-header"]');
      if (await cardHeaders.count() > 0) {
        await expect(cardHeaders.first()).toHaveScreenshot('card-header.png');
      }

      const cardBodies = page.locator('.card-body, .card-content, [class*="card-body"]');
      if (await cardBodies.count() > 0) {
        await expect(cardBodies.first()).toHaveScreenshot('card-body.png');
      }

      const cardFooters = page.locator('.card-footer, [class*="card-footer"]');
      if (await cardFooters.count() > 0) {
        await expect(cardFooters.first()).toHaveScreenshot('card-footer.png');
      }
    }
  });

  test('Navigation component styling validation', async ({ page }) => {
    const nav = page.locator('nav, .nav, .navigation, header');
    if (await nav.count() > 0) {
      await expect(nav.first()).toHaveScreenshot('navigation.png');

      // Test navigation items
      const navItems = page.locator('.nav-item, .menu-item, nav a, nav li');
      const navItemCount = await navItems.count();

      if (navItemCount > 0) {
        for (let i = 0; i < Math.min(5, navItemCount); i++) {
          const navItem = navItems.nth(i);
          if (await navItem.isVisible()) {
            // Default state
            await expect(navItem).toHaveScreenshot(`nav-item-${i}-default.png`);

            // Hover state
            await navItem.hover();
            await page.waitForTimeout(100);
            await expect(navItem).toHaveScreenshot(`nav-item-${i}-hover.png`);

            // Check if it's an active nav item
            const isActive = await navItem.evaluate((item) => {
              return item.classList.contains('active') ||
                     item.classList.contains('current') ||
                     item.getAttribute('aria-current') === 'page';
            });

            if (isActive) {
              await expect(navItem).toHaveScreenshot(`nav-item-${i}-active.png`);
            }
          }
        }
      }

      // Test mobile navigation if hamburger menu exists
      const mobileMenuTrigger = page.locator('.menu-toggle, .hamburger, [aria-label*="menu"]');
      if (await mobileMenuTrigger.count() > 0) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(500);

        await expect(mobileMenuTrigger.first()).toHaveScreenshot('mobile-menu-trigger.png');

        await mobileMenuTrigger.first().click();
        await page.waitForTimeout(500);

        const mobileMenu = page.locator('.mobile-menu, [role="dialog"], .menu');
        if (await mobileMenu.count() > 0) {
          await expect(mobileMenu.first()).toHaveScreenshot('mobile-menu.png');
        }
      }
    }
  });

  test('Form component styling validation', async ({ page }) => {
    const forms = page.locator('form, .form');
    if (await forms.count() > 0) {
      await expect(forms.first()).toHaveScreenshot('form.png');

      // Test input fields
      const inputs = page.locator('input');
      const inputCount = await inputs.count();

      if (inputCount > 0) {
        for (let i = 0; i < Math.min(5, inputCount); i++) {
          const input = inputs.nth(i);
          if (await input.isVisible()) {
            // Default state
            await expect(input).toHaveScreenshot(`input-${i}-default.png`);

            // Focus state
            await input.focus();
            await page.waitForTimeout(100);
            await expect(input).toHaveScreenshot(`input-${i}-focus.png`);

            // With content
            await input.fill('Test content');
            await expect(input).toHaveScreenshot(`input-${i}-filled.png`);

            // Clear for next test
            await input.clear();

            // Validate input styles
            const styles = await input.evaluate((inp) => {
              const computed = window.getComputedStyle(inp);
              return {
                border: computed.border,
                borderRadius: computed.borderRadius,
                padding: computed.padding,
                fontSize: computed.fontSize,
                backgroundColor: computed.backgroundColor,
                outline: computed.outline
              };
            });

            expect(styles.border).not.toBe('none');
            expect(parseFloat(styles.fontSize)).toBeGreaterThan(10);
          }
        }
      }

      // Test textareas
      const textareas = page.locator('textarea');
      if (await textareas.count() > 0) {
        const textarea = textareas.first();
        await expect(textarea).toHaveScreenshot('textarea-default.png');
        await textarea.focus();
        await expect(textarea).toHaveScreenshot('textarea-focus.png');
      }

      // Test select elements
      const selects = page.locator('select');
      if (await selects.count() > 0) {
        const select = selects.first();
        await expect(select).toHaveScreenshot('select-default.png');
        await select.focus();
        await expect(select).toHaveScreenshot('select-focus.png');
      }

      // Test form labels
      const labels = page.locator('label');
      if (await labels.count() > 0) {
        await expect(labels.first()).toHaveScreenshot('form-label.png');
      }

      // Test form validation states
      const errorInputs = page.locator('.error, .invalid, [aria-invalid="true"]');
      if (await errorInputs.count() > 0) {
        await expect(errorInputs.first()).toHaveScreenshot('input-error.png');
      }

      const successInputs = page.locator('.success, .valid, [aria-invalid="false"]');
      if (await successInputs.count() > 0) {
        await expect(successInputs.first()).toHaveScreenshot('input-success.png');
      }
    }
  });

  test('Modal and dialog styling validation', async ({ page }) => {
    // Look for modal triggers
    const modalTriggers = page.locator('[data-testid*="modal"], [aria-haspopup="dialog"], .modal-trigger');
    if (await modalTriggers.count() > 0) {
      const trigger = modalTriggers.first();
      await trigger.click();
      await page.waitForTimeout(500);

      // Check for modal
      const modal = page.locator('[role="dialog"], .modal, .dialog');
      if (await modal.count() > 0) {
        await expect(modal.first()).toHaveScreenshot('modal.png');

        // Test modal overlay
        const overlay = page.locator('.modal-overlay, .backdrop, [role="dialog"] ~ div');
        if (await overlay.count() > 0) {
          await expect(overlay.first()).toHaveScreenshot('modal-overlay.png');
        }

        // Test modal header
        const modalHeader = page.locator('.modal-header, .dialog-header');
        if (await modalHeader.count() > 0) {
          await expect(modalHeader.first()).toHaveScreenshot('modal-header.png');
        }

        // Test modal close button
        const closeButton = page.locator('.modal-close, [aria-label="close"], .close');
        if (await closeButton.count() > 0) {
          await expect(closeButton.first()).toHaveScreenshot('modal-close-button.png');
          await closeButton.first().click();
        } else {
          // Try to close modal by pressing Escape
          await page.keyboard.press('Escape');
        }
      }
    }
  });

  test('Loading and spinner styling validation', async ({ page }) => {
    const loadingElements = page.locator('.loading, .spinner, [data-testid="loading"]');
    if (await loadingElements.count() > 0) {
      await expect(loadingElements.first()).toHaveScreenshot('loading-spinner.png');

      // Test different loading states
      const loadingTexts = page.locator('.loading-text, [data-testid="loading-text"]');
      if (await loadingTexts.count() > 0) {
        await expect(loadingTexts.first()).toHaveScreenshot('loading-text.png');
      }

      const progressBars = page.locator('.progress, .progress-bar, [role="progressbar"]');
      if (await progressBars.count() > 0) {
        await expect(progressBars.first()).toHaveScreenshot('progress-bar.png');
      }
    }
  });

  test('Alert and notification styling validation', async ({ page }) => {
    const alerts = page.locator('.alert, .notification, [role="alert"]');
    if (await alerts.count() > 0) {
      for (let i = 0; i < Math.min(3, await alerts.count()); i++) {
        const alert = alerts.nth(i);
        if (await alert.isVisible()) {
          await expect(alert).toHaveScreenshot(`alert-${i}.png`);
        }
      }
    }

    // Test different alert types
    const successAlerts = page.locator('.alert-success, .success, [class*="success"]');
    if (await successAlerts.count() > 0) {
      await expect(successAlerts.first()).toHaveScreenshot('alert-success.png');
    }

    const errorAlerts = page.locator('.alert-error, .error, [class*="error"]');
    if (await errorAlerts.count() > 0) {
      await expect(errorAlerts.first()).toHaveScreenshot('alert-error.png');
    }

    const warningAlerts = page.locator('.alert-warning, .warning, [class*="warning"]');
    if (await warningAlerts.count() > 0) {
      await expect(warningAlerts.first()).toHaveScreenshot('alert-warning.png');
    }

    const infoAlerts = page.locator('.alert-info, .info, [class*="info"]');
    if (await infoAlerts.count() > 0) {
      await expect(infoAlerts.first()).toHaveScreenshot('alert-info.png');
    }
  });

  test('Table styling validation', async ({ page }) => {
    const tables = page.locator('table');
    if (await tables.count() > 0) {
      await expect(tables.first()).toHaveScreenshot('table.png');

      // Test table headers
      const tableHeaders = page.locator('th');
      if (await tableHeaders.count() > 0) {
        await expect(tableHeaders.first()).toHaveScreenshot('table-header.png');
      }

      // Test table rows
      const tableRows = page.locator('tr');
      if (await tableRows.count() > 1) {
        await expect(tableRows.nth(1)).toHaveScreenshot('table-row.png');
      }

      // Test hover effect on rows
      const dataRows = page.locator('tbody tr');
      if (await dataRows.count() > 0) {
        await dataRows.first().hover();
        await page.waitForTimeout(100);
        await expect(dataRows.first()).toHaveScreenshot('table-row-hover.png');
      }
    }
  });

  test('Badge and tag styling validation', async ({ page }) => {
    const badges = page.locator('.badge, .tag, .chip, [class*="badge"]');
    if (await badges.count() > 0) {
      for (let i = 0; i < Math.min(5, await badges.count()); i++) {
        const badge = badges.nth(i);
        if (await badge.isVisible()) {
          await expect(badge).toHaveScreenshot(`badge-${i}.png`);
        }
      }
    }
  });

  test('Tooltip styling validation', async ({ page }) => {
    const tooltipTriggers = page.locator('[title], [data-tooltip], [aria-describedby]');
    if (await tooltipTriggers.count() > 0) {
      const trigger = tooltipTriggers.first();
      await trigger.hover();
      await page.waitForTimeout(500);

      // Look for tooltip
      const tooltip = page.locator('.tooltip, [role="tooltip"]');
      if (await tooltip.count() > 0) {
        await expect(tooltip.first()).toHaveScreenshot('tooltip.png');
      }
    }
  });

  test('Accessibility focus indicators', async ({ page }) => {
    // Test focus indicators on focusable elements
    const focusableElements = page.locator('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const focusableCount = await focusableElements.count();

    if (focusableCount > 0) {
      for (let i = 0; i < Math.min(5, focusableCount); i++) {
        const element = focusableElements.nth(i);
        if (await element.isVisible()) {
          await element.focus();
          await page.waitForTimeout(100);

          const styles = await element.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              outline: computed.outline,
              outlineOffset: computed.outlineOffset,
              boxShadow: computed.boxShadow
            };
          });

          // Should have some form of focus indicator
          expect(
            styles.outline !== 'none' ||
            styles.boxShadow !== 'none' ||
            styles.outlineOffset !== '0px'
          ).toBeTruthy();

          await expect(element).toHaveScreenshot(`focus-indicator-${i}.png`);
        }
      }
    }
  });
});