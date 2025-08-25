/**
 * @test Terminal Performance and Responsiveness Tests
 * @description Performance tests to ensure terminal remains responsive without echo duplication
 * @prerequisites Terminal server and frontend running
 * @validation Measures performance impact of echo prevention measures
 */

import { test, expect, Page } from '@playwright/test';

interface PerformanceMetrics {
  averageLatency: number;
  maxLatency: number;
  minLatency: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
}

interface TypingPerformanceResult {
  charactersPerSecond: number;
  averageEchoDelay: number;
  missedKeystrokes: number;
  duplicateEchoes: number;
}

class TerminalPerformanceTester {
  private page: Page;
  private terminalSelector = '.xterm-screen';
  private inputSelector = '.xterm-helper-textarea';

  constructor(page: Page) {
    this.page = page;
  }

  async waitForTerminalReady(): Promise<void> {
    await this.page.waitForSelector(this.terminalSelector, { timeout: 15000 });
    await this.page.waitForFunction(
      () => document.querySelector('.xterm-screen')?.textContent,
      { timeout: 10000 }
    );
  }

  async measureTypingLatency(testString: string, iterations: number = 10): Promise<number[]> {
    const latencies: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      // Clear terminal
      await this.page.keyboard.press('Control+L');
      await this.page.waitForTimeout(100);
      
      const startTime = performance.now();
      
      // Type a single character
      const testChar = testString[i % testString.length];
      await this.page.type(this.inputSelector, testChar, { delay: 0 });
      
      // Wait for echo to appear
      await this.page.waitForFunction(
        (char) => {
          const terminal = document.querySelector('.xterm-screen');
          return terminal?.textContent?.includes(char) || false;
        },
        testChar,
        { timeout: 1000 }
      );
      
      const endTime = performance.now();
      latencies.push(endTime - startTime);
      
      await this.page.waitForTimeout(50);
    }
    
    return latencies;
  }

  async measureRapidTypingPerformance(testString: string, typingDelay: number = 10): Promise<TypingPerformanceResult> {
    await this.page.keyboard.press('Control+L');
    await this.page.waitForTimeout(200);
    
    const startTime = performance.now();
    const initialContent = await this.getTerminalContent();
    
    // Type rapidly
    await this.page.type(this.inputSelector, testString, { delay: typingDelay });
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    // Wait for all echoes to settle
    await this.page.waitForTimeout(500);
    
    const finalContent = await this.getTerminalContent();
    const newContent = finalContent.slice(initialContent.length);
    
    // Count occurrences of test string
    const regex = new RegExp(testString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const occurrences = (newContent.match(regex) || []).length;
    
    // Count individual character echoes vs expected
    const expectedChars = testString.length;
    const actualChars = newContent.length;
    
    return {
      charactersPerSecond: (testString.length / totalTime) * 1000,
      averageEchoDelay: totalTime / testString.length,
      missedKeystrokes: Math.max(0, expectedChars - actualChars),
      duplicateEchoes: Math.max(0, occurrences - 1)
    };
  }

  async measureConcurrentOperationsPerformance(): Promise<PerformanceMetrics> {
    const metrics: PerformanceMetrics = {
      averageLatency: 0,
      maxLatency: 0,
      minLatency: Infinity,
      throughput: 0,
      errorRate: 0,
      memoryUsage: 0
    };

    const operations = 20;
    const latencies: number[] = [];
    let errors = 0;

    const startTime = performance.now();

    // Run concurrent typing operations
    const promises = Array.from({ length: operations }, async (_, i) => {
      try {
        const operationStart = performance.now();
        const testString = `concurrent-test-${i}`;
        
        await this.page.type(this.inputSelector, testString, { delay: 5 });
        
        const operationEnd = performance.now();
        latencies.push(operationEnd - operationStart);
        
        return { success: true, testString };
      } catch (error) {
        errors++;
        return { success: false, error };
      }
    });

    const results = await Promise.allSettled(promises);
    const endTime = performance.now();

    // Calculate metrics
    metrics.averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    metrics.maxLatency = Math.max(...latencies);
    metrics.minLatency = Math.min(...latencies);
    metrics.throughput = operations / ((endTime - startTime) / 1000);
    metrics.errorRate = errors / operations;

    // Get memory usage
    const memoryInfo = await this.page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize
      } : { usedJSHeapSize: 0, totalJSHeapSize: 0 };
    });
    
    metrics.memoryUsage = memoryInfo.usedJSHeapSize;

    return metrics;
  }

  async getTerminalContent(): Promise<string> {
    return await this.page.textContent(this.terminalSelector) || '';
  }

  async measureCommandExecutionPerformance(commands: string[]): Promise<{ [key: string]: number }> {
    const results: { [key: string]: number } = {};
    
    for (const command of commands) {
      await this.page.keyboard.press('Control+L');
      await this.page.waitForTimeout(100);
      
      const startTime = performance.now();
      
      await this.page.type(this.inputSelector, command, { delay: 0 });
      await this.page.keyboard.press('Enter');
      
      // Wait for command completion or timeout
      try {
        await this.page.waitForFunction(
          () => {
            const terminal = document.querySelector('.xterm-screen');
            const content = terminal?.textContent || '';
            // Look for prompt return or command completion
            return content.includes('$') || content.includes('>') || content.includes('#');
          },
          { timeout: 5000 }
        );
      } catch (timeoutError) {
        // Command might still be running or failed
      }
      
      const endTime = performance.now();
      results[command] = endTime - startTime;
      
      await this.page.waitForTimeout(200);
    }
    
    return results;
  }
}

