import { test, expect } from '@playwright/test';
import { ClaudeInstancePage } from '../page-objects/ClaudeInstancePage';
import { TerminalComponent } from '../page-objects/TerminalComponent';
import { StatusIndicator } from '../page-objects/StatusIndicator';

test.describe('Performance and Reliability Tests', () => {
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

  test.describe('Instance Creation Performance', () => {
    test('should create instance within acceptable time limits', async ({ page }) => {
      const startTime = Date.now();
      
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();
      
      const creationTime = Date.now() - startTime;
      
      // Should create instance within 30 seconds
      expect(creationTime).toBeLessThan(30000);
      
      // Log performance metrics
      console.log(`Instance creation time: ${creationTime}ms`);
    });

    test('should handle rapid successive button clicks efficiently', async ({ page }) => {
      const startTime = Date.now();
      
      // Click button multiple times rapidly
      await Promise.all([
        claudePage.clickClaudeWorkingButton(),
        claudePage.clickClaudeWorkingButton(),
        claudePage.clickClaudeWorkingButton(),
        claudePage.clickClaudeWorkingButton(),
        claudePage.clickClaudeWorkingButton()
      ]);
      
      await claudePage.waitForClaudeInstance();
      
      const totalTime = Date.now() - startTime;
      
      // Should handle efficiently without significant delay
      expect(totalTime).toBeLessThan(35000);
      
      // Should create only one instance
      const content = await terminal.getFullContent();
      const welcomeCount = (content.match(/✻ Welcome to Claude Code!/g) || []).length;
      expect(welcomeCount).toBe(1);
    });

    test('should handle all button types with consistent performance', async ({ page }) => {
      const buttonTests = [
        { name: 'working', action: () => claudePage.clickClaudeWorkingButton() },
        { name: 'prod', action: () => claudePage.clickClaudeProdButton() },
        { name: 'source', action: () => claudePage.clickClaudeSourceButton() },
        { name: 'tests', action: () => claudePage.clickClaudeTestsButton() }
      ];

      const results: { name: string; time: number }[] = [];

      for (const buttonTest of buttonTests) {
        await claudePage.goto();
        await page.waitForLoadState('networkidle');
        
        const startTime = Date.now();
        await buttonTest.action();
        await claudePage.waitForClaudeInstance();
        const endTime = Date.now();
        
        const duration = endTime - startTime;
        results.push({ name: buttonTest.name, time: duration });
        
        console.log(`${buttonTest.name} button creation time: ${duration}ms`);
        
        // Each should complete within reasonable time
        expect(duration).toBeLessThan(35000);
      }

      // Performance should be consistent across button types (within 50% variance)
      const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
      const maxVariance = avgTime * 0.5;
      
      results.forEach(result => {
        expect(Math.abs(result.time - avgTime)).toBeLessThan(maxVariance);
      });
    });
  });

  test.describe('Response Performance', () => {
    test('should respond to simple queries quickly', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();

      const simpleQueries = [
        'Hello',
        'What is 2+2?',
        'Hi Claude',
        'Thank you'
      ];

      for (const query of simpleQueries) {
        const startTime = Date.now();
        
        await terminal.sendCommand(query);
        await terminal.waitForNewLine();
        
        const responseTime = Date.now() - startTime;
        
        // Simple queries should respond within 5 seconds
        expect(responseTime).toBeLessThan(5000);
        console.log(`Query "${query}" response time: ${responseTime}ms`);
      }
    });

    test('should handle complex queries within reasonable time', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();

      const complexQueries = [
        'Analyze the structure of this project',
        'Explain the benefits of test-driven development',
        'Generate a simple JavaScript function',
        'List and describe the files in this directory'
      ];

      for (const query of complexQueries) {
        const startTime = Date.now();
        
        await terminal.sendCommand(query);
        await terminal.waitForNewLine();
        
        const responseTime = Date.now() - startTime;
        
        // Complex queries should respond within 20 seconds
        expect(responseTime).toBeLessThan(20000);
        console.log(`Complex query response time: ${responseTime}ms`);
      }
    });

    test('should maintain response times during continuous use', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();

      const responseTimes: number[] = [];
      
      // Send 10 queries in sequence
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        
        await terminal.sendCommand(`Query number ${i + 1}: What can you help me with?`);
        await terminal.waitForNewLine();
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        
        console.log(`Query ${i + 1} response time: ${responseTime}ms`);
      }

      // Response times should not degrade significantly over time
      const firstHalf = responseTimes.slice(0, 5);
      const secondHalf = responseTimes.slice(5);
      
      const firstHalfAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;
      
      // Second half should not be more than 50% slower than first half
      expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.5);
    });
  });

  test.describe('Load Testing', () => {
    test('should handle concurrent requests gracefully', async ({ page, context }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();

      // Send multiple commands rapidly
      const commands = [
        'Hello Claude',
        'What is the time?',
        'Help me with coding',
        'Analyze this project',
        'Generate a test function'
      ];

      const startTime = Date.now();
      
      // Send all commands concurrently
      const promises = commands.map(async (command, index) => {
        await page.waitForTimeout(index * 500); // Stagger slightly
        await terminal.sendCommand(command);
      });

      await Promise.all(promises);
      
      // Wait for all responses
      await page.waitForTimeout(30000);
      
      const totalTime = Date.now() - startTime;
      console.log(`Concurrent request handling time: ${totalTime}ms`);
      
      // Should handle within reasonable time
      expect(totalTime).toBeLessThan(45000);
      
      // All commands should appear in terminal
      const content = await terminal.getFullContent();
      commands.forEach(command => {
        expect(content).toContain(command);
      });
    });

    test('should handle session with many interactions', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();

      const startTime = Date.now();
      let interactionCount = 0;
      
      // Simulate extended session
      for (let i = 0; i < 20; i++) {
        await terminal.sendCommand(`Interaction ${i + 1}: Tell me something interesting`);
        
        // Wait for response before next command
        await terminal.waitForNewLine(15000);
        
        interactionCount++;
        
        // Check if session is still responsive
        if (i % 5 === 0) {
          const currentTime = Date.now();
          console.log(`After ${interactionCount} interactions: ${currentTime - startTime}ms elapsed`);
        }
      }

      const totalTime = Date.now() - startTime;
      console.log(`Total session time for ${interactionCount} interactions: ${totalTime}ms`);
      
      // Session should complete within reasonable time (10 minutes)
      expect(totalTime).toBeLessThan(600000);
      
      // Should still be responsive at the end
      await terminal.sendCommand('Final test - are you still there?');
      await terminal.waitForTextPattern(/yes|here|still|working/i);
    });

    test('should maintain stability under memory pressure', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();

      // Generate memory-intensive operations
      const largeRequests = [
        'Generate a comprehensive guide to JavaScript with detailed examples',
        'Create a long list of programming best practices with explanations',
        'Write a detailed technical specification document',
        'Generate extensive code examples for multiple programming languages'
      ];

      for (const request of largeRequests) {
        const startTime = Date.now();
        
        await terminal.sendCommand(request);
        await terminal.waitForNewLine(30000);
        
        const responseTime = Date.now() - startTime;
        console.log(`Large request response time: ${responseTime}ms`);
        
        // Should handle even large requests within reasonable time
        expect(responseTime).toBeLessThan(35000);
        
        // Check memory usage doesn't cause crashes
        const isPageResponsive = await page.evaluate(() => document.readyState === 'complete');
        expect(isPageResponsive).toBeTruthy();
      }

      // Should still be responsive after memory-intensive operations
      await terminal.sendCommand('Simple test after large operations');
      await terminal.waitForNewLine(10000);
    });
  });

  test.describe('Reliability and Stability', () => {
    test('should recover from temporary network issues', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();

      // Establish baseline
      await terminal.sendCommand('Initial test before network issues');
      await terminal.waitForNewLine();

      // Simulate network interruptions
      await page.setOfflineMode(true);
      await page.waitForTimeout(2000);
      await page.setOfflineMode(false);
      await page.waitForTimeout(3000);

      // Should recover and continue working
      await terminal.sendCommand('Test after network recovery');
      
      await expect(async () => {
        const content = await terminal.getFullContent();
        expect(content).toContain('Test after network recovery');
      }).toPass({ timeout: 30000 });
    });

    test('should maintain session integrity during browser stress', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();

      // Establish session context
      await terminal.sendCommand('Remember my session ID is STRESS_TEST_123');
      await terminal.waitForNewLine();

      // Simulate browser stress
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.setViewportSize({ width: 800, height: 600 });
      await page.setViewportSize({ width: 1440, height: 900 });
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });

      await page.waitForTimeout(2000);

      // Check session integrity
      await terminal.sendCommand('What is my session ID?');
      await terminal.waitForText('STRESS_TEST_123');
    });

    test('should handle extended idle periods gracefully', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();

      // Initial interaction
      await terminal.sendCommand('Starting idle test');
      await terminal.waitForNewLine();

      // Simulate extended idle period
      console.log('Starting 30-second idle period...');
      await page.waitForTimeout(30000);

      // Should still be responsive after idle period
      await terminal.sendCommand('Are you still active after idle period?');
      
      await expect(async () => {
        const content = await terminal.getFullContent();
        expect(content).toMatch(/yes|active|here|still/i);
      }).toPass({ timeout: 20000 });
    });

    test('should maintain performance consistency over time', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();

      const performanceMetrics: number[] = [];
      
      // Test performance at intervals
      for (let interval = 0; interval < 5; interval++) {
        const startTime = Date.now();
        
        await terminal.sendCommand(`Performance test ${interval + 1}: What can you do?`);
        await terminal.waitForNewLine();
        
        const responseTime = Date.now() - startTime;
        performanceMetrics.push(responseTime);
        
        console.log(`Interval ${interval + 1} response time: ${responseTime}ms`);
        
        // Wait between tests
        if (interval < 4) {
          await page.waitForTimeout(10000);
        }
      }

      // Performance should remain consistent (no degradation > 100%)
      const firstResponse = performanceMetrics[0];
      const lastResponse = performanceMetrics[performanceMetrics.length - 1];
      
      expect(lastResponse).toBeLessThan(firstResponse * 2);
      
      // Average should be reasonable
      const avgResponseTime = performanceMetrics.reduce((sum, time) => sum + time, 0) / performanceMetrics.length;
      expect(avgResponseTime).toBeLessThan(15000);
    });
  });

  test.describe('Resource Management', () => {
    test('should handle multiple button type switches efficiently', async ({ page }) => {
      const switchSequence = [
        { name: 'working', action: () => claudePage.clickClaudeWorkingButton() },
        { name: 'prod', action: () => claudePage.clickClaudeProdButton() },
        { name: 'source', action: () => claudePage.clickClaudeSourceButton() },
        { name: 'tests', action: () => claudePage.clickClaudeTestsButton() }
      ];

      const startTime = Date.now();
      
      for (const switchTest of switchSequence) {
        await claudePage.goto();
        await page.waitForLoadState('networkidle');
        
        await switchTest.action();
        await claudePage.waitForClaudeInstance();
        
        // Quick validation
        await terminal.sendCommand('Quick test');
        await terminal.waitForNewLine(10000);
      }

      const totalTime = Date.now() - startTime;
      console.log(`Multiple button switches total time: ${totalTime}ms`);
      
      // Should handle all switches within reasonable time
      expect(totalTime).toBeLessThan(180000); // 3 minutes for 4 switches
    });

    test('should clean up resources properly on page unload', async ({ page, context }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();

      // Monitor resource usage before cleanup
      const beforeCleanup = await page.evaluate(() => ({
        connections: (performance as any).getEntriesByType?.('navigation')?.length || 0,
        memory: (performance as any).memory?.usedJSHeapSize || 0
      }));

      // Trigger cleanup by navigating away
      await page.goto('about:blank');
      await page.waitForTimeout(2000);

      // Navigate back and check
      await claudePage.goto();
      await page.waitForLoadState('networkidle');

      const afterCleanup = await page.evaluate(() => ({
        connections: (performance as any).getEntriesByType?.('navigation')?.length || 0,
        memory: (performance as any).memory?.usedJSHeapSize || 0
      }));

      // Should not accumulate resources
      console.log(`Before cleanup - Memory: ${beforeCleanup.memory}, Connections: ${beforeCleanup.connections}`);
      console.log(`After cleanup - Memory: ${afterCleanup.memory}, Connections: ${afterCleanup.connections}`);
      
      // Memory should not grow significantly
      if (beforeCleanup.memory > 0 && afterCleanup.memory > 0) {
        expect(afterCleanup.memory).toBeLessThan(beforeCleanup.memory * 1.5);
      }
    });

    test('should handle page refresh during active sessions', async ({ page }) => {
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();

      // Establish session
      await terminal.sendCommand('Session before refresh test');
      await terminal.waitForNewLine();

      const beforeRefreshTime = Date.now();

      // Refresh during active session
      await page.reload();
      await page.waitForLoadState('networkidle');

      const afterRefreshTime = Date.now();
      const refreshTime = afterRefreshTime - beforeRefreshTime;
      
      console.log(`Page refresh time: ${refreshTime}ms`);
      
      // Refresh should be reasonably quick
      expect(refreshTime).toBeLessThan(15000);

      // Should be able to create new instance after refresh
      await claudePage.clickClaudeWorkingButton();
      await claudePage.waitForClaudeInstance();

      await terminal.sendCommand('Session after refresh test');
      await terminal.waitForNewLine(15000);
      
      const content = await terminal.getFullContent();
      expect(content).toContain('Session after refresh test');
    });
  });
});