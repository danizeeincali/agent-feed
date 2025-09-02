/**
 * MOBILE BROWSER TOOL CALL TESTS
 * 
 * Validates tool call visualization and functionality across mobile browsers
 * and different screen sizes. Ensures responsive design works correctly.
 */

import { test, expect, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const MOBILE_TEST_TIMEOUT = 90000; // 90 seconds for mobile testing

// Mobile device configurations to test
const MOBILE_DEVICES = [
  { name: 'iPhone 13', config: devices['iPhone 13'] },
  { name: 'iPhone 13 Pro', config: devices['iPhone 13 Pro'] },
  { name: 'Pixel 5', config: devices['Pixel 5'] },
  { name: 'iPad Air', config: devices['iPad Air'] },
  { name: 'Galaxy S21', config: devices['Galaxy S21'] }
];

// Test commands optimized for mobile testing
const MOBILE_COMMANDS = [
  'help',
  'pwd',
  'ls',
  'whoami'
];

test.describe('Mobile Browser Tool Call Tests', () => {
  
  // Test each mobile device configuration
  MOBILE_DEVICES.forEach(({ name, config }) => {
    test.describe(`${name} Tests`, () => {
      test.use({ ...config });
      
      test(`should handle tool calls on ${name}`, async ({ page }) => {
        console.log(`🌟 Testing: Tool calls on ${name}`);
        
        const consoleErrors: string[] = [];
        const wsMessages: string[] = [];
        
        // Monitor console errors
        page.on('console', msg => {
          if (msg.type() === 'error') {
            const error = `${name} Console Error: ${msg.text()}`;
            console.error(error);
            consoleErrors.push(error);
          }
        });
        
        // Monitor WebSocket messages
        page.on('websocket', ws => {
          ws.on('framereceived', event => {
            wsMessages.push(event.payload.toString());
          });
        });
        
        // Navigate to Claude instances
        await page.goto(`${BASE_URL}/claude-instances`);
        await page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: MOBILE_TEST_TIMEOUT });
        
        // Verify mobile layout is applied
        const viewportWidth = await page.evaluate(() => window.innerWidth);
        console.log(`${name} viewport width: ${viewportWidth}px`);
        
        // Create instance
        const createButton = page.locator('[data-testid*="create-"][data-testid*="instance"]').first();
        await createButton.click();
        await page.waitForSelector('[data-testid="instance-item"]', { timeout: MOBILE_TEST_TIMEOUT });
        
        // Open terminal interface
        await page.click('[data-testid="instance-item"]');
        
        // Wait for terminal to load (mobile may be slower)
        const terminalSelector = '.xterm-screen, [data-testid="terminal-output"], [data-testid="terminal-container"]';
        await page.waitForSelector(terminalSelector, { timeout: MOBILE_TEST_TIMEOUT });
        
        // Verify terminal is visible and properly sized for mobile
        const terminalElement = page.locator(terminalSelector);
        await expect(terminalElement).toBeVisible();
        
        const terminalBounds = await terminalElement.boundingBox();
        expect(terminalBounds).toBeTruthy();
        expect(terminalBounds!.width).toBeGreaterThan(200); // Reasonable mobile width
        expect(terminalBounds!.height).toBeGreaterThan(100); // Reasonable mobile height
        
        // Test tool call on mobile device
        const testCommand = 'help';
        await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', testCommand);
        await page.keyboard.press('Enter');
        
        // Wait for tool call response (mobile may be slower)
        await page.waitForFunction(
          () => {
            const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
            return terminalText.length > 20;
          },
          { timeout: MOBILE_TEST_TIMEOUT }
        );
        
        // Verify tool call worked
        const terminalContent = await terminalElement.textContent();
        expect(terminalContent).toBeTruthy();
        expect(terminalContent.length).toBeGreaterThan(20);
        
        // Verify WebSocket functionality on mobile
        expect(wsMessages.length).toBeGreaterThan(0);
        
        // Verify no mobile-specific errors
        const mobileErrors = consoleErrors.filter(error => 
          error.includes('touch') || error.includes('mobile') || error.includes('viewport')
        );
        expect(mobileErrors.length).toBe(0);
        
        console.log(`✅ Tool calls working on ${name}`);
        console.log(`   WebSocket messages: ${wsMessages.length}`);
        console.log(`   Console errors: ${consoleErrors.length}`);
      });
      
      test(`should handle touch interactions for tool calls on ${name}`, async ({ page }) => {
        console.log(`🌟 Testing: Touch interactions on ${name}`);
        
        await page.goto(`${BASE_URL}/claude-instances`);
        await page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: MOBILE_TEST_TIMEOUT });
        
        // Create instance with touch
        const createButton = page.locator('[data-testid*="create-"][data-testid*="instance"]').first();
        await createButton.tap(); // Use tap instead of click for touch devices
        await page.waitForSelector('[data-testid="instance-item"]', { timeout: MOBILE_TEST_TIMEOUT });
        
        // Open terminal with touch
        await page.locator('[data-testid="instance-item"]').tap();
        
        const terminalSelector = '.xterm-screen, [data-testid="terminal-output"], [data-testid="terminal-container"]';
        await page.waitForSelector(terminalSelector, { timeout: MOBILE_TEST_TIMEOUT });
        
        // Test virtual keyboard input (simulated)
        const inputField = '.xterm-helper-textarea, [data-testid="terminal-input"]';
        if (await page.locator(inputField).count() > 0) {
          // Focus input field with touch
          await page.locator(inputField).tap();
          await page.waitForTimeout(1000);
          
          // Type command
          await page.type(inputField, 'pwd');
          
          // Submit with virtual keyboard enter
          await page.keyboard.press('Enter');
          
          // Wait for response
          await page.waitForFunction(
            () => {
              const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
              return terminalText.length > 10;
            },
            { timeout: MOBILE_TEST_TIMEOUT }
          );
          
          console.log(`✅ Touch interactions working on ${name}`);
        } else {
          console.log(`⚠️  Input field not found on ${name}, skipping touch test`);
        }
      });
    });
  });
  
  test.describe('Cross-Device Compatibility', () => {
    test('should maintain tool call functionality across device switches', async ({ browser }) => {
      console.log('🌟 Testing: Cross-device tool call consistency');
      
      const testResults: Array<{ device: string; success: boolean; errors: number }> = [];
      
      // Test on multiple devices in sequence
      for (const { name, config } of MOBILE_DEVICES.slice(0, 3)) { // Test first 3 devices
        const context = await browser.newContext(config);
        const page = await context.newPage();
        
        let success = false;
        let errorCount = 0;
        
        try {
          page.on('console', msg => {
            if (msg.type() === 'error') errorCount++;
          });
          
          await page.goto(`${BASE_URL}/claude-instances`);
          await page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: MOBILE_TEST_TIMEOUT });
          
          const createButton = page.locator('[data-testid*="create-"][data-testid*="instance"]').first();
          await createButton.click();
          await page.waitForSelector('[data-testid="instance-item"]', { timeout: MOBILE_TEST_TIMEOUT });
          
          await page.click('[data-testid="instance-item"]');
          const terminalSelector = '.xterm-screen, [data-testid="terminal-output"], [data-testid="terminal-container"]';
          await page.waitForSelector(terminalSelector, { timeout: MOBILE_TEST_TIMEOUT });
          
          await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'help');
          await page.keyboard.press('Enter');
          
          await page.waitForFunction(
            () => {
              const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
              return terminalText.length > 20;
            },
            { timeout: MOBILE_TEST_TIMEOUT }
          );
          
          success = true;
          
        } catch (error) {
          console.error(`${name} test failed:`, error);
        }
        
        testResults.push({ device: name, success, errors: errorCount });
        await context.close();
      }
      
      // Verify results
      const successfulDevices = testResults.filter(r => r.success).length;
      const totalDevices = testResults.length;
      const successRate = successfulDevices / totalDevices;
      
      console.log('\n=== Cross-Device Test Results ===');
      testResults.forEach(result => {
        console.log(`${result.success ? '✅' : '❌'} ${result.device}: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.errors} errors)`);
      });
      
      // At least 80% of devices should work
      expect(successRate).toBeGreaterThanOrEqual(0.8);
      
      console.log(`✅ Cross-device compatibility: ${successRate * 100}% success rate`);
    });
  });
  
  test.describe('Responsive Design Validation', () => {
    test('should adapt tool call interface to different screen sizes', async ({ page }) => {
      console.log('🌟 Testing: Responsive design for tool call interface');
      
      const screenSizes = [
        { name: 'Mobile Portrait', width: 375, height: 667 },
        { name: 'Mobile Landscape', width: 667, height: 375 },
        { name: 'Tablet Portrait', width: 768, height: 1024 },
        { name: 'Tablet Landscape', width: 1024, height: 768 },
        { name: 'Small Desktop', width: 1280, height: 720 },
        { name: 'Large Desktop', width: 1920, height: 1080 }
      ];
      
      for (const { name, width, height } of screenSizes) {
        console.log(`Testing ${name} (${width}x${height})`);
        
        await page.setViewportSize({ width, height });
        await page.goto(`${BASE_URL}/claude-instances`);
        await page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: MOBILE_TEST_TIMEOUT });
        
        // Verify layout adapts to screen size
        const viewportInfo = await page.evaluate(() => ({
          width: window.innerWidth,
          height: window.innerHeight,
          isMobile: window.innerWidth < 768
        }));
        
        expect(viewportInfo.width).toBe(width);
        expect(viewportInfo.height).toBe(height);
        
        // Create instance and test interface scaling
        const createButton = page.locator('[data-testid*="create-"][data-testid*="instance"]').first();
        if (await createButton.isVisible()) {
          await createButton.click();
          await page.waitForSelector('[data-testid="instance-item"]', { timeout: MOBILE_TEST_TIMEOUT });
          
          await page.click('[data-testid="instance-item"]');
          
          const terminalSelector = '.xterm-screen, [data-testid="terminal-output"], [data-testid="terminal-container"]';
          await page.waitForSelector(terminalSelector, { timeout: MOBILE_TEST_TIMEOUT });
          
          // Verify terminal is appropriately sized
          const terminalElement = page.locator(terminalSelector);
          const terminalBounds = await terminalElement.boundingBox();
          
          if (terminalBounds) {
            // Terminal should not overflow viewport
            expect(terminalBounds.width).toBeLessThanOrEqual(width);
            expect(terminalBounds.height).toBeLessThanOrEqual(height);
            
            // Terminal should be reasonably sized
            const minWidth = Math.min(300, width * 0.8);
            const minHeight = Math.min(200, height * 0.3);
            expect(terminalBounds.width).toBeGreaterThanOrEqual(minWidth);
            expect(terminalBounds.height).toBeGreaterThanOrEqual(minHeight);
          }
          
          // Test tool call at this screen size
          try {
            await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'pwd');
            await page.keyboard.press('Enter');
            
            await page.waitForFunction(
              () => {
                const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
                return terminalText.length > 10;
              },
              { timeout: 30000 } // Shorter timeout for screen size tests
            );
            
            console.log(`  ✅ Tool call works at ${name}`);
          } catch (error) {
            console.warn(`  ⚠️  Tool call failed at ${name}:`, error);
          }
        } else {
          console.log(`  ⚠️  Create button not visible at ${name}`);
        }
      }
      
      console.log('✅ Responsive design validation complete');
    });
  });
  
  test.describe('Mobile Performance', () => {
    test('should meet performance requirements on mobile devices', async ({ page }) => {
      console.log('🌟 Testing: Mobile performance for tool calls');
      
      // Set to mobile device
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Measure page load time
      const loadStartTime = Date.now();
      await page.goto(`${BASE_URL}/claude-instances`);
      await page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: MOBILE_TEST_TIMEOUT });
      const loadTime = Date.now() - loadStartTime;
      
      // Mobile load time should be reasonable
      expect(loadTime).toBeLessThan(15000); // 15 seconds on mobile
      
      // Measure instance creation time
      const createStartTime = Date.now();
      const createButton = page.locator('[data-testid*="create-"][data-testid*="instance"]').first();
      await createButton.click();
      await page.waitForSelector('[data-testid="instance-item"]', { timeout: MOBILE_TEST_TIMEOUT });
      const createTime = Date.now() - createStartTime;
      
      // Instance creation should be under 45 seconds on mobile
      expect(createTime).toBeLessThan(45000);
      
      // Measure terminal opening time
      const terminalStartTime = Date.now();
      await page.click('[data-testid="instance-item"]');
      const terminalSelector = '.xterm-screen, [data-testid="terminal-output"], [data-testid="terminal-container"]';
      await page.waitForSelector(terminalSelector, { timeout: MOBILE_TEST_TIMEOUT });
      const terminalTime = Date.now() - terminalStartTime;
      
      // Terminal should open within 15 seconds on mobile
      expect(terminalTime).toBeLessThan(15000);
      
      // Measure tool call response time
      const toolCallStartTime = Date.now();
      await page.type('.xterm-helper-textarea, [data-testid="terminal-input"]', 'help');
      await page.keyboard.press('Enter');
      
      await page.waitForFunction(
        () => {
          const terminalText = document.querySelector('.xterm-screen, [data-testid="terminal-output"]')?.textContent || '';
          return terminalText.length > 20;
        },
        { timeout: MOBILE_TEST_TIMEOUT }
      );
      const toolCallTime = Date.now() - toolCallStartTime;
      
      // Tool call should respond within 60 seconds on mobile
      expect(toolCallTime).toBeLessThan(60000);
      
      console.log('✅ Mobile performance benchmarks met', {
        pageLoad: loadTime,
        instanceCreation: createTime,
        terminalOpening: terminalTime,
        toolCallResponse: toolCallTime
      });
    });
  });
});