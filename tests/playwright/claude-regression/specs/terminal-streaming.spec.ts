import { test, expect } from '@playwright/test';
import { ClaudeInstancePage } from '../page-objects/ClaudeInstancePage';
import { TerminalComponent } from '../page-objects/TerminalComponent';
import { StatusIndicator } from '../page-objects/StatusIndicator';

test.describe('Terminal Streaming and I/O Validation', () => {
  let claudePage: ClaudeInstancePage;
  let terminal: TerminalComponent;
  let status: StatusIndicator;

  test.beforeEach(async ({ page }) => {
    claudePage = new ClaudeInstancePage(page);
    terminal = new TerminalComponent(page);
    status = new StatusIndicator(page);
    
    await claudePage.goto();
    await page.waitForLoadState('networkidle');
  });

  test.describe('Server-Sent Events (SSE) Integration', () => {
    test('should establish SSE connection on instance creation', async ({ page }) => {
      // Monitor network requests
      const sseRequests: any[] = [];
      page.on('request', request => {
        if (request.url().includes('/sse') || request.url().includes('/stream')) {
          sseRequests.push({
            url: request.url(),
            method: request.method(),
            headers: request.headers()
          });
        }
      });

      await claudePage.clickClaudeWorkingButton();
      await terminal.waitForSSEConnection();
      
      // Verify SSE connection was established
      expect(sseRequests.length).toBeGreaterThan(0);
      
      const sseRequest = sseRequests.find(req => 
        req.headers['accept']?.includes('text/event-stream') ||
        req.url.includes('/sse')
      );
      expect(sseRequest).toBeTruthy();
    });

    test('should receive streaming messages through SSE', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Monitor SSE messages
      const sseMessages = await terminal.monitorSSEMessages(5000);
      
      // Send a command to trigger streaming
      await terminal.sendCommand('Tell me about this project structure');
      
      // Monitor for streaming messages during response
      const responseSseMessages = await terminal.monitorSSEMessages(10000);
      
      // Should receive streaming data
      expect(responseSseMessages.length).toBeGreaterThan(0);
      expect(responseSseMessages.some(msg => msg.includes('data:'))).toBeTruthy();
    });

    test('should handle SSE connection errors gracefully', async ({ page }) => {
      // Simulate network issues
      await page.route('**/sse**', route => route.abort());
      
      await claudePage.clickClaudeWorkingButton();
      
      // Should still attempt to create instance
      await page.waitForTimeout(5000);
      
      // Should show appropriate error handling
      const hasError = await claudePage.hasErrorMessage();
      if (hasError) {
        // If error is shown, it should be informative
        const content = await terminal.getFullContent();
        expect(content).not.toContain('--print requires input');
      }
    });

    test('should reconnect SSE on connection loss', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Simulate connection loss
      await page.evaluate(() => {
        // Close existing EventSource connections
        (window as any).eventSources?.forEach((es: EventSource) => es.close());
      });
      
      // Wait and check for reconnection attempts
      await page.waitForTimeout(3000);
      
      // Send command to test if connection is restored
      await terminal.sendCommand('Are you still there?');
      await terminal.waitForNewLine(15000);
      
      const response = await terminal.getFullContent();
      expect(response).toMatch(/yes|here|still|working/i);
    });
  });

  test.describe('Real-time Terminal Output', () => {
    test('should stream output as it becomes available', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Send command that produces streaming output
      await terminal.sendCommand('Explain the benefits of test-driven development in detail');
      
      const streamingPatterns = [
        /test.{0,20}driven/i,
        /benefit/i,
        /development/i,
        /quality/i
      ];
      
      // Verify streaming output appears progressively
      await terminal.verifyStreamingOutput(streamingPatterns, 30000);
    });

    test('should handle rapid output streaming', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Command that should produce rapid output
      await terminal.sendCommand('List all files in this project with their descriptions');
      
      let previousLength = 0;
      let streamingDetected = false;
      
      // Monitor for incremental output over time
      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(1000);
        const currentContent = await terminal.getFullContent();
        const currentLength = currentContent.length;
        
        if (currentLength > previousLength) {
          streamingDetected = true;
        }
        previousLength = currentLength;
      }
      
      expect(streamingDetected).toBeTruthy();
    });

    test('should maintain terminal scrolling during streaming', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Send command that produces long output
      await terminal.sendCommand('Generate a detailed explanation of JavaScript closures with multiple examples');
      
      // Wait for streaming to start
      await page.waitForTimeout(2000);
      
      // Check if terminal auto-scrolls to bottom
      const isAtBottom = await terminal.isScrolledToBottom();
      expect(isAtBottom).toBeTruthy();
      
      // Scroll up manually
      await terminal.scrollToTop();
      await page.waitForTimeout(1000);
      
      // New content should continue streaming
      await page.waitForTimeout(3000);
      const finalContent = await terminal.getFullContent();
      expect(finalContent.length).toBeGreaterThan(500);
    });

    test('should handle concurrent streaming sessions', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Send first streaming command
      await terminal.sendCommand('Analyze this project structure in detail');
      
      // Wait a moment then send another command
      await page.waitForTimeout(2000);
      await terminal.sendCommand('Also explain the testing strategy');
      
      // Should handle both commands without corruption
      await page.waitForTimeout(15000);
      
      const content = await terminal.getFullContent();
      expect(content).toContain('project');
      expect(content).toContain('test');
      expect(content).not.toContain('--print requires input');
    });
  });

  test.describe('Input/Output Validation', () => {
    test('should handle various input types correctly', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      const inputTests = [
        { input: 'Hello world', expectedResponse: /hello|hi|greetings/i },
        { input: '2 + 2 = ?', expectedResponse: /4|four/i },
        { input: 'What files are in this directory?', expectedResponse: /\.(js|ts|json|md)/i },
        { input: 'Can you help me?', expectedResponse: /help|assist|yes|sure/i }
      ];
      
      for (const test of inputTests) {
        await terminal.sendCommand(test.input);
        await terminal.waitForTextPattern(test.expectedResponse, 15000);
        
        // Verify response was received
        const content = await terminal.getFullContent();
        expect(content).toMatch(test.expectedResponse);
      }
    });

    test('should handle special characters in input', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      const specialCharTests = [
        'Tell me about "quoted text" handling',
        'What about symbols: @#$%^&*()',
        'Unicode test: 🚀 🎯 ✨',
        'Multi-line\\ninput\\ntest'
      ];
      
      for (const input of specialCharTests) {
        await terminal.sendCommand(input);
        await terminal.waitForNewLine(10000);
        
        // Should handle without errors
        const content = await terminal.getFullContent();
        expect(content).not.toContain('--print requires input');
        expect(content).not.toContain('Error');
      }
    });

    test('should handle long input strings', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Very long input string
      const longInput = 'Please analyze this very long text: ' + 'Lorem ipsum dolor sit amet, '.repeat(100);
      
      await terminal.sendCommand(longInput);
      await terminal.waitForNewLine(20000);
      
      const content = await terminal.getFullContent();
      expect(content).not.toContain('--print requires input');
      expect(content.length).toBeGreaterThan(longInput.length);
    });

    test('should preserve input formatting', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      const formattedInput = `Please format this code:
function test() {
    return "hello";
}`;
      
      await terminal.sendCommand(formattedInput);
      await terminal.waitForTextPattern(/function|test|hello/, 15000);
      
      const response = await terminal.getFullContent();
      expect(response).toContain('function');
      expect(response).toContain('test');
      expect(response).toContain('hello');
    });
  });

  test.describe('Terminal State Management', () => {
    test('should maintain terminal history', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      const commands = [
        'First command',
        'Second command', 
        'Third command'
      ];
      
      for (const command of commands) {
        await terminal.sendCommand(command);
        await terminal.waitForNewLine();
      }
      
      // All commands should be visible in history
      const content = await terminal.getFullContent();
      commands.forEach(cmd => {
        expect(content).toContain(cmd);
      });
    });

    test('should handle terminal clearing', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Add some content
      await terminal.sendCommand('This is some content');
      await terminal.waitForNewLine();
      
      // Clear terminal
      await terminal.clearTerminal();
      
      // Content should be cleared but Claude should still be responsive
      await terminal.sendCommand('Are you still there?');
      await terminal.waitForTextPattern(/yes|here|still/i);
    });

    test('should handle terminal resize', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Add content
      await terminal.sendCommand('This is a test of terminal resizing behavior');
      await terminal.waitForNewLine();
      
      // Resize viewport
      await page.setViewportSize({ width: 800, height: 600 });
      await page.waitForTimeout(1000);
      
      // Terminal should still be functional
      await terminal.sendCommand('Testing after resize');
      await terminal.waitForNewLine();
      
      const content = await terminal.getFullContent();
      expect(content).toContain('Testing after resize');
    });
  });

  test.describe('Streaming Performance', () => {
    test('should maintain responsive UI during heavy streaming', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Command that should produce lots of output
      await terminal.sendCommand('Generate a comprehensive analysis of modern web development practices with detailed examples');
      
      // UI should remain responsive during streaming
      let uiResponsive = true;
      
      for (let i = 0; i < 5; i++) {
        await page.waitForTimeout(2000);
        
        try {
          // Test if we can still interact with the page
          await terminal.scrollToBottom();
          const isAtBottom = await terminal.isScrolledToBottom();
          if (!isAtBottom) {
            uiResponsive = false;
            break;
          }
        } catch (error) {
          uiResponsive = false;
          break;
        }
      }
      
      expect(uiResponsive).toBeTruthy();
    });

    test('should handle streaming interruption gracefully', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Start a long-running command
      await terminal.sendCommand('Write a very detailed technical documentation for this project');
      
      // Wait for streaming to start
      await page.waitForTimeout(3000);
      
      // Send interrupt signal (Ctrl+C simulation)
      await page.keyboard.press('Control+C');
      
      // Terminal should handle interruption gracefully
      await page.waitForTimeout(2000);
      
      // Should still be responsive
      await terminal.sendCommand('Are you still working?');
      await terminal.waitForTextPattern(/yes|working|here/i, 10000);
    });
  });

  test.describe('Network Reliability', () => {
    test('should handle temporary network interruptions', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Start streaming
      await terminal.sendCommand('Explain the architecture of this project');
      await page.waitForTimeout(2000);
      
      // Simulate network interruption
      await page.setOfflineMode(true);
      await page.waitForTimeout(3000);
      
      // Restore connection
      await page.setOfflineMode(false);
      await page.waitForTimeout(2000);
      
      // Should recover and continue working
      await terminal.sendCommand('Are you back online?');
      await terminal.waitForTextPattern(/yes|back|online|working/i, 15000);
    });

    test('should show connection status during network issues', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      // Monitor status during network issues
      await page.setOfflineMode(true);
      await page.waitForTimeout(2000);
      
      const statusText = await status.getCurrentStatus();
      
      // Should indicate connection issues
      expect(['offline', 'disconnected', 'error', 'reconnecting']).toContain(statusText.toLowerCase());
      
      await page.setOfflineMode(false);
    });
  });
});