import { test, expect, Page, Locator } from '@playwright/test';
import { join } from 'path';
import { writeFileSync } from 'fs';

interface ValidationResult {
  component: string;
  url: string;
  success: boolean;
  errors: string[];
  screenshots: string[];
  domAnalysis: any;
  eventTrace: any[];
  performanceMetrics: any;
}

class MentionValidationFramework {
  private results: ValidationResult[] = [];
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async captureScreenshot(name: string): Promise<string> {
    const screenshotPath = `test-results/emergency-${name}-${Date.now()}.png`;
    await this.page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
    return screenshotPath;
  }

  async analyzeDOM(selector: string): Promise<any> {
    return await this.page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) return null;
      
      return {
        tagName: element.tagName,
        className: element.className,
        innerHTML: element.innerHTML.substring(0, 1000),
        attributes: Array.from(element.attributes).map(attr => ({
          name: attr.name,
          value: attr.value
        })),
        children: Array.from(element.children).map(child => ({
          tagName: child.tagName,
          className: child.className,
          id: child.id
        })),
        computedStyles: {
          display: window.getComputedStyle(element).display,
          visibility: window.getComputedStyle(element).visibility,
          opacity: window.getComputedStyle(element).opacity,
          position: window.getComputedStyle(element).position,
          zIndex: window.getComputedStyle(element).zIndex
        }
      };
    }, selector);
  }

  async traceEventFlow(inputSelector: string): Promise<any[]> {
    const events: any[] = [];
    
    // Set up event listeners
    await this.page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (element) {
        ['keydown', 'keyup', 'input', 'change', 'focus', 'blur'].forEach(eventType => {
          element.addEventListener(eventType, (e: any) => {
            (window as any).eventTrace = (window as any).eventTrace || [];
            (window as any).eventTrace.push({
              type: eventType,
              key: e.key,
              target: e.target.tagName,
              timestamp: Date.now(),
              value: e.target.value
            });
          });
        });
      }
    }, inputSelector);

    return events;
  }

  async measurePerformance(action: () => Promise<void>): Promise<any> {
    const startTime = Date.now();
    await action();
    const endTime = Date.now();
    
    const metrics = await this.page.evaluate(() => ({
      timing: performance.timing,
      memory: (performance as any).memory,
      navigation: performance.navigation
    }));

    return {
      duration: endTime - startTime,
      ...metrics
    };
  }

  async validateMentionComponent(
    componentName: string,
    url: string,
    testAction: () => Promise<void>
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      component: componentName,
      url,
      success: false,
      errors: [],
      screenshots: [],
      domAnalysis: null,
      eventTrace: [],
      performanceMetrics: null
    };

    try {
      console.log(`🔍 Testing ${componentName} at ${url}`);
      await this.page.goto(url, { waitUntil: 'networkidle' });
      
      // Initial screenshot
      result.screenshots.push(await this.captureScreenshot(`${componentName}-initial`));
      
      // Perform the test action and capture performance
      result.performanceMetrics = await this.measurePerformance(testAction);
      
      // Final screenshot
      result.screenshots.push(await this.captureScreenshot(`${componentName}-final`));
      
      result.success = true;
      
    } catch (error) {
      result.errors.push(error.message);
      result.screenshots.push(await this.captureScreenshot(`${componentName}-error`));
    }

    this.results.push(result);
    return result;
  }

  generateReport(): string {
    const timestamp = new Date().toISOString();
    const report = {
      timestamp,
      summary: {
        totalComponents: this.results.length,
        successful: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length
      },
      results: this.results,
      conclusions: this.generateConclusions()
    };

    const reportPath = `/workspaces/agent-feed/frontend/docs/EMERGENCY_LIVE_MENTION_VALIDATION_REPORT_${timestamp.replace(/[:.]/g, '-')}.md`;
    const markdownReport = this.generateMarkdownReport(report);
    
    writeFileSync(reportPath, markdownReport);
    return reportPath;
  }

  private generateConclusions(): string[] {
    const conclusions = [];
    const failedComponents = this.results.filter(r => !r.success);
    
    if (failedComponents.length > 0) {
      conclusions.push(`❌ ${failedComponents.length} components failed @ mention integration`);
      failedComponents.forEach(comp => {
        conclusions.push(`  - ${comp.component}: ${comp.errors.join(', ')}`);
      });
    }
    
    const successfulComponents = this.results.filter(r => r.success);
    if (successfulComponents.length > 0) {
      conclusions.push(`✅ ${successfulComponents.length} components passed @ mention integration`);
    }
    
    return conclusions;
  }

  private generateMarkdownReport(report: any): string {
    return `# 🚨 EMERGENCY LIVE @ MENTION INTEGRATION VALIDATION REPORT

**Generated**: ${report.timestamp}

## 📊 Executive Summary

- **Total Components Tested**: ${report.summary.totalComponents}
- **Successful**: ${report.summary.successful}
- **Failed**: ${report.summary.failed}
- **Success Rate**: ${((report.summary.successful / report.summary.totalComponents) * 100).toFixed(1)}%

## 🎯 Test Results

${report.results.map((result: ValidationResult) => `
### ${result.component}
- **URL**: ${result.url}
- **Status**: ${result.success ? '✅ PASSED' : '❌ FAILED'}
- **Errors**: ${result.errors.length > 0 ? result.errors.join(', ') : 'None'}
- **Screenshots**: ${result.screenshots.length} captured
- **Performance**: ${result.performanceMetrics?.duration}ms

${result.domAnalysis ? `#### DOM Analysis
\`\`\`json
${JSON.stringify(result.domAnalysis, null, 2)}
\`\`\`` : ''}
`).join('\n')}

## 🔍 Conclusions

${report.conclusions.map((c: string) => `- ${c}`).join('\n')}

## 🚀 Recommendations

Based on this live validation, immediate fixes needed for failed components.
`;
  }
}

