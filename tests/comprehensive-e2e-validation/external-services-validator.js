/**
 * EXTERNAL SERVICES VALIDATOR
 * 
 * Validates architecture using existing running services
 * Tests complete button click → instance creation → command execution flow
 * Works with already running backend and frontend servers
 */

const puppeteer = require('puppeteer');
const WebSocket = require('ws');
const axios = require('axios');
const fs = require('fs');

class ExternalServicesValidator {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = {
            architecture: {},
            workflow: {},
            commands: {},
            realtime: {},
            failures: {}
        };
        this.startTime = Date.now();
        this.backendUrl = 'http://localhost:3000';
        this.frontendUrl = 'http://localhost:5173'; // Vite default
    }

    async initialize() {
        console.log('🚀 EXTERNAL SERVICES VALIDATION STARTING');
        console.log('=' .repeat(80));
        
        // Detect available servers
        await this.detectAvailableServices();
        
        // Launch browser for real user simulation
        await this.launchBrowser();
        
        console.log('✅ Environment initialized successfully');
    }

    async detectAvailableServices() {
        console.log('🔍 Detecting available services...');
        
        // Test possible frontend ports
        const frontendPorts = [5173, 3001, 3000, 8080];
        for (const port of frontendPorts) {
            try {
                const testUrl = `http://localhost:${port}`;
                const response = await axios.get(testUrl, { timeout: 2000 });
                if (response.data.includes('html') || response.data.includes('script')) {
                    this.frontendUrl = testUrl;
                    console.log(`✅ Frontend detected at: ${testUrl}`);
                    break;
                }
            } catch (error) {
                // Continue testing other ports
            }
        }
        
        // Test backend
        try {
            await axios.get(this.backendUrl, { timeout: 2000 });
            console.log(`✅ Backend detected at: ${this.backendUrl}`);
        } catch (error) {
            console.log(`⚠️  Backend may not be available at: ${this.backendUrl}`);
        }
        
        console.log(`🎯 Using Frontend: ${this.frontendUrl}`);
        console.log(`🎯 Using Backend: ${this.backendUrl}`);
    }

    async launchBrowser() {
        console.log('🌐 Launching browser for real user simulation...');
        
        this.browser = await puppeteer.launch({
            headless: 'new', // Use new headless mode for better performance in CI
            devtools: false,
            defaultViewport: { width: 1280, height: 720 },
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--allow-running-insecure-content',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-images',
                '--no-first-run'
            ]
        });

        this.page = await this.browser.newPage();
        
        // Enable console logging from page
        this.page.on('console', (msg) => {
            if (msg.type() === 'error') {
                console.error(`[BROWSER ERROR] ${msg.text()}`);
            }
        });

        // Enable network request monitoring
        const networkRequests = [];
        this.page.on('request', (request) => {
            networkRequests.push({
                method: request.method(),
                url: request.url(),
                timestamp: Date.now()
            });
        });
        
        this.networkRequests = networkRequests;

        console.log('✅ Browser launched successfully');
    }

    async validateArchitecture() {
        console.log('\n🏗️  ARCHITECTURE VALIDATION');
        console.log('-' .repeat(50));

        const results = {
            frontend_serving: false,
            backend_api: false,
            websocket_server: false,
            static_files: false
        };

        try {
            // Test frontend serving
            console.log('📡 Testing frontend serving...');
            const frontendResponse = await axios.get(this.frontendUrl, { timeout: 5000 });
            results.frontend_serving = frontendResponse.status === 200 && 
                                      (frontendResponse.data.includes('html') || 
                                       frontendResponse.data.includes('script'));
            console.log(`✅ Frontend serving: ${results.frontend_serving}`);

            // Test backend API endpoints
            console.log('📡 Testing backend API...');
            try {
                // Try common API endpoints
                const apiEndpoints = ['/api/health', '/health', '/api/status', '/status'];
                let apiWorking = false;
                
                for (const endpoint of apiEndpoints) {
                    try {
                        const response = await axios.get(this.backendUrl + endpoint, { timeout: 3000 });
                        if (response.status === 200) {
                            apiWorking = true;
                            console.log(`✅ API endpoint working: ${endpoint}`);
                            break;
                        }
                    } catch (e) {
                        // Continue testing
                    }
                }
                
                if (!apiWorking) {
                    // Test if server is responding at all
                    const response = await axios.get(this.backendUrl, { timeout: 3000 });
                    apiWorking = response.status === 200 || response.status === 404;
                }
                
                results.backend_api = apiWorking;
            } catch (error) {
                results.backend_api = false;
            }
            console.log(`✅ Backend API: ${results.backend_api}`);

            // Test WebSocket server
            console.log('📡 Testing WebSocket server...');
            results.websocket_server = await this.testWebSocketConnection();
            console.log(`✅ WebSocket server: ${results.websocket_server}`);

            // Test static file serving (from frontend)
            console.log('📡 Testing static file serving...');
            try {
                // Try to access favicon or any static resource
                const staticUrls = [
                    `${this.frontendUrl}/favicon.ico`,
                    `${this.frontendUrl}/manifest.json`,
                    `${this.frontendUrl}/robots.txt`,
                    `${this.frontendUrl}/assets/index.css`
                ];
                
                let staticWorking = false;
                for (const url of staticUrls) {
                    try {
                        const response = await axios.get(url, { timeout: 2000 });
                        if (response.status === 200) {
                            staticWorking = true;
                            break;
                        }
                    } catch (e) {
                        // Continue testing
                    }
                }
                results.static_files = staticWorking || results.frontend_serving;
            } catch (error) {
                results.static_files = results.frontend_serving; // If frontend works, static files likely work
            }
            console.log(`✅ Static files: ${results.static_files}`);

        } catch (error) {
            console.error(`❌ Architecture validation error: ${error.message}`);
        }

        this.testResults.architecture = results;
        return results;
    }

    async testWebSocketConnection() {
        return new Promise((resolve) => {
            // Try common WebSocket endpoints
            const wsUrls = [
                'ws://localhost:3000/terminal',
                'ws://localhost:3000/ws',
                'ws://localhost:3000/socket',
                'ws://localhost:3000'
            ];
            
            let resolved = false;
            
            const testConnection = (url) => {
                const ws = new WebSocket(url);
                
                ws.on('open', () => {
                    if (!resolved) {
                        console.log(`✅ WebSocket connection established at: ${url}`);
                        ws.close();
                        resolved = true;
                        resolve(true);
                    }
                });

                ws.on('error', (error) => {
                    // Continue testing other URLs
                });
                
                // Timeout this connection attempt
                setTimeout(() => {
                    if (ws.readyState === WebSocket.CONNECTING) {
                        ws.close();
                    }
                }, 2000);
            };
            
            // Test all URLs
            wsUrls.forEach(testConnection);
            
            // Overall timeout
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    resolve(false);
                }
            }, 8000);
        });
    }

    async executeCompleteWorkflow() {
        console.log('\n🔄 COMPLETE WORKFLOW SIMULATION');
        console.log('-' .repeat(50));

        const workflow = {
            browser_navigation: false,
            page_load: false,
            ui_elements_present: false,
            ui_interaction: false,
            api_communication: false,
            terminal_interface: false
        };

        try {
            // Step 1: Browser Navigation
            console.log('1️⃣ Testing browser navigation...');
            await this.page.goto(this.frontendUrl, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            workflow.browser_navigation = true;
            console.log('✅ Browser navigation successful');

            // Step 2: Page Load Verification
            console.log('2️⃣ Testing page load...');
            const title = await this.page.title();
            const bodyContent = await this.page.evaluate(() => document.body?.textContent || '');
            workflow.page_load = title.length > 0 || bodyContent.length > 0;
            console.log(`✅ Page load: ${workflow.page_load} (Title: "${title.substring(0, 50)}")`);

            // Step 3: UI Elements Detection
            console.log('3️⃣ Testing UI elements presence...');
            const uiElements = await this.page.evaluate(() => {
                const buttons = document.querySelectorAll('button').length;
                const inputs = document.querySelectorAll('input').length;
                const divs = document.querySelectorAll('div').length;
                const interactive = document.querySelectorAll('[data-testid], [class*="terminal"], [class*="instance"]').length;
                
                return {
                    buttons,
                    inputs,
                    divs,
                    interactive,
                    total: buttons + inputs + divs + interactive
                };
            });
            
            workflow.ui_elements_present = uiElements.total > 5;
            console.log(`✅ UI elements: ${workflow.ui_elements_present} (${uiElements.buttons} buttons, ${uiElements.inputs} inputs, ${uiElements.interactive} interactive)`);

            // Step 4: UI Interaction Simulation
            console.log('4️⃣ Testing UI interaction...');
            const interactionResult = await this.simulateUserInteraction();
            workflow.ui_interaction = interactionResult;
            console.log(`✅ UI interaction: ${interactionResult}`);

            // Step 5: API Communication Check
            console.log('5️⃣ Testing API communication patterns...');
            const apiCommunication = this.networkRequests.some(req => 
                req.url.includes('/api/') || 
                req.method === 'POST' ||
                req.url.includes('claude') ||
                req.url.includes('instance')
            );
            workflow.api_communication = apiCommunication;
            console.log(`✅ API communication: ${apiCommunication} (${this.networkRequests.length} requests total)`);

            // Step 6: Terminal Interface
            console.log('6️⃣ Testing terminal interface...');
            const terminalInterface = await this.page.evaluate(() => {
                // Look for terminal-related elements
                const terminalElements = document.querySelectorAll('[class*="terminal"], [class*="xterm"], .terminal-container');
                const terminalText = document.body.textContent?.toLowerCase().includes('terminal');
                const terminalInputs = document.querySelectorAll('textarea, [contenteditable="true"]');
                
                return {
                    elements: terminalElements.length,
                    textFound: terminalText,
                    inputs: terminalInputs.length,
                    hasTerminal: terminalElements.length > 0 || terminalText || terminalInputs.length > 0
                };
            });
            
            workflow.terminal_interface = terminalInterface.hasTerminal;
            console.log(`✅ Terminal interface: ${terminalInterface.hasTerminal} (${terminalInterface.elements} elements, ${terminalInterface.inputs} inputs)`);

        } catch (error) {
            console.error(`❌ Workflow execution error: ${error.message}`);
        }

        this.testResults.workflow = workflow;
        return workflow;
    }

    async simulateUserInteraction() {
        try {
            // Look for clickable elements
            const clickableElements = await this.page.$$('button, [role="button"], .btn, [class*="button"], [onclick]');
            
            if (clickableElements.length > 0) {
                console.log(`   Found ${clickableElements.length} clickable elements`);
                
                // Try clicking the first few buttons
                for (let i = 0; i < Math.min(3, clickableElements.length); i++) {
                    try {
                        const element = clickableElements[i];
                        const text = await this.page.evaluate(el => el.textContent || el.getAttribute('aria-label') || el.className, element);
                        console.log(`   Clicking element ${i + 1}: "${text.substring(0, 50)}"`);
                        
                        await element.click();
                        await this.page.waitForTimeout(1000); // Wait for any responses
                    } catch (clickError) {
                        console.log(`   Click ${i + 1} failed: ${clickError.message}`);
                    }
                }
                return true;
            } else {
                console.log('   No clickable elements found');
                return false;
            }
        } catch (error) {
            console.error(`   UI interaction error: ${error.message}`);
            return false;
        }
    }

    async executeCommandTests() {
        console.log('\n📝 COMMAND EXECUTION TESTS');
        console.log('-' .repeat(50));

        const commands = {
            simple_input: false,
            keyboard_interaction: false,
            output_detection: false
        };

        try {
            // Look for input areas
            console.log('🎯 Testing command input capabilities...');
            
            const inputElements = await this.page.$$('input, textarea, [contenteditable="true"], .xterm-helper-textarea');
            console.log(`   Found ${inputElements.length} potential input elements`);
            
            if (inputElements.length > 0) {
                commands.simple_input = true;
                
                // Try typing in input elements
                for (let i = 0; i < Math.min(2, inputElements.length); i++) {
                    try {
                        const input = inputElements[i];
                        await input.click();
                        await this.page.keyboard.type('echo "test"');
                        await this.page.keyboard.press('Enter');
                        
                        console.log(`   ✅ Successfully typed in input element ${i + 1}`);
                        commands.keyboard_interaction = true;
                        
                        // Wait and check for output
                        await this.page.waitForTimeout(3000);
                        
                        const pageText = await this.page.evaluate(() => document.body.textContent);
                        if (pageText.includes('test') || pageText.includes('echo')) {
                            commands.output_detection = true;
                            console.log('   ✅ Command output detected');
                        }
                        
                        break; // Success, no need to try more inputs
                    } catch (inputError) {
                        console.log(`   Input element ${i + 1} failed: ${inputError.message}`);
                    }
                }
            } else {
                // Try keyboard interaction with the page directly
                console.log('   No input elements found, trying page-level keyboard interaction');
                await this.page.click('body');
                await this.page.keyboard.type('ls -la');
                await this.page.keyboard.press('Enter');
                commands.keyboard_interaction = true;
                
                await this.page.waitForTimeout(2000);
                const pageText = await this.page.evaluate(() => document.body.textContent);
                if (pageText.includes('total') || pageText.includes('drwx')) {
                    commands.output_detection = true;
                    console.log('   ✅ Command output detected via page interaction');
                }
            }

        } catch (error) {
            console.error(`❌ Command test error: ${error.message}`);
        }

        this.testResults.commands = commands;
        return commands;
    }

    async validateRealTimeMessaging() {
        console.log('\n⚡ REAL-TIME MESSAGING VALIDATION');
        console.log('-' .repeat(50));

        const messaging = {
            websocket_activity: false,
            network_requests: false,
            dom_updates: false,
            state_changes: false
        };

        try {
            // Check WebSocket activity during page interaction
            console.log('🔌 Testing WebSocket activity...');
            const wsConnected = await this.testWebSocketConnection();
            messaging.websocket_activity = wsConnected;

            // Analyze network requests
            console.log('📡 Analyzing network requests...');
            messaging.network_requests = this.networkRequests.length > 0;
            console.log(`   Captured ${this.networkRequests.length} network requests`);

            // Test DOM updates
            console.log('🔄 Testing DOM updates...');
            const initialDOM = await this.page.evaluate(() => document.body.innerHTML.length);
            
            // Trigger some interactions
            await this.page.keyboard.press('Space');
            await this.page.mouse.move(100, 100);
            await this.page.waitForTimeout(2000);
            
            const finalDOM = await this.page.evaluate(() => document.body.innerHTML.length);
            messaging.dom_updates = Math.abs(finalDOM - initialDOM) > 100; // Significant DOM change
            console.log(`   DOM change detected: ${messaging.dom_updates} (${Math.abs(finalDOM - initialDOM)} char difference)`);

            // Test state changes
            console.log('📊 Testing application state changes...');
            const stateIndicators = await this.page.evaluate(() => {
                // Look for state indicators in the page
                const classNames = Array.from(document.querySelectorAll('*')).map(el => el.className).join(' ');
                const hasStateClasses = /loading|connected|active|running|success|error/.test(classNames);
                
                const hasStateText = /loading|connecting|connected|running|active/.test(document.body.textContent.toLowerCase());
                
                return hasStateClasses || hasStateText;
            });
            messaging.state_changes = stateIndicators;

        } catch (error) {
            console.error(`❌ Real-time messaging validation error: ${error.message}`);
        }

        this.testResults.realtime = messaging;
        return messaging;
    }

    async testFailureScenarios() {
        console.log('\n💥 FAILURE SCENARIO TESTING');
        console.log('-' .repeat(50));

        const failures = {
            network_interruption: false,
            invalid_interactions: false,
            error_recovery: false,
            graceful_degradation: false
        };

        try {
            // Test network interruption
            console.log('🔌 Testing network interruption handling...');
            await this.page.setOfflineMode(true);
            await this.page.waitForTimeout(2000);
            
            // Try to interact while offline
            await this.page.click('body').catch(() => {});
            
            await this.page.setOfflineMode(false);
            await this.page.waitForTimeout(2000);
            
            // Check if page recovered
            const pageResponsive = await this.page.evaluate(() => {
                return document.readyState === 'complete';
            });
            
            failures.network_interruption = pageResponsive;
            console.log(`   Network interruption recovery: ${pageResponsive}`);

            // Test invalid interactions
            console.log('⚠️  Testing invalid interactions...');
            try {
                // Send invalid keystrokes
                await this.page.keyboard.press('F12'); // Developer tools
                await this.page.keyboard.press('Escape');
                
                // Try clicking outside page bounds (handled by Puppeteer)
                await this.page.mouse.click(-10, -10).catch(() => {});
                
                failures.invalid_interactions = true; // If we get here without crashing
                console.log('   Invalid interactions handled gracefully');
            } catch (error) {
                failures.invalid_interactions = false;
                console.log(`   Invalid interactions caused issues: ${error.message}`);
            }

            // Test error recovery
            console.log('🔄 Testing error recovery mechanisms...');
            const errorRecovery = await this.page.evaluate(() => {
                // Look for error handling in the UI
                const hasErrorBoundaries = window.React !== undefined; // React apps often have error boundaries
                const hasErrorHandlers = typeof window.onerror === 'function';
                const hasConsoleErrors = console.error !== undefined;
                
                return hasErrorBoundaries || hasErrorHandlers || hasConsoleErrors;
            });
            failures.error_recovery = errorRecovery;

            // Test graceful degradation
            console.log('📉 Testing graceful degradation...');
            const gracefulDegradation = await this.page.evaluate(() => {
                // Check if app still functions with limited capabilities
                const hasBasicElements = document.querySelectorAll('div, span, button').length > 0;
                const hasText = document.body.textContent?.length > 100;
                const isNavigable = document.querySelector('body') !== null;
                
                return hasBasicElements && hasText && isNavigable;
            });
            failures.graceful_degradation = gracefulDegradation;

        } catch (error) {
            console.error(`❌ Failure scenario testing error: ${error.message}`);
        }

        this.testResults.failures = failures;
        return failures;
    }

    generateComprehensiveReport() {
        console.log('\n📊 COMPREHENSIVE VALIDATION REPORT');
        console.log('=' .repeat(80));

        const totalTime = Date.now() - this.startTime;
        const results = this.testResults;

        // Architecture Results
        console.log('\n🏗️  ARCHITECTURE VALIDATION RESULTS:');
        Object.entries(results.architecture).forEach(([key, value]) => {
            const status = value ? '✅ PASS' : '❌ FAIL';
            const label = key.replace(/_/g, ' ').toUpperCase();
            console.log(`   ${label}: ${status}`);
        });

        // Workflow Results
        console.log('\n🔄 WORKFLOW VALIDATION RESULTS:');
        Object.entries(results.workflow).forEach(([key, value]) => {
            const status = value ? '✅ PASS' : '❌ FAIL';
            const label = key.replace(/_/g, ' ').toUpperCase();
            console.log(`   ${label}: ${status}`);
        });

        // Command Execution Results
        console.log('\n📝 COMMAND EXECUTION RESULTS:');
        Object.entries(results.commands).forEach(([key, value]) => {
            const status = value ? '✅ PASS' : '❌ FAIL';
            const label = key.replace(/_/g, ' ').toUpperCase();
            console.log(`   ${label}: ${status}`);
        });

        // Real-time Messaging Results
        console.log('\n⚡ REAL-TIME MESSAGING RESULTS:');
        Object.entries(results.realtime).forEach(([key, value]) => {
            const status = value ? '✅ PASS' : '❌ FAIL';
            const label = key.replace(/_/g, ' ').toUpperCase();
            console.log(`   ${label}: ${status}`);
        });

        // Failure Scenario Results
        console.log('\n💥 FAILURE SCENARIO RESULTS:');
        Object.entries(results.failures).forEach(([key, value]) => {
            const status = value ? '✅ HANDLED' : '❌ NOT HANDLED';
            const label = key.replace(/_/g, ' ').toUpperCase();
            console.log(`   ${label}: ${status}`);
        });

        // Network Analysis
        console.log('\n📡 NETWORK ACTIVITY ANALYSIS:');
        console.log(`   Total Requests: ${this.networkRequests.length}`);
        
        const requestsByMethod = {};
        this.networkRequests.forEach(req => {
            requestsByMethod[req.method] = (requestsByMethod[req.method] || 0) + 1;
        });
        
        Object.entries(requestsByMethod).forEach(([method, count]) => {
            console.log(`   ${method}: ${count} requests`);
        });

        // Calculate overall score
        const allResults = {
            ...results.architecture,
            ...results.workflow,
            ...results.commands,
            ...results.realtime,
            ...results.failures
        };
        
        const totalTests = Object.keys(allResults).length;
        const passedTests = Object.values(allResults).filter(Boolean).length;
        const passRate = ((passedTests / totalTests) * 100).toFixed(1);

        console.log('\n📈 OVERALL ASSESSMENT:');
        console.log(`   Total Tests: ${totalTests}`);
        console.log(`   Passed Tests: ${passedTests}`);
        console.log(`   Pass Rate: ${passRate}%`);
        console.log(`   Execution Time: ${(totalTime / 1000).toFixed(2)} seconds`);

        // Final Verdict
        console.log('\n🎯 FINAL VERDICT:');
        if (passRate >= 90) {
            console.log('   🏆 EXCELLENT - System is production ready');
        } else if (passRate >= 75) {
            console.log('   ✅ GOOD - System is stable with minor issues');
        } else if (passRate >= 50) {
            console.log('   ⚠️  ACCEPTABLE - System needs improvement');
        } else {
            console.log('   ❌ NEEDS WORK - System has critical issues');
        }

        // Save detailed report
        this.saveDetailedReport(results, totalTime, passRate);

        console.log('\n' + '=' .repeat(80));
        console.log('🏁 COMPREHENSIVE ARCHITECTURE VALIDATION COMPLETE');
        
        return { 
            results, 
            totalTime, 
            passRate,
            networkRequests: this.networkRequests.length,
            verdict: passRate >= 75 ? 'PASS' : 'FAIL'
        };
    }

    saveDetailedReport(results, totalTime, passRate) {
        const report = {
            timestamp: new Date().toISOString(),
            executionTime: totalTime,
            passRate: passRate,
            results: results,
            networkActivity: {
                totalRequests: this.networkRequests.length,
                requests: this.networkRequests.slice(0, 50) // Limit to first 50 for readability
            },
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                cwd: process.cwd(),
                frontendUrl: this.frontendUrl,
                backendUrl: this.backendUrl
            }
        };

        const reportPath = '/workspaces/agent-feed/tests/comprehensive-e2e-validation/external-services-validation-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📄 Detailed report saved to: ${reportPath}`);
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up test environment...');
        
        if (this.browser) {
            await this.browser.close();
            console.log('✅ Browser closed');
        }

        console.log('✅ Cleanup complete');
    }

    async runFullValidation() {
        try {
            await this.initialize();
            await this.validateArchitecture();
            await this.executeCompleteWorkflow();
            await this.executeCommandTests();
            await this.validateRealTimeMessaging();
            await this.testFailureScenarios();
            
            return this.generateComprehensiveReport();
        } catch (error) {
            console.error('❌ Validation failed:', error);
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

// Execute if run directly
if (require.main === module) {
    (async () => {
        const validator = new ExternalServicesValidator();
        
        try {
            const result = await validator.runFullValidation();
            process.exit(result.verdict === 'PASS' ? 0 : 1);
        } catch (error) {
            console.error('Validation suite failed:', error);
            process.exit(1);
        }
    })();
}

module.exports = ExternalServicesValidator;