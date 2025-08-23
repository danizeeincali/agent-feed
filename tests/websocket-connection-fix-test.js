#!/usr/bin/env node

/**
 * WebSocket Connection Fix Test
 * Tests both port 3001 (current hub) and 3002 (frontend expectation)
 */

const { io } = require('socket.io-client');
const http = require('http');

class ConnectionFixTester {
    constructor() {
        this.results = [];
    }

    async testPort(port, description) {
        const url = `http://localhost:${port}`;
        console.log(`\n🧪 Testing ${description} on port ${port}`);
        console.log(`   URL: ${url}`);

        // Test HTTP health first
        const httpWorking = await this.testHttpHealth(url);
        console.log(`   HTTP Health: ${httpWorking ? '✅ Working' : '❌ Failed'}`);

        if (!httpWorking) {
            this.results.push({
                port,
                description,
                httpHealth: false,
                socketConnection: false,
                issue: 'HTTP health check failed'
            });
            return false;
        }

        // Test Socket.IO connection
        const socketWorking = await this.testSocketConnection(url);
        console.log(`   Socket.IO: ${socketWorking ? '✅ Working' : '❌ Failed'}`);

        const result = {
            port,
            description,
            httpHealth: httpWorking,
            socketConnection: socketWorking,
            issue: socketWorking ? null : 'Socket.IO connection failed'
        };
        
        this.results.push(result);
        return socketWorking;
    }

    async testHttpHealth(url) {
        return new Promise((resolve) => {
            const req = http.get(`${url}/health`, (res) => {
                resolve(res.statusCode === 200);
            });
            
            req.on('error', () => resolve(false));
            req.setTimeout(3000, () => {
                req.destroy();
                resolve(false);
            });
        });
    }

    async testSocketConnection(url) {
        return new Promise((resolve) => {
            const socket = io(url, {
                timeout: 5000,
                transports: ['polling', 'websocket'],
                autoConnect: false
            });

            const timeout = setTimeout(() => {
                socket.disconnect();
                resolve(false);
            }, 5000);

            socket.on('connect', () => {
                clearTimeout(timeout);
                
                // Test frontend registration
                socket.emit('registerFrontend', {
                    timestamp: new Date().toISOString(),
                    userAgent: 'connection-fix-test',
                    url: 'test://localhost'
                });
                
                setTimeout(() => {
                    socket.disconnect();
                    resolve(true);
                }, 500);
            });

            socket.on('connect_error', () => {
                clearTimeout(timeout);
                socket.disconnect();
                resolve(false);
            });

            socket.connect();
        });
    }

    async runAllTests() {
        console.log('🚀 WebSocket Connection Fix Tests');
        console.log('================================');

        // Test current hub port
        await this.testPort(3001, 'Current WebSocket Hub');
        
        // Test expected frontend port
        await this.testPort(3002, 'Frontend Expected Port');

        this.generateReport();
        return this.results;
    }

    generateReport() {
        console.log('\n📊 CONNECTION FIX REPORT');
        console.log('========================');

        const workingPorts = this.results.filter(r => r.socketConnection);
        const failedPorts = this.results.filter(r => !r.socketConnection);

        console.log(`\n✅ Working Ports: ${workingPorts.length}`);
        workingPorts.forEach(r => {
            console.log(`   Port ${r.port}: ${r.description}`);
        });

        console.log(`\n❌ Failed Ports: ${failedPorts.length}`);
        failedPorts.forEach(r => {
            console.log(`   Port ${r.port}: ${r.description} - ${r.issue}`);
        });

        // Provide fix recommendations
        console.log('\n🔧 FIX RECOMMENDATIONS:');
        
        if (workingPorts.length === 0) {
            console.log('❌ No working WebSocket connections found!');
            console.log('   1. Start WebSocket Hub: node websocket-hub-standalone.js');
            console.log('   2. Check firewall/network settings');
        } else if (workingPorts.some(p => p.port === 3001) && failedPorts.some(p => p.port === 3002)) {
            console.log('🎯 PORT MISMATCH DETECTED:');
            console.log('   Hub is running on port 3001 ✅');
            console.log('   Frontend expects port 3002 ❌');
            console.log('');
            console.log('   SOLUTION OPTIONS:');
            console.log('   A) Update frontend .env file:');
            console.log('      VITE_WEBSOCKET_HUB_URL=http://localhost:3001');
            console.log('');
            console.log('   B) Start hub on port 3002:');
            console.log('      PORT=3002 node websocket-hub-standalone.js');
            console.log('');
            console.log('   C) Use environment variable:');
            console.log('      export PORT=3002 && node websocket-hub-standalone.js');
        } else if (workingPorts.some(p => p.port === 3002)) {
            console.log('✅ Frontend port 3002 is working correctly!');
        }

        // Browser test code
        const workingPort = workingPorts.length > 0 ? workingPorts[0].port : 3001;
        console.log('\n🌐 BROWSER CONSOLE TEST:');
        console.log('Copy this into browser console (F12):');
        console.log('-'.repeat(40));
        console.log(`const testSocket = io('http://localhost:${workingPort}');`);
        console.log('testSocket.on("connect", () => console.log("✅ Connected:", testSocket.id));');
        console.log('testSocket.on("connect_error", (e) => console.error("❌ Error:", e));');
        console.log('-'.repeat(40));

        console.log('\n📋 NEXT STEPS:');
        if (workingPorts.length > 0) {
            console.log('1. Apply the recommended port fix');
            console.log('2. Restart frontend development server');
            console.log('3. Test connection from browser console');
            console.log('4. Verify real-time communication works');
        } else {
            console.log('1. Start the WebSocket Hub');
            console.log('2. Re-run this test');
            console.log('3. Check system logs for errors');
        }
    }
}

// CLI execution
if (require.main === module) {
    const tester = new ConnectionFixTester();
    tester.runAllTests()
        .then((results) => {
            const hasWorking = results.some(r => r.socketConnection);
            process.exit(hasWorking ? 0 : 1);
        })
        .catch((error) => {
            console.error('💥 Test failed:', error);
            process.exit(1);
        });
}

module.exports = ConnectionFixTester;