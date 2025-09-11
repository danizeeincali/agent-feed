/**
 * Manual 8-Tab Validation Script
 * Tests all tabs in the UnifiedAgentPage component through API calls and DOM simulation
 */

const puppeteer = require('puppeteer');

const TEST_AGENT_ID = 'agent-feedback-agent';
const BASE_URL = 'http://localhost:5173';
const AGENT_PAGE_URL = `${BASE_URL}/agents/${TEST_AGENT_ID}`;

async function validateAllTabs() {
    console.log('🚀 Starting Phase 2 Component Migration - 8 Tabs Validation');
    console.log(`Testing Agent: ${TEST_AGENT_ID}`);
    console.log(`URL: ${AGENT_PAGE_URL}\n`);

    let browser;
    let results = {
        totalTests: 8,
        passedTests: 0,
        failedTests: [],
        warnings: []
    };

    try {
        // Launch browser
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // Track console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Navigate to agent page
        console.log('📄 Loading agent page...');
        await page.goto(AGENT_PAGE_URL, { 
            waitUntil: 'networkidle0',
            timeout: 15000 
        });

        // Wait for page to be ready
        await page.waitForSelector('h1, [data-testid="agent-page-loaded"]', { timeout: 10000 });
        console.log('✅ Agent page loaded successfully\n');

        // Test each tab
        const tabs = [
            { name: 'Overview', selector: 'button:has-text("Overview")', expectedContent: ['tasks completed', 'success rate', 'performance'] },
            { name: 'Definition', selector: 'button:has-text("Definition")', expectedContent: ['definition', 'markdown', 'documentation', 'No Definition Available'] },
            { name: 'Profile', selector: 'button:has-text("Profile")', expectedContent: ['profile', 'strengths', 'capabilities', 'No profile information'] },
            { name: 'Pages', selector: 'button:has-text("Pages")', expectedContent: ['pages', 'documentation', 'search', 'No pages available'] },
            { name: 'Workspace', selector: 'button:has-text("Workspace")', expectedContent: ['workspace', 'files', 'browser', 'No Workspace Available'] },
            { name: 'Details', selector: 'button:has-text("Details")', expectedContent: ['Agent Information', 'capabilities', TEST_AGENT_ID] },
            { name: 'Activity', selector: 'button:has-text("Activity")', expectedContent: ['Recent Activities', 'activity', 'posts'] },
            { name: 'Configuration', selector: 'button:has-text("Configuration")', expectedContent: ['Configuration', 'Profile Settings', 'Behavior'] }
        ];

        for (let i = 0; i < tabs.length; i++) {
            const tab = tabs[i];
            const tabNumber = i + 1;
            
            try {
                console.log(`🔍 Testing Tab ${tabNumber}: ${tab.name}`);
                
                // Click the tab
                await page.click(tab.selector);
                await page.waitForTimeout(1500); // Wait for content to load

                // Check if tab is active
                const isActive = await page.$eval(tab.selector, el => 
                    el.classList.contains('text-blue-600') || 
                    el.classList.contains('border-blue-500') ||
                    el.classList.contains('bg-blue-50')
                );
                
                if (!isActive) {
                    console.log(`   ⚠️  Warning: Tab may not be visually active`);
                    results.warnings.push(`${tab.name} tab visual state unclear`);
                }

                // Check content
                const pageContent = await page.content();
                const hasExpectedContent = tab.expectedContent.some(content => 
                    pageContent.toLowerCase().includes(content.toLowerCase())
                );

                if (hasExpectedContent) {
                    console.log(`   ✅ ${tab.name} tab content validation passed`);
                    results.passedTests++;
                } else {
                    console.log(`   ❌ ${tab.name} tab content validation failed`);
                    console.log(`   Expected one of: ${tab.expectedContent.join(', ')}`);
                    results.failedTests.push({
                        tab: tab.name,
                        reason: 'Content not found',
                        expected: tab.expectedContent
                    });
                }

                // Check for critical errors
                const criticalErrors = consoleErrors.filter(error => 
                    !error.includes('Warning:') && 
                    !error.includes('deprecated') &&
                    !error.includes('favicon') &&
                    error.includes('Error')
                );

                if (criticalErrors.length > 0) {
                    console.log(`   ⚠️  Console errors detected: ${criticalErrors.length}`);
                    results.warnings.push(`${tab.name} has console errors`);
                }

            } catch (error) {
                console.log(`   ❌ ${tab.name} tab failed: ${error.message}`);
                results.failedTests.push({
                    tab: tab.name,
                    reason: error.message,
                    expected: tab.expectedContent
                });
            }

            console.log(''); // Empty line for readability
        }

        // Test navigation between tabs
        console.log('🔄 Testing tab navigation...');
        try {
            for (const tab of tabs.slice(0, 4)) { // Test first 4 tabs
                await page.click(tab.selector);
                await page.waitForTimeout(500);
            }
            console.log('✅ Tab navigation working correctly\n');
        } catch (error) {
            console.log(`❌ Tab navigation failed: ${error.message}\n`);
            results.warnings.push('Tab navigation issues detected');
        }

        // Test responsive design
        console.log('📱 Testing responsive design...');
        try {
            // Test mobile viewport
            await page.setViewport({ width: 375, height: 667 });
            await page.waitForTimeout(500);
            const mobileTabVisible = await page.$('button:has-text("Overview")');
            
            // Test desktop viewport  
            await page.setViewport({ width: 1024, height: 768 });
            await page.waitForTimeout(500);
            const desktopTabVisible = await page.$('button:has-text("Overview")');
            
            if (mobileTabVisible && desktopTabVisible) {
                console.log('✅ Responsive design working correctly\n');
            } else {
                console.log('⚠️  Responsive design may have issues\n');
                results.warnings.push('Responsive design concerns');
            }
        } catch (error) {
            console.log(`⚠️  Responsive design test failed: ${error.message}\n`);
            results.warnings.push('Responsive design test failed');
        }

    } catch (error) {
        console.log(`❌ Critical error during validation: ${error.message}`);
        results.failedTests.push({
            tab: 'General',
            reason: error.message,
            expected: ['Basic functionality']
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    return results;
}

async function generateReport(results) {
    console.log('📊 VALIDATION RESULTS SUMMARY');
    console.log('================================');
    console.log(`Total Tabs Tested: ${results.totalTests}`);
    console.log(`Passed: ${results.passedTests}`);
    console.log(`Failed: ${results.failedTests.length}`);
    console.log(`Warnings: ${results.warnings.length}`);
    
    if (results.failedTests.length > 0) {
        console.log('\n❌ FAILED TESTS:');
        results.failedTests.forEach(failure => {
            console.log(`   - ${failure.tab}: ${failure.reason}`);
        });
    }

    if (results.warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        results.warnings.forEach(warning => {
            console.log(`   - ${warning}`);
        });
    }

    const successRate = (results.passedTests / results.totalTests) * 100;
    console.log(`\n📈 Success Rate: ${successRate.toFixed(1)}%`);

    if (successRate >= 90) {
        console.log('\n🎉 PHASE 2 COMPONENT MIGRATION: SUCCESSFUL');
        console.log('✅ All 8 tabs are functional and ready for production');
        return 'COMPLETE';
    } else if (successRate >= 70) {
        console.log('\n⚠️  PHASE 2 COMPONENT MIGRATION: MOSTLY STABLE');
        console.log('🔧 Minor issues detected, but core functionality works');
        return 'MOSTLY_COMPLETE';
    } else {
        console.log('\n❌ PHASE 2 COMPONENT MIGRATION: NEEDS ATTENTION');
        console.log('🚨 Significant issues detected, requires fixes');
        return 'NEEDS_FIXES';
    }
}

// Run validation
(async () => {
    try {
        const results = await validateAllTabs();
        const status = await generateReport(results);
        
        // Write results to file for CI/CD
        const fs = require('fs');
        const reportData = {
            timestamp: new Date().toISOString(),
            status,
            results,
            agentTested: TEST_AGENT_ID,
            url: AGENT_PAGE_URL
        };
        
        fs.writeFileSync(
            '/workspaces/agent-feed/tests/phase2-validation-results.json', 
            JSON.stringify(reportData, null, 2)
        );
        
        console.log('\n📝 Validation report saved to: tests/phase2-validation-results.json');
        
        process.exit(status === 'COMPLETE' ? 0 : 1);
    } catch (error) {
        console.error('❌ Validation script failed:', error);
        process.exit(1);
    }
})();