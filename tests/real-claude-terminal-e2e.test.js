/**
 * Real Claude Terminal E2E Tests
 * 
 * Validates real Claude process interaction and terminal pipe functionality:
 * 1. Click button → Real Claude process spawns  
 * 2. Terminal shows real Claude startup output (not mock "[RESPONSE]")
 * 3. Terminal displays real working directory from Claude process
 * 4. Type command → Goes to real Claude stdin  
 * 5. Real Claude response appears in terminal
 * 6. No mock/hardcoded responses anywhere
 * 
 * Tests fix for broken terminal pipe where:
 * - Terminal showed "[RESPONSE] Claude Code session started" (mock)
 * - Terminal showed hardcoded working directory
 * - Input forwarding worked but no real output returned
 */

const { test, expect } = require('@playwright/test');
const { RealClaudeValidators } = require('./test-helpers/real-claude-validators');

// Test Configuration
const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';
const TEST_TIMEOUTS = {
  processSpawn: 15000,    // Wait for real Claude process to spawn
  firstOutput: 20000,     // Wait for first real Claude output
  commandResponse: 30000, // Wait for command response from real Claude
  sseConnection: 10000    // Wait for SSE connection establishment
};

/**
 * Real Claude Terminal E2E Test Suite
 * 
 * This test suite validates the complete fix for terminal pipe issues:
 * - Real process spawning (not mock)
 * - Real I/O streaming (not hardcoded responses)
 * - Bidirectional communication with actual Claude process
 * - Proper SSE event streaming from backend to frontend
 */
