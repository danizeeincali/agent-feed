/**
 * PRODUCTION VALIDATION: Advanced Filter Critical Bug Investigation
 * Real browser testing against live system at localhost:5173
 */

import { launch } from 'puppeteer';
import http from 'http';

class ProductionFilterValidator {
  constructor() {
    this.browser = null;
    this.page = null;
    this.validationResults = {
      testsPassed: 0,
      testsFailed: 0,
      errors: [],
      warnings: [],
      networkCalls: [],
      consoleErrors: [],
      filterStates: []
    };
  }

  async initialize() {
    console.log('🚀 Launching real browser for production validation...');
    
    this.browser = await launch({
      headless: false, // Use visible browser for real validation
      devtools: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
    });

    this.page = await this.browser.newPage();
    
    // Enable network monitoring
    await this.page.setRequestInterception(true);
    
    this.page.on('request', (request) => {
      this.validationResults.networkCalls.push({
        timestamp: new Date().toISOString(),
        method: request.method(),
        url: request.url(),
        headers: request.headers(),
        postData: request.postData()
      });
      request.continue();
    });

    this.page.on('response', (response) => {
      const request = response.request();
      const existing = this.validationResults.networkCalls.find(call => 
        call.url === request.url() && call.timestamp
      );
      if (existing) {
        existing.status = response.status();
        existing.responseHeaders = response.headers();
        existing.responseSize = response.headers()['content-length'];
      }
    });

    // Capture console errors
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.validationResults.consoleErrors.push({
          timestamp: new Date().toISOString(),
          message: msg.text(),
          location: msg.location()
        });
      }
    });

    await this.page.setViewport({ width: 1920, height: 1080 });
    console.log('✅ Browser initialized for production testing');
  }

  async validateBackendEndpoints() {
    console.log('\n📡 TESTING BACKEND FILTER ENDPOINTS DIRECTLY...');
    
    const testEndpoints = [
      { 
        name: 'Health Check', 
        url: 'http://localhost:3000/health',
        method: 'GET'
      },
      { 
        name: 'Get All Posts', 
        url: 'http://localhost:3000/api/v1/agent-posts',
        method: 'GET'
      },
      { 
        name: 'Get Filter Data', 
        url: 'http://localhost:3000/api/v1/filter-data',
        method: 'GET'
      },
      { 
        name: 'Multi-Select Filter Test', 
        url: 'http://localhost:3000/api/v1/agent-posts?filter=multi-select&agents=test-agent&hashtags=productivity&mode=AND',
        method: 'GET'
      }
    ];

    for (const endpoint of testEndpoints) {
      try {
        const response = await fetch(endpoint.url);
        const data = await response.json();
        
        console.log(`✅ ${endpoint.name}: ${response.status}`);
        console.log(`   Response keys: ${Object.keys(data).join(', ')}`);
        
        if (endpoint.name === 'Multi-Select Filter Test' && data.success) {
          console.log(`   Filtered posts count: ${data.data?.length || 0}`);
          console.log(`   Total available: ${data.total || 'N/A'}`);
        }
        
        this.validationResults.testsPassed++;
      } catch (error) {
        console.error(`❌ ${endpoint.name}: ${error.message}`);
        this.validationResults.errors.push({
          test: endpoint.name,
          error: error.message,
          endpoint: endpoint.url
        });
        this.validationResults.testsFailed++;
      }
    }
  }

  async validateDatabaseIntegrity() {
    console.log('\n🗄️ VALIDATING DATABASE QUERIES AND INTEGRITY...');
    
    try {
      // Test database health
      const healthResponse = await fetch('http://localhost:3000/health');
      const health = await healthResponse.json();
      
      if (health.database?.available) {
        console.log(`✅ Database: ${health.database.type} - ${health.database.initialized ? 'Ready' : 'Not Ready'}`);
        
        // Test posts endpoint for data integrity
        const postsResponse = await fetch('http://localhost:3000/api/v1/agent-posts?limit=10');
        const postsData = await postsResponse.json();
        
        if (postsData.success && Array.isArray(postsData.data)) {
          console.log(`✅ Found ${postsData.data.length} posts in database`);
          
          // Validate post structure
          const samplePost = postsData.data[0];
          if (samplePost) {
            const requiredFields = ['id', 'title', 'content', 'authorAgent', 'publishedAt'];
            const missingFields = requiredFields.filter(field => !samplePost[field]);
            
            if (missingFields.length === 0) {
              console.log('✅ Post data structure is valid');
              
              // Test for available agents and hashtags
              const agents = [...new Set(postsData.data.map(p => p.authorAgent))];
              const hashtags = [...new Set(postsData.data.flatMap(p => p.tags || []))];
              
              console.log(`✅ Available agents: ${agents.length} (${agents.slice(0, 3).join(', ')}...)`);
              console.log(`✅ Available hashtags: ${hashtags.length} (${hashtags.slice(0, 3).join(', ')}...)`);
              
              this.validationResults.testsPassed += 3;
            } else {
              console.error(`❌ Missing required fields: ${missingFields.join(', ')}`);
              this.validationResults.testsFailed++;
            }
          }
        } else {
          console.error('❌ Invalid posts data structure');
          this.validationResults.testsFailed++;
        }
      } else {
        console.error('❌ Database not available');
        this.validationResults.testsFailed++;
      }
    } catch (error) {
      console.error(`❌ Database validation failed: ${error.message}`);
      this.validationResults.testsFailed++;
    }
  }

  async validateAdvancedFilterWorkflow() {
    console.log('\n🎯 TESTING ADVANCED FILTER USER WORKFLOW...');
    
    try {
      // Navigate to the application
      console.log('📍 Navigating to http://localhost:5173...');
      await this.page.goto('http://localhost:5173', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for the page to load
      await this.page.waitForSelector('[data-testid="loading-state"], .bg-white', { timeout: 10000 });
      
      // Check if we're in loading state or if content loaded
      const isLoading = await this.page.$('[data-testid="loading-state"]');
      if (isLoading) {
        console.log('⏳ Waiting for loading to complete...');
        await this.page.waitForSelector('.bg-white:not([data-testid="loading-state"])', { timeout: 15000 });
      }

      // Look for the filter panel (should be visible)
      const filterButton = await this.page.$('button:has-text("All Posts"), button[aria-label*="filter"], button:has-text("Filter")');
      
      if (!filterButton) {
        // Try alternative selectors for filter button
        const possibleSelectors = [
          'button[class*="filter"]',
          'button:has(svg[class*="filter"])',
          '.filter-panel button',
          'button[title*="filter"]'
        ];
        
        for (const selector of possibleSelectors) {
          const element = await this.page.$(selector);
          if (element) {
            console.log(`✅ Found filter element with selector: ${selector}`);
            break;
          }
        }
      }

      // Take screenshot for debugging
      await this.page.screenshot({ 
        path: '/workspaces/agent-feed/validation-homepage.png',
        fullPage: true 
      });
      console.log('📸 Homepage screenshot saved as validation-homepage.png');

      // CRITICAL TEST 1: Open Advanced Filter
      console.log('\n🔍 STEP 1: Opening Advanced Filter...');
      
      // Look for the filter button/dropdown
      const filterPanelFound = await this.page.evaluate(() => {
        // Look for any element containing "Advanced Filter" or similar text
        const elements = Array.from(document.querySelectorAll('*')).filter(el => {
          const text = el.textContent;
          return text && (
            text.includes('Advanced Filter') || 
            text.includes('Multi-select') ||
            text.includes('Filter') ||
            text.includes('All Posts')
          );
        });
        return elements.map(el => ({
          tagName: el.tagName,
          className: el.className,
          textContent: el.textContent?.trim(),
          id: el.id
        }));
      });

      console.log('📋 Found filter-related elements:', JSON.stringify(filterPanelFound, null, 2));

      // Try to click the main filter button
      try {
        await this.page.click('button:has-text("All Posts")');
        console.log('✅ Clicked main filter button');
        await this.page.waitForTimeout(1000);
      } catch (error) {
        console.log('⚠️ Could not click "All Posts" button, trying alternatives...');
        
        // Try clicking any button with filter-related text
        const clicked = await this.page.evaluate(() => {
          const filterButton = document.querySelector('button[class*="filter"], button:has([class*="filter"])');
          if (filterButton) {
            filterButton.click();
            return true;
          }
          return false;
        });
        
        if (!clicked) {
          throw new Error('No filter button found to click');
        }
      }

      // Look for advanced filter option in dropdown
      await this.page.waitForTimeout(2000);
      
      const advancedFilterOption = await this.page.evaluate(() => {
        const options = Array.from(document.querySelectorAll('button, div, span')).filter(el => 
          el.textContent && el.textContent.includes('Advanced')
        );
        return options.map(opt => ({
          tagName: opt.tagName,
          textContent: opt.textContent,
          className: opt.className
        }));
      });

      console.log('📋 Advanced filter options found:', advancedFilterOption);

      if (advancedFilterOption.length > 0) {
        await this.page.click('button:has-text("Advanced"), *:has-text("Advanced Filter")');
        console.log('✅ Clicked Advanced Filter option');
        await this.page.waitForTimeout(2000);
        this.validationResults.testsPassed++;
      } else {
        throw new Error('Advanced Filter option not found in dropdown');
      }

      // CRITICAL TEST 2: Select agents in multi-select
      console.log('\n👥 STEP 2: Selecting agents in multi-select...');
      
      const agentInputFound = await this.page.$('input[placeholder*="agent"], input[placeholder*="Search"]');
      
      if (agentInputFound) {
        await this.page.type('input[placeholder*="agent"], input[placeholder*="Search"]', 'test');
        await this.page.waitForTimeout(1000);
        
        // Look for agent suggestions
        const suggestions = await this.page.$$eval('[class*="suggestion"], [class*="option"], li', 
          elements => elements.map(el => el.textContent).filter(text => text && text.trim())
        );
        
        console.log('📋 Agent suggestions:', suggestions);
        
        if (suggestions.length > 0) {
          // Click first suggestion
          await this.page.click('[class*="suggestion"]:first-child, [class*="option"]:first-child, li:first-child');
          console.log('✅ Selected first agent from suggestions');
          this.validationResults.testsPassed++;
        } else {
          console.log('⚠️ No agent suggestions appeared');
          this.validationResults.warnings.push('No agent suggestions in multi-select');
        }
      } else {
        throw new Error('Agent input field not found in advanced filter panel');
      }

      // CRITICAL TEST 3: Apply filter
      console.log('\n✅ STEP 3: Applying advanced filter...');
      
      const applyButton = await this.page.$('button:has-text("Apply"), button:has-text("Apply Filter")');
      if (applyButton) {
        // Capture network calls before clicking
        const networkCallsBefore = this.validationResults.networkCalls.length;
        
        await this.page.click('button:has-text("Apply"), button:has-text("Apply Filter")');
        console.log('✅ Clicked Apply Filter button');
        
        // Wait for network request
        await this.page.waitForTimeout(3000);
        
        const networkCallsAfter = this.validationResults.networkCalls.length;
        const newCalls = this.validationResults.networkCalls.slice(networkCallsBefore);
        
        console.log(`📡 ${newCalls.length} network calls made during filter application:`);
        newCalls.forEach(call => {
          console.log(`   ${call.method} ${call.url} - ${call.status || 'pending'}`);
        });

        // Check if posts disappeared (bug scenario)
        const postsAfterFilter = await this.page.$$eval('[class*="post"], article, .bg-white', 
          elements => elements.length
        );
        
        console.log(`📊 Posts visible after filter: ${postsAfterFilter}`);
        
        if (postsAfterFilter === 0) {
          this.validationResults.errors.push({
            test: 'Advanced Filter Application',
            error: 'CRITICAL BUG: All posts disappeared after applying advanced filter',
            details: 'Zero posts visible after filter application - this matches the reported issue'
          });
          console.error('❌ CRITICAL BUG CONFIRMED: All posts disappeared after applying advanced filter');
          this.validationResults.testsFailed++;
        } else {
          console.log(`✅ Posts still visible after filter: ${postsAfterFilter}`);
          this.validationResults.testsPassed++;
        }
      } else {
        throw new Error('Apply Filter button not found');
      }

      // CRITICAL TEST 4: Test reset functionality  
      console.log('\n🔄 STEP 4: Testing filter reset...');
      
      const clearButton = await this.page.$('button:has-text("Clear"), button:has-text("Reset"), [class*="clear"]');
      if (clearButton) {
        const networkCallsBefore = this.validationResults.networkCalls.length;
        
        await this.page.click('button:has-text("Clear"), button:has-text("Reset")');
        console.log('✅ Clicked Clear/Reset button');
        
        await this.page.waitForTimeout(3000);
        
        const postsAfterReset = await this.page.$$eval('[class*="post"], article, .bg-white', 
          elements => elements.length
        );
        
        console.log(`📊 Posts visible after reset: ${postsAfterReset}`);
        
        if (postsAfterReset > 0) {
          console.log('✅ Posts returned after filter reset');
          this.validationResults.testsPassed++;
        } else {
          this.validationResults.errors.push({
            test: 'Filter Reset',
            error: 'CRITICAL BUG: Posts did not return after filter reset',
            details: 'Filter reset functionality broken - cannot return to "all posts" view'
          });
          console.error('❌ CRITICAL BUG: Posts did not return after filter reset');
          this.validationResults.testsFailed++;
        }
        
        const networkCallsAfter = this.validationResults.networkCalls.length;
        console.log(`📡 ${networkCallsAfter - networkCallsBefore} network calls made during reset`);
      } else {
        console.log('⚠️ Clear/Reset button not found');
        this.validationResults.warnings.push('Reset button not accessible');
      }

      // Take final screenshot
      await this.page.screenshot({ 
        path: '/workspaces/agent-feed/validation-final.png',
        fullPage: true 
      });
      console.log('📸 Final screenshot saved as validation-final.png');

    } catch (error) {
      console.error(`❌ Advanced filter workflow failed: ${error.message}`);
      this.validationResults.errors.push({
        test: 'Advanced Filter Workflow',
        error: error.message,
        stack: error.stack
      });
      this.validationResults.testsFailed++;

      // Take screenshot of error state
      if (this.page) {
        await this.page.screenshot({ 
          path: '/workspaces/agent-feed/validation-error.png',
          fullPage: true 
        });
        console.log('📸 Error screenshot saved as validation-error.png');
      }
    }
  }

  async generateReport() {
    console.log('\n📋 COMPREHENSIVE PRODUCTION VALIDATION REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📊 SUMMARY STATISTICS:`);
    console.log(`   Tests Passed: ${this.validationResults.testsPassed}`);
    console.log(`   Tests Failed: ${this.validationResults.testsFailed}`);
    console.log(`   Warnings: ${this.validationResults.warnings.length}`);
    console.log(`   Console Errors: ${this.validationResults.consoleErrors.length}`);
    console.log(`   Network Calls: ${this.validationResults.networkCalls.length}`);

    if (this.validationResults.errors.length > 0) {
      console.log(`\n❌ CRITICAL ISSUES DISCOVERED:`);
      this.validationResults.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.test}: ${error.error}`);
        if (error.details) {
          console.log(`      Details: ${error.details}`);
        }
      });
    }

    if (this.validationResults.consoleErrors.length > 0) {
      console.log(`\n🔍 CONSOLE ERRORS:`);
      this.validationResults.consoleErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.message} (${error.timestamp})`);
      });
    }

    if (this.validationResults.warnings.length > 0) {
      console.log(`\n⚠️ WARNINGS:`);
      this.validationResults.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }

    // Filter-related network calls
    const filterCalls = this.validationResults.networkCalls.filter(call => 
      call.url.includes('filter') || call.url.includes('agent-posts')
    );

    if (filterCalls.length > 0) {
      console.log(`\n🌐 FILTER-RELATED NETWORK CALLS:`);
      filterCalls.forEach((call, index) => {
        console.log(`   ${index + 1}. ${call.method} ${call.url}`);
        console.log(`      Status: ${call.status || 'pending'}`);
        if (call.postData) {
          console.log(`      Data: ${call.postData.substring(0, 100)}...`);
        }
      });
    }

    // Overall result
    const overallSuccess = this.validationResults.testsFailed === 0;
    console.log(`\n${overallSuccess ? '✅' : '❌'} OVERALL RESULT: ${overallSuccess ? 'PASS' : 'FAIL'}`);
    
    if (!overallSuccess) {
      console.log('\n🔧 REQUIRED FIXES:');
      console.log('   1. Fix advanced filter showing zero results');
      console.log('   2. Fix reset functionality to return to "all posts" view');
      console.log('   3. Ensure proper API parameter mapping for multi-select filters');
      console.log('   4. Validate frontend-backend filter parameter synchronization');
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🧹 Browser cleanup completed');
    }
  }
}

// Execute validation
async function runProductionValidation() {
  const validator = new ProductionFilterValidator();
  
  try {
    await validator.initialize();
    await validator.validateBackendEndpoints();
    await validator.validateDatabaseIntegrity();
    await validator.validateAdvancedFilterWorkflow();
    await validator.generateReport();
  } catch (error) {
    console.error('❌ Production validation failed:', error);
  } finally {
    await validator.cleanup();
  }
}

// Check if backend is running before starting validation
async function checkBackendHealth() {
  try {
    const response = await fetch('http://localhost:3000/health');
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🚀 PRODUCTION VALIDATION: Advanced Filter Critical Bug Investigation');
  console.log('Testing against live system: http://localhost:5173 + http://localhost:3000');
  console.log('='.repeat(80));

  const backendHealthy = await checkBackendHealth();
  if (!backendHealthy) {
    console.error('❌ Backend is not running or unhealthy. Please start the backend first.');
    process.exit(1);
  }

  console.log('✅ Backend is healthy, proceeding with validation...\n');
  await runProductionValidation();
}

main().catch(console.error);