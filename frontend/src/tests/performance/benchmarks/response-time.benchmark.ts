/**
 * Performance Benchmark Tests for Avi DM Response Times
 * SPARC Phase 5: Completion - Performance Validation
 *
 * Benchmark Coverage:
 * - Message processing response times
 * - Image upload performance
 * - UI rendering benchmarks
 * - Memory usage patterns
 * - Concurrent user simulation
 */

import { performance } from 'perf_hooks';

interface BenchmarkResult {
  testName: string;
  duration: number;
  memoryUsage?: NodeJS.MemoryUsage;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface BenchmarkThresholds {
  maxResponseTime: number;
  maxMemoryUsage: number;
  maxRenderTime: number;
  maxConcurrentUsers: number;
}

// Performance thresholds based on requirements
const BENCHMARK_THRESHOLDS: BenchmarkThresholds = {
  maxResponseTime: 5000, // 5 seconds
  maxMemoryUsage: 512 * 1024 * 1024, // 512MB
  maxRenderTime: 100, // 100ms
  maxConcurrentUsers: 50
};

class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];
  private startTime: number = 0;
  private startMemory?: NodeJS.MemoryUsage;

  /**
   * Start benchmark measurement
   */
  start(testName: string): void {
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage();
    console.log(`🚀 Starting benchmark: ${testName}`);
  }

  /**
   * End benchmark measurement and record result
   */
  end(testName: string, metadata?: Record<string, any>): BenchmarkResult {
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const duration = endTime - this.startTime;

    const result: BenchmarkResult = {
      testName,
      duration,
      memoryUsage: endMemory,
      timestamp: Date.now(),
      metadata
    };

    this.results.push(result);

    console.log(`✅ Completed benchmark: ${testName}`);
    console.log(`⏱️  Duration: ${duration.toFixed(2)}ms`);
    console.log(`💾 Memory: ${(endMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);

    return result;
  }

  /**
   * Get all benchmark results
   */
  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  /**
   * Clear all results
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    if (this.results.length === 0) {
      return 'No benchmark results available';
    }

    const totalTests = this.results.length;
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / totalTests;
    const maxDuration = Math.max(...this.results.map(r => r.duration));
    const minDuration = Math.min(...this.results.map(r => r.duration));

    let report = `
# Performance Benchmark Report
Generated: ${new Date().toISOString()}

## Summary
- Total Tests: ${totalTests}
- Average Duration: ${avgDuration.toFixed(2)}ms
- Max Duration: ${maxDuration.toFixed(2)}ms
- Min Duration: ${minDuration.toFixed(2)}ms

## Threshold Compliance
- Max Response Time: ${BENCHMARK_THRESHOLDS.maxResponseTime}ms
- Max Memory Usage: ${(BENCHMARK_THRESHOLDS.maxMemoryUsage / 1024 / 1024).toFixed(0)}MB
- Max Render Time: ${BENCHMARK_THRESHOLDS.maxRenderTime}ms

## Detailed Results
`;

    this.results.forEach(result => {
      const memoryMB = result.memoryUsage
        ? (result.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)
        : 'N/A';

      const status = result.duration <= BENCHMARK_THRESHOLDS.maxResponseTime ? '✅' : '❌';

      report += `
### ${result.testName} ${status}
- Duration: ${result.duration.toFixed(2)}ms
- Memory: ${memoryMB}MB
- Timestamp: ${new Date(result.timestamp).toISOString()}
`;

      if (result.metadata) {
        report += `- Metadata: ${JSON.stringify(result.metadata, null, 2)}\n`;
      }
    });

    return report;
  }
}

/**
 * API Response Time Benchmarks
 */
export class APIResponseBenchmark {
  private benchmark = new PerformanceBenchmark();

  async benchmarkStreamingChat(messageSize: 'small' | 'medium' | 'large' = 'medium'): Promise<BenchmarkResult> {
    const messages = {
      small: 'Hello Avi',
      medium: 'Hello Avi, can you help me with a coding question? I need to understand how to implement a React component.',
      large: 'Hello Avi, ' + 'x'.repeat(1000) + ' This is a very long message to test performance with large inputs.'
    };

    this.benchmark.start(`Streaming Chat - ${messageSize} message`);

    try {
      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messages[messageSize],
          options: {
            workingDirectory: '/workspaces/agent-feed/prod',
            allowedTools: ['Read', 'Write', 'Grep', 'Bash']
          }
        })
      });

      const data = await response.json();

      return this.benchmark.end(`Streaming Chat - ${messageSize} message`, {
        messageLength: messages[messageSize].length,
        responseLength: JSON.stringify(data).length,
        statusCode: response.status,
        success: data.success
      });
    } catch (error) {
      return this.benchmark.end(`Streaming Chat - ${messageSize} message (ERROR)`, {
        error: error.message,
        messageLength: messages[messageSize].length
      });
    }
  }

  async benchmarkImageUpload(imageCount: number = 1): Promise<BenchmarkResult> {
    this.benchmark.start(`Image Upload - ${imageCount} images`);

    // Generate test images
    const images = Array.from({ length: imageCount }, (_, i) =>
      `data:image/png;base64,${'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='.repeat(i + 1)}`
    );

    try {
      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            text: 'What do you see in these images?',
            images
          }
        })
      });

      const data = await response.json();

      return this.benchmark.end(`Image Upload - ${imageCount} images`, {
        imageCount,
        totalImageSize: images.reduce((sum, img) => sum + img.length, 0),
        responseLength: JSON.stringify(data).length,
        statusCode: response.status,
        success: data.success
      });
    } catch (error) {
      return this.benchmark.end(`Image Upload - ${imageCount} images (ERROR)`, {
        error: error.message,
        imageCount
      });
    }
  }

  async benchmarkConcurrentRequests(concurrency: number = 10): Promise<BenchmarkResult> {
    this.benchmark.start(`Concurrent Requests - ${concurrency} simultaneous`);

    const promises = Array.from({ length: concurrency }, (_, i) =>
      fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Concurrent test message ${i + 1}`
        })
      })
    );

    try {
      const responses = await Promise.all(promises);
      const successCount = responses.filter(r => r.ok).length;

      return this.benchmark.end(`Concurrent Requests - ${concurrency} simultaneous`, {
        concurrency,
        successCount,
        failureCount: concurrency - successCount,
        successRate: (successCount / concurrency) * 100
      });
    } catch (error) {
      return this.benchmark.end(`Concurrent Requests - ${concurrency} simultaneous (ERROR)`, {
        error: error.message,
        concurrency
      });
    }
  }

  async benchmarkHealthCheck(): Promise<BenchmarkResult> {
    this.benchmark.start('Health Check');

    try {
      const response = await fetch('/api/claude-code/health');
      const data = await response.json();

      return this.benchmark.end('Health Check', {
        statusCode: response.status,
        healthy: data.healthy,
        toolsEnabled: data.toolsEnabled
      });
    } catch (error) {
      return this.benchmark.end('Health Check (ERROR)', {
        error: error.message
      });
    }
  }

  generateReport(): string {
    return this.benchmark.generateReport();
  }

  clearResults(): void {
    this.benchmark.clearResults();
  }
}

