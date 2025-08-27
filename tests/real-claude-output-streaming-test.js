#!/usr/bin/env node

/**
 * Real Claude Output Streaming E2E Test Suite
 * 
 * Comprehensive Playwright test for bidirectional Claude communication
 * Validates complete flow:
 * 1. Button click → Claude process spawns 
 * 2. Type command → Input reaches Claude
 * 3. Claude responds → Output appears in frontend terminal
 * 4. Verify real Claude startup messages (not mocks)
 * 
 * Current broken behavior being tested:
 * - Input sent but no output received
 * - Frontend shows "Waiting for real output"  
 * - Backend captures no stdout/stderr
 */

const { test, expect } = require('@playwright/test');
const { spawn } = require('child_process');
const path = require('path');

// Test Configuration
const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_SCRIPT = path.join(process.cwd(), 'simple-backend.js');

// Test Timeouts
const TIMEOUTS = {
  BACKEND_START: 5000,      // Backend startup
  PROCESS_SPAWN: 15000,     // Claude process spawning
  FIRST_OUTPUT: 25000,      // First real Claude output
  COMMAND_RESPONSE: 30000,  // Command response
  SSE_CONNECTION: 10000,    // SSE connection establishment
  OUTPUT_STABILIZE: 3000    // Output stabilization time
};

// Real Claude output patterns (not mocks)
const REAL_OUTPUT_PATTERNS = {
  // Avoid these mock patterns
  FORBIDDEN_MOCKS: [
    '[RESPONSE] Claude Code session started',
    'HTTP/SSE terminal active',
    'WebSocket storm eliminated',
    'Mock Claude response',
    'Waiting for real output'
  ],
  
  // Expected real Claude patterns
  EXPECTED_REAL: [
    /claude/i,                    // Claude mentions itself
    /workspaces\/agent-feed/,     // Real working directory
    /\$ /,                        // Shell prompt 
    /command/i,                   // Command processing
    /Welcome to Claude/i          // Claude greeting
  ]
};

/**
 * Real Claude Communication Validation Test Suite
 */
