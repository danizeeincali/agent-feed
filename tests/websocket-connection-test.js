/**
 * WebSocket Connection Test - Updated for Socket.IO Hub
 * Test to verify frontend can connect to the WebSocket hub on port 3002
 */

const { io } = require('socket.io-client');

const WEBSOCKET_HUB_URL = 'http://localhost:3002';

async function testWebSocketConnection() {
    console.log('🧪 Testing WebSocket connection to hub...');
    console.log(`📍 Hub URL: ${WEBSOCKET_HUB_URL}`);
    
    return new Promise((resolve, reject) => {
        const socket = io(WEBSOCKET_HUB_URL, {
            autoConnect: false,
            timeout: 10000,
            transports: ['polling', 'websocket']
        });

        const timeout = setTimeout(() => {
            socket.disconnect();
            reject(new Error('Connection timeout after 10 seconds'));
        }, 10000);

        socket.on('connect', () => {
            clearTimeout(timeout);
            console.log('✅ Successfully connected to WebSocket hub!');
            console.log(`🆔 Socket ID: ${socket.id}`);
            
            // Register as frontend client with the hub
            socket.emit('registerFrontend', { 
                timestamp: new Date().toISOString(),
                userAgent: 'test-client'
            });
            
            // Wait a moment then disconnect
            setTimeout(() => {
                socket.disconnect();
                resolve({
                    success: true,
                    socketId: socket.id,
                    transport: socket.io.engine ? socket.io.engine.transport.name : 'unknown'
                });
            }, 2000);
        });

        socket.on('connect_error', (error) => {
            clearTimeout(timeout);
            console.error('❌ Connection failed:', error.message);
            reject(error);
        });

        socket.on('disconnect', (reason) => {
            console.log('🔌 Disconnected:', reason);
        });

        console.log('🔌 Attempting to connect...');
        socket.connect();
    });
}

// Run the test
testWebSocketConnection()
    .then(result => {
        console.log('✅ Test completed successfully:', result);
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    });