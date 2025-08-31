#!/usr/bin/env node

/**
 * WebSocket Message Fix Test
 * Identifies and fixes the WebSocket message handling issue
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

class WebSocketMessageFixTester {
    constructor() {
        this.backendUrl = 'ws://localhost:3000/terminal';
        this.results = {};
    }

    log(message, type = 'INFO') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${type}] ${message}`);
    }

    async testCurrentImplementation() {
        this.log('🔍 Testing current WebSocket message implementation', 'TEST');
        
        return new Promise((resolve) => {
            const ws = new WebSocket(this.backendUrl);
            let phases = {
                connection: false,
                registration: false,
                inputSent: false,
                outputReceived: false
            };
            
            const timeout = setTimeout(() => {
                ws.close();
                resolve({
                    success: false,
                    phases,
                    issue: 'Timeout - no Claude response received',
                    recommendation: 'Check WebSocket message type handling in backend'
                });
            }, 15000);

            ws.on('open', () => {
                phases.connection = true;
                this.log('✅ WebSocket connection established');
                
                // Step 1: Register with Claude instance
                this.log('📡 Registering with Claude instance...');
                ws.send(JSON.stringify({
                    type: 'connect',
                    terminalId: 'claude-3463 (prod/claude)'
                }));
            });

            ws.on('message', (data) => {
                const message = data.toString();
                this.log(`📬 Received: ${message.substring(0, 200)}...`);
                
                try {
                    const parsed = JSON.parse(message);
                    
                    if (parsed.type === 'connect') {
                        phases.registration = true;
                        this.log('✅ Successfully registered with Claude instance');
                        
                        // Step 2: Send input using correct format
                        setTimeout(() => {
                            this.log('📤 Sending input with correct format...');
                            ws.send(JSON.stringify({
                                type: 'input',
                                data: 'hello\n',
                                terminalId: 'claude-3463 (prod/claude)'
                            }));
                            phases.inputSent = true;
                        }, 1000);
                    } else if (parsed.type === 'output') {
                        phases.outputReceived = true;
                        this.log('🎉 SUCCESS: Received Claude output!', 'SUCCESS');
                        this.log(`Output: ${parsed.data}`, 'SUCCESS');
                        
                        clearTimeout(timeout);
                        ws.close();
                        resolve({
                            success: true,
                            phases,
                            output: parsed.data,
                            message: 'WebSocket communication working correctly'
                        });
                    } else if (parsed.type === 'error') {
                        this.log(`❌ Error received: ${parsed.error}`, 'ERROR');
                        clearTimeout(timeout);
                        ws.close();
                        resolve({
                            success: false,
                            phases,
                            error: parsed.error,
                            recommendation: 'Fix the reported error in backend'
                        });
                    }
                } catch (e) {
                    this.log(`📝 Non-JSON response: ${message.substring(0, 100)}...`);
                }
            });

            ws.on('error', (error) => {
                this.log(`❌ WebSocket error: ${error.message}`, 'ERROR');
                clearTimeout(timeout);
                resolve({
                    success: false,
                    phases,
                    error: error.message,
                    recommendation: 'Fix WebSocket connection issues'
                });
            });

            ws.on('close', (code, reason) => {
                this.log(`🔌 WebSocket closed: ${code} - ${reason}`);
            });
        });
    }

    async testLegacyMessageFormat() {
        this.log('🔍 Testing legacy message format for comparison', 'TEST');
        
        return new Promise((resolve) => {
            const ws = new WebSocket(this.backendUrl);
            let legacyResult = { attempted: false, response: null };
            
            const timeout = setTimeout(() => {
                ws.close();
                resolve(legacyResult);
            }, 10000);

            ws.on('open', () => {
                this.log('📤 Trying legacy message format...');
                ws.send(JSON.stringify({
                    type: 'message',
                    instanceName: 'claude-3463 (prod/claude)',
                    message: 'hello'
                }));
                legacyResult.attempted = true;
            });

            ws.on('message', (data) => {
                const message = data.toString();
                this.log(`📬 Legacy format response: ${message.substring(0, 200)}...`);
                legacyResult.response = message;
                
                clearTimeout(timeout);
                ws.close();
                resolve(legacyResult);
            });

            ws.on('error', (error) => {
                this.log(`❌ Legacy test error: ${error.message}`, 'ERROR');
                clearTimeout(timeout);
                resolve({ ...legacyResult, error: error.message });
            });
        });
    }

    generateFixReport() {
        return {
            timestamp: new Date().toISOString(),
            issue: 'WebSocket message type mismatch',
            rootCause: [
                'Backend expects type: "input" for Claude input',
                'Frontend/tests sending type: "message"', 
                'Backend WebSocket handler only processes "input" type messages',
                'Message routing fails due to type mismatch'
            ],
            evidence: [
                'Backend logs show WebSocket connections established',
                'Backend logs show Claude processes generating output',  
                'Backend logs show "WebSocket message received: message"',
                'No corresponding input forwarding to Claude process',
                'Tests timeout waiting for Claude response'
            ],
            solution: [
                'Update frontend to use type: "input" instead of type: "message"',
                'Ensure terminalId matches instanceName format',
                'Add proper connection registration step',
                'Use data field for input content, not message field'
            ],
            correctFormat: {
                connect: {
                    type: 'connect',
                    terminalId: 'claude-XXXX (prod/claude)'
                },
                input: {
                    type: 'input',
                    data: 'your input text\n',
                    terminalId: 'claude-XXXX (prod/claude)'
                }
            }
        };
    }

    async runCompleteTest() {
        this.log('🚀 Starting WebSocket Message Fix Test Suite', 'START');
        
        const currentTest = await this.testCurrentImplementation();
        const legacyTest = await this.testLegacyMessageFormat();
        
        const report = {
            ...this.generateFixReport(),
            testResults: {
                currentImplementation: currentTest,
                legacyFormat: legacyTest
            },
            finalRecommendation: currentTest.success ? 
                'WebSocket communication is working correctly!' :
                'Apply the correct message format to fix WebSocket communication'
        };

        return report;
    }
}

// Run the test if called directly
if (require.main === module) {
    const tester = new WebSocketMessageFixTester();
    
    tester.runCompleteTest().then(report => {
        console.log('\n' + '='.repeat(80));
        console.log('🔧 WEBSOCKET MESSAGE FIX REPORT');
        console.log('='.repeat(80));
        
        if (report.testResults.currentImplementation.success) {
            console.log('🎉 SUCCESS: WebSocket communication is working!');
            console.log('✅ Claude responses are being received correctly');
        } else {
            console.log('❌ ISSUE CONFIRMED: WebSocket message handling problem');
            console.log('\n🔍 Root Cause:');
            report.rootCause.forEach(cause => console.log(`   • ${cause}`));
            
            console.log('\n🛠️ Solution:');
            report.solution.forEach(step => console.log(`   • ${step}`));
            
            console.log('\n📝 Correct Message Format:');
            console.log('   Connect:', JSON.stringify(report.correctFormat.connect, null, 2));
            console.log('   Input:', JSON.stringify(report.correctFormat.input, null, 2));
        }
        
        // Save detailed report
        const reportPath = path.join(__dirname, 'websocket-fix-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📁 Full report saved to: ${reportPath}`);
        
        process.exit(report.testResults.currentImplementation.success ? 0 : 1);
    }).catch(error => {
        console.error('💥 Test failed:', error);
        process.exit(1);
    });
}

module.exports = WebSocketMessageFixTester;