test.describe('🚨 EMERGENCY: Live @ Mention Integration Validation', () => {
  let validator: MentionValidationFramework;

  test.beforeEach(async ({ page }) => {
    validator = new MentionValidationFramework(page);
    
    // Set up console error tracking
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser Console Error:', msg.text());
      }
    });
    
    // Set up network error tracking
    page.on('requestfailed', request => {
      console.error('Network Request Failed:', request.url(), request.failure()?.errorText);
    });
  });

  test('🎯 PostCreator @ Mention Integration Validation', async ({ page }) => {
    await validator.validateMentionComponent(
      'PostCreator',
      'http://localhost:5173/',
      async () => {
        // Wait for page to load completely
        await page.waitForLoadState('networkidle');
        
        // Click "Start a post..." button
        const postButton = page.locator('text="Start a post..."').first();
        await expect(postButton).toBeVisible({ timeout: 10000 });
        await postButton.click();
        
        // Wait for modal or form to appear
        await page.waitForTimeout(1000);
        
        // Look for text input in post creator
        const textInput = page.locator('textarea, input[type="text"]').first();
        await expect(textInput).toBeVisible({ timeout: 5000 });
        
        // Analyze DOM before typing
        const domBefore = await validator.analyzeDOM('body');
        
        // Set up event tracing
        await validator.traceEventFlow('textarea, input[type="text"]');
        
        // Focus and type @ symbol
        await textInput.click();
        await textInput.type('@');
        
        // Wait for potential dropdown
        await page.waitForTimeout(1000);
        
        // Check if MentionInput dropdown appears
        const dropdown = page.locator('[data-testid="mention-dropdown"], .mention-dropdown, .suggestions-dropdown');
        const isDropdownVisible = await dropdown.isVisible().catch(() => false);
        
        if (!isDropdownVisible) {
          throw new Error('@ mention dropdown did not appear in PostCreator');
        }
        
        // Test typing more characters
        await textInput.type('tes');
        await page.waitForTimeout(500);
        
        // Verify suggestions are filtered
        const suggestions = page.locator('[data-testid="mention-suggestion"], .mention-suggestion');
        const suggestionCount = await suggestions.count();
        
        if (suggestionCount === 0) {
          throw new Error('No @ mention suggestions appeared');
        }
        
        // Test selection
        await suggestions.first().click();
        
        // Verify mention was inserted
        const finalValue = await textInput.inputValue();
        if (!finalValue.includes('@')) {
          throw new Error('@ mention was not properly inserted');
        }
      }
    );
  });

  test('💬 CommentForm @ Mention Integration Validation', async ({ page }) => {
    await validator.validateMentionComponent(
      'CommentForm',
      'http://localhost:5173/',
      async () => {
        // Wait for posts to load
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // Find a post and click reply/comment button
        const commentButton = page.locator('[data-testid="comment-button"], button:has-text("Reply"), button:has-text("Comment")').first();
        await expect(commentButton).toBeVisible({ timeout: 10000 });
        await commentButton.click();
        
        // Wait for comment form to appear
        await page.waitForTimeout(1000);
        
        // Look for comment text input
        const commentInput = page.locator('textarea[placeholder*="comment"], textarea[placeholder*="reply"], input[placeholder*="comment"]').first();
        await expect(commentInput).toBeVisible({ timeout: 5000 });
        
        // Set up event tracing
        await validator.traceEventFlow('textarea[placeholder*="comment"], input[placeholder*="comment"]');
        
        // Focus and type @ symbol
        await commentInput.click();
        await commentInput.type('@');
        
        // Wait for potential dropdown
        await page.waitForTimeout(1000);
        
        // Check if MentionInput dropdown appears
        const dropdown = page.locator('[data-testid="mention-dropdown"], .mention-dropdown, .suggestions-dropdown');
        const isDropdownVisible = await dropdown.isVisible().catch(() => false);
        
        if (!isDropdownVisible) {
          throw new Error('@ mention dropdown did not appear in CommentForm');
        }
        
        // Test suggestion selection
        const suggestions = page.locator('[data-testid="mention-suggestion"], .mention-suggestion');
        const suggestionCount = await suggestions.count();
        
        if (suggestionCount === 0) {
          throw new Error('No @ mention suggestions in CommentForm');
        }
        
        await suggestions.first().click();
        
        // Verify mention was inserted
        const finalValue = await commentInput.inputValue();
        if (!finalValue.includes('@')) {
          throw new Error('@ mention was not inserted in CommentForm');
        }
      }
    );
  });

  test('⚡ QuickPost @ Mention Integration Validation', async ({ page }) => {
    await validator.validateMentionComponent(
      'QuickPost',
      'http://localhost:5173/posting',
      async () => {
        // Wait for posting page to load
        await page.waitForLoadState('networkidle');
        
        // Look for QuickPost text input
        const quickPostInput = page.locator('textarea, input[type="text"]').first();
        await expect(quickPostInput).toBeVisible({ timeout: 10000 });
        
        // Set up event tracing
        await validator.traceEventFlow('textarea, input[type="text"]');
        
        // Focus and type @ symbol
        await quickPostInput.click();
        await quickPostInput.type('@');
        
        // Wait for potential dropdown
        await page.waitForTimeout(1000);
        
        // Check if MentionInput dropdown appears
        const dropdown = page.locator('[data-testid="mention-dropdown"], .mention-dropdown, .suggestions-dropdown');
        const isDropdownVisible = await dropdown.isVisible().catch(() => false);
        
        if (!isDropdownVisible) {
          throw new Error('@ mention dropdown did not appear in QuickPost');
        }
        
        // Test suggestion interaction
        const suggestions = page.locator('[data-testid="mention-suggestion"], .mention-suggestion');
        const suggestionCount = await suggestions.count();
        
        if (suggestionCount === 0) {
          throw new Error('No @ mention suggestions in QuickPost');
        }
        
        await suggestions.first().click();
        
        // Verify mention was inserted
        const finalValue = await quickPostInput.inputValue();
        if (!finalValue.includes('@')) {
          throw new Error('@ mention was not inserted in QuickPost');
        }
      }
    );
  });

  test('🔗 Reference Comparison: Working Demo vs Broken Production', async ({ page }) => {
    await validator.validateMentionComponent(
      'MentionDemo (Working Reference)',
      'http://localhost:5173/mention-demo',
      async () => {
        // Test the working demo
        await page.waitForLoadState('networkidle');
        
        const demoInput = page.locator('input[type="text"], textarea').first();
        await expect(demoInput).toBeVisible({ timeout: 5000 });
        
        await demoInput.click();
        await demoInput.type('@');
        
        await page.waitForTimeout(1000);
        
        const dropdown = page.locator('[data-testid="mention-dropdown"], .mention-dropdown, .suggestions-dropdown');
        const isDropdownVisible = await dropdown.isVisible().catch(() => false);
        
        if (!isDropdownVisible) {
          throw new Error('Even the demo is broken - critical system failure');
        }
        
        // Capture successful demo DOM for comparison
        const demoDOMAnalysis = await validator.analyzeDOM('body');
        
        // Store for comparison with broken components
        await page.evaluate((analysis) => {
          window.workingDemoDOM = analysis;
        }, demoDOMAnalysis);
      }
    );
  });

  test('🌐 Cross-Browser @ Mention Validation', async ({ page, browserName }) => {
    await validator.validateMentionComponent(
      `Cross-Browser-${browserName}`,
      'http://localhost:5173/',
      async () => {
        // Test basic @ mention functionality across browsers
        await page.waitForLoadState('networkidle');
        
        const postButton = page.locator('text="Start a post..."').first();
        await postButton.click();
        
        const textInput = page.locator('textarea, input[type="text"]').first();
        await textInput.click();
        await textInput.type('@test');
        
        await page.waitForTimeout(1000);
        
        const dropdown = page.locator('[data-testid="mention-dropdown"], .mention-dropdown');
        const isVisible = await dropdown.isVisible().catch(() => false);
        
        if (!isVisible) {
          throw new Error(`@ mention failed in ${browserName}`);
        }
      }
    );
  });

  test.afterAll(async () => {
    // Generate comprehensive validation report
    const reportPath = validator.generateReport();
    console.log(`🚨 EMERGENCY VALIDATION REPORT GENERATED: ${reportPath}`);
  });
});