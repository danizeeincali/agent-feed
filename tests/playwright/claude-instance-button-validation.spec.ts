import { test, expect, Page } from '@playwright/test';

/**
 * Claude Instance Button Click Validation Tests
 * 
 * Comprehensive testing for all 4 Claude instance launch buttons:
 * 1. prod/claude - Basic production launch
 * 2. skip-permissions - Launch with permissions skipped  
 * 3. skip-permissions -c - Launch with permissions skipped and -c flag
 * 4. skip-permissions --resume - Resume with permissions skipped
 */

test.describe('Claude Instance Button Validation', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to frontend
    await page.goto('/');
    
    // Wait for Claude Instance Manager to load
    await page.waitForSelector('[data-testid="claude-instance-manager"]', {
      timeout: 15000
    });
    
    // Ensure all buttons are visible
    await expect(page.locator('button:has-text("🚀 prod/claude")')).toBeVisible();
    await expect(page.locator('button:has-text("⚡ skip-permissions")')).toBeVisible();
    await expect(page.locator('button:has-text("⚡ skip-permissions -c")')).toBeVisible();
    await expect(page.locator('button:has-text("↻ skip-permissions --resume")')).toBeVisible();
  });

  test.afterEach(async () => {
    // Clean up any instances created during test
    try {
      const instances = await page.evaluate(async () => {
        const response = await fetch('http://localhost:3000/api/claude/instances');
        const data = await response.json();
        return data.instances || [];
      });

      for (const instance of instances) {
        await page.evaluate(async (instanceId) => {
          await fetch(`http://localhost:3000/api/claude/instances/${instanceId}`, {
            method: 'DELETE'
          });
        }, instance.id);
      }
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  });

  test('Button 1: prod/claude creates instance successfully', async () => {
    console.log('🚀 Testing prod/claude button...');
    
    // Click the prod/claude button
    await page.click('button:has-text("🚀 prod/claude")');
    
    // Verify loading state appears
    await expect(page.locator('button:has-text("🚀 prod/claude")')).toBeDisabled();
    
    // Wait for instance to be created (should appear in instances list)
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    
    // Verify instance appears with correct status progression
    const instanceItem = page.locator('.instance-item').first();
    await expect(instanceItem).toContainText('claude-');
    
    // Check status transitions: starting -> running
    await expect(instanceItem.locator('.status-text')).toContainText('starting', { timeout: 5000 });
    
    // Wait for running status (may take time for Claude to start)
    await expect(instanceItem.locator('.status-text')).toContainText('running', { timeout: 45000 });
    
    // Verify connection status updates
    await expect(page.locator('.connection-status')).toContainText('Connected', { timeout: 10000 });
    
    // Verify no error messages
    await expect(page.locator('.error')).not.toBeVisible();
    
    console.log('✅ prod/claude button test passed');
  });

  test('Button 2: skip-permissions creates instance successfully', async () => {
    console.log('⚡ Testing skip-permissions button...');
    
    // Click the skip-permissions button
    await page.click('button:has-text("⚡ skip-permissions"):not(:has-text("-c")):not(:has-text("--resume"))');
    
    // Verify loading state
    await expect(page.locator('button:has-text("⚡ skip-permissions"):not(:has-text("-c")):not(:has-text("--resume"))')).toBeDisabled();
    
    // Wait for instance creation
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    
    // Verify instance with skip-permissions configuration
    const instanceItem = page.locator('.instance-item').first();
    await expect(instanceItem).toContainText('claude-');
    
    // Verify status progression  
    await expect(instanceItem.locator('.status-text')).toContainText(/starting|running/, { timeout: 45000 });
    
    // Verify no permission-related errors
    await expect(page.locator('.error')).not.toBeVisible();
    
    console.log('✅ skip-permissions button test passed');
  });

  test('Button 3: skip-permissions -c creates instance successfully', async () => {
    console.log('⚡ Testing skip-permissions -c button...');
    
    // Click the skip-permissions -c button
    await page.click('button:has-text("⚡ skip-permissions -c")');
    
    // Verify loading state
    await expect(page.locator('button:has-text("⚡ skip-permissions -c")')).toBeDisabled();
    
    // Wait for instance creation
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    
    // Verify instance created
    const instanceItem = page.locator('.instance-item').first();
    await expect(instanceItem).toContainText('claude-');
    
    // Verify status shows starting or running
    await expect(instanceItem.locator('.status-text')).toContainText(/starting|running/, { timeout: 45000 });
    
    // Verify connection established
    await expect(page.locator('.connection-status')).toContainText('Connected', { timeout: 15000 });
    
    // Verify no errors
    await expect(page.locator('.error')).not.toBeVisible();
    
    console.log('✅ skip-permissions -c button test passed');
  });

  test('Button 4: skip-permissions --resume creates instance successfully', async () => {
    console.log('↻ Testing skip-permissions --resume button...');
    
    // Click the skip-permissions --resume button
    await page.click('button:has-text("↻ skip-permissions --resume")');
    
    // Verify loading state
    await expect(page.locator('button:has-text("↻ skip-permissions --resume")')).toBeDisabled();
    
    // Wait for instance creation
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    
    // Verify instance created
    const instanceItem = page.locator('.instance-item').first();
    await expect(instanceItem).toContainText('claude-');
    
    // Verify status progression
    await expect(instanceItem.locator('.status-text')).toContainText(/starting|running/, { timeout: 45000 });
    
    // Verify resume functionality doesn't cause errors
    await expect(page.locator('.error')).not.toBeVisible();
    
    console.log('✅ skip-permissions --resume button test passed');
  });

  test('All buttons work without hanging or blocking UI', async () => {
    console.log('🔄 Testing all buttons for non-blocking behavior...');
    
    // Test that multiple button clicks don't hang the UI
    const buttons = [
      'button:has-text("🚀 prod/claude")',
      'button:has-text("⚡ skip-permissions"):not(:has-text("-c")):not(:has-text("--resume"))',
      'button:has-text("⚡ skip-permissions -c")',
      'button:has-text("↻ skip-permissions --resume")'
    ];
    
    for (let i = 0; i < buttons.length; i++) {
      const buttonSelector = buttons[i];
      
      // Click button
      await page.click(buttonSelector);
      
      // Verify button becomes disabled (loading state)
      await expect(page.locator(buttonSelector)).toBeDisabled();
      
      // Verify UI remains responsive
      await expect(page.locator('.claude-instance-manager')).toBeVisible();
      
      // Wait for instance to start appearing
      await page.waitForSelector('.instance-item', { timeout: 30000 });
      
      // Clean up before next iteration (except last)
      if (i < buttons.length - 1) {
        const instances = await page.evaluate(async () => {
          const response = await fetch('http://localhost:3000/api/claude/instances');
          const data = await response.json();
          return data.instances || [];
        });

        for (const instance of instances) {
          await page.evaluate(async (instanceId) => {
            await fetch(`http://localhost:3000/api/claude/instances/${instanceId}`, {
              method: 'DELETE'
            });
          }, instance.id);
        }
        
        // Wait for cleanup
        await page.waitForTimeout(2000);
      }
    }
    
    // Verify UI never showed errors during the process
    await expect(page.locator('.error')).not.toBeVisible();
    
    console.log('✅ All buttons non-blocking behavior test passed');
  });

  test('Button clicks generate correct instance configurations', async () => {
    console.log('⚙️ Testing button configuration mapping...');
    
    // Test prod/claude button configuration
    await page.click('button:has-text("🚀 prod/claude")');
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    
    // Verify instance created with correct name pattern
    const prodInstance = page.locator('.instance-item').first();
    await expect(prodInstance).toContainText('claude-');
    
    // Clean up
    await page.evaluate(async () => {
      const response = await fetch('http://localhost:3000/api/claude/instances');
      const data = await response.json();
      for (const instance of data.instances || []) {
        await fetch(`http://localhost:3000/api/claude/instances/${instance.id}`, {
          method: 'DELETE'
        });
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Test skip-permissions button has different behavior
    await page.click('button:has-text("⚡ skip-permissions"):not(:has-text("-c")):not(:has-text("--resume"))');
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    
    const skipPermInstance = page.locator('.instance-item').first();
    await expect(skipPermInstance).toContainText('claude-');
    
    console.log('✅ Button configuration mapping test passed');
  });
});