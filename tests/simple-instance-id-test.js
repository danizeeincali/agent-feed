/**
 * Simple Instance ID Bug Validation Test
 * Tests the specific issue: Terminal tries to connect to 'undefined' instead of actual instance ID
 */

const { test, expect } = require('@playwright/test');

test.describe('Instance ID Bug Detection', () => {
  test('Detect undefined instance ID in terminal connection', async ({ page }) => {
    const consoleMessages = [];
    
    // Capture all console messages
    page.on('console', msg => {
      const message = `[${msg.type()}] ${msg.text()}`;
      consoleMessages.push(message);
      if (message.includes('undefined') || message.includes('instance')) {
        console.log(`CONSOLE: ${message}`);
      }
    });

    // Navigate to frontend
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for app to load
    await page.waitForSelector('.claude-instance-manager', { timeout: 10000 });
    console.log('✅ App loaded');

    // Click first button to create instance
    const firstButton = page.locator('[title="Launch Claude in prod directory"]');
    await expect(firstButton).toBeVisible({ timeout: 5000 });
    await firstButton.click();
    console.log('✅ Button clicked');

    // Wait for instance to appear
    await page.waitForFunction(() => {
      const instances = document.querySelectorAll('.instance-item');
      return instances.length > 0;
    }, { timeout: 15000 });

    // Get instance ID
    const instanceElement = page.locator('.instance-item').first();
    const instanceIdText = await instanceElement.locator('.instance-id').textContent();
    const instanceId = instanceIdText.replace('ID: ', '');
    console.log(`✅ Instance created: ${instanceId}`);

    // Verify instance ID format
    expect(instanceId).toMatch(/^claude-\d+$/);
    expect(instanceId).not.toBe('undefined');

    // Select the instance
    await instanceElement.click();
    console.log('✅ Instance selected');

    // Wait for terminal interface
    await page.waitForSelector('.input-area', { timeout: 10000 });
    
    // Wait a moment for any connection messages
    await page.waitForTimeout(3000);

    // Check for undefined instance ID bugs in console
    const undefinedBugs = consoleMessages.filter(msg => 
      (msg.includes('undefined') && msg.includes('instance')) ||
      msg.includes('SSE') && msg.includes('undefined') ||
      msg.includes('terminal') && msg.includes('undefined')
    );

    if (undefinedBugs.length > 0) {
      console.error('❌ FOUND UNDEFINED INSTANCE ID BUGS:');
      undefinedBugs.forEach(bug => console.error(`  - ${bug}`));
      
      // This is the bug we're looking for - fail the test
      expect(undefinedBugs).toHaveLength(0);
    } else {
      console.log('✅ No undefined instance ID bugs detected in frontend logs');
    }

    // Test terminal command to trigger backend interaction
    const inputField = page.locator('.input-field');
    await inputField.fill('echo "Testing instance ID: ' + instanceId + '"');
    await page.locator('.btn-send').click();
    console.log('✅ Test command sent');

    // Wait for response and check for more undefined bugs
    await page.waitForTimeout(2000);
    
    const finalUndefinedBugs = consoleMessages.filter(msg => 
      msg.includes('undefined') && (msg.includes('instance') || msg.includes('terminal') || msg.includes('SSE'))
    );

    if (finalUndefinedBugs.length > 0) {
      console.error('❌ FOUND UNDEFINED BUGS AFTER COMMAND:');
      finalUndefinedBugs.forEach(bug => console.error(`  - ${bug}`));
    }

    // Report final status
    console.log(`📊 Total console messages: ${consoleMessages.length}`);
    console.log(`🔍 Instance ID bugs found: ${finalUndefinedBugs.length}`);
    
    // The main assertion
    expect(finalUndefinedBugs).toHaveLength(0);
  });

  test('Backend API validation - Direct instance creation', async ({ page }) => {
    console.log('🧪 Testing backend instance creation API directly');
    
    // Test instance creation via API
    const response = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3000/api/claude/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command: ['claude'],
          workingDirectory: '/workspaces/agent-feed/prod'
        })
      });
      return await res.json();
    });

    console.log('Backend response:', JSON.stringify(response, null, 2));
    
    expect(response.success).toBe(true);
    expect(response.instance).toBeDefined();
    expect(response.instance.id).toMatch(/^claude-\d+$/);
    expect(response.instance.id).not.toBe('undefined');
    
    console.log(`✅ Backend API created instance: ${response.instance.id}`);

    // Clean up the instance
    if (response.instance?.id) {
      await page.evaluate(async (instanceId) => {
        await fetch(`http://localhost:3000/api/claude/instances/${instanceId}`, {
          method: 'DELETE'
        });
      }, response.instance.id);
      console.log(`🧹 Cleaned up instance: ${response.instance.id}`);
    }
  });
});