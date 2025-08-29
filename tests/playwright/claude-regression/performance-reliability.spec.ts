import { test, expect, Page } from '@playwright/test';
import { ClaudeManagerPage } from '../page-objects/ClaudeManagerPage';
import { TerminalPage } from '../page-objects/TerminalPage';

test.describe('Performance & Reliability Tests', () => {
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

  test('should meet response time requirements under normal load', async ({ page }) => {
    // Start Claude instance and measure startup time
    const startTime = Date.now();
    
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    await terminalPage.waitForClaudeWelcome();
    
    const startupTime = Date.now() - startTime;
    
    // Startup should complete within reasonable time (30 seconds)
    expect(startupTime).toBeLessThan(30000);
    
    // Test response times for interactions
    await terminalPage.waitForInteractivePrompt();
    
    const responseTests = [
      'echo "hello"',
      'pwd',
      'whoami',
      'date'
    ];
    
    for (const command of responseTests) {
      const responseStartTime = Date.now();
      
      await terminalPage.sendInput(command);
      await terminalPage.waitForResponse();
      
      const responseTime = Date.now() - responseStartTime;
      
      // Simple commands should respond within 5 seconds
      expect(responseTime).toBeLessThan(5000);
    }
  });

  test('should handle multiple concurrent instances efficiently', async ({ page }) => {
    const concurrentInstances = 3;
    const startTimes: number[] = [];
    
    // Start multiple instances concurrently
    const startPromises = [];
    
    for (let i = 0; i < concurrentInstances; i++) {
      startTimes.push(Date.now());
      
      if (i === 0) {
        startPromises.push(claudeManagerPage.clickProdClaudeButton());
      } else if (i === 1) {
        startPromises.push(claudeManagerPage.clickSkipPermissionsButton());
      } else {
        startPromises.push(claudeManagerPage.clickSkipPermissionsContinueButton());
      }
    }
    
    // Wait for all to start
    await Promise.all(startPromises);
    
    // Wait for all to reach running state
    await page.waitForTimeout(10000);
    
    // Measure total instances created
    const activeInstances = await claudeManagerPage.getActiveInstanceCount();
    expect(activeInstances).toBeLessThanOrEqual(concurrentInstances);
    expect(activeInstances).toBeGreaterThan(0);
    
    // Verify system performance hasn't degraded significantly
    const endTime = Date.now();
    const totalTime = endTime - Math.min(...startTimes);
    
    // Total time shouldn't increase linearly with instances
    // (good architecture should handle concurrency efficiently)
    expect(totalTime).toBeLessThan(60000); // Within 1 minute
    
    // Test that each instance is responsive
    // Note: This would need to be adapted based on UI design
    // for selecting specific instances
    await terminalPage.sendInput('echo "concurrent test"');
    await terminalPage.waitForResponse();
    
    const response = await terminalPage.getLatestResponse();
    expect(response).toContain('concurrent test');
  });

  test('should maintain reasonable memory usage', async ({ page }) => {
    // Monitor performance metrics
    const performanceMetrics: any[] = [];
    
    // Start monitoring
    const monitorPerformance = async () => {
      const metrics = await page.evaluate(() => {
        return {
          memory: (performance as any).memory?.usedJSHeapSize || 0,
          timing: performance.timing.loadEventEnd - performance.timing.navigationStart
        };
      });
      performanceMetrics.push(metrics);
    };
    
    // Baseline measurement
    await monitorPerformance();
    
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    await terminalPage.waitForClaudeWelcome();
    
    // Measure after startup
    await monitorPerformance();
    
    // Perform various operations to stress test memory
    const heavyOperations = [
      'ls -la /',
      'find . -name "*.js" -type f',
      'cat package.json',
      'for i in {1..50}; do echo "Memory test $i"; done'
    ];
    
    for (const operation of heavyOperations) {
      await terminalPage.sendInput(operation);
      await terminalPage.waitForResponse();
      await monitorPerformance();
    }
    
    // Analyze memory usage
    if (performanceMetrics.length > 0 && performanceMetrics[0].memory > 0) {
      const initialMemory = performanceMetrics[0].memory;
      const finalMemory = performanceMetrics[performanceMetrics.length - 1].memory;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      // Check for memory leaks (no continuous growth pattern)
      const memoryGrowths = performanceMetrics.slice(1).map((metric, index) => 
        metric.memory - performanceMetrics[index].memory
      );
      
      const averageGrowth = memoryGrowths.reduce((a, b) => a + b, 0) / memoryGrowths.length;
      
      // Average growth per operation should be minimal
      expect(averageGrowth).toBeLessThan(5 * 1024 * 1024); // Less than 5MB per operation
    }
  });

  test('should maintain stability during long-running sessions', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    await terminalPage.waitForClaudeWelcome();
    await terminalPage.waitForInteractivePrompt();
    
    // Simulate extended session with various operations
    const sessionDurationMinutes = 2; // Keep reasonable for testing
    const endTime = Date.now() + (sessionDurationMinutes * 60 * 1000);
    
    let operationCount = 0;
    const errors: string[] = [];
    
    while (Date.now() < endTime) {
      const operations = [
        'echo "Operation ' + operationCount + '"',
        'pwd',
        'date',
        'whoami',
        'ls',
        'echo $HOME'
      ];
      
      const operation = operations[operationCount % operations.length];
      
      try {
        await terminalPage.sendInput(operation);
        await terminalPage.waitForResponse(5000);
        
        const response = await terminalPage.getLatestResponse();
        if (response.toLowerCase().includes('error')) {
          errors.push(`Operation ${operationCount}: ${response}`);
        }
        
      } catch (error) {
        errors.push(`Operation ${operationCount}: ${error}`);
      }
      
      operationCount++;
      await page.waitForTimeout(1000); // 1 second between operations
    }
    
    // Verify session stability
    expect(errors.length).toBeLessThan(operationCount * 0.05); // Less than 5% error rate
    
    // Verify system is still responsive
    await terminalPage.sendInput('echo "Session completed successfully"');
    await terminalPage.waitForResponse();
    
    const finalResponse = await terminalPage.getLatestResponse();
    expect(finalResponse).toContain('Session completed successfully');
    
    console.log(`Long-running session completed: ${operationCount} operations, ${errors.length} errors`);
  });

  test('should handle rapid user interactions efficiently', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    await terminalPage.waitForClaudeWelcome();
    await terminalPage.waitForInteractivePrompt();
    
    // Simulate rapid user typing and commands
    const rapidCommands = [
      'echo "test1"',
      'echo "test2"',
      'echo "test3"',
      'pwd',
      'ls',
      'whoami',
      'date',
      'echo "rapid test complete"'
    ];
    
    const startTime = Date.now();
    
    // Send all commands with minimal delay
    for (const command of rapidCommands) {
      await terminalPage.sendInput(command);
      await page.waitForTimeout(50); // Very rapid input
    }
    
    // Wait for all responses
    await page.waitForTimeout(10000);
    
    const totalTime = Date.now() - startTime;
    
    // Should handle rapid input within reasonable time
    expect(totalTime).toBeLessThan(15000); // Within 15 seconds
    
    // Verify all commands were processed
    const terminalContent = await terminalPage.getTerminalContent();
    
    let processedCount = 0;
    for (const command of rapidCommands) {
      if (terminalContent.includes(command)) {
        processedCount++;
      }
    }
    
    // Should process most commands (allowing for some loss under extreme conditions)
    expect(processedCount).toBeGreaterThan(rapidCommands.length * 0.7); // At least 70%
  });

  test('should recover gracefully from system stress', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    await terminalPage.waitForClaudeWelcome();
    await terminalPage.waitForInteractivePrompt();
    
    // Create system stress through resource-intensive commands
    const stressCommands = [
      'find /usr -name "*.so" 2>/dev/null | head -100',
      'cat /dev/urandom | base64 | head -c 1000',
      'for i in {1..20}; do date; ps aux | head -5; done',
      'ls -laR /var/log 2>/dev/null | head -50'
    ];
    
    let stressCommandsCompleted = 0;
    
    for (const command of stressCommands) {
      try {
        await terminalPage.sendInput(command);
        await terminalPage.waitForResponse(10000); // Longer timeout for heavy commands
        stressCommandsCompleted++;
      } catch (error) {
        console.log(`Stress command failed: ${command}, Error: ${error}`);
      }
      
      await page.waitForTimeout(500); // Brief pause between stress operations
    }
    
    // Verify system recovered and is still responsive
    await page.waitForTimeout(2000);
    
    await terminalPage.sendInput('echo "System recovery test"');
    await terminalPage.waitForResponse();
    
    const recoveryResponse = await terminalPage.getLatestResponse();
    expect(recoveryResponse).toContain('System recovery test');
    
    // System should have handled at least some stress commands
    expect(stressCommandsCompleted).toBeGreaterThan(0);
    
    console.log(`Stress test completed: ${stressCommandsCompleted}/${stressCommands.length} commands succeeded`);
  });

  test('should maintain consistent performance over time', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    await terminalPage.waitForClaudeWelcome();
    await terminalPage.waitForInteractivePrompt();
    
    // Measure response times over multiple intervals
    const testIntervals = 5;
    const responseTimes: number[][] = [];
    
    for (let interval = 0; interval < testIntervals; interval++) {
      const intervalTimes: number[] = [];
      
      const testCommands = [
        'echo "performance test"',
        'pwd',
        'whoami'
      ];
      
      for (const command of testCommands) {
        const startTime = Date.now();
        
        await terminalPage.sendInput(command);
        await terminalPage.waitForResponse();
        
        const responseTime = Date.now() - startTime;
        intervalTimes.push(responseTime);
      }
      
      responseTimes.push(intervalTimes);
      
      // Wait between intervals
      if (interval < testIntervals - 1) {
        await page.waitForTimeout(2000);
      }
    }
    
    // Analyze performance consistency
    const averageTimes = responseTimes.map(times => 
      times.reduce((a, b) => a + b, 0) / times.length
    );
    
    const overallAverage = averageTimes.reduce((a, b) => a + b, 0) / averageTimes.length;
    
    // Calculate variance in performance
    const variance = averageTimes.reduce((sum, time) => 
      sum + Math.pow(time - overallAverage, 2), 0
    ) / averageTimes.length;
    
    const standardDeviation = Math.sqrt(variance);
    
    // Standard deviation should be reasonable (not too much variation)
    const coefficientOfVariation = standardDeviation / overallAverage;
    expect(coefficientOfVariation).toBeLessThan(0.5); // Less than 50% variation
    
    console.log(`Performance consistency test: Average ${overallAverage}ms, StdDev ${standardDeviation}ms, CoV ${coefficientOfVariation}`);
  });

  test('should handle connection quality variations', async ({ page }) => {
    // Start Claude instance
    await claudeManagerPage.clickProdClaudeButton();
    await claudeManagerPage.expectStatusProgression('starting', 'running');
    await terminalPage.waitForClaudeWelcome();
    await terminalPage.waitForInteractivePrompt();
    
    // Simulate variable connection quality
    let requestCount = 0;
    
    await page.route('**/events*', async route => {
      requestCount++;
      
      // Simulate intermittent slow connections
      if (requestCount % 3 === 0) {
        await page.waitForTimeout(1000); // Slow response
      } else if (requestCount % 7 === 0) {
        await page.waitForTimeout(2000); // Very slow response
      }
      
      route.continue();
    });
    
    // Test system behavior under variable conditions
    const commands = [
      'echo "connection test 1"',
      'pwd',
      'echo "connection test 2"',
      'whoami',
      'echo "connection test 3"',
      'date'
    ];
    
    const results: string[] = [];
    
    for (const command of commands) {
      try {
        await terminalPage.sendInput(command);
        await terminalPage.waitForResponse(10000);
        
        const response = await terminalPage.getLatestResponse();
        results.push(response);
        
      } catch (error) {
        results.push(`Error: ${error}`);
      }
    }
    
    // Remove route interception
    await page.unroute('**/events*');
    
    // System should handle variable conditions gracefully
    const successCount = results.filter(result => 
      !result.toLowerCase().includes('error') && result.length > 0
    ).length;
    
    // Should have reasonable success rate even with connection issues
    expect(successCount).toBeGreaterThan(commands.length * 0.6); // At least 60% success
    
    // Verify system is still responsive after connection stress
    await terminalPage.sendInput('echo "final connectivity test"');
    await terminalPage.waitForResponse();
    
    const finalResponse = await terminalPage.getLatestResponse();
    expect(finalResponse).toContain('final connectivity test');
  });
});