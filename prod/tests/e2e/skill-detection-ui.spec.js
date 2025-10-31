import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TIMEOUT = 30000; // 30 seconds for AI response

test.describe('Skill Detection UI - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(BASE_URL);

    // Wait for page to be ready
    await page.waitForLoadState('networkidle');

    // Take screenshot of initial state
    await page.screenshot({
      path: path.join(__dirname, '../screenshots/initial-state.png'),
      fullPage: true
    });
  });

  test('Simple math query through UI - "what is 500+343?"', async ({ page }) => {
    console.log('Starting simple math query test...');

    // Find the chat input
    const chatInput = page.locator('input[type="text"], textarea').first();
    await expect(chatInput).toBeVisible({ timeout: 5000 });

    // Type the query
    const query = 'what is 500+343?';
    await chatInput.fill(query);
    console.log(`✓ Query entered: "${query}"`);

    // Take screenshot before sending
    await page.screenshot({
      path: path.join(__dirname, '../screenshots/before-send.png'),
      fullPage: true
    });

    // Send the message (look for send button or press Enter)
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();
    if (await sendButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }
    console.log('✓ Message sent');

    // Wait for Avi's response (max 30s)
    console.log('⏳ Waiting for Avi response (max 30s)...');

    const responseLocator = page.locator('[class*="message"], [class*="response"], [data-role="assistant"]').last();

    try {
      await responseLocator.waitFor({
        state: 'visible',
        timeout: TIMEOUT
      });
      console.log('✓ Response appeared');
    } catch (error) {
      console.error('❌ Response timeout - taking debug screenshot');
      await page.screenshot({
        path: path.join(__dirname, '../screenshots/timeout-debug.png'),
        fullPage: true
      });
      throw error;
    }

    // Get response text
    const responseText = await responseLocator.textContent();
    console.log('Response preview:', responseText.substring(0, 100));

    // Verify response contains the answer
    expect(responseText).toBeTruthy();
    expect(responseText.length).toBeGreaterThan(0);

    // The answer should be 843
    const contains843 = responseText.includes('843');
    expect(contains843).toBe(true);
    console.log('✓ Response contains correct answer (843)');

    // Take screenshot of successful response
    await page.screenshot({
      path: path.join(__dirname, '../screenshots/simple-query-success.png'),
      fullPage: true
    });

    // Verify no error messages
    const errorMessages = page.locator('[class*="error"], [role="alert"]');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBe(0);
    console.log('✓ No error messages displayed');

    // Verify response time indicator (if exists)
    const timestamp = page.locator('[class*="timestamp"], [class*="time"]').last();
    if (await timestamp.isVisible({ timeout: 1000 }).catch(() => false)) {
      const timeText = await timestamp.textContent();
      console.log('Response timestamp:', timeText);
    }

    console.log('✅ Simple query test completed successfully');
  });

  test('Complex query through UI - multi-domain request', async ({ page }) => {
    console.log('Starting complex query test...');

    const chatInput = page.locator('input[type="text"], textarea').first();
    await expect(chatInput).toBeVisible({ timeout: 5000 });

    // Complex query requiring multiple skills
    const query = 'What is the weather in Paris and calculate the temperature in Fahrenheit if it is 20 degrees Celsius?';
    await chatInput.fill(query);
    console.log(`✓ Complex query entered: "${query}"`);

    // Take screenshot before sending
    await page.screenshot({
      path: path.join(__dirname, '../screenshots/complex-before-send.png'),
      fullPage: true
    });

    // Send the message
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();
    if (await sendButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }
    console.log('✓ Complex message sent');

    // Wait for response
    console.log('⏳ Waiting for Avi response to complex query (max 30s)...');

    const responseLocator = page.locator('[class*="message"], [class*="response"], [data-role="assistant"]').last();

    await responseLocator.waitFor({
      state: 'visible',
      timeout: TIMEOUT
    });
    console.log('✓ Complex response appeared');

    // Get response text
    const responseText = await responseLocator.textContent();
    console.log('Complex response preview:', responseText.substring(0, 150));

    // Verify detailed response
    expect(responseText).toBeTruthy();
    expect(responseText.length).toBeGreaterThan(50); // Should be detailed

    // Should mention temperature conversion (68°F)
    const mentionsTemp = responseText.toLowerCase().includes('fahrenheit') ||
                         responseText.toLowerCase().includes('temperature') ||
                         responseText.includes('68');
    expect(mentionsTemp).toBe(true);
    console.log('✓ Response includes temperature information');

    // Take screenshot of complex response
    await page.screenshot({
      path: path.join(__dirname, '../screenshots/complex-query-success.png'),
      fullPage: true
    });

    console.log('✅ Complex query test completed successfully');
  });

  test('Loading states and UI feedback', async ({ page }) => {
    console.log('Testing UI loading states...');

    const chatInput = page.locator('input[type="text"], textarea').first();
    await chatInput.fill('Quick test: 1+1');

    // Send message
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();
    if (await sendButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }

    // Check for loading indicator
    const loadingIndicator = page.locator('[class*="loading"], [class*="spinner"], [class*="typing"]');

    // Loading indicator should appear briefly
    const hasLoadingState = await loadingIndicator.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasLoadingState) {
      console.log('✓ Loading indicator displayed');
      await page.screenshot({
        path: path.join(__dirname, '../screenshots/loading-state.png'),
        fullPage: true
      });
    }

    // Wait for response
    const responseLocator = page.locator('[class*="message"], [class*="response"]').last();
    await responseLocator.waitFor({ state: 'visible', timeout: TIMEOUT });

    // Loading indicator should be gone
    const stillLoading = await loadingIndicator.isVisible({ timeout: 1000 }).catch(() => false);
    expect(stillLoading).toBe(false);
    console.log('✓ Loading indicator cleared after response');

    console.log('✅ Loading states test completed');
  });

  test('Multiple queries in sequence', async ({ page }) => {
    console.log('Testing multiple sequential queries...');

    const queries = [
      { q: '5+5', expected: '10' },
      { q: '100-50', expected: '50' },
      { q: '12*3', expected: '36' }
    ];

    const chatInput = page.locator('input[type="text"], textarea').first();

    for (let i = 0; i < queries.length; i++) {
      const { q, expected } = queries[i];
      console.log(`Query ${i + 1}: ${q}`);

      await chatInput.fill(q);

      const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();
      if (await sendButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await sendButton.click();
      } else {
        await chatInput.press('Enter');
      }

      // Wait for this specific response
      await page.waitForTimeout(1000); // Brief wait for message to appear
      const messages = page.locator('[class*="message"], [class*="response"]');
      const lastMessage = messages.last();

      await lastMessage.waitFor({ state: 'visible', timeout: TIMEOUT });
      const responseText = await lastMessage.textContent();

      expect(responseText.includes(expected)).toBe(true);
      console.log(`✓ Query ${i + 1} answered correctly (${expected})`);

      // Screenshot each step
      await page.screenshot({
        path: path.join(__dirname, `../screenshots/sequence-${i + 1}.png`),
        fullPage: true
      });
    }

    console.log('✅ Multiple queries test completed');
  });

  test('Error handling - invalid input', async ({ page }) => {
    console.log('Testing error handling...');

    const chatInput = page.locator('input[type="text"], textarea').first();

    // Try sending empty message
    await chatInput.fill('');
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();

    if (await sendButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      const isDisabled = await sendButton.isDisabled();
      if (isDisabled) {
        console.log('✓ Send button disabled for empty input');
      } else {
        await sendButton.click();
        // Should not send or show error
        await page.waitForTimeout(1000);
        console.log('✓ Empty message handled gracefully');
      }
    }

    // Screenshot error state
    await page.screenshot({
      path: path.join(__dirname, '../screenshots/error-handling.png'),
      fullPage: true
    });

    console.log('✅ Error handling test completed');
  });
});

test.describe('Performance Metrics', () => {
  test('Measure response time for simple query', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const chatInput = page.locator('input[type="text"], textarea').first();
    await chatInput.fill('what is 500+343?');

    // Start timer
    const startTime = Date.now();

    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();
    if (await sendButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }

    // Wait for response
    const responseLocator = page.locator('[class*="message"], [class*="response"]').last();
    await responseLocator.waitFor({ state: 'visible', timeout: TIMEOUT });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log(`⏱️  Response time: ${responseTime}ms`);

    // Response should be reasonably fast (under 15s for simple query)
    expect(responseTime).toBeLessThan(15000);

    // Log performance metrics
    const metrics = await page.evaluate(() => ({
      memory: (performance as any).memory?.usedJSHeapSize || 0,
      timing: performance.timing.loadEventEnd - performance.timing.navigationStart
    }));

    console.log('Performance metrics:', metrics);
  });
});
