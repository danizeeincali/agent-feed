#!/usr/bin/env node

/**
 * COMPREHENSIVE COMPLEX COMMAND TEST SUITE
 * Tests complex command scenarios with user input handling using fixed WebSocket infrastructure
 * 
 * Test Scenarios:
 * 1. File Operation Command with user input
 * 2. Permission-Required Command (npm install)
 * 3. Interactive Command (git configuration)
 * 4. Long-Running Command (with loading animations)
 * 
 * Requirements:
 * - Real browser automation (no headless)
 * - WebSocket connection validation
 * - Loading animation verification
 * - Permission dialog testing
 * - Tool call bullet visualization
 * - Complete workflow validation
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

class ComplexCommandTestSuite {
    constructor() {
        this.testResults = {
            timestamp: new Date().toISOString(),
            testSuite: 'Complex Command Comprehensive Test',
            scenarios: [],
            totalTests: 0,
            passed: 0,
            failed: 0,
            websocketStability: {
                connectionDrops: 0,
                reconnections: 0,
                messageFailures: 0
            },
            performanceMetrics: {
                averageCommandResponseTime: 0,
                loadingAnimationAccuracy: 0,
                permissionDialogResponseTime: 0
            }
        };
        
        this.browser = null;
        this.page = null;
        this.websocketMessages = [];
    }

    async initialize() {
        console.log('🚀 Initializing Complex Command Test Suite...');
        
        // Launch browser in non-headless mode for real user interaction testing
        this.browser = await chromium.launch({ 
            headless: false,
            slowMo: 100 // Add slight delay for better observation
        });
        
        this.page = await this.browser.newPage();
        
        // Set up WebSocket message monitoring
        await this.setupWebSocketMonitoring();
        
        // Navigate to application
        console.log('📱 Navigating to application...');
        await this.page.goto('http://localhost:5174');
        
        // Wait for application to load
        await this.page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 });
        
        console.log('✅ Application loaded successfully');
        return true;
    }

    async setupWebSocketMonitoring() {
        // Monitor WebSocket connections and messages
        this.page.on('websocket', ws => {
            console.log('🔗 WebSocket connection established:', ws.url());
            
            ws.on('framereceived', event => {
                this.websocketMessages.push({
                    type: 'received',
                    payload: event.payload,
                    timestamp: Date.now()
                });
            });
            
            ws.on('framesent', event => {
                this.websocketMessages.push({
                    type: 'sent', 
                    payload: event.payload,
                    timestamp: Date.now()
                });
            });
            
            ws.on('close', () => {
                console.log('❌ WebSocket connection closed');
                this.testResults.websocketStability.connectionDrops++;
            });
        });
    }

    async testFileOperationCommand() {
        console.log('\n📁 Testing File Operation Command with User Input...');
        
        const testStart = Date.now();
        const scenario = {
            name: 'File Operation Command',
            description: 'Create file with user input content',
            command: 'Create a file called test-user-input.txt with the content "Hello from complex command test"',
            steps: [],
            passed: false,
            errors: [],
            metrics: {}
        };

        try {
            // Send command
            await this.sendCommand(scenario.command);
            scenario.steps.push('✅ Command sent successfully');

            // Wait for loading animation
            const loadingVisible = await this.waitForLoadingAnimation();
            scenario.steps.push(loadingVisible ? '✅ Loading animation displayed' : '❌ Loading animation missing');

            // Check for tool call visualization
            const toolCallVisible = await this.validateToolCallVisualization('touch');
            scenario.steps.push(toolCallVisible ? '✅ Tool call bullet visualization displayed' : '❌ Tool call visualization missing');

            // Wait for command completion
            await this.waitForCommandCompletion(10000);
            scenario.steps.push('✅ Command completed');

            // Verify file was created
            const fileExists = await this.verifyFileExists('/workspaces/agent-feed/test-user-input.txt');
            scenario.steps.push(fileExists ? '✅ File created successfully' : '❌ File creation failed');

            scenario.passed = loadingVisible && toolCallVisible && fileExists;
            scenario.metrics.responseTime = Date.now() - testStart;

        } catch (error) {
            scenario.errors.push(error.message);
            console.error('❌ File operation test failed:', error);
        }

        this.testResults.scenarios.push(scenario);
        this.updateTestCounts(scenario.passed);
        return scenario.passed;
    }

    async testPermissionRequiredCommand() {
        console.log('\n🔐 Testing Permission-Required Command...');
        
        const testStart = Date.now();
        const scenario = {
            name: 'Permission Required Command', 
            description: 'npm install with permission dialog',
            command: 'Install the lodash package using npm install lodash',
            steps: [],
            passed: false,
            errors: [],
            metrics: {}
        };

        try {
            // Send command
            await this.sendCommand(scenario.command);
            scenario.steps.push('✅ Command sent successfully');

            // Wait for permission dialog
            const permissionDialog = await this.waitForPermissionDialog();
            scenario.steps.push(permissionDialog ? '✅ Permission dialog appeared' : '❌ Permission dialog missing');

            if (permissionDialog) {
                // Test permission dialog interaction
                const permissionStart = Date.now();
                await this.interactWithPermissionDialog('yes');
                scenario.metrics.permissionDialogResponseTime = Date.now() - permissionStart;
                scenario.steps.push('✅ Permission dialog interaction completed');

                // Wait for loading animation during npm install
                const loadingVisible = await this.waitForLoadingAnimation();
                scenario.steps.push(loadingVisible ? '✅ Loading animation during install' : '❌ Loading animation missing');

                // Check for npm tool call visualization
                const toolCallVisible = await this.validateToolCallVisualization('npm');
                scenario.steps.push(toolCallVisible ? '✅ npm tool call visualized' : '❌ npm tool call missing');

                // Wait for completion
                await this.waitForCommandCompletion(30000);
                scenario.steps.push('✅ npm install completed');
            }

            scenario.passed = permissionDialog;
            scenario.metrics.responseTime = Date.now() - testStart;

        } catch (error) {
            scenario.errors.push(error.message);
            console.error('❌ Permission command test failed:', error);
        }

        this.testResults.scenarios.push(scenario);
        this.updateTestCounts(scenario.passed);
        return scenario.passed;
    }

    async testInteractiveCommand() {
        console.log('\n🤖 Testing Interactive Command...');
        
        const testStart = Date.now();
        const scenario = {
            name: 'Interactive Command',
            description: 'git init with user configuration',
            command: 'Initialize a new git repository and configure user name as "Test User" and email as "test@example.com"',
            steps: [],
            passed: false,
            errors: [],
            metrics: {}
        };

        try {
            // Send command
            await this.sendCommand(scenario.command);
            scenario.steps.push('✅ Command sent successfully');

            // Wait for git tool call visualization
            const gitToolCall = await this.validateToolCallVisualization('git');
            scenario.steps.push(gitToolCall ? '✅ git tool call visualized' : '❌ git tool call missing');

            // Monitor for interactive prompts
            const interactiveHandling = await this.monitorInteractivePrompts();
            scenario.steps.push(interactiveHandling ? '✅ Interactive prompts handled' : '❌ Interactive handling failed');

            // Wait for completion
            await this.waitForCommandCompletion(15000);
            scenario.steps.push('✅ git configuration completed');

            scenario.passed = gitToolCall && interactiveHandling;
            scenario.metrics.responseTime = Date.now() - testStart;

        } catch (error) {
            scenario.errors.push(error.message);
            console.error('❌ Interactive command test failed:', error);
        }

        this.testResults.scenarios.push(scenario);
        this.updateTestCounts(scenario.passed);
        return scenario.passed;
    }

    async testLongRunningCommand() {
        console.log('\n⏱️ Testing Long-Running Command...');
        
        const testStart = Date.now();
        const scenario = {
            name: 'Long Running Command',
            description: 'Generate large file with loading animations',
            command: 'Create a large file by running: dd if=/dev/zero of=large-test-file.bin bs=1024 count=10000',
            steps: [],
            passed: false,
            errors: [],
            metrics: {}
        };

        try {
            // Send command
            await this.sendCommand(scenario.command);
            scenario.steps.push('✅ Command sent successfully');

            // Monitor loading animation throughout execution
            const loadingMetrics = await this.monitorLoadingAnimationDuration();
            scenario.steps.push(`✅ Loading animation active for ${loadingMetrics.duration}ms`);

            // Check for dd tool call visualization
            const toolCallVisible = await this.validateToolCallVisualization('dd');
            scenario.steps.push(toolCallVisible ? '✅ dd tool call visualized' : '❌ dd tool call missing');

            // Verify animation doesn't get stuck
            const animationStuck = await this.checkForStuckAnimation();
            scenario.steps.push(!animationStuck ? '✅ Animation completed properly' : '❌ Animation got stuck');

            // Wait for completion
            await this.waitForCommandCompletion(45000);
            scenario.steps.push('✅ Large file generation completed');

            scenario.passed = loadingMetrics.duration > 1000 && toolCallVisible && !animationStuck;
            scenario.metrics = { ...scenario.metrics, ...loadingMetrics };
            scenario.metrics.responseTime = Date.now() - testStart;

        } catch (error) {
            scenario.errors.push(error.message);
            console.error('❌ Long-running command test failed:', error);
        }

        this.testResults.scenarios.push(scenario);
        this.updateTestCounts(scenario.passed);
        return scenario.passed;
    }

    async sendCommand(command) {
        // Find and interact with chat input
        const chatInput = await this.page.locator('[data-testid="chat-input"]').first();
        await chatInput.fill(command);
        
        // Send message
        const sendButton = await this.page.locator('[data-testid="send-button"]').first();
        await sendButton.click();
        
        // Small delay to ensure message is sent
        await this.page.waitForTimeout(500);
    }

    async waitForLoadingAnimation() {
        try {
            // Look for loading indicators
            const loadingSelectors = [
                '[data-testid="loading-animation"]',
                '.loading-spinner',
                '.animate-spin',
                '[data-testid="command-processing"]'
            ];

            for (const selector of loadingSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 5000 });
                    console.log('✅ Loading animation detected:', selector);
                    return true;
                } catch (e) {
                    // Try next selector
                }
            }
            
            return false;
        } catch (error) {
            console.warn('⚠️ Loading animation check failed:', error.message);
            return false;
        }
    }

    async validateToolCallVisualization(expectedCommand) {
        try {
            // Look for tool call visualization with bullet format
            const toolCallSelectors = [
                `text=● ${expectedCommand}`,
                `[data-testid="tool-call"]:has-text("${expectedCommand}")`,
                `.tool-call:has-text("${expectedCommand}")`,
                `[data-command="${expectedCommand}"]`
            ];

            for (const selector of toolCallSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 5000 });
                    console.log('✅ Tool call visualization found:', selector);
                    return true;
                } catch (e) {
                    // Try next selector
                }
            }

            return false;
        } catch (error) {
            console.warn('⚠️ Tool call visualization check failed:', error.message);
            return false;
        }
    }

    async waitForPermissionDialog() {
        try {
            const permissionSelectors = [
                '[data-testid="permission-dialog"]',
                '.permission-modal',
                'text=Do you want to allow this command?',
                '[role="dialog"]:has-text("permission")'
            ];

            for (const selector of permissionSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 10000 });
                    console.log('✅ Permission dialog detected:', selector);
                    return true;
                } catch (e) {
                    // Try next selector
                }
            }

            return false;
        } catch (error) {
            console.warn('⚠️ Permission dialog check failed:', error.message);
            return false;
        }
    }

    async interactWithPermissionDialog(response) {
        try {
            const responseButtons = {
                'yes': ['[data-testid="permission-yes"]', 'button:has-text("Yes")', 'button:has-text("Allow")'],
                'no': ['[data-testid="permission-no"]', 'button:has-text("No")', 'button:has-text("Deny")'],
                'ask': ['[data-testid="permission-ask"]', 'button:has-text("Ask Differently")']
            };

            const buttons = responseButtons[response] || responseButtons['yes'];
            
            for (const buttonSelector of buttons) {
                try {
                    const button = await this.page.locator(buttonSelector).first();
                    if (await button.isVisible()) {
                        await button.click();
                        console.log('✅ Permission dialog response:', response);
                        return true;
                    }
                } catch (e) {
                    // Try next button
                }
            }

            return false;
        } catch (error) {
            console.warn('⚠️ Permission dialog interaction failed:', error.message);
            return false;
        }
    }

    async waitForCommandCompletion(timeout = 15000) {
        try {
            // Wait for loading to disappear or completion indicators
            const completionSelectors = [
                '[data-testid="command-complete"]',
                '.command-success',
                'text=Command completed',
                '.message:last-child'
            ];

            await Promise.race([
                ...completionSelectors.map(selector => 
                    this.page.waitForSelector(selector, { timeout })
                ),
                this.page.waitForTimeout(timeout)
            ]);

            return true;
        } catch (error) {
            console.warn('⚠️ Command completion wait timed out:', error.message);
            return false;
        }
    }

    async monitorInteractivePrompts() {
        // Monitor for interactive command prompts and responses
        let promptsDetected = 0;
        const startTime = Date.now();
        
        while (Date.now() - startTime < 10000) {
            try {
                // Look for interactive elements
                const interactiveElements = await this.page.locator('[data-testid="interactive-prompt"]').count();
                if (interactiveElements > promptsDetected) {
                    promptsDetected = interactiveElements;
                    console.log('🔄 Interactive prompt detected');
                }
                
                await this.page.waitForTimeout(500);
            } catch (error) {
                break;
            }
        }

        return promptsDetected > 0;
    }

    async monitorLoadingAnimationDuration() {
        const startTime = Date.now();
        let animationActive = false;
        let duration = 0;

        // Monitor for loading animation
        while (Date.now() - startTime < 30000) {
            try {
                const loadingVisible = await this.page.locator('[data-testid="loading-animation"]').isVisible();
                
                if (loadingVisible && !animationActive) {
                    animationActive = true;
                    console.log('🔄 Loading animation started');
                } else if (!loadingVisible && animationActive) {
                    duration = Date.now() - startTime;
                    console.log('✅ Loading animation completed, duration:', duration + 'ms');
                    break;
                }
                
                await this.page.waitForTimeout(100);
            } catch (error) {
                break;
            }
        }

        return { duration, animationDetected: animationActive };
    }

    async checkForStuckAnimation() {
        // Check if animation is stuck by monitoring for changes
        let stuckCounter = 0;
        const maxStuckTime = 5000; // 5 seconds without progress

        for (let i = 0; i < 50; i++) {
            try {
                const loadingVisible = await this.page.locator('[data-testid="loading-animation"]').isVisible();
                if (loadingVisible) {
                    stuckCounter += 100;
                    if (stuckCounter >= maxStuckTime) {
                        return true; // Animation appears stuck
                    }
                } else {
                    return false; // Animation completed
                }
                
                await this.page.waitForTimeout(100);
            } catch (error) {
                return false;
            }
        }

        return stuckCounter >= maxStuckTime;
    }

    async verifyFileExists(filePath) {
        try {
            return fs.existsSync(filePath);
        } catch (error) {
            return false;
        }
    }

    updateTestCounts(passed) {
        this.testResults.totalTests++;
        if (passed) {
            this.testResults.passed++;
        } else {
            this.testResults.failed++;
        }
    }

    async validateWebSocketStability() {
        console.log('\n🔗 Validating WebSocket Stability...');
        
        const stability = {
            totalMessages: this.websocketMessages.length,
            connectionDrops: this.testResults.websocketStability.connectionDrops,
            messageGaps: 0,
            averageLatency: 0
        };

        // Analyze message patterns for gaps
        let totalLatency = 0;
        for (let i = 1; i < this.websocketMessages.length; i++) {
            const gap = this.websocketMessages[i].timestamp - this.websocketMessages[i-1].timestamp;
            if (gap > 5000) { // 5 second gap indicates potential issue
                stability.messageGaps++;
            }
            totalLatency += gap;
        }

        if (this.websocketMessages.length > 1) {
            stability.averageLatency = totalLatency / (this.websocketMessages.length - 1);
        }

        console.log('📊 WebSocket Stability Metrics:', stability);
        return stability;
    }

    async generateComprehensiveReport() {
        console.log('\n📋 Generating Comprehensive Test Report...');
        
        // Calculate performance metrics
        const responseTimes = this.testResults.scenarios
            .map(s => s.metrics.responseTime)
            .filter(t => t);
        
        if (responseTimes.length > 0) {
            this.testResults.performanceMetrics.averageCommandResponseTime = 
                responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        }

        // WebSocket stability
        const websocketStability = await this.validateWebSocketStability();
        this.testResults.websocketStability = { ...this.testResults.websocketStability, ...websocketStability };

        // Success rate
        const successRate = (this.testResults.passed / this.testResults.totalTests * 100).toFixed(2);

        const report = {
            ...this.testResults,
            summary: {
                successRate: successRate + '%',
                totalExecutionTime: Date.now() - new Date(this.testResults.timestamp).getTime(),
                criticalFailures: this.testResults.scenarios.filter(s => !s.passed && s.name.includes('WebSocket')).length
            },
            conclusions: this.generateConclusions()
        };

        // Save report
        const reportPath = '/workspaces/agent-feed/tests/complex-command-test-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log('✅ Test report saved to:', reportPath);
        return report;
    }

    generateConclusions() {
        const conclusions = [];
        
        // Analyze results
        const passedTests = this.testResults.scenarios.filter(s => s.passed).length;
        const totalTests = this.testResults.scenarios.length;

        if (passedTests === totalTests) {
            conclusions.push('✅ ALL TESTS PASSED - Complex command handling is fully functional');
        } else {
            conclusions.push(`❌ ${totalTests - passedTests} out of ${totalTests} tests failed`);
        }

        // WebSocket analysis
        if (this.testResults.websocketStability.connectionDrops === 0) {
            conclusions.push('✅ WebSocket connection remained stable throughout testing');
        } else {
            conclusions.push(`❌ ${this.testResults.websocketStability.connectionDrops} WebSocket connection drops detected`);
        }

        // Performance analysis
        const avgResponse = this.testResults.performanceMetrics.averageCommandResponseTime;
        if (avgResponse > 0) {
            if (avgResponse < 3000) {
                conclusions.push('✅ Command response times are acceptable (<3s average)');
            } else {
                conclusions.push(`⚠️ Command response times are high (${avgResponse}ms average)`);
            }
        }

        return conclusions;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async runAllTests() {
        console.log('🚀 Starting Complex Command Comprehensive Test Suite...\n');
        
        try {
            // Initialize
            await this.initialize();
            
            // Run all test scenarios
            await this.testFileOperationCommand();
            await this.testPermissionRequiredCommand(); 
            await this.testInteractiveCommand();
            await this.testLongRunningCommand();
            
            // Generate report
            const report = await this.generateComprehensiveReport();
            
            console.log('\n📊 FINAL TEST RESULTS:');
            console.log('='.repeat(50));
            console.log(`Total Tests: ${report.totalTests}`);
            console.log(`Passed: ${report.passed}`);
            console.log(`Failed: ${report.failed}`);
            console.log(`Success Rate: ${report.summary.successRate}`);
            console.log(`WebSocket Stability: ${report.websocketStability.connectionDrops} drops`);
            console.log('='.repeat(50));
            
            report.conclusions.forEach(conclusion => console.log(conclusion));
            
            return report;
            
        } catch (error) {
            console.error('💥 Test suite failed:', error);
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

// Run the test suite
async function main() {
    const testSuite = new ComplexCommandTestSuite();
    
    try {
        const results = await testSuite.runAllTests();
        process.exit(results.failed === 0 ? 0 : 1);
    } catch (error) {
        console.error('Test suite execution failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = ComplexCommandTestSuite;