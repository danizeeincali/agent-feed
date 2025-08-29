import { test, expect } from '@playwright/test';
import { ClaudeInstancePage } from '../page-objects/ClaudeInstancePage';
import { ChatInterfacePage } from '../page-objects/ChatInterfacePage';

/**
 * Functional Preservation Tests
 * 
 * Test Categories:
 * 1. All Existing Claude Instance Creation Still Works
 * 2. Terminal I/O Streaming Continues Functioning
 * 3. Working Directory Resolution Unchanged
 * 4. Authentication and Process Spawning Preserved
 * 5. Error Handling and Recovery Scenarios
 */

test.describe('Functional Preservation Tests', () => {
  let claudePage: ClaudeInstancePage;
  let chatPage: ChatInterfacePage;
  
  test.beforeEach(async ({ page }) => {
    claudePage = new ClaudeInstancePage(page);
    chatPage = new ChatInterfacePage(page);
    await claudePage.goto();
  });
  
  test.describe('Claude Instance Creation Functionality', () => {
    test('prod/claude instance creation works identically to before', async () => {
      // Test basic prod instance creation
      const initialCount = await claudePage.getInstanceCount();
      
      await claudePage.clickProdButton();
      await claudePage.waitForInstanceCreation();
      
      // Verify instance was created
      const newCount = await claudePage.getInstanceCount();
      expect(newCount).toBe(initialCount + 1);
      
      // Verify instance has correct properties
      await claudePage.selectInstance(0);
      
      // Check that instance ID follows expected format
      const instanceId = await claudePage.instanceItems.first().locator('.instance-id').textContent();
      expect(instanceId).toMatch(/ID: [a-z0-9]{8}/);
      
      // Verify instance status is correct
      const statusElement = claudePage.instanceItems.first().locator('.status-text');
      const status = await statusElement.textContent();
      expect(['starting', 'running']).toContain(status);
    });
    
    test('skip-permissions instance creation preserves functionality', async () => {
      await claudePage.clickSkipPermissionsButton();
      await claudePage.waitForInstanceCreation();
      
      const instanceCount = await claudePage.getInstanceCount();
      expect(instanceCount).toBeGreaterThan(0);
      
      // Verify skip-permissions instance can be selected and used
      await claudePage.selectInstance(0);
      
      // Test that the instance responds to commands
      await chatPage.sendMessage('echo "skip-permissions test"');
      await chatPage.waitForOutputContains('skip-permissions test');
    });
    
    test('skip-permissions -c instance creation preserves functionality', async () => {
      await claudePage.clickSkipPermissionsCButton();
      await claudePage.waitForInstanceCreation();
      
      const instanceCount = await claudePage.getInstanceCount();
      expect(instanceCount).toBeGreaterThan(0);
      
      await claudePage.selectInstance(0);
      await chatPage.sendMessage('echo "skip-permissions -c test"');
      await chatPage.waitForOutputContains('skip-permissions -c test');
    });
    
    test('skip-permissions --resume instance creation preserves functionality', async () => {
      await claudePage.clickSkipPermissionsResumeButton();
      await claudePage.waitForInstanceCreation();
      
      const instanceCount = await claudePage.getInstanceCount();
      expect(instanceCount).toBeGreaterThan(0);
      
      await claudePage.selectInstance(0);
      await chatPage.sendMessage('echo "skip-permissions --resume test"');
      await chatPage.waitForOutputContains('skip-permissions --resume test');
    });
    
    test('multiple instance creation works correctly', async () => {
      // Create multiple different types of instances
      await claudePage.clickProdButton();
      await claudePage.waitForInstanceCreation();
      
      await claudePage.clickSkipPermissionsButton();
      await claudePage.waitForInstanceCreation();
      
      await claudePage.clickSkipPermissionsCButton();
      await claudePage.waitForInstanceCreation();
      
      // Verify all instances were created
      const finalCount = await claudePage.getInstanceCount();
      expect(finalCount).toBe(3);
      
      // Verify each instance can be selected and used
      for (let i = 0; i < 3; i++) {
        await claudePage.selectInstance(i);
        await chatPage.sendMessage(`echo "Instance ${i + 1} test"`);
        await chatPage.waitForOutputContains(`Instance ${i + 1} test`);
      }
    });
    
    test('instance termination functionality preserved', async () => {
      // Create instance
      await claudePage.clickProdButton();
      await claudePage.waitForInstanceCreation();
      
      const initialCount = await claudePage.getInstanceCount();
      expect(initialCount).toBe(1);
      
      // Terminate instance
      await claudePage.terminateInstance(0);
      
      // Verify instance was terminated
      const finalCount = await claudePage.getInstanceCount();
      expect(finalCount).toBe(0);
    });
  });
  
  test.describe('Terminal I/O Streaming Functionality', () => {
    test('terminal I/O streaming continues functioning correctly', async () => {
      // Create instance and start streaming
      await claudePage.clickProdButton();
      await claudePage.selectInstance(0);
      
      // Wait for connection to establish
      await claudePage.waitForConnection();
      
      // Test basic input/output streaming
      await chatPage.sendMessage('echo "Streaming test"');
      await chatPage.waitForOutputContains('Streaming test');
      
      // Test continuous streaming
      await chatPage.sendMessage('for i in {1..3}; do echo "Stream $i"; sleep 1; done');
      
      // Verify streaming output appears progressively
      await chatPage.waitForOutputContains('Stream 1');
      await chatPage.waitForOutputContains('Stream 2');
      await chatPage.waitForOutputContains('Stream 3');
    });
    
    test('real-time output streaming performance maintained', async () => {
      await claudePage.clickProdButton();
      await claudePage.selectInstance(0);
      await claudePage.waitForConnection();
      
      // Test streaming performance
      const startTime = Date.now();
      await chatPage.sendMessage('echo "Performance test"');
      await chatPage.waitForOutputContains('Performance test');
      const responseTime = Date.now() - startTime;
      
      // Response should be reasonably fast (under 3 seconds)
      expect(responseTime).toBeLessThan(3000);
    });
    
    test('long-running command streaming works correctly', async () => {
      await claudePage.clickProdButton();
      await claudePage.selectInstance(0);
      await claudePage.waitForConnection();
      
      // Test long-running command
      await chatPage.sendMessage('for i in {1..5}; do echo "Long running $i"; sleep 2; done');
      
      // Verify progressive output
      for (let i = 1; i <= 5; i++) {
        await chatPage.waitForOutputContains(`Long running ${i}`, 15000);
      }
    });
    
    test('binary output handling preserved', async () => {
      await claudePage.clickProdButton();
      await claudePage.selectInstance(0);
      await claudePage.waitForConnection();
      
      // Test command that might produce binary-like output
      await chatPage.sendMessage('ls -la /bin | head -5');
      await chatPage.page.waitForTimeout(2000);
      
      const output = await chatPage.getInstanceOutput();
      expect(output.length).toBeGreaterThan(0);
      
      // Should contain typical ls output patterns
      expect(output).toMatch(/^[drwx-]{10}/m); // Permission patterns
    });
    
    test('error output streaming works correctly', async () => {
      await claudePage.clickProdButton();
      await claudePage.selectInstance(0);
      await claudePage.waitForConnection();
      
      // Run command that produces error output
      await chatPage.sendMessage('ls /nonexistent/directory');
      await chatPage.page.waitForTimeout(2000);
      
      const output = await chatPage.getInstanceOutput();
      
      // Should contain error message
      expect(output.toLowerCase()).toMatch(/(no such file|not found|cannot access)/);
    });
  });
  
  test.describe('Working Directory Resolution', () => {
    test('working directory resolution unchanged for prod instances', async () => {
      await claudePage.clickProdButton();
      await claudePage.selectInstance(0);
      await claudePage.waitForConnection();
      
      // Check current working directory
      await chatPage.sendMessage('pwd');
      await chatPage.page.waitForTimeout(1000);
      
      const output = await chatPage.getInstanceOutput();
      
      // Should be in prod directory or appropriate working directory
      expect(output).toMatch(/\/.*prod|\/workspaces\/agent-feed/);
    });
    
    test('file system access works correctly', async () => {
      await claudePage.clickProdButton();
      await claudePage.selectInstance(0);
      await claudePage.waitForConnection();
      
      // Test file system operations
      await chatPage.sendMessage('ls -la');
      await chatPage.page.waitForTimeout(2000);
      
      const output = await chatPage.getInstanceOutput();
      
      // Should show directory listing
      expect(output.length).toBeGreaterThan(0);
      expect(output).toMatch(/^[drwx-]/m); // Should contain file listing
    });
    
    test('relative path resolution works', async () => {
      await claudePage.clickProdButton();
      await claudePage.selectInstance(0);
      await claudePage.waitForConnection();
      
      // Test relative path access
      await chatPage.sendMessage('ls -la .');
      await chatPage.page.waitForTimeout(1000);
      
      const output1 = await chatPage.getInstanceOutput();
      
      await chatPage.sendMessage('ls -la ./');
      await chatPage.page.waitForTimeout(1000);
      
      const output2 = await chatPage.getInstanceOutput();
      
      // Both should work and produce output
      expect(output1.length).toBeGreaterThan(0);
      expect(output2.length).toBeGreaterThan(0);
    });
    
    test('parent directory access permissions maintained', async () => {
      await claudePage.clickProdButton();
      await claudePage.selectInstance(0);
      await claudePage.waitForConnection();
      
      // Test parent directory access
      await chatPage.sendMessage('ls -la ..');
      await chatPage.page.waitForTimeout(2000);
      
      const output = await chatPage.getInstanceOutput();
      
      // Should either show parent directory or appropriate error
      expect(output.length).toBeGreaterThan(0);
    });
  });
  
  test.describe('Authentication and Process Spawning', () => {
    test('Claude process spawning preserved', async () => {
      await claudePage.clickProdButton();
      await claudePage.waitForInstanceCreation();
      
      // Verify instance has a PID (process was spawned)
      const instanceItem = claudePage.instanceItems.first();
      const pidElement = instanceItem.locator('.instance-pid');
      
      await expect(pidElement).toBeVisible();
      
      const pidText = await pidElement.textContent();
      expect(pidText).toMatch(/PID: \d+/);
    });
    
    test('process isolation maintained', async () => {
      // Create two instances
      await claudePage.clickProdButton();
      await claudePage.waitForInstanceCreation();
      
      await claudePage.clickSkipPermissionsButton();
      await claudePage.waitForInstanceCreation();
      
      // Verify they have different PIDs
      const instances = await claudePage.instanceItems.all();
      expect(instances.length).toBe(2);
      
      const pid1Text = await instances[0].locator('.instance-pid').textContent();
      const pid2Text = await instances[1].locator('.instance-pid').textContent();
      
      expect(pid1Text).not.toBe(pid2Text);
      
      // Extract PID numbers
      const pid1 = pid1Text?.match(/\d+/)?.[0];
      const pid2 = pid2Text?.match(/\d+/)?.[0];
      
      expect(pid1).toBeTruthy();
      expect(pid2).toBeTruthy();
      expect(pid1).not.toBe(pid2);
    });
    
    test('permissions handling preserved for skip-permissions mode', async () => {
      await claudePage.clickSkipPermissionsButton();
      await claudePage.selectInstance(0);
      await claudePage.waitForConnection();
      
      // Test that skip-permissions mode allows appropriate access
      await chatPage.sendMessage('echo "Permissions test"');
      await chatPage.waitForOutputContains('Permissions test');
      
      // Test file operations that might require permissions
      await chatPage.sendMessage('touch /tmp/test_permissions');
      await chatPage.page.waitForTimeout(1000);
      
      const output = await chatPage.getInstanceOutput();
      
      // Should not show permission errors
      expect(output.toLowerCase()).not.toMatch(/permission denied|access denied/);
    });
    
    test('environment variables preserved', async () => {
      await claudePage.clickProdButton();
      await claudePage.selectInstance(0);
      await claudePage.waitForConnection();
      
      // Test environment variables
      await chatPage.sendMessage('echo $HOME');
      await chatPage.page.waitForTimeout(1000);
      
      const output = await chatPage.getInstanceOutput();
      
      // Should show home directory path
      expect(output).toMatch(/\/[a-zA-Z0-9\/]+/);
      
      // Test PATH variable
      await chatPage.sendMessage('echo $PATH');
      await chatPage.page.waitForTimeout(1000);
      
      const pathOutput = await chatPage.getInstanceOutput();
      expect(pathOutput).toContain(':'); // PATH typically contains colons
    });
  });
  
  test.describe('Error Handling and Recovery', () => {
    test('error handling and recovery scenarios work correctly', async ({ page }) => {
      // Test network interruption recovery
      await claudePage.clickProdButton();
      await claudePage.selectInstance(0);
      await claudePage.waitForConnection();
      
      // Send initial command
      await chatPage.sendMessage('echo "Before interruption"');
      await chatPage.waitForOutputContains('Before interruption');
      
      // Simulate network interruption by intercepting requests
      await page.route('**/api/**', route => {
        route.abort();
      });
      
      // Wait a moment for connection to be affected
      await page.waitForTimeout(2000);
      
      // Restore network
      await page.unroute('**/api/**');
      
      // Wait for connection to recover
      await page.waitForTimeout(3000);
      
      // Test that connection recovers
      await chatPage.sendMessage('echo "After recovery"');
      await chatPage.waitForOutputContains('After recovery', 10000);
    });
    
    test('instance crash recovery', async () => {
      await claudePage.clickProdButton();
      await claudePage.selectInstance(0);
      await claudePage.waitForConnection();
      
      // Get initial instance details
      const initialInstanceId = await claudePage.instanceItems.first().locator('.instance-id').textContent();
      
      // Terminate the instance externally (simulate crash)
      await claudePage.terminateInstance(0);
      
      // Create new instance
      await claudePage.clickProdButton();
      await claudePage.selectInstance(0);
      
      // Verify new instance has different ID
      const newInstanceId = await claudePage.instanceItems.first().locator('.instance-id').textContent();
      expect(newInstanceId).not.toBe(initialInstanceId);
      
      // Verify new instance works
      await claudePage.waitForConnection();
      await chatPage.sendMessage('echo "New instance works"');
      await chatPage.waitForOutputContains('New instance works');
    });
    
    test('invalid command handling preserved', async () => {
      await claudePage.clickProdButton();
      await claudePage.selectInstance(0);
      await claudePage.waitForConnection();
      
      // Send invalid command
      await chatPage.sendMessage('nonexistentcommand123');
      await chatPage.page.waitForTimeout(2000);
      
      const output = await chatPage.getInstanceOutput();
      
      // Should contain appropriate error message
      expect(output.toLowerCase()).toMatch(/(command not found|not recognized)/);
      
      // Interface should still be functional after error
      await chatPage.sendMessage('echo "Still working"');
      await chatPage.waitForOutputContains('Still working');
    });
    
    test('connection timeout handling', async ({ page }) => {
      // Set very short timeout to test timeout handling
      await page.addInitScript(() => {
        (window as any).testTimeout = 100; // Very short timeout
      });
      
      await claudePage.clickProdButton();
      
      // If connection times out, error should be handled gracefully
      const hasError = await claudePage.hasErrorMessage();
      if (hasError) {
        const errorMessage = await claudePage.getErrorMessage();
        expect(errorMessage.length).toBeGreaterThan(0);
        
        // Interface should remain usable
        await expect(claudePage.prodButton).toBeEnabled();
      }
    });
    
    test('malformed input handling', async () => {
      await claudePage.clickProdButton();
      await claudePage.selectInstance(0);
      await claudePage.waitForConnection();
      
      // Test various malformed inputs
      const malformedInputs = [
        'echo "unclosed quote',
        'echo \x00\x01\x02', // Control characters
        'echo ' + 'A'.repeat(1000), // Very long input
        'echo "\n\t\r"' // Escape sequences
      ];
      
      for (const input of malformedInputs) {
        await chatPage.sendMessage(input);
        await chatPage.page.waitForTimeout(1000);
        
        // Interface should remain functional
        await expect(chatPage.chatInput).toBeEnabled();
        await expect(chatPage.sendButton).toBeEnabled();
      }
    });
  });
  
  // Cleanup after each test
  test.afterEach(async () => {
    try {
      // Clean up any created instances
      while (await claudePage.getInstanceCount() > 0) {
        await claudePage.terminateInstance(0);
        await claudePage.page.waitForTimeout(1000);
      }
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  });
});
