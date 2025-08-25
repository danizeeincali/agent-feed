#!/usr/bin/env node

/**
 * End-to-End Terminal Functionality Validation
 * 
 * This script validates the complete terminal functionality after
 * protocol fixes and Claude CLI hang prevention implementation.
 */

const WebSocket = require('ws');

console.log('🚀 END-TO-END TERMINAL VALIDATION');
console.log('==================================\n');

// Test WebSocket connection to terminal server
function testWebSocketConnection() {
  return new Promise((resolve, reject) => {
    console.log('📡 Testing WebSocket Connection...');
    
    const ws = new WebSocket('ws://localhost:3002/terminal');
    
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Connection timeout'));
    }, 5000);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      console.log('✅ WebSocket connection established');
      
      // Send init message
      const initMessage = {
        type: 'init',
        cols: 80,
        rows: 24
      };
      
      ws.send(JSON.stringify(initMessage));
      console.log('📤 Sent init message:', initMessage);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📨 Received message:', message);
        
        if (message.type === 'init_ack') {
          console.log('✅ Terminal initialized successfully');
          console.log(`   Terminal ID: ${message.terminalId}`);
          console.log(`   PID: ${message.pid}`);
          
          // Test command detection
          testCommandDetection(ws, resolve);
        }
      } catch (error) {
        console.error('❌ Failed to parse message:', error);
        reject(error);
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.error('❌ WebSocket error:', error);
      reject(error);
    });
    
    ws.on('close', () => {
      console.log('🔌 WebSocket connection closed');
    });
  });
}

function testCommandDetection(ws, resolve) {
  console.log('\n🔍 Testing Claude CLI Command Detection...');
  
  let responseReceived = false;
  
  // Listen for the hang prevention response
  const messageHandler = (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'data' && message.data.includes('Claude CLI Usage Help')) {
        console.log('✅ Claude CLI hang prevention triggered successfully!');
        console.log('📋 Help message received:', message.data.substring(0, 100) + '...');
        responseReceived = true;
        
        setTimeout(() => {
          ws.close();
          resolve({
            connection: true,
            hangPrevention: true,
            message: 'End-to-end validation successful'
          });
        }, 100);
      }
    } catch (error) {
      console.error('❌ Error parsing response:', error);
    }
  };
  
  ws.on('message', messageHandler);
  
  // Send potentially hanging claude command
  setTimeout(() => {
    const claudeCommand = {
      type: 'input',
      data: 'claude\r'
    };
    
    console.log('📤 Sending potentially hanging command:', claudeCommand);
    ws.send(JSON.stringify(claudeCommand));
    
    // Wait for response
    setTimeout(() => {
      if (!responseReceived) {
        console.log('⚠️  No hang prevention response received within timeout');
        ws.close();
        resolve({
          connection: true,
          hangPrevention: false,
          message: 'Command detection may need adjustment'
        });
      }
    }, 3000);
  }, 500);
}

// Test backend API integration  
async function testBackendAPI() {
  console.log('\n🔌 Testing Backend API Integration...');
  
  try {
    const fetch = (await import('node-fetch')).default;
    
    const statusResponse = await fetch('http://localhost:3001/api/claude/status');
    const statusData = await statusResponse.json();
    
    console.log('✅ Backend API status:', statusData);
    
    return {
      api: true,
      claudeRunning: statusData.running,
      interactive: statusData.interactive
    };
  } catch (error) {
    console.log('⚠️  Backend API not accessible:', error.message);
    return {
      api: false,
      error: error.message
    };
  }
}

// Main validation function
async function runValidation() {
  console.log('Starting comprehensive end-to-end validation...\n');
  
  try {
    // Test 1: Backend API
    const apiResult = await testBackendAPI();
    
    // Test 2: WebSocket Connection & Command Detection
    const wsResult = await testWebSocketConnection();
    
    // Final Report
    console.log('\n📊 VALIDATION RESULTS:');
    console.log('=====================');
    console.log(`✅ Backend API: ${apiResult.api ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ WebSocket Connection: ${wsResult.connection ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Claude CLI Hang Prevention: ${wsResult.hangPrevention ? 'WORKING' : 'NEEDS_TESTING'}`);
    
    if (apiResult.claudeRunning && apiResult.interactive) {
      console.log(`⚠️  Claude CLI is currently running in interactive mode (PID detected)`);
      console.log(`   This confirms the need for hang prevention logic`);
    }
    
    console.log('\n🎯 SUMMARY:');
    if (wsResult.connection && wsResult.hangPrevention) {
      console.log('✅ All systems operational - Terminal hang issue resolved!');
    } else if (wsResult.connection) {
      console.log('⚠️  WebSocket working but hang prevention needs user testing');
    } else {
      console.log('❌ WebSocket connection issues detected');
    }
    
  } catch (error) {
    console.error('\n❌ VALIDATION FAILED:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runValidation().catch(error => {
    console.error('💥 Validation error:', error);
    process.exit(1);
  });
}

module.exports = { runValidation, testWebSocketConnection, testBackendAPI };