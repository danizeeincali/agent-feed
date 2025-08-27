/**
 * SSE Stable Connection E2E Test Suite
 * 
 * Validates the ECONNRESET fix and stable SSE terminal session flow
 * Tests the following stable session flow:
 * 1. Create Claude instance → Shows "running" status
 * 2. Send first command → Connection persists (not "disconnected") 
 * 3. Send second command → Same connection used (no reconnect)
 * 4. Send third command → Interactive session maintained
 * 5. Verify no ECONNRESET errors in backend logs
 * 
 * Target stable behavior:
 * ✅ Connection status remains "connected" throughout session
 * ✅ Single SSE connection handles multiple commands
 * ✅ No ECONNRESET errors in backend logs  
 * ✅ Claude interactive session maintains state
 */

const { test, expect } = require('@playwright/test');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  FRONTEND_URL: 'http://localhost:5173',
  BACKEND_URL: 'http://localhost:3000',
  BACKEND_SCRIPT: '/workspaces/agent-feed/simple-backend.js',
  TEST_TIMEOUT: 90000,
  COMMAND_WAIT: 3000,
  CONNECTION_TIMEOUT: 15000,
  BACKEND_STARTUP_DELAY: 5000
};

// Global backend process reference
let backendProcess = null;
let backendLogs = [];
let testStartTime = Date.now();

/**
 * Capture backend logs for ECONNRESET analysis
 */
