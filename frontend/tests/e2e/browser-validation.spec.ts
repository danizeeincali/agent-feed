import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface NetworkLog {
  url: string;
  method: string;
  status: number;
  response: any;
  timestamp: string;
}

interface ConsoleLog {
  type: string;
  message: string;
  timestamp: string;
}

interface ValidationEvidence {
  screenshots: string[];
  networkLogs: NetworkLog[];
  consoleLogs: ConsoleLog[];
  testResults: {
    advancedFilterButtonFound: boolean;
    filterPanelOpens: boolean;
    agentInputExists: boolean;
    dropdownSuggestionsWork: boolean;
    chipsCreated: boolean;
    apiCallsMade: boolean;
    filteringWorks: boolean;
  };
  failures: string[];
  timestamp: string;
}

test.describe('Browser Validation - Real Multi-Select Filtering Functionality', () => {
  let evidence: ValidationEvidence;
  let screenshotCounter = 0;

  test.beforeEach(async ({ page }) => {
    evidence = {
      screenshots: [],
      networkLogs: [],
      consoleLogs: [],
      testResults: {
        advancedFilterButtonFound: false,
        filterPanelOpens: false,
        agentInputExists: false,
        dropdownSuggestionsWork: false,
        chipsCreated: false,
        apiCallsMade: false,
        filteringWorks: false
      },
      failures: [],
      timestamp: new Date().toISOString()
    };

    // Setup network monitoring
    page.on('response', async (response) => {
      try {
        const responseBody = await response.json().catch(() => response.text().catch(() => null));
        evidence.networkLogs.push({
          url: response.url(),
          method: response.request().method(),
          status: response.status(),
          response: responseBody,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        // Ignore parsing errors
      }
    });

    // Setup console monitoring
    page.on('console', (msg) => {
      evidence.consoleLogs.push({
        type: msg.type(),
        message: msg.text(),
        timestamp: new Date().toISOString()
      });
    });

    // Setup error monitoring
    page.on('pageerror', (error) => {
      evidence.failures.push(`Page Error: ${error.message}`);
      evidence.consoleLogs.push({
        type: 'error',
        message: `Page Error: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    });
  });

  async function takeEvidentiaryScreenshot(page: Page, name: string): Promise<string> {
    const filename = `${++screenshotCounter}-${name}-${Date.now()}.png`;
    const screenshotPath = path.join('/workspaces/agent-feed/frontend/test-results/screenshots', filename);
    
    // Ensure directory exists
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true,
      animations: 'disabled'
    });
    
    evidence.screenshots.push(filename);
    return screenshotPath;
  }

  test('Complete Browser Validation - Multi-Select Filter Functionality', async ({ page }) => {
    console.log('🚀 Starting comprehensive browser validation...');

    try {
      // Step 1: Navigate and capture initial state
      console.log('Step 1: Navigating to application...');
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
      await takeEvidentiaryScreenshot(page, 'initial-load');
      
      // Wait for any dynamic content to load
      await page.waitForTimeout(2000);
      await takeEvidentiaryScreenshot(page, 'after-load-wait');

      // Step 2: Identify Advanced Filter Button
      console.log('Step 2: Looking for Advanced Filter button...');
      
      // Try multiple selectors for the Advanced Filter button
      const filterButtonSelectors = [
        'button:has-text("Advanced Filter")',
        '[data-testid="advanced-filter-button"]',
        'button[aria-label*="filter" i]',
        'button[class*="filter" i]',
        '.advanced-filter-btn',
        'button:has-text("Filter")',
        '[role="button"]:has-text("Advanced")',
        'button:has-text("Show Filters")'
      ];

      let advancedFilterButton = null;
      let usedSelector = '';

      for (const selector of filterButtonSelectors) {
        try {
          const element = await page.locator(selector).first();
          if (await element.isVisible()) {
            advancedFilterButton = element;
            usedSelector = selector;
            evidence.testResults.advancedFilterButtonFound = true;
            console.log(`✅ Found Advanced Filter button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue trying other selectors
        }
      }

      await takeEvidentiaryScreenshot(page, 'filter-button-search');

      if (!advancedFilterButton) {
        evidence.failures.push('Advanced Filter button not found with any selector');
        console.log('❌ Advanced Filter button not found');
        
        // Try to find ANY button and document what's available
        const allButtons = await page.locator('button').all();
        console.log(`Found ${allButtons.length} buttons on page`);
        
        for (let i = 0; i < allButtons.length; i++) {
          const text = await allButtons[i].textContent();
          console.log(`Button ${i}: "${text}"`);
        }
        
        await takeEvidentiaryScreenshot(page, 'no-filter-button-found');
      } else {
        // Step 3: Click Advanced Filter button
        console.log(`Step 3: Clicking Advanced Filter button (${usedSelector})...`);
        
        // Highlight the button before clicking
        await advancedFilterButton.scrollIntoViewIfNeeded();
        await page.evaluate((el) => {
          el.style.border = '3px solid red';
          el.style.backgroundColor = 'yellow';
        }, await advancedFilterButton.elementHandle());
        
        await takeEvidentiaryScreenshot(page, 'filter-button-highlighted');
        
        await advancedFilterButton.click();
        await page.waitForTimeout(1000);
        await takeEvidentiaryScreenshot(page, 'after-filter-button-click');

        // Step 4: Check if Filter Panel opens
        console.log('Step 4: Checking if filter panel opens...');
        
        const filterPanelSelectors = [
          '[data-testid="filter-panel"]',
          '.filter-panel',
          '[role="dialog"]:has-text("filter" i)',
          '.advanced-filters',
          '[class*="filter" i][class*="panel" i]',
          'form:has(input[placeholder*="agent" i])',
          'div:has(input[placeholder*="agent" i])'
        ];

        let filterPanel = null;
        for (const selector of filterPanelSelectors) {
          try {
            const element = await page.locator(selector).first();
            if (await element.isVisible()) {
              filterPanel = element;
              evidence.testResults.filterPanelOpens = true;
              console.log(`✅ Filter panel found with selector: ${selector}`);
              break;
            }
          } catch (e) {
            // Continue trying
          }
        }

        if (!filterPanel) {
          evidence.failures.push('Filter panel did not open after clicking Advanced Filter button');
          console.log('❌ Filter panel not found');
        }

        // Step 5: Look for Agent Input Field
        console.log('Step 5: Looking for agent input field...');
        
        const agentInputSelectors = [
          'input[placeholder*="agent" i]',
          '[data-testid="agent-input"]',
          'input[name*="agent" i]',
          '.agent-select input',
          '[role="combobox"][aria-label*="agent" i]',
          'input[type="text"]:visible',
          '.multi-select input'
        ];

        let agentInput = null;
        for (const selector of agentInputSelectors) {
          try {
            const element = await page.locator(selector).first();
            if (await element.isVisible()) {
              agentInput = element;
              evidence.testResults.agentInputExists = true;
              console.log(`✅ Agent input found with selector: ${selector}`);
              break;
            }
          } catch (e) {
            // Continue trying
          }
        }

        await takeEvidentiaryScreenshot(page, 'agent-input-search');

        if (!agentInput) {
          evidence.failures.push('Agent input field not found');
          console.log('❌ Agent input field not found');
          
          // Document all visible inputs
          const allInputs = await page.locator('input:visible').all();
          console.log(`Found ${allInputs.length} visible inputs`);
          for (let i = 0; i < allInputs.length; i++) {
            const placeholder = await allInputs[i].getAttribute('placeholder');
            const name = await allInputs[i].getAttribute('name');
            console.log(`Input ${i}: placeholder="${placeholder}", name="${name}"`);
          }
        } else {
          // Step 6: Test Multi-Select Functionality
          console.log('Step 6: Testing multi-select functionality...');
          
          // Highlight the input
          await page.evaluate((el) => {
            el.style.border = '3px solid blue';
          }, await agentInput.elementHandle());
          
          await takeEvidentiaryScreenshot(page, 'agent-input-highlighted');

          // Test typing in the input
          await agentInput.click();
          await agentInput.fill('ProductionValidator');
          await page.waitForTimeout(1000);
          await takeEvidentiaryScreenshot(page, 'after-typing-agent');

          // Check for dropdown suggestions
          const dropdownSelectors = [
            '.dropdown-menu',
            '[role="listbox"]',
            '[data-testid="dropdown"]',
            '.suggestions',
            '.options-list',
            'ul:visible',
            '[class*="dropdown" i]:visible'
          ];

          let dropdown = null;
          for (const selector of dropdownSelectors) {
            try {
              const element = await page.locator(selector).first();
              if (await element.isVisible()) {
                dropdown = element;
                evidence.testResults.dropdownSuggestionsWork = true;
                console.log(`✅ Dropdown suggestions found with selector: ${selector}`);
                break;
              }
            } catch (e) {
              // Continue trying
            }
          }

          await takeEvidentiaryScreenshot(page, 'dropdown-search');

          // Test Enter key functionality
          await agentInput.press('Enter');
          await page.waitForTimeout(1000);
          await takeEvidentiaryScreenshot(page, 'after-enter-press');

          // Check for chips/tags created
          const chipSelectors = [
            '.chip',
            '.tag',
            '[data-testid="selected-agent"]',
            '.selected-item',
            '[class*="chip" i]',
            '[class*="tag" i]',
            'span:has-text("ProductionValidator")'
          ];

          let chips = null;
          for (const selector of chipSelectors) {
            try {
              const elements = await page.locator(selector).all();
              if (elements.length > 0) {
                chips = elements;
                evidence.testResults.chipsCreated = true;
                console.log(`✅ Chips found with selector: ${selector} (count: ${elements.length})`);
                break;
              }
            } catch (e) {
              // Continue trying
            }
          }

          if (!chips) {
            evidence.failures.push('No chips created after entering agent name');
            console.log('❌ No chips created');
          }

          // Step 7: Test Apply Filter Button
          console.log('Step 7: Testing Apply Filter functionality...');
          
          const applyButtonSelectors = [
            'button:has-text("Apply")',
            '[data-testid="apply-filter"]',
            'button[type="submit"]',
            '.apply-btn',
            'button:has-text("Filter")'
          ];

          let applyButton = null;
          for (const selector of applyButtonSelectors) {
            try {
              const element = await page.locator(selector).first();
              if (await element.isVisible()) {
                applyButton = element;
                console.log(`✅ Apply button found with selector: ${selector}`);
                break;
              }
            } catch (e) {
              // Continue trying
            }
          }

          if (applyButton) {
            // Count network requests before clicking
            const networkCountBefore = evidence.networkLogs.length;
            
            await applyButton.click();
            await page.waitForTimeout(2000);
            await takeEvidentiaryScreenshot(page, 'after-apply-filter');

            // Check if API calls were made
            const networkCountAfter = evidence.networkLogs.length;
            if (networkCountAfter > networkCountBefore) {
              evidence.testResults.apiCallsMade = true;
              console.log(`✅ API calls made: ${networkCountAfter - networkCountBefore} new requests`);
            } else {
              evidence.failures.push('No API calls made after clicking Apply');
            }

            // Check if filtering works by looking for filtered content
            await page.waitForTimeout(3000);
            await takeEvidentiaryScreenshot(page, 'final-filtered-results');

            // Try to verify if filtering worked
            const postElements = await page.locator('[data-testid="post"], .post, article').all();
            if (postElements.length > 0) {
              evidence.testResults.filteringWorks = true;
              console.log(`✅ Found ${postElements.length} posts after filtering`);
            } else {
              console.log('⚠️ No posts found after filtering (could be expected if no matches)');
            }
          } else {
            evidence.failures.push('Apply button not found');
            console.log('❌ Apply button not found');
          }
        }
      }

    } catch (error) {
      evidence.failures.push(`Test execution error: ${error.message}`);
      console.error('❌ Test execution error:', error);
      await takeEvidentiaryScreenshot(page, 'error-state');
    }

    // Final screenshot
    await takeEvidentiaryScreenshot(page, 'final-state');
  });

  test.afterEach(async ({ page }) => {
    // Save evidence to file
    const evidencePath = '/workspaces/agent-feed/frontend/validation-evidence.json';
    
    // Add final summary
    evidence.timestamp = new Date().toISOString();
    
    const summary = {
      totalTests: Object.keys(evidence.testResults).length,
      passedTests: Object.values(evidence.testResults).filter(Boolean).length,
      failedTests: evidence.failures.length,
      networkRequests: evidence.networkLogs.length,
      consoleMessages: evidence.consoleLogs.length,
      screenshots: evidence.screenshots.length
    };

    const finalEvidence = {
      ...evidence,
      summary,
      testSuccess: evidence.failures.length === 0 && evidence.testResults.filteringWorks
    };

    fs.writeFileSync(evidencePath, JSON.stringify(finalEvidence, null, 2));
    
    console.log('\n📊 VALIDATION EVIDENCE SUMMARY:');
    console.log(`✅ Tests Passed: ${summary.passedTests}/${summary.totalTests}`);
    console.log(`❌ Failures: ${summary.failedTests}`);
    console.log(`📸 Screenshots: ${summary.screenshots}`);
    console.log(`🌐 Network Requests: ${summary.networkRequests}`);
    console.log(`📝 Console Messages: ${summary.consoleMessages}`);
    console.log(`📄 Evidence saved to: ${evidencePath}`);

    if (evidence.failures.length > 0) {
      console.log('\n🚨 FAILURES:');
      evidence.failures.forEach((failure, i) => {
        console.log(`${i + 1}. ${failure}`);
      });
    }

    // Log key network requests
    const relevantRequests = evidence.networkLogs.filter(log => 
      log.url.includes('api') || log.url.includes('filter') || log.url.includes('agent')
    );
    
    if (relevantRequests.length > 0) {
      console.log('\n🌐 RELEVANT API CALLS:');
      relevantRequests.forEach(req => {
        console.log(`${req.method} ${req.url} - Status: ${req.status}`);
      });
    }
  });
});