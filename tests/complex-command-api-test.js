#!/usr/bin/env node

/**
 * COMPLEX COMMAND API TESTING SUITE
 * Direct WebSocket API testing for complex command scenarios
 * Tests the backend functionality without requiring a browser
 */

import WebSocket from 'ws';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

class ComplexCommandAPITestSuite {
    constructor() {
        this.testResults = {
            timestamp: new Date().toISOString(),
            testSuite: 'Complex Command API Test Suite',
            scenarios: [],
            totalTests: 0,
            passed: 0,
            failed: 0,
            websocketStability: {
                connectionDrops: 0,
                reconnections: 0,
                messageFailures: 0,
                totalMessages: 0
            },
            performanceMetrics: {
                averageCommandResponseTime: 0,
                connectionTime: 0,
                messageLatency: []
            }
        };
        
        this.ws = null;
        this.connectionTime = 0;
        this.messageQueue = [];
        this.activeProcesses = new Map();
        this.permissionRequests = new Map();
    }

    async initialize() {
        console.log('🚀 Initializing Complex Command API Test Suite...');
        
        const connectionStart = Date.now();
        
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket('ws://localhost:3001');
            
            this.ws.on('open', () => {
                this.connectionTime = Date.now() - connectionStart;
                console.log(`✅ WebSocket connected in ${this.connectionTime}ms`);
                this.setupMessageHandlers();
                resolve(true);
            });

            this.ws.on('error', (error) => {
                console.error('❌ WebSocket connection failed:', error.message);
                reject(error);
            });

            this.ws.on('close', () => {
                console.log('🔗 WebSocket connection closed');
                this.testResults.websocketStability.connectionDrops++;
            });
        });
    }

    setupMessageHandlers() {
        this.ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleMessage(message);
                this.testResults.websocketStability.totalMessages++;
            } catch (error) {
                console.error('📨 Message parsing error:', error);
                this.testResults.websocketStability.messageFailures++;
            }
        });
    }

    handleMessage(message) {
        const { type, payload } = message;
        
        console.log(`📨 Received ${type} message`);
        
        switch (type) {
            case 'connection':
                console.log('✅ Connection confirmed:', payload.connectionId);
                break;
                
            case 'loading':
                console.log('⏳ Loading started for:', payload.command);
                break;
                
            case 'permission_required':
                console.log('🔐 Permission required for:', payload.command);
                this.permissionRequests.set(payload.processId, payload);
                break;
                
            case 'tool_call':
                console.log(`🔧 Tool call: ${payload.displayText} (${payload.status})`);
                break;
                
            case 'command_output':
                if (payload.chunk.trim()) {
                    console.log(`📤 Output: ${payload.chunk.trim()}`);
                }
                break;
                
            case 'command_complete':
                console.log(`✅ Command completed with code: ${payload.exitCode}`);
                this.activeProcesses.set(payload.processId, payload);
                break;
                
            case 'command_error':
                console.log(`❌ Command error: ${payload.error}`);
                break;
                
            default:
                console.log(`📋 Unknown message type: ${type}`);
        }
    }

    async sendMessage(message) {
        const messageStart = Date.now();
        
        return new Promise((resolve, reject) => {
            if (this.ws.readyState !== WebSocket.OPEN) {
                reject(new Error('WebSocket not connected'));
                return;
            }

            this.ws.send(JSON.stringify(message), (error) => {
                if (error) {
                    reject(error);
                } else {
                    const latency = Date.now() - messageStart;
                    this.testResults.performanceMetrics.messageLatency.push(latency);
                    resolve();
                }
            });
        });
    }

    async waitForResponse(condition, timeout = 10000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (condition()) {
                return true;
            }
            await this.sleep(100);
        }
        
        return false;
    }

    async testFileOperationCommand() {
        console.log('\n📁 Testing File Operation Command...');
        
        const testStart = Date.now();
        const scenario = {
            name: 'File Operation Command',
            description: 'Create file with specified content',
            command: 'echo "Hello from complex command test" > test-user-input.txt',
            steps: [],
            passed: false,
            errors: [],
            metrics: {}
        };

        try {
            // Send command
            await this.sendMessage({
                type: 'command',
                payload: {
                    command: scenario.command,
                    requiresPermission: false
                }
            });
            scenario.steps.push('✅ Command sent successfully');

            // Wait for tool call visualization
            const toolCallReceived = await this.waitForResponse(() => {
                return this.messageQueue.some(msg => msg.type === 'tool_call');
            }, 5000);
            scenario.steps.push(toolCallReceived ? '✅ Tool call received' : '❌ Tool call not received');

            // Wait for completion
            const completed = await this.waitForResponse(() => {
                return Array.from(this.activeProcesses.values()).some(p => p.success !== undefined);
            }, 15000);
            scenario.steps.push(completed ? '✅ Command completed' : '❌ Command timeout');

            // Verify file was created
            let fileExists = false;
            try {
                await fs.access('/workspaces/agent-feed/test-user-input.txt');
                const content = await fs.readFile('/workspaces/agent-feed/test-user-input.txt', 'utf8');
                fileExists = content.includes('Hello from complex command test');
                scenario.steps.push(fileExists ? '✅ File created with correct content' : '❌ File content incorrect');
            } catch (error) {
                scenario.steps.push('❌ File not created');
            }

            scenario.passed = toolCallReceived && completed && fileExists;
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
            description: 'npm install with permission handling',
            command: 'npm install lodash',
            steps: [],
            passed: false,
            errors: [],
            metrics: {}
        };

        try {
            // Clear permission requests
            this.permissionRequests.clear();

            // Send command
            await this.sendMessage({
                type: 'command',
                payload: {
                    command: scenario.command,
                    requiresPermission: true
                }
            });
            scenario.steps.push('✅ Command sent successfully');

            // Wait for permission request
            const permissionReceived = await this.waitForResponse(() => {
                return this.permissionRequests.size > 0;
            }, 10000);
            scenario.steps.push(permissionReceived ? '✅ Permission request received' : '❌ Permission request not received');

            if (permissionReceived) {
                const permissionStart = Date.now();
                const processId = Array.from(this.permissionRequests.keys())[0];
                
                // Respond with permission
                await this.sendMessage({
                    type: 'permission_response',
                    payload: {
                        processId,
                        response: 'yes'
                    }
                });
                scenario.metrics.permissionResponseTime = Date.now() - permissionStart;
                scenario.steps.push('✅ Permission granted');

                // Wait for command execution
                const completed = await this.waitForResponse(() => {
                    return Array.from(this.activeProcesses.values()).some(p => p.processId === processId);
                }, 30000);
                scenario.steps.push(completed ? '✅ npm command executed' : '❌ npm command timeout');
            }

            scenario.passed = permissionReceived;
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
            description: 'git init with configuration',
            command: 'git init test-repo && cd test-repo && git config user.name "Test User" && git config user.email "test@example.com"',
            steps: [],
            passed: false,
            errors: [],
            metrics: {}
        };

        try {
            // Send command
            await this.sendMessage({
                type: 'command',
                payload: {
                    command: scenario.command,
                    requiresPermission: false
                }
            });
            scenario.steps.push('✅ Command sent successfully');

            // Wait for git tool call
            const toolCallReceived = await this.waitForResponse(() => {
                return this.messageQueue.some(msg => 
                    msg.type === 'tool_call' && msg.payload.toolName === 'git'
                );
            }, 5000);
            scenario.steps.push(toolCallReceived ? '✅ git tool call received' : '❌ git tool call not received');

            // Wait for completion
            const completed = await this.waitForResponse(() => {
                return Array.from(this.activeProcesses.values()).some(p => p.success !== undefined);
            }, 20000);
            scenario.steps.push(completed ? '✅ git commands completed' : '❌ git commands timeout');

            // Verify git repo was created
            let gitRepoExists = false;
            try {
                await fs.access('/workspaces/agent-feed/test-repo/.git');
                gitRepoExists = true;
                scenario.steps.push('✅ Git repository created');
            } catch (error) {
                scenario.steps.push('❌ Git repository not created');
            }

            scenario.passed = toolCallReceived && completed && gitRepoExists;
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
            description: 'Generate large file to test loading states',
            command: 'dd if=/dev/zero of=large-test-file.bin bs=1024 count=5000',
            steps: [],
            passed: false,
            errors: [],
            metrics: {}
        };

        try {
            let loadingStateReceived = false;
            let toolCallReceived = false;
            
            // Set up message monitoring
            const originalHandler = this.handleMessage.bind(this);
            this.handleMessage = (message) => {
                if (message.type === 'loading') loadingStateReceived = true;
                if (message.type === 'tool_call' && message.payload.toolName === 'dd') toolCallReceived = true;
                originalHandler(message);
            };

            // Send command
            await this.sendMessage({
                type: 'command',
                payload: {
                    command: scenario.command,
                    requiresPermission: false
                }
            });
            scenario.steps.push('✅ Command sent successfully');

            // Wait for loading state
            await this.sleep(1000); // Give time for loading state
            scenario.steps.push(loadingStateReceived ? '✅ Loading state received' : '❌ Loading state not received');
            scenario.steps.push(toolCallReceived ? '✅ dd tool call received' : '❌ dd tool call not received');

            // Wait for completion
            const completed = await this.waitForResponse(() => {
                return Array.from(this.activeProcesses.values()).some(p => p.success !== undefined);
            }, 45000);
            scenario.steps.push(completed ? '✅ Large file generation completed' : '❌ Large file generation timeout');

            // Verify file was created
            let fileExists = false;
            try {
                const stats = await fs.stat('/workspaces/agent-feed/large-test-file.bin');
                fileExists = stats.size > 1024 * 1000; // At least 1MB
                scenario.steps.push(fileExists ? '✅ Large file created' : '❌ Large file not created');
            } catch (error) {
                scenario.steps.push('❌ Large file not found');
            }

            scenario.passed = loadingStateReceived && toolCallReceived && completed && fileExists;
            scenario.metrics.responseTime = Date.now() - testStart;

            // Restore original handler
            this.handleMessage = originalHandler;

        } catch (error) {
            scenario.errors.push(error.message);
            console.error('❌ Long-running command test failed:', error);
        }

        this.testResults.scenarios.push(scenario);
        this.updateTestCounts(scenario.passed);
        return scenario.passed;
    }

    async testWebSocketStability() {
        console.log('\n🔗 Testing WebSocket Stability...');
        
        const scenario = {
            name: 'WebSocket Stability Test',
            description: 'Test connection stability with multiple commands',
            steps: [],
            passed: false,
            errors: [],
            metrics: {}
        };

        try {
            const initialConnections = this.testResults.websocketStability.connectionDrops;
            const commands = [
                'echo "test1"',
                'echo "test2"',
                'echo "test3"',
                'ls -la',
                'pwd'
            ];

            for (let i = 0; i < commands.length; i++) {
                await this.sendMessage({
                    type: 'command',
                    payload: { command: commands[i] }
                });
                
                await this.sleep(500); // Small delay between commands
            }

            // Wait for all commands to complete
            await this.sleep(5000);

            const finalConnections = this.testResults.websocketStability.connectionDrops;
            const stableConnection = finalConnections === initialConnections;
            
            scenario.steps.push(stableConnection ? '✅ WebSocket remained stable' : '❌ WebSocket connection dropped');
            scenario.steps.push(`📊 Total messages sent/received: ${this.testResults.websocketStability.totalMessages}`);
            scenario.steps.push(`📊 Message failures: ${this.testResults.websocketStability.messageFailures}`);

            scenario.passed = stableConnection && this.testResults.websocketStability.messageFailures === 0;

        } catch (error) {
            scenario.errors.push(error.message);
            console.error('❌ WebSocket stability test failed:', error);
        }

        this.testResults.scenarios.push(scenario);
        this.updateTestCounts(scenario.passed);
        return scenario.passed;
    }

    updateTestCounts(passed) {
        this.testResults.totalTests++;
        if (passed) {
            this.testResults.passed++;
        } else {
            this.testResults.failed++;
        }
    }

    async generateReport() {
        console.log('\n📋 Generating Test Report...');
        
        // Calculate performance metrics
        const responseTimes = this.testResults.scenarios
            .map(s => s.metrics.responseTime)
            .filter(t => t);
        
        if (responseTimes.length > 0) {
            this.testResults.performanceMetrics.averageCommandResponseTime = 
                responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        }

        this.testResults.performanceMetrics.connectionTime = this.connectionTime;

        // Average message latency
        const latencies = this.testResults.performanceMetrics.messageLatency;
        if (latencies.length > 0) {
            this.testResults.performanceMetrics.averageMessageLatency = 
                latencies.reduce((a, b) => a + b, 0) / latencies.length;
        }

        const successRate = (this.testResults.passed / this.testResults.totalTests * 100).toFixed(2);

        const report = {
            ...this.testResults,
            summary: {
                successRate: successRate + '%',
                totalExecutionTime: Date.now() - new Date(this.testResults.timestamp).getTime(),
                criticalFailures: this.testResults.scenarios.filter(s => !s.passed).length
            },
            conclusions: this.generateConclusions()
        };

        // Save report
        const reportPath = '/workspaces/agent-feed/tests/complex-command-api-test-report.json';
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

        console.log('✅ Test report saved to:', reportPath);
        return report;
    }

    generateConclusions() {
        const conclusions = [];
        
        const passedTests = this.testResults.scenarios.filter(s => s.passed).length;
        const totalTests = this.testResults.scenarios.length;

        if (passedTests === totalTests) {
            conclusions.push('✅ ALL TESTS PASSED - Complex command handling API is fully functional');
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
            if (avgResponse < 5000) {
                conclusions.push('✅ Command response times are acceptable (<5s average)');
            } else {
                conclusions.push(`⚠️ Command response times are high (${avgResponse}ms average)`);
            }
        }

        // Message reliability
        const messageFailureRate = this.testResults.websocketStability.messageFailures / 
                                  this.testResults.websocketStability.totalMessages;
        if (messageFailureRate === 0) {
            conclusions.push('✅ All WebSocket messages processed successfully');
        } else {
            conclusions.push(`⚠️ ${(messageFailureRate * 100).toFixed(2)}% message failure rate`);
        }

        return conclusions;
    }

    async cleanup() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
        }
        
        // Clean up test files
        try {
            await fs.unlink('/workspaces/agent-feed/test-user-input.txt');
        } catch (e) {}
        
        try {
            await fs.unlink('/workspaces/agent-feed/large-test-file.bin');
        } catch (e) {}
        
        try {
            await execAsync('rm -rf /workspaces/agent-feed/test-repo');
        } catch (e) {}
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async runAllTests() {
        console.log('🚀 Starting Complex Command API Test Suite...\n');
        
        try {
            // Initialize connection
            await this.initialize();
            
            // Run all test scenarios
            await this.testFileOperationCommand();
            await this.testPermissionRequiredCommand();
            await this.testInteractiveCommand();
            await this.testLongRunningCommand();
            await this.testWebSocketStability();
            
            // Generate report
            const report = await this.generateReport();
            
            console.log('\n📊 FINAL TEST RESULTS:');
            console.log('='.repeat(60));
            console.log(`Total Tests: ${report.totalTests}`);
            console.log(`Passed: ${report.passed}`);
            console.log(`Failed: ${report.failed}`);
            console.log(`Success Rate: ${report.summary.successRate}`);
            console.log(`Connection Time: ${report.performanceMetrics.connectionTime}ms`);
            console.log(`Average Response Time: ${report.performanceMetrics.averageCommandResponseTime}ms`);
            console.log(`WebSocket Messages: ${report.websocketStability.totalMessages}`);
            console.log(`Connection Drops: ${report.websocketStability.connectionDrops}`);
            console.log(`Message Failures: ${report.websocketStability.messageFailures}`);
            console.log('='.repeat(60));
            
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
    const testSuite = new ComplexCommandAPITestSuite();
    
    try {
        const results = await testSuite.runAllTests();
        process.exit(results.failed === 0 ? 0 : 1);
    } catch (error) {
        console.error('Test suite execution failed:', error);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default ComplexCommandAPITestSuite;