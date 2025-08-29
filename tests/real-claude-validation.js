#!/usr/bin/env node

/**
 * REAL Claude Instance Validation Script
 * Tests actual Claude CLI spawning and terminal I/O
 * This is NOT a mock - it tests the real system end-to-end
 */

const WebSocket = require('ws');
const http = require('http');

const TERMINAL_SERVER = 'http://localhost:3002';
const WS_ENDPOINT = 'ws://localhost:3002/terminal';

let testsPassed = 0;
let testsFailed = 0;

function log(message, type = 'info') {
  const symbols = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };
  console.log(`${symbols[type]} ${message}`);
}

async function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, TERMINAL_SERVER);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test1_serverHealth() {
  log('Test 1: Checking terminal server health...', 'info');
  
  try {
    const response = await makeRequest('/health');
    
    if (response.status === 200 && response.data.success) {
      log(`✓ Server healthy - Claude CLI: ${response.data.claudeCli.available ? 'Available' : 'Missing'}`, 'success');
      testsPassed++;
      return response.data.claudeCli.available;
    } else {
      log('✗ Server health check failed', 'error');
      testsFailed++;
      return false;
    }
  } catch (error) {
    log(`✗ Health check error: ${error.message}`, 'error');
    testsFailed++;
    return false;
  }
}

async function test2_claudeStatus() {
  log('Test 2: Checking Claude CLI status...', 'info');
  
  try {
    const response = await makeRequest('/api/claude-status');
    
    if (response.status === 200 && response.data.available) {
      log(`✓ Claude CLI available - Version: ${response.data.version}`, 'success');
      testsPassed++;
      return true;
    } else {
      log('✗ Claude CLI not available', 'error');
      testsFailed++;
      return false;
    }
  } catch (error) {
    log(`✗ Claude status error: ${error.message}`, 'error');
    testsFailed++;
    return false;
  }
}

async function test3_realClaudeLaunch() {
  log('Test 3: Launching REAL Claude instance...', 'info');
  
  try {
    const response = await makeRequest('/api/launch', 'POST', {
      cwd: '/workspaces/agent-feed'
    });
    
    if (response.status === 200 && response.data.success) {
      log(`✓ Claude instance launched - Terminal ID: ${response.data.terminalId}`, 'success');
      testsPassed++;
      return response.data.terminalId;
    } else {
      log(`✗ Failed to launch Claude: ${JSON.stringify(response.data)}`, 'error');
      testsFailed++;
      return null;
    }
  } catch (error) {
    log(`✗ Launch error: ${error.message}`, 'error');
    testsFailed++;
    return null;
  }
}

async function test4_websocketConnection(terminalId) {
  log('Test 4: Testing WebSocket terminal connection...', 'info');
  
  if (!terminalId) {
    log('⚠️  Skipping WebSocket test - no terminal ID', 'warning');
    return false;
  }
  
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_ENDPOINT);
    let receivedData = false;
    let escapeSequenceCount = 0;
    let welcomeMessageCount = 0;
    const outputBuffer = [];
    
    const timeout = setTimeout(() => {
      ws.terminate();
      
      // Analyze the output for issues
      const allOutput = outputBuffer.join('');
      
      // Count escape sequences
      const escapeMatches = allOutput.match(/\[[0-9;?]*[hlm]/g) || [];
      escapeSequenceCount = escapeMatches.length;
      
      // Count welcome messages
      welcomeMessageCount = (allOutput.match(/Welcome to Claude Code/g) || []).length;
      
      if (receivedData) {
        log(`✓ WebSocket connected and received data`, 'success');
        
        if (escapeSequenceCount > 100) {
          log(`⚠️  High escape sequence count: ${escapeSequenceCount}`, 'warning');
        } else {
          log(`✓ Escape sequences within normal range: ${escapeSequenceCount}`, 'success');
        }
        
        if (welcomeMessageCount > 10) {
          log(`⚠️  Too many welcome messages: ${welcomeMessageCount}`, 'warning');
        } else {
          log(`✓ Welcome message count normal: ${welcomeMessageCount}`, 'success');
        }
        
        testsPassed++;
        resolve(true);
      } else {
        log('✗ No data received from WebSocket', 'error');
        testsFailed++;
        resolve(false);
      }
    }, 5000);
    
    ws.on('open', () => {
      log('WebSocket connected', 'info');
      
      // Send a simple command
      setTimeout(() => {
        ws.send('pwd\\n');
      }, 1000);
    });
    
    ws.on('message', (data) => {
      receivedData = true;
      const message = data.toString();
      outputBuffer.push(message);
      
      if (outputBuffer.length === 1) {
        log('First message received from Claude', 'info');
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      log(`✗ WebSocket error: ${error.message}`, 'error');
      testsFailed++;
      resolve(false);
    });
    
    ws.on('close', () => {
      clearTimeout(timeout);
      log('WebSocket connection closed', 'info');
    });
  });
}

