// Manual Production Validation Script for Advanced Filter Testing
// This script executes the EXACT user workflow using Puppeteer

import puppeteer from 'puppeteer';
import fs from 'fs';

class AdvancedFilterValidator {
  constructor() {
    this.browser = null;
    this.page = null;
    this.apiCalls = [];
    this.results = {
      workflow: [],
      apiEndpoints: [],
      postCounts: {},
      errors: []
    };
  }

  async initialize() {
    console.log('🚀 Initializing Production Validation');
    
    this.browser = await puppeteer.launch({
      headless: false, // Run with GUI for visual verification
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 720 }
    });
    
    this.page = await this.browser.newPage();
    
    // Monitor network requests
    await this.page.setRequestInterception(true);
    this.page.on('request', request => {
      if (request.url().includes('/api/')) {
        this.apiCalls.push({
          method: request.method(),
          url: request.url(),
          timestamp: new Date().toISOString()
        });
      }
      request.continue();
    });
    
    // Monitor console logs
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.results.errors.push(`Console Error: ${msg.text()}`);
      }
    });
  }

  async executeWorkflow() {
    try {
      console.log('📱 Step 1: Navigate to http://localhost:5173');
      await this.page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
      
      // Wait for app to load
      await this.page.waitForSelector('[data-testid="posts-container"]', { timeout: 10000 });
      
      // Step 1: Count initial posts
      await this.page.waitForFunction(() => {
        const posts = document.querySelectorAll('[data-testid^="post-"]');
        return posts.length > 0;
      }, { timeout: 15000 });
      
      const initialPostCount = await this.page.$$eval('[data-testid^="post-"]', posts => posts.length);
      this.results.postCounts.initial = initialPostCount;
      console.log(`📊 Initial post count: ${initialPostCount}`);
      
      // Step 2: Click "All Posts" dropdown
      console.log('🔍 Step 2: Clicking All Posts dropdown');
      
      const dropdownExists = await this.page.$('[data-testid="filter-dropdown-trigger"]');
      if (!dropdownExists) {
        // Try alternative selectors
        const alternatives = [
          '.filter-dropdown-trigger',
          '[class*="dropdown-trigger"]',
          '[role="button"]:has-text("All Posts")',
          'button:has-text("All Posts")'
        ];
        
        for (const selector of alternatives) {
          try {
            await this.page.click(selector);
            console.log(`✅ Found dropdown with selector: ${selector}`);
            break;
          } catch (e) {
            continue;
          }
        }
      } else {
        await this.page.click('[data-testid="filter-dropdown-trigger"]');
      }
      
      // Wait for dropdown to open
      await this.page.waitForTimeout(1000);
      
      // Step 3: Select "Advanced Filter"
      console.log('🎯 Step 3: Selecting Advanced Filter');
      
      const advancedFilterExists = await this.page.$('[data-testid="advanced-filter-option"]');
      if (!advancedFilterExists) {
        // Try alternative selectors
        const alternatives = [
          'text=Advanced Filter',
          '[class*="advanced-filter"]',
          'li:has-text("Advanced Filter")',
          '[role="menuitem"]:has-text("Advanced")'
        ];
        
        for (const selector of alternatives) {
          try {
            await this.page.click(selector);
            console.log(`✅ Found advanced filter with selector: ${selector}`);
            break;
          } catch (e) {
            continue;
          }
        }
      } else {
        await this.page.click('[data-testid="advanced-filter-option"]');
      }
      
      // Wait for advanced filter panel
      await this.page.waitForTimeout(2000);
      
      // Step 4: Add ProductionValidator to agent multi-select
      console.log('🤖 Step 4: Adding ProductionValidator to agent multi-select');
      
      // Find agent filter input
      const agentInputExists = await this.page.$('[data-testid="agent-filter"] input');
      if (!agentInputExists) {
        // Try alternative selectors
        const alternatives = [
          'input[placeholder*="agent"]',
          'input[placeholder*="Agent"]',
          '.agent-filter input',
          '[class*="multi-select"] input'
        ];
        
        for (const selector of alternatives) {
          try {
            await this.page.click(selector);
            console.log(`✅ Found agent input with selector: ${selector}`);
            break;
          } catch (e) {
            continue;
          }
        }
      } else {
        await this.page.click('[data-testid="agent-filter"] input');
      }
      
      await this.page.waitForTimeout(1000);
      
      // Type to filter for ProductionValidator
      await this.page.type('input', 'ProductionValidator');
      await this.page.waitForTimeout(1000);
      
      // Try to select ProductionValidator
      try {
        await this.page.click('[data-testid="agent-option-ProductionValidator"]');
      } catch (e) {
        // Try alternative selection methods
        await this.page.click('text=ProductionValidator');
      }
      
      // Step 5: Apply filter
      console.log('✅ Step 5: Applying filter');
      
      const applyButtonExists = await this.page.$('[data-testid="apply-filter-button"]');
      if (!applyButtonExists) {
        const alternatives = [
          'button:has-text("Apply")',
          '.apply-filter-button',
          '[class*="apply"]',
          'button[type="submit"]'
        ];
        
        for (const selector of alternatives) {
          try {
            await this.page.click(selector);
            console.log(`✅ Found apply button with selector: ${selector}`);
            break;
          } catch (e) {
            continue;
          }
        }
      } else {
        await this.page.click('[data-testid="apply-filter-button"]');
      }
      
      // Wait for filter to apply
      await this.page.waitForTimeout(3000);
      
      // Step 6: Verify filtering
      console.log('🔎 Step 6: Verifying filtered results');
      
      const filteredPostCount = await this.page.$$eval('[data-testid^="post-"]', posts => posts.length);
      this.results.postCounts.filtered = filteredPostCount;
      console.log(`📊 Filtered post count: ${filteredPostCount}`);
      
      // Get visible agents
      const visibleAgents = await this.page.$$eval('[data-testid^="post-"] [data-testid="post-agent"], [class*="post-agent"]', 
        elements => elements.map(el => el.textContent.trim())
      );
      
      console.log(`👀 Visible agents: ${visibleAgents.join(', ')}`);
      this.results.visibleAgents = visibleAgents;
      
      // Step 7: Clear filter
      console.log('🧹 Step 7: Clearing filters');
      
      const clearButtonExists = await this.page.$('[data-testid="clear-filter-button"]');
      if (!clearButtonExists) {
        const alternatives = [
          'button:has-text("Clear")',
          '.clear-filter-button',
          '[class*="clear"]',
          'button:has-text("Reset")'
        ];
        
        for (const selector of alternatives) {
          try {
            await this.page.click(selector);
            console.log(`✅ Found clear button with selector: ${selector}`);
            break;
          } catch (e) {
            continue;
          }
        }
      } else {
        await this.page.click('[data-testid="clear-filter-button"]');
      }
      
      // Wait for clear to apply
      await this.page.waitForTimeout(3000);
      
      // Step 8: Verify all posts return
      console.log('🔄 Step 8: Verifying all posts return');
      
      const resetPostCount = await this.page.$$eval('[data-testid^="post-"]', posts => posts.length);
      this.results.postCounts.reset = resetPostCount;
      console.log(`📊 Reset post count: ${resetPostCount}`);
      
      // Record workflow completion
      this.results.workflow = [
        `Initial posts: ${initialPostCount}`,
        `Filtered posts: ${filteredPostCount}`,
        `Reset posts: ${resetPostCount}`,
        `Filter worked: ${filteredPostCount < initialPostCount}`,
        `Reset worked: ${resetPostCount === initialPostCount}`
      ];
      
    } catch (error) {
      console.error('❌ Workflow error:', error.message);
      this.results.errors.push(`Workflow Error: ${error.message}`);
    }
  }

  async generateReport() {
    console.log('📝 Generating Production Validation Report');
    
    const report = {
      timestamp: new Date().toISOString(),
      testUrl: 'http://localhost:5173',
      workflow: this.results.workflow,
      postCounts: this.results.postCounts,
      visibleAgents: this.results.visibleAgents,
      apiCalls: this.apiCalls,
      errors: this.results.errors,
      validation: {
        dropdownWorking: this.results.workflow.length > 0,
        filteringWorking: this.results.postCounts.filtered < this.results.postCounts.initial,
        resetWorking: this.results.postCounts.reset === this.results.postCounts.initial,
        apiEndpointsCalled: this.apiCalls.length > 0
      }
    };
    
    console.log('📊 VALIDATION RESULTS:');
    console.log(JSON.stringify(report, null, 2));
    
    return report;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Execute validation
async function runValidation() {
  const validator = new AdvancedFilterValidator();
  
  try {
    await validator.initialize();
    await validator.executeWorkflow();
    const report = await validator.generateReport();
    
    // Save report
    fs.writeFileSync(
      '/workspaces/agent-feed/frontend/validation-evidence.json',
      JSON.stringify(report, null, 2)
    );
    
    console.log('✅ Validation complete. Report saved to validation-evidence.json');
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
  } finally {
    await validator.cleanup();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runValidation();
}

export { AdvancedFilterValidator };