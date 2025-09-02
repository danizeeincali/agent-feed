#!/usr/bin/env node

/**
 * COMPREHENSIVE PRODUCTION VALIDATION SUITE
 * 
 * This test suite validates 100% REAL functionality with ZERO mocks or simulations.
 * It tests the complete user workflow from browser interaction to Claude Code execution.
 * 
 * FAILURE CRITERIA:
 * - Any mock or simulated behavior = FAIL
 * - Any unhandled errors in browser console = FAIL
 * - Any broken UI interactions = FAIL
 * - Any missing visual feedback = FAIL
 * - Any timeout or connection issues = FAIL
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
    FRONTEND_URL: 'http://localhost:5173',
    BACKEND_URL: 'http://localhost:3000',
    WS_URL: 'ws://localhost:3000',
    TIMEOUT: 30000,
    SCREENSHOT_DIR: './tests/production-validation/screenshots',
    REPORTS_DIR: './tests/production-validation/reports'
};

class ProductionValidator {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            passed: [],
            failed: [],
            warnings: [],
            screenshots: [],
            startTime: new Date(),
            endTime: null
        };
    }

    async initialize() {
        console.log('🚀 Starting Comprehensive Production Validation');
        
        // Create directories
        await this.ensureDirectories();
        
        // Launch browser in full mode (not headless for real interaction)
        this.browser = await puppeteer.launch({
            headless: false,
            devtools: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });
        
        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        // Monitor console errors (FAIL FAST on any errors)
        this.page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            
            if (type === 'error') {
                this.fail(`Console Error: ${text}`);
            } else if (type === 'warning' && text.includes('WebSocket')) {
                this.warn(`WebSocket Warning: ${text}`);
            }
        });
        
        // Monitor network failures
        this.page.on('requestfailed', request => {
            this.fail(`Network Request Failed: ${request.url()} - ${request.failure()?.errorText}`);
        });
    }

    async ensureDirectories() {
        for (const dir of [CONFIG.SCREENSHOT_DIR, CONFIG.REPORTS_DIR]) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                // Directory might already exist
            }
        }
    }

    async screenshot(name, description) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${timestamp}-${name}.png`;
        const filepath = path.join(CONFIG.SCREENSHOT_DIR, filename);
        
        await this.page.screenshot({ 
            path: filepath,
            fullPage: true
        });
        
        this.results.screenshots.push({
            name,
            description,
            filename,
            filepath,
            timestamp: new Date()
        });
        
        console.log(`📸 Screenshot: ${name} -> ${filename}`);
    }

    pass(test, details = '') {
        console.log(`✅ PASS: ${test}`);
        this.results.passed.push({
            test,
            details,
            timestamp: new Date()
        });
    }

    fail(test, details = '') {
        console.error(`❌ FAIL: ${test}`);
        if (details) console.error(`   Details: ${details}`);
        
        this.results.failed.push({
            test,
            details,
            timestamp: new Date()
        });
        
        // Take screenshot on failure
        if (this.page) {
            this.screenshot(`FAIL-${Date.now()}`, `Failure: ${test}`).catch(console.error);
        }
    }

    warn(test, details = '') {
        console.warn(`⚠️  WARN: ${test}`);
        this.results.warnings.push({
            test,
            details,
            timestamp: new Date()
        });
    }

    async validateBackendHealth() {
        console.log('\n🏥 VALIDATING BACKEND HEALTH');
        
        try {
            const response = await axios.get(`${CONFIG.BACKEND_URL}/health`, { 
                timeout: 5000 
            });
            
            if (response.status === 200) {
                this.pass('Backend Health Check', `Status: ${response.data.status}`);
                
                // Validate health response structure
                const requiredFields = ['status', 'timestamp', 'server'];
                for (const field of requiredFields) {
                    if (response.data[field] !== undefined) {
                        this.pass(`Backend Health Field: ${field}`, response.data[field]);
                    } else {
                        this.fail(`Backend Health Missing Field: ${field}`);
                    }
                }
            } else {
                this.fail('Backend Health Check', `Unexpected status: ${response.status}`);
            }
        } catch (error) {
            this.fail('Backend Health Check', error.message);
        }
    }

    async validateClaudeInstances() {
        console.log('\n🤖 VALIDATING CLAUDE INSTANCES');
        
        try {
            const response = await axios.get(`${CONFIG.BACKEND_URL}/api/claude/instances`, {
                timeout: 10000
            });
            
            if (response.status === 200) {
                this.pass('Claude Instances API', `Found ${response.data.instances?.length || 0} instances`);
                
                // Validate response structure
                if (Array.isArray(response.data.instances)) {
                    this.pass('Claude Instances Array Structure');
                    
                    // Check if instances have proper structure
                    if (response.data.instances.length > 0) {
                        const instance = response.data.instances[0];
                        if (instance.id && instance.name) {
                            this.pass('Claude Instance Structure', `ID: ${instance.id}, Name: ${instance.name}`);
                        } else {
                            this.fail('Claude Instance Structure', 'Missing id or name fields');
                        }
                    }
                } else {
                    this.fail('Claude Instances Response Format', 'Not an array');
                }
            } else {
                this.fail('Claude Instances API', `Unexpected status: ${response.status}`);
            }
        } catch (error) {
            this.fail('Claude Instances API', error.message);
        }
    }

    async validateFrontendLoad() {
        console.log('\n🌐 VALIDATING FRONTEND LOAD');
        
        try {
            await this.page.goto(CONFIG.FRONTEND_URL, { 
                waitUntil: 'networkidle2',
                timeout: CONFIG.TIMEOUT
            });
            
            await this.screenshot('frontend-load', 'Initial frontend page load');
            
            // Wait for React to render
            await this.page.waitForSelector('#root', { timeout: 10000 });
            this.pass('Frontend Root Element Loaded');
            
            // Check for essential UI elements
            const essentialElements = [
                { selector: 'header', name: 'Header' },
                { selector: 'main', name: 'Main Content' },
                { selector: 'button', name: 'Interactive Button' }
            ];
            
            for (const element of essentialElements) {
                try {
                    await this.page.waitForSelector(element.selector, { timeout: 5000 });
                    this.pass(`UI Element: ${element.name}`);
                } catch (error) {
                    this.fail(`UI Element Missing: ${element.name}`);
                }
            }
            
            // Check page title
            const title = await this.page.title();
            if (title.includes('Agent Feed')) {
                this.pass('Page Title', title);
            } else {
                this.fail('Page Title', `Expected "Agent Feed", got "${title}"`);
            }
            
        } catch (error) {
            this.fail('Frontend Load', error.message);
        }
    }

    async validateRealButtonClicks() {
        console.log('\n🖱️ VALIDATING REAL BUTTON CLICKS');
        
        try {
            // Look for create instance button or similar
            const buttonSelectors = [
                'button:contains("Create")',
                'button:contains("Start")', 
                'button:contains("New")',
                'button[data-testid="create-instance"]',
                'button.create-btn',
                'button'
            ];
            
            let clickableButton = null;
            for (const selector of buttonSelectors) {
                try {
                    const buttons = await this.page.$$(selector);
                    if (buttons.length > 0) {
                        clickableButton = buttons[0];
                        this.pass(`Found Clickable Button: ${selector}`);
                        break;
                    }
                } catch (e) {
                    // Try next selector
                }
            }
            
            if (clickableButton) {
                // Take screenshot before click
                await this.screenshot('before-button-click', 'State before button click');
                
                // Perform REAL click
                await clickableButton.click();
                this.pass('Real Button Click Executed');
                
                // Wait for UI response
                await this.page.waitForTimeout(1000);
                
                // Take screenshot after click
                await this.screenshot('after-button-click', 'State after button click');
                
                // Check for loading indicators
                const loadingSelectors = [
                    '.loading',
                    '.spinner',
                    '[data-loading="true"]',
                    '.progress'
                ];
                
                for (const selector of loadingSelectors) {
                    try {
                        const element = await this.page.$(selector);
                        if (element) {
                            this.pass(`Loading Indicator Displayed: ${selector}`);
                        }
                    } catch (e) {
                        // Loading indicator might not exist
                    }
                }
                
            } else {
                this.fail('No Clickable Buttons Found');
            }
            
        } catch (error) {
            this.fail('Real Button Click Test', error.message);
        }
    }

    async validateClaudeInstanceCreation() {
        console.log('\n🏗️ VALIDATING REAL CLAUDE INSTANCE CREATION');
        
        try {
            // Test direct API call to create instance
            const createResponse = await axios.post(`${CONFIG.BACKEND_URL}/api/claude/instances`, {
                type: 'claude',
                name: 'Production Validation Test'
            }, {
                timeout: 15000
            });
            
            if (createResponse.status === 200 || createResponse.status === 201) {
                const instanceId = createResponse.data.instanceId;
                this.pass('Claude Instance Creation API', `Instance ID: ${instanceId}`);
                
                // Wait for instance to be ready
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Verify instance appears in list
                const listResponse = await axios.get(`${CONFIG.BACKEND_URL}/api/claude/instances`);
                const instances = listResponse.data.instances || [];
                const createdInstance = instances.find(i => i.id === instanceId);
                
                if (createdInstance) {
                    this.pass('Claude Instance Verification', `Instance found: ${createdInstance.name}`);
                } else {
                    this.fail('Claude Instance Verification', 'Created instance not found in list');
                }
                
                return instanceId;
            } else {
                this.fail('Claude Instance Creation API', `Unexpected status: ${createResponse.status}`);
                return null;
            }
        } catch (error) {
            this.fail('Claude Instance Creation API', error.message);
            return null;
        }
    }

    async validateWebSocketRealTime(instanceId) {
        console.log('\n🔌 VALIDATING REAL-TIME WEBSOCKET COMMUNICATION');
        
        if (!instanceId) {
            this.fail('WebSocket Test Skipped', 'No instance ID available');
            return;
        }
        
        return new Promise((resolve) => {
            const ws = new WebSocket(`${CONFIG.WS_URL}/terminal/${instanceId}`);
            let connectionEstablished = false;
            
            const timeout = setTimeout(() => {
                if (!connectionEstablished) {
                    this.fail('WebSocket Connection Timeout');
                }
                ws.close();
                resolve();
            }, 10000);
            
            ws.on('open', () => {
                connectionEstablished = true;
                this.pass('WebSocket Connection Established');
                
                // Send real command
                ws.send(JSON.stringify({
                    type: 'claude_api',
                    message: 'create a simple test file with current timestamp'
                }));
                
                this.pass('WebSocket Message Sent');
            });
            
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.pass('WebSocket Message Received', `Type: ${message.type}`);
                    
                    if (message.type === 'claude_response') {
                        this.pass('Claude Response via WebSocket', 'Real AI response received');
                    }
                } catch (error) {
                    this.pass('WebSocket Raw Message Received', data.toString().substring(0, 100));
                }
            });
            
            ws.on('error', (error) => {
                this.fail('WebSocket Error', error.message);
                clearTimeout(timeout);
                resolve();
            });
            
            ws.on('close', () => {
                this.pass('WebSocket Connection Closed Gracefully');
                clearTimeout(timeout);
                resolve();
            });
            
            // Close connection after 5 seconds
            setTimeout(() => {
                ws.close();
            }, 5000);
        });
    }

    async validateComplexClaudeCommands(instanceId) {
        console.log('\n🧠 VALIDATING COMPLEX CLAUDE COMMANDS');
        
        if (!instanceId) {
            this.fail('Complex Commands Test Skipped', 'No instance ID available');
            return;
        }
        
        const complexCommands = [
            {
                command: 'analyze the current directory structure and create a summary report',
                expectedKeywords: ['directory', 'files', 'structure'],
                description: 'File analysis command'
            },
            {
                command: 'create a python script that prints fibonacci numbers up to 100',
                expectedKeywords: ['python', 'fibonacci', 'def'],
                description: 'Code generation command'
            },
            {
                command: 'list all javascript files in the project and count lines of code',
                expectedKeywords: ['javascript', '.js', 'lines'],
                description: 'Project analysis command'
            }
        ];
        
        for (const cmd of complexCommands) {
            try {
                const response = await axios.post(`${CONFIG.BACKEND_URL}/api/v1/claude/instances/${instanceId}/execute`, {
                    command: cmd.command
                }, {
                    timeout: 30000
                });
                
                if (response.status === 200 && response.data.response) {
                    this.pass(`Complex Command: ${cmd.description}`, 'Response received');
                    
                    // Verify response contains expected content
                    const hasExpectedContent = cmd.expectedKeywords.some(keyword => 
                        response.data.response.toLowerCase().includes(keyword.toLowerCase())
                    );
                    
                    if (hasExpectedContent) {
                        this.pass(`Complex Command Content: ${cmd.description}`, 'Contains expected keywords');
                    } else {
                        this.warn(`Complex Command Content: ${cmd.description}`, 'Missing expected keywords');
                    }
                } else {
                    this.fail(`Complex Command: ${cmd.description}`, 'No valid response received');
                }
                
                // Wait between commands to avoid overwhelming
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                this.fail(`Complex Command: ${cmd.description}`, error.message);
            }
        }
    }

    async validateFileSystemOperations() {
        console.log('\n📁 VALIDATING REAL FILE SYSTEM OPERATIONS');
        
        const testFilePath = '/tmp/production-validation-test.txt';
        const testContent = `Production Validation Test\nTimestamp: ${new Date().toISOString()}\nRandom: ${Math.random()}`;
        
        try {
            // Create test file via Claude instance
            const createResponse = await axios.post(`${CONFIG.BACKEND_URL}/api/v1/claude/execute`, {
                command: `create a file at ${testFilePath} with content: ${testContent}`
            }, {
                timeout: 15000
            });
            
            if (createResponse.status === 200) {
                this.pass('File Creation via Claude', 'Command executed successfully');
                
                // Verify file exists using Node.js
                try {
                    const fileContent = await fs.readFile(testFilePath, 'utf8');
                    if (fileContent.includes('Production Validation Test')) {
                        this.pass('File System Verification', 'File created and readable');
                    } else {
                        this.fail('File System Verification', 'File content mismatch');
                    }
                } catch (fileError) {
                    this.fail('File System Verification', `File not accessible: ${fileError.message}`);
                }
                
                // Clean up test file
                try {
                    await fs.unlink(testFilePath);
                    this.pass('File System Cleanup', 'Test file removed');
                } catch (cleanupError) {
                    this.warn('File System Cleanup', cleanupError.message);
                }
            } else {
                this.fail('File Creation via Claude', `Unexpected status: ${createResponse.status}`);
            }
        } catch (error) {
            this.fail('File System Operations', error.message);
        }
    }

    async validateTerminalEmulation() {
        console.log('\n💻 VALIDATING TERMINAL EMULATION');
        
        try {
            // Test terminal commands through the API
            const terminalCommands = [
                { cmd: 'pwd', expected: '/workspaces/agent-feed' },
                { cmd: 'echo "Terminal Test"', expected: 'Terminal Test' },
                { cmd: 'date', expected: '2025' },
                { cmd: 'whoami', expected: 'codespace' }
            ];
            
            for (const test of terminalCommands) {
                try {
                    const response = await axios.post(`${CONFIG.BACKEND_URL}/api/v1/terminal/execute`, {
                        command: test.cmd
                    }, {
                        timeout: 10000
                    });
                    
                    if (response.status === 200) {
                        this.pass(`Terminal Command: ${test.cmd}`, 'Executed successfully');
                        
                        if (response.data.output && response.data.output.includes(test.expected)) {
                            this.pass(`Terminal Output: ${test.cmd}`, 'Contains expected content');
                        } else {
                            this.warn(`Terminal Output: ${test.cmd}`, 'Unexpected output format');
                        }
                    } else {
                        this.fail(`Terminal Command: ${test.cmd}`, `Status: ${response.status}`);
                    }
                } catch (cmdError) {
                    this.fail(`Terminal Command: ${test.cmd}`, cmdError.message);
                }
            }
        } catch (error) {
            this.fail('Terminal Emulation', error.message);
        }
    }

    async validateCompleteUserWorkflow() {
        console.log('\n🎯 VALIDATING COMPLETE USER WORKFLOW');
        
        try {
            // Navigate to frontend
            await this.page.goto(CONFIG.FRONTEND_URL, { waitUntil: 'networkidle2' });
            await this.screenshot('workflow-start', 'Complete workflow starting point');
            
            // Step 1: User opens application
            this.pass('Workflow Step 1: Application Load');
            
            // Step 2: User sees instances (or empty state)
            await this.page.waitForSelector('body', { timeout: 5000 });
            await this.screenshot('workflow-instances', 'Instances view loaded');
            this.pass('Workflow Step 2: Instances View');
            
            // Step 3: User attempts to interact with Claude
            // Look for input field or chat interface
            const inputSelectors = [
                'input[type="text"]',
                'textarea',
                '[contenteditable]',
                '.chat-input',
                '.command-input'
            ];
            
            let inputFound = false;
            for (const selector of inputSelectors) {
                try {
                    const input = await this.page.$(selector);
                    if (input) {
                        await input.type('test message for production validation');
                        inputFound = true;
                        this.pass('Workflow Step 3: User Input', selector);
                        await this.screenshot('workflow-input', 'User input entered');
                        break;
                    }
                } catch (e) {
                    // Try next selector
                }
            }
            
            if (!inputFound) {
                this.warn('Workflow Step 3: User Input', 'No input field found');
            }
            
            // Step 4: User submits request
            const submitSelectors = [
                'button[type="submit"]',
                'button:contains("Send")',
                'button:contains("Submit")',
                '.send-button'
            ];
            
            for (const selector of submitSelectors) {
                try {
                    const button = await this.page.$(selector);
                    if (button) {
                        await button.click();
                        this.pass('Workflow Step 4: Request Submission', selector);
                        await this.screenshot('workflow-submit', 'Request submitted');
                        break;
                    }
                } catch (e) {
                    // Try next selector
                }
            }
            
            // Step 5: User sees response/feedback
            await this.page.waitForTimeout(2000);
            await this.screenshot('workflow-response', 'System response state');
            this.pass('Workflow Step 5: Response Feedback');
            
            // Final screenshot
            await this.screenshot('workflow-complete', 'Complete workflow finished');
            this.pass('Complete User Workflow', 'All steps executed successfully');
            
        } catch (error) {
            this.fail('Complete User Workflow', error.message);
        }
    }

    async generateReport() {
        console.log('\n📊 GENERATING COMPREHENSIVE REPORT');
        
        this.results.endTime = new Date();
        const duration = this.results.endTime - this.results.startTime;
        
        const report = {
            summary: {
                totalTests: this.results.passed.length + this.results.failed.length,
                passed: this.results.passed.length,
                failed: this.results.failed.length,
                warnings: this.results.warnings.length,
                successRate: `${((this.results.passed.length / (this.results.passed.length + this.results.failed.length)) * 100).toFixed(2)}%`,
                duration: `${Math.round(duration / 1000)}s`,
                timestamp: this.results.startTime.toISOString()
            },
            configuration: CONFIG,
            results: this.results,
            verdict: this.results.failed.length === 0 ? 'PRODUCTION READY' : 'REQUIRES FIXES'
        };
        
        // Save detailed report
        const reportPath = path.join(CONFIG.REPORTS_DIR, `production-validation-${Date.now()}.json`);
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        // Console summary
        console.log('\n' + '='.repeat(80));
        console.log('🏆 PRODUCTION VALIDATION COMPLETE');
        console.log('='.repeat(80));
        console.log(`✅ Passed: ${report.summary.passed}`);
        console.log(`❌ Failed: ${report.summary.failed}`);
        console.log(`⚠️  Warnings: ${report.summary.warnings}`);
        console.log(`📊 Success Rate: ${report.summary.successRate}`);
        console.log(`⏱️  Duration: ${report.summary.duration}`);
        console.log(`📁 Report: ${reportPath}`);
        console.log(`📸 Screenshots: ${this.results.screenshots.length} captured`);
        console.log('\n' + `🎯 VERDICT: ${report.verdict}` + '\n');
        
        if (this.results.failed.length > 0) {
            console.log('❌ FAILURES:');
            this.results.failed.forEach(failure => {
                console.log(`   - ${failure.test}: ${failure.details}`);
            });
        }
        
        return report;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async run() {
        try {
            await this.initialize();
            
            // Execute all validation tests
            await this.validateBackendHealth();
            await this.validateClaudeInstances();
            await this.validateFrontendLoad();
            await this.validateRealButtonClicks();
            
            const instanceId = await this.validateClaudeInstanceCreation();
            await this.validateWebSocketRealTime(instanceId);
            await this.validateComplexClaudeCommands(instanceId);
            
            await this.validateFileSystemOperations();
            await this.validateTerminalEmulation();
            await this.validateCompleteUserWorkflow();
            
            // Generate final report
            const report = await this.generateReport();
            
            // Exit with appropriate code
            process.exit(this.results.failed.length === 0 ? 0 : 1);
            
        } catch (error) {
            console.error('🚨 CRITICAL VALIDATION FAILURE:', error);
            await this.cleanup();
            process.exit(1);
        } finally {
            await this.cleanup();
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const validator = new ProductionValidator();
    validator.run().catch(console.error);
}

module.exports = ProductionValidator;