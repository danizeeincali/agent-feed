/**
 * HEADLESS REAL BROWSER TESTING FOR ADVANCED FILTER FUNCTIONALITY
 * Tests actual browser interaction with http://localhost:4173 in headless mode
 */

const { chromium } = require('playwright');
const fs = require('fs');

class HeadlessFilterTest {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.testResults = {
            timestamp: new Date().toISOString(),
            url: 'http://localhost:4173',
            tests: [],
            networkCalls: [],
            consoleMessages: [],
            apiCalls: []
        };
    }

    async setup() {
        console.log('🚀 Setting up headless browser...');
        
        this.browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-dev-shm-usage']
        });
        
        this.context = await this.browser.newContext({
            viewport: { width: 1280, height: 720 }
        });

        this.page = await this.context.newPage();

        // Capture all network traffic
        this.page.on('request', request => {
            const url = request.url();
            this.testResults.networkCalls.push({
                type: 'request',
                timestamp: new Date().toISOString(),
                method: request.method(),
                url: url,
                headers: request.headers(),
                postData: request.postData()
            });

            // Track API calls specifically
            if (url.includes('/api/')) {
                this.testResults.apiCalls.push({
                    type: 'API_REQUEST',
                    timestamp: new Date().toISOString(),
                    method: request.method(),
                    url: url,
                    postData: request.postData()
                });
            }
        });

        this.page.on('response', response => {
            const url = response.url();
            this.testResults.networkCalls.push({
                type: 'response',
                timestamp: new Date().toISOString(),
                status: response.status(),
                url: url,
                headers: response.headers()
            });

            // Track API responses specifically
            if (url.includes('/api/')) {
                this.testResults.apiCalls.push({
                    type: 'API_RESPONSE',
                    timestamp: new Date().toISOString(),
                    status: response.status(),
                    url: url
                });
            }
        });

        // Capture all console messages
        this.page.on('console', msg => {
            this.testResults.consoleMessages.push({
                timestamp: new Date().toISOString(),
                type: msg.type(),
                text: msg.text(),
                location: msg.location()
            });
        });
    }

    async navigateToApp() {
        console.log('🌐 Navigating to app...');
        
        const testResult = { 
            name: 'Navigate to Application',
            started: new Date().toISOString(),
            steps: []
        };

        try {
            const response = await this.page.goto('http://localhost:4173', { 
                waitUntil: 'networkidle',
                timeout: 30000
            });
            
            testResult.steps.push({
                step: 'Page navigation',
                success: response.ok(),
                details: `Status: ${response.status()}`,
                timestamp: new Date().toISOString()
            });

            // Wait for page to fully load
            await this.page.waitForLoadState('domcontentloaded');
            
            // Check if we can access the page
            const title = await this.page.title();
            testResult.steps.push({
                step: 'Page title retrieved',
                success: !!title,
                details: `Title: "${title}"`,
                timestamp: new Date().toISOString()
            });

            testResult.completed = new Date().toISOString();
            testResult.success = true;

        } catch (error) {
            testResult.error = error.message;
            testResult.success = false;
            testResult.completed = new Date().toISOString();
        }

        this.testResults.tests.push(testResult);
        return testResult.success;
    }

    async inspectPageStructure() {
        console.log('🔍 Inspecting page structure...');
        
        const testResult = { 
            name: 'Page Structure Inspection',
            started: new Date().toISOString(),
            steps: []
        };

        try {
            // Get page structure
            const pageInfo = await this.page.evaluate(() => {
                return {
                    url: window.location.href,
                    title: document.title,
                    bodyHTML: document.body ? document.body.innerHTML.substring(0, 1000) : 'No body',
                    allButtons: Array.from(document.querySelectorAll('button')).map(btn => ({
                        text: btn.textContent.trim(),
                        className: btn.className,
                        id: btn.id,
                        visible: btn.offsetParent !== null
                    })),
                    allInputs: Array.from(document.querySelectorAll('input, select')).map(input => ({
                        type: input.type,
                        name: input.name,
                        placeholder: input.placeholder,
                        className: input.className,
                        id: input.id
                    })),
                    postElements: Array.from(document.querySelectorAll('[data-testid*="post"], [class*="post"]')).length,
                    filterElements: Array.from(document.querySelectorAll('[data-testid*="filter"], [class*="filter"], button:contains("filter")')).map(el => ({
                        tagName: el.tagName,
                        text: el.textContent.trim(),
                        className: el.className,
                        id: el.id
                    }))
                };
            });

            testResult.steps.push({
                step: 'Page structure captured',
                success: true,
                details: `Found ${pageInfo.allButtons.length} buttons, ${pageInfo.allInputs.length} inputs, ${pageInfo.postElements} posts`,
                data: pageInfo,
                timestamp: new Date().toISOString()
            });

            testResult.completed = new Date().toISOString();
            testResult.success = true;

        } catch (error) {
            testResult.error = error.message;
            testResult.success = false;
            testResult.completed = new Date().toISOString();
        }

        this.testResults.tests.push(testResult);
        return testResult.success;
    }

    async testFilterFunctionality() {
        console.log('🔧 Testing filter functionality...');
        
        const testResult = { 
            name: 'Filter Functionality Test',
            started: new Date().toISOString(),
            steps: []
        };

        try {
            // Look for filter-related elements
            const filterElements = await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const filterButtons = buttons.filter(btn => 
                    btn.textContent.toLowerCase().includes('filter') ||
                    btn.textContent.toLowerCase().includes('advanced')
                );

                return filterButtons.map(btn => ({
                    text: btn.textContent.trim(),
                    className: btn.className,
                    id: btn.id,
                    visible: btn.offsetParent !== null
                }));
            });

            testResult.steps.push({
                step: 'Filter buttons search',
                success: filterElements.length > 0,
                details: `Found ${filterElements.length} potential filter buttons`,
                data: filterElements,
                timestamp: new Date().toISOString()
            });

            // Try to find and interact with filter button
            const filterButtonFound = await this.page.locator('button').filter({ hasText: /filter|advanced/i }).first().isVisible().catch(() => false);
            
            if (filterButtonFound) {
                testResult.steps.push({
                    step: 'Filter button located',
                    success: true,
                    timestamp: new Date().toISOString()
                });

                // Click the filter button
                await this.page.locator('button').filter({ hasText: /filter|advanced/i }).first().click();
                await this.page.waitForTimeout(2000);

                testResult.steps.push({
                    step: 'Filter button clicked',
                    success: true,
                    timestamp: new Date().toISOString()
                });

                // Check for filter UI changes
                const afterClickStructure = await this.page.evaluate(() => {
                    return {
                        visibleInputs: Array.from(document.querySelectorAll('input:not([type="hidden"])')).filter(input => input.offsetParent !== null).length,
                        visibleSelects: Array.from(document.querySelectorAll('select')).filter(select => select.offsetParent !== null).length,
                        newElements: document.querySelectorAll('[data-testid*="filter"], .filter-panel, .advanced-filter').length
                    };
                });

                testResult.steps.push({
                    step: 'UI changes after filter click',
                    success: afterClickStructure.visibleInputs > 0 || afterClickStructure.newElements > 0,
                    details: `Visible inputs: ${afterClickStructure.visibleInputs}, Filter elements: ${afterClickStructure.newElements}`,
                    timestamp: new Date().toISOString()
                });
            } else {
                testResult.steps.push({
                    step: 'Filter button location',
                    success: false,
                    details: 'No filter button found with expected text',
                    timestamp: new Date().toISOString()
                });
            }

            testResult.completed = new Date().toISOString();
            testResult.success = filterElements.length > 0;

        } catch (error) {
            testResult.error = error.message;
            testResult.success = false;
            testResult.completed = new Date().toISOString();
        }

        this.testResults.tests.push(testResult);
        return testResult.success;
    }

    async testDirectAPIAccess() {
        console.log('📡 Testing direct API access...');
        
        const testResult = { 
            name: 'Direct API Access Test',
            started: new Date().toISOString(),
            steps: []
        };

        try {
            // Test API endpoints directly
            const apiResponse = await this.page.evaluate(async () => {
                try {
                    const response = await fetch('http://localhost:3000/api/posts');
                    return {
                        status: response.status,
                        ok: response.ok,
                        data: response.ok ? await response.json() : null,
                        error: null
                    };
                } catch (error) {
                    return {
                        status: 0,
                        ok: false,
                        data: null,
                        error: error.message
                    };
                }
            });

            testResult.steps.push({
                step: 'API posts endpoint test',
                success: apiResponse.ok,
                details: `Status: ${apiResponse.status}, Data items: ${apiResponse.data ? apiResponse.data.length : 0}`,
                data: apiResponse,
                timestamp: new Date().toISOString()
            });

            // Test with filter parameters
            if (apiResponse.ok) {
                const filterResponse = await this.page.evaluate(async () => {
                    try {
                        const response = await fetch('http://localhost:3000/api/posts?agent=ProductionValidator');
                        return {
                            status: response.status,
                            ok: response.ok,
                            data: response.ok ? await response.json() : null,
                            error: null
                        };
                    } catch (error) {
                        return {
                            status: 0,
                            ok: false,
                            data: null,
                            error: error.message
                        };
                    }
                });

                testResult.steps.push({
                    step: 'API filter test',
                    success: filterResponse.ok,
                    details: `Filtered results: ${filterResponse.data ? filterResponse.data.length : 0}`,
                    data: filterResponse,
                    timestamp: new Date().toISOString()
                });
            }

            testResult.completed = new Date().toISOString();
            testResult.success = apiResponse.ok;

        } catch (error) {
            testResult.error = error.message;
            testResult.success = false;
            testResult.completed = new Date().toISOString();
        }

        this.testResults.tests.push(testResult);
        return testResult.success;
    }

    async generateReport() {
        const resultsPath = '/workspaces/agent-feed/tests/headless-test-results.json';
        fs.writeFileSync(resultsPath, JSON.stringify(this.testResults, null, 2));

        const summaryPath = '/workspaces/agent-feed/tests/HEADLESS_FILTER_TEST_REPORT.md';
        const summary = this.createSummaryReport();
        fs.writeFileSync(summaryPath, summary);

        console.log(`📄 Results saved to: ${resultsPath}`);
        console.log(`📋 Report saved to: ${summaryPath}`);
    }

    createSummaryReport() {
        const totalTests = this.testResults.tests.length;
        const passedTests = this.testResults.tests.filter(t => t.success).length;
        
        return `# HEADLESS BROWSER FILTER TEST REPORT

**Executed:** ${this.testResults.timestamp}
**Target URL:** ${this.testResults.url}

## Test Summary
- **Total Tests:** ${totalTests}
- **Passed:** ${passedTests}
- **Failed:** ${totalTests - passedTests}
- **Success Rate:** ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%

## Network Activity
- **Total Network Calls:** ${this.testResults.networkCalls.length}
- **API Calls:** ${this.testResults.apiCalls.length}

## Console Messages
- **Total Messages:** ${this.testResults.consoleMessages.length}
- **Errors:** ${this.testResults.consoleMessages.filter(m => m.type === 'error').length}
- **Warnings:** ${this.testResults.consoleMessages.filter(m => m.type === 'warning').length}

## Test Results Details

${this.testResults.tests.map(test => `
### ${test.name}
**Status:** ${test.success ? '✅ PASSED' : '❌ FAILED'}
**Duration:** ${new Date(test.completed || test.started) - new Date(test.started)}ms
${test.error ? `**Error:** ${test.error}\n` : ''}

**Steps:**
${test.steps.map(step => 
  `- ${step.success ? '✅' : '❌'} ${step.step}${step.details ? ` - ${step.details}` : ''}`
).join('\n')}
`).join('\n')}

## API Call Analysis
${this.testResults.apiCalls.map(call => `
- **${call.type}** ${call.method || ''} ${call.url} ${call.status ? `(${call.status})` : ''}
`).join('')}

## Console Messages
${this.testResults.consoleMessages.filter(msg => msg.type === 'error').map(msg => `
- **ERROR (${msg.timestamp}):** ${msg.text}
`).join('')}

## Key Findings

### Filter Button Discovery
${this.testResults.tests.find(t => t.name === 'Filter Functionality Test')?.steps.find(s => s.data) ? 
  `Found filter buttons: ${JSON.stringify(this.testResults.tests.find(t => t.name === 'Filter Functionality Test').steps.find(s => s.data).data, null, 2)}` : 
  'No filter button data captured'}

### Page Structure Analysis
${this.testResults.tests.find(t => t.name === 'Page Structure Inspection')?.steps.find(s => s.data) ? 
  `Page contains: ${this.testResults.tests.find(t => t.name === 'Page Structure Inspection').steps.find(s => s.data).details}` : 
  'No page structure data captured'}

---
*Generated by Headless Filter Test Suite*
`;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async runAllTests() {
        try {
            await this.setup();
            
            console.log('🧪 Starting headless filter testing...');
            
            await this.navigateToApp();
            await this.inspectPageStructure();
            await this.testFilterFunctionality();
            await this.testDirectAPIAccess();
            
            await this.generateReport();
            
            const passedTests = this.testResults.tests.filter(t => t.success).length;
            const totalTests = this.testResults.tests.length;
            
            console.log(`✅ Testing completed! ${passedTests}/${totalTests} tests passed`);
            
            return { passed: passedTests, total: totalTests, success: passedTests === totalTests };
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            return { passed: 0, total: 1, success: false, error: error.message };
        } finally {
            await this.cleanup();
        }
    }
}

// Run if called directly
if (require.main === module) {
    const tester = new HeadlessFilterTest();
    tester.runAllTests().then(result => {
        console.log('🏁 Test execution complete!');
        process.exit(result.success ? 0 : 1);
    }).catch(error => {
        console.error('💥 Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = HeadlessFilterTest;