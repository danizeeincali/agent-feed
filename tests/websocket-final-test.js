#!/usr/bin/env node

/**
 * Final WebSocket Validation Test - Complete Connectivity Analysis
 */

const { io } = require('socket.io-client');

async function finalTest() {
    console.log('🚀 FINAL WEBSOCKET VALIDATION');
    console.log('==============================');
    console.log(`🎯 Target: http://localhost:3002`);
    console.log('');

    const socket = io('http://localhost:3002', {
        timeout: 10000,
        transports: ['polling', 'websocket'],
        autoConnect: false
    });

    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            console.log('❌ Connection timeout after 10 seconds');
            socket.disconnect();
            resolve(false);
        }, 10000);

        socket.on('connect', () => {
            console.log('✅ CONNECTED SUCCESSFULLY!');
            console.log(`   Socket ID: ${socket.id}`);
            console.log(`   Transport: ${socket.io.engine.transport.name}`);
            
            // Test registration
            socket.emit('registerFrontend', {
                timestamp: new Date().toISOString(),
                userAgent: 'final-test',
                url: 'test://final'
            });
            console.log('📝 Frontend registration sent');
            
            clearTimeout(timeout);
            socket.disconnect();
            resolve(true);
        });

        socket.on('connect_error', (error) => {
            console.log(`❌ Connection failed: ${error.message}`);
            clearTimeout(timeout);
            socket.disconnect();
            resolve(false);
        });

        socket.connect();
    });
}

async function main() {
    const success = await finalTest();
    
    console.log('\n📊 RESULTS:');
    if (success) {
        console.log('🎉 WebSocket Hub connectivity VERIFIED!');
        console.log('');
        console.log('✅ Connection established');
        console.log('✅ Socket.IO handshake successful');
        console.log('✅ Frontend registration sent');
        console.log('');
        console.log('🌐 BROWSER TEST (copy to console):');
        console.log('const socket = io("http://localhost:3002");');
        console.log('socket.on("connect", () => console.log("✅ Connected!"));');
    } else {
        console.log('❌ WebSocket Hub connectivity FAILED');
        console.log('');
        console.log('🔧 Check:');
        console.log('1. WebSocket Hub is running');
        console.log('2. Port 3002 is accessible');
        console.log('3. No firewall blocking');
    }
    
    console.log('\n' + '='.repeat(40));
    process.exit(success ? 0 : 1);
}

main().catch(console.error);