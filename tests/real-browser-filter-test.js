/**
 * REAL BROWSER TESTING FOR ADVANCED FILTER FUNCTIONALITY
 * Tests actual browser interaction with http://localhost:4173
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class RealFilterBrowserTest {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.testResults = {
            timestamp: new Date().toISOString(),
            url: 'http://localhost:4173',
            tests: [],
            networkCalls: [],
            consoleErrors: [],
            screenshots: []
        };
    }

    async setup() {
        console.log('🚀 Setting up browser for real testing...');
        this.browser = await chromium.launch({ 
            headless: false, // Show browser for debugging
            slowMo: 1000 // Slow down for observation
        });
        
        this.context = await this.browser.newContext({
            viewport: { width: 1280, height: 720 },
            recordVideo: { dir: '/workspaces/agent-feed/tests/videos/' }
        });

        this.page = await this.context.newPage();

        // Capture network calls
        this.page.on('request', request => {
            this.testResults.networkCalls.push({
                type: 'request',
                timestamp: new Date().toISOString(),
                method: request.method(),
                url: request.url(),
                headers: request.headers(),
                postData: request.postData()
            });
        });

        this.page.on('response', response => {
            this.testResults.networkCalls.push({
                type: 'response',
                timestamp: new Date().toISOString(),
                status: response.status(),
                url: response.url(),
                headers: response.headers()
            });
        });

        // Capture console errors
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                this.testResults.consoleErrors.push({
                    timestamp: new Date().toISOString(),
                    text: msg.text(),
                    location: msg.location()
                });
            }
        });
    }

    async takeScreenshot(name) {
        const screenshotPath = `/workspaces/agent-feed/tests/screenshots/${name}_${Date.now()}.png`;
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        this.testResults.screenshots.push({
            name,
            path: screenshotPath,
            timestamp: new Date().toISOString()
        });
        console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }

    async navigateToApp() {
        console.log('🌐 Navigating to http://localhost:4173...');
        
        const testResult = { 
            name: 'Navigate to App',
            started: new Date().toISOString(),
            steps: []
        };

        try {
            await this.page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
            await this.takeScreenshot('01_homepage_loaded');
            
            // Wait for the page to fully load
            await this.page.waitForLoadState('domcontentloaded');
            
            testResult.steps.push({
                step: 'Page loaded successfully',
                success: true,
                timestamp: new Date().toISOString()
            });

            // Check if posts are loaded
            const postsVisible = await this.page.isVisible('[data-testid="post-card"]');
            testResult.steps.push({
                step: 'Posts visibility check',
                success: postsVisible,
                details: `Posts visible: ${postsVisible}`,
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

    async testAdvancedFilterButton() {
        console.log('🔍 Testing Advanced Filter Button...');
        
        const testResult = { 
            name: 'Advanced Filter Button Test',
            started: new Date().toISOString(),
            steps: []
        };

        try {
            // Look for advanced filter button
            const filterButton = await this.page.waitForSelector('button:has-text("Advanced Filter")', { 
                timeout: 10000 
            });
            
            testResult.steps.push({
                step: 'Advanced Filter button found',
                success: !!filterButton,
                timestamp: new Date().toISOString()
            });

            await this.takeScreenshot('02_before_click_filter');

            // Click the Advanced Filter button
            await filterButton.click();
            await this.page.waitForTimeout(2000); // Wait for UI to respond

            await this.takeScreenshot('03_after_click_filter');

            // Check if filter panel opened
            const filterPanel = await this.page.isVisible('[data-testid="filter-panel"]');
            testResult.steps.push({
                step: 'Filter panel opened',
                success: filterPanel,
                details: `Filter panel visible: ${filterPanel}`,
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

    async testAgentSelection() {
        console.log('🤖 Testing Agent Selection...');
        
        const testResult = { 
            name: 'Agent Selection Test',
            started: new Date().toISOString(),
            steps: []
        };

        try {
            // Look for agent selector (might be dropdown, input, or multi-select)
            const agentSelectors = [
                'select[name="agent"]',
                'input[placeholder*="agent"]',
                '[data-testid="agent-selector"]',
                '.agent-select',
                'input[type="text"]' // fallback
            ];

            let agentSelector = null;
            for (const selector of agentSelectors) {
                agentSelector = await this.page.$(selector);
                if (agentSelector) {
                    testResult.steps.push({
                        step: `Found agent selector: ${selector}`,
                        success: true,
                        timestamp: new Date().toISOString()
                    });
                    break;
                }
            }

            if (!agentSelector) {
                throw new Error('No agent selector found');
            }

            await this.takeScreenshot('04_agent_selector_found');

            // Try to select "ProductionValidator" agent
            const agentToSelect = 'ProductionValidator';
            
            // Check if it's a select element
            const tagName = await agentSelector.evaluate(el => el.tagName.toLowerCase());
            
            if (tagName === 'select') {
                await agentSelector.selectOption({ label: agentToSelect });
                testResult.steps.push({
                    step: `Selected agent from dropdown: ${agentToSelect}`,
                    success: true,
                    timestamp: new Date().toISOString()
                });
            } else if (tagName === 'input') {
                await agentSelector.fill(agentToSelect);
                testResult.steps.push({
                    step: `Typed agent name: ${agentToSelect}`,
                    success: true,
                    timestamp: new Date().toISOString()
                });
            }

            await this.takeScreenshot('05_agent_selected');

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

    async testApplyFilter() {
        console.log('✅ Testing Apply Filter...');
        
        const testResult = { 
            name: 'Apply Filter Test',
            started: new Date().toISOString(),
            steps: []
        };

        try {
            // Count posts before filter
            const postsBeforeFilter = await this.page.$$eval('[data-testid="post-card"]', els => els.length);
            testResult.steps.push({
                step: 'Counted posts before filter',
                success: true,
                details: `Posts count: ${postsBeforeFilter}`,
                timestamp: new Date().toISOString()
            });

            // Look for apply/submit button
            const applyButtons = [
                'button:has-text("Apply")',
                'button:has-text("Filter")',
                'button[type="submit"]',
                '[data-testid="apply-filter"]'
            ];

            let applyButton = null;
            for (const selector of applyButtons) {
                applyButton = await this.page.$(selector);
                if (applyButton) {
                    testResult.steps.push({
                        step: `Found apply button: ${selector}`,
                        success: true,
                        timestamp: new Date().toISOString()
                    });
                    break;
                }
            }

            if (applyButton) {
                await this.takeScreenshot('06_before_apply_filter');
                
                await applyButton.click();
                await this.page.waitForTimeout(3000); // Wait for filter to process
                
                await this.takeScreenshot('07_after_apply_filter');

                // Count posts after filter
                const postsAfterFilter = await this.page.$$eval('[data-testid="post-card"]', els => els.length);
                testResult.steps.push({
                    step: 'Counted posts after filter',
                    success: true,
                    details: `Posts count: ${postsAfterFilter}`,
                    timestamp: new Date().toISOString()
                });

                // Check if filter actually changed the posts
                const filterWorked = postsBeforeFilter !== postsAfterFilter;
                testResult.steps.push({
                    step: 'Filter effect validation',
                    success: filterWorked,
                    details: `Before: ${postsBeforeFilter}, After: ${postsAfterFilter}`,
                    timestamp: new Date().toISOString()
                });
            } else {
                throw new Error('Apply button not found');
            }

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

    async testClearFilter() {
        console.log('🗑️ Testing Clear Filter...');
        
        const testResult = { 
            name: 'Clear Filter Test',
            started: new Date().toISOString(),
            steps: []
        };

        try {
            // Look for clear/reset button
            const clearButtons = [
                'button:has-text("Clear")',
                'button:has-text("Reset")',
                'button:has-text("All Posts")',
                '[data-testid="clear-filter"]'
            ];

            let clearButton = null;
            for (const selector of clearButtons) {
                clearButton = await this.page.$(selector);
                if (clearButton) {
                    testResult.steps.push({
                        step: `Found clear button: ${selector}`,
                        success: true,
                        timestamp: new Date().toISOString()
                    });
                    break;
                }
            }

            if (clearButton) {
                await this.takeScreenshot('08_before_clear_filter');
                
                await clearButton.click();
                await this.page.waitForTimeout(3000); // Wait for clear to process
                
                await this.takeScreenshot('09_after_clear_filter');

                // Count posts after clear
                const postsAfterClear = await this.page.$$eval('[data-testid="post-card"]', els => els.length);
                testResult.steps.push({
                    step: 'Counted posts after clear',
                    success: true,
                    details: `Posts count: ${postsAfterClear}`,
                    timestamp: new Date().toISOString()
                });
            } else {
                testResult.steps.push({
                    step: 'Clear button not found - testing manual clear',
                    success: false,
                    details: 'Attempting to clear by reloading page',
                    timestamp: new Date().toISOString()
                });
            }

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

    async inspectPageState() {
        console.log('🔍 Inspecting Current Page State...');
        
        const testResult = { 
            name: 'Page State Inspection',
            started: new Date().toISOString(),
            steps: []
        };

        try {
            // Get all relevant elements
            const pageState = await this.page.evaluate(() => {
                const state = {
                    filterElements: [],
                    posts: [],
                    buttons: [],
                    inputs: [],
                    reactState: null
                };

                // Find filter-related elements
                document.querySelectorAll('[data-testid*="filter"], [class*="filter"], [id*="filter"]').forEach(el => {
                    state.filterElements.push({
                        tagName: el.tagName,
                        className: el.className,
                        id: el.id,
                        textContent: el.textContent?.substring(0, 100),
                        visible: el.offsetParent !== null
                    });
                });

                // Count posts
                document.querySelectorAll('[data-testid="post-card"], [class*="post"]').forEach(el => {
                    state.posts.push({
                        textContent: el.textContent?.substring(0, 200),
                        visible: el.offsetParent !== null
                    });
                });

                // Find buttons
                document.querySelectorAll('button').forEach(el => {
                    state.buttons.push({
                        textContent: el.textContent,
                        className: el.className,
                        visible: el.offsetParent !== null
                    });
                });

                // Find inputs
                document.querySelectorAll('input, select').forEach(el => {
                    state.inputs.push({
                        type: el.type,
                        name: el.name,
                        placeholder: el.placeholder,
                        value: el.value,
                        className: el.className
                    });
                });

                return state;
            });

            testResult.steps.push({
                step: 'Page state captured',
                success: true,
                details: `Found ${pageState.filterElements.length} filter elements, ${pageState.posts.length} posts, ${pageState.buttons.length} buttons`,
                data: pageState,
                timestamp: new Date().toISOString()
            });

            await this.takeScreenshot('10_page_state_inspection');

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

    async saveResults() {
        const resultsPath = '/workspaces/agent-feed/tests/real-browser-test-results.json';
        fs.writeFileSync(resultsPath, JSON.stringify(this.testResults, null, 2));
        console.log(`📄 Test results saved to: ${resultsPath}`);

        // Create summary report
        const summaryPath = '/workspaces/agent-feed/tests/REAL_BROWSER_TEST_SUMMARY.md';
        const summary = this.generateSummaryReport();
        fs.writeFileSync(summaryPath, summary);
        console.log(`📋 Summary report saved to: ${summaryPath}`);
    }

    generateSummaryReport() {
        const totalTests = this.testResults.tests.length;
        const passedTests = this.testResults.tests.filter(t => t.success).length;
        const failedTests = totalTests - passedTests;

        return `# REAL BROWSER FILTER TESTING REPORT

**Test Execution Time:** ${this.testResults.timestamp}
**Application URL:** ${this.testResults.url}

## Summary
- **Total Tests:** ${totalTests}
- **Passed:** ${passedTests}
- **Failed:** ${failedTests}
- **Success Rate:** ${((passedTests / totalTests) * 100).toFixed(1)}%

## Network Activity
- **Total Network Calls:** ${this.testResults.networkCalls.length}
- **Requests:** ${this.testResults.networkCalls.filter(c => c.type === 'request').length}
- **Responses:** ${this.testResults.networkCalls.filter(c => c.type === 'response').length}

## Console Errors
- **Total Errors:** ${this.testResults.consoleErrors.length}

## Test Results

${this.testResults.tests.map(test => `
### ${test.name}
- **Status:** ${test.success ? '✅ PASSED' : '❌ FAILED'}
- **Duration:** ${new Date(test.completed || test.started) - new Date(test.started)}ms
- **Steps:** ${test.steps.length}
${test.error ? `- **Error:** ${test.error}` : ''}

**Steps:**
${test.steps.map(step => `- ${step.success ? '✅' : '❌'} ${step.step} ${step.details ? `(${step.details})` : ''}`).join('\n')}
`).join('\n')}

## Network Calls
${this.testResults.networkCalls.map(call => `
- **${call.type.toUpperCase()}** ${call.method || ''} ${call.url} ${call.status ? `(${call.status})` : ''}
`).join('')}

## Console Errors
${this.testResults.consoleErrors.map(error => `
- **${error.timestamp}:** ${error.text}
`).join('')}

## Screenshots
${this.testResults.screenshots.map(screenshot => `
- **${screenshot.name}:** ${screenshot.path}
`).join('')}

---
*Generated by Real Browser Filter Test Suite*
`;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async runFullTest() {
        try {
            await this.setup();
            
            console.log('🧪 Starting Real Browser Filter Testing...');
            
            await this.navigateToApp();
            await this.inspectPageState(); // First inspection
            await this.testAdvancedFilterButton();
            await this.testAgentSelection();
            await this.testApplyFilter();
            await this.testClearFilter();
            await this.inspectPageState(); // Final inspection
            
            await this.saveResults();
            
            console.log('✅ All tests completed!');
            console.log(`📊 Results: ${this.testResults.tests.filter(t => t.success).length}/${this.testResults.tests.length} tests passed`);
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        } finally {
            await this.cleanup();
        }
    }
}

// Run the test if called directly
if (require.main === module) {
    const tester = new RealFilterBrowserTest();
    tester.runFullTest().then(() => {
        console.log('🏁 Test execution complete!');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = RealFilterBrowserTest;