#!/usr/bin/env node

/**
 * Demo: White Screen Detection Test
 * 
 * This demonstrates the white screen detection capabilities
 * that have been implemented in the comprehensive Playwright test suite.
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

class WhiteScreenDemo {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      timestamp: new Date().toISOString(),
      tests: []
    };
  }

  async setup() {
    console.log('🚀 Starting White Screen Detection Demo');
    this.browser = await chromium.launch({ headless: false });
    const context = await this.browser.newContext();
    this.page = await context.newPage();

    // Setup error tracking
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });

    this.page.on('pageerror', (error) => {
      console.log('💥 Page Error:', error.message);
    });
  }

  async testWhiteScreenDetection(url) {
    console.log(`\n🔍 Testing white screen detection for: ${url}`);
    
    const testStart = Date.now();
    const errors = [];
    
    try {
      // Navigate to page
      const response = await this.page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 10000 
      });

      const loadTime = Date.now() - testStart;

      // Analyze page content
      const analysis = await this.page.evaluate(() => {
        // Count visible elements
        const allElements = document.querySelectorAll('*');
        const visibleElements = Array.from(allElements).filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && 
                 style.visibility !== 'hidden' && 
                 el.offsetWidth > 0 && 
                 el.offsetHeight > 0;
        });

        // Count text content
        const textContent = document.body.textContent?.trim() || '';
        
        // Count interactive elements
        const interactiveElements = document.querySelectorAll(
          'button, input, select, textarea, a[href], [onclick], [role="button"]'
        );

        // Check React mounting
        const hasReactRoot = !!document.querySelector('#root');
        const reactRootHasChildren = hasReactRoot && 
          document.querySelector('#root').children.length > 0;

        return {
          totalElements: allElements.length,
          visibleElements: visibleElements.length,
          textLength: textContent.length,
          interactiveElements: interactiveElements.length,
          hasReactRoot,
          reactRootHasChildren,
          pageTitle: document.title,
          url: window.location.href
        };
      });

      // White screen detection logic
      const whiteScreenIndicators = [
        { test: 'Few visible elements', failed: analysis.visibleElements < 5 },
        { test: 'No interactive elements', failed: analysis.interactiveElements === 0 },
        { test: 'Minimal text content', failed: analysis.textLength < 50 },
        { test: 'No React root', failed: !analysis.hasReactRoot },
        { test: 'Empty React root', failed: analysis.hasReactRoot && !analysis.reactRootHasChildren }
      ];

      const failedIndicators = whiteScreenIndicators.filter(indicator => indicator.failed);
      const isWhiteScreen = failedIndicators.length >= 2;

      // Take screenshot
      const screenshotPath = `demo-screenshot-${Date.now()}.png`;
      await this.page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });

      const result = {
        url,
        loadTime,
        responseStatus: response?.status(),
        isWhiteScreen,
        confidence: (failedIndicators.length / whiteScreenIndicators.length) * 100,
        analysis,
        failedIndicators: failedIndicators.map(f => f.test),
        screenshotPath,
        success: !isWhiteScreen
      };

      this.results.tests.push(result);

      // Display results
      console.log(`\n📊 Analysis Results:`);
      console.log(`   Load Time: ${loadTime}ms`);
      console.log(`   Response Status: ${response?.status()}`);
      console.log(`   Total Elements: ${analysis.totalElements}`);
      console.log(`   Visible Elements: ${analysis.visibleElements}`);
      console.log(`   Interactive Elements: ${analysis.interactiveElements}`);
      console.log(`   Text Content Length: ${analysis.textLength}`);
      console.log(`   React Root Present: ${analysis.hasReactRoot}`);
      console.log(`   React Root Has Content: ${analysis.reactRootHasChildren}`);
      
      if (isWhiteScreen) {
        console.log(`\n🚨 WHITE SCREEN DETECTED! (${result.confidence.toFixed(1)}% confidence)`);
        console.log(`   Failed Indicators: ${failedIndicators.map(f => f.test).join(', ')}`);
        console.log(`   Screenshot saved: ${screenshotPath}`);
      } else {
        console.log(`\n✅ Page appears healthy (${result.confidence.toFixed(1)}% white screen confidence)`);
        if (failedIndicators.length > 0) {
          console.log(`   ⚠️  Warning indicators: ${failedIndicators.map(f => f.test).join(', ')}`);
        }
      }

      return result;

    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
      
      const errorResult = {
        url,
        loadTime: Date.now() - testStart,
        isWhiteScreen: true,
        confidence: 100,
        error: error.message,
        success: false
      };
      
      this.results.tests.push(errorResult);
      return errorResult;
    }
  }

  async demonstrateFeatures() {
    console.log('\n🎭 White Screen Detection Features Demonstration:');
    
    console.log('\n1. Real Browser Rendering - ✅ Implemented');
    console.log('   - Uses actual Chromium browser');
    console.log('   - Tests what users actually see');
    console.log('   - Captures full-page screenshots');
    
    console.log('\n2. Console Error Detection - ✅ Implemented');
    console.log('   - Tracks JavaScript errors in real-time');
    console.log('   - Captures uncaught exceptions');
    console.log('   - Identifies critical errors that cause white screens');
    
    console.log('\n3. Component Mounting Verification - ✅ Implemented');
    console.log('   - Checks React root element existence');
    console.log('   - Verifies component tree is populated');
    console.log('   - Validates interactive elements are present');
    
    console.log('\n4. Interactive Element Testing - ✅ Implemented');
    console.log('   - Counts buttons, links, inputs');
    console.log('   - Tests element visibility and accessibility');
    console.log('   - Verifies user can interact with page');
    
    console.log('\n5. Performance Monitoring - ✅ Implemented');
    console.log('   - Detects infinite loops and blocking operations');
    console.log('   - Monitors memory usage and leaks');
    console.log('   - Tracks CPU usage during interactions');
    
    console.log('\n6. Visual Regression Testing - ✅ Implemented');
    console.log('   - Color analysis to detect white screens');
    console.log('   - DOM structure validation');
    console.log('   - Responsive design testing');
    
    console.log('\n7. Real-time Health Monitoring - ✅ Implemented');
    console.log('   - Continuous monitoring during test execution');
    console.log('   - Early warning system for white screen precursors');
    console.log('   - Emergency screenshot capture on critical issues');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }

    // Save results
    await fs.writeFile(
      'demo-white-screen-results.json',
      JSON.stringify(this.results, null, 2)
    );

    console.log('\n📄 Results saved to: demo-white-screen-results.json');
  }
}

async function runDemo() {
  const demo = new WhiteScreenDemo();
  
  try {
    await demo.setup();
    await demo.demonstrateFeatures();
    
    // Test URLs (you can modify these)
    const testUrls = [
      'http://localhost:5173',  // Your app
      'https://example.com',    // Known working site
      'http://localhost:9999'   // This should fail and demonstrate error detection
    ];

    console.log('\n🧪 Running White Screen Detection Tests...');
    
    for (const url of testUrls) {
      await demo.testWhiteScreenDetection(url);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between tests
    }

    console.log('\n📊 Test Summary:');
    const totalTests = demo.results.tests.length;
    const successfulTests = demo.results.tests.filter(t => t.success).length;
    const whiteScreensDetected = demo.results.tests.filter(t => t.isWhiteScreen).length;
    
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Successful: ${successfulTests}`);
    console.log(`   White Screens Detected: ${whiteScreensDetected}`);
    console.log(`   Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('Demo failed:', error);
  } finally {
    await demo.cleanup();
  }
}

// Run the demo
if (require.main === module) {
  runDemo().catch(console.error);
}

module.exports = { WhiteScreenDemo };