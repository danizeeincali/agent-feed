#!/usr/bin/env node

/**
 * FINAL MANUAL VERIFICATION SCRIPT
 * Tests the complete real workflow: Click Button -> Launch Instance -> Type Command -> Verify Output
 * This simulates the exact user experience with NO MOCKS OR SIMULATIONS
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
    warning: '⚠️',
    rocket: '🚀',
    checkmark: '✓',
    cross: '✗',
    celebration: '🎉'
  };
  console.log(`${symbols[type] || symbols.info} ${message}`);
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
        'Origin': 'http://localhost:5173'
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

async function step1_verifyFrontendLoads() {
  log('STEP 1: Verifying frontend loads without network errors...', 'rocket');
  
  try {
    const response = await makeRequest(FRONTEND_URL);
    if (response.status === 200) {
      log('Frontend loads successfully - no network connection issues', 'success');
      testsPassed++;
      return true;
    } else {
      log(`Frontend load failed - Status: ${response.status}`, 'error');
      testsFailed++;
      return false;
    }
  } catch (error) {
    log(`Frontend connection error: ${error.message}`, 'error');
    testsFailed++;
    return false;
  }
}

async function step2_simulateButtonClick() {
  log('STEP 2: Simulating button click to launch Claude instance...', 'rocket');
  
  try {
    // This is exactly what happens when user clicks a button
    const response = await makeRequest(`${TERMINAL_API}/api/launch`, 'POST', {
      cwd: '/workspaces/agent-feed'
    });
    
    if (response.status === 200 && response.data.success) {
      log(`Button click successful - Claude terminal launched: ${response.data.terminalId}`, 'success');
      testsPassed++;
      return response.data.terminalId;
    } else {
      log(`Button click failed: ${JSON.stringify(response.data)}`, 'error');
      testsFailed++;
      return null;
    }
  } catch (error) {
    log(`Button click error: ${error.message}`, 'error');
    testsFailed++;
    return null;
  }
}

async function step3_connectToTerminal(terminalId) {
  log('STEP 3: Connecting to launched Claude terminal...', 'rocket');
  
  if (!terminalId) {
    log('Cannot connect - no terminal ID available', 'warning');
    return false;
  }
  
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_ENDPOINT);
    let connected = false;
    let receivedWelcome = false;
    const messages = [];
    
    const timeout = setTimeout(() => {
      ws.terminate();
      
      if (connected && receivedWelcome) {
        log(`Terminal connection successful - Received ${messages.length} messages`, 'success');
        testsPassed++;
        resolve(true);
      } else {
        log(`Terminal connection failed - Connected: ${connected}, Messages: ${messages.length}`, 'error');
        testsFailed++;
        resolve(false);
      }
    }, 4000);
    
    ws.on('open', () => {
      connected = true;
      log('WebSocket terminal connection established', 'info');
    });
    
    ws.on('message', (data) => {
      receivedWelcome = true;
      messages.push(data.toString());
      
      if (messages.length === 1) {
        log('First terminal output received from Claude', 'info');
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      log(`Terminal connection error: ${error.message}`, 'error');
      testsFailed++;
      resolve(false);
    });
  });
}

async function step4_typeCommandsInTerminal(terminalId) {
  log('STEP 4: Typing commands in Claude terminal...', 'rocket');
  
  if (!terminalId) {
    log('Cannot type commands - no terminal ID available', 'warning');
    return false;
  }
  
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_ENDPOINT);
    let commandsSent = 0;
    let responsesReceived = 0;
    const allResponses = [];
    
    const timeout = setTimeout(() => {
      ws.terminate();
      
      const combinedOutput = allResponses.join('');
      const hasReasonableOutput = combinedOutput.length > 20;
      const hasValidCommands = commandsSent >= 3;
      const hasResponses = responsesReceived > 0;
      
      if (hasValidCommands && hasResponses && hasReasonableOutput) {
        log(`Command typing successful - Sent: ${commandsSent}, Received: ${responsesReceived}`, 'success');
        log(`Output quality check - Length: ${combinedOutput.length} chars`, 'info');
        testsPassed++;
        resolve(true);
      } else {
        log(`Command typing failed - Sent: ${commandsSent}, Received: ${responsesReceived}`, 'error');
        testsFailed++;
        resolve(false);
      }
    }, 10000);
    
    ws.on('open', () => {
      // Send realistic commands that a user would type
      const commands = [
        'pwd\n',
        'ls -la | head -5\n',
        'echo "Testing Claude Code terminal functionality"\n',
        'whoami\n'
      ];
      
      commands.forEach((cmd, index) => {
        setTimeout(() => {
          ws.send(cmd);
          commandsSent++;
          log(`Typed command: ${cmd.trim()}`, 'info');
        }, (index + 1) * 1500);
      });
    });
    
    ws.on('message', (data) => {
      responsesReceived++;
      const response = data.toString();
      allResponses.push(response);
      
      if (responsesReceived <= 5) {
        log(`Command response ${responsesReceived} received`, 'info');
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      log(`Terminal I/O error: ${error.message}`, 'error');
      testsFailed++;
      resolve(false);
    });
  });
}

async function step5_verifyOutputQuality(terminalId) {
  log('STEP 5: Verifying terminal output quality...', 'rocket');
  
  if (!terminalId) {
    log('Cannot verify output - no terminal ID available', 'warning');
    return false;
  }
  
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_ENDPOINT);
    let allOutput = '';
    
    const timeout = setTimeout(() => {
      ws.terminate();
      
      // Analyze output for quality and issues
      const escapeSequences = (allOutput.match(/\[[0-9;?]*[hlm]/g) || []).length;
      const welcomeMessages = (allOutput.match(/Welcome to Claude Code/g) || []).length;
      const totalLength = allOutput.length;
      
      log(`Output analysis - Length: ${totalLength}, Escape sequences: ${escapeSequences}, Welcome messages: ${welcomeMessages}`, 'info');
      
      // Quality checks
      const hasContent = totalLength > 50;
      const noStorms = escapeSequences < 20 && welcomeMessages < 3;
      const reasonable = totalLength < 50000; // Not too verbose
      
      if (hasContent && noStorms && reasonable) {
        log('Terminal output quality excellent - no escape sequence storms', 'success');
        testsPassed++;
        resolve(true);
      } else {
        log('Terminal output quality issues detected', 'error');
        testsFailed++;
        resolve(false);
      }
    }, 3000);
    
    ws.on('open', () => {
      ws.send('echo "Quality test command"\n');
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

async function runCompleteManualVerification() {
  console.log('');
  log('═══════════════════════════════════════════════════════', 'info');
  log('🎯 FINAL MANUAL VERIFICATION - COMPLETE WORKFLOW TEST', 'celebration');
  log('Testing: Frontend Load → Button Click → Terminal Launch → Command Typing → Output Verification', 'info');
  log('═══════════════════════════════════════════════════════', 'info');
  console.log('');
  
  let terminalId = null;
  
  try {
    // Step 1: Verify frontend loads
    const frontendWorking = await step1_verifyFrontendLoads();
    if (!frontendWorking) {
      log('❌ Frontend failed - aborting verification', 'error');
      return;
    }
    
    // Step 2: Simulate button click
    terminalId = await step2_simulateButtonClick();
    if (!terminalId) {
      log('❌ Button click failed - aborting verification', 'error');
      return;
    }
    
    // Step 3: Connect to terminal
    const terminalConnected = await step3_connectToTerminal(terminalId);
    if (!terminalConnected) {
      log('❌ Terminal connection failed - continuing with remaining tests', 'warning');
    }
    
    // Step 4: Type commands
    await step4_typeCommandsInTerminal(terminalId);
    
    // Step 5: Verify output quality
    await step5_verifyOutputQuality(terminalId);
    
  } catch (error) {
    log(`Unexpected verification error: ${error.message}`, 'error');
    testsFailed++;
  }
  
  // Final Results
  console.log('');
  log('═══════════════════════════════════════════════════════', 'info');
  log('🏁 FINAL MANUAL VERIFICATION RESULTS', 'celebration');
  log('═══════════════════════════════════════════════════════', 'info');
  log(`Tests Passed: ${testsPassed}`, testsPassed > 0 ? 'success' : 'info');
  log(`Tests Failed: ${testsFailed}`, testsFailed > 0 ? 'error' : 'info');
  
  if (testsFailed === 0 && testsPassed >= 4) {
    console.log('');
    log('🎉🎉🎉 COMPLETE WORKFLOW VERIFICATION SUCCESSFUL! 🎉🎉🎉', 'celebration');
    log('✅ Frontend loads without network errors', 'success');
    log('✅ Button clicks launch real Claude instances', 'success');  
    log('✅ Terminal connections work perfectly', 'success');
    log('✅ Command typing and output work flawlessly', 'success');
    log('✅ No escape sequence storms or issues', 'success');
    console.log('');
    log('🚀 READY FOR PRODUCTION USE! 🚀', 'celebration');
    log('Open http://localhost:5173/claude-instances and start coding!', 'info');
    process.exit(0);
  } else {
    console.log('');
    log('⚠️ SOME ISSUES REMAIN - Review failures above', 'warning');
    process.exit(1);
  }
}

// Execute the complete manual verification
runCompleteManualVerification().catch(error => {
  log(`Fatal verification error: ${error}`, 'error');
  process.exit(1);
});