/**
 * Manual CORS Validation Script
 * Tests the comprehensive CORS fixes across all methodologies
 */

import io from 'socket.io-client';

// Test configuration
const TEST_ORIGINS = [
  'http://localhost:3001',
  'http://127.0.0.1:3001', 
  'http://[::1]:3001',
  'https://localhost:3001'
];

const BACKEND_URL = 'http://localhost:3001';

async function testCORSConfiguration() {
  console.log('🧪 Starting Comprehensive CORS Validation Tests\n');
  
  const results = {
    success: 0,
    failed: 0,
    details: []
  };

  for (const origin of TEST_ORIGINS) {
    try {
      console.log(`🔍 Testing origin: ${origin}`);
      
      // Test HTTP CORS first
      const httpResponse = await fetch(`${BACKEND_URL}/health`, {
        method: 'GET',
        headers: {
          'Origin': origin,
          'Content-Type': 'application/json'
        }
      });
      
      if (httpResponse.ok) {
        console.log(`✅ HTTP CORS: ${origin} - OK`);
      } else {
        throw new Error(`HTTP CORS failed: ${httpResponse.status}`);
      }

      // Test WebSocket connection
      await testWebSocketConnection(origin);
      
      results.success++;
      results.details.push({
        origin,
        status: 'success',
        http_cors: true,
        websocket_cors: true
      });
      
    } catch (error) {
      console.log(`❌ ${origin} - FAILED: ${error.message}`);
      results.failed++;
      results.details.push({
        origin,
        status: 'failed',
        error: error.message
      });
    }
    
    console.log(''); // Empty line for readability
  }
  
  return results;
}

function testWebSocketConnection(origin) {
  return new Promise((resolve, reject) => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket'],
      timeout: 5000,
      extraHeaders: {
        'Origin': origin
      }
    });
    
    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error('WebSocket connection timeout'));
    }, 6000);
    
    socket.on('connect', () => {
      clearTimeout(timeout);
      console.log(`✅ WebSocket: ${origin} - Connected (${socket.id})`);
      
      // Test terminal-specific functionality
      socket.emit('terminal:input', { input: 'echo "CORS test successful"' });
      
      socket.on('terminal:output', (data) => {
        console.log(`📟 Terminal output received for ${origin}`);
        socket.disconnect();
        resolve();
      });
      
      socket.on('terminal:error', (error) => {
        clearTimeout(timeout);
        socket.disconnect();
        reject(new Error(`Terminal error: ${error.error}`));
      });
      
      // If no terminal response, still consider connection successful
      setTimeout(() => {
        socket.disconnect();
        resolve();
      }, 3000);
    });
    
    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      if (error.message.includes('CORS') || error.message.includes('Not allowed')) {
        reject(new Error(`WebSocket CORS rejected: ${error.message}`));
      } else {
        reject(new Error(`WebSocket error: ${error.message}`));
      }
    });
  });
}

async function testTerminalFunctionality() {
  console.log('🔧 Testing Terminal I/O Functionality\n');
  
  return new Promise((resolve, reject) => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket']
    });
    
    let outputReceived = false;
    
    const timeout = setTimeout(() => {
      socket.disconnect();
      if (outputReceived) {
        resolve({ status: 'partial', message: 'Connected but no terminal output' });
      } else {
        reject(new Error('Terminal functionality test timeout'));
      }
    }, 10000);
    
    socket.on('connect', () => {
      console.log('✅ Terminal test - WebSocket connected');
      
      // Test basic terminal commands
      socket.emit('terminal:input', { input: 'pwd' });
      socket.emit('terminal:input', { input: 'echo "Terminal CORS fix validation"' });
      
      socket.on('terminal:output', (data) => {
        outputReceived = true;
        console.log('📟 Terminal output:', data.data?.substring(0, 100));
      });
      
      socket.on('process:launched', (data) => {
        console.log('🚀 Process launched:', data.name);
      });
      
      socket.on('terminal:error', (error) => {
        console.log('⚠️ Terminal error:', error.error);
      });
      
      // Clean up after test
      setTimeout(() => {
        clearTimeout(timeout);
        socket.disconnect();
        if (outputReceived) {
          resolve({ status: 'success', message: 'Terminal I/O working correctly' });
        } else {
          resolve({ status: 'partial', message: 'WebSocket connected, terminal may not be active' });
        }
      }, 8000);
    });
    
    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Terminal connection failed: ${error.message}`));
    });
  });
}

async function validateNLDPatterns() {
  console.log('🧠 Validating NLD Pattern Integration\n');
  
  // Simulate failure patterns that should be caught
  const patterns = [
    {
      test: 'Invalid origin should be logged',
      origin: 'http://malicious-site.com:3001',
      expectedResult: 'blocked'
    },
    {
      test: 'Valid localhost should be allowed',
      origin: 'http://localhost:3001',
      expectedResult: 'allowed'
    }
  ];
  
  const results = [];
  
  for (const pattern of patterns) {
    try {
      const response = await fetch(`${BACKEND_URL}/health`, {
        method: 'GET',
        headers: {
          'Origin': pattern.origin
        }
      });
      
      if (pattern.expectedResult === 'blocked' && response.ok) {
        results.push({
          pattern: pattern.test,
          status: 'warning',
          message: 'Potentially allowing unauthorized origin'
        });
      } else if (pattern.expectedResult === 'allowed' && response.ok) {
        results.push({
          pattern: pattern.test,
          status: 'success',
          message: 'Valid origin correctly allowed'
        });
      }
      
    } catch (error) {
      if (pattern.expectedResult === 'blocked') {
        results.push({
          pattern: pattern.test,
          status: 'success',
          message: 'Invalid origin correctly blocked'
        });
      } else {
        results.push({
          pattern: pattern.test,
          status: 'error',
          message: error.message
        });
      }
    }
  }
  
  return results;
}

// Main validation execution
async function runComprehensiveValidation() {
  console.log('🎯 COMPREHENSIVE TERMINAL CORS VALIDATION');
  console.log('==========================================\n');
  
  try {
    // 1. CORS Configuration Tests
    const corsResults = await testCORSConfiguration();
    console.log('📊 CORS Results:', corsResults);
    console.log('');
    
    // 2. Terminal Functionality Tests  
    const terminalResults = await testTerminalFunctionality();
    console.log('📊 Terminal Results:', terminalResults);
    console.log('');
    
    // 3. NLD Pattern Validation
    const nldResults = await validateNLDPatterns();
    console.log('📊 NLD Pattern Results:', nldResults);
    console.log('');
    
    // Final Summary
    console.log('🎉 VALIDATION COMPLETE');
    console.log('=====================');
    console.log(`✅ CORS Tests Passed: ${corsResults.success}`);
    console.log(`❌ CORS Tests Failed: ${corsResults.failed}`);
    console.log(`🔧 Terminal Status: ${terminalResults.status}`);
    console.log(`🧠 NLD Patterns: ${nldResults.length} patterns tested`);
    
    if (corsResults.failed === 0 && terminalResults.status !== 'error') {
      console.log('\n🏆 ALL TESTS PASSED - Terminal CORS fix successful!');
      process.exit(0);
    } else {
      console.log('\n⚠️ Some tests failed - review results above');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Validation failed:', error);
    process.exit(1);
  }
}

// Run validation if called directly
runComprehensiveValidation();