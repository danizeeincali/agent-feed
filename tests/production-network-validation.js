const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * PRODUCTION NETWORK VALIDATION SCRIPT
 * 
 * Captures actual HTTP requests and responses during page loading
 * to verify API calls and network behavior in real browser environment.
 */

async function validateNetworkTraffic() {
    const validationResults = {
        timestamp: new Date().toISOString(),
        target_url: 'http://127.0.0.1:5173/agents/personal-todos-agent/pages/015b7296-a144-4096-9c60-ee5d7f900723',
        network_requests: [],
        console_logs: [],
        api_responses: {},
        validation_checklist: {
            backend_accessible: false,
            frontend_proxy_working: false,
            api_calls_made: false,
            data_received: false,
            no_network_errors: true,
            timing_acceptable: false
        },
        performance_metrics: {
            total_requests: 0,
            api_requests: 0,
            failed_requests: 0,
            page_load_time: 0,
            first_api_response_time: 0
        }
    };

    console.log('🔍 PRODUCTION NETWORK VALIDATION STARTING...');
    console.log('Target URL:', validationResults.target_url);

    let browser;
    try {
        // Launch browser with network monitoring enabled
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        
        // Set viewport and user agent
        await page.setViewport({ width: 1280, height: 720 });
        await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        const startTime = Date.now();

        // Capture console logs
        page.on('console', msg => {
            const logEntry = {
                timestamp: new Date().toISOString(),
                type: msg.type(),
                text: msg.text(),
                args: msg.args().map(arg => arg.toString())
            };
            validationResults.console_logs.push(logEntry);
            
            if (msg.text().includes('🔍') || msg.text().includes('API') || msg.text().includes('fetch')) {
                console.log('📄 BROWSER CONSOLE:', msg.text());
            }
        });

        // Capture network requests
        page.on('request', request => {
            const requestData = {
                timestamp: new Date().toISOString(),
                method: request.method(),
                url: request.url(),
                resourceType: request.resourceType(),
                headers: request.headers()
            };
            
            validationResults.network_requests.push(requestData);
            validationResults.performance_metrics.total_requests++;

            if (request.url().includes('/api/agents/')) {
                validationResults.performance_metrics.api_requests++;
                console.log('🌐 API REQUEST:', request.method(), request.url());
            }
        });

        // Capture network responses
        page.on('response', async response => {
            const responseData = {
                timestamp: new Date().toISOString(),
                status: response.status(),
                url: response.url(),
                headers: response.headers(),
                ok: response.ok()
            };

            if (response.url().includes('/api/agents/')) {
                console.log('📡 API RESPONSE:', response.status(), response.url());
                
                if (!validationResults.performance_metrics.first_api_response_time) {
                    validationResults.performance_metrics.first_api_response_time = Date.now() - startTime;
                }

                try {
                    const responseText = await response.text();
                    let responseBody = responseText;
                    
                    // Try to parse as JSON
                    try {
                        responseBody = JSON.parse(responseText);
                    } catch (e) {
                        // Keep as text if not valid JSON
                    }

                    validationResults.api_responses[response.url()] = {
                        status: response.status(),
                        headers: response.headers(),
                        body: responseBody,
                        timestamp: responseData.timestamp
                    };

                    console.log('📊 API DATA LENGTH:', responseText.length, 'characters');
                    
                    if (responseBody && typeof responseBody === 'object' && responseBody.success) {
                        validationResults.validation_checklist.data_received = true;
                        validationResults.validation_checklist.api_calls_made = true;
                        console.log('✅ API DATA SUCCESSFULLY RECEIVED');
                    }

                } catch (error) {
                    console.error('❌ ERROR READING API RESPONSE:', error.message);
                    validationResults.performance_metrics.failed_requests++;
                }
            }

            if (!response.ok()) {
                validationResults.performance_metrics.failed_requests++;
                validationResults.validation_checklist.no_network_errors = false;
                console.error('❌ NETWORK ERROR:', response.status(), response.url());
            }
        });

        // Capture network failures
        page.on('requestfailed', request => {
            console.error('❌ REQUEST FAILED:', request.url(), request.failure().errorText);
            validationResults.performance_metrics.failed_requests++;
            validationResults.validation_checklist.no_network_errors = false;
        });

        console.log('🚀 NAVIGATING TO PAGE...');
        
        // Navigate to the target page
        try {
            const response = await page.goto(validationResults.target_url, {
                waitUntil: 'networkidle0', // Wait until network is idle
                timeout: 30000 // 30 second timeout
            });

            validationResults.performance_metrics.page_load_time = Date.now() - startTime;

            if (response) {
                console.log('📄 PAGE LOADED:', response.status(), response.url());
                
                if (response.status() === 200) {
                    validationResults.validation_checklist.frontend_proxy_working = true;
                }
            }

        } catch (error) {
            console.error('❌ PAGE LOAD ERROR:', error.message);
        }

        // Wait a bit more to capture any delayed API calls
        console.log('⏳ WAITING FOR ADDITIONAL NETWORK ACTIVITY...');
        await page.waitForTimeout(3000);

        // Check if page is accessible and working
        try {
            const pageTitle = await page.title();
            const pageContent = await page.content();
            
            console.log('📄 PAGE TITLE:', pageTitle);
            console.log('📄 PAGE CONTENT LENGTH:', pageContent.length);
            
            // Look for React app mounting
            const hasReactApp = pageContent.includes('root') || pageContent.includes('App');
            if (hasReactApp) {
                console.log('✅ REACT APP DETECTED');
            }

        } catch (error) {
            console.error('❌ PAGE ACCESS ERROR:', error.message);
        }

        // Final validation checks
        validationResults.validation_checklist.timing_acceptable = 
            validationResults.performance_metrics.page_load_time < 10000; // Under 10 seconds

        // Check if backend is accessible (based on API responses)
        validationResults.validation_checklist.backend_accessible = 
            Object.keys(validationResults.api_responses).length > 0;

        console.log('📊 VALIDATION COMPLETE');
        console.log('Total Requests:', validationResults.performance_metrics.total_requests);
        console.log('API Requests:', validationResults.performance_metrics.api_requests);
        console.log('Failed Requests:', validationResults.performance_metrics.failed_requests);
        console.log('Page Load Time:', validationResults.performance_metrics.page_load_time + 'ms');

    } catch (error) {
        console.error('❌ BROWSER AUTOMATION ERROR:', error.message);
        validationResults.error = error.message;
        
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    // Save results to file
    const outputPath = path.join(__dirname, 'network-validation-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(validationResults, null, 2));
    console.log('📁 RESULTS SAVED TO:', outputPath);

    return validationResults;
}

// Run the validation
if (require.main === module) {
    validateNetworkTraffic()
        .then(results => {
            console.log('\n🎯 FINAL VALIDATION RESULTS:');
            console.log('Backend Accessible:', results.validation_checklist.backend_accessible ? '✅' : '❌');
            console.log('Frontend Proxy Working:', results.validation_checklist.frontend_proxy_working ? '✅' : '❌');
            console.log('API Calls Made:', results.validation_checklist.api_calls_made ? '✅' : '❌');
            console.log('Data Received:', results.validation_checklist.data_received ? '✅' : '❌');
            console.log('No Network Errors:', results.validation_checklist.no_network_errors ? '✅' : '❌');
            console.log('Timing Acceptable:', results.validation_checklist.timing_acceptable ? '✅' : '❌');
            
            const allPassed = Object.values(results.validation_checklist).every(check => check === true);
            console.log('\n🏆 OVERALL RESULT:', allPassed ? '✅ PASS' : '❌ FAIL');
            
            process.exit(allPassed ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ VALIDATION FAILED:', error);
            process.exit(1);
        });
}

module.exports = { validateNetworkTraffic };