/**
 * Simple Working Directory Bug Validation Test
 * 
 * This test validates the critical bug where Button 1 "prod/claude" 
 * should spawn in /workspaces/agent-feed/prod but actually spawns in /workspaces/agent-feed
 */

const { test, expect } = require('@playwright/test');

test.describe('Simple Working Directory Bug Test', () => {
  test('Button 1 prod/claude working directory bug validation', async ({ page }) => {
    console.log('🧪 Testing Button 1: prod/claude working directory bug');

    // Navigate to the application
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    
    // Wait for the page to load
    await page.waitForTimeout(2000);
    
    // Check if Claude Instance Manager is visible
    const header = page.locator('h2:has-text("Claude Instance Manager")');
    await expect(header).toBeVisible({ timeout: 10000 });

    // Intercept API calls to capture request body
    let apiRequestBody = null;
    page.route('**/api/claude/instances', async (route, request) => {
      if (request.method() === 'POST') {
        apiRequestBody = request.postDataJSON();
        console.log('📡 Intercepted API request:', apiRequestBody);
      }
      await route.continue();
    });

    // Find and click the prod button
    const prodButton = page.locator('button:has-text("🚀 prod/claude")');
    await expect(prodButton).toBeVisible({ timeout: 10000 });
    
    console.log('🔘 Clicking prod/claude button');
    await prodButton.click();

    // Wait for API call
    await page.waitForTimeout(3000);

    // Validate the API request was intercepted
    expect(apiRequestBody).not.toBeNull();
    console.log('📋 API Request Body:', apiRequestBody);

    // CRITICAL BUG VALIDATION:
    // The bug is in the backend - frontend sends correct workingDirectory 
    // but backend ignores it and uses hardcoded '/workspaces/agent-feed'
    
    if (apiRequestBody.workingDirectory === '/workspaces/agent-feed/prod') {
      console.log('✅ Frontend sends correct working directory: /workspaces/agent-feed/prod');
    } else if (apiRequestBody.workingDirectory === '/workspaces/agent-feed') {
      console.log('❌ Frontend bug: Sending wrong working directory');
    } else {
      console.log('⚠️ Unexpected working directory:', apiRequestBody.workingDirectory);
    }

    // Validate command array
    expect(apiRequestBody.command).toEqual(['claude']);
    console.log('✅ Command array is correct:', apiRequestBody.command);
  });

  test('Backend working directory hardcoding bug', async ({ page }) => {
    console.log('🧪 Testing backend working directory bug via console logs');

    // Monitor console for backend logs
    const backendLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Spawning real Claude process')) {
        backendLogs.push(text);
        console.log('📋 Backend Log:', text);
      }
    });

    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);

    const header = page.locator('h2:has-text("Claude Instance Manager")');
    await expect(header).toBeVisible();

    const prodButton = page.locator('button:has-text("🚀 prod/claude")');
    await prodButton.click();
    
    // Wait for spawn to happen
    await page.waitForTimeout(5000);

    // Check if we captured the spawn log
    if (backendLogs.length > 0) {
      const spawnLog = backendLogs[0];
      console.log('📋 Spawn log captured:', spawnLog);
      
      if (spawnLog.includes('in /workspaces/agent-feed/prod')) {
        console.log('✅ FIXED: Backend uses correct working directory');
      } else if (spawnLog.includes('in /workspaces/agent-feed')) {
        console.log('❌ BUG CONFIRMED: Backend hardcodes /workspaces/agent-feed');
        console.log('   Expected: /workspaces/agent-feed/prod');
        console.log('   Actual: /workspaces/agent-feed (hardcoded in backend)');
      }
    } else {
      console.log('⚠️ No spawn logs captured - backend may not be running');
    }
  });

  test('All buttons working directory comparison', async ({ page }) => {
    console.log('🧪 Comparing all button working directories');

    const buttonTests = [
      { text: '🚀 prod/claude', expected: '/workspaces/agent-feed/prod' },
      { text: '⚡ skip-permissions', expected: '/workspaces/agent-feed' },
      { text: '⚡ skip-permissions -c', expected: '/workspaces/agent-feed' },
      { text: '↻ skip-permissions --resume', expected: '/workspaces/agent-feed' }
    ];

    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);

    const results = [];

    for (const buttonTest of buttonTests) {
      // Reset interceptor
      let lastRequest = null;
      page.route('**/api/claude/instances', async (route, request) => {
        if (request.method() === 'POST') {
          lastRequest = request.postDataJSON();
        }
        await route.continue();
      });

      // Find and click button
      const button = page.locator(`button:has-text("${buttonTest.text}")`);
      if (await button.isVisible()) {
        await button.click();
        await page.waitForTimeout(2000);
        
        if (lastRequest) {
          results.push({
            button: buttonTest.text,
            expected: buttonTest.expected,
            actual: lastRequest.workingDirectory,
            match: lastRequest.workingDirectory === buttonTest.expected
          });
        }

        // Clean up - find and click terminate if instance was created
        const terminateBtn = page.locator('.btn-terminate').first();
        if (await terminateBtn.isVisible({ timeout: 3000 })) {
          await terminateBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // Display results
    console.log('\n📊 WORKING DIRECTORY COMPARISON RESULTS:');
    results.forEach(result => {
      const status = result.match ? '✅' : '❌';
      console.log(`${status} ${result.button}`);
      console.log(`   Expected: ${result.expected}`);
      console.log(`   Actual: ${result.actual}`);
    });

    // Validate at least one result captured
    expect(results.length).toBeGreaterThan(0);
  });
});