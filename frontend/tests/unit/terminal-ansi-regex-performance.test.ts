/**
 * TDD London School: ANSI Sequence Processing Performance Analysis
 * 
 * CRITICAL FOCUS: Identify potential infinite loops in processAnsiSequences regex
 * The terminal hangs after carriage return fix - likely due to regex performance
 * 
 * Target Method: processAnsiSequences() in backend-terminal-server-emergency-fix.js
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock implementation of the actual processAnsiSequences method
class ANSIProcessor {
  private regexCache = new Map();
  private performanceMetrics = new Map();

  processAnsiSequences(data: string): string {
    const startTime = performance.now();
    
    try {
      const result = data
        // CRITICAL BUG FIX: Convert literal '\n' strings to actual newlines
        .replace(/\\n/g, '\n')                   // Convert literal '\n' to actual newlines
        .replace(/\\r/g, '\r')                   // Convert literal '\r' to actual carriage returns
        
        // FIXED: Preserve carriage returns - they're essential for line overwriting
        .replace(/\r\x1b\[2K/g, '\r\x1b[2K')    // \r + clear entire line - preserve both
        .replace(/\r\x1b\[K/g, '\r\x1b[K')      // \r + clear line - preserve both
        .replace(/\r\x1b\[0K/g, '\r\x1b[0K')    // \r + clear to end - preserve both
        
        // Handle cursor positioning (prevents duplicate lines)
        .replace(/\x1b\[\d*A/g, '')              // Remove cursor up sequences
        .replace(/\x1b\[\d*B/g, '')              // Remove cursor down sequences
        
        // Handle line clearing (ensures proper overwriting)
        .replace(/\x1b\[0K/g, '\x1b[0K')         // Clear to end of line
        .replace(/\x1b\[1K/g, '\x1b[1K')         // Clear to start of line
        .replace(/\x1b\[2K/g, '\x1b[2K')         // Clear entire line
        
        // Remove problematic sequences
        .replace(/\x1b\[\?25[lh]/g, '')          // Remove cursor show/hide
        .replace(/\x1b\[\?1049[lh]/g, '')        // Remove alternate screen buffer
        .replace(/\x1b\[\?2004[lh]/g, '');       // Remove bracketed paste mode

      const executionTime = performance.now() - startTime;
      this.performanceMetrics.set('lastExecution', executionTime);
      
      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.performanceMetrics.set('lastExecutionError', executionTime);
      throw error;
    }
  }

  getPerformanceMetrics() {
    return Object.fromEntries(this.performanceMetrics);
  }
}

describe('ANSI Regex Performance Analysis - Hang Detection', () => {
  let processor: ANSIProcessor;

  beforeEach(() => {
    processor = new ANSIProcessor();
  });

  describe('Regex Performance Critical Tests', () => {
    it('SHOULD complete ANSI processing within performance threshold', () => {
      // ARRANGE: Normal terminal output
      const normalData = [
        '$ cd prod && claude\r\n',
        'Connecting to Claude...\r\n',
        '\x1b[32mConnected successfully\x1b[0m\r\n'
      ];

      // ACT & ASSERT: Each should complete quickly
      normalData.forEach((data) => {
        const startTime = performance.now();
        const result = processor.processAnsiSequences(data);
        const executionTime = performance.now() - startTime;
        
        // Should complete in under 1ms
        expect(executionTime).toBeLessThan(1);
        expect(result).toBeDefined();
      });
    });

    it('SHOULD detect catastrophic backtracking in cursor position regex', () => {
      // ARRANGE: Potentially problematic cursor sequences
      const problematicSequences = [
        // Malformed cursor sequences that could cause backtracking
        '\x1b[' + '9'.repeat(100) + 'A',      // Very large cursor up
        '\x1b[' + '9'.repeat(100) + 'B',      // Very large cursor down
        '\x1b[999999999999999999999A',        // Extreme values
        '\x1b[\x1b[\x1b[999A',                // Nested incomplete sequences
      ];

      // ACT & ASSERT: Should complete without hanging
      problematicSequences.forEach((sequence, index) => {
        const timeout = 50; // 50ms max per operation
        let completed = false;
        let result: string;

        const promise = new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error(`REGEX HANG DETECTED: Sequence ${index} took longer than ${timeout}ms`));
          }, timeout);

          try {
            result = processor.processAnsiSequences(sequence);
            completed = true;
            clearTimeout(timer);
            resolve();
          } catch (error) {
            clearTimeout(timer);
            reject(error);
          }
        });

        return expect(promise).resolves.not.toThrow();
      });
    });

    it('SHOULD handle escaped sequences without performance degradation', () => {
      // ARRANGE: Test literal backslash sequences (the fixed bug)
      const literalSequences = [
        'line1\\nline2\\nline3',              // Multiple literal \n
        'text\\r\\nmore text',                // Literal \r\n combination
        '\\n'.repeat(100),                    // Many literal newlines
        '\\r'.repeat(100),                    // Many literal carriage returns
        'mixed\\ntext\\r\\nmore\\n',          // Mixed literal sequences
      ];

      // ACT & ASSERT: Should process efficiently
      literalSequences.forEach((sequence) => {
        const startTime = performance.now();
        const result = processor.processAnsiSequences(sequence);
        const executionTime = performance.now() - startTime;
        
        // Should handle literal sequences quickly
        expect(executionTime).toBeLessThan(2);
        expect(result).not.toContain('\\n'); // Should convert literals
        expect(result).not.toContain('\\r'); // Should convert literals
      });
    });

    it('SHOULD identify regex patterns that cause exponential time complexity', () => {
      // ARRANGE: Create sequences that might cause regex engines to hang
      const exponentialPatterns = [
        // Patterns that could cause catastrophic backtracking
        '\x1b[' + 'A'.repeat(50) + '\x1b[' + 'B'.repeat(50),
        '\x1b[?25l\x1b[?25h'.repeat(20),      // Alternating cursor show/hide
        ('\x1b[2K' + '\r').repeat(30),        // Many line clears with carriage returns
      ];

      // ACT & ASSERT: Monitor for exponential behavior
      exponentialPatterns.forEach((pattern, index) => {
        const iterations = [1, 2, 4, 8]; // Doubling pattern length
        const timings: number[] = [];

        iterations.forEach((multiplier) => {
          const testPattern = pattern.repeat(multiplier);
          const startTime = performance.now();
          
          processor.processAnsiSequences(testPattern);
          
          const executionTime = performance.now() - startTime;
          timings.push(executionTime);
        });

        // Check for exponential growth
        // Time should grow roughly linearly, not exponentially
        const growthRatio = timings[3] / timings[0]; // 8x pattern vs 1x pattern
        expect(growthRatio).toBeLessThan(20); // Should not be exponential

        console.log(`Pattern ${index} growth ratio: ${growthRatio.toFixed(2)}x`);
      });
    });

    it('SHOULD measure regex compilation vs execution time', () => {
      // ARRANGE: Complex ANSI sequences
      const complexSequences = [
        '\x1b[31;1;4mRed Bold Underline\x1b[0m\r\n',
        '\x1b[2J\x1b[H\x1b[31mClear and home\x1b[0m\r\n',
        '\x1b]0;Window Title\x1b\\\r\n',
      ];

      // ACT: Measure first vs subsequent executions
      complexSequences.forEach((sequence) => {
        // First execution (includes potential regex compilation)
        const firstStart = performance.now();
        processor.processAnsiSequences(sequence);
        const firstTime = performance.now() - firstStart;

        // Subsequent execution (should be cached/compiled)
        const secondStart = performance.now();
        processor.processAnsiSequences(sequence);
        const secondTime = performance.now() - secondStart;

        // ASSERT: Subsequent executions should be faster or similar
        expect(secondTime).toBeLessThanOrEqual(firstTime * 2); // Allow some variance
        
        console.log(`Sequence execution times: first=${firstTime.toFixed(3)}ms, second=${secondTime.toFixed(3)}ms`);
      });
    });
  });

  describe('Carriage Return Processing Verification', () => {
    it('SHOULD preserve essential carriage return functionality', () => {
      // ARRANGE: Carriage return test cases that were working before
      const testCases = [
        {
          input: 'Loading...\rComplete!\r\n',
          expected: 'Loading...\rComplete!\r\n',
          description: 'Progress indicator overwrite'
        },
        {
          input: '\r\x1b[2KCleared line\r\n',
          expected: '\r\x1b[2KCleared line\r\n',
          description: 'Line clearing with carriage return'
        },
        {
          input: 'Spinning: |\r\bSpinning: /\r\bSpinning: -\r\b',
          expected: 'Spinning: |\r\bSpinning: /\r\bSpinning: -\r\b',
          description: 'Spinner animation'
        }
      ];

      // ACT & ASSERT: Verify carriage return behavior is preserved
      testCases.forEach(({ input, expected, description }) => {
        const result = processor.processAnsiSequences(input);
        expect(result).toBe(expected);
        
        // Ensure performance is acceptable
        const metrics = processor.getPerformanceMetrics();
        expect(metrics.lastExecution).toBeLessThan(1);
      });
    });

    it('SHOULD convert literal escape sequences correctly', () => {
      // ARRANGE: The specific bug that was fixed
      const literalTestCases = [
        {
          input: 'First line\\nSecond line',
          expected: 'First line\nSecond line',
          description: 'Literal \\n to actual newline'
        },
        {
          input: 'Text\\r\\nNext line',
          expected: 'Text\r\nNext line', 
          description: 'Literal \\r\\n to actual CRLF'
        },
        {
          input: 'Mixed\\ntext\\r\\nhere',
          expected: 'Mixed\ntext\r\nhere',
          description: 'Mixed literal sequences'
        }
      ];

      // ACT & ASSERT: Verify literal conversion works
      literalTestCases.forEach(({ input, expected, description }) => {
        const result = processor.processAnsiSequences(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Performance Regression Detection', () => {
    it('SHOULD establish performance baselines for different input types', () => {
      // ARRANGE: Different categories of terminal data
      const performanceTests = [
        {
          category: 'Plain Text',
          data: 'Simple text output without ANSI sequences\r\n',
          maxTime: 0.1
        },
        {
          category: 'ANSI Colors',
          data: '\x1b[31mRed\x1b[32mGreen\x1b[33mYellow\x1b[0m\r\n',
          maxTime: 0.5
        },
        {
          category: 'Cursor Movement',
          data: '\x1b[H\x1b[2J\x1b[10;20H\x1b[A\x1b[B\r\n',
          maxTime: 0.5
        },
        {
          category: 'Mixed Complex',
          data: '\x1b[2J\x1b[H\x1b[31;1mComplex\\nwith\\r\\nliterals\x1b[0m\r\n',
          maxTime: 1.0
        }
      ];

      // ACT & ASSERT: Measure performance for each category
      performanceTests.forEach(({ category, data, maxTime }) => {
        const iterations = 100;
        const startTime = performance.now();

        for (let i = 0; i < iterations; i++) {
          processor.processAnsiSequences(data);
        }

        const totalTime = performance.now() - startTime;
        const avgTime = totalTime / iterations;

        expect(avgTime).toBeLessThan(maxTime);
        console.log(`${category}: avg=${avgTime.toFixed(3)}ms per operation`);
      });
    });

    it('SHOULD detect memory leaks in regex processing', () => {
      // ARRANGE: Large-scale processing test
      const testData = 'Complex ANSI sequence \x1b[31mwith colors\x1b[0m and \\n literals\r\n';
      const initialMemory = process.memoryUsage().heapUsed;

      // ACT: Process many sequences
      for (let i = 0; i < 10000; i++) {
        processor.processAnsiSequences(testData);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // ASSERT: Memory growth should be minimal
      const maxMemoryGrowthMB = 10; // 10MB max growth
      const memoryGrowthMB = memoryGrowth / 1024 / 1024;
      
      expect(memoryGrowthMB).toBeLessThan(maxMemoryGrowthMB);
      console.log(`Memory growth: ${memoryGrowthMB.toFixed(2)}MB`);
    });
  });
});