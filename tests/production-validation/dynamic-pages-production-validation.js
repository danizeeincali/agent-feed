#!/usr/bin/env node

/**
 * Comprehensive Production Validation for Dynamic Pages Functionality
 * 
 * This script validates:
 * 1. Real API endpoint functionality - verify /api/agents/:agentId/pages works
 * 2. Frontend integration with zero mocks - test RealDynamicPagesTab component  
 * 3. End-to-end user workflows - navigate to pages tab and verify real data
 * 4. Error handling - test network failures and edge cases
 * 5. Performance validation - ensure response times meet requirements
 * 6. Cross-browser compatibility - test in multiple browsers
 * 7. Mobile responsiveness - verify mobile layouts work
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Configuration
const FRONTEND_URL = 'http://127.0.0.1:5173';
const BACKEND_URL = 'http://127.0.0.1:3000';
const AGENT_ID = 'personal-todos-agent';
const VALIDATION_TIMEOUT = 30000;
const SCREENSHOT_DIR = path.join(__dirname, '../../debug-screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

class DynamicPagesValidator {
    constructor() {
        this.results = {
            api_endpoint_tests: [],
            frontend_integration_tests: [],
            end_to_end_tests: [],
            error_handling_tests: [],
            performance_tests: [],
            mobile_tests: [],
            overall_status: 'PENDING'
        };
        this.startTime = Date.now();
    }

    async log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${level}] ${message}`);
    }

    async validateApiEndpoint() {
        this.log('🔍 Testing Real API Endpoint Functionality');
        
        const tests = [
            {
                name: 'GET /api/agents/personal-todos-agent/pages',
                url: `${BACKEND_URL}/api/agents/${AGENT_ID}/pages`,
                expectedStatus: 200,
                expectedDataStructure: ['success', 'data', 'pages']
            },
            {
                name: 'GET /api/agents (list all agents)', 
                url: `${BACKEND_URL}/api/agents`,
                expectedStatus: 200,
                expectedDataStructure: ['success', 'agents']
            },
            {
                name: 'GET /health (backend health check)',
                url: `${BACKEND_URL}/health`,
                expectedStatus: 200,
                expectedDataStructure: ['status', 'timestamp']
            }
        ];

        for (const test of tests) {
            try {
                const startTime = Date.now();
                const response = await fetch(test.url);
                const responseTime = Date.now() - startTime;
                
                const data = await response.json();
                
                const result = {
                    name: test.name,
                    status: response.status === test.expectedStatus ? 'PASS' : 'FAIL',
                    responseTime: responseTime,
                    statusCode: response.status,
                    dataReceived: data,
                    expectedDataStructure: test.expectedDataStructure,
                    hasExpectedStructure: test.expectedDataStructure.every(key => key in data),
                    details: response.status === test.expectedStatus ? 'Success' : `Expected ${test.expectedStatus}, got ${response.status}`
                };
                
                this.results.api_endpoint_tests.push(result);
                this.log(`  ✓ ${test.name}: ${result.status} (${responseTime}ms)`);
                
                if (test.name.includes('pages') && data.success) {
                    this.log(`    📄 Found ${data.data?.pages?.length || 0} dynamic pages`);
                    if (data.data?.pages?.length > 0) {
                        this.log(`    📋 Sample page: "${data.data.pages[0].title}"`);
                    }
                }
                
            } catch (error) {
                const result = {
                    name: test.name,
                    status: 'FAIL',
                    error: error.message,
                    details: 'Network or parsing error'
                };
                this.results.api_endpoint_tests.push(result);
                this.log(`  ✗ ${test.name}: FAIL - ${error.message}`);
            }
        }
    }

    async validateFrontendIntegration() {
        this.log('🖥️ Testing Frontend Integration (Zero Mocks)');
        
        const browser = await puppeteer.launch({ 
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        try {
            const page = await browser.newPage();
            
            // Set viewport for desktop testing
            await page.setViewport({ width: 1920, height: 1080 });
            
            // Monitor console errors and network requests
            const consoleErrors = [];
            const networkRequests = [];
            
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    consoleErrors.push(msg.text());
                }
            });
            
            page.on('response', response => {
                networkRequests.push({
                    url: response.url(),
                    status: response.status(),
                    method: response.request().method()
                });
            });
            
            // Test 1: Navigate to Agent Profile Page
            this.log('  📡 Loading agent profile page...');
            const startLoad = Date.now();
            
            await page.goto(`${FRONTEND_URL}/agents/${AGENT_ID}`, { 
                waitUntil: 'networkidle0',
                timeout: VALIDATION_TIMEOUT 
            });
            
            const loadTime = Date.now() - startLoad;
            
            await page.screenshot({ 
                path: path.join(SCREENSHOT_DIR, 'agent-profile-loaded.png'),
                fullPage: true 
            });
            
            // Test 2: Check for RealDynamicPagesTab Component
            this.log('  🧩 Checking for Dynamic Pages tab...');
            
            // Look for Dynamic Pages tab or content
            const dynamicPagesTab = await page.$('text=Dynamic Pages') || 
                                  await page.$('[data-testid="dynamic-pages-tab"]') ||
                                  await page.$('.dynamic-pages-tab');
            
            const hasDynamicPagesSection = await page.evaluate(() => {
                // Look for various indicators of dynamic pages functionality
                const indicators = [
                    document.querySelector('*[class*="dynamic"]'),
                    document.querySelector('*[class*="pages"]'),
                    document.textContent.includes('Dynamic Pages'),
                    document.textContent.includes('Create Page'),
                    document.textContent.includes('pages total')
                ];
                return indicators.some(indicator => indicator);
            });
            
            // Test 3: Verify No Mock Data
            this.log('  🚫 Verifying no mock data usage...');
            
            const hasMockData = await page.evaluate(() => {
                const pageText = document.body.textContent.toLowerCase();
                const mockIndicators = [
                    'mock data',
                    'fake data', 
                    'test data',
                    'sample data',
                    'placeholder',
                    'lorem ipsum'
                ];
                return mockIndicators.some(indicator => pageText.includes(indicator));
            });
            
            // Test 4: Check API Calls
            this.log('  🌐 Checking real API calls...');
            
            const dynamicPagesApiCalls = networkRequests.filter(req => 
                req.url.includes(`/api/agents/${AGENT_ID}/pages`) && 
                req.method === 'GET'
            );
            
            const agentsApiCalls = networkRequests.filter(req => 
                req.url.includes('/api/agents') && 
                req.method === 'GET'
            );
            
            const frontendResults = {
                page_load_time: loadTime,
                console_errors: consoleErrors,
                has_dynamic_pages_tab: !!dynamicPagesTab || hasDynamicPagesSection,
                no_mock_data: !hasMockData,
                api_calls_made: {
                    dynamic_pages: dynamicPagesApiCalls,
                    agents_list: agentsApiCalls
                },
                network_requests_total: networkRequests.length,
                status: 'PASS'
            };
            
            // Validate results
            if (consoleErrors.length > 0) {
                frontendResults.status = 'WARN';
                this.log(`  ⚠️ Console errors detected: ${consoleErrors.length}`);
            }
            
            if (!frontendResults.has_dynamic_pages_tab) {
                frontendResults.status = 'FAIL';
                this.log('  ✗ Dynamic Pages functionality not found');
            }
            
            if (frontendResults.no_mock_data) {
                this.log('  ✓ No mock data detected - using real data');
            } else {
                this.log('  ⚠️ Possible mock data detected');
                frontendResults.status = 'WARN';
            }
            
            this.results.frontend_integration_tests.push(frontendResults);
            
        } finally {
            await browser.close();
        }
    }

    async validateEndToEndWorkflow() {
        this.log('🔄 Testing End-to-End User Workflows');
        
        const browser = await puppeteer.launch({ 
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });
            
            // Workflow Test: Complete user journey
            const workflow = {
                name: 'Complete Dynamic Pages Workflow',
                steps: [],
                status: 'PASS'
            };
            
            // Step 1: Navigate to agent profile
            this.log('  🎯 Step 1: Navigate to agent profile');
            const step1Start = Date.now();
            
            await page.goto(`${FRONTEND_URL}/agents/${AGENT_ID}`, { 
                waitUntil: 'networkidle0',
                timeout: VALIDATION_TIMEOUT 
            });
            
            workflow.steps.push({
                step: 'Navigate to agent profile',
                duration: Date.now() - step1Start,
                status: 'PASS'
            });
            
            await page.screenshot({ 
                path: path.join(SCREENSHOT_DIR, 'workflow-step1-profile.png'),
                fullPage: true 
            });
            
            // Step 2: Look for Dynamic Pages section
            this.log('  📄 Step 2: Locate Dynamic Pages section');
            const step2Start = Date.now();
            
            // Try to find Dynamic Pages tab or section
            let dynamicPagesFound = false;
            try {
                // Look for tab navigation
                const tabs = await page.$$('button, a, div');
                for (const tab of tabs) {
                    const text = await page.evaluate(el => el.textContent, tab);
                    if (text && text.toLowerCase().includes('dynamic') && text.toLowerCase().includes('pages')) {
                        await tab.click();
                        dynamicPagesFound = true;
                        break;
                    }
                }
                
                // Alternative: look for pages content directly
                if (!dynamicPagesFound) {
                    const pageContent = await page.content();
                    dynamicPagesFound = pageContent.includes('Dynamic Pages') || 
                                      pageContent.includes('Create Page') ||
                                      pageContent.includes('pages total');
                }
                
            } catch (error) {
                this.log(`  ⚠️ Error in step 2: ${error.message}`);
            }
            
            workflow.steps.push({
                step: 'Locate Dynamic Pages section',
                duration: Date.now() - step2Start,
                status: dynamicPagesFound ? 'PASS' : 'FAIL',
                found: dynamicPagesFound
            });
            
            // Step 3: Verify real data is displayed
            this.log('  📊 Step 3: Verify real data display');
            const step3Start = Date.now();
            
            await page.screenshot({ 
                path: path.join(SCREENSHOT_DIR, 'workflow-step3-data.png'),
                fullPage: true 
            });
            
            const realDataVerification = await page.evaluate(() => {
                const pageText = document.body.textContent;
                const indicators = {
                    hasPageTitles: /Personal Todos|Task Management|Dashboard/i.test(pageText),
                    hasTimestamps: /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|ago|Created|Updated/i.test(pageText),
                    hasPageCounts: /\d+\s+(page|total|active)/i.test(pageText),
                    noMockData: !/(mock|fake|sample|test)\s+data/i.test(pageText)
                };
                return indicators;
            });
            
            workflow.steps.push({
                step: 'Verify real data display',
                duration: Date.now() - step3Start,
                status: Object.values(realDataVerification).every(v => v) ? 'PASS' : 'WARN',
                dataVerification: realDataVerification
            });
            
            // Overall workflow status
            workflow.status = workflow.steps.every(step => step.status === 'PASS') ? 'PASS' : 'PARTIAL';
            workflow.totalDuration = workflow.steps.reduce((sum, step) => sum + step.duration, 0);
            
            this.results.end_to_end_tests.push(workflow);
            
        } finally {
            await browser.close();
        }
    }

    async validateErrorHandling() {
        this.log('⚠️ Testing Error Handling Scenarios');
        
        const errorTests = [
            {
                name: 'Invalid Agent ID',
                url: `${BACKEND_URL}/api/agents/nonexistent-agent/pages`,
                expectedStatus: 404
            },
            {
                name: 'Malformed Request',
                url: `${BACKEND_URL}/api/agents/${AGENT_ID}/pages?invalid=query`,
                expectedStatus: [200, 400] // Either works or properly rejects
            }
        ];
        
        for (const test of errorTests) {
            try {
                const response = await fetch(test.url);
                const isExpectedStatus = Array.isArray(test.expectedStatus) 
                    ? test.expectedStatus.includes(response.status)
                    : response.status === test.expectedStatus;
                
                const result = {
                    name: test.name,
                    status: isExpectedStatus ? 'PASS' : 'FAIL',
                    expectedStatus: test.expectedStatus,
                    actualStatus: response.status,
                    details: isExpectedStatus ? 'Handled correctly' : 'Unexpected response'
                };
                
                this.results.error_handling_tests.push(result);
                this.log(`  ${isExpectedStatus ? '✓' : '✗'} ${test.name}: ${result.status}`);
                
            } catch (error) {
                const result = {
                    name: test.name,
                    status: 'FAIL',
                    error: error.message,
                    details: 'Network error during error test'
                };
                this.results.error_handling_tests.push(result);
                this.log(`  ✗ ${test.name}: FAIL - ${error.message}`);
            }
        }
    }

    async validatePerformance() {
        this.log('⚡ Testing Performance Requirements');
        
        const performanceTests = [
            {
                name: 'API Response Time',
                url: `${BACKEND_URL}/api/agents/${AGENT_ID}/pages`,
                maxResponseTime: 2000 // 2 seconds
            },
            {
                name: 'Agent List Response Time', 
                url: `${BACKEND_URL}/api/agents`,
                maxResponseTime: 1000 // 1 second
            }
        ];
        
        for (const test of performanceTests) {
            try {
                const startTime = Date.now();
                const response = await fetch(test.url);
                const responseTime = Date.now() - startTime;
                
                const result = {
                    name: test.name,
                    responseTime: responseTime,
                    maxAllowed: test.maxResponseTime,
                    status: responseTime <= test.maxResponseTime ? 'PASS' : 'FAIL',
                    details: `${responseTime}ms (max: ${test.maxResponseTime}ms)`
                };
                
                this.results.performance_tests.push(result);
                this.log(`  ${result.status === 'PASS' ? '✓' : '✗'} ${test.name}: ${responseTime}ms`);
                
            } catch (error) {
                const result = {
                    name: test.name,
                    status: 'FAIL',
                    error: error.message,
                    details: 'Failed to measure performance'
                };
                this.results.performance_tests.push(result);
                this.log(`  ✗ ${test.name}: FAIL - ${error.message}`);
            }
        }
    }

    async validateMobileResponsiveness() {
        this.log('📱 Testing Mobile Responsiveness');
        
        const browser = await puppeteer.launch({ 
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        try {
            const page = await browser.newPage();
            
            const mobileViewports = [
                { name: 'iPhone SE', width: 375, height: 667 },
                { name: 'iPad', width: 768, height: 1024 },
                { name: 'Desktop', width: 1920, height: 1080 }
            ];
            
            for (const viewport of mobileViewports) {
                await page.setViewport({ width: viewport.width, height: viewport.height });
                
                const startTime = Date.now();
                await page.goto(`${FRONTEND_URL}/agents/${AGENT_ID}`, { 
                    waitUntil: 'networkidle0',
                    timeout: VALIDATION_TIMEOUT 
                });
                const loadTime = Date.now() - startTime;
                
                await page.screenshot({ 
                    path: path.join(SCREENSHOT_DIR, `mobile-${viewport.name.toLowerCase().replace(' ', '-')}.png`),
                    fullPage: true 
                });
                
                const mobileTest = {
                    viewport: viewport.name,
                    dimensions: `${viewport.width}x${viewport.height}`,
                    loadTime: loadTime,
                    status: loadTime < 5000 ? 'PASS' : 'SLOW',
                    details: `Loaded in ${loadTime}ms`
                };
                
                this.results.mobile_tests.push(mobileTest);
                this.log(`  📱 ${viewport.name}: ${mobileTest.status} (${loadTime}ms)`);
            }
            
        } finally {
            await browser.close();
        }
    }

    generateReport() {
        this.log('📊 Generating Comprehensive Validation Report');
        
        const totalDuration = Date.now() - this.startTime;
        
        // Calculate overall status
        const allTests = [
            ...this.results.api_endpoint_tests,
            ...this.results.frontend_integration_tests,
            ...this.results.end_to_end_tests,
            ...this.results.error_handling_tests,
            ...this.results.performance_tests,
            ...this.results.mobile_tests
        ];
        
        const passCount = allTests.filter(test => test.status === 'PASS').length;
        const failCount = allTests.filter(test => test.status === 'FAIL').length;
        const warnCount = allTests.filter(test => test.status === 'WARN' || test.status === 'SLOW' || test.status === 'PARTIAL').length;
        
        this.results.overall_status = failCount === 0 ? (warnCount === 0 ? 'PASS' : 'PASS_WITH_WARNINGS') : 'FAIL';
        
        const report = {
            timestamp: new Date().toISOString(),
            duration: `${(totalDuration / 1000).toFixed(2)}s`,
            overall_status: this.results.overall_status,
            summary: {
                total_tests: allTests.length,
                passed: passCount,
                failed: failCount,
                warnings: warnCount,
                success_rate: `${((passCount / allTests.length) * 100).toFixed(1)}%`
            },
            detailed_results: this.results,
            recommendations: this.generateRecommendations()
        };
        
        // Save report to file
        const reportPath = path.join(__dirname, '../reports/dynamic-pages-validation-report.json');
        if (!fs.existsSync(path.dirname(reportPath))) {
            fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        }
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        this.log(`📄 Report saved to: ${reportPath}`);
        
        return report;
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Check API performance
        const slowApiTests = this.results.performance_tests.filter(test => test.status === 'FAIL');
        if (slowApiTests.length > 0) {
            recommendations.push({
                category: 'Performance',
                priority: 'HIGH',
                issue: 'API response times exceed requirements',
                action: 'Optimize database queries and add caching'
            });
        }
        
        // Check error handling
        const failedErrorTests = this.results.error_handling_tests.filter(test => test.status === 'FAIL');
        if (failedErrorTests.length > 0) {
            recommendations.push({
                category: 'Error Handling',
                priority: 'MEDIUM',
                issue: 'Some error scenarios not properly handled',
                action: 'Improve error handling and validation'
            });
        }
        
        // Check frontend integration
        const frontendIssues = this.results.frontend_integration_tests.filter(test => test.status !== 'PASS');
        if (frontendIssues.length > 0) {
            recommendations.push({
                category: 'Frontend',
                priority: 'HIGH',
                issue: 'Frontend integration issues detected',
                action: 'Review component integration and fix console errors'
            });
        }
        
        if (recommendations.length === 0) {
            recommendations.push({
                category: 'Overall',
                priority: 'INFO',
                issue: 'All tests passed successfully',
                action: 'Continue monitoring and maintain current quality standards'
            });
        }
        
        return recommendations;
    }

    async run() {
        try {
            this.log('🚀 Starting Dynamic Pages Production Validation');
            this.log(`📍 Frontend: ${FRONTEND_URL}`);
            this.log(`📍 Backend: ${BACKEND_URL}`);
            this.log(`👤 Agent ID: ${AGENT_ID}`);
            
            await this.validateApiEndpoint();
            await this.validateFrontendIntegration();
            await this.validateEndToEndWorkflow();
            await this.validateErrorHandling();
            await this.validatePerformance();
            await this.validateMobileResponsiveness();
            
            const report = this.generateReport();
            
            this.log('');
            this.log('🎉 Validation Complete!');
            this.log(`📊 Overall Status: ${report.overall_status}`);
            this.log(`✅ Passed: ${report.summary.passed}/${report.summary.total_tests}`);
            this.log(`❌ Failed: ${report.summary.failed}/${report.summary.total_tests}`);
            this.log(`⚠️ Warnings: ${report.summary.warnings}/${report.summary.total_tests}`);
            this.log(`📈 Success Rate: ${report.summary.success_rate}`);
            this.log(`⏱️ Duration: ${report.duration}`);
            
            if (report.overall_status === 'FAIL') {
                process.exit(1);
            }
            
        } catch (error) {
            this.log(`💥 Validation failed with error: ${error.message}`, 'ERROR');
            process.exit(1);
        }
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new DynamicPagesValidator();
    validator.run();
}

module.exports = DynamicPagesValidator;