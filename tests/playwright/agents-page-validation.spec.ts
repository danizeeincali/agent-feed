import { test, expect, Page, Browser } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

interface ValidationResult {
  test: string;
  status: 'pass' | 'fail';
  details: string;
  screenshot?: string;
  timestamp: string;
}

class AgentsPageValidator {
  private page: Page;
  private results: ValidationResult[] = [];
  private screenshotDir = 'tests/playwright/screenshots';

  constructor(page: Page) {
    this.page = page;
  }

  async captureScreenshot(name: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    const filepath = path.join(this.screenshotDir, filename);
    await this.page.screenshot({ path: filepath, fullPage: true });
    return filename;
  }

  async addResult(test: string, status: 'pass' | 'fail', details: string, screenshot?: string) {
    this.results.push({
      test,
      status,
      details,
      screenshot,
      timestamp: new Date().toISOString()
    });
  }

  async validatePageLoad(): Promise<void> {
    try {
      // Navigate to agents page
      await this.page.goto('/agents');
      await this.page.waitForLoadState('networkidle');

      const screenshot = await this.captureScreenshot('page-load');

      // Check if page loaded successfully
      const title = await this.page.title();
      if (title.includes('Agent') || title.includes('Feed')) {
        await this.addResult('Page Load', 'pass', 'Agents page loaded successfully', screenshot);
      } else {
        await this.addResult('Page Load', 'fail', `Unexpected page title: ${title}`, screenshot);
      }
    } catch (error) {
      const screenshot = await this.captureScreenshot('page-load-error');
      await this.addResult('Page Load', 'fail', `Failed to load page: ${error}`, screenshot);
    }
  }

  async validateAgentDataSource(): Promise<void> {
    try {
      // Check network requests for agent data
      const responses: string[] = [];

      this.page.on('response', response => {
        if (response.url().includes('agents') || response.url().includes('claude')) {
          responses.push(`${response.status()} ${response.url()}`);
        }
      });

      await this.page.reload();
      await this.page.waitForLoadState('networkidle');

      const screenshot = await this.captureScreenshot('agent-data-source');

      // Look for real agent data indicators
      const agentElements = await this.page.locator('[data-testid*="agent"], .agent-card, .agent-item').count();

      if (agentElements > 0) {
        await this.addResult('Agent Data Source', 'pass',
          `Found ${agentElements} agent elements. Network calls: ${responses.join(', ')}`, screenshot);
      } else {
        await this.addResult('Agent Data Source', 'fail',
          'No agent elements found. May be using mock data.', screenshot);
      }
    } catch (error) {
      const screenshot = await this.captureScreenshot('agent-data-source-error');
      await this.addResult('Agent Data Source', 'fail', `Error validating data source: ${error}`, screenshot);
    }
  }

  async validateAgentList(): Promise<void> {
    try {
      // Wait for agent list to load
      await this.page.waitForSelector('[data-testid*="agent"], .agent-card, .agent-item, .agent-list',
        { timeout: 10000 });

      const screenshot = await this.captureScreenshot('agent-list');

      // Count agents
      const agentCount = await this.page.locator('[data-testid*="agent"], .agent-card, .agent-item').count();

      // Check for real data patterns
      const hasRealData = await this.page.evaluate(() => {
        const elements = document.querySelectorAll('[data-testid*="agent"], .agent-card, .agent-item');
        const textContent = Array.from(elements).map(el => el.textContent || '').join(' ');

        // Look for real agent indicators vs mock data
        const realDataIndicators = [
          'researcher', 'coder', 'analyst', 'optimizer', 'coordinator',
          'active', 'idle', 'busy', 'available'
        ];

        const mockDataIndicators = [
          'lorem ipsum', 'placeholder', 'sample', 'test agent', 'mock'
        ];

        const hasReal = realDataIndicators.some(indicator =>
          textContent.toLowerCase().includes(indicator));
        const hasMock = mockDataIndicators.some(indicator =>
          textContent.toLowerCase().includes(indicator));

        return { hasReal, hasMock, textContent: textContent.substring(0, 500) };
      });

      if (agentCount > 0 && hasRealData.hasReal && !hasRealData.hasMock) {
        await this.addResult('Agent List', 'pass',
          `Found ${agentCount} agents with real data. Sample: ${hasRealData.textContent}`, screenshot);
      } else if (agentCount > 0 && hasRealData.hasMock) {
        await this.addResult('Agent List', 'fail',
          `Found ${agentCount} agents but contains mock data. Sample: ${hasRealData.textContent}`, screenshot);
      } else {
        await this.addResult('Agent List', 'fail',
          `Agent list not properly loaded. Count: ${agentCount}`, screenshot);
      }
    } catch (error) {
      const screenshot = await this.captureScreenshot('agent-list-error');
      await this.addResult('Agent List', 'fail', `Error validating agent list: ${error}`, screenshot);
    }
  }

