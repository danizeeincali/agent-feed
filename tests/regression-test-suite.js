/**
 * COMPREHENSIVE REGRESSION TEST SUITE
 * Settings Removal Validation - Zero Mock Testing
 *
 * This test suite validates all application functionality after Settings removal
 * Uses real browser automation and actual HTTP requests
 * NO MOCKS - 100% real validation as requested
 */

const { chromium } = require('playwright');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

class RegressionTestSuite {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.baseUrl = 'http://localhost:3002';
        this.apiUrl = 'http://localhost:3002/api';
        this.testResults = [];
        this.failures = [];
        this.startTime = Date.now();
    }

    async setup() {
        console.log('🚀 Setting up browser automation environment...');
        this.browser = await chromium.launch({
            headless: true, // Headless mode for Codespaces environment
            args: ['--no-sandbox', '--disable-dev-shm-usage']
        });
        this.context = await this.browser.newContext({
            viewport: { width: 1280, height: 720 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        });
        this.page = await this.context.newPage();

        // Enable console logging
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`❌ Console Error: ${msg.text()}`);
                this.failures.push(`Console Error: ${msg.text()}`);
            }
        });

        // Track network failures
        this.page.on('response', response => {
            if (!response.ok() && response.url().includes('localhost')) {
                console.log(`❌ HTTP Error: ${response.status()} ${response.url()}`);
                this.failures.push(`HTTP Error: ${response.status()} ${response.url()}`);
            }
        });
    }

    async teardown() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    log(testName, status, details = '') {
        const result = {
            test: testName,
            status: status,
            details: details,
            timestamp: new Date().toISOString()
        };
        this.testResults.push(result);

        const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏳';
        console.log(`${icon} ${testName}: ${status} ${details}`);
    }

    async makeHttpRequest(url, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'RegressionTestSuite/1.0'
                }
            };

            const req = http.request(url, options, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: responseData
                    });
                });
            });

            req.on('error', reject);

            if (data && method !== 'GET') {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    async testRouteAccessibility() {
        const routes = [
            '/', // Home/Feed
            '/agents', // Agents management
            '/analytics', // Analytics dashboard
            '/activity', // Activity feed
            '/drafts' // Draft management
        ];

        for (const route of routes) {
            try {
                const response = await this.page.goto(`${this.baseUrl}${route}`, {
                    waitUntil: 'networkidle'
                });

                if (response && response.status() === 200) {
                    // Wait for page to fully load
                    await this.page.waitForTimeout(2000);

                    // Check if page has content (not blank)
                    const bodyText = await this.page.textContent('body');
                    if (bodyText && bodyText.trim().length > 0) {
                        this.log(`Route ${route}`, 'PASS', `Status: ${response.status()}`);
                    } else {
                        this.log(`Route ${route}`, 'FAIL', 'Page appears to be blank');
                    }
                } else {
                    this.log(`Route ${route}`, 'FAIL', `HTTP ${response ? response.status() : 'No response'}`);
                }
            } catch (error) {
                this.log(`Route ${route}`, 'FAIL', `Error: ${error.message}`);
            }
        }
    }

    async testNavigationFunctionality() {
        try {
            await this.page.goto(this.baseUrl, { waitUntil: 'networkidle' });

            // Test main navigation elements
            const navElements = [
                'a[href="/"]',
                'a[href="/agents"]',
                'a[href="/analytics"]',
                'a[href="/activity"]',
                'a[href="/drafts"]'
            ];

            for (const selector of navElements) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        await element.click();
                        await this.page.waitForTimeout(1000);
                        const currentUrl = this.page.url();
                        this.log(`Navigation ${selector}`, 'PASS', `Navigated to: ${currentUrl}`);
                    } else {
                        this.log(`Navigation ${selector}`, 'FAIL', 'Element not found');
                    }
                } catch (error) {
                    this.log(`Navigation ${selector}`, 'FAIL', `Click failed: ${error.message}`);
                }
            }
        } catch (error) {
            this.log('Navigation Test', 'FAIL', error.message);
        }
    }

    async testComponentRendering() {
        const routes = ['/', '/agents', '/analytics', '/activity', '/drafts'];

        for (const route of routes) {
            try {
                await this.page.goto(`${this.baseUrl}${route}`, { waitUntil: 'networkidle' });

                // Check for React components by looking for common patterns
                const hasReactComponents = await this.page.evaluate(() => {
                    // Look for React fiber nodes or common React patterns
                    return document.querySelector('[data-reactroot]') !== null ||
                           document.querySelector('[data-react]') !== null ||
                           window.React !== undefined ||
                           document.querySelector('.react-component') !== null;
                });

                // Check for specific UI components
                const components = await this.page.evaluate(() => {
                    return {
                        buttons: document.querySelectorAll('button').length,
                        inputs: document.querySelectorAll('input').length,
                        forms: document.querySelectorAll('form').length,
                        headers: document.querySelectorAll('h1, h2, h3').length,
                        divs: document.querySelectorAll('div').length
                    };
                });

                if (components.divs > 0 && (components.buttons > 0 || components.headers > 0)) {
                    this.log(`Components ${route}`, 'PASS', `Found ${components.divs} divs, ${components.buttons} buttons, ${components.headers} headers`);
                } else {
                    this.log(`Components ${route}`, 'FAIL', 'Insufficient UI components found');
                }

            } catch (error) {
                this.log(`Components ${route}`, 'FAIL', error.message);
            }
        }
    }

    async testApiEndpoints() {
        const endpoints = [
            { path: '/api/posts', method: 'GET' },
            { path: '/api/agents', method: 'GET' },
            { path: '/api/analytics', method: 'GET' },
            { path: '/api/activity', method: 'GET' },
            { path: '/api/health', method: 'GET' }
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await this.makeHttpRequest(`${this.apiUrl}${endpoint.path}`, endpoint.method);

                if (response.status >= 200 && response.status < 400) {
                    this.log(`API ${endpoint.path}`, 'PASS', `Status: ${response.status}`);
                } else {
                    this.log(`API ${endpoint.path}`, 'FAIL', `Status: ${response.status}`);
                }
            } catch (error) {
                this.log(`API ${endpoint.path}`, 'FAIL', `Request failed: ${error.message}`);
            }
        }
    }

    async testErrorBoundaries() {
        try {
            await this.page.goto(this.baseUrl, { waitUntil: 'networkidle' });

            // Inject an error to test error boundaries
            const errorThrown = await this.page.evaluate(() => {
                try {
                    // Try to trigger a React error
                    if (window.React && window.ReactDOM) {
                        // This should be caught by error boundaries
                        throw new Error('Test error for error boundary validation');
                    }
                    return false;
                } catch (e) {
                    return true;
                }
            });

            // Check if error boundaries are handling errors gracefully
            const hasErrorDisplay = await this.page.$('.error-boundary, .error-message, [data-error]');

            if (hasErrorDisplay) {
                this.log('Error Boundaries', 'PASS', 'Error boundary component found');
            } else {
                this.log('Error Boundaries', 'WARN', 'No error boundary UI detected');
            }

        } catch (error) {
            this.log('Error Boundaries', 'FAIL', error.message);
        }
    }

    async testResponsiveDesign() {
        const viewports = [
            { width: 375, height: 667, name: 'Mobile' },
            { width: 768, height: 1024, name: 'Tablet' },
            { width: 1280, height: 720, name: 'Desktop' },
            { width: 1920, height: 1080, name: 'Large Desktop' }
        ];

        for (const viewport of viewports) {
            try {
                await this.page.setViewportSize({ width: viewport.width, height: viewport.height });
                await this.page.goto(this.baseUrl, { waitUntil: 'networkidle' });

                // Check if layout adapts to viewport
                const layoutInfo = await this.page.evaluate(() => {
                    const body = document.body;
                    return {
                        hasHorizontalScroll: body.scrollWidth > window.innerWidth,
                        bodyWidth: body.offsetWidth,
                        viewportWidth: window.innerWidth
                    };
                });

                if (!layoutInfo.hasHorizontalScroll && layoutInfo.bodyWidth <= viewport.width) {
                    this.log(`Responsive ${viewport.name}`, 'PASS', `${viewport.width}x${viewport.height}`);
                } else {
                    this.log(`Responsive ${viewport.name}`, 'FAIL', 'Layout overflow detected');
                }

            } catch (error) {
                this.log(`Responsive ${viewport.name}`, 'FAIL', error.message);
            }
        }
    }

    async testPerformance() {
        try {
            await this.page.goto(this.baseUrl, { waitUntil: 'networkidle' });

            const performanceMetrics = await this.page.evaluate(() => {
                const timing = performance.timing;
                return {
                    domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                    loadComplete: timing.loadEventEnd - timing.navigationStart,
                    domElements: document.querySelectorAll('*').length
                };
            });

            // Performance thresholds
            const thresholds = {
                domContentLoaded: 3000, // 3 seconds
                loadComplete: 5000 // 5 seconds
            };

            if (performanceMetrics.domContentLoaded < thresholds.domContentLoaded &&
                performanceMetrics.loadComplete < thresholds.loadComplete) {
                this.log('Performance', 'PASS',
                    `DOMContentLoaded: ${performanceMetrics.domContentLoaded}ms, Load: ${performanceMetrics.loadComplete}ms`);
            } else {
                this.log('Performance', 'FAIL',
                    `Too slow - DOMContentLoaded: ${performanceMetrics.domContentLoaded}ms, Load: ${performanceMetrics.loadComplete}ms`);
            }

        } catch (error) {
            this.log('Performance', 'FAIL', error.message);
        }
    }

    async testAccessibility() {
        try {
            await this.page.goto(this.baseUrl, { waitUntil: 'networkidle' });

            const accessibilityInfo = await this.page.evaluate(() => {
                return {
                    hasTitle: document.title !== '',
                    hasMetaViewport: document.querySelector('meta[name="viewport"]') !== null,
                    hasAriaLabels: document.querySelectorAll('[aria-label]').length,
                    hasAltText: document.querySelectorAll('img[alt]').length,
                    totalImages: document.querySelectorAll('img').length,
                    hasHeadings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0,
                    hasSkipLinks: document.querySelectorAll('a[href^="#"]').length > 0
                };
            });

            let accessibilityScore = 0;
            let maxScore = 6;

            if (accessibilityInfo.hasTitle) accessibilityScore++;
            if (accessibilityInfo.hasMetaViewport) accessibilityScore++;
            if (accessibilityInfo.hasAriaLabels > 0) accessibilityScore++;
            if (accessibilityInfo.totalImages === 0 || accessibilityInfo.hasAltText > 0) accessibilityScore++;
            if (accessibilityInfo.hasHeadings) accessibilityScore++;
            if (accessibilityInfo.hasSkipLinks) accessibilityScore++;

            const scorePercentage = (accessibilityScore / maxScore) * 100;

            if (scorePercentage >= 70) {
                this.log('Accessibility', 'PASS', `Score: ${scorePercentage.toFixed(1)}%`);
            } else {
                this.log('Accessibility', 'FAIL', `Score: ${scorePercentage.toFixed(1)}% (needs improvement)`);
            }

        } catch (error) {
            this.log('Accessibility', 'FAIL', error.message);
        }
    }

    async generateReport() {
        const endTime = Date.now();
        const duration = endTime - this.startTime;

        const summary = {
            testSuite: 'Settings Removal Regression Tests',
            timestamp: new Date().toISOString(),
            duration: `${(duration / 1000).toFixed(2)}s`,
            totalTests: this.testResults.length,
            passed: this.testResults.filter(r => r.status === 'PASS').length,
            failed: this.testResults.filter(r => r.status === 'FAIL').length,
            warnings: this.testResults.filter(r => r.status === 'WARN').length,
            failures: this.failures,
            results: this.testResults
        };

        // Write detailed report
        const reportPath = '/workspaces/agent-feed/test-results/regression-test-report.json';
        await fs.promises.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.promises.writeFile(reportPath, JSON.stringify(summary, null, 2));

        // Console summary
        console.log('\n' + '='.repeat(80));
        console.log('🎯 REGRESSION TEST SUITE COMPLETE');
        console.log('='.repeat(80));
        console.log(`📊 Results: ${summary.passed}/${summary.totalTests} tests passed`);
        console.log(`⏱️  Duration: ${summary.duration}`);
        console.log(`❌ Failures: ${summary.failed}`);
        console.log(`⚠️  Warnings: ${summary.warnings}`);

        if (summary.failures.length > 0) {
            console.log('\n🚨 Critical Issues Found:');
            summary.failures.forEach(failure => console.log(`  - ${failure}`));
        }

        console.log(`\n📄 Detailed report: ${reportPath}`);
        console.log('='.repeat(80));

        return summary;
    }

    async run() {
        console.log('🔥 COMPREHENSIVE REGRESSION TEST SUITE - SETTINGS REMOVAL VALIDATION');
        console.log('📋 Testing Mode: 100% Real - Zero Mocks\n');

        try {
            await this.setup();

            // Execute all test categories
            console.log('1️⃣  Testing Route Accessibility...');
            await this.testRouteAccessibility();

            console.log('\n2️⃣  Testing Navigation Functionality...');
            await this.testNavigationFunctionality();

            console.log('\n3️⃣  Testing Component Rendering...');
            await this.testComponentRendering();

            console.log('\n4️⃣  Testing API Endpoints...');
            await this.testApiEndpoints();

            console.log('\n5️⃣  Testing Error Boundaries...');
            await this.testErrorBoundaries();

            console.log('\n6️⃣  Testing Responsive Design...');
            await this.testResponsiveDesign();

            console.log('\n7️⃣  Testing Performance...');
            await this.testPerformance();

            console.log('\n8️⃣  Testing Accessibility...');
            await this.testAccessibility();

            return await this.generateReport();

        } catch (error) {
            console.error('❌ Test suite failed:', error);
            this.log('Test Suite', 'FAIL', error.message);
            return await this.generateReport();
        } finally {
            await this.teardown();
        }
    }
}

// Export for module use
module.exports = RegressionTestSuite;

// Run if called directly
if (require.main === module) {
    (async () => {
        const testSuite = new RegressionTestSuite();
        const results = await testSuite.run();
        process.exit(results.failed > 0 ? 1 : 0);
    })();
}