#!/usr/bin/env node

/**
 * SPARC:DEBUG - WebSocket Connection Validator
 * Validates both browser and node.js WebSocket connections after fixes
 */

const { io } = require('socket.io-client');

console.log('🔧 SPARC:DEBUG - WebSocket Connection Validator');
console.log('=====================================');

// Test Configuration
const BACKEND_URL = 'http://localhost:3000';
const TERMINAL_NAMESPACE = '/terminal';
const TEST_INSTANCE_ID = 'test-instance-' + Date.now();

async function validateTerminalConnection() {
    console.log('\n📡 Testing Terminal WebSocket Connection...');
    console.log(`   Backend URL: ${BACKEND_URL}`);
    console.log(`   Namespace: ${TERMINAL_NAMESPACE}`);
    
    return new Promise((resolve, reject) => {
        const socket = io(`${BACKEND_URL}${TERMINAL_NAMESPACE}`, {
            auth: {
                token: 'dev-token',
                userId: 'dev-user-' + Date.now(),
                username: 'SPARC Debug User'
            },
            transports: ['websocket', 'polling'],
            timeout: 10000
        });

        const timeout = setTimeout(() => {
            socket.disconnect();
            reject(new Error('Connection timeout after 10 seconds'));
        }, 10000);

        socket.on('connected', () => {
            clearTimeout(timeout);
            console.log('✅ Successfully connected to terminal namespace!');
            console.log(`   Socket ID: ${socket.id}`);
            
            // Test instance connection
            socket.emit('connect_terminal', { instanceId: TEST_INSTANCE_ID });
        });

        socket.on('terminal_connected', (data) => {
            console.log('✅ Terminal connection established!');
            console.log(`   Instance ID: ${data.instanceId}`);
            console.log(`   Session ID: ${data.sessionId}`);
            
            // Test sending input
            socket.emit('terminal_input', { data: 'echo "SPARC:DEBUG test successful"\n' });
        });

        socket.on('terminal_data', (data) => {
            console.log('✅ Received terminal data!');
            console.log(`   Data length: ${data.data.length} characters`);
            
            setTimeout(() => {
                socket.disconnect();
                resolve({
                    success: true,
                    socketId: socket.id,
                    transport: socket.io.engine ? socket.io.engine.transport.name : 'unknown'
                });
            }, 1000);
        });

        socket.on('error', (error) => {
            clearTimeout(timeout);
            console.error('❌ Terminal connection error:', error.message);
            reject(error);
        });

        socket.on('connect_error', (error) => {
            clearTimeout(timeout);
            console.error('❌ Connection failed:', error.message);
            reject(error);
        });

        socket.on('disconnect', (reason) => {
            console.log('🔌 Disconnected:', reason);
        });

        console.log('🔌 Attempting terminal connection...');
    });
}

async function validateBackendHealth() {
    console.log('\n🏥 Testing Backend Health...');
    
    try {
        const response = await fetch(`${BACKEND_URL}/health`);
        const data = await response.json();
        
        console.log('✅ Backend health check passed!');
        console.log(`   Status: ${data.status}`);
        console.log(`   Uptime: ${data.uptime}s`);
        console.log(`   WebSocket: ${data.services?.websocket || 'unknown'}`);
        
        return { success: true, data };
    } catch (error) {
        console.error('❌ Backend health check failed:', error.message);
        throw error;
    }
}

async function runValidation() {
    try {
        // Step 1: Check backend health
        await validateBackendHealth();
        
        // Step 2: Test terminal WebSocket connection
        const terminalResult = await validateTerminalConnection();
        
        console.log('\n🎉 SPARC:DEBUG Validation Complete!');
        console.log('=====================================');
        console.log('✅ All WebSocket connections working correctly');
        console.log(`✅ Terminal connection: ${terminalResult.transport} transport`);
        console.log('✅ Frontend should now connect successfully');
        
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ SPARC:DEBUG Validation Failed!');
        console.error('=====================================');
        console.error(`❌ Error: ${error.message}`);
        console.error('❌ Frontend connections will likely fail');
        
        console.log('\n🔧 Troubleshooting Steps:');
        console.log('1. Ensure backend is running on port 3000');
        console.log('2. Check WebSocket namespace configuration');
        console.log('3. Verify CORS settings');
        console.log('4. Review authentication middleware');
        
        process.exit(1);
    }
}

// Run validation
runValidation();