import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage.js';

test.describe('Navigation Component', () => {
  let homePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
  });

  test('should display navigation menu', async ({ page }) => {
    await expect(page.locator('[data-testid="navigation"]')).toBeVisible();
  });

  test('should navigate to feed page', async ({ page }) => {
    await homePage.navigateToFeed();
    await expect(page).toHaveURL(/.*feed/);
  });

  test('should navigate to agents page', async ({ page }) => {
    await homePage.navigateToAgents();
    await expect(page).toHaveURL(/.*agents/);
  });

  test('should highlight active navigation item', async ({ page }) => {
    await homePage.navigateToFeed();
    const feedNavItem = page.locator('[data-testid="nav-feed"]');
    await expect(feedNavItem).toHaveClass(/active/);
  });

  test('should have working logo link', async ({ page }) => {
    await homePage.navigateToFeed(); // Go to another page first
    await page.click('[data-testid="logo"]');
    await expect(page).toHaveURL(/.*\/$/); // Should return to home
  });

  test('navigation screenshot comparison', async ({ page }) => {
    await expect(page.locator('[data-testid="navigation"]')).toHaveScreenshot('navigation-default.png');
  });

  test('mobile navigation menu', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test only runs on mobile');

    const hamburgerMenu = page.locator('[data-testid="mobile-menu-toggle"]');
    await expect(hamburgerMenu).toBeVisible();

    await hamburgerMenu.click();
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
  });
});