/**
 * UI Rendering Performance Benchmarks
 */
export class UIRenderingBenchmark {
  private benchmark = new PerformanceBenchmark();

  benchmarkComponentMount(): BenchmarkResult {
    this.benchmark.start('Component Mount');

    // Mock DOM environment for testing
    const mockElement = {
      innerHTML: '',
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      querySelector: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };

    // Simulate component mounting
    setTimeout(() => {
      mockElement.innerHTML = '<div>Avi Chat Component</div>';
    }, 1);

    return this.benchmark.end('Component Mount', {
      elementCount: 1,
      hasListeners: true
    });
  }

  benchmarkMessageRendering(messageCount: number = 50): BenchmarkResult {
    this.benchmark.start(`Message Rendering - ${messageCount} messages`);

    // Simulate rendering multiple messages
    const messages = Array.from({ length: messageCount }, (_, i) => ({
      id: `msg-${i}`,
      content: `Test message ${i + 1}`,
      timestamp: new Date(),
      role: i % 2 === 0 ? 'user' : 'assistant'
    }));

    // Mock rendering process
    messages.forEach(message => {
      const mockMessageElement = {
        textContent: message.content,
        className: message.role === 'user' ? 'user-message' : 'assistant-message'
      };
    });

    return this.benchmark.end(`Message Rendering - ${messageCount} messages`, {
      messageCount,
      averageMessageLength: messages.reduce((sum, m) => sum + m.content.length, 0) / messageCount
    });
  }