test.describe('Terminal Performance Tests', () => {
  let performanceTester: TerminalPerformanceTester;

  test.beforeEach(async ({ page }) => {
    performanceTester = new TerminalPerformanceTester(page);
    
    await page.goto('http://localhost:5173');
    await performanceTester.waitForTerminalReady();
  });

  test.describe('Typing Performance', () => {
    test('should maintain low latency for character echoing', async () => {
      const testString = 'abcdefghijklmnopqrstuvwxyz';
      const latencies = await performanceTester.measureTypingLatency(testString, 20);
      
      const averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      
      // Should echo within reasonable time
      expect(averageLatency).toBeLessThan(100); // 100ms average
      expect(maxLatency).toBeLessThan(500); // 500ms max
      
      console.log(`Average typing latency: ${averageLatency.toFixed(2)}ms`);
      console.log(`Maximum typing latency: ${maxLatency.toFixed(2)}ms`);
    });

    test('should handle rapid typing without performance degradation', async () => {
      const testString = 'rapid-typing-performance-test-12345';
      const result = await performanceTester.measureRapidTypingPerformance(testString, 5);
      
      // Should achieve reasonable typing speed
      expect(result.charactersPerSecond).toBeGreaterThan(50); // 50 CPS minimum
      expect(result.averageEchoDelay).toBeLessThan(50); // 50ms average delay
      expect(result.duplicateEchoes).toBe(0); // No duplicates
      expect(result.missedKeystrokes).toBeLessThan(5); // Minimal missed keystrokes
      
      console.log(`Typing speed: ${result.charactersPerSecond.toFixed(2)} characters/second`);
      console.log(`Average echo delay: ${result.averageEchoDelay.toFixed(2)}ms`);
      console.log(`Duplicate echoes: ${result.duplicateEchoes}`);
    });

    test('should maintain performance with special characters', async () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?`~"\'\\';
      const result = await performanceTester.measureRapidTypingPerformance(specialChars, 20);
      
      expect(result.charactersPerSecond).toBeGreaterThan(30); // Lower expectation for special chars
      expect(result.duplicateEchoes).toBe(0);
      
      console.log(`Special chars typing speed: ${result.charactersPerSecond.toFixed(2)} CPS`);
    });
  });

  test.describe('Concurrent Operations Performance', () => {
    test('should handle multiple simultaneous typing operations', async () => {
      const metrics = await performanceTester.measureConcurrentOperationsPerformance();
      
      expect(metrics.averageLatency).toBeLessThan(200); // 200ms average
      expect(metrics.errorRate).toBeLessThan(0.1); // Less than 10% errors
      expect(metrics.throughput).toBeGreaterThan(5); // 5 operations per second
      
      console.log(`Concurrent operations metrics:`, metrics);
    });

    test('should maintain responsiveness during high-frequency input', async ({ page }) => {
      const startTime = performance.now();
      
      // Generate high-frequency input events
      const testSequences = Array.from({ length: 10 }, (_, i) => `seq${i}`);
      
      for (const seq of testSequences) {
        await page.type(performanceTester['inputSelector'], seq, { delay: 2 });
        await page.keyboard.press('Enter');
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(3000); // 3 seconds for all sequences
      
      console.log(`High-frequency input completed in: ${totalTime.toFixed(2)}ms`);
    });
  });

  test.describe('Command Execution Performance', () => {
    test('should maintain performance for common commands', async () => {
      const commonCommands = ['pwd', 'ls', 'echo hello', 'date', 'whoami'];
      const results = await performanceTester.measureCommandExecutionPerformance(commonCommands);
      
      Object.entries(results).forEach(([command, duration]) => {
        expect(duration).toBeLessThan(5000); // 5 second timeout per command
        console.log(`Command "${command}" executed in: ${duration.toFixed(2)}ms`);
      });
    });

    test('should handle complex commands without blocking terminal', async () => {
      const complexCommands = [
        'find /workspaces -name "*.ts" | head -5',
        'ps aux | grep node | head -3',
        'ls -la /workspaces/agent-feed'
      ];
      
      const results = await performanceTester.measureCommandExecutionPerformance(complexCommands);
      
      Object.entries(results).forEach(([command, duration]) => {
        expect(duration).toBeLessThan(10000); // 10 second timeout for complex commands
        console.log(`Complex command "${command}" executed in: ${duration.toFixed(2)}ms`);
      });
    });
  });

  test.describe('Memory and Resource Performance', () => {
    test('should not cause memory leaks during extended typing sessions', async ({ page }) => {
      // Get initial memory baseline
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
      });

      // Perform extended typing session
      const longSession = Array.from({ length: 50 }, (_, i) => `typing-session-${i}-test`);
      
      for (const text of longSession) {
        await page.type(performanceTester['inputSelector'], text, { delay: 5 });
        await page.keyboard.press('Enter');
        
        // Occasional cleanup
        if (i % 10 === 0) {
          await page.keyboard.press('Control+L');
        }
      }

      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });

      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
      });

      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
        
        // Memory should not increase by more than 50%
        expect(memoryIncreasePercent).toBeLessThan(50);
        
        console.log(`Memory usage: ${initialMemory} -> ${finalMemory} (${memoryIncreasePercent.toFixed(2)}% increase)`);
      }
    });

    test('should maintain performance under sustained load', async ({ page }) => {
      const sustainedLoadDuration = 10000; // 10 seconds
      const startTime = performance.now();
      const operationTimes: number[] = [];
      
      while (performance.now() - startTime < sustainedLoadDuration) {
        const opStart = performance.now();
        
        await page.type(performanceTester['inputSelector'], 'load-test', { delay: 1 });
        await page.keyboard.press('Backspace', { delay: 1 });
        await page.keyboard.press('Backspace', { delay: 1 });
        await page.keyboard.press('Backspace', { delay: 1 });
        
        const opEnd = performance.now();
        operationTimes.push(opEnd - opStart);
        
        await page.waitForTimeout(10);
      }
      
      // Performance should not degrade significantly over time
      const firstHalf = operationTimes.slice(0, operationTimes.length / 2);
      const secondHalf = operationTimes.slice(operationTimes.length / 2);
      
      const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      const degradation = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
      
      // Performance should not degrade by more than 25%
      expect(degradation).toBeLessThan(25);
      
      console.log(`Sustained load test: ${firstHalfAvg.toFixed(2)}ms -> ${secondHalfAvg.toFixed(2)}ms (${degradation.toFixed(2)}% change)`);
    });
  });

  test.describe('Network Performance Impact', () => {
    test('should maintain local responsiveness despite WebSocket latency', async ({ page }) => {
      // Simulate network delay
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 100); // 100ms delay
      });

      const testString = 'network-latency-test';
      const result = await performanceTester.measureRapidTypingPerformance(testString, 20);
      
      // Local typing should still be responsive despite network delays
      expect(result.charactersPerSecond).toBeGreaterThan(20); // Reduced expectation
      expect(result.duplicateEchoes).toBe(0);
      
      console.log(`Performance with network delay: ${result.charactersPerSecond.toFixed(2)} CPS`);
    });

    test('should handle WebSocket connection interruptions gracefully', async ({ page }) => {
      // Type normally first
      await page.type(performanceTester['inputSelector'], 'before-interruption', { delay: 10 });
      
      // Simulate connection interruption
      await page.evaluate(() => {
        // Close WebSocket if available
        if ((window as any).currentWebSocket) {
          (window as any).currentWebSocket.close();
        }
      });
      
      await page.waitForTimeout(1000);
      
      // Continue typing - should not block or cause performance issues
      const interruptedResult = await performanceTester.measureRapidTypingPerformance('after-interruption', 20);
      
      // Should maintain reasonable performance even with connection issues
      expect(interruptedResult.charactersPerSecond).toBeGreaterThan(10);
      expect(interruptedResult.duplicateEchoes).toBeLessThanOrEqual(1); // Allow some duplication during recovery
    });
  });
});

test.describe('Performance Regression Detection', () => {
  test('should detect performance regressions in echo handling', async ({ page }) => {
    const performanceTester = new TerminalPerformanceTester(page);
    await page.goto('http://localhost:5173');
    await performanceTester.waitForTerminalReady();

    // Baseline performance measurement
    const baselineString = 'performance-baseline-test';
    const baseline = await performanceTester.measureRapidTypingPerformance(baselineString, 10);
    
    // Stress test to detect regressions
    const stressString = 'a'.repeat(100);
    const stressResult = await performanceTester.measureRapidTypingPerformance(stressString, 5);
    
    // Performance should not drastically degrade with longer strings
    const performanceRatio = baseline.charactersPerSecond / stressResult.charactersPerSecond;
    expect(performanceRatio).toBeLessThan(3); // Should not be more than 3x slower
    
    // Echo duplication should remain at zero regardless of string length
    expect(baseline.duplicateEchoes).toBe(0);
    expect(stressResult.duplicateEchoes).toBe(0);
    
    console.log(`Baseline: ${baseline.charactersPerSecond.toFixed(2)} CPS`);
    console.log(`Stress test: ${stressResult.charactersPerSecond.toFixed(2)} CPS`);
    console.log(`Performance ratio: ${performanceRatio.toFixed(2)}`);
  });
});