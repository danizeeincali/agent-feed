const puppeteer = require('puppeteer');
const fs = require('fs');

async function debugAgentsPageHeadless() {
    console.log('Starting headless browser debug session...');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();

    // Set up monitoring
    const consoleLogs = [];
    const networkRequests = [];
    const networkResponses = [];
    const errors = [];

    page.on('console', (msg) => {
        consoleLogs.push({
            type: msg.type(),
            text: msg.text(),
            timestamp: new Date().toISOString()
        });
        console.log(`CONSOLE ${msg.type()}: ${msg.text()}`);
    });

    page.on('pageerror', (error) => {
        errors.push({
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        console.log(`PAGE ERROR: ${error.message}`);
    });

    page.on('request', (request) => {
        const req = {
            url: request.url(),
            method: request.method(),
            timestamp: new Date().toISOString()
        };
        networkRequests.push(req);
        if (req.url.includes('/api/')) {
            console.log(`API REQUEST: ${req.method} ${req.url}`);
        }
    });

    page.on('response', (response) => {
        const res = {
            url: response.url(),
            status: response.status(),
            statusText: response.statusText(),
            timestamp: new Date().toISOString()
        };
        networkResponses.push(res);
        if (res.url.includes('/api/')) {
            console.log(`API RESPONSE: ${res.status} ${res.url}`);
        }
    });

    page.on('requestfailed', (request) => {
        console.log(`REQUEST FAILED: ${request.url()} - ${request.failure().errorText}`);
    });

    try {
        console.log('Navigating to http://localhost:5173/agents...');

        const response = await page.goto('http://localhost:5173/agents', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        console.log(`Page response status: ${response.status()}`);

        // Take screenshot
        await page.screenshot({
            path: '/workspaces/agent-feed/tests/agents-page-screenshot.png',
            fullPage: true
        });

        // Wait for potential API calls
        console.log('Waiting 10 seconds for any delayed API calls...');
        await page.waitForTimeout(10000);

        // Get page content
        const pageText = await page.evaluate(() => document.body.innerText);
        const pageHTML = await page.content();

        // Check for specific elements
        const loadingText = await page.evaluate(() => {
            return document.body.innerText.includes('Loading agents');
        });

        const errorText = await page.evaluate(() => {
            return document.body.innerText.includes('failed to fetch') ||
                   document.body.innerText.includes('error') ||
                   document.body.innerText.includes('Error');
        });

        // Check for API calls to /api/agents
        const agentsApiCalls = networkRequests.filter(req => req.url.includes('/api/agents'));
        const agentsApiResponses = networkResponses.filter(res => res.url.includes('/api/agents'));

        console.log('\n=== PAGE ANALYSIS ===');
        console.log('Page loaded successfully:', response.status() === 200);
        console.log('Contains "Loading agents":', loadingText);
        console.log('Contains error text:', errorText);
        console.log('Page text length:', pageText.length);
        console.log('API calls to /api/agents:', agentsApiCalls.length);
        console.log('API responses from /api/agents:', agentsApiResponses.length);

        // Log page text (first 500 chars)
        console.log('\n=== PAGE TEXT PREVIEW ===');
        console.log(pageText.substring(0, 500));

        if (agentsApiCalls.length > 0) {
            console.log('\n=== API CALLS DETECTED ===');
            agentsApiCalls.forEach((call, index) => {
                console.log(`${index + 1}. ${call.method} ${call.url} at ${call.timestamp}`);
            });
        } else {
            console.log('\n❌ NO API CALLS TO /api/agents DETECTED');
        }

        if (agentsApiResponses.length > 0) {
            console.log('\n=== API RESPONSES ===');
            agentsApiResponses.forEach((response, index) => {
                console.log(`${index + 1}. Status ${response.status} for ${response.url} at ${response.timestamp}`);
            });
        } else {
            console.log('\n❌ NO API RESPONSES FROM /api/agents');
        }

        if (errors.length > 0) {
            console.log('\n=== JAVASCRIPT ERRORS ===');
            errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.message}`);
                if (error.stack) {
                    console.log(`   Stack: ${error.stack.substring(0, 200)}...`);
                }
            });
        } else {
            console.log('\n✅ NO JAVASCRIPT ERRORS DETECTED');
        }

        // Create comprehensive report
        const report = {
            timestamp: new Date().toISOString(),
            pageUrl: page.url(),
            pageStatus: response.status(),
            pageText: pageText,
            pageHTML: pageHTML,
            analysis: {
                hasLoadingText: loadingText,
                hasErrorText: errorText,
                pageTextLength: pageText.length
            },
            consoleLogs: consoleLogs,
            pageErrors: errors,
            networkRequests: networkRequests,
            networkResponses: networkResponses,
            agentsApiCalls: agentsApiCalls,
            agentsApiResponses: agentsApiResponses,
            summary: {
                totalRequests: networkRequests.length,
                totalResponses: networkResponses.length,
                agentsApiCallCount: agentsApiCalls.length,
                agentsApiResponseCount: agentsApiResponses.length,
                errorCount: errors.length,
                consoleLogCount: consoleLogs.length
            }
        };

        // Save comprehensive report
        fs.writeFileSync('/workspaces/agent-feed/tests/comprehensive-agents-debug.json', JSON.stringify(report, null, 2));

        console.log('\n=== FILES CREATED ===');
        console.log('- agents-page-screenshot.png');
        console.log('- comprehensive-agents-debug.json');
        console.log('========================');

    } catch (error) {
        console.error('\n❌ ERROR DURING DEBUGGING:', error.message);
        console.error('Stack:', error.stack);

        // Try to take error screenshot
        try {
            await page.screenshot({
                path: '/workspaces/agent-feed/tests/agents-error-screenshot.png',
                fullPage: true
            });
            console.log('Error screenshot saved: agents-error-screenshot.png');
        } catch (screenshotError) {
            console.error('Could not take error screenshot:', screenshotError.message);
        }
    } finally {
        await browser.close();
        console.log('\n✅ Browser session completed.');
    }
}

// Run the debug session
debugAgentsPageHeadless().catch(console.error);