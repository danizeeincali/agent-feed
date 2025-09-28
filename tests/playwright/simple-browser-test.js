const puppeteer = require('puppeteer');
const fs = require('fs');

async function debugAgentsPage() {
    console.log('Starting browser debug session...');

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
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
    });

    page.on('pageerror', (error) => {
        errors.push({
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    });

    page.on('request', (request) => {
        networkRequests.push({
            url: request.url(),
            method: request.method(),
            timestamp: new Date().toISOString()
        });
    });

    page.on('response', (response) => {
        networkResponses.push({
            url: response.url(),
            status: response.status(),
            statusText: response.statusText(),
            timestamp: new Date().toISOString()
        });
    });

    try {
        console.log('Navigating to http://localhost:5173/agents...');
        await page.goto('http://localhost:5173/agents', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Take initial screenshot
        await page.screenshot({
            path: '/workspaces/agent-feed/tests/agents-page-initial.png',
            fullPage: true
        });

        // Wait a moment for any async operations
        await page.waitForTimeout(5000);

        // Take final screenshot
        await page.screenshot({
            path: '/workspaces/agent-feed/tests/agents-page-final.png',
            fullPage: true
        });

        // Check for API calls to /api/agents
        const agentsApiCalls = networkRequests.filter(req => req.url.includes('/api/agents'));
        const agentsApiResponses = networkResponses.filter(res => res.url.includes('/api/agents'));

        // Get page text content
        const pageText = await page.evaluate(() => document.body.innerText);

        // Create comprehensive report
        const report = {
            timestamp: new Date().toISOString(),
            pageUrl: page.url(),
            pageText: pageText,
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
                errorCount: errors.length,
                consoleLogCount: consoleLogs.length
            }
        };

        // Save report
        fs.writeFileSync('/workspaces/agent-feed/tests/agents-debug-report.json', JSON.stringify(report, null, 2));

        console.log('\n=== DEBUG SUMMARY ===');
        console.log('Page loaded successfully');
        console.log('Page text preview:', pageText.substring(0, 200));
        console.log('API calls to /api/agents:', agentsApiCalls.length);
        console.log('Console errors:', errors.length);
        console.log('Network requests:', networkRequests.length);

        if (agentsApiCalls.length > 0) {
            console.log('\n=== API CALLS ===');
            agentsApiCalls.forEach((call, index) => {
                console.log(`${index + 1}. ${call.method} ${call.url} at ${call.timestamp}`);
            });
        }

        if (agentsApiResponses.length > 0) {
            console.log('\n=== API RESPONSES ===');
            agentsApiResponses.forEach((response, index) => {
                console.log(`${index + 1}. Status ${response.status} for ${response.url}`);
            });
        }

        if (errors.length > 0) {
            console.log('\n=== ERRORS ===');
            errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.message}`);
            });
        }

        console.log('\n=== FILES CREATED ===');
        console.log('- agents-page-initial.png (screenshot)');
        console.log('- agents-page-final.png (screenshot)');
        console.log('- agents-debug-report.json (detailed report)');
        console.log('=====================');

        console.log('\nBrowser will stay open for 10 seconds for manual inspection...');
        await page.waitForTimeout(10000);

    } catch (error) {
        console.error('Error during debugging:', error);

        // Try to take error screenshot
        try {
            await page.screenshot({
                path: '/workspaces/agent-feed/tests/agents-page-error.png',
                fullPage: true
            });
            console.log('Error screenshot saved: agents-page-error.png');
        } catch (screenshotError) {
            console.error('Could not take error screenshot:', screenshotError);
        }
    } finally {
        await browser.close();
        console.log('Browser closed.');
    }
}

// Run the debug session
debugAgentsPage().catch(console.error);