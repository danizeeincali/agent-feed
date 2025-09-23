// Global setup for Playwright tests
async function globalSetup(config) {
  console.log('Starting global setup for Playwright tests...');

  // Add any global setup logic here
  // For example: database seeding, authentication setup, etc.

  // Wait for the dev server to be ready
  const { chromium } = require('@playwright/test');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the application to be ready
    await page.goto(config.use.baseURL, { waitUntil: 'networkidle' });
    console.log('Application is ready for testing');
  } catch (error) {
    console.error('Failed to connect to application:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = globalSetup;