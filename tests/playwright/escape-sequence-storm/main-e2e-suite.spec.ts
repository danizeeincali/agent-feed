import { test, expect, Page, BrowserContext } from '@playwright/test';
import { ClaudeTerminalPage } from './page-objects/claude-terminal-page';
import { EscapeSequenceMonitor } from './utils/escape-sequence-monitor';
import { PerformanceTracker } from './utils/performance-tracker';
import { SSEConnectionTracker } from './utils/sse-connection-tracker';

test.describe('Escape Sequence Storm Prevention - Main E2E Suite', () => {
  let claudePage: ClaudeTerminalPage;
  let escapeMonitor: EscapeSequenceMonitor;
  let performanceTracker: PerformanceTracker;
  let sseTracker: SSEConnectionTracker;
  
  test.beforeEach(async ({ page, context }) => {
    claudePage = new ClaudeTerminalPage(page);
    escapeMonitor = new EscapeSequenceMonitor(page);
    performanceTracker = new PerformanceTracker(page);
    sseTracker = new SSEConnectionTracker(page);
    
    // Navigate to the application
    await claudePage.navigate();
    await claudePage.waitForPageLoad();
    
    // Start monitoring
    await escapeMonitor.startMonitoring();
    await performanceTracker.startTracking();
    await sseTracker.startTracking();
  });

  test.afterEach(async ({ page }) => {
    // Clean up monitoring
    await escapeMonitor.stopMonitoring();
    await performanceTracker.stopTracking();
    await sseTracker.stopTracking();
    
    // Generate reports
    const escapeReport = await escapeMonitor.getReport();
    const perfReport = await performanceTracker.getReport();
    const sseReport = await sseTracker.getReport();
    
    // Assert no escape sequence storms occurred
    expect(escapeReport.stormDetected).toBe(false);
    expect(escapeReport.escapeSequenceCount).toBeLessThan(100);
    
    // Assert performance remained within bounds
    expect(perfReport.maxCPUUsage).toBeLessThan(80);
    expect(perfReport.maxMemoryUsage).toBeLessThan(500 * 1024 * 1024); // 500MB
    
    // Assert SSE connections were properly managed
    expect(sseReport.activeConnections).toBeLessThanOrEqual(1);
    expect(sseReport.connectionLeaks).toBe(0);
  });

  test('should prevent escape sequence storm on single button click', async () => {
    // Click the spawn Claude button once
    await claudePage.clickSpawnButton();
    
    // Wait for process to start
    await claudePage.waitForProcessSpawn();
    
    // Verify terminal appears without storm
    await expect(claudePage.terminal).toBeVisible();
    await claudePage.waitForTerminalStabilization();
    
    // Check that output is clean
    const terminalContent = await claudePage.getTerminalContent();
    expect(terminalContent).not.toMatch(/\x1b\[\d+[A-Z]/g); // No escape sequences
    
    // Verify only one process was spawned
    const processCount = await claudePage.getActiveProcessCount();
    expect(processCount).toBe(1);
  });

  test('should handle rapid button clicks with debouncing', async () => {
    const clickCount = 10;
    
    // Rapidly click the spawn button
    for (let i = 0; i < clickCount; i++) {
      await claudePage.clickSpawnButton({ force: true });
      await page.waitForTimeout(50); // 50ms between clicks
    }
    
    // Wait for any pending operations
    await claudePage.waitForProcessStabilization();
    
    // Verify only one process was spawned despite multiple clicks
    const processCount = await claudePage.getActiveProcessCount();
    expect(processCount).toBe(1);
    
    // Verify no duplicate terminals
    const terminalCount = await claudePage.getTerminalCount();
    expect(terminalCount).toBe(1);
    
    // Check button state management
    const buttonState = await claudePage.getSpawnButtonState();
    expect(buttonState.disabled).toBe(true);
  });

  test('should maintain clean terminal output during command execution', async () => {
    await claudePage.clickSpawnButton();
    await claudePage.waitForProcessSpawn();
    
    // Execute a command that produces output
    await claudePage.sendTerminalCommand('echo "Hello World"');
    await claudePage.waitForCommandCompletion();
    
    // Verify output is clean and readable
    const terminalContent = await claudePage.getTerminalContent();
    expect(terminalContent).toContain('Hello World');
    expect(terminalContent).not.toMatch(/\x1b\[\d*[A-Z]/g); // No escape sequences
    
    // Execute multiple commands
    const commands = ['pwd', 'ls -la', 'whoami', 'date'];
    for (const cmd of commands) {
      await claudePage.sendTerminalCommand(cmd);
      await claudePage.waitForCommandCompletion();
    }
    
    // Verify terminal remains clean
    const finalContent = await claudePage.getTerminalContent();
    expect(finalContent).not.toMatch(/\x1b\[\d*[A-Z]/g);
  });

  test('should properly handle process termination and cleanup', async () => {
    await claudePage.clickSpawnButton();
    await claudePage.waitForProcessSpawn();
    
    // Verify process is running
    let processCount = await claudePage.getActiveProcessCount();
    expect(processCount).toBe(1);
    
    // Terminate the process
    await claudePage.terminateProcess();
    await claudePage.waitForProcessTermination();
    
    // Verify cleanup
    processCount = await claudePage.getActiveProcessCount();
    expect(processCount).toBe(0);
    
    // Verify SSE connection is closed
    const activeConnections = await sseTracker.getActiveConnectionCount();
    expect(activeConnections).toBe(0);
    
    // Verify button is re-enabled
    const buttonState = await claudePage.getSpawnButtonState();
    expect(buttonState.disabled).toBe(false);
  });

  test('should handle SSE connection errors gracefully', async () => {
    // Start process normally
    await claudePage.clickSpawnButton();
    await claudePage.waitForProcessSpawn();
    
    // Simulate SSE connection error
    await page.evaluate(() => {
      // Force close SSE connection
      window.postMessage({ type: 'FORCE_SSE_ERROR' }, '*');
    });
    
    // Wait for error handling
    await page.waitForTimeout(2000);
    
    // Verify error recovery
    const errorRecovered = await claudePage.checkErrorRecovery();
    expect(errorRecovered).toBe(true);
    
    // Verify no escape sequences during error handling
    const escapeReport = await escapeMonitor.getReport();
    expect(escapeReport.stormDetected).toBe(false);
  });

  test('should maintain UI responsiveness during high terminal activity', async () => {
    await claudePage.clickSpawnButton();
    await claudePage.waitForProcessSpawn();
    
    // Generate high-frequency output
    await claudePage.sendTerminalCommand('for i in {1..100}; do echo "Line $i"; done');
    
    // Test UI responsiveness during output
    const startTime = Date.now();
    await claudePage.clickTerminalArea();
    const clickResponseTime = Date.now() - startTime;
    
    expect(clickResponseTime).toBeLessThan(1000); // Should respond within 1 second
    
    // Verify terminal scrolling works
    const canScroll = await claudePage.testTerminalScrolling();
    expect(canScroll).toBe(true);
    
    // Verify no UI freezing
    const uiFrozen = await claudePage.checkUIFreezing();
    expect(uiFrozen).toBe(false);
  });

  test('should handle window resize without terminal corruption', async () => {
    await claudePage.clickSpawnButton();
    await claudePage.waitForProcessSpawn();
    
    // Get initial terminal state
    const initialContent = await claudePage.getTerminalContent();
    
    // Resize window
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(1000);
    
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(1000);
    
    // Verify terminal content is preserved
    const finalContent = await claudePage.getTerminalContent();
    expect(finalContent).toContain(initialContent);
    
    // Verify no escape sequences from resize
    const escapeReport = await escapeMonitor.getReport();
    expect(escapeReport.resizeStormDetected).toBe(false);
  });

  test('should validate keyboard input handling', async () => {
    await claudePage.clickSpawnButton();
    await claudePage.waitForProcessSpawn();
    
    // Test various keyboard inputs
    const testInputs = [
      'hello world',
      'special chars: !@#$%^&*()',
      'unicode: 你好世界 🌟',
      'tab\tcompletion',
      'multiline\ncommand'
    ];
    
    for (const input of testInputs) {
      await claudePage.sendTerminalInput(input);
      await claudePage.pressEnter();
      await claudePage.waitForCommandCompletion();
    }
    
    // Verify all inputs were processed correctly
    const terminalContent = await claudePage.getTerminalContent();
    for (const input of testInputs) {
      const cleanInput = input.replace(/[\t\n]/g, ' ');
      expect(terminalContent).toContain(cleanInput);
    }
    
    // Verify no escape sequence pollution
    const escapeReport = await escapeMonitor.getReport();
    expect(escapeReport.inputStormDetected).toBe(false);
  });
});