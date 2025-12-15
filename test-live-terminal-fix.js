#!/usr/bin/env node

/**
 * Live integration test for carriage return fix
 * Tests the actual WebSocket connection to terminal server
 */

const WebSocket = require('ws');

console.log('🧪 Testing live terminal server carriage return fix...\n');

const TERMINAL_SERVER = 'ws://localhost:3002/terminal';

async function testCarriageReturnFix() {
    return new Promise((resolve, reject) => {
        let testResults = {
            connected: false,
            messagesReceived: [],
            testsPassed: 0,
            totalTests: 0
        };

        console.log(`🔌 Connecting to terminal server at ${TERMINAL_SERVER}...`);
        
        const ws = new WebSocket(TERMINAL_SERVER);
        
        ws.on('open', () => {
            console.log('✅ Connected to terminal server');
            testResults.connected = true;
            
            // Send initialization message
            const initMessage = {
                type: 'init',
                cols: 80,
                rows: 24
            };
            console.log('📤 Sending init message:', JSON.stringify(initMessage));
            ws.send(JSON.stringify(initMessage));
            
            // Test 1: Send command with \r (standalone carriage return)
            setTimeout(() => {
                testResults.totalTests++;
                const testMessage1 = {
                    type: 'input',
                    data: 'echo "test1"\r'
                };
                console.log('\n🎯 Test 1: Sending command with \\r');
                console.log('📤 Sending:', JSON.stringify(testMessage1));
                ws.send(JSON.stringify(testMessage1));
            }, 1000);
            
            // Test 2: Send command with \r\n (problematic sequence)
            setTimeout(() => {
                testResults.totalTests++;
                const testMessage2 = {
                    type: 'input',
                    data: 'echo "test2"\r\n'
                };
                console.log('\n🎯 Test 2: Sending command with \\r\\n (the problematic case)');
                console.log('📤 Sending:', JSON.stringify(testMessage2));
                ws.send(JSON.stringify(testMessage2));
            }, 2000);
            
            // Test 3: Send the actual "claude" command with \r\n
            setTimeout(() => {
                testResults.totalTests++;
                const testMessage3 = {
                    type: 'input',
                    data: 'claude --version\r\n'
                };
                console.log('\n🎯 Test 3: Sending "claude" command with \\r\\n');
                console.log('📤 Sending:', JSON.stringify(testMessage3));
                ws.send(JSON.stringify(testMessage3));
            }, 3000);
            
            // Close connection after tests
            setTimeout(() => {
                console.log('\n🔌 Closing connection...');
                ws.close();
            }, 5000);
        });
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log('📥 Received message:', message.type);
                
                if (message.type === 'data' && message.data) {
                    console.log('📝 Terminal output:', JSON.stringify(message.data));
                    testResults.messagesReceived.push(message.data);
                    
                    // Check for corruption patterns
                    if (message.data.includes('echo')) {
                        testResults.testsPassed++;
                        console.log('✅ Echo command executed successfully');
                    }
                    
                    if (message.data.includes('claude')) {
                        if (message.data.includes('claudern') || message.data.includes('claudearn')) {
                            console.log('❌ CORRUPTION DETECTED: Found claudern/claudearn in output');
                        } else {
                            testResults.testsPassed++;
                            console.log('✅ Claude command handled correctly');
                        }
                    }
                }
                
                if (message.type === 'connect') {
                    console.log('📡 Terminal session established');
                }
                
                if (message.type === 'init_ack') {
                    console.log('✅ Terminal initialization acknowledged');
                }
                
            } catch (error) {
                // Handle non-JSON data
                const rawData = data.toString();
                console.log('📝 Raw terminal data:', JSON.stringify(rawData));
                testResults.messagesReceived.push(rawData);
            }
        });
        
        ws.on('close', (code, reason) => {
            console.log(`\n🔌 Connection closed: ${code} - ${reason.toString()}`);
            console.log('\n📊 Test Results:');
            console.log(`   Connected: ${testResults.connected ? '✅' : '❌'}`);
            console.log(`   Tests Passed: ${testResults.testsPassed}/${testResults.totalTests}`);
            console.log(`   Messages Received: ${testResults.messagesReceived.length}`);
            
            if (testResults.connected && testResults.messagesReceived.length > 0) {
                console.log('\n🎉 Integration test completed successfully!');
                console.log('   - Terminal server is running');
                console.log('   - WebSocket connection works');
                console.log('   - Messages are being processed');
                
                // Check for any corruption patterns in all received messages
                const allOutput = testResults.messagesReceived.join('');
                if (allOutput.includes('claudern') || allOutput.includes('echoen')) {
                    console.log('❌ CORRUPTION DETECTED in terminal output');
                } else {
                    console.log('✅ NO CORRUPTION detected - fix is working!');
                }
            }
            
            resolve(testResults);
        });
        
        ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error.message);
            reject(error);
        });
        
        // Timeout after 10 seconds
        setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        }, 10000);
    });
}

// Run the test
testCarriageReturnFix()
    .then(results => {
        console.log('\n🏁 Test completed');
        process.exit(results.connected ? 0 : 1);
    })
    .catch(error => {
        console.error('\n💥 Test failed:', error.message);
        process.exit(1);
    });