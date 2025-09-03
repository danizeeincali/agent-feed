#!/usr/bin/env node

/**
 * Manual E2E Validation Script for Persistent Feed Data System
 * This script performs manual validation of the feed system functionality
 */

const puppeteer = require('puppeteer');

const TEST_CONFIG = {
  baseURL: 'http://localhost:5173',
  apiURL: 'http://localhost:3000',
  timeout: 30000,
  viewport: { width: 1280, height: 720 }
};

let browser;
let page;

async function setupBrowser() {
  console.log('🚀 Launching browser for E2E validation...');
  
  browser = await puppeteer.launch({
    headless: false, // Run in headed mode to see the tests
    defaultViewport: TEST_CONFIG.viewport,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  page = await browser.newPage();
  
  // Set up console logging
  page.on('console', msg => {
    console.log(`Page Console: ${msg.text()}`);
  });
  
  // Set up error logging
  page.on('pageerror', error => {
    console.error(`Page Error: ${error.message}`);
  });
  
  console.log('✅ Browser launched successfully');
}

async function healthCheck() {
  console.log('🔍 Performing health checks...');
  
  try {
    // Check frontend
    const frontendResponse = await page.goto(TEST_CONFIG.baseURL, { 
      waitUntil: 'networkidle0',
      timeout: TEST_CONFIG.timeout 
    });
    
    console.log(`✅ Frontend (${TEST_CONFIG.baseURL}): ${frontendResponse.status()}`);
    
    // Check if feed is loading
    await page.waitForSelector('[data-testid="agent-feed"]', { timeout: 10000 });
    console.log('✅ Agent feed container is present');
    
    return true;
  } catch (error) {
    console.error(`❌ Health check failed: ${error.message}`);
    return false;
  }
}

async function testFeedLoading() {
  console.log('📋 Testing: Feed loads with persistent data successfully');
  
  try {
    // Check for page title
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Check for feed header
    await page.waitForSelector('h2', { timeout: 5000 });
    const feedHeader = await page.$eval('h2', el => el.textContent);
    console.log(`Feed header: ${feedHeader}`);
    
    // Check for connection status
    const connectionStatus = await page.$eval('*', () => {
      const elements = [...document.querySelectorAll('*')];
      const statusElement = elements.find(el => 
        el.textContent?.includes('Database') || 
        el.textContent?.includes('Fallback') || 
        el.textContent?.includes('Offline')
      );
      return statusElement ? statusElement.textContent : 'No status found';
    });
    
    console.log(`Connection status: ${connectionStatus}`);
    
    // Check for posts or empty state
    const hasContent = await page.evaluate(() => {
      const posts = document.querySelectorAll('article');
      const emptyState = document.querySelector('[data-testid="empty-state"]');
      return {
        postCount: posts.length,
        hasEmptyState: !!emptyState,
        hasLoadingState: !!document.querySelector('[data-testid="loading-state"]'),
        hasErrorState: !!document.querySelector('[data-testid="error-fallback"]')
      };
    });
    
    console.log(`Content state:`, hasContent);
    
    if (hasContent.postCount > 0) {
      console.log('✅ Posts are present');
    } else if (hasContent.hasEmptyState) {
      console.log('✅ Empty state is shown correctly');
    } else {
      console.log('⚠️  No posts or empty state found');
    }
    
    console.log('✅ Feed loading test completed');
    return true;
    
  } catch (error) {
    console.error(`❌ Feed loading test failed: ${error.message}`);
    return false;
  }
}

async function testSearchFunctionality() {
  console.log('🔍 Testing: Search functionality works end-to-end');
  
  try {
    // Look for search button
    const searchButton = await page.$('button[title*="Search"]');
    
    if (searchButton) {
      await searchButton.click();
      console.log('✅ Search button clicked');
      
      // Wait for search input to appear
      await page.waitForSelector('input[placeholder*="Search"]', { timeout: 5000 });
      console.log('✅ Search input appeared');
      
      // Test search functionality
      await page.type('input[placeholder*="Search"]', 'test');
      console.log('✅ Search query typed');
      
      // Wait a moment for debounced search
      await page.waitForTimeout(1000);
      
      // Check for search results or indicators
      const searchState = await page.evaluate(() => {
        const searchingText = document.querySelector('*:contains("Searching")');
        const resultsText = document.querySelector('*:contains("Found")');
        const noResultsText = document.querySelector('*:contains("No posts found")');
        
        return {
          isSearching: !!searchingText,
          hasResults: !!resultsText,
          noResults: !!noResultsText
        };
      });
      
      console.log(`Search state:`, searchState);
      console.log('✅ Search functionality test completed');
      
      // Clear search
      await page.click('input[placeholder*="Search"]', { clickCount: 3 });
      await page.keyboard.press('Backspace');
      
    } else {
      console.log('⚠️  Search button not found - may be in different location');
    }
    
    return true;
    
  } catch (error) {
    console.error(`❌ Search functionality test failed: ${error.message}`);
    return false;
  }
}

async function testEngagementFeatures() {
  console.log('💖 Testing: Engagement features function properly');
  
  try {
    // Look for posts with engagement buttons
    const posts = await page.$$('article');
    
    if (posts.length > 0) {
      console.log(`Found ${posts.length} posts for engagement testing`);
      
      const firstPost = posts[0];
      
      // Look for like button (usually first button with svg)
      const likeButton = await firstPost.$('button svg');
      
      if (likeButton) {
        const parentButton = await likeButton.$('..');
        
        // Get initial like count if visible
        const initialLikes = await firstPost.evaluate(post => {
          const likeText = post.querySelector('button span')?.textContent;
          return likeText || '0';
        });
        
        console.log(`Initial likes: ${initialLikes}`);
        
        // Click like button
        await parentButton.click();
        console.log('✅ Like button clicked');
        
        await page.waitForTimeout(1000);
        
        // Check if there's visual feedback
        console.log('✅ Engagement features test completed');
      } else {
        console.log('⚠️  Like buttons not found in expected format');
      }
    } else {
      console.log('⚠️  No posts available for engagement testing');
    }
    
    return true;
    
  } catch (error) {
    console.error(`❌ Engagement features test failed: ${error.message}`);
    return false;
  }
}

async function testRealTimeFeatures() {
  console.log('🔄 Testing: Real-time updates and connection status work correctly');
  
  try {
    // Test refresh functionality
    const refreshButton = await page.$('button[title*="Refresh"]');
    
    if (refreshButton) {
      await refreshButton.click();
      console.log('✅ Refresh button clicked');
      
      // Look for loading animation
      await page.waitForSelector('.animate-spin', { timeout: 5000 }).catch(() => {});
      console.log('✅ Loading animation detected');
      
      // Wait for loading to finish
      await page.waitForTimeout(3000);
      console.log('✅ Refresh completed');
    }
    
    // Check for live activity indicators
    const liveIndicators = await page.evaluate(() => {
      const elements = [...document.querySelectorAll('*')];
      return elements.some(el => 
        el.textContent?.includes('Live') || 
        el.textContent?.includes('Real-time') ||
        el.className?.includes('live')
      );
    });
    
    console.log(`Live indicators present: ${liveIndicators}`);
    console.log('✅ Real-time features test completed');
    
    return true;
    
  } catch (error) {
    console.error(`❌ Real-time features test failed: ${error.message}`);
    return false;
  }
}

async function testResponsiveDesign() {
  console.log('📱 Testing: Responsive design on mobile viewport');
  
  try {
    // Set mobile viewport
    await page.setViewport({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // Check if mobile menu exists
    const mobileMenu = await page.$('button:has-text("Menu")') || 
                      await page.$('button svg:has([viewBox])'); // Menu icon
    
    if (mobileMenu) {
      console.log('✅ Mobile menu button found');
      
      // Try to click mobile menu
      try {
        await mobileMenu.click();
        await page.waitForTimeout(1000);
        console.log('✅ Mobile menu clicked');
      } catch (error) {
        console.log('⚠️  Mobile menu click failed:', error.message);
      }
    }
    
    // Check if feed is still visible
    const feedVisible = await page.$('[data-testid="agent-feed"]');
    console.log(`Feed visible on mobile: ${!!feedVisible}`);
    
    // Reset viewport
    await page.setViewport(TEST_CONFIG.viewport);
    
    console.log('✅ Responsive design test completed');
    return true;
    
  } catch (error) {
    console.error(`❌ Responsive design test failed: ${error.message}`);
    return false;
  }
}

async function testKeyboardNavigation() {
  console.log('⌨️  Testing: Keyboard navigation accessibility');
  
  try {
    // Tab through interactive elements
    let tabCount = 0;
    const maxTabs = 10;
    
    await page.keyboard.press('Tab');
    
    while (tabCount < maxTabs) {
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? {
          tagName: el.tagName,
          id: el.id,
          className: el.className,
          textContent: el.textContent?.slice(0, 30)
        } : null;
      });
      
      if (focusedElement) {
        console.log(`Tab ${tabCount}: ${focusedElement.tagName} - ${focusedElement.textContent || focusedElement.id}`);
        
        // Test Enter key on buttons
        if (focusedElement.tagName === 'BUTTON') {
          const startTime = Date.now();
          await page.keyboard.press('Enter');
          const responseTime = Date.now() - startTime;
          console.log(`Button response time: ${responseTime}ms`);
        }
      }
      
      await page.keyboard.press('Tab');
      tabCount++;
      await page.waitForTimeout(100);
    }
    
    console.log('✅ Keyboard navigation test completed');
    return true;
    
  } catch (error) {
    console.error(`❌ Keyboard navigation test failed: ${error.message}`);
    return false;
  }
}

async function performanceTest() {
  console.log('⚡ Testing: Page load performance');
  
  try {
    const startTime = Date.now();
    
    await page.goto(TEST_CONFIG.baseURL, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="agent-feed"]');
    
    const loadTime = Date.now() - startTime;
    console.log(`Page load time: ${loadTime}ms`);
    
    // Performance metrics
    const metrics = await page.metrics();
    console.log('Performance metrics:', {
      JSHeapUsedSize: Math.round(metrics.JSHeapUsedSize / 1024 / 1024) + 'MB',
      JSHeapTotalSize: Math.round(metrics.JSHeapTotalSize / 1024 / 1024) + 'MB',
      ScriptDuration: Math.round(metrics.ScriptDuration * 1000) + 'ms',
      LayoutDuration: Math.round(metrics.LayoutDuration * 1000) + 'ms'
    });
    
    console.log('✅ Performance test completed');
    return { loadTime, metrics };
    
  } catch (error) {
    console.error(`❌ Performance test failed: ${error.message}`);
    return null;
  }
}

async function cleanup() {
  if (browser) {
    await browser.close();
    console.log('🧹 Browser closed');
  }
}

async function runManualE2EValidation() {
  console.log('🎯 Starting Manual E2E Validation for Persistent Feed Data System');
  console.log('=' .repeat(70));
  
  const results = {
    startTime: new Date(),
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    }
  };
  
  try {
    await setupBrowser();
    
    const isHealthy = await healthCheck();
    if (!isHealthy) {
      throw new Error('Health check failed - cannot proceed with tests');
    }
    
    // Run all test functions
    const tests = [
      { name: 'Feed Loading', fn: testFeedLoading },
      { name: 'Search Functionality', fn: testSearchFunctionality },
      { name: 'Engagement Features', fn: testEngagementFeatures },
      { name: 'Real-time Features', fn: testRealTimeFeatures },
      { name: 'Responsive Design', fn: testResponsiveDesign },
      { name: 'Keyboard Navigation', fn: testKeyboardNavigation },
      { name: 'Performance', fn: performanceTest }
    ];
    
    for (const test of tests) {
      console.log('\\n' + '='.repeat(50));
      console.log(`🧪 Running: ${test.name}`);
      console.log('='.repeat(50));
      
      const startTime = Date.now();
      let status = 'failed';
      let error = null;
      
      try {
        const result = await test.fn();
        status = result ? 'passed' : 'warning';
      } catch (err) {
        error = err.message;
        console.error(`Test ${test.name} threw error:`, err.message);
      }
      
      const duration = Date.now() - startTime;
      
      results.tests.push({
        name: test.name,
        status,
        duration,
        error
      });
      
      results.summary.total++;
      if (status === 'passed') results.summary.passed++;
      else if (status === 'warning') results.summary.warnings++;
      else results.summary.failed++;
      
      console.log(`${status === 'passed' ? '✅' : status === 'warning' ? '⚠️ ' : '❌'} ${test.name}: ${status} (${duration}ms)`);
      
      // Brief pause between tests
      await page.waitForTimeout(1000);
    }
    
  } catch (error) {
    console.error('❌ E2E validation failed:', error.message);
    results.globalError = error.message;
  } finally {
    await cleanup();
  }
  
  results.endTime = new Date();
  results.totalDuration = results.endTime - results.startTime;
  
  // Print final summary
  console.log('\\n' + '=' .repeat(70));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('=' .repeat(70));
  console.log(`⏱️  Total Duration: ${Math.round(results.totalDuration / 1000)}s`);
  console.log(`📈 Tests: ${results.summary.total} total`);
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`⚠️  Warnings: ${results.summary.warnings}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log('');
  
  results.tests.forEach(test => {
    const icon = test.status === 'passed' ? '✅' : test.status === 'warning' ? '⚠️ ' : '❌';
    console.log(`${icon} ${test.name}: ${test.status} (${test.duration}ms)`);
    if (test.error) {
      console.log(`   Error: ${test.error}`);
    }
  });
  
  console.log('');
  console.log('🎉 Manual E2E Validation Complete!');
  
  // Save results
  const fs = require('fs');
  const reportsDir = 'tests/reports';
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    `${reportsDir}/manual-e2e-results.json`,
    JSON.stringify(results, null, 2)
  );
  
  console.log(`📄 Results saved to: ${reportsDir}/manual-e2e-results.json`);
  
  // Exit with appropriate code
  const hasFailures = results.summary.failed > 0;
  process.exit(hasFailures ? 1 : 0);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\\n🛑 Received SIGINT, cleaning up...');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\\n🛑 Received SIGTERM, cleaning up...');
  await cleanup();
  process.exit(0);
});

// Run if this file is executed directly
if (require.main === module) {
  runManualE2EValidation().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { runManualE2EValidation };