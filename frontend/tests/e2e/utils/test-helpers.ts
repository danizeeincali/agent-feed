import { Page } from '@playwright/test';

/**
 * Wait for network idle
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for element to be visible
 */
export async function waitForElement(page: Page, selector: string, timeout = 10000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Get text content safely
 */
export async function getTextContent(page: Page, selector: string): Promise<string | null> {
  const element = await page.locator(selector).first();
  if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
    return await element.textContent();
  }
  return null;
}

/**
 * Click element safely
 */
export async function safeClick(page: Page, selector: string, timeout = 5000) {
  const element = page.locator(selector).first();
  await element.waitFor({ state: 'visible', timeout });
  await element.click();
}

/**
 * Type text safely
 */
export async function safeType(page: Page, selector: string, text: string, timeout = 5000) {
  const element = page.locator(selector).first();
  await element.waitFor({ state: 'visible', timeout });
  await element.fill(text);
}

/**
 * Check if element exists
 */
export async function elementExists(page: Page, selector: string, timeout = 3000): Promise<boolean> {
  return await page.locator(selector).first().isVisible({ timeout }).catch(() => false);
}

/**
 * Take screenshot with timestamp
 */
export async function takeTimestampedScreenshot(page: Page, name: string, fullPage = true) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `/workspaces/agent-feed/frontend/tests/e2e/screenshots/${name}-${timestamp}.png`;
  await page.screenshot({ path, fullPage });
  return path;
}

/**
 * Scroll element into view
 */
export async function scrollIntoView(page: Page, selector: string) {
  const element = page.locator(selector).first();
  await element.scrollIntoViewIfNeeded();
}