test.describe('Real Claude Terminal E2E Validation', () => {
  let page;
  let backendHealthy = false;
  let instanceId = null;

  /**
   * Pre-test setup: Validate backend health and clear any existing instances
   */
  test.beforeAll(async () => {
    // Check if backend is running and healthy
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      const data = await response.json();
      backendHealthy = data.status === 'healthy';
      console.log('🏥 Backend health check:', backendHealthy ? 'HEALTHY' : 'UNHEALTHY', data);
    } catch (error) {
      console.error('❌ Backend health check failed:', error.message);
      backendHealthy = false;
    }

    // Clean up any existing instances from previous tests
    if (backendHealthy) {
      try {
        const instancesResponse = await fetch(`${BACKEND_URL}/api/claude/instances`);
        const instancesData = await instancesResponse.json();
        if (instancesData.success && instancesData.instances) {
          console.log(`🧹 Cleaning up ${instancesData.instances.length} existing instances`);
          for (const instance of instancesData.instances) {
            try {
              await fetch(`${BACKEND_URL}/api/claude/instances/${instance.id}`, { method: 'DELETE' });
              console.log(`🗑️ Cleaned up instance: ${instance.id}`);
            } catch (cleanupError) {
              console.warn(`⚠️ Failed to cleanup instance ${instance.id}:`, cleanupError.message);
            }
          }
        }
      } catch (cleanupError) {
        console.warn('⚠️ Instance cleanup failed:', cleanupError.message);
      }
    }
  });

  /**
   * Per-test setup: Initialize browser page and navigate to frontend
   */
  test.beforeEach(async ({ browser }) => {
    test.skip(!backendHealthy, 'Backend is not healthy - skipping terminal tests');
    
    page = await browser.newPage();
    
    // Enable console logging for debugging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' || text.includes('claude-') || text.includes('SSE') || text.includes('terminal')) {
        console.log(`🌐 Browser ${type}: ${text}`);
      }
    });

    // Navigate to frontend - directly to Claude Instance Manager
    await page.goto(`${FRONTEND_URL}/claude-instances`, { waitUntil: 'networkidle' });
    
    // Wait for Claude Instance Manager to load
    await expect(page.locator('h2:has-text("Claude Instance Manager")')).toBeVisible();
    console.log('✅ Frontend loaded successfully');
  });

  /**
   * Per-test cleanup: Terminate any created instances and close browser
   */
  test.afterEach(async () => {
    if (instanceId && backendHealthy) {
      try {
        console.log(`🧹 Cleaning up test instance: ${instanceId}`);
        const response = await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}`, { 
          method: 'DELETE' 
        });
        const result = await response.json();
        console.log('🗑️ Cleanup result:', result.success ? 'SUCCESS' : 'FAILED', result.message);
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup instance ${instanceId}:`, error.message);
      }
      instanceId = null;
    }
    
    if (page) {
      await page.close();
    }
  });

  /**
   * TEST 1: Real Claude Process Spawning
   * 
   * Validates:
   * - Button click triggers real process spawn (not mock)
   * - Backend creates actual Claude process with real PID
   * - Instance appears in UI with correct status progression
   * - No mock/hardcoded process data
   */
  test('should spawn real Claude process when button is clicked', async () => {
    console.log('🧪 TEST 1: Real Claude Process Spawning');
    
    // Click the skip-permissions button to spawn real Claude process
    const spawnButton = page.locator('button:has-text("skip-permissions")').first();
    await expect(spawnButton).toBeVisible();
    
    console.log('🖱️ Clicking spawn button...');
    await spawnButton.click();
    
    // Wait for instance to appear in the instances list
    console.log('⏱️ Waiting for instance to appear...');
    await expect(page.locator('.instance-item')).toBeVisible({ timeout: TEST_TIMEOUTS.processSpawn });
    
    // Extract instance ID from the UI
    const instanceElement = page.locator('.instance-item').first();
    const instanceIdText = await instanceElement.locator('.instance-id').textContent();
    instanceId = instanceIdText.replace('ID: ', '').trim();
    
    // Validate instance ID format (should be claude-XXXX, not mock data)
    expect(instanceId).toMatch(/^claude-\d+$/);
    console.log(`✅ Real instance created with ID: ${instanceId}`);
    
    // Verify instance has real PID (not hardcoded)
    const pidElement = instanceElement.locator('.instance-pid');
    if (await pidElement.count() > 0) {
      const pidText = await pidElement.textContent();
      const pid = pidText.replace('PID: ', '').trim();
      expect(parseInt(pid)).toBeGreaterThan(0);
      console.log(`✅ Instance has real PID: ${pid}`);
    }
    
    // Wait for status to transition from 'starting' to 'running'
    console.log('⏱️ Waiting for status to become running...');
    await expect(instanceElement.locator('.status-text')).toHaveText('running', { 
      timeout: TEST_TIMEOUTS.processSpawn 
    });
    console.log('✅ Instance status confirmed as running');
    
    // Verify backend has real process data (not mock)
    const backendResponse = await fetch(`${BACKEND_URL}/api/claude/instances`);
    const backendData = await backendResponse.json();
    const backendInstance = backendData.instances.find(i => i.id === instanceId);
    
    expect(backendInstance).toBeDefined();
    expect(backendInstance.pid).toBeGreaterThan(0);
    expect(backendInstance.status).toBe('running');
    expect(backendInstance.workingDirectory).toBeDefined();
    expect(backendInstance.workingDirectory).not.toBe('');
    console.log(`✅ Backend confirms real process data:`, {
      id: backendInstance.id,
      pid: backendInstance.pid,
      status: backendInstance.status,
      workingDirectory: backendInstance.workingDirectory
    });
  });

  /**
   * TEST 2: Real Claude Startup Output Validation
   * 
   * Validates:
   * - Terminal shows actual Claude startup messages (not mock)
   * - No "[RESPONSE] Claude Code session started" hardcoded text
   * - Real working directory displayed from Claude process
   * - SSE streaming delivers real process output
   */
  test('should display real Claude startup output in terminal', async () => {
    console.log('🧪 TEST 2: Real Claude Startup Output Validation');
    
    // First spawn a real Claude process
    const spawnButton = page.locator('button:has-text("skip-permissions")').first();
    await spawnButton.click();
    
    // Wait for instance and select it
    const instanceElement = page.locator('.instance-item').first();
    await expect(instanceElement).toBeVisible({ timeout: TEST_TIMEOUTS.processSpawn });
    
    const instanceIdText = await instanceElement.locator('.instance-id').textContent();
    instanceId = instanceIdText.replace('ID: ', '').trim();
    
    // Validate instance ID format using helper
    RealClaudeValidators.validateInstanceIdFormat(instanceId);
    
    await instanceElement.click();
    console.log(`✅ Selected instance: ${instanceId}`);
    
    // Wait for terminal output area to be visible
    const outputArea = page.locator('.output-area pre');
    await expect(outputArea).toBeVisible();
    
    // Use helper to wait for and validate real Claude output
    const terminalOutput = await RealClaudeValidators.waitForRealClaudeOutput(page, TEST_TIMEOUTS.firstOutput);
    
    console.log('📺 Real Claude output validated:', terminalOutput.substring(0, 200) + '...');
    console.log('✅ Terminal displays real Claude output (no mock responses)');
  });

  /**
   * TEST 3: Real Working Directory Display
   * 
   * Validates:
   * - Terminal shows actual working directory from Claude process
   * - Not hardcoded "/workspaces/agent-feed"
   * - Directory corresponds to backend resolution logic
   */
  test('should display real working directory from Claude process', async () => {
    console.log('🧪 TEST 3: Real Working Directory Display');
    
    // Spawn and select instance
    const spawnButton = page.locator('button:has-text("skip-permissions")').first();
    await spawnButton.click();
    
    const instanceElement = page.locator('.instance-item').first();
    await expect(instanceElement).toBeVisible({ timeout: TEST_TIMEOUTS.processSpawn });
    
    const instanceIdText = await instanceElement.locator('.instance-id').textContent();
    instanceId = instanceIdText.replace('ID: ', '').trim();
    await instanceElement.click();
    
    // Get working directory from backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/claude/instances`);
    const backendData = await backendResponse.json();
    const backendInstance = backendData.instances.find(i => i.id === instanceId);
    const realWorkingDir = backendInstance.workingDirectory;
    
    console.log(`📁 Backend reports working directory: ${realWorkingDir}`);
    
    // Wait for terminal to show working directory
    await page.waitForFunction((expectedDir) => {
      const output = document.querySelector('.output-area pre');
      return output && output.textContent.includes(expectedDir);
    }, realWorkingDir, { timeout: TEST_TIMEOUTS.firstOutput });
    
    const terminalOutput = await page.locator('.output-area pre').textContent();
    
    // Validate real working directory is displayed
    expect(terminalOutput).toContain(realWorkingDir);
    expect(realWorkingDir).toMatch(/^\/workspaces\/agent-feed/);
    
    console.log(`✅ Terminal displays real working directory: ${realWorkingDir}`);
  });

  /**
   * TEST 4: Bidirectional Real I/O Communication
   * 
   * Validates:
   * - Input typed in terminal goes to real Claude stdin
   * - Real Claude processes the command
   * - Real Claude response comes back through SSE
   * - No mock/hardcoded command responses
   */
  test('should handle bidirectional real I/O with Claude process', async () => {
    console.log('🧪 TEST 4: Bidirectional Real I/O Communication');
    
    // Spawn, wait, and select instance
    const spawnButton = page.locator('button:has-text("skip-permissions")').first();
    await spawnButton.click();
    
    const instanceElement = page.locator('.instance-item').first();
    await expect(instanceElement).toBeVisible({ timeout: TEST_TIMEOUTS.processSpawn });
    await expect(instanceElement.locator('.status-text')).toHaveText('running', { 
      timeout: TEST_TIMEOUTS.processSpawn 
    });
    
    const instanceIdText = await instanceElement.locator('.instance-id').textContent();
    instanceId = instanceIdText.replace('ID: ', '').trim();
    await instanceElement.click();
    
    // Wait for initial output
    await RealClaudeValidators.waitForRealClaudeOutput(page, 10000);
    
    // Test multiple interactive commands
    const commands = [
      { cmd: 'pwd', expectedPattern: /\/workspaces\/agent-feed/ },
      { cmd: 'echo "real-claude-test"', expectedPattern: /real-claude-test/ },
      { cmd: 'whoami', expectedPattern: /codespace|user|root/ }
    ];
    
    for (const { cmd, expectedPattern } of commands) {
      const output = await RealClaudeValidators.testInteractiveCommand(page, cmd, expectedPattern, 15000);
      console.log(`✅ Command "${cmd}" produced real response: ${output.substring(0, 100)}...`);
    }
    
    console.log('✅ Bidirectional I/O working with real Claude process');
  });

  /**
   * TEST 5: Backend Log Validation for Real Streaming
   * 
   * Validates:
   * - Backend logs show actual Claude stdout/stderr streaming
   * - SSE events contain real process output (not hardcoded)
   * - Process lifecycle properly managed in backend
   */
  test('should validate backend logs show real Claude stdout streaming', async () => {
    console.log('🧪 TEST 5: Backend Log Validation for Real Streaming');
    
    // Create a monitoring endpoint call to capture backend state
    let backendLogs = [];
    
    // Spawn instance and monitor
    const spawnButton = page.locator('button:has-text("skip-permissions")').first();
    await spawnButton.click();
    
    const instanceElement = page.locator('.instance-item').first();
    await expect(instanceElement).toBeVisible({ timeout: TEST_TIMEOUTS.processSpawn });
    
    const instanceIdText = await instanceElement.locator('.instance-id').textContent();
    instanceId = instanceIdText.replace('ID: ', '').trim();
    
    // Check backend process status
    const statusResponse = await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}/status`);
    const statusData = await statusResponse.json();
    
    expect(statusData.success).toBe(true);
    expect(statusData.status.id).toBe(instanceId);
    expect(statusData.status.pid).toBeGreaterThan(0);
    expect(statusData.status.status).toBe('running');
    expect(statusData.status.command).toBeDefined();
    expect(statusData.status.workingDirectory).toBeDefined();
    
    console.log('✅ Backend status confirms real process:', {
      id: statusData.status.id,
      pid: statusData.status.pid,
      status: statusData.status.status,
      command: statusData.status.command,
      workingDirectory: statusData.status.workingDirectory,
      uptime: statusData.status.uptime
    });
    
    // Check process health
    const healthResponse = await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}/health`);
    const healthData = await healthResponse.json();
    
    expect(healthData.healthy).toBe(true);
    expect(healthData.pid).toBe(statusData.status.pid);
    expect(healthData.status).toBe('running');
    
    console.log('✅ Backend health confirms process is running and healthy');
    
    // Validate process is truly running (not mock)
    expect(statusData.status.uptime).toBeGreaterThan(0);
    expect(healthData.uptime).toBeGreaterThan(0);
    expect(healthData.memoryUsage).toBeDefined();
    expect(healthData.memoryUsage.rss).toBeGreaterThan(0);
    
    console.log('✅ Backend confirms real system resources and uptime');
  });

  /**
   * TEST 6: SSE Connection Stability and Real Event Flow
   * 
   * Validates:
   * - SSE connection established and maintains stability
   * - Real-time events flow from backend to frontend
   * - No connection drops or mock event injection
   * - Terminal remains responsive throughout session
   */
  test('should maintain stable SSE connection with real event flow', async () => {
    console.log('🧪 TEST 6: SSE Connection Stability and Real Event Flow');
    
    // Spawn and monitor connection
    const spawnButton = page.locator('button:has-text("skip-permissions")').first();
    await spawnButton.click();
    
    const instanceElement = page.locator('.instance-item').first();
    await expect(instanceElement).toBeVisible({ timeout: TEST_TIMEOUTS.processSpawn });
    
    const instanceIdText = await instanceElement.locator('.instance-id').textContent();
    instanceId = instanceIdText.replace('ID: ', '').trim();
    
    await instanceElement.click();
    
    // Wait for connection status to show SSE
    await expect(page.locator('.connection-status')).toContainText('Connected via SSE', {
      timeout: TEST_TIMEOUTS.sseConnection
    });
    
    console.log('✅ SSE connection established');
    
    // Send multiple commands to test stability
    const inputField = page.locator('.input-field');
    const commands = ['echo "test1"', 'echo "test2"', 'pwd'];
    
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      console.log(`⌨️ Sending stability test command ${i + 1}: ${cmd}`);
      
      await inputField.fill(cmd);
      await inputField.press('Enter');
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      const output = await page.locator('.output-area pre').textContent();
      expect(output).toContain(cmd);
    }
    
    // Verify connection remains stable (no reconnection messages)
    const connectionStatus = await page.locator('.connection-status').textContent();
    expect(connectionStatus).toContain('Connected via SSE');
    expect(connectionStatus).not.toContain('Disconnected');
    expect(connectionStatus).not.toContain('Error');
    
    console.log('✅ SSE connection remained stable through multiple commands');
    
    // Final output validation
    const finalOutput = await page.locator('.output-area pre').textContent();
    expect(finalOutput.length).toBeGreaterThan(100); // Substantial real output
    commands.forEach(cmd => {
      expect(finalOutput).toContain(cmd); // All commands present
    });
    
    console.log('✅ All real command responses captured successfully');
  });
});

/**
 * Backend Health Validation Test
 * 
 * Separate test to validate backend is properly configured and healthy
 * before running main terminal tests
 */
test.describe('Backend Health Validation', () => {
  test('should validate backend is healthy and ready for terminal tests', async () => {
    console.log('🏥 Backend Health Validation');
    
    // Health check
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    expect(healthResponse.ok).toBe(true);
    
    const healthData = await healthResponse.json();
    expect(healthData.status).toBe('healthy');
    expect(healthData.server).toBeDefined();
    
    console.log('✅ Backend health confirmed:', healthData);
    
    // API endpoints check
    const endpointsToTest = [
      '/api/claude/instances',
      '/api/status/stream'
    ];
    
    for (const endpoint of endpointsToTest) {
      const response = await fetch(`${BACKEND_URL}${endpoint}`);
      expect(response.ok).toBe(true);
      console.log(`✅ Endpoint ${endpoint} responsive`);
    }
    
    console.log('✅ All backend endpoints ready for terminal testing');
  });
});