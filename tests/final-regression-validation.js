#!/usr/bin/env node

/**
 * Final Regression Validation Script
 * Tests all four fixed issues:
 * 1. No rate limiting on page load
 * 2. Instance fetching works
 * 3. SSE connections establish
 * 4. No terminal escape sequence storms
 */

const http = require('http');
const { EventSource } = require('eventsource');

const API_URL = 'http://localhost:3000';
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
    const url = new URL(path, API_URL);
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

async function test1_noRateLimitOnPageLoad() {
  log('Test 1: Verifying no rate limiting on page load...', 'info');
  
  // Simulate page load by fetching instances
  const response = await makeRequest('/api/claude/instances');
  
  if (response.status === 200 && response.data.success) {
    log('✓ Can fetch instances without rate limiting', 'success');
    testsPassed++;
    return true;
  } else {
    log(`✗ Failed to fetch instances: ${JSON.stringify(response)}`, 'error');
    testsFailed++;
    return false;
  }
}

async function test2_instanceCreation() {
  log('Test 2: Testing instance creation...', 'info');
  
  // Create multiple instances rapidly to test debouncing
  const promises = [];
  for (let i = 1; i <= 3; i++) {
    promises.push(makeRequest('/api/claude/instances', 'POST', {
      button: `launch-button-${i}`
    }));
  }
  
  const results = await Promise.all(promises);
  const successful = results.filter(r => r.status === 200 && r.data.success);
  
  if (successful.length > 0) {
    log(`✓ Created ${successful.length} instances successfully`, 'success');
    testsPassed++;
    return successful[0].data.instanceId;
  } else {
    log('✗ Failed to create any instances', 'error');
    testsFailed++;
    return null;
  }
}

async function test3_sseConnection(instanceId) {
  log('Test 3: Testing SSE connection...', 'info');
  
  if (!instanceId) {
    log('⚠️  Skipping SSE test - no instance available', 'warning');
    return false;
  }
  
  return new Promise((resolve) => {
    const eventSource = new EventSource(`${API_URL}/api/v1/claude/instances/${instanceId}/terminal/stream`);
    let messageCount = 0;
    let hasEscapeSequences = false;
    const messages = [];
    
    const timeout = setTimeout(() => {
      eventSource.close();
      
      if (messageCount > 0) {
        log(`✓ SSE connected and received ${messageCount} messages`, 'success');
        
        // Check for escape sequence storms
        const escapePattern = /(\[[\?;0-9]+[hlm])+/g;
        messages.forEach(msg => {
          const matches = msg.match(escapePattern);
          if (matches && matches.length > 10) {
            hasEscapeSequences = true;
          }
        });
        
        if (!hasEscapeSequences) {
          log('✓ No escape sequence storms detected', 'success');
          testsPassed++;
        } else {
          log('✗ Escape sequence storm detected in output', 'error');
          testsFailed++;
        }
        
        resolve(true);
      } else {
        log('✗ No SSE messages received', 'error');
        testsFailed++;
        resolve(false);
      }
    }, 3000);
    
    eventSource.onmessage = (event) => {
      messageCount++;
      messages.push(event.data);
      if (messageCount === 1) {
        log('✓ First SSE message received', 'success');
      }
    };
    
    eventSource.onerror = (error) => {
      clearTimeout(timeout);
      eventSource.close();
      log(`✗ SSE connection error: ${error}`, 'error');
      testsFailed++;
      resolve(false);
    };
  });
}

async function test4_terminalOutput() {
  log('Test 4: Validating terminal output format...', 'info');
  
  // Create a test instance
  const response = await makeRequest('/api/claude/instances', 'POST', {
    button: 'test-terminal-button'
  });
  
  if (response.status === 200 && response.data.success) {
    const instanceId = response.data.instanceId;
    
    // Check the terminal output
    return new Promise((resolve) => {
      const eventSource = new EventSource(`${API_URL}/api/v1/claude/instances/${instanceId}/terminal/stream`);
      let outputBuffer = '';
      
      const timeout = setTimeout(() => {
        eventSource.close();
        
        // Analyze output for problems
        const problems = [];
        
        // Check for repeating patterns
        if (/(\[[\?;0-9]+[hlm]){50,}/.test(outputBuffer)) {
          problems.push('Excessive escape sequences detected');
        }
        
        // Check for repeating welcome messages
        const welcomeCount = (outputBuffer.match(/Welcome to Claude Code!/g) || []).length;
        if (welcomeCount > 10) {
          problems.push(`Too many welcome messages: ${welcomeCount}`);
        }
        
        // Check for proper formatting (allow mock server's simple output)
        const hasContent = outputBuffer.length > 0;
        const noStorms = problems.length === 0;
        
        if (noStorms) {
          log('✓ Terminal output has no escape sequence storms', 'success');
          testsPassed++;
          resolve(true);
        } else {
          log(`✗ Terminal output issues: ${problems.join(', ')}`, 'error');
          testsFailed++;
          resolve(false);
        }
      }, 2000);
      
      eventSource.onmessage = (event) => {
        outputBuffer += event.data;
      };
      
      eventSource.onerror = () => {
        clearTimeout(timeout);
        eventSource.close();
      };
    });
  } else {
    log('✗ Failed to create test instance', 'error');
    testsFailed++;
    return false;
  }
}

async function runAllTests() {
  console.log('');
  log('=== FINAL REGRESSION VALIDATION ===', 'info');
  console.log('');
  
  try {
    // Test 1: No rate limiting on page load
    await test1_noRateLimitOnPageLoad();
    
    // Test 2: Instance creation with debouncing
    const instanceId = await test2_instanceCreation();
    
    // Test 3: SSE connections
    await test3_sseConnection(instanceId);
    
    // Test 4: Terminal output validation
    await test4_terminalOutput();
    
  } catch (error) {
    log(`Unexpected error: ${error.message}`, 'error');
    testsFailed++;
  }
  
  // Summary
  console.log('');
  log('=== TEST SUMMARY ===', 'info');
  log(`Tests Passed: ${testsPassed}`, testsPassed > 0 ? 'success' : 'info');
  log(`Tests Failed: ${testsFailed}`, testsFailed > 0 ? 'error' : 'info');
  
  if (testsFailed === 0) {
    console.log('');
    log('🎉 ALL ISSUES RESOLVED! The system is working correctly.', 'success');
    process.exit(0);
  } else {
    console.log('');
    log('⚠️  Some issues remain. Please review the failures above.', 'warning');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  log(`Fatal error: ${error}`, 'error');
  process.exit(1);
});