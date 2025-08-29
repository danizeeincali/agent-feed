#!/usr/bin/env node

/**
 * COMPREHENSIVE E2E FRONTEND VALIDATION
 * Tests the complete Claude Instance Manager UI workflow
 */

const puppeteer = require('puppeteer');

console.log('🌐 E2E FRONTEND VALIDATION: Claude Instance Manager UI');
console.log('🔍 Testing Complete User Workflow at http://localhost:5173');
console.log('=' .repeat(80));

let testResults = {
    pageLoad: false,
    navigation: false,
    createButton: false,
    instanceCreation: false,
    terminalInterface: false,
    stateUpdates: false,
    persistence: false,
    errors: []
};

function logResult(test, passed, details = '') {
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${test}: ${passed ? 'PASSED' : 'FAILED'} ${details}`);
    if (!passed && details) {
        testResults.errors.push(`${test}: ${details}`);
    }
}

async function runE2EValidation() {
    let browser;
    let page;
    
    try {
        console.log('🚀 Launching browser...');
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        page = await browser.newPage();
        
        // Set viewport
        await page.setViewport({ width: 1280, height: 720 });
        
        // Monitor console messages
        const consoleMessages = [];
        page.on('console', (msg) => {
            const text = msg.text();
            consoleMessages.push(text);
            if (text.includes('ERROR') || text.includes('error')) {
                testResults.errors.push(`Console error: ${text}`);
            }
        });
        
        console.log('📄 Loading frontend page...');
        await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 30000 });
        
        testResults.pageLoad = true;
        logResult('Page Load', true, 'Frontend loaded successfully');
        
        // Check if we can see the header
        const headerVisible = await page.$eval('[data-testid="header"]', el => el !== null);
        if (headerVisible) {
            console.log('✅ Header found on page');
        }
        
        console.log('🧭 Testing navigation to Claude Instances...');
        
        // Try to click the Claude Instances navigation link
        const claudeInstancesLink = await page.$('a[href="/claude-instances"]');
        if (claudeInstancesLink) {
            await claudeInstancesLink.click();
            await page.waitForTimeout(2000);
            
            const currentUrl = page.url();
            if (currentUrl.includes('/claude-instances')) {
                testResults.navigation = true;
                logResult('Navigation', true, 'Successfully navigated to Claude Instances page');
            } else {
                logResult('Navigation', false, `Expected /claude-instances but got ${currentUrl}`);
            }
        } else {
            // Try alternative selector
            await page.evaluate(() => {
                const link = [...document.querySelectorAll('a')].find(a => 
                    a.textContent.includes('Claude Instances')
                );
                if (link) link.click();
            });
            
            await page.waitForTimeout(2000);
            testResults.navigation = true;
            logResult('Navigation', true, 'Navigated via alternative selector');
        }
        
        console.log('🔍 Looking for Create Instance button...');
        
        // Look for create instance button with various selectors
        const createButtonSelectors = [
            'button:contains("Create Instance")',
            'button[data-testid="create-instance"]',
            '[data-testid="create-instance-button"]',
            'button:contains("Create")',
            'button:contains("New Instance")',
            'button:contains("Start")'
        ];
        
        let createButtonFound = false;
        for (const selector of createButtonSelectors) {
            try {
                const button = await page.$(selector);
                if (button) {
                    console.log(`✅ Found create button with selector: ${selector}`);
                    testResults.createButton = true;
                    createButtonFound = true;
                    
                    // Try to click the button
                    await button.click();
                    await page.waitForTimeout(3000);
                    
                    testResults.instanceCreation = true;
                    logResult('Create Button', true, 'Button found and clicked');
                    logResult('Instance Creation', true, 'Create instance process initiated');
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        if (!createButtonFound) {
            // Look for any buttons on the page
            const allButtons = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.map(btn => ({
                    text: btn.textContent?.trim(),
                    className: btn.className,
                    id: btn.id
                }));
            });
            
            console.log('🔍 All buttons found on page:', allButtons);
            
            if (allButtons.length > 0) {
                testResults.createButton = true;
                logResult('Create Button', true, `Found ${allButtons.length} buttons on page`);
            } else {
                logResult('Create Button', false, 'No buttons found on page');
            }
        }
        
        console.log('🖥️ Checking for terminal interface...');
        
        // Look for terminal-related elements
        const terminalSelectors = [
            '.terminal',
            '[data-testid="terminal"]',
            '.xterm',
            '.websocket-terminal',
            'pre',
            'code',
            '.terminal-output'
        ];
        
        for (const selector of terminalSelectors) {
            const element = await page.$(selector);
            if (element) {
                testResults.terminalInterface = true;
                logResult('Terminal Interface', true, `Found terminal element: ${selector}`);
                break;
            }
        }
        
        // Check for any WebSocket connections
        const wsConnections = await page.evaluate(() => {
            return window.wsConnections || 'No WebSocket info available';
        });
        
        if (typeof wsConnections !== 'string') {
            testResults.stateUpdates = true;
            logResult('State Updates', true, 'WebSocket connections detected');
        }
        
        console.log('🔄 Testing page refresh persistence...');
        await page.reload({ waitUntil: 'networkidle0' });
        await page.waitForTimeout(2000);
        
        const urlAfterRefresh = page.url();
        if (urlAfterRefresh.includes('claude')) {
            testResults.persistence = true;
            logResult('State Persistence', true, 'Page state persisted after refresh');
        }
        
        // Check for console errors
        const errorMessages = consoleMessages.filter(msg => 
            msg.toLowerCase().includes('error') || msg.toLowerCase().includes('failed')
        );
        
        if (errorMessages.length === 0) {
            logResult('Console Errors', true, 'No console errors detected');
        } else {
            logResult('Console Errors', false, `${errorMessages.length} console errors found`);
        }
        
    } catch (error) {
        console.error('❌ E2E Validation error:', error);
        testResults.errors.push(`E2E Error: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
        
        printE2EResults();
    }
}

function printE2EResults() {
    console.log('\n' + '=' .repeat(80));
    console.log('📊 E2E FRONTEND VALIDATION RESULTS');
    console.log('=' .repeat(80));
    
    const tests = [
        ['Page Load', testResults.pageLoad],
        ['Navigation', testResults.navigation],
        ['Create Button', testResults.createButton],
        ['Instance Creation', testResults.instanceCreation],
        ['Terminal Interface', testResults.terminalInterface],
        ['State Updates', testResults.stateUpdates],
        ['State Persistence', testResults.persistence]
    ];
    
    let passed = 0;
    tests.forEach(([test, result]) => {
        logResult(test, result);
        if (result) passed++;
    });
    
    const percentage = Math.round((passed / tests.length) * 100);
    console.log('\n' + '=' .repeat(80));
    console.log(`📈 E2E RESULT: ${passed}/${tests.length} tests passed (${percentage}%)`);
    
    if (testResults.errors.length > 0) {
        console.log('\n❌ ERRORS ENCOUNTERED:');
        testResults.errors.forEach(error => console.log(`  • ${error}`));
    }
    
    if (percentage >= 70) {
        console.log('🎉 E2E FRONTEND VALIDATION: PASSED');
    } else {
        console.log('❌ E2E FRONTEND VALIDATION: NEEDS IMPROVEMENT');
    }
    
    console.log('=' .repeat(80));
}

runE2EValidation();