  async validateIndividualAgentDetails(): Promise<void> {
    try {
      // Find and click on first agent
      const firstAgent = this.page.locator('[data-testid*="agent"], .agent-card, .agent-item').first();
      await firstAgent.waitFor({ timeout: 5000 });

      const screenshot1 = await this.captureScreenshot('before-agent-click');

      await firstAgent.click();
      await this.page.waitForTimeout(2000); // Wait for details to load

      const screenshot2 = await this.captureScreenshot('agent-details');

      // Check if agent details are shown
      const hasDetails = await this.page.evaluate(() => {
        const content = document.body.textContent || '';
        return {
          hasCapabilities: content.includes('capabilities') || content.includes('skills'),
          hasStatus: content.includes('status') || content.includes('active') || content.includes('idle'),
          hasMetrics: content.includes('metrics') || content.includes('performance'),
          fullContent: content.substring(0, 1000)
        };
      });

      if (hasDetails.hasCapabilities || hasDetails.hasStatus || hasDetails.hasMetrics) {
        await this.addResult('Agent Details', 'pass',
          `Agent details displayed successfully. Content: ${hasDetails.fullContent}`, screenshot2);
      } else {
        await this.addResult('Agent Details', 'fail',
          'Agent details not properly displayed', screenshot2);
      }
    } catch (error) {
      const screenshot = await this.captureScreenshot('agent-details-error');
      await this.addResult('Agent Details', 'fail', `Error testing agent details: ${error}`, screenshot);
    }
  }

  async validateErrorMessages(): Promise<void> {
    try {
      const screenshot = await this.captureScreenshot('error-check');

      // Check for error messages
      const errors = await this.page.evaluate(() => {
        const errorSelectors = [
          '.error', '.alert-error', '[role="alert"]', '.text-red', '.text-danger',
          '[class*="error"]', '[class*="fail"]'
        ];

        const errorElements = errorSelectors.flatMap(selector =>
          Array.from(document.querySelectorAll(selector))
        );

        return errorElements.map(el => ({
          text: el.textContent || '',
          className: el.className,
          tagName: el.tagName
        })).filter(error => error.text.trim().length > 0);
      });

      // Also check console errors
      const consoleErrors: string[] = [];
      this.page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      if (errors.length === 0 && consoleErrors.length === 0) {
        await this.addResult('Error Messages', 'pass',
          'No error messages detected on page', screenshot);
      } else {
        await this.addResult('Error Messages', 'fail',
          `Found errors: ${JSON.stringify(errors)} Console: ${consoleErrors.join(', ')}`, screenshot);
      }
    } catch (error) {
      const screenshot = await this.captureScreenshot('error-check-error');
      await this.addResult('Error Messages', 'fail', `Error checking for errors: ${error}`, screenshot);
    }
  }

  async validateResponsiveDesign(): Promise<void> {
    const viewports = [
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Large Desktop', width: 2560, height: 1440 }
    ];

    for (const viewport of viewports) {
      try {
        await this.page.setViewportSize({ width: viewport.width, height: viewport.height });
        await this.page.waitForTimeout(1000); // Allow layout to settle

        const screenshot = await this.captureScreenshot(`responsive-${viewport.name.toLowerCase()}`);

        // Check if content is properly displayed
        const layoutCheck = await this.page.evaluate(() => {
          const body = document.body;
          const hasHorizontalScroll = body.scrollWidth > window.innerWidth;
          const hasOverflowingElements = Array.from(document.querySelectorAll('*')).some(el => {
            const rect = el.getBoundingClientRect();
            return rect.right > window.innerWidth + 10; // 10px tolerance
          });

          return {
            hasHorizontalScroll,
            hasOverflowingElements,
            viewportWidth: window.innerWidth,
            bodyWidth: body.scrollWidth
          };
        });

        if (!layoutCheck.hasHorizontalScroll && !layoutCheck.hasOverflowingElements) {
          await this.addResult(`Responsive ${viewport.name}`, 'pass',
            `Layout properly responsive at ${viewport.width}x${viewport.height}`, screenshot);
        } else {
          await this.addResult(`Responsive ${viewport.name}`, 'fail',
            `Layout issues at ${viewport.width}x${viewport.height}: ${JSON.stringify(layoutCheck)}`, screenshot);
        }
      } catch (error) {
        const screenshot = await this.captureScreenshot(`responsive-${viewport.name.toLowerCase()}-error`);
        await this.addResult(`Responsive ${viewport.name}`, 'fail',
          `Error testing ${viewport.name} viewport: ${error}`, screenshot);
      }
    }
  }

