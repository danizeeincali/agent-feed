#!/usr/bin/env node

/**
 * Final Working WebSocket Test
 * Uses correct message format and actual running instances
 */

const WebSocket = require('ws');
const http = require('http');

class FinalWebSocketTest {
    constructor() {
        this.backendUrl = 'ws://localhost:3000/terminal';
        this.restUrl = 'http://localhost:3000';
    }

    log(message, type = 'INFO') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${type}] ${message}`);
    }

    async getRunningInstances() {
        return new Promise((resolve) => {
            const req = http.request({
                hostname: 'localhost',
                port: 3000,
                path: '/api/claude/instances',
                method: 'GET'
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const instances = JSON.parse(data);
                        resolve(instances);
                    } catch (e) {
                        resolve([]);
                    }
                });
            });
            req.on('error', () => resolve([]));
            req.end();
        });
    }

    async testWithRealInstance() {
        // Get actual running instances
        const instances = await this.getRunningInstances();
        this.log(`📋 Found ${instances.length} running instances`);
        
        if (instances.length === 0) {
            this.log('❌ No running Claude instances found!', 'ERROR');
            return { success: false, error: 'No instances available' };
        }

        const targetInstance = instances[0];
        this.log(`🎯 Using instance: ${targetInstance}`);

        return new Promise((resolve) => {
            const ws = new WebSocket(this.backendUrl);
            let testPhase = 'connecting';
            let result = { success: false, phases: {}, output: null, error: null };

            const timeout = setTimeout(() => {
                this.log('⏰ Test timeout - closing connection', 'WARN');
                ws.close();
                resolve({ ...result, error: 'Timeout', phase: testPhase });
            }, 20000);

            ws.on('open', () => {
                testPhase = 'connected';
                result.phases.connection = true;
                this.log('✅ WebSocket connection established');
                
                // Step 1: Connect to Claude instance
                this.log('📡 Connecting to Claude instance...');
                ws.send(JSON.stringify({
                    type: 'connect',
                    terminalId: targetInstance
                }));
                testPhase = 'registering';
            });

            ws.on('message', (data) => {
                const message = data.toString();
                this.log(`📬 Received: ${message}`);

                try {
                    const parsed = JSON.parse(message);
                    
                    if (parsed.type === 'connect' && parsed.connectionType === 'websocket') {
                        testPhase = 'registered';
                        result.phases.registration = true;
                        this.log('✅ Successfully connected to Claude instance');
                        
                        // Step 2: Send test input
                        setTimeout(() => {
                            this.log('📤 Sending test input: "hello"');
                            ws.send(JSON.stringify({
                                type: 'input',
                                data: 'hello\n',
                                terminalId: targetInstance
                            }));
                            testPhase = 'input-sent';
                            result.phases.inputSent = true;
                        }, 1000);
                        
                    } else if (parsed.type === 'output') {
                        testPhase = 'success';
                        result.phases.outputReceived = true;
                        result.output = parsed.data;
                        result.success = true;
                        
                        this.log('🎉 SUCCESS: Received Claude output!', 'SUCCESS');
                        this.log(`Output: "${parsed.data.trim()}"`, 'SUCCESS');
                        
                        clearTimeout(timeout);
                        setTimeout(() => ws.close(), 1000);
                        resolve(result);
                        
                    } else if (parsed.type === 'error') {
                        testPhase = 'error';
                        result.error = parsed.error;
                        this.log(`❌ Error: ${parsed.error}`, 'ERROR');
                        
                        clearTimeout(timeout);
                        ws.close();
                        resolve(result);
                    }
                } catch (e) {
                    this.log(`📝 Raw response: ${message.substring(0, 200)}...`);
                }
            });

            ws.on('error', (error) => {
                this.log(`❌ WebSocket error: ${error.message}`, 'ERROR');
                result.error = error.message;
                clearTimeout(timeout);
                resolve(result);
            });

            ws.on('close', (code, reason) => {
                this.log(`🔌 Connection closed: ${code} - ${reason}`);
                if (!result.success && !result.error) {
                    result.error = `Connection closed during ${testPhase}`;
                }
            });
        });
    }

    generateSummaryReport(testResult) {
        const report = {
            timestamp: new Date().toISOString(),
            testResult,
            summary: testResult.success ? 
                '🎉 SUCCESS: Complete WebSocket data flow working correctly!' :
                '❌ FAILED: Issues remain in WebSocket communication',
            
            dataFlowStatus: {
                webSocketConnection: testResult.phases.connection || false,
                instanceRegistration: testResult.phases.registration || false,
                inputTransmission: testResult.phases.inputSent || false,
                claudeResponse: testResult.phases.outputReceived || false
            },

            nextSteps: testResult.success ? [
                '✅ WebSocket communication is fully functional',
                '✅ Claude is processing input and returning responses',
                '✅ Frontend can now use this working pattern',
                '🔧 Update frontend components to use correct message format'
            ] : [
                '🔧 Debug the specific failure point: ' + (testResult.error || 'Unknown'),
                '🔧 Check Claude instance availability and status',
                '🔧 Verify backend WebSocket message routing',
                '🔧 Review Claude process input/output streams'
            ]
        };

        return report;
    }
}

// Run the final test
if (require.main === module) {
    const tester = new FinalWebSocketTest();
    
    console.log('🚀 Running Final WebSocket Communication Test...\n');
    
    tester.testWithRealInstance().then(result => {
        const report = tester.generateSummaryReport(result);
        
        console.log('\n' + '='.repeat(80));
        console.log('📊 FINAL WEBSOCKET TEST RESULTS');
        console.log('='.repeat(80));
        
        console.log(report.summary);
        
        console.log('\n📈 Data Flow Status:');
        Object.entries(report.dataFlowStatus).forEach(([step, status]) => {
            console.log(`   ${status ? '✅' : '❌'} ${step.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        });
        
        if (result.output) {
            console.log(`\n🎯 Claude Response: "${result.output.trim()}"`);
        }
        
        if (result.error) {
            console.log(`\n❌ Error Details: ${result.error}`);
        }
        
        console.log('\n🎯 Next Steps:');
        report.nextSteps.forEach(step => console.log(`   ${step}`));
        
        // Save report
        const fs = require('fs');
        const path = require('path');
        const reportPath = path.join(__dirname, 'final-websocket-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📁 Detailed report: ${reportPath}`);
        
        process.exit(result.success ? 0 : 1);
    }).catch(error => {
        console.error('💥 Final test failed:', error);
        process.exit(1);
    });
}

module.exports = FinalWebSocketTest;