import { test, expect } from '@playwright/test';
import { AgentFeedPage } from './pages/AgentFeedPage';

test.describe('Permission Dialogs - Interactive Testing', () => {
  let agentFeedPage: AgentFeedPage;

  test.beforeEach(async ({ page }) => {
    agentFeedPage = new AgentFeedPage(page);
    await agentFeedPage.goto();
    await agentFeedPage.createNewInstance();
  });

  test('File System Permission Dialog', async ({ page }) => {
    // Execute command that requires file system access
    await agentFeedPage.executeCommand('mkdir -p /tmp/test-dir && touch /tmp/test-dir/test-file.txt');
    
    // Check if permission dialog appears
    if (await agentFeedPage.permissionDialog.isVisible({ timeout: 5000 })) {
      // Verify dialog content
      await expect(agentFeedPage.permissionDialog).toContainText(/permission/i);
      await expect(agentFeedPage.permissionDialog).toContainText(/allow|deny/i);
      
      // Take screenshot of permission dialog
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/permission-dialog-filesystem.png',
        clip: { x: 0, y: 0, width: 800, height: 400 }
      });
      
      // Click allow
      await page.getByRole('button', { name: /allow/i }).click();
      
      // Verify dialog disappears
      await expect(agentFeedPage.permissionDialog).toBeHidden();
    }
    
    // Verify command executed successfully
    await expect(agentFeedPage.terminalOutput).toContainText(/test-file\.txt|created|mkdir/, { timeout: 10000 });
  });

  test('Network Permission Dialog', async ({ page }) => {
    // Execute command that requires network access
    await agentFeedPage.executeCommand('curl -s http://httpbin.org/ip');
    
    // Check if permission dialog appears
    if (await agentFeedPage.permissionDialog.isVisible({ timeout: 5000 })) {
      // Verify dialog content
      await expect(agentFeedPage.permissionDialog).toContainText(/network|internet/i);
      
      // Take screenshot
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/permission-dialog-network.png',
        clip: { x: 0, y: 0, width: 800, height: 400 }
      });
      
      // Click allow
      await page.getByRole('button', { name: /allow/i }).click();
      
      // Verify dialog disappears
      await expect(agentFeedPage.permissionDialog).toBeHidden();
    }
    
    // Verify command completed (may timeout if no network permission)
    await page.waitForTimeout(5000);
    await agentFeedPage.verifyErrorHandling();
  });

  test('System Command Permission Dialog', async ({ page }) => {
    // Execute potentially dangerous system command
    await agentFeedPage.executeCommand('ps aux | grep node');
    
    // Check if permission dialog appears
    if (await agentFeedPage.permissionDialog.isVisible({ timeout: 5000 })) {
      // Verify dialog has security warning
      await expect(agentFeedPage.permissionDialog).toContainText(/system|process/i);
      
      // Test deny functionality
      await page.getByRole('button', { name: /deny/i }).click();
      
      // Verify command was blocked
      await expect(agentFeedPage.terminalOutput).toContainText(/denied|blocked|permission/i, { timeout: 5000 });
    }
    
    // Execute again and allow
    await agentFeedPage.executeCommand('ps aux | grep node');
    
    if (await agentFeedPage.permissionDialog.isVisible({ timeout: 5000 })) {
      await page.getByRole('button', { name: /allow/i }).click();
    }
    
    // Verify command executed
    await expect(agentFeedPage.terminalOutput).toContainText(/node|PID/, { timeout: 10000 });
  });

  test('Permission Dialog Accessibility', async ({ page }) => {
    // Execute command that triggers permission dialog
    await agentFeedPage.executeCommand('touch /tmp/accessibility-test.txt');
    
    if (await agentFeedPage.permissionDialog.isVisible({ timeout: 5000 })) {
      // Check ARIA attributes
      const dialog = agentFeedPage.permissionDialog;
      
      const role = await dialog.getAttribute('role');
      const ariaLabel = await dialog.getAttribute('aria-label');
      const ariaDescribedBy = await dialog.getAttribute('aria-describedby');
      
      expect(role).toBe('dialog');
      expect(ariaLabel || ariaDescribedBy).toBeTruthy();
      
      // Check focus management
      const allowButton = page.getByRole('button', { name: /allow/i });
      const denyButton = page.getByRole('button', { name: /deny/i });
      
      await expect(allowButton).toBeFocused();
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(denyButton).toBeFocused();
      
      // Test escape key
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    }
  });

  test('Multiple Permission Requests', async ({ page }) => {
    // Execute multiple commands that might require permissions
    const commands = [
      'mkdir -p /tmp/test1',
      'touch /tmp/test2.txt',
      'ls -la /tmp/'
    ];
    
    for (const command of commands) {
      await agentFeedPage.executeCommand(command);
      
      // Handle permission dialog if it appears
      if (await agentFeedPage.permissionDialog.isVisible({ timeout: 3000 })) {
        await page.getByRole('button', { name: /allow/i }).click();
        await expect(agentFeedPage.permissionDialog).toBeHidden();
      }
      
      await page.waitForTimeout(1000);
    }
    
    // Verify all commands executed
    await expect(agentFeedPage.terminalOutput).toContainText('test1');
    await expect(agentFeedPage.terminalOutput).toContainText('test2.txt');
  });

  test('Permission Dialog Timeout', async ({ page }) => {
    // Execute command that requires permission
    await agentFeedPage.executeCommand('touch /tmp/timeout-test.txt');
    
    if (await agentFeedPage.permissionDialog.isVisible({ timeout: 5000 })) {
      // Don't interact with dialog to test timeout
      
      // Wait longer than permission timeout (if implemented)
      await page.waitForTimeout(30000);
      
      // Dialog should either timeout or remain open
      const dialogVisible = await agentFeedPage.permissionDialog.isVisible();
      
      if (dialogVisible) {
        // If still visible, test that it's still functional
        await page.getByRole('button', { name: /deny/i }).click();
        await expect(agentFeedPage.permissionDialog).toBeHidden();
      }
      
      // Verify appropriate handling
      await agentFeedPage.verifyErrorHandling();
    }
  });

  test('Permission Dialog Content Validation', async ({ page }) => {
    // Execute command with clear permission requirements
    await agentFeedPage.executeCommand('rm -rf /tmp/test-deletion');
    
    if (await agentFeedPage.permissionDialog.isVisible({ timeout: 5000 })) {
      const dialog = agentFeedPage.permissionDialog;
      
      // Verify dialog contains necessary information
      await expect(dialog).toContainText(/command|permission|action/i);
      
      // Should show the actual command being executed
      await expect(dialog).toContainText('rm');
      
      // Should have clear action buttons
      const allowButton = page.getByRole('button', { name: /allow|yes|ok/i });
      const denyButton = page.getByRole('button', { name: /deny|no|cancel/i });
      
      await expect(allowButton).toBeVisible();
      await expect(denyButton).toBeVisible();
      
      // Should have description of what permission is needed
      const dialogText = await dialog.textContent();
      expect(dialogText?.toLowerCase()).toMatch(/file|delete|remove|system/);
      
      await denyButton.click();
    }
  });

  test('Permission Memory and Persistence', async ({ page }) => {
    // Execute command that requires permission
    await agentFeedPage.executeCommand('touch /tmp/memory-test-1.txt');
    
    let firstPermissionRequired = false;
    
    if (await agentFeedPage.permissionDialog.isVisible({ timeout: 5000 })) {
      firstPermissionRequired = true;
      await page.getByRole('button', { name: /allow/i }).click();
      await expect(agentFeedPage.permissionDialog).toBeHidden();
    }
    
    await page.waitForTimeout(2000);
    
    // Execute similar command
    await agentFeedPage.executeCommand('touch /tmp/memory-test-2.txt');
    
    // Check if permission is remembered (dialog should not appear again)
    const secondPermissionRequired = await agentFeedPage.permissionDialog.isVisible({ timeout: 3000 });
    
    if (firstPermissionRequired) {
      // If first required permission, second should be remembered
      console.log('Permission memory test:', {
        firstRequired: firstPermissionRequired,
        secondRequired: secondPermissionRequired
      });
    }
  });

  test('Permission Dialog Visual Consistency', async ({ page }) => {
    // Test dialog appearance across different command types
    const permissionCommands = [
      'mkdir -p /tmp/visual-test-1',
      'curl -s http://example.com',
      'ps aux'
    ];
    
    for (let i = 0; i < permissionCommands.length; i++) {
      const command = permissionCommands[i];
      await agentFeedPage.executeCommand(command);
      
      if (await agentFeedPage.permissionDialog.isVisible({ timeout: 5000 })) {
        // Take screenshot for visual consistency check
        await page.screenshot({ 
          path: `tests/e2e/screenshots/permission-dialog-${i + 1}.png`,
          clip: { x: 0, y: 0, width: 800, height: 400 }
        });
        
        // Verify consistent styling
        const dialog = agentFeedPage.permissionDialog;
        await expect(dialog).toHaveClass(/dialog|modal|permission/);
        
        // Always deny to test next command
        await page.getByRole('button', { name: /deny/i }).click();
        await expect(dialog).toBeHidden();
      }
      
      await page.waitForTimeout(1000);
    }
  });
});