import { test, expect } from '@playwright/test';
import fs from 'fs';

test.describe('Quick Agents Page Validation', () => {
  test('Capture agents page state and generate report', async ({ page }) => {
    const consoleErrors = [];
    const networkRequests = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          text: msg.text(),
          location: msg.location(),
          timestamp: new Date().toISOString()
        });
      }
    });

    // Track network requests
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: new Date().toISOString()
      });
    });

    console.log('🚀 Navigating to agents page...');

    try {
      // Navigate with shorter timeout
      const response = await page.goto('http://localhost:5173/agents', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      console.log(`📊 Response status: ${response?.status() || 'unknown'}`);

      // Wait for any dynamic content
      await page.waitForTimeout(5000);

      // Take screenshot regardless of state
      await page.screenshot({
        path: '/workspaces/agent-feed/tests/playwright/agents-page-current-state.png',
        fullPage: true
      });

      // Get page content
      const pageContent = await page.content();
      const title = await page.title();

      // Check for React elements
      const reactElements = await page.locator('[data-reactroot], #__next, #root').count();
      const hasContent = pageContent.length > 500;

      // Generate quick report
      const report = {
        timestamp: new Date().toISOString(),
        url: 'http://localhost:5173/agents',
        status: response?.status() || 'unknown',
        title: title,
        pageContentLength: pageContent.length,
        reactElementsFound: reactElements,
        hasSubstantialContent: hasContent,
        consoleErrorCount: consoleErrors.length,
        networkRequestCount: networkRequests.length,
        consoleErrors: consoleErrors.slice(0, 10), // Limit to first 10 errors
        networkRequests: networkRequests.slice(0, 20).map(req => ({
          url: req.url,
          method: req.method
        })),
        pagePreview: pageContent.substring(0, 1000)
      };

      // Save report
      fs.writeFileSync(
        '/workspaces/agent-feed/tests/playwright/quick-validation-report.json',
        JSON.stringify(report, null, 2)
      );

      // Save page content for debugging
      fs.writeFileSync(
        '/workspaces/agent-feed/tests/playwright/page-content.html',
        pageContent
      );

      console.log('✅ Quick validation completed');
      console.log(`📊 Status: ${report.status}`);
      console.log(`📄 Title: ${report.title}`);
      console.log(`📦 Content length: ${report.pageContentLength}`);
      console.log(`⚛️ React elements: ${report.reactElementsFound}`);
      console.log(`❌ Console errors: ${report.consoleErrorCount}`);
      console.log(`🌐 Network requests: ${report.networkRequestCount}`);

    } catch (error) {
      console.log(`❌ Navigation failed: ${error.message}`);

      // Still try to capture whatever we can
      await page.screenshot({
        path: '/workspaces/agent-feed/tests/playwright/agents-page-error-state.png',
        fullPage: true
      }).catch(() => {});

      const errorReport = {
        timestamp: new Date().toISOString(),
        url: 'http://localhost:5173/agents',
        error: error.message,
        consoleErrors: consoleErrors,
        networkRequests: networkRequests.map(req => ({
          url: req.url,
          method: req.method
        }))
      };

      fs.writeFileSync(
        '/workspaces/agent-feed/tests/playwright/error-report.json',
        JSON.stringify(errorReport, null, 2)
      );

      // Don't fail the test, just report the state
      console.log('📋 Error report saved');
    }
  });
});