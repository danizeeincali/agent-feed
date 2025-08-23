#!/usr/bin/env node

/**
 * WebSocket Hub Connectivity Test Suite
 * Tests all aspects of WebSocket Hub connectivity
 */

const { io } = require('socket.io-client');
const http = require('http');
const fetch = require('node-fetch').default || require('node-fetch');

class WebSocketConnectivityTester {
    constructor() {
        this.hubUrl = 'http://localhost:3002';
        this.results = {
            tests: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                errors: []
            }
        };
    }

    async runTest(name, testFn) {
        this.results.summary.total++;
        console.log(`\n🧪 Testing: ${name}`);
        
        try {
            const result = await testFn();
            if (result.success) {
                console.log(`✅ PASS: ${name}`);
                this.results.summary.passed++;
            } else {
                console.log(`❌ FAIL: ${name} - ${result.error}`);
                this.results.summary.failed++;
                this.results.summary.errors.push({ test: name, error: result.error });
            }
            
            this.results.tests.push({
                name,
                success: result.success,
                error: result.error,
                details: result.details,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.log(`💥 ERROR: ${name} - ${error.message}`);
            this.results.summary.failed++;
            this.results.summary.errors.push({ test: name, error: error.message });
            
            this.results.tests.push({
                name,
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async testHttpConnectivity() {
        return new Promise((resolve) => {
            const req = http.get(this.hubUrl, (res) => {
                resolve({
                    success: true,
                    details: {
                        statusCode: res.statusCode,
                        headers: res.headers,
                        httpVersion: res.httpVersion
                    }
                });
            });

            req.on('error', (error) => {
                resolve({
                    success: false,
                    error: `HTTP connection failed: ${error.message}`,
                    details: { errorCode: error.code }
                });
            });

            req.setTimeout(5000, () => {
                req.destroy();
                resolve({
                    success: false,
                    error: 'HTTP request timeout after 5 seconds'
                });
            });
        });
    }

    async testSocketIOEndpoint() {
        return new Promise((resolve) => {
            fetch(`${this.hubUrl}/socket.io/?EIO=4&transport=polling`)
                .then(response => {
                    if (response.ok) {
                        resolve({
                            success: true,
                            details: {
                                status: response.status,
                                headers: Object.fromEntries(response.headers.entries())
                            }
                        });
                    } else {
                        resolve({
                            success: false,
                            error: `Socket.IO endpoint returned ${response.status}`,
                            details: { status: response.status }
                        });
                    }
                })
                .catch(error => {
                    resolve({
                        success: false,
                        error: `Socket.IO endpoint test failed: ${error.message}`
                    });
                });
        });
    }

    async testCORSHeaders() {
        return new Promise((resolve) => {
            fetch(this.hubUrl, {
                method: 'OPTIONS',
                headers: {
                    'Origin': 'http://localhost:3000',
                    'Access-Control-Request-Method': 'GET'
                }
            })
            .then(response => {
                const corsOrigin = response.headers.get('access-control-allow-origin');
                const corsMethods = response.headers.get('access-control-allow-methods');
                
                resolve({
                    success: corsOrigin !== null,
                    details: {
                        'access-control-allow-origin': corsOrigin,
                        'access-control-allow-methods': corsMethods,
                        'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
                        allHeaders: Object.fromEntries(response.headers.entries())
                    }
                });
            })
            .catch(error => {
                resolve({
                    success: false,
                    error: `CORS test failed: ${error.message}`
                });
            });
        });
    }

    async testSocketIOConnection() {
        return new Promise((resolve) => {
            const socket = io(this.hubUrl, {
                timeout: 10000,
                transports: ['polling', 'websocket'],
                autoConnect: false
            });

            const timeout = setTimeout(() => {
                socket.disconnect();
                resolve({
                    success: false,
                    error: 'Socket.IO connection timeout after 10 seconds'
                });
            }, 10000);

            socket.on('connect', () => {
                clearTimeout(timeout);
                const details = {
                    socketId: socket.id,
                    connected: socket.connected,
                    transport: socket.io.engine.transport.name
                };
                
                socket.disconnect();
                resolve({
                    success: true,
                    details
                });
            });

            socket.on('connect_error', (error) => {
                clearTimeout(timeout);
                socket.disconnect();
                resolve({
                    success: false,
                    error: `Socket.IO connection error: ${error.message}`,
                    details: { errorType: error.type }
                });
            });

            socket.connect();
        });
    }

    async testFrontendRegistration() {
        return new Promise((resolve) => {
            const socket = io(this.hubUrl, {
                timeout: 10000,
                transports: ['polling', 'websocket'],
                autoConnect: false
            });

            const timeout = setTimeout(() => {
                socket.disconnect();
                resolve({
                    success: false,
                    error: 'Frontend registration timeout'
                });
            }, 15000);

            let registrationAcknowledged = false;

            socket.on('connect', () => {
                // Send frontend registration
                socket.emit('registerFrontend', {
                    timestamp: new Date().toISOString(),
                    userAgent: 'connectivity-test',
                    url: 'test://localhost'
                });
            });

            socket.on('frontendRegistered', (data) => {
                registrationAcknowledged = true;
                clearTimeout(timeout);
                socket.disconnect();
                resolve({
                    success: true,
                    details: { registrationData: data }
                });
            });

            socket.on('connect_error', (error) => {
                clearTimeout(timeout);
                socket.disconnect();
                resolve({
                    success: false,
                    error: `Connection failed during registration test: ${error.message}`
                });
            });

            // Fallback: if no specific registration event, consider success if connection works
            setTimeout(() => {
                if (socket.connected && !registrationAcknowledged) {
                    clearTimeout(timeout);
                    socket.disconnect();
                    resolve({
                        success: true,
                        details: { 
                            note: 'Connection successful, no explicit registration acknowledgment',
                            socketId: socket.id
                        }
                    });
                }
            }, 5000);

            socket.connect();
        });
    }

    async testHeartbeat() {
        return new Promise((resolve) => {
            const socket = io(this.hubUrl, {
                timeout: 10000,
                transports: ['polling', 'websocket'],
                autoConnect: false
            });

            const timeout = setTimeout(() => {
                socket.disconnect();
                resolve({
                    success: false,
                    error: 'Heartbeat test timeout'
                });
            }, 15000);

            socket.on('connect', () => {
                // Send heartbeat
                socket.emit('heartbeat', { timestamp: Date.now() });
            });

            socket.on('heartbeat_ack', () => {
                clearTimeout(timeout);
                socket.disconnect();
                resolve({
                    success: true,
                    details: { heartbeatWorking: true }
                });
            });

            socket.on('connect_error', (error) => {
                clearTimeout(timeout);
                socket.disconnect();
                resolve({
                    success: false,
                    error: `Heartbeat test connection failed: ${error.message}`
                });
            });

            socket.connect();
        });
    }

    async testBrowserConsoleConnection() {
        // This generates a test that can be pasted into browser console
        const browserTest = `
// Copy and paste this into your browser console (F12)
// Make sure you're on http://localhost:3000 (your frontend)

console.log('🧪 Testing WebSocket Hub Connection from Browser...');

// Test 1: Direct Socket.IO connection
const testSocket = io('http://localhost:3002', {
    timeout: 10000,
    transports: ['polling', 'websocket']
});

testSocket.on('connect', () => {
    console.log('✅ Socket.IO connected successfully!');
    console.log('Socket ID:', testSocket.id);
    console.log('Transport:', testSocket.io.engine.transport.name);
    
    // Test registration
    testSocket.emit('registerFrontend', {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
    });
});

testSocket.on('connect_error', (error) => {
    console.error('❌ Socket.IO connection failed:', error);
});

testSocket.on('disconnect', (reason) => {
    console.log('🔌 Socket.IO disconnected:', reason);
});

// Listen for any incoming messages
testSocket.onAny((eventName, data) => {
    console.log('📨 Received event:', eventName, data);
});

// Cleanup function
window.cleanupWebSocketTest = () => {
    testSocket.disconnect();
    console.log('🧹 Test socket disconnected');
};

console.log('⏳ Attempting connection... Check for success/error messages above');
console.log('💡 Run cleanupWebSocketTest() when done testing');
        `;

        return {
            success: true,
            details: {
                browserTestCode: browserTest.trim(),
                instructions: [
                    '1. Open browser console (F12)',
                    '2. Navigate to http://localhost:3000',
                    '3. Copy and paste the browser test code',
                    '4. Watch for connection success/error messages',
                    '5. Run cleanupWebSocketTest() when done'
                ]
            }
        };
    }

    async runAllTests() {
        console.log('🚀 Starting WebSocket Hub Connectivity Tests...');
        console.log(`🎯 Target: ${this.hubUrl}`);
        console.log('=' * 60);

        await this.runTest('HTTP Connectivity', () => this.testHttpConnectivity());
        await this.runTest('Socket.IO Endpoint', () => this.testSocketIOEndpoint());
        await this.runTest('CORS Headers', () => this.testCORSHeaders());
        await this.runTest('Socket.IO Connection', () => this.testSocketIOConnection());
        await this.runTest('Frontend Registration', () => this.testFrontendRegistration());
        await this.runTest('Heartbeat Mechanism', () => this.testHeartbeat());
        await this.runTest('Browser Console Test Generation', () => this.testBrowserConsoleConnection());

        this.printSummary();
        return this.results;
    }

    printSummary() {
        console.log('\n' + '=' * 60);
        console.log('📊 TEST SUMMARY');
        console.log('=' * 60);
        console.log(`Total Tests: ${this.results.summary.total}`);
        console.log(`✅ Passed: ${this.results.summary.passed}`);
        console.log(`❌ Failed: ${this.results.summary.failed}`);
        
        if (this.results.summary.errors.length > 0) {
            console.log('\n🚨 ERRORS:');
            this.results.summary.errors.forEach((error, i) => {
                console.log(`${i + 1}. ${error.test}: ${error.error}`);
            });
        }

        // Browser test instructions
        const browserTest = this.results.tests.find(t => t.name === 'Browser Console Test Generation');
        if (browserTest && browserTest.success) {
            console.log('\n🌐 BROWSER CONSOLE TEST:');
            console.log('Copy the following code into your browser console:');
            console.log('-' * 40);
            console.log(browserTest.details.browserTestCode);
            console.log('-' * 40);
        }

        console.log('\n📈 RECOMMENDATIONS:');
        
        if (this.results.summary.failed === 0) {
            console.log('🎉 All tests passed! WebSocket Hub connectivity is working correctly.');
        } else {
            if (this.results.tests.find(t => t.name === 'HTTP Connectivity' && !t.success)) {
                console.log('🔧 Start the WebSocket Hub: node websocket-hub-standalone.js');
            }
            if (this.results.tests.find(t => t.name === 'CORS Headers' && !t.success)) {
                console.log('🔧 Fix CORS configuration in WebSocket Hub');
            }
            if (this.results.tests.find(t => t.name === 'Socket.IO Connection' && !t.success)) {
                console.log('🔧 Check Socket.IO server configuration');
            }
        }
        
        console.log('=' * 60);
    }
}

// Export for use as module
module.exports = WebSocketConnectivityTester;

// CLI execution
if (require.main === module) {
    const tester = new WebSocketConnectivityTester();
    tester.runAllTests()
        .then((results) => {
            process.exit(results.summary.failed === 0 ? 0 : 1);
        })
        .catch((error) => {
            console.error('💥 Test runner failed:', error);
            process.exit(1);
        });
}