async function test5_realTerminalIO(terminalId) {
  log('Test 5: Testing real terminal I/O...', 'info');
  
  if (!terminalId) {
    log('⚠️  Skipping I/O test - no terminal ID', 'warning');
    return false;
  }
  
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_ENDPOINT);
    let commandsSent = 0;
    let responsesReceived = 0;
    const outputs = [];
    
    const timeout = setTimeout(() => {
      ws.terminate();
      
      if (responsesReceived > 0 && outputs.length > 0) {
        log(`✓ Terminal I/O working - Commands: ${commandsSent}, Responses: ${responsesReceived}`, 'success');
        
        // Check for clean output
        const combinedOutput = outputs.join('');
        const hasReasonableOutput = combinedOutput.length > 10 && combinedOutput.length < 10000;
        
        if (hasReasonableOutput) {
          log('✓ Terminal output is reasonable length', 'success');
          testsPassed++;
        } else {
          log(`⚠️  Terminal output length unusual: ${combinedOutput.length} chars`, 'warning');
          testsFailed++;
        }
        
        resolve(true);
      } else {
        log('✗ Terminal I/O not working properly', 'error');
        testsFailed++;
        resolve(false);
      }
    }, 8000);
    
    ws.on('open', () => {
      // Send test commands
      const commands = ['pwd', 'ls -la', 'echo "Hello Claude"'];
      
      commands.forEach((cmd, index) => {
        setTimeout(() => {
          ws.send(cmd + '\\n');
          commandsSent++;
          log(`Sent command: ${cmd}`, 'info');
        }, (index + 1) * 1000);
      });
    });
    
    ws.on('message', (data) => {
      responsesReceived++;
      const message = data.toString();
      outputs.push(message);
      
      if (responsesReceived <= 3) {
        log(`Response ${responsesReceived} received`, 'info');
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      log(`✗ WebSocket error: ${error.message}`, 'error');
      testsFailed++;
      resolve(false);
    });
  });
}

async function runAllTests() {
  console.log('');
  log('=== REAL CLAUDE FUNCTIONALITY VALIDATION ===', 'info');
  console.log('');
  
  try {
    // Test 1: Server health
    const isHealthy = await test1_serverHealth();
    if (!isHealthy) {
      log('❌ Server not healthy - aborting tests', 'error');
      return;
    }
    
    // Test 2: Claude CLI status
    const claudeAvailable = await test2_claudeStatus();
    if (!claudeAvailable) {
      log('❌ Claude CLI not available - aborting tests', 'error');
      return;
    }
    
    // Test 3: Real Claude launch
    const terminalId = await test3_realClaudeLaunch();
    
    // Test 4: WebSocket connection
    await test4_websocketConnection(terminalId);
    
    // Test 5: Real terminal I/O
    await test5_realTerminalIO(terminalId);
    
  } catch (error) {
    log(`Unexpected error: ${error.message}`, 'error');
    testsFailed++;
  }
  
  // Summary
  console.log('');
  log('=== REAL VALIDATION SUMMARY ===', 'info');
  log(`Tests Passed: ${testsPassed}`, testsPassed > 0 ? 'success' : 'info');
  log(`Tests Failed: ${testsFailed}`, testsFailed > 0 ? 'error' : 'info');
  
  if (testsFailed === 0 && testsPassed >= 3) {
    console.log('');
    log('🎉 REAL CLAUDE FUNCTIONALITY VERIFIED! All systems operational.', 'success');
    process.exit(0);
  } else {
    console.log('');
    log('⚠️  Some real functionality issues detected. Review failures above.', 'warning');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  log(`Fatal error: ${error}`, 'error');
  process.exit(1);
});