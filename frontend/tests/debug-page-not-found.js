#!/usr/bin/env node

/**
 * Standalone Page Not Found Debug Script
 * Uses Playwright programmatically to debug the exact user experience
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function debugPageNotFound() {
  console.log('🔍 Starting comprehensive page not found debugging...');
  
  const browser = await chromium.launch({ 
    headless: true,   // Headless for CI environment
    slowMo: 100       // Reduced for speed
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture all console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: Date.now()
    });
  });

  // Capture network requests and responses
  const networkActivity = [];
  page.on('request', request => {
    if (request.url().includes('/api/') || request.url().includes('agents')) {
      networkActivity.push({
        type: 'request',
        method: request.method(),
        url: request.url(),
        timestamp: Date.now()
      });
    }
  });

  page.on('response', async response => {
    if (response.url().includes('/api/') || response.url().includes('agents')) {
      let responseData = null;
      try {
        const contentType = response.headers()['content-type'];
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }
      } catch (error) {
        responseData = `Error reading response: ${error.message}`;
      }

      networkActivity.push({
        type: 'response',
        status: response.status(),
        url: response.url(),
        data: responseData,
        timestamp: Date.now()
      });
    }
  });

  try {
    console.log('🔍 Navigating to target page...');
    
    // Test the working frontend first
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    console.log('✅ Base frontend loads successfully');

    // Now test the problematic URL
    const targetUrl = 'http://localhost:5173/agents/personal-todos-agent/pages/015b7296-a144-4096-9c60-ee5d7f900723';
    console.log(`🔍 Navigating to: ${targetUrl}`);
    
    await page.goto(targetUrl);
    await page.waitForTimeout(5000);

    // Try to wait for specific elements
    try {
      await page.waitForSelector('[data-testid="agent-page-content"], .agent-page, .page-content', { timeout: 3000 });
      console.log('✅ Found page content element');
    } catch (error) {
      console.log('❌ No page content element found');
    }

    // Capture page state
    const pageContent = await page.textContent('body');
    const isPageNotFound = pageContent?.includes('Page not found') || pageContent?.includes('not found') || false;
    const isPageLoaded = pageContent?.includes('Personal Todos Dashboard') || pageContent?.includes('Dashboard') || false;
    const pageTitle = await page.title();
    const currentUrl = page.url();

    // Debug output
    console.log('\n=== CONSOLE MESSAGES ===');
    consoleMessages.forEach(msg => {
      console.log(`[${msg.type.toUpperCase()}] ${msg.text}`);
    });

    console.log('\n=== NETWORK ACTIVITY ===');
    networkActivity.forEach(activity => {
      console.log(`[${activity.type.toUpperCase()}] ${activity.method || activity.status} ${activity.url}`);
      if (activity.data && activity.type === 'response') {
        if (typeof activity.data === 'string') {
          console.log('Response text:', activity.data.substring(0, 200) + '...');
        } else {
          console.log('Response data:', JSON.stringify(activity.data, null, 2));
        }
      }
    });

    console.log('\n=== PAGE STATE ===');
    console.log('Current URL:', currentUrl);
    console.log('Page Title:', pageTitle);
    console.log('Page Not Found:', isPageNotFound);
    console.log('Page Loaded:', isPageLoaded);
    console.log('Body Content Preview:', pageContent?.substring(0, 500) + '...');

    // Take screenshot
    const screenshotPath = '/workspaces/agent-feed/frontend/tests/debug-page-not-found.png';
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);

    // Save page HTML
    const pageHTML = await page.content();
    const htmlPath = '/workspaces/agent-feed/frontend/tests/debug-page-source.html';
    fs.writeFileSync(htmlPath, pageHTML);
    console.log(`📄 Page HTML saved: ${htmlPath}`);

    // Test API directly
    console.log('\n=== TESTING API DIRECTLY ===');
    const apiResponse = await page.request.get('http://localhost:3000/api/agents/personal-todos-agent/pages');
    const apiData = await apiResponse.json();
    
    console.log('API Status:', apiResponse.status());
    console.log('API Data:', JSON.stringify(apiData, null, 2));
    
    const targetPage = apiData.pages?.find(p => p.id === '015b7296-a144-4096-9c60-ee5d7f900723');
    console.log('Target page found in API:', !!targetPage);
    
    if (targetPage) {
      console.log('Target page data:', JSON.stringify(targetPage, null, 2));
    }

    // Check component hierarchy
    console.log('\n=== COMPONENT HIERARCHY ===');
    const componentInfo = await page.evaluate(() => {
      const findReactComponents = (element) => {
        const components = [];
        
        // Look for React fiber properties
        for (const key of Object.keys(element)) {
          if (key.startsWith('__reactFiber') || key.startsWith('_reactInternalFiber')) {
            const fiber = element[key];
            if (fiber && fiber.type && fiber.type.name) {
              components.push(fiber.type.name);
            }
          }
        }
        
        return components;
      };
      
      const allElements = document.querySelectorAll('*');
      const reactComponents = new Set();
      
      allElements.forEach(el => {
        const components = findReactComponents(el);
        components.forEach(comp => reactComponents.add(comp));
      });
      
      return Array.from(reactComponents);
    });
    
    console.log('React components found:', componentInfo);

    // Generate summary report
    const report = {
      timestamp: new Date().toISOString(),
      url: targetUrl,
      status: {
        pageNotFound: isPageNotFound,
        pageLoaded: isPageLoaded,
        apiWorking: apiResponse.status() === 200,
        targetPageExists: !!targetPage
      },
      counts: {
        consoleErrors: consoleMessages.filter(m => m.type === 'error').length,
        consoleWarnings: consoleMessages.filter(m => m.type === 'warning').length,
        apiRequests: networkActivity.filter(a => a.type === 'request').length,
        apiResponses: networkActivity.filter(a => a.type === 'response').length,
        reactComponents: componentInfo.length
      },
      consoleMessages,
      networkActivity,
      apiData,
      componentInfo
    };

    const reportPath = '/workspaces/agent-feed/frontend/tests/debug-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Debug report saved: ${reportPath}`);

    console.log('\n=== DIAGNOSTIC SUMMARY ===');
    console.log(`✅ API Working: ${report.status.apiWorking}`);
    console.log(`✅ Target Page Exists: ${report.status.targetPageExists}`);
    console.log(`❌ Page Shows Error: ${report.status.pageNotFound}`);
    console.log(`❌ Page Shows Content: ${report.status.pageLoaded}`);
    console.log(`📊 Console Errors: ${report.counts.consoleErrors}`);
    console.log(`📊 API Requests: ${report.counts.apiRequests}`);
    console.log(`📊 React Components: ${report.counts.reactComponents}`);

  } catch (error) {
    console.error('🚨 Error during debugging:', error);
  } finally {
    await browser.close();
  }
}

// Run the debug
debugPageNotFound().catch(console.error);