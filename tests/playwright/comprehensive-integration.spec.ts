import { test, expect } from '@playwright/test';
import { ClaudeTestHelper, TestUtils } from './test-helpers';

/**
 * Comprehensive Integration Test Suite
 * 
 * End-to-end validation of complete Claude instance management workflow:
 * - Full lifecycle: create -> interact -> terminate
 * - Multi-instance scenarios
 * - Error recovery workflows
 * - Performance and stability validation
 */

test.describe('Comprehensive Claude Instance Integration', () => {
  let helper: ClaudeTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new ClaudeTestHelper(page);
    
    await page.goto('/');
    await helper.waitForManagerReady();
  });

  test.afterEach(async () => {
    await helper.cleanupInstances();
  });

  test('Complete workflow: Create -> Interact -> Terminate', async () => {
    console.log('🔄 Testing complete Claude instance workflow...');
    
    // Step 1: Create instance
    const instanceId = await helper.createInstance('prod');
    console.log(`Created instance: ${instanceId}`);
    
    // Step 2: Wait for running status
    await helper.waitForRunningStatus(instanceId);
    
    // Step 3: Select and interact
    await helper.selectInstance(instanceId);
    await helper.waitForConnectionStatus('Connected');
    
    // Step 4: Send commands and verify responses
    const commands = [
      'hello',
      'what is 2 + 2?',
      'thank you'
    ];
    
    for (const command of commands) {
      console.log(`Sending: ${command}`);
      const output = await helper.sendCommand(command, true);
      expect(output).toContain(command);
      expect(output.length).toBeGreaterThan(command.length + 10); // Should have response
    }
    
    // Step 5: Verify instance is still healthy
    const instances = await helper.getInstances();
    const ourInstance = instances.find(i => i.id === instanceId);
    expect(ourInstance?.status).toBe('running');
    
    // Step 6: Terminate instance
    await helper.terminateInstance(instanceId);
    
    // Step 7: Verify cleanup
    const remainingInstances = await helper.getInstances();
    expect(remainingInstances).toHaveLength(0);
    
    await helper.verifyNoErrors();
    
    console.log('✅ Complete workflow test passed');
  });

  test('Multi-instance management and interaction', async () => {
    console.log('🔀 Testing multi-instance management...');
    
    // Create multiple instances of different types
    const instance1 = await helper.createInstance('prod');
    const instance2 = await helper.createInstance('skip-permissions');
    const instance3 = await helper.createInstance('skip-permissions-c');
    
    // Wait for all to be running
    await helper.waitForRunningStatus(instance1);
    await helper.waitForRunningStatus(instance2);
    await helper.waitForRunningStatus(instance3);
    
    console.log('All instances running, testing interactions...');
    
    // Test interaction with each instance
    const testData = [
      { id: instance1, command: 'Instance 1 test' },
      { id: instance2, command: 'Instance 2 test' },
      { id: instance3, command: 'Instance 3 test' }
    ];
    
    for (const { id, command } of testData) {
      await helper.selectInstance(id);
      await helper.waitForConnectionStatus('Connected');
      
      const output = await helper.sendCommand(command, true);
      expect(output).toContain(command);
    }
    
    // Verify all instances still exist and are healthy
    const instances = await helper.getInstances();
    expect(instances).toHaveLength(3);
    
    for (const instance of instances) {
      expect(instance.status).toBe('running');
    }
    
    // Clean up one by one
    await helper.terminateInstance(instance1);
    await helper.terminateInstance(instance2);  
    await helper.terminateInstance(instance3);
    
    // Verify all cleaned up
    const remainingInstances = await helper.getInstances();
    expect(remainingInstances).toHaveLength(0);
    
    console.log('✅ Multi-instance management test passed');
  });

  test('Error recovery and resilience', async () => {
    console.log('🛡️ Testing error recovery and resilience...');
    
    // Create instance successfully first
    const instanceId = await helper.createInstance('skip-permissions');
    await helper.waitForRunningStatus(instanceId);
    await helper.selectInstance(instanceId);
    
    // Test 1: Network interruption simulation
    console.log('Testing network interruption...');
    await helper.mockApiFailure('/api/claude/instances/*/terminal/input');
    
    // Try to send command during network failure
    await helper.sendCommand('test during failure', false);
    
    // Should show error
    await helper.verifyError(/Failed|Error|Network/i);
    
    // Restore network
    await helper.clearApiMocks();
    
    // System should recover
    await TestUtils.waitForCondition(async () => {
      try {
        const output = await helper.sendCommand('recovery test', true);
        return output.includes('recovery test');
      } catch {
        return false;
      }
    }, 30000);
    
    console.log('Network recovery successful');
    
    // Test 2: Instance recreation after termination error
    await helper.mockApiResponse('/api/claude/instances/*', { 
      success: false, 
      error: 'Termination failed' 
    }, 500);
    
    // Try to terminate (should fail)
    try {
      await helper.terminateInstance(instanceId);
      throw new Error('Should have thrown error');
    } catch (error) {
      // Expected to fail
    }
    
    // Clear mock and try again
    await helper.clearApiMocks();
    await helper.terminateInstance(instanceId);
    
    console.log('✅ Error recovery test passed');
  });

  test('Performance and stability under load', async () => {
    console.log('⚡ Testing performance and stability...');
    
    const instanceId = await helper.createInstance('skip-permissions-c');
    await helper.waitForRunningStatus(instanceId);
    await helper.selectInstance(instanceId);
    
    // Test rapid command sending
    console.log('Testing rapid command sending...');
    const startTime = Date.now();
    const commands = Array.from({ length: 10 }, (_, i) => `rapid test ${i + 1}`);
    
    for (const command of commands) {
      await helper.sendCommand(command, false); // Don't wait for each response
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    }
    
    // Wait for all responses to complete
    await TestUtils.waitForCondition(async () => {
      const output = await helper.getOutput();
      return commands.every(cmd => output.includes(cmd));
    }, 45000);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    console.log(`Rapid commands completed in ${totalTime}ms`);
    
    // Should complete in reasonable time
    expect(totalTime).toBeLessThan(60000); // Less than 60 seconds
    
    // Test long output handling
    console.log('Testing long output handling...');
    await helper.sendCommand('Please provide a detailed explanation of how artificial intelligence works', true);
    
    // Output should be substantial
    const finalOutput = await helper.getOutput();
    expect(finalOutput.length).toBeGreaterThan(1000); // Should be a long response
    
    // UI should still be responsive
    await helper.verifyNoErrors();
    await helper.waitForConnectionStatus('Connected');
    
    console.log('✅ Performance and stability test passed');
  });

  test('Edge cases and boundary conditions', async () => {
    console.log('🔬 Testing edge cases and boundary conditions...');
    
    const instanceId = await helper.createInstance('prod');
    await helper.waitForRunningStatus(instanceId);
    await helper.selectInstance(instanceId);
    
    // Test very long input
    const longCommand = 'a'.repeat(1000);
    const output1 = await helper.sendCommand(longCommand, true);
    expect(output1).toContain(longCommand.substring(0, 100)); // Should handle long input
    
    // Test special characters and formatting
    const specialCommand = 'Test: @#$%^&*()[]{}|\\:";\'<>?,./ and Unicode: 🚀🌟💻';
    const output2 = await helper.sendCommand(specialCommand, true);
    expect(output2).toContain('Test:'); // Should handle special chars
    
    // Test empty-like inputs (handled by input validation)
    await helper.sendCommand('', false);
    await helper.sendCommand('   ', false);
    await helper.sendCommand('\t\n', false);
    
    // Should not crash or cause errors
    await helper.verifyNoErrors();
    
    // Test rapid instance creation and deletion
    console.log('Testing rapid create/delete cycles...');
    
    for (let i = 0; i < 3; i++) {
      const tempId = await helper.createInstance('skip-permissions');
      await helper.waitForRunningStatus(tempId);
      await helper.terminateInstance(tempId);
      
      // Brief pause between cycles
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Original instance should still be working
    await helper.selectInstance(instanceId);
    const testOutput = await helper.sendCommand('still working?', true);
    expect(testOutput).toContain('still working?');
    
    console.log('✅ Edge cases test passed');
  });

  test('Session persistence and state management', async () => {
    console.log('💾 Testing session persistence and state management...');
    
    const instanceId = await helper.createInstance('skip-permissions-resume');
    await helper.waitForRunningStatus(instanceId);
    await helper.selectInstance(instanceId);
    
    // Establish context
    await helper.sendCommand('My favorite color is blue', true);
    await helper.sendCommand('Remember that for our conversation', true);
    
    // Page reload simulation
    console.log('Simulating page reload...');
    await helper.page.reload();
    await helper.waitForManagerReady();
    
    // Instance should still be there
    await helper.page.waitForSelector('.instance-item', { timeout: 15000 });
    
    // Select the same instance
    await helper.selectInstance(instanceId);
    await helper.waitForConnectionStatus('Connected');
    
    // Test context retention
    const contextOutput = await helper.sendCommand('What did I say my favorite color was?', true);
    expect(contextOutput.toLowerCase()).toContain('blue');
    
    console.log('✅ Session persistence test passed');
  });

  test('Comprehensive UI state validation', async () => {
    console.log('🎨 Testing comprehensive UI state validation...');
    
    // Test initial state
    await expect(helper.page.locator('.no-instances')).toBeVisible();
    await expect(helper.page.locator('.count')).not.toBeVisible();
    
    // Create first instance
    const instance1 = await helper.createInstance('prod');
    
    // UI should update
    await expect(helper.page.locator('.no-instances')).not.toBeVisible();
    await expect(helper.page.locator('.count')).toBeVisible();
    await expect(helper.page.locator('.count')).toContainText('1/1');
    
    // Wait for running and verify count updates
    await helper.waitForRunningStatus(instance1);
    await expect(helper.page.locator('.count')).toContainText('Active: 1/1');
    
    // Create second instance
    const instance2 = await helper.createInstance('skip-permissions');
    await expect(helper.page.locator('.count')).toContainText('2');
    
    // Select first instance
    await helper.selectInstance(instance1);
    await expect(helper.page.locator('.instance-item').first()).toHaveClass(/selected/);
    await expect(helper.page.locator('.output-area')).toBeVisible();
    
    // Select second instance
    await helper.selectInstance(instance2);
    await expect(helper.page.locator('.instance-item').last()).toHaveClass(/selected/);
    
    // Terminate first instance
    await helper.terminateInstance(instance1);
    await expect(helper.page.locator('.count')).toContainText('1/1');
    
    // Terminate second instance  
    await helper.terminateInstance(instance2);
    await expect(helper.page.locator('.no-instances')).toBeVisible();
    await expect(helper.page.locator('.count')).not.toBeVisible();
    
    console.log('✅ UI state validation test passed');
  });
});