test.describe('Real Claude Output Streaming E2E Tests', () => {
  let backendProcess;
  let backendHealthy = false;
  let createdInstances = [];

  /**
   * Setup: Start backend server and validate health
   */
  test.beforeAll(async () => {
    console.log('🚀 Starting backend server for E2E tests...');
    
    // Start backend server
    backendProcess = spawn('node', [BACKEND_SCRIPT], {
      cwd: process.cwd(),
      stdio: ['inherit', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    // Monitor backend output for debugging
    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server running') || output.includes('Claude')) {
        console.log('🔧 Backend:', output.trim());
      }
    });

    backendProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error('❌ Backend Error:', error.trim());
    });

    // Wait for backend to be ready
    await new Promise(resolve => setTimeout(resolve, TIMEOUTS.BACKEND_START));

    // Validate backend health
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      const data = await response.json();
      backendHealthy = data.status === 'healthy';
      console.log('🏥 Backend Health:', backendHealthy ? 'HEALTHY' : 'UNHEALTHY', data);
    } catch (error) {
      console.error('❌ Backend health check failed:', error.message);
      backendHealthy = false;
    }

    if (!backendHealthy) {
      console.error('❌ Backend is not healthy - tests will be skipped');
    }
  });

  /**
   * Cleanup: Stop backend server and clean instances
   */
  test.afterAll(async () => {
    // Clean up any created instances
    for (const instanceId of createdInstances) {
      try {
        await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}`, { 
          method: 'DELETE' 
        });
        console.log(`🧹 Cleaned up instance: ${instanceId}`);
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup ${instanceId}:`, error.message);
      }
    }

    // Stop backend server
    if (backendProcess) {
      backendProcess.kill('SIGTERM');
      
      // Force kill if not terminated within 5 seconds
      setTimeout(() => {
        if (!backendProcess.killed) {
          backendProcess.kill('SIGKILL');
        }
      }, 5000);

      console.log('🛑 Backend server stopped');
    }
  });

  /**
   * TEST 1: Button Click → Real Claude Process Spawning
   * 
   * Validates:
   * - Button click triggers actual Claude process spawn (not mock)
   * - Real PID assigned (not hardcoded)
   * - Instance appears in UI with correct status
   * - Backend process tracking works correctly
   */
  test('should spawn real Claude process when button clicked', async ({ page }) => {
    test.skip(!backendHealthy, 'Backend not healthy - skipping test');
    
    console.log('🧪 TEST 1: Button Click → Real Claude Process Spawning');

    // Navigate to frontend
    await page.goto(`${FRONTEND_URL}/claude-instances`, { waitUntil: 'networkidle' });
    
    // Verify Claude Instance Manager loaded
    await expect(page.locator('h2:has-text("Claude Instance Manager")')).toBeVisible();

    // Monitor browser console for errors
    const consoleMessages = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push({ type: msg.type(), text });
      if (msg.type() === 'error' || text.includes('claude-') || text.includes('instance')) {
        console.log(`🌐 Browser ${msg.type()}: ${text}`);
      }
    });

    // Click spawn button to create real Claude process
    const skipPermsButton = page.locator('button:has-text("skip-permissions")').first();
    await expect(skipPermsButton).toBeVisible();
    
    console.log('🖱️ Clicking skip-permissions button to spawn Claude...');
    await skipPermsButton.click();

    // Wait for instance to appear in UI
    console.log('⏱️ Waiting for instance to appear in UI...');
    await expect(page.locator('.instance-item')).toBeVisible({ 
      timeout: TIMEOUTS.PROCESS_SPAWN 
    });

    // Extract instance ID from UI
    const instanceElement = page.locator('.instance-item').first();
    const instanceIdText = await instanceElement.locator('.instance-id').textContent();
    const instanceId = instanceIdText.replace('ID: ', '').trim();
    
    // Validate real instance ID format (not mock)
    expect(instanceId).toMatch(/^claude-\d+$/);
    console.log(`✅ Real Claude instance created: ${instanceId}`);
    createdInstances.push(instanceId);

    // Wait for status progression: starting → running
    console.log('⏱️ Waiting for status to become "running"...');
    await expect(instanceElement.locator('.status-text')).toHaveText('running', { 
      timeout: TIMEOUTS.PROCESS_SPAWN 
    });

    // Validate instance has real PID (not hardcoded)
    const pidElement = instanceElement.locator('.instance-pid');
    if (await pidElement.count() > 0) {
      const pidText = await pidElement.textContent();
      const pid = pidText.replace('PID: ', '').trim();
      const pidNumber = parseInt(pid);
      expect(pidNumber).toBeGreaterThan(0);
      expect(pidNumber).not.toBe(1234); // Common hardcoded mock PID
      console.log(`✅ Instance has real system PID: ${pid}`);
    }

    // Verify backend has real process data
    const backendResponse = await fetch(`${BACKEND_URL}/api/claude/instances`);
    const backendData = await backendResponse.json();
    const backendInstance = backendData.instances.find(i => i.id === instanceId);

    expect(backendInstance).toBeDefined();
    expect(backendInstance.pid).toBeGreaterThan(0);
    expect(backendInstance.status).toBe('running');
    expect(backendInstance.workingDirectory).toBeTruthy();
    expect(backendInstance.command).toContain('claude');

    console.log('✅ Backend confirms real process:', {
      id: backendInstance.id,
      pid: backendInstance.pid,
      status: backendInstance.status,
      workingDirectory: backendInstance.workingDirectory,
      command: backendInstance.command
    });
  });

  /**
   * TEST 2: Real Claude Startup Output (No Mock Responses)
   * 
   * Validates:
   * - Terminal displays actual Claude startup messages
   * - No "[RESPONSE] Claude Code session started" mock text
   * - No "Waiting for real output" placeholder messages
   * - Real working directory shown from Claude process
   */
  test('should display real Claude startup output without mocks', async ({ page }) => {
    test.skip(!backendHealthy, 'Backend not healthy - skipping test');
    
    console.log('🧪 TEST 2: Real Claude Startup Output (No Mock Responses)');

    // Navigate and spawn instance
    await page.goto(`${FRONTEND_URL}/claude-instances`, { waitUntil: 'networkidle' });
    await expect(page.locator('h2:has-text("Claude Instance Manager")')).toBeVisible();

    const skipPermsButton = page.locator('button:has-text("skip-permissions")').first();
    await skipPermsButton.click();

    // Wait for instance and select it
    const instanceElement = page.locator('.instance-item').first();
    await expect(instanceElement).toBeVisible({ timeout: TIMEOUTS.PROCESS_SPAWN });

    const instanceIdText = await instanceElement.locator('.instance-id').textContent();
    const instanceId = instanceIdText.replace('ID: ', '').trim();
    createdInstances.push(instanceId);

    // Wait for running status
    await expect(instanceElement.locator('.status-text')).toHaveText('running', { 
      timeout: TIMEOUTS.PROCESS_SPAWN 
    });

    // Select the instance to view terminal output
    await instanceElement.click();
    console.log(`✅ Selected instance: ${instanceId}`);

    // Wait for terminal output area to be visible
    const outputArea = page.locator('.output-area pre');
    await expect(outputArea).toBeVisible();

    // Wait for real Claude output to appear (not placeholders)
    console.log('⏱️ Waiting for real Claude output...');
    let realOutputDetected = false;
    let outputText = '';

    // Wait up to FIRST_OUTPUT timeout for real content
    const startTime = Date.now();
    while (Date.now() - startTime < TIMEOUTS.FIRST_OUTPUT && !realOutputDetected) {
      outputText = await outputArea.textContent();
      
      // Check if we have moved beyond placeholder messages
      if (outputText.length > 50 && 
          !outputText.includes('Waiting for real output') &&
          !outputText.includes('Connecting to instance')) {
        realOutputDetected = true;
      }
      
      await page.waitForTimeout(500);
    }

    console.log('📺 Terminal Output Sample:', outputText.substring(0, 300) + '...');

    // Validate NO mock responses are present
    for (const mockPattern of REAL_OUTPUT_PATTERNS.FORBIDDEN_MOCKS) {
      expect(outputText).not.toContain(mockPattern);
    }
    console.log('✅ No mock responses detected in terminal output');

    // Validate real output patterns are present
    let realPatternsFound = 0;
    for (const pattern of REAL_OUTPUT_PATTERNS.EXPECTED_REAL) {
      if (pattern.test(outputText)) {
        realPatternsFound++;
        console.log(`✅ Real pattern found: ${pattern}`);
      }
    }

    expect(realPatternsFound).toBeGreaterThan(0);
    console.log(`✅ Found ${realPatternsFound} real Claude output patterns`);

    // Verify terminal shows substantial output (not just placeholders)
    expect(outputText.length).toBeGreaterThan(100);
    expect(outputText.trim()).not.toBe('');
    
    console.log('✅ Terminal displays substantial real Claude output');
  });

  /**
   * TEST 3: Input → Claude Command Processing → Real Response
   * 
   * Validates:
   * - Command typed in frontend reaches real Claude process
   * - Real Claude processes the command  
   * - Authentic response appears in terminal (not mocked)
   * - Bidirectional communication works end-to-end
   */
  test('should process commands with real Claude responses', async ({ page }) => {
    test.skip(!backendHealthy, 'Backend not healthy - skipping test');
    
    console.log('🧪 TEST 3: Input → Claude Command Processing → Real Response');

    // Navigate, spawn, and select instance  
    await page.goto(`${FRONTEND_URL}/claude-instances`, { waitUntil: 'networkidle' });
    
    const skipPermsButton = page.locator('button:has-text("skip-permissions")').first();
    await skipPermsButton.click();

    const instanceElement = page.locator('.instance-item').first();
    await expect(instanceElement).toBeVisible({ timeout: TIMEOUTS.PROCESS_SPAWN });

    const instanceIdText = await instanceElement.locator('.instance-id').textContent();
    const instanceId = instanceIdText.replace('ID: ', '').trim();
    createdInstances.push(instanceId);

    await expect(instanceElement.locator('.status-text')).toHaveText('running', { 
      timeout: TIMEOUTS.PROCESS_SPAWN 
    });

    await instanceElement.click();

    // Wait for terminal to be ready and show initial output
    const outputArea = page.locator('.output-area pre');
    await expect(outputArea).toBeVisible();

    // Wait for any initial Claude output to settle
    await page.waitForTimeout(TIMEOUTS.OUTPUT_STABILIZE);

    // Get baseline output before sending commands
    const baselineOutput = await outputArea.textContent();
    console.log('📋 Baseline output length:', baselineOutput.length);

    // Test interactive commands with real Claude
    const testCommands = [
      {
        command: 'pwd',
        expectedPattern: /workspaces\/agent-feed/,
        description: 'Working directory command'
      },
      {
        command: 'echo "bidirectional-test-$(date +%s)"',
        expectedPattern: /bidirectional-test-\d+/,
        description: 'Echo with timestamp'
      },
      {
        command: 'whoami',
        expectedPattern: /(codespace|user|root|\w+)/,
        description: 'User identification'
      }
    ];

    const inputField = page.locator('.input-field');
    await expect(inputField).toBeVisible();

    for (const { command, expectedPattern, description } of testCommands) {
      console.log(`⌨️ Testing command: ${command} (${description})`);
      
      // Get output before command
      const outputBefore = await outputArea.textContent();
      
      // Send command
      await inputField.fill(command);
      await inputField.press('Enter');
      
      // Wait for command to be processed
      console.log(`⏱️ Waiting for response to: ${command}`);
      
      let responseDetected = false;
      const commandStartTime = Date.now();
      
      while (Date.now() - commandStartTime < TIMEOUTS.COMMAND_RESPONSE && !responseDetected) {
        const currentOutput = await outputArea.textContent();
        
        // Check if output has changed and contains our command
        if (currentOutput.length > outputBefore.length && 
            currentOutput.includes(command)) {
          responseDetected = true;
          
          // Validate response matches expected pattern
          if (expectedPattern.test(currentOutput)) {
            console.log(`✅ Real response received for: ${command}`);
            
            // Extract the relevant response part
            const responseSection = currentOutput.substring(outputBefore.length);
            console.log(`📤 Response: ${responseSection.substring(0, 100)}...`);
          } else {
            console.log(`⚠️ Response received but pattern not matched for: ${command}`);
          }
        }
        
        await page.waitForTimeout(1000);
      }

      if (!responseDetected) {
        console.warn(`⚠️ No response detected for command: ${command}`);
        // Log final output for debugging
        const finalOutput = await outputArea.textContent();
        console.log('📋 Final output sample:', finalOutput.substring(Math.max(0, finalOutput.length - 200)));
      }

      // Clear input field for next command
      await inputField.fill('');
    }

    // Validate final output contains all commands and responses
    const finalOutput = await outputArea.textContent();
    
    // Check all commands were sent
    for (const { command } of testCommands) {
      expect(finalOutput).toContain(command);
    }
    console.log('✅ All commands present in terminal output');

    // Validate output is substantial (indicating real processing)
    expect(finalOutput.length).toBeGreaterThan(baselineOutput.length + 100);
    console.log('✅ Substantial output increase confirms real command processing');

    // Validate no "Waiting for real output" messages remain
    expect(finalOutput).not.toContain('Waiting for real output');
    console.log('✅ No "Waiting for real output" placeholders remain');
  });

  /**
   * TEST 4: SSE Connection Stability and Real-Time Streaming
   * 
   * Validates:
   * - SSE connection established and maintained
   * - Real-time output streaming from Claude process  
   * - No connection drops during active session
   * - Multiple commands work without connection issues
   */
  test('should maintain stable SSE connection for real-time streaming', async ({ page }) => {
    test.skip(!backendHealthy, 'Backend not healthy - skipping test');
    
    console.log('🧪 TEST 4: SSE Connection Stability and Real-Time Streaming');

    await page.goto(`${FRONTEND_URL}/claude-instances`, { waitUntil: 'networkidle' });
    
    // Monitor network requests for SSE connections
    const sseRequests = [];
    page.on('request', request => {
      if (request.url().includes('stream')) {
        sseRequests.push(request.url());
        console.log('🌐 SSE Request:', request.url());
      }
    });

    // Spawn instance
    const skipPermsButton = page.locator('button:has-text("skip-permissions")').first();
    await skipPermsButton.click();

    const instanceElement = page.locator('.instance-item').first();
    await expect(instanceElement).toBeVisible({ timeout: TIMEOUTS.PROCESS_SPAWN });

    const instanceIdText = await instanceElement.locator('.instance-id').textContent();
    const instanceId = instanceIdText.replace('ID: ', '').trim();
    createdInstances.push(instanceId);

    await instanceElement.click();

    // Wait for connection status to show SSE
    console.log('⏱️ Waiting for SSE connection status...');
    await expect(page.locator('.connection-status')).toContainText('Connected', {
      timeout: TIMEOUTS.SSE_CONNECTION
    });

    const connectionStatus = await page.locator('.connection-status').textContent();
    console.log('🔗 Connection Status:', connectionStatus);

    // Validate SSE request was made
    expect(sseRequests.length).toBeGreaterThan(0);
    expect(sseRequests.some(url => url.includes(instanceId))).toBe(true);
    console.log('✅ SSE connection established');

    // Test connection stability with rapid commands
    const inputField = page.locator('.input-field');
    const rapidCommands = [
      'echo "stability-1"',
      'echo "stability-2"',
      'echo "stability-3"',
      'pwd',
      'echo "stability-final"'
    ];

    for (let i = 0; i < rapidCommands.length; i++) {
      const cmd = rapidCommands[i];
      console.log(`⚡ Rapid command ${i + 1}: ${cmd}`);
      
      await inputField.fill(cmd);
      await inputField.press('Enter');
      
      // Short delay between commands to test streaming stability
      await page.waitForTimeout(500);
      
      // Verify connection status remains stable
      const currentStatus = await page.locator('.connection-status').textContent();
      expect(currentStatus).toContain('Connected');
      expect(currentStatus).not.toContain('Error');
      expect(currentStatus).not.toContain('Disconnected');
    }

    console.log('✅ Connection remained stable through rapid commands');

    // Wait for all commands to process
    await page.waitForTimeout(TIMEOUTS.OUTPUT_STABILIZE);

    // Validate all commands appear in output (confirming streaming worked)
    const finalOutput = await page.locator('.output-area pre').textContent();
    
    for (const cmd of rapidCommands) {
      expect(finalOutput).toContain(cmd);
    }
    console.log('✅ All rapid commands streamed successfully');

    // Final connection status check
    const finalStatus = await page.locator('.connection-status').textContent();
    expect(finalStatus).toContain('Connected');
    console.log('✅ Final connection status:', finalStatus);
  });

  /**
   * TEST 5: Backend Process Health and Real System Integration
   * 
   * Validates:
   * - Backend reports real process health data
   * - System resources are actually consumed (not mocked)
   * - Process lifecycle properly managed
   * - Real working directory resolution works
   */
  test('should validate backend process health and system integration', async ({ page }) => {
    test.skip(!backendHealthy, 'Backend not healthy - skipping test');
    
    console.log('🧪 TEST 5: Backend Process Health and Real System Integration');

    // Spawn instance via API directly for precise control
    console.log('🚀 Creating instance via API...');
    const createResponse = await fetch(`${BACKEND_URL}/api/claude/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: ['claude', '--dangerously-skip-permissions'],
        instanceType: 'skip-permissions'
      })
    });

    const createData = await createResponse.json();
    expect(createData.success).toBe(true);
    
    const instanceId = createData.instance?.id;
    expect(instanceId).toMatch(/^claude-\d+$/);
    createdInstances.push(instanceId);
    console.log(`✅ Instance created: ${instanceId}`);

    // Wait for process to be ready
    await new Promise(resolve => setTimeout(resolve, TIMEOUTS.OUTPUT_STABILIZE));

    // Check detailed process status
    console.log('🔍 Checking process status...');
    const statusResponse = await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}/status`);
    const statusData = await statusResponse.json();

    expect(statusData.success).toBe(true);
    expect(statusData.status.id).toBe(instanceId);
    expect(statusData.status.pid).toBeGreaterThan(0);
    expect(statusData.status.status).toBe('running');
    expect(statusData.status.command).toContain('claude');
    expect(statusData.status.workingDirectory).toMatch(/workspaces\/agent-feed/);
    expect(statusData.status.uptime).toBeGreaterThan(0);

    console.log('✅ Process status validation passed:', {
      pid: statusData.status.pid,
      status: statusData.status.status,
      uptime: statusData.status.uptime,
      workingDirectory: statusData.status.workingDirectory
    });

    // Check process health endpoint
    console.log('🏥 Checking process health...');
    const healthResponse = await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}/health`);
    const healthData = await healthResponse.json();

    expect(healthData.healthy).toBe(true);
    expect(healthData.pid).toBe(statusData.status.pid);
    expect(healthData.status).toBe('running');
    expect(healthData.uptime).toBeGreaterThan(0);
    expect(healthData.memoryUsage).toBeDefined();
    expect(healthData.memoryUsage.rss).toBeGreaterThan(0); // Real memory usage

    console.log('✅ Process health validation passed:', {
      healthy: healthData.healthy,
      pid: healthData.pid,
      uptime: healthData.uptime,
      memoryRSS: healthData.memoryUsage.rss
    });

    // Validate working directory resolution
    const workingDir = statusData.status.workingDirectory;
    expect(workingDir).toBeTruthy();
    expect(workingDir).toContain('workspaces/agent-feed');
    
    // For skip-permissions type, should use base directory
    if (createData.instance.type === 'skip-permissions') {
      expect(workingDir).toBe('/workspaces/agent-feed');
    }
    
    console.log('✅ Working directory resolution validated:', workingDir);

    // Test process cleanup
    console.log('🧹 Testing process cleanup...');
    const deleteResponse = await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}`, {
      method: 'DELETE'
    });
    const deleteData = await deleteResponse.json();

    expect(deleteData.success).toBe(true);
    expect(deleteData.pid).toBe(statusData.status.pid);
    console.log('✅ Process cleanup successful');

    // Verify instance is no longer listed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const instancesResponse = await fetch(`${BACKEND_URL}/api/claude/instances`);
    const instancesData = await instancesResponse.json();
    
    const stillExists = instancesData.instances.some(i => i.id === instanceId);
    expect(stillExists).toBe(false);
    console.log('✅ Instance properly removed from active instances');

    // Remove from cleanup list since we manually deleted it
    const index = createdInstances.indexOf(instanceId);
    if (index > -1) {
      createdInstances.splice(index, 1);
    }
  });

  /**
   * TEST 6: Error Scenarios and Edge Cases
   * 
   * Validates:
   * - Invalid instance IDs handled gracefully  
   * - Network interruption recovery
   * - Multiple instance management
   * - Resource cleanup on failures
   */
  test('should handle error scenarios and edge cases', async ({ page }) => {
    test.skip(!backendHealthy, 'Backend not healthy - skipping test');
    
    console.log('🧪 TEST 6: Error Scenarios and Edge Cases');

    await page.goto(`${FRONTEND_URL}/claude-instances`, { waitUntil: 'networkidle' });

    // Test 1: Invalid instance ID handling
    console.log('🚫 Testing invalid instance ID handling...');
    
    const invalidResponse = await fetch(`${BACKEND_URL}/api/claude/instances/invalid-id/status`);
    expect(invalidResponse.status).toBe(404);
    
    const invalidData = await invalidResponse.json();
    expect(invalidData.success).toBe(false);
    expect(invalidData.error).toContain('not found');
    console.log('✅ Invalid instance ID properly rejected');

    // Test 2: Multiple instance creation and management
    console.log('👥 Testing multiple instance management...');
    
    const instance1Response = await fetch(`${BACKEND_URL}/api/claude/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: ['claude', '--dangerously-skip-permissions'],
        instanceType: 'skip-permissions'
      })
    });
    
    const instance2Response = await fetch(`${BACKEND_URL}/api/claude/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: ['claude', '--dangerously-skip-permissions'],
        instanceType: 'skip-permissions'
      })
    });

    const instance1Data = await instance1Response.json();
    const instance2Data = await instance2Response.json();

    expect(instance1Data.success).toBe(true);
    expect(instance2Data.success).toBe(true);
    expect(instance1Data.instance.id).not.toBe(instance2Data.instance.id);

    createdInstances.push(instance1Data.instance.id);
    createdInstances.push(instance2Data.instance.id);

    console.log('✅ Multiple instances created successfully:', [
      instance1Data.instance.id,
      instance2Data.instance.id
    ]);

    // Test 3: Concurrent command processing
    console.log('⚡ Testing concurrent command processing...');
    
    await new Promise(resolve => setTimeout(resolve, TIMEOUTS.OUTPUT_STABILIZE));
    
    // Send commands to both instances simultaneously
    const command1Promise = fetch(`${BACKEND_URL}/api/claude/instances/${instance1Data.instance.id}/terminal/input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'echo "instance1-test"\n' })
    });
    
    const command2Promise = fetch(`${BACKEND_URL}/api/claude/instances/${instance2Data.instance.id}/terminal/input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'echo "instance2-test"\n' })
    });

    const [command1Response, command2Response] = await Promise.all([command1Promise, command2Promise]);
    
    expect(command1Response.ok).toBe(true);
    expect(command2Response.ok).toBe(true);
    console.log('✅ Concurrent commands processed successfully');

    // Test 4: Resource cleanup validation
    console.log('🧹 Testing resource cleanup...');
    
    const instancesBeforeCleanup = await fetch(`${BACKEND_URL}/api/claude/instances`);
    const beforeData = await instancesBeforeCleanup.json();
    expect(beforeData.instances.length).toBeGreaterThanOrEqual(2);

    // Clean up all instances
    for (const instanceId of createdInstances) {
      const deleteResponse = await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}`, {
        method: 'DELETE'
      });
      expect(deleteResponse.ok).toBe(true);
    }

    // Verify cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const instancesAfterCleanup = await fetch(`${BACKEND_URL}/api/claude/instances`);
    const afterData = await instancesAfterCleanup.json();
    
    for (const instanceId of createdInstances) {
      const stillExists = afterData.instances.some(i => i.id === instanceId);
      expect(stillExists).toBe(false);
    }

    console.log('✅ All instances properly cleaned up');
    createdInstances.length = 0; // Clear array since we manually deleted all
  });
});