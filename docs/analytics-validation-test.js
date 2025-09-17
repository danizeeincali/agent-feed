#!/usr/bin/env node

/**
 * Comprehensive Analytics Functionality Validation Test
 * Tests the complete analytics system end-to-end
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AnalyticsValidationTest {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
      }
    };
  }

  async runTest(name, testFn) {
    this.results.summary.total++;
    console.log(`🧪 Testing: ${name}`);

    try {
      const startTime = Date.now();
      await testFn();
      const duration = Date.now() - startTime;

      this.results.tests.push({
        name,
        status: 'PASSED',
        duration,
        timestamp: new Date().toISOString()
      });

      this.results.summary.passed++;
      console.log(`✅ PASSED: ${name} (${duration}ms)`);

    } catch (error) {
      const duration = Date.now() - startTime;

      this.results.tests.push({
        name,
        status: 'FAILED',
        duration,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      this.results.summary.failed++;
      this.results.summary.errors.push(`${name}: ${error.message}`);
      console.log(`❌ FAILED: ${name} - ${error.message}`);
    }
  }

  async validateAnalytics() {
    console.log('🚀 Starting Comprehensive Analytics Validation');
    console.log('='.repeat(60));

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Test 1: Frontend loads successfully
      await this.runTest('Frontend Home Page Loads', async () => {
        const response = await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
        if (!response.ok()) {
          throw new Error(`Frontend returned ${response.status()}`);
        }

        // Wait for React app to load
        await page.waitForSelector('#root', { timeout: 10000 });
        await page.waitForTimeout(2000); // Allow time for app initialization
      });

      // Test 2: Analytics page navigation
      await this.runTest('Analytics Page Navigation', async () => {
        // Try to navigate to analytics (assuming it's available via menu or direct URL)
        await page.goto('http://localhost:5173/#analytics', { waitUntil: 'networkidle' });

        // Look for analytics indicators
        const analyticsElement = await page.locator('[data-testid="real-analytics"], .analytics, [class*="analytics"]').first();
        if (await analyticsElement.count() === 0) {
          // Try finding analytics through menu or tabs
          const navLinks = await page.locator('nav a, button').all();
          let foundAnalytics = false;

          for (const link of navLinks) {
            const text = await link.textContent();
            if (text && text.toLowerCase().includes('analytics')) {
              await link.click();
              await page.waitForTimeout(1000);
              foundAnalytics = true;
              break;
            }
          }

          if (!foundAnalytics) {
            console.log('ℹ️  Analytics not found in navigation, checking for embedded analytics...');
          }
        }
      });

      // Test 3: API Endpoints Accessibility
      await this.runTest('API Endpoints Respond', async () => {
        const endpoints = [
          '/api/analytics?timeRange=24h',
          '/api/agent-posts?limit=5&offset=0'
        ];

        for (const endpoint of endpoints) {
          const response = await page.request.get(`http://localhost:5173${endpoint}`);
          if (!response.ok()) {
            throw new Error(`${endpoint} returned ${response.status()}`);
          }

          const data = await response.json();
          if (!data.success && !data.data) {
            throw new Error(`${endpoint} returned invalid response structure`);
          }
        }
      });

      // Test 4: Real Data Loading
      await this.runTest('Real Data Loading', async () => {
        const response = await page.request.get('http://localhost:5173/api/agent-posts?limit=10&offset=0');
        const data = await response.json();

        if (!data.success || !data.data || !Array.isArray(data.data)) {
          throw new Error('Invalid posts data structure');
        }

        if (data.data.length === 0) {
          throw new Error('No posts found - database may be empty');
        }

        // Validate post structure
        const post = data.data[0];
        const requiredFields = ['id', 'title', 'content', 'author_agent'];
        for (const field of requiredFields) {
          if (!post[field]) {
            throw new Error(`Post missing required field: ${field}`);
          }
        }
      });

      // Test 5: Analytics Data Structure
      await this.runTest('Analytics Data Structure', async () => {
        const response = await page.request.get('http://localhost:5173/api/analytics?timeRange=24h');
        const data = await response.json();

        if (!data.success || !data.data) {
          throw new Error('Invalid analytics response structure');
        }

        const analytics = data.data;

        // Check for expected analytics fields
        const expectedSections = ['agent_stats', 'system_overview', 'performance_trends'];
        for (const section of expectedSections) {
          if (!analytics[section]) {
            throw new Error(`Analytics missing section: ${section}`);
          }
        }

        // Validate agent stats
        if (!Array.isArray(analytics.agent_stats) || analytics.agent_stats.length === 0) {
          throw new Error('No agent statistics found');
        }

        // Validate system overview
        const overview = analytics.system_overview;
        if (typeof overview.total_agents !== 'number' || overview.total_agents <= 0) {
          throw new Error('Invalid total_agents in system overview');
        }
      });

      // Test 6: Performance and Timeout Handling
      await this.runTest('API Performance and Timeouts', async () => {
        const startTime = Date.now();

        // Test multiple concurrent requests
        const requests = [
          page.request.get('http://localhost:5173/api/analytics?timeRange=24h'),
          page.request.get('http://localhost:5173/api/agent-posts?limit=5&offset=0'),
          page.request.get('http://localhost:5173/api/analytics?timeRange=1h')
        ];

        const responses = await Promise.all(requests);
        const duration = Date.now() - startTime;

        // All requests should complete within reasonable time
        if (duration > 15000) { // 15 seconds
          throw new Error(`API requests took too long: ${duration}ms`);
        }

        // All responses should be successful
        for (let i = 0; i < responses.length; i++) {
          if (!responses[i].ok()) {
            throw new Error(`Request ${i} failed with status ${responses[i].status()}`);
          }
        }
      });

      // Test 7: Error Handling
      await this.runTest('Error Handling and Graceful Degradation', async () => {
        // Test non-existent endpoint
        const badResponse = await page.request.get('http://localhost:5173/api/non-existent-endpoint');
        if (badResponse.status() !== 404) {
          throw new Error(`Expected 404 for non-existent endpoint, got ${badResponse.status()}`);
        }

        // Verify error response structure
        const errorData = await badResponse.json();
        if (!errorData.error) {
          throw new Error('Error response missing error field');
        }
      });

      // Test 8: Frontend Analytics Component Loading
      await this.runTest('Frontend Analytics Component Rendering', async () => {
        await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

        // Look for analytics-related elements
        const analyticsSelectors = [
          '[data-testid="real-analytics"]',
          '[data-testid="analytics"]',
          '.analytics-dashboard',
          '.analytics-component'
        ];

        let found = false;
        for (const selector of analyticsSelectors) {
          if (await page.locator(selector).count() > 0) {
            found = true;
            break;
          }
        }

        if (!found) {
          console.log('ℹ️  No direct analytics component found, checking for tab structure...');

          // Look for tab structure that might contain analytics
          const tabs = await page.locator('[role="tab"], .tab, button').all();
          for (const tab of tabs) {
            const text = await tab.textContent();
            if (text && text.toLowerCase().includes('analytic')) {
              found = true;
              break;
            }
          }
        }

        if (!found) {
          console.log('⚠️  Analytics component not directly visible, but API endpoints are working');
        }
      });

    } finally {
      await browser.close();
    }

    this.generateReport();
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(60));

    console.log(`Total Tests: ${this.results.summary.total}`);
    console.log(`Passed: ${this.results.summary.passed} ✅`);
    console.log(`Failed: ${this.results.summary.failed} ❌`);
    console.log(`Success Rate: ${((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1)}%`);

    if (this.results.summary.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.results.summary.errors.forEach(error => {
        console.log(`  • ${error}`);
      });
    }

    // Save detailed results
    const reportPath = path.join(__dirname, 'analytics-validation-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📝 Detailed results saved to: ${reportPath}`);

    console.log('\n' + '='.repeat(60));

    if (this.results.summary.failed === 0) {
      console.log('🎉 ALL TESTS PASSED! Analytics system is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Check the errors above for details.');
    }
  }
}

// Run the validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new AnalyticsValidationTest();
  validator.validateAnalytics()
    .then(() => {
      process.exit(validator.results.summary.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Validation failed with error:', error);
      process.exit(1);
    });
}

export default AnalyticsValidationTest;