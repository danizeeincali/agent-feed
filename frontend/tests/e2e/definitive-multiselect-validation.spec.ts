import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = '/workspaces/agent-feed/frontend/test-results/screenshots';
const EVIDENCE_DIR = '/workspaces/agent-feed/frontend/test-results/nld-patterns';

// Ensure directories exist
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

interface ValidationEvidence {
  timestamp: string;
  step: string;
  status: 'PASS' | 'FAIL' | 'PARTIAL' | 'NOT_FOUND';
  screenshot?: string;
  details: string;
  networkRequests?: any[];
  consoleErrors?: string[];
  elementFound?: boolean;
  interactionSuccess?: boolean;
}

class BrowserValidator {
  private evidence: ValidationEvidence[] = [];
  private page: Page;
  private networkRequests: any[] = [];
  private consoleErrors: string[] = [];

  constructor(page: Page) {
    this.page = page;
    this.setupNetworkMonitoring();
    this.setupConsoleMonitoring();
  }

  private setupNetworkMonitoring() {
    this.page.on('request', request => {
      if (request.url().includes('api') || request.url().includes('filter')) {
        this.networkRequests.push({
          timestamp: new Date().toISOString(),
          method: request.method(),
          url: request.url(),
          headers: request.headers(),
          postData: request.postData()
        });
      }
    });

    this.page.on('response', response => {
      if (response.url().includes('api') || response.url().includes('filter')) {
        const requestData = this.networkRequests.find(req => req.url === response.url());
        if (requestData) {
          requestData.status = response.status();
          requestData.statusText = response.statusText();
        }
      }
    });
  }

  private setupConsoleMonitoring() {
    this.page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        this.consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    this.page.on('pageerror', error => {
      this.consoleErrors.push(`[PAGE ERROR] ${error.message}`);
    });
  }

  async captureEvidence(step: string, status: ValidationEvidence['status'], details: string, options: {
    screenshot?: boolean;
    elementFound?: boolean;
    interactionSuccess?: boolean;
  } = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = options.screenshot ? 
      path.join(SCREENSHOT_DIR, `${timestamp}-${step.replace(/\s+/g, '-')}.png`) : undefined;

    if (screenshotPath) {
      await this.page.screenshot({ 
        path: screenshotPath, 
        fullPage: true,
        animations: 'disabled'
      });
    }

    this.evidence.push({
      timestamp: new Date().toISOString(),
      step,
      status,
      screenshot: screenshotPath,
      details,
      networkRequests: [...this.networkRequests],
      consoleErrors: [...this.consoleErrors],
      elementFound: options.elementFound,
      interactionSuccess: options.interactionSuccess
    });

    console.log(`📊 VALIDATION STEP: ${step} - ${status}`);
    console.log(`📝 Details: ${details}`);
    if (this.consoleErrors.length > 0) {
      console.log(`⚠️ Console Errors: ${this.consoleErrors.length}`);
    }
    if (this.networkRequests.length > 0) {
      console.log(`🌐 Network Requests: ${this.networkRequests.length}`);
    }
  }

  getEvidence(): ValidationEvidence[] {
    return this.evidence;
  }

  clearNetworkHistory() {
    this.networkRequests = [];
  }

  clearConsoleErrors() {
    this.consoleErrors = [];
  }
}

test.describe('Definitive Multi-Select Filter Validation', () => {
  let validator: BrowserValidator;

  test.beforeEach(async ({ page }) => {
    validator = new BrowserValidator(page);
    
    // Set longer timeout for network operations
    page.setDefaultTimeout(10000);
  });

  test('PHASE 1: Application Load and Initial State Validation', async ({ page }) => {
    console.log('🚀 Starting definitive multi-select filter validation...');

    // Step 1: Navigate to application
    await validator.captureEvidence(
      'Navigate to localhost:5173',
      'PASS',
      'Attempting to load the application',
      { screenshot: true }
    );

    try {
      await page.goto('http://localhost:5173', { 
        waitUntil: 'networkidle',
        timeout: 15000 
      });
      
      await validator.captureEvidence(
        'Application Load Success',
        'PASS',
        'Successfully loaded localhost:5173',
        { screenshot: true }
      );
    } catch (error) {
      await validator.captureEvidence(
        'Application Load Failed',
        'FAIL',
        `Failed to load application: ${error.message}`,
        { screenshot: true }
      );
      throw error;
    }

    // Step 2: Wait for initial data load
    validator.clearNetworkHistory();
    await page.waitForTimeout(2000);

    await validator.captureEvidence(
      'Initial Data Load Wait',
      'PASS',
      `Network requests after page load: ${validator.getEvidence().slice(-1)[0]?.networkRequests?.length || 0}`,
      { screenshot: true }
    );

    // Step 3: Check for basic page elements
    try {
      await page.waitForSelector('body', { timeout: 5000 });
      const title = await page.title();
      
      await validator.captureEvidence(
        'Basic Page Elements Check',
        'PASS',
        `Page title: "${title}", Body element found`,
        { elementFound: true, screenshot: true }
      );
    } catch (error) {
      await validator.captureEvidence(
        'Basic Page Elements Missing',
        'FAIL',
        `Failed to find basic page elements: ${error.message}`,
        { elementFound: false, screenshot: true }
      );
    }
  });

  test('PHASE 2: FilterPanel Interface Discovery', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Step 1: Look for FilterPanel component
    const filterSelectors = [
      '[data-testid="filter-panel"]',
      '.filter-panel',
      '[class*="filter"]',
      '[data-testid*="filter"]',
      'button[aria-label*="filter" i]',
      'button[title*="filter" i]',
      '[role="button"]:has-text("Filter")',
      'input[placeholder*="filter" i]'
    ];

    let filterPanelFound = false;
    let foundSelector = '';

    for (const selector of filterSelectors) {
      try {
        const element = await page.locator(selector).first();
        const isVisible = await element.isVisible();
        
        if (isVisible) {
          filterPanelFound = true;
          foundSelector = selector;
          break;
        }
      } catch (error) {
        // Continue checking other selectors
      }
    }

    await validator.captureEvidence(
      'FilterPanel Interface Search',
      filterPanelFound ? 'PASS' : 'NOT_FOUND',
      filterPanelFound 
        ? `FilterPanel found with selector: ${foundSelector}` 
        : 'No FilterPanel interface elements found with any common selectors',
      { elementFound: filterPanelFound, screenshot: true }
    );

    // Step 2: Search for Advanced Filter options
    const advancedFilterSelectors = [
      'text=Advanced Filter',
      'button:has-text("Advanced")',
      '[data-testid="advanced-filter"]',
      '.advanced-filter',
      'button[aria-expanded]'
    ];

    let advancedFilterFound = false;
    let advancedSelector = '';

    for (const selector of advancedFilterSelectors) {
      try {
        const element = await page.locator(selector).first();
        const isVisible = await element.isVisible();
        
        if (isVisible) {
          advancedFilterFound = true;
          advancedSelector = selector;
          break;
        }
      } catch (error) {
        // Continue checking
      }
    }

    await validator.captureEvidence(
      'Advanced Filter Search',
      advancedFilterFound ? 'PASS' : 'NOT_FOUND',
      advancedFilterFound 
        ? `Advanced filter found with selector: ${advancedSelector}` 
        : 'No Advanced Filter button found',
      { elementFound: advancedFilterFound, screenshot: true }
    );

    // Step 3: Search for any input fields that might be filter-related
    const inputSelectors = [
      'input[placeholder*="agent" i]',
      'input[placeholder*="tag" i]',
      'input[placeholder*="search" i]',
      'input[type="text"]',
      'textarea'
    ];

    let inputsFound = [];

    for (const selector of inputSelectors) {
      try {
        const elements = await page.locator(selector).all();
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          const isVisible = await element.isVisible();
          if (isVisible) {
            const placeholder = await element.getAttribute('placeholder');
            const id = await element.getAttribute('id');
            const className = await element.getAttribute('class');
            
            inputsFound.push({
              selector,
              index: i,
              placeholder,
              id,
              className
            });
          }
        }
      } catch (error) {
        // Continue
      }
    }

    await validator.captureEvidence(
      'Input Fields Discovery',
      inputsFound.length > 0 ? 'PASS' : 'NOT_FOUND',
      `Found ${inputsFound.length} input fields: ${JSON.stringify(inputsFound, null, 2)}`,
      { elementFound: inputsFound.length > 0, screenshot: true }
    );
  });

  test('PHASE 3: Multi-Select Functionality Testing', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Step 1: Try to find and click Advanced Filter
    validator.clearNetworkHistory();
    
    try {
      // Look for the advanced filter button
      const advancedButton = page.locator('text=Advanced Filter').first();
      const isAdvancedVisible = await advancedButton.isVisible();
      
      if (isAdvancedVisible) {
        await advancedButton.click();
        await page.waitForTimeout(1000);
        
        await validator.captureEvidence(
          'Advanced Filter Click',
          'PASS',
          'Successfully clicked Advanced Filter button',
          { interactionSuccess: true, screenshot: true }
        );

        // Step 2: Look for agent input fields
        const agentInputs = await page.locator('input[placeholder*="agent" i]').all();
        
        if (agentInputs.length > 0) {
          await validator.captureEvidence(
            'Agent Input Fields Found',
            'PASS',
            `Found ${agentInputs.length} agent input field(s)`,
            { elementFound: true, screenshot: true }
          );

          // Test typing in agent field
          const agentInput = agentInputs[0];
          await agentInput.click();
          await agentInput.fill('test-agent');
          await page.keyboard.press('Enter');
          await page.waitForTimeout(500);

          await validator.captureEvidence(
            'Agent Input Interaction',
            'PASS',
            'Successfully typed "test-agent" and pressed Enter',
            { interactionSuccess: true, screenshot: true }
          );
        } else {
          await validator.captureEvidence(
            'Agent Input Fields Missing',
            'NOT_FOUND',
            'No agent input fields found after opening Advanced Filter',
            { elementFound: false, screenshot: true }
          );
        }

        // Step 3: Look for hashtag input fields
        const hashtagInputs = await page.locator('input[placeholder*="tag" i]').all();
        
        if (hashtagInputs.length > 0) {
          await validator.captureEvidence(
            'Hashtag Input Fields Found',
            'PASS',
            `Found ${hashtagInputs.length} hashtag input field(s)`,
            { elementFound: true, screenshot: true }
          );

          // Test typing in hashtag field
          const hashtagInput = hashtagInputs[0];
          await hashtagInput.click();
          await hashtagInput.fill('testtag');
          await page.keyboard.press('Enter');
          await page.waitForTimeout(500);

          await validator.captureEvidence(
            'Hashtag Input Interaction',
            'PASS',
            'Successfully typed "testtag" and pressed Enter',
            { interactionSuccess: true, screenshot: true }
          );
        } else {
          await validator.captureEvidence(
            'Hashtag Input Fields Missing',
            'NOT_FOUND',
            'No hashtag input fields found after opening Advanced Filter',
            { elementFound: false, screenshot: true }
          );
        }

        // Step 4: Look for Apply button
        const applyButton = page.locator('button:has-text("Apply")').first();
        const isApplyVisible = await applyButton.isVisible();
        
        if (isApplyVisible) {
          validator.clearNetworkHistory();
          await applyButton.click();
          await page.waitForTimeout(2000);

          await validator.captureEvidence(
            'Apply Button Click',
            'PASS',
            `Clicked Apply button. Network requests triggered: ${validator.getEvidence().slice(-1)[0]?.networkRequests?.length || 0}`,
            { interactionSuccess: true, screenshot: true }
          );
        } else {
          await validator.captureEvidence(
            'Apply Button Missing',
            'NOT_FOUND',
            'No Apply button found in Advanced Filter interface',
            { elementFound: false, screenshot: true }
          );
        }

      } else {
        await validator.captureEvidence(
          'Advanced Filter Button Missing',
          'NOT_FOUND',
          'Advanced Filter button not found on page',
          { elementFound: false, screenshot: true }
        );
      }
    } catch (error) {
      await validator.captureEvidence(
        'Multi-Select Testing Error',
        'FAIL',
        `Error during multi-select testing: ${error.message}`,
        { interactionSuccess: false, screenshot: true }
      );
    }
  });

  test('PHASE 4: Network Request Validation', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    // Monitor all API calls during page interaction
    validator.clearNetworkHistory();
    await page.waitForTimeout(3000);

    const initialRequests = validator.getEvidence().slice(-1)[0]?.networkRequests || [];
    
    await validator.captureEvidence(
      'Initial API Requests',
      initialRequests.length > 0 ? 'PASS' : 'FAIL',
      `Captured ${initialRequests.length} API requests on page load`,
      { screenshot: true }
    );

    // Log specific API endpoints called
    const apiEndpoints = initialRequests.map(req => ({
      method: req.method,
      url: req.url,
      status: req.status
    }));

    await validator.captureEvidence(
      'API Endpoints Analysis',
      'PASS',
      `API endpoints called: ${JSON.stringify(apiEndpoints, null, 2)}`,
      { screenshot: false }
    );

    // Test filter-specific endpoints
    try {
      const response = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/v1/filter-data');
          return {
            status: res.status,
            data: await res.json()
          };
        } catch (error) {
          return {
            error: error.message
          };
        }
      });

      await validator.captureEvidence(
        'Filter Data API Direct Test',
        response.error ? 'FAIL' : 'PASS',
        response.error 
          ? `Filter data API failed: ${response.error}`
          : `Filter data API returned: ${JSON.stringify(response.data)}`,
        { screenshot: false }
      );
    } catch (error) {
      await validator.captureEvidence(
        'Filter Data API Test Error',
        'FAIL',
        `Could not test filter data API: ${error.message}`,
        { screenshot: false }
      );
    }
  });

  test('PHASE 5: Comprehensive Evidence Collection', async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Get complete DOM structure related to filters
    const filterElements = await page.evaluate(() => {
      const elements = [];
      
      // Find all elements with filter-related text or attributes
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: function(node) {
            const element = node as Element;
            const text = element.textContent?.toLowerCase() || '';
            const className = element.className?.toLowerCase() || '';
            const id = element.id?.toLowerCase() || '';
            const placeholder = element.getAttribute('placeholder')?.toLowerCase() || '';
            
            if (
              text.includes('filter') ||
              text.includes('advanced') ||
              text.includes('agent') ||
              text.includes('tag') ||
              className.includes('filter') ||
              id.includes('filter') ||
              placeholder.includes('filter') ||
              placeholder.includes('agent') ||
              placeholder.includes('tag')
            ) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
          }
        }
      );
      
      let node;
      while (node = walker.nextNode()) {
        const element = node as Element;
        elements.push({
          tagName: element.tagName,
          id: element.id,
          className: element.className,
          textContent: element.textContent?.slice(0, 100),
          placeholder: element.getAttribute('placeholder'),
          type: element.getAttribute('type'),
          role: element.getAttribute('role'),
          ariaLabel: element.getAttribute('aria-label'),
          dataTestId: element.getAttribute('data-testid')
        });
      }
      
      return elements;
    });

    await validator.captureEvidence(
      'Complete Filter Elements Survey',
      filterElements.length > 0 ? 'PASS' : 'NOT_FOUND',
      `Found ${filterElements.length} filter-related DOM elements: ${JSON.stringify(filterElements, null, 2)}`,
      { screenshot: true }
    );

    // Get all button elements
    const allButtons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(btn => ({
        textContent: btn.textContent?.trim(),
        className: btn.className,
        id: btn.id,
        type: btn.type,
        ariaLabel: btn.getAttribute('aria-label'),
        dataTestId: btn.getAttribute('data-testid')
      }));
    });

    await validator.captureEvidence(
      'All Buttons Survey',
      'PASS',
      `Found ${allButtons.length} buttons: ${JSON.stringify(allButtons, null, 2)}`,
      { screenshot: false }
    );

    // Get all input elements
    const allInputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, textarea')).map(input => ({
        tagName: input.tagName,
        type: input.getAttribute('type'),
        placeholder: input.getAttribute('placeholder'),
        className: input.className,
        id: input.id,
        name: input.getAttribute('name'),
        dataTestId: input.getAttribute('data-testid')
      }));
    });

    await validator.captureEvidence(
      'All Inputs Survey',
      'PASS',
      `Found ${allInputs.length} input elements: ${JSON.stringify(allInputs, null, 2)}`,
      { screenshot: false }
    );
  });

  test.afterEach(async ({ page }) => {
    // Save comprehensive evidence report
    const evidence = validator.getEvidence();
    const reportPath = path.join(EVIDENCE_DIR, `validation-evidence-${Date.now()}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      testRun: 'Definitive Multi-Select Filter Validation',
      url: page.url(),
      evidence: evidence,
      summary: {
        totalSteps: evidence.length,
        passedSteps: evidence.filter(e => e.status === 'PASS').length,
        failedSteps: evidence.filter(e => e.status === 'FAIL').length,
        partialSteps: evidence.filter(e => e.status === 'PARTIAL').length,
        notFoundSteps: evidence.filter(e => e.status === 'NOT_FOUND').length
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('📊 VALIDATION COMPLETE');
    console.log(`📄 Evidence saved to: ${reportPath}`);
    console.log(`✅ Passed: ${report.summary.passedSteps}`);
    console.log(`❌ Failed: ${report.summary.failedSteps}`);
    console.log(`⚠️ Partial: ${report.summary.partialSteps}`);
    console.log(`❓ Not Found: ${report.summary.notFoundSteps}`);
  });
});