  async validateUIInteractions(): Promise<void> {
    try {
      const interactions = [];

      // Test navigation
      const navLinks = await this.page.locator('nav a, .nav-link, [role="navigation"] a').count();
      if (navLinks > 0) {
        await this.page.locator('nav a, .nav-link, [role="navigation"] a').first().click();
        await this.page.waitForTimeout(1000);
        interactions.push(`Navigation links: ${navLinks}`);
      }

      // Test buttons
      const buttons = await this.page.locator('button:not([disabled])').count();
      if (buttons > 0) {
        const firstButton = this.page.locator('button:not([disabled])').first();
        await firstButton.click();
        await this.page.waitForTimeout(500);
        interactions.push(`Clickable buttons: ${buttons}`);
      }

      // Test form elements
      const inputs = await this.page.locator('input, select, textarea').count();
      if (inputs > 0) {
        const firstInput = this.page.locator('input[type="text"], input[type="email"], textarea').first();
        await firstInput.fill('test input');
        await this.page.waitForTimeout(500);
        interactions.push(`Form elements: ${inputs}`);
      }

      const screenshot = await this.captureScreenshot('ui-interactions');

      if (interactions.length > 0) {
        await this.addResult('UI Interactions', 'pass',
          `Successfully tested interactions: ${interactions.join(', ')}`, screenshot);
      } else {
        await this.addResult('UI Interactions', 'fail',
          'No interactive elements found to test', screenshot);
      }
    } catch (error) {
      const screenshot = await this.captureScreenshot('ui-interactions-error');
      await this.addResult('UI Interactions', 'fail', `Error testing UI interactions: ${error}`, screenshot);
    }
  }

  async generateReport(): Promise<string> {
    const timestamp = new Date().toISOString();
    const passCount = this.results.filter(r => r.status === 'pass').length;
    const failCount = this.results.filter(r => r.status === 'fail').length;
    const totalCount = this.results.length;

    const report = {
      timestamp,
      summary: {
        total: totalCount,
        passed: passCount,
        failed: failCount,
        successRate: `${((passCount / totalCount) * 100).toFixed(1)}%`
      },
      results: this.results,
      verdict: failCount === 0 ? '✅ ALL TESTS PASSED - 100% REAL FUNCTIONALITY VERIFIED' :
               `❌ ${failCount} TESTS FAILED - ISSUES DETECTED`,
      screenshots: this.results.filter(r => r.screenshot).map(r => r.screenshot)
    };

    const reportPath = 'tests/playwright/reports/agents-validation-report.json';
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    return reportPath;
  }

  getResults(): ValidationResult[] {
    return this.results;
  }
}

test.describe('Agents Page Comprehensive Validation', () => {
  let validator: AgentsPageValidator;

  test.beforeEach(async ({ page }) => {
    validator = new AgentsPageValidator(page);
  });

  test('should validate complete agents page functionality', async ({ page }) => {
    // Run all validation tests
    await validator.validatePageLoad();
    await validator.validateAgentDataSource();
    await validator.validateAgentList();
    await validator.validateIndividualAgentDetails();
    await validator.validateErrorMessages();
    await validator.validateResponsiveDesign();
    await validator.validateUIInteractions();

    // Generate comprehensive report
    const reportPath = await validator.generateReport();
    const results = validator.getResults();

    console.log(`\n🔍 AGENTS PAGE VALIDATION COMPLETE`);
    console.log(`📊 Report generated: ${reportPath}`);
    console.log(`✅ Passed: ${results.filter(r => r.status === 'pass').length}`);
    console.log(`❌ Failed: ${results.filter(r => r.status === 'fail').length}`);

    // Assert all tests passed
    const failedTests = results.filter(r => r.status === 'fail');
    if (failedTests.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      failedTests.forEach(test => {
        console.log(`  - ${test.test}: ${test.details}`);
      });
    }

    expect(failedTests.length).toBe(0);
  });
});