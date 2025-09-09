import { test, expect, devices } from '@playwright/test';

/**
 * CROSS-BROWSER @ MENTION SYSTEM VALIDATION
 * 
 * Tests @ mention functionality across different browsers and devices
 * to ensure production readiness and compatibility.
 */

const browsers = ['chromium', 'firefox', 'webkit'];
const testDevices = [
  devices['Desktop Chrome'],
  devices['Desktop Firefox'],
  devices['Desktop Safari'],
  devices['iPhone 12'],
  devices['iPad Pro']
];

for (const browserName of browsers) {
  test.describe(`Cross-Browser Validation - ${browserName}`, () => {
    test.use({ 
      ...devices[`Desktop ${browserName.charAt(0).toUpperCase() + browserName.slice(1)}`] || {},
      video: 'retain-on-failure'
    });

    test(`${browserName}: MentionInputDemo Compatibility`, async ({ page, browserName: browser }) => {
      console.log(`🌐 Testing MentionInputDemo on ${browser}`);
      
      await page.goto('http://localhost:5173/mention-demo');
      await page.waitForLoadState('networkidle');
      
      // Browser-specific screenshot
      await page.screenshot({ 
        path: `test-results/cross-browser-${browser}-mention-demo-initial-${Date.now()}.png`,
        fullPage: true 
      });
      
      // Find mention input (browser-agnostic selectors)
      const mentionInput = page.locator('input, textarea, [contenteditable="true"]').first();
      
      // Test @ character input
      await mentionInput.click();
      await mentionInput.type('@');
      await page.waitForTimeout(500);
      
      // Check dropdown appearance
      const dropdown = page.locator('.mention-dropdown, .dropdown-menu, .suggestions, [role="listbox"]');
      const dropdownVisible = await dropdown.isVisible().catch(() => false);
      
      // Browser-specific behavior analysis
      const browserAnalysis = await page.evaluate(() => ({
        userAgent: navigator.userAgent,
        browserEngine: navigator.product || 'unknown',
        eventSupport: {
          inputEvent: 'InputEvent' in window,
          compositionEvent: 'CompositionEvent' in window,
          keyboardEvent: 'KeyboardEvent' in window
        },
        cssSupport: {
          grid: CSS.supports('display', 'grid'),
          flexbox: CSS.supports('display', 'flex'),
          customProperties: CSS.supports('--test', 'red')
        }
      }));
      
      console.log(`${browser} Browser Analysis:`, browserAnalysis);
      
      // Final screenshot
      await page.screenshot({ 
        path: `test-results/cross-browser-${browser}-mention-demo-final-${Date.now()}.png`,
        fullPage: true 
      });
      
      // Validation
      expect(dropdownVisible, `@ mention should work on ${browser}`).toBe(true);
    });

    test(`${browserName}: Input Event Handling`, async ({ page, browserName: browser }) => {
      await page.goto('http://localhost:5173/mention-demo');
      await page.waitForLoadState('networkidle');
      
      const mentionInput = page.locator('input, textarea').first();
      await mentionInput.click();
      
      // Test various input methods
      const inputMethods = [
        { method: 'type', value: '@' },
        { method: 'fill', value: '@test' },
        { method: 'pressSequentially', value: '@user' }
      ];
      
      for (const inputMethod of inputMethods) {
        await mentionInput.clear();
        
        if (inputMethod.method === 'type') {
          await mentionInput.type(inputMethod.value);
        } else if (inputMethod.method === 'fill') {
          await mentionInput.fill(inputMethod.value);
        } else if (inputMethod.method === 'pressSequentially') {
          await mentionInput.pressSequentially(inputMethod.value);
        }
        
        await page.waitForTimeout(300);
        
        const dropdown = page.locator('.mention-dropdown, .dropdown-menu');
        const visible = await dropdown.isVisible().catch(() => false);
        
        console.log(`${browser} - ${inputMethod.method}: dropdown visible = ${visible}`);
      }
    });

    test(`${browserName}: Mobile Touch Events`, async ({ page, browserName: browser }) => {
      if (!browser.includes('webkit') && !browser.includes('mobile')) {
        test.skip(true, 'Mobile test only for webkit/mobile browsers');
        return;
      }
      
      await page.goto('http://localhost:5173/mention-demo');
      await page.waitForLoadState('networkidle');
      
      const mentionInput = page.locator('input, textarea').first();
      
      // Simulate mobile touch
      await mentionInput.tap();
      await page.waitForTimeout(100);
      
      // Virtual keyboard input simulation
      await mentionInput.type('@');
      await page.waitForTimeout(800); // Mobile might be slower
      
      const dropdown = page.locator('.mention-dropdown, .dropdown-menu');
      const dropdownVisible = await dropdown.isVisible().catch(() => false);
      
      await page.screenshot({ 
        path: `test-results/mobile-${browser}-mention-${Date.now()}.png`,
        fullPage: true 
      });
      
      expect(dropdownVisible, `Mobile @ mention should work on ${browser}`).toBe(true);
    });
  });
}

