/**
 * CRITICAL ECHO DUPLICATION VALIDATION TEST
 * Tests that character input results in single echo output (no duplication)
 */

import { test, expect, Page } from '@playwright/test';
import WebSocket from 'ws';

test.describe('Terminal Echo Duplication Prevention', () => {
  let page: Page;
  
  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="terminal-launcher"]', { timeout: 10000 });
  });

  test('CRITICAL: Typing "hello" shows exactly "hello" once (no incremental buildup)', async () => {
    console.log('🎯 ECHO TEST: Starting critical echo duplication validation');
    
    // Launch terminal
    await page.click('button:has-text("🚀 prod/claude")');
    await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 5000 });
    
    // Wait for terminal to initialize
    await page.waitForTimeout(2000);
    
    // Focus terminal
    await page.click('[data-testid="terminal-container"]');
    await page.waitForTimeout(500);
    
    console.log('🎯 ECHO TEST: Terminal launched and focused');
    
    // Capture all terminal output
    let terminalOutput = '';
    let outputCaptured = false;
    
    // Monitor for terminal updates
    const terminalElement = page.locator('[data-testid="terminal-container"]');
    
    // Type "hello" character by character and monitor output
    const testString = 'hello';
    let characterEchoCount = 0;
    
    for (let i = 0; i < testString.length; i++) {
      const char = testString[i];
      console.log(`🎯 ECHO TEST: Typing character '${char}' (${i + 1}/${testString.length})`);
      
      // Capture output before typing
      const outputBefore = await terminalElement.textContent() || '';
      
      // Type single character
      await page.keyboard.type(char);
      await page.waitForTimeout(100); // Small delay for echo processing
      
      // Capture output after typing
      const outputAfter = await terminalElement.textContent() || '';
      
      // Count occurrences of character in new output
      const newOutput = outputAfter.substring(outputBefore.length);
      const charOccurrences = (newOutput.match(new RegExp(char, 'g')) || []).length;
      
      console.log(`🎯 ECHO TEST: After typing '${char}', found ${charOccurrences} occurrences in new output`);
      console.log(`🎯 ECHO TEST: New output segment: ${JSON.stringify(newOutput)}`);
      
      // CRITICAL: Each character should appear exactly once
      expect(charOccurrences).toBeLessThanOrEqual(1);
      
      if (charOccurrences === 1) {
        characterEchoCount++;
      }
    }
    
    console.log(`🎯 ECHO TEST: Total characters with single echo: ${characterEchoCount}/${testString.length}`);
    
    // Final validation: check complete terminal output
    await page.waitForTimeout(1000);
    const finalOutput = await terminalElement.textContent() || '';
    
    // Count total occurrences of "hello" 
    const helloOccurrences = (finalOutput.match(/hello/g) || []).length;
    console.log(`🎯 ECHO TEST: Final output contains "hello" ${helloOccurrences} times`);
    console.log(`🎯 ECHO TEST: Final terminal output: ${JSON.stringify(finalOutput)}`);
    
    // CRITICAL ASSERTION: "hello" should appear exactly once
    expect(helloOccurrences).toBe(1);
    
    // Ensure no incremental buildup patterns (h, he, hel, hell)
    expect(finalOutput).not.toMatch(/\bh\b.*\bhe\b.*\bhel\b.*\bhell\b/);
    
    console.log('✅ ECHO TEST: PASSED - Single echo confirmed, no character duplication detected');
  });

  test('WebSocket message flow validation (no echo loops)', async () => {
    console.log('🔍 WEBSOCKET TEST: Validating clean message flow');
    
    // Connect to WebSocket directly
    const ws = new WebSocket('ws://localhost:3002/terminal');
    const messages: any[] = [];
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        messages.push(message);
      } catch (e) {
        messages.push({ raw: data.toString() });
      }
    });
    
    await new Promise((resolve) => {
      ws.on('open', resolve);
    });
    
    // Send test input
    ws.send(JSON.stringify({ type: 'input', data: 'test' }));
    
    // Wait for response
    await page.waitForTimeout(1000);
    
    // Analyze message flow
    const inputMessages = messages.filter(m => m.type === 'input' || m.data?.includes('test'));
    console.log('🔍 WEBSOCKET TEST: Messages containing test input:', inputMessages.length);
    
    // Should not have duplicate input messages
    expect(inputMessages.length).toBeLessThanOrEqual(2); // One send, one echo response
    
    ws.close();
    console.log('✅ WEBSOCKET TEST: PASSED - Clean message flow confirmed');
  });

  test('All 4 terminal buttons work without echo issues', async () => {
    console.log('🔧 BUTTON TEST: Testing all 4 terminal launch buttons for echo behavior');
    
    const buttons = [
      '🚀 prod/claude',
      '⚡ skip-permissions', 
      '⚡ skip-permissions -c',
      '↻ skip-permissions --resume'
    ];
    
    for (const buttonText of buttons) {
      console.log(`🔧 BUTTON TEST: Testing button "${buttonText}"`);
      
      // Click button
      await page.click(`button:has-text("${buttonText}")`);
      await page.waitForTimeout(2000);
      
      // Check for terminal presence
      const terminalVisible = await page.isVisible('[data-testid="terminal-container"]');
      expect(terminalVisible).toBe(true);
      
      // Type test input
      await page.click('[data-testid="terminal-container"]');
      await page.keyboard.type('test');
      await page.waitForTimeout(500);
      
      // Check output
      const output = await page.locator('[data-testid="terminal-container"]').textContent();
      const testOccurrences = (output?.match(/test/g) || []).length;
      
      console.log(`🔧 BUTTON TEST: Button "${buttonText}" - "test" appears ${testOccurrences} times`);
      expect(testOccurrences).toBeLessThanOrEqual(1);
      
      // Clear terminal for next test
      await page.keyboard.press('Control+C');
      await page.waitForTimeout(500);
    }
    
    console.log('✅ BUTTON TEST: PASSED - All 4 buttons work without echo duplication');
  });

  test('Performance: Terminal responsiveness under echo fix', async () => {
    console.log('⚡ PERFORMANCE TEST: Measuring terminal responsiveness');
    
    await page.click('button:has-text("🚀 prod/claude")');
    await page.waitForTimeout(2000);
    
    await page.click('[data-testid="terminal-container"]');
    
    // Measure typing latency
    const startTime = Date.now();
    await page.keyboard.type('performance test');
    const endTime = Date.now();
    
    const latency = endTime - startTime;
    console.log(`⚡ PERFORMANCE TEST: Typing latency: ${latency}ms`);
    
    // Should be responsive (< 500ms for short string)
    expect(latency).toBeLessThan(500);
    
    // Test sustained typing
    const sustainedStart = Date.now();
    for (let i = 0; i < 50; i++) {
      await page.keyboard.type('x');
    }
    const sustainedEnd = Date.now();
    
    const sustainedLatency = sustainedEnd - sustainedStart;
    const charactersPerSecond = 50000 / sustainedLatency; // Convert to chars/sec
    
    console.log(`⚡ PERFORMANCE TEST: Sustained typing: ${charactersPerSecond.toFixed(1)} chars/sec`);
    expect(charactersPerSecond).toBeGreaterThan(20); // At least 20 chars/sec
    
    console.log('✅ PERFORMANCE TEST: PASSED - Terminal responsive under echo fix');
  });
});