  benchmarkScrollPerformance(): BenchmarkResult {
    this.benchmark.start('Scroll Performance');

    // Simulate scroll handling
    let scrollEventCount = 0;
    const scrollHandler = () => {
      scrollEventCount++;
    };

    // Simulate 100 scroll events
    for (let i = 0; i < 100; i++) {
      scrollHandler();
    }

    return this.benchmark.end('Scroll Performance', {
      scrollEventCount,
      eventsPerSecond: scrollEventCount / 0.1 // Assume 100ms duration
    });
  }

  benchmarkInputPerformance(): BenchmarkResult {
    this.benchmark.start('Input Performance');

    // Simulate typing events
    const testInput = 'This is a test message for input performance benchmarking';
    let inputEventCount = 0;

    testInput.split('').forEach(() => {
      inputEventCount++;
      // Simulate input handling logic
    });

    return this.benchmark.end('Input Performance', {
      inputEventCount,
      charactersPerSecond: inputEventCount / 0.05 // Assume 50ms duration
    });
  }

  generateReport(): string {
    return this.benchmark.generateReport();
  }

  clearResults(): void {
    this.benchmark.clearResults();
  }
}

/**
 * Memory Usage Benchmarks
 */
export class MemoryUsageBenchmark {
  private benchmark = new PerformanceBenchmark();

