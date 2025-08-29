import { test, expect, Page } from '@playwright/test';
import { ClaudeManagerPage } from '../page-objects/ClaudeManagerPage';
import { TerminalPage } from '../page-objects/TerminalPage';

test.describe('Terminal Streaming Tests', () => {
  let claudeManagerPage: ClaudeManagerPage;
  let terminalPage: TerminalPage;

  test.beforeEach(async ({ page }) => {
    claudeManagerPage = new ClaudeManagerPage(page);
    terminalPage = new TerminalPage(page);
    await claudeManagerPage.goto();
  });

  test.afterEach(async ({ page }) => {
    await claudeManagerPage.cleanupInstances();
  });

  test('should establish SSE connection successfully', async ({ page }) => {
    // Monitor network requests for SSE connection
    const sseRequests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/events') || request.headers()['accept']?.includes('text/event-stream')) {
        sseRequests.push(request);
      }
    });
    
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    
    // Verify SSE connection established
    await expect(async () => {
      expect(sseRequests.length).toBeGreaterThan(0);
    }).toPass({ timeout: 10000 });
    
    // Verify connection is successful
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    
    // Verify terminal receives streamed data
    await terminalPage.waitForClaudeWelcome();
    expect(await terminalPage.getTerminalContent()).toContain('✻ Welcome to Claude Code!');
  });

  test('should stream terminal output in real-time', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    await terminalPage.waitForClaudeWelcome();
    
    // Track terminal content changes in real-time
    const contentChanges: string[] = [];
    const trackChanges = async () => {
      const content = await terminalPage.getTerminalContent();
      contentChanges.push(content);
    };
    
    // Start tracking
    await trackChanges();
    
    // Send a command that produces streaming output
    await terminalPage.sendInput('echo "Line 1" && sleep 0.1 && echo "Line 2" && sleep 0.1 && echo "Line 3"');
    
    // Track changes over time
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(200);
      await trackChanges();
    }
    
    // Verify content was streaming (multiple progressive updates)
    expect(contentChanges.length).toBeGreaterThan(3);
    
    // Verify we captured intermediate states
    const hasProgressiveOutput = contentChanges.some((content, index) => {
      if (index === 0) return false;
      const prevContent = contentChanges[index - 1];
      return content.length > prevContent.length && content.includes(prevContent);
    });
    
    expect(hasProgressiveOutput).toBe(true);
  });

  test('should handle bidirectional I/O correctly', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    await terminalPage.waitForClaudeWelcome();
    await terminalPage.waitForInteractivePrompt();
    
    // Test multiple rounds of I/O
    const testCases = [
      { input: 'What is 2 + 2?', expectedPattern: /[4four]/ },
      { input: 'List 3 colors', expectedPattern: /(red|blue|green|yellow|purple|orange|black|white)/i },
      { input: 'Say hello back', expectedPattern: /(hello|hi|greet)/i }
    ];
    
    for (const testCase of testCases) {
      // Send input
      await terminalPage.sendInput(testCase.input);
      await terminalPage.waitForResponse();
      
      // Verify Claude responds appropriately
      const response = await terminalPage.getLatestResponse();
      expect(response).toMatch(testCase.expectedPattern);
      
      // Verify response appears in terminal
      const terminalContent = await terminalPage.getTerminalContent();
      expect(terminalContent).toContain(testCase.input);
      expect(terminalContent.toLowerCase()).toMatch(testCase.expectedPattern);
    }
  });

  test('should maintain terminal session state', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    await terminalPage.waitForClaudeWelcome();
    await terminalPage.waitForInteractivePrompt();
    
    // Create a state that should persist
    await terminalPage.sendInput('export TEST_VAR="persistent_value"');
    await terminalPage.waitForResponse();
    
    // Test that state persists across commands
    await terminalPage.sendInput('echo $TEST_VAR');
    await terminalPage.waitForResponse();
    
    const response = await terminalPage.getLatestResponse();
    expect(response).toContain('persistent_value');
    
    // Test directory state persistence
    await terminalPage.sendInput('mkdir -p test_dir && cd test_dir');
    await terminalPage.waitForResponse();
    
    await terminalPage.sendInput('pwd');
    await terminalPage.waitForResponse();
    
    const pwdResponse = await terminalPage.getLatestResponse();
    expect(pwdResponse).toContain('test_dir');
  });

  test('should handle connection interruptions gracefully', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    await terminalPage.waitForClaudeWelcome();
    
    // Simulate network interruption by intercepting SSE requests
    await page.route('**/events*', route => {
      route.abort();
    });
    
    // Send input after interruption
    await terminalPage.sendInput('test after interruption');
    
    // Verify system handles interruption
    await page.waitForTimeout(2000);
    
    // Remove route interception (simulate connection restoration)
    await page.unroute('**/events*');
    
    // Verify system recovers
    await page.waitForTimeout(1000);
    await terminalPage.sendInput('recovery test');
    
    // Should either show error handling or recover gracefully
    const terminalContent = await terminalPage.getTerminalContent();
    const hasErrorHandling = terminalContent.includes('connection') || terminalContent.includes('error');
    const hasRecovery = terminalContent.includes('recovery test');
    
    expect(hasErrorHandling || hasRecovery).toBe(true);
  });

  test('should handle rapid input/output sequences', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    await terminalPage.waitForClaudeWelcome();
    await terminalPage.waitForInteractivePrompt();
    
    // Send rapid sequence of commands
    const commands = [
      'echo "Command 1"',
      'echo "Command 2"',
      'echo "Command 3"',
      'pwd',
      'whoami'
    ];
    
    // Send all commands rapidly
    for (const command of commands) {
      await terminalPage.sendInput(command);
      await page.waitForTimeout(100); // Small delay to simulate rapid typing
    }
    
    // Wait for all responses
    await page.waitForTimeout(5000);
    
    // Verify all commands were processed
    const terminalContent = await terminalPage.getTerminalContent();
    for (const command of commands) {
      expect(terminalContent).toContain(command);
    }
    
    // Verify responses are present
    expect(terminalContent).toContain('Command 1');
    expect(terminalContent).toContain('Command 2');
    expect(terminalContent).toContain('Command 3');
  });

  test('should handle large output streams without loss', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    await terminalPage.waitForClaudeWelcome();
    await terminalPage.waitForInteractivePrompt();
    
    // Generate large output
    const largeCommand = 'for i in {1..100}; do echo "Line $i: This is a test line with some content"; done';
    await terminalPage.sendInput(largeCommand);
    await terminalPage.waitForResponse(15000); // Longer timeout for large output
    
    const terminalContent = await terminalPage.getTerminalContent();
    
    // Verify we received substantial output
    expect(terminalContent.length).toBeGreaterThan(1000);
    
    // Verify specific lines are present (checking for data completeness)
    expect(terminalContent).toContain('Line 1:');
    expect(terminalContent).toContain('Line 50:');
    expect(terminalContent).toContain('Line 100:');
    
    // Verify pattern consistency
    const lineMatches = terminalContent.match(/Line \d+:/g);
    expect(lineMatches?.length).toBeGreaterThan(50); // Should capture most lines
  });

  test('should display streaming progress indicators', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    await terminalPage.waitForClaudeWelcome();
    await terminalPage.waitForInteractivePrompt();
    
    // Send command that shows progress
    await terminalPage.sendInput('for i in {1..10}; do echo "Processing $i/10"; sleep 0.2; done');
    
    // Track progress indicators
    const progressStates: string[] = [];
    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(300);
      const content = await terminalPage.getTerminalContent();
      if (content.includes('Processing')) {
        progressStates.push(content);
      }
    }
    
    // Verify we captured multiple progress states
    expect(progressStates.length).toBeGreaterThan(3);
    
    // Verify progression
    expect(progressStates[0]).toContain('Processing 1');
    expect(progressStates[progressStates.length - 1]).toContain('Processing');
  });

  test('should handle Unicode and special characters in streaming', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    await terminalPage.waitForClaudeWelcome();
    await terminalPage.waitForInteractivePrompt();
    
    // Test Unicode characters
    const unicodeTests = [
      'echo "Hello 🌍 World"',
      'echo "Testing: αβγ δεζ"',
      'echo "Symbols: ★ ♠ ♥ ♦ ♣"',
      'echo "Math: ∑ ∏ ∫ √ ∞"'
    ];
    
    for (const test of unicodeTests) {
      await terminalPage.sendInput(test);
      await terminalPage.waitForResponse();
      
      const terminalContent = await terminalPage.getTerminalContent();
      
      // Verify Unicode characters are preserved
      if (test.includes('🌍')) expect(terminalContent).toContain('🌍');
      if (test.includes('αβγ')) expect(terminalContent).toContain('αβγ');
      if (test.includes('★')) expect(terminalContent).toContain('★');
      if (test.includes('∑')) expect(terminalContent).toContain('∑');
    }
  });
});