test.describe('Performance Across Browsers', () => {
  test('Dropdown Response Time Benchmark', async ({ page, browserName }) => {
    await page.goto('http://localhost:5173/mention-demo');
    await page.waitForLoadState('networkidle');
    
    const mentionInput = page.locator('input, textarea').first();
    await mentionInput.click();
    
    // Measure response time
    const measurements = [];
    
    for (let i = 0; i < 5; i++) {
      await mentionInput.clear();
      
      const startTime = Date.now();
      await mentionInput.type('@');
      
      try {
        await page.waitForSelector('.mention-dropdown, .dropdown-menu', { timeout: 2000 });
        const responseTime = Date.now() - startTime;
        measurements.push(responseTime);
        console.log(`${browserName} Trial ${i + 1}: ${responseTime}ms`);
      } catch (error) {
        measurements.push(2000); // Timeout
        console.log(`${browserName} Trial ${i + 1}: TIMEOUT`);
      }
      
      await page.waitForTimeout(200);
    }
    
    const avgResponseTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const maxResponseTime = Math.max(...measurements);
    
    console.log(`${browserName} Performance:`);
    console.log(`  Average: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`  Maximum: ${maxResponseTime}ms`);
    console.log(`  All measurements: ${measurements.join(', ')}ms`);
    
    // Performance requirements
    expect(avgResponseTime, `Average response time should be under 500ms on ${browserName}`).toBeLessThan(500);
    expect(maxResponseTime, `Maximum response time should be under 1000ms on ${browserName}`).toBeLessThan(1000);
  });

  test('Memory Usage Monitoring', async ({ page, browserName }) => {
    await page.goto('http://localhost:5173/mention-demo');
    await page.waitForLoadState('networkidle');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
    
    const mentionInput = page.locator('input, textarea').first();
    
    // Simulate heavy @ mention usage
    for (let i = 0; i < 20; i++) {
      await mentionInput.click();
      await mentionInput.type('@test' + i);
      await page.waitForTimeout(100);
      await mentionInput.clear();
    }
    
    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
    
    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      console.log(`${browserName} Memory Usage:`);
      console.log(`  Initial: ${(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Final: ${(finalMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      
      // Memory should not increase dramatically
      expect(memoryIncrease / 1024 / 1024, 'Memory increase should be reasonable').toBeLessThan(10);
    }
  });
});

test.describe('Network Conditions Testing', () => {
  test('Slow Network Performance', async ({ page, browserName }) => {
    // Simulate slow 3G connection
    await page.context().route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      await route.continue();
    });
    
    await page.goto('http://localhost:5173/mention-demo');
    await page.waitForLoadState('networkidle');
    
    const mentionInput = page.locator('input, textarea').first();
    await mentionInput.click();
    await mentionInput.type('@');
    
    // Should still work on slow networks
    const dropdown = page.locator('.mention-dropdown, .dropdown-menu');
    const dropdownVisible = await dropdown.waitFor({ 
      state: 'visible', 
      timeout: 3000 
    }).then(() => true).catch(() => false);
    
    expect(dropdownVisible, `@ mention should work on slow networks in ${browserName}`).toBe(true);
  });

  test('Offline Resilience', async ({ page, browserName }) => {
    await page.goto('http://localhost:5173/mention-demo');
    await page.waitForLoadState('networkidle');
    
    // Go offline
    await page.context().setOffline(true);
    
    const mentionInput = page.locator('input, textarea').first();
    await mentionInput.click();
    await mentionInput.type('@');
    
    // @ detection should still work offline (if using cached data)
    const dropdown = page.locator('.mention-dropdown, .dropdown-menu');
    const dropdownExists = await dropdown.count() > 0;
    
    console.log(`${browserName} Offline: dropdown exists = ${dropdownExists}`);
    
    // Restore online
    await page.context().setOffline(false);
  });
});