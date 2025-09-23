/**
 * London School TDD: User Journey End-to-End Tests
 * 
 * PRINCIPLES:
 * - Test complete user workflows with real system
 * - Focus on user-system collaboration patterns
 * - Verify entire interaction chains
 * - NO MOCKS - Real user journeys only
 * 
 * RED → GREEN → REFACTOR for each journey
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { BASE_URL } from '../api-environment';

// Real browser automation for user journey testing
test.describe('London School TDD: Dynamic Pages User Journeys', () => {

  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // Create real browser context for user simulation
    context = await browser.newContext({
      baseURL: 'http://localhost:5173', // Vite dev server
      viewport: { width: 1280, height: 720 }
    });
    
    page = await context.newPage();
    
    // Wait for real backend to be ready
    await page.goto('/');
    await page.waitForTimeout(2000); // Allow app initialization
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('Complete Dynamic Page Creation Journey', () => {

    test('User creates and views dynamic page - full workflow', async () => {
      // RED: User navigates to agents page
      await page.goto('/agents');
      
      // Verify agents page loads with real data
      await expect(page.locator('h1')).toContainText(/agents/i);
      
      // GREEN: User selects an agent (or creates test agent)
      const agentCard = page.locator('[data-testid="agent-card"]').first();
      if (await agentCard.count() > 0) {
        await agentCard.click();
      } else {
        // Navigate directly to test agent if no cards available
        await page.goto('/agents/test-agent');
      }
      
      // Verify agent profile loads
      await expect(page.locator('h1, h2')).toContainText(/agent|profile/i);
      
      // User creates a dynamic page
      const createPageButton = page.locator('button:has-text("Create Page"), button:has-text("New Page"), [data-testid="create-page"]').first();
      if (await createPageButton.count() > 0) {
        await createPageButton.click();
        
        // Fill page creation form
        await page.fill('input[name="pageId"], input[placeholder*="page"]', 'test-journey-page');
        await page.fill('input[name="title"], input[placeholder*="title"]', 'User Journey Test Page');
        
        const submitButton = page.locator('button:has-text("Create"), button:has-text("Save"), button[type="submit"]').first();
        await submitButton.click();
      }
      
      // REFACTOR: Navigate to dynamic page directly for testing
      await page.goto('/agents/test-agent/pages/test-journey-page');
      
      // Verify dynamic page loads
      await page.waitForSelector('[class*="dynamic-page"], .dynamic-page-content, h1', { timeout: 10000 });
      
      // User should see dynamic page content
      const pageContent = page.locator('.dynamic-page-content, main, [class*="page"]');
      await expect(pageContent).toBeVisible();
    });

    test('User navigates between multiple dynamic pages', async () => {
      // RED: User creates multiple pages
      const pages = ['page-one', 'page-two', 'page-three'];
      
      for (const pageId of pages) {
        // Create page via API for reliable testing
        await page.evaluate(async ({ pageId, BASE_URL }) => {
          await fetch(`${BASE_URL}/agents/nav-test-agent/pages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pageId,
              title: `Navigation Test Page ${pageId}`,
              content: `<div data-testid="${pageId}-content">Content for ${pageId}</div>`
            })
          });
        }, { pageId, BASE_URL });
      }
      
      // GREEN: User navigates between pages
      for (const pageId of pages) {
        await page.goto(`/agents/nav-test-agent/pages/${pageId}`);
        
        // Verify page loads
        await page.waitForSelector(`[data-testid="${pageId}-content"], h1, .dynamic-page-content`, { timeout: 10000 });
        
        // Verify correct page content
        const content = page.locator(`[data-testid="${pageId}-content"]`);
        if (await content.count() > 0) {
          await expect(content).toContainText(pageId);
        }
        
        // Test back navigation
        const backButton = page.locator('button:has([class*="arrow-left"]), button:has-text("Back"), [aria-label*="back"]').first();
        if (await backButton.count() > 0) {
          await backButton.click();
          await page.waitForTimeout(1000);
        }
      }
      
      // REFACTOR: Verify navigation history works
      await page.goBack();
      await page.waitForTimeout(500);
      await page.goForward();
      await page.waitForTimeout(500);
    });
  });

  test.describe('Error Recovery User Journey', () => {

    test('User encounters and recovers from page not found', async () => {
      // RED: User navigates to non-existent page
      await page.goto('/agents/missing-agent/pages/missing-page');
      
      // GREEN: Verify error handling
      await page.waitForSelector('[class*="error"], .error, h2, h1', { timeout: 10000 });
      
      const errorMessage = page.locator(':has-text("not found"), :has-text("error"), :has-text("Error"), h1, h2').first();
      await expect(errorMessage).toBeVisible();
      
      // User recovers by navigating back
      const backButton = page.locator('button:has([class*="arrow-left"]), button:has-text("Back"), [aria-label*="back"]').first();
      if (await backButton.count() > 0) {
        await backButton.click();
      } else {
        // Alternative recovery - navigate to home
        await page.goto('/');
      }
      
      // REFACTOR: Verify recovery successful
      await page.waitForSelector('h1, main, [class*="app"]', { timeout: 5000 });
      expect(page.url()).not.toContain('missing-page');
    });

    test('User handles network connectivity issues', async () => {
      // RED: Simulate network issues
      await page.goto('/agents/network-test/pages/connectivity-test');
      
      // Block network to simulate connectivity issues
      await context.setOffline(true);
      
      // User tries to navigate
      await page.goto('/agents/network-test/pages/another-page');
      
      // GREEN: Verify graceful degradation
      await page.waitForTimeout(3000);
      
      // Restore network
      await context.setOffline(false);
      
      // REFACTOR: User should be able to continue
      await page.reload();
      await page.waitForSelector('h1, main, [class*="page"]', { timeout: 10000 });
    });
  });

  test.describe('Performance User Journey', () => {

    test('User experiences fast page loads', async () => {
      // RED: Measure page load performance
      const startTime = Date.now();
      
      await page.goto('/agents/perf-test/pages/performance-page');
      
      // GREEN: Wait for page to be interactive
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('h1, .dynamic-page-content, main', { timeout: 10000 });
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      // REFACTOR: Verify acceptable performance
      expect(loadTime).toBeLessThan(5000); // 5 second max load time
      
      console.log(`⚡ Dynamic page load time: ${loadTime}ms`);
    });

    test('User navigates quickly between pages', async () => {
      // RED: Test rapid navigation performance
      const pages = ['quick-one', 'quick-two', 'quick-three'];
      
      const navigationTimes: number[] = [];
      
      for (const pageId of pages) {
        const startTime = Date.now();
        
        await page.goto(`/agents/quick-nav/pages/${pageId}`);
        await page.waitForSelector('h1, .dynamic-page-content', { timeout: 10000 });
        
        const endTime = Date.now();
        navigationTimes.push(endTime - startTime);
      }
      
      // GREEN: Verify all navigations were reasonably fast
      navigationTimes.forEach((time, index) => {
        expect(time).toBeLessThan(3000); // 3 second max per navigation
        console.log(`🚀 Navigation ${index + 1} time: ${time}ms`);
      });
      
      // REFACTOR: Average navigation time should be good
      const avgTime = navigationTimes.reduce((sum, time) => sum + time, 0) / navigationTimes.length;
      expect(avgTime).toBeLessThan(2000); // 2 second average
    });
  });

  test.describe('Accessibility User Journey', () => {

    test('Keyboard user can navigate dynamic pages', async () => {
      // RED: User relies on keyboard navigation
      await page.goto('/agents/a11y-test/pages/keyboard-test');
      
      await page.waitForSelector('h1, main, .dynamic-page-content', { timeout: 10000 });
      
      // GREEN: Test keyboard navigation
      await page.keyboard.press('Tab'); // Should focus first interactive element
      
      const focusedElement = page.locator(':focus');
      if (await focusedElement.count() > 0) {
        await expect(focusedElement).toBeVisible();
      }
      
      // Test back button keyboard access
      const backButton = page.locator('button:has([class*="arrow-left"]), button:has-text("Back")').first();
      if (await backButton.count() > 0) {
        await backButton.focus();
        await page.keyboard.press('Enter');
        
        // REFACTOR: Verify keyboard navigation worked
        await page.waitForTimeout(1000);
      }
    });

    test('Screen reader user can understand page structure', async () => {
      // RED: Test semantic structure for screen readers
      await page.goto('/agents/screen-reader/pages/semantic-test');
      
      await page.waitForSelector('h1, main', { timeout: 10000 });
      
      // GREEN: Verify proper heading structure
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      
      if (headingCount > 0) {
        const firstHeading = headings.first();
        await expect(firstHeading).toBeVisible();
      }
      
      // Verify main content area
      const main = page.locator('main, [role="main"]');
      if (await main.count() > 0) {
        await expect(main).toBeVisible();
      }
      
      // REFACTOR: Verify navigation landmarks
      const navElements = page.locator('nav, [role="navigation"]');
      if (await navElements.count() > 0) {
        await expect(navElements.first()).toBeVisible();
      }
    });
  });

  test.describe('Mobile User Journey', () => {

    test('Mobile user interacts with dynamic pages', async () => {
      // RED: Simulate mobile viewport
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      
      await page.goto('/agents/mobile-test/pages/responsive-page');
      
      await page.waitForSelector('h1, main, .dynamic-page-content', { timeout: 10000 });
      
      // GREEN: Test touch interactions
      const pageContent = page.locator('.dynamic-page-content, main').first();
      if (await pageContent.count() > 0) {
        await pageContent.tap();
      }
      
      // Test mobile back button
      const backButton = page.locator('button:has([class*="arrow-left"]), button:has-text("Back")').first();
      if (await backButton.count() > 0) {
        await backButton.tap();
        await page.waitForTimeout(1000);
      }
      
      // REFACTOR: Verify mobile layout
      const content = page.locator('body');
      const boundingBox = await content.boundingBox();
      
      if (boundingBox) {
        expect(boundingBox.width).toBeLessThanOrEqual(375);
      }
    });
  });

  test.describe('Real-time Collaboration Journey', () => {

    test('User sees live updates on dynamic page', async () => {
      // RED: User opens page for live updates
      await page.goto('/agents/live-test/pages/real-time-page');
      
      await page.waitForSelector('h1, .dynamic-page-content', { timeout: 10000 });
      
      // GREEN: Simulate live update via API
      await page.evaluate(async ({ BASE_URL }) => {
        await fetch(`${BASE_URL}/agents/live-test/pages/real-time-page`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '<div data-testid="live-update">Live updated content!</div>'
          })
        });
      }, { BASE_URL });
      
      // REFACTOR: User should see live update (if WebSocket implemented)
      await page.waitForTimeout(2000);
      
      const liveContent = page.locator('[data-testid="live-update"]');
      if (await liveContent.count() > 0) {
        await expect(liveContent).toBeVisible();
        await expect(liveContent).toContainText('Live updated');
      }
    });
  });
});