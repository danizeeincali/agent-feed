/**
 * Manual Instance ID Flow Validation
 * This script performs a direct test of the complete button-to-terminal flow
 * to identify where the undefined instance ID bug occurs.
 */

const puppeteer = require('puppeteer');

async function validateInstanceIdFlow() {
    console.log('🚀 Starting Instance ID Flow Validation');
    
    let browser;
    try {
        // Launch browser
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-dev-shm-usage'],
            defaultViewport: { width: 1280, height: 720 }
        });

        const page = await browser.newPage();
        
        // Capture console messages
        const consoleMessages = [];
        const networkRequests = [];
        
        page.on('console', msg => {
            const message = `[${msg.type()}] ${msg.text()}`;
            consoleMessages.push(message);
            
            // Log important messages immediately
            if (message.includes('undefined') || 
                message.includes('instance') || 
                message.includes('SSE') ||
                message.includes('terminal')) {
                console.log(`BROWSER: ${message}`);
            }
        });
        
        page.on('request', request => {
            if (request.url().includes('localhost:3000')) {
                const req = `${request.method()} ${request.url()}`;
                networkRequests.push(req);
                console.log(`API REQ: ${req}`);
            }
        });
        
        page.on('response', response => {
            if (response.url().includes('localhost:3000')) {
                console.log(`API RES: ${response.status()} ${response.url()}`);
            }
        });

        // Navigate to frontend
        console.log('📍 Step 1: Loading frontend...');
        await page.goto('http://localhost:5173', { 
            waitUntil: 'networkidle0', 
            timeout: 30000 
        });

        // Wait for the app to load
        await page.waitForSelector('.claude-instance-manager', { timeout: 10000 });
        console.log('✅ Frontend loaded successfully');

        // Step 2: Click the first button to create an instance
        console.log('📍 Step 2: Creating instance...');
        const button = await page.waitForSelector('[title="Launch Claude in prod directory"]', { timeout: 5000 });
        await button.click();
        console.log('✅ Button clicked');

        // Wait for instance to appear in list
        await page.waitForFunction(() => {
            const instances = document.querySelectorAll('.instance-item');
            return instances.length > 0;
        }, { timeout: 15000 });

        // Get the instance ID from the DOM
        const instanceElement = await page.$('.instance-item');
        const instanceIdElement = await instanceElement.$('.instance-id');
        const instanceIdText = await page.evaluate(el => el.textContent, instanceIdElement);
        const instanceId = instanceIdText.replace('ID: ', '');
        
        console.log(`✅ Instance created with ID: ${instanceId}`);
        
        // Validate instance ID format
        if (!instanceId.match(/^claude-\d+$/)) {
            console.error(`❌ Invalid instance ID format: ${instanceId}`);
            return false;
        }
        
        if (instanceId === 'undefined' || instanceId === 'null') {
            console.error(`❌ Instance ID is ${instanceId}`);
            return false;
        }

        // Step 3: Select the instance to trigger terminal connection
        console.log('📍 Step 3: Selecting instance and connecting terminal...');
        await instanceElement.click();
        console.log('✅ Instance selected');

        // Wait for terminal interface to appear
        await page.waitForSelector('.input-area', { timeout: 10000 });
        await page.waitForSelector('.instance-output', { timeout: 5000 });
        console.log('✅ Terminal interface loaded');

        // Wait a moment for connection to establish
        await page.waitForTimeout(3000);

        // Check connection status
        const statusElement = await page.$('.connection-status');
        const statusText = await page.evaluate(el => el.textContent, statusElement);
        console.log(`Connection status: ${statusText}`);

        // Validate connection status doesn't contain 'undefined'
        if (statusText.includes('undefined')) {
            console.error(`❌ Connection status contains 'undefined': ${statusText}`);
        }

        // Step 4: Send a test command
        console.log('📍 Step 4: Testing terminal command...');
        const inputField = await page.$('.input-field');
        const testCommand = `echo "Testing instance: ${instanceId}"`;
        await inputField.type(testCommand);
        
        const sendButton = await page.$('.btn-send');
        await sendButton.click();
        console.log(`✅ Sent command: ${testCommand}`);

        // Wait for response
        await page.waitForTimeout(3000);

        // Check for undefined instance bugs in all captured messages
        console.log('📍 Step 5: Analyzing console messages for undefined bugs...');
        
        const undefinedBugs = consoleMessages.filter(msg => {
            const hasUndefined = msg.includes('undefined');
            const hasInstance = msg.includes('instance') || 
                              msg.includes('terminal') || 
                              msg.includes('SSE') || 
                              msg.includes('connection');
            return hasUndefined && hasInstance;
        });

        // Report findings
        console.log('\n📊 VALIDATION RESULTS:');
        console.log(`✅ Instance ID created: ${instanceId}`);
        console.log(`✅ Instance ID format valid: ${instanceId.match(/^claude-\d+$/) ? 'YES' : 'NO'}`);
        console.log(`📊 Total console messages: ${consoleMessages.length}`);
        console.log(`🔍 Undefined instance bugs found: ${undefinedBugs.length}`);

        if (undefinedBugs.length > 0) {
            console.log('\n❌ UNDEFINED INSTANCE ID BUGS DETECTED:');
            undefinedBugs.forEach((bug, index) => {
                console.log(`  ${index + 1}. ${bug}`);
            });
            
            return false; // Validation failed
        } else {
            console.log('\n✅ NO UNDEFINED INSTANCE ID BUGS FOUND');
            return true; // Validation passed
        }

    } catch (error) {
        console.error('❌ Validation error:', error.message);
        return false;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Also test the backend SSE endpoint directly
async function testBackendSSEEndpoint(instanceId) {
    console.log(`\n🧪 Testing backend SSE endpoint for instance: ${instanceId}`);
    
    try {
        const response = await fetch(`http://localhost:3000/api/claude/instances/${instanceId}/terminal/stream`);
        
        if (response.ok) {
            console.log('✅ SSE endpoint responded successfully');
            
            // Check if the endpoint returns the correct content type
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/event-stream')) {
                console.log('✅ Correct SSE content type');
                return true;
            } else {
                console.log(`❌ Wrong content type: ${contentType}`);
                return false;
            }
        } else {
            console.log(`❌ SSE endpoint failed: ${response.status} ${response.statusText}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ SSE endpoint error: ${error.message}`);
        return false;
    }
}

// Run the validation
async function main() {
    console.log('🎯 Instance ID Flow Validation Test Suite\n');
    
    // Test 1: Complete frontend flow
    const frontendValid = await validateInstanceIdFlow();
    
    // Test 2: Backend API validation
    console.log('\n🧪 Testing backend instance creation...');
    try {
        const response = await fetch('http://localhost:3000/api/claude/instances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                command: ['claude'],
                workingDirectory: '/workspaces/agent-feed/prod'
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.instance && data.instance.id) {
            console.log(`✅ Backend created instance: ${data.instance.id}`);
            
            // Test SSE endpoint with this instance ID
            const sseValid = await testBackendSSEEndpoint(data.instance.id);
            
            // Clean up the test instance
            await fetch(`http://localhost:3000/api/claude/instances/${data.instance.id}`, {
                method: 'DELETE'
            });
            console.log(`🧹 Cleaned up test instance: ${data.instance.id}`);
            
        } else {
            console.log('❌ Backend instance creation failed');
        }
        
    } catch (error) {
        console.log('❌ Backend test error:', error.message);
    }

    // Final report
    console.log('\n🏁 FINAL VALIDATION REPORT:');
    console.log(`Frontend Flow: ${frontendValid ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('\nIf this test shows FAILED, the undefined instance ID bug is confirmed.');
    console.log('Expected backend log should show: "SSE Claude terminal stream requested for instance: claude-XXXX"');
    console.log('NOT: "SSE Claude terminal stream requested for instance: undefined"\n');
    
    process.exit(frontendValid ? 0 : 1);
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { validateInstanceIdFlow, testBackendSSEEndpoint };