/**
 * Comprehensive Real Claude Validation Tests
 * 
 * Ultimate validation suite to ensure NO MOCK responses appear anywhere
 * and ALL interactions are with real Claude processes.
 * 
 * This test addresses the specific broken behavior:
 * - Shows "[RESPONSE] Claude Code session started" (mock)
 * - Shows wrong/hardcoded working directory
 * - Input produces no real output
 * 
 * PASS criteria:
 * ✅ Real Claude process spawning (with real PID)
 * ✅ Real terminal output (NO "[RESPONSE]" messages)
 * ✅ Real working directory from actual process
 * ✅ Interactive commands produce real responses
 * ✅ SSE streaming delivers real process I/O
 */

const { test, expect } = require('@playwright/test');
const { RealClaudeValidators, BACKEND_URL } = require('./test-helpers/real-claude-validators');

const FRONTEND_URL = 'http://localhost:5173';

test.describe('Comprehensive Real Claude Validation', () => {
  let backendHealthy = false;

  test.beforeAll(async () => {
    // Backend health validation
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      const data = await response.json();
      backendHealthy = data.status === 'healthy';
      
      if (!backendHealthy) {
        console.error('❌ Backend not healthy:', data);
      } else {
        console.log('✅ Backend healthy - ready for real Claude tests');
      }
    } catch (error) {
      console.error('❌ Backend health check failed:', error.message);
      backendHealthy = false;
    }
  });

  test('ULTIMATE: Full Real Claude Behavior Validation', async ({ page }) => {
    test.skip(!backendHealthy, 'Backend not healthy - skipping comprehensive test');
    
    console.log('🚀 ULTIMATE REAL CLAUDE VALIDATION');
    console.log('This test validates EVERY aspect is real (no mocks)');
    
    // Phase 1: Navigate and verify frontend loads
    console.log('📱 Phase 1: Frontend Setup');
    await page.goto(`${FRONTEND_URL}/claude-instances`);
    await expect(page.locator('h2:has-text("Claude Instance Manager")')).toBeVisible();
    console.log('✅ Frontend loaded');
    
    // Phase 2: Real process spawning
    console.log('🔧 Phase 2: Real Process Spawning');
    const spawnButton = page.locator('button:has-text("skip-permissions")').first();
    await spawnButton.click();
    
    // Wait for real instance to appear
    const instanceElement = await page.waitForSelector('.instance-item', { timeout: 20000 });
    const instanceIdText = await page.$eval('.instance-item .instance-id', el => el.textContent);
    const instanceId = instanceIdText.replace('ID: ', '').trim();
    
    console.log(`🆔 Instance created: ${instanceId}`);
    
    // Phase 3: Real process validation
    console.log('🔍 Phase 3: Real Process Validation');
    const validationResults = await RealClaudeValidators.comprehensiveValidation(page, instanceId);
    
    console.log('📊 Validation Results:', validationResults);
    
    // Verify all validations passed
    expect(validationResults.instanceIdValid).toBe(true);
    expect(validationResults.processLifecycleValid).toBe(true);
    expect(validationResults.workingDirectoryReal).toBe(true);
    expect(validationResults.outputReal).toBe(true);
    expect(validationResults.interactionWorking).toBe(true);
    expect(validationResults.noMockResponses).toBe(true);
    
    // Phase 4: Specific mock detection tests
    console.log('🚨 Phase 4: Mock Detection Tests');
    
    await instanceElement.click();
    await page.waitForTimeout(3000);
    
    const terminalOutput = await page.$eval('.output-area pre', el => el.textContent);
    
    // These should NEVER appear (they're mock responses)
    const forbiddenPatterns = [
      '[RESPONSE] Claude Code session started',
      'Mock Claude response',
      'Simulated output',
      'TEST_OUTPUT',
      'Hardcoded response'
    ];
    
    for (const pattern of forbiddenPatterns) {
      if (terminalOutput.includes(pattern)) {
        throw new Error(`🚨 MOCK DETECTED: Found forbidden pattern "${pattern}" in terminal output`);
      }
    }
    
    console.log('✅ No mock patterns detected in terminal');
    
    // Phase 5: Real interaction stress test
    console.log('⚡ Phase 5: Real Interaction Stress Test');
    
    const stressTestCommands = [
      'ls -la',
      'pwd',  
      'echo "stress-test-1"',
      'whoami',
      'date',
      'echo "stress-test-2"'
    ];
    
    for (let i = 0; i < stressTestCommands.length; i++) {
      const cmd = stressTestCommands[i];
      console.log(`⌨️ Stress test command ${i + 1}: ${cmd}`);
      
      await page.fill('.input-field', cmd);
      await page.press('.input-field', 'Enter');
      await page.waitForTimeout(2000);
      
      const currentOutput = await page.$eval('.output-area pre', el => el.textContent);
      RealClaudeValidators.validateNoMockResponses(currentOutput);
      
      expect(currentOutput).toContain(cmd); // Command echo
    }
    
    console.log('✅ Stress test completed - all responses are real');
    
    // Phase 6: Backend process verification
    console.log('🔧 Phase 6: Backend Process Verification');
    
    const processInfo = await RealClaudeValidators.validateProcessLifecycle(instanceId);
    
    // Verify it's a real system process
    expect(processInfo.pid).toBeGreaterThan(1000); // Real PID should be substantial
    expect(processInfo.command).toContain('claude');
    expect(processInfo.workingDirectory).toMatch(/\/workspaces\/agent-feed\/(prod|frontend|tests)/);
    
    console.log('✅ Backend process verification completed');
    
    // Phase 7: SSE connection real-time validation
    console.log('📡 Phase 7: SSE Real-Time Validation');
    
    // Monitor connection status
    const connectionStatus = await page.$eval('.connection-status', el => el.textContent);
    expect(connectionStatus).toContain('Connected via SSE');
    expect(connectionStatus).toContain(instanceId.slice(0, 8));
    
    // Send rapid commands to test real-time streaming
    const rapidCommands = ['echo "rapid-1"', 'echo "rapid-2"', 'echo "rapid-3"'];
    
    for (const cmd of rapidCommands) {
      await page.fill('.input-field', cmd);
      await page.press('.input-field', 'Enter');
      await page.waitForTimeout(500); // Rapid succession
    }
    
    // Verify all rapid commands appear in output
    await page.waitForTimeout(3000);
    const rapidOutput = await page.$eval('.output-area pre', el => el.textContent);
    
    for (const cmd of rapidCommands) {
      expect(rapidOutput).toContain(cmd);
    }
    
    console.log('✅ SSE real-time streaming validated');
    
    // Phase 8: Cleanup and termination
    console.log('🧹 Phase 8: Cleanup and Termination');
    
    const terminateButton = await page.$('.instance-item .btn-terminate');
    await terminateButton.click();
    
    await page.waitForTimeout(2000);
    const remainingInstances = await page.$$('.instance-item');
    expect(remainingInstances.length).toBe(0);
    
    console.log('✅ Process termination verified');
    
    // FINAL VALIDATION
    console.log('🏆 ULTIMATE VALIDATION COMPLETED SUCCESSFULLY');
    console.log('✅ ALL interactions were with real Claude process');
    console.log('✅ NO mock responses detected anywhere');
    console.log('✅ Real working directory confirmed');
    console.log('✅ Bidirectional I/O working perfectly');
    console.log('✅ SSE streaming delivers real process output');
  });

  test('Mock Pattern Detection Matrix', async ({ page }) => {
    test.skip(!backendHealthy, 'Backend not healthy');
    
    console.log('🔍 Mock Pattern Detection Matrix Test');
    
    // This test specifically looks for ALL possible mock patterns
    await page.goto(`${FRONTEND_URL}/claude-instances`);
    
    // Spawn instance
    const spawnButton = page.locator('button:has-text("skip-permissions")').first();
    await spawnButton.click();
    
    const instanceElement = await page.waitForSelector('.instance-item', { timeout: 15000 });
    await instanceElement.click();
    
    // Wait for output to accumulate
    await page.waitForTimeout(5000);
    
    const allOutput = await page.$eval('.output-area pre', el => el.textContent);
    
    // Comprehensive mock pattern detection
    const mockPatterns = [
      // Direct mock indicators
      /\[RESPONSE\]/,
      /\[MOCK\]/,
      /Mock.*Claude/i,
      /Simulated.*output/i,
      /TEST_OUTPUT/,
      /Hardcoded/i,
      
      // Development artifacts
      /console\.log/,
      /DEBUG:/,
      /PLACEHOLDER/,
      /TODO:/,
      /FIXME:/,
      
      // Undefined/null patterns
      /undefined/,
      /null/,
      /Instance.*undefined/,
      /PID:\s*undefined/,
      
      // Fake directory patterns
      /Working directory: \/workspaces\/agent-feed$/,  // Without subdirectory
      /Working directory: undefined/,
      /Working directory: null/
    ];
    
    const detectedMocks = [];
    
    for (const pattern of mockPatterns) {
      if (pattern.test(allOutput)) {
        const match = allOutput.match(pattern);
        detectedMocks.push({
          pattern: pattern.toString(),
          match: match[0],
          context: allOutput.substring(Math.max(0, match.index - 30), match.index + match[0].length + 30)
        });
      }
    }
    
    if (detectedMocks.length > 0) {
      console.error('🚨 MOCK PATTERNS DETECTED:');
      detectedMocks.forEach((mock, i) => {
        console.error(`${i + 1}. Pattern: ${mock.pattern}`);
        console.error(`   Match: "${mock.match}"`);
        console.error(`   Context: "${mock.context}"`);
        console.error('---');
      });
      
      throw new Error(`Found ${detectedMocks.length} mock patterns in output. See logs for details.`);
    }
    
    console.log('✅ Mock pattern detection matrix PASSED - no mock patterns found');
  });

  test('Real Process Resource Validation', async ({ page }) => {
    test.skip(!backendHealthy, 'Backend not healthy');
    
    console.log('💻 Real Process Resource Validation');
    
    await page.goto(`${FRONTEND_URL}/claude-instances`);
    
    // Launch multiple instances to test resource management
    const instanceIds = [];
    
    for (let i = 0; i < 2; i++) {
      const spawnButton = page.locator('button:has-text("skip-permissions")').first();
      await spawnButton.click();
      await page.waitForTimeout(3000);
      
      const instances = await page.$$('.instance-item');
      const latestInstance = instances[instances.length - 1];
      const idText = await latestInstance.$eval('.instance-id', el => el.textContent);
      const instanceId = idText.replace('ID: ', '').trim();
      
      instanceIds.push(instanceId);
      console.log(`✅ Created instance ${i + 1}: ${instanceId}`);
    }
    
    // Validate each instance has unique real resources
    for (const instanceId of instanceIds) {
      const processInfo = await RealClaudeValidators.validateProcessLifecycle(instanceId);
      
      console.log(`🔍 Instance ${instanceId}:`, {
        pid: processInfo.pid,
        status: processInfo.status,
        command: processInfo.command,
        workingDir: processInfo.workingDirectory
      });
      
      // Each should have unique PID
      expect(processInfo.pid).toBeGreaterThan(0);
      expect(processInfo.status).toBe('running');
      expect(processInfo.workingDirectory).toBeTruthy();
    }
    
    // Verify PIDs are unique
    const pids = [];
    for (const instanceId of instanceIds) {
      const response = await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}`);
      const data = await response.json();
      pids.push(data.instance.pid);
    }
    
    const uniquePids = [...new Set(pids)];
    expect(uniquePids.length).toBe(pids.length); // All PIDs should be unique
    
    console.log('✅ All instances have unique real system resources');
    
    // Cleanup
    for (const instanceId of instanceIds) {
      await fetch(`${BACKEND_URL}/api/claude/instances/${instanceId}`, { method: 'DELETE' });
      console.log(`🧹 Cleaned up instance: ${instanceId}`);
    }
  });
});