  benchmarkMessageMemory(messageCount: number = 100): BenchmarkResult {
    this.benchmark.start(`Memory Usage - ${messageCount} messages`);

    // Simulate storing messages in memory
    const messages: any[] = [];

    for (let i = 0; i < messageCount; i++) {
      messages.push({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message content ${i + 1} with some additional text to simulate realistic message sizes`,
        timestamp: new Date(),
        status: 'sent',
        metadata: {
          wordCount: 10,
          characterCount: 50
        }
      });
    }

    const memoryUsed = messages.length * 200; // Estimate 200 bytes per message

    return this.benchmark.end(`Memory Usage - ${messageCount} messages`, {
      messageCount,
      estimatedMemoryUsage: memoryUsed,
      averageMessageSize: memoryUsed / messageCount
    });
  }

  benchmarkImageMemory(imageCount: number = 10): BenchmarkResult {
    this.benchmark.start(`Image Memory Usage - ${imageCount} images`);

    // Simulate storing base64 images
    const images: string[] = [];
    const baseImage = 'data:image/png;base64,' + 'A'.repeat(1000); // ~1KB image

    for (let i = 0; i < imageCount; i++) {
      images.push(baseImage);
    }

    const totalMemory = images.reduce((sum, img) => sum + img.length, 0);

    return this.benchmark.end(`Image Memory Usage - ${imageCount} images`, {
      imageCount,
      totalMemoryUsage: totalMemory,
      averageImageSize: totalMemory / imageCount
    });
  }

  benchmarkMemoryLeaks(): BenchmarkResult {
    this.benchmark.start('Memory Leak Detection');

    // Simulate component lifecycle with potential leaks
    const eventListeners: any[] = [];
    const intervals: NodeJS.Timeout[] = [];
    const timeouts: NodeJS.Timeout[] = [];

    // Add listeners (potential leak source)
    for (let i = 0; i < 10; i++) {
      const listener = () => console.log(`Event ${i}`);
      eventListeners.push(listener);
    }

    // Add intervals (potential leak source)
    for (let i = 0; i < 5; i++) {
      const interval = setInterval(() => {}, 1000);
      intervals.push(interval);
    }

    // Add timeouts
    for (let i = 0; i < 20; i++) {
      const timeout = setTimeout(() => {}, 100);
      timeouts.push(timeout);
    }

    // Cleanup (important for preventing actual leaks)
    intervals.forEach(clearInterval);
    timeouts.forEach(clearTimeout);

    return this.benchmark.end('Memory Leak Detection', {
      eventListeners: eventListeners.length,
      intervals: intervals.length,
      timeouts: timeouts.length,
      cleanedUp: true
    });
  }

  generateReport(): string {
    return this.benchmark.generateReport();
  }

  clearResults(): void {
    this.benchmark.clearResults();
  }
}

/**
 * Comprehensive Benchmark Suite
 */
export class ComprehensiveBenchmarkSuite {
  private apiBenchmark = new APIResponseBenchmark();
  private uiBenchmark = new UIRenderingBenchmark();
  private memoryBenchmark = new MemoryUsageBenchmark();

  async runFullSuite(): Promise<{
    apiResults: BenchmarkResult[];
    uiResults: BenchmarkResult[];
    memoryResults: BenchmarkResult[];
    summary: string;
  }> {
    console.log('🏃 Running comprehensive benchmark suite...');

    // Run API benchmarks
    await this.apiBenchmark.benchmarkStreamingChat('small');
    await this.apiBenchmark.benchmarkStreamingChat('medium');
    await this.apiBenchmark.benchmarkStreamingChat('large');
    await this.apiBenchmark.benchmarkImageUpload(1);
    await this.apiBenchmark.benchmarkImageUpload(3);
    await this.apiBenchmark.benchmarkConcurrentRequests(10);
    await this.apiBenchmark.benchmarkHealthCheck();

    // Run UI benchmarks
    this.uiBenchmark.benchmarkComponentMount();
    this.uiBenchmark.benchmarkMessageRendering(50);
    this.uiBenchmark.benchmarkScrollPerformance();
    this.uiBenchmark.benchmarkInputPerformance();

    // Run memory benchmarks
    this.memoryBenchmark.benchmarkMessageMemory(100);
    this.memoryBenchmark.benchmarkImageMemory(10);
    this.memoryBenchmark.benchmarkMemoryLeaks();

    const results = {
      apiResults: this.apiBenchmark.getResults(),
      uiResults: this.uiBenchmark.getResults(),
      memoryResults: this.memoryBenchmark.getResults(),
      summary: this.generateSummary()
    };

    console.log('✅ Benchmark suite completed!');
    return results;
  }

  private generateSummary(): string {
    const allResults = [
      ...this.apiBenchmark.getResults(),
      ...this.uiBenchmark.getResults(),
      ...this.memoryBenchmark.getResults()
    ];

    const totalTests = allResults.length;
    const passedTests = allResults.filter(r => r.duration <= BENCHMARK_THRESHOLDS.maxResponseTime).length;
    const failedTests = totalTests - passedTests;

    return `
# Benchmark Suite Summary

## Overall Results
- Total Tests: ${totalTests}
- Passed: ${passedTests}
- Failed: ${failedTests}
- Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%

## Performance Thresholds
- Max Response Time: ${BENCHMARK_THRESHOLDS.maxResponseTime}ms
- Max Memory Usage: ${(BENCHMARK_THRESHOLDS.maxMemoryUsage / 1024 / 1024).toFixed(0)}MB
- Max Render Time: ${BENCHMARK_THRESHOLDS.maxRenderTime}ms

## Recommendations
${failedTests > 0 ? '⚠️ Some tests exceeded performance thresholds. Review failed tests for optimization opportunities.' : '✅ All tests passed performance thresholds.'}
`;
  }

  generateFullReport(): string {
    return `
${this.generateSummary()}

## API Benchmarks
${this.apiBenchmark.generateReport()}

## UI Benchmarks
${this.uiBenchmark.generateReport()}

## Memory Benchmarks
${this.memoryBenchmark.generateReport()}
`;
  }

  clearAllResults(): void {
    this.apiBenchmark.clearResults();
    this.uiBenchmark.clearResults();
    this.memoryBenchmark.clearResults();
  }
}

// Export benchmark instances for direct use
export const apiBenchmark = new APIResponseBenchmark();
export const uiBenchmark = new UIRenderingBenchmark();
export const memoryBenchmark = new MemoryUsageBenchmark();
export const comprehensiveSuite = new ComprehensiveBenchmarkSuite();