function captureBackendLogs(data) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${data.toString()}`;
  backendLogs.push(logEntry);
  
  // Log critical connection events
  if (data.toString().includes('SSE') || data.toString().includes('ECONNRESET')) {
    console.log('🔍 Backend SSE Log:', logEntry);
  }
}

/**
 * Start dedicated backend server for E2E testing
 */
async function startBackendServer() {
  console.log('🚀 Starting dedicated backend server for E2E testing...');
  
  // Kill any existing processes on port 3000
  try {
    execSync('pkill -f "node.*simple-backend.js" || true', { stdio: 'ignore' });
    execSync('lsof -ti:3000 | xargs kill -9 || true', { stdio: 'ignore' });
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (error) {
    console.log('📝 No existing processes to kill');
  }

  backendProcess = spawn('node', [CONFIG.BACKEND_SCRIPT], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'test' }
  });

  // Capture all backend output
  backendProcess.stdout.on('data', captureBackendLogs);
  backendProcess.stderr.on('data', captureBackendLogs);

  backendProcess.on('error', (error) => {
    console.error('❌ Backend process error:', error);
  });

  backendProcess.on('exit', (code, signal) => {
    console.log(`🏁 Backend process exited with code ${code}, signal ${signal}`);
  });

  // Wait for server startup
  console.log('⏳ Waiting for backend server startup...');
  await new Promise(resolve => setTimeout(resolve, CONFIG.BACKEND_STARTUP_DELAY));

  // Verify backend is responding
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${CONFIG.BACKEND_URL}/health`);
      if (response.ok) {
        console.log('✅ Backend server is responding');
        return true;
      }
    } catch (error) {
      attempts++;
      console.log(`🔄 Backend startup attempt ${attempts}/${maxAttempts}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error('❌ Backend server failed to start after maximum attempts');
}

/**
 * Stop backend server and analyze logs
 */
async function stopBackendServer() {
  if (backendProcess && !backendProcess.killed) {
    console.log('🛑 Stopping backend server...');
    backendProcess.kill('SIGTERM');
    
    // Wait for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!backendProcess.killed) {
      console.log('⚡ Force killing backend server...');
      backendProcess.kill('SIGKILL');
    }
  }
  
  // Analyze captured logs
  analyzeBackendLogs();
}

/**
 * Analyze backend logs for ECONNRESET errors and connection patterns
 */
function analyzeBackendLogs() {
  console.log('\n📊 BACKEND LOG ANALYSIS');
  console.log('='.repeat(50));
  
  const econnresetErrors = backendLogs.filter(log => log.includes('ECONNRESET'));
  const sseConnections = backendLogs.filter(log => log.includes('SSE connection'));
  const connectionCounts = backendLogs.filter(log => log.includes('connections for claude-'));
  const statusBroadcasts = backendLogs.filter(log => log.includes('Broadcasting status'));
  
  console.log(`📈 Total log entries: ${backendLogs.length}`);
  console.log(`❌ ECONNRESET errors: ${econnresetErrors.length}`);
  console.log(`🔗 SSE connection events: ${sseConnections.length}`);
  console.log(`📊 Connection count logs: ${connectionCounts.length}`);
  console.log(`📡 Status broadcasts: ${statusBroadcasts.length}`);
  
  // Show ECONNRESET errors if any
  if (econnresetErrors.length > 0) {
    console.log('\n❌ ECONNRESET ERROR DETAILS:');
    econnresetErrors.forEach((error, idx) => {
      console.log(`${idx + 1}. ${error}`);
    });
  } else {
    console.log('\n✅ NO ECONNRESET ERRORS FOUND - FIX SUCCESSFUL!');
  }
  
  // Show connection patterns
  if (connectionCounts.length > 0) {
    console.log('\n📊 CONNECTION COUNT PATTERNS:');
    connectionCounts.slice(-5).forEach(log => console.log(log));
  }
  
  console.log('='.repeat(50));
}

/**
 * Wait for element with enhanced error reporting
 */
async function waitForElement(page, selector, options = {}) {
  const timeout = options.timeout || 10000;
  
  try {
    await page.waitForSelector(selector, { timeout, ...options });
    return true;
  } catch (error) {
    console.error(`❌ Element not found: ${selector}`);
    console.error(`   Timeout: ${timeout}ms`);
    
    // Take debug screenshot
    try {
      await page.screenshot({ path: `/tmp/element-not-found-${Date.now()}.png` });
      console.log('📸 Debug screenshot saved');
    } catch (screenshotError) {
      console.error('📸 Screenshot failed:', screenshotError);
    }
    
    throw error;
  }
}

/**
 * Monitor connection status changes during test
 */
async function monitorConnectionStatus(page, testName) {
  const statusChanges = [];
  
  // Monitor connection status element
  try {
    const statusElement = await page.waitForSelector('.connection-status', { timeout: 5000 });
    
    // Capture initial status
    const initialStatus = await statusElement.textContent();
    statusChanges.push({ time: Date.now(), status: initialStatus, event: 'initial' });
    
    // Set up status change monitoring
    await page.evaluate(() => {
      const statusEl = document.querySelector('.connection-status');
      if (statusEl) {
        window.statusObserver = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
              const currentStatus = statusEl.textContent;
              window.statusChanges = window.statusChanges || [];
              window.statusChanges.push({
                time: Date.now(),
                status: currentStatus,
                event: 'change'
              });
            }
          });
        });
        window.statusObserver.observe(statusEl, { 
          childList: true, 
          subtree: true, 
          characterData: true 
        });
      }
    });
    
    return statusChanges;
    
  } catch (error) {
    console.warn(`⚠️ Could not monitor connection status for ${testName}:`, error.message);
    return [];
  }
}

/**
 * Extract status changes from page
 */
async function getStatusChanges(page) {
  try {
    return await page.evaluate(() => {
      return window.statusChanges || [];
    });
  } catch (error) {
    console.warn('⚠️ Could not extract status changes:', error.message);
    return [];
  }
}

// Test suite setup and teardown
test.beforeAll(async () => {
  console.log('\n🧪 SSE STABLE CONNECTION E2E TEST SUITE');
  console.log('='.repeat(60));
  
  testStartTime = Date.now();
  backendLogs = [];
  
  await startBackendServer();
});

test.afterAll(async () => {
  await stopBackendServer();
  
  const totalTime = ((Date.now() - testStartTime) / 1000).toFixed(2);
  console.log(`\n⏱️ Total test suite time: ${totalTime}s`);
  console.log('='.repeat(60));
});

// Individual test timeout
test.setTimeout(CONFIG.TEST_TIMEOUT);

test.describe('SSE Stable Connection Flow', () => {

  test('validates stable session flow without ECONNRESET', async ({ page }) => {
    console.log('\n🎯 TEST: Stable Session Flow Validation');
    
    // Step 1: Navigate to Claude instances page
    console.log('🔗 Step 1: Navigate to Claude instances page');
    await page.goto(`${CONFIG.FRONTEND_URL}/claude-instances`);
    await page.waitForLoadState('networkidle');
    
    // Setup connection status monitoring
    const statusMonitoring = await monitorConnectionStatus(page, 'stable-session');
    
    // Step 2: Create Claude instance
    console.log('🚀 Step 2: Create Claude instance');
    await waitForElement(page, '.btn-prod', { timeout: 15000 });
    
    // Click the create instance button
    await page.click('.btn-prod');
    console.log('✅ Instance creation initiated');
    
    // Wait for instance to appear in list with "running" status
    console.log('⏳ Waiting for instance to show "running" status...');
    await waitForElement(page, '.instance-item.status-running', { timeout: 20000 });
    console.log('✅ Instance shows "running" status');
    
    // Select the instance
    await page.click('.instance-item.status-running');
    console.log('✅ Instance selected');
    
    // Wait for terminal interface to be ready
    await waitForElement(page, '.input-field', { timeout: 10000 });
    await waitForElement(page, '.output-area', { timeout: 10000 });
    console.log('✅ Terminal interface ready');
    
    // Verify connection status is "connected" (not "disconnected")
    const connectionStatus = await page.textContent('.connection-status');
    console.log(`📊 Initial connection status: "${connectionStatus}"`);
    expect(connectionStatus).not.toContain('disconnected');
    expect(connectionStatus).not.toContain('Connection Error');
    
    // Step 3: Send first command and verify connection persists
    console.log('⌨️ Step 3: Send first command');
    await page.fill('.input-field', 'echo "First command test"');
    await page.click('.btn-send');
    console.log('✅ First command sent');
    
    // Wait for response and verify connection status
    await new Promise(resolve => setTimeout(resolve, CONFIG.COMMAND_WAIT));
    
    const statusAfterFirst = await page.textContent('.connection-status');
    console.log(`📊 Status after first command: "${statusAfterFirst}"`);
    
    // CRITICAL: Connection should remain stable, not show "disconnected"
    expect(statusAfterFirst).not.toContain('disconnected');
    expect(statusAfterFirst).not.toContain('Connection Error');
    
    // Step 4: Send second command using same connection
    console.log('⌨️ Step 4: Send second command');
    await page.fill('.input-field', 'echo "Second command test"');
    await page.click('.btn-send');
    console.log('✅ Second command sent');
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, CONFIG.COMMAND_WAIT));
    
    const statusAfterSecond = await page.textContent('.connection-status');
    console.log(`📊 Status after second command: "${statusAfterSecond}"`);
    
    // Verify connection is still stable (no reconnect)
    expect(statusAfterSecond).not.toContain('disconnected');
    expect(statusAfterSecond).not.toContain('Connection Error');
    
    // Step 5: Send third command to confirm interactive session
    console.log('⌨️ Step 5: Send third command');
    await page.fill('.input-field', 'echo "Third command test - session maintained"');
    await page.click('.btn-send');
    console.log('✅ Third command sent');
    
    // Wait for final response
    await new Promise(resolve => setTimeout(resolve, CONFIG.COMMAND_WAIT));
    
    const statusAfterThird = await page.textContent('.connection-status');
    console.log(`📊 Final status after third command: "${statusAfterThird}"`);
    
    // Final connection status verification
    expect(statusAfterThird).not.toContain('disconnected');
    expect(statusAfterThird).not.toContain('Connection Error');
    
    // Step 6: Verify terminal output shows all commands
    const terminalOutput = await page.textContent('.output-area pre');
    console.log('📝 Verifying terminal output contains all commands...');
    
    // All commands should be visible in output (indicating persistent session)
    expect(terminalOutput).toContain('First command test');
    expect(terminalOutput).toContain('Second command test');  
    expect(terminalOutput).toContain('Third command test');
    console.log('✅ All commands visible in persistent session output');
    
    // Get final status changes for analysis
    const finalStatusChanges = await getStatusChanges(page);
    console.log('📊 Status changes during test:', finalStatusChanges.length);
    
    if (finalStatusChanges.length > 0) {
      console.log('📊 Status change timeline:');
      finalStatusChanges.forEach((change, idx) => {
        console.log(`   ${idx + 1}. ${change.event}: "${change.status}"`);
      });
    }
    
    console.log('✅ TEST PASSED: Stable session flow validated');
  });

  test('verifies no ECONNRESET errors in backend logs', async ({ page }) => {
    console.log('\n🔍 TEST: Backend Log ECONNRESET Verification');
    
    // Navigate and perform basic interaction to generate logs
    await page.goto(`${CONFIG.FRONTEND_URL}/claude-instances`);
    await page.waitForLoadState('networkidle');
    
    // Create instance and send commands to generate SSE traffic
    await waitForElement(page, '.btn-skip-perms', { timeout: 15000 });
    await page.click('.btn-skip-perms');
    
    // Wait for instance to be created
    await waitForElement(page, '.instance-item', { timeout: 20000 });
    await page.click('.instance-item');
    
    // Send multiple commands to stress test the connection
    const testCommands = [
      'help',
      'echo "Connection stability test"',
      'pwd',
      'ls',
      'echo "Final stability check"'
    ];
    
    for (let i = 0; i < testCommands.length; i++) {
      console.log(`⌨️ Sending command ${i + 1}/${testCommands.length}: ${testCommands[i]}`);
      
      await waitForElement(page, '.input-field', { timeout: 5000 });
      await page.fill('.input-field', testCommands[i]);
      await page.click('.btn-send');
      
      // Wait between commands
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Allow time for all backend processing
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Analyze logs (will be done in afterAll, but we can check here too)
    const econnresetCount = backendLogs.filter(log => log.includes('ECONNRESET')).length;
    const sseConnectionCount = backendLogs.filter(log => log.includes('SSE connection')).length;
    
    console.log(`📊 Current ECONNRESET errors in logs: ${econnresetCount}`);
    console.log(`📊 SSE connection events in logs: ${sseConnectionCount}`);
    
    // The test passes if we have SSE connections but no ECONNRESET errors
    expect(econnresetCount).toBe(0);
    expect(sseConnectionCount).toBeGreaterThan(0);
    
    console.log('✅ TEST PASSED: No ECONNRESET errors found in backend logs');
  });

  test('validates single persistent SSE connection pattern', async ({ page }) => {
    console.log('\n📡 TEST: Single Persistent SSE Connection Pattern');
    
    await page.goto(`${CONFIG.FRONTEND_URL}/claude-instances`);
    await page.waitForLoadState('networkidle');
    
    // Create instance
    await waitForElement(page, '.btn-skip-perms-c', { timeout: 15000 });
    await page.click('.btn-skip-perms-c');
    
    // Wait for instance and select it
    await waitForElement(page, '.instance-item', { timeout: 20000 });
    const instanceElement = await page.$('.instance-item');
    const instanceId = await instanceElement.getAttribute('data-instance-id') || 
                      await page.textContent('.instance-id');
    
    console.log(`🆔 Testing with instance: ${instanceId}`);
    
    await page.click('.instance-item');
    await waitForElement(page, '.input-field', { timeout: 10000 });
    
    // Clear previous logs and start monitoring
    const preTestLogCount = backendLogs.length;
    
    // Send sequential commands
    const commands = ['echo "test1"', 'echo "test2"', 'echo "test3"'];
    
    for (let i = 0; i < commands.length; i++) {
      console.log(`⌨️ Command ${i + 1}: ${commands[i]}`);
      
      await page.fill('.input-field', commands[i]);
      await page.click('.btn-send');
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verify connection status remains stable
      const currentStatus = await page.textContent('.connection-status');
      console.log(`📊 Status after command ${i + 1}: "${currentStatus}"`);
      expect(currentStatus).not.toContain('disconnected');
    }
    
    // Analyze connection pattern in logs since test start
    const newLogs = backendLogs.slice(preTestLogCount);
    const connectionEvents = newLogs.filter(log => 
      log.includes('SSE connection') || log.includes('connections for claude-')
    );
    
    console.log('📊 Connection events during test:');
    connectionEvents.forEach((event, idx) => {
      console.log(`   ${idx + 1}. ${event}`);
    });
    
    // Verify pattern: should see connection establishment but not constant reconnections
    const connectionEstablished = connectionEvents.some(log => log.includes('established'));
    const connectionClosed = connectionEvents.filter(log => log.includes('closed')).length;
    
    expect(connectionEstablished).toBe(true);
    // Should not have excessive connection closures (some are normal, but not one per command)
    expect(connectionClosed).toBeLessThan(commands.length);
    
    console.log('✅ TEST PASSED: Single persistent connection pattern validated');
  });

  test('validates interactive session state maintenance', async ({ page }) => {
    console.log('\n🔄 TEST: Interactive Session State Maintenance');
    
    await page.goto(`${CONFIG.FRONTEND_URL}/claude-instances`);
    await page.waitForLoadState('networkidle');
    
    // Create and select instance
    await waitForElement(page, '.btn-skip-perms-resume', { timeout: 15000 });
    await page.click('.btn-skip-perms-resume');
    
    await waitForElement(page, '.instance-item', { timeout: 20000 });
    await page.click('.instance-item');
    await waitForElement(page, '.input-field', { timeout: 10000 });
    
    // Test session state by running commands that build on each other
    console.log('⌨️ Testing session state with sequential commands...');
    
    // Command 1: Set up environment
    await page.fill('.input-field', 'echo "Session start"');
    await page.click('.btn-send');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Command 2: Check working directory
    await page.fill('.input-field', 'pwd');
    await page.click('.btn-send');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Command 3: List directory contents
    await page.fill('.input-field', 'ls');
    await page.click('.btn-send');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Command 4: Final state check
    await page.fill('.input-field', 'echo "Session maintained"');
    await page.click('.btn-send');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify all command outputs are present in terminal
    const finalOutput = await page.textContent('.output-area pre');
    
    expect(finalOutput).toContain('Session start');
    expect(finalOutput).toContain('/workspaces/agent-feed');  // pwd output
    expect(finalOutput).toContain('Session maintained');
    
    // Verify connection remained stable throughout
    const finalStatus = await page.textContent('.connection-status');
    expect(finalStatus).not.toContain('disconnected');
    expect(finalStatus).not.toContain('Connection Error');
    
    console.log('✅ TEST PASSED: Interactive session state maintained');
  });

});

test.describe('ECONNRESET Fix Validation', () => {

  test('stress tests connection stability with rapid commands', async ({ page }) => {
    console.log('\n⚡ TEST: Connection Stability Under Stress');
    
    await page.goto(`${CONFIG.FRONTEND_URL}/claude-instances`);
    await page.waitForLoadState('networkidle');
    
    // Create instance
    await waitForElement(page, '.btn-prod', { timeout: 15000 });
    await page.click('.btn-prod');
    
    await waitForElement(page, '.instance-item', { timeout: 20000 });
    await page.click('.instance-item');
    await waitForElement(page, '.input-field', { timeout: 10000 });
    
    // Send rapid sequence of commands to stress test
    const rapidCommands = [
      'echo "rapid1"',
      'echo "rapid2"', 
      'echo "rapid3"',
      'echo "rapid4"',
      'echo "rapid5"'
    ];
    
    console.log('⚡ Sending rapid command sequence...');
    
    for (let i = 0; i < rapidCommands.length; i++) {
      await page.fill('.input-field', rapidCommands[i]);
      await page.click('.btn-send');
      
      // Minimal delay between commands (stress test)
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Wait for all processing to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check connection status after stress test
    const stressTestStatus = await page.textContent('.connection-status');
    console.log(`📊 Status after stress test: "${stressTestStatus}"`);
    
    expect(stressTestStatus).not.toContain('disconnected');
    expect(stressTestStatus).not.toContain('Connection Error');
    
    // Verify output contains all rapid commands
    const stressOutput = await page.textContent('.output-area pre');
    rapidCommands.forEach(cmd => {
      expect(stressOutput).toContain(cmd.replace('echo "', '').replace('"', ''));
    });
    
    console.log('✅ TEST PASSED: Connection survived stress test');
  });

  test('validates connection recovery after temporary network issue', async ({ page }) => {
    console.log('\n🔄 TEST: Connection Recovery After Network Issue');
    
    await page.goto(`${CONFIG.FRONTEND_URL}/claude-instances`);
    await page.waitForLoadState('networkidle');
    
    // Create and connect to instance
    await waitForElement(page, '.btn-skip-perms', { timeout: 15000 });
    await page.click('.btn-skip-perms');
    
    await waitForElement(page, '.instance-item', { timeout: 20000 });
    await page.click('.instance-item');
    await waitForElement(page, '.input-field', { timeout: 10000 });
    
    // Send initial command to establish connection
    await page.fill('.input-field', 'echo "Before network issue"');
    await page.click('.btn-send');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate network interruption by temporarily blocking requests
    console.log('🚫 Simulating network interruption...');
    await page.route(`${CONFIG.BACKEND_URL}/**`, route => {
      // Block requests for 3 seconds
      setTimeout(() => {
        route.continue();
      }, 3000);
    });
    
    // Try to send command during network issue
    await page.fill('.input-field', 'echo "During network issue"');
    await page.click('.btn-send');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Remove network blocking
    console.log('✅ Restoring network connection...');
    await page.unroute(`${CONFIG.BACKEND_URL}/**`);
    
    // Wait for recovery and send final command
    await new Promise(resolve => setTimeout(resolve, 5000));
    await page.fill('.input-field', 'echo "After network recovery"');
    await page.click('.btn-send');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify connection recovered
    const recoveryStatus = await page.textContent('.connection-status');
    console.log(`📊 Status after recovery: "${recoveryStatus}"`);
    
    // Connection should either be stable or show polling fallback (both are acceptable)
    expect(recoveryStatus).not.toContain('Connection Error');
    
    console.log('✅ TEST PASSED: Connection recovery validated');
  });

});