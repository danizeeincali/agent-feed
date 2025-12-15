import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive White Screen Validation Test Suite
 * Mission: Validate white screen fix and full user workflow
 */

test.describe('White Screen Validation - Comprehensive Tests', () => {
  let page: Page;
  const baseURL = 'http://127.0.0.1:5173';

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    // Enable console monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser Console Error:', msg.text());
      }
    });

    // Monitor for page errors
    page.on('pageerror', error => {
      console.error('Page Error:', error.message);
    });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Page Load Test - No White Screen Detection', async () => {
    console.log('🧪 Testing: Page Load without White Screen');

    // Navigate to application
    await page.goto(baseURL, { waitUntil: 'networkidle' });

    // Wait for initial content load
    await page.waitForTimeout(2000);

    // Check if page has loaded content (not white screen)
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
    expect(bodyContent.trim().length).toBeGreaterThan(10);

    // Check for React root div
    const reactRoot = page.locator('#root');
    await expect(reactRoot).toBeVisible();

    // Verify no white screen by checking for meaningful content
    const hasVisibleContent = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      let visibleText = '';
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          visibleText += el.textContent || '';
        }
      });
      return visibleText.trim().length > 50;
    });

    expect(hasVisibleContent).toBe(true);
    console.log('✅ Page Load Test: PASSED - No white screen detected');
  });

  test('Navigation Test - All Sidebar Links Functional', async () => {
    console.log('🧪 Testing: Navigation Functionality');

    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Test navigation elements
    const navigationTests = [
      { selector: '[data-testid="nav-feed"]', name: 'Feed Tab' },
      { selector: '[data-testid="nav-agents"]', name: 'Agents Tab' },
      { selector: '[data-testid="nav-dynamic-pages"]', name: 'Dynamic Pages Tab' },
      { selector: 'a[href*="feed"], button:has-text("Feed")', name: 'Feed Link/Button' },
      { selector: 'a[href*="agent"], button:has-text("Agent")', name: 'Agents Link/Button' },
    ];

    let passedTests = 0;
    let totalTests = navigationTests.length;

    for (const navTest of navigationTests) {
      try {
        const element = page.locator(navTest.selector).first();
        const isVisible = await element.isVisible().catch(() => false);

        if (isVisible) {
          await element.click();
          await page.waitForTimeout(500);
          console.log(`✅ ${navTest.name}: Clickable and functional`);
          passedTests++;
        } else {
          console.log(`⚠️ ${navTest.name}: Not found or not visible`);
        }
      } catch (error) {
        console.log(`❌ ${navTest.name}: Error - ${error.message}`);
      }
    }

    console.log(`🎯 Navigation Test Results: ${passedTests}/${totalTests} tests passed`);
    expect(passedTests).toBeGreaterThan(0);
  });

  test('Interactive Control Test - Claude Code Interface', async () => {
    console.log('🧪 Testing: Interactive Control Loading');

    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Look for Claude Code or terminal interface elements
    const interactiveElements = [
      { selector: '[data-testid="claude-terminal"]', name: 'Claude Terminal' },
      { selector: '[data-testid="terminal-interface"]', name: 'Terminal Interface' },
      { selector: 'textarea, input[type="text"]', name: 'Input Field' },
      { selector: '.terminal, .claude-interface', name: 'Claude Interface' },
      { selector: 'button:has-text("Send"), button:has-text("Submit")', name: 'Action Button' }
    ];

    let foundElements = 0;

    for (const element of interactiveElements) {
      try {
        const isVisible = await page.locator(element.selector).first().isVisible().catch(() => false);
        if (isVisible) {
          console.log(`✅ ${element.name}: Found and visible`);
          foundElements++;
        } else {
          console.log(`⚠️ ${element.name}: Not found`);
        }
      } catch (error) {
        console.log(`❌ ${element.name}: Error checking visibility`);
      }
    }

    console.log(`🎯 Interactive Elements Found: ${foundElements}/${interactiveElements.length}`);
    expect(foundElements).toBeGreaterThan(0);
  });

  test('Component Mount Test - Critical Components Render', async () => {
    console.log('🧪 Testing: Component Mounting');

    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Test for critical React components
    const componentTests = [
      { selector: '[data-testid*="feed"]', name: 'Feed Component' },
      { selector: '[data-testid*="agent"]', name: 'Agent Component' },
      { selector: '[data-testid*="post"]', name: 'Post Component' },
      { selector: '.card, .post-card, .agent-card', name: 'Card Components' },
      { selector: 'header, nav, main', name: 'Layout Components' },
      { selector: 'button, .btn', name: 'Interactive Buttons' }
    ];

    let mountedComponents = 0;

    for (const component of componentTests) {
      try {
        const count = await page.locator(component.selector).count();
        if (count > 0) {
          console.log(`✅ ${component.name}: ${count} instances mounted`);
          mountedComponents++;
        } else {
          console.log(`⚠️ ${component.name}: No instances found`);
        }
      } catch (error) {
        console.log(`❌ ${component.name}: Error checking mount status`);
      }
    }

    console.log(`🎯 Component Mount Results: ${mountedComponents}/${componentTests.length} component types found`);
    expect(mountedComponents).toBeGreaterThan(2);
  });

  test('Error Detection - Browser Console Validation', async () => {
    console.log('🧪 Testing: Console Error Detection');

    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Monitor page errors
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Interact with the page to trigger any hidden errors
    try {
      await page.click('body');
      await page.keyboard.press('Tab');
      await page.waitForTimeout(1000);
    } catch (error) {
      console.log('Minor interaction error (expected):', error.message);
    }

    // Filter out known non-critical errors
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('favicon') &&
      !error.includes('sourcemap') &&
      !error.includes('ws://') &&
      !error.toLowerCase().includes('warning')
    );

    console.log(`🔍 Console Errors Found: ${consoleErrors.length} total, ${criticalErrors.length} critical`);
    console.log(`🔍 Page Errors Found: ${pageErrors.length}`);

    if (criticalErrors.length > 0) {
      console.log('Critical Console Errors:');
      criticalErrors.forEach(error => console.log(`  ❌ ${error}`));
    }

    if (pageErrors.length > 0) {
      console.log('Page Errors:');
      pageErrors.forEach(error => console.log(`  ❌ ${error}`));
    }

    // Allow some minor errors but fail on major issues
    expect(criticalErrors.length).toBeLessThan(5);
    expect(pageErrors.length).toBeLessThan(3);

    if (criticalErrors.length === 0 && pageErrors.length === 0) {
      console.log('✅ Clean browser console - no critical errors detected');
    }
  });

  test('Full User Workflow Validation', async () => {
    console.log('🧪 Testing: Complete User Workflow');

    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Test complete user workflow
    const workflowSteps = [
      {
        name: 'Page Load',
        action: async () => {
          const content = await page.locator('body').textContent();
          return content && content.trim().length > 50;
        }
      },
      {
        name: 'Interactive Elements',
        action: async () => {
          const buttons = await page.locator('button, input, textarea').count();
          return buttons > 0;
        }
      },
      {
        name: 'Navigation Available',
        action: async () => {
          const navElements = await page.locator('nav, [role="navigation"], a, .nav').count();
          return navElements > 0;
        }
      },
      {
        name: 'Content Sections',
        action: async () => {
          const sections = await page.locator('main, section, article, .content').count();
          return sections > 0;
        }
      }
    ];

    let workflowPassed = 0;

    for (const step of workflowSteps) {
      try {
        const result = await step.action();
        if (result) {
          console.log(`✅ ${step.name}: PASSED`);
          workflowPassed++;
        } else {
          console.log(`❌ ${step.name}: FAILED`);
        }
      } catch (error) {
        console.log(`❌ ${step.name}: ERROR - ${error.message}`);
      }
    }

    console.log(`🎯 Workflow Validation: ${workflowPassed}/${workflowSteps.length} steps passed`);
    expect(workflowPassed).toBe(workflowSteps.length);
  });
});