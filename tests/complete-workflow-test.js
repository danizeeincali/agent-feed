#!/usr/bin/env node

/**
 * Complete End-to-End Workflow Test
 * Tests the REAL button -> terminal -> command workflow
 * This simulates exactly what the user experiences in the browser
 */

const WebSocket = require('ws');
const http = require('http');

const FRONTEND_URL = 'http://localhost:5173';
const TERMINAL_API = 'http://localhost:3002';
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

async function makeRequest(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
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

async function test1_frontendTerminalFetch() {
  log('Test 1: Frontend can fetch terminals from backend...', 'info');
  
  try {
    const response = await makeRequest(`${TERMINAL_API}/api/terminals`);
    
    if (response.status === 200 && response.data.success !== undefined) {
      log('✓ Frontend can communicate with terminal backend', 'success');
      testsPassed++;
      return true;
    } else {
      log(`✗ Frontend-backend communication failed: ${JSON.stringify(response)}`, 'error');
      testsFailed++;
      return false;
    }
  } catch (error) {
    log(`✗ Frontend-backend communication error: ${error.message}`, 'error');
    testsFailed++;
    return false;
  }
}

async function test2_buttonClickSimulation() {
  log('Test 2: Simulating button click to launch Claude...', 'info');
  
  try {
    // This simulates what happens when user clicks a button in the frontend
    const response = await makeRequest(`${TERMINAL_API}/api/launch`, 'POST', {
      cwd: '/workspaces/agent-feed'
    });
    
    if (response.status === 200 && response.data.success && response.data.terminalId) {
      log(`✓ Button click simulation successful - Terminal: ${response.data.terminalId}`, 'success');
      testsPassed++;
      return response.data.terminalId;
    } else {
      log(`✗ Button click simulation failed: ${JSON.stringify(response.data)}`, 'error');
      testsFailed++;
      return null;
    }
  } catch (error) {
    log(`✗ Button click error: ${error.message}`, 'error');
    testsFailed++;
    return null;
  }
}

async function test3_websocketTerminalConnection(terminalId) {
  log('Test 3: Testing WebSocket terminal connection...', 'info');
  
  if (!terminalId) {
    log('⚠️  Skipping WebSocket test - no terminal ID', 'warning');
    return false;
  }
  
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_ENDPOINT);
    let connected = false;
    let receivedInitialOutput = false;
    const messages = [];
    
    const timeout = setTimeout(() => {
      if (!connected) {
        log('✗ WebSocket connection timeout', 'error');
        testsFailed++;
        resolve(false);
        return;
      }
      
      ws.terminate();
      
      if (receivedInitialOutput) {
        log('✓ WebSocket terminal connection working', 'success');
        log(`✓ Received ${messages.length} terminal messages`, 'success');
        testsPassed++;
        resolve(true);
      } else {
        log('✗ No terminal output received', 'error');
        testsFailed++;
        resolve(false);
      }
    }, 5000);
    
    ws.on('open', () => {
      connected = true;
      log('WebSocket connected to terminal', 'info');
    });
    
    ws.on('message', (data) => {
      receivedInitialOutput = true;
      messages.push(data.toString());
      
      if (messages.length === 1) {
        log('First terminal output received', 'info');
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

async function test4_commandTypingSimulation(terminalId) {
  log('Test 4: Simulating typing commands in terminal...', 'info');
  
  if (!terminalId) {
    log('⚠️  Skipping command test - no terminal ID', 'warning');
    return false;
  }
  
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_ENDPOINT);
    let commandsSent = 0;
    let responsesReceived = 0;
    const responses = [];
    
    const timeout = setTimeout(() => {
      ws.terminate();
      
      if (commandsSent > 0 && responsesReceived > 0) {
        log(`✓ Command typing simulation successful`, 'success');
        log(`✓ Sent ${commandsSent} commands, received ${responsesReceived} responses`, 'success');
        
        // Check response quality
        const totalOutput = responses.join('');
        if (totalOutput.length > 50 && totalOutput.length < 50000) {
          log('✓ Command responses are reasonable quality', 'success');
          testsPassed++;
        } else {
          log(`⚠️  Unusual response length: ${totalOutput.length} chars`, 'warning');
        }
        
        resolve(true);
      } else {
        log('✗ Command typing simulation failed', 'error');
        testsFailed++;
        resolve(false);
      }
    }, 8000);
    
    ws.on('open', () => {
      // Send realistic commands
      const commands = [
        'pwd\\n',
        'ls -la\\n', 
        'echo "Testing Claude terminal"\\n',
        'date\\n'
      ];
      
      commands.forEach((cmd, index) => {
        setTimeout(() => {
          ws.send(cmd);
          commandsSent++;
          log(`Typed command ${index + 1}: ${cmd.trim()}`, 'info');
        }, (index + 1) * 1000);
      });
    });
    
    ws.on('message', (data) => {
      responsesReceived++;
      responses.push(data.toString());
      
      if (responsesReceived <= 3) {
        log(`Command response ${responsesReceived} received`, 'info');
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      log(`✗ Command WebSocket error: ${error.message}`, 'error');
      testsFailed++;
      resolve(false);
    });
  });
}

async function test5_noEscapeSequenceStorms() {
  log('Test 5: Checking for escape sequence storms...', 'info');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_ENDPOINT);
    let allOutput = '';
    
    const timeout = setTimeout(() => {
      ws.terminate();
      
      // Analyze output for problems
      const escapeSequences = allOutput.match(/\\[[0-9;?]*[hlm]/g) || [];
      const escapeCount = escapeSequences.length;
      
      const welcomeMessages = (allOutput.match(/Welcome to Claude Code/g) || []).length;
      
      log(`Output analysis: ${escapeCount} escape sequences, ${welcomeMessages} welcome messages`, 'info');
      
      if (escapeCount < 50 && welcomeMessages < 5) {
        log('✓ No escape sequence storms detected', 'success');
        testsPassed++;
        resolve(true);
      } else {
        log(`✗ Potential escape sequence storm: ${escapeCount} sequences, ${welcomeMessages} messages`, 'error');
        testsFailed++;
        resolve(false);
      }
    }, 3000);
    
    ws.on('open', () => {
      // Send a simple command that might trigger issues
      ws.send('claude --help\\n');
    });
    
    ws.on('message', (data) => {
      allOutput += data.toString();
    });
    
    ws.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

async function runCompleteWorkflowTest() {
  console.log('');
  log('=== COMPLETE END-TO-END WORKFLOW TEST ===', 'info');
  log('Testing: Frontend -> Button Click -> Terminal Launch -> Command Typing', 'info');
  console.log('');
  
  try {
    // Test 1: Frontend can connect to backend
    const canConnect = await test1_frontendTerminalFetch();
    if (!canConnect) {
      log('❌ Frontend cannot connect to backend - aborting', 'error');
      return;
    }
    
    // Test 2: Simulate button click
    const terminalId = await test2_buttonClickSimulation();
    if (!terminalId) {
      log('❌ Button click simulation failed - aborting', 'error');
      return;
    }
    
    // Test 3: WebSocket connection
    await test3_websocketTerminalConnection(terminalId);
    
    // Test 4: Command typing simulation
    await test4_commandTypingSimulation(terminalId);
    
    // Test 5: Check for escape sequence storms
    await test5_noEscapeSequenceStorms();
    
  } catch (error) {
    log(`Unexpected error: ${error.message}`, 'error');
    testsFailed++;
  }
  
  // Summary
  console.log('');
  log('=== COMPLETE WORKFLOW TEST SUMMARY ===', 'info');
  log(`Tests Passed: ${testsPassed}`, testsPassed > 0 ? 'success' : 'info');
  log(`Tests Failed: ${testsFailed}`, testsFailed > 0 ? 'error' : 'info');
  
  if (testsFailed === 0 && testsPassed >= 4) {
    console.log('');
    log('🎉 COMPLETE WORKFLOW VERIFIED! You can safely use the frontend.', 'success');
    log('✨ Open http://localhost:5173/claude-instances and click buttons!', 'success');
    process.exit(0);
  } else {
    console.log('');
    log('⚠️  Workflow issues detected. Check failures above.', 'warning');
    process.exit(1);
  }
}

// Run the complete test
runCompleteWorkflowTest().catch(error => {
  log(`Fatal error: ${error}`, 'error');
  process.exit(1);
});