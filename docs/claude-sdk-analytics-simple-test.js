#!/usr/bin/env node

/**
 * Simple Claude SDK Analytics Validation Test
 * Manual browser testing with console output
 */

import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';

async function testAnalyticsPage() {
  console.log('🔍 Starting Claude SDK Analytics Validation');

  const browser = await puppeteer.launch({
    headless: false, // Run in headed mode to see the page
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();
  const consoleLogs = [];
  const networkErrors = [];

  // Monitor console
  page.on('console', msg => {
    const log = `${msg.type()}: ${msg.text()}`;
    console.log(`Browser Console: ${log}`);
    consoleLogs.push(log);
  });

  // Monitor network failures
  page.on('requestfailed', request => {
    const error = `Failed: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`;
    console.log(`Network Error: ${error}`);
    networkErrors.push(error);
  });

  try {
    console.log('📍 Navigating to analytics page...');
    await page.goto('http://127.0.0.1:5173/analytics', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('⏳ Waiting for page to load...');
    await page.waitForTimeout(5000);

    // Check if page has content
    const hasContent = await page.evaluate(() => {
      return document.body.innerText.trim().length > 0;
    });

    console.log(`📄 Page has content: ${hasContent}`);

    // Check for main analytics components
    const components = await page.evaluate(() => {
      const checks = {
        realAnalytics: !!document.querySelector('[data-testid="real-analytics"]'),
        systemAnalytics: !!document.querySelector('[aria-label="Tabs"]'),
        claudeSDKTab: !!document.textContent.includes('Claude SDK Cost Analytics'),
        errorBoundary: !!document.querySelector('[data-error-boundary]'),
        loadingStates: document.querySelectorAll('.animate-spin, .loading').length,
        errorMessages: document.querySelectorAll('.text-red-600, .bg-red-50').length
      };

      return checks;
    });

    console.log('🎨 Component Analysis:', components);

    // Test Claude SDK tab
    console.log('🔄 Testing Claude SDK tab...');
    try {
      await page.click('text=Claude SDK Cost Analytics');
      await page.waitForTimeout(3000);
      console.log('✅ Claude SDK tab clicked successfully');
    } catch (error) {
      console.log('❌ Failed to click Claude SDK tab:', error.message);
    }

    // Check for mock data indicators
    const mockData = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      const mockPatterns = ['mock', 'fake', 'dummy', 'placeholder', 'lorem ipsum', 'test data'];
      const foundMocks = mockPatterns.filter(pattern => text.includes(pattern));

      // Look for real data patterns
      const hasRealData = {
        currency: /\$\d+\.\d{2}/.test(text),
        percentages: /\d+\.\d+%/.test(text),
        numbers: /\d{1,3},?\d{3}/.test(text),
        timestamps: /\d{1,2}:\d{2}/.test(text)
      };

      return { foundMocks, hasRealData };
    });

    console.log('📊 Data Analysis:', mockData);

    // Performance check
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        loadTime: navigation?.loadEventEnd - navigation?.fetchStart,
        domReady: navigation?.domContentLoadedEventEnd - navigation?.fetchStart,
        resourceCount: performance.getEntriesByType('resource').length
      };
    });

    console.log('⚡ Performance Metrics:', metrics);

    // Screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/analytics-validation-screenshot.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved');

    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      url: 'http://127.0.0.1:5173/analytics',
      validation: {
        pageLoaded: hasContent,
        componentsFound: components,
        consoleLogs: consoleLogs,
        networkErrors: networkErrors,
        dataAnalysis: mockData,
        performanceMetrics: metrics
      },
      status: hasContent && components.realAnalytics ? 'PASS' : 'FAIL',
      recommendations: []
    };

    if (consoleLogs.some(log => log.includes('error'))) {
      report.recommendations.push('Fix JavaScript console errors');
    }

    if (networkErrors.length > 0) {
      report.recommendations.push('Resolve network request failures');
    }

    if (mockData.foundMocks.length > 0) {
      report.recommendations.push('Replace mock data with real production data');
    }

    await fs.writeFile('/workspaces/agent-feed/docs/analytics-simple-validation-report.json',
                      JSON.stringify(report, null, 2));

    console.log('\n📋 VALIDATION SUMMARY');
    console.log('====================');
    console.log(`Status: ${report.status}`);
    console.log(`Console Logs: ${consoleLogs.length}`);
    console.log(`Network Errors: ${networkErrors.length}`);
    console.log(`Mock Data Found: ${mockData.foundMocks.length}`);
    console.log(`Load Time: ${metrics.loadTime}ms`);

    return report;

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    console.log('🔚 Closing browser in 5 seconds...');
    setTimeout(() => browser.close(), 5000);
  }
}

// Run test
testAnalyticsPage()
  .then(report => {
    console.log('\n✅ Analytics validation completed');
    process.exit(report.status === 'PASS' ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });